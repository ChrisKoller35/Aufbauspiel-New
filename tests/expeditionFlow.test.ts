import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.ok(run);

  // Rooms 0..4 run straight through (room 2 is a checkpoint → resolve it)
  while (run.currentRoom < 5) {
    system.processCurrentRoom(state);
    if (system.nextStep(run) === 'checkpoint') system.resolveCheckpoint(run, false);
    if (system.nextStep(run) === 'choice') system.resolveChoice(run, 0);
  }

  assert.equal(run.rooms[5].type, 'combat');
  system.processCurrentRoom(state);
  assert.equal(run.status, 'exploring');
  assert.equal(system.nextStep(run), 'checkpoint', 'combat in room index 5 must lead to the checkpoint dialog');

  // Without resolving, processing the same room does nothing (the old dead end)
  assert.equal(system.processCurrentRoom(state), false);
  assert.equal(run.currentRoom, 5);

  system.resolveCheckpoint(run, false);
  assert.equal(run.currentRoom, 6);
  assert.equal(system.nextStep(run), 'room');
});

test('Punkt 2: laufende Expedition abbrechen gibt Proviant zurück und gibt Helden frei', () => {
  const { state, system, heroId } = setup();
  state.globalStock['healing_potion'] = 2;
  state.citizens.push({ id: 1, fighterId: heroId, status: 'IDLE' } as GameState['citizens'][number]);

  system.startExpedition(state, 'cave_deep', [heroId], 'normal', null, false, ['healing_potion', 'healing_potion']);
  assert.ok(state.activeExpedition);
  assert.equal(state.globalStock['healing_potion'], 0);
  assert.equal(state.citizens[0].status, 'ON_EXPEDITION');

  // Simulate reload: state round-trips through JSON like LocalStorage
  const reloaded: GameState = JSON.parse(JSON.stringify(state));
  assert.equal(system.abortExpedition(reloaded), true);
  assert.equal(reloaded.activeExpedition, null);
  assert.equal(reloaded.globalStock['healing_potion'], 2, 'only own provisions come back, not the gift');
  assert.equal(reloaded.globalStock['bread'] ?? 0, state.globalStock['bread'] ?? 0);
  assert.equal(reloaded.citizens[0].status, 'IDLE');

  // A new expedition can start again
  assert.ok(system.startExpedition(reloaded, 'cave_deep', [heroId]));
});

test('Punkt 3: Gratis-Proviant vermehrt sich nicht', () => {
  const { state, system, heroId } = setup();
  const before = { ...state.globalStock };
  const run = system.startExpedition(state, 'cave_deep', [heroId])!;
  system.retreat(run);
  system.returnProvisions(state, run);
  for (const id of ['healing_potion', 'bread', 'power_bread']) {
    assert.equal(state.globalStock[id] ?? 0, before[id] ?? 0, id);
  }
});
