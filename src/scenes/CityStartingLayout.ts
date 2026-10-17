// ─── Magic City – CityStartingLayout ────────────────────────────────────────
// Places initial buildings when a new game is created.
// Buildings are pushed to state.buildings (dense array).
// ─────────────────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';
import { BUILDING_DEFS } from '../data/buildings';

export function placeStartingLayout(state: GameState): void {
  // General buildings
  placeBuilding(state, 'WAREHOUSE');
  placeBuilding(state, 'GUILD_HALL');
  placeBuilding(state, 'LUMBER_CAMP');     // Holzfällerlager — generates wood from start
  placeBuilding(state, 'DUNGEON_CAMP');

  // Housing
  placeBuilding(state, 'HOUSE_T1');
}

export function createStartingCitizens(state: GameState): void {
  for (let i = 0; i < 6; i++) {
    state.citizens.push(createCitizen('IDLE'));
  }
}

function placeBuilding(state: GameState, typeId: string): void {
  const def = BUILDING_DEFS[typeId];
  if (!def) return;

  const building = createBuildingInstance(typeId, 0, 0, true);
  if (def.recipes.length > 0) building.activeRecipeId = def.recipes[0];
  building.connected = true;

  state.buildings.push(building);
}
