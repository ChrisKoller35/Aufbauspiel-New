// ─── Magic City – Der Händler ───────────────────────────────────
// Steht von Anfang an in der Stadt und verkauft, was die Helden zum
// Start brauchen: Proviant, Grundausrüstung und die Baupläne der
// Werkstätten. Stückpreise, kein Tageslimit. Die Stadtstufe gibt Rabatt
// (Stadtrecht, data/stadtstufen.ts). Er kauft Beute, die niemand trägt,
// zum halben Grundwert: keine Baupläne, keine Set-Teile (die gehören in
// die Set-Schmiede zum Einschmelzen), kein Dungeon-Material.
// Der Dungeon-Händler im Sumpfdorf (MERCHANT_PRICES) bleibt teurer.
// Reine Daten und Preisfunktionen; Kaufen und Verkaufen: systems/Haendler.ts.
// Regeln und Zahlen: docs/GILDENSTADT.md.
// ────────────────────────────────────────────────────────────────

import { ITEM_DEFS, isBauplan } from './items';
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

/** Baupläne in Anzeige-Reihenfolge, einmal kaufbar (Bauplan-Item → Gold ohne Rabatt). */
export const BAUPLAN_PREISE: Readonly<Record<string, number>> = {
  bauplan_schmiede: 50,
  bauplan_kraeuterkueche: 50,
  bauplan_arkanschmiede: 150,
  bauplan_kriegsmaschinen: 250,
};

/**
 * Bosse, die einen Bauplan beim ersten Sieg fallen lassen (LootTableDef.ersterSiegBauplan),
 * im Dativ für «… oder vom Kristallgolem». Baupläne ohne Eintrag gibt es nur beim Händler.
 */
export const BAUPLAN_BOSS: Readonly<Record<string, string>> = {
  bauplan_arkanschmiede: 'Kristallgolem',
  bauplan_kriegsmaschinen: 'Gefallenen Ritter',
};

/** Name des Bosses, der den Bauplan fallen lässt (Dativ), oder null. */
export function bauplanBossName(bauplanId: string): string | null {
  return BAUPLAN_BOSS[bauplanId] ?? null;
}

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

/** Gold für einen Bauplan auf dieser Stadtstufe; 0, wenn der Händler ihn nicht führt. */
export function bauplanPreis(bauplanId: string, stadtstufe = 1): number {
  const preis = BAUPLAN_PREISE[bauplanId];
  return preis ? mitRabatt(preis, stadtstufe) : 0;
}

// ── Verkaufen (Ankauf) ──────────────────────────────────────────

/** Kauft der Händler diesen Gegenstand an? Nicht: Gold, Baupläne, Set-Teile, Dungeon-Material, Wertloses. */
export function istAnkaufbar(itemId: string): boolean {
  const def = ITEM_DEFS[itemId];
  if (!def || def.baseValue <= 0) return false;
  if (def.tags.includes('currency') || isBauplan(itemId)) return false;
  if (setVonItem(itemId) || def.tags.includes('set')) return false;
  if (itemId.startsWith('mat_') || def.tags.includes('schmiede')) return false;
  return true;
}

/** Gold je Stück beim Verkauf: halber Grundwert, mindestens 1; 0 für alles, was er nicht nimmt. */
export function ankaufpreis(itemId: string): number {
  if (!istAnkaufbar(itemId)) return 0;
  return Math.max(1, Math.floor(ITEM_DEFS[itemId].baseValue / 2));
}
