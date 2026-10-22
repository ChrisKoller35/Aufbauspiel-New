import { EncounterChoice, EncounterType } from '../models/ExpeditionRun';
import type { GameState } from '../models/GameState';
import { ENEMY_DEFS } from './enemies';
import { rangFuerEbene } from './guildRanks';
import { LOOT_TABLE_DEFS } from './lootTables';

export interface EncounterTemplate {
  type: EncounterType;
  enemies?: string[];     // enemy IDs for combat
  healPercent?: number;   // for rest encounters
  damage?: number;        // for hazard encounters
  findGold?: number;      // for find encounters
  findItems?: { itemId: string; qty: number }[];  // for find encounters
  /** Fest vorgegebene Wahl für find/rest-Räume (statt der zufälligen zweiten Option) */
  wahl?: { a: EncounterChoice; b: EncounterChoice };
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
  /** Gebiet über dem Vulkankern: bestimmt Farbe und Schild auf Karte und Routenliste */
  gebiet?: 'gipfel' | 'himmel' | 'sterne' | 'mond';
  /** Eigene Regel dieses Dungeons in einem Satz (Karte, Routenliste) */
  besonderheit?: string;
  /** Hort-Gier: jeder Punkt (EncounterChoice.gier) macht den Boss um diese Anteile stärker, Punkte unter 0 schwächer */
  hortGier?: { angriffProPunkt: number; lebenProPunkt: number };
  /** Gegenstand, den der Boss beim ersten Sieg der Gilde über ihn garantiert dazugibt */
  ersterSiegBeute?: string;
}

// ── Dungeon Graph — defines visual map layout & connections ──

export interface DungeonGraphNode {
  routeId: string;
  x: number;       // 0-900 px
  y: number;       // 0-2600 px (0 = top/endgame, 2600 = bottom/start); negativ = über dem Vulkankern
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
  { routeId: 'volcano_core',       x: 450, y: 180,  leadsTo: ['drachenhort'], isMainPath: true },

  // ── ÜBER DEM VULKANKERN: neue Dungeons, die Karte wächst nach oben (docs/NEUE-DUNGEONS.md) ──
  { routeId: 'drachenhort',        x: 380, y: -300, leadsTo: ['himmelsarchiv'], isMainPath: true },
  { routeId: 'himmelsarchiv',      x: 520, y: -800, leadsTo: ['sternenschmiede'], isMainPath: true },
  { routeId: 'sternenschmiede',    x: 390, y: -1300, leadsTo: ['sternenschlund'], isMainPath: true },
  { routeId: 'sternenschlund',     x: 510, y: -1800, leadsTo: ['mondhof'], isMainPath: true },
  { routeId: 'mondhof',            x: 400, y: -2300, leadsTo: ['morgentor'], isMainPath: true },
  { routeId: 'morgentor',          x: 530, y: -2800, leadsTo: [], isMainPath: true },
];

export const ROUTE_DEFS: Record<string, RouteDef> = {
  forest_short: {
    id: 'forest_short',
    name: 'Waldpfad (kurz)',
    tier: 1,
    rooms: 5,
    encounters: [
      { type: 'combat', enemies: ['forest_wolf', 'forest_spider'] },
      { type: 'combat', enemies: ['forest_bandit'] },
      { type: 'rest', healPercent: 30 },
      { type: 'combat', enemies: ['forest_wolf', 'forest_wolf'] },
      { type: 'combat', enemies: ['forest_bear'] },
    ],
    bossId: null,
    recommendedLevel: 'Startausrüstung',
  },
  forest_medium: {
    id: 'forest_medium',
    name: 'Tiefwald (mittel)',
    tier: 2,
    rooms: 9,
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
    recommendedLevel: 'Eisenausrüstung',
  },
  cave_deep: {
    id: 'cave_deep',
    name: 'Tiefe Höhle',
    tier: 2,
    rooms: 8,
    encounters: [
      { type: 'combat', enemies: ['cave_bat', 'cave_bat', 'cave_bat'] },
      // Kristallkäfer: garantiert 1 Kristallsplitter schon in der ersten Höhle
      { type: 'combat', enemies: ['cave_goblin', 'crystal_beetle'] },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['cave_spider_queen', 'cave_goblin'] },
      { type: 'combat', enemies: ['cave_troll'] },
      { type: 'hazard', damage: 10 },
      { type: 'boss', enemies: ['boss_crystal_golem'] },
    ],
    bossId: 'boss_crystal_golem',
    recommendedLevel: 'Volle Eisenausrüstung',
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
    recommendedLevel: 'Volle Eisenausrüstung und T2-Teile',
    unlockCondition: { bossesDefeated: ['boss_elder_treant'] },
  },
  cave_spider: {
    id: 'cave_spider',
    name: 'Spinnenhöhle',
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
    recommendedLevel: 'Volle Eisenausrüstung',
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
    recommendedLevel: 'T2-Ausrüstung',
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
    recommendedLevel: 'Volle T2-Ausrüstung',
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
    recommendedLevel: 'Volle T2-Ausrüstung und Stufe 8+',
    unlockCondition: { bossesDefeated: ['boss_swamp_hydra', 'boss_fallen_knight'] },
  },

  // ── Über dem Vulkankern: neue Dungeons, die Karte wächst nach oben (docs/NEUE-DUNGEONS.md) ──
  drachenhort: {
    id: 'drachenhort',
    name: 'Der Drachenhort',
    tier: 5,
    rooms: 15,
    gebiet: 'gipfel',
    besonderheit: 'Hort-Gier: Wer Gold aus dem Hort einsteckt, macht Ignarax stärker.',
    hortGier: { angriffProPunkt: 0.08, lebenProPunkt: 0.08 },
    ersterSiegBeute: 'shield_of_the_ancient',
    encounters: [
      { type: 'combat', enemies: ['glutwyrmling', 'hortkobold'] },
      { type: 'combat', enemies: ['hortgolem', 'glutwyrmling'] },
      { type: 'find', wahl: {
        a: { label: 'Goldhaufen einstecken (+80 Gold, Ignarax wird stärker)', flavorText: 'Münzen bis unter die Decke. Weiter oben schnaubt etwas sehr Großes.', effect: 'gold', value: 80, gier: 1 },
        b: { label: 'Finger weg (+10% HP)', flavorText: 'Ihr lasst das Gold liegen und atmet kurz durch.', effect: 'heal', value: 10 },
      } },
      { type: 'combat', enemies: ['drachenpriester', 'hortgolem', 'hortkobold'] },
      { type: 'hazard', damage: 14 },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 15 },
      { type: 'combat', enemies: ['glutwyrmling', 'glutwyrmling', 'drachenpriester'] },
      { type: 'find', wahl: {
        a: { label: 'Edelsteinschale leeren (+120 Gold, Ignarax wird stärker)', flavorText: 'Rubine, so groß wie Hühnereier. Der Hortgolem hätte das gemerkt.', effect: 'gold', value: 120, gier: 1 },
        b: { label: 'Finger weg (+10% HP)', flavorText: 'Nur schauen, nicht anfassen.', effect: 'heal', value: 10 },
      } },
      { type: 'combat', enemies: ['hortgolem', 'hortkobold', 'hortkobold'] },
      { type: 'hazard', damage: 16 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['hortgolem', 'drachenpriester', 'glutwyrmling', 'hortkobold'] },
      { type: 'find', wahl: {
        a: { label: 'Die Drachenkrone nehmen (+200 Gold, Ignarax wird stärker)', flavorText: 'Sie liegt direkt vor seiner Höhle. Natürlich ist das eine Falle. Aber was für eine Krone!', effect: 'gold', value: 200, gier: 1 },
        b: { label: 'Durchatmen vor dem Kampf (+15% HP)', flavorText: 'Ihr lasst die Krone liegen. Drinnen brummt jemand zufrieden.', effect: 'heal', value: 15 },
      } },
      { type: 'boss', enemies: ['boss_ignarax'] },
    ],
    bossId: 'boss_ignarax',
    recommendedLevel: 'Stufe 12+ und T4-Ausrüstung',
    unlockCondition: { bossesDefeated: ['boss_magma_wyrm'] },
  },
  himmelsarchiv: {
    id: 'himmelsarchiv',
    name: 'Das Himmelsarchiv',
    tier: 6,
    rooms: 16,
    gebiet: 'himmel',
    besonderheit: 'Verbotene Bücher: Lesesäle bringen seltene Funde, kosten aber Leben.',
    ersterSiegBeute: 'blade_of_thousand_shadows',
    encounters: [
      { type: 'combat', enemies: ['archivritter', 'knochenschreiber'] },
      { type: 'combat', enemies: ['folianten_waechter', 'fluestergeist'] },
      { type: 'find', wahl: {
        a: { label: 'Verbotenes Buch lesen (+3 Kristallsplitter, −5% HP)', flavorText: 'Die Seiten flüstern. Zwischen ihnen liegen Kristalle als Lesezeichen.', effect: 'item', value: 3, itemId: 'crystal_shard', kostetLeben: 5 },
        b: { label: 'Leise weitergehen (+5% HP)', flavorText: 'Pssst. Ihr schleicht am Regal vorbei.', effect: 'heal', value: 5 },
      } },
      { type: 'combat', enemies: ['archivritter', 'archivritter', 'fluestergeist'] },
      { type: 'hazard', damage: 14 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['folianten_waechter', 'knochenschreiber', 'knochenschreiber'] },
      { type: 'rest', healPercent: 15 },
      { type: 'find', wahl: {
        a: { label: 'Magitech-Folianten aufschlagen (+1 Magitech-Komponente, −10% HP)', flavorText: 'Die Baupläne sind so verboten, dass sie beim Lesen zurückbeißen.', effect: 'item', value: 1, itemId: 'magitech_component', kostetLeben: 10 },
        b: { label: 'Leise weitergehen (+5% HP)', flavorText: 'Manche Bücher lässt man besser zu.', effect: 'heal', value: 5 },
      } },
      { type: 'combat', enemies: ['archivritter', 'fluestergeist', 'knochenschreiber'] },
      { type: 'hazard', damage: 16 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['folianten_waechter', 'fluestergeist'] },
      { type: 'combat', enemies: ['archivritter', 'knochenschreiber', 'fluestergeist'] },
      { type: 'find', wahl: {
        a: { label: 'Das Buch der Namen stehlen (+4 Talisman-Fragmente, −10% HP)', flavorText: 'Darin steht jeder Name, der je geschrieben wurde. Eurer ist rot unterstrichen.', effect: 'item', value: 4, itemId: 'talisman_fragment', kostetLeben: 10 },
        b: { label: 'Lesepause vor dem Kampf (+10% HP)', flavorText: 'Ihr setzt euch kurz in einen Lesesessel. Der Oberarchivar wartet. Er hat Zeit.', effect: 'heal', value: 10 },
      } },
      { type: 'boss', enemies: ['boss_oberarchivar'] },
    ],
    bossId: 'boss_oberarchivar',
    recommendedLevel: 'Stufe 15 und volle T4-Ausrüstung',
    unlockCondition: { bossesDefeated: ['boss_ignarax'] },
  },
  sternenschmiede: {
    id: 'sternenschmiede',
    name: 'Die Sternenschmiede',
    tier: 7,
    rooms: 16,
    gebiet: 'sterne',
    besonderheit: 'Sternenfeuer: Wer die Waffen in die Essen hält, schlägt bis zum Ende härter zu, aber die Hitze kostet Leben.',
    ersterSiegBeute: 'korrunds_hammer',
    encounters: [
      { type: 'combat', enemies: ['funkenwichtel', 'ambossgolem'] },
      { type: 'combat', enemies: ['essengeist', 'funkenwichtel'] },
      { type: 'find', wahl: {
        a: { label: 'Waffen ins Sternenfeuer halten (+10% Angriff bis zum Ende, −5% HP)', flavorText: 'Die Klingen glühen weiss. Die Hände leider auch.', effect: 'angriff', value: 10, kostetLeben: 5 },
        b: { label: 'Am Kühltrog verschnaufen (+10% HP)', flavorText: 'Das Wasser zischt, und ihr atmet durch.', effect: 'heal', value: 10 },
      } },
      { type: 'combat', enemies: ['ambossgolem', 'lichtguss', 'funkenwichtel'] },
      { type: 'hazard', damage: 16 },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 15 },
      { type: 'combat', enemies: ['funkenwichtel', 'funkenwichtel', 'essengeist'] },
      { type: 'find', wahl: {
        a: { label: 'Waffen in die grosse Esse halten (+10% Angriff bis zum Ende, −5% HP)', flavorText: 'Hier schmiedet Korrund die grossen Sterne. Die Hitze geht durch jede Rüstung.', effect: 'angriff', value: 10, kostetLeben: 5 },
        b: { label: 'Am Kühltrog verschnaufen (+10% HP)', flavorText: 'Ihr kühlt die Hände und lasst die Esse Esse sein.', effect: 'heal', value: 10 },
      } },
      { type: 'combat', enemies: ['ambossgolem', 'lichtguss', 'essengeist'] },
      { type: 'hazard', damage: 18 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['lichtguss', 'ambossgolem', 'funkenwichtel'] },
      { type: 'combat', enemies: ['ambossgolem', 'essengeist', 'lichtguss', 'funkenwichtel'] },
      { type: 'find', wahl: {
        a: { label: 'Auf Korrunds Amboss nachschärfen (+10% Angriff bis zum Ende, −10% HP)', flavorText: '«Für den letzten Stern. Nicht anfassen.» steht darauf. Ihr fasst ihn an.', effect: 'angriff', value: 10, kostetLeben: 10 },
        b: { label: 'Durchatmen vor dem Kampf (+15% HP)', flavorText: 'Korrund lässt sich Zeit, ihr euch auch.', effect: 'heal', value: 15 },
      } },
      { type: 'boss', enemies: ['boss_korrund'] },
    ],
    bossId: 'boss_korrund',
    recommendedLevel: 'Stufe 15 und Sets auf +3',
    unlockCondition: { bossesDefeated: ['boss_oberarchivar'] },
  },
  sternenschlund: {
    id: 'sternenschlund',
    name: 'Der Sternenschlund',
    tier: 8,
    rooms: 16,
    gebiet: 'sterne',
    besonderheit: 'Gefangene Sterne: Wer sie befreit, schwächt Nyxar und verbrennt sich dabei; wer sie ausschlachtet, bekommt Sternenstahl.',
    hortGier: { angriffProPunkt: 0.1, lebenProPunkt: 0.1 },
    ersterSiegBeute: 'der_letzte_stern',
    encounters: [
      { type: 'combat', enemies: ['leerenkriecher', 'lichtmotte'] },
      { type: 'combat', enemies: ['kometenkaefer', 'nyxarbrut'] },
      { type: 'find', wahl: {
        a: { label: 'Sternenstahl herausschlagen (+3 Sternenstahl, wenn ihr siegt)', flavorText: 'Der Stern im Käfig wimmert leise. Die Splitter glänzen trotzdem schön.', effect: 'item', value: 3, itemId: 'mat_sternenstahl', nachSieg: true },
        b: { label: 'Den Stern befreien (Nyxar wird schwächer, −5% HP)', flavorText: 'Der Käfig glüht, als ihr ihn aufbiegt. Der Stern saust davon, zurück an den Himmel.', effect: 'kein', value: 0, gier: -1, kostetLeben: 5 },
      } },
      { type: 'combat', enemies: ['lichtmotte', 'leerenkriecher', 'kometenkaefer'] },
      { type: 'hazard', damage: 18 },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 15 },
      { type: 'combat', enemies: ['nyxarbrut', 'leerenkriecher', 'lichtmotte'] },
      { type: 'find', wahl: {
        a: { label: 'Sternenstahl herausschlagen (+4 Sternenstahl, wenn ihr siegt)', flavorText: 'Im Netz hängen Sterne wie Fliegen. Einer davon lässt sich gut zerlegen.', effect: 'item', value: 4, itemId: 'mat_sternenstahl', nachSieg: true },
        b: { label: 'Die Sterne befreien (Nyxar wird schwächer, −5% HP)', flavorText: 'Ihr zerreisst das Netz. Es ist aus Licht und brennt wie Nesseln.', effect: 'kein', value: 0, gier: -1, kostetLeben: 5 },
      } },
      { type: 'combat', enemies: ['lichtmotte', 'lichtmotte', 'kometenkaefer'] },
      { type: 'hazard', damage: 20 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['kometenkaefer', 'nyxarbrut', 'leerenkriecher'] },
      { type: 'combat', enemies: ['leerenkriecher', 'lichtmotte', 'nyxarbrut'] },
      { type: 'find', wahl: {
        a: { label: 'Sternenstahl herausschlagen (+5 Sternenstahl, wenn ihr siegt)', flavorText: 'Der grösste Stern liegt direkt vor Nyxars Lager. Er ist für später gedacht.', effect: 'item', value: 5, itemId: 'mat_sternenstahl', nachSieg: true },
        b: { label: 'Den grössten Stern befreien (Nyxar wird schwächer, −5% HP)', flavorText: 'Er steigt auf, und im Schlund wird es heller. Drinnen faucht jemand.', effect: 'kein', value: 0, gier: -1, kostetLeben: 5 },
      } },
      { type: 'boss', enemies: ['boss_nyxar'] },
    ],
    bossId: 'boss_nyxar',
    recommendedLevel: 'Stufe 15, Sets auf +5 und Korrunds Meisterstücke',
    unlockCondition: { bossesDefeated: ['boss_korrund'] },
  },
  mondhof: {
    id: 'mondhof',
    name: 'Der Mondhof',
    tier: 9,
    rooms: 16,
    gebiet: 'mond',
    besonderheit: 'Pfandzettel: Der Mondvogt leiht Mondsilber und Beute gegen Pfand. Wer unterschreibt, schlägt bis zum Ende schwächer zu und bekommt die Beute erst, wenn der Vogt fällt.',
    ersterSiegBeute: 'amtsstab_des_mondvogts',
    encounters: [
      { type: 'combat', enemies: ['zollgeist', 'mondwache'] },
      { type: 'combat', enemies: ['mondkalb', 'silberschreiber'] },
      { type: 'find', wahl: {
        a: { label: 'Den Angriff verpfänden (+5 Mondsilber, wenn ihr siegt, −10% Angriff bis zum Ende)', flavorText: 'Der Zettel ist in Silber geschrieben und sehr klein. Das Kleingedruckte ist noch kleiner.', effect: 'item', value: 5, itemId: 'mat_mondsilber', nachSieg: true, kostetAngriff: 10 },
        b: { label: 'Den kleinen Zettel nehmen (+1 Mondsilber)', flavorText: 'Der Schreiber reisst ihn ab, ohne hinzusehen. Er ist Beamter.', effect: 'item', value: 1, itemId: 'mat_mondsilber' },
      } },
      { type: 'combat', enemies: ['mondwache', 'zollgeist', 'silberschreiber'] },
      { type: 'hazard', damage: 20 },
      { type: 'checkpoint' },
      { type: 'rest', healPercent: 15 },
      { type: 'combat', enemies: ['mondkalb', 'mondkalb', 'silberschreiber'] },
      { type: 'find', wahl: {
        a: { label: 'Das Pfandbuch unterschreiben (+1 Set-Teil, wenn ihr siegt, −10% Angriff bis zum Ende)', flavorText: 'Unter eurer Unterschrift steht schon eine zweite: die des Vogts. Er hat sie vorsichtshalber vorher hingesetzt.', effect: 'kein', value: 0, setTeil: true, kostetAngriff: 10 },
        b: { label: 'Nur die Quittung (+2 Mondsilber)', flavorText: 'Für einen Blick ins Buch gibt es zwei Münzen. Der Vogt nennt das Lesegebühr, rückwärts.', effect: 'item', value: 2, itemId: 'mat_mondsilber' },
      } },
      { type: 'combat', enemies: ['zollgeist', 'zollgeist', 'mondwache'] },
      { type: 'hazard', damage: 22 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['mondwache', 'silberschreiber', 'mondkalb'] },
      { type: 'combat', enemies: ['zollgeist', 'mondkalb', 'silberschreiber'] },
      { type: 'find', wahl: {
        a: { label: 'Alles verpfänden (+9 Mondsilber, wenn ihr siegt, −10% Angriff bis zum Ende)', flavorText: 'Die Truhe ist voll. Jeder Barren trägt ein Schild mit einem Namen. Einer heisst wie ihr.', effect: 'item', value: 9, itemId: 'mat_mondsilber', nachSieg: true, kostetAngriff: 10 },
        b: { label: 'Das Kleingeld (+2 Mondsilber)', flavorText: 'Zwei Barren liegen ohne Schild daneben. Der Vogt hat sie vergessen. Der Vogt vergisst nichts.', effect: 'item', value: 2, itemId: 'mat_mondsilber' },
      } },
      { type: 'boss', enemies: ['boss_argentis'] },
    ],
    bossId: 'boss_argentis',
    recommendedLevel: 'Stufe 15, Sets auf +5 und das Set aus dem Sternenschlund',
    unlockCondition: { bossesDefeated: ['boss_nyxar'] },
  },
  morgentor: {
    id: 'morgentor',
    name: 'Das Morgentor',
    tier: 10,
    rooms: 16,
    gebiet: 'mond',
    besonderheit: 'Die Sonnenuhr: Wer sie vorstellt, bekommt Sunnas Morgengabe, aber der Tag kommt früher, und mit ihm ihre Wut.',
    ersterSiegBeute: 'der_morgenstern',
    encounters: [
      { type: 'combat', enemies: ['daemmerfalke', 'torhueter'] },
      { type: 'combat', enemies: ['morgenhahn', 'lichtkuester'] },
      { type: 'find', wahl: {
        a: { label: 'Die Sonnenuhr vorstellen (+6 Mondsilber, wenn ihr siegt; Sunnas Wut 2 Runden früher)', flavorText: 'Die Sonnenuhr steht im Dunkeln und zeigt trotzdem etwas an. Man muss nur dran drehen.', effect: 'item', value: 6, itemId: 'mat_mondsilber', nachSieg: true, bossWutFrueher: 2 },
        b: { label: 'Die Uhr lassen (+2 Mondsilber)', flavorText: 'Unter der Uhr liegt, was der letzte Besucher verloren hat. Er hatte es eilig.', effect: 'item', value: 2, itemId: 'mat_mondsilber' },
      } },
      { type: 'combat', enemies: ['torhueter', 'daemmerfalke', 'lichtkuester'] },
      { type: 'hazard', damage: 22 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['daemmerfalke', 'daemmerfalke', 'morgenhahn'] },
      { type: 'rest', healPercent: 15 },
      { type: 'find', wahl: {
        a: { label: 'Die Uhr auf Vormittag stellen (+1 Set-Teil, wenn ihr siegt; Sunnas Wut 2 Runden früher)', flavorText: 'Sunnas Morgengabe liegt bereit, für den Tag, der zuerst kommt. Ihr könnt dafür sorgen, dass es dieser ist.', effect: 'kein', value: 0, setTeil: true, bossWutFrueher: 2 },
        b: { label: 'Die Uhr lassen (+3 Mondsilber)', flavorText: 'Der Lichtküster hat Mondsilber in der Opferschale. Er nennt es Spende, ihr nennt es Beute.', effect: 'item', value: 3, itemId: 'mat_mondsilber' },
      } },
      { type: 'combat', enemies: ['morgenhahn', 'torhueter', 'lichtkuester'] },
      { type: 'hazard', damage: 24 },
      { type: 'checkpoint' },
      { type: 'combat', enemies: ['lichtkuester', 'daemmerfalke', 'morgenhahn'] },
      { type: 'combat', enemies: ['torhueter', 'morgenhahn', 'daemmerfalke'] },
      { type: 'find', wahl: {
        a: { label: 'Die Uhr auf Mittag stellen (+10 Mondsilber, wenn ihr siegt; Sunnas Wut 2 Runden früher)', flavorText: 'Mittag. Hinter dem Tor wird es schlagartig hell, und jemand räuspert sich sehr laut.', effect: 'item', value: 10, itemId: 'mat_mondsilber', nachSieg: true, bossWutFrueher: 2 },
        b: { label: 'Im Schatten des Tors warten (+15% HP)', flavorText: 'Der Schatten ist schmal und wird schmaler. Sunna hat Zeit. Sie hat nur noch nicht entschieden, wie viel sie euch davon lässt.', effect: 'heal', value: 15 },
      } },
      { type: 'boss', enemies: ['boss_sunna'] },
    ],
    bossId: 'boss_sunna',
    recommendedLevel: 'Stufe 15, Sets auf +5 und das Pfand des Mondvogts',
    unlockCondition: { bossesDefeated: ['boss_argentis'] },
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
    recommendedLevel: 'Volle T2-Ausrüstung und Kriegsmaschine',
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
    recommendedLevel: 'Volle T3-Ausrüstung, Kriegsmaschine und Stufe 10+',
    unlockCondition: { bossesDefeated: ['boss_iron_commander'] },
  },

  // ── Ocean Routes ──
  ocean_shallows: {
    id: 'ocean_shallows',
    name: 'Versunkene Küste',
    tier: 2,
    rooms: 7,
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
    recommendedLevel: 'Volle T2-Ausrüstung',
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
    recommendedLevel: 'T3-Ausrüstung',
  },

  // ═══════════════════════════════════════════
  // ── PLACEHOLDER ROUTES (Dungeon Map Filler) ──
  // ═══════════════════════════════════════════

  forest_ruins: {
    id: 'forest_ruins',
    name: 'Verfallene Lichtung',
    tier: 1,
    rooms: 6,
    encounters: [
      { type: 'combat', enemies: ['forest_wolf', 'forest_spider'] },
      { type: 'combat', enemies: ['forest_bandit'] },
      { type: 'rest', healPercent: 30 },
      { type: 'combat', enemies: ['forest_wolf', 'forest_wolf'] },
      { type: 'hazard', damage: 5 },
      { type: 'combat', enemies: ['forest_bear', 'forest_bandit'] },
    ],
    bossId: null,
    recommendedLevel: 'Startausrüstung',
  },
  haunted_woods: {
    id: 'haunted_woods',
    name: 'Geisterwald',
    tier: 2,
    rooms: 9,
    encounters: [
      // Verfluchte Irrlichter tragen Mondkraut (loot_haunted_common), nie zwei im selben Kampf
      { type: 'combat', enemies: ['forest_wolf', 'cursed_wisp'] },
      { type: 'combat', enemies: ['forest_shaman', 'forest_spider'] },
      { type: 'checkpoint' },
      { type: 'hazard', damage: 8 },
      { type: 'combat', enemies: ['forest_bear', 'cursed_wisp', 'forest_wisp'] },
      { type: 'rest', healPercent: 20 },
      { type: 'combat', enemies: ['forest_shaman', 'forest_wolf', 'forest_wolf'] },
      { type: 'find', findGold: 12, findItems: [{ itemId: 'herb_moonwort', qty: 2 }] },
      { type: 'combat', enemies: ['forest_bear', 'forest_shaman', 'cursed_wisp'] },
    ],
    bossId: null,
    recommendedLevel: 'Eisenausrüstung',
  },
  cave_tunnels: {
    id: 'cave_tunnels',
    name: 'Verschlungene Tunnel',
    tier: 2,
    rooms: 7,
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
    recommendedLevel: 'Volle Eisenausrüstung',
    unlockCondition: { bossesDefeated: ['boss_crystal_golem'] },
  },
  crystal_mines: {
    id: 'crystal_mines',
    name: 'Kristallminen',
    tier: 3,
    rooms: 9,
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
    recommendedLevel: 'T2-Ausrüstung',
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
    recommendedLevel: 'T3-Ausrüstung und Luftkristalle',
    unlockCondition: { bossesDefeated: ['boss_leviathan'] },
  },
  swamp_village: {
    id: 'swamp_village',
    name: 'Sumpfdorf',
    tier: 2,
    rooms: 6,
    encounters: [
      { type: 'combat', enemies: ['leech_swarm', 'toxic_toad'] },
      { type: 'merchant' },
      { type: 'combat', enemies: ['rot_walker', 'leech_swarm'] },
      { type: 'rest', healPercent: 25 },
      { type: 'combat', enemies: ['swamp_troll'] },
      { type: 'find', findGold: 15, findItems: [{ itemId: 'herb_green', qty: 2 }] },
    ],
    bossId: null,
    recommendedLevel: 'Eisenausrüstung und T2-Teile',
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
    recommendedLevel: 'T2-Ausrüstung und Frostschutz',
    unlockCondition: { bossesDefeated: ['boss_fallen_knight'] },
  },
  shadow_catacombs: {
    id: 'shadow_catacombs',
    name: 'Schattenkatakomben',
    tier: 4,
    rooms: 10,
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
    recommendedLevel: 'Volle T2-Ausrüstung oder besser',
    unlockCondition: { bossesDefeated: ['boss_shadow_lich'] },
  },
  obsidian_tunnels: {
    id: 'obsidian_tunnels',
    name: 'Obsidiantunnel',
    tier: 3,
    rooms: 8,
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
    recommendedLevel: 'T2-Ausrüstung und Feuerschutz',
    unlockCondition: { bossesDefeated: ['boss_swamp_hydra'] },
  },
  ash_wastes: {
    id: 'ash_wastes',
    name: 'Aschewüste',
    tier: 4,
    rooms: 9,
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
    recommendedLevel: 'Volle T2-Ausrüstung und Stufe 8+',
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
    recommendedLevel: 'Volle T2-Ausrüstung und Stufe 8+',
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
  drachenhort: 'exp_drachenhort',
  himmelsarchiv: 'exp_himmelsarchiv',
  sternenschmiede: 'exp_sternenschmiede',
  sternenschlund: 'exp_sternenschlund',
  // Platzhalter, bis es ein eigenes Routenbild gibt (docs/NEUE-DUNGEONS.md, Bilder nur mit Christophs Okay)
  mondhof: 'exp_sternenschlund',
  morgentor: 'exp_sternenschmiede',
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

type RouteProgress = Pick<GameState, 'guildStats' | 'scoreboard' | 'bezwungen'>;

/** Route spielbar: Gildenrang ≥ Ebene und alle verlangten Bosse besiegt. */
export function isRouteAvailable(route: RouteDef, state: RouteProgress): boolean {
  return getRouteLockReasons(route, state).length === 0;
}

/**
 * Das Endgame: die Dungeons über dem Vulkankern (RouteDef.gebiet), von unten nach oben
 * wie auf der Dungeon-Karte. Neue Dungeons dort zählen von selbst mit.
 */
export function gipfelDungeons(): RouteDef[] {
  return DUNGEON_GRAPH
    .filter(n => ROUTE_DEFS[n.routeId]?.gebiet)
    .sort((a, b) => b.y - a.y)
    .map(n => ROUTE_DEFS[n.routeId]);
}

/**
 * Route bezwungen: Boss besiegt oder ohne Boss gewonnen (abgeschlossene Routen bleiben wiederholbar).
 * Liest den Merker GameState.bezwungen (systems/Bezwungen.ts), solange es ihn nicht gibt die Bestenliste.
 */
export function isRouteCompleted(routeId: string, state: RouteProgress): boolean {
  if (state.bezwungen && routeId in state.bezwungen) return true;
  const mitBoss = !!ROUTE_DEFS[routeId]?.bossId;
  return (state.scoreboard ?? []).some(s => s.routeId === routeId && s.status === 'victory' && (!mitBoss || s.bossesKilled > 0));
}

/** Gründe, warum die Route gesperrt ist; leer = verfügbar. */
export function getRouteLockReasons(route: RouteDef, state: RouteProgress): string[] {
  const reasons: string[] = [];
  // Ebenen über dem höchsten Gildenrang (Drachenhort, Himmelsarchiv …) brauchen den höchsten Rang
  const rang = rangFuerEbene(route.tier);
  if ((state.guildStats?.rank ?? 1) < rang) reasons.push(`Gildenrang ${rang} benötigt`);
  const defeated = state.guildStats?.bossesDefeatedIds ?? [];
  const missing = (route.unlockCondition?.bossesDefeated ?? []).filter(b => !defeated.includes(b));
  if (missing.length > 0) {
    reasons.push(`Besiege: ${missing.map(b => ENEMY_DEFS[b]?.name ?? b).join(', ')}`);
  }
  return reasons;
}
