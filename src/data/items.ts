import { setItemDefs } from './dungeonSets';
import { materialItemDefs } from './schmiede';

export type ItemType = 'resource' | 'consumable' | 'gear' | 'material' | 'special';
export type GearSlot = 'mainHand' | 'offHand' | 'armor' | 'trinket';
export type WeaponSlotType = '1h' | '2h' | 'shield';

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  stackSize: number;
  baseValue: number;
  /** Explicit sprite key override. If omitted, derived as ITEM_${id.toUpperCase()} */
  spriteKey?: string;
  gearSlot?: GearSlot;
  weaponSlotType?: WeaponSlotType;
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
  tier?: number;
  flavorText?: string;
  herbSource?: string;          // route where this herb drops
  combatAbility?: {             // war machines: one-time combat ability
    name: string;
    damage: number;
    target: 'all_enemies' | 'single';
    cooldown: number;
  };
  airBonus?: number;
  /** Nur Baupläne (Tag 'bauplan'): Building-ID, die dieser Bauplan freischaltet */
  bauplanFuer?: string;
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
    stackSize: 1, baseValue: 12, gearSlot: 'mainHand', weaponSlotType: '1h', tier: 1,
    statBonuses: { atk: 3 },
    tags: ['gear', 'weapon', 'tier1'],
  },
  hunter_bow: {
    id: 'hunter_bow', name: 'Jägerbogen', type: 'gear',
    stackSize: 1, baseValue: 14, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 1,
    statBonuses: { atk: 2, spd: 0.1, critChance: 0.05 },
    tags: ['gear', 'weapon', 'tier1'],
  },
  oak_staff: {
    id: 'oak_staff', name: 'Eichenstab', type: 'gear',
    stackSize: 1, baseValue: 10, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 1,
    statBonuses: { atk: 1, hp: 5 },
    tags: ['gear', 'weapon', 'tier1'],
  },

  // --- Gear: Armor & Shield (T1) ---
  iron_shield: {
    id: 'iron_shield', name: 'Eisenschild', type: 'gear',
    stackSize: 1, baseValue: 15, gearSlot: 'offHand', weaponSlotType: 'shield', tier: 1,
    statBonuses: { def: 4, spd: -0.05 },
    tags: ['gear', 'shield', 'tier1'],
  },
  chain_armor: {
    id: 'chain_armor', name: 'Leichter Kettenpanzer', type: 'gear',
    stackSize: 1, baseValue: 14, gearSlot: 'armor', tier: 1,
    statBonuses: { def: 4, hp: 4, spd: -0.05 },
    tags: ['gear', 'armor', 'heavy', 'tier1'],
  },
  leather_armor: {
    id: 'leather_armor', name: 'Lederrüstung', type: 'gear',
    stackSize: 1, baseValue: 10, gearSlot: 'armor', tier: 1,
    statBonuses: { def: 2, hp: 5 },
    tags: ['gear', 'armor', 'medium', 'tier1'],
  },
  novizenrobe: {
    id: 'novizenrobe', name: 'Novizenrobe', type: 'gear',
    stackSize: 1, baseValue: 9, gearSlot: 'armor', tier: 1,
    statBonuses: { hp: 8, atk: 1 },
    tags: ['gear', 'armor', 'light', 'tier1'],
    flavorText: 'Dünn wie ein Versprechen, aber wer kämpft schon in voller Rüstung, wenn Worte schneller sind?',
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
    stackSize: 1, baseValue: 28, gearSlot: 'mainHand', weaponSlotType: '1h', tier: 2,
    statBonuses: { atk: 5 },
    tags: ['gear', 'weapon', 'tier2'],
  },
  longbow: {
    id: 'longbow', name: 'Langbogen', type: 'gear',
    stackSize: 1, baseValue: 30, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 2,
    statBonuses: { atk: 3, spd: 0.15, critChance: 0.10 },
    tags: ['gear', 'weapon', 'tier2'],
  },
  crystal_staff: {
    id: 'crystal_staff', name: 'Kristallstab', type: 'gear',
    stackSize: 1, baseValue: 26, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 2,
    statBonuses: { atk: 2, hp: 8 },
    tags: ['gear', 'weapon', 'tier2'],
  },

  // --- T2 Gear: Shields & Armor ---
  steel_shield: {
    id: 'steel_shield', name: 'Stahlschild', type: 'gear',
    stackSize: 1, baseValue: 28, gearSlot: 'offHand', weaponSlotType: 'shield', tier: 2,
    statBonuses: { def: 6, hp: 4, spd: -0.05 },
    tags: ['gear', 'shield', 'tier2'],
  },
  steel_armor: {
    id: 'steel_armor', name: 'Stahlrüstung', type: 'gear',
    stackSize: 1, baseValue: 32, gearSlot: 'armor', tier: 2,
    statBonuses: { def: 5, hp: 8 },
    tags: ['gear', 'armor', 'heavy', 'tier2'],
  },
  heavy_leather_armor: {
    id: 'heavy_leather_armor', name: 'Schwere Lederrüstung', type: 'gear',
    stackSize: 1, baseValue: 26, gearSlot: 'armor', tier: 2,
    statBonuses: { def: 3, hp: 7, atk: 1 },
    tags: ['gear', 'armor', 'medium', 'tier2'],
  },
  battle_robe: {
    id: 'battle_robe', name: 'Kampfrobe', type: 'gear',
    stackSize: 1, baseValue: 22, gearSlot: 'armor', tier: 2,
    statBonuses: { hp: 12, atk: 2, critChance: 0.05 },
    tags: ['gear', 'armor', 'light', 'tier2'],
    flavorText: 'Bestickt mit Bannrunen. Leicht genug zum Laufen, stark genug zum Kämpfen.',
  },

  // --- T2 Gear: Trinkets ---
  crystal_pendant: {
    id: 'crystal_pendant', name: 'Kristallamulett', type: 'gear',
    stackSize: 1, baseValue: 34, gearSlot: 'trinket',
    statBonuses: { atk: 2, def: 1, hp: 3, critChance: 0.08 },
    tags: ['gear', 'trinket', 'tier2'],
  },

  // --- T3 Gear: Boss-Drops (nicht craftbar) ---
  mystic_plate_armor: {
    id: 'mystic_plate_armor', name: 'Mystische Plattenrüstung', type: 'gear',
    stackSize: 1, baseValue: 48, gearSlot: 'armor', tier: 3,
    statBonuses: { def: 8, hp: 14 },
    tags: ['gear', 'armor', 'heavy', 'tier3', 'boss_drop', 'special:magic_resist'],
    flavorText: 'Geschmiedet aus dem Herzholz des Treants. Die Runen auf den Platten leuchten im Mondlicht.',
  },
  crystal_golem_staff: {
    id: 'crystal_golem_staff', name: 'Kristallgolem-Stab', type: 'gear',
    stackSize: 1, baseValue: 46, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 3,
    statBonuses: { atk: 4, hp: 12, def: 2 },
    tags: ['gear', 'weapon', 'tier3', 'boss_drop', 'special:aoe_resist'],
    flavorText: 'Der Kern des Golems steckt im Kristall. Er vibriert noch – und leitet Magie ungebrochen weiter.',
  },
  hydra_venomfang: {
    id: 'hydra_venomfang', name: 'Hydra-Giftzahn', type: 'gear',
    stackSize: 1, baseValue: 50, gearSlot: 'mainHand', weaponSlotType: '1h', tier: 3,
    statBonuses: { atk: 7, critChance: 0.05 },
    tags: ['gear', 'weapon', 'tier3', 'boss_drop', 'special:lifesteal'],
    flavorText: 'Die Klinge riecht noch. Man gewöhnt sich daran. Angriffe stehlen dem Ziel Lebenspunkte.',
  },
  bandit_king_armor: {
    id: 'bandit_king_armor', name: 'Banditenköngsrüstung', type: 'gear',
    stackSize: 1, baseValue: 44, gearSlot: 'armor', tier: 3,
    statBonuses: { def: 4, hp: 8, spd: 0.10, critChance: 0.12 },
    tags: ['gear', 'armor', 'medium', 'tier3', 'boss_drop'],
    flavorText: 'Drei Narben, drei Generationen, ein König. Wer sie trägt, bewegt sich wie ein Schatten.',
  },
  spider_silk_robe: {
    id: 'spider_silk_robe', name: 'Spinnenseiden-Robe', type: 'gear',
    stackSize: 1, baseValue: 46, gearSlot: 'armor', tier: 3,
    statBonuses: { hp: 14, atk: 3, spd: 0.15 },
    tags: ['gear', 'armor', 'light', 'tier3', 'boss_drop', 'special:dodge'],
    flavorText: 'Die Spinnenkönigin webt nur einmal. So leicht wie Nebel, so tödlich wie Gift.',
  },
  fallen_hunters_bow: {
    id: 'fallen_hunters_bow', name: 'Bogen des Gefallenen', type: 'gear',
    stackSize: 1, baseValue: 50, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 3,
    statBonuses: { atk: 6, critChance: 0.12, spd: 0.10 },
    tags: ['gear', 'weapon', 'tier3', 'boss_drop', 'special:anti_heal'],
    flavorText: 'Der Ritter fiel. Der Bogen blieb gespannt. Pfeile die er abschießt, heilen nicht.',
  },
  lich_phylactery: {
    id: 'lich_phylactery', name: 'Phylakterium des Lichs', type: 'gear',
    stackSize: 1, baseValue: 55, gearSlot: 'trinket', tier: 3,
    statBonuses: { atk: 4, spd: 0.10, critChance: 0.10 },
    tags: ['gear', 'trinket', 'tier3', 'boss_drop', 'special:spell_power'],
    flavorText: 'Ein kleines Gefäß, versiegelt, pulsierend. Was darin ist, ist besser nicht zu wissen – es funktioniert trotzdem.',
  },
  wyrm_scale_shield: {
    id: 'wyrm_scale_shield', name: 'Wyrmschuppen-Schild', type: 'gear',
    stackSize: 1, baseValue: 55, gearSlot: 'armor', weaponSlotType: 'shield', tier: 3,
    statBonuses: { def: 7, hp: 10, spd: -0.10 },
    tags: ['gear', 'armor', 'shield', 'tier3', 'boss_drop', 'special:fire_resist'],
    flavorText: 'Absorbiert extreme Hitze in seinen Vulkanglas-Schichten.',
  },

  // --- T4 Legendary Gear (Boss-Drops & Arkanschmiede T4) ---
  soulbreaker: {
    id: 'soulbreaker', name: 'Seelenbrecher', type: 'gear',
    stackSize: 1, baseValue: 72, gearSlot: 'mainHand', weaponSlotType: '1h', tier: 4,
    statBonuses: { atk: 10, def: 2, critChance: 0.08 },
    tags: ['gear', 'weapon', 'tier4', 'legendary', 'special:double_strike'],
    flavorText: 'Schlägt zweimal. Immer. Das erste Mal sieht man. Das zweite nicht.',
  },
  eternal_hunter_bow: {
    id: 'eternal_hunter_bow', name: 'Bogen der Ewigen Jagd', type: 'gear',
    stackSize: 1, baseValue: 74, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 4,
    statBonuses: { atk: 9, spd: 0.20, critChance: 0.18 },
    tags: ['gear', 'weapon', 'tier4', 'legendary', 'special:piercing'],
    flavorText: 'Er hat noch nie ein Ziel verfehlt. Die Frage ist nur, welches er sich als nächstes sucht.',
  },
  worldend_staff: {
    id: 'worldend_staff', name: 'Stab der Weltenwende', type: 'gear',
    stackSize: 1, baseValue: 76, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 4,
    statBonuses: { atk: 7, hp: 18, def: 3, critChance: 0.08 },
    tags: ['gear', 'weapon', 'tier4', 'legendary', 'special:spell_power'],
    flavorText: 'Geschmiedet aus dem letzten Ast des Weltenbaums. Er spürt das Ende – und beugt es.',
  },
  aether_guardian_shield: {
    id: 'aether_guardian_shield', name: 'Aetherschild des Wächters', type: 'gear',
    stackSize: 1, baseValue: 78, gearSlot: 'offHand', weaponSlotType: 'shield', tier: 4,
    statBonuses: { def: 10, hp: 15, spd: -0.05 },
    tags: ['gear', 'shield', 'tier4', 'legendary', 'special:reflect'],
    flavorText: 'Alt genug, um zu wissen: Wer trifft, bekommt zurück. Mit Zinsen.',
  },
  dragonlord_plate: {
    id: 'dragonlord_plate', name: 'Drachenlord-Platte', type: 'gear',
    stackSize: 1, baseValue: 80, gearSlot: 'armor', tier: 4,
    statBonuses: { def: 12, hp: 20 },
    tags: ['gear', 'armor', 'heavy', 'tier4', 'legendary', 'special:fire_resist'],
    flavorText: 'Aus den Schuppen des ältesten Drachen. Er hätte sie nicht freiwillig hergegeben.',
  },
  shadowhunter_armor: {
    id: 'shadowhunter_armor', name: 'Schattenjäger-Rüstung', type: 'gear',
    stackSize: 1, baseValue: 76, gearSlot: 'armor', tier: 4,
    statBonuses: { def: 7, hp: 14, atk: 2, critChance: 0.15 },
    tags: ['gear', 'armor', 'medium', 'tier4', 'legendary', 'special:evasion'],
    flavorText: 'Getragen von denen, die im Schatten jagen. Leicht genug zum Verschwinden.',
  },
  magiarch_robe: {
    id: 'magiarch_robe', name: 'Magiarchengewand', type: 'gear',
    stackSize: 1, baseValue: 78, gearSlot: 'armor', tier: 4,
    statBonuses: { hp: 22, atk: 5, spd: 0.10, critChance: 0.10 },
    tags: ['gear', 'armor', 'light', 'tier4', 'legendary', 'special:spell_amplify'],
    flavorText: 'Nur sieben wurden je genäht. Wer es trägt, ist entweder ein Magiarch – oder sein Nachfolger.',
  },
  aether_heart: {
    id: 'aether_heart', name: 'Aetherkristall-Herz', type: 'gear',
    stackSize: 1, baseValue: 82, gearSlot: 'trinket', tier: 4,
    statBonuses: { atk: 4, def: 2, hp: 12, spd: 0.10, critChance: 0.12 },
    tags: ['gear', 'trinket', 'tier4', 'legendary', 'special:spell_power'],
    flavorText: 'Es schlägt. Leise. Rhythmisch. Wessen Herz es einst war, weiß niemand mehr.',
  },

  // --- T5 Mythisch: Nemesis-Beute und Bosse über dem Vulkankern (Erstsieg: RouteDef.ersterSiegBeute),
  //     je etwas stärker als das beste T4-Stück für denselben Platz ---
  blade_of_thousand_shadows: {
    id: 'blade_of_thousand_shadows', name: 'Klinge der tausend Schatten', type: 'gear',
    stackSize: 1, baseValue: 100, gearSlot: 'mainHand', weaponSlotType: '1h', tier: 5,
    statBonuses: { atk: 12, spd: 0.10, critChance: 0.12 },
    tags: ['gear', 'weapon', 'tier5', 'nemesis', 'special:double_strike'],
    flavorText: 'Im Himmelsarchiv unter «Verschiedenes» abgelegt. Schlägt zweimal: einmal für den Text, einmal für die Fußnote.',
  },
  shield_of_the_ancient: {
    id: 'shield_of_the_ancient', name: 'Schild des Uralten', type: 'gear',
    stackSize: 1, baseValue: 105, gearSlot: 'armor', weaponSlotType: 'shield', tier: 5,
    statBonuses: { def: 14, hp: 26, spd: -0.05 },
    tags: ['gear', 'armor', 'shield', 'tier5', 'nemesis', 'special:reflect'],
    flavorText: 'Eine Schuppe von Ignarax, so groß wie ein Scheunentor. Wer darauf schlägt, bekommt die Antwort sofort.',
  },
  amulet_of_rebirth: {
    id: 'amulet_of_rebirth', name: 'Amulett der Wiedergeburt', type: 'gear',
    stackSize: 1, baseValue: 110, gearSlot: 'trinket', tier: 5,
    statBonuses: { atk: 4, def: 3, hp: 16, spd: 0.08, critChance: 0.08 },
    tags: ['gear', 'trinket', 'tier5', 'nemesis', 'special:revive'],
    flavorText: 'Einmal. Nur einmal. Wer es trägt, steht nach dem ersten tödlichen Treffer mit 25% HP wieder auf.',
  },

  // --- Ebene 7 und 8: Beute der Bosse zwischen den Sternen (erster Sieg garantiert) ---
  korrunds_hammer: {
    id: 'korrunds_hammer', name: 'Korrunds Hammer', type: 'gear',
    stackSize: 1, baseValue: 150, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 7, spriteKey: 'ITEM_WAR_HAMMER',
    statBonuses: { atk: 24, hp: 32, def: 5 },
    tags: ['gear', 'weapon', 'tier7', 'legendary', 'special:funkenflug'],
    flavorText: 'Damit hat Korrund die Sterne geschmiedet. Jeder Schlag schlägt Funken, die auf den nächsten Gegner überspringen. Korrund arbeitet jetzt mit dem Ersatzhammer und schaut euch sehr lange an.',
  },
  der_letzte_stern: {
    id: 'der_letzte_stern', name: 'Der letzte Stern', type: 'gear',
    stackSize: 1, baseValue: 175, gearSlot: 'trinket', tier: 8, spriteKey: 'ITEM_CRYSTAL_PENDANT',
    statBonuses: { atk: 8, def: 5, hp: 30, spd: 0.12, critChance: 0.12 },
    tags: ['gear', 'trinket', 'tier8', 'legendary', 'special:revive'],
    flavorText: 'Den hat Nyxar nicht mehr geschafft. Er geht nicht unter: Wer ihn trägt, steht nach dem ersten tödlichen Treffer wieder auf.',
  },

  // --- Ebene 9: Beute des Mondvogts (erster Sieg garantiert). Einhändig, damit die Schildhand frei bleibt;
  //     trägt die Letzte Bastion der Festung, also zieht jeder Träger 2 Runden lang alle Angriffe auf sich ---
  amtsstab_des_mondvogts: {
    id: 'amtsstab_des_mondvogts', name: 'Amtsstab des Mondvogts', type: 'gear',
    stackSize: 1, baseValue: 200, gearSlot: 'mainHand', weaponSlotType: '1h', tier: 9, spriteKey: 'ITEM_OAK_STAFF',
    statBonuses: { atk: 21, def: 6, hp: 26 },
    tags: ['gear', 'weapon', 'tier9', 'legendary', 'special:letzte_bastion'],
    flavorText: 'Wer den Stab hebt, hat das Wort: Alle hören zu, auch die, die gerade zuschlagen wollten. Zu Beginn jedes Kampfes zieht der Träger 2 Runden lang alle Angriffe auf sich, ob er das aushält oder nicht. Argentis führt die Sitzungen jetzt mit einem Lineal.',
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

  // --- Baupläne (garantierter Boss-Drop beim ersten Sieg, schalten Gebäude frei) ---
  // Nicht verkaufbar (baseValue 0), nicht ausrüstbar (kein gearSlot). Wird beim Bau verbraucht.
  bauplan_arkanschmiede: {
    id: 'bauplan_arkanschmiede', name: 'Bauplan: Arkanschmiede', type: 'special',
    stackSize: 1, baseValue: 0, productionSource: 'expedition_only', spriteKey: 'ITEM_BAUPLAN',
    bauplanFuer: 'ARCANE_SMITHY',
    tags: ['special', 'bauplan'],
    flavorText: 'Im Kern des Golems eingeschlossen: Runen, Maße und ein Funken Kristallglut.',
  },
  bauplan_marktplatz: {
    id: 'bauplan_marktplatz', name: 'Bauplan: Marktplatz', type: 'special',
    stackSize: 1, baseValue: 0, productionSource: 'expedition_only', spriteKey: 'ITEM_BAUPLAN',
    bauplanFuer: 'MARKETPLACE',
    tags: ['special', 'bauplan'],
    flavorText: 'Zwischen den Wurzeln des Treants verborgen. Händler haben sich hier einst getroffen.',
  },
  bauplan_kriegsmaschinen: {
    id: 'bauplan_kriegsmaschinen', name: 'Bauplan: Kriegsmaschinen-Werkstatt', type: 'special',
    stackSize: 1, baseValue: 0, productionSource: 'expedition_only', spriteKey: 'ITEM_BAUPLAN',
    bauplanFuer: 'WAR_MACHINE_WORKSHOP',
    tags: ['special', 'bauplan'],
    flavorText: 'Der Ritter trug die Pläne der alten Belagerungsgeräte bis ins Grab.',
  },
  bauplan_bank: {
    id: 'bauplan_bank', name: 'Bauplan: Bank', type: 'special',
    stackSize: 1, baseValue: 0, productionSource: 'expedition_only', spriteKey: 'ITEM_BAUPLAN',
    bauplanFuer: 'BANK',
    tags: ['special', 'bauplan'],
    flavorText: 'Der Lich hortete nicht nur Seelen. Auch seine Schatzkammer war gut geplant.',
  },

  // --- Gold (tracked separately in globalStock but defined here for completeness) ---
  gold: {
    id: 'gold', name: 'Gold', type: 'resource',
    stackSize: 9999, baseValue: 1, tags: ['currency'],
  },

  // --- T4 Gear: Arkanschmiede (craftbar) ---
  war_hammer: {
    id: 'war_hammer', name: 'Kriegshammer', type: 'gear',
    stackSize: 1, baseValue: 75, gearSlot: 'mainHand', weaponSlotType: '2h', tier: 4,
    statBonuses: { atk: 12, hp: 15, def: 3 },
    tags: ['gear', 'weapon', 'tier4', 'arkan', 'special:stun_strike'],
  },
  arcane_blade: {
    id: 'arcane_blade', name: 'Arkanklinge', type: 'gear',
    stackSize: 1, baseValue: 70, gearSlot: 'mainHand', weaponSlotType: '1h', tier: 4,
    statBonuses: { atk: 7, critChance: 0.05 },
    tags: ['gear', 'weapon', 'tier4', 'arkan', 'special:spell_power'],
  },
  magitech_shield: {
    id: 'magitech_shield', name: 'Magitech-Schild', type: 'gear',
    stackSize: 1, baseValue: 68, gearSlot: 'offHand', weaponSlotType: 'shield', tier: 4,
    statBonuses: { def: 6, hp: 10 },
    tags: ['gear', 'armor', 'shield', 'tier4', 'arkan', 'special:aoe_resist'],
  },
  arcane_amulet: {
    id: 'arcane_amulet', name: 'Arkan-Amulett', type: 'gear',
    stackSize: 1, baseValue: 72, gearSlot: 'trinket', tier: 4,
    statBonuses: { atk: 3, def: 2, critChance: 0.10 },
    tags: ['gear', 'trinket', 'tier4', 'arkan'],
  },

  // --- Magitech Material ---
  magitech_component: {
    id: 'magitech_component', name: 'Magitech-Komponente', type: 'material',
    stackSize: 100, baseValue: 30,
    tags: ['material', 'rare', 'magitech'],
  },

  // --- Water (produced by well proximity) ---
  water: {
    id: 'water', name: 'Wasser', type: 'resource',
    stackSize: 100, baseValue: 1,
    tags: ['resource'],
  },

  // --- Herbs (expedition drops) ---
  herb_fire_root: {
    id: 'herb_fire_root', name: 'Glutwurzel', type: 'resource',
    stackSize: 100, baseValue: 5, productionSource: 'expedition_only',
    herbSource: 'volcano',
    tags: ['resource', 'herb'],
  },
  herb_shimmer_shroom: {
    id: 'herb_shimmer_shroom', name: 'Schimmerpilz', type: 'resource',
    stackSize: 100, baseValue: 5, productionSource: 'expedition_only',
    herbSource: 'cave',
    tags: ['resource', 'herb'],
  },
  herb_swamp_blossom: {
    id: 'herb_swamp_blossom', name: 'Sumpfblüte', type: 'resource',
    stackSize: 100, baseValue: 5, productionSource: 'expedition_only',
    herbSource: 'swamp',
    tags: ['resource', 'herb'],
  },
  herb_bone_dust: {
    id: 'herb_bone_dust', name: 'Knochenstaub', type: 'resource',
    stackSize: 100, baseValue: 5, productionSource: 'expedition_only',
    herbSource: 'ruins',
    tags: ['resource', 'herb'],
  },
  herb_moonwort: {
    id: 'herb_moonwort', name: 'Mondkraut', type: 'resource',
    stackSize: 100, baseValue: 8, productionSource: 'expedition_only',
    herbSource: 'ruins',
    tags: ['resource', 'herb', 'rare'],
  },

  // --- Potions (alchemie crafting) ---
  potion_strength: {
    id: 'potion_strength', name: 'Krafttrank', type: 'consumable',
    stackSize: 100, baseValue: 12,
    buffEffect: { stat: 'atk', value: 3, durationRooms: 99 },
    tags: ['consumable', 'provision', 'potion'],
  },
  potion_mana: {
    id: 'potion_mana', name: 'Manatrank', type: 'consumable',
    stackSize: 100, baseValue: 15,
    tags: ['consumable', 'provision', 'potion', 'cooldown_reset'],
  },
  potion_antidote: {
    id: 'potion_antidote', name: 'Gegengift', type: 'consumable',
    stackSize: 100, baseValue: 10,
    tags: ['consumable', 'provision', 'potion', 'cleanse'],
  },
  potion_titan: {
    id: 'potion_titan', name: 'Titan-Gebräu', type: 'consumable',
    stackSize: 100, baseValue: 14,
    buffEffect: { stat: 'hp', value: 10, durationRooms: 99 },
    tags: ['consumable', 'provision', 'potion'],
  },
  potion_speed: {
    id: 'potion_speed', name: 'Schnelligkeitstrank', type: 'consumable',
    stackSize: 100, baseValue: 16,
    buffEffect: { stat: 'spd', value: 0.2, durationRooms: 2 },
    tags: ['consumable', 'provision', 'potion'],
  },

  // --- War Machines (expedition equipment) ---
  war_catapult: {
    id: 'war_catapult', name: 'Katapult', type: 'special',
    stackSize: 1, baseValue: 50,
    tags: ['special', 'war_machine'],
    combatAbility: {
      name: 'Felsbrocken',
      damage: 22,
      target: 'all_enemies',
      cooldown: 2,
    },
  },
  war_cannon: {
    id: 'war_cannon', name: 'Kanone', type: 'special',
    stackSize: 1, baseValue: 55,
    tags: ['special', 'war_machine'],
    combatAbility: {
      name: 'Magitech-Salve',
      damage: 28,
      target: 'single',
      cooldown: 1,
    },
  },

  // === ABYSSAL SET (Tier TL / Unterwasser) ===
  coral_blade: {
    id: 'coral_blade',
    name: 'Korallenklinge',
    type: 'gear',
    stackSize: 1,
    baseValue: 38,
    gearSlot: 'mainHand',
    weaponSlotType: '1h',
    tier: 3,
    statBonuses: { atk: 4, spd: 0.05 },
    airBonus: 10,
    tags: ['gear', 'weapon', 'tier3', 'abyssal_set', 'special:slow_on_hit'],
    flavorText: 'Aus lebendem Korall geschmiedet — die Klinge atmet noch. Trefferflächen hinterlassen Salzwundmale.',
    productionSource: 'expedition_only',
  },
  deep_sea_bow: {
    id: 'deep_sea_bow',
    name: 'Tiefseebogen',
    type: 'gear',
    stackSize: 1,
    baseValue: 40,
    gearSlot: 'mainHand',
    weaponSlotType: '2h',
    tier: 3,
    statBonuses: { atk: 3, critChance: 0.08 },
    airBonus: 10,
    tags: ['gear', 'weapon', 'tier3', 'abyssal_set'],
    flavorText: 'Aus Seepferdchen-Sehne und Tiefseeholz. Die Pfeile reißen selbst durch Salzwasser ohne Widerstand.',
    productionSource: 'expedition_only',
  },
  ocean_mage_staff: {
    id: 'ocean_mage_staff',
    name: 'Ozeanstab',
    type: 'gear',
    stackSize: 1,
    baseValue: 42,
    gearSlot: 'mainHand',
    weaponSlotType: '2h',
    tier: 3,
    statBonuses: { atk: 5, hp: 5 },
    airBonus: 15,
    tags: ['gear', 'weapon', 'tier3', 'abyssal_set', 'special:spell_power'],
    flavorText: 'Der Stab kanalisiert die Strömung selbst. Wer ihn schwingt, hört das Rauschen des Meeres — auch an Land.',
    productionSource: 'expedition_only',
  },
  neptune_shield: {
    id: 'neptune_shield',
    name: 'Neptunschild',
    type: 'gear',
    stackSize: 1,
    baseValue: 45,
    gearSlot: 'offHand',
    weaponSlotType: 'shield',
    tier: 3,
    statBonuses: { def: 5, hp: 8 },
    airBonus: 20,
    tags: ['gear', 'shield', 'tier3', 'abyssal_set'],
    flavorText: 'Einst Schild des Meeresgottes, jetzt Relikt. Die Luftblase im Innern hält ewig — fast.',
    productionSource: 'expedition_only',
  },
  deepwater_plate: {
    id: 'deepwater_plate',
    name: 'Tiefwasserplatte',
    type: 'gear',
    stackSize: 1,
    baseValue: 50,
    gearSlot: 'armor',
    tier: 3,
    statBonuses: { def: 8, hp: 15, spd: -0.05 },
    airBonus: 20,
    tags: ['gear', 'armor', 'heavy', 'tier3', 'abyssal_set', 'special:air_decay_resist'],
    flavorText: 'Schwerer als Eisen, dichter als Stein. Unter Wasser ist das kein Nachteil.',
    productionSource: 'expedition_only',
  },
  abyssal_leather: {
    id: 'abyssal_leather',
    name: 'Abyssalleder',
    type: 'gear',
    stackSize: 1,
    baseValue: 44,
    gearSlot: 'armor',
    tier: 3,
    statBonuses: { def: 4, hp: 12, atk: 1 },
    airBonus: 15,
    tags: ['gear', 'armor', 'light', 'tier3', 'abyssal_set', 'special:dodge'],
    flavorText: 'Aus der Haut eines Tiefseefisches — wasserdicht, lautlos, dunkel wie der Abgrund.',
    productionSource: 'expedition_only',
  },
  tide_robe: {
    id: 'tide_robe',
    name: 'Gezeitenrobe',
    type: 'gear',
    stackSize: 1,
    baseValue: 43,
    gearSlot: 'armor',
    tier: 3,
    statBonuses: { hp: 10, atk: 4, spd: 0.1 },
    airBonus: 12,
    tags: ['gear', 'armor', 'light', 'tier3', 'abyssal_set', 'special:spell_power'],
    flavorText: 'Zwischen Ebbe und Flut weben die alten Meermagi. Diese Robe hält noch ihre Formeln.',
    productionSource: 'expedition_only',
  },
  abyss_amulet: {
    id: 'abyss_amulet',
    name: 'Abyssamulett',
    type: 'gear',
    stackSize: 1,
    baseValue: 46,
    gearSlot: 'trinket',
    tier: 3,
    statBonuses: { atk: 3, def: 2, hp: 5, critChance: 0.05 },
    airBonus: 15,
    tags: ['gear', 'trinket', 'tier3', 'abyssal_set'],
    flavorText: 'Ein Stein aus dem tiefsten Ozeangraben. Er pulsiert mit dem Rhythmus der Gezeiten.',
    productionSource: 'expedition_only',
  },
  // === UNTERWASSER CONSUMABLES & MATERIALIEN ===
  sea_crystal: {
    id: 'sea_crystal',
    name: 'Meerkristall',
    type: 'material',
    stackSize: 100,
    baseValue: 12,
    tags: ['material', 'ocean'],
    flavorText: 'Aus dem Salzwasser gezogen. Leuchtet schwach blau in der Dunkelheit.',
  },
  air_crystal: {
    id: 'air_crystal',
    name: 'Luftkristall',
    type: 'consumable',
    stackSize: 50,
    baseValue: 15,
    healAmount: 0,
    tags: ['consumable', 'ocean', 'air_restore'],
    flavorText: 'Eine komprimierte Atemblase, in Kristall gebannt. Im Notfall zerbrechen.',
  },
  emergency_air: {
    id: 'emergency_air',
    name: 'Notluftflasche',
    type: 'consumable',
    stackSize: 10,
    baseValue: 25,
    healAmount: 0,
    tags: ['consumable', 'provision', 'air_restore', 'emergency_air'],
    flavorText: 'Letzte Reserve. Einmal verwenden. Danach ist Beten die einzige Option.',
  },

  // --- Dungeon-Sets: drei Teile je Dungeon (data/dungeonSets.ts) ---
  ...setItemDefs(),

  // --- Material für die Schmiede: eins je Gebiet (data/schmiede.ts) ---
  ...materialItemDefs(),
};

/** Resolve sprite key for an item. Uses explicit spriteKey if set, otherwise derives from id. */
export function getItemSpriteKey(itemId: string): string {
  const def = ITEM_DEFS[itemId];
  if (def?.spriteKey) return def.spriteKey;
  return `ITEM_${itemId.toUpperCase()}`;
}

/** True, wenn das Item ein Bauplan ist (nicht verkaufbar, nicht ausrüstbar). */
export function isBauplan(itemId: string): boolean {
  return ITEM_DEFS[itemId]?.tags.includes('bauplan') ?? false;
}

export const PROVISION_ITEMS = [
  'bread', 'healing_potion', 'power_bread', 'herb_green',
  'potion_strength', 'potion_mana', 'potion_antidote', 'potion_titan', 'potion_speed',
];
