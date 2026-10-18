import { describe, it, expect } from 'vitest';
import { EconomySystem } from './EconomySystem';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, BuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';

function bauen(state: GameState, typeId: string): BuildingInstance {
  const b = createBuildingInstance(typeId, 0, 0, true);
  b.connected = true;
  state.buildings.push(b);
  return b;
}

function arbeiter(state: GameState, b: BuildingInstance): void {
  const c = createCitizen('WORKER');
  c.assignedBuildingId = b.id;
  b.assignedWorkerIds.push(c.id);
  state.citizens.push(c);
}

function stadt(bewohner: number, zufriedenheit: number): GameState {
  const state = createNewGameState();
  for (let i = 0; i < bewohner; i++) state.citizens.push(createCitizen('IDLE'));
  state.satisfaction = zufriedenheit;
  return state;
}

describe('EconomySystem', () => {
  it('jeder Bewohner zahlt 2 Gold mal Zufriedenheit', () => {
    const economy = new EconomySystem();
    expect(economy.steuernProTag(stadt(6, 50))).toBe(6);
    expect(economy.steuernProTag(stadt(6, 100))).toBe(12);
    expect(economy.steuernProTag(stadt(10, 75))).toBe(15);
    expect(economy.steuernProTag(stadt(0, 100))).toBe(0);
  });

  it('Marktplatz mit Arbeiter gibt +25 % Steuern, Bank mit Arbeiter +10 Gold', () => {
    const economy = new EconomySystem();
    const state = stadt(6, 100);
    const markt = bauen(state, 'MARKETPLACE');
    const bank = bauen(state, 'BANK');
    // Ohne Arbeiter wirken beide nicht
    expect(economy.steuerRechnung(state).marktProzent).toBe(0);
    expect(economy.steuerRechnung(state).bank).toBe(0);

    arbeiter(state, markt);
    arbeiter(state, bank);
    const r = economy.steuerRechnung(state);
    expect(r.bewohner).toBe(8);
    expect(r.marktProzent).toBe(25);
    expect(r.steuern).toBe(Math.floor(8 * 2 * 1.25));
    expect(r.bank).toBe(10);
    expect(r.gesamt).toBe(r.steuern + 10);
  });

  it('Marktplatz Stufe 3 voll besetzt: +50 %', () => {
    const economy = new EconomySystem();
    const state = stadt(4, 100);
    const markt = bauen(state, 'MARKETPLACE');
    markt.tier = 3;
    for (let i = 0; i < 3; i++) arbeiter(state, markt);
    expect(economy.steuerRechnung(state).marktProzent).toBe(50);
  });

  it('dayTick bucht das Gold und zählt den Tag hoch', () => {
    const economy = new EconomySystem();
    const state = stadt(6, 100);
    state.globalStock.gold = 20;
    state.day = 3;
    economy.dayTick(state);
    expect(state.globalStock.gold).toBe(32);
    expect(state.day).toBe(4);
  });
});
