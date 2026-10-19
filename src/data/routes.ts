import { EncounterType } from '../models/ExpeditionRun';
import type { GameState } from '../models/GameState';
import { ENEMY_DEFS } from './enemies';
import { LOOT_TABLE_DEFS } from './lootTables';

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

// ── Dungeon Graph — defines visual map layout & connections ──

export interface DungeonGraphNode {
  routeId: string;
  x: number;       // 0-900 px
  y: number;       // 0-2600 px (0 = top/endgame, 2600 = bottom/start)
  leadsTo: string[]; // route IDs reachable from this node (toward harder content)
  isMainPath?: boolean;
}

export const DUNGEON_GRAPH: DungeonGraphNode[] = [
  // ── START (bottom) ──
  { routeId: 'forest_short',       x: 450, y: 2400, leadsTo: ['forest_medium', 'forest_ruins'], isMainPath: true },
  { routeId: 'forest_ruins',       x: 200, y: 2200, leadsTo: [] },

  // ── EARLY BRANCHES ──
  { routeId: 'forest_medium',      x: 400, y: 2050, leadsTo: ['swamp_long', 'cave_deep', 'ocean_shallows', 'haunted_woods'], isMainPath: true },
  { routeId: 'haunted_woods',      x: 160, y: 1880, leadsTo: [] },

  // ── LEFT: Ocean branch ──
  { routeId: 'ocean_shallows',     x: 130, y: 1720, leadsTo: ['ocean_depths'] },
  { routeId: 'ocean_depths',       x: 100, y: 1500, leadsTo: ['ocean_abyss'] },
  { routeId: 'ocean_abyss',        x: 70,  y: 1300, leadsTo: [] },

  // ── RIGHT: Cave branch ──
  { routeId: 'cave_deep',          x: 700, y: 1830, leadsTo: ['cave_spider', 'cave_tunnels'] },
  { routeId: 'cave_spider',        x: 820, y: 1670, leadsTo: [] },
  { routeId: 'cave_tunnels',       x: 720, y: 1480, leadsTo: ['crystal_mines', 'ruins_crypts'] },
  { routeId: 'crystal_mines',      x: 840, y: 1290, leadsTo: [] },

  // ── MID: Main path + Swamp crossroads ──
  { routeId: 'swamp_long',         x: 400, y: 1200, leadsTo: ['obsidian_tunnels', 'siege_walls', 'ruins_crypts', 'swamp_village'], isMainPath: true },
  { routeId: 'swamp_village',      x: 530, y: 1370, leadsTo: [] },

  // ── LEFT: Siege branch ──
  { routeId: 'siege_walls',        x: 190, y: 980,  leadsTo: ['siege_fortress', 'frozen_pass'] },
  { routeId: 'frozen_pass',        x: 70,  y: 1080, leadsTo: [] },
  { routeId: 'siege_fortress',     x: 140, y: 740,  leadsTo: [] },

  // ── RIGHT: Ruins branch (also reachable from cave_tunnels) ──
  { routeId: 'ruins_crypts',       x: 680, y: 1080, leadsTo: ['ruins_depths'] },
  { routeId: 'ruins_depths',       x: 740, y: 870,  leadsTo: ['shadow_catacombs', 'obsidian_tunnels'] },
  { routeId: 'shadow_catacombs',   x: 840, y: 690,  leadsTo: [] },

  // ── UPPER: Volcanic region ──
  { routeId: 'obsidian_tunnels',   x: 430, y: 650,  leadsTo: ['volcano_core', 'ash_wastes', 'magma_caverns'], isMainPath: true },
  { routeId: 'ash_wastes',         x: 220, y: 440,  leadsTo: [] },
  { routeId: 'magma_caverns',      x: 680, y: 440,  leadsTo: [] },

  // ── TOP: Final boss ──
  { routeId: 'volcano_core',       x: 450, y: 180,  leadsTo: [], isMainPath: true },
];

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

  // ═══════════════════════════════════════════
  // ── PLACEHOLDER ROUTES (Dungeon Map Filler) ──
  // ═══════════════════════════════════════════

  forest_ruins: {
    id: 'forest_ruins',
    name: 'Verfallene Lichtung',
    tier: 1,
    rooms: 7,
    encounters: [
      { type: 'combat', enemies: ['forest_wolf', 'forest_spider'] },
      { type: 'combat', enemies: ['forest_bandit'] },
      { type: 'rest', healPercent: 30 },
      { type: 'combat', enemies: ['forest_wolf', 'forest_wolf'] },
      { type: 'hazard', damage: 5 },
      { type: 'combat', enemies: ['forest_bear', 'forest_bandit'] },
    ],
    bossId: null,
    recommendedLevel: 'Starter gear',
  },
  haunted_woods: {
    id: 'haunted_woods',
    name: 'Geisterwald',
    tier: 2,
    rooms: 9,
    encounters: [
      { type: 'combat', enemies: ['forest_wolf', 'forest_wisp'] },
      { type: 'combat', enemies: ['forest_shaman', 'forest_spider'] },
      { type: 'checkpoint' },
      { type: 'hazard', damage: 8 },
      { type: 'combat', enemies: ['forest_bear', 'forest_wisp', 'forest_wisp'] },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['forest_shaman', 'forest_wolf', 'forest_wolf'] },
      { type: 'find', findGold: 12, findItems: [{ itemId: 'herb_green', qty: 1 }] },
      { type: 'combat', enemies: ['forest_bear', 'forest_shaman', 'forest_wisp'] },
    ],
    bossId: null,
    recommendedLevel: 'Iron gear',
  },
  cave_tunnels: {
    id: 'cave_tunnels',
    name: 'Verschlungene Tunnel',
    tier: 2,
    rooms: 8,
    encounters: [
      { type: 'combat', enemies: ['cave_bat', 'cave_goblin'] },
      { type: 'combat', enemies: ['cave_slime', 'cave_slime'] },
      { type: 'checkpoint' },
      { type: 'hazard', damage: 8 },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['cave_goblin', 'cave_bat', 'cave_bat'] },
      { type: 'combat', enemies: ['cave_troll'] },
    ],
    bossId: null,
    recommendedLevel: 'Full iron gear',
    unlockCondition: { bossesDefeated: ['boss_crystal_golem'] },
  },
  crystal_mines: {
    id: 'crystal_mines',
    name: 'Kristallminen',
    tier: 3,
    rooms: 10,
    encounters: [
      { type: 'combat', enemies: ['crystal_beetle', 'cave_goblin'] },
      { type: 'combat', enemies: ['deep_crawler', 'crystal_beetle'] },
      { type: 'checkpoint' },
      { type: 'hazard', damage: 10 },
      { type: 'combat', enemies: ['cave_troll', 'crystal_beetle', 'crystal_beetle'] },
      { type: 'rest', healPercent: 20 },
      { type: 'find', findGold: 25, findItems: [{ itemId: 'old_coin', qty: 2 }] },
      { type: 'combat', enemies: ['deep_crawler', 'cave_troll'] },
      { type: 'combat', enemies: ['crystal_beetle', 'crystal_beetle', 'deep_crawler'] },
    ],
    bossId: null,
    recommendedLevel: 'T2 gear recommended',
    unlockCondition: { bossesDefeated: ['boss_crystal_golem', 'boss_spider_queen'] },
  },
  ocean_abyss: {
    id: 'ocean_abyss',
    name: 'Abyssale Tiefe',
    tier: 4,
    rooms: 10,
    isUnderwater: true,
    airDecayPerRoom: 10,
    encounters: [
      { type: 'combat', enemies: ['deep_sea_angler', 'pressure_crab'] },
      { type: 'combat', enemies: ['drowned_knight', 'jellyfish_swarm'] },
      { type: 'checkpoint' },
      { type: 'hazard', damage: 10 },
      { type: 'combat', enemies: ['sea_serpent', 'drowned_knight'] },
      { type: 'find', findGold: 30, findItems: [{ itemId: 'air_crystal', qty: 2 }] },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['deep_sea_angler', 'sea_serpent'] },
      { type: 'hazard', damage: 12 },
      { type: 'combat', enemies: ['drowned_knight', 'pressure_crab', 'deep_sea_angler'] },
    ],
    bossId: null,
    recommendedLevel: 'T3 Ausrüstung + Luftkristalle',
    unlockCondition: { bossesDefeated: ['boss_leviathan'] },
  },
  swamp_village: {
    id: 'swamp_village',
    name: 'Sumpfdorf',
    tier: 2,
    rooms: 7,
    encounters: [
      { type: 'combat', enemies: ['leech_swarm', 'toxic_toad'] },
      { type: 'merchant' },
      { type: 'combat', enemies: ['rot_walker', 'leech_swarm'] },
      { type: 'rest', healPercent: 25 },
      { type: 'combat', enemies: ['swamp_troll'] },
      { type: 'find', findGold: 15, findItems: [{ itemId: 'herb_green', qty: 2 }] },
    ],
    bossId: null,
    recommendedLevel: 'Iron gear + T2 items',
    unlockCondition: { bossesDefeated: ['boss_elder_treant'] },
  },
  frozen_pass: {
    id: 'frozen_pass',
    name: 'Gefrorener Pass',
    tier: 3,
    rooms: 8,
    encounters: [
      { type: 'combat', enemies: ['skeleton_warrior', 'skeleton_warrior'] },
      { type: 'hazard', damage: 10 },
      { type: 'combat', enemies: ['ghost_mage', 'skeleton_warrior'] },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 15 },
      { type: 'combat', enemies: ['bone_knight', 'ghost_mage'] },
      { type: 'hazard', damage: 12 },
      { type: 'combat', enemies: ['stone_guardian', 'skeleton_warrior', 'skeleton_warrior'] },
    ],
    bossId: null,
    recommendedLevel: 'T2 gear + Frostschutz',
    unlockCondition: { bossesDefeated: ['boss_fallen_knight'] },
  },
  shadow_catacombs: {
    id: 'shadow_catacombs',
    name: 'Schattenkatakomben',
    tier: 4,
    rooms: 11,
    encounters: [
      { type: 'combat', enemies: ['bone_knight', 'ghost_mage'] },
      { type: 'combat', enemies: ['tomb_horror', 'skeleton_warrior'] },
      { type: 'hazard', damage: 12 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['cursed_priest', 'ghost_mage', 'ghost_mage'] },
      { type: 'rest', healPercent: 15 },
      { type: 'combat', enemies: ['stone_guardian', 'bone_knight'] },
      { type: 'hazard', damage: 14 },
      { type: 'combat', enemies: ['tomb_horror', 'cursed_priest', 'skeleton_warrior'] },
      { type: 'combat', enemies: ['stone_guardian', 'tomb_horror', 'bone_knight'] },
    ],
    bossId: null,
    recommendedLevel: 'Full T2+ gear',
    unlockCondition: { bossesDefeated: ['boss_shadow_lich'] },
  },
  obsidian_tunnels: {
    id: 'obsidian_tunnels',
    name: 'Obsidiantunnel',
    tier: 3,
    rooms: 9,
    encounters: [
      { type: 'combat', enemies: ['lava_elemental', 'fire_bat'] },
      { type: 'combat', enemies: ['obsidian_crab', 'fire_bat', 'fire_bat'] },
      { type: 'checkpoint' },
      { type: 'hazard', damage: 10 },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['ash_golem', 'obsidian_crab'] },
      { type: 'combat', enemies: ['flame_spirit', 'lava_elemental'] },
      { type: 'combat', enemies: ['ash_golem', 'fire_bat', 'obsidian_crab'] },
    ],
    bossId: null,
    recommendedLevel: 'T2 gear + Feuerschutz',
    unlockCondition: { bossesDefeated: ['boss_swamp_hydra'] },
  },
  ash_wastes: {
    id: 'ash_wastes',
    name: 'Aschewüste',
    tier: 4,
    rooms: 10,
    encounters: [
      { type: 'combat', enemies: ['ash_golem', 'fire_bat'] },
      { type: 'hazard', damage: 12 },
      { type: 'combat', enemies: ['flame_spirit', 'lava_elemental'] },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['ash_golem', 'obsidian_crab', 'fire_bat'] },
      { type: 'rest', healPercent: 15 },
      { type: 'hazard', damage: 14 },
      { type: 'combat', enemies: ['flame_spirit', 'ash_golem', 'lava_elemental'] },
      { type: 'combat', enemies: ['magma_broodling', 'flame_spirit'] },
    ],
    bossId: null,
    recommendedLevel: 'Full T2 gear + Level 8+',
    unlockCondition: { bossesDefeated: ['boss_swamp_hydra', 'boss_fallen_knight'] },
  },
  magma_caverns: {
    id: 'magma_caverns',
    name: 'Magmahöhlen',
    tier: 4,
    rooms: 11,
    encounters: [
      { type: 'combat', enemies: ['lava_elemental', 'obsidian_crab'] },
      { type: 'combat', enemies: ['fire_bat', 'fire_bat', 'flame_spirit'] },
      { type: 'hazard', damage: 12 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['ash_golem', 'lava_elemental', 'fire_bat'] },
      { type: 'rest', healPercent: 15 },
      { type: 'combat', enemies: ['magma_broodling', 'obsidian_crab'] },
      { type: 'hazard', damage: 14 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['flame_spirit', 'ash_golem', 'lava_elemental'] },
      { type: 'combat', enemies: ['magma_broodling', 'flame_spirit', 'obsidian_crab'] },
    ],
    bossId: null,
    recommendedLevel: 'Full T2 gear + Level 8+',
    unlockCondition: { bossesDefeated: ['boss_swamp_hydra', 'boss_fallen_knight'] },
  },
};

// ── Route Image Map — shared between ExpeditionsScreen & DungeonMapScreen ──

/** Map route IDs to expedition tile image names (in assets/tiles/). */
export const ROUTE_IMAGE_MAP: Record<string, string> = {
  forest_short: 'exp_forest_short',
  forest_medium: 'exp_forest_medium',
  cave_deep: 'exp_cave_deep',
  cave_spider: 'exp_cave_spider',
  swamp_long: 'exp_swamp_long',
  ruins_crypts: 'exp_ruins_crypts',
  ruins_depths: 'exp_ruins_depths',
  volcano_core: 'exp_volcano_core',
  siege_walls: 'exp_siege_walls',
  siege_fortress: 'exp_siege_fortress',
  ocean_shallows: 'exp_ocean_shallows',
  ocean_depths: 'exp_ocean_depths',
  forest_ruins: 'exp_forest_ruins',
  haunted_woods: 'exp_haunted_woods',
  cave_tunnels: 'exp_cave_tunnels',
  crystal_mines: 'exp_crystal_mines',
  ocean_abyss: 'exp_ocean_abyss',
  swamp_village: 'exp_swamp_village',
  frozen_pass: 'exp_frozen_pass',
  shadow_catacombs: 'exp_shadow_catacombs',
  obsidian_tunnels: 'exp_obsidian_tunnels',
  ash_wastes: 'exp_ash_wastes',
  magma_caverns: 'exp_magma_caverns',
};

// ── Baupläne (Gebäude-Freischaltung über Dungeon-Bosse) ──

/**
 * Bauplan, den der Boss dieser Route beim ersten Sieg garantiert fallen lässt.
 * Quelle: LootTableDef.ersterSiegBauplan der Boss-Beutetabelle. null = kein Bauplan.
 */
export function getRouteBauplan(routeId: string): string | null {
  const bossId = ROUTE_DEFS[routeId]?.bossId;
  if (!bossId) return null;
  const lootTableId = ENEMY_DEFS[bossId]?.lootTableId;
  return (lootTableId && LOOT_TABLE_DEFS[lootTableId]?.ersterSiegBauplan) || null;
}

/** Route, deren Boss diesen Bauplan fallen lässt, oder null. */
export function findBauplanRoute(bauplanId: string): RouteDef | null {
  return Object.values(ROUTE_DEFS).find(r => getRouteBauplan(r.id) === bauplanId) ?? null;
}

/** Hinweistext für die Bau-Anzeige (#25), z. B. «Bauplan: Tiefe Höhle». */
export function getBauplanHinweis(bauplanId: string): string {
  const route = findBauplanRoute(bauplanId);
  return `Bauplan: ${route ? route.name : 'unbekannter Dungeon'}`;
}

// ── Freischaltung (gleiche Regel für Dungeonkarte und Expeditionsliste) ──

type RouteProgress = Pick<GameState, 'guildStats' | 'scoreboard'>;

/** Route spielbar: Gildenrang ≥ Ebene und alle verlangten Bosse besiegt. */
export function isRouteAvailable(route: RouteDef, state: RouteProgress): boolean {
  return getRouteLockReasons(route, state).length === 0;
}

/** Mindestens ein Sieg auf dieser Route (abgeschlossene Routen bleiben wiederholbar). */
export function isRouteCompleted(routeId: string, state: RouteProgress): boolean {
  return (state.scoreboard ?? []).some(s => s.routeId === routeId && s.status === 'victory');
}

/** Gründe, warum die Route gesperrt ist; leer = verfügbar. */
export function getRouteLockReasons(route: RouteDef, state: RouteProgress): string[] {
  const reasons: string[] = [];
  if ((state.guildStats?.rank ?? 1) < route.tier) reasons.push(`Gildenrang ${route.tier} benötigt`);
  const defeated = state.guildStats?.bossesDefeatedIds ?? [];
  const missing = (route.unlockCondition?.bossesDefeated ?? []).filter(b => !defeated.includes(b));
  if (missing.length > 0) {
    reasons.push(`Besiege: ${missing.map(b => ENEMY_DEFS[b]?.name ?? b).join(', ')}`);
  }
  return reasons;
}
