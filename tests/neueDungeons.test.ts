import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { ROUTE_DEFS, DUNGEON_GRAPH, isRouteAvailable, getRouteLockReasons } from '../src/data/routes';
import { ENEMY_DEFS, ENEMY_LORE } from '../src/data/enemies';
import { LOOT_TABLE_DEFS } from '../src/data/lootTables';
import { ITEM_DEFS } from '../src/data/items';
import { generateWeeklyChallenge } from '../src/data/weeklyChallenges';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { musterStand, siegeVon } from '../src/systems/Musterlauf';

const NEUE = Object.values(ROUTE_DEFS).filter(r => r.gebiet);
const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());

/** Spielt bis zur nächsten festen Wahl (Fund-Raum) und gibt den Lauf zurück. */
function bisZurWahl(state: GameState, run: ExpeditionRun): ExpeditionRun {
  for (let schritt = 0; schritt < 200; schritt++) {
    const step = system.nextStep(run);
    if (step === 'choice' && run.rooms[run.pendingChoice!.roomIndex].type === 'find') return run;
    if (step === 'finish') throw new Error(`Lauf zu Ende (${run.status}) ohne Wahl`);
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'choice') system.resolveChoice(run, 0);
    else system.processCurrentRoom(state);
  }
  throw new Error('keine Wahl gefunden');
}

/** Spielt den Lauf zu Ende: weiter an Kontrollpunkten, bei Wahl-Räumen Option B. */
function zuEnde(state: GameState, run: ExpeditionRun): ExpeditionRun {
  for (let schritt = 0; schritt < 300; schritt++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'choice') system.resolveChoice(run, 1);
    else system.processCurrentRoom(state);
  }
  return run;
}

/** Spielstand mit einem übermächtigen Helden, der jeden Kampf gewinnt. */
function uebermacht(): { state: GameState; held: number } {
  const state = createNewGameState();
  const held = createGuildFighter(1, 'guardian', 'Testheld', {
    hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1,
  });
  state.fighters.push(held);
  return { state, held: held.id };
}

function boss(run: ExpeditionRun) {
  return run.rooms[run.rooms.length - 1].enemies[0];
}

describe('Dungeons über dem Vulkankern', () => {
  it('der Weg führt vom Vulkankern zum Drachenhort und weiter hinauf zum Himmelsarchiv', () => {
    expect(NEUE.map(r => r.id)).toEqual(['drachenhort', 'himmelsarchiv']);
    const knoten = (id: string) => DUNGEON_GRAPH.find(n => n.routeId === id)!;
    expect(knoten('volcano_core').leadsTo).toContain('drachenhort');
    expect(knoten('drachenhort').leadsTo).toContain('himmelsarchiv');
    expect(knoten('drachenhort').y).toBeLessThan(0);
    expect(knoten('himmelsarchiv').y).toBeLessThan(knoten('drachenhort').y);
    // Jede Route steht auf der Karte und umgekehrt
    const aufKarte = new Set(DUNGEON_GRAPH.map(n => n.routeId));
    for (const route of Object.values(ROUTE_DEFS)) {
      expect(aufKarte.has(route.id), route.id).toBe(true);
    }
    for (const id of aufKarte) expect(ROUTE_DEFS[id], id).toBeTruthy();
  });

  it('Räume, Gegner, Beute und Wahl-Räume sind vollständig beschrieben', () => {
    for (const route of NEUE) {
      expect(route.rooms, route.id).toBe(route.encounters.length);
      expect(route.besonderheit, route.id).toBeTruthy();
      expect(route.encounters.at(-1)).toEqual({ type: 'boss', enemies: [route.bossId] });
      expect(ITEM_DEFS[route.ersterSiegBeute!], route.id).toBeTruthy();
      const gegner = new Set(route.encounters.flatMap(e => e.enemies ?? []));
      for (const id of gegner) {
        const def = ENEMY_DEFS[id];
        expect(def, id).toBeTruthy();
        expect(ENEMY_LORE[id]?.route, id).toBe(route.id);
        const tabelle = LOOT_TABLE_DEFS[def.lootTableId!];
        expect(tabelle, def.lootTableId!).toBeTruthy();
        for (const eintrag of tabelle.entries) {
          if (eintrag.itemId !== 'gold') expect(ITEM_DEFS[eintrag.itemId], eintrag.itemId).toBeTruthy();
        }
      }
      for (const enc of route.encounters.filter(e => e.wahl)) {
        expect(enc.type).toBe('find');
        for (const option of [enc.wahl!.a, enc.wahl!.b]) {
          if (option.itemId) expect(ITEM_DEFS[option.itemId], option.itemId).toBeTruthy();
          if (option.gier) expect(route.hortGier, route.id).toBeTruthy();
        }
      }
    }
  });

  it('Drachenhort braucht Gildenrang V und den Magmawyrm, das Himmelsarchiv dazu Ignarax', () => {
    const state = createNewGameState();
    const drachenhort = ROUTE_DEFS.drachenhort;
    const archiv = ROUTE_DEFS.himmelsarchiv;
    state.guildStats.rank = 4;
    expect(getRouteLockReasons(drachenhort, state)).toEqual([
      'Gildenrang 5 benötigt', `Besiege: ${ENEMY_DEFS.boss_magma_wyrm.name}`,
    ]);

    state.guildStats.rank = 5;
    state.guildStats.bossesDefeatedIds.push('boss_magma_wyrm');
    expect(isRouteAvailable(drachenhort, state)).toBe(true);
    // Ebene 6 verlangt den höchsten Rang, den es gibt (V), nicht einen Rang VI
    expect(getRouteLockReasons(archiv, state)).toEqual(['Besiege: Ignarax, der Uralte']);

    state.guildStats.bossesDefeatedIds.push('boss_ignarax');
    expect(isRouteAvailable(archiv, state)).toBe(true);
  });

  it('Hort-Gier: Gold aus dem Hort macht Ignarax um 8 % je Schatz stärker', () => {
    const { state, ids } = musterStand('stark', 7919);
    const run = bisZurWahl(state, system.startExpedition(state, 'drachenhort', ids)!);
    const start = { atk: boss(run).atk, maxHp: boss(run).maxHp, gold: run.goldEarned };
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'gold', value: 80, gier: 1 });

    system.resolveChoice(run, 0);
    expect(run.gier).toBe(1);
    expect(run.goldEarned).toBe(start.gold + 80);
    expect(boss(run).atk).toBe(Math.round(start.atk * 1.08));
    expect(boss(run).maxHp).toBe(Math.round(start.maxHp * 1.08));
    expect(boss(run).hp).toBe(boss(run).maxHp);
    expect(run.combatLog.at(-1)).toContain('Ignarax, der Uralte wittert den Diebstahl: +8% Angriff');

    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    expect(run.gier).toBe(2);
    expect(Math.abs(boss(run).atk - start.atk * 1.16)).toBeLessThanOrEqual(1);
    expect(Math.abs(boss(run).maxHp - start.maxHp * 1.16)).toBeLessThanOrEqual(1);
  });

  it('wer die Finger vom Hort lässt, heilt und Ignarax bleibt, wie er ist', () => {
    const { state, ids } = musterStand('stark', 7919);
    const run = bisZurWahl(state, system.startExpedition(state, 'drachenhort', ids)!);
    const vorher = { atk: boss(run).atk, maxHp: boss(run).maxHp };
    system.resolveChoice(run, 1);
    expect(run.gier ?? 0).toBe(0);
    expect(boss(run)).toMatchObject(vorher);
  });

  it('verbotene Bücher bringen Funde und kosten Leben, aber nie das letzte', () => {
    const { state, ids } = musterStand('stark', 7919);
    const run = bisZurWahl(state, system.startExpedition(state, 'himmelsarchiv', ids)!);
    const buch = run.pendingChoice!.optionA;
    expect(buch).toMatchObject({ effect: 'item', itemId: 'crystal_shard', value: 3, kostetLeben: 5 });
    run.party[0].hp = 2;
    const vorher = run.party.map(u => u.hp);
    const splitter = run.loot.crystal_shard ?? 0;

    system.resolveChoice(run, 0);
    expect(run.loot.crystal_shard).toBe(splitter + 3);
    run.party.forEach((u, i) => {
      expect(u.hp).toBe(Math.max(1, vorher[i] - Math.floor(u.maxHp * 0.05)));
    });
    expect(run.party[0].hp).toBe(1);
  });

  it('andere Fund-Räume wählen weiter zufällig zwischen Truhe und zweiter Option', () => {
    const { state, held } = uebermacht();
    const run = system.startExpedition(state, 'swamp_long', [held])!;
    const fund = run.rooms.find(r => r.type === 'find');
    expect(fund).toBeTruthy();
    bisZurWahl(state, run);
    expect(run.pendingChoice!.optionA.label).toMatch(/^Truhe öffnen/);
  });

  it('der erste Sieg über Ignarax bringt den Schild des Uralten, der zweite nicht mehr', () => {
    const { state, held } = uebermacht();
    const erster = zuEnde(state, system.startExpedition(state, 'drachenhort', [held])!);
    expect(erster.status).toBe('victory');
    expect(erster.loot.shield_of_the_ancient).toBeGreaterThanOrEqual(1);
    expect(erster.combatLog).toContain('>> Erster Sieg über Ignarax, der Uralte: Schild des Uralten gehört euch!');
    finalizeExpeditionProgress(state, erster, system);
    state.activeExpedition = null;
    expect(state.guildStats.bossesDefeatedIds).toContain('boss_ignarax');

    const zweiter = zuEnde(state, system.startExpedition(state, 'drachenhort', [held])!);
    expect(zweiter.status).toBe('victory');
    expect(zweiter.combatLog.some(z => z.includes('Erster Sieg'))).toBe(false);
  });

  it('nach dem Boss im letzten Raum kommt kein Kontrollpunkt mehr, der Sieg zählt sofort', () => {
    // Drachenhort (15 Räume) und Tiefe Ruinen (12) haben den Boss auf einem 3. Raum
    for (const routeId of ['drachenhort', 'ruins_depths']) {
      const { state, held } = uebermacht();
      const run = system.startExpedition(state, routeId, [held])!;
      for (let schritt = 0; schritt < 300 && run.currentRoom < run.rooms.length - 1; schritt++) {
        const step = system.nextStep(run);
        if (step === 'checkpoint') system.resolveCheckpoint(run, false);
        else if (step === 'choice') system.resolveChoice(run, 1);
        else system.processCurrentRoom(state);
      }
      expect(run.rooms[run.currentRoom].type).toBe('boss');
      system.processCurrentRoom(state);
      expect(run.pendingCheckpoint, routeId).toBeFalsy();
      expect(run.status, routeId).toBe('victory');
    }
  });

  it('nie in den Wochen-Herausforderungen', () => {
    const tag = new Date(Date.UTC(2026, 0, 5));
    for (let woche = 0; woche < 260; woche++) {
      const datum = new Date(tag.getTime() + woche * 7 * 86400000);
      expect(ROUTE_DEFS[generateWeeklyChallenge(datum).routeId].tier).toBeLessThanOrEqual(4);
    }
  });

  // Grobe Eichung, die auch nach Änderungen an der Schadensformel gilt.
  // Die genauen Werte misst `npm run dungeon-eichung` (docs/NEUE-DUNGEONS.md).
  it('Eichung grob: der Drachenhort ist für starke Teams machbar, das Himmelsarchiv schwerer, Gier kostet Siege', () => {
    const drachenhortStark = siegeVon('drachenhort', 'stark', 'vorsichtig', 10);
    expect(drachenhortStark).toBeGreaterThanOrEqual(8);
    expect(siegeVon('drachenhort', 'frisch', 'vorsichtig', 10)).toBeLessThanOrEqual(2);
    expect(siegeVon('himmelsarchiv', 'stark', 'vorsichtig', 10)).toBeLessThan(drachenhortStark);
    expect(siegeVon('drachenhort', 'gut', 'gierig', 10)).toBeLessThan(siegeVon('drachenhort', 'gut', 'vorsichtig', 10));
  });
});
