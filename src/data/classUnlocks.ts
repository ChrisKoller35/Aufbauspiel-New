/**
 * Class unlock conditions.
 * Checked at Run-Ende after boss kills.
 * Starting classes (guardian, ranger, cleric) are always unlocked.
 */

export interface ClassUnlockCondition {
  classId: string;
  /** Boss IDs that must have been defeated (any run, cumulative). */
  bossesDefeated?: string[];
  /** Total number of expeditions completed. */
  expeditionsCompleted?: number;
  /** Requires a specific class at a minimum level. */
  classLevelRequired?: { classId: string; level: number };
}

export const CLASS_UNLOCK_CONDITIONS: ClassUnlockCondition[] = [
  // Always unlocked
  // guardian, ranger, cleric – no conditions

  {
    classId: 'berserker',
    bossesDefeated: ['boss_elder_treant'],
  },
  {
    classId: 'assassin',
    bossesDefeated: ['boss_crystal_golem'],
  },
  {
    classId: 'paladin',
    classLevelRequired: { classId: 'guardian', level: 5 },
    bossesDefeated: ['boss_elder_treant'],
  },
  {
    classId: 'bard',
    expeditionsCompleted: 10,
  },
  {
    classId: 'witch',
    bossesDefeated: ['boss_crystal_golem'],
  },
  {
    classId: 'necromancer',
    bossesDefeated: ['boss_shadow_lich'],
  },
  {
    classId: 'druid',
    bossesDefeated: ['boss_elder_treant', 'boss_swamp_hydra'],
  },
];

/** Starting classes that are always unlocked. */
export const STARTING_CLASSES = ['guardian', 'ranger', 'cleric'];
