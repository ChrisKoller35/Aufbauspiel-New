import { describe, it, expect } from 'vitest';
import { ProductionSystem } from './ProductionSystem';
import { auftragGeben } from './Auftraege';
import { ausbauen } from './Ausbau';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, BuildingInstance } from '../models/Building';

const SCHWERT = 'RCP_IRON_SWORD'; // 2 Eisenschrott + 10 Gold, 90 s

function schmiede(lager: Record<string, number> = {}): { state: GameState; schmiede: BuildingInstance } {
  const state = createNewGameState();
  const b = createBuildingInstance('SMITHY');
  state.buildings.push(b);
  Object.assign(state.globalStock, { iron_scrap: 10, gold: 100, iron_sword: 0 }, lager);
  return { state, schmiede: b };
}

function laufe(state: GameState, sekunden: number, production = new ProductionSystem()): void {
  for (let i = 0; i < sekunden; i++) production.update(state, 1);
}

describe('ProductionSystem', () => {
  it('eine Werkstatt mit Auftrag nimmt Gold und Beute aus dem Lager und liefert dorthin', () => {
    const { state, schmiede: b } = schmiede();
    auftragGeben(b, SCHWERT);

    laufe(state, 1); // Takt 1: Auftrag beginnt, Zutaten abgezogen
    expect(b.producing).toBe(true);
    expect(state.globalStock.iron_scrap).toBe(8);
    expect(state.globalStock.gold).toBe(90);
    expect(state.globalStock.iron_sword).toBe(0);

    laufe(state, 90);
    expect(state.globalStock.iron_sword).toBe(1);
    expect(b.producing).toBe(false);
  });

  it('ohne Auftrag ruht die Werkstatt, ohne Zutaten wartet sie', () => {
    const { state, schmiede: b } = schmiede({ iron_scrap: 1 });
    laufe(state, 30);
    expect(b.producing).toBe(false);
    auftragGeben(b, SCHWERT);
    laufe(state, 30);
    expect(b.producing).toBe(false);
    expect(state.globalStock.gold).toBe(100);
    // Sobald die Beute da ist, geht es los
    state.globalStock.iron_scrap = 2;
    laufe(state, 1);
    expect(b.producing).toBe(true);
    expect(state.globalStock.iron_scrap).toBe(0);
  });

  it('Gildenhaus und Händler produzieren nichts', () => {
    const state = createNewGameState();
    state.buildings.push(createBuildingInstance('GUILD_HALL'), createBuildingInstance('HAENDLER'));
    const vorher = { ...state.globalStock };
    laufe(state, 100);
    expect(state.globalStock).toEqual(vorher);
    expect(state.buildings.every(b => !b.producing)).toBe(true);
  });
});

describe('ProductionSystem – Ausbau-Stufen', () => {
  it('Stufe 2 liefert doppelt so schnell, Stufe 3 dreimal so schnell', () => {
    for (const [stufe, sekunden] of [[2, 45], [3, 30]] as const) {
      const { state, schmiede: b } = schmiede({ iron_scrap: 100, gold: 1000 });
      b.tier = stufe;
      for (let i = 0; i < 5; i++) auftragGeben(b, SCHWERT);
      // Takt 1 beginnt nur; danach alle `sekunden` ein Schwert, ohne Leertakt dazwischen
      laufe(state, 1 + 2 * sekunden);
      expect(state.globalStock.iron_sword, `Stufe ${stufe}`).toBe(2);
    }
  });

  it('Ausbau während eines Zyklus: der Rest läuft im neuen Tempo weiter', () => {
    const { state, schmiede: b } = schmiede({ iron_scrap: 100, gold: 1000 });
    state.stadtweg = { stufe: 7, herzsteine: [], gelesen: 0 };
    auftragGeben(b, SCHWERT);
    laufe(state, 31); // Takt 1 beginnt (90 s), dann 30 s
    expect(b.productionTimer).toBe(60);
    expect(ausbauen(state, b)).toBe(true); // Stufe 2: aus 60 s Rest werden 30
    laufe(state, 29);
    expect(state.globalStock.iron_sword).toBe(0);
    laufe(state, 1);
    expect(state.globalStock.iron_sword).toBe(1);
  });

  it('Stufe 1 bleibt beim Tempo des Rezepts', () => {
    const { state } = schmiede({ iron_scrap: 100, gold: 1000 });
    const b = state.buildings[0];
    for (let i = 0; i < 5; i++) auftragGeben(b, SCHWERT);
    laufe(state, 1 + 2 * 90);
    expect(state.globalStock.iron_sword).toBe(2);
  });
});
