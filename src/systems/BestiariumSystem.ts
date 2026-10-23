import { GameState } from '../models/GameState';
import { ENEMY_DEFS, ENEMY_LORE, EnemyDef } from '../data/enemies';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { zaehleSieg } from './Monsterkunde';

/** +5% loot bonus when all enemies of a route are defeated in the bestiarium */
export const BESTIARIUM_ROUTE_BONUS = 0.05;

const ROUTE_MAP: Record<string, string> = {
  forest: 'forest', wald: 'forest',
  cave: 'cave', höhle: 'cave', hohle: 'cave',
  swamp: 'swamp', sumpf: 'swamp',
  ruins: 'ruins', ruinen: 'ruins',
  volcano: 'volcano', vulkan: 'volcano',
};

export class BestiariumSystem {
  /**
   * Trägt nach dem Ende einer Expedition (Sieg, Niederlage, Rückzug) ein, was die Gilde gesehen hat.
   * Nur Räume, die gespielt wurden (`completed`, auch der Raum, in dem das Team fiel): Räume nach
   * einem Rückzug oder einer Niederlage hat niemand gesehen. Jeder Gegner mit hp <= 0 zählt +1
   * zur Jagdstrecke (Monsterkunde.ts), zwei Wölfe im Raum also +2.
   */
  processExpeditionEnd(state: GameState, run: ExpeditionRun): void {
    for (const room of run.rooms) {
      if (room.completed !== true) continue;
      for (const enemy of room.enemies) {
        if (!enemy.defId) continue;
        this.recordDiscovered(state, enemy.defId);
        if (enemy.hp <= 0) {
          // Erst zählen, dann in `defeated`: sonst zählte der erste Sieg wie ein alter Eintrag doppelt
          zaehleSieg(state, enemy.defId);
          this.recordDefeated(state, enemy.defId);
        }
      }
    }
  }

  recordDiscovered(state: GameState, defId: string): void {
    if (!state.bestiarium.discovered.includes(defId)) {
      state.bestiarium.discovered.push(defId);
    }
  }

  recordDefeated(state: GameState, defId: string): void {
    if (!state.bestiarium.defeated.includes(defId)) {
      state.bestiarium.defeated.push(defId);
    }
    this.recordDiscovered(state, defId);
  }

  /** Returns the entry or null if not yet discovered. */
  getEntry(
    state: GameState,
    defId: string,
  ): {
    discovered: boolean;
    defeated: boolean;
    enemy: EnemyDef | undefined;
  } | null {
    const discovered = state.bestiarium.discovered.includes(defId);
    if (!discovered) return null;
    return {
      discovered,
      defeated: state.bestiarium.defeated.includes(defId),
      enemy: ENEMY_DEFS[defId],
    };
  }

  /** Returns all discovered enemy IDs. */
  getAllDiscovered(state: GameState): string[] {
    return state.bestiarium.discovered;
  }

  /** Returns progress statistics. */
  getProgress(state: GameState): { discovered: number; defeated: number; total: number } {
    return {
      discovered: state.bestiarium.discovered.length,
      defeated: state.bestiarium.defeated.length,
      total: Object.keys(ENEMY_DEFS).length,
    };
  }

  /**
   * Returns loot bonus multiplier for a route if all enemies of that biome
   * are defeated in the bestiarium. Route ID like 'forest_short' → biome 'forest'.
   */
  getRouteLootBonus(state: GameState, routeId: string): number {
    const biome = routeId.split('_')[0];
    const normalizedBiome = ROUTE_MAP[biome.toLowerCase()] ?? biome.toLowerCase();

    const enemiesOnRoute = Object.keys(ENEMY_DEFS).filter(id => {
      const raw = (ENEMY_LORE[id]?.route ?? ENEMY_DEFS[id]?.route ?? '').toLowerCase();
      return (ROUTE_MAP[raw] ?? raw) === normalizedBiome;
    });

    if (enemiesOnRoute.length === 0) return 0;
    if (enemiesOnRoute.every(id => state.bestiarium.defeated.includes(id))) {
      return BESTIARIUM_ROUTE_BONUS;
    }
    return 0;
  }

  /** Check if a specific biome has all enemies defeated */
  isRouteComplete(state: GameState, biome: string): boolean {
    return this.getRouteLootBonus(state, biome + '_check') > 0;
  }
}
