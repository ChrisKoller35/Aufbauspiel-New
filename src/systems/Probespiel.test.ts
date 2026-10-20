import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNewGameState, GameState } from '../models/GameState';
import { placeStartingLayout, createStartingCitizens } from '../scenes/CityStartingLayout';
import { istProbespiel, probespielNeu, richteProbespielEin } from './Probespiel';
import { SaveSystem, nutzeProbespiel } from './SaveSystem';
import { ITEM_DEFS } from '../data/items';
import { MUSTER_TEAMS } from '../data/musterteams';
import { ROUTE_DEFS, isRouteAvailable, getRouteLockReasons } from '../data/routes';

/** Neues Spiel wie in main.ts, dann zum Probespiel gemacht. */
function probespiel(): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  createStartingCitizens(state);
  richteProbespielEin(state);
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
  });

  it('Magische Stadt mit vier ausgerüsteten Helden', () => {
    const state = probespiel();
    expect(state.stadtweg?.stufe).toBe(7);
    expect(state.fighters.map(f => f.classId)).toEqual(MUSTER_TEAMS.gut.helden.map(h => h.classId));
    expect(new Set(state.fighters.map(f => f.id)).size).toBe(4);
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
