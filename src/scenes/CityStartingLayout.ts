// ─── Magic City – CityStartingLayout ────────────────────────────
// Stellt auf, womit jede neue Stadt beginnt: Gildenhaus und Händler
// als Gebäude, dazu ein Held (Guardian, Stufe 1, wie beim Anheuern im
// Heldenhaus). Alles andere baut man auf seinem Feld (data/buildings.ts)
// oder heuert man an (systems/Empfehlung.ts: anheuerKosten).
// Keine Bewohner, kein Raster.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { createGuildFighter } from '../models/GuildRoster';
import { BUILDING_DEFS } from '../data/buildings';
import { CLASS_DEFS } from '../data/classes';

/** Gebäude, mit denen jede neue Stadt beginnt (sie lassen sich nicht abreissen). */
export const STARTING_BUILDING_TYPES: readonly string[] = [
  'GUILD_HALL',
  'HAENDLER',
];

/** Klasse des ersten Helden: Ohne ihn gäbe es keine Expedition und damit kein Gold. */
export const START_HELD_KLASSE = 'guardian';

export function placeStartingLayout(state: GameState): void {
  for (const typeId of STARTING_BUILDING_TYPES) {
    if (!BUILDING_DEFS[typeId]) continue;
    state.buildings.push(createBuildingInstance(typeId));
  }
  // Wie HeroesScreen.handleHire: Name der Klasse, Grundwerte, Stufe 1, ohne Ausrüstung
  const klasse = CLASS_DEFS[START_HELD_KLASSE];
  if (klasse && !state.fighters.some(f => f.classId === klasse.id)) {
    state.fighters.push(createGuildFighter(klasse.id, klasse.name, klasse.baseStats));
  }
}
