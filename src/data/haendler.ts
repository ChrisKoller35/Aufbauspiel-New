// ─── Magic City – Der Händler ───────────────────────────────────
// Steht von Anfang an in der Stadt und verkauft, was die Helden zum
// Start brauchen: Proviant und Grundausrüstung. Stückpreise, kein
// Tageslimit. Die Stadtstufe gibt Rabatt (Stadtrecht, data/stadtstufen.ts).
// Er kauft Beute, die niemand trägt, zum halben Grundwert: keine
// Set-Teile (die gehören in die Set-Schmiede zum Einschmelzen), kein
// Dungeon-Material. Werkstätten schaltet man direkt auf ihrem Feld frei.
// Der Dungeon-Händler im Sumpfdorf (MERCHANT_PRICES) bleibt teurer.
// Reine Daten und Preisfunktionen; Kaufen und Verkaufen: systems/Haendler.ts.
// Regeln und Zahlen: docs/GILDENSTADT.md.
// ────────────────────────────────────────────────────────────────

import { ITEM_DEFS } from './items';
import { setVonItem } from './dungeonSets';
import { stufeDef } from './stadtstufen';

export interface HaendlerWare {
  itemId: string;
  /** Gold je Stück ohne Rabatt. */
  preis: number;
}

/** Waren in Anzeige-Reihenfolge. */
export const HAENDLER_WAREN: HaendlerWare[] = [
  { itemId: 'bread', preis: 4 },
  { itemId: 'healing_potion', preis: 10 },
  { itemId: 'iron_sword', preis: 25 },
  { itemId: 'iron_shield', preis: 25 },
  { itemId: 'leather_armor', preis: 25 },
];

// ── Kaufen ──────────────────────────────────────────────────────

/** Rabatt in Prozent auf dieser Stadtstufe (Stadtrecht: Stufe 4 bis 6 10 %, Stufe 7 20 %). */
export function rabattProzent(stadtstufe: number): number {
  return stufeDef(stadtstufe).haendlerRabatt;
}

/** Preis mit Rabatt, auf ganze Gold gerundet, nie unter 1. */
function mitRabatt(preis: number, stadtstufe: number): number {
  return Math.max(1, Math.round(preis * (100 - rabattProzent(stadtstufe)) / 100));
}

/** Gold je Stück einer Ware auf dieser Stadtstufe; 0, wenn der Händler sie nicht führt. */
export function kaufpreis(itemId: string, stadtstufe = 1): number {
  const ware = HAENDLER_WAREN.find(w => w.itemId === itemId);
  return ware ? mitRabatt(ware.preis, stadtstufe) : 0;
}

// ── Verkaufen (Ankauf) ──────────────────────────────────────────

/** Kauft der Händler diesen Gegenstand an? Nicht: Gold, Set-Teile, Dungeon-Material, Wertloses. */
export function istAnkaufbar(itemId: string): boolean {
  const def = ITEM_DEFS[itemId];
  if (!def || def.baseValue <= 0) return false;
  if (def.tags.includes('currency')) return false;
  if (setVonItem(itemId) || def.tags.includes('set')) return false;
  if (itemId.startsWith('mat_') || def.tags.includes('schmiede')) return false;
  return true;
}

/** Gold je Stück beim Verkauf: halber Grundwert, mindestens 1; 0 für alles, was er nicht nimmt. */
export function ankaufpreis(itemId: string): number {
  if (!istAnkaufbar(itemId)) return 0;
  return Math.max(1, Math.floor(ITEM_DEFS[itemId].baseValue / 2));
}
