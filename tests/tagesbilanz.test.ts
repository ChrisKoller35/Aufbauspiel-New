import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createBuildingInstance, BuildingInstance } from '../src/models/Building';
import { createCitizen } from '../src/models/Citizen';
import { BUILDING_DEFS } from '../src/data/buildings';
import { brotProTag } from '../src/systems/PeopleSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { tagesBilanz, reichtTage } from '../src/systems/Tagesbilanz';
import { auftragGeben } from '../src/systems/Auftraege';
import { bilanzZahl, bilanzZeileHTML, bilanzTipp } from '../src/ui/screens/ProduktionTab';

/** Leere Stadt mit `bewohner` Bewohnern (ohne Startgebäude). */
function stadt(bewohner = 0): GameState {
  const state = createNewGameState();
  state.buildings = [];
  state.citizens = [];
  for (let i = 0; i < bewohner; i++) state.citizens.push(createCitizen());
  return state;
}

/** Fertiges, angebundenes Gebäude mit erstem Rezept, Stufe und Arbeitern. */
function baue(state: GameState, typeId: string, stufe = 1, arbeiter = 1): BuildingInstance {
  const b = createBuildingInstance(typeId, 0, 0, true);
  const def = BUILDING_DEFS[typeId];
  if (def.recipes.length > 0) b.activeRecipeId = def.recipes[0];
  b.connected = true;
  b.tier = stufe;
  for (let i = 0; i < arbeiter; i++) {
    const c = createCitizen('WORKER');
    c.assignedBuildingId = b.id;
    state.citizens.push(c);
    b.assignedWorkerIds.push(c.id);
  }
  state.buildings.push(b);
  return b;
}

/** Brotkette mit Brunnen (Brunnen versorgt alle, wie SatisfactionSystem). */
function brotkette(state: GameState, mitBrunnen = true): void {
  for (const id of ['FARM_GRAIN', 'MILL_WIND', 'BAKERY']) baue(state, id);
  if (mitBrunnen) {
    baue(state, 'WELL', 1, 0);
    for (const b of state.buildings) b.waterSupplied = true;
  }
}

describe('Tagesbilanz: Rohstoffe', () => {
  it('Holzfällerhütte Stufe 1 mit 1 Arbeiter: +6 Holz', () => {
    const state = stadt();
    baue(state, 'LUMBER_CAMP');
    const holz = tagesBilanz(state).waren.wood;
    expect(holz.erzeugt).toBeCloseTo(6);
    expect(holz.verbraucht).toBe(0);
    expect(holz.bilanz).toBeCloseTo(6);
    expect(holz.posten).toEqual([{ quelle: 'Holzfällerhütte', menge: expect.closeTo(6) }]);
  });

  it('Holzfällerhütte Stufe 3 mit 3 Arbeitern: +18 Holz', () => {
    const state = stadt();
    baue(state, 'LUMBER_CAMP', 3, 3);
    expect(tagesBilanz(state).waren.wood.bilanz).toBeCloseTo(18);
  });

  it('ein Gebäude ohne Arbeiter zählt nicht', () => {
    const state = stadt();
    baue(state, 'LUMBER_CAMP', 1, 0);
    expect(tagesBilanz(state).waren.wood).toBeUndefined();
  });
});

describe('Tagesbilanz: Brotkette', () => {
  it('Farm, Mühle und Bäckerei mit Brunnen', () => {
    const state = stadt();
    brotkette(state);
    const { waren } = tagesBilanz(state);
    const bewohner = state.citizens.length;

    expect(waren.grain.erzeugt).toBeCloseTo(6);
    expect(waren.grain.verbraucht).toBeCloseTo(5);
    expect(waren.grain.bilanz).toBeCloseTo(1);

    expect(waren.flour.erzeugt).toBeCloseTo(5);
    expect(waren.flour.verbraucht).toBeCloseTo(60 / 14);
    expect(waren.flour.bilanz).toBeCloseTo(5 - 60 / 14);

    expect(waren.bread.erzeugt).toBeCloseTo(30 / 14);
    expect(waren.bread.verbraucht).toBeCloseTo(brotProTag(bewohner));
    expect(waren.bread.bilanz).toBeCloseTo(30 / 14 - brotProTag(bewohner));
    expect(waren.bread.posten.map(p => p.quelle)).toEqual(['Bäckerei', 'Bewohner']);
  });

  it('fehlende Zutaten zählen trotzdem (leeres Lager)', () => {
    const state = stadt();
    brotkette(state);
    state.globalStock = {};
    expect(tagesBilanz(state).waren.flour.verbraucht).toBeCloseTo(60 / 14);
  });

  it('Bäckerei ohne Brunnen zählt 0, es bleibt nur der Hunger', () => {
    const state = stadt();
    brotkette(state, false);
    const { waren } = tagesBilanz(state);
    expect(waren.flour.verbraucht).toBe(0);
    expect(waren.bread.erzeugt).toBe(0);
    expect(waren.bread.bilanz).toBeCloseTo(-brotProTag(state.citizens.length));
  });

  it('die Bewohner essen auch ohne Bäckerei', () => {
    const state = stadt(13);
    expect(tagesBilanz(state).waren.bread.bilanz).toBe(-brotProTag(13));
  });
});

describe('Tagesbilanz: Werkstätten und Gold', () => {
  it('eine Schmiede mit Aufträgen zählt nicht', () => {
    const state = stadt();
    const schmiede = baue(state, 'SMITHY');
    expect(BUILDING_DEFS.SMITHY.manualCraft).toBe(true);
    auftragGeben(schmiede, 'RCP_IRON_SWORD');
    auftragGeben(schmiede, 'RCP_IRON_SWORD');
    const { waren } = tagesBilanz(state);
    expect(waren.iron_scrap).toBeUndefined();
    expect(waren.iron_sword).toBeUndefined();
    expect(waren.wood).toBeUndefined();
  });

  it('Gold ist gleich steuernProTag', () => {
    const state = stadt(12);
    state.satisfaction = 80;
    const gold = tagesBilanz(state).gold;
    expect(gold.gesamt).toBe(new EconomySystem().steuernProTag(state));
    expect(gold.gesamt).toBeGreaterThan(0);
  });

  it('reicht: Vorrat geteilt durch Verbrauch, abgerundet', () => {
    expect(reichtTage(10, -1.5)).toBe(6);
    expect(reichtTage(0, -1)).toBe(0);
    expect(reichtTage(10, 2)).toBeNull();
  });
});

describe('Tagesbilanz: Anzeige im Reiter «Produktion»', () => {
  it('Zahlen mit einer Nachkommastelle, Komma und echtem Minus', () => {
    expect(bilanzZahl(12)).toBe('+12');
    expect(bilanzZahl(-1.43)).toBe('−1,4');
    expect(bilanzZahl(0.04)).toBe('');
  });

  it('Zeile «Pro Tag:»: Chip je Ware, rot mit «reicht» bei minus', () => {
    const state = stadt(13);
    baue(state, 'LUMBER_CAMP');
    state.globalStock.bread = 9;
    const html = bilanzZeileHTML(state, tagesBilanz(state));
    expect(html).toContain('Pro Tag:');
    expect(html).toContain('🪵 +6');
    expect(html).toMatch(/class="tb-chip minus" data-bilanz="bread"/);
    expect(html).toContain(`reicht ${Math.floor(9 / brotProTag(state.citizens.length))} Tage`);
    // Ohne Bilanz kein Chip
    expect(html).not.toContain('data-bilanz="stone"');
  });

  it('Erklärung des Chips nennt die Posten', () => {
    const state = stadt();
    brotkette(state);
    const tipp = bilanzTipp(state, 'bread');
    expect(tipp.zeilen[0]).toBe('Bäckerei +2,1');
    expect(tipp.zeilen[1]).toBe(`Bewohner ${bilanzZahl(-brotProTag(state.citizens.length))}`);
  });
});
