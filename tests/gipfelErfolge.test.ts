// ─── Gipfel-Taten: echte Läufe durch die sechs obersten Dungeons ───
// Ein sehr starker Held spielt die Route; in den festen Wahl-Räumen nimmt er die vorgegebene
// Option, an Rastplätzen immer die erste. Gezählt wird beim Abschluss (finalizeExpeditionProgress).

import { describe, test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { ACHIEVEMENT_DEFS } from '../src/data/achievements';
import { ROUTE_DEFS } from '../src/data/routes';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { ersteOptionen, gipfelTatenZaehlen } from '../src/systems/GipfelTaten';

const STARK = { hp: 99999, maxHp: 99999, atk: 9999, def: 9999, spd: 99, critChance: 0, critMult: 1 };
const TATEN: Record<string, string> = {
  drachenhort: 'gipfel_hort', himmelsarchiv: 'gipfel_archiv', sternenschmiede: 'gipfel_esse',
  sternenschlund: 'gipfel_schlund', mondhof: 'gipfel_pfand', morgentor: 'gipfel_uhr',
};

function spielstand(): { state: GameState; held: number } {
  const state = createNewGameState();
  const held = createGuildFighter('guardian', 'Testheld', { ...STARK });
  state.fighters.push(held);
  return { state, held: held.id };
}

/** Ein Lauf bis zum Ende; wahlen gilt der Reihe nach für die festen Wahl-Räume */
function lauf(state: GameState, held: number, routeId: string, wahlen: (0 | 1)[], umkehren = false) {
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  const run = system.startExpedition(state, routeId, [held])!;
  expect(run, routeId).not.toBeNull();
  let feste = 0;
  for (let s = 0; s < 500 && run.status === 'exploring'; s++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, umkehren && run.currentRoom >= run.rooms.length - 2);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') {
      const fest = ROUTE_DEFS[routeId].encounters[run.pendingChoice!.roomIndex]?.wahl;
      system.resolveChoice(run, fest ? wahlen[feste++] : 0);
    } else system.processCurrentRoom(state);
  }
  expect(feste, routeId).toBe(3);
  const ergebnis = finalizeExpeditionProgress(state, run, system);
  state.activeExpedition = null;
  return { run, ergebnis };
}

const zeile = (id: string): string => {
  const def = ACHIEVEMENT_DEFS.find(d => d.id === id)!;
  return `${def.name} – ${def.description}`;
};

describe('Gipfel-Taten', () => {
  test.each(Object.entries(TATEN))('%s: dreimal die erste Option und den Boss besiegt', (routeId, id) => {
    const { state, held } = spielstand();
    const { run, ergebnis } = lauf(state, held, routeId, [0, 0, 0]);
    expect(run.status).toBe('victory');
    expect(ersteOptionen(run)).toBe(3);
    expect(state.achievements).toContain(id);
    expect(ergebnis.newAchievements).toContain(zeile(id));
    expect(state.achievements).not.toContain('gipfel_alle');
  });

  test('dreimal die zweite Option oder gemischt: keine Tat', () => {
    const { state, held } = spielstand();
    expect(ersteOptionen(lauf(state, held, 'drachenhort', [1, 1, 1]).run)).toBe(0);
    expect(ersteOptionen(lauf(state, held, 'mondhof', [0, 1, 0]).run)).toBe(2);
    expect(state.achievements.filter(a => a.startsWith('gipfel_') && a !== 'gipfel_1')).toEqual([]);
    expect(Object.keys(state.statistics).filter(k => k.startsWith('tat_'))).toEqual([]);
  });

  test('«Hat alles» erst nach der sechsten Tat, dieselbe Tat zweimal zählt einmal', () => {
    const { state, held } = spielstand();
    lauf(state, held, 'drachenhort', [0, 0, 0]);
    lauf(state, held, 'drachenhort', [0, 0, 0]);
    expect(state.statistics.tat_hort).toBe(1);
    const routen = Object.keys(TATEN).filter(r => r !== 'drachenhort');
    for (const [i, routeId] of routen.entries()) {
      const { ergebnis } = lauf(state, held, routeId, [0, 0, 0]);
      expect(state.achievements.includes('gipfel_alle'), routeId).toBe(i === routen.length - 1);
      if (i === routen.length - 1) expect(ergebnis.newAchievements).toContain(zeile('gipfel_alle'));
    }
  });

  test('«Kleingedrucktes»: Mondhof dreimal die erste Option, Rückzug am letzten Kontrollpunkt', () => {
    const { state, held } = spielstand();
    const { run, ergebnis } = lauf(state, held, 'mondhof', [0, 0, 0], true);
    expect(run.status).toBe('retreat');
    expect(state.achievements).toContain('gipfel_kleingedrucktes');
    expect(state.achievements).not.toContain('gipfel_pfand');
    expect(ergebnis.newAchievements).toContain(zeile('gipfel_kleingedrucktes'));
  });

  test('kein «Kleingedrucktes» mit einer zweiten Option oder am Morgentor', () => {
    const { state, held } = spielstand();
    expect(lauf(state, held, 'mondhof', [0, 0, 1], true).run.status).toBe('retreat');
    expect(lauf(state, held, 'morgentor', [0, 0, 0], true).run.status).toBe('retreat');
    expect(Object.keys(state.statistics).filter(k => k.startsWith('tat_'))).toEqual([]);
  });

  test('Rundenlimit: Sieg ohne toten Boss zählt nur als «Kleingedrucktes»', () => {
    const { state, held } = spielstand();
    const { run } = lauf(state, held, 'mondhof', [0, 0, 0]);
    expect(run.status).toBe('victory');
    const stats: Record<string, number> = {};
    gipfelTatenZaehlen(stats, { ...run, bossesKilled: 0 } as ExpeditionRun);
    expect(stats).toEqual({ tat_kleingedrucktes: 1 });
  });
});
