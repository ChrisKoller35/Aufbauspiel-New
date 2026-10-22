/**
 * Guild Rank definitions (Rang I–V).
 * Checked at Run-Ende (after loot distribution).
 * Welche Dungeons ein Rang öffnet, steht nicht hier, sondern in route.tier (rangFuerEbene);
 * den Text beim Aufstieg baut rangFreischaltungen() in systems/GuildRankSystem.ts aus den
 * Dungeons, den Gebäuden (freischaltung.gildenrang) und dem Gildenhaus-Ausbau.
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
  /** Was der Rang sonst noch bringt (Text beim Aufstieg, nach Dungeons, Gebäuden und Ausbau). Prüfung: tests/erfolge.test.ts */
  unlocks: string[];
  modifierUnlocks?: string[]; // modifier IDs (noch ohne Wirkung, darum nicht im Text)
}

export const GUILD_RANK_DEFS: GuildRankDef[] = [
  {
    rank: 1,
    name: 'Novize',
    title: 'Gilden-Rang I: Novize',
    conditions: {},
    unlocks: [],
  },
  {
    rank: 2,
    name: 'Abenteurer',
    title: 'Gilden-Rang II: Abenteurer',
    conditions: { forestShortCompleted: 3 },
    unlocks: [],
    modifierUnlocks: ['iron_trial'],
  },
  {
    rank: 3,
    name: 'Veteran',
    title: 'Gilden-Rang III: Veteran',
    conditions: { forestMediumBossDefeated: true },
    unlocks: [],
    modifierUnlocks: ['death_march'],
  },
  {
    rank: 4,
    name: 'Champion',
    title: 'Gilden-Rang IV: Champion',
    conditions: { totalBossesDefeated: 3 },
    unlocks: [],
    modifierUnlocks: ['speed_march'],
  },
  {
    rank: 5,
    name: 'Legende',
    title: 'Gilden-Rang V: Legende',
    conditions: { totalBossesDefeated: 5, guildHallT2: true },
    unlocks: ['Titel: Gildenmeister (Erfolg «Gildenmeister»)'],
  },
];

/**
 * Gildenrang, den ein Dungeon dieser Ebene (route.tier) braucht: Ebene 1 bis 5 den gleichen Rang,
 * alles darüber den höchsten (Drachenhort, Himmelsarchiv, Sternenschmiede …). Die Sperre auf der
 * Karte (data/routes.ts) und der Text beim Aufstieg lesen beide diese Regel.
 */
export function rangFuerEbene(ebene: number): number {
  return Math.min(Math.max(1, Math.floor(ebene)), GUILD_RANK_DEFS.length);
}
