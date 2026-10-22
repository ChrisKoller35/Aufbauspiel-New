import { test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { aufstiegStand, besiegteBosse } from '../src/systems/Stadtweg';

/** Stadtweg und echte Expeditionen: besiegte Bosse zählen für die Stadtstufe «Stadt». */
function spieleRoute(state: GameState, system: ExpeditionSystem, routeId: string, heldId: number) {
  const run = system.startExpedition(state, routeId, [heldId])!;
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

test('ein Boss aus einer gewonnenen Expedition zählt für die Stadtstufe', () => {
  const state = createNewGameState();
  const held = createGuildFighter('guardian', 'Testheld', {
    hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1,
  });
  state.fighters.push(held);
  state.stadtweg = { stufe: 4, herzsteine: [], gelesen: 4 };
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());

  const run = spieleRoute(state, system, 'forest_medium', held.id);
  expect(run.status).toBe('victory');
  finalizeExpeditionProgress(state, run, system);

  expect(besiegteBosse(state).has('boss_elder_treant')).toBe(true);
  const bossZeile = aufstiegStand(state)!.aufgaben.find(z => z.text.includes('Bosse'))!;
  expect(bossZeile.ist).toBe(1);
  expect(bossZeile.erledigt).toBe(false);
});
