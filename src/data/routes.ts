import { EncounterType } from '../models/ExpeditionRun';

export interface EncounterTemplate {
  type: EncounterType;
  enemies?: string[];     // enemy IDs for combat
  healPercent?: number;   // for rest encounters
  damage?: number;        // for hazard encounters
  findGold?: number;      // for find encounters
  findItems?: { itemId: string; qty: number }[];  // for find encounters
  /** Fortification-Encounter: Befestigungsanlage die zerstört werden muss */
  fortification?: {
    name: string;
    hp: number;
    armor: number;
    spriteKey: string;
  };
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
  /** Unterwasser-Route: aktiviert das Air Shield System */
  isUnderwater?: boolean;
  /** Luft-Verlust pro Raum (Standard: 8) */
  airDecayPerRoom?: number;
  /** Belagerungs-Route: aktiviert Kriegsmaschinen-Mechanik */
  isSiegeRoute?: boolean;
  /** Zusätzliche Party-Slots für Kriegsmaschine (+1) */
  extraPartySlots?: number;
  /** Ob eine Kriegsmaschine zwingend benötigt wird */
  requiresWarMachine?: boolean;
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

  // ── Siege Routes ──
  siege_walls: {
    id: 'siege_walls',
    name: 'Die Stadtmauern',
    tier: 3,
    rooms: 10,
    isSiegeRoute: true,
    extraPartySlots: 1,
    requiresWarMachine: true,
    encounters: [
      { type: 'combat', enemies: ['wall_archer', 'wall_guard'] },
      { type: 'fortification', enemies: ['wall_archer', 'siege_crossbowman'], fortification: { name: 'Stadtmauer', hp: 90, armor: 30, spriteKey: 'SIEGE_WALL' } },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['siege_crossbowman', 'wall_guard'] },
      { type: 'rest', healPercent: 25 },
      { type: 'combat', enemies: ['wall_archer', 'wall_archer', 'wall_guard'] },
      { type: 'fortification', enemies: ['siege_crossbowman', 'wall_guard', 'wall_archer'], fortification: { name: 'Stadttor', hp: 130, armor: 40, spriteKey: 'SIEGE_GATE' } },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['siege_defender', 'wall_archer'] },
      { type: 'boss', enemies: ['boss_iron_commander'] },
    ],
    bossId: 'boss_iron_commander',
    recommendedLevel: 'Vollständiges T2 Gear + Kriegsmaschine',
    unlockCondition: { bossesDefeated: ['boss_fallen_knight'] },
  },
  siege_fortress: {
    id: 'siege_fortress',
    name: 'Die Festung',
    tier: 4,
    rooms: 13,
    isSiegeRoute: true,
    extraPartySlots: 1,
    requiresWarMachine: true,
    encounters: [
      { type: 'combat', enemies: ['siege_crossbowman', 'siege_defender'] },
      { type: 'combat', enemies: ['wall_archer', 'siege_mage'] },
      { type: 'fortification', enemies: ['siege_crossbowman', 'siege_mage', 'wall_archer'], fortification: { name: 'Wehrturm', hp: 170, armor: 50, spriteKey: 'SIEGE_TOWER' } },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['siege_defender', 'siege_defender', 'siege_crossbowman'] },
      { type: 'hazard', damage: 12 },
      { type: 'combat', enemies: ['siege_mage', 'siege_defender', 'wall_archer'] },
      { type: 'fortification', enemies: ['siege_defender', 'siege_mage', 'siege_crossbowman', 'wall_archer'], fortification: { name: 'Burgtor', hp: 180, armor: 55, spriteKey: 'SIEGE_GATE' } },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['siege_defender', 'siege_mage'] },
      { type: 'fortification', enemies: ['siege_defender', 'siege_mage', 'siege_crossbowman'], fortification: { name: 'Bergfried', hp: 240, armor: 65, spriteKey: 'SIEGE_KEEP' } },
      { type: 'boss', enemies: ['boss_fortress_warden'] },
    ],
    bossId: 'boss_fortress_warden',
    recommendedLevel: 'Vollständiges T3 Gear + Kriegsmaschine + Level 10+',
    unlockCondition: { bossesDefeated: ['boss_iron_commander'] },
  },

  // ── Ocean Routes ──
  ocean_shallows: {
    id: 'ocean_shallows',
    name: 'Versunkene Küste',
    tier: 2,
    rooms: 8,
    isUnderwater: true,
    airDecayPerRoom: 8,
    encounters: [
      { type: 'combat', enemies: ['deep_sea_angler'] },
      { type: 'combat', enemies: ['jellyfish_swarm', 'jellyfish_swarm'] },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['pressure_crab', 'deep_sea_angler'] },
      { type: 'find', findGold: 20, findItems: [{ itemId: 'air_crystal', qty: 1 }] },
      { type: 'combat', enemies: ['sea_serpent'] },
      { type: 'rest', healPercent: 25 },
    ],
    bossId: null,
    recommendedLevel: 'Vollständige T2 Ausrüstung',
  },
  ocean_depths: {
    id: 'ocean_depths',
    name: 'Abgrundtiefen',
    tier: 3,
    rooms: 13,
    isUnderwater: true,
    airDecayPerRoom: 8,
    encounters: [
      { type: 'combat', enemies: ['deep_sea_angler', 'jellyfish_swarm'] },
      { type: 'combat', enemies: ['pressure_crab', 'pressure_crab'] },
      { type: 'hazard', damage: 5 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['drowned_knight', 'drowned_knight'] },
      { type: 'combat', enemies: ['sea_serpent', 'jellyfish_swarm'] },
      { type: 'find', findGold: 25, findItems: [{ itemId: 'air_crystal', qty: 2 }] },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['deep_sea_angler', 'pressure_crab', 'drowned_knight'] },
      { type: 'combat', enemies: ['sea_serpent', 'pressure_crab'] },
      { type: 'hazard', damage: 8 },
      { type: 'rest', healPercent: 25 },
      { type: 'boss', enemies: ['boss_leviathan'] },
    ],
    bossId: 'boss_leviathan',
    recommendedLevel: 'T3 Ausrüstung empfohlen',
  },
};
