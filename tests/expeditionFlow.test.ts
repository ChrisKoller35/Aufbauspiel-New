import { test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';

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

test('Punkt 1: nach Kampf in Raum 6 (cave_deep) wird der Kontrollpunkt verlangt', () => {
  const { state, system, heroId } = setup();
  const run = system.startExpedition(state, 'cave_deep', [heroId])!;
  expect(run).toBeTruthy();

  // Rooms 0..4 run straight through (room 2 is a checkpoint → resolve it)
  while (run.currentRoom < 5) {
    system.processCurrentRoom(state);
    if (system.nextStep(run) === 'checkpoint') system.resolveCheckpoint(run, false);
    if (system.nextStep(run) === 'choice') system.resolveChoice(run, 0);
  }

  expect(run.rooms[5].type).toBe('combat');
  system.processCurrentRoom(state);
  expect(run.status).toBe('exploring');
  expect(system.nextStep(run)).toBe('checkpoint');

  // Without resolving, processing the same room does nothing (the old dead end)
  expect(system.processCurrentRoom(state)).toBe(false);
  expect(run.currentRoom).toBe(5);

  system.resolveCheckpoint(run, false);
  expect(run.currentRoom).toBe(6);
  expect(system.nextStep(run)).toBe('room');
});

test('Punkt 2: laufende Expedition abbrechen gibt Proviant zurück und gibt Helden frei', () => {
  const { state, system, heroId } = setup();
  state.globalStock['healing_potion'] = 2;
  state.citizens.push({ id: 1, fighterId: heroId, status: 'IDLE' } as GameState['citizens'][number]);

  system.startExpedition(state, 'cave_deep', [heroId], 'normal', null, false, ['healing_potion', 'healing_potion']);
  expect(state.activeExpedition).toBeTruthy();
  expect(state.globalStock['healing_potion']).toBe(0);
  expect(state.citizens[0].status).toBe('ON_EXPEDITION');

  // Simulate reload: state round-trips through JSON like LocalStorage
  const reloaded: GameState = JSON.parse(JSON.stringify(state));
  expect(system.abortExpedition(reloaded)).toBe(true);
  expect(reloaded.activeExpedition).toBe(null);
  expect(reloaded.globalStock['healing_potion']).toBe(2);
  expect(reloaded.globalStock['bread'] ?? 0).toBe(state.globalStock['bread'] ?? 0);
  expect(reloaded.citizens[0].status).toBe('IDLE');

  // A new expedition can start again
  expect(system.startExpedition(reloaded, 'cave_deep', [heroId])).toBeTruthy();
});

test('Punkt 3: Gratis-Proviant vermehrt sich nicht', () => {
  const { state, system, heroId } = setup();
  const before = { ...state.globalStock };
  const run = system.startExpedition(state, 'cave_deep', [heroId])!;
  system.retreat(run);
  system.returnProvisions(state, run);
  for (const id of ['healing_potion', 'bread', 'power_bread']) {
    expect(state.globalStock[id] ?? 0).toBe(before[id] ?? 0);
  }
});
