import { GameState } from '../models/GameState';
import { ENEMY_DEFS, EnemyDef } from '../data/enemies';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { anzahlBesiegt, erreichbareGegner, gesichtet, zaehleSieg } from './Monsterkunde';

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

  /**
   * Stand des Monsterbuchs, nur über die erreichbaren Gegner (die in einer Route vorkommen):
   * gesichtet, mindestens einmal besiegt, wie viele es gibt. Die Kopfzeile des Monsterbuchs zeigt genau das.
   */
  getProgress(state: GameState): { discovered: number; defeated: number; total: number } {
    const gegner = erreichbareGegner();
    return {
      discovered: gegner.filter(id => gesichtet(state, id)).length,
      defeated: gegner.filter(id => anzahlBesiegt(state, id) > 0).length,
      total: gegner.length,
    };
  }
}
