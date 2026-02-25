import { ACHIEVEMENT_DEFS } from '../data/achievements';

/**
 * Achievement-System: Prueft ob neue Errungenschaften freigeschaltet wurden.
 */
export class AchievementSystem {
  /**
   * Prueft alle Achievements gegen die aktuellen Statistiken.
   * Gibt die IDs aller NEU freigeschalteten Achievements zurueck.
   *
   * @param stats - state.statistics (Record<string, number>)
   * @param unlockedIds - state.achievements (bereits freigeschaltete IDs)
   * @returns Array der neu freigeschalteten Achievement-IDs
   */
  checkAchievements(
    stats: Record<string, number>,
    unlockedIds: string[],
  ): string[] {
    const newlyUnlocked: string[] = [];

    for (const def of ACHIEVEMENT_DEFS) {
      // Schon freigeschaltet? Ueberspringen.
      if (unlockedIds.includes(def.id)) continue;

      // Bedingung erfuellt?
      if (def.condition(stats)) {
        newlyUnlocked.push(def.id);
      }
    }

    return newlyUnlocked;
  }
}
