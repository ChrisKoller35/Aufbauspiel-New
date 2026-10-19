import { test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { ROUTE_DEFS, isRouteAvailable } from '../src/data/routes';

/** State with one overpowered hero so every combat is won. */
function setup(): { state: GameState; system: ExpeditionSystem; heroId: number } {
  const state = createNewGameState();
  const hero = createGuildFighter(1, 'guardian', 'Testheld', {
    hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1,
  });
  state.fighters.push(hero);
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  return { state, system, heroId: hero.id };
}

/** Play a route to the end like main.ts continueExpedition (always continue, first option). */
function playRoute(state: GameState, system: ExpeditionSystem, routeId: string, heroId: number) {
  const run = system.startExpedition(state, routeId, [heroId])!;
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

test('gewonnene Kurz-Expedition: Helden bekommen XP, Bestenliste hat Punkte > 0', () => {
  const { state, system, heroId } = setup();
  const hero = state.fighters.find(f => f.id === heroId)!;
  const xpBefore = hero.xp;

  const run = playRoute(state, system, 'forest_short', heroId);
  expect(run.status).toBe('victory');

  const progress = finalizeExpeditionProgress(state, run, system);

  expect(hero.xp).toBeGreaterThan(xpBefore);
  expect(state.scoreboard).toHaveLength(1);
  expect(state.scoreboard[0].status).toBe('victory');
  expect(state.scoreboard[0].score).toBeGreaterThan(0);
  expect(progress.entry).toBe(state.scoreboard[0]);
  expect(state.guildStats.forestShortCompleted).toBe(1);
  expect(state.bestiarium.defeated.length).toBeGreaterThan(0);
  expect(state.achievements).toContain('first_victory');
});

test('drei Siege auf dem Waldpfad heben den Gildenrang und schalten Ebene 2 frei', () => {
  const { state, system, heroId } = setup();
  const forestMedium = ROUTE_DEFS['forest_medium'];
  expect(isRouteAvailable(forestMedium, state)).toBe(false);

  let rankUp = null;
  for (let i = 0; i < 3; i++) {
    const run = playRoute(state, system, 'forest_short', heroId);
    rankUp = finalizeExpeditionProgress(state, run, system).rankUp;
    state.activeExpedition = null;
  }

  expect(rankUp?.newRank).toBe(2);
  expect(state.guildStats.rank).toBe(2);
  expect(isRouteAvailable(forestMedium, state)).toBe(true);
});

test('Rückzug zählt nicht für den Gildenrang', () => {
  const { state, system, heroId } = setup();
  const run = system.startExpedition(state, 'forest_short', [heroId])!;
  system.retreat(run);
  const progress = finalizeExpeditionProgress(state, run, system);
  expect(progress.entry.status).toBe('retreat');
  expect(state.guildStats.forestShortCompleted).toBe(0);
  expect(state.statistics['total_retreats']).toBe(1);
});
