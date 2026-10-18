// ─── Magic City – CityStartingLayout ────────────────────────────────────────
// Places initial buildings when a new game is created.
// Buildings are pushed to state.buildings (dense array).
// ─────────────────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';
import { BUILDING_DEFS } from '../data/buildings';

/** Buildings every new city starts with (the last one of each type cannot be demolished). */
export const STARTING_BUILDING_TYPES: readonly string[] = [
  // General buildings
  'WAREHOUSE',
  'GUILD_HALL',
  'LUMBER_CAMP',     // Holzfällerlager — generates wood from start
  'DUNGEON_CAMP',
  // Housing
  'HOUSE_T1',
];

export function placeStartingLayout(state: GameState): void {
  for (const typeId of STARTING_BUILDING_TYPES) placeBuilding(state, typeId);
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
