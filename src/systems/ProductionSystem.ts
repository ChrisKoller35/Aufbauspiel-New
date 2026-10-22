import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { CityEventSystem } from './CityEventSystem';
import { zyklusSekunden } from './Ausbau';
import { auftragGestartet, hatAuftragsliste, meldeAuftragFertig, naechsterAuftrag } from './Auftraege';
import { kannBeginnen, planeZyklus, Zyklus } from './Werkstattplan';

/**
 * Mehr Zyklen schliesst ein Gebäude in einem Takt nicht ab (Schutz vor einer Endlosschleife, falls ein
 * Rezept je 0 s dauert). Im Spiel (Takt 1 s, kürzester Zyklus gut 2 s) ist es höchstens einer.
 */
const MAX_ZYKLEN_JE_TAKT = 100;

/** Rundungsrauschen bei Bruchteilen (3 × 3,33 s sind 10 s, nicht 10,000000000000002 s). */
const EPSILON = 1e-9;

/**
 * Handles recipe-based production for all buildings.
 * Called every city tick (1.0s).
 * Rohstoff-Gebäude wiederholen ihr Rezept, solange es geht. Werkstätten
 * (Aufträge) beginnen nur, was systems/Werkstattplan.ts plant: Auftrag,
 * Vorstufe, Zulieferung oder Vorrat.
 *
 * Zyklen laufen ohne Lücke: Ist einer fertig, wird geliefert und der nächste
 * beginnt im selben Takt; die Zeit über das Ende hinaus zählt für ihn mit.
 * Ein Gebäude, das durcharbeitet, liefert so im Mittel alle zyklusSekunden
 * (systems/Ausbau.ts), auch bei Bruchteilen eines Takts: Ein 3,33-s-Rezept
 * liefert in den Takten 5, 8, 11, 15, 18, 21, 25, 28, 31, ... im Dauerlauf
 * also 9-mal je 30 s (im ersten Tag 8-mal: Takt 1 beginnt nur).
 * Was nichts beginnen konnte, versucht es am Ende des Takts noch einmal,
 * wenn alle anderen geliefert oder Zutaten genommen haben: So mahlt die
 * Windmühle ohne Lücke weiter, sobald die Bäckerei ihr Mehl genommen hat.
 * Geliefert wird nur in Takten; Anzeigen (Tagesbilanz, GebaeudeStatus)
 * rechnen mit zyklusSekunden, tests/tagesbilanzSimulation.test.ts prüft das.
 */
export class ProductionSystem {
  private cityEventSystem = new CityEventSystem();

  update(state: GameState, deltaSec: number): void {
    /** Gebäude, die in diesem Takt nichts beginnen konnten, mit der Zeit, die ihnen vom letzten Zyklus bleibt. */
    const nochmal: { building: BuildingInstance; ueberhang: number }[] = [];

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
        const zyklus = this.naechsterZyklus(state, building);
        if (zyklus) this.starte(state, building, zyklus);
        else nochmal.push({ building, ueberhang: 0 });
        continue;
      }

      const recipe = building.activeRecipeId ? RECIPE_DEFS[building.activeRecipeId] : undefined;
      if (!recipe) continue;

      // Needs water?
      if (recipe.requirements?.waterSupplied && !building.waterSupplied) continue;

      // Tick down production timer
      building.productionTimer -= deltaSec;

      // Fertig: liefern und gleich weitermachen, die Zeit über das Ende hinaus zählt für den nächsten Zyklus
      for (let n = 0; n < MAX_ZYKLEN_JE_TAKT && building.producing && building.productionTimer <= EPSILON; n++) {
        const ueberhang = Math.max(0, -building.productionTimer);
        this.liefere(state, building, RECIPE_DEFS[building.activeRecipeId!]);
        const naechster = this.naechsterZyklus(state, building);
        if (!naechster) {
          nochmal.push({ building, ueberhang });
          break;
        }
        this.starte(state, building, naechster);
        building.productionTimer -= ueberhang;
      }
    }

    // Zweiter Anlauf: Vielleicht hat inzwischen ein anderes Gebäude geliefert oder Zutaten genommen
    for (const { building, ueberhang } of nochmal) {
      if (building.producing) continue;
      const zyklus = this.naechsterZyklus(state, building);
      if (!zyklus) continue;
      this.starte(state, building, zyklus);
      building.productionTimer -= ueberhang;
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

  /** Was ein freies Gebäude jetzt beginnt: Werkstätten nach Plan, Rohstoff-Gebäude ihr Rezept. */
  private naechsterZyklus(state: GameState, building: BuildingInstance): Zyklus | null {
    return hatAuftragsliste(building) ? planeZyklus(state, building) : this.dauerlauf(state, building);
  }

  /** Rohstoff-Gebäude: das gewählte Rezept, sobald es geht. */
  private dauerlauf(state: GameState, building: BuildingInstance): Zyklus | null {
    const recipe = building.activeRecipeId ? RECIPE_DEFS[building.activeRecipeId] : undefined;
    return recipe && kannBeginnen(state, building, recipe) ? { recipe, art: 'auftrag', fuer: recipe.id } : null;
  }

  /** Ein Zyklus ist fertig: Ware abliefern (mit dem Faktor eines Stadt-Ereignisses), Werkstatt freigeben. */
  private liefere(state: GameState, building: BuildingInstance, recipe: RecipeDef): void {
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
