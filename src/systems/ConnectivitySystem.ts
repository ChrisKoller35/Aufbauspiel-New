import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { bfsRoads } from '../utils/Pathfinding';
import { GRID_WIDTH, GRID_HEIGHT } from '../rendering/Colors';

/**
 * Recalculates `connected` for every building.
 *
 * Algorithm:
 * 1. Collect all road tiles adjacent to any WAREHOUSE (4-dir).
 * 2. BFS over roads from those seeds.
 * 3. A building is "connected" when any of its footprint border tiles
 *    is 4-dir adjacent to a visited road (or it IS a warehouse).
 */
export class ConnectivitySystem {
  update(state: GameState): void {
    // Find warehouse(s)
    const warehouses = state.buildings.filter(b => b.typeId === 'WAREHOUSE' && b.built);

    // Gather seed roads adjacent to warehouses
    const seeds: { x: number; y: number }[] = [];
    for (const wh of warehouses) {
      const def = BUILDING_DEFS[wh.typeId];
      const [w, h] = def.footprint;
      // Check all border neighbours of the footprint
      for (const pos of this.footprintBorderNeighbours(wh.x, wh.y, w, h)) {
        const tile = state.grid[pos.y]?.[pos.x];
        if (tile?.isRoad) {
          seeds.push(pos);
        }
      }
    }

    const reachable = bfsRoads(state, seeds);

    // Update each building's connected flag
    for (const building of state.buildings) {
      if (building.typeId === 'ROAD') continue;

      // Warehouses are always connected
      if (building.typeId === 'WAREHOUSE') {
        building.connected = building.built;
        continue;
      }

      // Buildings that don't require connectivity are always connected
      const def = BUILDING_DEFS[building.typeId];
      if (!def.requiresConnectivity) {
        building.connected = building.built;
        continue;
      }

      if (!building.built) {
        building.connected = false;
        continue;
      }

      // Check if any border neighbour is a reachable road
      const [w, h] = def.footprint;
      let connected = false;
      for (const pos of this.footprintBorderNeighbours(building.x, building.y, w, h)) {
        if (reachable.has(`${pos.x},${pos.y}`)) {
          connected = true;
          break;
        }
      }
      building.connected = connected;
    }
  }

  /**
   * Returns all grid positions that are 4-dir adjacent to a footprint's border
   * but NOT inside the footprint itself.
   */
  private footprintBorderNeighbours(
    fx: number, fy: number, fw: number, fh: number,
  ): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    // Top and bottom edges
    for (let dx = 0; dx < fw; dx++) {
      if (fy - 1 >= 0) result.push({ x: fx + dx, y: fy - 1 });
      if (fy + fh < GRID_HEIGHT) result.push({ x: fx + dx, y: fy + fh });
    }
    // Left and right edges
    for (let dy = 0; dy < fh; dy++) {
      if (fx - 1 >= 0) result.push({ x: fx - 1, y: fy + dy });
      if (fx + fw < GRID_WIDTH) result.push({ x: fx + fw, y: fy + dy });
    }
    return result;
  }
}
