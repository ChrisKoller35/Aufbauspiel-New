import { describe, test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { DUNGEON_GESCHICHTEN, GeschichtsOption, Wirkung } from '../src/data/dungeonGeschichten';
import { ROUTE_DEFS } from '../src/data/routes';
import { ITEM_DEFS } from '../src/data/items';
import { setFuerRoute } from '../src/data/dungeonSets';
import { setBeute, setTeilHinweise } from '../src/systems/DungeonSets';
import { setTeilIds } from '../src/data/dungeonSets';
import { musterStand, spieleRoute } from '../src/systems/Musterlauf';
import {
  RAEUME_MIT_ENTSCHEIDUNG, chronikNachWahl, einleitungGelesen, folgenZeilen, geschichteVon, geschichteWirkt,
  geschichtsBeuteNachKampf, geschichtsBilanz, istErlebt, istGefahr, istGeschichtsBeuteZeile, istGeschichtsWahl,
  ungeleseneEinleitung, wirkungZeile,
} from '../src/systems/Geschichten';

/** Ein Held, der jeden Kampf gewinnt */
function setup(): { state: GameState; system: ExpeditionSystem; heroId: number } {
  const state = createNewGameState();
  const hero = createGuildFighter(1, 'guardian', 'Testheld', {
    hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1,
  });
  state.fighters.push(hero);
  return { state, system: new ExpeditionSystem(new GearSystem(), new ProvisionSystem()), heroId: hero.id };
}

/** Bis zur nächsten Entscheidung der Geschichte oder bis zum Ende; Kontrollpunkte und Rast gehen weiter */
function bisZurGeschichte(state: GameState, system: ExpeditionSystem, run: ExpeditionRun): void {
  for (let i = 0; i < 100; i++) {
    const step = system.nextStep(run);
    if (step === 'finish') return;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') {
      if (istGeschichtsWahl(run.pendingChoice)) return;
      system.resolveChoice(run, 0);
    } else system.processCurrentRoom(state);
  }
}

const alleOptionen = (): { routeId: string; option: GeschichtsOption; art: 'sicher' | 'mutig' }[] =>
  DUNGEON_GESCHICHTEN.flatMap(g => g.wahlen.flatMap(w => [
    { routeId: g.routeId, option: w.sicher, art: 'sicher' as const },
    { routeId: g.routeId, option: w.mutig, art: 'mutig' as const },
  ]));

describe('Geschichten: Daten', () => {
  test('jeder Dungeon hat genau eine Geschichte', () => {
    const ids = DUNGEON_GESCHICHTEN.map(g => g.routeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(ROUTE_DEFS).sort());
  });

  test('2 bis 3 Entscheidungen pro Dungeon; feste Wahl-Räume erzählen statt neuer Entscheidungen', () => {
    for (const g of DUNGEON_GESCHICHTEN) {
      const wahlRaeume = ROUTE_DEFS[g.routeId].encounters.flatMap((e, i) => (e.wahl ? [i] : []));
      if (wahlRaeume.length > 0) {
        expect(g.wahlen, g.routeId).toEqual([]);
        expect(Object.keys(g.raumWahlen ?? {}).map(Number), g.routeId).toEqual(wahlRaeume);
      } else {
        expect(g.raumWahlen, g.routeId).toBeUndefined();
      }
      const anzahl = g.wahlen.length + wahlRaeume.length;
      expect(anzahl, g.routeId).toBeGreaterThanOrEqual(2);
      expect(anzahl, g.routeId).toBeLessThanOrEqual(3);
    }
  });

  test('Entscheidungen nach Kampf, Gefahr oder Kontrollpunkt, nie im letzten Raum', () => {
    for (const g of DUNGEON_GESCHICHTEN) {
      const raeume = ROUTE_DEFS[g.routeId].encounters;
      let vorher = -1;
      for (const w of g.wahlen) {
        const wo = `${g.routeId} nach Raum ${w.nachRaum}`;
        expect(w.nachRaum, wo).toBeGreaterThan(vorher);
        expect(w.nachRaum, wo).toBeLessThan(raeume.length - 1);
        expect(RAEUME_MIT_ENTSCHEIDUNG, wo).toContain(raeume[w.nachRaum].type);
        vorher = w.nachRaum;
      }
    }
  });

  test('Wirkungen passen zum Dungeon: Gegenstände gibt es, Boss und Set-Teil nur, wo es sie gibt', () => {
    for (const { routeId, option } of alleOptionen()) {
      const route = ROUTE_DEFS[routeId];
      for (const w of option.wirkung) {
        if (w.art === 'gegenstand') expect(ITEM_DEFS[w.itemId], `${routeId}: ${w.itemId}`).toBeDefined();
        if (w.art === 'boss') expect(route.encounters.some(e => e.type === 'boss'), `${routeId}: Boss`).toBe(true);
        if (w.art === 'setTeil') expect(setFuerRoute(routeId), `${routeId}: Set`).toBeDefined();
        if (w.art === 'gegner' || w.art === 'boss') expect(w.prozent, routeId).not.toBe(0);
        if (w.art === 'gegner') expect(w.kaempfe, routeId).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('jede Option bringt etwas; die vorsichtige ohne Gefahr, die mutige mit', () => {
    for (const { routeId, option, art } of alleOptionen()) {
      const wo = `${routeId}: ${option.label}`;
      expect(option.wirkung.some(w => !istGefahr(w)), wo).toBe(true);
      expect(option.wirkung.some(istGefahr), wo).toBe(art === 'mutig');
    }
  });

  test('Schwächungen massvoll: Boss höchstens einmal je Geschichte und um 10 %, Gegner bis 20 % (zwei Kämpfe: 10 %)', () => {
    for (const g of DUNGEON_GESCHICHTEN) {
      const wirkungen = g.wahlen.flatMap(w => [...w.sicher.wirkung, ...w.mutig.wirkung]);
      const bossSchwaecher = wirkungen.filter(w => w.art === 'boss' && w.prozent < 0);
      expect(bossSchwaecher.length, g.routeId).toBeLessThanOrEqual(1);
      for (const w of wirkungen) {
        if (w.art === 'boss' && w.prozent < 0) expect(w.prozent, g.routeId).toBeGreaterThanOrEqual(-10);
        if (w.art === 'gegner' && w.prozent < 0) expect(w.prozent, g.routeId).toBeGreaterThanOrEqual(w.kaempfe === 1 ? -20 : -10);
      }
    }
  });

  test('jede Gefahr trifft: nach der Entscheidung kommt noch ein Kampf, für den Boss der Boss', () => {
    for (const g of DUNGEON_GESCHICHTEN) {
      const raeume = ROUTE_DEFS[g.routeId].encounters;
      for (const w of g.wahlen) {
        const danach = raeume.slice(w.nachRaum + 1).map(e => e.type);
        for (const x of [...w.sicher.wirkung, ...w.mutig.wirkung]) {
          const wo = `${g.routeId} nach Raum ${w.nachRaum}: ${x.art}`;
          if (x.art === 'gegner') expect(danach.some(t => t === 'combat' || t === 'fortification'), wo).toBe(true);
          if (x.art === 'boss') expect(danach, wo).toContain('boss');
          if (x.art === 'leben') expect(danach.some(t => t === 'combat' || t === 'fortification' || t === 'boss'), wo).toBe(true);
        }
      }
    }
  });

  test('Heilung und Lebenskosten zählen: bis zum nächsten Kampf kommt kein Rastplatz', () => {
    // Vor einer Rast ist eine Heilung fast nichts wert und ein Preis an Leben fast gratis (Eichung)
    for (const g of DUNGEON_GESCHICHTEN) {
      const raeume = ROUTE_DEFS[g.routeId].encounters;
      for (const w of g.wahlen) {
        const naechster = raeume.slice(w.nachRaum + 1).find(e => ['rest', 'combat', 'boss', 'fortification'].includes(e.type));
        for (const option of [w.sicher, w.mutig]) {
          if (option.wirkung.some(x => x.art === 'heilen' || x.art === 'leben')) {
            expect(naechster?.type, `${g.routeId} «${w.titel}»: ${option.label}`).not.toBe('rest');
          }
        }
      }
    }
  });

  test('alle Texte sind da und ohne «ß»', () => {
    for (const g of DUNGEON_GESCHICHTEN) {
      const texte = [
        g.titel, g.einleitung, g.ende,
        ...g.wahlen.flatMap(w => [w.titel, w.text, w.sicher.label, w.sicher.nachklang, w.mutig.label, w.mutig.nachklang]),
        ...Object.values(g.raumWahlen ?? {}).flatMap(r => [r.titel, r.text, r.nachklang.a, r.nachklang.b]),
      ];
      for (const t of texte) {
        expect(t.trim().length, g.routeId).toBeGreaterThan(0);
        expect(t, g.routeId).not.toContain('ß');
      }
    }
  });

  test('Wirkungen in Worten', () => {
    expect(wirkungZeile('forest_medium', { art: 'gold', menge: 60 })).toBe('+60 Gold');
    expect(wirkungZeile('forest_medium', { art: 'gegenstand', itemId: 'healing_potion', menge: 2 })).toBe('+2× Heiltrank');
    expect(wirkungZeile('forest_medium', { art: 'leben', prozent: 10 })).toBe('Alle −10 % Leben');
    expect(wirkungZeile('forest_medium', { art: 'gegner', prozent: 25, kaempfe: 1 })).toBe('Gegner im nächsten Kampf 25 % stärker');
    expect(wirkungZeile('forest_medium', { art: 'gegner', prozent: -20, kaempfe: 2 })).toBe('Gegner der nächsten 2 Kämpfe 20 % schwächer');
    expect(wirkungZeile('forest_medium', { art: 'boss', prozent: 15 })).toBe('Uralter Treant 15 % stärker');
    expect(wirkungZeile('forest_medium', { art: 'setTeil' })).toBe(`${setFuerRoute('forest_medium')!.zeichen} +1 Set-Teil, wenn ihr siegt`);
    // Beute mit Kampf-Gefahr sagt, wann sie kommt
    const texte = (wirkung: Wirkung[]) => folgenZeilen('forest_medium', wirkung).map(z => z.text);
    expect(texte([{ art: 'gold', menge: 60 }, { art: 'gegner', prozent: 25, kaempfe: 1 }]))
      .toEqual(['+60 Gold nach dem Kampf', 'Gegner im nächsten Kampf 25 % stärker']);
    expect(texte([{ art: 'gold', menge: 120 }, { art: 'gegner', prozent: 30, kaempfe: 2 }])[0]).toBe('+120 Gold nach 2 Kämpfen');
    expect(texte([{ art: 'gegenstand', itemId: 'healing_potion', menge: 2 }, { art: 'boss', prozent: 10 }])[0]).toBe('+2× Heiltrank, wenn ihr siegt');
    expect(texte([{ art: 'gold', menge: 60 }, { art: 'leben', prozent: 10 }])[0]).toBe('+60 Gold');
    expect(texte([{ art: 'gold', menge: 60 }, { art: 'gegner', prozent: -10, kaempfe: 1 }])[0]).toBe('+60 Gold');
    expect(folgenZeilen('forest_medium', [{ art: 'heilen', prozent: 10 }, { art: 'boss', prozent: 15 }]).map(z => z.gefahr)).toEqual([false, true]);
  });
});

describe('Geschichten: Regeln', () => {
  test('Wirkungen ohne Zufall: Gold, Gegenstand, Leben, Gegner, Boss, Set-Teil, XP', () => {
    const { state, system, heroId } = setup();
    const run = system.startExpedition(state, 'forest_medium', [heroId])!;
    const held = run.party[0];
    held.hp = 5000;
    const kampf = (i: number) => run.rooms[i].enemies[0];
    const vorher = { r1: kampf(1).atk, r4: kampf(4).atk, r6hp: kampf(6).maxHp, bossAtk: kampf(8).atk, bossHp: kampf(8).maxHp };
    run.currentRoom = 1;
    run.rooms[1].completed = true;
    const seed = run.rngSeed;
    const log = run.combatLog.length;

    const alles: Wirkung[] = [
      { art: 'gold', menge: 60 }, { art: 'gegenstand', itemId: 'healing_potion', menge: 2 },
      { art: 'heilen', prozent: 10 }, { art: 'leben', prozent: 5 },
      { art: 'gegner', prozent: 50, kaempfe: 2 }, { art: 'boss', prozent: -10 },
      { art: 'setTeil' }, { art: 'xp', menge: 15 },
    ];
    geschichteWirkt(run, alles);

    expect(run.rngSeed).toBe(seed);
    // Gold und Gegenstände warten auf den letzten Kampf, den die Gefahr trifft (Raum 6)
    expect(run.goldEarned).toBe(0);
    expect(run.geschichtsBeute).toEqual([{ raum: 6, gold: 60, dinge: { healing_potion: 2 } }]);
    expect(held.hp).toBe(5000 + 999 - 499);
    // Die nächsten 2 Kämpfe nach Raum 1 sind Raum 4 und 6; der geschaffte Raum 1 bleibt
    expect(kampf(1).atk).toBe(vorher.r1);
    expect(kampf(4).atk).toBe(Math.round(vorher.r4 * 1.5));
    expect(kampf(6).maxHp).toBe(Math.round(vorher.r6hp * 1.5));
    expect(kampf(6).hp).toBe(kampf(6).maxHp);
    expect(kampf(8).atk).toBe(Math.max(1, Math.round(vorher.bossAtk * 0.9)));
    expect(kampf(8).maxHp).toBe(Math.round(vorher.bossHp * 0.9));
    expect(run.setTeilVersprochen).toBe(true);
    expect(run.xpEarned?.[heroId]).toBe(15);
    expect(run.combatLog.slice(log)).toHaveLength(alles.length);
  });

  test('Beute ohne Kampf-Gefahr kommt sofort; Heiltränke und Luftkristalle in den Proviant, Kräuter in die Beute', () => {
    const { state, system, heroId } = setup();
    const run = system.startExpedition(state, 'forest_medium', [heroId])!;
    const proviant = (id: string) => run.provisions.filter(p => p.itemId === id && !p.gifted).reduce((s, p) => s + p.qty, 0);
    const traenke = proviant('healing_potion');
    geschichteWirkt(run, [
      { art: 'gold', menge: 40 }, { art: 'gegenstand', itemId: 'healing_potion', menge: 2 },
      { art: 'gegenstand', itemId: 'air_crystal', menge: 1 }, { art: 'gegenstand', itemId: 'crystal_shard', menge: 3 },
      { art: 'gegenstand', itemId: 'herb_green', menge: 2 },
      { art: 'leben', prozent: 10 }, { art: 'gegner', prozent: -10, kaempfe: 1 },
    ]);
    expect(run.goldEarned).toBe(40);
    expect(proviant('healing_potion')).toBe(traenke + 2);
    expect(proviant('air_crystal')).toBe(1);
    expect(run.loot.healing_potion).toBeUndefined();
    expect(run.loot.crystal_shard).toBe(3);
    // Grüne Kräuter sind ein Rohstoff: im Proviant würden sie nichts bewirken
    expect(proviant('herb_green')).toBe(0);
    expect(run.loot.herb_green).toBe(2);
    expect(run.geschichtsBeute).toBeUndefined();
  });

  test('Beute mit Kampf-Gefahr: nach dem gewonnenen Kampf, beim Boss nur, wenn er tot ist', () => {
    const { state, system, heroId } = setup();
    const run = system.startExpedition(state, 'forest_medium', [heroId])!;
    run.currentRoom = 1;
    run.rooms[1].completed = true;
    geschichteWirkt(run, [{ art: 'gold', menge: 60 }, { art: 'gegner', prozent: 25, kaempfe: 1 }]);
    geschichteWirkt(run, [{ art: 'gegenstand', itemId: 'healing_potion', menge: 2 }, { art: 'boss', prozent: 15 }]);
    expect(run.geschichtsBeute).toEqual([{ raum: 4, gold: 60, dinge: {} }, { raum: 8, gold: 0, dinge: { healing_potion: 2 } }]);
    expect(run.goldEarned).toBe(0);

    // Ein anderer Raum zahlt nichts; stehen die Gegner nach dem Rundenlimit noch, bleibt die Beute liegen
    geschichtsBeuteNachKampf(run, run.rooms[3]);
    geschichtsBeuteNachKampf(run, run.rooms[4]);
    expect(run.goldEarned).toBe(0);
    expect(run.geschichtsBeute?.map(b => b.raum)).toEqual([8]);
    expect(run.combatLog.at(-1)).toContain('bleibt liegen');
    expect(istGeschichtsBeuteZeile(run.combatLog.at(-1)!)).toBe(true);

    // Gegner besiegt: das Gold kommt
    run.geschichtsBeute = [{ raum: 4, gold: 60, dinge: {} }, ...run.geschichtsBeute!];
    for (const g of run.rooms[4].enemies) g.hp = 0;
    geschichtsBeuteNachKampf(run, run.rooms[4]);
    expect(run.goldEarned).toBe(60);
    expect(run.combatLog.at(-1)).toBe('📜 Beute aus der Geschichte: +60 Gold');
    expect(istGeschichtsBeuteZeile(run.combatLog.at(-1)!)).toBe(true);
    expect(istGeschichtsBeuteZeile('📜 Die Spur: Eine Entscheidung steht an.')).toBe(false);

    // Boss am Leben (Rundenlimit): nichts; besiegt: die Tränke kommen in den Proviant
    geschichtsBeuteNachKampf(run, run.rooms[8]);
    expect(run.geschichtsBeute).toEqual([]);
    run.geschichtsBeute = [{ raum: 8, gold: 0, dinge: { healing_potion: 2 } }];
    run.bossesKilled = 1;
    const traenke = run.provisions.filter(p => p.itemId === 'healing_potion' && !p.gifted).reduce((s, p) => s + p.qty, 0);
    geschichtsBeuteNachKampf(run, run.rooms[8]);
    expect(run.provisions.filter(p => p.itemId === 'healing_potion' && !p.gifted).reduce((s, p) => s + p.qty, 0)).toBe(traenke + 2);
    expect(run.geschichtsBeute).toEqual([]);
  });

  test('Leben kostet nie das letzte; Gefallene werden nicht geheilt', () => {
    const { state, system, heroId } = setup();
    const run = system.startExpedition(state, 'forest_short', [heroId])!;
    const held = run.party[0];
    held.hp = 10;
    geschichteWirkt(run, [{ art: 'leben', prozent: 50 }]);
    expect(held.hp).toBe(1);
    held.hp = 0;
    geschichteWirkt(run, [{ art: 'heilen', prozent: 50 }]);
    expect(held.hp).toBe(0);
  });

  test('Ablauf: Entscheidung nach dem Raum, die Wahl wirkt und kommt in die Chronik, nach dem ersten Sieg der Schluss', () => {
    const { state, system, heroId } = setup();
    const geschichte = geschichteVon('forest_short')!;
    const run = system.startExpedition(state, 'forest_short', [heroId])!;
    const raum3Atk = run.rooms[3].enemies[0].atk;

    bisZurGeschichte(state, system, run);
    expect(system.nextStep(run)).toBe('choice');
    expect(run.pendingChoice?.roomIndex).toBe(1);
    expect(run.currentRoom).toBe(1);
    expect(run.rooms[1].completed).toBe(true);
    expect(run.pendingChoice?.optionA.label).toBe(geschichte.wahlen[0].sicher.label);
    expect(run.pendingChoice?.optionB.label).toBe(geschichte.wahlen[0].mutig.label);

    // Mutig: Gold nach dem nächsten Kampf (Raum 3, nach der Rast in Raum 2), der Kampf stärker
    const mutig = geschichte.wahlen[0].mutig.wirkung;
    const beute = mutig.reduce((s, w) => s + (w.art === 'gold' ? w.menge : 0), 0);
    const staerker = mutig.reduce((s, w) => s + (w.art === 'gegner' ? w.prozent : 0), 0);
    const gold = run.goldEarned;
    system.resolveChoice(run, 1);
    expect(run.currentRoom).toBe(2);
    expect(run.goldEarned).toBe(gold);
    expect(run.geschichtsBeute).toEqual([{ raum: 3, gold: beute, dinge: {} }]);
    expect(run.rooms[3].enemies[0].atk).toBe(Math.round(raum3Atk * (1 + staerker / 100)));
    expect(run.chronik).toEqual([geschichte.wahlen[0].mutig.nachklang]);

    bisZurGeschichte(state, system, run);
    expect(run.pendingChoice?.roomIndex).toBe(3);
    expect(run.geschichtsBeute).toEqual([]);
    expect(run.combatLog).toContain(`📜 Beute aus der Geschichte: +${beute} Gold`);
    system.resolveChoice(run, 0);
    bisZurGeschichte(state, system, run);
    expect(run.status).toBe('victory');
    expect(run.chronik).toEqual([geschichte.wahlen[0].mutig.nachklang, geschichte.wahlen[1].sicher.nachklang]);

    const bilanz = geschichtsBilanz(state, run)!;
    expect(bilanz).toEqual({ titel: geschichte.titel, chronik: run.chronik, ende: geschichte.ende, zumErstenMal: true });
    expect(istErlebt(state, 'forest_short')).toBe(true);

    // Beim nächsten Sieg nur noch die Chronik; ohne Entscheidung und Schluss gibt es nichts zu berichten
    expect(geschichtsBilanz(state, run)).toEqual({ titel: geschichte.titel, chronik: run.chronik, ende: undefined, zumErstenMal: false });
    run.chronik = undefined;
    expect(geschichtsBilanz(state, run)).toBeNull();
  });

  test('Niederlage: keine Geschichte erlebt, die Chronik bleibt', () => {
    const { state, system, heroId } = setup();
    const run = system.startExpedition(state, 'forest_short', [heroId])!;
    bisZurGeschichte(state, system, run);
    system.resolveChoice(run, 0);
    run.status = 'defeat';
    const bilanz = geschichtsBilanz(state, run)!;
    expect(bilanz.chronik).toHaveLength(1);
    expect(bilanz.ende).toBeUndefined();
    expect(istErlebt(state, 'forest_short')).toBe(false);
  });

  test('die Einleitung kommt vor dem Aufbruch, bis die Gruppe aufbricht; auch für alte Spielstände', () => {
    const state = createNewGameState();
    delete state.geschichten;
    expect(ungeleseneEinleitung(state, 'cave_deep')?.titel).toBe(geschichteVon('cave_deep')!.titel);
    // «Zurück»: nichts gemerkt, beim nächsten Versuch kommt sie wieder
    expect(ungeleseneEinleitung(state, 'cave_deep')).toBeDefined();
    expect(state.geschichten).toBeUndefined();
    einleitungGelesen(state, 'cave_deep');
    einleitungGelesen(state, 'cave_deep');
    expect(ungeleseneEinleitung(state, 'cave_deep')).toBeUndefined();
    expect(state.geschichten).toEqual({ gelesen: ['cave_deep'], erlebt: [] });
    expect(ungeleseneEinleitung(state, 'gibt_es_nicht')).toBeUndefined();
  });

  test('feste Wahl-Räume (Drachenhort): die Chronik nimmt den Satz zur gewählten Option', () => {
    const { state, system, heroId } = setup();
    const run = system.startExpedition(state, 'drachenhort', [heroId])!;
    for (let i = 0; i < 100 && !run.pendingChoice; i++) {
      if (system.nextStep(run) === 'checkpoint') system.resolveCheckpoint(run, false);
      else system.processCurrentRoom(state);
    }
    expect(run.pendingChoice?.roomIndex).toBe(2);
    expect(istGeschichtsWahl(run.pendingChoice)).toBe(false);
    system.resolveChoice(run, 1);
    expect(run.chronik).toEqual([geschichteVon('drachenhort')!.raumWahlen![2].nachklang.b]);

    // Eine gewöhnliche Wahl (Raum ohne Geschichte) schreibt nichts
    chronikNachWahl(run, 0, 0, { label: 'Rasten', flavorText: '', effect: 'heal', value: 10 });
    expect(run.chronik).toHaveLength(1);
  });

  test('versprochenes Set-Teil: ein Teil mehr in der Truhe, beim ersten Sieg zwei verschiedene', () => {
    const { state, system, heroId } = setup();
    const sieg = (seed: number, versprochen: boolean): ExpeditionRun => {
      const run = system.startExpedition(state, 'forest_ruins', [heroId])!;
      state.activeExpedition = null;
      Object.assign(run, { rngSeed: seed, status: 'victory', setTeilVersprochen: versprochen || undefined });
      return run;
    };
    const [a, b, c] = setTeilIds(setFuerRoute('forest_ruins')!);

    // Erster Sieg: das sichere Teil und das versprochene, zwei verschiedene, der Reihe nach gezählt
    const erster = sieg(1, true);
    const teile = setBeute(state, erster);
    expect(teile).toHaveLength(2);
    expect(new Set(teile).size).toBe(2);
    for (const id of teile) expect([a, b, c]).toContain(id);
    expect(erster.loot[teile[0]]).toBe(1);
    expect(erster.loot[teile[1]]).toBe(1);
    expect(erster.combatLog.at(-1)).toContain('Versprochenes Set-Teil');
    expect(Object.values(setTeilHinweise(state, teile)).map(h => h.split(' · ').at(-1))).toEqual(['Teil 1 von 3', 'Teil 2 von 3']);
    expect(setBeute(state, erster)).toEqual(teile);

    // Danach: ohne Versprechen nur mit Glück, mit Versprechen immer eins mehr
    state.globalStock[a] = 1;
    let mitGlueck = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const ohne = setBeute(state, sieg(seed, false));
      const mit = setBeute(state, sieg(seed, true));
      expect(mit.length, `Seed ${seed}`).toBe(ohne.length + 1);
      mitGlueck += ohne.length;
    }
    expect(mitGlueck).toBeGreaterThan(0);
    expect(mitGlueck).toBeLessThan(20);

    // Alle drei da: das versprochene Teil passt für einen zweiten Helden
    state.globalStock[b] = 1;
    state.globalStock[c] = 1;
    const voll = setBeute(state, sieg(3, true));
    expect(voll.length).toBeGreaterThanOrEqual(1);
    expect(setTeilHinweise(state, voll)[voll[0]]).toContain('schon da');
  });

  test('versprochenes Set-Teil nur, wenn der Boss besiegt ist, nicht nach dem Rundenlimit', () => {
    const { state, system, heroId } = setup();
    for (const [bossesKilled, anzahl] of [[0, 1], [1, 2]] as const) {
      const run = system.startExpedition(state, 'forest_medium', [heroId])!;
      state.activeExpedition = null;
      Object.assign(run, { rngSeed: 5, status: 'victory', setTeilVersprochen: true, bossesKilled });
      // Das erste Teil eines Sets ist sicher, das versprochene kommt nur mit totem Boss dazu
      expect(setBeute(state, run), `Bosse besiegt: ${bossesKilled}`).toHaveLength(anzahl);
    }
  });

  test('Sumpfdorf: nach der Entscheidung in Raum 2 folgt der Kontrollpunkt', () => {
    const { state, system, heroId } = setup();
    const run = system.startExpedition(state, 'swamp_village', [heroId])!;
    bisZurGeschichte(state, system, run);
    system.resolveChoice(run, 0);
    bisZurGeschichte(state, system, run);
    expect(run.pendingChoice?.roomIndex).toBe(2);
    system.resolveChoice(run, 1);
    expect(system.nextStep(run)).toBe('checkpoint');
    system.resolveCheckpoint(run, false);
    expect(run.currentRoom).toBe(3);
    bisZurGeschichte(state, system, run);
    expect(run.status).toBe('victory');
    expect(run.chronik).toHaveLength(2);
  });

  test('Musterlauf: vorsichtig nimmt den sicheren Weg, gierig den mutigen', () => {
    for (const [spielweise, art] of [['vorsichtig', 'sicher'], ['gierig', 'mutig']] as const) {
      const { state, ids } = musterStand('stark', 7919);
      const run = spieleRoute(state, ids, 'forest_short', spielweise);
      expect(run.status).toBe('victory');
      expect(run.chronik).toEqual(geschichteVon('forest_short')!.wahlen.map(w => w[art].nachklang));
    }
  });
});
