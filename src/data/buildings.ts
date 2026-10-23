// ─── Magic City – Die sechs Gebäude der Gildenstadt ─────────────
// Gildenhaus und Händler stehen von Anfang an, die vier Werkstätten
// schaltet man direkt auf ihrem Feld frei: Gold und Beute aus den
// Dungeons, die späteren erst ab einem Gildenrang. Keine Baupläne,
// keine Bauzeit: Ein Bau steht sofort, und eine Werkstatt auf Stufe N
// arbeitet N-mal so schnell (systems/Ausbau.ts).
// Regeln und Zahlen: docs/GILDENSTADT.md.
// ────────────────────────────────────────────────────────────────

/** Bedingungen, bevor ein Gebäude gebaut werden darf. */
export interface BuildingFreischaltung {
  /** Gebäude-IDs, die bereits stehen müssen. */
  braucht: string[];
  /** Mindest-Gildenrang (GuildStats.rank). */
  gildenrang?: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  tier: number;
  category: 'hub' | 'utility' | 'refine';
  /** Was der Bau (das Freischalten auf dem Feld) kostet, Schlüssel wie in globalStock. */
  buildCost: Record<string, number>;
  /** Gold je Ausbau-Stufe: Ausbau kostet ausbauGold × Zielstufe plus ausbauBeute (systems/Ausbau.ts). */
  ausbauGold?: number;
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
    buildCost: { gold: 100 },
    ausbauGold: 50,
    ausbauBeute: { iron_scrap: 10 },
    recipes: ['RCP_IRON_SWORD', 'RCP_IRON_SHIELD', 'RCP_LEATHER_ARMOR', 'RCP_STEEL_SWORD', 'RCP_LONGBOW', 'RCP_CRYSTAL_STAFF', 'RCP_STEEL_ARMOR', 'RCP_CRYSTAL_PENDANT'],
    expeditions: null,
    tags: ['craft', 'gear'],
    manualCraft: true,
    freischaltung: { braucht: [] },
    spriteKey: 'SMITHY',
  },
  HERB_GARDEN: {
    id: 'HERB_GARDEN',
    name: 'Kräuterküche',
    tier: 1,
    category: 'refine',
    buildCost: { gold: 90 },
    ausbauGold: 40,
    ausbauBeute: { herb_green: 5 },
    recipes: ['RCP_HEALING_POTION', 'RCP_POWER_BREAD', 'RCP_STRENGTH_POTION', 'RCP_MANA_POTION', 'RCP_ANTIDOTE', 'RCP_TITAN_BREW', 'RCP_SPEED_POTION'],
    expeditions: null,
    tags: ['craft', 'herb'],
    manualCraft: true,
    freischaltung: { braucht: [] },
    spriteKey: 'HERB_GARDEN',
  },
  ARCANE_SMITHY: {
    id: 'ARCANE_SMITHY',
    name: 'Arkanschmiede',
    tier: 2,
    category: 'refine',
    buildCost: { gold: 230, iron_scrap: 5, crystal_shard: 3 },
    ausbauGold: 80,
    ausbauBeute: { crystal_shard: 5 },
    recipes: ['RCP_MAGITECH_COMPONENT', 'RCP_ARCANE_BLADE', 'RCP_MAGITECH_SHIELD', 'RCP_ARCANE_PENDANT'],
    expeditions: null,
    tags: ['craft', 'gear', 'arcane'],
    manualCraft: true,
    freischaltung: { braucht: [], gildenrang: 2 },
    spriteKey: 'ARCANE_SMITHY',
  },
  WAR_MACHINE_WORKSHOP: {
    id: 'WAR_MACHINE_WORKSHOP',
    name: 'Kriegsmaschinen-Werkstatt',
    tier: 3,
    category: 'refine',
    buildCost: { gold: 350, iron_scrap: 20, crystal_shard: 5 },
    ausbauGold: 100,
    ausbauBeute: { iron_scrap: 10 },
    recipes: ['RCP_WAR_CATAPULT', 'RCP_WAR_CANNON'],
    expeditions: null,
    tags: ['craft', 'war'],
    manualCraft: true,
    freischaltung: { braucht: [], gildenrang: 4 },
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
 * Fehlende Bedingungen als kurze Hinweise, z. B. «braucht Gildenrang 2». Leer = frei:
 * dann lässt sich das Gebäude auf seinem Feld für die Baukosten bauen.
 */
export function getFreischaltHinweise(typeId: string, builtTypeIds: Iterable<string>, gildenrang: number): string[] {
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
  return hinweise;
}

export function isBuildingUnlocked(typeId: string, builtTypeIds: Iterable<string>, gildenrang: number): boolean {
  return getFreischaltHinweise(typeId, builtTypeIds, gildenrang).length === 0;
}

export function getFreischaltStatus(typeId: string, builtTypeIds: Iterable<string>, gildenrang: number): FreischaltStatus {
  const built = new Set(builtTypeIds);
  if (built.has(typeId)) return 'gebaut';
  return isBuildingUnlocked(typeId, built, gildenrang) ? 'baubar' : 'gesperrt';
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
