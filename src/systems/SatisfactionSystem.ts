import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { FighterSynergySystem } from './FighterSynergySystem';

/**
 * Updates waterSupplied for all buildings (a built Well supplies the whole city),
 * and calculates overall city satisfaction (0–100) stored in state.satisfaction.
 * Called every city tick (or after placement changes).
 */
export class SatisfactionSystem {
  private fighterSynergySystem = new FighterSynergySystem();

  update(state: GameState): void {
    // ── Step 1: waterSupplied ──
    // Seit dem Umbau auf HTML-Bildschirme (03/2026) gibt es keine Karte mehr,
    // neue Gebäude stehen alle auf (0,0), alte Spielstände haben noch Kartenpositionen.
    // Darum versorgt ein fertiger Brunnen die ganze Stadt (früher: Umkreis von 6 Feldern).
    const hasWell = state.buildings.some(
      b => b && b.built && BUILDING_DEFS[b.typeId]?.radiusEffect?.type === 'water',
    );

    for (const building of state.buildings) {
      if (!building || building.typeId === 'ROAD') continue;
      building.waterSupplied = building.built && hasWell;
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
