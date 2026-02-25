/**
 * Achievement-Definitionen fuer Magic City.
 * 12 Errungenschaften basierend auf state.statistics-Keys.
 */

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  condition: (stats: Record<string, number>) => boolean;
  icon?: string; // optionaler Sprite-Key
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_building',
    name: 'Grundsteinlegung',
    description: 'Errichte dein erstes Gebaeude.',
    condition: (stats) => (stats['total_buildings_built'] ?? 0) >= 1,
  },
  {
    id: 'first_expedition',
    name: 'Abenteuerlust',
    description: 'Starte deine erste Expedition.',
    condition: (stats) => (stats['total_expeditions'] ?? 0) >= 1,
  },
  {
    id: 'first_victory',
    name: 'Siegreich',
    description: 'Kehre siegreich von einer Expedition zurueck.',
    condition: (stats) => (stats['total_victories'] ?? 0) >= 1,
  },
  {
    id: 'first_boss',
    name: 'Bossbekaempfer',
    description: 'Besiege deinen ersten Boss.',
    condition: (stats) => (stats['total_bosses_killed'] ?? 0) >= 1,
  },
  {
    id: 'gold_hoarder',
    name: 'Goldhamster',
    description: 'Verdiene insgesamt 500 Gold.',
    condition: (stats) => (stats['total_gold_earned'] ?? 0) >= 500,
  },
  {
    id: 'mass_builder',
    name: 'Baumeister',
    description: 'Errichte insgesamt 20 Gebaeude.',
    condition: (stats) => (stats['total_buildings_built'] ?? 0) >= 20,
  },
  {
    id: 'veteran_explorer',
    name: 'Veteran',
    description: 'Schliesse 10 Expeditionen ab.',
    condition: (stats) => (stats['total_expeditions'] ?? 0) >= 10,
  },
  {
    id: 'boss_slayer',
    name: 'Bosskiller',
    description: 'Besiege 5 Bosse.',
    condition: (stats) => (stats['total_bosses_killed'] ?? 0) >= 5,
  },
  {
    id: 'survivor_100',
    name: 'Ueberlebenskuenstler',
    description: 'Ueberblebe 100 Tage in deiner Stadt.',
    condition: (stats) => (stats['total_days_survived'] ?? 0) >= 100,
  },
  {
    id: 'army_builder',
    name: 'Armeefuehrer',
    description: 'Bilde 10 Kaempfer aus.',
    condition: (stats) => (stats['total_fighters_trained'] ?? 0) >= 10,
  },
  {
    id: 'kill_100',
    name: 'Hundertfacher Tod',
    description: 'Besiege 100 Gegner.',
    condition: (stats) => (stats['total_enemies_killed'] ?? 0) >= 100,
  },
  {
    id: 'perfectionist',
    name: 'Perfektionist',
    description: 'Gewinne eine Expedition ohne einen einzigen Verlust.',
    condition: (stats) => (stats['total_flawless_victories'] ?? 0) >= 1,
  },
];
