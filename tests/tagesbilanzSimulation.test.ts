// ─── Tagesbilanz gegen die Spielschleife ────────────────────────
// Stimmt, was die Zeile «Pro Tag:» zeigt, mit dem Lager im Spiel überein? Die Schleife hier spielt
// main.ts nach: jede Sekunde ein Stadt-Takt (Produktion, Arbeiter, Zufriedenheit), alle 30 Sekunden
// der Tageswechsel (Steuern, essen, wachsen). Ohne Stadt-Ereignisse gibt es keinen Zufall.
// Die Anzeige rechnet mit ProductionSystem.echteZyklusSekunden: Ändert sich update() (etwa ohne
// Leertakt), schlagen diese Tests an, bis die Funktion mitgeändert ist. Regeln: docs/TAGESBILANZ.md.
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createBuildingInstance, BuildingInstance } from '../src/models/Building';
import { createCitizen } from '../src/models/Citizen';
import { BUILDING_DEFS } from '../src/data/buildings';
import { RECIPE_DEFS } from '../src/data/recipes';
import { STADTSTUFEN } from '../src/data/stadtstufen';
import { placeStartingLayout, createStartingCitizens } from '../src/scenes/CityStartingLayout';
import { ProductionSystem, echteZyklusSekunden } from '../src/systems/ProductionSystem';
import { PeopleSystem, brotProTag, brotBedarfProTag } from '../src/systems/PeopleSystem';
import { SatisfactionSystem } from '../src/systems/SatisfactionSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { TAG_SEKUNDEN } from '../src/systems/GebaeudeStatus';
import { auftragGeben } from '../src/systems/Auftraege';
import { tagesBilanz, reichtTageFuer } from '../src/systems/Tagesbilanz';

/** Waren, die die Stadt ohne Aufträge macht oder verbraucht. */
const WAREN = ['wood', 'stone', 'iron_scrap', 'grain', 'flour', 'bread'];

/** Die Spielschleife wie in main.ts. */
class Spiel {
  readonly production = new ProductionSystem();
  readonly people = new PeopleSystem();
  readonly satisfaction = new SatisfactionSystem();
  readonly economy = new EconomySystem();
  /** Brot, das bei den Tageswechseln fehlte (zum Essen und für den nächsten Bewohner). */
  brotGefehlt = 0;

  constructor(readonly state: GameState) {
    this.satisfaction.update(state);
  }

  /** Ein Stadt-Takt (1 s), der Tageszähler läuft mit. */
  takt(): void {
    this.production.update(this.state, 1);
    this.people.cityTick(this.state, 1);
    this.satisfaction.update(this.state);
    this.state.dayTickAccumulator += 1;
  }

  /** Tageswechsel: Steuern, essen, wachsen. */
  tageswechsel(): void {
    this.state.dayTickAccumulator = 0;
    const bedarf = brotBedarfProTag(this.state);
    const brot = this.state.globalStock.bread ?? 0;
    this.economy.dayTick(this.state);
    this.people.dayTick(this.state);
    this.brotGefehlt += bedarf - (brot - (this.state.globalStock.bread ?? 0));
  }

  /** Ein ganzer Tag; `messen` läuft kurz vor dem Tageswechsel (gleiche Zufriedenheit wie für die Steuern). */
  tag(messen?: () => void): void {
    for (let i = 0; i < TAG_SEKUNDEN; i++) this.takt();
    messen?.();
    this.tageswechsel();
  }
}

interface Stadt {
  /** Gebäude mit ihrer Stufe; jedes mit vollen Arbeitsplätzen, wenn `arbeiter` nichts anderes sagt. */
  stufen: Record<string, number>;
  /** Stufe des Wohnviertels; ohne gibt es keinen freien Platz (kein Wachstum). */
  haus?: number;
  bewohner: number;
  brunnen?: boolean;
  arbeiter?: Record<string, number>;
  synergie?: Record<string, number>;
  lager?: Record<string, number>;
}

function baueStadt(s: Stadt): GameState {
  const state = createNewGameState();
  state.buildings = [];
  state.citizens = [];
  const gebaeude: Record<string, number> = { ...s.stufen };
  if (s.brunnen !== false) gebaeude.WELL = 1;
  if (s.haus) gebaeude.HOUSE_T1 = s.haus;
  for (const [typeId, stufe] of Object.entries(gebaeude)) {
    const def = BUILDING_DEFS[typeId];
    const b = createBuildingInstance(typeId, 0, 0, true);
    if (def.recipes.length > 0) b.activeRecipeId = def.recipes[0];
    b.connected = true;
    b.tier = stufe;
    b.synergySpeedMult = s.synergie?.[typeId] ?? 1;
    const arbeiter = s.arbeiter?.[typeId] ?? def.workerSlots * stufe;
    for (let i = 0; i < arbeiter; i++) {
      const c = createCitizen('WORKER');
      c.assignedBuildingId = b.id;
      state.citizens.push(c);
      b.assignedWorkerIds.push(c.id);
    }
    state.buildings.push(b);
  }
  while (state.citizens.length < s.bewohner) state.citizens.push(createCitizen('IDLE'));
  state.globalStock = { gold: 0, wood: 0, stone: 0, iron_scrap: 0, grain: 0, flour: 0, bread: 10, ...s.lager };
  return state;
}

/** Sekunden (Stadt-Takte ab 1), in denen ein Gebäude einen Zyklus abschliesst. */
function fertigZeiten(state: GameState, b: BuildingInstance, sekunden: number): number[] {
  const production = new ProductionSystem();
  const zeiten: number[] = [];
  for (let t = 1; t <= sekunden; t++) {
    const lief = b.producing;
    production.update(state, 1);
    if (lief && !b.producing) zeiten.push(t);
  }
  return zeiten;
}

/** Abstand von Start zu Start (= von Ende zu Ende) muss überall gleich der echten Dauer sein. */
function pruefeTakt(zeiten: number[], echt: number, name: string): void {
  expect(zeiten.length, name).toBeGreaterThan(3);
  expect(zeiten[0], `${name}: erster Zyklus`).toBe(echt); // beginnt im ersten Takt, endet nach echt − 1 Takten Zählen
  for (let i = 1; i < zeiten.length; i++) expect(zeiten[i] - zeiten[i - 1], `${name}: Zyklus ${i + 1}`).toBe(echt);
}

describe('echte Dauer eines Zyklus: echteZyklusSekunden gegen ProductionSystem.update', () => {
  it.each(['LUMBER_CAMP', 'QUARRY', 'IRON_MINE', 'FARM_GRAIN'])('%s auf Stufe 1 bis 3, mit und ohne Synergie', typeId => {
    const recipe = RECIPE_DEFS[BUILDING_DEFS[typeId].recipes[0]];
    for (const stufe of [1, 2, 3]) {
      for (const synergie of [1, 0.91, 0.87, 0.85, 0.67]) {
        const state = baueStadt({ stufen: { [typeId]: stufe }, bewohner: 0, synergie: { [typeId]: synergie } });
        const b = state.buildings[0];
        const name = `${typeId} Stufe ${stufe}, Synergie ${synergie}`;
        pruefeTakt(fertigZeiten(state, b, 400), echteZyklusSekunden(b, recipe), name);
      }
    }
  });

  it('Stufe 3 mit 2 von 3 Arbeitern arbeitet doppelt so schnell', () => {
    const state = baueStadt({ stufen: { LUMBER_CAMP: 3 }, bewohner: 0, arbeiter: { LUMBER_CAMP: 2 } });
    const b = state.buildings[0];
    expect(echteZyklusSekunden(b, RECIPE_DEFS.RCP_WOOD_1)).toBe(6);
    pruefeTakt(fertigZeiten(state, b, 200), 6, 'Holzfällerhütte 2/3');
  });

  it('die Bäckerei backt ihren Vorrat im gleichen Takt, die Windmühle liefert so zu', () => {
    for (const stufe of [1, 2, 3]) {
      // 200 Bewohner: Ziel 75 Brot, die Bäckerei backt die ganze Zeit
      const state = baueStadt({ stufen: { BAKERY: stufe }, bewohner: 200, lager: { flour: 999, bread: 0 } });
      new SatisfactionSystem().update(state); // Wasser vom Brunnen
      const baeckerei = state.buildings[0];
      pruefeTakt(fertigZeiten(state, baeckerei, 300), echteZyklusSekunden(baeckerei, RECIPE_DEFS.RCP_BREAD_1), `Bäckerei Stufe ${stufe}`);
    }
    // Schnelle Bäckerei, langsame Mühle: Die Mühle mahlt ohne Pause
    const state = baueStadt({ stufen: { MILL_WIND: 1, BAKERY: 3 }, bewohner: 200, lager: { grain: 999, bread: 0 } });
    new SatisfactionSystem().update(state);
    const muehle = state.buildings[0];
    pruefeTakt(fertigZeiten(state, muehle, 300), echteZyklusSekunden(muehle, RECIPE_DEFS.RCP_FLOUR_1), 'Windmühle');
  });
});

interface Messung {
  anzeige: Record<string, number>;
  echt: Record<string, number>;
}

/**
 * Spielt `einschwingen` Tage, dann `tage` Tage lang: Anzeige = Mittel der Tagesbilanz (jeden Tag kurz
 * vor dem Tageswechsel), echt = was pro Tag wirklich ins Lager kam. Beim Brot zählt wie in der Anzeige
 * der ganze Bedarf: Was beim Tageswechsel fehlte, geht vom Lager ab, als wäre es gegessen worden.
 */
function miss(state: GameState, einschwingen = 30, tage = 90): Messung {
  const spiel = new Spiel(state);
  for (let t = 0; t < einschwingen; t++) spiel.tag();
  const start = { ...state.globalStock };
  spiel.brotGefehlt = 0;
  const anzeige: Record<string, number> = { gold: 0 };
  for (let t = 0; t < tage; t++) {
    spiel.tag(() => {
      const bilanz = tagesBilanz(state);
      for (const w of WAREN) anzeige[w] = (anzeige[w] ?? 0) + (bilanz.waren[w]?.bilanz ?? 0) / tage;
      anzeige.gold += bilanz.gold.gesamt / tage;
    });
  }
  const echt: Record<string, number> = {};
  for (const w of [...WAREN, 'gold']) echt[w] = ((state.globalStock[w] ?? 0) - (start[w] ?? 0)) / tage;
  echt.bread -= spiel.brotGefehlt / tage;
  return { anzeige, echt };
}

/** Grösste Abweichung zwischen Anzeige und Spiel über alle Waren und Gold. */
function abweichung(m: Messung): { ware: string; um: number } {
  let groesste = { ware: '', um: 0 };
  for (const w of [...WAREN, 'gold']) {
    const um = Math.abs((m.anzeige[w] ?? 0) - (m.echt[w] ?? 0));
    if (um > groesste.um) groesste = { ware: w, um };
  }
  return groesste;
}

// Auf jeder Stadtstufe: Wohnviertel voll, alle Rohstoff-Gebäude und die Brotkette so weit
// ausgebaut, wie die Stadtstufe erlaubt (Magische Stadt hat dieselben Grenzen wie die Grossstadt).
const STADTSTUFEN_STAEDTE: [string, Stadt][] = STADTSTUFEN
  .filter((s, i) => i === 0 || JSON.stringify(s.grenzen) !== JSON.stringify(STADTSTUFEN[i - 1].grenzen))
  .map(({ name, grenzen: { wohnen, werkstatt } }) => [
    `${name}: ${6 * wohnen} Bewohner, Gebäude Stufe ${werkstatt}`,
    {
      stufen: { FARM_GRAIN: werkstatt, MILL_WIND: werkstatt, BAKERY: werkstatt, LUMBER_CAMP: werkstatt, QUARRY: werkstatt, IRON_MINE: werkstatt },
      haus: wohnen,
      bewohner: 6 * wohnen,
    },
  ]);

const BROTKETTE_1 = { FARM_GRAIN: 1, MILL_WIND: 1, BAKERY: 1 };

const ENGPAESSE: [string, Stadt][] = [
  ['Bäckerei zu klein: 24 Bewohner, Brotkette Stufe 1', { stufen: BROTKETTE_1, bewohner: 24 }],
  ['Windmühle als Engpass: Bäckerei Stufe 2, 24 Bewohner', { stufen: { FARM_GRAIN: 1, MILL_WIND: 1, BAKERY: 2 }, bewohner: 24 }],
  ['Windmühle als Engpass: Bäckerei Stufe 3, 43 Bewohner', { stufen: { FARM_GRAIN: 1, MILL_WIND: 1, BAKERY: 3 }, bewohner: 43 }],
  ['Windmühle Stufe 2, Bäckerei Stufe 3, 43 Bewohner', { stufen: { FARM_GRAIN: 2, MILL_WIND: 2, BAKERY: 3 }, bewohner: 43 }],
  ['ohne Brunnen steht die Bäckerei', { stufen: BROTKETTE_1, bewohner: 6, brunnen: false }],
  ['ohne Windmühle: Getreide bleibt liegen', { stufen: { FARM_GRAIN: 1, BAKERY: 1 }, bewohner: 6 }],
  ['ohne Getreidefarm: Die Mühle mahlt das Getreide im Lager', { stufen: { MILL_WIND: 1, BAKERY: 1 }, bewohner: 6, lager: { grain: 400 } }],
  ['ohne Getreidefarm: Das Getreide im Lager ist alle', { stufen: { MILL_WIND: 1, BAKERY: 1 }, bewohner: 6, lager: { grain: 40 } }],
  ['Getreidefarm zu klein: Mühle und Bäckerei Stufe 3, 43 Bewohner', { stufen: { FARM_GRAIN: 1, MILL_WIND: 3, BAKERY: 3 }, bewohner: 43 }],
  ['Mehl im Lager (alter Spielstand): Die Mühle ruht, bis es verbacken ist', {
    stufen: BROTKETTE_1, bewohner: 6, lager: { flour: 300 },
  }],
  ['Holzfällerhütte Stufe 3 mit 1 Arbeiter', { stufen: { LUMBER_CAMP: 3 }, bewohner: 1, arbeiter: { LUMBER_CAMP: 1 } }],
  ['Synergie an Eisenmine und Holzfällerhütte', {
    stufen: { IRON_MINE: 1, LUMBER_CAMP: 3 }, bewohner: 4, synergie: { IRON_MINE: 0.87, LUMBER_CAMP: 0.85 },
  }],
];

describe('Tagesbilanz gegen die Spielschleife: Lager nach 90 Tagen', () => {
  // Abweichung höchstens 0,05 pro Tag (gemessen: höchstens etwa 0,01, nur Rundung auf ganze Stücke)
  it.each([...STADTSTUFEN_STAEDTE, ...ENGPAESSE])('%s', (_name, stadt) => {
    const m = miss(baueStadt(stadt));
    const { ware, um } = abweichung(m);
    expect(um, `${ware}: Anzeige ${m.anzeige[ware]}, Spiel ${m.echt[ware]}`).toBeLessThan(0.05);
  });

  it('Stichproben: Getreide +3,45 (Rezept +4), Brot −1 und Mühlen-Engpass −0,7 sind echt', () => {
    expect(miss(baueStadt({ stufen: BROTKETTE_1, bewohner: 3 })).echt.grain).toBeCloseTo(60 / 11 - 2, 1);
    expect(miss(baueStadt({ stufen: BROTKETTE_1, bewohner: 24 })).echt.bread).toBeCloseTo(-1, 1);
    const engpass = miss(baueStadt({ stufen: { FARM_GRAIN: 1, MILL_WIND: 1, BAKERY: 2 }, bewohner: 24 }));
    expect(engpass.echt.bread).toBeCloseTo(30 / 13 - 3, 1);
  });

  it('Kraft-Brot-Aufträge laufen nebenher: Das Brot für die Bewohner stimmt trotzdem', () => {
    // Brot am Ziel (3 Tage zu je 1), damit gleich gemessen werden kann, solange die Aufträge laufen
    const state = baueStadt({ stufen: BROTKETTE_1, bewohner: 6, lager: { herb_green: 20, grain: 20, bread: 3 } });
    const baeckerei = state.buildings.find(b => b.typeId === 'BAKERY')!;
    for (let i = 0; i < 5; i++) expect(auftragGeben(baeckerei, 'RCP_POWER_BREAD')).toBe(true);
    const m = miss(state, 2, 30);
    expect(state.globalStock.power_bread).toBe(5); // alle Aufträge fertig
    expect(m.anzeige.bread).toBeCloseTo(0);
    expect(Math.abs(m.anzeige.bread - m.echt.bread)).toBeLessThan(0.05);
  });
});

describe('«reicht» gegen die Spielschleife', () => {
  /**
   * Spielt `tage` Tage. Je Tag die Anzeige «reicht» zu mehreren Sekunden und ob die Bewohner beim
   * Tageswechsel satt wurden. Echt ist die Zahl der satten Tage ab heute bis zum ersten hungrigen.
   */
  function vergleiche(stadt: Stadt, tage: number): { zuViel: number; genau: number; anzahl: number } {
    const state = baueStadt(stadt);
    const spiel = new Spiel(state);
    const anzeigen: number[][] = [];
    const satt: boolean[] = [];
    for (let t = 0; t < tage; t++) {
      const heute: number[] = [];
      for (let s = 0; s < TAG_SEKUNDEN; s++) {
        if (s % 10 === 0) heute.push(reichtTageFuer(state, tagesBilanz(state), 'bread') ?? Infinity);
        spiel.takt();
      }
      anzeigen.push(heute);
      satt.push((state.globalStock.bread ?? 0) >= brotProTag(state.citizens.length));
      spiel.tageswechsel();
    }
    let zuViel = 0, genau = 0, anzahl = 0;
    // Ab Tag 2: Am ersten Tag läuft die Brotkette erst an (Getreide 0, Bäckerei ruht)
    for (let t = 2; t < tage; t++) {
      let echt = 0;
      while (t + echt < tage && satt[t + echt]) echt++;
      if (t + echt >= tage) break; // im Zeitraum nie hungrig: nicht vergleichbar
      for (const a of anzeigen[t]) {
        anzahl++;
        zuViel = Math.max(zuViel, a - echt);
        if (a === echt || a === echt - 1) genau++;
      }
    }
    return { zuViel, genau, anzahl };
  }

  it.each([
    ['Bäckerei zu klein, Brot −1', BROTKETTE_1, 24],
    ['Windmühle als Engpass, Brot −0,7', { FARM_GRAIN: 1, MILL_WIND: 1, BAKERY: 2 }, 24],
    ['Brotkette Stufe 3, Brot −1', { FARM_GRAIN: 3, MILL_WIND: 3, BAKERY: 3 }, 48],
    ['ohne Bäckerei, Brot −3', { FARM_GRAIN: 1 }, 24],
  ] as [string, Record<string, number>, number][])('%s: nie mehr als 1 Tag zu viel, meist genau', (_name, stufen, bewohner) => {
    let zuViel = 0, genau = 0, anzahl = 0;
    for (const brot of [3, 8, 9, 20, 80]) {
      const r = vergleiche({ stufen, bewohner, lager: { bread: brot } }, 60);
      zuViel = Math.max(zuViel, r.zuViel);
      genau += r.genau;
      anzahl += r.anzahl;
    }
    expect(anzahl).toBeGreaterThan(100);
    expect(zuViel).toBeLessThanOrEqual(1);
    expect(genau / anzahl).toBeGreaterThan(0.95); // genau oder 1 Tag vorsichtiger
  });

  it('kleines Minus (−0,25): «reicht» ist eher zu vorsichtig, nie mehr als 1 Tag zu viel', () => {
    for (const brot of [9, 20, 80]) {
      const r = vergleiche({ stufen: { FARM_GRAIN: 2, MILL_WIND: 2, BAKERY: 2 }, bewohner: 36, lager: { bread: brot } }, 150);
      expect(r.anzahl).toBeGreaterThan(0);
      expect(r.zuViel).toBeLessThanOrEqual(1);
    }
  });

  it('altes Spiel mit 80 Brot, 24 Bewohner, Brotkette Stufe 1: 30 Tage, wie angezeigt', () => {
    const state = baueStadt({ stufen: BROTKETTE_1, bewohner: 24, lager: { bread: 80, grain: 50 } });
    const spiel = new Spiel(state);
    expect(reichtTageFuer(state, tagesBilanz(state), 'bread')).toBe(30);
    let satt = 0;
    while (satt < 100) {
      for (let i = 0; i < TAG_SEKUNDEN; i++) spiel.takt();
      if ((state.globalStock.bread ?? 0) < brotProTag(24)) break;
      satt++;
      spiel.tageswechsel();
    }
    expect(satt).toBe(30);
  });

  it('neues Spiel mit Platz für 6 mehr: 10 Brot reichen 5 Tage, der nächste Bewohner isst mit', () => {
    const state = createNewGameState();
    placeStartingLayout(state);
    createStartingCitizens(state);
    state.buildings.find(b => b.typeId === 'HOUSE_T1')!.tier = 2; // 12 Plätze
    state.globalStock.bread = 10;
    const spiel = new Spiel(state);
    const bilanz = tagesBilanz(state);
    expect(bilanz.waren.bread.verbraucht).toBe(2); // 1 essen die 6, 1 kostet der nächste Bewohner
    expect(reichtTageFuer(state, bilanz, 'bread')).toBe(5);
    for (let tag = 1; tag <= 5; tag++) {
      const vorher = state.globalStock.bread;
      expect(tagesBilanz(state).waren.bread.verbraucht, `Tag ${tag}`).toBe(2);
      spiel.tag();
      expect(vorher - state.globalStock.bread, `Tag ${tag}`).toBe(2);
    }
    expect(state.citizens).toHaveLength(11);
    expect(state.globalStock.bread).toBe(0); // am 6. Tag hungern sie
  });
});
