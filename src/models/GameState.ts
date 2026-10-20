import { BuildingInstance } from './Building';
import { Citizen } from './Citizen';
import { GuildFighter } from './GuildRoster';
import { ExpeditionRun } from './ExpeditionRun';
import { ScoreboardEntry } from './ScoreboardEntry';
import { WeeklyChallengeState } from './WeeklyChallengeState';
import { RanglisteStand } from './RanglisteStand';

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

/** Der Weg zur Magischen Stadt (systems/Stadtweg.ts, data/stadtstufen.ts). */
export interface StadtwegStand {
  stufe: number;          // Stadtstufe 1 (Lagerfeuer) bis 7 (Magische Stadt)
  herzsteine: string[];   // eingesetzte Herzsteine (HerzsteinDef.id)
  gelesen: number;        // höchstes gelesene Kapitel der Stadtchronik
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

  // ── New in SaveVersion 6 ──
  bestiarium: {
    discovered: string[];  // enemy IDs, die mindestens 1x angetroffen wurden
    defeated: string[];    // enemy IDs, die mindestens 1x besiegt wurden
  };
  rescuedNpcs: string[];           // NPC IDs aus npcs.ts
  warMachineInventory: string[];   // Item-IDs der Kriegsmaschinen im Lager
  selectedWarMachine: string | null; // Ausgewählte Kriegsmaschine für nächste Expedition

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

  // UI theme: 'classic' (default gold) or 'holo' (sci-fi neon)
  uiTheme: 'classic' | 'holo';

  // ── Loot Chest (SaveVersion 9) ──
  // Items accumulate here after each expedition; player opens chest to collect.
  pendingChestLoot: {
    items: Record<string, number>; // itemId → qty (gold stored as 'gold')
    expeditionCount: number;       // how many expeditions contributed
  };

  // ── Stadtweg ──
  // Fehlt in älteren Spielständen; Stadtweg.ts legt es bei Bedarf an.
  stadtweg?: StadtwegStand;

  // ── Geschichten der Dungeons (systems/Geschichten.ts) ──
  // Fehlt in älteren Spielständen. gelesen: Einleitung schon gezeigt; erlebt: Geschichte bis zum Sieg gespielt.
  geschichten?: { gelesen: string[]; erlebt: string[] };

  // ── Bezwungene Dungeons (systems/Bezwungen.ts) ──
  // Dungeon → Runde der Rangliste beim ersten echten Sieg (0 = davor). Vergisst nichts, anders als
  // die Bestenliste. Fehlt in älteren Spielständen; Bezwungen.ts legt es beim ersten Aufruf an.
  bezwungen?: Record<string, number>;

  // ── Rangliste mit Rivalen (systems/Rangliste.ts) ──
  // Fehlt in älteren Spielständen; Rangliste.ts legt es beim ersten Aufruf an.
  rangliste?: RanglisteStand;

  // ── Baupläne ──
  // Bauplan-Item-IDs, die bereits als Erst-Sieg-Beute vergeben wurden (danach kein Drop mehr).
  erhalteneBauplaene: string[];

  // ── Terrain editor data (dev tool) ──
  // key = "gx,gy", value = variant index (0=light, 1=medium, 2=deep)
  swampTiles?: Record<string, number>;
  grayTiles?:  Record<string, number>;
  dirtTiles?:  Record<string, number>;
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
      novizenrobe: 1,
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
    bestiarium: { discovered: [], defeated: [] },
    rescuedNpcs: [],
    warMachineInventory: [],
    selectedWarMachine: null,
    pendingChestLoot: { items: {}, expeditionCount: 0 },
    erhalteneBauplaene: [],
    stadtweg: { stufe: 1, herzsteine: [], gelesen: 0 },
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
    uiTheme: 'classic',
    swampTiles: {
      // Hand-placed swamp layout (exported from in-game editor, 2026-03-10)
      '1,9': 2, '0,9': 2, '0,8': 2, '0,7': 2, '0,6': 2, '0,5': 1,
      '1,8': 2, '1,7': 2, '1,6': 1, '1,10': 2, '1,11': 2, '1,12': 2,
      '2,12': 2, '2,9': 2, '1,14': 2, '0,15': 2, '1,13': 2, '2,13': 2,
      '1,15': 2, '0,16': 2, '2,11': 2, '2,10': 2, '2,8': 2,
      '3,9': 2, '4,9': 2, '4,8': 1, '3,8': 2, '3,13': 2, '3,14': 2,
      '3,11': 2, '4,10': 2, '5,9': 2, '4,13': 2, '4,12': 2,
      '2,14': 2, '2,16': 2, '0,14': 2,
      '9,13': 1, '8,13': 1, '7,13': 1, '6,13': 1,
      '10,15': 1, '9,15': 1, '8,15': 1, '7,14': 1,
      '9,16': 1, '9,17': 1, '10,17': 1, '8,17': 1, '8,16': 1,
      '10,19': 1, '9,19': 1, '9,18': 0, '9,20': 1, '9,22': 1,
      '12,19': 0, '12,20': 0, '12,18': 0, '12,21': 0, '12,22': 0,
      '12,24': 2, '11,24': 2, '11,22': 0, '13,23': 0, '12,23': 2,
      '10,18': 0, '11,20': 0, '10,23': 0, '11,18': 0,
      '11,16': 0, '11,14': 0, '10,14': 0,
      '10,10': 0, '10,11': 0, '11,10': 0, '12,11': 0, '12,10': 0,
      '12,12': 0, '11,11': 0, '11,12': 0,
      '11,25': 2, '10,25': 2, '8,25': 2, '6,25': 0, '4,25': 0, '2,25': 0, '0,25': 0,
      '5,24': 0, '3,24': 1, '3,23': 1,
      '6,22': 2, '7,25': 2, '7,23': 2, '8,24': 0, '7,24': 0, '7,22': 2,
      '9,24': 2, '10,24': 2, '13,24': 2, '12,25': 2,
      '1,19': 1, '0,19': 1, '3,18': 1, '1,20': 1, '0,20': 1,
    },
  };
}
