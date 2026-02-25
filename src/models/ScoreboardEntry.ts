/** A single expedition run result stored in the scoreboard. */
export interface ScoreboardEntry {
  routeId: string;
  score: number;
  difficulty: string;
  modifier: string | null;
  status: 'victory' | 'defeat' | 'retreat';
  partyClasses: string[];   // class IDs of the party members
  timestamp: number;         // Date.now() at run completion
  day: number;               // in-game day when run completed
  enemiesKilled: number;
  bossesKilled: number;
}
