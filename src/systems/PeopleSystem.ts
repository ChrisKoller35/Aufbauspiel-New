import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { CLASS_DEFS } from '../data/classes';
import { createCitizen } from '../models/Citizen';
import { createGuildFighter } from '../models/GuildRoster';
import { wohnKapazitaet, arbeitsplaetze } from './Ausbau';

/** So viele Bewohner werden von einem Brot pro Tag satt. */
export const BEWOHNER_JE_BROT = 8;

/**
 * Brot, das die Bewohner jeden Tag essen: 1 je volle 8 Bewohner, mindestens 1 (6 = 1, 15 = 1, 16 = 2, 36 = 4).
 * So reicht die Brotkette auf der Stufe, die eine Stadtstufe erlaubt, für ihr volles Wohnviertel
 * (tests/startwirtschaft.test.ts); mit 1 je angefangene 6 fehlte im Weiler, Marktflecken und in der
 * Grossstadt jeden Tag Brot, ohne dass man etwas ausbauen konnte.
 */
export function brotProTag(bewohner: number): number {
  return bewohner <= 0 ? 0 : Math.max(1, Math.floor(bewohner / BEWOHNER_JE_BROT));
}

/** Brot, das die Stadt pro Tag braucht: was die Bewohner essen und, solange Platz ist, 1 für den nächsten Bewohner. */
export function brotBedarfProTag(state: GameState): number {
  const bewohner = state.citizens.length;
  return brotProTag(bewohner) + (bewohner < wohnKapazitaet(state) ? 1 : 0);
}

/** Brot, das nach dem Essen beim nächsten Tageswechsel noch im Lager liegt (nie unter 0). */
export function brotNachEssen(state: GameState): number {
  return Math.max(0, (state.globalStock.bread ?? 0) - brotProTag(state.citizens.length));
}

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

      // Stufe N = N Arbeitsplätze (systems/Ausbau.ts)
      while (building.assignedWorkerIds.length < arbeitsplaetze(building)) {
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
   * Tageswechsel: erst essen die Bewohner (brotProTag), dann wächst die Stadt.
   * Ein neuer Bewohner kommt nur mit freiem Platz und wenn nach dem Essen noch
   * Brot übrig ist; er kostet 1 Brot. Fehlt Brot, zieht niemand aus, nur die
   * Zufriedenheit sinkt (SatisfactionSystem). Das Lager wird nie negativ.
   */
  dayTick(state: GameState): void {
    state.globalStock.bread = brotNachEssen(state);

    if (state.citizens.length < wohnKapazitaet(state) && state.globalStock.bread >= 1) {
      state.globalStock.bread -= 1;
      state.citizens.push(createCitizen('IDLE'));
      state.statistics.total_citizens_born = (state.statistics.total_citizens_born ?? 0) + 1;
    }
  }
}
