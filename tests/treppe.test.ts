import { test, expect, describe } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress, treppeNachNeuladen } from '../src/systems/ExpeditionFinalizer';
import { steigeAuf } from '../src/systems/Stadtweg';
import { treppeOffen, treppeStand, besteEtage, treppenStarts, etageGeschafft } from '../src/systems/Treppe';
import {
  TREPPE_ROUTE_ID, TREPPEN_ABSCHNITTE, STOCKWERKE_JE_UMLAUF, TREPPE_ID_BASIS,
  stockwerkGegner, stockwerkStaerke, gegnerWerte, abschnittFuer, istBossEtage,
  startEtagen, umlaufZusatz, stockwerkGold,
} from '../src/data/treppe';
import { ENEMY_DEFS } from '../src/data/enemies';
import { HERZSTEINE } from '../src/data/stadtstufen';
import { ROUTE_DEFS, ROUTE_IMAGE_MAP, getRouteLockReasons, isRouteAvailable } from '../src/data/routes';
import { generateWeeklyChallenge } from '../src/data/weeklyChallenges';

const STARK = { hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1 };

/** Spielstand in der Magischen Stadt (Stufe 7) mit einem übermächtigen Helden. */
function magischeStadt(stats = STARK): { state: GameState; system: ExpeditionSystem; held: GuildFighter } {
  const state = createNewGameState();
  const held = createGuildFighter(1, 'guardian', 'Testheld', { ...stats });
  state.fighters.push(held);
  state.stadtweg = { stufe: 7, herzsteine: HERZSTEINE.map(h => h.id), gelesen: 7 };
  return { state, system: new ExpeditionSystem(new GearSystem(), new ProvisionSystem()), held };
}

/** Kämpft bis zum nächsten Rastplatz (oder bis der Lauf endet). */
function bisZumRastplatz(state: GameState, system: ExpeditionSystem, run: ExpeditionRun): void {
  for (let guard = 0; guard < 20; guard++) {
    const step = system.nextStep(run);
    if (step === 'checkpoint' || step === 'finish') return;
    system.processCurrentRoom(state);
  }
  throw new Error('kein Rastplatz erreicht');
}

describe('Daten der Treppe', () => {
  test('jedes Stockwerk sieht immer gleich aus, Boss alle 10, höchstens ein Heiler', () => {
    for (let etage = 1; etage <= 2 * STOCKWERKE_JE_UMLAUF; etage++) {
      const ids = stockwerkGegner(etage);
      expect(stockwerkGegner(etage)).toEqual(ids);
      for (const id of ids) expect(ENEMY_DEFS[id], id).toBeTruthy();
      if (istBossEtage(etage)) {
        expect(ids).toEqual([abschnittFuer(etage).boss]);
      } else {
        expect(ids.length).toBeGreaterThanOrEqual(2);
        expect(ids.length).toBeLessThanOrEqual(3);
        const heiler = ids.filter(id => ENEMY_DEFS[id].skills.some(s => s.effectType === 'heal'));
        expect(heiler.length).toBeLessThanOrEqual(1);
      }
    }
  });

  test('alle Abschnitte haben Bild, echte Gegner und einen echten Boss; nach 110 beginnt Umlauf II', () => {
    for (const abschnitt of TREPPEN_ABSCHNITTE) {
      expect(ROUTE_IMAGE_MAP[abschnitt.bild], abschnitt.name).toBeTruthy();
      expect(ENEMY_DEFS[abschnitt.boss]?.isBoss, abschnitt.boss).toBe(true);
      for (const id of abschnitt.gegner) expect(ENEMY_DEFS[id], id).toBeTruthy();
    }
    expect(abschnittFuer(STOCKWERKE_JE_UMLAUF + 1)).toBe(TREPPEN_ABSCHNITTE[0]);
    expect(umlaufZusatz(STOCKWERKE_JE_UMLAUF)).toBe('');
    expect(umlaufZusatz(STOCKWERKE_JE_UMLAUF + 10)).toBe(' II');
  });

  test('jedes Stockwerk ist stärker als das darunter, Bosse stärker als ihre Begleiter', () => {
    for (let etage = 1; etage < 300; etage++) {
      const jetzt = stockwerkStaerke(etage);
      const naechstes = stockwerkStaerke(etage + 1);
      expect(naechstes.hp).toBeGreaterThan(jetzt.hp);
      expect(naechstes.atk).toBeGreaterThan(jetzt.atk);
      expect(naechstes.def).toBeGreaterThan(jetzt.def);
    }
    const boss = gegnerWerte(abschnittFuer(20).boss, 20);
    const normal = stockwerkStaerke(20);
    expect(boss.hp).toBeGreaterThan(normal.hp * 2);
    expect(boss.atk).toBeGreaterThan(normal.atk);
    expect(stockwerkGold(20)).toBeGreaterThan(stockwerkGold(19));
  });

  test('Startpunkte: unten und über jedem geschafften Boss-Stockwerk', () => {
    expect(startEtagen(0)).toEqual([1]);
    expect(startEtagen(9)).toEqual([1]);
    expect(startEtagen(10)).toEqual([1, 11]);
    expect(startEtagen(34)).toEqual([1, 11, 21, 31]);
  });

  test('die Treppe kommt nie als Wochen-Herausforderung', () => {
    for (let woche = 0; woche < 260; woche++) {
      const tag = new Date(Date.UTC(2026, 0, 5 + woche * 7));
      expect(generateWeeklyChallenge(tag).routeId).not.toBe(TREPPE_ROUTE_ID);
    }
  });
});

describe('Freischaltung', () => {
  test('zu bis Stadtstufe 7, auch mit hohem Gildenrang; dann offen mit Startzeit', () => {
    const { state, system, held } = magischeStadt();
    state.stadtweg = { stufe: 6, herzsteine: [], gelesen: 6 };
    state.guildStats.rank = 5;
    const route = ROUTE_DEFS[TREPPE_ROUTE_ID];
    expect(treppeOffen(state)).toBe(false);
    expect(treppeStand(state)).toBeNull();
    expect(getRouteLockReasons(route, state)).toEqual(['Stadtstufe 7: Magische Stadt']);
    expect(system.startTreppe(state, [held.id], 1)).toBeNull();

    state.stadtweg.stufe = 7;
    state.guildStats.rank = 1;
    expect(isRouteAvailable(route, state)).toBe(true);
    const stand = treppeStand(state, 1234)!;
    expect(stand).toMatchObject({ geoeffnetAm: 1234, besteEtage: 0, laeufe: 0, verlauf: [] });
    expect(treppeStand(state, 9999)!.geoeffnetAm).toBe(1234);
  });

  test('der Aufstieg auf Stufe 7 öffnet die Treppe sofort', () => {
    const { state } = magischeStadt();
    state.stadtweg = { stufe: 6, herzsteine: HERZSTEINE.map(h => h.id), gelesen: 6 };
    expect(state.treppe).toBeUndefined();
    expect(steigeAuf(state)?.stufe).toBe(7);
    expect(state.treppe?.besteEtage).toBe(0);
  });

  test('nur über startTreppe und nur an erlaubten Startpunkten', () => {
    const { state, system, held } = magischeStadt();
    expect(system.startExpedition(state, TREPPE_ROUTE_ID, [held.id])).toBeNull();
    expect(system.startTreppe(state, [held.id], 11)).toBeNull();
    etageGeschafft(state, 10);
    const run = system.startTreppe(state, [held.id], 11)!;
    expect(run.treppe?.startEtage).toBe(11);
    expect(run.rooms[0].type).toBe('combat');
  });
});

describe('Ein Lauf', () => {
  test('Stockwerk für Stockwerk, Rastplatz nach dem 5., Heimkehr behält alles', () => {
    const { state, system, held } = magischeStadt();
    const run = system.startTreppe(state, [held.id], 1)!;
    expect(treppeStand(state)!.laeufe).toBe(1);

    // Erstes Stockwerk: Gegnerwerte nach Stockwerk, eindeutige Kampf-IDs
    const gegner = run.rooms[0].enemies;
    expect(gegner.map(e => e.defId)).toEqual(stockwerkGegner(1));
    expect(gegner[0].maxHp).toBe(gegnerWerte(gegner[0].defId!, 1).hp);
    expect(new Set(gegner.map(e => e.id)).size).toBe(gegner.length);
    expect(gegner.every(e => e.id >= TREPPE_ID_BASIS)).toBe(true);

    bisZumRastplatz(state, system, run);
    expect(system.nextStep(run)).toBe('checkpoint');
    expect(run.rooms.length).toBe(5);
    expect(run.treppe!.geschafft).toBe(5);
    expect(besteEtage(state)).toBe(5);
    expect(state.treppe!.verlauf.map(v => v.etage)).toEqual([1, 2, 3, 4, 5]);
    expect(run.treppe!.sicher.gold).toBe(run.goldEarned);
    expect(run.goldEarned).toBeGreaterThan(0);

    // Weiter: Stockwerk 6 kommt dazu, Stockwerk 10 ist der Boss
    system.resolveCheckpoint(run, false);
    expect(run.rooms.length).toBe(6);
    bisZumRastplatz(state, system, run);
    expect(run.rooms[9].type).toBe('boss');
    expect(run.bossesKilled).toBe(1);
    expect(run.loot.crystal_shard ?? 0).toBeGreaterThanOrEqual(1);

    // Heimkehr vom Rastplatz: nichts geht verloren
    system.resolveCheckpoint(run, true);
    expect(run.status).toBe('retreat');
    const lootVorher = { ...run.loot };
    const goldVorher = run.goldEarned;
    const ergebnis = system.treppeAbschliessen(run)!;
    expect(ergebnis).toMatchObject({
      start: 1, stockwerke: 10, hoechstes: 10, besteVorher: 0, neueBestmarke: true,
      ende: 'heimgekehrt', verlorenGold: 0, verlorenTeile: 0,
    });
    expect(run.loot).toEqual(lootVorher);
    expect(run.goldEarned).toBe(goldVorher);
    expect(treppenStarts(state)).toEqual([1, 11]);

    // Verbuchen wie jede Expedition: Rangliste, Monsterbuch, besiegte Bosse
    const fortschritt = finalizeExpeditionProgress(state, run, system);
    expect(fortschritt.entry.routeId).toBe(TREPPE_ROUTE_ID);
    expect(state.statistics.total_bosses_killed).toBe(1);
    expect(state.bestiarium.defeated).toContain(abschnittFuer(10).boss);
  });

  test('Rastplatz heilt, holt Gefallene zurück und gibt Fähigkeiten frei', () => {
    const { state, system, held } = magischeStadt();
    const zweiter = createGuildFighter(2, 'cleric', 'Zweite', { ...STARK });
    state.fighters.push(zweiter);
    const run = system.startTreppe(state, [held.id, zweiter.id], 1)!;
    for (let i = 0; i < 4; i++) system.processCurrentRoom(state);
    expect(run.treppe!.geschafft).toBe(4);

    const [a, b] = run.party;
    a.hp = 1000;
    b.hp = 0;
    run.abilitiesUsed[a.id] = true;
    system.processCurrentRoom(state);

    expect(system.nextStep(run)).toBe('checkpoint');
    expect(a.hp).toBeGreaterThan(1000 + Math.floor(a.maxHp * 0.4) - 200);
    expect(b.hp).toBe(Math.floor(b.maxHp * 0.25));
    expect(run.abilitiesUsed).toEqual({});
  });

  test('wer nach dem Rastplatz fällt, verliert die Beute seit dem Rastplatz', () => {
    const { state, system, held } = magischeStadt();
    const run = system.startTreppe(state, [held.id], 1)!;
    bisZumRastplatz(state, system, run);
    const sicher = { gold: run.goldEarned, loot: { ...run.loot } };
    system.resolveCheckpoint(run, false);
    system.processCurrentRoom(state);
    system.processCurrentRoom(state);
    expect(run.goldEarned).toBeGreaterThan(sicher.gold);

    // Stockwerk 8 mit einem plötzlich schwachen Helden
    Object.assign(run.party[0], { hp: 1, def: 0, atk: 1 });
    system.processCurrentRoom(state);
    expect(run.status).toBe('defeat');
    expect(system.nextStep(run)).toBe('finish');

    const ergebnis = system.treppeAbschliessen(run)!;
    expect(ergebnis.ende).toBe('niederlage');
    expect(ergebnis.hoechstes).toBe(7);
    expect(ergebnis.verlorenGold).toBeGreaterThan(0);
    expect(run.goldEarned).toBe(sicher.gold);
    expect(run.loot).toEqual(sicher.loot);
    // Die Bestmarke bleibt trotzdem
    expect(besteEtage(state)).toBe(7);
  });

  test('ein Kampf ohne Sieger bis zur Rundengrenze beendet den Lauf (Unentschieden)', () => {
    const { state, system, held } = magischeStadt({ ...STARK, atk: 1 });
    const run = system.startTreppe(state, [held.id], 1)!;
    system.processCurrentRoom(state);
    expect(run.status).toBe('retreat');
    expect(run.treppe!.patt).toBe(true);
    expect(system.nextStep(run)).toBe('finish');
    const ergebnis = system.treppeAbschliessen(run)!;
    expect(ergebnis).toMatchObject({ ende: 'patt', stockwerke: 0, hoechstes: 0, neueBestmarke: false });
    expect(besteEtage(state)).toBe(0);
  });

  test('Flucht mitten im Abschnitt: Beute weg, Bestmarke bleibt', () => {
    const { state, system, held } = magischeStadt();
    const run = system.startTreppe(state, [held.id], 1)!;
    system.processCurrentRoom(state);
    system.processCurrentRoom(state);
    system.retreat(run);
    const ergebnis = system.treppeAbschliessen(run)!;
    expect(ergebnis.ende).toBe('flucht');
    expect(ergebnis.verlorenGold).toBeGreaterThan(0);
    expect(run.goldEarned).toBe(0);
    expect(besteEtage(state)).toBe(2);
  });

  test('Rückzug nach einer Niederlage bleibt eine Niederlage', () => {
    const { state, system, held } = magischeStadt({ ...STARK, hp: 1, maxHp: 1, def: 0, atk: 1 });
    const run = system.startTreppe(state, [held.id], 1)!;
    system.processCurrentRoom(state);
    expect(run.status).toBe('defeat');
    system.retreat(run);
    expect(run.status).toBe('defeat');
  });

  test('Neu laden mitten im Lauf: die Beute vom letzten Rastplatz kommt ins Lager', () => {
    const { state, system, held } = magischeStadt();
    const run = system.startTreppe(state, [held.id], 1)!;
    bisZumRastplatz(state, system, run);
    const sicherGold = run.goldEarned;
    system.resolveCheckpoint(run, false);
    system.processCurrentRoom(state);
    const goldVorher = state.globalStock.gold ?? 0;
    expect(system.abortExpedition(state)).toBe(true);
    expect(state.globalStock.gold).toBe(goldVorher + sicherGold);
    expect(state.activeExpedition).toBeNull();
  });

  test('Neu laden zählt wie Fliehen: Erfahrung, Bosse und Statistik werden verbucht', () => {
    const { state, system, held } = magischeStadt();
    const run = system.startTreppe(state, [held.id], 1)!;
    bisZumRastplatz(state, system, run);
    system.resolveCheckpoint(run, false);
    bisZumRastplatz(state, system, run);
    system.resolveCheckpoint(run, false);
    system.processCurrentRoom(state);
    const sicherGold = run.treppe!.sicher.gold;
    expect(run.goldEarned).toBeGreaterThan(sicherGold);
    const goldVorher = state.globalStock.gold ?? 0;

    // Wie beim Laden: Der Spielstand kommt aus dem LocalStorage
    const geladen: GameState = JSON.parse(JSON.stringify(state));
    const fortschritt = treppeNachNeuladen(geladen, system)!;
    expect(fortschritt.entry).toMatchObject({ routeId: TREPPE_ROUTE_ID, status: 'retreat', bossesKilled: 1 });
    expect(fortschritt.xp[0].xp).toBeGreaterThan(0);
    expect(geladen.statistics.total_bosses_killed).toBe(1);
    expect(geladen.bestiarium.defeated).toContain(abschnittFuer(10).boss);
    expect(system.abortExpedition(geladen)).toBe(true);
    expect(geladen.globalStock.gold).toBe(goldVorher + sicherGold);
    expect(geladen.activeExpedition).toBeNull();
    // Ohne Treppen-Lauf passiert beim Laden nichts
    expect(treppeNachNeuladen(geladen, system)).toBeNull();
  });

  test('das Kampfprotokoll nennt das Stockwerk', () => {
    const { state, system, held } = magischeStadt();
    etageGeschafft(state, 10);
    const run = system.startTreppe(state, [held.id], 11)!;
    system.processCurrentRoom(state);
    expect(run.combatLog).toContain('── Stockwerk 11: Kampf ──');
  });
});
