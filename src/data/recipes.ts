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
  RCP_CRYSTAL_PENDANT: {
    id: 'RCP_CRYSTAL_PENDANT',
    name: 'Kristallamulett schleifen',
    inputs: { crystal_shard: 2, talisman_fragment: 1 },
    outputs: { crystal_pendant: 1 },
    cycleTimeSec: 150,
  },

  // --- Arcane Smithy Recipes ---
  RCP_MAGITECH_COMPONENT: {
    id: 'RCP_MAGITECH_COMPONENT',
    name: 'Magitech-Komponente herstellen',
    inputs: { crystal_shard: 2, iron_scrap: 2 },
    outputs: { magitech_component: 1 },
    cycleTimeSec: 180,
  },
  RCP_ARCANE_BLADE: {
    id: 'RCP_ARCANE_BLADE',
    name: 'Arkanklinge schmieden',
    inputs: { iron_scrap: 3, crystal_shard: 2, magitech_component: 1 },
    outputs: { arcane_blade: 1 },
    cycleTimeSec: 300,
  },
  RCP_MAGITECH_SHIELD: {
    id: 'RCP_MAGITECH_SHIELD',
    name: 'Magitech-Schild fertigen',
    inputs: { iron_scrap: 2, crystal_shard: 2, magitech_component: 1 },
    outputs: { magitech_shield: 1 },
    cycleTimeSec: 300,
  },
  RCP_ARCANE_PENDANT: {
    id: 'RCP_ARCANE_PENDANT',
    name: 'Arkan-Amulett schleifen',
    inputs: { crystal_shard: 3, magitech_component: 1 },
    outputs: { arcane_amulet: 1 },
    cycleTimeSec: 240,
  },

  // --- Herb Garden T2 Recipes ---
  // Wasser ist keine Zutat: requirements.waterSupplied (Brunnen in Reichweite) genügt.
  // Seltene Kräuter kommen aus der Beute ihres Gebiets (docs/BALANCING.md).
  RCP_STRENGTH_POTION: {
    id: 'RCP_STRENGTH_POTION',
    name: 'Krafttrank brauen',
    inputs: { herb_fire_root: 1, iron_scrap: 1 },
    outputs: { potion_strength: 1 },
    cycleTimeSec: 30,
  },
  RCP_MANA_POTION: {
    id: 'RCP_MANA_POTION',
    name: 'Manatrank brauen',
    inputs: { herb_shimmer_shroom: 1 },
    outputs: { potion_mana: 1 },
    cycleTimeSec: 30,
    requirements: { waterSupplied: true },
  },
  RCP_ANTIDOTE: {
    id: 'RCP_ANTIDOTE',
    name: 'Gegengift brauen',
    inputs: { herb_swamp_blossom: 1, herb_green: 1 },
    outputs: { potion_antidote: 1 },
    cycleTimeSec: 30,
  },
  RCP_TITAN_BREW: {
    id: 'RCP_TITAN_BREW',
    name: 'Titan-Gebräu brauen',
    inputs: { herb_bone_dust: 1 },
    outputs: { potion_titan: 1 },
    cycleTimeSec: 45,
    requirements: { waterSupplied: true },
  },
  RCP_SPEED_POTION: {
    id: 'RCP_SPEED_POTION',
    name: 'Schnelligkeitstrank brauen',
    inputs: { herb_moonwort: 2 },
    outputs: { potion_speed: 1 },
    cycleTimeSec: 40,
    requirements: { waterSupplied: true },
  },

  // --- War Machine Workshop Recipes ---
  RCP_WAR_CATAPULT: {
    id: 'RCP_WAR_CATAPULT',
    name: 'Katapult bauen',
    inputs: { wood: 5, stone: 4, iron_scrap: 3 },
    outputs: { war_catapult: 1 },
    cycleTimeSec: 600,
  },
  RCP_WAR_CANNON: {
    id: 'RCP_WAR_CANNON',
    name: 'Kanone bauen',
    inputs: { iron_scrap: 5, crystal_shard: 3, magitech_component: 2 },
    outputs: { war_cannon: 1 },
    cycleTimeSec: 900,
  },
};
