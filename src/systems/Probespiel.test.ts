import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNewGameState, GameState } from '../models/GameState';
import { placeStartingLayout } from '../scenes/CityStartingLayout';
import { ProbeStufe, istProbespiel, probespielNeu, probespielStufe, richteProbespielEin } from './Probespiel';
import { SaveSystem, nutzeProbespiel } from './SaveSystem';
import { istSchmiedbar, schmieden, schmiedeStufe } from './Schmiede';
import { ITEM_DEFS } from '../data/items';
import { ENEMY_DEFS } from '../data/enemies';
import { MUSTER_SETS, MUSTER_TEAMS } from '../data/musterteams';
import { ROUTE_DEFS, isRouteAvailable, getRouteLockReasons } from '../data/routes';
import { setFuerRoute, setTeilIds } from '../data/dungeonSets';
import { heldenJeExpedition } from './Ausbau';
import { ClassUnlockSystem } from './ClassUnlockSystem';
import { raidOffen, raidStand, versuchsLage } from './Raid';
import { DREIZEHN, ZENIT } from '../data/raids';
import { LEHRLINGE } from '../data/lehrlinge';
import { createGuildFighter } from '../models/GuildRoster';

/** Neues Spiel wie in main.ts, dann zum Probespiel gemacht (mit `stufe` wie ?probe=sterne oder ?probe=mond). */
function probespiel(stufe: ProbeStufe = 'neu'): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  richteProbespielEin(state, stufe);
  return state;
}

function speicher(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => { data.delete(key); },
    setItem: (key: string, value: string) => { data.set(key, String(value)); },
  };
}

describe('Probespiel', () => {
  afterEach(() => {
    nutzeProbespiel(false);
    vi.unstubAllGlobals();
  });

  it('startet nur mit ?probe in der Adresse', () => {
    expect(istProbespiel('?probe')).toBe(true);
    expect(istProbespiel('?probe=1&x=2')).toBe(true);
    expect(istProbespiel('')).toBe(false);
    expect(istProbespiel('?x=probe')).toBe(false);
    expect(probespielNeu('?probe=neu')).toBe(true);
    expect(probespielNeu('?probe')).toBe(false);
    expect(probespielNeu('?probe=sterne')).toBe(true);
    expect(probespielNeu('?probe=mond')).toBe(true);
    expect(probespielNeu('?probe=morgen')).toBe(true);
    expect(probespielNeu('?probe=stadt')).toBe(true);
    expect(probespielNeu('?probe=pfeiler')).toBe(true);
    expect(probespielNeu('?probe=raid')).toBe(true);
    expect(probespielStufe('?probe=raid')).toBe('raid');
    expect(probespielNeu('?probe=raid2')).toBe(true);
    expect(probespielStufe('?probe=raid2')).toBe('raid2');
    expect(probespielStufe('?probe=stadt')).toBe('stadt');
    expect(probespielStufe('?probe=pfeiler')).toBe('pfeiler');
    expect(probespielStufe('?probe=sterne')).toBe('sterne');
    expect(probespielStufe('?probe=mond')).toBe('mond');
    expect(probespielStufe('?probe=morgen')).toBe('morgen');
    expect(probespielStufe('?probe')).toBe('neu');
    expect(probespielStufe('?probe=neu')).toBe('neu');
  });

  it('Magische Stadt mit vier ausgerüsteten Helden, und alle vier gehen mit auf Expedition', () => {
    const state = probespiel();
    expect(state.stadtweg?.stufe).toBe(7);
    expect(state.fighters.map(f => f.classId)).toEqual(MUSTER_TEAMS.gut.helden.map(h => h.classId));
    expect(new Set(state.fighters.map(f => f.id)).size).toBe(4);
    expect(heldenJeExpedition(state)).toBe(4);
    expect(state.guildStats.guildHallT2).toBe(true);
    for (const f of state.fighters) {
      expect(f.level).toBe(12);
      for (const itemId of Object.values(f.gear)) {
        if (itemId) expect(ITEM_DEFS[itemId], itemId).toBeTruthy();
      }
    }
  });

  it('Vorräte zum Bauen und Ausbauen: Gold, Eisenschrott und Kristallsplitter, dazu Proviant', () => {
    const state = probespiel();
    expect(state.globalStock.gold).toBeGreaterThanOrEqual(3000);
    expect(state.globalStock.iron_scrap).toBeGreaterThanOrEqual(150);
    expect(state.globalStock.crystal_shard).toBeGreaterThanOrEqual(30);
    expect(state.globalStock.bread).toBeGreaterThanOrEqual(30);
    expect(state.globalStock.healing_potion).toBeGreaterThanOrEqual(10);
    expect(state.globalStock.power_bread).toBe(5);
    for (const itemId of Object.keys(state.globalStock)) expect(ITEM_DEFS[itemId], itemId).toBeTruthy();
    expect(state.buildings.map(b => b.typeId)).toEqual(['GUILD_HALL', 'HAENDLER']);
  });

  it('alle Dungeons bis zum Vulkankern sind offen, darüber wartet der Drachenhort', () => {
    const state = probespiel();
    expect(state.guildStats.rank).toBe(5);
    for (const route of Object.values(ROUTE_DEFS).filter(r => r.tier <= 4)) {
      expect(isRouteAvailable(route, state), route.id).toBe(true);
    }
    expect(isRouteAvailable(ROUTE_DEFS.drachenhort, state)).toBe(true);
    expect(getRouteLockReasons(ROUTE_DEFS.himmelsarchiv, state)).toEqual(['Besiege: Ignarax, der Uralte']);
  });

  it('die Klassen, die eine Gilde mit diesen Bossen schon hat, sind frei: der erste Bericht meldet keine «Neue Klasse»', () => {
    for (const stufe of ['neu', 'sterne', 'mond', 'morgen'] as const) {
      const state = probespiel(stufe);
      expect(state.classesUnlocked.length, stufe).toBeGreaterThanOrEqual(6);
      expect(new ClassUnlockSystem().checkUnlocks(state), stufe).toEqual([]);
    }
  });

  it('?probe=sterne: Team «Stark» mit seinen Wegen in Dungeon-Sets auf +3 vor der offenen Sternenschmiede', () => {
    const state = probespiel('sterne');
    expect(state.fighters.map(f => f.name)).toEqual(MUSTER_TEAMS.stark.helden.map(h => h.name));
    expect(heldenJeExpedition(state)).toBe(4);
    for (const f of state.fighters) {
      expect(f.level).toBe(15);
      expect(f.spezialisierung).toBe(MUSTER_TEAMS.stark.helden.find(h => h.name === f.name)!.weg);
      expect(f.gear).toEqual(MUSTER_SETS.sterne3.gear[f.name]);
      for (const itemId of Object.values(f.gear)) {
        if (itemId && istSchmiedbar(itemId)) expect(schmiedeStufe(state, itemId), itemId).toBe(3);
      }
    }
    expect(isRouteAvailable(ROUTE_DEFS.himmelsarchiv, state)).toBe(true);
    expect(isRouteAvailable(ROUTE_DEFS.sternenschmiede, state)).toBe(true);
    expect(getRouteLockReasons(ROUTE_DEFS.sternenschlund, state)).toEqual(['Besiege: Korrund, der Sternenschmied']);
  });

  it('?probe=sterne: im Lager liegt alles, um die Sets und Korrunds Meisterstücke auf +5 zu schmieden', () => {
    const state = probespiel('sterne');
    const korrund = setTeilIds(setFuerRoute('sternenschmiede')!);
    // Korrunds Meisterstücke fallen erst in der Sternenschmiede; hier legen wir sie dazu
    for (const id of korrund) state.globalStock[id] = 1;
    for (const itemId of [...Object.keys(state.schmiede!.stufen), ...korrund]) {
      while (schmieden(state, itemId) !== null);
      expect(schmiedeStufe(state, itemId), itemId).toBe(5);
    }
    for (const [itemId, menge] of Object.entries(state.globalStock)) expect(menge, itemId).toBeGreaterThanOrEqual(0);
  });

  it('?probe=mond: Team «Stark» in den Sets der Sterne auf +5 vor dem offenen Mondhof, mit Mondsilber für das Pfand des Mondvogts', () => {
    const state = probespiel('mond');
    for (const f of state.fighters) {
      expect(f.gear).toEqual(MUSTER_SETS.mond5.gear[f.name]);
      for (const itemId of Object.values(f.gear)) {
        if (itemId && istSchmiedbar(itemId)) expect(schmiedeStufe(state, itemId), itemId).toBe(5);
      }
    }
    expect(isRouteAvailable(ROUTE_DEFS.sternenschlund, state)).toBe(true);
    expect(isRouteAvailable(ROUTE_DEFS.mondhof, state)).toBe(true);
    const pfand = setTeilIds(setFuerRoute('mondhof')!);
    for (const id of pfand) state.globalStock[id] = 1;
    for (const itemId of pfand) {
      while (schmieden(state, itemId) !== null);
      expect(schmiedeStufe(state, itemId), itemId).toBe(5);
    }
    for (const [itemId, menge] of Object.entries(state.globalStock)) expect(menge, itemId).toBeGreaterThanOrEqual(0);
  });

  it('?probe=stadt: Sina in Sunnas Morgengabe auf +5 vor der Ersten Stadt, mit Tagstein für Alrunas Wachfeuer', () => {
    const state = probespiel('stadt');
    for (const f of state.fighters) expect(f.gear).toEqual(MUSTER_SETS.morgen5.gear[f.name]);
    expect(state.guildStats.bossesDefeatedIds).toContain('boss_sunna');
    expect(state.guildStats.bossesDefeatedIds).not.toContain('boss_alruna');
    expect(isRouteAvailable(ROUTE_DEFS.erste_stadt, state)).toBe(true);
    expect(getRouteLockReasons(ROUTE_DEFS.tagespfeiler, state)).toEqual([`Besiege: ${ENEMY_DEFS.boss_alruna.name}`]);
    const feuer = setTeilIds(setFuerRoute('erste_stadt')!);
    for (const id of feuer) state.globalStock[id] = 1;
    for (const itemId of feuer) {
      while (schmieden(state, itemId) !== null);
      expect(schmiedeStufe(state, itemId), itemId).toBe(5);
    }
    for (const [itemId, menge] of Object.entries(state.globalStock)) expect(menge, itemId).toBeGreaterThanOrEqual(0);
  });

  it('?probe=pfeiler: Grimm in Alrunas Wachfeuer auf +5 vor den Pfeilern, Alrunas Kelle liegt im Lager', () => {
    const state = probespiel('pfeiler');
    for (const f of state.fighters) expect(f.gear).toEqual(MUSTER_SETS.stadt5.gear[f.name]);
    expect(state.fighters.find(f => f.name === 'Grimm')!.gear.mainHand).toBe('set_wachfeuer_hammer');
    expect(state.guildStats.bossesDefeatedIds).toContain('boss_alruna');
    expect(isRouteAvailable(ROUTE_DEFS.tagespfeiler, state)).toBe(true);
    // Die Kelle ist da, aber nicht angelegt: Brom behält den Amtsstab, der Vergleich steht im Lager
    expect(state.globalStock.alrunas_kelle).toBe(1);
    expect(state.fighters.some(f => Object.values(f.gear).includes('alrunas_kelle'))).toBe(false);
    expect(state.fighters.find(f => f.name === 'Brom')!.gear.mainHand).toBe('amtsstab_des_mondvogts');
    const tagwerk = setTeilIds(setFuerRoute('tagespfeiler')!);
    for (const id of tagwerk) state.globalStock[id] = 1;
    for (const itemId of tagwerk) {
      while (schmieden(state, itemId) !== null);
      expect(schmiedeStufe(state, itemId), itemId).toBe(5);
    }
  });

  it('?probe=morgen: Brom im Pfand des Mondvogts mit dem Amtsstab auf +5 vor dem offenen Morgentor, mit Mondsilber für Sunnas Morgengabe', () => {
    const state = probespiel('morgen');
    for (const f of state.fighters) {
      expect(f.gear).toEqual(MUSTER_SETS.pfand5.gear[f.name]);
      for (const itemId of Object.values(f.gear)) {
        if (itemId && istSchmiedbar(itemId)) expect(schmiedeStufe(state, itemId), itemId).toBe(5);
      }
    }
    expect(state.fighters.find(f => f.name === 'Brom')!.gear.mainHand).toBe('amtsstab_des_mondvogts');
    expect(state.guildStats.bossesDefeatedIds).toContain('boss_argentis');
    expect(state.guildStats.bossesDefeatedIds).not.toContain('boss_sunna');
    expect(isRouteAvailable(ROUTE_DEFS.mondhof, state)).toBe(true);
    expect(isRouteAvailable(ROUTE_DEFS.morgentor, state)).toBe(true);
    const morgen = setTeilIds(setFuerRoute('morgentor')!);
    for (const id of morgen) state.globalStock[id] = 1;
    for (const itemId of morgen) {
      while (schmieden(state, itemId) !== null);
      expect(schmiedeStufe(state, itemId), itemId).toBe(5);
    }
    for (const [itemId, menge] of Object.entries(state.globalStock)) expect(menge, itemId).toBeGreaterThanOrEqual(0);
  });

  it('?probe=raid: zehn Helden der Muster-Gilde unter dem offenen Raid, mit Tagstein und eigenen Ids', () => {
    const state = probespiel('raid');
    expect(state.fighters).toHaveLength(10);
    expect(state.fighters.map(f => f.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(state.fighters.every(f => f.level === 15 && !!f.spezialisierung)).toBe(true);
    expect(state.guildStats.bossesDefeatedIds).toContain(ROUTE_DEFS.tagespfeiler.bossId);
    expect(raidOffen(state)).toBe(true);
    expect(state.globalStock.mat_tagstein).toBeGreaterThanOrEqual(40);
    for (const f of state.fighters) {
      for (const itemId of Object.values(f.gear)) {
        if (itemId) expect(ITEM_DEFS[itemId], itemId).toBeTruthy();
      }
    }
    // Die Set-Teile stehen in der Schmiede auf ihrer Stufe (Brom +5, Lia ohne Stufen)
    const brom = state.fighters.find(f => f.name === 'Brom')!;
    expect(schmiedeStufe(state, brom.gear.armor!)).toBe(5);
    // Alle zehn stehen schon auf dem Feld, drei Ernstkämpfe sind frei
    expect(Object.keys(raidStand(state).aufstellung)).toHaveLength(10);
    expect(versuchsLage(state).moeglich).toBe(true);
    // Ein neu angeheuerter Held bekommt eine neue Id
    expect(createGuildFighter('ranger', 'Neu', { ...brom.baseStats }).id).toBe(11);
    // Stufe II bleibt zu, bis Zenit einmal angehalten ist
    expect(raidOffen(state, DREIZEHN)).toBe(false);
  });

  it('?probe=raid2: dieselbe Gilde mit fünf Lehrlingen, Zenit einmal angehalten, Stufe II offen', () => {
    const jetzt = Date.now();
    const state = probespiel('raid2');
    expect(state.fighters).toHaveLength(15);
    expect(state.fighters.map(f => f.id)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    const lehrlinge = state.fighters.filter(f => f.lehrling);
    expect(lehrlinge).toHaveLength(5);
    expect(lehrlinge.every(f => LEHRLINGE[f.classId]?.name === f.name)).toBe(true);
    expect(state.fighters.filter(f => !f.lehrling).every(f => f.level === 15 && !!f.spezialisierung)).toBe(true);
    for (const f of state.fighters) {
      for (const itemId of Object.values(f.gear)) {
        if (itemId) expect(ITEM_DEFS[itemId], itemId).toBeTruthy();
      }
    }
    // Stufe I: einmal gewonnen, in der Woche davor; diese Woche ist dort alles frei
    expect(state.raid?.siege).toBe(1);
    expect(raidStand(state, jetzt, ZENIT).woche.versuche).toBe(0);
    expect(state.globalStock[ZENIT.ersterSiegBeute]).toBe(1);
    expect(state.statistics.raid_siege).toBe(1);
    // Stufe II: offen, fünfzehn auf dem Feld, drei Ernstkämpfe frei, Tagstein für bezahlte
    expect(raidOffen(state, ZENIT)).toBe(true);
    expect(raidOffen(state, DREIZEHN)).toBe(true);
    expect(state.globalStock.mat_tagstein).toBeGreaterThanOrEqual(60);
    expect(Object.keys(raidStand(state, jetzt, DREIZEHN).aufstellung)).toHaveLength(15);
    expect(versuchsLage(state, jetzt, DREIZEHN).moeglich).toBe(true);
    expect(state.raidStufen?.dreizehn?.siege).toBe(0);
    expect(createGuildFighter('ranger', 'Neu', { ...state.fighters[0].baseStats }).id).toBe(16);
  });

  it('speichert auf einem eigenen Platz, der richtige Spielstand bleibt unberührt', () => {
    vi.stubGlobal('localStorage', speicher());
    localStorage.setItem('magic_city_save', 'richtig');
    nutzeProbespiel();
    const saveSystem = new SaveSystem();
    expect(saveSystem.load()).toBeNull();
    expect(saveSystem.save(probespiel())).toBe(true);
    expect(saveSystem.save(probespiel())).toBe(true);
    expect(localStorage.getItem('magic_city_save')).toBe('richtig');
    expect(localStorage.getItem('magic_city_save_backup')).toBeNull();
    expect(new SaveSystem().load()?.stadtweg?.stufe).toBe(7);
  });
});
