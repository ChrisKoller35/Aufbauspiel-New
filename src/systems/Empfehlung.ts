// ─── Magic City – Empfehlung für den nächsten Schritt ───────────
// Was lohnt sich als Nächstes? Mit weniger als zwei Helden zuerst ein
// Held: Allein verliert ein Held den Waldpfad, und ohne Expedition gibt
// es kein Gold. Sonst das erste Gebäude in der empfohlenen Reihenfolge
// (data/gebaeudeErklaerungen.ts), das jetzt auf seinem Feld gebaut werden
// kann; Gebäude, die einen Gildenrang brauchen, warten. Danach jeder
// andere Bauplatz im Netz.
// Gildenhaus und Händler stehen von Anfang an und werden nie empfohlen.
// Anzeige: Mindmap und Aufbau-Reiter heben es hervor, die Engpass-Leiste nennt es.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { BAU_REIHENFOLGE } from '../data/gebaeudeErklaerungen';
import { netzGebaeudeIds } from '../data/produktionsnetz';
import { GameState } from '../models/GameState';
import { STARTING_BUILDING_TYPES } from '../scenes/CityStartingLayout';
import { getGebaeudeStatus, gebaeudeName, kostenText } from './GebaeudeStatus';

/** So viele Helden braucht die Gilde, bevor ein Gebäude empfohlen wird (zu zweit ist der Waldpfad zu schaffen). */
export const HELDEN_VOR_DEM_BAU = 2;

/**
 * Gold für den nächsten Helden bei `anzahlHelden` in der Gilde: Der erste kommt mit der Stadt,
 * der zweite kostet 50, jeder weitere 30 mehr (HeroesScreen.handleHire).
 */
export function anheuerKosten(anzahlHelden: number): number {
  return 50 + Math.max(0, anzahlHelden - 1) * 30;
}

export interface Empfehlung {
  /** Gebäude-Art; leer beim Schritt 'held' (Heldenhaus statt Gebäude). */
  typeId: string;
  /** 'bauen': das Gebäude auf seinem Feld bauen; 'held': erst einen Helden anheuern. */
  schritt: 'bauen' | 'held';
  /** Der Schritt in zwei Worten mit Preis, z. B. «Held anheuern (50 Gold)». */
  text: string;
  warum: string;
  /** Reicht das Lager schon für diesen Schritt (Bau bzw. Held)? */
  bezahlbar: boolean;
}

function reicht(state: GameState, kosten: Record<string, number>): boolean {
  return Object.entries(kosten).every(([res, qty]) => (state.globalStock[res] ?? 0) >= qty);
}

function heldEmpfehlung(state: GameState): Empfehlung {
  const gold = anheuerKosten(state.fighters.length);
  return {
    typeId: '',
    schritt: 'held',
    text: `Held anheuern (${gold} Gold)`,
    warum: 'Ein Held allein verliert den Waldpfad; zu zweit bringen Expeditionen Gold und Beute für alles Weitere.',
    bezahlbar: reicht(state, { gold }),
  };
}

export function naechsterBau(state: GameState): Empfehlung | null {
  if (state.fighters.length < HELDEN_VOR_DEM_BAU) return heldEmpfehlung(state);
  const kandidaten = [
    ...BAU_REIHENFOLGE,
    ...netzGebaeudeIds()
      .filter(id => !BAU_REIHENFOLGE.some(r => r.typeId === id))
      .map(typeId => ({ typeId, warum: '' })),
  ].filter(k => BUILDING_DEFS[k.typeId] && !STARTING_BUILDING_TYPES.includes(k.typeId));
  for (const { typeId, warum } of kandidaten) {
    const zustand = getGebaeudeStatus(state, typeId).zustand;
    if (zustand === 'bauplatz') {
      const kosten = BUILDING_DEFS[typeId].buildCost;
      const text = `${gebaeudeName(typeId)} bauen (${kostenText(kosten)})`;
      return { typeId, schritt: 'bauen', text, warum, bezahlbar: reicht(state, kosten) };
    }
  }
  return null;
}
