// ─── Magic City – Engpass-Suche ─────────────────────────────────
// Findet, woran eine Werkstatt oder die ganze Stadt hängt, und sagt es
// in einem Satz in Spielersprache, mit dem nächsten Schritt: fehlt
// Beute (Expedition), fehlt Gold, fehlt ein Gildenrang.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { netzGebaeudeIds } from '../data/produktionsnetz';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import {
  getGebaeudeStatus, gebaeudeName, itemName, kostenText, dasGebaeude, einzelStatus, nachschub, WarteGrund,
} from './GebaeudeStatus';
import { maxStufe, stufeVon, fehlendeStadtstufe } from './Ausbau';
import { hatAuftragsliste } from './Auftraege';
import { naechsterBau } from './Empfehlung';

/** Gebäude-Typ, der eine Ware herstellt (erstes passendes Rezept); steht in GebaeudeStatus. */
export { lieferantFuer } from './GebaeudeStatus';

/** «Baue X aus.» oder, auf höchster Stufe, ein ehrlicher Hinweis. */
function ausbauHinweis(state: GameState, typeId: string): string {
  const b = dasGebaeude(state, typeId);
  const name = gebaeudeName(typeId);
  if (!b) return fehltSatz(state, typeId);
  const stadtstufe = fehlendeStadtstufe(state, b);
  if (stadtstufe) return `${name} stellt sie her. Weiter ausbauen erlaubt erst die Stadtstufe «${stadtstufe}» (Hauptmenü).`;
  if (stufeVon(b) < maxStufe(typeId)) return `${name} stellt sie her: baue ${name} aus, dann geht es schneller.`;
  return `${name} stellt sie her und läuft schon auf höchster Stufe, es braucht Zeit.`;
}

/** «a», «a und b», «a, b und c» */
function mitUnd(teile: string[]): string {
  return teile.length < 2 ? teile.join('') : `${teile.slice(0, -1).join(', ')} und ${teile[teile.length - 1]}`;
}

/**
 * Ein Gebäude fehlt noch: «Arkanschmiede braucht Gildenrang 2.» oder, baubar,
 * «Schmiede fehlt noch. Bauen kostet 100 Gold.» Die Hinweise kommen aus GebaeudeStatus.
 */
function fehltSatz(state: GameState, typeId: string): string {
  const name = gebaeudeName(typeId);
  const status = getGebaeudeStatus(state, typeId);
  if (status.zustand !== 'gesperrt') {
    return `${name} fehlt noch. Bauen kostet ${kostenText(BUILDING_DEFS[typeId]?.buildCost ?? {})}.`;
  }
  const rest = (status.hinweise ?? []).map(h => h.replace(/^braucht /, ''));
  return `${name} braucht ${mitUnd(rest)}.`;
}

/** Woher Gold und Beute kommen, wenn keine Werkstatt sie macht. */
function beuteSatz(item: string): string {
  if (item === 'gold') return 'Gold bringen Expeditionen, das Auftragsbrett im Gildenhaus und der Händler, der Beute ankauft.';
  return `${itemName(item)} gibt es als Beute in den Dungeons: schick die Helden auf Expedition.`;
}

/**
 * Wie es mit einer fehlenden Zutat weitergeht (GebaeudeStatus.nachschub): Hängt sie, auch eine Stufe
 * tiefer, an Beute, Gold oder einem Gebäude, das fehlt, steht das da («Dafür fehlt Eisenschrott. …»),
 * sonst der Ausbau-Hinweis für ihren Hersteller.
 */
function lieferHinweis(state: GameState, item: string): string {
  const n = nachschub(state, item);
  const dafuer = n.item !== item ? `Dafür fehlt ${itemName(n.item)}. ` : '';
  if (n.von === null) return dafuer + beuteSatz(n.item);
  return dafuer + ausbauHinweis(state, n.von);
}

function grundSatz(state: GameState, grund: WarteGrund): string | null {
  switch (grund.art) {
    case 'auftrag': return null; // Der Spieler entscheidet selbst, wann er herstellt
    case 'zulieferung': return null; // Die Zutat entsteht gerade in der liefernden Werkstatt
    case 'zutaten':
      return `${itemName(grund.item)}: ${grund.vorrat} im Lager, ${grund.bedarf} pro Auftrag. ${lieferHinweis(state, grund.item)}`;
  }
}

/** Engpass eines Gebäude-Typs, oder null, wenn nichts fehlt. */
export function engpassFuerGebaeude(state: GameState, typeId: string): string | null {
  const status = getGebaeudeStatus(state, typeId);
  switch (status.zustand) {
    case 'gesperrt':
    case 'bauplatz':
      return fehltSatz(state, typeId);
    case 'wartet':
    case 'bereit':
      return status.grund ? grundSatz(state, status.grund) : null;
    case 'laeuft':
    case 'offen':
      return null;
  }
}

/** Engpass einer einzelnen Werkstatt (für das Werkstatt-Fenster); Gildenhaus und Händler haben keinen. */
export function engpassFuerInstanz(state: GameState, b: BuildingInstance): string | null {
  if (!hatAuftragsliste(b)) return null;
  const grund = einzelStatus(state, b).grund;
  return grund ? grundSatz(state, grund) : null;
}

export interface Engpass {
  typeId: string;
  satz: string;
}

/**
 * Die wichtigsten Engpässe der Stadt, höchstens `max`:
 * zuerst gebaute Werkstätten, die warten, dann der empfohlene nächste Schritt (Empfehlung.ts:
 * ein Held, typeId leer, oder ein Bau), dann das erste gesperrte Gebäude.
 */
export function engpaesseDerStadt(state: GameState, max = 3): Engpass[] {
  const ids = netzGebaeudeIds();
  const status = ids.map(typeId => ({ typeId, s: getGebaeudeStatus(state, typeId) }));
  const liste: Engpass[] = [];
  const nimm = (typeId: string, satz: string | null) => {
    if (satz && !liste.some(e => e.satz === satz)) liste.push({ typeId, satz });
  };

  for (const { typeId, s } of status) {
    if (s.anzahl > 0 && s.grund && s.grund.art !== 'auftrag') nimm(typeId, grundSatz(state, s.grund));
  }
  // Der nächste Bau ist derselbe, den die Mindmap als «Als Nächstes» hervorhebt
  const naechster = naechsterBau(state);
  if (naechster?.schritt === 'held') nimm('', `${naechster.text}: ${naechster.warum}`);
  else if (naechster) nimm(naechster.typeId, fehltSatz(state, naechster.typeId));
  const gesperrt = status.find(x => x.s.zustand === 'gesperrt');
  if (gesperrt) nimm(gesperrt.typeId, fehltSatz(state, gesperrt.typeId));

  return liste.slice(0, max);
}
