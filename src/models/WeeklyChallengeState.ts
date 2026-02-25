/**
 * Persistierter State fuer die woechentliche Challenge eines Spielers.
 * Wird im GameState gespeichert (localStorage).
 */
export interface WeeklyChallengeState {
  /** Challenge-ID, z.B. "week_2026_09" */
  currentChallengeId: string;
  /** Bester erzielter Score in dieser Challenge */
  bestScore: number;
  /** Erreichte Medaille */
  medal: 'none' | 'bronze' | 'silver' | 'gold';
  /** Anzahl Versuche */
  attempts: number;
  /** Timestamp der ersten Medaillen-Erreichung (oder null) */
  completedAt: number | null;
}

/**
 * Erzeugt einen leeren Challenge-State fuer eine neue Woche.
 */
export function createEmptyWeeklyChallengeState(challengeId: string): WeeklyChallengeState {
  return {
    currentChallengeId: challengeId,
    bestScore: 0,
    medal: 'none',
    attempts: 0,
    completedAt: null,
  };
}
