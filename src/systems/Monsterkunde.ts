// ─── Magic City – Monsterkunde ──────────────────────────────────
// Was das Monsterbuch über die Jagd der Gilde weiss (docs/MONSTERBUCH.md):
// die Jagdstrecke (wie oft jeder Gegner besiegt wurde). Einziger Ort, der
// die Zusatzfelder von `state.bestiarium` liest und schreibt; GameState.ts
// nennt nur `discovered` und `defeated`. Gespeichert werden sie mit dem Rest
// des Spielstands (SaveSystem.save, das Schema lässt Zusatzfelder durch).
// Ohne DOM, die Tests rufen alles direkt auf.
// ────────────────────────────────────────────────────────────────

import type { GameState } from '../models/GameState';
import { ENEMY_DEFS } from '../data/enemies';

/** state.bestiarium mit den Feldern, die nur das Monsterbuch kennt */
interface MonsterbuchDaten {
  discovered: string[];
  defeated: string[];
  /** Jagdstrecke: Gegner-ID → wie oft besiegt */
  strecke?: unknown;
}

function daten(state: GameState): MonsterbuchDaten {
  if (!state.bestiarium) state.bestiarium = { discovered: [], defeated: [] };
  return state.bestiarium as MonsterbuchDaten;
}

function istGegner(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ENEMY_DEFS, id);
}

/** Ganze Zahl ≥ 0; Text, NaN und negative Zahlen werden 0, Kommazahlen abgerundet. */
function ganzeZahl(wert: unknown): number {
  return typeof wert === 'number' && Number.isFinite(wert) && wert > 0 ? Math.floor(wert) : 0;
}

/**
 * Die Jagdstrecke, bereinigt: nur Gegner aus ENEMY_DEFS, nur ganze Zahlen ≥ 0. Ein Gegner,
 * der in `defeated` steht, zählt mindestens 1 (Spielstände aus der Zeit vor der Strecke).
 */
export function strecke(state: GameState): Record<string, number> {
  const d = daten(state);
  const roh = typeof d.strecke === 'object' && d.strecke !== null && !Array.isArray(d.strecke)
    ? d.strecke as Record<string, unknown>
    : {};
  const sauber: Record<string, number> = {};
  for (const id of Object.keys(roh)) {
    if (!istGegner(id)) continue;
    const anzahl = ganzeZahl(roh[id]);
    if (anzahl > 0) sauber[id] = anzahl;
  }
  for (const id of d.defeated ?? []) {
    if (typeof id === 'string' && istGegner(id) && !sauber[id]) sauber[id] = 1;
  }
  return sauber;
}

/** Wie oft die Gilde diesen Gegner besiegt hat. */
export function anzahlBesiegt(state: GameState, id: string): number {
  return strecke(state)[id] ?? 0;
}

/** Zählt `anzahl` Siege über diesen Gegner zur Strecke (schreibt die bereinigte Strecke zurück). */
export function zaehleSieg(state: GameState, id: string, anzahl = 1): void {
  if (!istGegner(id) || anzahl <= 0) return;
  const neu = strecke(state);
  neu[id] = (neu[id] ?? 0) + Math.floor(anzahl);
  daten(state).strecke = neu;
}

/** Im Kampf gesehen (oder schon besiegt). */
export function gesichtet(state: GameState, id: string): boolean {
  return (daten(state).discovered ?? []).includes(id) || anzahlBesiegt(state, id) > 0;
}
