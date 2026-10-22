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
import { setBeute } from '../src/systems/DungeonSets';
import { setVonItem } from '../src/data/dungeonSets';
import { musterStand, siegeVon, spieleRoute } from '../src/systems/Musterlauf';

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
  it('der Weg führt vom Vulkankern über Drachenhort und Himmelsarchiv zwischen die Sterne und in den Mondhof', () => {
    expect(NEUE.map(r => r.id)).toEqual(['drachenhort', 'himmelsarchiv', 'sternenschmiede', 'sternenschlund', 'mondhof']);
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

  it('Pfandzettel: wer verpfändet, schlägt bis zum Ende 10 % schwächer zu, und das Mondsilber kommt erst mit Argentis', () => {
    const { state, ids } = musterStand('stark', 7919, 'mond5');
    const run = bisZurWahl(state, system.startExpedition(state, 'mondhof', ids)!);
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'item', itemId: 'mat_mondsilber', value: 5, nachSieg: true, kostetAngriff: 10 });
    expect(run.pendingChoice!.optionB).toMatchObject({ effect: 'item', itemId: 'mat_mondsilber', value: 1 });
    const start = run.party.map(u => ({ atk: u.atk, hp: u.hp }));
    const boss = run.rooms.length - 1;

    system.resolveChoice(run, 0);
    expect(run.gruppenAngriff).toBe(-10);
    run.party.forEach((u, i) => {
      expect(u.atk, u.name).toBe(Math.round(start[i].atk * 90 / 100));
      expect(u.hp, u.name).toBe(start[i].hp);
    });
    expect(run.loot.mat_mondsilber ?? 0).toBe(0);
    expect(run.geschichtsBeute).toEqual([{ raum: boss, gold: 0, dinge: { mat_mondsilber: 5 } }]);
    expect(run.combatLog).toContain('>> Das hat seinen Preis: Die Gruppe schlägt bis zum Ende des Dungeons 10% schwächer zu.');

    // Das Pfandbuch (Raum 8) verspricht ein Set-Teil, wieder gegen 10 % Angriff, gerechnet auf den Angriff vor dem ersten Mal
    bisZurWahl(state, run);
    expect(run.pendingChoice!.roomIndex).toBe(8);
    expect(run.pendingChoice!.optionA).toMatchObject({ effect: 'kein', setTeil: true, kostetAngriff: 10 });
    system.resolveChoice(run, 0);
    expect(run.setTeilVersprochen).toBe(true);
    expect(run.gruppenAngriff).toBe(-20);
    run.party.forEach((u, i) => expect(Math.abs(u.atk - start[i].atk * 0.8), u.name).toBeLessThanOrEqual(1));
    expect(run.combatLog).toContain('>> Das Pfandbuch unterschreiben (+1 Set-Teil, wenn ihr siegt, −10% Angriff bis zum Ende): 🌙 +1 Set-Teil, wenn ihr siegt.');
    expect(run.combatLog).toContain('>> Das hat seinen Preis: Die Gruppe schlägt bis zum Ende des Dungeons 20% schwächer zu.');

    bisZurWahl(state, run);
    system.resolveChoice(run, 0);
    expect(run.gruppenAngriff).toBe(-30);
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
    expect(grimm.atk).toBe(Math.round(eigener * 90 / 100) + 21);
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
    const held = createGuildFighter(1, 'paladin', 'Schutzherr', { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 1, critChance: 0, critMult: 1.5 });
    state.fighters.push(held);
    state.globalStock.amtsstab_des_mondvogts = 1;
    const gear = new GearSystem();
    expect(gear.equip(state, held, 'amtsstab_des_mondvogts')).toBe(true);
    expect(gear.getSpecialEffects(held).map(e => e.id)).toContain('letzte_bastion');
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

  it('der Mondhof läuft in jeder Spielweise zu Ende (noch nicht geeicht, darum keine Siegquote)', () => {
    for (const spielweise of ['vorsichtig', 'klug', 'gierig'] as const) {
      for (let i = 1; i <= 3; i++) {
        const { state, ids } = musterStand('stark', i * 7919, 'mond5');
        const run = spieleRoute(state, ids, 'mondhof', spielweise);
        expect(run.status).not.toBe('exploring');
        expect(run.rooms.filter(r => r.completed).length).toBeGreaterThan(0);
        // Gierig unterschreibt alle drei Pfandzettel: 30 % schwächer, nichts kommt vor dem Boss
        if (spielweise === 'gierig' && run.rooms.filter(r => r.completed).length >= 15) {
          expect(run.gruppenAngriff).toBe(-30);
          expect(run.setTeilVersprochen).toBe(true);
        }
      }
    }
  });
});
