export interface EnemyDef {
  id: string;
  name: string;
  role: 'melee' | 'ranged' | 'support' | 'boss';
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critChance: number;
  critMult: number;
  skills: EnemySkillDef[];
  lootTableId: string;
  xpReward: number;
  spriteKey: string;
  isBoss?: boolean;
  enrage?: { afterRound: number; atkMult: number; spdMult: number };
  goldReward?: number;
}

export interface EnemySkillDef {
  id: string;
  name: string;
  cooldown: number;
  effectType: 'damage' | 'heal' | 'buff' | 'aoe' | 'summon';
  power: number;
  target: 'player' | 'self' | 'ally_lowest_hp' | 'all_players';
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {

  // ── Forest Enemies ──
  forest_wolf: {
    id: 'forest_wolf', name: 'Waldwolf', role: 'melee',
    hp: 12, atk: 4, def: 1, spd: 1.1, critChance: 0.1, critMult: 1.5,
    skills: [{ id: 'bite', name: 'Biss', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 5, goldReward: 3, spriteKey: 'ENEMY_FOREST_WOLF',
  },
  forest_spider: {
    id: 'forest_spider', name: 'Waldspinne', role: 'ranged',
    hp: 8, atk: 5, def: 0, spd: 1.3, critChance: 0.15, critMult: 2.0,
    skills: [{ id: 'web', name: 'Netz', cooldown: 4, effectType: 'aoe', power: 0.5, target: 'all_players' }],
    lootTableId: 'loot_forest_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_VENOMFANG_SPIDER',
  },
  forest_bandit: {
    id: 'forest_bandit', name: 'Waldbandit', role: 'melee',
    hp: 15, atk: 5, def: 2, spd: 0.9, critChance: 0.1, critMult: 1.5,
    skills: [{ id: 'slash', name: 'Hieb', cooldown: 3, effectType: 'damage', power: 1.3, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_BANDIT_RAIDER',
  },
  forest_shaman: {
    id: 'forest_shaman', name: 'Waldschamane', role: 'support',
    hp: 10, atk: 3, def: 1, spd: 0.8, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'heal_ally', name: 'Heilung', cooldown: 4, effectType: 'heal', power: 8, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_forest_common', xpReward: 5, goldReward: 3, spriteKey: 'ENEMY_BOG_WITCH',
  },
  forest_bear: {
    id: 'forest_bear', name: 'Waldbär', role: 'melee',
    hp: 25, atk: 6, def: 3, spd: 0.7, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'maul', name: 'Zerfleischen', cooldown: 3, effectType: 'damage', power: 2.0, target: 'player' }],
    lootTableId: 'loot_forest_rare', xpReward: 10, goldReward: 5, spriteKey: 'ENEMY_BRAMBLE_BEAR',
  },
  forest_wisp: {
    id: 'forest_wisp', name: 'Waldgeist', role: 'ranged',
    hp: 6, atk: 7, def: 0, spd: 1.5, critChance: 0.2, critMult: 2.0,
    skills: [],
    lootTableId: 'loot_forest_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_FOREST_WISP',
  },

  // Forest extras (from GDD 10.6)
  thorn_sprite: {
    id: 'thorn_sprite', name: 'Dornengeist', role: 'ranged',
    hp: 14, atk: 4, def: 0, spd: 1.4, critChance: 0.12, critMult: 1.8,
    skills: [{ id: 'thorn_volley', name: 'Dornensalve', cooldown: 3, effectType: 'damage', power: 1.3, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_THORN_SPRITE',
  },
  fungal_creeper: {
    id: 'fungal_creeper', name: 'Pilzkriecher', role: 'melee',
    hp: 22, atk: 3, def: 2, spd: 0.9, critChance: 0.04, critMult: 1.5,
    skills: [{ id: 'spore_cloud', name: 'Sporenwolke', cooldown: 4, effectType: 'aoe', power: 0.8, target: 'all_players' }],
    lootTableId: 'loot_forest_common', xpReward: 5, goldReward: 3, spriteKey: 'ENEMY_FUNGAL_CREEPER',
  },
  shadow_bat: {
    id: 'shadow_bat', name: 'Schattenfledermaus', role: 'ranged',
    hp: 12, atk: 5, def: 0, spd: 1.5, critChance: 0.1, critMult: 1.6,
    skills: [{ id: 'sonic_screech', name: 'Schallschrei', cooldown: 4, effectType: 'aoe', power: 0.6, target: 'all_players' }],
    lootTableId: 'loot_forest_common', xpReward: 3, goldReward: 3, spriteKey: 'ENEMY_SHADOW_BAT',
  },
  moss_golem: {
    id: 'moss_golem', name: 'Moosgolem', role: 'melee',
    hp: 42, atk: 4, def: 5, spd: 0.6, critChance: 0.02, critMult: 1.5,
    skills: [{ id: 'ground_pound', name: 'Bodenschlag', cooldown: 4, effectType: 'aoe', power: 1.0, target: 'all_players' }],
    lootTableId: 'loot_forest_rare', xpReward: 10, goldReward: 5, spriteKey: 'ENEMY_MOSS_GOLEM',
  },
  venomfang_spider: {
    id: 'venomfang_spider', name: 'Giftzahnspinne', role: 'melee',
    hp: 20, atk: 6, def: 1, spd: 1.1, critChance: 0.08, critMult: 1.7,
    skills: [{ id: 'venom_bite', name: 'Giftbiss', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_VENOMFANG_SPIDER',
  },
  goblin_scout: {
    id: 'goblin_scout', name: 'Goblin-Späher', role: 'melee',
    hp: 15, atk: 4, def: 1, spd: 1.3, critChance: 0.1, critMult: 1.6,
    skills: [{ id: 'quick_stab', name: 'Schnellstich', cooldown: 2, effectType: 'damage', power: 1.2, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_GOBLIN_SCOUT',
  },
  wild_boar: {
    id: 'wild_boar', name: 'Wildschwein', role: 'melee',
    hp: 28, atk: 5, def: 2, spd: 1.0, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'charge', name: 'Angriff', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 7, goldReward: 4, spriteKey: 'ENEMY_WILD_BOAR',
  },
  hollow_shade: {
    id: 'hollow_shade', name: 'Hohlschatten', role: 'melee',
    hp: 16, atk: 7, def: 0, spd: 1.4, critChance: 0.15, critMult: 2.0,
    skills: [{ id: 'shadow_strike', name: 'Schattenschlag', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_HOLLOW_SHADE',
  },
  bramble_bear: {
    id: 'bramble_bear', name: 'Dornenbär', role: 'melee',
    hp: 38, atk: 5, def: 3, spd: 0.85, critChance: 0.04, critMult: 1.5,
    skills: [{ id: 'maul', name: 'Zerfleischen', cooldown: 3, effectType: 'damage', power: 1.6, target: 'player' }],
    lootTableId: 'loot_forest_rare', xpReward: 9, goldReward: 5, spriteKey: 'ENEMY_BRAMBLE_BEAR',
  },
  cursed_wisp: {
    id: 'cursed_wisp', name: 'Verfluchtes Irrlicht', role: 'support',
    hp: 10, atk: 2, def: 0, spd: 1.3, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'heal_ally', name: 'Verbündete heilen', cooldown: 3, effectType: 'heal', power: 8, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_forest_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_CURSED_WISP',
  },
  bandit_raider: {
    id: 'bandit_raider', name: 'Bandit', role: 'melee',
    hp: 26, atk: 4, def: 2, spd: 1.0, critChance: 0.06, critMult: 1.5,
    skills: [{ id: 'dirty_strike', name: 'Schmutziger Streich', cooldown: 4, effectType: 'damage', power: 1.6, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_BANDIT_RAIDER',
  },

  // ── Cave Enemies ──
  cave_bat: {
    id: 'cave_bat', name: 'Höhlenfledermaus', role: 'ranged',
    hp: 8, atk: 4, def: 0, spd: 1.4, critChance: 0.15, critMult: 1.8,
    skills: [],
    lootTableId: 'loot_cave_common', xpReward: 3, goldReward: 3, spriteKey: 'ENEMY_CAVE_BAT',
  },
  cave_slime: {
    id: 'cave_slime', name: 'Höhlenschleim', role: 'melee',
    hp: 20, atk: 3, def: 4, spd: 0.5, critChance: 0.0, critMult: 1.0,
    skills: [{ id: 'acid', name: 'Säure', cooldown: 4, effectType: 'aoe', power: 1.0, target: 'all_players' }],
    lootTableId: 'loot_cave_common', xpReward: 5, goldReward: 3, spriteKey: 'ENEMY_CAVE_SLIME',
  },
  cave_goblin: {
    id: 'cave_goblin', name: 'Höhlengoblin', role: 'melee',
    hp: 14, atk: 5, def: 2, spd: 1.0, critChance: 0.1, critMult: 1.5,
    skills: [{ id: 'stab', name: 'Stich', cooldown: 3, effectType: 'damage', power: 1.4, target: 'player' }],
    lootTableId: 'loot_cave_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_CAVE_GOBLIN',
  },
  cave_spider_queen: {
    id: 'cave_spider_queen', name: 'Spinnenkönigin', role: 'support',
    hp: 18, atk: 4, def: 2, spd: 0.9, critChance: 0.1, critMult: 1.5,
    skills: [
      { id: 'poison_spit', name: 'Giftspeie', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' },
      { id: 'summon', name: 'Beschwörung', cooldown: 5, effectType: 'buff', power: 3, target: 'self' },
    ],
    lootTableId: 'loot_cave_rare', xpReward: 8, goldReward: 5, spriteKey: 'ENEMY_CAVE_SPIDER_QUEEN',
  },
  cave_golem_shard: {
    id: 'cave_golem_shard', name: 'Golemfragment', role: 'melee',
    hp: 22, atk: 5, def: 5, spd: 0.4, critChance: 0.0, critMult: 1.0,
    skills: [],
    lootTableId: 'loot_cave_common', xpReward: 7, goldReward: 4, spriteKey: 'ENEMY_CAVE_GOLEM_SHARD',
  },
  cave_troll: {
    id: 'cave_troll', name: 'Höhlentroll', role: 'melee',
    hp: 30, atk: 7, def: 4, spd: 0.6, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'smash', name: 'Zerschmettern', cooldown: 3, effectType: 'damage', power: 2.0, target: 'player' }],
    lootTableId: 'loot_cave_rare', xpReward: 12, goldReward: 6, spriteKey: 'ENEMY_CAVE_TROLL',
  },

  // Cave extras (from GDD 10.6)
  crystal_beetle: {
    id: 'crystal_beetle', name: 'Kristallkäfer', role: 'melee',
    hp: 16, atk: 5, def: 3, spd: 1.1, critChance: 0.08, critMult: 1.6,
    skills: [{ id: 'crystal_charge', name: 'Kristallstoß', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' }],
    lootTableId: 'loot_cave_common', xpReward: 5, goldReward: 4, spriteKey: 'ENEMY_CRYSTAL_BEETLE',
  },
  deep_crawler: {
    id: 'deep_crawler', name: 'Tiefenkriecher', role: 'melee',
    hp: 24, atk: 5, def: 2, spd: 0.9, critChance: 0.06, critMult: 1.5,
    skills: [{ id: 'tunnel_ambush', name: 'Tunnelhinterhalt', cooldown: 4, effectType: 'damage', power: 1.7, target: 'player' }],
    lootTableId: 'loot_cave_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_DEEP_CRAWLER',
  },
  mine_specter: {
    id: 'mine_specter', name: 'Minengespenst', role: 'melee',
    hp: 13, atk: 8, def: 0, spd: 1.5, critChance: 0.14, critMult: 2.0,
    skills: [{ id: 'spectral_slash', name: 'Geisterschlag', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player' }],
    lootTableId: 'loot_cave_rare', xpReward: 7, goldReward: 5, spriteKey: 'ENEMY_MINE_SPECTER',
  },
  stalactite_bat: {
    id: 'stalactite_bat', name: 'Tropfsteinfledermaus', role: 'ranged',
    hp: 11, atk: 4, def: 0, spd: 1.6, critChance: 0.1, critMult: 1.5,
    skills: [{ id: 'dive_bomb', name: 'Sturzangriff', cooldown: 2, effectType: 'damage', power: 1.4, target: 'player' }],
    lootTableId: 'loot_cave_common', xpReward: 3, goldReward: 3, spriteKey: 'ENEMY_STALACTITE_BAT',
  },
  magma_slug: {
    id: 'magma_slug', name: 'Magmaschnecke', role: 'melee',
    hp: 36, atk: 4, def: 4, spd: 0.5, critChance: 0.03, critMult: 1.5,
    skills: [{ id: 'lava_spit', name: 'Lavaspeie', cooldown: 4, effectType: 'aoe', power: 0.9, target: 'all_players' }],
    lootTableId: 'loot_cave_rare', xpReward: 8, goldReward: 5, spriteKey: 'ENEMY_MAGMA_SLUG',
  },

  // ── Swamp Enemies ──
  bog_witch: {
    id: 'bog_witch', name: 'Moorhexe', role: 'support',
    hp: 18, atk: 3, def: 1, spd: 1.0, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'dark_mend', name: 'Dunkle Heilung', cooldown: 3, effectType: 'heal', power: 10, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_swamp_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_BOG_WITCH',
  },
  swamp_troll: {
    id: 'swamp_troll', name: 'Sumpftroll', role: 'melee',
    hp: 45, atk: 5, def: 4, spd: 0.55, critChance: 0.03, critMult: 1.5,
    skills: [{ id: 'club_slam', name: 'Keulenschlag', cooldown: 4, effectType: 'aoe', power: 1.1, target: 'all_players' }],
    lootTableId: 'loot_swamp_rare', xpReward: 14, goldReward: 6, spriteKey: 'ENEMY_SWAMP_TROLL',
  },
  leech_swarm: {
    id: 'leech_swarm', name: 'Blutegelschwarm', role: 'melee',
    hp: 14, atk: 6, def: 0, spd: 1.3, critChance: 0.08, critMult: 1.5,
    skills: [{ id: 'drain_bite', name: 'Saugbiss', cooldown: 2, effectType: 'damage', power: 1.3, target: 'player' }],
    lootTableId: 'loot_swamp_common', xpReward: 5, goldReward: 4, spriteKey: 'ENEMY_LEECH_SWARM',
  },
  mire_phantom: {
    id: 'mire_phantom', name: 'Sumpfphantom', role: 'melee',
    hp: 15, atk: 8, def: 0, spd: 1.4, critChance: 0.15, critMult: 2.0,
    skills: [{ id: 'phantom_strike', name: 'Phantomstreich', cooldown: 4, effectType: 'damage', power: 2.0, target: 'player' }],
    lootTableId: 'loot_swamp_rare', xpReward: 8, goldReward: 5, spriteKey: 'ENEMY_MIRE_PHANTOM',
  },
  toxic_toad: {
    id: 'toxic_toad', name: 'Giftkröte', role: 'ranged',
    hp: 20, atk: 3, def: 2, spd: 0.85, critChance: 0.04, critMult: 1.5,
    skills: [{ id: 'poison_spray', name: 'Giftsprüher', cooldown: 3, effectType: 'aoe', power: 0.7, target: 'all_players' }],
    lootTableId: 'loot_swamp_common', xpReward: 5, goldReward: 4, spriteKey: 'ENEMY_TOXIC_TOAD',
  },
  rot_walker: {
    id: 'rot_walker', name: 'Fäulniswandler', role: 'melee',
    hp: 28, atk: 5, def: 2, spd: 0.9, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'decay_smash', name: 'Verwesung', cooldown: 3, effectType: 'damage', power: 1.6, target: 'player' }],
    lootTableId: 'loot_swamp_common', xpReward: 7, goldReward: 5, spriteKey: 'ENEMY_ROT_WALKER',
  },

  // ── Ruins Enemies ──
  skeleton_warrior: {
    id: 'skeleton_warrior', name: 'Skelettkrieger', role: 'melee',
    hp: 22, atk: 5, def: 3, spd: 1.0, critChance: 0.06, critMult: 1.5,
    skills: [{ id: 'bone_slash', name: 'Knochenhieb', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' }],
    lootTableId: 'loot_ruins_common', xpReward: 7, goldReward: 5, spriteKey: 'ENEMY_SKELETON_WARRIOR',
  },
  ghost_mage: {
    id: 'ghost_mage', name: 'Geistermagier', role: 'ranged',
    hp: 14, atk: 6, def: 0, spd: 1.3, critChance: 0.1, critMult: 1.7,
    skills: [{ id: 'spirit_bolt', name: 'Geisterschuss', cooldown: 3, effectType: 'damage', power: 1.4, target: 'player' }],
    lootTableId: 'loot_ruins_common', xpReward: 6, goldReward: 5, spriteKey: 'ENEMY_GHOST_MAGE',
  },
  stone_guardian: {
    id: 'stone_guardian', name: 'Steinwächter', role: 'melee',
    hp: 40, atk: 4, def: 6, spd: 0.6, critChance: 0.02, critMult: 1.5,
    skills: [{ id: 'stone_slam', name: 'Steinschlag', cooldown: 4, effectType: 'aoe', power: 1.0, target: 'all_players' }],
    lootTableId: 'loot_ruins_rare', xpReward: 12, goldReward: 7, spriteKey: 'ENEMY_STONE_GUARDIAN',
  },
  bone_knight: {
    id: 'bone_knight', name: 'Knochenritter', role: 'melee',
    hp: 30, atk: 6, def: 4, spd: 0.9, critChance: 0.07, critMult: 1.6,
    skills: [{ id: 'cursed_charge', name: 'Verfluchter Ansturm', cooldown: 4, effectType: 'damage', power: 1.7, target: 'player' }],
    lootTableId: 'loot_ruins_rare', xpReward: 10, goldReward: 6, spriteKey: 'ENEMY_BONE_KNIGHT',
  },
  tomb_horror: {
    id: 'tomb_horror', name: 'Grabschrecke', role: 'melee',
    hp: 13, atk: 7, def: 0, spd: 1.5, critChance: 0.16, critMult: 2.0,
    skills: [{ id: 'death_lunge', name: 'Todesstoß', cooldown: 3, effectType: 'damage', power: 1.9, target: 'player' }],
    lootTableId: 'loot_ruins_common', xpReward: 6, goldReward: 5, spriteKey: 'ENEMY_TOMB_HORROR',
  },
  cursed_priest: {
    id: 'cursed_priest', name: 'Verwunschener Priester', role: 'support',
    hp: 16, atk: 2, def: 1, spd: 1.0, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'dark_prayer', name: 'Dunkles Gebet', cooldown: 3, effectType: 'heal', power: 9, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_ruins_common', xpReward: 6, goldReward: 5, spriteKey: 'ENEMY_CURSED_PRIEST',
  },

  // ── Volcano Enemies ──
  lava_elemental: {
    id: 'lava_elemental', name: 'Lavaelementar', role: 'melee',
    hp: 35, atk: 5, def: 3, spd: 0.7, critChance: 0.04, critMult: 1.5,
    skills: [{ id: 'magma_wave', name: 'Magmawelle', cooldown: 4, effectType: 'aoe', power: 1.0, target: 'all_players' }],
    lootTableId: 'loot_volcano_common', xpReward: 10, goldReward: 6, spriteKey: 'ENEMY_LAVA_ELEMENTAL',
  },
  fire_bat: {
    id: 'fire_bat', name: 'Feuerfledermaus', role: 'ranged',
    hp: 13, atk: 5, def: 0, spd: 1.5, critChance: 0.1, critMult: 1.6,
    skills: [{ id: 'flame_dive', name: 'Flammensturz', cooldown: 2, effectType: 'damage', power: 1.4, target: 'player' }],
    lootTableId: 'loot_volcano_common', xpReward: 5, goldReward: 5, spriteKey: 'ENEMY_FIRE_BAT',
  },
  ash_golem: {
    id: 'ash_golem', name: 'Aschegollem', role: 'melee',
    hp: 44, atk: 4, def: 5, spd: 0.5, critChance: 0.02, critMult: 1.5,
    skills: [{ id: 'ash_slam', name: 'Ascheschlag', cooldown: 4, effectType: 'aoe', power: 1.1, target: 'all_players' }],
    lootTableId: 'loot_volcano_rare', xpReward: 14, goldReward: 7, spriteKey: 'ENEMY_ASH_GOLEM',
  },
  flame_spirit: {
    id: 'flame_spirit', name: 'Flammengeist', role: 'melee',
    hp: 15, atk: 8, def: 0, spd: 1.3, critChance: 0.14, critMult: 2.0,
    skills: [{ id: 'fire_burst', name: 'Flammenausbruch', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player' }],
    lootTableId: 'loot_volcano_rare', xpReward: 9, goldReward: 7, spriteKey: 'ENEMY_FLAME_SPIRIT',
  },
  obsidian_crab: {
    id: 'obsidian_crab', name: 'Obsidiankrabbe', role: 'melee',
    hp: 25, atk: 5, def: 4, spd: 0.85, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'shell_crush', name: 'Panzerbrecher', cooldown: 3, effectType: 'damage', power: 1.6, target: 'player' }],
    lootTableId: 'loot_volcano_common', xpReward: 8, goldReward: 6, spriteKey: 'ENEMY_OBSIDIAN_CRAB',
  },
  magma_broodling: {
    id: 'magma_broodling', name: 'Magmabrüter', role: 'support',
    hp: 18, atk: 3, def: 2, spd: 1.0, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'flame_aura', name: 'Flammenaura', cooldown: 3, effectType: 'buff', power: 2, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_volcano_common', xpReward: 6, goldReward: 6, spriteKey: 'ENEMY_MAGMA_BROODLING',
  },

  // ── Bosses ──
  boss_elder_treant: {
    id: 'boss_elder_treant', name: 'Uralter Treant', role: 'boss',
    hp: 80, atk: 6, def: 5, spd: 0.7, critChance: 0.08, critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 8, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'root_slam', name: 'Wurzelschlag', cooldown: 3, effectType: 'aoe', power: 1.2, target: 'all_players' },
      { id: 'bark_shield', name: 'Rindenwall', cooldown: 5, effectType: 'buff', power: 3, target: 'self' },
    ],
    lootTableId: 'loot_boss_treant', xpReward: 50, goldReward: 25, spriteKey: 'BOSS_ELDER_TREANT',
  },
  boss_crystal_golem: {
    id: 'boss_crystal_golem', name: 'Kristallgolem', role: 'boss',
    hp: 90, atk: 7, def: 7, spd: 0.5, critChance: 0.06, critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 8, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'crystal_barrage', name: 'Kristallsalve', cooldown: 3, effectType: 'aoe', power: 1.3, target: 'all_players' },
      { id: 'diamond_shell', name: 'Diamantpanzer', cooldown: 5, effectType: 'buff', power: 5, target: 'self' },
    ],
    lootTableId: 'loot_boss_golem', xpReward: 75, goldReward: 35, spriteKey: 'BOSS_CRYSTAL_GOLEM',
  },
  boss_bandit_chief: {
    id: 'boss_bandit_chief', name: 'Banditenhauptmann', role: 'boss',
    hp: 65, atk: 8, def: 3, spd: 1.1, critChance: 0.15, critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 8, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'rally_cry', name: 'Kampfruf', cooldown: 4, effectType: 'buff', power: 2, target: 'ally_lowest_hp' },
      { id: 'backstab', name: 'Hinterlist', cooldown: 3, effectType: 'damage', power: 2.0, target: 'player' },
    ],
    lootTableId: 'loot_boss_bandit', xpReward: 45, goldReward: 30, spriteKey: 'BOSS_BANDIT_CHIEF',
  },
  boss_swamp_hydra: {
    id: 'boss_swamp_hydra', name: 'Sumpfhydra', role: 'boss',
    hp: 100, atk: 6, def: 3, spd: 0.8, critChance: 0.1, critMult: 1.8,
    isBoss: true,
    enrage: { afterRound: 8, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'triple_bite', name: 'Dreifachbiss', cooldown: 2, effectType: 'aoe', power: 1.0, target: 'all_players' },
      { id: 'regenerate', name: 'Regeneration', cooldown: 4, effectType: 'heal', power: 12, target: 'self' },
    ],
    lootTableId: 'loot_boss_hydra', xpReward: 80, goldReward: 40, spriteKey: 'BOSS_SWAMP_HYDRA',
  },
  boss_spider_queen: {
    id: 'boss_spider_queen', name: 'Spinnenkönigin', role: 'boss',
    hp: 75, atk: 5, def: 3, spd: 1.0, critChance: 0.1, critMult: 1.8,
    isBoss: true,
    enrage: { afterRound: 8, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'spawn_brood', name: 'Brut beschwören', cooldown: 4, effectType: 'summon', power: 3, target: 'self' },
      { id: 'venom_burst', name: 'Giftausbruch', cooldown: 3, effectType: 'aoe', power: 0.9, target: 'all_players' },
    ],
    lootTableId: 'loot_boss_spider_queen', xpReward: 60, goldReward: 35, spriteKey: 'BOSS_SPIDER_QUEEN',
  },
  boss_fallen_knight: {
    id: 'boss_fallen_knight', name: 'Gefallener Ritter', role: 'boss',
    hp: 95, atk: 9, def: 6, spd: 0.85, critChance: 0.1, critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 8, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'cursed_blade', name: 'Verfluchte Klinge', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player' },
      { id: 'dark_rally', name: 'Dunkler Schlachtruf', cooldown: 5, effectType: 'buff', power: 3, target: 'ally_lowest_hp' },
    ],
    lootTableId: 'loot_boss_fallen_knight', xpReward: 85, goldReward: 45, spriteKey: 'BOSS_FALLEN_KNIGHT',
  },
  boss_shadow_lich: {
    id: 'boss_shadow_lich', name: 'Schattenlich', role: 'boss',
    hp: 70, atk: 6, def: 2, spd: 1.2, critChance: 0.12, critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 8, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'soul_drain', name: 'Seelenraub', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' },
      { id: 'raise_dead', name: 'Totenerweckung', cooldown: 5, effectType: 'summon', power: 1, target: 'self' },
    ],
    lootTableId: 'loot_boss_lich', xpReward: 75, goldReward: 45, spriteKey: 'BOSS_SHADOW_LICH',
  },
  boss_magma_wyrm: {
    id: 'boss_magma_wyrm', name: 'Magma-Wyrm', role: 'boss',
    hp: 130, atk: 8, def: 4, spd: 0.7, critChance: 0.08, critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 10, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'inferno_breath', name: 'Infernoodem', cooldown: 2, effectType: 'aoe', power: 1.2, target: 'all_players' },
      { id: 'molten_armor', name: 'Magmapanzer', cooldown: 5, effectType: 'buff', power: 4, target: 'self' },
    ],
    lootTableId: 'loot_boss_wyrm', xpReward: 120, goldReward: 50, spriteKey: 'BOSS_MAGMA_WYRM',
  },
};
