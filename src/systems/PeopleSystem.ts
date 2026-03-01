import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { CLASS_DEFS } from '../data/classes';
import { createCitizen } from '../models/Citizen';
import { createGuildFighter } from '../models/GuildRoster';

/**
 * Handles worker auto-assignment, guild training, and population growth.
 */
export class PeopleSystem {
  /**
   * City tick (1.0s): auto-assign workers + advance training timers.
   */
  cityTick(state: GameState, deltaSec: number = 1.0): void {
    // Auto-assign workers
    for (const building of state.buildings) {
      if (!building.built) continue;
      const def = BUILDING_DEFS[building.typeId];
      if (def.workerSlots <= 0) continue;
      if (def.requiresConnectivity && !building.connected) continue;

      while (building.assignedWorkerIds.length < def.workerSlots) {
        const idle = state.citizens.find(c => c.status === 'IDLE');
        if (!idle) break;

        idle.status = 'WORKER';
        idle.assignedBuildingId = building.id;
        building.assignedWorkerIds.push(idle.id);
      }
    }

    // Advance guild training timers
    for (const citizen of state.citizens) {
      if (citizen.status === 'GUILD_TRAINING') {
        citizen.trainingTimer -= deltaSec;
        if (citizen.trainingTimer <= 0) {
          this.completeTraining(state, citizen);
        }
      }

      // Advance injury recovery
      if (citizen.status === 'INJURED_REST') {
        citizen.injuryTimer -= deltaSec;
        if (citizen.injuryTimer <= 0) {
          // If citizen is a fighter, return to GUILD_FIGHTER (not IDLE)
          citizen.status = citizen.fighterId != null ? 'GUILD_FIGHTER' : 'IDLE';
          citizen.injuryTimer = 0;
        }
      }
    }
  }

  private completeTraining(state: GameState, citizen: import('../models/Citizen').Citizen): void {
    const classId = citizen.trainingClassId;
    if (!classId) return;

    const classDef = CLASS_DEFS[classId];
    if (!classDef) return;

    // Create fighter
    const fighter = createGuildFighter(
      citizen.id,
      classId,
      `${classDef.name} #${state.fighters.length + 1}`,
      { ...classDef.baseStats },
    );

    state.fighters.push(fighter);

    // Track statistic
    state.statistics.total_fighters_trained = (state.statistics.total_fighters_trained ?? 0) + 1;

    // Update citizen
    citizen.status = 'GUILD_FIGHTER';
    citizen.fighterId = fighter.id;
    citizen.trainingClassId = null;
    citizen.trainingTimer = 0;
  }

  /**
   * Day tick (60s): population growth.
   * Spawns a new citizen if there's housing capacity, bread available.
   */
  dayTick(state: GameState): void {
    const housingCapacity = this.getHousingCapacity(state);
    const currentPop = state.citizens.length;

    if (currentPop < housingCapacity && (state.globalStock.bread ?? 0) >= 1) {
      state.globalStock.bread -= 1;
      state.citizens.push(createCitizen('IDLE'));
      state.statistics.total_citizens_born = (state.statistics.total_citizens_born ?? 0) + 1;
    }
  }

  private getHousingCapacity(state: GameState): number {
    let capacity = 0;
    for (const building of state.buildings) {
      if (!building.built) continue;
      const def = BUILDING_DEFS[building.typeId];
      if (!def.housing) continue;
      if (def.requiresConnectivity && !building.connected) continue;
      capacity += def.housing.capacity;
    }
    return capacity;
  }
}
