import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductionSystem } from './ProductionSystem';
import { SaveSystem } from './SaveSystem';
import {
  MAX_AUFTRAEGE, auftragsListe, auftragGeben, auftragAbbrechen, beiAuftragFertig, restzeitSekunden,
} from './Auftraege';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, BuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';

const SWORD = 'RCP_IRON_SWORD';   // 2 Eisen + 1 Holz, 90 s
const SHIELD = 'RCP_IRON_SHIELD'; // 2 Eisen + 1 Holz, 90 s

function setupSmithy(): { state: GameState; smithy: BuildingInstance } {
  const state = createNewGameState();
  state.buildings = [];
  const smithy = createBuildingInstance('SMITHY', 5, 5, true);
  smithy.connected = true;
  smithy.activeRecipeId = SWORD;
  const worker = createCitizen('WORKER');
  worker.assignedBuildingId = smithy.id;
  smithy.assignedWorkerIds.push(worker.id);
  state.citizens.push(worker);
  state.buildings.push(smithy);
  state.globalStock.iron_scrap = 10;
  state.globalStock.wood = 10;
  state.globalStock.iron_sword = 0;
  state.globalStock.iron_shield = 0;
  return { state, smithy };
}

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

describe('Auftragsliste', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('arbeitet Aufträge in Reihenfolge ab und meldet jeden fertigen', () => {
    const { state, smithy } = setupSmithy();
    const production = new ProductionSystem();
    const fertig: string[] = [];
    const abmelden = beiAuftragFertig((_b, recipe) => fertig.push(recipe.id));

    expect(auftragGeben(smithy, SHIELD)).toBe(true);
    expect(auftragGeben(smithy, SWORD)).toBe(true);
    expect(smithy.activeRecipeId).toBe(SHIELD);

    production.update(state, 1); // Schild startet, Zutaten werden abgezogen
    expect(smithy.producing).toBe(true);
    expect(auftragsListe(smithy)).toEqual([SHIELD, SWORD]);
    expect(state.globalStock.iron_scrap).toBe(8);
    expect(restzeitSekunden(smithy)).toBe(180);

    for (let i = 0; i < 90; i++) production.update(state, 1);
    expect(state.globalStock.iron_shield).toBe(1);
    expect(state.globalStock.iron_sword).toBe(0);
    expect(fertig).toEqual([SHIELD]);

    for (let i = 0; i < 91; i++) production.update(state, 1);
    expect(state.globalStock.iron_sword).toBe(1);
    expect(fertig).toEqual([SHIELD, SWORD]);
    expect(auftragsListe(smithy)).toEqual([]);

    // Ohne Auftrag läuft nichts weiter
    for (let i = 0; i < 100; i++) production.update(state, 1);
    expect(state.globalStock.iron_sword).toBe(1);
    expect(state.globalStock.iron_scrap).toBe(6);
    abmelden();
  });

  it('nimmt höchstens MAX_AUFTRAEGE Aufträge an', () => {
    const { smithy } = setupSmithy();
    for (let i = 0; i < MAX_AUFTRAEGE; i++) expect(auftragGeben(smithy, SWORD)).toBe(true);
    expect(auftragGeben(smithy, SWORD)).toBe(false);
    expect(auftragGeben(smithy, 'RCP_BREAD_1')).toBe(false); // nicht in dieser Werkstatt
    expect(auftragsListe(smithy)).toHaveLength(MAX_AUFTRAEGE);
  });

  it('Abbrechen: laufender gibt Zutaten zurück, wartender kostet nichts', () => {
    const { state, smithy } = setupSmithy();
    const production = new ProductionSystem();
    auftragGeben(smithy, SWORD);
    auftragGeben(smithy, SHIELD);
    auftragGeben(smithy, SWORD);
    production.update(state, 1);
    expect(state.globalStock.iron_scrap).toBe(8);

    // Wartenden in der Mitte abbrechen
    expect(auftragAbbrechen(state, smithy, 1)).toBe(true);
    expect(auftragsListe(smithy)).toEqual([SWORD, SWORD]);
    expect(state.globalStock.iron_scrap).toBe(8);

    // Laufenden abbrechen: Zutaten zurück, der nächste rückt nach
    expect(auftragAbbrechen(state, smithy, 0)).toBe(true);
    expect(state.globalStock.iron_scrap).toBe(10);
    expect(state.globalStock.wood).toBe(10);
    expect(smithy.producing).toBe(false);
    expect(auftragsListe(smithy)).toEqual([SWORD]);
    expect(smithy.pendingCraft).toBe(true);

    expect(auftragAbbrechen(state, smithy, 5)).toBe(false);
  });

  it('Speichern und Laden behält die Auftragsliste', () => {
    const { state, smithy } = setupSmithy();
    const production = new ProductionSystem();
    auftragGeben(smithy, SHIELD);
    auftragGeben(smithy, SWORD);
    auftragGeben(smithy, SHIELD);
    production.update(state, 1);

    const saveSystem = new SaveSystem();
    expect(saveSystem.save(state)).toBe(true);
    const loaded = saveSystem.load()!;
    const b = loaded.buildings.find(x => x.typeId === 'SMITHY')!;
    expect(auftragsListe(b)).toEqual([SHIELD, SWORD, SHIELD]);
    expect(b.producing).toBe(true);
  });

  it('alter Spielstand (Version 21): erteilter Auftrag wird zur Liste', () => {
    const { state, smithy } = setupSmithy();
    smithy.pendingCraft = true;
    delete (smithy as Partial<BuildingInstance>).auftraege;
    state.saveVersion = 21;
    localStorage.setItem('magic_city_save', JSON.stringify(state));

    const loaded = new SaveSystem().load()!;
    const b = loaded.buildings.find(x => x.typeId === 'SMITHY')!;
    expect(loaded.saveVersion).toBe(23);
    expect(b.auftraege).toEqual([SWORD]);
  });
});
