import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from './buildings';
import { SPECIALIST_DEFS } from './specialists';
import { manhattanFootprintDist } from '../utils/ManhattanDist';

export interface SynergyDef {
  id: string;
  name: string;
  sourceType: string;    // building that provides the bonus
  targetType: string;    // building that receives the bonus
  maxDistance: number;    // max Manhattan distance
  speedMult: number;     // production speed multiplier (e.g. 0.67 = 1.5x faster)
}

export const SYNERGY_DEFS: SynergyDef[] = [
  {
    id: 'charcoal_supply',
    name: 'Holzkohle-Versorgung',
    sourceType: 'BAKERY',
    targetType: 'SMITHY',
    maxDistance: 5,
    speedMult: 0.67,     // ×1.5 speed
  },
  {
    id: 'herb_farm_synergy',
    name: 'Kräuter-Dünger',
    sourceType: 'FARM_GRAIN',
    targetType: 'HERB_GARDEN',
    maxDistance: 4,
    speedMult: 0.91,     // ×1.1 speed (+10%)
  },
  {
    id: 'mine_smithy_synergy',
    name: 'Eisenlieferung',
    sourceType: 'SMITHY',
    targetType: 'IRON_MINE',
    maxDistance: 5,
    speedMult: 0.87,     // ×1.15 speed (+15%)
  },
];

/**
 * Recalculate synergy speed multipliers for all buildings.
 * Also applies specialist speed multiplier if assigned.
 */
export function updateSynergies(state: GameState): void {
  // Reset all synergies
  for (const b of state.buildings) {
    b.synergySpeedMult = 1.0;
  }

  // Apply building-to-building synergies
  for (const synergy of SYNERGY_DEFS) {
    const sources = state.buildings.filter(
      b => b.typeId === synergy.sourceType && b.built,
    );
    const targets = state.buildings.filter(
      b => b.typeId === synergy.targetType && b.built,
    );

    for (const target of targets) {
      const tDef = BUILDING_DEFS[target.typeId];
      const [tw, th] = tDef.footprint;

      for (const source of sources) {
        const sDef = BUILDING_DEFS[source.typeId];
        const [sw, sh] = sDef.footprint;

        const dist = manhattanFootprintDist(
          target.x, target.y, tw, th,
          source.x, source.y, sw, sh,
        );

        if (dist <= synergy.maxDistance) {
          // Multiplicative synergies (lower = faster)
          target.synergySpeedMult *= synergy.speedMult;
          break; // one source is enough per synergy type
        }
      }
    }
  }

  // Sync building.specialistId from state.specialists (single source of truth)
  for (const b of state.buildings) {
    b.specialistId = null;
  }

  // Apply specialist speed multipliers
  if (state.specialists) {
    for (const assignment of state.specialists) {
      if (assignment.assignedBuildingId == null) continue;
      const specDef = SPECIALIST_DEFS[assignment.specialistId];
      if (!specDef) continue;
      const building = state.buildings.find(b => b.id === assignment.assignedBuildingId);
      if (building && building.built) {
        building.specialistId = assignment.specialistId;
        building.synergySpeedMult *= specDef.productionSpeedMult;
      }
    }
  }
}
