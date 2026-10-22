// ─── Magic City – Tagesbilanz der Stadt ─────────────────────────
// Reine Rechnung: Was entsteht und was wird pro Tag (TAG_SEKUNDEN)
// verbraucht, wenn alles so weiterläuft wie jetzt? Je Ware erzeugt,
// verbraucht, Bilanz und die Posten, aus denen die Zahlen stammen.
// Fehlende Zutaten zählen trotzdem: man soll sehen, dass der Bedarf
// grösser ist als der Nachschub. Werkstätten mit Auftragsliste,
// Handel und Expeditionen zählen nicht. Ungerundet; gerundet wird
// erst in der Anzeige (ProduktionTab). Regeln: docs/TAGESBILANZ.md.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS } from '../data/recipes';
import { GameState } from '../models/GameState';
import { zyklusSekunden } from './Ausbau';
import { TAG_SEKUNDEN, gebaeudeName, produktionsHindernis } from './GebaeudeStatus';
import { brotProTag } from './PeopleSystem';
import { EconomySystem } from './EconomySystem';

export interface BilanzPosten {
  /** Woher die Menge kommt, z. B. «Bäckerei» oder «Bewohner». */
  quelle: string;
  /** Pro Tag, positiv = erzeugt, negativ = verbraucht. */
  menge: number;
}

export interface WarenBilanz {
  erzeugt: number;
  verbraucht: number;
  bilanz: number;
  posten: BilanzPosten[];
}

export interface TagesBilanz {
  waren: Record<string, WarenBilanz>;
  gold: { steuern: number; bank: number; gesamt: number };
}

const economy = new EconomySystem();

function buche(waren: Record<string, WarenBilanz>, item: string, quelle: string, menge: number): void {
  if (menge === 0) return;
  const w = waren[item] ??= { erzeugt: 0, verbraucht: 0, bilanz: 0, posten: [] };
  if (menge > 0) w.erzeugt += menge;
  else w.verbraucht -= menge;
  w.bilanz += menge;
  const p = w.posten.find(x => x.quelle === quelle);
  if (p) p.menge += menge;
  else w.posten.push({ quelle, menge });
}

/** Erzeugung und Verbrauch pro Tag je Ware, dazu Gold. */
export function tagesBilanz(state: GameState): TagesBilanz {
  const waren: Record<string, WarenBilanz> = {};

  for (const b of state.buildings) {
    if (!b || !b.activeRecipeId) continue;
    const def = BUILDING_DEFS[b.typeId];
    const recipe = RECIPE_DEFS[b.activeRecipeId];
    // Auftragsliste: einzelne Aufträge, keine laufende Produktion
    if (!def || !recipe || def.manualCraft) continue;
    if (produktionsHindernis(b, def, recipe)) continue;
    const zyklen = TAG_SEKUNDEN / Math.max(0.001, zyklusSekunden(b, recipe));
    const name = gebaeudeName(b.typeId);
    for (const [item, menge] of Object.entries(recipe.outputs)) buche(waren, item, name, menge * zyklen);
    for (const [item, menge] of Object.entries(recipe.inputs)) buche(waren, item, name, -menge * zyklen);
  }

  buche(waren, 'bread', 'Bewohner', -brotProTag(state.citizens.length));

  const r = economy.steuerRechnung(state);
  return { waren, gold: { steuern: r.steuern, bank: r.bank, gesamt: r.gesamt } };
}

/** Wie viele Tage der Vorrat bei negativer Bilanz noch reicht, sonst null. */
export function reichtTage(vorrat: number, bilanz: number): number | null {
  if (bilanz >= 0) return null;
  return Math.max(0, Math.floor(Math.max(0, vorrat) / -bilanz));
}
