// ─── Magic City – Lehrlinge: je Klasse ein zweiter Held ─────────
// Wer Stufe 15 erreicht hat, darf einen Lehrling seiner Klasse aufnehmen: einen zweiten
// Helden mit eigenem Namen (data/lehrlinge.ts), der auf Stufe 1 anfängt. Er kostet so viel
// wie jeder andere neue Held (anheuerKosten) und holt über das Lehrbuch auf: Der Überschuss
// eines Helden auf Stufe 15 geht 1 : 1 an ihn (systems/Ausbildung.ts). Je Klasse höchstens
// ein Lehrling. Oberfläche: Reiter «Anheuern» (ui/components/KlassenTafel.ts).
// Mit seinem Meister auf Expedition lernt er schneller (Lehrstunde), auf Stufe 15 heisst er Geselle.
// Anleitung: docs/AUSBILDUNG.md, Abschnitt «Lehrlinge».
// ────────────────────────────────────────────────────────────────

import { CLASS_DEFS } from '../data/classes';
import { LEHRLINGE } from '../data/lehrlinge';
import { GameState } from '../models/GameState';
import { GuildFighter, resetFighterIdCounter } from '../models/GuildRoster';
import { anheuerKosten } from './Empfehlung';
import { MAX_HERO_LEVEL } from './HeroProgression';

/** Ab dieser Stufe nimmt ein Held einen Lehrling seiner Klasse auf */
export const LEHRLING_AB_STUFE = MAX_HERO_LEVEL;

/** Der Lehrling einer Klasse, falls die Gilde einen hat */
export function lehrlingDerKlasse(state: GameState, classId: string): GuildFighter | undefined {
  return state.fighters.find(f => f.classId === classId && f.lehrling);
}

/** Der Meister einer Klasse: ihr Held mit der höchsten Stufe, der kein Lehrling ist (bei Gleichstand der erste) */
export function meisterDerKlasse(state: GameState, classId: string): GuildFighter | undefined {
  let meister: GuildFighter | undefined;
  for (const f of state.fighters) {
    if (f.classId !== classId || f.lehrling) continue;
    if (!meister || f.level > meister.level) meister = f;
  }
  return meister;
}

export type LehrlingLage =
  /** Kein Held dieser Klasse in der Gilde (oder die Klasse hat keinen Lehrling) */
  | { art: 'ohne_meister' }
  /** Der Meister ist noch nicht auf Stufe 15 */
  | { art: 'zu_frueh'; meister: GuildFighter }
  /** Aufnehmen geht; `bezahlbar`, wenn das Gold reicht */
  | { art: 'frei'; meister: GuildFighter; kosten: number; bezahlbar: boolean }
  /** Die Klasse hat ihren Lehrling schon */
  | { art: 'da'; meister: GuildFighter | undefined; lehrling: GuildFighter };

/** Wie es um den Lehrling einer Klasse steht (Reiter «Anheuern», lehrlingAufnehmen) */
export function lehrlingLage(state: GameState, classId: string): LehrlingLage {
  const meister = meisterDerKlasse(state, classId);
  const lehrling = lehrlingDerKlasse(state, classId);
  if (lehrling) return { art: 'da', meister, lehrling };
  if (!meister || !LEHRLINGE[classId] || !CLASS_DEFS[classId]) return { art: 'ohne_meister' };
  if (meister.level < LEHRLING_AB_STUFE) return { art: 'zu_frueh', meister };
  const kosten = anheuerKosten(state.fighters.length);
  return { art: 'frei', meister, kosten, bezahlbar: (state.globalStock['gold'] ?? 0) >= kosten };
}

/**
 * Nimmt den Lehrling einer Klasse auf: zieht das Gold ab und stellt ihn als neuen Helden
 * (Stufe 1, Werte der Klasse, ohne Ausrüstung) hinten in die Gilde. Geht es nicht
 * (zu früh, schon da, zu wenig Gold), passiert nichts und es kommt null zurück.
 */
export function lehrlingAufnehmen(state: GameState, classId: string): GuildFighter | null {
  const lage = lehrlingLage(state, classId);
  if (lage.art !== 'frei' || !lage.bezahlbar) return null;
  const def = LEHRLINGE[classId];
  const klasse = CLASS_DEFS[classId];
  state.globalStock['gold'] = (state.globalStock['gold'] ?? 0) - lage.kosten;
  const id = state.fighters.reduce((m, f) => Math.max(m, f.id), 0) + 1;
  const lehrling: GuildFighter = {
    id,
    classId,
    name: def.name,
    baseStats: { ...klasse.baseStats },
    gear: { mainHand: null, offHand: null, armor: null, trinket: null },
    xp: 0,
    level: 1,
    lehrling: true,
  };
  state.fighters.push(lehrling);
  // createGuildFighter zählt eigene Ids (Start, Probespiel): danach nie eine, die es schon gibt
  resetFighterIdCounter(id + 1);
  return lehrling;
}

/** Hintergrund für das Heldenfenster: der eigene beim Lehrling, sonst der der Klasse */
export function hintergrundVon(fighter: Pick<GuildFighter, 'classId' | 'lehrling'>): string | undefined {
  if (fighter.lehrling) return LEHRLINGE[fighter.classId]?.hintergrund;
  return CLASS_DEFS[fighter.classId]?.background;
}

/** Name für Karten, die sonst die Klasse zeigen: beim Lehrling sein Name, sonst der Klassenname */
export function kartenName(fighter: Pick<GuildFighter, 'classId' | 'lehrling' | 'name'>): string {
  if (fighter.lehrling) return fighter.name;
  return CLASS_DEFS[fighter.classId]?.name ?? fighter.classId;
}

// ─── Geselle: ein Lehrling auf Stufe 15 hat ausgelernt ─────────

/** Ein Lehrling auf Stufe 15 heisst Geselle. Er bleibt der zweite Held seiner Klasse (fighter.lehrling bleibt) */
export function istGeselle(fighter: Pick<GuildFighter, 'lehrling' | 'level'>): boolean {
  return !!fighter.lehrling && fighter.level >= MAX_HERO_LEVEL;
}

/** «Lehrling» oder «Geselle» für Karten und Heldenfenster; leer bei allen anderen Helden */
export function standVon(fighter: Pick<GuildFighter, 'lehrling' | 'level'>): string {
  if (!fighter.lehrling) return '';
  return istGeselle(fighter) ? 'Geselle' : 'Lehrling';
}

/**
 * Sein Satz, wenn ein Lehrling eben ausgelernt hat (von unter 15 auf 15), sonst null.
 * stufeVorher: seine Stufe vor den XP (Bilanz: level − levelUps; Lehrbuch: vonStufe).
 */
export function gesellenSatz(fighter: Pick<GuildFighter, 'classId' | 'lehrling' | 'level'>, stufeVorher: number): string | null {
  if (!istGeselle(fighter) || stufeVorher >= MAX_HERO_LEVEL) return null;
  return LEHRLINGE[fighter.classId]?.geselle ?? null;
}

// ─── Lehrstunde: mit dem Meister unterwegs ─────────────────────

/** Anteil zusätzlicher XP, wenn der Lehrling mit seinem Meister auf Expedition ist */
export const LEHRSTUNDE_ANTEIL = 0.5;

export interface Lehrstunde {
  meisterId: number;
  meisterName: string;
  /** So viele XP kommen zu seinen XP der Expedition dazu */
  bonus: number;
}

/**
 * Lehrstunde (nur Expeditionen, nicht im Raid): Ist der Lehrling mit dem Meister seiner Klasse in derselben Gruppe
 * und hat er dessen Stufe noch nicht, bekommt er LEHRSTUNDE_ANTEIL seiner XP dazu (aufgerundet). Sonst null.
 * Vor dem Vergeben der XP aufrufen (es zählt die Stufe vor der Expedition). Ändert nichts.
 */
export function lehrstunde(state: GameState, gruppe: readonly number[], fighter: GuildFighter, xp: number): Lehrstunde | null {
  if (!fighter.lehrling || !(xp > 0)) return null;
  const meister = meisterDerKlasse(state, fighter.classId);
  if (!meister || !gruppe.includes(meister.id) || fighter.level >= meister.level) return null;
  return { meisterId: meister.id, meisterName: meister.name, bonus: Math.ceil(xp * LEHRSTUNDE_ANTEIL) };
}

/** Zähler in state.statistics: so viele Lehrstunden gab es; wählt reihum den Satz */
export const LEHRSTUNDEN = 'lehrstunden';

/** Der Satz zur Lehrstunde, reihum nach `nummer` (0, 1, 2 …), mit dem Namen des Meisters */
export function lehrstundenSatz(fighter: Pick<GuildFighter, 'classId'>, meisterName: string, nummer: number): string {
  const saetze = LEHRLINGE[fighter.classId]?.lehrstunde ?? [];
  if (saetze.length === 0) return '';
  const satz = saetze[((nummer % saetze.length) + saetze.length) % saetze.length];
  return satz.split('{meister}').join(meisterName);
}
