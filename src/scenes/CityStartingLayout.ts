// ─── Magic City – CityStartingLayout ────────────────────────────────────────
// Standalone functions for placing the initial buildings and citizens
// when a new game is created. Extracted from CityScene; no logic changes.
// ─────────────────────────────────────────────────────────────────────────────

import { GameState, TileData } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';
import { BUILDING_DEFS } from '../data/buildings';

export function placeStartingLayout(state: GameState): void {
  // WAREHOUSE (4×3) at grid centre
  placeStarterBuilding(state, 'WAREHOUSE', 18, 17);
  // HOUSE_T1 (2×2) east of warehouse
  placeStarterBuilding(state, 'HOUSE_T1', 23, 17);
  // GUILD_HALL (4×4) west of warehouse
  placeStarterBuilding(state, 'GUILD_HALL', 13, 16);

  // Roads connecting guild hall → warehouse
  for (let y = 17; y <= 19; y++) placeStarterBuilding(state, 'ROAD', 17, y);
  // Roads connecting warehouse → house
  for (let y = 17; y <= 18; y++) placeStarterBuilding(state, 'ROAD', 22, y);

  // DUNGEON_CAMP (4×4) in der Dungeon-Zone
  placeStarterBuilding(state, 'DUNGEON_CAMP', 4, 16);
}

export function createStartingCitizens(state: GameState): void {
  for (let i = 0; i < 6; i++) {
    state.citizens.push(createCitizen('IDLE'));
  }
}

function placeStarterBuilding(state: GameState, typeId: string, gx: number, gy: number): void {
  const def = BUILDING_DEFS[typeId];
  const [w, h] = def.footprint;

  const building = createBuildingInstance(typeId, gx, gy, true);
  if (def.recipes.length > 0) building.activeRecipeId = def.recipes[0];
  building.connected = true;

  const tileData: TileData = { buildingId: building.id, isRoad: typeId === 'ROAD' };
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      state.grid[gy + dy][gx + dx] = tileData;
    }
  }
  state.buildings.push(building);
}
