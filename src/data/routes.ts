import { EncounterType } from '../models/ExpeditionRun';

export interface EncounterTemplate {
  type: EncounterType;
  enemies?: string[];     // enemy IDs for combat
  healPercent?: number;   // for rest encounters
  damage?: number;        // for hazard encounters
  findGold?: number;      // for find encounters
  findItems?: { itemId: string; qty: number }[];  // for find encounters
}

export interface RouteDef {
  id: string;
  name: string;
  tier: number;
  rooms: number;
  encounters: EncounterTemplate[];
  bossId: string | null;
  recommendedLevel: string;
  unlockCondition?: { bossesDefeated: string[] };
}

export const ROUTE_DEFS: Record<string, RouteDef> = {
  forest_short: {
    id: 'forest_short',
    name: 'Waldpfad (kurz)',
    tier: 1,
    rooms: 6,
    encounters: [
      { type: 'combat', enemies: ['forest_wolf', 'forest_spider'] },
      { type: 'combat', enemies: ['forest_bandit'] },
      { type: 'rest', healPercent: 30 },
      { type: 'combat', enemies: ['forest_wolf', 'forest_wolf'] },
      { type: 'hazard', damage: 5 },
      { type: 'combat', enemies: ['forest_bear'] },
    ],
    bossId: null,
    recommendedLevel: 'Starter gear',
  },
  forest_medium: {
    id: 'forest_medium',
    name: 'Tiefwald (mittel)',
    tier: 2,
    rooms: 10,
    encounters: [
      { type: 'combat', enemies: ['forest_wolf', 'forest_spider'] },
      { type: 'combat', enemies: ['forest_bandit', 'forest_bandit'] },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 25 },
      { type: 'combat', enemies: ['forest_bear', 'forest_wisp'] },
      { type: 'hazard', damage: 8 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['forest_shaman', 'forest_wolf', 'forest_wolf'] },
      { type: 'combat', enemies: ['forest_bear', 'forest_bandit'] },
      { type: 'boss', enemies: ['boss_elder_treant'] },
    ],
    bossId: 'boss_elder_treant',
    recommendedLevel: 'Iron gear',
  },
  cave_deep: {
    id: 'cave_deep',
    name: 'Tiefe Höhle',
    tier: 2,
    rooms: 8,
    encounters: [
      { type: 'combat', enemies: ['cave_bat', 'cave_bat', 'cave_bat'] },
      { type: 'combat', enemies: ['cave_goblin', 'cave_slime'] },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['cave_spider_queen', 'cave_goblin'] },
      { type: 'combat', enemies: ['cave_troll'] },
      { type: 'hazard', damage: 10 },
      { type: 'boss', enemies: ['boss_crystal_golem'] },
    ],
    bossId: 'boss_crystal_golem',
    recommendedLevel: 'Full iron gear',
  },

  // --- Tier 3+ Routes ---

  swamp_long: {
    id: 'swamp_long',
    name: 'Giftsumpf',
    tier: 3,
    rooms: 13,
    encounters: [
      { type: 'combat', enemies: ['leech_swarm', 'toxic_toad'] },
      { type: 'combat', enemies: ['rot_walker', 'leech_swarm'] },
      { type: 'hazard', damage: 8 },
      { type: 'combat', enemies: ['swamp_troll', 'toxic_toad'] },
      { type: 'checkpoint' },
      { type: 'find', findGold: 15, findItems: [{ itemId: 'herb_green', qty: 2 }] },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['bog_witch', 'leech_swarm', 'leech_swarm'] },
      { type: 'hazard', damage: 10 },
      { type: 'combat', enemies: ['mire_phantom', 'rot_walker'] },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['swamp_troll', 'bog_witch', 'hollow_shade'] },
      { type: 'boss', enemies: ['boss_swamp_hydra'] },
    ],
    bossId: 'boss_swamp_hydra',
    recommendedLevel: 'Full iron gear + T2 items',
    unlockCondition: { bossesDefeated: ['boss_elder_treant'] },
  },
  cave_spider: {
    id: 'cave_spider',
    name: 'Spinnenhoehle',
    tier: 2,
    rooms: 8,
    encounters: [
      { type: 'combat', enemies: ['venomfang_spider', 'crystal_beetle'] },
      { type: 'combat', enemies: ['venomfang_spider', 'venomfang_spider', 'stalactite_bat'] },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['deep_crawler', 'venomfang_spider'] },
      { type: 'hazard', damage: 10 },
      { type: 'combat', enemies: ['venomfang_spider', 'venomfang_spider', 'crystal_beetle'] },
      { type: 'boss', enemies: ['boss_spider_queen'] },
    ],
    bossId: 'boss_spider_queen',
    recommendedLevel: 'Full iron gear',
    unlockCondition: { bossesDefeated: ['boss_crystal_golem'] },
  },
  ruins_crypts: {
    id: 'ruins_crypts',
    name: 'Alte Krypta',
    tier: 3,
    rooms: 11,
    encounters: [
      { type: 'combat', enemies: ['skeleton_warrior', 'skeleton_warrior'] },
      { type: 'combat', enemies: ['ghost_mage', 'skeleton_warrior'] },
      { type: 'hazard', damage: 8 },
      { type: 'find', findGold: 20, findItems: [{ itemId: 'old_coin', qty: 3 }] },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['bone_knight', 'cursed_priest'] },
      { type: 'combat', enemies: ['stone_guardian', 'skeleton_warrior', 'ghost_mage'] },
      { type: 'hazard', damage: 12 },
      { type: 'combat', enemies: ['tomb_horror', 'bone_knight', 'skeleton_warrior'] },
      { type: 'boss', enemies: ['boss_fallen_knight'] },
    ],
    bossId: 'boss_fallen_knight',
    recommendedLevel: 'T2 gear recommended',
    unlockCondition: { bossesDefeated: ['boss_elder_treant', 'boss_crystal_golem'] },
  },
  ruins_depths: {
    id: 'ruins_depths',
    name: 'Tiefe Ruinen',
    tier: 4,
    rooms: 12,
    encounters: [
      { type: 'combat', enemies: ['skeleton_warrior', 'ghost_mage'] },
      { type: 'combat', enemies: ['bone_knight', 'skeleton_warrior', 'skeleton_warrior'] },
      { type: 'hazard', damage: 10 },
      { type: 'combat', enemies: ['tomb_horror', 'cursed_priest'] },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['stone_guardian', 'ghost_mage', 'ghost_mage'] },
      { type: 'hazard', damage: 12 },
      { type: 'combat', enemies: ['bone_knight', 'tomb_horror', 'skeleton_warrior'] },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['stone_guardian', 'bone_knight', 'cursed_priest', 'ghost_mage'] },
      { type: 'boss', enemies: ['boss_shadow_lich'] },
    ],
    bossId: 'boss_shadow_lich',
    recommendedLevel: 'Full T2 gear',
    unlockCondition: { bossesDefeated: ['boss_fallen_knight'] },
  },
  volcano_core: {
    id: 'volcano_core',
    name: 'Vulkankern',
    tier: 4,
    rooms: 14,
    encounters: [
      { type: 'combat', enemies: ['lava_elemental', 'fire_bat'] },
      { type: 'combat', enemies: ['fire_bat', 'fire_bat', 'obsidian_crab'] },
      { type: 'hazard', damage: 10 },
      { type: 'combat', enemies: ['ash_golem', 'lava_elemental'] },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 15 },
      { type: 'combat', enemies: ['flame_spirit', 'obsidian_crab', 'fire_bat'] },
      { type: 'hazard', damage: 14 },
      { type: 'combat', enemies: ['ash_golem', 'lava_elemental', 'fire_bat'] },
      { type: 'hazard', damage: 12 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['magma_broodling', 'flame_spirit', 'obsidian_crab'] },
      { type: 'combat', enemies: ['ash_golem', 'lava_elemental', 'flame_spirit', 'fire_bat'] },
      { type: 'boss', enemies: ['boss_magma_wyrm'] },
    ],
    bossId: 'boss_magma_wyrm',
    recommendedLevel: 'Full T2 gear + level 8+',
    unlockCondition: { bossesDefeated: ['boss_swamp_hydra', 'boss_fallen_knight'] },
  },
};
