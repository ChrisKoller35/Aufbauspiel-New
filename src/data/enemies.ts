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
  lore?: string;
  route?: string;
  /** Gibt an, dass dieser Gegner bevorzugt die Kriegsmaschine angreift */
  prefersWarMachineTarget?: boolean;
}

export interface EnemySkillDef {
  id: string;
  name: string;
  cooldown: number;
  effectType: 'damage' | 'heal' | 'buff' | 'aoe' | 'summon' | 'drain_air';
  drainAirAmount?: number;  // Zusätzlicher Luftentzug (zusätzlich zu normalem Schaden)
  power: number;
  target: 'player' | 'self' | 'ally_lowest_hp' | 'all_players';
  description?: string;
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {

  // ── Forest Enemies ──
  forest_wolf: {
    id: 'forest_wolf', name: 'Waldwolf', role: 'melee',
    hp: 35, atk: 3, def: 1, spd: 1.1, critChance: 0.1, critMult: 1.5,
    skills: [{ id: 'bite', name: 'Biss', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 5, goldReward: 3, spriteKey: 'ENEMY_FOREST_WOLF',
  },
  forest_spider: {
    id: 'forest_spider', name: 'Waldspinne', role: 'ranged',
    hp: 28, atk: 4, def: 0, spd: 1.3, critChance: 0.15, critMult: 2.0,
    skills: [{ id: 'web', name: 'Netz', cooldown: 4, effectType: 'aoe', power: 0.5, target: 'all_players' }],
    lootTableId: 'loot_forest_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_VENOMFANG_SPIDER',
  },
  forest_bandit: {
    id: 'forest_bandit', name: 'Waldbandit', role: 'melee',
    hp: 40, atk: 5, def: 1, spd: 0.9, critChance: 0.1, critMult: 1.5,
    skills: [{ id: 'slash', name: 'Hieb', cooldown: 3, effectType: 'damage', power: 1.3, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_BANDIT_RAIDER',
  },
  forest_shaman: {
    id: 'forest_shaman', name: 'Waldschamane', role: 'support',
    hp: 66, atk: 3, def: 1, spd: 0.8, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'heal_ally', name: 'Heilung', cooldown: 4, effectType: 'heal', power: 24, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_forest_common', xpReward: 5, goldReward: 3, spriteKey: 'ENEMY_BOG_WITCH',
  },
  forest_bear: {
    id: 'forest_bear', name: 'Waldbär', role: 'melee',
    hp: 60, atk: 6, def: 1.5, spd: 0.7, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'maul', name: 'Zerfleischen', cooldown: 3, effectType: 'damage', power: 2.0, target: 'player' }],
    lootTableId: 'loot_forest_rare', xpReward: 10, goldReward: 5, spriteKey: 'ENEMY_BRAMBLE_BEAR',
  },
  forest_wisp: {
    id: 'forest_wisp', name: 'Waldgeist', role: 'ranged',
    hp: 48, atk: 7, def: 0, spd: 1.5, critChance: 0.2, critMult: 2.0,
    skills: [],
    lootTableId: 'loot_forest_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_FOREST_WISP',
  },

  // Forest extras (from GDD 10.6)
  thorn_sprite: {
    id: 'thorn_sprite', name: 'Dornengeist', role: 'ranged',
    hp: 78, atk: 4, def: 0, spd: 1.4, critChance: 0.12, critMult: 1.8,
    skills: [{ id: 'thorn_volley', name: 'Dornensalve', cooldown: 3, effectType: 'damage', power: 1.3, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_THORN_SPRITE',
  },
  fungal_creeper: {
    id: 'fungal_creeper', name: 'Pilzkriecher', role: 'melee',
    hp: 108, atk: 3, def: 2, spd: 0.9, critChance: 0.04, critMult: 1.5,
    skills: [{ id: 'spore_cloud', name: 'Sporenwolke', cooldown: 4, effectType: 'aoe', power: 0.8, target: 'all_players' }],
    lootTableId: 'loot_forest_common', xpReward: 5, goldReward: 3, spriteKey: 'ENEMY_FUNGAL_CREEPER',
  },
  shadow_bat: {
    id: 'shadow_bat', name: 'Schattenfledermaus', role: 'ranged',
    hp: 66, atk: 5, def: 0, spd: 1.5, critChance: 0.1, critMult: 1.6,
    skills: [{ id: 'sonic_screech', name: 'Schallschrei', cooldown: 4, effectType: 'aoe', power: 0.6, target: 'all_players' }],
    lootTableId: 'loot_forest_common', xpReward: 3, goldReward: 3, spriteKey: 'ENEMY_SHADOW_BAT',
  },
  moss_golem: {
    id: 'moss_golem', name: 'Moosgolem', role: 'melee',
    hp: 174, atk: 4, def: 5, spd: 0.6, critChance: 0.02, critMult: 1.5,
    skills: [{ id: 'ground_pound', name: 'Bodenschlag', cooldown: 4, effectType: 'aoe', power: 1.0, target: 'all_players' }],
    lootTableId: 'loot_forest_rare', xpReward: 10, goldReward: 5, spriteKey: 'ENEMY_MOSS_GOLEM',
  },
  venomfang_spider: {
    id: 'venomfang_spider', name: 'Giftzahnspinne', role: 'melee',
    hp: 102, atk: 6, def: 1, spd: 1.1, critChance: 0.08, critMult: 1.7,
    skills: [{ id: 'venom_bite', name: 'Giftbiss', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_VENOMFANG_SPIDER',
  },
  goblin_scout: {
    id: 'goblin_scout', name: 'Goblin-Späher', role: 'melee',
    hp: 78, atk: 4, def: 1, spd: 1.3, critChance: 0.1, critMult: 1.6,
    skills: [{ id: 'quick_stab', name: 'Schnellstich', cooldown: 2, effectType: 'damage', power: 1.2, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_GOBLIN_SCOUT',
  },
  wild_boar: {
    id: 'wild_boar', name: 'Wildschwein', role: 'melee',
    hp: 132, atk: 5, def: 2, spd: 1.0, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'charge', name: 'Angriff', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 7, goldReward: 4, spriteKey: 'ENEMY_WILD_BOAR',
  },
  hollow_shade: {
    id: 'hollow_shade', name: 'Hohlschatten', role: 'melee',
    hp: 84, atk: 7, def: 0, spd: 1.4, critChance: 0.15, critMult: 2.0,
    skills: [{ id: 'shadow_strike', name: 'Schattenschlag', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_HOLLOW_SHADE',
  },
  bramble_bear: {
    id: 'bramble_bear', name: 'Dornenbär', role: 'melee',
    hp: 165, atk: 5, def: 3, spd: 0.85, critChance: 0.04, critMult: 1.5,
    skills: [{ id: 'maul', name: 'Zerfleischen', cooldown: 3, effectType: 'damage', power: 1.6, target: 'player' }],
    lootTableId: 'loot_forest_rare', xpReward: 9, goldReward: 5, spriteKey: 'ENEMY_BRAMBLE_BEAR',
  },
  cursed_wisp: {
    id: 'cursed_wisp', name: 'Verfluchtes Irrlicht', role: 'support',
    hp: 60, atk: 2, def: 0, spd: 1.3, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'heal_ally', name: 'Verbündete heilen', cooldown: 3, effectType: 'heal', power: 24, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_haunted_common', xpReward: 4, goldReward: 3, spriteKey: 'ENEMY_CURSED_WISP',
  },
  bandit_raider: {
    id: 'bandit_raider', name: 'Bandit', role: 'melee',
    hp: 120, atk: 4, def: 2, spd: 1.0, critChance: 0.06, critMult: 1.5,
    skills: [{ id: 'dirty_strike', name: 'Schmutziger Streich', cooldown: 4, effectType: 'damage', power: 1.6, target: 'player' }],
    lootTableId: 'loot_forest_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_BANDIT_RAIDER',
  },

  // ── Cave Enemies ──
  cave_bat: {
    id: 'cave_bat', name: 'Höhlenfledermaus', role: 'ranged',
    hp: 66, atk: 4, def: 0, spd: 1.4, critChance: 0.15, critMult: 1.8,
    skills: [],
    lootTableId: 'loot_cave_common', xpReward: 3, goldReward: 3, spriteKey: 'ENEMY_CAVE_BAT',
  },
  cave_slime: {
    id: 'cave_slime', name: 'Höhlenschleim', role: 'melee',
    hp: 108, atk: 3, def: 4, spd: 0.5, critChance: 0.0, critMult: 1.0,
    skills: [{ id: 'acid', name: 'Säure', cooldown: 4, effectType: 'aoe', power: 1.0, target: 'all_players' }],
    lootTableId: 'loot_cave_common', xpReward: 5, goldReward: 3, spriteKey: 'ENEMY_CAVE_SLIME',
  },
  cave_goblin: {
    id: 'cave_goblin', name: 'Höhlengoblin', role: 'melee',
    hp: 84, atk: 5, def: 2, spd: 1.0, critChance: 0.1, critMult: 1.5,
    skills: [{ id: 'stab', name: 'Stich', cooldown: 3, effectType: 'damage', power: 1.4, target: 'player' }],
    lootTableId: 'loot_cave_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_CAVE_GOBLIN',
  },
  cave_spider_queen: {
    id: 'cave_spider_queen', name: 'Spinnenkönigin', role: 'support',
    hp: 102, atk: 4, def: 2, spd: 0.9, critChance: 0.1, critMult: 1.5,
    skills: [
      { id: 'poison_spit', name: 'Giftspeie', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' },
      { id: 'summon', name: 'Beschwörung', cooldown: 5, effectType: 'buff', power: 3, target: 'self' },
    ],
    lootTableId: 'loot_cave_rare', xpReward: 8, goldReward: 5, spriteKey: 'ENEMY_CAVE_SPIDER_QUEEN',
  },
  cave_golem_shard: {
    id: 'cave_golem_shard', name: 'Golemfragment', role: 'melee',
    hp: 114, atk: 5, def: 5, spd: 0.4, critChance: 0.0, critMult: 1.0,
    skills: [],
    lootTableId: 'loot_cave_common', xpReward: 7, goldReward: 4, spriteKey: 'ENEMY_CAVE_GOLEM_SHARD',
  },
  cave_troll: {
    id: 'cave_troll', name: 'Höhlentroll', role: 'melee',
    hp: 150, atk: 7, def: 4, spd: 0.6, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'smash', name: 'Zerschmettern', cooldown: 3, effectType: 'damage', power: 2.0, target: 'player' }],
    lootTableId: 'loot_cave_rare', xpReward: 12, goldReward: 6, spriteKey: 'ENEMY_CAVE_TROLL',
  },

  // Cave extras (from GDD 10.6)
  crystal_beetle: {
    id: 'crystal_beetle', name: 'Kristallkäfer', role: 'melee',
    hp: 90, atk: 5, def: 3, spd: 1.1, critChance: 0.08, critMult: 1.6,
    skills: [{ id: 'crystal_charge', name: 'Kristallstoß', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' }],
    lootTableId: 'loot_crystal_beetle', xpReward: 5, goldReward: 4, spriteKey: 'ENEMY_CRYSTAL_BEETLE',
  },
  deep_crawler: {
    id: 'deep_crawler', name: 'Tiefenkriecher', role: 'melee',
    hp: 120, atk: 5, def: 2, spd: 0.9, critChance: 0.06, critMult: 1.5,
    skills: [{ id: 'tunnel_ambush', name: 'Tunnelhinterhalt', cooldown: 4, effectType: 'damage', power: 1.7, target: 'player' }],
    lootTableId: 'loot_cave_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_DEEP_CRAWLER',
  },
  mine_specter: {
    id: 'mine_specter', name: 'Minengespenst', role: 'melee',
    hp: 78, atk: 8, def: 0, spd: 1.5, critChance: 0.14, critMult: 2.0,
    skills: [{ id: 'spectral_slash', name: 'Geisterschlag', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player' }],
    lootTableId: 'loot_cave_rare', xpReward: 7, goldReward: 5, spriteKey: 'ENEMY_MINE_SPECTER',
  },
  stalactite_bat: {
    id: 'stalactite_bat', name: 'Tropfsteinfledermaus', role: 'ranged',
    hp: 72, atk: 4, def: 0, spd: 1.6, critChance: 0.1, critMult: 1.5,
    skills: [{ id: 'dive_bomb', name: 'Sturzangriff', cooldown: 2, effectType: 'damage', power: 1.4, target: 'player' }],
    lootTableId: 'loot_cave_common', xpReward: 3, goldReward: 3, spriteKey: 'ENEMY_STALACTITE_BAT',
  },
  magma_slug: {
    id: 'magma_slug', name: 'Magmaschnecke', role: 'melee',
    hp: 156, atk: 4, def: 4, spd: 0.5, critChance: 0.03, critMult: 1.5,
    skills: [{ id: 'lava_spit', name: 'Lavaspeie', cooldown: 4, effectType: 'aoe', power: 0.9, target: 'all_players' }],
    lootTableId: 'loot_cave_rare', xpReward: 8, goldReward: 5, spriteKey: 'ENEMY_MAGMA_SLUG',
  },

  // ── Swamp Enemies ──
  bog_witch: {
    id: 'bog_witch', name: 'Moorhexe', role: 'support',
    hp: 96, atk: 3, def: 1, spd: 1.0, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'dark_mend', name: 'Dunkle Heilung', cooldown: 3, effectType: 'heal', power: 30, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_swamp_common', xpReward: 6, goldReward: 4, spriteKey: 'ENEMY_BOG_WITCH',
  },
  swamp_troll: {
    id: 'swamp_troll', name: 'Sumpftroll', role: 'melee',
    hp: 195, atk: 5, def: 4, spd: 0.55, critChance: 0.03, critMult: 1.5,
    skills: [{ id: 'club_slam', name: 'Keulenschlag', cooldown: 4, effectType: 'aoe', power: 1.1, target: 'all_players' }],
    lootTableId: 'loot_swamp_rare', xpReward: 14, goldReward: 6, spriteKey: 'ENEMY_SWAMP_TROLL',
  },
  leech_swarm: {
    id: 'leech_swarm', name: 'Blutegelschwarm', role: 'melee',
    hp: 90, atk: 6, def: 0, spd: 1.3, critChance: 0.08, critMult: 1.5,
    skills: [{ id: 'drain_bite', name: 'Saugbiss', cooldown: 2, effectType: 'damage', power: 1.3, target: 'player' }],
    lootTableId: 'loot_swamp_common', xpReward: 5, goldReward: 4, spriteKey: 'ENEMY_LEECH_SWARM',
  },
  mire_phantom: {
    id: 'mire_phantom', name: 'Sumpfphantom', role: 'melee',
    hp: 90, atk: 8, def: 0, spd: 1.4, critChance: 0.15, critMult: 2.0,
    skills: [{ id: 'phantom_strike', name: 'Phantomstreich', cooldown: 4, effectType: 'damage', power: 2.0, target: 'player' }],
    lootTableId: 'loot_swamp_rare', xpReward: 8, goldReward: 5, spriteKey: 'ENEMY_MIRE_PHANTOM',
  },
  toxic_toad: {
    id: 'toxic_toad', name: 'Giftkröte', role: 'ranged',
    hp: 108, atk: 3, def: 2, spd: 0.85, critChance: 0.04, critMult: 1.5,
    skills: [{ id: 'poison_spray', name: 'Giftsprüher', cooldown: 3, effectType: 'aoe', power: 0.7, target: 'all_players' }],
    lootTableId: 'loot_swamp_common', xpReward: 5, goldReward: 4, spriteKey: 'ENEMY_TOXIC_TOAD',
  },
  rot_walker: {
    id: 'rot_walker', name: 'Fäulniswandler', role: 'melee',
    hp: 138, atk: 5, def: 2, spd: 0.9, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'decay_smash', name: 'Verwesung', cooldown: 3, effectType: 'damage', power: 1.6, target: 'player' }],
    lootTableId: 'loot_swamp_common', xpReward: 7, goldReward: 5, spriteKey: 'ENEMY_ROT_WALKER',
  },

  // ── Ruins Enemies ──
  skeleton_warrior: {
    id: 'skeleton_warrior', name: 'Skelettkrieger', role: 'melee',
    hp: 120, atk: 5, def: 3, spd: 1.0, critChance: 0.06, critMult: 1.5,
    skills: [{ id: 'bone_slash', name: 'Knochenhieb', cooldown: 3, effectType: 'damage', power: 1.5, target: 'player' }],
    lootTableId: 'loot_ruins_common', xpReward: 7, goldReward: 5, spriteKey: 'ENEMY_SKELETON_WARRIOR',
  },
  ghost_mage: {
    id: 'ghost_mage', name: 'Geistermagier', role: 'ranged',
    hp: 96, atk: 6, def: 0, spd: 1.3, critChance: 0.1, critMult: 1.7,
    skills: [{ id: 'spirit_bolt', name: 'Geisterschuss', cooldown: 3, effectType: 'damage', power: 1.4, target: 'player' }],
    lootTableId: 'loot_ruins_common', xpReward: 6, goldReward: 5, spriteKey: 'ENEMY_GHOST_MAGE',
  },
  stone_guardian: {
    id: 'stone_guardian', name: 'Steinwächter', role: 'melee',
    hp: 180, atk: 4, def: 6, spd: 0.6, critChance: 0.02, critMult: 1.5,
    skills: [{ id: 'stone_slam', name: 'Steinschlag', cooldown: 4, effectType: 'aoe', power: 1.0, target: 'all_players' }],
    lootTableId: 'loot_ruins_rare', xpReward: 12, goldReward: 7, spriteKey: 'ENEMY_STONE_GUARDIAN',
  },
  bone_knight: {
    id: 'bone_knight', name: 'Knochenritter', role: 'melee',
    hp: 150, atk: 6, def: 4, spd: 0.9, critChance: 0.07, critMult: 1.6,
    skills: [{ id: 'cursed_charge', name: 'Verfluchter Ansturm', cooldown: 4, effectType: 'damage', power: 1.7, target: 'player' }],
    lootTableId: 'loot_ruins_rare', xpReward: 10, goldReward: 6, spriteKey: 'ENEMY_BONE_KNIGHT',
  },
  tomb_horror: {
    id: 'tomb_horror', name: 'Grabschrecke', role: 'melee',
    hp: 90, atk: 7, def: 0, spd: 1.5, critChance: 0.16, critMult: 2.0,
    skills: [{ id: 'death_lunge', name: 'Todesstoß', cooldown: 3, effectType: 'damage', power: 1.9, target: 'player' }],
    lootTableId: 'loot_ruins_common', xpReward: 6, goldReward: 5, spriteKey: 'ENEMY_TOMB_HORROR',
  },
  cursed_priest: {
    id: 'cursed_priest', name: 'Verwunschener Priester', role: 'support',
    hp: 96, atk: 2, def: 1, spd: 1.0, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'dark_prayer', name: 'Dunkles Gebet', cooldown: 3, effectType: 'heal', power: 27, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_ruins_common', xpReward: 6, goldReward: 5, spriteKey: 'ENEMY_CURSED_PRIEST',
  },

  // ── Volcano Enemies ──
  lava_elemental: {
    id: 'lava_elemental', name: 'Lavaelementar', role: 'melee',
    hp: 165, atk: 5, def: 3, spd: 0.7, critChance: 0.04, critMult: 1.5,
    skills: [{ id: 'magma_wave', name: 'Magmawelle', cooldown: 4, effectType: 'aoe', power: 1.0, target: 'all_players' }],
    lootTableId: 'loot_volcano_common', xpReward: 10, goldReward: 6, spriteKey: 'ENEMY_LAVA_ELEMENTAL',
  },
  fire_bat: {
    id: 'fire_bat', name: 'Feuerfledermaus', role: 'ranged',
    hp: 96, atk: 5, def: 0, spd: 1.5, critChance: 0.1, critMult: 1.6,
    skills: [{ id: 'flame_dive', name: 'Flammensturz', cooldown: 2, effectType: 'damage', power: 1.4, target: 'player' }],
    lootTableId: 'loot_volcano_common', xpReward: 5, goldReward: 5, spriteKey: 'ENEMY_FIRE_BAT',
  },
  ash_golem: {
    id: 'ash_golem', name: 'Aschegollem', role: 'melee',
    hp: 204, atk: 4, def: 5, spd: 0.5, critChance: 0.02, critMult: 1.5,
    skills: [{ id: 'ash_slam', name: 'Ascheschlag', cooldown: 4, effectType: 'aoe', power: 1.1, target: 'all_players' }],
    lootTableId: 'loot_volcano_rare', xpReward: 14, goldReward: 7, spriteKey: 'ENEMY_ASH_GOLEM',
  },
  flame_spirit: {
    id: 'flame_spirit', name: 'Flammengeist', role: 'melee',
    hp: 102, atk: 8, def: 0, spd: 1.3, critChance: 0.14, critMult: 2.0,
    skills: [{ id: 'fire_burst', name: 'Flammenausbruch', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player' }],
    lootTableId: 'loot_volcano_rare', xpReward: 9, goldReward: 7, spriteKey: 'ENEMY_FLAME_SPIRIT',
  },
  obsidian_crab: {
    id: 'obsidian_crab', name: 'Obsidiankrabbe', role: 'melee',
    hp: 138, atk: 5, def: 4, spd: 0.85, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'shell_crush', name: 'Panzerbrecher', cooldown: 3, effectType: 'damage', power: 1.6, target: 'player' }],
    lootTableId: 'loot_volcano_common', xpReward: 8, goldReward: 6, spriteKey: 'ENEMY_OBSIDIAN_CRAB',
  },
  magma_broodling: {
    id: 'magma_broodling', name: 'Magmabrüter', role: 'support',
    hp: 108, atk: 3, def: 2, spd: 1.0, critChance: 0.05, critMult: 1.5,
    skills: [{ id: 'flame_aura', name: 'Flammenaura', cooldown: 3, effectType: 'buff', power: 2, target: 'ally_lowest_hp' }],
    lootTableId: 'loot_volcano_common', xpReward: 6, goldReward: 6, spriteKey: 'ENEMY_MAGMA_BROODLING',
  },

  // ── Bosses ──
  boss_elder_treant: {
    id: 'boss_elder_treant', name: 'Uralter Treant', role: 'boss',
    hp: 360, atk: 6, def: 5, spd: 0.7, critChance: 0.08, critMult: 2.0,
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
    hp: 390, atk: 7, def: 7, spd: 0.5, critChance: 0.06, critMult: 2.0,
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
    hp: 300, atk: 8, def: 3, spd: 1.1, critChance: 0.15, critMult: 2.0,
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
    hp: 435, atk: 6, def: 3, spd: 0.8, critChance: 0.1, critMult: 1.8,
    isBoss: true,
    enrage: { afterRound: 8, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'triple_bite', name: 'Dreifachbiss', cooldown: 2, effectType: 'aoe', power: 1.0, target: 'all_players' },
      { id: 'regenerate', name: 'Regeneration', cooldown: 4, effectType: 'heal', power: 36, target: 'self' },
    ],
    lootTableId: 'loot_boss_hydra', xpReward: 80, goldReward: 40, spriteKey: 'BOSS_SWAMP_HYDRA',
  },
  boss_spider_queen: {
    id: 'boss_spider_queen', name: 'Spinnenkönigin', role: 'boss',
    hp: 330, atk: 5, def: 3, spd: 1.0, critChance: 0.1, critMult: 1.8,
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
    hp: 420, atk: 9, def: 6, spd: 0.85, critChance: 0.1, critMult: 2.0,
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
    hp: 315, atk: 6, def: 2, spd: 1.2, critChance: 0.12, critMult: 2.0,
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
    hp: 570, atk: 8, def: 4, spd: 0.7, critChance: 0.08, critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 10, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'inferno_breath', name: 'Infernoodem', cooldown: 2, effectType: 'aoe', power: 1.2, target: 'all_players' },
      { id: 'molten_armor', name: 'Magmapanzer', cooldown: 5, effectType: 'buff', power: 4, target: 'self' },
    ],
    lootTableId: 'loot_boss_wyrm', xpReward: 120, goldReward: 50, spriteKey: 'BOSS_MAGMA_WYRM',
  },

  // ── Ocean Enemies ──
  deep_sea_angler: {
    id: 'deep_sea_angler',
    name: 'Tiefseeangler',
    role: 'melee',
    hp: 72,
    atk: 7,
    def: 3,
    spd: 0.95,
    critChance: 0.1,
    critMult: 1.5,
    skills: [
      { id: 'biolicht', name: 'Biolicht-Köder', cooldown: 3, effectType: 'buff', power: 3, target: 'self', description: 'Erhöht eigene DEF um 3 für 2 Runden' },
      { id: 'reisszaehne', name: 'Reißzähne', cooldown: 2, effectType: 'damage', power: 1.8, target: 'player', description: '1.8× Schaden auf 1 Ziel' },
    ],
    lootTableId: 'loot_ocean_common',
    xpReward: 10,
    goldReward: 6,
    spriteKey: 'ENEMY_DEEP_SEA_ANGLER',
  },
  jellyfish_swarm: {
    id: 'jellyfish_swarm',
    name: 'Quallenschwarm',
    role: 'ranged',
    hp: 48,
    atk: 5,
    def: 1,
    spd: 1.1,
    critChance: 0.08,
    critMult: 1.4,
    skills: [
      { id: 'stromtentakel', name: 'Stromtentakel', cooldown: 2, effectType: 'aoe', power: 0.7, target: 'all_players', description: '0.7× Schaden auf alle Helden' },
      { id: 'luftsauger', name: 'Luftsauger', cooldown: 3, effectType: 'drain_air', power: 0, target: 'all_players', description: 'Entzieht 10 Luft dem Luftschild' },
    ],
    lootTableId: 'loot_ocean_common',
    xpReward: 8,
    goldReward: 4,
    spriteKey: 'ENEMY_JELLYFISH_SWARM',
  },
  sea_serpent: {
    id: 'sea_serpent',
    name: 'Meeresschlange',
    role: 'melee',
    hp: 95,
    atk: 9,
    def: 4,
    spd: 1.05,
    critChance: 0.12,
    critMult: 1.6,
    skills: [
      { id: 'peitschenstoss', name: 'Peitschenstoß', cooldown: 2, effectType: 'aoe', power: 0.9, target: 'all_players', description: '0.9× Schaden auf alle Helden' },
      { id: 'riesenschlund', name: 'Riesenschlund', cooldown: 4, effectType: 'damage', power: 2.2, target: 'player', description: '2.2× Schaden auf 1 Ziel' },
    ],
    lootTableId: 'loot_ocean_common',
    xpReward: 12,
    goldReward: 7,
    spriteKey: 'ENEMY_SEA_SERPENT',
  },
  drowned_knight: {
    id: 'drowned_knight',
    name: 'Ertrunkener Ritter',
    role: 'melee',
    hp: 110,
    atk: 8,
    def: 6,
    spd: 0.8,
    critChance: 0.08,
    critMult: 1.5,
    skills: [
      { id: 'rostiger_hieb', name: 'Rostiger Hieb', cooldown: 2, effectType: 'damage', power: 1.6, target: 'player', description: '1.6× Schaden auf 1 Ziel' },
      { id: 'flutfluch', name: 'Flutfluch', cooldown: 4, effectType: 'aoe', power: 0.6, target: 'all_players', description: '0.6× Schaden auf alle Helden' },
    ],
    lootTableId: 'loot_ocean_common',
    xpReward: 14,
    goldReward: 8,
    spriteKey: 'ENEMY_DROWNED_KNIGHT',
  },
  pressure_crab: {
    id: 'pressure_crab',
    name: 'Druckkrabbe',
    role: 'melee',
    hp: 85,
    atk: 6,
    def: 7,
    spd: 0.7,
    critChance: 0.06,
    critMult: 1.5,
    skills: [
      { id: 'scherenschlag', name: 'Scherenschlag', cooldown: 2, effectType: 'damage', power: 1.5, target: 'player', description: '1.5× Schaden auf 1 Ziel' },
      { id: 'blasenstoss', name: 'Blasenstoß', cooldown: 3, effectType: 'drain_air', power: 0, target: 'all_players', description: 'Entzieht 8 Luft dem Luftschild' },
    ],
    lootTableId: 'loot_ocean_common',
    xpReward: 11,
    goldReward: 6,
    spriteKey: 'ENEMY_PRESSURE_CRAB',
  },
  boss_leviathan: {
    id: 'boss_leviathan',
    name: 'Der Leviathan',
    role: 'boss',
    hp: 540,
    atk: 13,
    def: 8,
    spd: 0.9,
    critChance: 0.1,
    critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 7, atkMult: 1.6, spdMult: 1.2 },
    skills: [
      { id: 'tiefenstrahl', name: 'Tiefenstrahl', cooldown: 2, effectType: 'aoe', power: 1.3, target: 'all_players', description: '1.3× Schaden auf alle Helden' },
      { id: 'druckwelle', name: 'Druckwelle', cooldown: 3, effectType: 'aoe', power: 0.9, target: 'all_players', drainAirAmount: 18, description: '0.9× Schaden auf alle + 18 Luft entzogen' },
      { id: 'verschlingen', name: 'Verschlingen', cooldown: 5, effectType: 'damage', power: 2.8, target: 'player', description: '2.8× Schaden auf den Helden mit wenigstem HP' },
    ],
    lootTableId: 'loot_boss_leviathan',
    xpReward: 90,
    goldReward: 45,
    spriteKey: 'BOSS_LEVIATHAN',
  },

  // ── Siege Enemies ──
  wall_archer: {
    id: 'wall_archer', name: 'Mauerschütze', role: 'ranged',
    hp: 55, atk: 16, def: 5, spd: 1.1, critChance: 0.12, critMult: 1.8,
    prefersWarMachineTarget: true,
    skills: [
      { id: 'aimed_shot', name: 'Gezielter Schuss', cooldown: 3, effectType: 'damage', power: 1.8, target: 'player', description: '1.8× Schaden auf Kriegsmaschine oder Held' },
    ],
    lootTableId: 'loot_siege_common', xpReward: 10, goldReward: 7, spriteKey: 'ENEMY_WALL_ARCHER',
  },
  wall_guard: {
    id: 'wall_guard', name: 'Torwächter', role: 'melee',
    hp: 100, atk: 13, def: 22, spd: 0.7, critChance: 0.05, critMult: 1.5,
    skills: [
      { id: 'shield_wall', name: 'Schildwall', cooldown: 4, effectType: 'buff', power: 5, target: 'self', description: 'DEF +5 für 3 Runden' },
    ],
    lootTableId: 'loot_siege_common', xpReward: 12, goldReward: 8, spriteKey: 'ENEMY_WALL_GUARD',
  },
  siege_crossbowman: {
    id: 'siege_crossbowman', name: 'Armbrustschütze', role: 'ranged',
    hp: 70, atk: 20, def: 8, spd: 1.0, critChance: 0.15, critMult: 2.0,
    prefersWarMachineTarget: true,
    skills: [
      { id: 'rapid_fire', name: 'Schnellfeuer', cooldown: 2, effectType: 'aoe', power: 0.7, target: 'all_players', description: '0.7× Schaden auf alle (inkl. Kriegsmaschine)' },
    ],
    lootTableId: 'loot_siege_common', xpReward: 14, goldReward: 9, spriteKey: 'ENEMY_SIEGE_CROSSBOWMAN',
  },
  siege_defender: {
    id: 'siege_defender', name: 'Burgverteidiger', role: 'melee',
    hp: 130, atk: 17, def: 26, spd: 0.75, critChance: 0.06, critMult: 1.5,
    skills: [
      { id: 'fortress_strike', name: 'Festungsschlag', cooldown: 3, effectType: 'damage', power: 1.9, target: 'player', description: '1.9× Schaden auf 1 Ziel' },
      { id: 'rally', name: 'Sammeln', cooldown: 5, effectType: 'buff', power: 4, target: 'ally_lowest_hp', description: '+4 ATK für 3 Runden auf schwächsten Verbündeten' },
    ],
    lootTableId: 'loot_siege_rare', xpReward: 16, goldReward: 10, spriteKey: 'ENEMY_SIEGE_DEFENDER',
  },
  siege_mage: {
    id: 'siege_mage', name: 'Kampfmagier', role: 'support',
    hp: 65, atk: 22, def: 6, spd: 1.05, critChance: 0.1, critMult: 1.7,
    prefersWarMachineTarget: true,
    skills: [
      { id: 'arcane_bolt', name: 'Arkaner Blitz', cooldown: 2, effectType: 'damage', power: 1.6, target: 'player', description: '1.6× Arkaner Schaden auf Kriegsmaschine/Held' },
      { id: 'barrier', name: 'Schutzbarriere', cooldown: 4, effectType: 'heal', power: 35, target: 'ally_lowest_hp', description: 'Heilt schwächsten Verbündeten um 35' },
    ],
    lootTableId: 'loot_siege_rare', xpReward: 15, goldReward: 9, spriteKey: 'ENEMY_SIEGE_MAGE',
  },
  boss_iron_commander: {
    id: 'boss_iron_commander', name: 'Eiserner Kommandant', role: 'boss',
    hp: 380, atk: 28, def: 18, spd: 0.9, critChance: 0.12, critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 7, atkMult: 1.6, spdMult: 1.2 },
    skills: [
      { id: 'war_horn', name: 'Kriegshorn', cooldown: 3, effectType: 'buff', power: 4, target: 'ally_lowest_hp', description: 'Ruft Verstärkung (+4 ATK für 3 Runden)' },
      { id: 'siege_strike', name: 'Belagerungsschlag', cooldown: 2, effectType: 'damage', power: 2.2, target: 'player', description: '2.2× Vernichtender Schlag' },
      { id: 'volley', name: 'Salve', cooldown: 4, effectType: 'aoe', power: 1.0, target: 'all_players', description: '1.0× Schaden auf alle Einheiten' },
    ],
    lootTableId: 'loot_boss_iron_commander', xpReward: 100, goldReward: 50, spriteKey: 'BOSS_IRON_COMMANDER',
  },
  boss_fortress_warden: {
    id: 'boss_fortress_warden', name: 'Festungswächter', role: 'boss',
    hp: 480, atk: 34, def: 24, spd: 0.8, critChance: 0.1, critMult: 2.0,
    isBoss: true,
    enrage: { afterRound: 8, atkMult: 1.5, spdMult: 1.3 },
    skills: [
      { id: 'fortress_shields', name: 'Festungsschilde', cooldown: 3, effectType: 'buff', power: 8, target: 'self', description: '+8 DEF für 2 Runden — muss durchgebrochen werden' },
      { id: 'catapult_volley', name: 'Katapultsalve', cooldown: 3, effectType: 'aoe', power: 1.2, target: 'all_players', description: '1.2× Katapultschaden auf alle' },
      { id: 'crushing_blow', name: 'Zermalmender Schlag', cooldown: 4, effectType: 'damage', power: 2.6, target: 'player', description: '2.6× Vernichtender Einzeltreffer' },
    ],
    lootTableId: 'loot_boss_fortress_warden', xpReward: 130, goldReward: 65, spriteKey: 'BOSS_FORTRESS_WARDEN',
  },
};

// ── Enemy Lore & Skill Descriptions ──
// Stored separately to keep ENEMY_DEFS compact. Access via ENEMY_LORE[enemyId].
export const ENEMY_LORE: Record<string, { lore: string; route: string; skillDescriptions?: Record<string, string> }> = {
  // ── Forest ──
  forest_wolf: {
    route: 'forest',
    lore: 'Einst friedliche Tiere des Urwalds von Valdris, wurden die Waldwölfe durch die dunkle Arkan-Energie aus den Dungeons korrumpiert. Ihre Augen leuchten schwach rot – ein Zeichen, dass die alte Maschinen-Magie ihren Trieb überschrieben hat.',
    skillDescriptions: { bite: '1.5x Schaden auf 1 Ziel' },
  },
  forest_spider: {
    route: 'forest',
    lore: 'Diese Spinnen bauten ihre Netze ursprünglich in den Baumkronen, weitab von Mensch und Gefahr. Seit dem Dungeon-Ausbruch sind sie aggressiver geworden und jagen aktiv alles, was ihren Wald betritt.',
    skillDescriptions: { web: '0.5x Schaden auf alle' },
  },
  forest_bandit: {
    route: 'forest',
    lore: 'Überlebende des Kollapses, die sich nicht in die neue Stadt eingliederten. Unter einem selbsternannten Hauptmann leben sie als Räuber im Wald – weniger aus Boshaftigkeit als aus Überzeugung.',
    skillDescriptions: { slash: '1.3x Schaden auf 1 Ziel' },
  },
  forest_shaman: {
    route: 'forest',
    lore: 'Ein uralter Waldhüter, dessen Aufgabe einst war, die Balance zwischen Siedlung und Wildnis zu halten. Die Dungeon-Korruption hat ihn verdreht: Er heilt noch immer – aber nur noch feindliche Kreaturen.',
    skillDescriptions: { heal_ally: 'Heilt schwächsten Verbündeten um 8' },
  },
  forest_bear: {
    route: 'forest',
    lore: 'Waldbären von Valdris waren schon immer territorial und gefürchtet. Die Dungeon-Energie hat sie nicht verändert – sie schützen ihr Revier, wie sie es immer taten.',
    skillDescriptions: { maul: '2.0x Schaden auf 1 Ziel' },
  },
  forest_wisp: {
    route: 'forest',
    lore: 'Niemand weiß, was ein Waldgeist ursprünglich war. Vielleicht ein Tier, das starb und nicht weiterging. Er greift an, weil das der einzige Ausdruck ist, der ihm noch bleibt.',
  },
  thorn_sprite: {
    route: 'forest',
    lore: 'Ein Geist, der sich mit den Dornenranken des Waldes verwoben hat – unklar ob freiwillig. Er schießt Ranken als Projektile und zieht sich bei Schaden tiefer in das Dickicht zurück.',
    skillDescriptions: { thorn_volley: '1.3x Schaden auf 1 Ziel' },
  },
  fungal_creeper: {
    route: 'forest',
    lore: 'Bodenbewohner, langsam, unauffällig, gefährlich. Der Pilzkriecher verbreitet Sporenwolken, die Lungen und Augen reizen. Er selbst scheint keine Absicht zu haben – er kriecht einfach.',
    skillDescriptions: { spore_cloud: '0.8x Schaden auf alle' },
  },
  shadow_bat: {
    route: 'forest',
    lore: 'Eine natürliche Waldfledermaus, durch Dungeon-Energie um ein Vielfaches vergrößert und aggressiver. Ihr Schallschrei trifft alle Feinde gleichzeitig und stört die Orientierung.',
    skillDescriptions: { sonic_screech: '0.6x Schaden auf alle' },
  },
  moss_golem: {
    route: 'forest',
    lore: 'Zusammengesetzt aus dem lebenden Moos des Waldes, einer alten Schutzmagie und – so munkelt man – etwas, das tief im Boden pocht. Er ist langsam. Er ist sehr, sehr schwer zu töten.',
    skillDescriptions: { ground_pound: '1.0x Schaden auf alle' },
  },
  venomfang_spider: {
    route: 'forest',
    lore: 'Kleiner als die Waldspinne, aber giftiger. Ihr Biss setzt ein Kontaktgift frei, das langsam wirkt – was bedeutet, wer gebissen wird, merkt es zu spät.',
    skillDescriptions: { venom_bite: '1.5x Schaden auf 1 Ziel' },
  },
  goblin_scout: {
    route: 'forest',
    lore: 'Goblins gab es schon vor dem Kollaps. Sie lebten in den Wäldern, mieden Menschen, galten als harmlos. Seit dem Dungeon-Ausbruch wurden sie von etwas Größerem rekrutiert.',
    skillDescriptions: { quick_stab: '1.2x Schaden auf 1 Ziel' },
  },
  wild_boar: {
    route: 'forest',
    lore: 'Das Wildschwein von Valdris ist doppelt so groß wie ein normales und dreimal so stur. Es greift an, wenn es erschrickt. Es erschrickt bei fast allem.',
    skillDescriptions: { charge: '1.8x Schaden auf 1 Ziel' },
  },
  hollow_shade: {
    route: 'forest',
    lore: 'Ein Wesen ohne erkennbare Form – ein wanderndes Loch in der Luft, das Licht schluckt und Schaden austeilt. Woher es stammt, ist unbekannt.',
    skillDescriptions: { shadow_strike: '1.8x Schaden auf 1 Ziel' },
  },
  bramble_bear: {
    route: 'forest',
    lore: 'Wie ein normaler Waldbär, aber sein Fell ist mit harten Dornenranken durchgewachsen – eine Folge jahrelanger Dungeon-Exposition. Angriffe gegen ihn können den Angreifer verletzen.',
    skillDescriptions: { maul: '1.6x Schaden auf 1 Ziel' },
  },
  cursed_wisp: {
    route: 'forest',
    lore: 'Ein kleines, flackerndes Licht, das im Wald führt – wohin, ist nie gut. Das Irrlicht heilt andere Kreaturen durch eine unverstandene Übertragung von Lebensenergie.',
    skillDescriptions: { heal_ally: 'Heilt schwächsten Verbündeten um 8' },
  },
  bandit_raider: {
    route: 'forest',
    lore: 'Kein Späher, kein Hauptmann – einfacher Räuber. Er kämpft, weil er sonst nicht weiterkommt. Sein "schmutziger Streich" ist genau das: kein Ehrenkodex, kein Stil, nur das Ergebnis zählt.',
    skillDescriptions: { dirty_strike: '1.6x Schaden auf 1 Ziel' },
  },

  // ── Cave ──
  cave_bat: {
    route: 'cave',
    lore: 'Unter der Erde waren die Fledermäuse immer da. Die Dungeon-Energie hat sie größer und gereizter gemacht. Sie greifen aus Territorialgründen an, nicht aus Hunger.',
  },
  cave_slime: {
    route: 'cave',
    lore: 'Eine amorphe Kreatur, die im feuchten Dunkel der Höhlen lebt. Der Schleim löst Metall und organisches Material auf. Er hat keinen Verstand. Er hat keine Absicht.',
    skillDescriptions: { acid: '1.0x Schaden auf alle' },
  },
  cave_goblin: {
    route: 'cave',
    lore: 'Tiefer in den Höhlen als seine Waldbruder – und deshalb weiter von der Sonne entfernt, blasser, boshafter. Die Höhlengoblins arbeiten für etwas.',
    skillDescriptions: { stab: '1.4x Schaden auf 1 Ziel' },
  },
  cave_spider_queen: {
    route: 'cave',
    lore: 'Die Anführerin einer riesigen Kolonie. Sie ist größer, intelligenter und strategischer als ihre Brut. Sie spuckt Gift, beschwört Junge, und zieht sich zurück, wenn der Kampf schiefläuft.',
    skillDescriptions: { poison_spit: '1.5x Schaden', summon: 'Buff +3' },
  },
  cave_golem_shard: {
    route: 'cave',
    lore: 'Ein zerbrochener Wächter-Golem aus der alten Zivilisation, der noch funktioniert – zur Hälfte. Die zerbrochenen Teile bewegen sich unabhängig.',
  },
  cave_troll: {
    route: 'cave',
    lore: 'Riesig, langsam, brutal. Der Höhlentroll lebt seit Generationen in den Tiefen von Valdris. Die Dungeon-Energie hat ihn nicht verändert – er war schon immer so.',
    skillDescriptions: { smash: '2.0x Schaden auf 1 Ziel' },
  },
  crystal_beetle: {
    route: 'cave',
    lore: 'Ein Käfer mit Kristall-Exoskelett, entstanden durch jahrelange Exposition gegenüber den Kristallvorkommen in den Höhlen. Sein Stoß ist hart wie Stein.',
    skillDescriptions: { crystal_charge: '1.5x Schaden auf 1 Ziel' },
  },
  deep_crawler: {
    route: 'cave',
    lore: 'Halb unter dem Boden lebend, greift er aus dem Hinterhalt an. Sein Tunnel-Hinterhalt kann die ganze Party überraschen.',
    skillDescriptions: { tunnel_ambush: '1.7x Schaden auf 1 Ziel' },
  },
  mine_specter: {
    route: 'cave',
    lore: 'Der Geist eines Arbeiters, der in den alten Minen starb und nicht weiterging. Er ist wütend – nicht auf die Party, sondern auf alles.',
    skillDescriptions: { spectral_slash: '1.8x Schaden auf 1 Ziel' },
  },
  stalactite_bat: {
    route: 'cave',
    lore: 'Größer als die Höhlenfledermaus, nutzt die Stalaktiten als Sprungpunkte für Sturzangriffe. Schwer vorherzusagen, woher sie als nächstes kommt.',
    skillDescriptions: { dive_bomb: '1.4x Schaden auf 1 Ziel' },
  },
  magma_slug: {
    route: 'cave',
    lore: 'Lebt an den Übergängen zwischen Höhle und Vulkangebiet. Langsam – sehr langsam – aber die Lavaspeie trifft die ganze Party. Sie zieht sich nie zurück.',
    skillDescriptions: { lava_spit: '0.9x Schaden auf alle' },
  },

  // ── Swamp ──
  bog_witch: {
    route: 'swamp',
    lore: 'Eine Frau oder etwas, das einmal eine war. Im Sumpf lebt sie seit dem Kollaps, heilt ihre Gefährten mit dunkler, verrotteter Energie.',
    skillDescriptions: { dark_mend: 'Heilt schwächsten Verbündeten um 10' },
  },
  swamp_troll: {
    route: 'swamp',
    lore: 'Größer als der Höhlentroll, schwerer, nasser. Er schlägt mit einer Keule aus getrocknetem Sumpfholz, die halb zerfallen, aber trotzdem massiv ist.',
    skillDescriptions: { club_slam: '1.1x Schaden auf alle' },
  },
  leech_swarm: {
    route: 'swamp',
    lore: 'Kein einzelnes Wesen – ein Schwarm von Hunderten kleiner Blutegel, die gemeinsam agieren wie ein Organismus. Ihr Biss saugt schnell.',
    skillDescriptions: { drain_bite: '1.3x Schaden auf 1 Ziel' },
  },
  mire_phantom: {
    route: 'swamp',
    lore: 'Im Nebel des Sumpfes kaum zu sehen. Es schlägt zu, bevor man es registriert hat. Es hat keine Substanz – physische Treffer wirken abgeschwächt.',
    skillDescriptions: { phantom_strike: '2.0x Schaden auf 1 Ziel' },
  },
  toxic_toad: {
    route: 'swamp',
    lore: 'Eine übergroße Kröte, die Gift in einem breiten Fächer spuckt. Alle Ziele werden getroffen, aber der Schaden pro Ziel ist gering.',
    skillDescriptions: { poison_spray: '0.7x Schaden auf alle' },
  },
  rot_walker: {
    route: 'swamp',
    lore: 'Ein Tier, das vom Sumpf so weit transformiert wurde, dass man nicht mehr sagen kann, was es einmal war. Die Verwesung überträgt sich durch Treffer.',
    skillDescriptions: { decay_smash: '1.6x Schaden auf 1 Ziel' },
  },

  // ── Ruins ──
  skeleton_warrior: {
    route: 'ruins',
    lore: 'Ein Soldat der alten Zivilisation, der gestorben ist und durch Nekromantie oder uralte Maschinen-Magie wieder aufgestellt wurde. Die Ruinen sind sein Wachposten. Er hält ihn noch.',
    skillDescriptions: { bone_slash: '1.5x Schaden auf 1 Ziel' },
  },
  ghost_mage: {
    route: 'ruins',
    lore: 'Ein Arkan-Gelehrter, der den Kollaps nicht überlebte. Sein Geist ist an die Ruinen des alten Forschungslabors gebunden. Er kämpft instinktiv mit Magie.',
    skillDescriptions: { spirit_bolt: '1.4x Schaden auf 1 Ziel' },
  },
  stone_guardian: {
    route: 'ruins',
    lore: 'Ein Wächter-Golem, größer und stabiler als das Höhlenfragment. Er bewacht einen bestimmten Bereich der Ruinen mit einer Hartnäckigkeit, die jede Programmierung übersteigt.',
    skillDescriptions: { stone_slam: '1.0x Schaden auf alle' },
  },
  bone_knight: {
    route: 'ruins',
    lore: 'Ein reanimierter Ritter mit vollem Plattenrüstungsgerüst. Die Rüstung ist zerbissen und verbogen, aber zusammengehalten durch Nekromantie.',
    skillDescriptions: { cursed_charge: '1.7x Schaden auf 1 Ziel' },
  },
  tomb_horror: {
    route: 'ruins',
    lore: 'Eine natürliche Heuschreckenart der Ruinen, mutiert durch die Arkan-Strahlung der alten Labore. Ihr Todesstoß ist schneller als das Auge verfolgen kann.',
    skillDescriptions: { death_lunge: '1.9x Schaden auf 1 Ziel' },
  },
  cursed_priest: {
    route: 'ruins',
    lore: 'Ein Priester der alten Ordnung, korrumpiert und an die Ruinen gebunden. Er betet noch – aber an etwas Dunkles, das ihm antwortet.',
    skillDescriptions: { dark_prayer: 'Heilt schwächsten Verbündeten um 9' },
  },

  // ── Volcano ──
  lava_elemental: {
    route: 'volcano',
    lore: 'Aus dem Magma entstanden, nicht erschaffen. Die Hitze der Vulkan-Zone hat einen Elementar-Geist kondensiert – Form ohne Ursprung, Wille ohne Gedanke.',
    skillDescriptions: { magma_wave: '1.0x Schaden auf alle' },
  },
  fire_bat: {
    route: 'volcano',
    lore: 'Eine Fledermaus, die im Laufe der Generationen an die Vulkan-Hitze adaptierte. Ihr Körper speichert Magma-Energie, die sie als Flamme beim Sturzangriff freisetzt.',
    skillDescriptions: { flame_dive: '1.4x Schaden auf 1 Ziel' },
  },
  ash_golem: {
    route: 'volcano',
    lore: 'Aus verdichteter Asche und Lavafragmenten geformt, ist der Aschegolem träge aber massiv. Sein Ascheschlag verdunkelt das Sichtfeld der Party.',
    skillDescriptions: { ash_slam: '1.1x Schaden auf alle' },
  },
  flame_spirit: {
    route: 'volcano',
    lore: 'Schnell, heiß, impulsiv. Ein Geist, der mit Feuer denkt und Feuer spricht. Sein Flammenausbruch ist verheerend auf einem Einzelziel.',
    skillDescriptions: { fire_burst: '1.8x Schaden auf 1 Ziel' },
  },
  obsidian_crab: {
    route: 'volcano',
    lore: 'Eine Krabbe mit Obsidian-Panzerung, geformt durch jahrelangen Kontakt mit Lava. Ihr Panzerbrecher-Angriff kann DEF temporär reduzieren.',
    skillDescriptions: { shell_crush: '1.6x Schaden auf 1 Ziel' },
  },
  magma_broodling: {
    route: 'volcano',
    lore: 'Kein direkter Kämpfer – ein Unterstützer. Er taucht in die Lava ein und taucht wieder auf, um Verbündete mit Flammen-Aura zu buffern.',
    skillDescriptions: { flame_aura: 'Buff +2 auf Verbündeten' },
  },

  // ── Bosses ──
  boss_elder_treant: {
    route: 'forest',
    lore: 'Er ist so alt wie die Insel selbst. Einige sagen, er war das erste Lebewesen auf Valdris. Die Dungeon-Korruption hat ihn nicht gebogen – sie hat ihn wütend gemacht.',
    skillDescriptions: { root_slam: 'Massive Wurzeln peitschen durch das Schlachtfeld (1.2x AOE)', bark_shield: 'Härtet seine Rinde und erhöht seine Verteidigung (DEF +3)' },
  },
  boss_bandit_chief: {
    route: 'forest',
    lore: 'Er nannte sich einmal Anführer. Jetzt nennt er sich König des Waldes. Er hat genug Überlebende gesammelt, um eine Truppe zu führen.',
    skillDescriptions: { rally_cry: 'Treibt seine Verbündeten an (Buff +2)', backstab: 'Unfairer, gezielter Schlag (2.0x Schaden)' },
  },
  boss_crystal_golem: {
    route: 'cave',
    lore: 'Erbaut als Wächter der Kristallvorkommen durch die alte Zivilisation. Er hat seitdem nie aufgehört zu wachen. Kein Befehl, kein Abschalten.',
    skillDescriptions: { crystal_barrage: 'Scharfe Splitter explodieren (1.3x AOE)', diamond_shell: 'Verdichtet seinen Körper (DEF +5)' },
  },
  boss_spider_queen: {
    route: 'cave',
    lore: 'Die Anführerin einer riesigen Kolonie in den Tiefen. Sie ist größer, intelligenter und strategischer als normale Spinnen.',
    skillDescriptions: { spawn_brood: 'Ruft frische Brut (+3 Buff)', venom_burst: 'Giftiger Sprühstoß (0.9x AOE)' },
  },
  boss_swamp_hydra: {
    route: 'swamp',
    lore: 'Eine Kreatur, die tiefer im Sumpf lebt als alles andere. Sie regeneriert. Schnell. Wer gegen sie kämpft, muss das berücksichtigen.',
    skillDescriptions: { triple_bite: 'Mehrere Köpfe schlagen gleichzeitig zu (1.0x AOE)', regenerate: 'Schließt ihre Wunden (12 HP)' },
  },
  boss_fallen_knight: {
    route: 'ruins',
    lore: 'Ein Paladin der alten Ordnung – nicht korrumpiert, sondern gebrochen. Er starb in den Ruinen, wurde durch Nekromantie wieder aufgestellt.',
    skillDescriptions: { cursed_blade: 'Dunkler Schwerthieb (1.8x Schaden)', dark_rally: 'Stärkt verbündete Untote (Buff +3)' },
  },
  boss_shadow_lich: {
    route: 'ruins',
    lore: 'Ein Arkan-Gelehrter, der den Tod überwunden hat – nicht durch Macht, sondern durch Angst. Er ist nicht stark. Er ist klug.',
    skillDescriptions: { soul_drain: 'Entzieht einem Ziel Lebenskraft (1.5x Schaden)', raise_dead: 'Gefallene Diener erheben sich erneut (Summon)' },
  },
  boss_magma_wyrm: {
    route: 'volcano',
    lore: 'Er lebt im Kern des Vulkans. Vielleicht war er schon immer dort. Die Hitze, die er ausstrahlt, ist spürbar lange bevor man ihn sieht.',
    skillDescriptions: { inferno_breath: 'Brennender Atemkegel (1.2x AOE)', molten_armor: 'Flüssiges Gestein als Rüstung (DEF +4)' },
  },

  // ── Ocean ──
  deep_sea_angler: {
    route: 'ocean',
    lore: 'Aus den dunkelsten Tiefen, wo kein Sonnenlicht hinfällt — der Tiefseeangler lockt seine Opfer mit dem trügerischen Schimmer seiner Biolumineszenz. Wer dem Licht folgt, kehrt nicht zurück.',
    skillDescriptions: { biolicht: 'DEF +3 für 2 Runden', reisszaehne: '1.8× Schaden auf 1 Ziel' },
  },
  jellyfish_swarm: {
    route: 'ocean',
    lore: 'Tausende leuchtender Tentakel — schön aus der Ferne, tödlich in der Nähe. Der Schwarm zieht die letzte Atemluft aus jedem Luftschild wie Wasser durch Sand.',
    skillDescriptions: { stromtentakel: '0.7× Schaden auf alle', luftsauger: '10 Luft entzogen' },
  },
  sea_serpent: {
    route: 'ocean',
    lore: 'Uralt wie der Ozean selbst — die Meeresschlange hat Schiffe versenkt und Reiche verschluckt. Ihr Schlund ist tiefer als der Abgrund, ihre Geduld unendlich.',
    skillDescriptions: { peitschenstoss: '0.9× Schaden auf alle', riesenschlund: '2.2× Schaden auf 1 Ziel' },
  },
  drowned_knight: {
    route: 'ocean',
    lore: 'Er kennt seinen Namen nicht mehr. Er kennt sein Königreich nicht mehr. Nur das ewige Schwimmen, das ewige Suchen nach einem Ufer, das es nicht mehr gibt.',
    skillDescriptions: { rostiger_hieb: '1.6× Schaden auf 1 Ziel', flutfluch: '0.6× Schaden auf alle' },
  },
  pressure_crab: {
    route: 'ocean',
    lore: 'In den Abgründen herrscht ein Druck, der Knochen bricht. Die Druckkrabbe trägt ihn wie eine Rüstung — und gibt ihn weiter. Mit jedem Atemzug wird es schwerer.',
    skillDescriptions: { scherenschlag: '1.5× Schaden auf 1 Ziel', blasenstoss: '8 Luft entzogen' },
  },
  boss_leviathan: {
    route: 'ocean',
    lore: 'Aus der dunkelsten Stelle des Ozeans — kein Licht, kein Ton, nur der Leviathan. Er schläft nicht. Er wartet. Seit Jahrtausenden wartet er darauf, dass etwas Dummes genug ist, seine Ruhe zu stören.',
    skillDescriptions: { tiefenstrahl: '1.3× Schaden auf alle', druckwelle: '0.9× Schaden + 18 Luft entzogen', verschlingen: '2.8× Schaden auf schwächsten Helden' },
  },

  // ── Siege ──
  wall_archer: {
    route: 'siege',
    lore: 'Auf den Zinnen der alten Festungsmauern postiert, verschießt der Mauerschütze Pfeil um Pfeil auf alles, was sich der Mauer nähert — besonders Kriegsmaschinen gelten als bevorzugtes Ziel.',
    skillDescriptions: { aimed_shot: '1.8× Schaden auf Kriegsmaschine oder Held' },
  },
  wall_guard: {
    route: 'siege',
    lore: 'Breit wie ein Ochse und genauso stur hält der Torwächter seine Position. Sein Schildwall hat schon mancher Belagerung standgehalten.',
    skillDescriptions: { shield_wall: '+5 DEF für 3 Runden' },
  },
  siege_crossbowman: {
    route: 'siege',
    lore: 'Mit einer schweren Armbrust ausgerüstet, feuert der Armbrustschütze in schneller Folge. Sein Schnellfeuer trifft die gesamte Gruppe — und zielt besonders auf Kriegsmaschinen.',
    skillDescriptions: { rapid_fire: '0.7× Schaden auf alle (Schnellfeuer)' },
  },
  siege_defender: {
    route: 'siege',
    lore: 'Der Burgverteidiger hat sein Leben dem Schutz dieser Festung geweiht. Massiv gepanzert und mit kampferprobter Erfahrung — sein Festungsschlag lässt selbst Stahlrüstungen erzittern.',
    skillDescriptions: { fortress_strike: '1.9× Schaden auf 1 Ziel', rally: '+4 ATK Verbündeter' },
  },
  siege_mage: {
    route: 'siege',
    lore: 'Die Kampfmagier der Festung sind eine besondere Gilde: Sie schützen die Mauern mit arkanem Feuer und heilen die Verwundeten. Besonders gefährlich sind sie für Kriegsmaschinen.',
    skillDescriptions: { arcane_bolt: '1.6× Arkaner Schaden', barrier: 'Heilt Verbündeten um 35' },
  },
  boss_iron_commander: {
    route: 'siege',
    lore: 'Er hat diese Mauern erbaut. Er hat sie gegen zwölf Belagerungen verteidigt. Und er wird sie gegen dreizehn verteidigen — koste es, was es wolle. Sein Kriegshorn treibt die Verteidiger zu übermenschlicher Leistung an.',
    skillDescriptions: { war_horn: 'Kampfschrei (+4 ATK)', siege_strike: '2.2× Vernichtender Schlag', volley: '1.0× Schaden auf alle' },
  },
  boss_fortress_warden: {
    route: 'siege',
    lore: 'Der Festungswächter ist keine Person — er ist eine Institution. Jahrhunderte alt, erschaffen aus Stein und Magie, um die innerste Festung zu beschützen. Seine Katapultsalven können ganze Regimenter auslöschen.',
    skillDescriptions: { fortress_shields: '+8 DEF für 2 Runden', catapult_volley: '1.2× AOE Schaden', crushing_blow: '2.6× Einzelschaden' },
  },
};
