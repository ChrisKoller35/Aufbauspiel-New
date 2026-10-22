// ─── Magic City – CityStartingLayout ────────────────────────────
// Stellt die Gebäude auf, mit denen jede neue Stadt beginnt:
// Gildenhaus und Händler. Alles andere baut man mit Bauplan
// (data/buildings.ts). Keine Bewohner, kein Raster.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { BUILDING_DEFS } from '../data/buildings';

/** Gebäude, mit denen jede neue Stadt beginnt (sie lassen sich nicht abreissen). */
export const STARTING_BUILDING_TYPES: readonly string[] = [
  'GUILD_HALL',
  'HAENDLER',
];

export function placeStartingLayout(state: GameState): void {
  for (const typeId of STARTING_BUILDING_TYPES) {
    if (!BUILDING_DEFS[typeId]) continue;
    state.buildings.push(createBuildingInstance(typeId));
  }
}
