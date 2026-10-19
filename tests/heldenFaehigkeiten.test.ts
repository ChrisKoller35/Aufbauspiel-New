import { test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { HERZSTEINE } from '../src/data/stadtstufen';

const STARK = { hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1 };

/** Treppe ab Stockwerk 1 (mehrere Gegner pro Raum) mit den gewünschten Helden. */
function lauf(helden: { klasse: string; atk?: number }[]): {
  state: GameState; system: ExpeditionSystem; fighters: GuildFighter[];
} {
  const state = createNewGameState();
  state.stadtweg = { stufe: 7, herzsteine: HERZSTEINE.map(h => h.id), gelesen: 7 };
  const fighters = helden.map((h, i) =>
    createGuildFighter(i + 1, h.klasse, `Held ${i + 1}`, { ...STARK, atk: h.atk ?? STARK.atk }));
  state.fighters.push(...fighters);
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  expect(system.startTreppe(state, fighters.map(f => f.id), 1)).toBeTruthy();
  return { state, system, fighters };
}

test('Pfeilhagel trifft alle Gegner, Präzisionsschuss nur einen', () => {
  const { state, system, fighters } = lauf([{ klasse: 'ranger', atk: 40 }]);
  const run = state.activeExpedition!;
  const room = run.rooms[0];
  expect(room.enemies.length).toBeGreaterThanOrEqual(2);

  const text = system.useAbilityInPreview(run, fighters[0].id, 'volley', room);
  expect(text).toContain('Alle Gegner');
  for (const e of room.enemies) expect(e.hp, e.name).toBeLessThan(e.maxHp);

  // Ein Einzelziel-Schaden bleibt beim ersten lebenden Gegner
  for (const e of room.enemies) e.hp = e.maxHp;
  run.abilitiesUsed = {};
  system.useAbilityInPreview(run, fighters[0].id, 'precise_shot', room);
  expect(room.enemies.filter(e => e.hp < e.maxHp).length).toBe(1);
});

test('Göttlicher Schutz zieht die Angriffe auf den Paladin, nicht auf einen Guardian', () => {
  const { state, system, fighters } = lauf([{ klasse: 'guardian', atk: 1 }, { klasse: 'paladin', atk: 1 }]);
  const run = state.activeExpedition!;
  const [guardian, paladin] = run.party;
  // Die Gruppe kann nicht gewinnen, der Kampf läuft bis zur Rundengrenze
  const text = system.useAbilityInPreview(run, fighters[1].id, 'divine_guard', run.rooms[0]);
  expect(text).toContain(`zielen auf ${paladin.name}`);
  expect(run.tauntUnitId).toBe(paladin.id);

  system.processCurrentRoom(state);
  expect(paladin.hp).toBeLessThan(paladin.maxHp);
  expect(guardian.hp).toBe(guardian.maxHp);
  // Nach dem Kampf ist der Spott vorbei
  expect(run.guardianTauntActive).toBe(false);
  expect(run.tauntUnitId).toBeUndefined();
});

test('Spott des Guardians wirkt weiter, auch bei alten Spielständen ohne Spötter', () => {
  const { state, system, fighters } = lauf([{ klasse: 'guardian', atk: 1 }, { klasse: 'ranger', atk: 1 }]);
  const run = state.activeExpedition!;
  const [guardian, ranger] = run.party;
  system.useAbilityInPreview(run, fighters[0].id, 'taunt', run.rooms[0]);
  expect(run.tauntUnitId).toBe(guardian.id);
  // Alter Spielstand: nur der Schalter ist gesetzt
  delete run.tauntUnitId;

  system.processCurrentRoom(state);
  expect(guardian.hp).toBeLessThan(guardian.maxHp);
  expect(ranger.hp).toBe(ranger.maxHp);
});
