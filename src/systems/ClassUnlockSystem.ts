import { GameState } from '../models/GameState';
import { CLASS_UNLOCK_CONDITIONS, STARTING_CLASSES } from '../data/classUnlocks';

/**
 * Manages class unlock progression.
 * Checked at expedition end after boss kills.
 */
export class ClassUnlockSystem {
  /**
   * Check for newly unlockable classes after expedition.
   * Returns array of newly unlocked class IDs.
   */
  checkUnlocks(state: GameState): string[] {
    const newlyUnlocked: string[] = [];

    for (const condition of CLASS_UNLOCK_CONDITIONS) {
      // Skip if already unlocked
      if (state.classesUnlocked.includes(condition.classId)) continue;

      let met = true;

      // Check boss defeat conditions
      if (condition.bossesDefeated) {
        for (const bossId of condition.bossesDefeated) {
          if (!state.guildStats.bossesDefeatedIds.includes(bossId)) {
            met = false;
            break;
          }
        }
      }

      // Check expedition count
      if (met && condition.expeditionsCompleted != null) {
        if (state.guildStats.totalExpeditionsCompleted < condition.expeditionsCompleted) {
          met = false;
        }
      }

      // Check class level requirement
      if (met && condition.classLevelRequired) {
        const { classId, level } = condition.classLevelRequired;
        const hasHighLevel = state.fighters.some(
          f => f.classId === classId && f.level >= level,
        );
        if (!hasHighLevel) met = false;
      }

      if (met) {
        state.classesUnlocked.push(condition.classId);
        newlyUnlocked.push(condition.classId);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Check if a specific class is unlocked for training.
   */
  isClassUnlocked(state: GameState, classId: string): boolean {
    return STARTING_CLASSES.includes(classId) || state.classesUnlocked.includes(classId);
  }
}
