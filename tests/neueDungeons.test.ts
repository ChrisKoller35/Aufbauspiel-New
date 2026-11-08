import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun, alleStehen, dungeonBezwungen, einHeldGefallen } from '../src/models/ExpeditionRun';
import { ROUTE_DEFS, DUNGEON_GRAPH, isRouteAvailable, getRouteLockReasons } from '../src/data/routes';
import { CombatEngine, wutAbRunde } from '../src/systems/CombatEngine';
import { SeededRNG } from '../src/utils/RNG';
import { ENEMY_DEFS, ENEMY_LORE } from '../src/data/enemies';
import { LOOT_TABLE_DEFS } from '../src/data/lootTables';
import { ITEM_DEFS } from '../src/data/items';
import { generateWeeklyChallenge } from '../src/data/weeklyChallenges';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { setBeute } from '../src/systems/DungeonSets';
import { setVonItem } from '../src/data/dungeonSets';
import { MusterSetName, messeLaeufe, musterStand, siegeVon, spieleRoute } from '../src/systems/Musterlauf';
import { namensZeilen } from '../src/ui/screens/DungeonMapScreen';

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
  const held = createGuildFighter('guardian', 'Testheld', {
    hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1,
  });
  state.fighters.push(held);
  return { state, held: held.id };
}

function boss(run: ExpeditionRun) {
  return run.rooms[run.rooms.length - 1].enemies[0];
}

describe('Dungeons über dem Vulkankern', () => {
  it('der Weg führt vom Vulkankern über Drachenhort und Himmelsarchiv zwischen die Sterne, in den Mondhof, ans Morgentor und ins Taglicht', () => {
    expect(NEUE.map(r => r.id)).toEqual([
      'drachenhort', 'himmelsarchiv', 'sternenschmiede', 'sternenschlund', 'mondhof', 'morgentor', 'erste_stadt', 'tagespfeiler', 'nichts_da_oben',
    ]);
    const knoten = (id: string) => DUNGEON_GRAPH.find(n => n.routeId === id)!;
    expect(knoten('volcano_core').leadsTo).toContain('drachenhort');
    expect(knoten('drachenhort').y).toBeLessThan(0);
    // Jeder führt zum nächsten, eine Ebene höher und weiter oben auf der Karte
    for (let i = 1; i < NEUE.length; i++) {
      const [unten, oben] = [NEUE[i - 1], NEUE[i]];
      expect(knoten(unten.id).leadsTo, unten.id).toContain(oben.id);
      expect(knoten(oben.id).y, oben.id).toBeLessThan(knoten(unten.id).y);
      expect(oben.tier, oben.id).toBe(unten.tier + 1);
    }
    // Jede Route steht auf der Karte und umgekehrt
    const aufKarte = new Set(DUNGEON_GRAPH.map(n => n.routeId));
    for (const route of Object.values(ROUTE_DEFS)) {
      expect(aufKarte.has(route.id), route.id).toBe(true);
    }
    for (const id of aufKarte) expect(ROUTE_DEFS[id], id).toBeTruthy();
  });

  it('jede Route zeigt so viele Räume, wie sie hat (Karte und Expeditionsliste lesen `rooms`)', () => {
    for (const route of Object.values(ROUTE_DEFS)) expect(route.rooms, route.id).toBe(route.encounters.length);
  });

  it('auf der Karte steht jeder Name ganz, ein langer in zwei Zeilen statt abgeschnitten', () => {
    expect(namensZeilen('Die Pfeiler des Tages')).toEqual(['Die Pfeiler', 'des Tages']);
    expect(namensZeilen('Die Erste Stadt')).toEqual(['Die Erste Stadt']);
    for (const route of Object.values(ROUTE_DEFS)) {
      const zeilen = namensZeilen(route.name);
      expect(zeilen.join(' '), route.id).toBe(route.name);
      for (const zeile of zeilen) expect(zeile.length, route.id).toBeLessThanOrEqual(20);
    }
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

  it('die Sternenschmiede braucht den Oberarchivar, der Sternenschlund Korrund', () => {
    const state = createNewGameState();
    state.guildStats.rank = 5;
    state.guildStats.bossesDefeatedIds.push('boss_magma_wyrm', 'boss_ignarax');
    expect(getRouteLockReasons(ROUTE_DEFS.sternenschmiede, state)).toEqual(['Besiege: Der Oberarchivar']);

    state.guildStats.bossesDefeatedIds.push('boss_oberarchivar');
    expect(isRouteAvailable(ROUTE_DEFS.sternenschmiede, state)).toBe(true);
    expect(getRouteLockReasons(ROUTE_DEFS.sternenschlund, state)).toEqual(['Besiege: Korrund, der Sternenschmied']);

    state.guildStats.bossesDefeatedIds.push('boss_korrund');
    expect(isRouteAvailable(ROUTE_DEFS.sternenschlund, state)).toBe(true);
    expect(getRouteLockReasons(ROUTE_DEFS.mondhof, state)).toEqual(['Besiege: Nyxar, der Sternenfresser']);

    state.guildStats.bossesDefeatedIds.push('boss_nyxar');
    expect(isRouteAvailable(ROUTE_DEFS.mondhof, state)).toBe(true);
    expect(getRouteLockReasons(ROUTE_DEFS.morgentor, state)).toEqual(['Besiege: Argentis, der Mondvogt']);

    state.guildStats.bossesDefeatedIds.push('boss_argentis');
    expect(isRouteAvailable(ROUTE_DEFS.morgentor, state)).toBe(true);
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
    expect(run.combatLog.at(-1)).toContain('>> Ignarax wittert den Diebstahl: +8% Angriff');

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

  it('Sternenfeuer: die ganze Gruppe schlägt bis zum Ende härter zu, die Hitze kostet 5 % Leben', () => {
    const { state, ids } = musterStand('stark', 7919, 'sterne5');
    const run = bisZurWahl(state, system.startExpedition(state, 'sternenschmiede', ids)!);
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'angriff', value: 10, kostetLeben: 5 });
    const start = run.party.map(u => ({ atk: u.atk, hp: u.hp }));

    system.resolveChoice(run, 0);
    expect(run.gruppenAngriff).toBe(10);
    run.party.forEach((u, i) => {
      expect(u.atk, u.name).toBe(Math.round(start[i].atk * 110 / 100));
      expect(u.hp, u.name).toBe(Math.max(1, start[i].hp - Math.floor(u.maxHp * 0.05)));
    });
    expect(run.combatLog).toContain('>> Waffen ins Sternenfeuer halten (+10% Angriff bis zum Ende, −5% HP): Die Gruppe hat jetzt 10% mehr Angriff bis zum Ende des Dungeons.');

    // Das zweite Mal zählt dazu, gerechnet auf den Angriff vor dem ersten Mal
    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    expect(run.gruppenAngriff).toBe(20);
    run.party.forEach((u, i) => expect(Math.abs(u.atk - start[i].atk * 1.2), u.name).toBeLessThanOrEqual(1));
  });

  it('Sternenfeuer macht nur den eigenen Angriff stärker, nicht bleibende Boni aus Kämpfen', () => {
    const { state, ids } = musterStand('stark', 7919, 'sterne3');
    const run = bisZurWahl(state, system.startExpedition(state, 'sternenschmiede', ids)!);
    const grimm = run.party.find(u => u.name === 'Grimm')!;
    const eigener = grimm.atk;
    // Drachengier: +10 Angriff für das Gold im Gepäck, bleibt bis zum Ende der Expedition
    grimm.effektBoni = { 'drachengier:atk': 10 };
    grimm.atk += 10;
    system.resolveChoice(run, 0);
    expect(grimm.atk).toBe(Math.round(eigener * 110 / 100) + 10);
  });

  it('wer am Kühltrog verschnauft, heilt, und der Angriff bleibt, wie er ist', () => {
    const { state, ids } = musterStand('stark', 7919, 'sterne3');
    const run = bisZurWahl(state, system.startExpedition(state, 'sternenschmiede', ids)!);
    const atk = run.party.map(u => u.atk);
    system.resolveChoice(run, 1);
    expect(run.gruppenAngriff ?? 0).toBe(0);
    expect(run.party.map(u => u.atk)).toEqual(atk);
  });

  it('befreite Sterne schwächen Nyxar um 10 % je Stern und kosten 5 % Leben', () => {
    const { state, ids } = musterStand('stark', 7919, 'sterne5');
    const run = bisZurWahl(state, system.startExpedition(state, 'sternenschlund', ids)!);
    expect(run.pendingChoice!.optionB).toMatchObject({ effect: 'kein', gier: -1, kostetLeben: 5 });
    const start = { atk: boss(run).atk, maxHp: boss(run).maxHp };
    const leben = run.party.map(u => u.hp);

    system.resolveChoice(run, 1);
    expect(run.gier).toBe(-1);
    expect(boss(run).atk).toBe(Math.round(start.atk * 0.9));
    expect(boss(run).maxHp).toBe(Math.round(start.maxHp * 0.9));
    expect(boss(run).hp).toBe(boss(run).maxHp);
    run.party.forEach((u, i) => expect(u.hp, u.name).toBe(Math.max(1, leben[i] - Math.floor(u.maxHp * 0.05))));
    expect(run.combatLog).toContain('>> Nyxar wird schwächer: −10% Angriff, −10% Leben.');

    bisZurWahl(state, run);
    system.resolveChoice(run, 1);
    expect(run.gier).toBe(-2);
    expect(Math.abs(boss(run).atk - start.atk * 0.8)).toBeLessThanOrEqual(1);
    expect(Math.abs(boss(run).maxHp - start.maxHp * 0.8)).toBeLessThanOrEqual(1);
  });

  it('wer die Sterne ausschlachtet, bekommt den Sternenstahl erst mit dem Sieg über Nyxar, und Nyxar bleibt, wie er ist', () => {
    const { state, held } = uebermacht();
    const run = bisZurWahl(state, system.startExpedition(state, 'sternenschlund', [held])!);
    const vorher = { atk: boss(run).atk, maxHp: boss(run).maxHp };
    const stahl = (): number => run.loot.mat_sternenstahl ?? 0;
    const ohneWahl = stahl();
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'item', itemId: 'mat_sternenstahl', value: 3, nachSieg: true });
    system.resolveChoice(run, 0);
    expect(stahl()).toBe(ohneWahl);
    expect(run.combatLog).toContain('>> Sternenstahl herausschlagen (+3 Sternenstahl, wenn ihr siegt): 3× Sternenstahl kommen mit, wenn Nyxar fällt.');
    expect(run.gier ?? 0).toBe(0);
    expect(boss(run)).toMatchObject(vorher);

    // Zweiter und dritter Stern ebenfalls ausschlachten: alles wartet zusammen auf Nyxar
    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    expect(run.geschichtsBeute).toEqual([{ raum: run.rooms.length - 1, gold: 0, dinge: { mat_sternenstahl: 12 } }]);
    const vorDemBoss = stahl();

    zuEnde(state, run);
    expect(run.bossesKilled).toBe(1);
    expect(stahl()).toBe(vorDemBoss + 12);
    expect(run.combatLog).toContain('📜 Beute aus der Geschichte: +12× Sternenstahl');
    expect(run.geschichtsBeute ?? []).toEqual([]);
  });

  it('wer nach dem Ausschlachten umkehrt, lässt den Sternenstahl liegen', () => {
    const { state, held } = uebermacht();
    const run = bisZurWahl(state, system.startExpedition(state, 'sternenschlund', [held])!);
    const ohneWahl = run.loot.mat_sternenstahl ?? 0;
    system.resolveChoice(run, 0);
    for (let schritt = 0; schritt < 50 && run.status === 'exploring'; schritt++) {
      const step = system.nextStep(run);
      if (step === 'checkpoint') system.resolveCheckpoint(run, true);
      else if (step !== 'finish') system.processCurrentRoom(state);
    }
    expect(run.status).toBe('retreat');
    expect(run.loot.mat_sternenstahl ?? 0).toBe(ohneWahl);
  });

  it('Pfandzettel: wer verpfändet, schlägt bis zum Ende 8 % schwächer zu, und das Mondsilber kommt erst mit Argentis', () => {
    const { state, ids } = musterStand('stark', 7919, 'mond5');
    const run = bisZurWahl(state, system.startExpedition(state, 'mondhof', ids)!);
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'item', itemId: 'mat_mondsilber', value: 5, nachSieg: true, kostetAngriff: 8 });
    expect(run.pendingChoice!.optionB).toMatchObject({ effect: 'item', itemId: 'mat_mondsilber', value: 1 });
    const start = run.party.map(u => ({ atk: u.atk, hp: u.hp }));
    const boss = run.rooms.length - 1;

    system.resolveChoice(run, 0);
    expect(run.gruppenAngriff).toBe(-8);
    run.party.forEach((u, i) => {
      expect(u.atk, u.name).toBe(Math.round(start[i].atk * 92 / 100));
      expect(u.hp, u.name).toBe(start[i].hp);
    });
    expect(run.loot.mat_mondsilber ?? 0).toBe(0);
    expect(run.geschichtsBeute).toEqual([{ raum: boss, gold: 0, dinge: { mat_mondsilber: 5 } }]);
    expect(run.combatLog).toContain('>> Das hat seinen Preis: Die Gruppe schlägt jetzt bis zum Ende des Dungeons 8% schwächer zu.');

    // Das Pfandbuch (Raum 8) verspricht ein Set-Teil, wieder gegen 8 % Angriff, gerechnet auf den Angriff vor dem ersten Mal
    bisZurWahl(state, run);
    expect(run.pendingChoice!.roomIndex).toBe(8);
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'kein', setTeil: true, kostetAngriff: 8 });
    system.resolveChoice(run, 0);
    expect(run.setTeilVersprochen).toBe(true);
    expect(run.gruppenAngriff).toBe(-16);
    run.party.forEach((u, i) => expect(Math.abs(u.atk - start[i].atk * 0.84), u.name).toBeLessThanOrEqual(1));
    expect(run.combatLog).toContain('>> Das Pfandbuch unterschreiben (+1 Set-Teil, wenn ihr siegt, −8% Angriff bis zum Ende): 🌙 +1 Set-Teil, wenn ihr siegt.');
    expect(run.combatLog).toContain('>> Das hat seinen Preis: Die Gruppe schlägt jetzt bis zum Ende des Dungeons 16% schwächer zu.');

    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    expect(run.gruppenAngriff).toBe(-24);
    expect(run.geschichtsBeute).toEqual([{ raum: boss, gold: 0, dinge: { mat_mondsilber: 14 } }]);
    // Argentis bleibt, wie er ist: keine Hort-Gier im Mondhof
    expect(run.gier ?? 0).toBe(0);
    expect(ROUTE_DEFS.mondhof.hortGier).toBeUndefined();
  });

  it('Pfandzettel: die flachen Boni aus Zorn und Schmiedetakt bleiben ganz', () => {
    const { state, ids } = musterStand('stark', 7919, 'mond5');
    const run = bisZurWahl(state, system.startExpedition(state, 'mondhof', ids)!);
    const grimm = run.party.find(u => u.name === 'Grimm')!;
    const eigener = grimm.atk;
    grimm.effektBoni = { 'zorn:atk': 12, 'schmiedetakt:atk': 9 };
    grimm.atk += 21;
    system.resolveChoice(run, 0);
    expect(grimm.atk).toBe(Math.round(eigener * 92 / 100) + 21);
  });

  it('wer den kleinen Zettel nimmt, hat das Mondsilber sofort, und der Angriff bleibt, wie er ist', () => {
    const { state, ids } = musterStand('stark', 7919, 'mond5');
    const run = bisZurWahl(state, system.startExpedition(state, 'mondhof', ids)!);
    const atk = run.party.map(u => u.atk);
    system.resolveChoice(run, 1);
    expect(run.gruppenAngriff ?? 0).toBe(0);
    expect(run.party.map(u => u.atk)).toEqual(atk);
    expect(run.loot.mat_mondsilber).toBe(1);
    expect(run.setTeilVersprochen).toBeFalsy();
  });

  it('mit dem Sieg über Argentis kommen alle Pfandzettel und das versprochene Set-Teil, wer umkehrt, lässt sie liegen', () => {
    const { state, held } = uebermacht();
    const run = bisZurWahl(state, system.startExpedition(state, 'mondhof', [held])!);
    system.resolveChoice(run, 0);
    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    zuEnde(state, run);
    expect(run.bossesKilled).toBe(1);
    expect(run.loot.mat_mondsilber).toBe(14);
    expect(run.combatLog).toContain('📜 Beute aus der Geschichte: +14× Mondsilber');
    const teile = setBeute(state, run);
    expect(teile).toHaveLength(2);
    expect(run.setTeilExtra).toBeTruthy();
    for (const id of teile) expect(setVonItem(id)?.id, id).toBe('pfand');

    const { state: s2, held: h2 } = uebermacht();
    const rueckzug = bisZurWahl(s2, system.startExpedition(s2, 'mondhof', [h2])!);
    system.resolveChoice(rueckzug, 0);
    for (let schritt = 0; schritt < 50 && rueckzug.status === 'exploring'; schritt++) {
      const step = system.nextStep(rueckzug);
      if (step === 'checkpoint') system.resolveCheckpoint(rueckzug, true);
      else if (step !== 'finish') system.processCurrentRoom(s2);
    }
    expect(rueckzug.status).toBe('retreat');
    expect(rueckzug.loot.mat_mondsilber ?? 0).toBe(0);
    expect(setBeute(s2, rueckzug)).toEqual([]);
  });

  it('Amtsstab des Mondvogts: einhändig, mit der Letzten Bastion der Festung', () => {
    const stab = ITEM_DEFS.amtsstab_des_mondvogts;
    expect(stab).toMatchObject({ tier: 9, gearSlot: 'mainHand', weaponSlotType: '1h' });
    expect(stab.tags).toContain('special:letzte_bastion');
    expect(stab.flavorText).toContain('zieht der Träger 2 Runden lang alle Angriffe auf sich');
    const state = createNewGameState();
    const held = createGuildFighter('paladin', 'Schutzherr', { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 1, critChance: 0, critMult: 1.5 });
    state.fighters.push(held);
    state.globalStock.amtsstab_des_mondvogts = 1;
    const gear = new GearSystem();
    expect(gear.equip(state, held, 'amtsstab_des_mondvogts')).toBe(true);
    expect(gear.getSpecialEffects(held).map(e => e.id)).toContain('letzte_bastion');
  });

  it('Sonnenuhr: jedes Vorstellen holt Sunnas Wut 2 Runden näher, die Beute kommt erst mit dem Sieg, ihre Werte bleiben', () => {
    const { state, ids } = musterStand('stark', 7919, 'pfand5');
    const run = bisZurWahl(state, system.startExpedition(state, 'morgentor', ids)!);
    expect(run.pendingChoice!.roomIndex).toBe(2);
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'item', itemId: 'mat_mondsilber', value: 6, nachSieg: true, bossWutFrueher: 2 });
    expect(run.pendingChoice!.optionB).toMatchObject({ effect: 'item', itemId: 'mat_mondsilber', value: 2 });
    const start = run.party.map(u => ({ atk: u.atk, hp: u.hp }));
    const sunna = boss(run);
    const werte = { hp: sunna.hp, maxHp: sunna.maxHp, atk: sunna.atk, spd: sunna.spd };
    const bossRaum = run.rooms.length - 1;
    expect(ENEMY_DEFS.boss_sunna.enrage!.afterRound).toBe(10);

    system.resolveChoice(run, 0);
    expect(run.bossWutFrueher).toBe(2);
    expect(wutAbRunde(ENEMY_DEFS.boss_sunna.enrage!, run)).toBe(8);
    expect(run.combatLog).toContain('>> Das hat seinen Preis: Sunna wird ab Runde 8 wütend.');
    expect(run.loot.mat_mondsilber ?? 0).toBe(0);
    expect(run.geschichtsBeute).toEqual([{ raum: bossRaum, gold: 0, dinge: { mat_mondsilber: 6 } }]);
    // Die Sonnenuhr ändert nichts an den Werten, weder bei den Helden noch bei Sunna (keine Hort-Gier)
    run.party.forEach((u, i) => expect({ atk: u.atk, hp: u.hp }, u.name).toEqual(start[i]));
    expect({ hp: sunna.hp, maxHp: sunna.maxHp, atk: sunna.atk, spd: sunna.spd }).toEqual(werte);
    expect(run.gruppenAngriff ?? 0).toBe(0);
    expect(run.gier ?? 0).toBe(0);
    expect(ROUTE_DEFS.morgentor.hortGier).toBeUndefined();

    // Die zweite Stunde (Raum 8) verspricht ein Set-Teil, wieder gegen 2 Runden Geduld
    bisZurWahl(state, run);
    expect(run.pendingChoice!.roomIndex).toBe(8);
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'kein', setTeil: true, bossWutFrueher: 2 });
    system.resolveChoice(run, 0);
    expect(run.setTeilVersprochen).toBe(true);
    expect(run.bossWutFrueher).toBe(4);
    expect(run.combatLog).toContain('>> Das hat seinen Preis: Sunna wird ab Runde 6 wütend.');

    bisZurWahl(state, run);
    expect(run.pendingChoice!.roomIndex).toBe(14);
    system.resolveChoice(run, 0);
    expect(run.bossWutFrueher).toBe(6);
    expect(wutAbRunde(ENEMY_DEFS.boss_sunna.enrage!, run)).toBe(4);
    expect(run.combatLog).toContain('>> Das hat seinen Preis: Sunna wird ab Runde 4 wütend.');
    expect(run.geschichtsBeute).toEqual([{ raum: bossRaum, gold: 0, dinge: { mat_mondsilber: 16 } }]);
  });

  it('Sonnenuhr: im Bosskampf wütet Sunna dann ab Runde 4, und nie vor Runde 1', () => {
    const engine = new CombatEngine(new GearSystem());
    const wutRunde = (frueher: number | undefined): number => {
      const sunna = engine.enemyToCombatUnit('boss_sunna');
      sunna.atk = 1;
      const held: typeof sunna = { ...engine.enemyToCombatUnit('boss_sunna'), id: 1, name: 'Testheld', isPlayer: true, atk: 1, hp: 99999, maxHp: 99999 };
      const room = { index: 0, type: 'boss' as const, enemies: [sunna], healPercent: 0, hazardDamage: 0, completed: false };
      const run: ExpeditionRun = {
        routeId: 'morgentor', party: [held], rooms: [room], currentRoom: 0, combatLog: [], loot: {}, goldEarned: 0,
        provisions: [], status: 'exploring', lastCheckpoint: 0, desperateResolveUsed: false, rngSeed: 1,
        focusTarget: null, focusTargetCooldown: 0, difficulty: 'normal', activeModifier: null, score: 0,
        totalCombatRounds: 0, enemiesKilled: 0, bossesKilled: 0, abilitiesUsed: {}, bossWutFrueher: frueher,
      };
      engine.processCombat(run, room, new SeededRNG(3));
      const wut = run.combatRoundSnapshots!.find(s => s.logLines.some(l => l === `!! ${sunna.name} ENRAGE !!`));
      expect(wut, `bossWutFrueher ${frueher}`).toBeTruthy();
      return wut!.round;
    };
    expect(wutRunde(undefined)).toBe(10);
    expect(wutRunde(6)).toBe(4);
    expect(wutRunde(50)).toBe(1);
  });

  it('wer die Uhr lässt, hat das Mondsilber sofort oder atmet durch, und Sunna bleibt geduldig', () => {
    const { state, ids } = musterStand('stark', 7919, 'pfand5');
    const run = bisZurWahl(state, system.startExpedition(state, 'morgentor', ids)!);
    system.resolveChoice(run, 1);
    expect(run.bossWutFrueher ?? 0).toBe(0);
    expect(run.loot.mat_mondsilber).toBe(2);
    expect(run.setTeilVersprochen).toBeFalsy();
    expect(run.combatLog.some(l => l.includes('wütend'))).toBe(false);
    bisZurWahl(state, run);
    system.resolveChoice(run, 1);
    expect(run.loot.mat_mondsilber).toBe(5);
    bisZurWahl(state, run);
    expect(run.pendingChoice!.optionB).toMatchObject({ effect: 'heal', value: 15 });
    const vorher = run.party.map(u => u.hp);
    system.resolveChoice(run, 1);
    run.party.forEach((u, i) => expect(u.hp, u.name).toBeGreaterThanOrEqual(vorher[i]));
    expect(run.bossWutFrueher ?? 0).toBe(0);
  });

  it('mit dem Sieg über Sunna kommen 16 Mondsilber und das versprochene Set-Teil, wer umkehrt, lässt die Morgengabe liegen', () => {
    const { state, held } = uebermacht();
    const run = bisZurWahl(state, system.startExpedition(state, 'morgentor', [held])!);
    system.resolveChoice(run, 0);
    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    zuEnde(state, run);
    expect(run.bossesKilled).toBe(1);
    expect(run.loot.mat_mondsilber).toBe(16);
    expect(run.combatLog).toContain('📜 Beute aus der Geschichte: +16× Mondsilber');
    const teile = setBeute(state, run);
    expect(teile).toHaveLength(2);
    expect(run.setTeilExtra).toBeTruthy();
    for (const id of teile) expect(setVonItem(id)?.id, id).toBe('morgen');

    const { state: s2, held: h2 } = uebermacht();
    const rueckzug = bisZurWahl(s2, system.startExpedition(s2, 'morgentor', [h2])!);
    system.resolveChoice(rueckzug, 0);
    for (let schritt = 0; schritt < 50 && rueckzug.status === 'exploring'; schritt++) {
      const step = system.nextStep(rueckzug);
      if (step === 'checkpoint') system.resolveCheckpoint(rueckzug, true);
      else if (step !== 'finish') system.processCurrentRoom(s2);
    }
    expect(rueckzug.status).toBe('retreat');
    expect(rueckzug.loot.mat_mondsilber ?? 0).toBe(0);
    expect(setBeute(s2, rueckzug)).toEqual([]);
  });

  it('Der Morgenstern: zweihändig, Ebene 10, mit dem Sternenfall des Schlund-Sets', () => {
    const stern = ITEM_DEFS.der_morgenstern;
    expect(stern).toMatchObject({ tier: 10, gearSlot: 'mainHand', weaponSlotType: '2h' });
    expect(stern.tags).toContain('special:sternenfall');
    expect(stern.flavorText).toContain('Jeder dritte Treffer holt einen Stern vom Himmel');
    expect(ROUTE_DEFS.morgentor.ersterSiegBeute).toBe('der_morgenstern');
    const state = createNewGameState();
    const held = createGuildFighter('berserker', 'Zornig', { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 1, critChance: 0, critMult: 1.5 });
    state.fighters.push(held);
    state.globalStock.der_morgenstern = 1;
    const gear = new GearSystem();
    expect(gear.equip(state, held, 'der_morgenstern')).toBe(true);
    // Vom Gegenstand kommt nur die Kennung; Kampfeffekte nimmt dann treffer 3 und anteil 0.5 als Vorgabe
    expect(gear.getSpecialEffects(held)).toContainEqual({ id: 'sternenfall', usesLeft: -1 });
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

  it('jeder Boss über dem Vulkankern gibt beim ersten Sieg ein besonderes Stück dazu', () => {
    for (const route of NEUE) {
      const { state, held } = uebermacht();
      const run = zuEnde(state, system.startExpedition(state, route.id, [held])!);
      expect(run.status, route.id).toBe('victory');
      expect(run.loot[route.ersterSiegBeute!], route.id).toBeGreaterThanOrEqual(1);
      expect(ITEM_DEFS[route.ersterSiegBeute!].tier, route.id).toBeGreaterThanOrEqual(5);
    }
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

  it('Eichung grob zwischen den Sternen: erst die Schmiede macht sie machbar, der Sternenschlund gibt auf +4 erste Chancen', () => {
    expect(siegeVon('sternenschmiede', 'stark', 'vorsichtig', 10, 'sterne3')).toBeGreaterThanOrEqual(5);
    expect(siegeVon('sternenschmiede', 'stark', 'vorsichtig', 10, 'hort')).toBeLessThanOrEqual(2);
    const schlund = siegeVon('sternenschlund', 'stark', 'vorsichtig', 10, 'sterne5');
    expect(schlund).toBeGreaterThanOrEqual(3);
    expect(siegeVon('sternenschlund', 'stark', 'vorsichtig', 10, 'sterne3')).toBeLessThanOrEqual(1);
    expect(siegeVon('sternenschlund', 'stark', 'gierig', 10, 'sterne5')).toBeLessThan(schlund);
    // Kein harter Sprung an der Meisterset-Schwelle: Auf +4 klappt es schon ab und zu
    const vier = siegeVon('sternenschlund', 'stark', 'vorsichtig', 30, 'sterne5', true, 4);
    expect(vier).toBeGreaterThan(0);
    expect(vier).toBeLessThan(siegeVon('sternenschlund', 'stark', 'vorsichtig', 30, 'sterne5'));
  });

  it('der Mondhof läuft in jeder Spielweise zu Ende', () => {
    for (const spielweise of ['vorsichtig', 'klug', 'gierig'] as const) {
      for (let i = 1; i <= 3; i++) {
        const { state, ids } = musterStand('stark', i * 7919, 'mond5');
        const run = spieleRoute(state, ids, 'mondhof', spielweise);
        expect(run.status).not.toBe('exploring');
        // Die Zusicherungen hängen an den tatsächlich getroffenen Wahlen, damit sie nie leer laufen
        const wahlen = run.rooms.filter(r => r.type === 'find' && r.completed).length;
        expect(wahlen).toBeGreaterThanOrEqual(1); // Raum 2 wird mit «stark» immer erreicht
        if (spielweise === 'gierig') {
          // jeder Pfandzettel kostet 8 %, der zweite verspricht das Set-Teil; nichts kommt vor dem Boss
          expect(run.gruppenAngriff ?? 0).toBe(-8 * wahlen);
          expect(!!run.setTeilVersprochen).toBe(wahlen >= 2);
          expect(run.loot.mat_mondsilber ?? 0).toBe(run.bossesKilled > 0 ? 14 : 0);
        }
        if (spielweise === 'vorsichtig') expect(run.gruppenAngriff ?? 0).toBe(0);
      }
    }
  });

  // Grobe Eichung im Mondlicht (genaue Zahlen: npm run dungeon-eichung, docs/NEUE-DUNGEONS.md «Im Mondlicht»)
  it('Eichung grob Mondhof: das Schlund-Set ist der Schlüssel, Pfandzettel kosten Siege, das Pfand-Set macht Argentis leicht', () => {
    const mond = messeLaeufe('mondhof', 'stark', 'vorsichtig', 20, 'mond5');
    expect(mond.siege).toBeGreaterThanOrEqual(10);
    expect(mond.rundenlimit).toBe(0);
    expect(messeLaeufe('mondhof', 'stark', 'vorsichtig', 10, 'sterne5').siege).toBeLessThanOrEqual(1);
    expect(messeLaeufe('mondhof', 'stark', 'gierig', 20, 'mond5').siege).toBeLessThanOrEqual(3);
    expect(messeLaeufe('mondhof', 'stark', 'vorsichtig', 10, 'pfand2').siege).toBeGreaterThanOrEqual(9);
  });

  it('Eichung grob Morgentor: das Pfand-Set ist der Schlüssel, die Sonnenuhr kostet den Sieg, Sunnas Morgengabe nicht', () => {
    const pfand = messeLaeufe('morgentor', 'stark', 'vorsichtig', 20, 'pfand5');
    expect(pfand.siege).toBeGreaterThanOrEqual(10);
    // Seit dem Beschützer-Profil des Guardians (5.11.) hält Brom länger, trifft aber schwächer: 2 statt 1 von 20
    // enden am Rundenlimit (1000 Läufe: siehe docs/AUSBILDUNG.md, «Guardian als Beschützer»)
    expect(pfand.rundenlimit).toBeLessThanOrEqual(2);
    expect(messeLaeufe('morgentor', 'stark', 'vorsichtig', 10, 'mond5').siege).toBeLessThanOrEqual(1);
    expect(messeLaeufe('morgentor', 'stark', 'gierig', 20, 'pfand5').siege).toBeLessThanOrEqual(2);
    const morgen = messeLaeufe('morgentor', 'stark', 'gierig', 10, 'morgen0');
    expect(morgen.siege).toBeGreaterThanOrEqual(8);
    // Der Burst-Build schlägt Sunna meist, bevor sie wütet, wenn er die Uhr nicht vorstellt
    expect(messeLaeufe('morgentor', 'stark', 'vorsichtig', 10, 'morgen0').siegeVorWut).toBeGreaterThanOrEqual(8);
  });

  it('das Morgentor läuft in jeder Spielweise zu Ende', () => {
    for (const spielweise of ['vorsichtig', 'klug', 'gierig'] as const) {
      for (let i = 1; i <= 3; i++) {
        const { state, ids } = musterStand('stark', i * 7919, 'pfand5');
        const run = spieleRoute(state, ids, 'morgentor', spielweise);
        expect(run.status).not.toBe('exploring');
        const wahlen = run.rooms.filter(r => r.type === 'find' && r.completed).length;
        expect(wahlen).toBeGreaterThanOrEqual(1);
        if (spielweise === 'gierig') {
          // jede Uhr kostet 2 Runden Geduld, die zweite verspricht das Set-Teil; nichts kommt vor dem Boss
          expect(run.bossWutFrueher ?? 0).toBe(2 * wahlen);
          expect(!!run.setTeilVersprochen).toBe(wahlen >= 2);
          expect(run.loot.mat_mondsilber ?? 0).toBe(run.bossesKilled > 0 ? 16 : 0);
        }
        if (spielweise === 'vorsichtig') expect(run.bossWutFrueher ?? 0).toBe(0);
      }
    }
  });

  // ── Im Taglicht: Die Erste Stadt (Ebene 11) und Die Pfeiler des Tages (Ebene 12) ──

  it('die Erste Stadt braucht Sunna, die Pfeiler des Tages Alruna', () => {
    const state = createNewGameState();
    state.guildStats.rank = 5;
    state.guildStats.bossesDefeatedIds.push('boss_argentis');
    expect(getRouteLockReasons(ROUTE_DEFS.erste_stadt, state)).toEqual([`Besiege: ${ENEMY_DEFS.boss_sunna.name}`]);
    state.guildStats.bossesDefeatedIds.push('boss_sunna');
    expect(isRouteAvailable(ROUTE_DEFS.erste_stadt, state)).toBe(true);
    expect(getRouteLockReasons(ROUTE_DEFS.tagespfeiler, state)).toEqual([`Besiege: ${ENEMY_DEFS.boss_alruna.name}`]);
    state.guildStats.bossesDefeatedIds.push('boss_alruna');
    expect(isRouteAvailable(ROUTE_DEFS.tagespfeiler, state)).toBe(true);
    // Die Karte geht weiter nach oben
    const knoten = (id: string) => DUNGEON_GRAPH.find(n => n.routeId === id)!;
    expect(knoten('morgentor').leadsTo).toContain('erste_stadt');
    expect(knoten('erste_stadt').leadsTo).toContain('tagespfeiler');
    expect(knoten('tagespfeiler').y).toBeLessThan(knoten('erste_stadt').y);
  });

  it('Erste Stadt: kein Rastplatz, drei Wachfeuer als Fund-Räume in Raum 2, 8 und 14', () => {
    const route = ROUTE_DEFS.erste_stadt;
    expect(route.encounters.some(e => e.type === 'rest')).toBe(false);
    const feuer = route.encounters.map((e, i) => [e, i] as const).filter(([e]) => e.wahl);
    expect(feuer.map(([, i]) => i)).toEqual([2, 8, 14]);
    for (const [e] of feuer) {
      expect(e.type).toBe('find');
      expect(e.wahl!.a).toMatchObject({ kostetLeben: 8 });
      expect(e.wahl!.b).toMatchObject({ effect: 'heal', wecken: 30 });
    }
    expect(feuer.map(([e]) => e.wahl!.b.value)).toEqual([5, 5, 10]);
    expect(feuer.map(([e]) => e.wahl!.a.itemId ?? 'setTeil')).toEqual(['mat_tagstein', 'setTeil', 'mat_tagstein']);
    // Der Wicht steht im dritten Raum, hinter dem ersten Feuer
    expect(route.encounters[3].enemies).toContain('wachfeuerwicht');
  });

  it('Wachfeuer: ins Feuer greifen kostet 8 % Leben, der Tagstein kommt mit dem Sieg; wärmen weckt Gefallene mit 30 %', () => {
    const { state, ids } = musterStand('stark', 7919, 'morgen5');
    const run = bisZurWahl(state, system.startExpedition(state, 'erste_stadt', ids)!);
    expect(run.pendingChoice!.roomIndex).toBe(2);
    const vorher = run.party.map(u => u.hp);
    system.resolveChoice(run, 0);
    run.party.forEach((u, i) => expect(u.hp, u.name).toBe(Math.max(1, vorher[i] - Math.floor(u.maxHp * 0.08))));
    expect(run.combatLog).toContain('>> Das hat seinen Preis: Die Gruppe verliert 8% HP.');
    expect(run.loot.mat_tagstein ?? 0).toBe(0);
    expect(run.geschichtsBeute).toEqual([{ raum: run.rooms.length - 1, gold: 0, dinge: { mat_tagstein: 5 } }]);

    // Am zweiten Feuer liegt einer am Boden: Wärmen weckt ihn mit 30 %, die Heilung trifft nur die Stehenden
    bisZurWahl(state, run);
    expect(run.pendingChoice!.roomIndex).toBe(8);
    const [liegt, ...stehen] = run.party;
    liegt.hp = 0;
    const stehenVorher = stehen.map(u => u.hp);
    system.resolveChoice(run, 1);
    expect(liegt.hp).toBe(Math.floor(liegt.maxHp * 0.3));
    expect(liegt.geweckt).toBe(1);
    stehen.forEach((u, i) => expect(u.hp, u.name).toBe(Math.min(u.maxHp, stehenVorher[i] + Math.floor(u.maxHp * 0.05))));
    expect(run.combatLog.some(l => l.endsWith(`${liegt.name} steht mit 30% HP wieder auf.`))).toBe(true);
    // Wer geweckt wurde, war gefallen: kein Sieg ohne Verlust
    expect(run.party.filter(u => (u.geweckt ?? 0) > 0)).toHaveLength(1);
  });

  it('Pfeiler: brechen zieht Orms Wut je 2 Runden vor, stützen schiebt sie je 1 Runde hinaus und kostet 6 % Leben', () => {
    const { state, ids } = musterStand('stark', 7919, 'stadt5');
    const run = bisZurWahl(state, system.startExpedition(state, 'tagespfeiler', ids)!);
    expect(run.pendingChoice!.roomIndex).toBe(2);
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'item', itemId: 'mat_tagstein', value: 6, nachSieg: true, bossWutFrueher: 2 });
    expect(run.pendingChoice!.optionB).toMatchObject({ bossWutFrueher: -1, kostetLeben: 6 });
    const orm = boss(run);
    const werte = { hp: orm.hp, atk: orm.atk };
    system.resolveChoice(run, 1);
    expect(run.bossWutFrueher).toBe(-1);
    expect(run.combatLog).toContain('>> Ihr gewinnt Zeit: Orm wird erst ab Runde 11 wütend.');
    // Raum 6, vor dem Rastplatz: der gestützte Pfeiler gibt zwei Brocken Tagstein sofort
    bisZurWahl(state, run);
    expect(run.pendingChoice!.roomIndex).toBe(6);
    expect(run.rooms[8].type).toBe('rest');
    system.resolveChoice(run, 1);
    expect(run.loot.mat_tagstein).toBe(2);
    bisZurWahl(state, run);
    system.resolveChoice(run, 1);
    expect(run.bossWutFrueher).toBe(-3);
    expect(wutAbRunde(ENEMY_DEFS.boss_orm.enrage!, run)).toBe(13);
    expect(run.combatLog).toContain('>> Ihr gewinnt Zeit: Orm wird erst ab Runde 13 wütend.');
    expect({ hp: orm.hp, atk: orm.atk }).toEqual(werte);

    // Dreimal gebrochen: ab Runde 4, mit Tagstein und Set-Teil erst nach dem Sieg
    const zwei = musterStand('stark', 7919, 'stadt5');
    const gier = bisZurWahl(zwei.state, system.startExpedition(zwei.state, 'tagespfeiler', zwei.ids)!);
    for (let i = 0; i < 3; i++) {
      if (i > 0) bisZurWahl(zwei.state, gier);
      system.resolveChoice(gier, 0);
    }
    expect(gier.bossWutFrueher).toBe(6);
    expect(wutAbRunde(ENEMY_DEFS.boss_orm.enrage!, gier)).toBe(4);
    expect(gier.setTeilVersprochen).toBe(true);
    expect(gier.loot.mat_tagstein ?? 0).toBe(0);
    expect(gier.geschichtsBeute).toEqual([{ raum: gier.rooms.length - 1, gold: 0, dinge: { mat_tagstein: 16 } }]);
  });

  it('im Bosskampf wütet Orm nach drei gestützten Pfeilern erst ab Runde 13', () => {
    const engine = new CombatEngine(new GearSystem());
    const wutRunde = (frueher: number | undefined): number => {
      const orm = engine.enemyToCombatUnit('boss_orm');
      orm.atk = 1;
      const held: typeof orm = { ...engine.enemyToCombatUnit('boss_orm'), id: 1, name: 'Testheld', isPlayer: true, atk: 1, hp: 99999, maxHp: 99999 };
      const room = { index: 0, type: 'boss' as const, enemies: [orm], healPercent: 0, hazardDamage: 0, completed: false };
      const run: ExpeditionRun = {
        routeId: 'tagespfeiler', party: [held], rooms: [room], currentRoom: 0, combatLog: [], loot: {}, goldEarned: 0,
        provisions: [], status: 'exploring', lastCheckpoint: 0, desperateResolveUsed: false, rngSeed: 1,
        focusTarget: null, focusTargetCooldown: 0, difficulty: 'normal', activeModifier: null, score: 0,
        totalCombatRounds: 0, enemiesKilled: 0, bossesKilled: 0, abilitiesUsed: {}, bossWutFrueher: frueher,
      };
      engine.processCombat(run, room, new SeededRNG(3));
      const wut = run.combatRoundSnapshots!.find(s => s.logLines.some(l => l === `!! ${orm.name} ENRAGE !!`));
      expect(wut, `bossWutFrueher ${frueher}`).toBeTruthy();
      return wut!.round;
    };
    expect(wutRunde(undefined)).toBe(10);
    expect(wutRunde(-3)).toBe(13);
    expect(wutRunde(6)).toBe(4);
  });

  it('Alrunas Kelle und Der Schlussstein: die ersten Siege im Taglicht', () => {
    expect(ITEM_DEFS.alrunas_kelle).toMatchObject({ tier: 11, gearSlot: 'mainHand', weaponSlotType: '1h' });
    expect(ITEM_DEFS.der_schlussstein).toMatchObject({ tier: 12, gearSlot: 'trinket' });
    expect(ITEM_DEFS.der_schlussstein.statBonuses).toMatchObject({ spd: 0.16, critChance: 0.16 });
    expect(ROUTE_DEFS.erste_stadt.ersterSiegBeute).toBe('alrunas_kelle');
    expect(ROUTE_DEFS.tagespfeiler.ersterSiegBeute).toBe('der_schlussstein');
  });

  it('die Erste Stadt und die Pfeiler laufen in jeder Spielweise zu Ende', () => {
    for (const [routeId, sets] of [['erste_stadt', 'morgen5'], ['tagespfeiler', 'stadt5']] as const) {
      for (const spielweise of ['vorsichtig', 'klug', 'gierig'] as const) {
        for (let i = 1; i <= 3; i++) {
          const { state, ids } = musterStand('stark', i * 7919, sets);
          const run = spieleRoute(state, ids, routeId, spielweise);
          expect(run.status, `${routeId} ${spielweise}`).not.toBe('exploring');
          const wahlen = run.rooms.filter(r => r.type === 'find' && r.completed).length;
          expect(wahlen).toBeGreaterThanOrEqual(1);
          if (routeId === 'tagespfeiler' && spielweise === 'gierig') expect(run.bossWutFrueher ?? 0).toBe(2 * wahlen);
          if (routeId === 'tagespfeiler' && spielweise === 'vorsichtig') expect(run.bossWutFrueher ?? 0).toBe(-wahlen);
          if (routeId === 'erste_stadt') expect(run.bossWutFrueher ?? 0).toBe(0);
          if (spielweise === 'gierig') expect(run.loot.mat_tagstein ?? 0).toBe(run.bossesKilled > 0 ? (routeId === 'erste_stadt' ? 14 : 16) : 0);
        }
      }
    }
  });

  // Grobe Eichung im Taglicht (genaue Zahlen: npm run dungeon-eichung, docs/NEUE-DUNGEONS.md «Im Taglicht»)
  it('Eichung grob Erste Stadt: die Morgengabe auf +5 ist der Schlüssel, ohne sie fällt Alruna nicht, das Wachfeuer ist der Lohn', () => {
    const morgen = messeLaeufe('erste_stadt', 'stark', 'vorsichtig', 20, 'morgen5');
    expect(morgen.siege).toBeGreaterThanOrEqual(9);
    expect(morgen.siege).toBeLessThanOrEqual(18);
    expect(morgen.rundenlimit).toBe(0);
    expect(messeLaeufe('erste_stadt', 'stark', 'vorsichtig', 10, 'pfand5').siege).toBeLessThanOrEqual(1);
    // Gier kostet: dreimal ins Feuer gegriffen gewinnt nur noch etwa jeder zehnte Lauf (die ersten 20 Startwerte haben Glück)
    expect(messeLaeufe('erste_stadt', 'stark', 'gierig', 100, 'morgen5').siege).toBeLessThanOrEqual(15);
    expect(messeLaeufe('erste_stadt', 'stark', 'vorsichtig', 20, 'stadt0').siege).toBeGreaterThanOrEqual(15);
  });

  // Kapitel «heimkehr» im Anbau des Saals (docs/AUFTRAGSBRETT.md); makellos hängt dort kein Zettel (OHNE_MAKELLOS)
  it('Alrunas Kohle: mit Alrunas Wachfeuer kommen oft alle heim, ohne dass einer fällt aber kaum je', () => {
    const zaehle = (routeId: string, sets: MusterSetName): { siege: number; heim: number; makellos: number } => {
      const z = { siege: 0, heim: 0, makellos: 0 };
      for (let i = 1; i <= 20; i++) {
        const { state, ids } = musterStand('stark', i * 7919, sets);
        const run = spieleRoute(state, ids, routeId, 'vorsichtig');
        if (!dungeonBezwungen(run)) continue;
        z.siege++;
        if (alleStehen(run)) z.heim++;
        if (!einHeldGefallen(run)) z.makellos++;
      }
      return z;
    };
    const wachfeuer = zaehle('erste_stadt', 'stadt0');
    expect(wachfeuer.heim).toBeGreaterThanOrEqual(4);
    expect(wachfeuer.makellos).toBeLessThanOrEqual(1);
    // Ohne etwas, das Gefallene weckt, bleibt in jedem Sieg einer liegen
    const morgen = zaehle('erste_stadt', 'morgen5');
    expect(morgen.siege).toBeGreaterThan(0);
    expect(morgen.heim).toBe(0);
    expect(zaehle('tagespfeiler', 'tagwerk0').makellos).toBeLessThanOrEqual(1);
  });

  it('Eichung grob Pfeiler: das Wachfeuer auf +5 ist der Schlüssel, Brechen kostet den Sieg, die Tragkraft ist der Lohn', () => {
    const stadt = messeLaeufe('tagespfeiler', 'stark', 'vorsichtig', 20, 'stadt5');
    expect(stadt.siege).toBeGreaterThanOrEqual(11);
    expect(stadt.rundenlimit).toBeLessThanOrEqual(1);
    expect(messeLaeufe('tagespfeiler', 'stark', 'vorsichtig', 10, 'morgen5').siege).toBeLessThanOrEqual(3);
    expect(messeLaeufe('tagespfeiler', 'stark', 'gierig', 20, 'stadt5').siege).toBeLessThanOrEqual(3);
    expect(messeLaeufe('tagespfeiler', 'stark', 'vorsichtig', 20, 'tagwerk0').siege).toBeGreaterThanOrEqual(stadt.siege);
  });

  // Der zweite Pfeiler steht vor dem Rastplatz: «klug» bricht den ersten und kommt an den zweiten mit etwa 84 %
  // Leben, bricht ihn also nur in vier von zehn Läufen. Stand die Rast davor, brach es fast immer zweimal (27 %).
  it('Eichung grob Pfeiler: klug liegt klar zwischen vorsichtig und gierig', () => {
    const klug = messeLaeufe('tagespfeiler', 'stark', 'klug', 100, 'stadt5').siege;
    expect(klug).toBeGreaterThanOrEqual(35);
    expect(klug).toBeLessThanOrEqual(58);
  });
});

describe('Das Nichts da oben', () => {
  it('braucht Orm und hat feste Wahl-Räume 2 und 8, ohne Tagstein', () => {
    const state = createNewGameState();
    state.guildStats.rank = 5;
    expect(getRouteLockReasons(ROUTE_DEFS.nichts_da_oben, state)).toEqual([`Besiege: ${ENEMY_DEFS.boss_orm.name}`]);
    state.guildStats.bossesDefeatedIds.push('boss_orm');
    expect(isRouteAvailable(ROUTE_DEFS.nichts_da_oben, state)).toBe(true);
    const enc = ROUTE_DEFS.nichts_da_oben.encounters;
    expect(enc[2]).toMatchObject({ type: 'find', wahl: { a: { kostetLeben: 7, nachSieg: true, itemId: 'magitech_component', value: 4 } } });
    expect(enc[8]).toMatchObject({ type: 'find', wahl: { a: { kostetLeben: 7, setTeil: true }, b: { itemId: 'crystal_shard', value: 4 } } });
    expect(enc[8].wahl!.b.nachSieg).toBeFalsy();
    for (const i of [2, 8]) for (const o of [enc[i].wahl!.a, enc[i].wahl!.b]) expect(o.itemId).not.toBe('mat_tagstein');
  });

  it('wer Kiste und Leiter nimmt, bekommt mit dem Sieg Magitech und ein Set-Teil', () => {
    const { state, held } = uebermacht();
    const run = bisZurWahl(state, system.startExpedition(state, 'nichts_da_oben', [held])!);
    system.resolveChoice(run, 0);
    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    zuEnde(state, run);
    expect(run.status).toBe('victory');
    expect(run.setTeilVersprochen).toBe(true);
    expect(run.loot.magitech_component ?? 0).toBeGreaterThanOrEqual(4);
  });
});
