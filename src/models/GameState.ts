import { BuildingInstance } from './Building';
import { Citizen } from './Citizen';
import { GuildFighter } from './GuildRoster';
import { ExpeditionRun } from './ExpeditionRun';
import { ScoreboardEntry } from './ScoreboardEntry';
import { WeeklyChallengeState } from './WeeklyChallengeState';

export interface TileData {
  buildingId: number | null; // which building occupies this tile
  isRoad: boolean;
}

/** Active city event state (persisted). */
export interface ActiveCityEvent {
  eventId: string;
  remainingSec: number;
  accepted?: boolean;      // for trade events: player accepted the offer
  pausedBuildingId?: number; // for storm: which building is paused
}

/** Guild stats for rank progression. */
export interface GuildStats {
  rank: number;
  forestShortCompleted: number;
  forestMediumBossDefeated: boolean;
  totalBossesDefeated: number;
  totalExpeditionsCompleted: number;
  bossesDefeatedIds: string[];   // unique boss IDs ever defeated
  guildHallT2: boolean;
}

/** Specialist assignment: maps specialistId → buildingId. */
export interface SpecialistAssignment {
  specialistId: string;
  assignedBuildingId: number | null;
}

export interface GameState {
  // Grid
  grid: (TileData | null)[][]; // [y][x], null = empty grass

  // Buildings
  buildings: BuildingInstance[];

  // Global stockpile
  globalStock: Record<string, number>;

  // Citizens
  citizens: Citizen[];

  // Guild
  fighters: GuildFighter[];

  // Active expedition
  activeExpedition: ExpeditionRun | null;

  // Time
  day: number;
  cityTickAccumulator: number;    // accumulates delta for 1.0s city tick
  dayTickAccumulator: number;     // accumulates delta for 60.0s day tick
  eventTickAccumulator: number;   // accumulates delta for 180s event check

  // Save
  saveVersion: number;

  // Tutorial
  tutorial: {
    phase: number;     // 1, 2, 3, or done
    currentStep: number;
    done: boolean;
  };

  // RNG
  rngSeed: number;

  // Scoreboard – top expedition results
  scoreboard: ScoreboardEntry[];

  // Weekly Challenge tracking
  weeklyChallenge?: WeeklyChallengeState;

  // Statistics (for future use)
  statistics: Record<string, number>;

  // ── New in SaveVersion 5 ──

  // Freigeschaltete Achievements (IDs)
  achievements: string[];

  // ── New in SaveVersion 4 ──

  // Guild Rank System
  guildStats: GuildStats;

  // City Events
  activeEvent: ActiveCityEvent | null;

  // Specialists
  specialists: SpecialistAssignment[];

  // Talisman inventory (crafted talismans, by ID)
  talismanInventory: string[];

  // Selected talisman for next expedition
  selectedTalisman: string | null;

  // Classes unlocked (IDs beyond the starting 3)
  classesUnlocked: string[];

  // Satisfaction cache (calculated each tick, not persisted on save)
  satisfaction: number;
}

export function createNewGameState(): GameState {
  // Initialize 40x36 grid
  const grid: (TileData | null)[][] = [];
  for (let y = 0; y < 36; y++) {
    grid[y] = [];
    for (let x = 0; x < 40; x++) {
      grid[y][x] = null;
    }
  }

  return {
    grid,
    buildings: [],
    globalStock: {
      wood: 80,
      stone: 15,
      grain: 0,
      flour: 0,
      bread: 5,
      gold: 75,
      iron_scrap: 0,
      herb_green: 0,
      healing_potion: 0,
      power_bread: 0,
      iron_sword: 0,
      iron_shield: 0,
      leather_armor: 0,
      hunter_bow: 0,
      oak_staff: 0,
      wolf_fang_necklace: 0,
      crystal_shard: 0,
      talisman_fragment: 0,
    },
    citizens: [],
    fighters: [],
    activeExpedition: null,
    day: 1,
    cityTickAccumulator: 0,
    dayTickAccumulator: 0,
    eventTickAccumulator: 0,
    saveVersion: 1,
    tutorial: { phase: 1, currentStep: 0, done: false },
    rngSeed: Math.floor(Math.random() * 2147483647),
    scoreboard: [],
    statistics: {},
    achievements: [],
    // SaveVersion 4 fields
    guildStats: {
      rank: 1,
      forestShortCompleted: 0,
      forestMediumBossDefeated: false,
      totalBossesDefeated: 0,
      totalExpeditionsCompleted: 0,
      bossesDefeatedIds: [],
      guildHallT2: false,
    },
    activeEvent: null,
    specialists: [],
    talismanInventory: [],
    selectedTalisman: null,
    classesUnlocked: ['guardian', 'ranger', 'cleric'],
    satisfaction: 50,
  };
}
