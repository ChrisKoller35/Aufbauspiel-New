// ─── Magic City – Empfehlung für den nächsten Bau ───────────────
// Welches Gebäude lohnt sich als Nächstes? Das erste in der empfohlenen
// Reihenfolge (data/gebaeudeErklaerungen.ts), das jetzt gebaut werden
// kann (nicht gesperrt). Danach jeder andere freie Bauplatz im Netz.
// Anzeige: Mindmap und Aufbau-Reiter heben es hervor, die Engpass-Leiste nennt es.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { BAU_REIHENFOLGE } from '../data/gebaeudeErklaerungen';
import { netzGebaeudeIds } from '../data/produktionsnetz';
import { GameState } from '../models/GameState';
import { getGebaeudeStatus } from './GebaeudeStatus';

export interface Empfehlung {
  typeId: string;
  warum: string;
  /** Reichen die Vorräte schon für den Bau? */
  bezahlbar: boolean;
}

export function naechsterBau(state: GameState): Empfehlung | null {
  const kandidaten = [
    ...BAU_REIHENFOLGE,
    ...netzGebaeudeIds()
      .filter(id => !BAU_REIHENFOLGE.some(r => r.typeId === id))
      .map(typeId => ({ typeId, warum: '' })),
  ];
  for (const { typeId, warum } of kandidaten) {
    if (getGebaeudeStatus(state, typeId).zustand !== 'bauplatz') continue;
    const kosten = BUILDING_DEFS[typeId]?.buildCost ?? {};
    const bezahlbar = Object.entries(kosten).every(([res, qty]) => (state.globalStock[res] ?? 0) >= qty);
    return { typeId, warum, bezahlbar };
  }
  return null;
}
