import { BuildingInstance } from './Building';
import { GuildFighter } from './GuildRoster';
import { ExpeditionRun } from './ExpeditionRun';
import { ScoreboardEntry } from './ScoreboardEntry';
import { WeeklyChallengeState } from './WeeklyChallengeState';
import { RanglisteStand } from './RanglisteStand';
import { AuftragsbrettStand, TrophaeenStand } from './AuftragsbrettStand';

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

/**
 * Der Spielstand der Gildenstadt (docs/GILDENSTADT.md): sechs Gebäude, ein Lager,
 * Helden und Expeditionen. Keine Bewohner, kein Raster, keine Stadt-Ereignisse.
 */
export interface GameState {
  // Gebäude (ein Gebäude je Art, systems/Ausbau.ts)
  buildings: BuildingInstance[];

  // Lager der Stadt (Gold steht als 'gold' darin)
  globalStock: Record<string, number>;

  // Guild
  fighters: GuildFighter[];

  // Active expedition
  activeExpedition: ExpeditionRun | null;

  // Time
  day: number;
  cityTickAccumulator: number;    // accumulates delta for 1.0s city tick
  dayTickAccumulator: number;     // accumulates delta for 60.0s day tick

  // Save
  saveVersion: number;

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

  // ── New in SaveVersion 5 ──

  // Freigeschaltete Achievements (IDs)
  achievements: string[];

  // ── New in SaveVersion 4 ──

  // Guild Rank System
  guildStats: GuildStats;

  // Classes unlocked (IDs beyond the starting 3)
  classesUnlocked: string[];

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

  // ── Schmiede (systems/Schmiede.ts) ──
  // Set-Teil → Stufe 1 bis 5, gilt für alle Exemplare. Fehlt in älteren Spielständen;
  // Schmiede.ts legt es beim ersten Verbessern an.
  schmiede?: { stufen: Record<string, number> };

  // ── Gildenhaus: Auftragsbrett und Trophäensaal (systems/Auftragsbrett.ts, systems/Trophaeensaal.ts) ──
  // Fehlen in älteren Spielständen; die Systeme legen sie beim ersten Aufruf an.
  auftragsbrett?: AuftragsbrettStand;
  trophaeen?: TrophaeenStand;

  // ── Baupläne ──
  // Bauplan-Item-IDs, die bereits als Erst-Sieg-Beute vergeben wurden (danach kein Drop mehr).
  erhalteneBauplaene: string[];
}

export function createNewGameState(): GameState {
  return {
    buildings: [],
    globalStock: {
      gold: 100, // reicht für den zweiten Helden (50) und den Bauplan der Schmiede (50), oder für Heiltränke
      bread: 5,
      healing_potion: 2,
      iron_scrap: 0,
      herb_green: 0,
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
    fighters: [],
    activeExpedition: null,
    day: 1,
    cityTickAccumulator: 0,
    dayTickAccumulator: 0,
    saveVersion: 1,
    rngSeed: Math.floor(Math.random() * 2147483647),
    scoreboard: [],
    statistics: {},
    achievements: [],
    bestiarium: { discovered: [], defeated: [] },
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
    classesUnlocked: ['guardian', 'ranger', 'cleric'],
    uiTheme: 'classic',
  };
}
