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
  unlocks: string[];         // human-readable unlock descriptions
  modifierUnlocks?: string[]; // modifier IDs unlocked at this rank
  routeUnlocks?: string[];   // route IDs unlocked at this rank
}

export const GUILD_RANK_DEFS: GuildRankDef[] = [
  {
    rank: 1,
    name: 'Novize',
    title: 'Gilden-Rang I: Novize',
    conditions: {},
    unlocks: ['Alle MVP-Gebäude', 'Route: Waldpfad (kurz)'],
    routeUnlocks: ['forest_short'],
  },
  {
    rank: 2,
    name: 'Abenteurer',
    title: 'Gilden-Rang II: Abenteurer',
    conditions: { forestShortCompleted: 3 },
    unlocks: ['Route: Tiefwald (mittel)', 'Schmiede-Rezepte sichtbar'],
    modifierUnlocks: ['iron_trial'],
    routeUnlocks: ['forest_medium', 'cave_deep', 'cave_spider'],
  },
  {
    rank: 3,
    name: 'Veteran',
    title: 'Gilden-Rang III: Veteran',
    conditions: { forestMediumBossDefeated: true },
    unlocks: ['Guild Hall T2 Upgrade', 'Talisman-Crafting'],
    modifierUnlocks: ['death_march'],
    routeUnlocks: ['swamp_long', 'ruins_crypts'],
  },
  {
    rank: 4,
    name: 'Champion',
    title: 'Gilden-Rang IV: Champion',
    conditions: { totalBossesDefeated: 3 },
    unlocks: ['Weitere Routen', '+1 Proviant-Slot'],
    modifierUnlocks: ['speed_march'],
    routeUnlocks: ['ruins_depths', 'volcano_core'],
  },
  {
    rank: 5,
    name: 'Legende',
    title: 'Gilden-Rang V: Legende',
    conditions: { totalBossesDefeated: 5, guildHallT2: true },
    unlocks: ['Endgame-Banner „Gildenmeister"'],
  },
];
