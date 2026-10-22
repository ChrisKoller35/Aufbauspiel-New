// ─── Magic City – Die sechs Gebäude der Gildenstadt ─────────────
// Gildenhaus und Händler stehen von Anfang an, die vier Werkstätten
// baut man mit einem Bauplan (Händler oder Boss) für Gold und Beute aus
// den Dungeons. Kein Bauplatz, keine Bauzeit: Ein Bau steht sofort,
// und eine Werkstatt auf Stufe N arbeitet N-mal so schnell
// (systems/Ausbau.ts). Preise der Baupläne: data/haendler.ts.
// Regeln und Zahlen: docs/GILDENSTADT.md.
// ────────────────────────────────────────────────────────────────

import { BAUPLAN_PREISE, bauplanBossName, bauplanPreis } from './haendler';

/** Bedingungen, bevor ein Gebäude gebaut werden darf. */
export interface BuildingFreischaltung {
  /** Gebäude-IDs, die bereits stehen müssen. */
  braucht: string[];
  /** Mindest-Gildenrang (GuildStats.rank). */
  gildenrang?: number;
  /** Item-ID des Bauplans, der im Lager liegen muss (wird beim Bau verbraucht). */
  bauplan?: string;
}

export interface BuildingDef {
  id: string;
  name: string;
  tier: number;
  category: 'hub' | 'utility' | 'refine';
  /** Was der Bau kostet (Schlüssel wie in globalStock). Ausbau: Gold × Zielstufe plus ausbauBeute (systems/Ausbau.ts). */
  buildCost: Record<string, number>;
  /**
   * Beute je Ausbau-Stufe über der ersten (Stufe 2 einmal, Stufe 3 zweimal), nur Werkstätten:
   * Schmiede 10 / 20 Eisenschrott, Kräuterküche 5 / 10 Grüne Kräuter, Arkanschmiede 5 / 10
   * Kristallsplitter, Kriegsmaschinen 10 / 20 Eisenschrott (docs/GILDENSTADT.md, Spalte «Ausbau»).
   */
  ausbauBeute?: Record<string, number>;
  recipes: string[];
  expeditions: { partySlots: number; maxActiveRuns: number } | null;
  tags: string[];
  /** Werkstatt: arbeitet nur Aufträge ab und macht fehlende Zutaten von selbst (systems/Werkstattplan.ts). */
  manualCraft?: boolean;
  freischaltung: BuildingFreischaltung;
  spriteKey: string;
}

export const BUILDING_DEFS: Record<string, BuildingDef> = {
  GUILD_HALL: {
    id: 'GUILD_HALL',
    name: 'Gildenhaus',
    tier: 1,
    category: 'hub',
    buildCost: {},
    recipes: [],
    expeditions: { partySlots: 3, maxActiveRuns: 1 },
    tags: ['hub', 'guild'],
    freischaltung: { braucht: [] },
    spriteKey: 'GUILD_HALL',
  },
  HAENDLER: {
    id: 'HAENDLER',
    name: 'Händler',
    tier: 1,
    category: 'utility',
    buildCost: {},
    recipes: [],
    expeditions: null,
    tags: ['utility', 'economy'],
    freischaltung: { braucht: [] },
    spriteKey: 'MARKETPLACE',
  },
  SMITHY: {
    id: 'SMITHY',
    name: 'Schmiede',
    tier: 1,
    category: 'refine',
    buildCost: { gold: 50 },
    ausbauBeute: { iron_scrap: 10 },
    recipes: ['RCP_IRON_SWORD', 'RCP_IRON_SHIELD', 'RCP_LEATHER_ARMOR', 'RCP_STEEL_SWORD', 'RCP_LONGBOW', 'RCP_CRYSTAL_STAFF', 'RCP_STEEL_ARMOR', 'RCP_CRYSTAL_PENDANT'],
    expeditions: null,
    tags: ['craft', 'gear'],
    manualCraft: true,
    freischaltung: { braucht: [], bauplan: 'bauplan_schmiede' },
    spriteKey: 'SMITHY',
  },
  HERB_GARDEN: {
    id: 'HERB_GARDEN',
    name: 'Kräuterküche',
    tier: 1,
    category: 'refine',
    buildCost: { gold: 40 },
    ausbauBeute: { herb_green: 5 },
    recipes: ['RCP_HEALING_POTION', 'RCP_POWER_BREAD', 'RCP_STRENGTH_POTION', 'RCP_MANA_POTION', 'RCP_ANTIDOTE', 'RCP_TITAN_BREW', 'RCP_SPEED_POTION'],
    expeditions: null,
    tags: ['craft', 'herb'],
    manualCraft: true,
    freischaltung: { braucht: [], bauplan: 'bauplan_kraeuterkueche' },
    spriteKey: 'HERB_GARDEN',
  },
  ARCANE_SMITHY: {
    id: 'ARCANE_SMITHY',
    name: 'Arkanschmiede',
    tier: 2,
    category: 'refine',
    buildCost: { gold: 80, iron_scrap: 5, crystal_shard: 3 },
    ausbauBeute: { crystal_shard: 5 },
    recipes: ['RCP_MAGITECH_COMPONENT', 'RCP_ARCANE_BLADE', 'RCP_MAGITECH_SHIELD', 'RCP_ARCANE_PENDANT'],
    expeditions: null,
    tags: ['craft', 'gear', 'arcane'],
    manualCraft: true,
    freischaltung: { braucht: [], gildenrang: 2, bauplan: 'bauplan_arkanschmiede' },
    spriteKey: 'ARCANE_SMITHY',
  },
  WAR_MACHINE_WORKSHOP: {
    id: 'WAR_MACHINE_WORKSHOP',
    name: 'Kriegsmaschinen-Werkstatt',
    tier: 3,
    category: 'refine',
    buildCost: { gold: 100, iron_scrap: 20, crystal_shard: 5 },
    ausbauBeute: { iron_scrap: 10 },
    recipes: ['RCP_WAR_CATAPULT', 'RCP_WAR_CANNON'],
    expeditions: null,
    tags: ['craft', 'war'],
    manualCraft: true,
    freischaltung: { braucht: [], gildenrang: 4, bauplan: 'bauplan_kriegsmaschinen' },
    spriteKey: 'WAR_MACHINE_WORKSHOP',
  },
};

/** Reihenfolge im Baumenü und im Reiter AUFBAU. */
export const BUILD_MENU_ORDER = [
  'GUILD_HALL', 'HAENDLER', 'SMITHY', 'HERB_GARDEN', 'ARCANE_SMITHY', 'WAR_MACHINE_WORKSHOP',
];

// ── Freischaltung ───────────────────────────────────────────────

export type FreischaltStatus = 'gebaut' | 'baubar' | 'gesperrt';

/**
 * Woher der Bauplan eines Gebäudes kommt, in Spielersprache: «Bauplan beim Händler (50 Gold)»
 * bzw. «Bauplan beim Händler (150 Gold) oder vom Kristallgolem». Mit `stadtstufe` steht der
 * Preis mit Rabatt da. null für Gebäude ohne Bauplan.
 */
export function bauplanHinweis(typeId: string, stadtstufe = 1): string | null {
  const bauplan = BUILDING_DEFS[typeId]?.freischaltung.bauplan;
  if (!bauplan || !(bauplan in BAUPLAN_PREISE)) return null;
  const boss = bauplanBossName(bauplan);
  return `Bauplan beim Händler (${bauplanPreis(bauplan, stadtstufe)} Gold)${boss ? ` oder vom ${boss}` : ''}`;
}

/**
 * Fehlende Bedingungen als kurze Hinweise, z. B. «braucht Gildenrang 2» oder
 * «Bauplan beim Händler (50 Gold)». Leer = frei. `bauplaene` sind die Bauplan-Items im Lager.
 */
export function getFreischaltHinweise(
  typeId: string, builtTypeIds: Iterable<string>, gildenrang: number, bauplaene: Iterable<string>,
): string[] {
  const def = BUILDING_DEFS[typeId];
  if (!def) return [];
  const built = new Set(builtTypeIds);
  const hinweise: string[] = [];
  const fehlend = def.freischaltung.braucht.filter(id => !built.has(id));
  if (fehlend.length) {
    hinweise.push(`braucht ${fehlend.map(id => BUILDING_DEFS[id]?.name ?? id).join(' + ')}`);
  }
  const rang = def.freischaltung.gildenrang;
  if (rang && gildenrang < rang) hinweise.push(`braucht Gildenrang ${rang}`);
  const bauplan = def.freischaltung.bauplan;
  if (bauplan && !new Set(bauplaene).has(bauplan)) hinweise.push(bauplanHinweis(typeId) ?? 'braucht einen Bauplan');
  return hinweise;
}

export function isBuildingUnlocked(
  typeId: string, builtTypeIds: Iterable<string>, gildenrang: number, bauplaene: Iterable<string>,
): boolean {
  return getFreischaltHinweise(typeId, builtTypeIds, gildenrang, bauplaene).length === 0;
}

export function getFreischaltStatus(
  typeId: string, builtTypeIds: Iterable<string>, gildenrang: number, bauplaene: Iterable<string>,
): FreischaltStatus {
  const built = new Set(builtTypeIds);
  if (built.has(typeId)) return 'gebaut';
  return isBuildingUnlocked(typeId, built, gildenrang, bauplaene) ? 'baubar' : 'gesperrt';
}

/** Bauplan-Items, die im Lager liegen (für getFreischaltHinweise). */
export function bauplaeneImLager(globalStock: Readonly<Record<string, number>>): string[] {
  return Object.values(BUILDING_DEFS)
    .map(def => def.freischaltung.bauplan)
    .filter((id): id is string => !!id && (globalStock[id] ?? 0) >= 1);
}

/** Stufe im Aufbau-Baum: 0 ohne Voraussetzung, sonst 1 + höchste Stufe der Voraussetzungen. */
export function getFreischaltStufe(typeId: string, seen: ReadonlySet<string> = new Set()): number {
  const def = BUILDING_DEFS[typeId];
  if (!def) throw new Error(`Freischaltung: unbekanntes Gebäude ${typeId}`);
  if (seen.has(typeId)) throw new Error(`Freischaltung: Kreis bei ${typeId}`);
  const braucht = def.freischaltung.braucht;
  if (braucht.length === 0) return 0;
  const next = new Set(seen).add(typeId);
  return 1 + Math.max(...braucht.map(id => getFreischaltStufe(id, next)));
}
