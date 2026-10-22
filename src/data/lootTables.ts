export interface LootEntry {
  itemId: string;
  weight: number;     // relative weight for random selection
  minQty: number;
  maxQty: number;
}

export interface LootTableDef {
  id: string;
  entries: LootEntry[];
  guaranteedGold: { min: number; max: number };
  /**
   * Bauplan-Item, das beim ERSTEN Sieg über den Boss dieser Tabelle garantiert fällt
   * (zusätzlich zum normalen Wurf). Merker: GameState.erhalteneBauplaene.
   */
  ersterSiegBauplan?: string;
}

export const LOOT_TABLE_DEFS: Record<string, LootTableDef> = {
  loot_forest_common: {
    id: 'loot_forest_common',
    entries: [
      { itemId: 'wood', weight: 35, minQty: 1, maxQty: 3 },
      { itemId: 'herb_green', weight: 22, minQty: 1, maxQty: 2 },
      { itemId: 'bread', weight: 13, minQty: 1, maxQty: 1 },
      { itemId: 'healing_potion', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'wolf_fang_necklace', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'hunter_bow', weight: 6, minQty: 1, maxQty: 1 },
      { itemId: 'leather_armor', weight: 4, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 2, max: 5 },
  },
  loot_forest_rare: {
    id: 'loot_forest_rare',
    entries: [
      { itemId: 'wood', weight: 20, minQty: 2, maxQty: 4 },
      { itemId: 'herb_green', weight: 20, minQty: 1, maxQty: 3 },
      { itemId: 'healing_potion', weight: 20, minQty: 1, maxQty: 2 },
      { itemId: 'leather_armor', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'wolf_fang_necklace', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'hunter_bow', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 6, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 5, max: 10 },
  },
  // Geisterwald: nur das Verfluchte Irrlicht nutzt diese Tabelle (Mondkraut).
  loot_haunted_common: {
    id: 'loot_haunted_common',
    entries: [
      { itemId: 'herb_moonwort', weight: 40, minQty: 1, maxQty: 2 },
      { itemId: 'herb_green', weight: 20, minQty: 1, maxQty: 2 },
      { itemId: 'healing_potion', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'wood', weight: 15, minQty: 1, maxQty: 3 },
      { itemId: 'wolf_fang_necklace', weight: 10, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 2, max: 5 },
  },
  loot_cave_common: {
    id: 'loot_cave_common',
    entries: [
      { itemId: 'stone', weight: 25, minQty: 1, maxQty: 3 },
      { itemId: 'iron_scrap', weight: 22, minQty: 1, maxQty: 2 },
      { itemId: 'healing_potion', weight: 13, minQty: 1, maxQty: 1 },
      { itemId: 'bread', weight: 13, minQty: 1, maxQty: 1 },
      { itemId: 'herb_shimmer_shroom', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'iron_sword', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'iron_shield', weight: 7, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 6, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 3, max: 7 },
  },
  loot_cave_rare: {
    id: 'loot_cave_rare',
    entries: [
      { itemId: 'iron_scrap', weight: 25, minQty: 2, maxQty: 4 },
      { itemId: 'healing_potion', weight: 20, minQty: 1, maxQty: 2 },
      { itemId: 'crystal_shard', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'herb_shimmer_shroom', weight: 12, minQty: 1, maxQty: 2 },
      { itemId: 'iron_sword', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'iron_shield', weight: 10, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 8, max: 15 },
  },
  // Kristallkäfer (Tiefe Höhle, Spinnenhöhle, Kristallminen): jeder Käfer lässt sicher einen Splitter fallen.
  loot_crystal_beetle: {
    id: 'loot_crystal_beetle',
    entries: [
      { itemId: 'crystal_shard', weight: 100, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 3, max: 7 },
  },
  loot_boss_treant: {
    id: 'loot_boss_treant',
    ersterSiegBauplan: 'bauplan_marktplatz',
    entries: [
      { itemId: 'wood', weight: 20, minQty: 5, maxQty: 10 },
      { itemId: 'herb_green', weight: 15, minQty: 3, maxQty: 6 },
      { itemId: 'healing_potion', weight: 15, minQty: 2, maxQty: 3 },
      { itemId: 'oak_staff', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'talisman_fragment', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 12, minQty: 1, maxQty: 2 },
      { itemId: 'mystic_plate_armor', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 20, max: 35 },
  },
  loot_boss_golem: {
    id: 'loot_boss_golem',
    ersterSiegBauplan: 'bauplan_arkanschmiede',
    entries: [
      { itemId: 'iron_scrap', weight: 20, minQty: 5, maxQty: 10 },
      { itemId: 'stone', weight: 15, minQty: 5, maxQty: 8 },
      { itemId: 'crystal_shard', weight: 25, minQty: 2, maxQty: 4 },
      { itemId: 'iron_sword', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'iron_shield', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'talisman_fragment', weight: 8, minQty: 1, maxQty: 2 },
      { itemId: 'crystal_golem_staff', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 30, max: 50 },
  },

  // --- Biome Tables ---

  loot_swamp_common: {
    id: 'loot_swamp_common',
    entries: [
      { itemId: 'herb_green', weight: 22, minQty: 1, maxQty: 3 },
      { itemId: 'wood', weight: 18, minQty: 1, maxQty: 3 },
      { itemId: 'gold', weight: 13, minQty: 2, maxQty: 5 },
      { itemId: 'iron_scrap', weight: 13, minQty: 1, maxQty: 2 },
      { itemId: 'grain', weight: 13, minQty: 1, maxQty: 3 },
      { itemId: 'herb_swamp_blossom', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'stone', weight: 8, minQty: 1, maxQty: 2 },
      { itemId: 'spider_silk_robe', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'leather_armor', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 3, max: 7 },
  },
  loot_swamp_rare: {
    id: 'loot_swamp_rare',
    entries: [
      { itemId: 'herb_swamp_blossom', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'talisman_fragment', weight: 25, minQty: 1, maxQty: 2 },
      { itemId: 'crystal_shard', weight: 20, minQty: 1, maxQty: 2 },
      { itemId: 'healing_potion', weight: 20, minQty: 1, maxQty: 2 },
      { itemId: 'wolf_fang_necklace', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'leather_armor', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'iron_sword', weight: 10, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 8, max: 15 },
  },
  loot_ruins_common: {
    id: 'loot_ruins_common',
    entries: [
      { itemId: 'stone', weight: 17, minQty: 2, maxQty: 5 },
      { itemId: 'iron_scrap', weight: 17, minQty: 1, maxQty: 3 },
      { itemId: 'gold', weight: 17, minQty: 3, maxQty: 7 },
      { itemId: 'crystal_shard', weight: 13, minQty: 1, maxQty: 2 },
      { itemId: 'talisman_fragment', weight: 12, minQty: 1, maxQty: 2 },
      { itemId: 'herb_bone_dust', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'herb_green', weight: 8, minQty: 1, maxQty: 2 },
      { itemId: 'steel_sword', weight: 9, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_pendant', weight: 7, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 5, max: 10 },
  },
  loot_ruins_rare: {
    id: 'loot_ruins_rare',
    entries: [
      { itemId: 'herb_bone_dust', weight: 12, minQty: 1, maxQty: 3 },
      { itemId: 'crystal_shard', weight: 25, minQty: 2, maxQty: 4 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 1, maxQty: 3 },
      { itemId: 'steel_sword', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'steel_armor', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_pendant', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'battle_robe', weight: 10, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 12, max: 20 },
  },
  loot_volcano_common: {
    id: 'loot_volcano_common',
    entries: [
      { itemId: 'stone', weight: 16, minQty: 3, maxQty: 7 },
      { itemId: 'iron_scrap', weight: 16, minQty: 2, maxQty: 4 },
      { itemId: 'gold', weight: 16, minQty: 4, maxQty: 8 },
      { itemId: 'crystal_shard', weight: 13, minQty: 1, maxQty: 2 },
      { itemId: 'talisman_fragment', weight: 12, minQty: 1, maxQty: 2 },
      { itemId: 'herb_fire_root', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'herb_green', weight: 8, minQty: 1, maxQty: 2 },
      { itemId: 'steel_armor', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'longbow', weight: 7, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_staff', weight: 2, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 6, max: 12 },
  },
  loot_volcano_rare: {
    id: 'loot_volcano_rare',
    entries: [
      { itemId: 'herb_fire_root', weight: 12, minQty: 1, maxQty: 3 },
      { itemId: 'crystal_shard', weight: 20, minQty: 2, maxQty: 5 },
      { itemId: 'talisman_fragment', weight: 18, minQty: 2, maxQty: 4 },
      { itemId: 'iron_scrap', weight: 15, minQty: 3, maxQty: 6 },
      { itemId: 'steel_sword', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'steel_armor', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'longbow', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_staff', weight: 11, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 15, max: 25 },
  },

  // --- Boss Loot Tables ---

  loot_boss_hydra: {
    id: 'loot_boss_hydra',
    entries: [
      { itemId: 'healing_potion', weight: 30, minQty: 2, maxQty: 4 },
      { itemId: 'crystal_shard', weight: 25, minQty: 2, maxQty: 4 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 2, maxQty: 3 },
      { itemId: 'herb_green', weight: 15, minQty: 3, maxQty: 6 },
      { itemId: 'herb_swamp_blossom', weight: 15, minQty: 2, maxQty: 4 },
      { itemId: 'iron_scrap', weight: 10, minQty: 4, maxQty: 8 },
      { itemId: 'hydra_venomfang', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 30, max: 50 },
  },
  loot_boss_spider_queen: {
    id: 'loot_boss_spider_queen',
    entries: [
      { itemId: 'crystal_shard', weight: 30, minQty: 2, maxQty: 4 },
      { itemId: 'iron_scrap', weight: 20, minQty: 4, maxQty: 8 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 1, maxQty: 3 },
      { itemId: 'healing_potion', weight: 15, minQty: 1, maxQty: 3 },
      { itemId: 'herb_green', weight: 15, minQty: 2, maxQty: 5 },
      { itemId: 'spider_silk_robe', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 25, max: 40 },
  },
  loot_boss_bandit: {
    id: 'loot_boss_bandit',
    entries: [
      { itemId: 'gold', weight: 30, minQty: 10, maxQty: 20 },
      { itemId: 'iron_scrap', weight: 25, minQty: 3, maxQty: 7 },
      { itemId: 'crystal_shard', weight: 20, minQty: 1, maxQty: 3 },
      { itemId: 'talisman_fragment', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'healing_potion', weight: 10, minQty: 1, maxQty: 2 },
      { itemId: 'bandit_king_armor', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 35, max: 55 },
  },
  loot_boss_fallen_knight: {
    id: 'loot_boss_fallen_knight',
    ersterSiegBauplan: 'bauplan_kriegsmaschinen',
    entries: [
      { itemId: 'crystal_shard', weight: 25, minQty: 2, maxQty: 5 },
      { itemId: 'talisman_fragment', weight: 25, minQty: 2, maxQty: 4 },
      { itemId: 'iron_scrap', weight: 20, minQty: 4, maxQty: 8 },
      { itemId: 'steel_sword', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'steel_armor', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'herb_bone_dust', weight: 10, minQty: 2, maxQty: 3 },
      { itemId: 'fallen_hunters_bow', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 35, max: 55 },
  },
  loot_boss_lich: {
    id: 'loot_boss_lich',
    ersterSiegBauplan: 'bauplan_bank',
    entries: [
      { itemId: 'talisman_fragment', weight: 30, minQty: 2, maxQty: 5 },
      { itemId: 'crystal_shard', weight: 25, minQty: 3, maxQty: 6 },
      { itemId: 'crystal_staff', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_pendant', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'healing_potion', weight: 15, minQty: 2, maxQty: 4 },
      { itemId: 'lich_phylactery', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 40, max: 60 },
  },
  loot_boss_wyrm: {
    id: 'loot_boss_wyrm',
    entries: [
      { itemId: 'crystal_shard', weight: 25, minQty: 3, maxQty: 6 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 3, maxQty: 5 },
      { itemId: 'iron_scrap', weight: 20, minQty: 5, maxQty: 10 },
      { itemId: 'steel_armor', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'steel_sword', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'longbow', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'herb_fire_root', weight: 10, minQty: 2, maxQty: 4 },
      { itemId: 'wyrm_scale_shield', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 45, max: 70 },
  },

  // --- Drachenhort (Ebene 5): viel Gold, Stufe-4-Ausrüstung, selten Stufe 5 ---
  loot_drachenhort_common: {
    id: 'loot_drachenhort_common',
    entries: [
      { itemId: 'gold', weight: 22, minQty: 8, maxQty: 16 },
      { itemId: 'crystal_shard', weight: 16, minQty: 1, maxQty: 3 },
      { itemId: 'talisman_fragment', weight: 14, minQty: 1, maxQty: 3 },
      { itemId: 'herb_fire_root', weight: 12, minQty: 1, maxQty: 3 },
      { itemId: 'iron_scrap', weight: 12, minQty: 3, maxQty: 6 },
      { itemId: 'healing_potion', weight: 10, minQty: 1, maxQty: 2 },
      { itemId: 'dragonlord_plate', weight: 3, minQty: 1, maxQty: 1 },
      { itemId: 'soulbreaker', weight: 3, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 12, max: 22 },
  },
  loot_drachenhort_rare: {
    id: 'loot_drachenhort_rare',
    entries: [
      { itemId: 'crystal_shard', weight: 22, minQty: 2, maxQty: 5 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 2, maxQty: 4 },
      { itemId: 'gold', weight: 18, minQty: 15, maxQty: 30 },
      { itemId: 'dragonlord_plate', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'soulbreaker', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'aether_guardian_shield', weight: 6, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 2, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 20, max: 35 },
  },
  loot_boss_ignarax: {
    id: 'loot_boss_ignarax',
    entries: [
      { itemId: 'shield_of_the_ancient', weight: 22, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 14, minQty: 1, maxQty: 1 },
      { itemId: 'dragonlord_plate', weight: 16, minQty: 1, maxQty: 1 },
      { itemId: 'soulbreaker', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 18, minQty: 6, maxQty: 12 },
      { itemId: 'talisman_fragment', weight: 18, minQty: 5, maxQty: 8 },
    ],
    guaranteedGold: { min: 150, max: 220 },
  },

  // --- Himmelsarchiv (Ebene 6): Arkan-Ausrüstung, Kristalle, Stufe 5 ---
  loot_himmelsarchiv_common: {
    id: 'loot_himmelsarchiv_common',
    entries: [
      { itemId: 'crystal_shard', weight: 20, minQty: 2, maxQty: 4 },
      { itemId: 'talisman_fragment', weight: 18, minQty: 2, maxQty: 3 },
      { itemId: 'healing_potion', weight: 14, minQty: 1, maxQty: 2 },
      { itemId: 'gold', weight: 12, minQty: 10, maxQty: 18 },
      { itemId: 'magiarch_robe', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'worldend_staff', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'arcane_amulet', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'aether_heart', weight: 3, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 14, max: 24 },
  },
  loot_himmelsarchiv_rare: {
    id: 'loot_himmelsarchiv_rare',
    entries: [
      { itemId: 'crystal_shard', weight: 22, minQty: 3, maxQty: 6 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 3, maxQty: 5 },
      { itemId: 'magiarch_robe', weight: 9, minQty: 1, maxQty: 1 },
      { itemId: 'worldend_staff', weight: 9, minQty: 1, maxQty: 1 },
      { itemId: 'arcane_amulet', weight: 9, minQty: 1, maxQty: 1 },
      { itemId: 'aether_heart', weight: 7, minQty: 1, maxQty: 1 },
      { itemId: 'eternal_hunter_bow', weight: 6, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 3, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 22, max: 38 },
  },
  loot_boss_oberarchivar: {
    id: 'loot_boss_oberarchivar',
    entries: [
      { itemId: 'blade_of_thousand_shadows', weight: 22, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 18, minQty: 1, maxQty: 1 },
      { itemId: 'worldend_staff', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'magiarch_robe', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 18, minQty: 8, maxQty: 15 },
      { itemId: 'talisman_fragment', weight: 18, minQty: 6, maxQty: 10 },
    ],
    guaranteedGold: { min: 180, max: 260 },
  },

  // --- Sternenschmiede (Ebene 7): Schmiede-Ausrüstung, Magitech, Korrunds Hammer ---
  loot_sternenschmiede_common: {
    id: 'loot_sternenschmiede_common',
    entries: [
      { itemId: 'gold', weight: 20, minQty: 12, maxQty: 20 },
      { itemId: 'crystal_shard', weight: 20, minQty: 2, maxQty: 4 },
      { itemId: 'talisman_fragment', weight: 16, minQty: 2, maxQty: 4 },
      { itemId: 'healing_potion', weight: 12, minQty: 1, maxQty: 2 },
      { itemId: 'iron_scrap', weight: 10, minQty: 4, maxQty: 8 },
      { itemId: 'magitech_component', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'soulbreaker', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'aether_guardian_shield', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'dragonlord_plate', weight: 4, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 16, max: 26 },
  },
  loot_sternenschmiede_rare: {
    id: 'loot_sternenschmiede_rare',
    entries: [
      { itemId: 'crystal_shard', weight: 22, minQty: 3, maxQty: 6 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 3, maxQty: 5 },
      { itemId: 'magitech_component', weight: 12, minQty: 1, maxQty: 2 },
      { itemId: 'soulbreaker', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'aether_guardian_shield', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'dragonlord_plate', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'shield_of_the_ancient', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 3, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 24, max: 40 },
  },
  loot_boss_korrund: {
    id: 'loot_boss_korrund',
    entries: [
      { itemId: 'korrunds_hammer', weight: 22, minQty: 1, maxQty: 1 },
      { itemId: 'shield_of_the_ancient', weight: 14, minQty: 1, maxQty: 1 },
      { itemId: 'blade_of_thousand_shadows', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 18, minQty: 10, maxQty: 16 },
      { itemId: 'magitech_component', weight: 12, minQty: 2, maxQty: 4 },
    ],
    guaranteedGold: { min: 220, max: 300 },
  },

  // --- Sternenschlund (Ebene 8): Fernkampf-Ausrüstung, Kristalle, Der letzte Stern ---
  loot_sternenschlund_common: {
    id: 'loot_sternenschlund_common',
    entries: [
      { itemId: 'crystal_shard', weight: 22, minQty: 3, maxQty: 5 },
      { itemId: 'gold', weight: 18, minQty: 14, maxQty: 22 },
      { itemId: 'talisman_fragment', weight: 18, minQty: 2, maxQty: 4 },
      { itemId: 'healing_potion', weight: 12, minQty: 1, maxQty: 2 },
      { itemId: 'eternal_hunter_bow', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'shadowhunter_armor', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'arcane_amulet', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'aether_heart', weight: 4, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 18, max: 28 },
  },
  loot_sternenschlund_rare: {
    id: 'loot_sternenschlund_rare',
    entries: [
      { itemId: 'crystal_shard', weight: 22, minQty: 4, maxQty: 7 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 3, maxQty: 6 },
      { itemId: 'magitech_component', weight: 10, minQty: 1, maxQty: 2 },
      { itemId: 'eternal_hunter_bow', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'shadowhunter_armor', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'aether_heart', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'blade_of_thousand_shadows', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 4, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 26, max: 44 },
  },
  loot_boss_nyxar: {
    id: 'loot_boss_nyxar',
    entries: [
      { itemId: 'der_letzte_stern', weight: 22, minQty: 1, maxQty: 1 },
      { itemId: 'korrunds_hammer', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'blade_of_thousand_shadows', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'shield_of_the_ancient', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 18, minQty: 12, maxQty: 20 },
      { itemId: 'talisman_fragment', weight: 14, minQty: 8, maxQty: 12 },
    ],
    guaranteedGold: { min: 260, max: 360 },
  },

  // --- Der Mondhof (Ebene 9): Schild- und Panzer-Ausrüstung, Kristalle, Amtsstab des Mondvogts ---
  loot_mondhof_common: {
    id: 'loot_mondhof_common',
    entries: [
      { itemId: 'crystal_shard', weight: 22, minQty: 3, maxQty: 6 },
      { itemId: 'gold', weight: 18, minQty: 16, maxQty: 26 },
      { itemId: 'talisman_fragment', weight: 18, minQty: 2, maxQty: 4 },
      { itemId: 'healing_potion', weight: 12, minQty: 1, maxQty: 2 },
      { itemId: 'aether_guardian_shield', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'dragonlord_plate', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'arcane_amulet', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'soulbreaker', weight: 4, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 20, max: 32 },
  },
  loot_mondhof_rare: {
    id: 'loot_mondhof_rare',
    entries: [
      { itemId: 'crystal_shard', weight: 22, minQty: 4, maxQty: 8 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 3, maxQty: 6 },
      { itemId: 'magitech_component', weight: 10, minQty: 1, maxQty: 2 },
      { itemId: 'aether_guardian_shield', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'dragonlord_plate', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'aether_heart', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'shield_of_the_ancient', weight: 4, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 4, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 30, max: 50 },
  },
  loot_boss_argentis: {
    id: 'loot_boss_argentis',
    entries: [
      { itemId: 'amtsstab_des_mondvogts', weight: 22, minQty: 1, maxQty: 1 },
      { itemId: 'der_letzte_stern', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'korrunds_hammer', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'shield_of_the_ancient', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 18, minQty: 14, maxQty: 22 },
      { itemId: 'talisman_fragment', weight: 14, minQty: 9, maxQty: 14 },
    ],
    guaranteedGold: { min: 300, max: 420 },
  },

  // --- T4 Legendary Loot (Nemesis-Modifier Bonus) ---
  loot_nemesis_legendary: {
    id: 'loot_nemesis_legendary',
    entries: [
      { itemId: 'soulbreaker', weight: 14, minQty: 1, maxQty: 1 },
      { itemId: 'eternal_hunter_bow', weight: 14, minQty: 1, maxQty: 1 },
      { itemId: 'worldend_staff', weight: 14, minQty: 1, maxQty: 1 },
      { itemId: 'aether_guardian_shield', weight: 14, minQty: 1, maxQty: 1 },
      { itemId: 'dragonlord_plate', weight: 14, minQty: 1, maxQty: 1 },
      { itemId: 'shadowhunter_armor', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'magiarch_robe', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'aether_heart', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 4, minQty: 5, maxQty: 10 },
    ],
    guaranteedGold: { min: 50, max: 100 },
  },
  // --- T5 Nemesis Loot (Platzhalter — spätere Super-Items) ---
  loot_nemesis_t5: {
    id: 'loot_nemesis_t5',
    entries: [
      { itemId: 'blade_of_thousand_shadows', weight: 33, minQty: 1, maxQty: 1 },
      { itemId: 'shield_of_the_ancient', weight: 33, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 33, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 1, minQty: 10, maxQty: 20 },
    ],
    guaranteedGold: { min: 80, max: 150 },
  },

  // --- Ocean Loot Tables ---
  loot_ocean_common: {
    id: 'loot_ocean_common',
    entries: [
      { itemId: 'sea_crystal', weight: 30, minQty: 1, maxQty: 3 },
      { itemId: 'air_crystal', weight: 20, minQty: 1, maxQty: 1 },
      { itemId: 'healing_potion', weight: 18, minQty: 1, maxQty: 1 },
      { itemId: 'coral_blade', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'deep_sea_bow', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'abyssal_leather', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'neptune_shield', weight: 8, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 8, max: 16 },
  },
  loot_ocean_rare: {
    id: 'loot_ocean_rare',
    entries: [
      { itemId: 'sea_crystal', weight: 20, minQty: 2, maxQty: 5 },
      { itemId: 'air_crystal', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'talisman_fragment', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'coral_blade', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'deep_sea_bow', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'ocean_mage_staff', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'neptune_shield', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'deepwater_plate', weight: 5, minQty: 1, maxQty: 1 },
      { itemId: 'tide_robe', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 18, max: 30 },
  },
  loot_boss_leviathan: {
    id: 'loot_boss_leviathan',
    entries: [
      { itemId: 'sea_crystal', weight: 20, minQty: 5, maxQty: 10 },
      { itemId: 'talisman_fragment', weight: 15, minQty: 2, maxQty: 4 },
      { itemId: 'coral_blade', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'deep_sea_bow', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'ocean_mage_staff', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'neptune_shield', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'deepwater_plate', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'abyssal_leather', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'tide_robe', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'abyss_amulet', weight: 8, minQty: 1, maxQty: 1 },
      { itemId: 'healing_potion', weight: 4, minQty: 3, maxQty: 5 },
    ],
    guaranteedGold: { min: 40, max: 65 },
  },

  // --- Siege Loot Tables ---
  loot_siege_common: {
    id: 'loot_siege_common',
    entries: [
      { itemId: 'iron_scrap', weight: 25, minQty: 2, maxQty: 5 },
      { itemId: 'stone', weight: 20, minQty: 2, maxQty: 4 },
      { itemId: 'gold', weight: 18, minQty: 4, maxQty: 9 },
      { itemId: 'healing_potion', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'crystal_shard', weight: 12, minQty: 1, maxQty: 2 },
      { itemId: 'steel_sword', weight: 6, minQty: 1, maxQty: 1 },
      { itemId: 'iron_shield', weight: 4, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 7, max: 14 },
  },
  loot_siege_rare: {
    id: 'loot_siege_rare',
    entries: [
      { itemId: 'crystal_shard', weight: 25, minQty: 2, maxQty: 5 },
      { itemId: 'talisman_fragment', weight: 22, minQty: 1, maxQty: 3 },
      { itemId: 'iron_scrap', weight: 18, minQty: 3, maxQty: 6 },
      { itemId: 'steel_sword', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'steel_armor', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'healing_potion', weight: 11, minQty: 1, maxQty: 2 },
    ],
    guaranteedGold: { min: 14, max: 24 },
  },
  loot_boss_iron_commander: {
    id: 'loot_boss_iron_commander',
    entries: [
      { itemId: 'crystal_shard', weight: 25, minQty: 3, maxQty: 6 },
      { itemId: 'talisman_fragment', weight: 22, minQty: 2, maxQty: 4 },
      { itemId: 'iron_scrap', weight: 18, minQty: 5, maxQty: 10 },
      { itemId: 'steel_sword', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'steel_armor', weight: 12, minQty: 1, maxQty: 1 },
      { itemId: 'healing_potion', weight: 8, minQty: 2, maxQty: 4 },
      { itemId: 'magitech_component', weight: 3, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 40, max: 60 },
  },
  loot_boss_fortress_warden: {
    id: 'loot_boss_fortress_warden',
    entries: [
      { itemId: 'crystal_shard', weight: 22, minQty: 4, maxQty: 8 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 3, maxQty: 5 },
      { itemId: 'magitech_component', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'steel_armor', weight: 13, minQty: 1, maxQty: 1 },
      { itemId: 'steel_sword', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'longbow', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_staff', weight: 7, minQty: 1, maxQty: 1 },
      { itemId: 'healing_potion', weight: 3, minQty: 3, maxQty: 5 },
    ],
    guaranteedGold: { min: 55, max: 80 },
  },
};
