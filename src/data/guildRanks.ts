/**
 * Guild Rank definitions (Rang I–V).
 * Checked at Run-Ende (after loot distribution).
 */

export interface GuildRankDef {
  rank: number;
  name: string;
  title: string;            // displayed banner text
  conditions: {
    forestShortCompleted?: number;
    forestMediumBossDefeated?: boolean;
    totalBossesDefeated?: number;
    guildHallT2?: boolean;
  };
  /** Was der Rang wirklich bringt (Text beim Aufstieg): Dungeons aus routeUnlocks,
   *  Gebäude mit freischaltung.gildenrang, Gildenhaus Stufe 2. Prüfung: tests/erfolge.test.ts */
  unlocks: string[];
  modifierUnlocks?: string[]; // modifier IDs (noch ohne Wirkung, darum nicht im Text)
  routeUnlocks?: string[];   // route IDs unlocked at this rank
}

export const GUILD_RANK_DEFS: GuildRankDef[] = [
  {
    rank: 1,
    name: 'Novize',
    title: 'Gilden-Rang I: Novize',
    conditions: {},
    unlocks: ['Dungeon: Waldpfad (kurz)'],
    routeUnlocks: ['forest_short'],
  },
  {
    rank: 2,
    name: 'Abenteurer',
    title: 'Gilden-Rang II: Abenteurer',
    conditions: { forestShortCompleted: 3 },
    unlocks: [
      'Dungeons: Tiefwald (mittel), Tiefe Höhle, Spinnenhöhle',
      'Gebäude: Arkanschmiede, Marktplatz (je mit Bauplan)',
    ],
    modifierUnlocks: ['iron_trial'],
    routeUnlocks: ['forest_medium', 'cave_deep', 'cave_spider'],
  },
  {
    rank: 3,
    name: 'Veteran',
    title: 'Gilden-Rang III: Veteran',
    conditions: { forestMediumBossDefeated: true },
    unlocks: [
      'Dungeons: Giftsumpf, Alte Krypta',
      'Gebäude: Bank (mit Bauplan)',
      'Gildenhaus auf Stufe 2 ausbauen (4 Helden je Expedition)',
    ],
    modifierUnlocks: ['death_march'],
    routeUnlocks: ['swamp_long', 'ruins_crypts'],
  },
  {
    rank: 4,
    name: 'Champion',
    title: 'Gilden-Rang IV: Champion',
    conditions: { totalBossesDefeated: 3 },
    unlocks: [
      'Dungeons: Tiefe Ruinen, Vulkankern',
      'Gebäude: Kriegsmaschinen-Werkstatt (mit Bauplan)',
    ],
    modifierUnlocks: ['speed_march'],
    routeUnlocks: ['ruins_depths', 'volcano_core'],
  },
  {
    rank: 5,
    name: 'Legende',
    title: 'Gilden-Rang V: Legende',
    conditions: { totalBossesDefeated: 5, guildHallT2: true },
    unlocks: ['Titel Gildenmeister (Erfolg «Gildenmeister»)'],
  },
];
