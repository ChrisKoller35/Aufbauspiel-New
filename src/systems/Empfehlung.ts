// ─── Magic City – Empfehlung für den nächsten Bau ───────────────
// Welches Gebäude lohnt sich als Nächstes? Das erste in der empfohlenen
// Reihenfolge (data/gebaeudeErklaerungen.ts), das jetzt gebaut werden
// kann oder nur noch seinen Bauplan braucht (Händler); Gebäude, die
// einen Gildenrang brauchen, warten. Danach jeder andere Bauplatz im Netz.
// Gildenhaus und Händler stehen von Anfang an und werden nie empfohlen.
// Anzeige: Mindmap und Aufbau-Reiter heben es hervor, die Engpass-Leiste nennt es.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, bauplaeneImLager } from '../data/buildings';
import { bauplanPreis } from '../data/haendler';
import { BAU_REIHENFOLGE } from '../data/gebaeudeErklaerungen';
import { netzGebaeudeIds } from '../data/produktionsnetz';
import { stadtStufeVon } from '../data/stadtstufen';
import { GameState } from '../models/GameState';
import { STARTING_BUILDING_TYPES } from '../scenes/CityStartingLayout';
import { getGebaeudeStatus, getBuiltTypeIds, getGildenrang } from './GebaeudeStatus';

export interface Empfehlung {
  typeId: string;
  /** 'bauen': der Bauplan liegt im Lager; 'bauplan': erst den Bauplan beim Händler kaufen. */
  schritt: 'bauen' | 'bauplan';
  warum: string;
  /** Reicht das Lager schon für diesen Schritt (Bau bzw. Bauplan)? */
  bezahlbar: boolean;
}

function reicht(state: GameState, kosten: Record<string, number>): boolean {
  return Object.entries(kosten).every(([res, qty]) => (state.globalStock[res] ?? 0) >= qty);
}

/** Fehlt dem Gebäude nur noch der Bauplan beim Händler (kein Gildenrang, keine Voraussetzung)? */
function nurBauplanFehlt(state: GameState, typeId: string): boolean {
  const def = BUILDING_DEFS[typeId];
  const bauplan = def?.freischaltung.bauplan;
  if (!bauplan || bauplanPreis(bauplan) <= 0 || bauplaeneImLager(state.globalStock).includes(bauplan)) return false;
  const built = getBuiltTypeIds(state);
  const rang = def.freischaltung.gildenrang ?? 0;
  return def.freischaltung.braucht.every(id => built.has(id)) && getGildenrang(state) >= rang;
}

export function naechsterBau(state: GameState): Empfehlung | null {
  const kandidaten = [
    ...BAU_REIHENFOLGE,
    ...netzGebaeudeIds()
      .filter(id => !BAU_REIHENFOLGE.some(r => r.typeId === id))
      .map(typeId => ({ typeId, warum: '' })),
  ].filter(k => BUILDING_DEFS[k.typeId] && !STARTING_BUILDING_TYPES.includes(k.typeId));
  for (const { typeId, warum } of kandidaten) {
    const zustand = getGebaeudeStatus(state, typeId).zustand;
    if (zustand === 'bauplatz') {
      return { typeId, schritt: 'bauen', warum, bezahlbar: reicht(state, BUILDING_DEFS[typeId].buildCost) };
    }
    if (zustand === 'gesperrt' && nurBauplanFehlt(state, typeId)) {
      const preis = bauplanPreis(BUILDING_DEFS[typeId].freischaltung.bauplan!, stadtStufeVon(state));
      return { typeId, schritt: 'bauplan', warum, bezahlbar: reicht(state, { gold: preis }) };
    }
  }
  return null;
}
