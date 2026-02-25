import { GameState, ActiveCityEvent } from '../models/GameState';
import { CITY_EVENT_DEFS, pickRandomEvent } from '../data/cityEvents';
import { BUILDING_DEFS } from '../data/buildings';

/**
 * Manages city events: triggering, processing, and expiring.
 * Trigger check: every 3 day-ticks (180s), 50% chance.
 * Only one active event at a time.
 */
export class CityEventSystem {
  /**
   * Called every day tick (60s). Manages event timer + trigger logic.
   */
  dayTick(state: GameState): void {
    // Tick down active event
    if (state.activeEvent) {
      state.activeEvent.remainingSec -= 60; // day tick = 60s
      if (state.activeEvent.remainingSec <= 0) {
        this.expireEvent(state);
      }
    }

    // Event trigger check accumulator (in eventTickAccumulator)
    // Every 3 day-ticks (180s) → check for new event
    state.eventTickAccumulator += 60;
    if (state.eventTickAccumulator >= 180) {
      state.eventTickAccumulator = 0;

      // Only trigger if no active event
      if (!state.activeEvent) {
        // 50% chance
        const rng = this.seededRandom(state);
        if (rng() < 0.5) {
          this.triggerEvent(state, rng);
        }
      }
    }
  }

  private triggerEvent(state: GameState, rng: () => number): void {
    const eventDef = pickRandomEvent(rng);

    const event: ActiveCityEvent = {
      eventId: eventDef.id,
      remainingSec: eventDef.durationSec,
    };

    // Handle storm: pick a random production building to pause
    if (eventDef.effects.some(e => e.type === 'pause_building')) {
      const producers = state.buildings.filter(b => {
        if (!b.built) return false;
        const def = BUILDING_DEFS[b.typeId];
        return def.recipes.length > 0 && b.activeRecipeId;
      });
      if (producers.length > 0) {
        const target = producers[Math.floor(rng() * producers.length)];
        event.pausedBuildingId = target.id;
        target.eventPaused = true;
      }
    }

    state.activeEvent = event;
    console.log(`City Event triggered: ${eventDef.name} (${eventDef.durationSec}s)`);
  }

  private expireEvent(state: GameState): void {
    if (!state.activeEvent) return;

    // Un-pause building if storm
    if (state.activeEvent.pausedBuildingId != null) {
      const building = state.buildings.find(b => b.id === state.activeEvent!.pausedBuildingId);
      if (building) building.eventPaused = false;
    }

    state.activeEvent = null;
  }

  /**
   * Accept a trade offer from merchant event.
   * Returns true if trade was successful.
   */
  acceptTrade(state: GameState): boolean {
    if (!state.activeEvent) return false;
    const eventDef = CITY_EVENT_DEFS[state.activeEvent.eventId];
    if (!eventDef) return false;

    const tradeEffect = eventDef.effects.find(e => e.type === 'offer_trade');
    if (!tradeEffect || !tradeEffect.give || !tradeEffect.receive) return false;
    if (state.activeEvent.accepted) return false; // already accepted

    // Check if player can afford
    for (const [item, amount] of Object.entries(tradeEffect.give)) {
      if ((state.globalStock[item] ?? 0) < amount) return false;
    }

    // Deduct cost
    for (const [item, amount] of Object.entries(tradeEffect.give)) {
      state.globalStock[item] -= amount;
    }

    // Give items
    for (const [item, amount] of Object.entries(tradeEffect.receive)) {
      state.globalStock[item] = (state.globalStock[item] ?? 0) + amount;
    }

    state.activeEvent.accepted = true;
    return true;
  }

  /**
   * Check if harvest blessing is active (for production multiplier).
   */
  getProductionMultiplier(state: GameState, buildingTypeId: string): number {
    if (!state.activeEvent) return 1.0;
    const eventDef = CITY_EVENT_DEFS[state.activeEvent.eventId];
    if (!eventDef) return 1.0;

    for (const effect of eventDef.effects) {
      if (effect.type === 'production_mult' && effect.targetTag) {
        const buildingDef = BUILDING_DEFS[buildingTypeId];
        if (buildingDef?.tags.includes(effect.targetTag)) {
          return effect.multiplier ?? 1.0;
        }
      }
    }
    return 1.0;
  }

  private seededRandom(state: GameState): () => number {
    let seed = state.rngSeed + state.day * 7919;
    return () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }
}
