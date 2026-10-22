import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNewGameState, GameState } from '../models/GameState';
import { placeStartingLayout, createStartingCitizens } from '../scenes/CityStartingLayout';
import { istProbespiel, probespielNeu, probespielSterne, richteProbespielEin } from './Probespiel';
import { SaveSystem, nutzeProbespiel } from './SaveSystem';
import { istSchmiedbar, schmieden, schmiedeStufe } from './Schmiede';
import { ITEM_DEFS } from '../data/items';
import { MUSTER_SETS, MUSTER_TEAMS } from '../data/musterteams';
import { ROUTE_DEFS, isRouteAvailable, getRouteLockReasons } from '../data/routes';
import { setFuerRoute, setTeilIds } from '../data/dungeonSets';
import { BuildingUpgradeSystem } from './BuildingUpgradeSystem';
import { ClassUnlockSystem } from './ClassUnlockSystem';

/** Neues Spiel wie in main.ts, dann zum Probespiel gemacht (mit `sterne` wie ?probe=sterne). */
function probespiel(sterne = false): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  createStartingCitizens(state);
  richteProbespielEin(state, sterne);
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
    expect(probespielSterne('?probe=sterne')).toBe(true);
    expect(probespielSterne('?probe')).toBe(false);
    expect(probespielSterne('?probe=neu')).toBe(false);
  });

  it('Magische Stadt mit vier ausgerüsteten Helden, und alle vier gehen mit auf Expedition', () => {
    const state = probespiel();
    expect(state.stadtweg?.stufe).toBe(7);
    expect(state.fighters.map(f => f.classId)).toEqual(MUSTER_TEAMS.gut.helden.map(h => h.classId));
    expect(new Set(state.fighters.map(f => f.id)).size).toBe(4);
    expect(new BuildingUpgradeSystem().getPartySlots(state)).toBe(4);
    expect(state.guildStats.guildHallT2).toBe(true);
    for (const f of state.fighters) {
      expect(f.level).toBe(12);
      expect(f.citizenId).toBe(0);
      for (const itemId of Object.values(f.gear)) {
        if (itemId) expect(ITEM_DEFS[itemId], itemId).toBeTruthy();
      }
    }
  });

  it('Helden sind wie im Heldenhaus keine Bewohner: alle sechs Bewohner bleiben frei für die Arbeit', () => {
    const state = probespiel();
    expect(state.citizens).toHaveLength(6);
    for (const c of state.citizens) {
      expect(c.status).toBe('IDLE');
      expect(c.fighterId).toBeNull();
    }
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
    for (const sterne of [false, true]) {
      const state = probespiel(sterne);
      expect(state.classesUnlocked.length, `sterne=${sterne}`).toBeGreaterThanOrEqual(6);
      expect(new ClassUnlockSystem().checkUnlocks(state), `sterne=${sterne}`).toEqual([]);
    }
  });

  it('?probe=sterne: Team «Stark» mit seinen Wegen in Dungeon-Sets auf +3 vor der offenen Sternenschmiede', () => {
    const state = probespiel(true);
    expect(state.fighters.map(f => f.name)).toEqual(MUSTER_TEAMS.stark.helden.map(h => h.name));
    expect(new BuildingUpgradeSystem().getPartySlots(state)).toBe(4);
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
    const state = probespiel(true);
    const korrund = setTeilIds(setFuerRoute('sternenschmiede')!);
    // Korrunds Meisterstücke fallen erst in der Sternenschmiede; hier legen wir sie dazu
    for (const id of korrund) state.globalStock[id] = 1;
    for (const itemId of [...Object.keys(state.schmiede!.stufen), ...korrund]) {
      while (schmieden(state, itemId) !== null);
      expect(schmiedeStufe(state, itemId), itemId).toBe(5);
    }
    for (const [itemId, menge] of Object.entries(state.globalStock)) expect(menge, itemId).toBeGreaterThanOrEqual(0);
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
