// ─── Magic City – Ausbildung der Helden ─────────────────────────
// Training im Heldenhaus und das Lehrbuch. Beide geben XP über awardXP:
// Aufstiege bringen so dieselben Klassen-Boni wie nach einer Expedition.
// Das Lehrbuch gibt den Überschuss eines Helden auf Stufe 15 (ueberschuss)
// 1 : 1 an einen Helden unter Stufe 15 weiter; der Lehrer bleibt auf 15.
// Oberfläche: ui/components/Lehrbuch.ts. Anleitung: docs/AUSBILDUNG.md.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { GuildFighter } from '../models/GuildRoster';
import { MAX_HERO_LEVEL, awardXP, totalXpForLevel, ueberschuss } from './HeroProgression';
import { ClassUnlockSystem } from './ClassUnlockSystem';

/** Gold für ein Training auf dieser Stufe */
export function trainingsKosten(level: number): number {
  return 20 + level * 10;
}

/** XP aus einem Training auf dieser Stufe */
export function trainingsXp(level: number): number {
  return 10 + level * 5;
}

export type TrainingsErgebnis =
  | { ok: true; kosten: number; xp: number; levelUps: number; neueKlassen: string[] }
  | { ok: false; grund: 'max' | 'gold' };

/** Ein Training: kostet Gold, gibt XP über awardXP. Ohne genug Gold passiert nichts. */
export function trainieren(state: GameState, fighter: GuildFighter): TrainingsErgebnis {
  if (fighter.level >= MAX_HERO_LEVEL) return { ok: false, grund: 'max' };
  const kosten = trainingsKosten(fighter.level);
  const gold = state.globalStock['gold'] ?? 0;
  if (gold < kosten) return { ok: false, grund: 'gold' };

  state.globalStock['gold'] = gold - kosten;
  const xp = trainingsXp(fighter.level);
  const levelUps = awardXP(fighter, xp);
  // Eine Stufen-Bedingung (Paladin: Guardian auf Stufe 5) gilt gleich, nicht erst nach der nächsten Expedition
  const neueKlassen = levelUps > 0 ? new ClassUnlockSystem().checkUnlocks(state) : [];
  return { ok: true, kosten, xp, levelUps, neueKlassen };
}

/** «Stufe 15 · 1240 XP Überschuss» für Heldenkarte und Heldenfenster */
export function ueberschussText(fighter: GuildFighter): string {
  return `Stufe ${MAX_HERO_LEVEL} · ${ueberschuss(fighter)} XP Überschuss`;
}

/** Stufe zu einer Gesamt-XP, wie awardXP sie erreicht */
export function stufeBeiXp(xp: number): number {
  let level = 1;
  while (level < MAX_HERO_LEVEL && xp >= totalXpForLevel(level + 1)) level++;
  return level;
}

export interface LehrbuchVorschau {
  /** So viele XP wandern vom Lehrer zum Schüler */
  xp: number;
  vonStufe: number;
  nachStufe: number;
}

/**
 * Was «Lernen» bewirken würde, oder null, wenn es nicht geht. Der Schüler bekommt den
 * ganzen Überschuss, aber nie mehr, als er bis Stufe 15 braucht: Der Rest bleibt beim
 * Lehrer für den nächsten Schüler.
 */
export function lehrbuchVorschau(lehrer: GuildFighter, schueler: GuildFighter): LehrbuchVorschau | null {
  if (lehrer.id === schueler.id || lehrer.level < MAX_HERO_LEVEL || schueler.level >= MAX_HERO_LEVEL) return null;
  const bedarf = totalXpForLevel(MAX_HERO_LEVEL) - schueler.xp;
  const xp = Math.min(ueberschuss(lehrer), bedarf);
  if (xp <= 0) return null;
  return { xp, vonStufe: schueler.level, nachStufe: stufeBeiXp(schueler.xp + xp) };
}

export interface LehrbuchErgebnis extends LehrbuchVorschau {
  neueKlassen: string[];
}

/** «Lernen»: verschiebt die XP aus lehrbuchVorschau. Prüft selbst, ob genug Überschuss da ist. */
export function lehrbuchLernen(state: GameState, lehrerId: number, schuelerId: number): LehrbuchErgebnis | null {
  const lehrer = state.fighters.find(f => f.id === lehrerId);
  const schueler = state.fighters.find(f => f.id === schuelerId);
  if (!lehrer || !schueler) return null;
  const vorschau = lehrbuchVorschau(lehrer, schueler);
  if (!vorschau) return null;

  lehrer.xp -= vorschau.xp;
  awardXP(schueler, vorschau.xp);
  const neueKlassen = new ClassUnlockSystem().checkUnlocks(state);
  return { ...vorschau, nachStufe: schueler.level, neueKlassen };
}
