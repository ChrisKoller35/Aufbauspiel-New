export interface DifficultyDef {
  id: string;
  name: string;
  description: string;
  enemyHpMult: number;
  enemyAtkMult: number;
  enemyDefBonus: number;
  scoreMult: number;
}

export const DIFFICULTY_DEFS: Record<string, DifficultyDef> = {
  normal: {
    id: 'normal', name: 'Normal', description: 'Standard-Schwierigkeit',
    enemyHpMult: 1.0, enemyAtkMult: 1.0, enemyDefBonus: 0, scoreMult: 1.0,
  },
  hard: {
    id: 'hard', name: 'Schwer', description: 'Gegner sind stärker',
    enemyHpMult: 1.3, enemyAtkMult: 1.2, enemyDefBonus: 1, scoreMult: 1.5,
  },
  nightmare: {
    id: 'nightmare', name: 'Albtraum', description: 'Nur für Veteranen',
    enemyHpMult: 1.6, enemyAtkMult: 1.4, enemyDefBonus: 2, scoreMult: 2.0,
  },
  infernal: {
    id: 'infernal', name: 'Infernal', description: 'Gnade ist keine Option',
    enemyHpMult: 2.0, enemyAtkMult: 1.6, enemyDefBonus: 3, scoreMult: 3.0,
  },
};
