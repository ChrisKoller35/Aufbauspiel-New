import { describe, it, expect, vi } from 'vitest';
import { createNewGameState, GameState } from '../models/GameState';
import { placeStartingLayout, createStartingCitizens } from '../scenes/CityStartingLayout';
import { istProbespiel, probespielNeu, richteProbespielEin } from './Probespiel';
import { SaveSystem, nutzeProbespiel } from './SaveSystem';
import { ExpeditionSystem } from './ExpeditionSystem';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { treppeOffen } from './Treppe';
import { ITEM_DEFS } from '../data/items';
import { MUSTER_TEAMS } from '../data/musterteams';

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
  it('startet nur mit ?probe in der Adresse', () => {
    expect(istProbespiel('?probe')).toBe(true);
    expect(istProbespiel('?probe=1&x=2')).toBe(true);
    expect(istProbespiel('')).toBe(false);
    expect(istProbespiel('?x=probe')).toBe(false);
    expect(probespielNeu('?probe=neu')).toBe(true);
    expect(probespielNeu('?probe')).toBe(false);
  });

  it('Magische Stadt mit offener Treppe und vier ausgerüsteten Helden', () => {
    const state = probespiel();
    expect(state.stadtweg?.stufe).toBe(7);
    expect(treppeOffen(state)).toBe(true);
    expect(state.fighters.map(f => f.classId)).toEqual(MUSTER_TEAMS.gut.helden.map(h => h.classId));
    for (const f of state.fighters) {
      expect(f.level).toBe(12);
      for (const itemId of Object.values(f.gear)) {
        if (itemId) expect(ITEM_DEFS[itemId], itemId).toBeTruthy();
      }
      const citizen = state.citizens.find(c => c.fighterId === f.id);
      expect(citizen?.status).toBe('GUILD_FIGHTER');
      expect(citizen?.id).toBe(f.citizenId);
    }
  });

  it('das Team kommt wie in der Eichung weit über den ersten Boss hinaus', () => {
    const state = probespiel();
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    const run = system.startTreppe(state, state.fighters.map(f => f.id), 1)!;
    expect(run).toBeTruthy();
    for (let schritt = 0; schritt < 200 && system.nextStep(run) !== 'finish'; schritt++) {
      if (system.nextStep(run) === 'checkpoint') system.resolveCheckpoint(run, false);
      else system.processCurrentRoom(state);
    }
    expect(run.treppe!.geschafft).toBeGreaterThanOrEqual(15);
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
    vi.unstubAllGlobals();
  });
});
