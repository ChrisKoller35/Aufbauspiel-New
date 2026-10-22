import { test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { CLASS_DEFS } from '../src/data/classes';

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
