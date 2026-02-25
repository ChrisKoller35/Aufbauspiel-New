import { GameState, TileData } from '../models/GameState';
import { BuildingInstance, createBuildingInstance } from '../models/Building';
import { BUILDING_DEFS } from '../data/buildings';
import { GRID_WIDTH, GRID_HEIGHT } from '../rendering/Colors';

export class GridSystem {
  /**
   * Check if a building can be placed at (gridX, gridY).
   */
  canPlace(state: GameState, typeId: string, gridX: number, gridY: number): boolean {
    const def = BUILDING_DEFS[typeId];
    if (!def) return false;

    const [w, h] = def.footprint;

    // Check bounds
    if (gridX < 0 || gridY < 0 || gridX + w > GRID_WIDTH || gridY + h > GRID_HEIGHT) {
      return false;
    }

    // Check all tiles unoccupied
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tile = state.grid[gridY + dy][gridX + dx];
        if (tile !== null) return false;
      }
    }

    return true;
  }

  /**
   * Check if the player can afford the build cost.
   */
  canAfford(state: GameState, typeId: string): boolean {
    const def = BUILDING_DEFS[typeId];
    if (!def) return false;

    for (const [resource, amount] of Object.entries(def.buildCost)) {
      if ((state.globalStock[resource] ?? 0) < amount) return false;
    }
    return true;
  }

  /**
   * Place a building (or road) on the grid.
   * Returns the created BuildingInstance, or null if placement failed.
   */
  placeBuilding(state: GameState, typeId: string, gridX: number, gridY: number): BuildingInstance | null {
    if (!this.canPlace(state, typeId, gridX, gridY)) return null;
    if (!this.canAfford(state, typeId)) return null;

    const def = BUILDING_DEFS[typeId];
    const [w, h] = def.footprint;

    // Deduct cost
    for (const [resource, amount] of Object.entries(def.buildCost)) {
      state.globalStock[resource] -= amount;
    }

    // Create instance
    const isInstant = def.buildTimeSec === 0;
    const building = createBuildingInstance(typeId, gridX, gridY, isInstant);

    // Set first recipe as active if available
    if (def.recipes.length > 0) {
      building.activeRecipeId = def.recipes[0];
    }

    // Mark grid tiles
    const tileData: TileData = {
      buildingId: building.id,
      isRoad: typeId === 'ROAD',
    };
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        state.grid[gridY + dy][gridX + dx] = tileData;
      }
    }

    state.buildings.push(building);
    return building;
  }

  /**
   * Demolish a building. Returns refunded resources.
   */
  demolish(state: GameState, buildingId: number): Record<string, number> | null {
    const buildingIndex = state.buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex === -1) return null;

    const building = state.buildings[buildingIndex];
    const def = BUILDING_DEFS[building.typeId];

    // Cannot demolish last warehouse
    if (building.typeId === 'WAREHOUSE') {
      const warehouseCount = state.buildings.filter(b => b.typeId === 'WAREHOUSE').length;
      if (warehouseCount <= 1) return null;
    }

    // Calculate refund (50% for buildings, 0 for roads)
    const refund: Record<string, number> = {};
    if (building.typeId !== 'ROAD') {
      for (const [resource, amount] of Object.entries(def.buildCost)) {
        refund[resource] = Math.floor(amount * 0.5);
      }
    }

    // Free workers/builders
    for (const citizen of state.citizens) {
      if (citizen.assignedBuildingId === building.id) {
        citizen.status = 'IDLE';
        citizen.assignedBuildingId = null;
      }
    }

    // Transfer local buffers to global stock if connected
    if (building.connected) {
      for (const [item, amount] of Object.entries(building.localOutputBuffer)) {
        state.globalStock[item] = (state.globalStock[item] ?? 0) + amount;
      }
      for (const [item, amount] of Object.entries(building.localInputBuffer)) {
        state.globalStock[item] = (state.globalStock[item] ?? 0) + amount;
      }
    }

    // Apply refund
    for (const [resource, amount] of Object.entries(refund)) {
      state.globalStock[resource] = (state.globalStock[resource] ?? 0) + amount;
    }

    // Clear grid tiles
    const [w, h] = def.footprint;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        state.grid[building.y + dy][building.x + dx] = null;
      }
    }

    // Remove building
    state.buildings.splice(buildingIndex, 1);

    return refund;
  }

  /**
   * Get the building at a world pixel position.
   */
  getBuildingAtPixel(state: GameState, worldX: number, worldY: number, tileSize: number): BuildingInstance | null {
    const gridX = Math.floor(worldX / tileSize);
    const gridY = Math.floor(worldY / tileSize);
    return this.getBuildingAtGrid(state, gridX, gridY);
  }

  /**
   * Get the building at a grid position.
   */
  getBuildingAtGrid(state: GameState, gridX: number, gridY: number): BuildingInstance | null {
    if (gridX < 0 || gridY < 0 || gridX >= GRID_WIDTH || gridY >= GRID_HEIGHT) return null;
    const tile = state.grid[gridY][gridX];
    if (!tile || !tile.buildingId) return null;
    return state.buildings.find(b => b.id === tile.buildingId) ?? null;
  }
}
