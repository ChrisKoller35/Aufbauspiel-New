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
}

export const LOOT_TABLE_DEFS: Record<string, LootTableDef> = {
  loot_forest_common: {
    id: 'loot_forest_common',
    entries: [
      { itemId: 'wood', weight: 40, minQty: 1, maxQty: 3 },
      { itemId: 'herb_green', weight: 25, minQty: 1, maxQty: 2 },
      { itemId: 'bread', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'healing_potion', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'wolf_fang_necklace', weight: 5, minQty: 1, maxQty: 1 },
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
    ],
    guaranteedGold: { min: 5, max: 10 },
  },
  loot_cave_common: {
    id: 'loot_cave_common',
    entries: [
      { itemId: 'stone', weight: 30, minQty: 1, maxQty: 3 },
      { itemId: 'iron_scrap', weight: 25, minQty: 1, maxQty: 2 },
      { itemId: 'healing_potion', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'bread', weight: 15, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 3, max: 7 },
  },
  loot_cave_rare: {
    id: 'loot_cave_rare',
    entries: [
      { itemId: 'iron_scrap', weight: 25, minQty: 2, maxQty: 4 },
      { itemId: 'healing_potion', weight: 20, minQty: 1, maxQty: 2 },
      { itemId: 'iron_sword', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'iron_shield', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 8, max: 15 },
  },
  loot_boss_treant: {
    id: 'loot_boss_treant',
    entries: [
      { itemId: 'wood', weight: 20, minQty: 5, maxQty: 10 },
      { itemId: 'herb_green', weight: 15, minQty: 3, maxQty: 6 },
      { itemId: 'healing_potion', weight: 15, minQty: 2, maxQty: 3 },
      { itemId: 'oak_staff', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'talisman_fragment', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 8, minQty: 1, maxQty: 2 },
      { itemId: 'treant_heartwood_shield', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 20, max: 35 },
  },
  loot_boss_golem: {
    id: 'loot_boss_golem',
    entries: [
      { itemId: 'iron_scrap', weight: 20, minQty: 5, maxQty: 10 },
      { itemId: 'stone', weight: 15, minQty: 5, maxQty: 8 },
      { itemId: 'crystal_shard', weight: 15, minQty: 2, maxQty: 4 },
      { itemId: 'iron_sword', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'iron_shield', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'talisman_fragment', weight: 8, minQty: 1, maxQty: 2 },
      { itemId: 'crystal_golem_core', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 30, max: 50 },
  },

  // --- Biome Tables ---

  loot_swamp_common: {
    id: 'loot_swamp_common',
    entries: [
      { itemId: 'herb_green', weight: 25, minQty: 1, maxQty: 3 },
      { itemId: 'wood', weight: 20, minQty: 1, maxQty: 3 },
      { itemId: 'gold', weight: 15, minQty: 2, maxQty: 5 },
      { itemId: 'iron_scrap', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'grain', weight: 15, minQty: 1, maxQty: 3 },
      { itemId: 'stone', weight: 10, minQty: 1, maxQty: 2 },
    ],
    guaranteedGold: { min: 3, max: 7 },
  },
  loot_swamp_rare: {
    id: 'loot_swamp_rare',
    entries: [
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
      { itemId: 'stone', weight: 20, minQty: 2, maxQty: 5 },
      { itemId: 'iron_scrap', weight: 20, minQty: 1, maxQty: 3 },
      { itemId: 'gold', weight: 20, minQty: 3, maxQty: 7 },
      { itemId: 'crystal_shard', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'talisman_fragment', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'herb_green', weight: 10, minQty: 1, maxQty: 2 },
    ],
    guaranteedGold: { min: 5, max: 10 },
  },
  loot_ruins_rare: {
    id: 'loot_ruins_rare',
    entries: [
      { itemId: 'crystal_shard', weight: 25, minQty: 2, maxQty: 4 },
      { itemId: 'talisman_fragment', weight: 20, minQty: 1, maxQty: 3 },
      { itemId: 'steel_sword', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'steel_armor', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_pendant', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'ranger_cloak', weight: 10, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 12, max: 20 },
  },
  loot_volcano_common: {
    id: 'loot_volcano_common',
    entries: [
      { itemId: 'stone', weight: 20, minQty: 3, maxQty: 7 },
      { itemId: 'iron_scrap', weight: 20, minQty: 2, maxQty: 4 },
      { itemId: 'gold', weight: 20, minQty: 4, maxQty: 8 },
      { itemId: 'crystal_shard', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'talisman_fragment', weight: 15, minQty: 1, maxQty: 2 },
      { itemId: 'herb_green', weight: 10, minQty: 1, maxQty: 2 },
    ],
    guaranteedGold: { min: 6, max: 12 },
  },
  loot_volcano_rare: {
    id: 'loot_volcano_rare',
    entries: [
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
      { itemId: 'spider_silk_vest', weight: 5, minQty: 1, maxQty: 1 },
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
      { itemId: 'bandit_kings_cloak', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 35, max: 55 },
  },
  loot_boss_fallen_knight: {
    id: 'loot_boss_fallen_knight',
    entries: [
      { itemId: 'crystal_shard', weight: 25, minQty: 2, maxQty: 5 },
      { itemId: 'talisman_fragment', weight: 25, minQty: 2, maxQty: 4 },
      { itemId: 'iron_scrap', weight: 20, minQty: 4, maxQty: 8 },
      { itemId: 'steel_sword', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'steel_armor', weight: 15, minQty: 1, maxQty: 1 },
      { itemId: 'fallen_knights_blade', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 35, max: 55 },
  },
  loot_boss_lich: {
    id: 'loot_boss_lich',
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
      { itemId: 'wyrm_scale_shield', weight: 5, minQty: 1, maxQty: 1 },
    ],
    guaranteedGold: { min: 45, max: 70 },
  },

  // --- T4 Legendary Loot (Nemesis-Modifier Bonus) ---
  loot_nemesis_legendary: {
    id: 'loot_nemesis_legendary',
    entries: [
      { itemId: 'blade_of_thousand_shadows', weight: 30, minQty: 1, maxQty: 1 },
      { itemId: 'shield_of_the_ancient', weight: 30, minQty: 1, maxQty: 1 },
      { itemId: 'amulet_of_rebirth', weight: 30, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_shard', weight: 10, minQty: 5, maxQty: 10 },
    ],
    guaranteedGold: { min: 50, max: 100 },
  },
};
