import { test, expect } from 'vitest';
import { createNewGameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { grundSchaden } from '../src/systems/Kampfeffekte';
import { CLASS_DEFS } from '../src/data/classes';
import { ExpeditionRun } from '../src/models/ExpeditionRun';

// Testteam auf Gildenrang-IV-Niveau, Werte inklusive Ausrüstung, ohne Weg.
const TEAM: { classId: string; hp: number; atk: number; def: number }[] = [
  { classId: 'paladin', hp: 105, atk: 9, def: 10 },
  { classId: 'berserker', hp: 107, atk: 14, def: 8 },
  { classId: 'druid', hp: 95, atk: 9, def: 7 },
  { classId: 'witch', hp: 80, atk: 15, def: 4 },
];

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Spielt eine Belagerungsroute mit Kanone wie main.ts continueExpedition (immer weiter, erste Option). */
function playRoute(routeId: string, seed: number, schwach = false): ExpeditionRun {
  const state = createNewGameState();
  const ids = TEAM.map((h, i) => {
    const klasse = CLASS_DEFS[h.classId].baseStats;
    const hp = schwach ? Math.floor(h.hp / 2) : h.hp;
    const atk = schwach ? Math.floor(h.atk / 2) : h.atk;
    const held = createGuildFighter(h.classId, `Held ${i + 1}`, {
      hp, maxHp: hp, atk, def: h.def,
      spd: klasse.spd, critChance: klasse.critChance, critMult: klasse.critMult,
    });
    state.fighters.push(held);
    return held.id;
  });
  state.globalStock.war_cannon = 1;
  state.rngSeed = seed;
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  const run = system.startExpedition(state, routeId, ids)!;
  expect(run).toBeTruthy();
  expect(run.warMachineUnit).toBeTruthy();
  for (let guard = 0; guard < 200; guard++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') system.resolveChoice(run, 0);
    else system.processCurrentRoom(state);
  }
  return run;
}

/**
 * Siege über alle Seeds. Ein Boss, der das Rundenlimit überlebt, lässt die Route
 * ebenfalls als 'victory' enden, darum zählt nur ein Lauf mit besiegtem Boss.
 */
function siege(routeId: string, schwach = false): number {
  return SEEDS
    .map(seed => playRoute(routeId, seed, schwach))
    .filter(r => r.status === 'victory' && r.bossesKilled > 0)
    .length;
}

test('grundSchaden: Mindestschaden 20 % des Angriffs', () => {
  expect(grundSchaden(14, 26)).toBe(3);
  expect(grundSchaden(10, 2)).toBe(9);
});

test('Stadtmauern: Gildenrang-IV-Team gewinnt in mindestens 8 von 10 Seeds', () => {
  expect(siege('siege_walls')).toBeGreaterThanOrEqual(8);
});

test('Festung: Gildenrang-IV-Team besiegt den Festungswächter in mindestens 6 von 10 Seeds', () => {
  expect(siege('siege_fortress')).toBeGreaterThanOrEqual(6);
});

test('Festung: schwaches Team (halbe Leben, halber Angriff) verliert in mindestens 8 von 10 Seeds', () => {
  expect(10 - siege('siege_fortress', true)).toBeGreaterThanOrEqual(8);
});
