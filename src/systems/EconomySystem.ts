import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { FighterSynergySystem } from './FighterSynergySystem';

/**
 * Handles tax collection and day advancement.
 * Called every day tick (60s).
 */
export class EconomySystem {
  private fighterSynergySystem = new FighterSynergySystem();

  /** Steuern, die beim nächsten Tageswechsel eingehen (auch für die Anzeige). */
  steuernProTag(state: GameState): number {
    let totalTax = 0;
    const satisfactionMult = state.satisfaction / 100;
    const fighterTaxMult = this.fighterSynergySystem.getTaxMultiplier(state);

    for (const building of state.buildings) {
      if (!building.built) continue;
      const def = BUILDING_DEFS[building.typeId];
      if (!def.housing) continue;

      // Only connected houses generate tax
      if (def.requiresConnectivity && !building.connected) continue;

      totalTax += def.housing.baseTaxPerMin * satisfactionMult * fighterTaxMult;
    }
    return Math.floor(totalTax);
  }

  dayTick(state: GameState): void {
    const totalTax = this.steuernProTag(state);
    state.globalStock.gold = (state.globalStock.gold ?? 0) + totalTax;
    state.day++;
  }
}
