/** Bedingungen, bevor ein Gebäude gebaut werden darf. */
export interface BuildingFreischaltung {
  braucht: string[];      // Gebäude-IDs, die bereits stehen müssen
  gildenrang?: number;    // Mindest-Gildenrang (GuildStats.rank)
  bauplan?: string;       // Item-ID eines Bauplans (Schritt 2, wird noch nicht geprüft)
}

export interface BuildingDef {
  id: string;
  name: string;
  tier: number;
  category: 'producer' | 'refine' | 'utility' | 'storage' | 'housing' | 'hub' | 'infrastructure';
  footprint: [number, number]; // [width, height] in tiles
  buildCost: Record<string, number>;
  buildTimeSec: number;
  workerSlots: number;
  requiresConnectivity: boolean;
  storage: { localOutputBuffer: number; localInputBuffer: number } | { capacity: number; stackSizeDefault: number } | null;
  recipes: string[];
  radiusEffect: { type: string; radiusTiles: number } | null;
  housing: { capacity: number; baseTaxPerMin: number } | null;
  expeditions: { partySlots: number; maxActiveRuns: number } | null;
  training: { trainingTimeSec: number; trainingCost: Record<string, number> } | null;
  tags: string[];
  requirements?: { waterSupplied?: boolean };
  manualCraft?: boolean;  // true = player must click "Herstellen" to start each cycle
  freischaltung: BuildingFreischaltung;
  spriteKey: string;
}

export const BUILDING_DEFS: Record<string, BuildingDef> = {
  FARM_GRAIN: {
    id: 'FARM_GRAIN',
    name: 'Getreidefarm',
    tier: 1,
    category: 'producer',
    footprint: [3, 3],
    buildCost: { wood: 12 },
    buildTimeSec: 20,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 10, localInputBuffer: 10 },
    recipes: ['RCP_GRAIN_1'],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['food', 'farm'],
    freischaltung: { braucht: ['QUARRY'] },
    spriteKey: 'FARM_GRAIN',
  },
  WELL: {
    id: 'WELL',
    name: 'Brunnen',
    tier: 1,
    category: 'utility',
    footprint: [2, 2],
    buildCost: { wood: 8 },
    buildTimeSec: 12,
    workerSlots: 0,
    requiresConnectivity: false,
    storage: null,
    recipes: [],
    radiusEffect: { type: 'water', radiusTiles: 6 },
    housing: null,
    expeditions: null,
    training: null,
    tags: ['utility', 'water'],
    freischaltung: { braucht: ['LUMBER_CAMP'] },
    spriteKey: 'WELL',
  },
  MILL_WIND: {
    id: 'MILL_WIND',
    name: 'Windmühle',
    tier: 1,
    category: 'refine',
    footprint: [3, 2],
    buildCost: { wood: 18 },
    buildTimeSec: 25,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 10, localInputBuffer: 10 },
    recipes: ['RCP_FLOUR_1'],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['food'],
    freischaltung: { braucht: ['FARM_GRAIN'] },
    spriteKey: 'MILL_WIND',
  },
  BAKERY: {
    id: 'BAKERY',
    name: 'Bäckerei',
    tier: 1,
    category: 'refine',
    footprint: [2, 2],
    buildCost: { wood: 20, stone: 5 },
    buildTimeSec: 45,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 10, localInputBuffer: 10 },
    recipes: ['RCP_BREAD_1', 'RCP_POWER_BREAD'],
    radiusEffect: { type: 'charcoal_supply', radiusTiles: 5 },
    housing: null,
    expeditions: null,
    training: null,
    tags: ['food'],
    requirements: { waterSupplied: true },
    freischaltung: { braucht: ['MILL_WIND', 'WELL'] },
    spriteKey: 'BAKERY',
  },
  LUMBER_CAMP: {
    id: 'LUMBER_CAMP',
    name: 'Holzfällerhütte',
    tier: 1,
    category: 'producer',
    footprint: [2, 2],
    buildCost: { wood: 10 },
    buildTimeSec: 18,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 10, localInputBuffer: 10 },
    recipes: ['RCP_WOOD_1'],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['material'],
    freischaltung: { braucht: [] },
    spriteKey: 'LUMBER_CAMP',
  },
  QUARRY: {
    id: 'QUARRY',
    name: 'Steinbruch',
    tier: 1,
    category: 'producer',
    footprint: [3, 2],
    buildCost: { wood: 14 },
    buildTimeSec: 20,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 10, localInputBuffer: 10 },
    recipes: ['RCP_STONE_1'],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['material'],
    freischaltung: { braucht: ['LUMBER_CAMP'] },
    spriteKey: 'QUARRY',
  },
  WAREHOUSE: {
    id: 'WAREHOUSE',
    name: 'Lagerhaus',
    tier: 1,
    category: 'storage',
    footprint: [4, 3],
    buildCost: { wood: 30 },
    buildTimeSec: 40,
    workerSlots: 0,
    requiresConnectivity: false,
    storage: { capacity: 300, stackSizeDefault: 100 },
    recipes: [],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['storage'],
    freischaltung: { braucht: [] },
    spriteKey: 'WAREHOUSE',
  },
  HOUSE_T1: {
    id: 'HOUSE_T1',
    name: 'Wohnhaus',
    tier: 1,
    category: 'housing',
    footprint: [2, 2],
    buildCost: { wood: 14 },
    buildTimeSec: 22,
    workerSlots: 0,
    requiresConnectivity: true,
    storage: null,
    recipes: [],
    radiusEffect: null,
    housing: { capacity: 4, baseTaxPerMin: 8 },
    expeditions: null,
    training: null,
    tags: ['housing'],
    freischaltung: { braucht: [] },
    spriteKey: 'HOUSE_T1',
  },
  GUILD_HALL: {
    id: 'GUILD_HALL',
    name: 'Gildenhaus',
    tier: 1,
    category: 'hub',
    footprint: [4, 4],
    buildCost: { wood: 40, stone: 5 },
    buildTimeSec: 60,
    workerSlots: 0,
    requiresConnectivity: true,
    storage: null,
    recipes: [],
    radiusEffect: null,
    housing: null,
    expeditions: { partySlots: 3, maxActiveRuns: 1 },
    training: { trainingTimeSec: 0, trainingCost: { gold: 15 } },
    tags: ['hub', 'guild'],
    freischaltung: { braucht: [] },
    spriteKey: 'GUILD_HALL',
  },
  HERB_GARDEN: {
    id: 'HERB_GARDEN',
    name: 'Kräutergarten',
    tier: 1,
    category: 'producer',
    footprint: [2, 3],
    buildCost: { wood: 10, stone: 3 },
    buildTimeSec: 20,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 10, localInputBuffer: 10 },
    recipes: ['RCP_HERB_1', 'RCP_HEALING_POTION', 'RCP_STRENGTH_POTION', 'RCP_MANA_POTION', 'RCP_ANTIDOTE', 'RCP_TITAN_BREW', 'RCP_SPEED_POTION'],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['herb', 'farm'],
    requirements: { waterSupplied: true },
    freischaltung: { braucht: ['FARM_GRAIN', 'WELL'] },
    spriteKey: 'HERB_GARDEN',
  },
  SMITHY: {
    id: 'SMITHY',
    name: 'Schmiede',
    tier: 1,
    category: 'refine',
    footprint: [3, 2],
    buildCost: { wood: 22, stone: 10 },
    buildTimeSec: 50,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 5, localInputBuffer: 10 },
    recipes: ['RCP_IRON_SWORD', 'RCP_IRON_SHIELD', 'RCP_LEATHER_ARMOR', 'RCP_STEEL_SWORD', 'RCP_LONGBOW', 'RCP_CRYSTAL_STAFF', 'RCP_STEEL_ARMOR', 'RCP_CRYSTAL_PENDANT'],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['craft', 'gear'],
    manualCraft: true,
    freischaltung: { braucht: ['LUMBER_CAMP', 'QUARRY'] },
    spriteKey: 'SMITHY',
  },
  IRON_MINE: {
    id: 'IRON_MINE',
    name: 'Eisenmine',
    tier: 1,
    category: 'producer',
    footprint: [3, 3],
    buildCost: { wood: 20, stone: 15, gold: 25 },
    buildTimeSec: 55,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 5, localInputBuffer: 0 },
    recipes: ['RCP_IRON_SCRAP_1'],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['material', 'mine'],
    freischaltung: { braucht: ['SMITHY'] },
    spriteKey: 'IRON_MINE',
  },
  ROAD: {
    id: 'ROAD',
    name: 'Straße',
    tier: 0,
    category: 'infrastructure',
    footprint: [1, 1],
    buildCost: { wood: 1, gold: 1 },
    buildTimeSec: 0,
    workerSlots: 0,
    requiresConnectivity: false,
    storage: null,
    recipes: [],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['road', 'walkable'],
    freischaltung: { braucht: [] },
    spriteKey: 'ROAD',
  },
  DUNGEON_CAMP: {
    id: 'DUNGEON_CAMP',
    name: 'Dungeon-Lager',
    tier: 1,
    category: 'hub',
    footprint: [4, 4],
    buildCost: {},
    buildTimeSec: 0,
    workerSlots: 0,
    requiresConnectivity: false,
    storage: null,
    recipes: [],
    radiusEffect: null,
    housing: null,
    expeditions: { partySlots: 3, maxActiveRuns: 1 },
    training: null,
    tags: ['hub', 'dungeon'],
    freischaltung: { braucht: [] },
    spriteKey: 'GUILD_HALL',
  },
  TREASURE_CHEST: {
    id: 'TREASURE_CHEST',
    name: 'Schatztruhe',
    tier: 0,
    category: 'hub',
    footprint: [2, 2],
    buildCost: {},
    buildTimeSec: 0,
    workerSlots: 0,
    requiresConnectivity: false,
    storage: null,
    recipes: [],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['hub', 'loot'],
    freischaltung: { braucht: [] },
    spriteKey: 'ISO_TREASURE_CHEST',
  },
  ARCANE_SMITHY: {
    id: 'ARCANE_SMITHY',
    name: 'Arkanschmiede',
    tier: 2,
    category: 'refine',
    footprint: [3, 3],
    buildCost: { iron_scrap: 5, stone: 4, crystal_shard: 3, gold: 80 },
    buildTimeSec: 120,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 5, localInputBuffer: 10 },
    recipes: ['RCP_MAGITECH_COMPONENT', 'RCP_ARCANE_BLADE', 'RCP_MAGITECH_SHIELD', 'RCP_ARCANE_PENDANT'],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['craft', 'gear', 'arcane'],
    manualCraft: true,
    freischaltung: { braucht: ['IRON_MINE'], gildenrang: 2, bauplan: 'bauplan_arkanschmiede' },
    spriteKey: 'ARCANE_SMITHY',
  },
  MARKETPLACE: {
    id: 'MARKETPLACE',
    name: 'Marktplatz',
    tier: 2,
    category: 'utility',
    footprint: [4, 3],
    buildCost: { wood: 30, stone: 20, gold: 60 },
    buildTimeSec: 90,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: null,
    recipes: [],
    radiusEffect: { type: 'market', radiusTiles: 8 },
    housing: null,
    expeditions: null,
    training: null,
    tags: ['utility', 'economy'],
    freischaltung: { braucht: ['GUILD_HALL', 'WAREHOUSE'], gildenrang: 2, bauplan: 'bauplan_marktplatz' },
    spriteKey: 'MARKETPLACE',
  },
  WAR_MACHINE_WORKSHOP: {
    id: 'WAR_MACHINE_WORKSHOP',
    name: 'Kriegsmaschinen-Werkstatt',
    tier: 3,
    category: 'refine',
    footprint: [4, 3],
    buildCost: { wood: 40, stone: 30, iron_scrap: 20, gold: 100 },
    buildTimeSec: 180,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: { localOutputBuffer: 3, localInputBuffer: 15 },
    recipes: ['RCP_WAR_CATAPULT', 'RCP_WAR_CANNON'],
    radiusEffect: null,
    housing: null,
    expeditions: null,
    training: null,
    tags: ['craft', 'war'],
    manualCraft: true,
    freischaltung: { braucht: ['IRON_MINE', 'GUILD_HALL'], gildenrang: 4, bauplan: 'bauplan_kriegsmaschinen' },
    spriteKey: 'WAR_MACHINE_WORKSHOP',
  },
  BANK: {
    id: 'BANK',
    name: 'Bank',
    tier: 2,
    category: 'utility',
    footprint: [4, 3],
    buildCost: {},
    buildTimeSec: 0,
    workerSlots: 1,
    requiresConnectivity: true,
    storage: null,
    recipes: [],
    radiusEffect: { type: 'gold_income', radiusTiles: 10 },
    housing: null,
    expeditions: null,
    training: null,
    tags: ['utility', 'economy'],
    freischaltung: { braucht: ['MARKETPLACE'], gildenrang: 3, bauplan: 'bauplan_bank' },
    spriteKey: 'BANK',
  },
};

// Build menu order (excluding ROAD which has its own button)
export const BUILD_MENU_ORDER = [
  'LUMBER_CAMP', 'QUARRY', 'FARM_GRAIN', 'MILL_WIND', 'BAKERY',
  'WELL', 'HERB_GARDEN', 'SMITHY', 'IRON_MINE',
  'HOUSE_T1', 'WAREHOUSE', 'GUILD_HALL',
  'ARCANE_SMITHY', 'MARKETPLACE', 'WAR_MACHINE_WORKSHOP',
  'BANK',
];

// ── Freischaltung ───────────────────────────────────────────────

export type FreischaltStatus = 'gebaut' | 'baubar' | 'gesperrt';

/** Fehlende Bedingungen als kurze Hinweise, z. B. «braucht Schmiede». Leer = frei. */
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
