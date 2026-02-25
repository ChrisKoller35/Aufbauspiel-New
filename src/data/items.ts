export type ItemType = 'resource' | 'consumable' | 'gear' | 'material' | 'special';
export type GearSlot = 'weapon' | 'armor' | 'trinket';

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  stackSize: number;
  baseValue: number;
  gearSlot?: GearSlot;
  statBonuses?: {
    atk?: number;
    def?: number;
    hp?: number;
    spd?: number;
    critChance?: number;
  };
  healAmount?: number;
  buffEffect?: { stat: string; value: number; durationRooms: number };
  tags: string[];
  productionSource?: 'expedition_only';
}

export const ITEM_DEFS: Record<string, ItemDef> = {
  // --- Resources ---
  wood: {
    id: 'wood', name: 'Holz', type: 'resource',
    stackSize: 100, baseValue: 1, tags: ['resource'],
  },
  stone: {
    id: 'stone', name: 'Stein', type: 'resource',
    stackSize: 100, baseValue: 2, tags: ['resource'],
  },
  grain: {
    id: 'grain', name: 'Getreide', type: 'resource',
    stackSize: 100, baseValue: 1, tags: ['resource', 'food'],
  },
  flour: {
    id: 'flour', name: 'Mehl', type: 'resource',
    stackSize: 100, baseValue: 2, tags: ['resource', 'food'],
  },
  iron_scrap: {
    id: 'iron_scrap', name: 'Eisenschrott', type: 'resource',
    stackSize: 100, baseValue: 4, tags: ['resource', 'material'],
  },
  herb_green: {
    id: 'herb_green', name: 'Grüne Kräuter', type: 'resource',
    stackSize: 100, baseValue: 2, tags: ['resource', 'herb', 'provision'],
  },

  // --- Consumables / Provisions ---
  bread: {
    id: 'bread', name: 'Brot', type: 'consumable',
    stackSize: 100, baseValue: 3, healAmount: 8,
    tags: ['consumable', 'food', 'provision'],
  },
  healing_potion: {
    id: 'healing_potion', name: 'Heiltrank', type: 'consumable',
    stackSize: 100, baseValue: 8, healAmount: 15,
    tags: ['consumable', 'provision'],
  },
  power_bread: {
    id: 'power_bread', name: 'Kraft-Brot', type: 'consumable',
    stackSize: 100, baseValue: 6,
    buffEffect: { stat: 'atk', value: 2, durationRooms: 3 },
    tags: ['consumable', 'food', 'provision', 'buff'],
  },

  // --- Gear: Weapons ---
  iron_sword: {
    id: 'iron_sword', name: 'Eisenschwert', type: 'gear',
    stackSize: 1, baseValue: 12, gearSlot: 'weapon',
    statBonuses: { atk: 3 },
    tags: ['gear', 'weapon'],
  },
  hunter_bow: {
    id: 'hunter_bow', name: 'Jägerbogen', type: 'gear',
    stackSize: 1, baseValue: 14, gearSlot: 'weapon',
    statBonuses: { atk: 2, spd: 0.1, critChance: 0.05 },
    tags: ['gear', 'weapon'],
  },
  oak_staff: {
    id: 'oak_staff', name: 'Eichenstab', type: 'gear',
    stackSize: 1, baseValue: 10, gearSlot: 'weapon',
    statBonuses: { atk: 1, hp: 5 },
    tags: ['gear', 'weapon'],
  },

  // --- Gear: Armor ---
  iron_shield: {
    id: 'iron_shield', name: 'Eisenschild', type: 'gear',
    stackSize: 1, baseValue: 15, gearSlot: 'armor',
    statBonuses: { def: 4, spd: -0.05 },
    tags: ['gear', 'armor'],
  },
  leather_armor: {
    id: 'leather_armor', name: 'Lederrüstung', type: 'gear',
    stackSize: 1, baseValue: 10, gearSlot: 'armor',
    statBonuses: { def: 2, hp: 5 },
    tags: ['gear', 'armor'],
  },

  // --- Gear: Trinkets ---
  wolf_fang_necklace: {
    id: 'wolf_fang_necklace', name: 'Wolfszahn-Kette', type: 'gear',
    stackSize: 1, baseValue: 18, gearSlot: 'trinket',
    statBonuses: { atk: 1, spd: 0.05, critChance: 0.05 },
    tags: ['gear', 'trinket'],
  },

  // --- T2 Gear: Weapons ---
  steel_sword: {
    id: 'steel_sword', name: 'Stahlschwert', type: 'gear',
    stackSize: 1, baseValue: 28, gearSlot: 'weapon',
    statBonuses: { atk: 5 },
    tags: ['gear', 'weapon', 'tier2'],
  },
  longbow: {
    id: 'longbow', name: 'Langbogen', type: 'gear',
    stackSize: 1, baseValue: 30, gearSlot: 'weapon',
    statBonuses: { atk: 3, spd: 0.15, critChance: 0.10 },
    tags: ['gear', 'weapon', 'tier2'],
  },
  crystal_staff: {
    id: 'crystal_staff', name: 'Kristallstab', type: 'gear',
    stackSize: 1, baseValue: 26, gearSlot: 'weapon',
    statBonuses: { atk: 2, hp: 8 },
    tags: ['gear', 'weapon', 'tier2'],
  },

  // --- T2 Gear: Armor ---
  steel_armor: {
    id: 'steel_armor', name: 'Stahlrüstung', type: 'gear',
    stackSize: 1, baseValue: 32, gearSlot: 'armor',
    statBonuses: { def: 5, hp: 8 },
    tags: ['gear', 'armor', 'tier2'],
  },
  ranger_cloak: {
    id: 'ranger_cloak', name: 'Waldläufermantel', type: 'gear',
    stackSize: 1, baseValue: 24, gearSlot: 'armor',
    statBonuses: { atk: 1, def: 2, hp: 3, spd: 0.10 },
    tags: ['gear', 'armor', 'tier2'],
  },

  // --- T2 Gear: Trinkets ---
  crystal_pendant: {
    id: 'crystal_pendant', name: 'Kristallamulett', type: 'gear',
    stackSize: 1, baseValue: 34, gearSlot: 'trinket',
    statBonuses: { atk: 2, def: 1, hp: 3, critChance: 0.08 },
    tags: ['gear', 'trinket', 'tier2'],
  },

  // --- T3 Gear: Boss-Drops (nicht craftbar) ---
  treant_heartwood_shield: {
    id: 'treant_heartwood_shield', name: 'Treant-Herzholz-Schild', type: 'gear',
    stackSize: 1, baseValue: 40, gearSlot: 'armor',
    statBonuses: { def: 3, hp: 12 },
    tags: ['gear', 'armor', 'tier3', 'boss_drop', 'special:regen'],
  },
  crystal_golem_core: {
    id: 'crystal_golem_core', name: 'Kristallgolem-Kern', type: 'gear',
    stackSize: 1, baseValue: 45, gearSlot: 'trinket',
    statBonuses: { atk: 2, def: 3, hp: 5 },
    tags: ['gear', 'trinket', 'tier3', 'boss_drop', 'special:aoe_resist'],
  },
  hydra_venomfang: {
    id: 'hydra_venomfang', name: 'Hydra-Giftzahn', type: 'gear',
    stackSize: 1, baseValue: 50, gearSlot: 'weapon',
    statBonuses: { atk: 7, critChance: 0.05 },
    tags: ['gear', 'weapon', 'tier3', 'boss_drop', 'special:lifesteal'],
  },
  bandit_kings_cloak: {
    id: 'bandit_kings_cloak', name: 'Banditenkoenigsumhang', type: 'gear',
    stackSize: 1, baseValue: 42, gearSlot: 'armor',
    statBonuses: { def: 1, spd: 0.15, critChance: 0.15 },
    tags: ['gear', 'armor', 'tier3', 'boss_drop'],
  },
  spider_silk_vest: {
    id: 'spider_silk_vest', name: 'Spinnenseiden-Weste', type: 'gear',
    stackSize: 1, baseValue: 44, gearSlot: 'armor',
    statBonuses: { def: 3, hp: 5, spd: 0.10 },
    tags: ['gear', 'armor', 'tier3', 'boss_drop', 'special:dodge'],
  },
  fallen_knights_blade: {
    id: 'fallen_knights_blade', name: 'Klinge des Gefallenen', type: 'gear',
    stackSize: 1, baseValue: 48, gearSlot: 'weapon',
    statBonuses: { atk: 6, def: 2 },
    tags: ['gear', 'weapon', 'tier3', 'boss_drop', 'special:anti_heal'],
  },
  lich_phylactery: {
    id: 'lich_phylactery', name: 'Phylakterium des Lichs', type: 'gear',
    stackSize: 1, baseValue: 55, gearSlot: 'trinket',
    statBonuses: { atk: 4, spd: 0.10, critChance: 0.10 },
    tags: ['gear', 'trinket', 'tier3', 'boss_drop', 'special:spell_power'],
  },
  wyrm_scale_shield: {
    id: 'wyrm_scale_shield', name: 'Wyrmschuppen-Schild', type: 'gear',
    stackSize: 1, baseValue: 55, gearSlot: 'armor',
    statBonuses: { def: 7, hp: 10, spd: -0.10 },
    tags: ['gear', 'armor', 'tier3', 'boss_drop', 'special:fire_resist'],
  },

  // --- T4 Legendary Gear (Nemesis-Runs) ---
  blade_of_thousand_shadows: {
    id: 'blade_of_thousand_shadows', name: 'Klinge der tausend Schatten', type: 'gear',
    stackSize: 1, baseValue: 80, gearSlot: 'weapon',
    statBonuses: { atk: 9, def: -2, spd: 0.10, critChance: 0.10 },
    tags: ['gear', 'weapon', 'tier4', 'legendary', 'special:double_strike'],
  },
  shield_of_the_ancient: {
    id: 'shield_of_the_ancient', name: 'Schild des Uralten', type: 'gear',
    stackSize: 1, baseValue: 85, gearSlot: 'armor',
    statBonuses: { def: 8, hp: 15, spd: -0.10 },
    tags: ['gear', 'armor', 'tier4', 'legendary', 'special:reflect'],
  },
  amulet_of_rebirth: {
    id: 'amulet_of_rebirth', name: 'Amulett der Wiedergeburt', type: 'gear',
    stackSize: 1, baseValue: 90, gearSlot: 'trinket',
    statBonuses: { atk: 2, def: 2, hp: 10, spd: 0.05, critChance: 0.05 },
    tags: ['gear', 'trinket', 'tier4', 'legendary', 'special:revive'],
  },

  // --- Special (expedition-only) ---
  crystal_shard: {
    id: 'crystal_shard', name: 'Kristallsplitter', type: 'special',
    stackSize: 100, baseValue: 20, productionSource: 'expedition_only',
    tags: ['special', 'rare'],
  },
  talisman_fragment: {
    id: 'talisman_fragment', name: 'Talisman-Fragment', type: 'special',
    stackSize: 100, baseValue: 15, productionSource: 'expedition_only',
    tags: ['special', 'rare'],
  },

  // --- Expedition Finds ---
  old_coin: {
    id: 'old_coin', name: 'Alte Münze', type: 'special',
    stackSize: 100, baseValue: 5, productionSource: 'expedition_only',
    tags: ['special', 'treasure'],
  },

  // --- Gold (tracked separately in globalStock but defined here for completeness) ---
  gold: {
    id: 'gold', name: 'Gold', type: 'resource',
    stackSize: 9999, baseValue: 1, tags: ['currency'],
  },
};

export const PROVISION_ITEMS = ['bread', 'healing_potion', 'power_bread', 'herb_green'];
