import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createBuildingInstance, BuildingInstance } from '../src/models/Building';
import { createCitizen } from '../src/models/Citizen';
import { BUILDING_DEFS } from '../src/data/buildings';
import { RECIPE_DEFS } from '../src/data/recipes';
import { ITEM_DEFS } from '../src/data/items';
import { BUENDEL, HANDELSWAREN, VERKAUFSPREIS, buendelProTag, kaufpreis } from '../src/data/handel';
import { handelHeute, handelZu, handle, kannHandeln, marktKosten, vorbehalten } from '../src/systems/Handel';
import { TAG_SEKUNDEN } from '../src/systems/GebaeudeStatus';
import { ProductionSystem } from '../src/systems/ProductionSystem';
import { PeopleSystem, brotProTag } from '../src/systems/PeopleSystem';
import { vorratZiel } from '../src/systems/Werkstattplan';

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

const name = (ware: string): string => ITEM_DEFS[ware]?.name ?? ware;

interface Weg {
  /** «Getreide → Mehl → Brot» */
  name: string;
  /** Gold je Stück der Ware */
  kosten: number;
  verarbeitet: boolean;
}

/** Alle Wege, ein Stück einer Ware mit Gold zu beschaffen: kaufen, oder Zutaten kaufen und verarbeiten (alle Stufen). */
function wege(ware: string, unterwegs: string[] = []): Weg[] {
  const liste: Weg[] = HANDELSWAREN.includes(ware) ? [{ name: name(ware), kosten: kaufpreis(ware) / BUENDEL, verarbeitet: false }] : [];
  if (unterwegs.includes(ware)) return liste;
  for (const r of Object.values(RECIPE_DEFS)) {
    const stueck = r.outputs[ware] ?? 0;
    if (stueck <= 0 || Object.keys(r.inputs).length === 0) continue;
    let teile: { namen: string[]; kosten: number }[] = [{ namen: [], kosten: 0 }];
    for (const [zutat, n] of Object.entries(r.inputs)) {
      const zw = wege(zutat, [...unterwegs, ware]);
      teile = teile.flatMap(t => zw.map(w => ({ namen: [...t.namen, w.name], kosten: t.kosten + n * w.kosten })));
    }
    for (const t of teile) {
      const vorne = t.namen.length > 1 ? t.namen.map(n => `(${n})`).join(' + ') : t.namen[0];
      liste.push({ name: `${vorne} → ${name(ware)}`, kosten: t.kosten / stueck, verarbeitet: true });
    }
  }
  return liste;
}

/** Ein Arbeiter auf Stufe 1, 30 Tage im Spieltakt (1 s): Gold pro Tag, wenn alles verkauft wird. */
function echtesGoldProTag(typeId: string, recipeId: string): number {
  const state = createNewGameState();
  const b = createBuildingInstance(typeId, 0, 0, true);
  b.connected = true;
  b.activeRecipeId = recipeId;
  b.assignedWorkerIds = [1];
  state.buildings.push(b);
  const vorher = { ...state.globalStock };
  const produktion = new ProductionSystem();
  for (let s = 0; s < 30 * TAG_SEKUNDEN; s++) produktion.update(state, 1);
  const dazu: Record<string, number> = {};
  for (const ware of Object.keys(RECIPE_DEFS[recipeId].outputs)) dazu[ware] = (state.globalStock[ware] ?? 0) - (vorher[ware] ?? 0);
  return wert(dazu) / 30;
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
      && [...Object.keys(r.inputs), ...Object.keys(r.outputs)].every(w => HANDELSWAREN.includes(w)));
    expect(ketten.map(r => r.id).sort()).toEqual(['RCP_BREAD_1', 'RCP_FLOUR_1']);
    for (const r of ketten) expect(wert(r.outputs)).toBeGreaterThan(wert(r.inputs));
    // 10 Brot brauchen 20 Mehl
    expect(VERKAUFSPREIS.bread).toBeGreaterThan(2 * VERKAUFSPREIS.flour);
  });

  it('keine Kette bringt Gewinn: Zutaten kaufen, verarbeiten (auch über mehrere Stufen), verkaufen', () => {
    // Die Wege rechnen je Rezept eine Ware; ein Rezept mit Nebenprodukt müsste es mitrechnen
    for (const r of Object.values(RECIPE_DEFS)) expect(Object.keys(r.outputs), r.id).toHaveLength(1);
    const ketten = HANDELSWAREN.flatMap(ware => wege(ware)
      .filter(w => w.verarbeitet)
      .map(w => ({ name: w.name, gewinnJeBuendel: VERKAUFSPREIS[ware] - w.kosten * BUENDEL })));
    expect(ketten.map(k => k.name)).toEqual(expect.arrayContaining(['Getreide → Mehl', 'Mehl → Brot', 'Getreide → Mehl → Brot']));
    for (const k of ketten) expect(k.gewinnJeBuendel, k.name).toBeLessThanOrEqual(1e-9);
    // Die Kette Getreide → Brot geht genau auf: 20 Getreide kosten 12 Gold, 10 Brot bringen 12 (docs/HANDEL.md)
    const brot = ketten.find(k => k.name === 'Getreide → Mehl → Brot')!;
    expect(brot.gewinnJeBuendel).toBeCloseTo(0, 9);
    expect(2 * kaufpreis('grain')).toBe(VERKAUFSPREIS.bread);
  });

  it('der billigste Weg über den Markt: nie billiger, als der Markt für die Ware zahlt', () => {
    expect(marktKosten('grain')).toBeCloseTo(0.6, 9);
    expect(marktKosten('flour')).toBeCloseTo(0.6, 9); // aus gekauftem Getreide, nicht 1,5 für gekauftes Mehl
    expect(marktKosten('bread')).toBeCloseTo(1.2, 9);
    expect(marktKosten('healing_potion')).toBeCloseTo(4.5, 9); // 3 Kräuter
    expect(marktKosten('power_bread')).toBeCloseTo(2.7, 9); // 2 Mehl aus Getreide + 1 Kraut
    expect(marktKosten('iron_sword')).toBeCloseTo(9.6, 9);
    expect(marktKosten('crystal_shard')).toBe(Infinity);
    expect(marktKosten('steel_sword')).toBe(Infinity); // braucht Kristallsplitter
    for (const ware of HANDELSWAREN) expect(VERKAUFSPREIS[ware] / BUENDEL, ware).toBeLessThanOrEqual(marktKosten(ware) + 1e-9);
  });

  it('ein Arbeiter bringt mit verkaufter Tagesproduktion 1 bis 2 Gold pro Tag, im Rezept und im Spieltakt', () => {
    // Rohstoff-Gebäude, die von selbst laufen; der Kräutergarten arbeitet nur auf Auftrag
    const rohstoffe = Object.values(BUILDING_DEFS).filter(def => !def.manualCraft).flatMap(def => def.recipes
      .map(id => RECIPE_DEFS[id])
      .filter(r => r && Object.keys(r.inputs).length === 0
        && Object.keys(r.outputs).every(w => HANDELSWAREN.includes(w)))
      .map(r => ({ werkstatt: def.id, r })));
    expect(rohstoffe.map(x => x.werkstatt).sort()).toEqual(['FARM_GRAIN', 'IRON_MINE', 'LUMBER_CAMP', 'QUARRY']);
    for (const { werkstatt, r } of rohstoffe) {
      const rezept = wert(r.outputs) * TAG_SEKUNDEN / r.cycleTimeSec;
      // Im Spieltakt laufen die Zyklen ohne Lücke (ProductionSystem mit Übertrag), es kommt also heraus, was im
      // Rezept steht; nur der erste Takt startet bloss, darum über 30 Tage ein Hauch weniger (docs/HANDEL.md).
      const spieltakt = echtesGoldProTag(werkstatt, r.id);
      expect(spieltakt, `${werkstatt} ${r.id}`).toBeLessThanOrEqual(rezept);
      for (const gold of [rezept, spieltakt]) {
        expect(gold, `${werkstatt} ${r.id}`).toBeGreaterThanOrEqual(1);
        expect(gold, `${werkstatt} ${r.id}`).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('Brot der Bewohner', () => {
  it('Brot geht nur weg, soweit es über dem Vorrat für 3 Tage liegt', () => {
    const { state } = mitMarkt(3);
    // 16 Bewohner essen 2 Brot am Tag, kein Platz für neue: 6 Brot bleiben
    state.citizens = Array.from({ length: 16 }, () => createCitizen('IDLE'));
    expect(vorratZiel(state, 'BAKERY')).toBe(6);
    expect(vorbehalten(state, 'bread')).toBe(6);
    state.globalStock.bread = 15;
    expect(handle(state, 'bread', 'verkaufen')).toEqual({ ok: false, grund: 'Das Brot brauchen die Bewohner.' });
    expect(state.globalStock.bread).toBe(15);
    state.globalStock.bread = 16;
    expect(handle(state, 'bread', 'verkaufen').ok).toBe(true);
    expect(state.globalStock.bread).toBe(6);
    expect(kannHandeln(state, 'bread', 'verkaufen').grund).toBe('Zu wenig im Lager (braucht 10).');
    // Kaufen geht immer
    state.globalStock.gold = 100;
    expect(handle(state, 'bread', 'kaufen').ok).toBe(true);
    expect(state.globalStock.bread).toBe(16);
  });

  it('mit Platz im Wohnviertel bleibt auch das Brot für den nächsten Bewohner', () => {
    const { state } = mitMarkt(3);
    const haus = createBuildingInstance('HOUSE_T1', 0, 0, true);
    haus.connected = true;
    haus.tier = 4;
    state.buildings.push(haus);
    state.citizens = Array.from({ length: 16 }, () => createCitizen('IDLE'));
    expect(vorbehalten(state, 'bread')).toBe(3 * (brotProTag(16) + 1));
    state.globalStock.bread = 18;
    expect(handle(state, 'bread', 'verkaufen').ok).toBe(false);
    state.globalStock.bread = 19;
    expect(handle(state, 'bread', 'verkaufen').ok).toBe(true);
  });

  it('nur Brot: alles andere verkauft der Markt bis zum letzten Bündel', () => {
    const { state } = mitMarkt(3);
    state.citizens = Array.from({ length: 40 }, () => createCitizen('IDLE'));
    for (const ware of HANDELSWAREN.filter(w => w !== 'bread')) {
      expect(vorbehalten(state, ware), ware).toBe(0);
      state.globalStock[ware] = 10;
      expect(handle(state, ware, 'verkaufen').ok, ware).toBe(true);
      expect(state.globalStock[ware]).toBe(0);
    }
  });

  it('wer Brot verkauft, sobald es geht, lässt die Stadt nicht hungern (36 Bewohner, 30 Tage)', () => {
    /** Farm, Mühle und Bäckerei auf Stufe 3; zählt die Tage, an denen Brot fehlt */
    const hungertage = (zug: (s: GameState) => void): number => {
      const { state } = mitMarkt(3);
      state.globalStock.bread = 0;
      state.globalStock.grain = 0;
      state.globalStock.flour = 0;
      for (const typeId of ['FARM_GRAIN', 'MILL_WIND', 'BAKERY']) {
        const b = createBuildingInstance(typeId, 0, 0, true);
        b.connected = true;
        b.waterSupplied = true;
        b.tier = 3;
        b.activeRecipeId = BUILDING_DEFS[typeId].recipes[0];
        state.buildings.push(b);
      }
      state.citizens = Array.from({ length: 36 }, () => createCitizen('IDLE'));
      const produktion = new ProductionSystem();
      const leute = new PeopleSystem();
      let hunger = 0;
      for (let tag = 0; tag < 30; tag++) {
        for (let s = 0; s < TAG_SEKUNDEN; s++) {
          produktion.update(state, 1);
          leute.cityTick(state, 1);
          zug(state);
        }
        if (state.globalStock.bread < brotProTag(state.citizens.length)) hunger++;
        state.day++;
        leute.dayTick(state);
      }
      return hunger;
    };
    const ohne = hungertage(() => {});
    let verkauft = 0;
    const gierig = hungertage(s => { while (handle(s, 'bread', 'verkaufen').ok) verkauft++; });
    expect(gierig).toBe(ohne);
    expect(verkauft).toBe(0);
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

  it('Eigenschaften eines Objekts sind keine Waren (toString, constructor …)', () => {
    const { state } = mitMarkt(3);
    state.globalStock.gold = 1000;
    for (const ware of ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__']) {
      expect(kaufpreis(ware), ware).toBe(0);
      for (const art of ['kaufen', 'verkaufen'] as const) {
        expect(handle(state, ware, art), `${ware} ${art}`).toEqual({ ok: false, grund: 'Diese Ware handelt der Markt nicht.' });
      }
    }
    expect(state.globalStock.gold).toBe(1000);
    expect(handelHeute(state)).toBe(10);
  });

  it('ein kaputter Vorrat (NaN) sperrt, statt Gold oder Ware zu verschenken', () => {
    const { state } = mitMarkt(3);
    state.globalStock.wood = NaN;
    state.globalStock.bread = NaN;
    state.globalStock.gold = 50;
    expect(handle(state, 'wood', 'verkaufen').ok).toBe(false);
    expect(handle(state, 'bread', 'verkaufen').ok).toBe(false);
    expect(state.globalStock.gold).toBe(50);
    state.globalStock.gold = NaN;
    state.globalStock.stone = 0;
    expect(handle(state, 'stone', 'kaufen')).toMatchObject({ ok: false, grund: expect.stringContaining('Gold') });
    expect(state.globalStock.stone).toBe(0);
    expect(handelHeute(state)).toBe(10);
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

  it('ein Grund für den ganzen Markt: gesperrt oder heute aufgebraucht', () => {
    const { state, markt } = mitMarkt(1);
    state.globalStock.wood = 100;
    expect(handelZu(state)).toBe('');
    for (let i = 0; i < 3; i++) handle(state, 'wood', 'verkaufen');
    expect(handelZu(state)).toBe('Heute keine Bündel mehr, morgen wieder.');
    // Dieser Grund geht allen Gründen einer Ware vor (die Anzeige schreibt ihn einmal über alle Waren)
    expect(kannHandeln(state, 'bread', 'verkaufen').grund).toBe(handelZu(state));
    markt.assignedWorkerIds = [];
    expect(handelZu(state)).toBe('Handel erst mit einem Arbeiter.');
    state.buildings = [];
    expect(handelZu(state)).toBe('Erst einen Marktplatz bauen.');
  });
});
