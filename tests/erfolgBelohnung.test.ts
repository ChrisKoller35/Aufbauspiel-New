// ─── Erfolge zahlen aus: Kristallsplitter je Erfolg ────────────
// Stufen aus erfolgBelohnung, einmalige Auszahlung über die gezahlte Summe (statistics.erfolg_splitter),
// Nachzahlung für ältere Stände, echte Läufe und der Erfolge-Bildschirm; dazu «Goldhamster» mit allem Gold.

import { describe, test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { ACHIEVEMENT_DEFS, erfolgBelohnung } from '../src/data/achievements';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { ERFOLG_SPLITTER, belohnungAuszahlen, erfolgePruefen, verdienteSplitter } from '../src/systems/AchievementSystem';
import { inhaltHtml } from '../src/ui/screens/AchievementsScreen';

const STARK = { hp: 99999, maxHp: 99999, atk: 9999, def: 9999, spd: 99, critChance: 0, critMult: 1 };
const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
const lohn = (id: string): number => erfolgBelohnung(ACHIEVEMENT_DEFS.find(d => d.id === id)!);

function mitHeld(): GameState {
  const state = createNewGameState();
  state.fighters = [createGuildFighter('guardian', 'Held', STARK)];
  return state;
}

/** Ein Lauf bis zum Ende (erste Option, Händler übergehen) */
function lauf(state: GameState, routeId: string): ExpeditionRun {
  const run = system.startExpedition(state, routeId, [state.fighters[0].id])!;
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

describe('Belohnung je Erfolg', () => {
  test('Stufen 1/3/6/12/2 mit 10/29/19/1/7 Erfolgen, zusammen 237; alle versteckten 2', () => {
    expect(ACHIEVEMENT_DEFS).toHaveLength(66);
    const stufen: Record<number, number> = {};
    for (const d of ACHIEVEMENT_DEFS) stufen[erfolgBelohnung(d)] = (stufen[erfolgBelohnung(d)] ?? 0) + 1;
    expect(stufen).toEqual({ 1: 10, 3: 29, 6: 19, 12: 1, 2: 7 });
    expect(ACHIEVEMENT_DEFS.reduce((s, d) => s + erfolgBelohnung(d), 0)).toBe(237);
    for (const d of ACHIEVEMENT_DEFS.filter(d => d.versteckt)) expect(erfolgBelohnung(d)).toBe(2);
    expect(lohn('gipfel_alle')).toBe(12);
    expect(lohn('gipfel_hort')).toBe(6);
    expect(lohn('gipfel_kleingedrucktes')).toBe(3);
    expect(lohn('gipfel_einsturz')).toBe(3);
    expect(lohn('haendler_1')).toBe(1);
    expect(lohn('monsterbuch_50')).toBe(6);
    expect(lohn('monsterbuch_25')).toBe(3);
  });

  test('ein neuer Erfolg zahlt genau einmal, ein zweites erfolgePruefen zahlt nichts', () => {
    const state = createNewGameState();
    state.statistics.total_buildings_built = 1;
    const vorher = state.globalStock.crystal_shard ?? 0;
    expect(erfolgePruefen(state)).toContain('first_building');
    const verdient = verdienteSplitter(state);
    expect(verdient).toBeGreaterThanOrEqual(1);
    expect(state.globalStock.crystal_shard).toBe(vorher + verdient);
    expect(state.statistics[ERFOLG_SPLITTER]).toBe(verdient);
    expect(erfolgePruefen(state)).toEqual([]);
    expect(state.globalStock.crystal_shard).toBe(vorher + verdient);
    expect(belohnungAuszahlen(state)).toBe(0);
  });

  test('älterer Stand ohne erfolg_splitter: Nachzahlung 21 einmal, danach 0', () => {
    const state = createNewGameState();
    const versteckt = ACHIEVEMENT_DEFS.find(d => d.versteckt)!.id;
    // wohnviertel_6 gibt es nicht mehr: zählt nicht
    state.achievements = ['first_building', 'bosse_25', 'gipfel_alle', versteckt, 'wohnviertel_6'];
    delete state.statistics[ERFOLG_SPLITTER];
    const vorher = state.globalStock.crystal_shard ?? 0;
    expect(belohnungAuszahlen(state)).toBe(1 + 6 + 12 + 2);
    expect(state.globalStock.crystal_shard).toBe(vorher + 21);
    expect(belohnungAuszahlen(state)).toBe(0);
    expect(state.globalStock.crystal_shard).toBe(vorher + 21);
  });

  test('echter Lauf forest_medium: das Lager wächst um verdienteSplitter', () => {
    const state = mitHeld();
    const vorher = state.globalStock.crystal_shard ?? 0;
    const run = lauf(state, 'forest_medium');
    expect(run.status).toBe('victory');
    const progress = finalizeExpeditionProgress(state, run, system);
    expect(progress.newAchievements.length).toBeGreaterThan(0);
    expect(verdienteSplitter(state)).toBeGreaterThan(0);
    expect(state.globalStock.crystal_shard).toBe(vorher + verdienteSplitter(state));
    expect(state.statistics[ERFOLG_SPLITTER]).toBe(verdienteSplitter(state));
  });

  test('«Goldhamster» in ruins_crypts zählt goldEarned und loot.gold', () => {
    const state = mitHeld();
    let mitBeutegold = 0;
    for (let i = 0; i < 40 && mitBeutegold < 1; i++) {
      const vorher = state.statistics.total_gold_earned ?? 0;
      const run = lauf(state, 'ruins_crypts');
      finalizeExpeditionProgress(state, run, system);
      expect(state.statistics.total_gold_earned).toBe(vorher + run.goldEarned + (run.loot.gold ?? 0));
      if ((run.loot.gold ?? 0) > 0) mitBeutegold++;
      state.activeExpedition = null;
    }
    expect(mitBeutegold).toBeGreaterThan(0);
  });
});

describe('Erfolge-Bildschirm zeigt die Belohnung', () => {
  test('Kopf, freigeschaltete Karte und 59 Belohnungszeilen (gesperrte versteckte ohne)', () => {
    const state = createNewGameState();
    state.statistics.total_buildings_built = 1;
    erfolgePruefen(state);
    expect(state.achievements).toEqual(['first_building']);
    const html = inhaltHtml(state, []);
    expect(html).toContain('💎 1 Kristallsplitter erhalten');
    expect(html).toContain('<div class="ach-lohn ach-lohn-da">💎 1 erhalten</div>');
    expect(html.match(/class="ach-lohn[ "]/g)).toHaveLength(59);
    expect(html.match(/ach-lohn-da/g)).toHaveLength(1);
    expect(html).toContain('<div class="ach-lohn">💎 12</div>');
  });
});
