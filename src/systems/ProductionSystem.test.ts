import { describe, it, expect } from 'vitest';
import { ProductionSystem } from './ProductionSystem';
import { createNewGameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';

function setupLumberCamp(withWorker: boolean) {
  const state = createNewGameState();
  const camp = createBuildingInstance('LUMBER_CAMP', 5, 5, true);
  camp.activeRecipeId = 'RCP_WOOD_1';
  camp.connected = true;
  if (withWorker) {
    const worker = createCitizen('WORKER');
    worker.assignedBuildingId = camp.id;
    camp.assignedWorkerIds.push(worker.id);
    state.citizens.push(worker);
  }
  state.buildings.push(camp);
  return { state, camp };
}

describe('ProductionSystem', () => {
  it('Holzfäller mit Arbeiter produziert Holz', () => {
    const { state } = setupLumberCamp(true);
    const production = new ProductionSystem();
    const woodBefore = state.globalStock['wood'];

    // 1 tick to start the cycle, then 10 s (RCP_WOOD_1 cycle time) to finish it
    for (let i = 0; i < 11; i++) production.update(state, 1);

    expect(state.globalStock['wood']).toBe(woodBefore + 2);
  });

  it('Holzfäller ohne Arbeiter produziert nichts', () => {
    const { state, camp } = setupLumberCamp(false);
    const production = new ProductionSystem();
    const woodBefore = state.globalStock['wood'];

    for (let i = 0; i < 30; i++) production.update(state, 1);

    expect(state.globalStock['wood']).toBe(woodBefore);
    expect(camp.producing).toBe(false);
  });

  it('nicht angebundener Holzfäller sammelt nichts im globalen Lager', () => {
    const { state, camp } = setupLumberCamp(true);
    camp.connected = false;
    const production = new ProductionSystem();
    const woodBefore = state.globalStock['wood'];

    for (let i = 0; i < 11; i++) production.update(state, 1);

    expect(state.globalStock['wood']).toBe(woodBefore);
  });
});

describe('ProductionSystem – Ausbau-Stufen', () => {
  function zweiterArbeiter(state: ReturnType<typeof createNewGameState>, camp: ReturnType<typeof createBuildingInstance>) {
    const worker = createCitizen('WORKER');
    worker.assignedBuildingId = camp.id;
    camp.assignedWorkerIds.push(worker.id);
    state.citizens.push(worker);
  }

  it('Stufe 2 mit zwei Arbeitern liefert doppelt so schnell', () => {
    const { state, camp } = setupLumberCamp(true);
    camp.tier = 2;
    zweiterArbeiter(state, camp);
    const production = new ProductionSystem();
    const woodBefore = state.globalStock['wood'];

    // Zyklus 5 s statt 10 s: Start bei 1, fertig bei 6, Start bei 7, fertig bei 12
    for (let i = 0; i < 13; i++) production.update(state, 1);

    expect(state.globalStock['wood']).toBe(woodBefore + 4);
  });

  it('Stufe 2 mit nur einem Arbeiter bleibt beim alten Tempo', () => {
    const { state, camp } = setupLumberCamp(true);
    camp.tier = 2;
    const production = new ProductionSystem();
    const woodBefore = state.globalStock['wood'];

    for (let i = 0; i < 13; i++) production.update(state, 1);

    expect(state.globalStock['wood']).toBe(woodBefore + 2);
  });
});
