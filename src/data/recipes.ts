export interface RecipeDef {
  id: string;
  name: string;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  cycleTimeSec: number;
  requirements?: {
    minBuildingTier?: number;
    requiresSpecialistId?: string | null;
    waterSupplied?: boolean;
  };
}

export const RECIPE_DEFS: Record<string, RecipeDef> = {
  RCP_GRAIN_1: {
    id: 'RCP_GRAIN_1',
    name: 'Getreide ernten',
    inputs: {},
    outputs: { grain: 2 },
    cycleTimeSec: 10,
  },
  RCP_WOOD_1: {
    id: 'RCP_WOOD_1',
    name: 'Holz schlagen',
    inputs: {},
    outputs: { wood: 2 },
    cycleTimeSec: 10,
  },
  RCP_STONE_1: {
    id: 'RCP_STONE_1',
    name: 'Stein brechen',
    inputs: {},
    outputs: { stone: 1 },
    cycleTimeSec: 12,
  },
  RCP_IRON_SCRAP_1: {
    id: 'RCP_IRON_SCRAP_1',
    name: 'Eisen schürfen',
    inputs: {},
    outputs: { iron_scrap: 1 },
    cycleTimeSec: 30,
  },
  RCP_FLOUR_1: {
    id: 'RCP_FLOUR_1',
    name: 'Mehl mahlen',
    inputs: { grain: 2 },
    outputs: { flour: 2 },
    cycleTimeSec: 12,
  },
  RCP_BREAD_1: {
    id: 'RCP_BREAD_1',
    name: 'Brot backen',
    inputs: { flour: 2 },
    outputs: { bread: 1 },
    cycleTimeSec: 14,
    requirements: { waterSupplied: true },
  },
  RCP_HERB_1: {
    id: 'RCP_HERB_1',
    name: 'Kräuter ziehen',
    inputs: {},
    outputs: { herb_green: 1 },
    cycleTimeSec: 15,
    requirements: { waterSupplied: true },
  },
  RCP_HEALING_POTION: {
    id: 'RCP_HEALING_POTION',
    name: 'Heiltrank brauen',
    inputs: { herb_green: 3 },
    outputs: { healing_potion: 1 },
    cycleTimeSec: 20,
    requirements: { waterSupplied: true },
  },
  RCP_IRON_SWORD: {
    id: 'RCP_IRON_SWORD',
    name: 'Eisenschwert schmieden',
    inputs: { iron_scrap: 2, wood: 1 },
    outputs: { iron_sword: 1 },
    cycleTimeSec: 90,
  },
  RCP_IRON_SHIELD: {
    id: 'RCP_IRON_SHIELD',
    name: 'Eisenschild schmieden',
    inputs: { iron_scrap: 2, wood: 1 },
    outputs: { iron_shield: 1 },
    cycleTimeSec: 90,
  },
  RCP_LEATHER_ARMOR: {
    id: 'RCP_LEATHER_ARMOR',
    name: 'Lederrüstung fertigen',
    inputs: { iron_scrap: 1, wood: 2 },
    outputs: { leather_armor: 1 },
    cycleTimeSec: 90,
  },
  RCP_POWER_BREAD: {
    id: 'RCP_POWER_BREAD',
    name: 'Kraft-Brot backen',
    inputs: { flour: 2, herb_green: 1 },
    outputs: { power_bread: 1 },
    cycleTimeSec: 18,
    requirements: { waterSupplied: true },
  },

  // --- T2 Smithy Recipes ---
  RCP_STEEL_SWORD: {
    id: 'RCP_STEEL_SWORD',
    name: 'Stahlschwert schmieden',
    inputs: { iron_scrap: 3, crystal_shard: 1 },
    outputs: { steel_sword: 1 },
    cycleTimeSec: 120,
  },
  RCP_LONGBOW: {
    id: 'RCP_LONGBOW',
    name: 'Langbogen fertigen',
    inputs: { wood: 3, crystal_shard: 1 },
    outputs: { longbow: 1 },
    cycleTimeSec: 120,
  },
  RCP_CRYSTAL_STAFF: {
    id: 'RCP_CRYSTAL_STAFF',
    name: 'Kristallstab formen',
    inputs: { wood: 2, crystal_shard: 2 },
    outputs: { crystal_staff: 1 },
    cycleTimeSec: 120,
  },
  RCP_STEEL_ARMOR: {
    id: 'RCP_STEEL_ARMOR',
    name: 'Stahlrüstung schmieden',
    inputs: { iron_scrap: 3, crystal_shard: 1 },
    outputs: { steel_armor: 1 },
    cycleTimeSec: 120,
  },
  RCP_RANGER_CLOAK: {
    id: 'RCP_RANGER_CLOAK',
    name: 'Waldläufermantel nähen',
    inputs: { iron_scrap: 1, wood: 2, crystal_shard: 1 },
    outputs: { ranger_cloak: 1 },
    cycleTimeSec: 120,
  },
  RCP_CRYSTAL_PENDANT: {
    id: 'RCP_CRYSTAL_PENDANT',
    name: 'Kristallamulett schleifen',
    inputs: { crystal_shard: 2, talisman_fragment: 1 },
    outputs: { crystal_pendant: 1 },
    cycleTimeSec: 150,
  },
};
