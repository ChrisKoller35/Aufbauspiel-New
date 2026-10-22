import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createBuildingInstance, BuildingInstance } from '../src/models/Building';
import { createCitizen } from '../src/models/Citizen';
import { BUILDING_DEFS } from '../src/data/buildings';
import { RECIPE_DEFS } from '../src/data/recipes';
import { ProductionSystem } from '../src/systems/ProductionSystem';
import { SaveSystem } from '../src/systems/SaveSystem';
import {
  auftragGeben, auftragAbbrechen, auftragsListe, beiAuftragFertig, restzeitSekunden,
} from '../src/systems/Auftraege';
import { planeZyklus, vorratZiel, vonSelbstSatz, VORRAETE } from '../src/systems/Werkstattplan';
import { getGebaeudeStatus, nachschub, nachschubText, TAG_SEKUNDEN } from '../src/systems/GebaeudeStatus';
import { engpassFuerGebaeude } from '../src/systems/EngpassSystem';
import { placeStartingLayout, createStartingCitizens } from '../src/scenes/CityStartingLayout';
import { PeopleSystem, brotProTag } from '../src/systems/PeopleSystem';
import { SatisfactionSystem } from '../src/systems/SatisfactionSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { STADTSTUFEN } from '../src/data/stadtstufen';

const HEILTRANK = 'RCP_HEALING_POTION'; // 3 Grüne Kräuter, 20 s
const KRAEUTER = 'RCP_HERB_1';          // 1 Grüne Kräuter, 15 s
const KRAFTBROT = 'RCP_POWER_BREAD';    // 2 Mehl + 1 Grüne Kräuter, 18 s
const BROT = 'RCP_BREAD_1';             // 2 Mehl, 14 s
const MEHL = 'RCP_FLOUR_1';             // 2 Getreide → 2 Mehl, 12 s

/** Stadt ohne Wohnviertel (kein Wachstum): nur die Werkstätten, jede mit Arbeiter und Wasser. */
function stadt(lager: Record<string, number> = {}): GameState {
  const state = createNewGameState();
  Object.assign(state.globalStock, { grain: 20, flour: 0, herb_green: 0, bread: 10 }, lager);
  return state;
}

function werkstatt(state: GameState, typeId: string): BuildingInstance {
  const b = createBuildingInstance(typeId, 0, 0, true);
  b.connected = true;
  b.waterSupplied = true;
  b.activeRecipeId = BUILDING_DEFS[typeId].recipes[0];
  const c = createCitizen('WORKER');
  c.assignedBuildingId = b.id;
  b.assignedWorkerIds.push(c.id);
  state.citizens.push(c);
  state.buildings.push(b);
  return b;
}

function laufe(state: GameState, sekunden: number, production = new ProductionSystem()): void {
  for (let i = 0; i < sekunden; i++) production.update(state, 1);
}

function fertigListe(): { ids: string[]; ab: () => void } {
  const ids: string[] = [];
  const ab = beiAuftragFertig((_b, recipe) => ids.push(recipe.id));
  return { ids, ab };
}

describe('Werkstätten auf Klick', () => {
  it('ohne Auftrag ruhen Kräutergarten, Mühle und Bäckerei, solange Brot da ist', () => {
    const state = stadt();
    for (const id of ['HERB_GARDEN', 'MILL_WIND', 'BAKERY']) werkstatt(state, id);
    laufe(state, 120);
    expect(state.globalStock.herb_green).toBe(0);
    expect(state.globalStock.flour).toBe(0);
    expect(state.globalStock.grain).toBe(20);
    expect(state.globalStock.bread).toBe(10);

    expect(getGebaeudeStatus(state, 'HERB_GARDEN')).toMatchObject({ zustand: 'bereit', text: 'bereit · Auftrag geben' });
    expect(getGebaeudeStatus(state, 'MILL_WIND')).toMatchObject({ zustand: 'bereit', text: 'bereit · liefert bei Bedarf' });
    expect(getGebaeudeStatus(state, 'BAKERY')).toMatchObject({ zustand: 'bereit', text: 'Brot reicht 10 Tage' });
    for (const id of ['HERB_GARDEN', 'MILL_WIND', 'BAKERY']) expect(engpassFuerGebaeude(state, id)).toBeNull();
  });

  it('Heiltrank auf Klick: fehlen Kräuter, zieht der Kräutergarten sie zuerst', () => {
    const state = stadt();
    const garten = werkstatt(state, 'HERB_GARDEN');
    const fertig = fertigListe();
    expect(auftragGeben(garten, HEILTRANK)).toBe(true);
    expect(restzeitSekunden(garten, state)).toBe(3 * 15 + 20);

    laufe(state, 1);
    expect(garten.activeRecipeId).toBe(KRAEUTER);
    expect(garten.vonSelbst).toEqual({ art: 'vorstufe', fuer: HEILTRANK });
    expect(auftragsListe(garten)).toEqual([HEILTRANK]); // die Vorstufe ist kein eigener Auftrag
    expect(getGebaeudeStatus(state, 'HERB_GARDEN')).toMatchObject({ zustand: 'laeuft', text: 'Grüne Kräuter für Heiltrank' });

    laufe(state, 80);
    expect(state.globalStock.healing_potion).toBe(1);
    expect(state.globalStock.herb_green).toBe(0);
    expect(fertig.ids).toEqual([HEILTRANK]); // gemeldet wird nur der Auftrag
    expect(auftragsListe(garten)).toEqual([]);
    laufe(state, 60);
    expect(state.globalStock.herb_green).toBe(0); // danach ruht der Garten
    fertig.ab();
  });

  it('Restzeit zählt die Kräuter mit, die für alle Aufträge noch fehlen', () => {
    const state = stadt({ herb_green: 1 });
    const garten = werkstatt(state, 'HERB_GARDEN');
    auftragGeben(garten, HEILTRANK);
    auftragGeben(garten, HEILTRANK);
    expect(restzeitSekunden(garten, state)).toBe(2 * 15 + 20 + 3 * 15 + 20);
    expect(restzeitSekunden(garten)).toBe(2 * 20); // ohne Lager nur die Aufträge
  });

  it('Kraft-Brot: Mühle und Kräutergarten liefern der Bäckerei von selbst zu', () => {
    const state = stadt();
    const garten = werkstatt(state, 'HERB_GARDEN');
    const muehle = werkstatt(state, 'MILL_WIND');
    const baeckerei = werkstatt(state, 'BAKERY');
    const fertig = fertigListe();
    auftragGeben(baeckerei, KRAFTBROT);

    laufe(state, 1);
    expect(muehle.vonSelbst).toEqual({ art: 'zulieferung', fuer: 'BAKERY' });
    expect(garten.vonSelbst).toEqual({ art: 'zulieferung', fuer: 'BAKERY' });
    expect(getGebaeudeStatus(state, 'MILL_WIND').text).toBe('Mehl für Bäckerei');
    const wartet = getGebaeudeStatus(state, 'BAKERY');
    expect(wartet.grund).toEqual({ art: 'zulieferung', item: 'flour', von: 'MILL_WIND' });
    expect(wartet.text).toBe('wartet auf Mehl (Windmühle)');
    expect(engpassFuerGebaeude(state, 'BAKERY')).toBeNull(); // kommt ja gerade

    laufe(state, 60);
    expect(state.globalStock.power_bread).toBe(1);
    expect(fertig.ids).toEqual([KRAFTBROT]);
    // Genau so viel gemahlen und gezogen, wie gebraucht wurde
    expect(state.globalStock.flour).toBe(0);
    expect(state.globalStock.herb_green).toBe(0);
    expect(state.globalStock.grain).toBe(18);
    laufe(state, 60);
    expect(state.globalStock.grain).toBe(18);
    fertig.ab();
  });

  it('Brot für die Bewohner: nachbacken bis 3 Tage, dann ruhen', () => {
    const state = stadt({ bread: 1 });
    werkstatt(state, 'MILL_WIND');
    const baeckerei = werkstatt(state, 'BAKERY');
    expect(vorratZiel(state, 'BAKERY')).toBe(3); // 2 Arbeiter essen 1 Brot am Tag
    const fertig = fertigListe();

    laufe(state, 1);
    expect(getGebaeudeStatus(state, 'MILL_WIND').text).toBe('Mehl für Bäckerei');
    laufe(state, 120);
    expect(state.globalStock.bread).toBe(3);
    expect(state.globalStock.flour).toBe(0);
    expect(baeckerei.vonSelbst ?? null).toBeNull();
    expect(fertig.ids).toEqual([]); // Vorrat ist kein Auftrag, keine Meldung
    expect(getGebaeudeStatus(state, 'BAKERY').text).toBe('Brot reicht 3 Tage');
    fertig.ab();
  });

  it('Brot für die Bewohner geht den Aufträgen vor, bis es für 3 Tage reicht', () => {
    const state = stadt({ bread: 1, flour: 6, herb_green: 1 });
    const baeckerei = werkstatt(state, 'BAKERY');
    expect(vorratZiel(state, 'BAKERY')).toBe(3);
    auftragGeben(baeckerei, KRAFTBROT);
    expect(planeZyklus(state, baeckerei)).toMatchObject({ art: 'vorrat', recipe: { id: BROT } });
    laufe(state, 1);
    expect(baeckerei.vonSelbst).toEqual({ art: 'vorrat', fuer: 'bread' });
    laufe(state, 29); // zweimal Brot backen
    expect(state.globalStock.bread).toBe(3);
    // 3 Tage sind gesichert: jetzt kommt der Auftrag
    expect(planeZyklus(state, baeckerei)).toMatchObject({ art: 'auftrag', recipe: { id: KRAFTBROT } });
    laufe(state, 1);
    expect(baeckerei.activeRecipeId).toBe(KRAFTBROT);
    expect(baeckerei.vonSelbst ?? null).toBeNull();
  });

  it('wartet der eigene Auftrag auf Beute, liefert der Kräutergarten trotzdem zu', () => {
    const state = stadt({ flour: 2 });
    const garten = werkstatt(state, 'HERB_GARDEN');
    const baeckerei = werkstatt(state, 'BAKERY');
    auftragGeben(garten, 'RCP_MANA_POTION'); // braucht einen Schimmerpilz aus den Dungeons
    auftragGeben(baeckerei, KRAFTBROT);
    laufe(state, 1);
    expect(garten.activeRecipeId).toBe(KRAEUTER);
    expect(garten.vonSelbst).toEqual({ art: 'zulieferung', fuer: 'BAKERY' });
    laufe(state, 40);
    expect(state.globalStock.power_bread).toBe(1);
    expect(getGebaeudeStatus(state, 'HERB_GARDEN').text).toBe('fehlt: Schimmerpilz 0/1');
  });

  it('die Arkanschmiede stellt Magitech-Komponenten für die Kanone von selbst her', () => {
    const state = stadt({ iron_scrap: 20, crystal_shard: 10 });
    const arkan = werkstatt(state, 'ARCANE_SMITHY');
    const werkstattKrieg = werkstatt(state, 'WAR_MACHINE_WORKSHOP');
    auftragGeben(werkstattKrieg, 'RCP_WAR_CANNON');
    laufe(state, 1);
    expect(arkan.activeRecipeId).toBe('RCP_MAGITECH_COMPONENT');
    expect(arkan.vonSelbst).toEqual({ art: 'zulieferung', fuer: 'WAR_MACHINE_WORKSHOP' });
    expect(getGebaeudeStatus(state, 'WAR_MACHINE_WORKSHOP').text).toBe('wartet auf Magitech-Komponente (Arkanschmiede)');
    laufe(state, 2 * 181 + 2);
    expect(state.globalStock.magitech_component).toBe(0); // beide gleich in der Kanone verbaut
    expect(werkstattKrieg.producing).toBe(true);
    expect(werkstattKrieg.activeRecipeId).toBe('RCP_WAR_CANNON');
  });

  it('fehlt der Mühle das Getreide, nennt der Engpass der Bäckerei den Grund', () => {
    const state = stadt({ grain: 0 });
    werkstatt(state, 'MILL_WIND');
    const baeckerei = werkstatt(state, 'BAKERY');
    auftragGeben(baeckerei, BROT);
    laufe(state, 5);
    expect(getGebaeudeStatus(state, 'MILL_WIND').text).toBe('fehlt: Getreide 0/2');
    expect(engpassFuerGebaeude(state, 'BAKERY')).toBe('Mehl: 0 im Lager, 2 pro Auftrag. Dafür fehlt Getreide. Baue Getreidefarm.');
    // Steht die Farm ohne Arbeiter, sagt der Satz das
    const farm = werkstatt(state, 'FARM_GRAIN');
    farm.assignedWorkerIds = [];
    expect(engpassFuerGebaeude(state, 'BAKERY')).toContain('Dafür fehlt Getreide. Getreidefarm kann gerade nicht liefern: kein Arbeiter.');
  });

  // Gegenprüfung 21.10.2026: Die eigene Vorstufe galt als «kommt von selbst», auch wenn ihr etwas fehlte,
  // das nie kommt; die Arkanschmiede wartete dann ewig und nannte das Eisen nicht.
  it('hängt die eigene Vorstufe an etwas, das nicht kommt, nennt die Werkstatt den wahren Grund', () => {
    const state = stadt({ crystal_shard: 10, iron_scrap: 0 });
    const arkan = werkstatt(state, 'ARCANE_SMITHY');
    auftragGeben(arkan, 'RCP_ARCANE_PENDANT'); // 3 Kristallsplitter + 1 Magitech-Komponente (2 Eisenschrott, 2 Kristallsplitter)
    laufe(state, 5);
    expect(arkan.producing).toBe(false);
    const ohneMine = nachschub(state, 'magitech_component');
    expect(ohneMine).toEqual({ kommt: false, item: 'iron_scrap', von: 'IRON_MINE', grund: null });
    expect(nachschubText('magitech_component', ohneMine)).toBe('dafür fehlt Eisenschrott (Eisenmine fehlt)');
    expect(getGebaeudeStatus(state, 'ARCANE_SMITHY').text).toBe('fehlt: Magitech-Komponente 0/1');
    expect(engpassFuerGebaeude(state, 'ARCANE_SMITHY')).toContain('Dafür fehlt Eisenschrott. Baue Eisenmine.');
    // Mit einer Mine, die arbeitet, kommt das Eisen von selbst
    werkstatt(state, 'IRON_MINE');
    const mitMine = nachschub(state, 'magitech_component');
    expect(mitMine).toEqual({ kommt: true, item: 'iron_scrap', von: 'IRON_MINE' });
    expect(nachschubText('magitech_component', mitMine)).toBe('kommt von selbst (Arkanschmiede)');
    // Kristallsplitter sind Beute: Fehlen sie, kommt nichts
    state.globalStock.crystal_shard = 0;
    expect(nachschubText('magitech_component', nachschub(state, 'magitech_component')))
      .toBe('dafür fehlt Kristallsplitter (Beute aus den Dungeons)');
  });

  it('Abbrechen: die Vorstufe steht nicht in der Liste und hört mit dem Auftrag auf', () => {
    const state = stadt();
    const garten = werkstatt(state, 'HERB_GARDEN');
    auftragGeben(garten, HEILTRANK);
    laufe(state, 1);
    expect(auftragAbbrechen(state, garten, 0)).toBe(true); // bricht den Heiltrank ab, nicht das Kraut
    expect(auftragsListe(garten)).toEqual([]);
    expect(garten.producing).toBe(true);
    laufe(state, 60);
    expect(state.globalStock.herb_green).toBe(1); // das angefangene Kraut wächst fertig, dann Ruhe
    expect(state.globalStock.healing_potion).toBe(0);
  });

  it('jede Werkstatt, die Zutaten selbst macht oder geliefert bekommt, erklärt das im Fenster', () => {
    const state = stadt();
    const werkstaetten = Object.values(BUILDING_DEFS).filter(d => d.manualCraft);
    const macht = (id: string) => new Set(BUILDING_DEFS[id].recipes.flatMap(r => Object.keys(RECIPE_DEFS[r].outputs)));
    const braucht = (id: string) => new Set(BUILDING_DEFS[id].recipes.flatMap(r => Object.keys(RECIPE_DEFS[r].inputs)));
    for (const def of werkstaetten) {
      const liefert = werkstaetten.some(w => [...macht(def.id)].some(item => braucht(w.id).has(item)));
      const bekommt = werkstaetten.some(w => w.id !== def.id && [...braucht(def.id)].some(item => macht(w.id).has(item)));
      const beteiligt = liefert || bekommt || !!VORRAETE[def.id];
      expect(vonSelbstSatz(state, def.id) !== null, def.id).toBe(beteiligt);
    }
  });
});

/** Stadt wie im Spiel (Startgebäude, Bewohner) mit Brotkette und Kräutergarten; Gebäude sind sofort fertig. */
function brotStadt(wohnen: number, werkstattStufe: number, startBrot?: number): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  createStartingCitizens(state);
  Object.assign(state.globalStock, { wood: 999, stone: 999, gold: 999 });
  for (const typeId of ['FARM_GRAIN', 'WELL', 'MILL_WIND', 'BAKERY', 'HERB_GARDEN']) {
    const b = createBuildingInstance(typeId, 0, 0, true);
    b.activeRecipeId = BUILDING_DEFS[typeId].recipes[0];
    b.connected = true;
    state.buildings.push(b);
  }
  for (const b of state.buildings) {
    if (b.typeId === 'HOUSE_T1') b.tier = wohnen;
    if (['FARM_GRAIN', 'MILL_WIND', 'BAKERY', 'HERB_GARDEN'].includes(b.typeId)) b.tier = werkstattStufe;
  }
  while (state.citizens.length < Math.max(6, 6 * wohnen - 6)) state.citizens.push(createCitizen('IDLE'));
  if (startBrot !== undefined) state.globalStock.bread = startBrot;
  return state;
}

/** Spielt Tage wie main.ts (Stadt-Takt 1 s, Tag 30 s); `kraftBrot` hält 5 Kraft-Brot bestellt. */
function brotTage(state: GameState, tage: number, kraftBrot: boolean) {
  const production = new ProductionSystem();
  const people = new PeopleSystem();
  const satisfaction = new SatisfactionSystem();
  const economy = new EconomySystem();
  const baeckerei = state.buildings.find(b => b.typeId === 'BAKERY')!;
  let ohneBrot = 0;
  let hungrigeTage = 0;
  let wachstum = 0;
  for (let s = 1; s <= tage * TAG_SEKUNDEN; s++) {
    while (kraftBrot && auftragsListe(baeckerei).length < 5) auftragGeben(baeckerei, KRAFTBROT);
    production.update(state, 1);
    people.cityTick(state, 1);
    satisfaction.update(state);
    if ((state.globalStock.bread ?? 0) < 1) ohneBrot++;
    if (s % TAG_SEKUNDEN === 0) {
      const vorher = state.citizens.length;
      if ((state.globalStock.bread ?? 0) < brotProTag(vorher)) hungrigeTage++;
      economy.dayTick(state);
      people.dayTick(state);
      if (state.citizens.length > vorher) wachstum++;
    }
  }
  return { ohneBrot, hungrigeTage, wachstum, kraftBrot: state.globalStock.power_bread ?? 0 };
}

// Gemessen 21.10.2026 (Gegenprüfung): Ging Brot den Aufträgen erst vor, wenn es keinen Tag mehr reichte,
// fehlte mit dauernd bestelltem Kraft-Brot 562 von 900 Sekunden Brot und die Stadt wuchs nicht mehr.
describe('Werkstätten auf Klick: Brot und Aufträge', () => {
  it('dauernd Kraft-Brot bestellt: nie hungriger als ohne Auftrag, die Stadt wächst gleich', () => {
    for (const wohnen of [1, 2]) {
      const ohne = brotTage(brotStadt(wohnen, 1, 3), 30, false);
      const mit = brotTage(brotStadt(wohnen, 1, 3), 30, true);
      expect(mit.ohneBrot, `Wohnviertel ${wohnen}`).toBe(ohne.ohneBrot);
      expect(mit.hungrigeTage, `Wohnviertel ${wohnen}`).toBe(ohne.hungrigeTage);
      expect(mit.wachstum, `Wohnviertel ${wohnen}`).toBe(ohne.wachstum);
      expect(mit.kraftBrot, `Wohnviertel ${wohnen}`).toBeGreaterThanOrEqual(15);
    }
  });

  it('auf jeder Stadtstufe mit erlaubt ausgebauter Brotkette: Kraft-Brot kommt, Brot fehlt nie', () => {
    for (const { name, grenzen } of STADTSTUFEN) {
      const ergebnis = brotTage(brotStadt(grenzen.wohnen, grenzen.werkstatt), 40, true);
      expect(ergebnis.ohneBrot, name).toBe(0);
      expect(ergebnis.hungrigeTage, name).toBe(0);
      expect(ergebnis.kraftBrot, name).toBeGreaterThanOrEqual(20);
    }
  });
});

describe('Werkstätten auf Klick: Spielstand', () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      get length() { return data.size; },
      clear: () => data.clear(),
      getItem: (key: string) => data.get(key) ?? null,
      key: (index: number) => [...data.keys()][index] ?? null,
      removeItem: (key: string) => { data.delete(key); },
      setItem: (key: string, value: string) => { data.set(key, String(value)); },
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('eine laufende Vorstufe bleibt nach dem Laden eine Vorstufe', () => {
    const state = stadt();
    const garten = werkstatt(state, 'HERB_GARDEN');
    auftragGeben(garten, HEILTRANK);
    laufe(state, 3);
    const saveSystem = new SaveSystem();
    expect(saveSystem.save(state)).toBe(true);
    const geladen = saveSystem.load()!;
    const b = geladen.buildings.find(x => x.typeId === 'HERB_GARDEN')!;
    expect(b.vonSelbst).toEqual({ art: 'vorstufe', fuer: HEILTRANK });
    expect(auftragsListe(b)).toEqual([HEILTRANK]);
  });

  it('alter Spielstand: die Bäckerei backt den laufenden Zyklus fertig, meldet ihn einmal und ruht dann', () => {
    const state = stadt({ bread: 50, flour: 40 });
    const baeckerei = werkstatt(state, 'BAKERY');
    // So stand eine Bäckerei mit Dauer-Produktion vor dem 21.10.2026 im Spielstand (ohne vonSelbst)
    baeckerei.activeRecipeId = BROT;
    baeckerei.producing = true;
    baeckerei.productionTimer = 5;
    delete baeckerei.vonSelbst;
    const saveSystem = new SaveSystem();
    expect(saveSystem.save(state)).toBe(true);
    const geladen = saveSystem.load()!;
    const fertig = fertigListe();
    laufe(geladen, 60);
    expect(geladen.globalStock.bread).toBe(51);
    expect(fertig.ids).toEqual([BROT]);
    expect(geladen.buildings.find(x => x.typeId === 'BAKERY')!.producing).toBe(false);
    fertig.ab();
  });
});
