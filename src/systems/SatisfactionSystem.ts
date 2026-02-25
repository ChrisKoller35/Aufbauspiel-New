import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { manhattanFootprintDist } from '../utils/ManhattanDist';
import { FighterSynergySystem } from './FighterSynergySystem';

/**
 * Updates waterSupplied for all buildings based on Well radius,
 * and calculates overall city satisfaction (0–100) stored in state.satisfaction.
 * Called every city tick (or after placement changes).
 */
export class SatisfactionSystem {
  private fighterSynergySystem = new FighterSynergySystem();

  update(state: GameState): void {
    // ── Step 1: waterSupplied for all buildings (existing logic) ──
    const wells = state.buildings.filter(
      b => b.built && BUILDING_DEFS[b.typeId].radiusEffect?.type === 'water',
    );

    for (const building of state.buildings) {
      if (building.typeId === 'ROAD') continue;
      if (!building.built) {
        building.waterSupplied = false;
        continue;
      }

      const def = BUILDING_DEFS[building.typeId];
      const [bw, bh] = def.footprint;

      let supplied = false;
      for (const well of wells) {
        const wellDef = BUILDING_DEFS[well.typeId];
        const radius = wellDef.radiusEffect!.radiusTiles;
        const [ww, wh] = wellDef.footprint;

        const dist = manhattanFootprintDist(
          building.x, building.y, bw, bh,
          well.x, well.y, ww, wh,
        );

        if (dist <= radius) {
          supplied = true;
          break;
        }
      }

      building.waterSupplied = supplied;
    }

    // ── Step 2: Satisfaction formula ──

    // base
    let satisfaction = 50;

    // food: bread in globalStock >= 1 → +10, else −20
    const bread = state.globalStock.bread ?? 0;
    satisfaction += bread >= 1 ? 10 : -20;

    // water: at least 1 house with waterSupplied=true → +10, else −10
    const anyHouseWatered = state.buildings.some(
      b => b.built && BUILDING_DEFS[b.typeId].housing != null && b.waterSupplied,
    );
    satisfaction += anyHouseWatered ? 10 : -10;

    // overcrowd: −10 × max(0, citizens − housingCapacity)
    let housingCapacity = 0;
    for (const building of state.buildings) {
      if (!building.built) continue;
      const def = BUILDING_DEFS[building.typeId];
      if (def.housing) {
        housingCapacity += def.housing.capacity;
      }
    }
    const overcrowdPenalty = Math.max(0, state.citizens.length - housingCapacity);
    satisfaction -= 10 * overcrowdPenalty;

    // infra: all requiresConnectivity buildings connected → +0, else −10
    const allConnected = state.buildings.every(
      b => !b.built || !BUILDING_DEFS[b.typeId].requiresConnectivity || b.connected,
    );
    satisfaction += allConnected ? 0 : -10;

    // fighter synergy: ≥1 active fighter → +3 satisfaction
    satisfaction += this.fighterSynergySystem.getSatisfactionBonus(state);

    // clamp to [0, 100]
    state.satisfaction = Math.max(0, Math.min(100, satisfaction));
  }
}
