// ─── Magic City – Handel am Marktplatz ──────────────────────────
// Waren gegen Gold in Bündeln (data/handel.ts). Der Marktplatz handelt
// pro Tag höchstens buendelProTag(besetzte Plätze) Bündel, Kauf und
// Verkauf zusammen. Den Zähler trägt das Gebäude selbst (handelTag,
// handelBuendel); ist state.day weiter, beginnt er wieder bei 0, darum
// braucht der Tageswechsel nichts zu tun.
// Reine Funktionen; Anzeige: BuildingsScreen. Regeln: docs/HANDEL.md.
// ────────────────────────────────────────────────────────────────

import { BUENDEL, VERKAUFSPREIS, buendelProTag, kaufpreis } from '../data/handel';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { wirkungsStufe } from './Ausbau';

export type HandelsArt = 'kaufen' | 'verkaufen';

export interface HandelsPruefung {
  ok: boolean;
  /** Warum es nicht geht (leer, wenn ok). */
  grund: string;
}

/** Der fertig gebaute Marktplatz der Stadt oder null. */
export function marktplatz(state: GameState): BuildingInstance | null {
  return state.buildings.find(b => b && b.typeId === 'MARKETPLACE' && b.built) ?? null;
}

/** Bündel, die heute schon gehandelt wurden. */
export function gehandeltHeute(state: GameState): number {
  const markt = marktplatz(state);
  if (!markt || markt.handelTag !== state.day) return 0;
  return Math.max(0, markt.handelBuendel ?? 0);
}

/** Bündel pro Tag nach besetzten Plätzen (0 ohne Arbeiter oder Marktplatz). */
export function tagesmenge(state: GameState): number {
  return buendelProTag(wirkungsStufe(state, 'MARKETPLACE'));
}

/** Bündel, die heute noch gehandelt werden dürfen. */
export function handelHeute(state: GameState): number {
  return Math.max(0, tagesmenge(state) - gehandeltHeute(state));
}

/** Grund, warum der Marktplatz gar nicht handelt, oder leer. */
export function marktGesperrt(state: GameState): string {
  const markt = marktplatz(state);
  if (!markt) return 'Erst einen Marktplatz bauen.';
  if (!markt.connected) return 'Marktplatz ist nicht verbunden.';
  if (tagesmenge(state) <= 0) return 'Handel erst mit einem Arbeiter.';
  return '';
}

export function kannHandeln(state: GameState, ware: string, art: HandelsArt): HandelsPruefung {
  const nein = (grund: string): HandelsPruefung => ({ ok: false, grund });
  if (!(ware in VERKAUFSPREIS)) return nein('Diese Ware handelt der Markt nicht.');
  const gesperrt = marktGesperrt(state);
  if (gesperrt) return nein(gesperrt);
  if (handelHeute(state) <= 0) return nein('Heute keine Bündel mehr, morgen wieder.');
  if (art === 'verkaufen') {
    if ((state.globalStock[ware] ?? 0) < BUENDEL) return nein(`Zu wenig im Lager (braucht ${BUENDEL}).`);
  } else if ((state.globalStock.gold ?? 0) < kaufpreis(ware)) {
    return nein(`Zu wenig Gold (braucht ${kaufpreis(ware)}).`);
  }
  return { ok: true, grund: '' };
}

/** Kauft oder verkauft ein Bündel. Bucht Ware, Gold und Tageszähler; nichts wird negativ. */
export function handle(state: GameState, ware: string, art: HandelsArt): HandelsPruefung {
  const pruefung = kannHandeln(state, ware, art);
  if (!pruefung.ok) return pruefung;
  const markt = marktplatz(state)!;
  const stock = state.globalStock;
  if (art === 'verkaufen') {
    stock[ware] = (stock[ware] ?? 0) - BUENDEL;
    stock.gold = (stock.gold ?? 0) + VERKAUFSPREIS[ware];
  } else {
    stock.gold = (stock.gold ?? 0) - kaufpreis(ware);
    stock[ware] = (stock[ware] ?? 0) + BUENDEL;
  }
  markt.handelBuendel = gehandeltHeute(state) + 1;
  markt.handelTag = state.day;
  return pruefung;
}
