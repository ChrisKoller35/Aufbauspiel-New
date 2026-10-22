import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createBuildingInstance, BuildingInstance } from '../src/models/Building';
import { createCitizen } from '../src/models/Citizen';
import { BUILDING_DEFS } from '../src/data/buildings';
import { RECIPE_DEFS } from '../src/data/recipes';
import { brotProTag, brotBedarfProTag } from '../src/systems/PeopleSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { tagesBilanz, reichtTage, reichtTageFuer, TagesBilanz } from '../src/systems/Tagesbilanz';
import { auftragGeben } from '../src/systems/Auftraege';
import {
  bilanzZahl, bilanzZeileHTML, bilanzTipp, bilanzChips, reichtText, WAREN_SYMBOL,
} from '../src/ui/screens/ProduktionTab';

// Pro Tag mit der Dauer eines Zyklus (zyklusSekunden: Rezept, Stufe, Besetzung, Synergie). Zyklen laufen
// im Spiel ohne Lücke (ProductionSystem mit Übertrag): Ein 10-s-Rezept liefert alle 10 s, 2 Holz × 30 / 10 = 6.
const proTag = (menge: number, sekunden: number) => (menge * 30) / sekunden;
const GETREIDE_FARM = proTag(2, 10);   // Getreidefarm Stufe 1: 6
const MEHL_MUEHLE = proTag(2, 12);     // Windmühle Stufe 1: 5 Mehl = Mehl für 2,5 Brot
const BROT_BAECKEREI = proTag(1, 14);  // Bäckerei Stufe 1: 2,14 Brot

/** Leere Stadt mit `bewohner` Bewohnern (ohne Startgebäude, ohne Wohnviertel: kein freier Platz). */
function stadt(bewohner = 0): GameState {
  const state = createNewGameState();
  state.buildings = [];
  state.citizens = [];
  for (let i = 0; i < bewohner; i++) state.citizens.push(createCitizen());
  return state;
}

/** Fertiges, angebundenes Gebäude mit erstem Rezept, Stufe und Arbeitern. */
function baue(state: GameState, typeId: string, stufe = 1, arbeiter = stufe): BuildingInstance {
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

/** Brunnen dazu (er versorgt alle, wie SatisfactionSystem). */
function brunnen(state: GameState): void {
  baue(state, 'WELL', 1, 0);
  for (const b of state.buildings) b.waterSupplied = true;
}

/** Brotkette Stufe 1 mit Brunnen: 3 Arbeiter, kein Wohnviertel, also kein freier Platz. */
function brotkette(state: GameState, mitBrunnen = true): void {
  for (const id of ['FARM_GRAIN', 'MILL_WIND', 'BAKERY']) baue(state, id);
  if (mitBrunnen) brunnen(state);
}

/** Bis `bewohner` auffüllen (ohne Arbeit). */
function fuelle(state: GameState, bewohner: number): void {
  while (state.citizens.length < bewohner) state.citizens.push(createCitizen());
}

describe('Tagesbilanz: Rohstoffe, mit der Dauer eines Zyklus', () => {
  it('Holzfällerhütte Stufe 1 mit 1 Arbeiter: 2 Holz alle 10 s = +6, wie im Rezept', () => {
    const state = stadt();
    baue(state, 'LUMBER_CAMP');
    const holz = tagesBilanz(state).waren.wood;
    expect(holz.erzeugt).toBeCloseTo(6);
    expect(holz.verbraucht).toBe(0);
    expect(holz.bilanz).toBeCloseTo(6);
    expect(holz.posten).toEqual([{ quelle: 'Holzfällerhütte', menge: expect.closeTo(6) }]);
  });

  it('Holzfällerhütte Stufe 3 mit 3 Arbeitern: 2 Holz alle 3,33 s = +18', () => {
    const state = stadt();
    baue(state, 'LUMBER_CAMP', 3, 3);
    expect(tagesBilanz(state).waren.wood.bilanz).toBeCloseTo(18);
  });

  it('Stufe 3 mit nur 1 Arbeiter arbeitet wie Stufe 1', () => {
    const state = stadt();
    baue(state, 'LUMBER_CAMP', 3, 1);
    expect(tagesBilanz(state).waren.wood.bilanz).toBeCloseTo(6);
  });

  it('ein Gebäude ohne Arbeiter zählt nicht', () => {
    const state = stadt();
    baue(state, 'LUMBER_CAMP', 1, 0);
    expect(tagesBilanz(state).waren.wood).toBeUndefined();
  });

  it('Bruchteile eines Takts zählen: Stufe 3 mit Synergie 0,85 (2,83 s) = +21,2, Stufe 2 (5 s) = +12', () => {
    const state = stadt();
    const stufe3 = baue(state, 'LUMBER_CAMP', 3, 3);
    stufe3.synergySpeedMult = 0.85;
    expect(tagesBilanz(state).waren.wood.bilanz).toBeCloseTo((2 * 30) / ((10 * 0.85) / 3));
    stufe3.tier = 2;
    expect(tagesBilanz(state).waren.wood.bilanz).toBeCloseTo((2 * 30) / ((10 * 0.85) / 2));
    stufe3.synergySpeedMult = 1;
    expect(tagesBilanz(state).waren.wood.bilanz).toBeCloseTo(12);
  });
});

describe('Tagesbilanz: Brotkette (Werkstätten auf Auftrag, Brot von selbst)', () => {
  it('3 Bewohner ohne freien Platz: Brot 0, Mehl 0, Getreide +4', () => {
    const state = stadt();
    brotkette(state);
    expect(state.citizens).toHaveLength(3);
    expect(brotBedarfProTag(state)).toBe(1);
    const { waren } = tagesBilanz(state);

    // Die Bäckerei backt nur, was gegessen wird: 1 Brot aus 2 Mehl, die Mühle mahlt dafür 2 Getreide
    expect(waren.bread.erzeugt).toBeCloseTo(1);
    expect(waren.bread.verbraucht).toBeCloseTo(1);
    expect(waren.bread.bilanz).toBeCloseTo(0);
    expect(waren.bread.posten.map(p => p.quelle)).toEqual(['Bewohner', 'Bäckerei (Brot für die Bewohner)']);

    expect(waren.flour.bilanz).toBeCloseTo(0);
    expect(waren.flour.posten).toEqual([
      { quelle: 'Bäckerei', menge: expect.closeTo(-2) },
      { quelle: 'Windmühle (Mehl für die Bäckerei)', menge: expect.closeTo(2) },
    ]);

    expect(waren.grain.erzeugt).toBeCloseTo(GETREIDE_FARM);
    expect(waren.grain.verbraucht).toBeCloseTo(2);
    expect(waren.grain.bilanz).toBeCloseTo(GETREIDE_FARM - 2); // 6 − 2 = 4
    expect(waren.grain.posten.map(p => p.quelle)).toEqual(['Getreidefarm', 'Windmühle']);

    const html = bilanzZeileHTML(state, tagesBilanz(state));
    expect(html).toContain('🌾 +4');
    expect(html).not.toContain('data-bilanz="bread"');
    expect(html).not.toContain('data-bilanz="flour"');
  });

  it('fehlende Zutaten zählen trotzdem: Eine Kette, die läuft, zählt auch mit leerem Lager', () => {
    const state = stadt();
    brotkette(state);
    state.globalStock = {};
    const { waren } = tagesBilanz(state);
    expect(waren.flour.verbraucht).toBeCloseTo(2); // 2 Mehl für 1 Brot, die Windmühle mahlt sie
    expect(waren.flour.bilanz).toBeCloseTo(0);
    expect(waren.bread.bilanz).toBeCloseTo(0);
    expect(waren.grain.bilanz).toBeCloseTo(GETREIDE_FARM - 2);
  });

  it('ohne Getreidefarm und ohne Getreide mahlt die Mühle nicht: Das Brot fehlt, Engpass Getreidefarm', () => {
    const state = stadt();
    for (const id of ['MILL_WIND', 'BAKERY']) baue(state, id);
    brunnen(state);
    state.globalStock = {};
    const bilanz = tagesBilanz(state);
    expect(bilanz.waren.bread.bilanz).toBeCloseTo(-1);
    expect(bilanz.waren.grain).toBeUndefined();
    expect(bilanz.waren.flour).toBeUndefined();
    expect(bilanz.vorraete[0].engpass).toEqual({ art: 'fehlt', typeId: 'FARM_GRAIN' });
    expect(bilanzTipp(state, 'bread').zeilen).toContain('Engpass: Getreidefarm fehlt.');
    expect(bilanzZeileHTML(state, bilanz)).toContain('🍞 −1 <small>· leer</small>');
  });

  it('Getreide im Lager reicht: Die Mühle mahlt daraus, Getreide rot mit «reicht»', () => {
    const state = stadt();
    for (const id of ['MILL_WIND', 'BAKERY']) baue(state, id);
    brunnen(state);
    state.globalStock = { grain: 20 };
    const bilanz = tagesBilanz(state);
    expect(bilanz.waren.grain.bilanz).toBeCloseTo(-2);
    expect(bilanz.waren.bread.bilanz).toBeCloseTo(0);
    expect(bilanzZeileHTML(state, bilanz)).toContain('🌾 −2 <small>· reicht 10 Tage</small>');
  });

  it('Mehl im Lager (alter Spielstand): Die Bäckerei backt daraus, die Mühle ruht', () => {
    const state = stadt();
    brotkette(state);
    state.globalStock = { flour: 50 };
    const bilanz = tagesBilanz(state);
    expect(bilanz.waren.flour.posten).toEqual([{ quelle: 'Bäckerei', menge: expect.closeTo(-2) }]);
    expect(bilanz.waren.grain.bilanz).toBeCloseTo(GETREIDE_FARM);
    expect(bilanz.waren.bread.bilanz).toBeCloseTo(0);
    expect(bilanz.vorraete[0].anlauf).toBe(0); // nach einer Pause backt sie sofort wieder
    expect(bilanzZeileHTML(state, bilanz)).toContain('🫓 −2 <small>· reicht 25 Tage</small>');
  });

  it('eine frisch gelieferte Ladung Mehl ist kein Vorrat: Die Anzeige springt nicht', () => {
    const state = stadt();
    brotkette(state);
    state.globalStock = {};
    const leer = tagesBilanz(state);
    state.globalStock = { flour: 2 }; // die Windmühle hat gerade geliefert
    expect(tagesBilanz(state)).toEqual(leer);
  });

  it('Getreidefarm zu klein: Engpass Getreidefarm', () => {
    const state = stadt();
    baue(state, 'FARM_GRAIN');
    baue(state, 'MILL_WIND', 3);
    baue(state, 'BAKERY', 3);
    brunnen(state);
    fuelle(state, 43); // essen 5
    const bilanz = tagesBilanz(state);
    // Die Bäckerei schaffte 6,4, die Mühle Mehl für 7,5; die Farm liefert Getreide für 3 Brot
    expect(bilanz.waren.bread.bilanz).toBeCloseTo(GETREIDE_FARM / 2 - 5);
    expect(bilanz.waren.grain.bilanz).toBeCloseTo(0);
    expect(bilanz.vorraete[0].engpass).toEqual({ art: 'schafft', typeId: 'FARM_GRAIN', zutat: 'grain' });
    expect(bilanzTipp(state, 'bread').zeilen).toContain('Engpass: Getreidefarm (Stufe 1) schafft nur Getreide für 3 Brot am Tag.');
  });

  it('Bäckerei ohne Brunnen zählt 0, die Mühle ruht, es bleibt nur der Hunger', () => {
    const state = stadt();
    brotkette(state, false);
    const bilanz = tagesBilanz(state);
    expect(bilanz.waren.bread.erzeugt).toBe(0);
    expect(bilanz.waren.bread.bilanz).toBeCloseTo(-brotBedarfProTag(state));
    expect(bilanz.waren.flour).toBeUndefined();
    expect(bilanz.waren.grain.bilanz).toBeCloseTo(GETREIDE_FARM);
    expect(bilanz.vorraete[0].engpass).toEqual({ art: 'steht', typeId: 'BAKERY', grund: { art: 'kein-wasser' } });
    expect(bilanzTipp(state, 'bread').zeilen).toContain('Engpass: Bäckerei steht (wartet auf Wasser).');
  });

  it('die Bewohner essen auch ohne Bäckerei', () => {
    const state = stadt(13);
    expect(tagesBilanz(state).waren.bread.bilanz).toBe(-brotProTag(13));
    expect(bilanzTipp(state, 'bread').zeilen).toContain('Engpass: Bäckerei fehlt.');
  });

  it('Nächster Bewohner: Solange Platz ist, kostet er 1 Brot (zusammen brotBedarfProTag)', () => {
    const state = stadt(6);
    const haus = baue(state, 'HOUSE_T1', 2, 0); // 12 Plätze
    const brot = tagesBilanz(state).waren.bread;
    expect(brot.posten).toEqual([{ quelle: 'Bewohner', menge: -1 }, { quelle: 'Nächster Bewohner', menge: -1 }]);
    expect(brot.verbraucht).toBe(brotBedarfProTag(state));
    state.globalStock.bread = 10;
    expect(reichtTageFuer(state, tagesBilanz(state), 'bread')).toBe(5);
    expect(bilanzTipp(state, 'bread').zeilen.slice(0, 2)).toEqual(['Bewohner −1', 'Nächster Bewohner −1']);

    haus.tier = 1; // 6 Plätze: voll, niemand kommt
    expect(tagesBilanz(state).waren.bread.posten).toEqual([{ quelle: 'Bewohner', menge: -1 }]);
  });

  it('Bäckerei zu klein: Brot rot mit «reicht», Engpass Bäckerei', () => {
    const state = stadt();
    brotkette(state);
    fuelle(state, 24); // essen 3, die Bäckerei Stufe 1 schafft 2,14
    state.globalStock.bread = 4;
    const bilanz = tagesBilanz(state);
    expect(bilanz.waren.bread.bilanz).toBeCloseTo(BROT_BAECKEREI - 3);
    expect(bilanz.vorraete[0]).toMatchObject({ bedarf: 3, menge: expect.closeTo(BROT_BAECKEREI), engpass: { art: 'schafft', typeId: 'BAKERY' } });
    expect(bilanz.waren.flour.bilanz).toBeCloseTo(0);
    const html = bilanzZeileHTML(state, bilanz);
    expect(html).toMatch(/class="tb-chip minus" data-bilanz="bread"/);
    // 3 Tage wie im Spiel (tests/tagesbilanzSimulation.test.ts): Die Bäckerei holt erst Mehl, dann ganze Brote
    expect(html).toContain('🍞 −0,9 <small>· reicht 3 Tage</small>');
    expect(bilanzTipp(state, 'bread')).toEqual({
      titel: 'Brot pro Tag: −0,9',
      zeilen: [
        'Bäckerei (Brot für die Bewohner) +2,1',
        'Bewohner −3',
        'Brot für die Bewohner backt die Bäckerei von selbst, bis es für 3 Tage reicht.',
        'Engpass: Bäckerei (Stufe 1) schafft nur 2,1 Brot am Tag.',
        'Im Lager 4, reicht 3 Tage.',
      ],
    });
  });

  it('Windmühle als Engpass: Bäckerei Stufe 2, Mühle Stufe 1', () => {
    const state = stadt();
    baue(state, 'FARM_GRAIN');
    baue(state, 'MILL_WIND');
    baue(state, 'BAKERY', 2, 2);
    brunnen(state);
    fuelle(state, 24);
    const bilanz = tagesBilanz(state);
    // Die Bäckerei schaffte 4,29, die Mühle mahlt nur Mehl für 2,5 Brot
    expect(bilanz.waren.bread.bilanz).toBeCloseTo(MEHL_MUEHLE / 2 - 3);
    expect(bilanz.waren.flour.bilanz).toBeCloseTo(0);
    expect(bilanz.waren.grain.bilanz).toBeCloseTo(GETREIDE_FARM - MEHL_MUEHLE);
    expect(bilanz.vorraete[0].engpass).toEqual({ art: 'schafft', typeId: 'MILL_WIND', zutat: 'flour' });
    expect(bilanzTipp(state, 'bread').zeilen).toContain('Engpass: Windmühle (Stufe 1) schafft nur Mehl für 2,5 Brot am Tag.');
  });

  it('fehlen Arbeiter, nennt der Engpass sie', () => {
    const state = stadt();
    brotkette(state);
    state.buildings.find(b => b.typeId === 'BAKERY')!.tier = 3; // 1 von 3 Plätzen besetzt
    fuelle(state, 24);
    expect(bilanzTipp(state, 'bread').zeilen).toContain('Engpass: Bäckerei (Stufe 3, 1/3 Arbeiter) schafft nur 2,1 Brot am Tag.');
  });
});

describe('Tagesbilanz: Aufträge und Gold', () => {
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

  it('Kräutergarten mit Aufträgen zählt nicht, auch nicht die Kräuter dafür', () => {
    const state = stadt();
    const garten = baue(state, 'HERB_GARDEN');
    brunnen(state);
    auftragGeben(garten, 'RCP_HEALING_POTION');
    garten.producing = true; // zieht gerade Kräuter für den Heiltrank
    garten.activeRecipeId = 'RCP_HERB_1';
    garten.vonSelbst = { art: 'vorstufe', fuer: 'RCP_HEALING_POTION' };
    const { waren } = tagesBilanz(state);
    expect(waren.herb_green).toBeUndefined();
    expect(waren.healing_potion).toBeUndefined();
  });

  it('Werkstätten zählen nie über activeRecipeId: ein Kraft-Brot-Auftrag ändert das Brot nicht', () => {
    const state = stadt();
    brotkette(state);
    const vorher = tagesBilanz(state);
    const baeckerei = state.buildings.find(b => b.typeId === 'BAKERY')!;
    auftragGeben(baeckerei, 'RCP_POWER_BREAD');
    baeckerei.producing = true;
    baeckerei.activeRecipeId = 'RCP_POWER_BREAD';
    const nachher = tagesBilanz(state);
    expect(nachher.waren.power_bread).toBeUndefined();
    expect(nachher.waren.herb_green).toBeUndefined();
    expect(nachher.waren).toEqual(vorher.waren);
  });

  it('Gold ist gleich steuernProTag', () => {
    const state = stadt(12);
    state.satisfaction = 80;
    const gold = tagesBilanz(state).gold;
    expect(gold.gesamt).toBe(new EconomySystem().steuernProTag(state));
    expect(gold.gesamt).toBeGreaterThan(0);
  });
});

describe('Tagesbilanz: «reicht»', () => {
  it('Vorrat geteilt durch Verbrauch, abgerundet', () => {
    expect(reichtTage(10, -1.5)).toBe(6);
    expect(reichtTage(0, -1)).toBe(0);
    expect(reichtTage(10, 2)).toBeNull();
  });

  it('viel Brot im Lager: ab dem Ziel ruht die Bäckerei, danach backt sie ganze Brote, erst mit Mehl', () => {
    const state = stadt();
    brotkette(state);
    fuelle(state, 24); // essen 3, die Bäckerei schafft 2,14, Ziel 9 Brot
    const reicht = (brot: number) => {
      state.globalStock.bread = brot;
      return reichtTageFuer(state, tagesBilanz(state), 'bread');
    };
    // 80 Brot: 24 Tage Pause (bis 8), dann wieder anbacken (erst Mehl mahlen), dann 2 oder 3 Brote am Tag.
    // Gleich viele Tage wie im Spiel (tests/tagesbilanzSimulation.test.ts); 80 / 0,86 wären 93 Tage.
    expect(reicht(80)).toBe(30);
    expect(reicht(30)).toBe(13);
    expect(reicht(12)).toBe(7);
    expect(reicht(9)).toBe(6); // am Ziel ruht sie noch einen Tag
    expect(reicht(7)).toBe(6); // frei: erst Mehl, dann 1 Brot heute, danach 2 am Tag
    expect(reicht(5)).toBe(4);
    expect(reicht(4)).toBe(3);
  });

  it('was die Bäckerei heute schon gebacken hat, zählt nicht doppelt', () => {
    const state = stadt();
    brotkette(state);
    fuelle(state, 24);
    state.globalStock.bread = 5;
    expect(reichtTageFuer(state, tagesBilanz(state), 'bread')).toBe(4);
    state.dayTickAccumulator = 15; // halber Tag vorbei: Das erste Brot kommt erst morgen
    expect(reichtTageFuer(state, tagesBilanz(state), 'bread')).toBe(3);

    const ohneBaeckerei = stadt(24);
    ohneBaeckerei.globalStock.bread = 5;
    ohneBaeckerei.dayTickAccumulator = 15;
    expect(reichtTageFuer(ohneBaeckerei, tagesBilanz(ohneBaeckerei), 'bread')).toBe(1); // 5 / 3
  });

  it('«leer» statt «reicht 0 Tage», «reicht keinen Tag» unter einem Tag', () => {
    expect(reichtText(0, 0)).toBe('leer');
    expect(reichtText(0.5, 0)).toBe('leer');
    expect(reichtText(1, 0)).toBe('reicht keinen Tag');
    expect(reichtText(3, 1)).toBe('reicht 1 Tag');
    expect(reichtText(9, 6)).toBe('reicht 6 Tage');

    const state = stadt(24);
    state.globalStock.bread = 0;
    expect(bilanzZeileHTML(state, tagesBilanz(state))).toContain('🍞 −3 <small>· leer</small>');
    expect(bilanzTipp(state, 'bread').zeilen.at(-1)).toBe('Das Lager ist leer.');
    state.globalStock.bread = 2;
    expect(bilanzZeileHTML(state, tagesBilanz(state))).toContain('🍞 −3 <small>· reicht keinen Tag</small>');
  });
});

describe('Tagesbilanz: Anzeige im Reiter «Produktion»', () => {
  it('Zahlen mit einer Nachkommastelle, Komma und echtem Minus', () => {
    expect(bilanzZahl(12)).toBe('+12');
    expect(bilanzZahl(-1.43)).toBe('−1,4');
    expect(bilanzZahl(0.04)).toBe('');
    expect(bilanzZahl(-0.04)).toBe('');
  });

  it('plus und minus werden gleich gerundet', () => {
    expect(bilanzZahl(0.05)).toBe('+0,1');
    expect(bilanzZahl(-0.05)).toBe('−0,1');
    expect(bilanzZahl(2.25)).toBe('+2,3');
    expect(bilanzZahl(-2.25)).toBe('−2,3');
    for (const n of [0.15, 1.45, 3.35, 12.65]) expect(bilanzZahl(-n)).toBe(bilanzZahl(n).replace('+', '−'));
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

  it('Gold mit der Münze wie in der Kopfzeile, Kraft-Brot mit eigenem Zeichen', () => {
    expect(WAREN_SYMBOL.gold).toBe('🪙'); // 🪙 wie main.ts (buildResourceHTML)
    expect(WAREN_SYMBOL.power_bread).not.toBe(WAREN_SYMBOL.bread);
    const state = stadt(12);
    state.satisfaction = 80;
    const ware = (bilanz: number) => ({ erzeugt: Math.max(0, bilanz), verbraucht: Math.max(0, -bilanz), bilanz, posten: [] });
    const bilanz: TagesBilanz = {
      waren: { bread: ware(-4), power_bread: ware(1.7) }, gold: { steuern: 19, bank: 0, gesamt: 19 }, vorraete: [],
    };
    const html = bilanzZeileHTML(state, bilanz);
    expect(html).toContain('🪙 +19');
    expect(html).toContain('🍞 −4');
    expect(html).toContain('🥖 +1,7');
    expect(bilanzChips(state, bilanz).map(c => c.item)).toEqual(['gold', 'bread', 'power_bread']);
  });

  it('Screenreader hören die Zahl: aria-label mit Wert und «reicht»', () => {
    const state = stadt(24);
    state.satisfaction = 80;
    state.globalStock.bread = 7;
    const html = bilanzZeileHTML(state, tagesBilanz(state));
    expect(html).toContain('role="img" aria-label="Brot pro Tag: −3, reicht 2 Tage"');
    expect(bilanzChips(state, tagesBilanz(state)).find(c => c.item === 'gold')?.label).toMatch(/^Gold pro Tag: \+\d+$/);
  });

  it('Erklärung des Chips nennt die Posten, zuerst was entsteht, und dass die Bäckerei von selbst backt', () => {
    const state = stadt();
    brotkette(state);
    expect(bilanzTipp(state, 'bread')).toEqual({
      titel: 'Brot pro Tag: 0',
      zeilen: [
        'Bäckerei (Brot für die Bewohner) +1',
        'Bewohner −1',
        'Brot für die Bewohner backt die Bäckerei von selbst, bis es für 3 Tage reicht.',
      ],
    });
    expect(bilanzTipp(state, 'flour').zeilen).toEqual(['Windmühle (Mehl für die Bäckerei) +2', 'Bäckerei −2']);
  });
});
