// ─── Magic City – Engpass-Suche ─────────────────────────────────
// Findet, woran ein Gebäude oder die ganze Stadt hängt, und sagt es in
// einem Satz in Spielersprache, mit dem nächsten Schritt.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { netzGebaeudeIds } from '../data/produktionsnetz';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import {
  getGebaeudeStatus, gebaeudeName, itemName, kostenText, wohnKapazitaet, dasGebaeude, einzelStatus, grundText, nachschub,
  WarteGrund,
} from './GebaeudeStatus';
import { maxStufe, stufeVon, arbeitsplaetze, besetzt, fehlendeStadtstufe } from './Ausbau';
import { brotNachEssen } from './PeopleSystem';
import { naechsterBau } from './Empfehlung';

/** Gebäude-Typ, der eine Ware herstellt (erstes passendes Rezept); steht seit 21.10.2026 in GebaeudeStatus. */
export { lieferantFuer } from './GebaeudeStatus';

function freieBewohner(state: GameState): number {
  return state.citizens.filter(c => c.status === 'IDLE').length;
}

/** Was das Wohnviertel als Nächstes braucht, damit mehr Bewohner Platz haben. */
function wohnAusbauSatz(state: GameState): string {
  const b = dasGebaeude(state, 'HOUSE_T1');
  if (!b) return 'Baue das Wohnviertel.';
  const stadtstufe = fehlendeStadtstufe(state, b);
  if (stadtstufe) return `Mehr Ausbau erlaubt erst die Stadtstufe «${stadtstufe}» (Hauptmenü).`;
  if (stufeVon(b) >= maxStufe(b.typeId)) return 'Das Wohnviertel ist ganz ausgebaut.';
  return 'Baue das Wohnviertel aus, damit neue Bewohner kommen.';
}

function wohnHinweis(state: GameState): string {
  if (state.citizens.length >= wohnKapazitaet(state)) return wohnAusbauSatz(state);
  if (brotNachEssen(state) < 1) return 'Neue Bewohner kommen nur, wenn nach dem Essen noch Brot übrig ist.';
  return 'Der nächste Bewohner kommt bald.';
}

/** «Baue X aus.» oder, auf höchster Stufe, ein ehrlicher Hinweis. */
function ausbauHinweis(state: GameState, typeId: string): string {
  const b = dasGebaeude(state, typeId);
  const name = gebaeudeName(typeId);
  if (!b) return `Baue ${name}.`;
  const stadtstufe = fehlendeStadtstufe(state, b);
  if (stadtstufe) return `${name} liefert sie. Weiter ausbauen erlaubt erst die Stadtstufe «${stadtstufe}» (Hauptmenü).`;
  if (stufeVon(b) < maxStufe(typeId)) return `${name} liefert sie: baue ${name} aus, dann geht es schneller.`;
  return `${name} liefert sie und läuft schon auf höchster Stufe, es braucht Zeit.`;
}

/**
 * Wie es mit einer fehlenden Zutat weitergeht (GebaeudeStatus.nachschub): Hängt sie, auch Stufen
 * tiefer, an Beute oder an einem Gebäude, das fehlt oder nicht arbeiten kann, steht das da
 * («Dafür fehlt Eisenschrott. Baue Eisenmine.»), sonst der Ausbau-Hinweis für ihren Hersteller.
 */
function lieferHinweis(state: GameState, item: string): string {
  const n = nachschub(state, item);
  const dafuer = n.item !== item ? `Dafür fehlt ${itemName(n.item)}. ` : '';
  if (n.von === null) return `${dafuer}${itemName(n.item)} gibt es als Beute in den Dungeons.`;
  if (n.kommt || n.grund === null) return dafuer + ausbauHinweis(state, n.von);
  return `${dafuer}${gebaeudeName(n.von)} kann gerade nicht liefern: ${grundText(n.grund)}.`;
}

export function grundSatz(state: GameState, typeId: string, grund: WarteGrund): string | null {
  const name = gebaeudeName(typeId);
  switch (grund.art) {
    case 'im-bau': return `${name} ist noch im Bau.`;
    case 'unwetter': return `${name} steht still: Unwetter.`;
    case 'nicht-verbunden': return `${name} ist nicht verbunden.`;
    case 'kein-rezept': return `${name} hat kein Rezept gewählt.`;
    case 'auftrag': return null; // Der Spieler entscheidet selbst, wann er herstellt
    case 'zulieferung': return null; // Die Zutat entsteht gerade in der liefernden Werkstatt
    case 'vorrat': return null; // Vorrat voll, die Werkstatt ruht
    case 'kein-wasser': return `${name} braucht Wasser: baue einen Brunnen.`;
    case 'kein-arbeiter':
      return freieBewohner(state) > 0
        ? `${name} bekommt gleich einen Arbeiter.`
        : `${name} hat keinen Arbeiter, alle Bewohner arbeiten schon. ${wohnHinweis(state)}`;
    case 'kein-brot': return 'Bewohner essen jeden Tag Brot, neue kommen nur mit Brot übrig: baue die Brot-Kette auf.';
    case 'voll': return `Das Wohnviertel ist voll (${state.citizens.length}/${wohnKapazitaet(state)}). ${wohnAusbauSatz(state)}`;
    case 'zutaten':
      return `${itemName(grund.item)}: ${grund.vorrat} im Lager, ${grund.bedarf} pro Auftrag. ${lieferHinweis(state, grund.item)}`;
  }
}

/** Engpass eines Gebäude-Typs, oder null, wenn nichts fehlt. */
export function engpassFuerGebaeude(state: GameState, typeId: string): string | null {
  const status = getGebaeudeStatus(state, typeId);
  const name = gebaeudeName(typeId);
  switch (status.zustand) {
    case 'gesperrt': return `${name} ist noch gesperrt: ${(status.hinweise ?? []).join(', ')}.`;
    case 'bauplatz': return `${name} fehlt noch. Bauen kostet ${kostenText(BUILDING_DEFS[typeId].buildCost)}.`;
    case 'wartet':
    case 'bereit':
      return status.grund ? grundSatz(state, typeId, status.grund) : null;
    case 'laeuft':
      return null;
  }
}

/** Engpass eines einzelnen Gebäudes (für das Werkstatt-Fenster). */
export function engpassFuerInstanz(state: GameState, b: BuildingInstance): string | null {
  const def = BUILDING_DEFS[b.typeId];
  if (!def) return null;
  if (def.recipes.length === 0) {
    const status = getGebaeudeStatus(state, b.typeId);
    return status.grund ? grundSatz(state, b.typeId, status.grund) : null;
  }
  const grund = einzelStatus(state, b).grund;
  return grund ? grundSatz(state, b.typeId, grund) : null;
}

export interface Engpass {
  typeId: string;
  satz: string;
}

/**
 * Die wichtigsten Engpässe der Stadt, höchstens `max`:
 * zuerst gebaute Gebäude, die warten, dann der empfohlene Bauplatz (Empfehlung.ts), dann das erste gesperrte Gebäude.
 */
export function engpaesseDerStadt(state: GameState, max = 3): Engpass[] {
  const ids = netzGebaeudeIds();
  const status = ids.map(typeId => ({ typeId, s: getGebaeudeStatus(state, typeId) }));
  const liste: Engpass[] = [];
  const nimm = (typeId: string, satz: string | null) => {
    if (satz && !liste.some(e => e.satz === satz)) liste.push({ typeId, satz });
  };

  for (const { typeId, s } of status) {
    if (s.anzahl > 0 && s.grund && s.grund.art !== 'auftrag') nimm(typeId, grundSatz(state, typeId, s.grund));
  }
  // Ausgebaute Gebäude ohne genug Arbeiter: ein Satz für die ganze Stadt
  const fehlendeArbeiter = state.buildings.reduce((sum, b) => sum + (b && b.built ? arbeitsplaetze(b) - besetzt(b) : 0), 0);
  if (fehlendeArbeiter > 0 && freieBewohner(state) === 0) {
    nimm('HOUSE_T1', `Es fehlen ${fehlendeArbeiter} Arbeiter, alle Bewohner arbeiten schon. ${wohnHinweis(state)}`);
  }
  // Der nächste Bauplatz ist derselbe, den die Mindmap als «Als Nächstes» hervorhebt
  const bauplatz = naechsterBau(state);
  if (bauplatz) nimm(bauplatz.typeId, engpassFuerGebaeude(state, bauplatz.typeId));
  const gesperrt = status.find(x => x.s.zustand === 'gesperrt');
  if (gesperrt) nimm(gesperrt.typeId, engpassFuerGebaeude(state, gesperrt.typeId));

  return liste.slice(0, max);
}
