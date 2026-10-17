// ─── Magic City – GuildTabContext ────────────────────────────────────────────
// Shared mutable state + callbacks that all tab components need access to.
// Passed by reference so changes made in any tab are visible everywhere.
// ─────────────────────────────────────────────────────────────────────────────

import { GameState } from '../../../models/GameState';
import { GuildFighter } from '../../../models/GuildRoster';
import { GearSystem } from '../../../systems/GearSystem';
import { TalismanSystem } from '../../../systems/TalismanSystem';

export interface GuildTabContext {
  // ── Mutable state ────────────────────────────────────────────────────────
  lastState: GameState | null;
  selectedDifficulty: string;
  selectedModifier: string | null;
  scoreboardRouteFilter: string | null;
  heroInventoryOpen: Set<number>;
  heroDetailsOpen: Set<number>;
  selectedFighterIds: Set<number>;
  partySlots: number;

  // ── Systems ──────────────────────────────────────────────────────────────
  gearSystem: GearSystem;
  talismanSystem: TalismanSystem;

  // ── Callbacks ────────────────────────────────────────────────────────────
  /** Trigger a full re-render of the currently active tab. */
  refresh(): void;

  /** Start training a citizen in the given class. */
  startTraining(
    state: GameState,
    classId: string,
    trainingDef: {
      trainingTimeSec: number;
      trainingCost: Record<string, number>;
    },
  ): void;

  /** Retire a fighter (unequip, restore citizen to IDLE, remove from roster). */
  retireFighter(state: GameState, fighter: GuildFighter): void;

  /** Expedition start callback (set by HTMLGuildUI, wired from UIManager). */
  onStartExpedition?: (
    routeId: string,
    fighterIds: number[],
    difficulty: string,
    modifierId: string | null,
  ) => void;

  /** Hide the whole Guild panel (e.g. after starting expedition). */
  hidePanel(): void;

  /** Show the class-detail modal. */
  showClassDetailModal(cls: import('../../../data/classes').ClassDef): void;

  /** Show the hero-detail modal. */
  showHeroDetailModal(fighter: GuildFighter, state: GameState): void;
}
