import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveSystem } from './SaveSystem';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';
import { BUILDING_DEFS } from '../data/buildings';

const SAVE_KEY = 'magic_city_save';

/** Minimal in-memory localStorage for the node test environment. */
function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => { data.delete(key); },
    setItem: (key: string, value: string) => { data.set(key, String(value)); },
  };
}

function placeBuilding(state: GameState, typeId: string, x: number, y: number) {
  const b = createBuildingInstance(typeId, x, y, true);
  state.buildings.push(b);
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      state.grid[y + dy][x + dx] = { buildingId: b.id, isRoad: false };
    }
  }
  return b;
}

/** Stores a raw (old-format) state as save without going through save(). */
function writeRawSave(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

describe('SaveSystem', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('speichern → laden gibt denselben Stand', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    const camp = placeBuilding(state, 'LUMBER_CAMP', 5, 5);
    const worker = createCitizen('WORKER');
    worker.assignedBuildingId = camp.id;
    camp.assignedWorkerIds.push(worker.id);
    state.citizens.push(worker);
    state.day = 7;
    state.globalStock['wood'] = 123;
    state.globalStock['arcane_amulet'] = 1;

    expect(saveSystem.save(state)).toBe(true);
    const loaded = saveSystem.load();

    expect(loaded).toEqual(state);
  });

  it('behält das herstellbare arcane_amulet beim Laden', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    state.globalStock['arcane_amulet'] = 2;
    saveSystem.save(state);

    expect(saveSystem.load()?.globalStock['arcane_amulet']).toBe(2);
  });

  it('entfernt bei alten Spielständen unbekannte Gebäudetypen samt Verweisen', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    state.saveVersion = 19;
    const camp = placeBuilding(state, 'LUMBER_CAMP', 5, 5);
    const bank = placeBuilding(state, 'BANK_V2', 10, 10);
    placeBuilding(state, 'VAULT', 14, 10);
    placeBuilding(state, 'BANK_WITH_CHEST', 18, 10);
    const worker = createCitizen('WORKER');
    worker.assignedBuildingId = bank.id;
    state.citizens.push(worker);
    state.specialists.push({ specialistId: 'spec_test', assignedBuildingId: bank.id });
    writeRawSave(state);

    const loaded = saveSystem.load()!;

    expect(loaded.buildings.map(b => b.id)).toEqual([camp.id]);
    expect(loaded.buildings.every(b => BUILDING_DEFS[b.typeId])).toBe(true);
    expect(loaded.grid[10][10]).toBeNull();
    expect(loaded.grid[5][5]?.buildingId).toBe(camp.id);
    expect(loaded.citizens[0].status).toBe('IDLE');
    expect(loaded.citizens[0].assignedBuildingId).toBeNull();
    expect(loaded.specialists[0].assignedBuildingId).toBeNull();
    expect(loaded.saveVersion).toBe(22);
  });

  it('legt bei der Migration kein BANK_V2 an und verschenkt keine Test-Gegenstände', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    state.saveVersion = 5;
    const stockBefore = { ...state.globalStock };
    writeRawSave(state);

    const loaded = saveSystem.load()!;

    expect(loaded.buildings.some(b => b.typeId === 'BANK_V2')).toBe(false);
    expect(loaded.buildings).toHaveLength(0);
    expect(loaded.globalStock).toEqual(stockBefore);
  });
});

describe('SaveSystem – Version 21: ein Gebäude je Art', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('alter Spielstand mit drei Holzfällerhütten lädt als eine Hütte Stufe 3', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    state.saveVersion = 20;
    const huetten = [placeBuilding(state, 'LUMBER_CAMP', 5, 5), placeBuilding(state, 'LUMBER_CAMP', 8, 5), placeBuilding(state, 'LUMBER_CAMP', 11, 5)];
    for (const h of huetten) {
      h.connected = true;
      h.activeRecipeId = 'RCP_WOOD_1';
      const worker = createCitizen('WORKER');
      worker.assignedBuildingId = h.id;
      h.assignedWorkerIds.push(worker.id);
      state.citizens.push(worker);
    }
    const brunnen = placeBuilding(state, 'WELL', 20, 20);
    writeRawSave(state);

    const loaded = saveSystem.load()!;

    const camps = loaded.buildings.filter(b => b.typeId === 'LUMBER_CAMP');
    expect(camps).toHaveLength(1);
    expect(camps[0].tier).toBe(3);
    expect(camps[0].assignedWorkerIds).toHaveLength(3);
    expect(loaded.citizens.every(c => c.status === 'WORKER' && c.assignedBuildingId === camps[0].id)).toBe(true);
    expect(loaded.buildings.map(b => b.typeId).sort()).toEqual(['LUMBER_CAMP', 'WELL']);
    expect(loaded.grid[20][20]?.buildingId).toBe(brunnen.id);
    // Kartenfelder zeigen nur noch auf Gebäude, die es gibt
    const ids = new Set(loaded.buildings.map(b => b.id));
    expect(loaded.grid.flat().every(t => !t || t.buildingId == null || ids.has(t.buildingId))).toBe(true);
    expect(loaded.saveVersion).toBe(22);
  });

  it('ein aktueller Spielstand bleibt beim Laden unverändert', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    const camp = placeBuilding(state, 'LUMBER_CAMP', 5, 5);
    camp.tier = 2;
    saveSystem.save(state);
    expect(saveSystem.load()).toEqual(state);
  });
});
