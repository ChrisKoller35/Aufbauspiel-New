import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { zyklusSekunden } from './Ausbau';
import { auftragGestartet, meldeAuftragFertig, naechsterAuftrag } from './Auftraege';
import { planeZyklus, Zyklus } from './Werkstattplan';

/**
 * Mehr Zyklen schliesst eine Werkstatt in einem Takt nicht ab (Schutz vor einer Endlosschleife, falls ein
 * Rezept je 0 s dauert). Im Spiel (Takt 1 s, kürzester Zyklus 6 s) ist es höchstens einer.
 */
const MAX_ZYKLEN_JE_TAKT = 100;

/** Rundungsrauschen bei Bruchteilen (3 × 3,33 s sind 10 s, nicht 10,000000000000002 s). */
const EPSILON = 1e-9;

/**
 * Lässt die Werkstätten arbeiten. Wird jeden Stadt-Takt (1,0 s) aufgerufen.
 * Eine Werkstatt beginnt nur, was systems/Werkstattplan.ts plant: Auftrag,
 * Vorstufe oder Zulieferung. Zutaten kommen aus dem Lager (globalStock),
 * Waren gehen dorthin zurück; das Tempo gibt die Stufe vor (systems/Ausbau.ts).
 *
 * Zyklen laufen ohne Lücke: Ist einer fertig, wird geliefert und der nächste
 * beginnt im selben Takt; die Zeit über das Ende hinaus zählt für ihn mit.
 * Eine Werkstatt, die durcharbeitet, liefert so im Mittel alle zyklusSekunden,
 * auch bei Bruchteilen eines Takts. Was nichts beginnen konnte, versucht es
 * am Ende des Takts noch einmal, wenn alle anderen geliefert oder Zutaten
 * genommen haben: So beginnt die Kanone im selben Takt, in dem die
 * Arkanschmiede die zweite Komponente liefert.
 */
export class ProductionSystem {
  update(state: GameState, deltaSec: number): void {
    /** Werkstätten, die in diesem Takt nichts beginnen konnten, mit der Zeit, die ihnen vom letzten Zyklus bleibt. */
    const nochmal: { building: BuildingInstance; ueberhang: number }[] = [];

    for (const building of state.buildings) {
      if (!building.built) continue;

      if (!building.producing) {
        const zyklus = planeZyklus(state, building);
        if (zyklus) this.starte(state, building, zyklus);
        else nochmal.push({ building, ueberhang: 0 });
        continue;
      }

      if (!building.activeRecipeId || !RECIPE_DEFS[building.activeRecipeId]) continue;
      building.productionTimer -= deltaSec;

      // Fertig: liefern und gleich weitermachen, die Zeit über das Ende hinaus zählt für den nächsten Zyklus
      for (let n = 0; n < MAX_ZYKLEN_JE_TAKT && building.producing && building.productionTimer <= EPSILON; n++) {
        const ueberhang = Math.max(0, -building.productionTimer);
        this.liefere(state, building, RECIPE_DEFS[building.activeRecipeId!]);
        const naechster = planeZyklus(state, building);
        if (!naechster) {
          nochmal.push({ building, ueberhang });
          break;
        }
        this.starte(state, building, naechster);
        building.productionTimer -= ueberhang;
      }
    }

    // Zweiter Anlauf: Vielleicht hat inzwischen eine andere Werkstatt geliefert oder Zutaten genommen
    for (const { building, ueberhang } of nochmal) {
      if (building.producing) continue;
      const zyklus = planeZyklus(state, building);
      if (!zyklus) continue;
      this.starte(state, building, zyklus);
      building.productionTimer -= ueberhang;
    }
  }

  /** Ein Zyklus ist fertig: Ware ins Lager, Werkstatt freigeben, nächsten Auftrag einstellen. */
  private liefere(state: GameState, building: BuildingInstance, recipe: RecipeDef): void {
    for (const [item, amount] of Object.entries(recipe.outputs)) {
      state.globalStock[item] = (state.globalStock[item] ?? 0) + amount;
    }
    building.producing = false;
    building.productionTimer = 0;
    // Rückmeldung nur für Aufträge, nicht für Vorstufen und Zulieferungen (systems/Auftraege.ts)
    if (!building.vonSelbst) meldeAuftragFertig(building, recipe);
    building.vonSelbst = null;
    naechsterAuftrag(building);
  }

  private starte(state: GameState, building: BuildingInstance, zyklus: Zyklus): void {
    const { recipe, art, fuer } = zyklus;
    for (const [item, needed] of Object.entries(recipe.inputs)) {
      state.globalStock[item] = (state.globalStock[item] ?? 0) - needed;
    }
    building.activeRecipeId = recipe.id;
    // Stufe 2 und 3 arbeiten doppelt bzw. dreifach so schnell (systems/Ausbau.ts)
    building.productionTimer = zyklusSekunden(building, recipe);
    building.producing = true;
    if (art === 'auftrag') {
      building.vonSelbst = null;
      auftragGestartet(building);
    } else {
      building.vonSelbst = { art, fuer };
    }
  }
}
