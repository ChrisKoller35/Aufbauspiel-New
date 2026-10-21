import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createBuildingInstance } from '../src/models/Building';
import { createCitizen } from '../src/models/Citizen';
import { BUILDING_DEFS } from '../src/data/buildings';
import { placeStartingLayout, createStartingCitizens } from '../src/scenes/CityStartingLayout';
import { PeopleSystem, brotProTag, brotNachEssen } from '../src/systems/PeopleSystem';
import { SatisfactionSystem } from '../src/systems/SatisfactionSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { ProductionSystem } from '../src/systems/ProductionSystem';
import { TAG_SEKUNDEN, wachstum } from '../src/systems/GebaeudeStatus';

const BROTKETTE = ['FARM_GRAIN', 'WELL', 'MILL_WIND', 'BAKERY'];

/** Neues Spiel wie in main.ts: Startgebäude und 6 Bewohner. */
function neuesSpiel(): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  createStartingCitizens(state);
  return state;
}

/** Baut wie BuildingsScreen.executeBuy, wenn das Lager reicht (Gebäude sind sofort fertig). */
function kaufe(state: GameState, typeId: string): boolean {
  const def = BUILDING_DEFS[typeId];
  if (Object.entries(def.buildCost).some(([res, qty]) => (state.globalStock[res] ?? 0) < qty)) return false;
  for (const [res, qty] of Object.entries(def.buildCost)) state.globalStock[res] -= qty;
  const b = createBuildingInstance(typeId, 0, 0, true);
  if (def.recipes.length > 0) b.activeRecipeId = def.recipes[0];
  b.connected = true;
  state.buildings.push(b);
  return true;
}

/** Spielt eine Sekunde wie die Spielschleife in main.ts (Stadt-Takt 1 s, Tag 30 s). */
class Spiel {
  readonly production = new ProductionSystem();
  readonly people = new PeopleSystem();
  readonly satisfaction = new SatisfactionSystem();
  readonly economy = new EconomySystem();
  sekunde = 0;

  /** Mit `festeZufriedenheit` rechnet die Stadt immer mit diesem Wert (für die Gold-Messung). */
  constructor(readonly state: GameState, readonly festeZufriedenheit?: number) {
    this.satisfaction.update(state);
  }

  takt(): void {
    this.sekunde++;
    this.production.update(this.state, 1);
    this.people.cityTick(this.state, 1);
    this.satisfaction.update(this.state);
    if (this.festeZufriedenheit !== undefined) this.state.satisfaction = this.festeZufriedenheit;
    if (this.sekunde % TAG_SEKUNDEN === 0) {
      this.economy.dayTick(this.state);
      this.people.dayTick(this.state);
    }
  }
}

/** Heldenpreis wie HeroesScreen: 50 + 30 je Held, den man schon hat. */
const heldenPreis = (helden: number) => 50 + helden * 30;

interface Messung {
  zweiterHeld: number;
  marktplatz: number;
  minZufriedenheit: number;
  maxZufriedenheit: number;
}

/**
 * Musterspieler ohne Expeditionen: heuert sofort den ersten Helden an und baut die
 * Brotkette, kauft den zweiten Helden, sobald das Gold reicht, baut den Steinbruch
 * und danach den Marktplatz. Gemessen wird die Sekunde des Kaufs.
 */
function goldTempo(festeZufriedenheit?: number): Messung {
  const state = neuesSpiel();
  let helden = 0;
  state.globalStock.gold -= heldenPreis(helden++);
  for (const typeId of BROTKETTE) expect(kaufe(state, typeId)).toBe(true);

  const spiel = new Spiel(state, festeZufriedenheit);
  const m: Messung = { zweiterHeld: 0, marktplatz: 0, minZufriedenheit: 100, maxZufriedenheit: 0 };
  let steinbruch = false;
  while (!m.marktplatz && spiel.sekunde < 3600) {
    spiel.takt();
    m.minZufriedenheit = Math.min(m.minZufriedenheit, state.satisfaction);
    m.maxZufriedenheit = Math.max(m.maxZufriedenheit, state.satisfaction);
    if (!steinbruch) steinbruch = kaufe(state, 'QUARRY');
    if (!m.zweiterHeld && state.globalStock.gold >= heldenPreis(helden)) {
      state.globalStock.gold -= heldenPreis(helden++);
      m.zweiterHeld = spiel.sekunde;
    } else if (m.zweiterHeld && kaufe(state, 'MARKETPLACE')) {
      m.marktplatz = spiel.sekunde;
    }
  }
  return m;
}

describe('Startwirtschaft: Brot als täglicher Verbrauch', () => {
  it('1 Brot je angefangene 6 Bewohner pro Tag', () => {
    expect(brotProTag(0)).toBe(0);
    expect(brotProTag(1)).toBe(1);
    expect(brotProTag(6)).toBe(1);
    expect(brotProTag(7)).toBe(2);
    expect(brotProTag(12)).toBe(2);
    expect(brotProTag(13)).toBe(3);
    expect(brotProTag(18)).toBe(3);
    expect(brotProTag(36)).toBe(6);
  });

  it('erst essen, dann wachsen: ein neuer Bewohner nur, wenn nach dem Essen Brot übrig ist', () => {
    const state = neuesSpiel();
    state.buildings.find(b => b.typeId === 'HOUSE_T1')!.tier = 2; // 12 Plätze
    const people = new PeopleSystem();

    state.globalStock.bread = 1; // reicht genau zum Essen
    expect(wachstum(state).waechst).toBe(false);
    people.dayTick(state);
    expect(state.globalStock.bread).toBe(0);
    expect(state.citizens).toHaveLength(6);

    state.globalStock.bread = 2; // 1 essen, 1 für den neuen Bewohner
    expect(wachstum(state).waechst).toBe(true);
    people.dayTick(state);
    expect(state.globalStock.bread).toBe(0);
    expect(state.citizens).toHaveLength(7);

    state.globalStock.bread = 5; // 7 Bewohner essen 2
    expect(brotNachEssen(state)).toBe(3);
    people.dayTick(state);
    expect(state.globalStock.bread).toBe(2);
    expect(state.citizens).toHaveLength(8);
  });

  it('das Brot im Lager geht nie unter 0', () => {
    const state = neuesSpiel();
    for (let i = 0; i < 12; i++) state.citizens.push(createCitizen('IDLE')); // 18 Bewohner essen 3
    const people = new PeopleSystem();
    for (const vorrat of [0, 1, 2, 2.5]) {
      state.globalStock.bread = vorrat;
      people.dayTick(state);
      expect(state.globalStock.bread).toBe(0);
    }
    delete state.globalStock.bread;
    people.dayTick(state);
    expect(state.globalStock.bread).toBe(0);
  });

  it('ohne Brot sinkt die Zufriedenheit, die Bewohner bleiben', () => {
    const state = neuesSpiel();
    const spiel = new Spiel(state);
    const mitBrot = state.satisfaction;
    state.globalStock.bread = 0;
    for (let i = 0; i < 10 * TAG_SEKUNDEN; i++) spiel.takt();
    expect(state.satisfaction).toBe(mitBrot - 30); // statt +10 jetzt −20
    expect(state.citizens).toHaveLength(6);
    expect(state.globalStock.bread).toBe(0);
  });

  it('das Startbrot reicht ohne Brotkette 10 Tage (5 Minuten)', () => {
    const state = neuesSpiel();
    const spiel = new Spiel(state);
    const start = state.satisfaction;
    for (let tag = 1; tag <= 10; tag++) {
      for (let i = 0; i < TAG_SEKUNDEN - 1; i++) spiel.takt();
      expect(state.satisfaction, `Tag ${tag}`).toBe(start); // bis zum Tageswechsel satt
      spiel.takt();
    }
    expect(spiel.sekunde).toBe(300);
    expect(state.globalStock.bread).toBe(0);
    spiel.takt(); // erst der nächste Stadt-Takt rechnet die Zufriedenheit neu
    expect(state.satisfaction).toBe(start - 30);
    expect(state.citizens).toHaveLength(6);
  });

  it('die Brotkette ist mit dem Startlager baubar und hält den Vorrat über 10 Tage', () => {
    const state = neuesSpiel();
    state.globalStock.gold -= heldenPreis(0);
    for (const typeId of BROTKETTE) expect(kaufe(state, typeId)).toBe(true);
    const spiel = new Spiel(state);
    let ersteBrotSekunde = 0;
    let minBrot = Infinity;
    const anfang = state.globalStock.bread;
    while (spiel.sekunde < 10 * TAG_SEKUNDEN) {
      spiel.takt();
      minBrot = Math.min(minBrot, state.globalStock.bread);
      if (!ersteBrotSekunde && state.globalStock.bread > anfang) ersteBrotSekunde = spiel.sekunde;
    }
    expect(ersteBrotSekunde).toBeGreaterThan(0);
    expect(ersteBrotSekunde).toBeLessThan(TAG_SEKUNDEN * 2);
    expect(minBrot).toBeGreaterThanOrEqual(1);
    expect(state.globalStock.bread).toBeGreaterThan(anfang); // ~2 Brot gebacken, 1 gegessen pro Tag
  });
});

// Gemessen mit 100 Startgold (6 Bewohner, Wohnviertel auf Stadtstufe 1 nicht ausbaubar):
//   50 % Zufriedenheit:  2. Held 150 s, Marktplatz 450 s
//   60 % Zufriedenheit:  2. Held 150 s, Marktplatz 390 s
//   echt (Brunnen + Brot = 70 %): 2. Held 120 s, Marktplatz 360 s
describe('Startwirtschaft: Gold-Tempo ohne Expeditionen', () => {
  it('mit 60 % Zufriedenheit: zweiter Held nach etwa 3 Minuten, Marktplatz nach etwa 6 Minuten', () => {
    const m = goldTempo(60);
    expect(m.zweiterHeld).toBeGreaterThanOrEqual(120);
    expect(m.zweiterHeld).toBeLessThanOrEqual(210);
    expect(m.marktplatz).toBeGreaterThanOrEqual(300);
    expect(m.marktplatz).toBeLessThanOrEqual(390);
  });

  it('mit 50 % Zufriedenheit: Marktplatz noch vor 8 Minuten', () => {
    const m = goldTempo(50);
    expect(m.zweiterHeld).toBeLessThanOrEqual(210);
    expect(m.marktplatz).toBeLessThan(480);
  });

  it('echter Ablauf mit Brunnen und Brotkette: satt die ganze Zeit, Ziele erreicht', () => {
    const m = goldTempo();
    expect(m.minZufriedenheit).toBeGreaterThanOrEqual(60); // nie ohne Brot
    expect(m.zweiterHeld).toBeGreaterThanOrEqual(90);
    expect(m.zweiterHeld).toBeLessThanOrEqual(210);
    expect(m.marktplatz).toBeGreaterThanOrEqual(300);
    expect(m.marktplatz).toBeLessThanOrEqual(360);
  });
});
