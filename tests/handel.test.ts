import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createBuildingInstance, BuildingInstance } from '../src/models/Building';
import { BUILDING_DEFS } from '../src/data/buildings';
import { RECIPE_DEFS } from '../src/data/recipes';
import { BUENDEL, HANDELSWAREN, VERKAUFSPREIS, buendelProTag, kaufpreis } from '../src/data/handel';
import { handelHeute, handle, kannHandeln } from '../src/systems/Handel';
import { TAG_SEKUNDEN } from '../src/systems/GebaeudeStatus';

/** Neues Spiel mit Marktplatz auf `stufe` und `arbeiter` besetzten Plätzen. */
function mitMarkt(arbeiter: number, stufe = 3): { state: GameState; markt: BuildingInstance } {
  const state = createNewGameState();
  const markt = createBuildingInstance('MARKETPLACE', 0, 0, true);
  markt.connected = true;
  markt.tier = stufe;
  markt.assignedWorkerIds = Array.from({ length: arbeiter }, (_, i) => 100 + i);
  state.buildings.push(markt);
  return { state, markt };
}

/** Wert einer Menge Waren zum Verkaufspreis, in Gold pro Stück. */
function wert(waren: Record<string, number>): number {
  return Object.entries(waren).reduce((s, [ware, n]) => s + n * VERKAUFSPREIS[ware] / BUENDEL, 0);
}

describe('Preise', () => {
  it('handelt nur Stadtwaren', () => {
    expect([...HANDELSWAREN].sort()).toEqual(
      ['bread', 'flour', 'grain', 'herb_green', 'iron_scrap', 'stone', 'wood'].sort(),
    );
    for (const ware of HANDELSWAREN) expect(Number.isInteger(VERKAUFSPREIS[ware])).toBe(true);
  });

  it('für jede Ware ist kaufen dann verkaufen ein Verlust', () => {
    for (const ware of HANDELSWAREN) {
      expect(kaufpreis(ware)).toBeGreaterThanOrEqual(2 * VERKAUFSPREIS[ware]);
      const { state } = mitMarkt(3);
      state.globalStock.gold = 1000;
      const vorher = state.globalStock.gold;
      expect(handle(state, ware, 'kaufen').ok).toBe(true);
      expect(handle(state, ware, 'verkaufen').ok).toBe(true);
      expect(state.globalStock.gold).toBeLessThan(vorher);
    }
  });

  it('jede verarbeitete Ware ist mehr wert als ihre Zutaten', () => {
    const ketten = Object.values(RECIPE_DEFS).filter(r =>
      Object.keys(r.inputs).length > 0
      && [...Object.keys(r.inputs), ...Object.keys(r.outputs)].every(w => w in VERKAUFSPREIS));
    expect(ketten.map(r => r.id).sort()).toEqual(['RCP_BREAD_1', 'RCP_FLOUR_1']);
    for (const r of ketten) expect(wert(r.outputs)).toBeGreaterThan(wert(r.inputs));
    // 10 Brot brauchen 20 Mehl
    expect(VERKAUFSPREIS.bread).toBeGreaterThan(2 * VERKAUFSPREIS.flour);
  });

  it('ein Arbeiter bringt mit verkaufter Tagesproduktion 1 bis 2 Gold pro Tag', () => {
    const rohstoffe = Object.values(BUILDING_DEFS).flatMap(def => def.recipes
      .map(id => RECIPE_DEFS[id])
      .filter(r => r && Object.keys(r.inputs).length === 0
        && Object.keys(r.outputs).every(w => w in VERKAUFSPREIS))
      .map(r => ({ werkstatt: def.id, r })));
    expect(rohstoffe.length).toBeGreaterThanOrEqual(5);
    for (const { werkstatt, r } of rohstoffe) {
      const goldProTag = wert(r.outputs) * TAG_SEKUNDEN / r.cycleTimeSec;
      expect(goldProTag, `${werkstatt} ${r.id}`).toBeGreaterThanOrEqual(1);
      expect(goldProTag, `${werkstatt} ${r.id}`).toBeLessThanOrEqual(2);
    }
  });
});

describe('Handeln', () => {
  it('verkaufen bucht Ware und Gold', () => {
    const { state } = mitMarkt(1);
    state.globalStock.wood = 25;
    state.globalStock.gold = 0;
    expect(handle(state, 'wood', 'verkaufen').ok).toBe(true);
    expect(state.globalStock.wood).toBe(15);
    expect(state.globalStock.gold).toBe(VERKAUFSPREIS.wood);
  });

  it('kaufen bucht Ware und Gold', () => {
    const { state } = mitMarkt(1);
    state.globalStock.stone = 0;
    state.globalStock.gold = 20;
    expect(handle(state, 'stone', 'kaufen').ok).toBe(true);
    expect(state.globalStock.stone).toBe(BUENDEL);
    expect(state.globalStock.gold).toBe(20 - kaufpreis('stone'));
  });

  it('Vorrat und Gold werden nie negativ', () => {
    const { state } = mitMarkt(3);
    state.globalStock.wood = 9;
    state.globalStock.iron_scrap = undefined as unknown as number;
    state.globalStock.gold = kaufpreis('iron_scrap') - 1;
    expect(handle(state, 'wood', 'verkaufen')).toMatchObject({ ok: false, grund: expect.stringContaining('Lager') });
    expect(handle(state, 'iron_scrap', 'verkaufen').ok).toBe(false);
    expect(handle(state, 'iron_scrap', 'kaufen')).toMatchObject({ ok: false, grund: expect.stringContaining('Gold') });
    expect(state.globalStock.wood).toBe(9);
    expect(state.globalStock.gold).toBe(kaufpreis('iron_scrap') - 1);
    expect(handelHeute(state)).toBe(10);
  });

  it('handelt keine anderen Waren', () => {
    const { state } = mitMarkt(3);
    state.globalStock.crystal_shard = 50;
    state.globalStock.healing_potion = 50;
    expect(kannHandeln(state, 'crystal_shard', 'verkaufen').ok).toBe(false);
    expect(kannHandeln(state, 'healing_potion', 'verkaufen').ok).toBe(false);
    expect(kannHandeln(state, 'gold', 'kaufen').ok).toBe(false);
  });
});

describe('Tagesmenge', () => {
  it('passt je Stufe, ist aufgebraucht nichts mehr, am nächsten Tag wieder', () => {
    expect([0, 1, 2, 3].map(buendelProTag)).toEqual([0, 3, 6, 10]);
    for (const [arbeiter, menge] of [[1, 3], [2, 6], [3, 10]]) {
      const { state, markt } = mitMarkt(arbeiter);
      state.globalStock.wood = 1000;
      expect(handelHeute(state)).toBe(menge);
      for (let i = 0; i < menge; i++) expect(handle(state, 'wood', 'verkaufen').ok).toBe(true);
      expect(handelHeute(state)).toBe(0);
      expect(handle(state, 'wood', 'verkaufen')).toMatchObject({ ok: false, grund: expect.stringContaining('morgen') });
      state.globalStock.gold = 1000;
      expect(handle(state, 'wood', 'kaufen').ok).toBe(false);
      expect(state.globalStock.wood).toBe(1000 - menge * BUENDEL);
      expect(markt.handelBuendel).toBe(menge);

      state.day++;
      expect(handelHeute(state)).toBe(menge);
      expect(handle(state, 'wood', 'kaufen').ok).toBe(true);
      expect(markt.handelTag).toBe(state.day);
      expect(handelHeute(state)).toBe(menge - 1);
    }
  });

  it('nie mehr Arbeiter gezählt als Plätze da sind', () => {
    const { state } = mitMarkt(3, 1);
    expect(handelHeute(state)).toBe(3);
  });

  it('ohne Arbeiter geht nichts', () => {
    const { state } = mitMarkt(0);
    state.globalStock.wood = 100;
    expect(handelHeute(state)).toBe(0);
    expect(handle(state, 'wood', 'verkaufen')).toEqual({ ok: false, grund: 'Handel erst mit einem Arbeiter.' });
    expect(state.globalStock.wood).toBe(100);
  });

  it('ohne gebauten Marktplatz geht nichts', () => {
    const { state, markt } = mitMarkt(1);
    markt.built = false;
    state.globalStock.wood = 100;
    expect(handelHeute(state)).toBe(0);
    expect(handle(state, 'wood', 'verkaufen').ok).toBe(false);
    state.buildings = [];
    expect(handle(state, 'wood', 'verkaufen').ok).toBe(false);
    expect(state.globalStock.wood).toBe(100);
  });
});
