import { GameState } from '../models/GameState';
import { CLASS_UNLOCK_CONDITIONS, STARTING_CLASSES } from '../data/classUnlocks';

/** Eine Bedingung zum Freischalten und wie weit die Gilde ist */
export type FreischaltSchritt =
  | { art: 'boss'; bossId: string; ist: number; soll: 1; fertig: boolean }
  | { art: 'expeditionen'; ist: number; soll: number; fertig: boolean }
  /** ist = höchste Stufe eines Helden dieser Klasse, 0 ohne solchen Helden */
  | { art: 'stufe'; classId: string; ist: number; soll: number; fertig: boolean };

export interface KlassenFortschritt {
  /** Startklasse: von Anfang an frei, ohne Bedingung */
  start: boolean;
  /** Schon freigeschaltet (Startklasse oder classesUnlocked) */
  frei: boolean;
  schritte: FreischaltSchritt[];
  /** Alle Bedingungen erfüllt: checkUnlocks schaltet die Klasse frei */
  fertig: boolean;
}

/**
 * Wie weit die Gilde mit den Bedingungen einer Klasse ist (Klassen-Tafel im Reiter «Anheuern»).
 * checkUnlocks entscheidet mit genau dieser Rechnung: Anzeige und Freischaltung laufen nie auseinander.
 */
export function fortschritt(state: GameState, classId: string): KlassenFortschritt {
  const start = STARTING_CLASSES.includes(classId);
  const frei = start || state.classesUnlocked.includes(classId);
  const condition = CLASS_UNLOCK_CONDITIONS.find(c => c.classId === classId);
  const schritte: FreischaltSchritt[] = [];

  for (const bossId of condition?.bossesDefeated ?? []) {
    const ist = state.guildStats.bossesDefeatedIds.includes(bossId) ? 1 : 0;
    schritte.push({ art: 'boss', bossId, ist, soll: 1, fertig: ist === 1 });
  }
  if (condition?.expeditionsCompleted != null) {
    // totalExpeditionsCompleted zählt nur gewonnene Expeditionen (GuildRankSystem.updateStats)
    const ist = state.guildStats.totalExpeditionsCompleted;
    const soll = condition.expeditionsCompleted;
    schritte.push({ art: 'expeditionen', ist, soll, fertig: ist >= soll });
  }
  if (condition?.classLevelRequired) {
    const { classId: noetig, level } = condition.classLevelRequired;
    const ist = state.fighters.filter(f => f.classId === noetig).reduce((m, f) => Math.max(m, f.level), 0);
    schritte.push({ art: 'stufe', classId: noetig, ist, soll: level, fertig: ist >= level });
  }

  return { start, frei, schritte, fertig: !!condition && schritte.every(s => s.fertig) };
}

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

      if (fortschritt(state, condition.classId).fertig) {
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
