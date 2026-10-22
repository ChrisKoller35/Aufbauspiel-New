// ─── Werkstätten auf Klick: Schmiede, Kräuterküche, Arkanschmiede, Kriegsmaschinen ──
// Eine Werkstatt arbeitet nur für einen Auftrag (systems/Auftraege.ts), holt sich dafür
// eine Vorstufe selbst oder liefert einer anderen Werkstatt zu (systems/Werkstattplan.ts).
// Zutaten sind Gold und Beute aus den Dungeons (globalStock); fehlt etwas, sagt die
// Werkstatt (systems/GebaeudeStatus.ts) und der Engpass (systems/EngpassSystem.ts), was zu tun ist.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createBuildingInstance, BuildingInstance } from '../src/models/Building';
import { BUILDING_DEFS } from '../src/data/buildings';
import { RECIPE_DEFS } from '../src/data/recipes';
import { ProductionSystem } from '../src/systems/ProductionSystem';
import { SaveSystem, hebeSperreNachLadenAuf } from '../src/systems/SaveSystem';
import { auftragGeben, auftragAbbrechen, auftragsListe, beiAuftragFertig, restzeitSekunden } from '../src/systems/Auftraege';
import { planeZyklus, vonSelbstSatz } from '../src/systems/Werkstattplan';
import { getGebaeudeStatus, nachschub, nachschubText } from '../src/systems/GebaeudeStatus';
import { engpassFuerGebaeude } from '../src/systems/EngpassSystem';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';

const WERKSTAETTEN = ['SMITHY', 'HERB_GARDEN', 'ARCANE_SMITHY', 'WAR_MACHINE_WORKSHOP'];
const SCHWERT = 'RCP_IRON_SWORD';          // 2 Eisenschrott + 10 Gold, 90 s
const HEILTRANK = 'RCP_HEALING_POTION';    // 3 Grüne Kräuter, 20 s
const KRAFTBROT = 'RCP_POWER_BREAD';       // 1 Brot + 1 Grüne Kräuter, 18 s
const KOMPONENTE = 'RCP_MAGITECH_COMPONENT'; // 2 Kristallsplitter + 2 Eisenschrott, 180 s
const KLINGE = 'RCP_ARCANE_BLADE';         // 3 Eisenschrott + 2 Kristallsplitter + 1 Komponente, 300 s
const KANONE = 'RCP_WAR_CANNON';           // 5 Eisenschrott + 3 Kristallsplitter + 2 Komponenten, 900 s

/** Gildenstadt mit Gildenhaus und Händler; das Lager hat nur, was `lager` sagt. */
function stadt(lager: Record<string, number> = {}): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  Object.assign(state.globalStock, { gold: 0, iron_scrap: 0, crystal_shard: 0, herb_green: 0, bread: 0, healing_potion: 0 }, lager);
  return state;
}

function werkstatt(state: GameState, typeId: string): BuildingInstance {
  const b = createBuildingInstance(typeId);
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
  it('ohne Auftrag ruhen alle vier Werkstätten; Gildenhaus und Händler arbeiten nie', () => {
    const state = stadt({ gold: 100, iron_scrap: 20, crystal_shard: 10, herb_green: 9, bread: 3 });
    for (const id of WERKSTAETTEN) werkstatt(state, id);
    const vorher = { ...state.globalStock };
    laufe(state, 120);
    expect(state.globalStock).toEqual(vorher);
    for (const id of WERKSTAETTEN) {
      expect(getGebaeudeStatus(state, id)).toMatchObject({ zustand: 'bereit', text: 'bereit · Auftrag geben' });
      expect(engpassFuerGebaeude(state, id)).toBeNull();
    }
    expect(getGebaeudeStatus(state, 'HAENDLER')).toMatchObject({ zustand: 'offen', text: 'Kauft und verkauft.' });
    expect(state.buildings.every(b => !b.producing)).toBe(true);
  });

  it('Eisenschwert auf Klick: Gold ist eine Zutat wie Eisenschrott', () => {
    const state = stadt({ gold: 10, iron_scrap: 2 });
    const schmiede = werkstatt(state, 'SMITHY');
    const fertig = fertigListe();
    expect(auftragGeben(schmiede, SCHWERT)).toBe(true);
    expect(restzeitSekunden(schmiede, state)).toBe(90);

    laufe(state, 1);
    expect(schmiede.producing).toBe(true);
    expect(schmiede.vonSelbst ?? null).toBeNull();
    expect(state.globalStock.gold).toBe(0);
    expect(state.globalStock.iron_scrap).toBe(0);
    expect(getGebaeudeStatus(state, 'SMITHY')).toMatchObject({ zustand: 'laeuft', text: RECIPE_DEFS[SCHWERT].name });

    laufe(state, 90); // der Takt, der den Zyklus beginnt, zählt noch nicht herunter
    expect(state.globalStock.iron_sword).toBe(1);
    expect(fertig.ids).toEqual([SCHWERT]);
    expect(auftragsListe(schmiede)).toEqual([]);
    fertig.ab();
  });

  it('fehlt Gold, wartet die Schmiede und der Engpass sagt, woher Gold kommt', () => {
    const state = stadt({ gold: 4, iron_scrap: 10 });
    const schmiede = werkstatt(state, 'SMITHY');
    auftragGeben(schmiede, SCHWERT);
    laufe(state, 5);
    expect(schmiede.producing).toBe(false);
    expect(getGebaeudeStatus(state, 'SMITHY')).toMatchObject({ zustand: 'wartet', text: 'fehlt: Gold 4/10' });
    expect(engpassFuerGebaeude(state, 'SMITHY'))
      .toBe('Gold: 4 im Lager, 10 pro Auftrag. Gold bringen Expeditionen, das Auftragsbrett im Gildenhaus und der Händler, der Beute ankauft.');
    state.globalStock.gold = 10;
    laufe(state, 1);
    expect(schmiede.producing).toBe(true);
  });

  it('fehlt Beute, nennt der Engpass die Expedition', () => {
    const state = stadt({ gold: 100 });
    const schmiede = werkstatt(state, 'SMITHY');
    auftragGeben(schmiede, SCHWERT);
    laufe(state, 5);
    expect(getGebaeudeStatus(state, 'SMITHY').text).toBe('fehlt: Eisenschrott 0/2');
    expect(engpassFuerGebaeude(state, 'SMITHY'))
      .toBe('Eisenschrott: 0 im Lager, 2 pro Auftrag. Eisenschrott gibt es als Beute in den Dungeons: schick die Helden auf Expedition.');
  });

  it('Kräuterküche: Heiltrank und Kraft-Brot aus Kräutern und Brot, ein Auftrag nach dem anderen', () => {
    const state = stadt({ herb_green: 4, bread: 1 });
    const kueche = werkstatt(state, 'HERB_GARDEN');
    const fertig = fertigListe();
    auftragGeben(kueche, HEILTRANK);
    auftragGeben(kueche, KRAFTBROT);
    expect(restzeitSekunden(kueche, state)).toBe(20 + 18);
    laufe(state, 1 + 20 + 18);
    expect(state.globalStock.healing_potion).toBe(1);
    expect(state.globalStock.power_bread).toBe(1);
    expect(state.globalStock.herb_green).toBe(0);
    expect(state.globalStock.bread).toBe(0);
    expect(fertig.ids).toEqual([HEILTRANK, KRAFTBROT]);
    fertig.ab();
  });

  it('Vorstufe: fehlt der Arkanklinge die Komponente, stellt die Arkanschmiede sie zuerst her', () => {
    const state = stadt({ iron_scrap: 10, crystal_shard: 10 });
    const arkan = werkstatt(state, 'ARCANE_SMITHY');
    const fertig = fertigListe();
    auftragGeben(arkan, KLINGE);
    expect(restzeitSekunden(arkan, state)).toBe(180 + 300);

    laufe(state, 1);
    expect(arkan.activeRecipeId).toBe(KOMPONENTE);
    expect(arkan.vonSelbst).toEqual({ art: 'vorstufe', fuer: KLINGE });
    expect(auftragsListe(arkan)).toEqual([KLINGE]); // die Vorstufe ist kein eigener Auftrag
    expect(getGebaeudeStatus(state, 'ARCANE_SMITHY')).toMatchObject({ zustand: 'laeuft', text: 'Magitech-Komponente für Arkanklinge' });

    laufe(state, 180 + 300);
    expect(state.globalStock.arcane_blade).toBe(1);
    expect(state.globalStock.magitech_component).toBe(0);
    expect(fertig.ids).toEqual([KLINGE]); // gemeldet wird nur der Auftrag
    expect(state.globalStock.iron_scrap).toBe(10 - 2 - 3);
    laufe(state, 60);
    expect(state.globalStock.magitech_component).toBe(0); // danach ruht die Arkanschmiede
    fertig.ab();
  });

  it('Zulieferung: die Arkanschmiede stellt Magitech-Komponenten für die Kanone von selbst her', () => {
    const state = stadt({ iron_scrap: 20, crystal_shard: 10 });
    const arkan = werkstatt(state, 'ARCANE_SMITHY');
    const werkstattKrieg = werkstatt(state, 'WAR_MACHINE_WORKSHOP');
    auftragGeben(werkstattKrieg, KANONE);
    laufe(state, 1);
    expect(arkan.activeRecipeId).toBe(KOMPONENTE);
    expect(arkan.vonSelbst).toEqual({ art: 'zulieferung', fuer: 'WAR_MACHINE_WORKSHOP' });
    expect(getGebaeudeStatus(state, 'ARCANE_SMITHY').text).toBe('Magitech-Komponente für Kriegsmaschinen-Werkstatt');
    const wartet = getGebaeudeStatus(state, 'WAR_MACHINE_WORKSHOP');
    expect(wartet.grund).toEqual({ art: 'zulieferung', item: 'magitech_component', von: 'ARCANE_SMITHY' });
    expect(wartet.text).toBe('wartet auf Magitech-Komponente (Arkanschmiede)');
    expect(engpassFuerGebaeude(state, 'WAR_MACHINE_WORKSHOP')).toBeNull(); // kommt ja gerade
    laufe(state, 2 * 181 + 2);
    expect(state.globalStock.magitech_component).toBe(0); // beide gleich in der Kanone verbaut
    expect(werkstattKrieg.producing).toBe(true);
    expect(werkstattKrieg.activeRecipeId).toBe(KANONE);
  });

  // Gegenprüfung 21.10.2026: Die eigene Vorstufe galt als «kommt von selbst», auch wenn ihr etwas fehlte,
  // das nie kommt; die Arkanschmiede wartete dann ewig und nannte das Eisen nicht.
  it('hängt die eigene Vorstufe an Beute, nennt die Werkstatt den wahren Grund', () => {
    const state = stadt({ crystal_shard: 10, iron_scrap: 0 });
    const arkan = werkstatt(state, 'ARCANE_SMITHY');
    auftragGeben(arkan, 'RCP_ARCANE_PENDANT'); // 3 Kristallsplitter + 1 Magitech-Komponente (2 Eisenschrott, 2 Kristallsplitter)
    laufe(state, 5);
    expect(arkan.producing).toBe(false);
    const ohneEisen = nachschub(state, 'magitech_component');
    expect(ohneEisen).toEqual({ kommt: false, item: 'iron_scrap', von: null });
    expect(nachschubText('magitech_component', ohneEisen)).toBe('dafür fehlt Eisenschrott (Beute aus den Dungeons)');
    expect(getGebaeudeStatus(state, 'ARCANE_SMITHY').text).toBe('fehlt: Magitech-Komponente 0/1');
    expect(engpassFuerGebaeude(state, 'ARCANE_SMITHY'))
      .toContain('Dafür fehlt Eisenschrott. Eisenschrott gibt es als Beute in den Dungeons: schick die Helden auf Expedition.');
    // Mit Eisen im Lager kommt die Komponente von selbst
    state.globalStock.iron_scrap = 10;
    const mitEisen = nachschub(state, 'magitech_component');
    expect(mitEisen).toEqual({ kommt: true, item: 'magitech_component', von: 'ARCANE_SMITHY' });
    expect(nachschubText('magitech_component', mitEisen)).toBe('kommt von selbst (Arkanschmiede)');
    // Ohne Arkanschmiede fehlt das Gebäude
    state.buildings = state.buildings.filter(b => b !== arkan);
    expect(nachschubText('magitech_component', nachschub(state, 'magitech_component'))).toBe('Arkanschmiede fehlt');
  });

  it('Abbrechen: die Vorstufe steht nicht in der Liste und hört mit dem Auftrag auf', () => {
    const state = stadt({ iron_scrap: 10, crystal_shard: 10 });
    const arkan = werkstatt(state, 'ARCANE_SMITHY');
    auftragGeben(arkan, KLINGE);
    laufe(state, 1);
    expect(auftragAbbrechen(state, arkan, 0)).toBe(true); // bricht die Klinge ab, nicht die Komponente
    expect(auftragsListe(arkan)).toEqual([]);
    expect(arkan.producing).toBe(true);
    laufe(state, 400);
    expect(state.globalStock.magitech_component).toBe(1); // die angefangene Komponente wird fertig, dann Ruhe
    expect(state.globalStock.arcane_blade).toBeUndefined();
  });

  it('eine Werkstatt auf Stufe 2 arbeitet doppelt so schnell', () => {
    const state = stadt({ gold: 10, iron_scrap: 2 });
    const schmiede = werkstatt(state, 'SMITHY');
    schmiede.tier = 2;
    auftragGeben(schmiede, SCHWERT);
    expect(planeZyklus(state, schmiede)).toMatchObject({ art: 'auftrag', recipe: { id: SCHWERT } });
    laufe(state, 1);
    expect(schmiede.productionTimer).toBe(45);
    laufe(state, 45);
    expect(state.globalStock.iron_sword).toBe(1);
  });

  it('jede Werkstatt, die Zutaten selbst macht oder geliefert bekommt, erklärt das im Fenster', () => {
    const werkstaetten = Object.values(BUILDING_DEFS).filter(d => d.manualCraft);
    expect(werkstaetten.map(d => d.id).sort()).toEqual([...WERKSTAETTEN].sort());
    const macht = (id: string) => new Set(BUILDING_DEFS[id].recipes.flatMap(r => Object.keys(RECIPE_DEFS[r].outputs)));
    const braucht = (id: string) => new Set(BUILDING_DEFS[id].recipes.flatMap(r => Object.keys(RECIPE_DEFS[r].inputs)));
    for (const def of werkstaetten) {
      const liefert = werkstaetten.some(w => [...macht(def.id)].some(item => braucht(w.id).has(item)));
      const bekommt = werkstaetten.some(w => w.id !== def.id && [...braucht(def.id)].some(item => macht(w.id).has(item)));
      expect(vonSelbstSatz(def.id) !== null, def.id).toBe(liefert || bekommt);
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
    hebeSperreNachLadenAuf();
  });

  it('eine laufende Vorstufe bleibt nach dem Laden eine Vorstufe', () => {
    const state = stadt({ iron_scrap: 10, crystal_shard: 10 });
    const arkan = werkstatt(state, 'ARCANE_SMITHY');
    auftragGeben(arkan, KLINGE);
    laufe(state, 3);
    const saveSystem = new SaveSystem();
    expect(saveSystem.save(state)).toBe(true);
    const geladen = saveSystem.load()!;
    const b = geladen.buildings.find(x => x.typeId === 'ARCANE_SMITHY')!;
    expect(b.vonSelbst).toEqual({ art: 'vorstufe', fuer: KLINGE });
    expect(auftragsListe(b)).toEqual([KLINGE]);
    laufe(geladen, 180 + 300);
    expect(geladen.globalStock.arcane_blade).toBe(1);
  });
});
