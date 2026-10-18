// ─── Magic City – Engpass-Suche ─────────────────────────────────
// Findet, woran ein Gebäude oder eine ganze Produktionskette hängt,
// und sagt es in einem Satz in Spielersprache, mit dem nächsten Schritt.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS } from '../data/recipes';
import { Produktionskette, gliedTypeIds } from '../data/produktionsketten';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import {
  getGebaeudeStatus, gebaeudeName, itemName, kostenText, wohnKapazitaet, gebaeudeVomTyp, einzelStatus, WarteGrund,
} from './GebaeudeStatus';

/** Gebäude-Typ, der eine Ware herstellt (erstes passendes Rezept). */
export function lieferantFuer(item: string): string | null {
  for (const def of Object.values(BUILDING_DEFS)) {
    for (const id of def.recipes) {
      if ((RECIPE_DEFS[id]?.outputs[item] ?? 0) > 0) return def.id;
    }
  }
  return null;
}

function freieBewohner(state: GameState): number {
  return state.citizens.filter(c => c.status === 'IDLE').length;
}

function wohnHinweis(state: GameState): string {
  if (state.citizens.length >= wohnKapazitaet(state)) return 'Baue ein Wohnhaus, damit neue Bewohner kommen.';
  if ((state.globalStock.bread ?? 0) < 1) return 'Neue Bewohner kommen nur mit Brot im Lager.';
  return 'Der nächste Bewohner kommt bald.';
}

export function grundSatz(state: GameState, typeId: string, grund: WarteGrund): string | null {
  const name = gebaeudeName(typeId);
  switch (grund.art) {
    case 'im-bau': return `${name} ist noch im Bau.`;
    case 'unwetter': return `${name} steht still: Unwetter.`;
    case 'nicht-verbunden': return `${name} ist nicht verbunden.`;
    case 'kein-rezept': return `${name} hat kein Rezept gewählt.`;
    case 'auftrag': return null; // Der Spieler entscheidet selbst, wann er herstellt
    case 'kein-wasser': return `${name} braucht Wasser: baue einen Brunnen.`;
    case 'kein-arbeiter':
      return freieBewohner(state) > 0
        ? `${name} bekommt gleich einen Arbeiter.`
        : `${name} hat keinen Arbeiter, alle Bewohner arbeiten schon. ${wohnHinweis(state)}`;
    case 'zutaten': {
      const ware = itemName(grund.item);
      const lieferant = lieferantFuer(grund.item);
      let weiter: string;
      if (!lieferant) weiter = `${ware} gibt es als Beute in den Dungeons.`;
      else if (gebaeudeVomTyp(state, lieferant).length === 0) weiter = `Baue ${gebaeudeName(lieferant)}.`;
      else weiter = `${gebaeudeName(lieferant)} liefert sie, ein zweites hilft.`;
      return `${ware}: ${grund.vorrat} im Lager, ${grund.bedarf} pro Auftrag. ${weiter}`;
    }
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
      if (status.grund) return grundSatz(state, typeId, status.grund);
      if (BUILDING_DEFS[typeId]?.housing && state.citizens.length >= wohnKapazitaet(state)) {
        return `Wohnhäuser sind voll (${state.citizens.length}/${wohnKapazitaet(state)}). Baue ein Wohnhaus, damit die Stadt wächst.`;
      }
      return null;
    case 'laeuft':
      return null;
  }
}

/** Engpass eines einzelnen Gebäudes (für das Werkstatt-Fenster). */
export function engpassFuerInstanz(state: GameState, b: BuildingInstance): string | null {
  if ((BUILDING_DEFS[b.typeId]?.recipes.length ?? 0) === 0) return null;
  const grund = einzelStatus(state, b).grund;
  return grund ? grundSatz(state, b.typeId, grund) : null;
}

/** Erster Engpass entlang einer Kette, oder null, wenn sie rund läuft.
 *  Erst die Gebäude in Reihenfolge, danach Zutaten aus den Dungeons. */
export function engpassFuerKette(state: GameState, kette: Produktionskette): string | null {
  for (const glied of kette.glieder) {
    for (const typeId of gliedTypeIds(glied)) {
      const satz = engpassFuerGebaeude(state, typeId);
      if (satz) return satz;
    }
  }
  for (const glied of kette.glieder) {
    if (glied.art === 'quelle' && glied.items.every(item => (state.globalStock[item] ?? 0) < 1)) {
      return `${glied.titel}: keine im Lager. Sie kommen als Beute aus den Dungeons.`;
    }
  }
  return null;
}
