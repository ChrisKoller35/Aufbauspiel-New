import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { SaveSystem } from '../src/systems/SaveSystem';
import { CLASS_DEFS } from '../src/data/classes';

const STARTKLASSEN = ['guardian', 'ranger', 'cleric'];

/** Drei Starthelden auf Stufe 1 ohne Ausrüstung, wie beim Anheuern. */
function starttrupp(): { state: GameState; system: ExpeditionSystem; heroIds: number[] } {
  const state = createNewGameState();
  const heroIds = STARTKLASSEN.map((classId, i) => {
    const hero = createGuildFighter(i + 1, classId, classId, CLASS_DEFS[classId].baseStats);
    state.fighters.push(hero);
    return hero.id;
  });
  return { state, system: new ExpeditionSystem(new GearSystem(), new ProvisionSystem()), heroIds };
}

/** Wie playRoute in expeditionProgress.test.ts, aber mit mehreren Helden. */
function playRoute(state: GameState, system: ExpeditionSystem, routeId: string, heroIds: number[]) {
  const run = system.startExpedition(state, routeId, heroIds)!;
  expect(run).toBeTruthy();
  for (let guard = 0; guard < 100; guard++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') system.resolveChoice(run, 0);
    else system.processCurrentRoom(state);
  }
  return run;
}

test('drei Starthelden auf Stufe 1 gewinnen die kurze Waldexpedition meistens', () => {
  let siege = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const { state, system, heroIds } = starttrupp();
    state.rngSeed = seed;
    if (playRoute(state, system, 'forest_short', heroIds).status === 'victory') siege++;
  }
  expect(siege).toBeGreaterThanOrEqual(8);
});

/** Minimaler localStorage für die Node-Testumgebung. */
function createMemoryStorage(): Storage {
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

describe('Spielstand-Anpassung 23', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  function alterStand() {
    const state = createNewGameState();
    state.saveVersion = 22;
    const waechter = createGuildFighter(1, 'guardian', 'Brom', {
      hp: 25, maxHp: 25, atk: 3, def: 2, spd: 0.8, critChance: 0.05, critMult: 1.5,
    });
    const waldlaeufer = createGuildFighter(2, 'ranger', 'Lia', {
      hp: 30, maxHp: 30, atk: 9, def: 2, spd: 1.2, critChance: 0.15, critMult: 2.0,
    });
    waldlaeufer.level = 12;
    waldlaeufer.xp = 4321;
    waldlaeufer.spezialisierung = 'weg_test';
    const berserker = createGuildFighter(3, 'berserker', 'Grimm', { ...CLASS_DEFS['berserker'].baseStats });
    state.fighters.push(waechter, waldlaeufer, berserker);
    return { state, waechter, waldlaeufer, berserker };
  }

  test('Starthelden bekommen den Unterschied genau einmal, andere bleiben', () => {
    const { state, waldlaeufer, berserker } = alterStand();
    localStorage.setItem('magic_city_save', JSON.stringify(state));
    const saveSystem = new SaveSystem();

    const einmal = saveSystem.load()!;
    saveSystem.save(einmal);
    const zweimal = saveSystem.load()!;

    for (const loaded of [einmal, zweimal]) {
      expect(loaded.saveVersion).toBe(23);
      const [w, r, b] = loaded.fighters;
      expect(w.baseStats).toMatchObject({ hp: 70, maxHp: 70, atk: 4, def: 3, spd: 0.8 });
      expect(r.baseStats).toMatchObject({ hp: 59, maxHp: 59, atk: 10, def: 2, spd: 1.2 });
      expect(r.spezialisierung).toBe('weg_test');
      expect(r.level).toBe(waldlaeufer.level);
      expect(r.xp).toBe(waldlaeufer.xp);
      expect(b.baseStats).toEqual(berserker.baseStats);
    }
  });

  test('eine laufende Expedition bleibt unverändert', () => {
    const { state, waechter } = alterStand();
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    system.startExpedition(state, 'forest_short', [waechter.id]);
    const vorher = JSON.parse(JSON.stringify(state.activeExpedition));
    localStorage.setItem('magic_city_save', JSON.stringify(state));

    const loaded = new SaveSystem().load()!;

    expect(loaded.activeExpedition).toEqual(vorher);
    expect(loaded.fighters[0].baseStats.maxHp).toBe(70);
  });
});
