import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS } from '../data/recipes';
import { CityEventSystem } from './CityEventSystem';

/**
 * Handles recipe-based production for all buildings.
 * Called every city tick (1.0s).
 */
export class ProductionSystem {
  private cityEventSystem = new CityEventSystem();

  update(state: GameState, deltaSec: number): void {
    for (const building of state.buildings) {
      if (!building.built) continue;
      if (!building.activeRecipeId) continue;

      // Skip production if paused by city event (storm)
      if (building.eventPaused) continue;

      const def = BUILDING_DEFS[building.typeId];
      const recipe = RECIPE_DEFS[building.activeRecipeId];
      if (!recipe) continue;

      // Needs connectivity?
      if (def.requiresConnectivity && !building.connected) continue;

      // Needs worker?
      if (def.workerSlots > 0 && building.assignedWorkerIds.length === 0) continue;

      // Needs water?
      if (recipe.requirements?.waterSupplied && !building.waterSupplied) continue;

      if (building.producing) {
        // Tick down production timer
        building.productionTimer -= deltaSec;
        if (building.productionTimer <= 0) {
          // Production complete — add outputs (with event multiplier)
          const eventMult = this.cityEventSystem.getProductionMultiplier(state, building.typeId);
          for (const [item, amount] of Object.entries(recipe.outputs)) {
            const boosted = Math.floor(amount * eventMult);
            if (building.connected) {
              state.globalStock[item] = (state.globalStock[item] ?? 0) + boosted;
            } else {
              building.localOutputBuffer[item] =
                (building.localOutputBuffer[item] ?? 0) + boosted;
            }
          }
          building.producing = false;
          building.productionTimer = 0;
        }
      } else {
        // Try to start a new production cycle
        if (this.canStartRecipe(state, building, recipe)) {
          this.deductInputs(state, building, recipe);
          building.productionTimer = recipe.cycleTimeSec * building.synergySpeedMult;
          building.producing = true;
        }
      }
    }

    // Transfer outputs from connected buildings to global stock
    for (const building of state.buildings) {
      if (!building.connected) continue;
      for (const [item, amount] of Object.entries(building.localOutputBuffer)) {
        if (amount > 0) {
          state.globalStock[item] = (state.globalStock[item] ?? 0) + amount;
          building.localOutputBuffer[item] = 0;
        }
      }
    }
  }

  private canStartRecipe(
    state: GameState,
    building: { connected: boolean; localInputBuffer: Record<string, number> },
    recipe: { inputs: Record<string, number> },
  ): boolean {
    for (const [item, needed] of Object.entries(recipe.inputs)) {
      const available = building.connected
        ? (state.globalStock[item] ?? 0)
        : (building.localInputBuffer[item] ?? 0);
      if (available < needed) return false;
    }
    return true;
  }

  private deductInputs(
    state: GameState,
    building: { connected: boolean; localInputBuffer: Record<string, number> },
    recipe: { inputs: Record<string, number> },
  ): void {
    for (const [item, needed] of Object.entries(recipe.inputs)) {
      if (building.connected) {
        state.globalStock[item] -= needed;
      } else {
        building.localInputBuffer[item] -= needed;
      }
    }
  }
}
