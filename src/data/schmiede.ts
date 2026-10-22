// ─── Magic City – Schmiede ──────────────────────────────────────
// In der Schmiede werden Set-Teile bis +5 verbessert (systems/Schmiede.ts). Das Material
// dafür fällt in den Dungeons: Jedes Gebiet hat sein eigenes, und ein Set-Teil braucht das
// Material aus dem Gebiet seines Dungeons. Jede Stufe gilt für alle Exemplare eines Teils.
// Anleitung und Zahlen: docs/SCHMIEDE.md. Bilder: tools/materialBilder.ts.
// ────────────────────────────────────────────────────────────────

import type { ItemDef } from './items';
import type { SetTeilArt } from './dungeonSets';

export interface SchmiedeMaterialDef {
  /** Gegenstands-ID im Lager */
  id: string;
  name: string;
  /** Gebiet für Sätze wie «Material aus dem Wald» */
  ausGebiet: string;
  /** Die Dungeons, in denen es fällt (jeder Dungeon hat genau eins) */
  routen: string[];
  /** Bild in public/assets/sprites/final, gezeichnet von tools/materialBilder.ts */
  bild: string;
  text: string;
}

/** Die Materialien von unten nach oben auf der Dungeon-Karte */
export const SCHMIEDE_MATERIALIEN: SchmiedeMaterialDef[] = [
  {
    id: 'mat_waldharz', name: 'Waldharz', ausGebiet: 'aus dem Wald', bild: 'MAT_WALDHARZ',
    routen: ['forest_short', 'forest_ruins', 'forest_medium', 'haunted_woods'],
    text: 'Klebt an allem. Vor allem an Klingen, die danach länger halten.',
  },
  {
    id: 'mat_moorpilz', name: 'Moorpilz', ausGebiet: 'aus dem Sumpf', bild: 'MAT_MOORPILZ',
    routen: ['swamp_village', 'swamp_long'],
    text: 'Leuchtet im Dunkeln. Gegessen hat ihn noch keiner zweimal.',
  },
  {
    id: 'mat_hoehlenerz', name: 'Höhlenerz', ausGebiet: 'aus den Höhlen', bild: 'MAT_HOEHLENERZ',
    routen: ['cave_deep', 'cave_spider', 'cave_tunnels', 'crystal_mines'],
    text: 'Schwer, kalt und voller blauer Adern. Die Goblins nennen es Steinbrot.',
  },
  {
    id: 'mat_tiefseeperle', name: 'Tiefseeperle', ausGebiet: 'aus dem Meer', bild: 'MAT_TIEFSEEPERLE',
    routen: ['ocean_shallows', 'ocean_depths', 'ocean_abyss'],
    text: 'Jede dieser Perlen hat einmal etwas sehr Grosses geärgert.',
  },
  {
    id: 'mat_festungseisen', name: 'Festungseisen', ausGebiet: 'aus der Belagerung', bild: 'MAT_FESTUNGSEISEN',
    routen: ['siege_walls', 'siege_fortress'],
    text: 'Aus Toren, die keiner mehr bewacht. Rostet nicht, aus Prinzip.',
  },
  {
    id: 'mat_eisbluete', name: 'Eisblüte', ausGebiet: 'vom Frostpass', bild: 'MAT_EISBLUETE',
    routen: ['frozen_pass'],
    text: 'Blüht nur im ewigen Eis und schmilzt nie, nicht einmal in der Esse.',
  },
  {
    id: 'mat_gruftsilber', name: 'Gruftsilber', ausGebiet: 'aus den Gruften', bild: 'MAT_GRUFTSILBER',
    routen: ['ruins_crypts', 'ruins_depths', 'shadow_catacombs'],
    text: 'Grabbeigaben. Die Vorbesitzer haben nichts dagegen. Meistens.',
  },
  {
    id: 'mat_glutkern', name: 'Glutkern', ausGebiet: 'aus dem Feuer', bild: 'MAT_GLUTKERN',
    routen: ['obsidian_tunnels', 'ash_wastes', 'magma_caverns', 'volcano_core'],
    text: 'Noch warm. Immer noch warm. Wird nie kalt.',
  },
  {
    id: 'mat_drachenschuppe', name: 'Drachenschuppe', ausGebiet: 'aus dem Drachenhort', bild: 'MAT_DRACHENSCHUPPE',
    routen: ['drachenhort'],
    text: 'Ignarax hat mehr als genug davon. Er zählt sie trotzdem jeden Abend.',
  },
  {
    id: 'mat_himmelstinte', name: 'Himmelstinte', ausGebiet: 'aus dem Himmelsarchiv', bild: 'MAT_HIMMELSTINTE',
    routen: ['himmelsarchiv'],
    text: 'Damit schreibt man Sterne an den Himmel. Oder Runen in eine Rüstung.',
  },
  {
    id: 'mat_sternenstahl', name: 'Sternenstahl', ausGebiet: 'aus den Sternen', bild: 'MAT_STERNENSTAHL',
    routen: ['sternenschmiede', 'sternenschlund'],
    text: 'Fällt manchmal vom Himmel, meistens jemandem auf den Kopf. Der wird dann Schmied.',
  },
  {
    id: 'mat_mondsilber', name: 'Mondsilber', ausGebiet: 'vom Mond', bild: 'MAT_MONDSILBER',
    routen: ['mondhof'],
    text: 'Wird bei Vollmond geschlagen und bei Neumond gezählt. Dazwischen fehlt immer eins.',
  },
];

// ── Stufen und Werte ──

/** Höchste Stufe eines Set-Teils */
export const MAX_SCHMIEDE_STUFE = 5;

/** Jede Stufe macht alle Werte eines Teils um so viele Prozent stärker (den Hauptwert mindestens um 1) */
export const PROZENT_JE_STUFE = 10;

/**
 * Hauptwert je Bauart: Er steigt jede Stufe mindestens um 1 (Krit-Chance um 1 %), damit
 * auch kleine Teile jede Stufe sichtbar besser werden. Beim Ring ist es die Krit-Chance,
 * sonst würde sein kleiner Angriff schneller wachsen als bei den Waffen.
 */
export const HAUPTWERT: Record<SetTeilArt, 'atk' | 'def' | 'hp' | 'critChance'> = {
  klinge: 'atk', dolch: 'atk', hammer: 'atk', bogen: 'atk', stab: 'atk',
  schild: 'def', platte: 'def', leder: 'def',
  robe: 'hp', amulett: 'hp', talisman: 'hp',
  ring: 'critChance',
};

// ── Kosten und Beute ──

/**
 * Grundmenge Material einer Ebene: So viel bringt ein Sieg (Normal) in einem Dungeon dieser
 * Ebene, und darin rechnen die Kosten der Set-Teile dieser Ebene.
 */
export function grundMenge(tier: number): number {
  return 2 + Math.max(1, tier);
}

/** Kosten je Stufe, Index 0 = auf +1. Material mal Grundmenge, Gold mal Ebene. */
export const MATERIAL_JE_STUFE = [2, 3, 5, 8, 12];
export const GOLD_JE_STUFE = [20, 40, 80, 160, 320];
export const SPLITTER_JE_STUFE = [0, 0, 3, 6, 12];

/** Jede Ausbaustufe der Schmiede in der Stadt spart so viel vom Gold */
export const RABATT_JE_SCHMIEDE_STUFE = 0.1;

/** Ein doppeltes Teil einschmelzen bringt so viele Grundmengen seines Materials */
export const EINSCHMELZEN_GRUNDMENGEN = 2;

/** Ohne Sieg gibt es Material nach den geschafften Räumen, davon dieser Anteil */
export const ANTEIL_OHNE_SIEG = 0.5;

// ── Nachschlagen ──

const MATERIAL_NACH_ROUTE = new Map(SCHMIEDE_MATERIALIEN.flatMap(m => m.routen.map(r => [r, m] as const)));
const MATERIAL_NACH_ID = new Map(SCHMIEDE_MATERIALIEN.map(m => [m.id, m]));

/** Das Material, das ein Dungeon fallen lässt */
export function materialFuerRoute(routeId: string): SchmiedeMaterialDef | undefined {
  return MATERIAL_NACH_ROUTE.get(routeId);
}

export function getMaterial(itemId: string): SchmiedeMaterialDef | undefined {
  return MATERIAL_NACH_ID.get(itemId);
}

/** Alle Materialien als Gegenstände (werden in ITEM_DEFS aufgenommen) */
export function materialItemDefs(): Record<string, ItemDef> {
  const defs: Record<string, ItemDef> = {};
  for (const m of SCHMIEDE_MATERIALIEN) {
    defs[m.id] = {
      id: m.id,
      name: m.name,
      type: 'material',
      stackSize: 999,
      baseValue: 8,
      spriteKey: m.bild,
      productionSource: 'expedition_only',
      tags: ['material', 'schmiede'],
      flavorText: m.text,
    };
  }
  return defs;
}
