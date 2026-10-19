// ─── Magic City – Die endlose Treppe (Spielstand) ───────────────
// Wann die Treppe offen ist, Bestmarke und Verlauf (für die Rangliste),
// Werte der Treppen-Gegner. Den Lauf selbst führt ExpeditionSystem;
// Daten und Zahlen: data/treppe.ts, Regeln: docs/TREPPE.md.
// ────────────────────────────────────────────────────────────────

import { GameState, TreppeStand } from '../models/GameState';
import { CombatUnit, ExpeditionRun } from '../models/ExpeditionRun';
import { stadtStufeVon } from '../data/stadtstufen';
import { ENEMY_DEFS } from '../data/enemies';
import {
  TREPPE_AB_STADTSTUFE, TREPPE_ID_BASIS, gegnerWerte, startEtagen, umlaufZusatz,
} from '../data/treppe';

/** Offen ab Stadtstufe 7 (Magische Stadt). */
export function treppeOffen(state: GameState): boolean {
  return stadtStufeVon(state) >= TREPPE_AB_STADTSTUFE;
}

/**
 * Stand der Treppe oder null, solange sie zu ist. Beim ersten Aufruf nach dem
 * Öffnen wird er angelegt; `geoeffnetAm` ist der Start für die Rivalen der Rangliste.
 */
export function treppeStand(state: GameState, jetzt = Date.now()): TreppeStand | null {
  if (!treppeOffen(state)) return null;
  const t = state.treppe;
  if (!t || typeof t !== 'object') {
    state.treppe = { geoeffnetAm: jetzt, besteEtage: 0, laeufe: 0, verlauf: [] };
    return state.treppe;
  }
  if (!Number.isFinite(t.geoeffnetAm)) t.geoeffnetAm = jetzt;
  if (!Number.isFinite(t.besteEtage) || t.besteEtage < 0) t.besteEtage = 0;
  if (!Number.isFinite(t.laeufe)) t.laeufe = 0;
  if (!Array.isArray(t.verlauf)) t.verlauf = [];
  return t;
}

/** Höchstes je geschaffte Stockwerk (0 = noch keins). */
export function besteEtage(state: GameState): number {
  return treppeStand(state)?.besteEtage ?? 0;
}

/** Erlaubte Startpunkte eines neuen Laufs (1, 11, 21 … bis über die Bestmarke). */
export function treppenStarts(state: GameState): number[] {
  return startEtagen(besteEtage(state));
}

/** Ein Stockwerk wurde geschafft: neue Bestmarke merken. Gibt true zurück, wenn es eine war. */
export function etageGeschafft(state: GameState, etage: number, jetzt = Date.now()): boolean {
  const stand = treppeStand(state, jetzt);
  if (!stand || etage <= stand.besteEtage) return false;
  stand.besteEtage = etage;
  stand.verlauf.push({ etage, zeit: jetzt });
  return true;
}

/** Stockwerk eines Raums im Treppen-Lauf (Raum i = Stockwerk startEtage + i). */
export function treppenEtage(run: ExpeditionRun, roomIndex = run.currentRoom): number {
  return (run.treppe?.startEtage ?? 1) + roomIndex;
}

/**
 * Macht aus einem normalen Gegner einen Treppen-Gegner: Leben, Angriff und
 * Rüstung des Stockwerks, Heilung und Stärkung der Fähigkeiten im selben Mass,
 * eindeutige Kampf-ID. Bosse heissen ab dem zweiten Umlauf «… II».
 */
export function alsTreppenGegner(unit: CombatUnit, etage: number, platz: number): CombatUnit {
  const werte = gegnerWerte(unit.defId ?? '', etage);
  const lebenFaktor = werte.hp / Math.max(1, unit.maxHp);
  const angriffFaktor = werte.atk / Math.max(1, unit.atk);
  unit.hp = unit.maxHp = werte.hp;
  unit.atk = werte.atk;
  unit.def = werte.def;
  for (const skill of unit.skills) {
    if (skill.effectType === 'heal') skill.power = Math.round(skill.power * lebenFaktor);
    if (skill.effectType === 'buff' || skill.effectType === 'summon') {
      skill.power = Math.max(1, Math.round(skill.power * angriffFaktor));
    }
  }
  unit.id = TREPPE_ID_BASIS + etage * 10 + platz;
  if (unit.defId && ENEMY_DEFS[unit.defId]?.isBoss) unit.name += umlaufZusatz(etage);
  return unit;
}
