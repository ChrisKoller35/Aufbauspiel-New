export interface ModifierDef {
  id: string;
  name: string;
  description: string;
  scoreMult: number;
  unlockCondition: { bossesDefeated: string[]; minBossCount?: number };
}

export const MODIFIER_DEFS: Record<string, ModifierDef> = {
  curse_of_the_forest: {
    id: 'curse_of_the_forest', name: 'Fluch des Waldes',
    description: 'Raststätten heilen nicht.',
    scoreMult: 1.3,
    unlockCondition: { bossesDefeated: ['boss_elder_treant'] },
  },
  iron_trial: {
    id: 'iron_trial', name: 'Eiserne Prüfung',
    description: 'Party-Verteidigung halbiert.',
    scoreMult: 1.4,
    unlockCondition: { bossesDefeated: ['boss_crystal_golem'] },
  },
  death_march: {
    id: 'death_march', name: 'Todesmarsch',
    description: 'Keine Checkpoints.',
    scoreMult: 1.5,
    unlockCondition: { bossesDefeated: ['boss_swamp_hydra'] },
  },
  elite_guard: {
    id: 'elite_guard', name: 'Elitegarde',
    description: 'Jeder Kampfraum hat einen Gegner mehr.',
    scoreMult: 1.6,
    unlockCondition: { bossesDefeated: ['boss_fallen_knight'] },
  },
  speed_march: {
    id: 'speed_march', name: 'Eilmarsch',
    description: 'Kämpfe enden nach 10 Runden.',
    scoreMult: 1.3,
    unlockCondition: { bossesDefeated: [], minBossCount: 2 },
  },
  nemesis: {
    id: 'nemesis', name: 'Nemesis',
    description: 'Boss-HP verdoppelt.',
    scoreMult: 1.8,
    unlockCondition: { bossesDefeated: ['boss_shadow_lich'] },
  },
};
