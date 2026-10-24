// ─── Magic City – Texte und Werte der Mindmap ───────────────────
// Was auf den Karten des Reiters «Stadt» steht und was die Erklärung
// beim Darüberfahren sagt: Vorräte der Beute, Werte der Ziele,
// was ein Gebäude gerade tut oder wie man es
// bekommt (auf dem Feld bauen oder gesperrt). Reine
// Funktionen über den Spielstand; Darstellung: ProduktionTab.ts.
// ────────────────────────────────────────────────────────────────

import { netzKnoten, netzGebaeudeIds, BEUTE_GRUPPEN } from '../../data/produktionsnetz';
import { ERKLAERUNG } from '../../data/gebaeudeErklaerungen';
import { BUILDING_DEFS } from '../../data/buildings';
import { GameState } from '../../models/GameState';
import { getGebaeudeStatus, gebaeudeName, dasGebaeude, GebaeudeStatus, kostenText } from '../../systems/GebaeudeStatus';
import { naechsterBau } from '../../systems/Empfehlung';
import { maxStufe, kannAusbauen } from '../../systems/Ausbau';
import { anzahlText } from '../../utils/Anzahl';

export function quellenVorrat(state: GameState, items: string[]): number {
  return items.reduce((sum, item) => sum + Math.floor(state.globalStock[item] ?? 0), 0);
}

function traenkeImLager(state: GameState): number {
  return Object.entries(state.globalStock)
    .filter(([key]) => key === 'healing_potion' || key.startsWith('potion_'))
    .reduce((sum, [, qty]) => sum + Math.floor(qty ?? 0), 0);
}

export function zielWert(state: GameState, wert: 'bauen' | 'expeditionen'): string {
  if (wert === 'expeditionen') {
    return `${anzahlText(state.fighters.length, 'Held', 'Helden')} · ${anzahlText(traenkeImLager(state), 'Trank', 'Tränke')}`;
  }
  const e = naechsterBau(state);
  // Erst ein Held, dann Gebäude: der empfohlene Schritt selbst («Held anheuern (50 Gold)», Klick geht zu den Helden)
  if (e && !e.typeId) return e.text;
  let baubar = 0;
  let ausbaubar = 0;
  for (const typeId of netzGebaeudeIds()) {
    const s = getGebaeudeStatus(state, typeId);
    if (s.zustand === 'bauplatz') baubar++;
    else if (s.anzahl > 0) {
      const b = dasGebaeude(state, typeId);
      if (b && kannAusbauen(state, b)) ausbaubar++;
    }
  }
  const teile: string[] = [];
  if (baubar) teile.push(`${baubar} baubar`);
  if (ausbaubar) teile.push(`${ausbaubar} ausbaubar`);
  if (teile.length) return teile.join(' · ');
  return 'sammle Gold und Eisenschrott';
}

export function stufeText(s: GebaeudeStatus): string {
  return s.anzahl > 0 && maxStufe(s.typeId) > 1 ? `Stufe ${s.stufe}` : '';
}

/** Zweite Zeile des Beute-Balkens: «12 im Lager», bei leerem Lager «noch nichts im Lager». */
export function quellenText(state: GameState, items: string[]): string {
  const vorrat = quellenVorrat(state, items);
  return vorrat > 0 ? `${vorrat} im Lager` : 'noch nichts im Lager';
}

// ── Erklärung ───────────────────────────────────────────────────

/** Titel und Zeilen der Erklärung zu einem Kasten der Mindmap oder einem Chip des Beute-Balkens. */
export function erklaerung(state: GameState, knotenId: string): { titel: string; zeilen: string[] } {
  const zeilen: string[] = [];
  const text = ERKLAERUNG[knotenId];
  if (text) zeilen.push(text);
  const gruppe = BEUTE_GRUPPEN.find(g => g.id === knotenId);
  if (gruppe) {
    zeilen.push(`Im Lager: ${quellenVorrat(state, gruppe.items)}.`, 'Klick: zu den Expeditionen.');
    return { titel: gruppe.titel, zeilen };
  }
  const k = netzKnoten(knotenId);
  if (!k) return { titel: knotenId, zeilen };
  if (k.art === 'quelle') {
    zeilen.push(`Im Lager: ${quellenVorrat(state, k.items)}.`, 'Klick: zu den Expeditionen.');
    return { titel: k.titel, zeilen };
  }
  if (k.art === 'ziel') {
    const e = k.wert === 'bauen' ? naechsterBau(state) : null;
    if (e && !e.typeId) zeilen.push(`${e.text}: ${e.warum}`, 'Klick: zu den Helden.');
    else zeilen.push(k.wert === 'bauen' ? 'Klick: zum Reiter «Aufbau».' : 'Klick: zu den Expeditionen.');
    return { titel: k.titel, zeilen };
  }
  zeilen.push(...gebaeudeZeilen(state, k.typeId));
  return { titel: gebaeudeName(k.typeId), zeilen };
}

/** Was ein Gebäude gerade tut, oder wie man es bekommt (auf dem Feld bauen oder gesperrt). */
function gebaeudeZeilen(state: GameState, typeId: string): string[] {
  const s = getGebaeudeStatus(state, typeId);
  if (s.anzahl > 0) {
    const klick = typeId === 'HAENDLER' ? 'Klick: kaufen und verkaufen.' : 'Klick: Werkstatt und Ausbau.';
    return [`Jetzt: ${s.text}${stufeText(s) ? ` (${stufeText(s)})` : ''}.`, klick];
  }
  const zeilen: string[] = [];
  if (s.zustand === 'gesperrt') zeilen.push(`Noch gesperrt: ${(s.hinweise ?? []).join(', ')}.`);
  else zeilen.push(`Klick: bauen für ${kostenText(BUILDING_DEFS[typeId]?.buildCost ?? {})}.`);
  const e = naechsterBau(state);
  if (e?.typeId === typeId && e.warum) zeilen.push(`Lohnt sich als Nächstes: ${e.warum}`);
  return zeilen;
}
