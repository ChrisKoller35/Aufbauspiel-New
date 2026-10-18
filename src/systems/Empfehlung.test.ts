import { describe, it, expect } from 'vitest';
import { naechsterBau } from './Empfehlung';
import { engpaesseDerStadt } from './EngpassSystem';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { BAU_REIHENFOLGE, ERKLAERUNG } from '../data/gebaeudeErklaerungen';
import { netzGebaeudeIds, NETZ_REIHEN } from '../data/produktionsnetz';
import { BUILDING_DEFS } from '../data/buildings';
import { STARTING_BUILDING_TYPES } from '../scenes/CityStartingLayout';

function bauen(state: GameState, typeId: string): void {
  const b = createBuildingInstance(typeId, 0, 0, true);
  b.connected = true;
  state.buildings.push(b);
}

/** Neues Spiel mit den Startgebäuden (Lagerhaus, Gilde, Holzfäller, Wohnviertel). */
function startStadt(): GameState {
  const state = createNewGameState();
  for (const id of STARTING_BUILDING_TYPES) if (BUILDING_DEFS[id]) bauen(state, id);
  return state;
}

describe('Empfehlung: nächster Bau', () => {
  it('ganz ohne Gebäude: zuerst die Holzfällerhütte', () => {
    expect(naechsterBau(createNewGameState())?.typeId).toBe('LUMBER_CAMP');
  });

  it('neues Spiel: zuerst der Steinbruch, mit Begründung', () => {
    const state = startStadt();
    const e = naechsterBau(state);
    expect(e?.typeId).toBe('QUARRY');
    expect(e?.warum).toContain('Stein');
  });

  it('gebaute und gesperrte Gebäude werden übersprungen', () => {
    const state = startStadt();
    bauen(state, 'QUARRY');
    expect(naechsterBau(state)?.typeId).toBe('FARM_GRAIN');
    bauen(state, 'FARM_GRAIN');
    // Eisenmine ist frei (braucht Steinbruch)
    expect(naechsterBau(state)?.typeId).toBe('IRON_MINE');
  });

  it('meldet, ob die Vorräte schon reichen', () => {
    const state = startStadt();
    state.globalStock.wood = 0;
    expect(naechsterBau(state)?.bezahlbar).toBe(false);
    state.globalStock.wood = 1000;
    expect(naechsterBau(state)?.bezahlbar).toBe(true);
  });

  it('alles gebaut: keine Empfehlung', () => {
    const state = startStadt();
    for (const id of netzGebaeudeIds()) bauen(state, id);
    expect(naechsterBau(state)).toBeNull();
  });

  it('die Engpass-Leiste nennt denselben Bauplatz', () => {
    const state = startStadt();
    bauen(state, 'QUARRY');
    expect(engpaesseDerStadt(state, 10).some(e => e.typeId === 'FARM_GRAIN' && e.satz.includes('fehlt noch'))).toBe(true);
  });

  it('jede Empfehlung ist ein echtes Gebäude, und jeder Kasten der Mindmap hat eine Erklärung', () => {
    for (const { typeId } of BAU_REIHENFOLGE) expect(BUILDING_DEFS[typeId], typeId).toBeTruthy();
    for (const reihe of NETZ_REIHEN) {
      for (const k of reihe.knoten) expect(ERKLAERUNG[k.id], k.id).toBeTruthy();
    }
  });
});
