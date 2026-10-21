import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { CityEventSystem } from './CityEventSystem';
import { zyklusSekunden } from './Ausbau';
import { auftragGestartet, hatAuftragsliste, meldeAuftragFertig, naechsterAuftrag } from './Auftraege';
import { kannBeginnen, planeZyklus, Zyklus } from './Werkstattplan';

/**
 * Handles recipe-based production for all buildings.
 * Called every city tick (1.0s).
 * Rohstoff-Gebäude wiederholen ihr Rezept, solange es geht. Werkstätten
 * (Aufträge) beginnen nur, was systems/Werkstattplan.ts plant: Auftrag,
 * Vorstufe, Zulieferung oder Vorrat.
 */
export class ProductionSystem {
  private cityEventSystem = new CityEventSystem();

  update(state: GameState, deltaSec: number): void {
    for (const building of state.buildings) {
      if (!building.built) continue;

      // Skip production if paused by city event (storm)
      if (building.eventPaused) continue;

      const def = BUILDING_DEFS[building.typeId];

      // Needs connectivity?
      if (def.requiresConnectivity && !building.connected) continue;

      // Needs worker?
      if (def.workerSlots > 0 && building.assignedWorkerIds.length === 0) continue;

      if (!building.producing) {
        // Try to start a new production cycle
        const zyklus = hatAuftragsliste(building) ? planeZyklus(state, building) : this.dauerlauf(state, building);
        if (zyklus) this.starte(state, building, zyklus);
        continue;
      }

      const recipe = building.activeRecipeId ? RECIPE_DEFS[building.activeRecipeId] : undefined;
      if (!recipe) continue;

      // Needs water?
      if (recipe.requirements?.waterSupplied && !building.waterSupplied) continue;

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
        // Auftragsliste: Rückmeldung (nur für Aufträge) und nächsten Auftrag einstellen (systems/Auftraege.ts)
        if (hatAuftragsliste(building)) {
          if (!building.vonSelbst) meldeAuftragFertig(building, recipe);
          building.vonSelbst = null;
          naechsterAuftrag(building);
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

  /** Rohstoff-Gebäude: das gewählte Rezept, sobald es geht. */
  private dauerlauf(state: GameState, building: BuildingInstance): Zyklus | null {
    const recipe = building.activeRecipeId ? RECIPE_DEFS[building.activeRecipeId] : undefined;
    return recipe && kannBeginnen(state, building, recipe) ? { recipe, art: 'auftrag', fuer: recipe.id } : null;
  }

  private starte(state: GameState, building: BuildingInstance, zyklus: Zyklus): void {
    const { recipe, art, fuer } = zyklus;
    this.deductInputs(state, building, recipe);
    building.activeRecipeId = recipe.id;
    // Stufe 2 und 3 arbeiten doppelt bzw. dreifach so schnell (systems/Ausbau.ts)
    building.productionTimer = zyklusSekunden(building, recipe);
    building.producing = true;
    if (art === 'auftrag') {
      building.vonSelbst = null;
      if (hatAuftragsliste(building)) auftragGestartet(building);
      else building.pendingCraft = false;
    } else {
      building.vonSelbst = { art, fuer };
    }
  }

  private deductInputs(state: GameState, building: BuildingInstance, recipe: RecipeDef): void {
    for (const [item, needed] of Object.entries(recipe.inputs)) {
      if (building.connected) {
        state.globalStock[item] -= needed;
      } else {
        building.localInputBuffer[item] -= needed;
      }
    }
  }
}
