import { test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { CLASS_DEFS } from '../src/data/classes';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { anheuerKosten } from '../src/systems/Empfehlung';

const STARTKLASSEN = ['guardian', 'ranger', 'cleric'];

/** Drei Starthelden auf Stufe 1 ohne Ausrüstung, wie beim Anheuern. */
function starttrupp(): { state: GameState; system: ExpeditionSystem; heroIds: number[] } {
  const state = createNewGameState();
  const heroIds = STARTKLASSEN.map((classId, i) => {
    const hero = createGuildFighter(classId, classId, CLASS_DEFS[classId].baseStats);
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

test('ein neues Spiel beginnt mit einem Guardian wie beim Anheuern; der zweite Held kostet 50, der dritte 80', () => {
  const state = createNewGameState();
  placeStartingLayout(state);
  expect(state.fighters).toHaveLength(1);
  const held = state.fighters[0];
  expect(held).toMatchObject({ classId: 'guardian', name: CLASS_DEFS.guardian.name, level: 1, xp: 0, baseStats: CLASS_DEFS.guardian.baseStats });
  expect(Object.values(held.gear).every(slot => slot === null)).toBe(true);
  expect(anheuerKosten(state.fighters.length)).toBe(50);
  expect(anheuerKosten(2)).toBe(80);
  // Ein zweiter Aufruf legt keinen zweiten Guardian an
  placeStartingLayout(state);
  expect(state.fighters).toHaveLength(1);
});
