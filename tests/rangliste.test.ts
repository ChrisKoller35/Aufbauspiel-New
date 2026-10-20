import { describe, test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { DUNGEON_GRAPH, ROUTE_DEFS, isRouteCompleted } from '../src/data/routes';
import { RIVALEN } from '../src/data/rivalen';
import { setFuerRoute, setTeilIds } from '../src/data/dungeonSets';
import { bezwungeneDungeons } from '../src/systems/Bezwungen';
import {
  RUHMESTRUHEN, besterRuhmDungeon, belohnungenAbholen, dungeonSterne, expeditionsRuhm, gildenAufKarte, gipfelRangliste,
  naechsteBedrohung, neuigkeiten, ranglisteKurz, ranglisteNachExpedition, ranglisteStand, rivalenLauf, ruhmJeSieg,
  ruhmestruhe, spielerEbenen, truhenDungeon, wocheVon, wochenRangliste,
} from '../src/systems/Rangliste';
import { DUNGEON_IM_SATZ, dungeonWen, imDungeon } from '../src/data/dungeonNamen';

/** Montag, 2. November 2026, 10:00 (Ortszeit) */
const MONTAG = new Date(2026, 10, 2, 10, 0).getTime();
const TAG = 86_400_000;

/** Neues Spiel mit festem Samen und diesen bezwungenen Dungeons (wie aus einem älteren Spielstand) */
function spielstand(bezwungen: string[] = [], samen = 12345): GameState {
  const state = createNewGameState();
  state.rngSeed = samen;
  state.guildStats.bossesDefeatedIds = bezwungen.map(id => ROUTE_DEFS[id].bossId).filter((b): b is string => !!b);
  state.scoreboard = bezwungen.map(routeId => ({
    routeId, score: 100, difficulty: 'normal', modifier: null, status: 'victory' as const,
    partyClasses: [], timestamp: 0, day: 1, enemiesKilled: 0, bossesKilled: ROUTE_DEFS[routeId].bossId ? 1 : 0,
  }));
  return state;
}

/** Eine beendete Expedition, so weit die Rangliste sie liest */
function lauf(routeId: string, status: ExpeditionRun['status'], geschafft = ROUTE_DEFS[routeId].rooms, bossesKilled?: number): ExpeditionRun {
  const anzahl = ROUTE_DEFS[routeId].rooms;
  const mitBoss = !!ROUTE_DEFS[routeId].bossId;
  const rooms = Array.from({ length: anzahl }, (_, i) => ({
    index: i, type: mitBoss && i === anzahl - 1 ? 'boss' : 'combat', completed: i < geschafft,
  }));
  return {
    routeId, status, rooms, bossesKilled: bossesKilled ?? (mitBoss && status === 'victory' ? 1 : 0),
  } as unknown as ExpeditionRun;
}

/** Spielt Expeditionen ohne neuen Sieg (Rückzug nach dem ersten Raum im Waldpfad) */
function runden(state: GameState, anzahl: number, jetzt = MONTAG): void {
  for (let i = 0; i < anzahl; i++) ranglisteNachExpedition(state, lauf('forest_short', 'retreat', 1), jetzt);
}

describe('Rangliste: Rivalen', () => {
  test('neun Gilden mit eigenem Namen, Wappen und Tempo', () => {
    expect(RIVALEN).toHaveLength(9);
    expect(new Set(RIVALEN.map(r => r.id)).size).toBe(9);
    expect(new Set(RIVALEN.map(r => r.wappen)).size).toBe(9);
    for (const r of RIVALEN) {
      expect(r.tempo, r.id).toBeGreaterThan(0);
      expect(r.wochenSiege, r.id).toBeGreaterThan(0);
      expect(r.motto.length, r.id).toBeGreaterThan(0);
    }
  });

  test('zehn Gilden in der Gipfel-Rangliste, die eigene Gilde einmal', () => {
    const state = spielstand();
    const gipfel = gipfelRangliste(state, MONTAG);
    expect(gipfel).toHaveLength(10);
    expect(gipfel.filter(g => g.spieler)).toHaveLength(1);
  });

  test('fester Zufall: gleicher Samen, gleiches Rennen; nach dem Neuladen steht jede Gilde am selben Ort', () => {
    const a = spielstand(['forest_short']);
    const b = spielstand(['forest_short']);
    runden(a, 40);
    runden(b, 40);
    expect(gipfelRangliste(a, MONTAG)).toEqual(gipfelRangliste(b, MONTAG));

    const geladen: GameState = JSON.parse(JSON.stringify(a));
    expect(gipfelRangliste(geladen, MONTAG)).toEqual(gipfelRangliste(a, MONTAG));
  });

  test('keine Gilde fällt je zurück', () => {
    const state = spielstand(['forest_short', 'forest_medium']);
    let vorher = new Map(gipfelRangliste(state, MONTAG).map(g => [g.id, g.bezwungen]));
    for (let i = 0; i < 30; i++) {
      runden(state, 5);
      const jetzt = new Map(gipfelRangliste(state, MONTAG).map(g => [g.id, g.bezwungen]));
      for (const [id, alt] of vorher) expect(jetzt.get(id), id).toEqual(expect.arrayContaining(alt));
      vorher = jetzt;
    }
  });

  test('Ebenen-Grenze: die Rivalen bleiben nah an der eigenen Gilde', () => {
    const state = spielstand(['forest_short', 'forest_medium']); // höchste Ebene 2
    runden(state, 300);
    for (const g of gipfelRangliste(state, MONTAG).filter(x => !x.spieler)) {
      const rivale = RIVALEN.find(r => r.id === g.id)!;
      expect(g.ebene, g.id).toBeLessThanOrEqual(2 + rivale.ebeneUeberDir);
    }
  });

  test('wer weiterkommt, zieht die Rivalen mit: neue Ebene, neue Dungeons für sie', () => {
    const state = spielstand(['forest_short', 'forest_medium']);
    runden(state, 100);
    const sturmadler = (): number => gipfelRangliste(state, MONTAG).find(g => g.id === 'sturmadler')!.ebene;
    expect(sturmadler()).toBe(3);
    // Die eigene Gilde bezwingt den Giftsumpf (Ebene 3): Die Spitze darf auf Ebene 4
    ranglisteNachExpedition(state, lauf('swamp_long', 'victory'), MONTAG);
    runden(state, 100);
    expect(sturmadler()).toBe(4);
  });

  test('neuer Dungeon auf der Karte: zählt erst ab der nächsten Runde, keine Gilde springt sofort hinauf', () => {
    const state = spielstand(['forest_short']);
    runden(state, 20);
    const stand = ranglisteStand(state, MONTAG);
    // So, als wäre der Drachenhort eben erst dazugekommen
    delete stand.bekannt.drachenhort;
    ranglisteStand(state, MONTAG);
    expect(stand.bekannt.drachenhort).toBe(21);
    const ebenen = spielerEbenen(state);
    for (const rivale of RIVALEN) {
      const sieg = rivalenLauf(rivale, stand, ebenen, 2000).siege.find(s => s.routeId === 'drachenhort');
      if (sieg) expect(sieg.runde, rivale.id).toBeGreaterThan(21);
    }
  });

  test('Start im Probespiel: die Rivalen messen sich an den Bossen bis Ebene 4', () => {
    const state = createNewGameState();
    richteProbespielEin(state);
    const stand = ranglisteStand(state, MONTAG);
    expect(stand.startEbene).toBe(4);
    expect(stand.startSterne).toBeGreaterThanOrEqual(20);
    const gipfel = gipfelRangliste(state, MONTAG);
    // Nur die Gilden mit einer Ebene mehr dürfen schon über dem Vulkankern stehen
    for (const g of gipfel.filter(x => !x.spieler)) {
      const rivale = RIVALEN.find(r => r.id === g.id)!;
      expect(g.ebene, g.id).toBeLessThanOrEqual(4 + rivale.ebeneUeberDir);
    }
    expect(gipfel.findIndex(g => g.spieler)).toBeLessThan(5);
  });

  test('Vorschau: wer bald vorbeizieht, zieht wirklich vorbei', () => {
    const state = spielstand(['forest_short', 'forest_ruins']);
    const bedrohung = naechsteBedrohung(state, MONTAG);
    expect(bedrohung).not.toBeNull();
    const platz = (): number => gipfelRangliste(state, MONTAG).findIndex(g => g.id === bedrohung!.gilde.id);
    const du = (): number => gipfelRangliste(state, MONTAG).findIndex(g => g.spieler);
    runden(state, bedrohung!.runden - 1);
    expect(platz()).toBeGreaterThan(du());
    runden(state, 1);
    expect(platz()).toBeLessThan(du());
  });

  test('Karte: jede Gilde mit einem Sieg steht genau einmal, auf ihrem höchsten Dungeon', () => {
    const state = spielstand(['forest_short', 'forest_medium']);
    runden(state, 50);
    const karte = gildenAufKarte(state, MONTAG);
    const alle = [...karte.values()].flat();
    expect(new Set(alle.map(g => g.id)).size).toBe(alle.length);
    for (const [routeId, gilden] of karte) for (const g of gilden) expect(g.hoechster).toBe(routeId);
    expect(alle.some(g => g.spieler)).toBe(true);
  });
});

describe('Rangliste: Ruhm und eigene Siege', () => {
  test('Ruhm: Ebene mal Räume, ein Sieg doppelt, der erste Sieg noch einmal doppelt', () => {
    const tiefwald = ROUTE_DEFS.forest_medium; // Ebene 2, mit Boss
    expect(expeditionsRuhm(lauf('forest_medium', 'victory'), false)).toBe(2 * tiefwald.rooms * 2);
    expect(expeditionsRuhm(lauf('forest_medium', 'victory'), true)).toBe(2 * tiefwald.rooms * 4);
    expect(ruhmJeSieg('forest_medium')).toBe(2 * tiefwald.rooms * 2);
    expect(expeditionsRuhm(lauf('forest_medium', 'retreat', 4), false)).toBe(2 * 4);
    // Bei einer Niederlage zählt der Raum nicht, in dem die Gruppe fiel
    expect(expeditionsRuhm(lauf('forest_medium', 'defeat', 4), false)).toBe(2 * 3);
  });

  test('erster echter Sieg: Merker mit Runde, doppelter Ruhm; der zweite Sieg zählt einfach', () => {
    const state = spielstand();
    const erster = ranglisteNachExpedition(state, lauf('forest_short', 'victory'), MONTAG);
    expect(erster.erstbezwingung).toBe(true);
    expect(erster.ruhm).toBe(1 * ROUTE_DEFS.forest_short.rooms * 4);
    expect(state.bezwungen?.forest_short).toBe(1);
    expect(state.rangliste?.runde).toBe(1);
    const zweiter = ranglisteNachExpedition(state, lauf('forest_short', 'victory'), MONTAG);
    expect(zweiter.erstbezwingung).toBe(false);
    expect(zweiter.wocheRuhm).toBe(erster.ruhm + zweiter.ruhm);
    expect(state.rangliste?.runde).toBe(2);
  });

  test('Sieg nach dem Rundenlimit ohne besiegten Boss: nicht bezwungen, kein doppelter Ruhm', () => {
    const state = spielstand(['forest_short']);
    const bilanz = ranglisteNachExpedition(state, lauf('forest_medium', 'victory', ROUTE_DEFS.forest_medium.rooms, 0), MONTAG);
    expect(bilanz.erstbezwingung).toBe(false);
    expect(bilanz.ruhm).toBe(2 * ROUTE_DEFS.forest_medium.rooms);
    expect(isRouteCompleted('forest_medium', state)).toBe(false);
  });

  test('der Merker vergisst nichts, auch wenn frühe Siege aus der Bestenliste fallen', () => {
    const state = spielstand(['forest_short', 'forest_ruins']);
    bezwungeneDungeons(state);
    state.scoreboard = [];
    expect(isRouteCompleted('forest_ruins', state)).toBe(true);
    expect(gipfelRangliste(state, MONTAG).find(g => g.spieler)!.sterne).toBe(2);
  });

  test('ohne Merker (älterer Spielstand) zählen nur echte Siege der Bestenliste', () => {
    const state = spielstand(['forest_short']);
    state.scoreboard.push({ ...state.scoreboard[0], routeId: 'forest_medium', bossesKilled: 0 });
    expect(state.bezwungen).toBeUndefined();
    expect(isRouteCompleted('forest_short', state)).toBe(true);
    expect(isRouteCompleted('forest_medium', state)).toBe(false);
  });

  test('älterer Spielstand ohne Rangliste: Kurzfassung legt alles an', () => {
    const state = spielstand(['forest_short', 'forest_medium', 'cave_deep']);
    expect(state.rangliste).toBeUndefined();
    const kurz = ranglisteKurz(state, MONTAG);
    expect(kurz.gilden).toBe(10);
    expect(kurz.platz).toBeGreaterThanOrEqual(1);
    expect(state.rangliste?.startSterne).toBe(1 + 2 + 2);
    expect(state.bezwungen).toEqual({ forest_short: 0, forest_medium: 0, cave_deep: 0 });
  });

  test('Expedition bis zum Ende gespielt: Bilanz im Ergebnis, Sieg im Merker', () => {
    const state = createNewGameState();
    const hero = createGuildFighter(1, 'guardian', 'Testheld', {
      hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1,
    });
    state.fighters.push(hero);
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    const run = system.startExpedition(state, 'forest_short', [hero.id])!;
    for (let i = 0; i < 100; i++) {
      const step = system.nextStep(run);
      if (step === 'finish') break;
      if (step === 'checkpoint') system.resolveCheckpoint(run, false);
      else if (step === 'merchant') system.merchantSkip(run);
      else if (step === 'choice') system.resolveChoice(run, 0);
      else system.processCurrentRoom(state);
    }
    expect(run.status).toBe('victory');
    const progress = finalizeExpeditionProgress(state, run, system);
    expect(progress.rangliste.erstbezwingung).toBe(true);
    expect(progress.rangliste.ruhm).toBe(run.rooms.length * 4);
    expect(state.bezwungen?.forest_short).toBe(1);
  });

  test('Neuigkeiten: der eigene Sieg steht drin, neueste zuerst', () => {
    const state = spielstand(['forest_short']);
    runden(state, 10);
    ranglisteNachExpedition(state, lauf('forest_ruins', 'victory'), MONTAG);
    const news = neuigkeiten(state, MONTAG, 20);
    const meine = news.find(n => n.spieler);
    expect(meine?.text).toContain(ROUTE_DEFS.forest_ruins.name);
    expect(meine?.vor).toBe(0);
    for (let i = 1; i < news.length; i++) expect(news[i].vor).toBeGreaterThanOrEqual(news[i - 1].vor);
  });
});

describe('Rangliste: Wochenwertung', () => {
  test('Kalenderwoche nach ISO, Montag bis Sonntag', () => {
    const woche = wocheVon(MONTAG + 3 * TAG);
    expect(woche.id).toBe('2026-W45');
    expect(new Date(woche.start).getDay()).toBe(1);
    expect(woche.ende - woche.start).toBeGreaterThanOrEqual(7 * TAG - 3_600_000);
    expect(wocheVon(new Date(2027, 0, 1, 12).getTime()).id).toBe('2026-W53');
  });

  test('Wochenruhm der Rivalen: ab Montag fest, gemessen an Siegen im besten eigenen Dungeon', () => {
    const state = spielstand(['forest_short', 'forest_medium', 'swamp_long']);
    ranglisteStand(state, wocheVon(MONTAG).start); // Start ganz am Anfang der Woche
    const ziele = { ...state.rangliste!.woche.ziele };
    const ruhm = ruhmJeSieg(besterRuhmDungeon(state));
    expect(besterRuhmDungeon(state)).toBe('swamp_long');
    for (const r of RIVALEN) {
      expect(ziele[r.id], r.id).toBeGreaterThanOrEqual(r.wochenSiege * ruhm * (1 - r.laune * 0.375) - 10);
      expect(ziele[r.id], r.id).toBeLessThanOrEqual(r.wochenSiege * ruhm * (1 + r.laune * 0.375) + 10);
    }
    runden(state, 50, MONTAG + 2 * TAG);
    expect(state.rangliste!.woche.ziele).toEqual(ziele);
  });

  test('Wochenwechsel: Ergebnis im Verlauf, Ruhmestruhe für die Spitze, einmal abholen', () => {
    const state = spielstand(['forest_short', 'forest_medium']);
    ranglisteStand(state, MONTAG);
    state.rangliste!.woche.ruhm = 1_000_000;
    expect(wochenRangliste(state, MONTAG).zeilen[0].spieler).toBe(true);

    const naechsteWoche = MONTAG + 7 * TAG;
    const kurz = ranglisteKurz(state, naechsteWoche);
    expect(kurz.offen).toBe(1);
    const stand = state.rangliste!;
    expect(stand.verlauf[0]).toMatchObject({ wocheId: '2026-W45', platz: 1, pokal: 'gold' });
    expect(stand.woche.id).toBe('2026-W46');
    expect(stand.woche.ruhm).toBe(0);

    const truhe = stand.offen[0].belohnung;
    expect(truhe.crystal_shard).toBe(RUHMESTRUHEN[0].kristalle);
    expect(truhe.gold).toBeGreaterThan(0);
    // Platz 1: genau ein Teil aus dem Set des höchsten bezwungenen Dungeons mit Boss
    const set = setFuerRoute(truhenDungeon(state))!;
    expect(Object.keys(truhe).filter(id => setTeilIds(set).includes(id))).toHaveLength(1);
    const lager = { ...state.globalStock };
    const abgeholt = belohnungenAbholen(state, naechsteWoche);
    expect(abgeholt).toHaveLength(1);
    for (const [id, menge] of Object.entries(truhe)) expect(state.globalStock[id]).toBe((lager[id] ?? 0) + menge);
    expect(stand.pokale.gold).toBe(1);
    expect(belohnungenAbholen(state, naechsteWoche)).toEqual([]);
    expect(stand.pokale.gold).toBe(1);
  });

  test('Ruhmestruhe: Platz 1 bringt das fehlende Set-Teil, Platz 2 und 3 kein Set-Teil, Platz 4 nichts', () => {
    const state = spielstand(['forest_short', 'forest_medium']);
    const set = setFuerRoute(truhenDungeon(state))!;
    const [a, b, c] = setTeilIds(set);
    state.globalStock[a] = 1;
    state.globalStock[b] = 1;
    for (let i = 0; i < 20; i++) expect(ruhmestruhe(state, 1, `probe-${i}`).belohnung[c]).toBe(1);
    // Hat die Gilde alle drei, kommt eins doppelt (für einen zweiten Helden)
    state.globalStock[c] = 1;
    const doppelt = ruhmestruhe(state, 1, 'probe').belohnung;
    expect(Object.keys(doppelt).filter(id => setTeilIds(set).includes(id))).toHaveLength(1);
    for (const platz of [2, 3]) {
      const { belohnung, pokal } = ruhmestruhe(state, platz, 'probe');
      expect(pokal).toBe(RUHMESTRUHEN[platz - 1].pokal);
      expect(belohnung.crystal_shard).toBe(RUHMESTRUHEN[platz - 1].kristalle);
      expect(Object.keys(belohnung).some(id => setTeilIds(set).includes(id))).toBe(false);
    }
    expect(ruhmestruhe(state, 4, 'probe')).toEqual({ pokal: null, belohnung: {} });
    // Gleicher Samen, gleiche Truhe: Neuladen würfelt nicht neu
    expect(ruhmestruhe(state, 2, 'samen')).toEqual(ruhmestruhe(state, 2, 'samen'));
  });

  test('ohne Ruhm in der Woche: kein Ergebnis, keine Truhe', () => {
    const state = spielstand(['forest_short']);
    ranglisteStand(state, MONTAG);
    ranglisteStand(state, MONTAG + 14 * TAG);
    expect(state.rangliste!.verlauf).toEqual([]);
    expect(state.rangliste!.offen).toEqual([]);
  });

  test('ab Platz 4 gibt es keine Truhe', () => {
    const state = spielstand(['forest_short']);
    ranglisteStand(state, MONTAG);
    state.rangliste!.woche.ruhm = 1;
    ranglisteStand(state, MONTAG + 7 * TAG);
    expect(state.rangliste!.verlauf[0].platz).toBeGreaterThan(3);
    expect(state.rangliste!.verlauf[0].pokal).toBeNull();
    expect(state.rangliste!.offen).toEqual([]);
  });

  test('jede Ebene der Karte hat Ruhm, und alle Dungeons stehen auf der Karte', () => {
    for (const n of DUNGEON_GRAPH) expect(ruhmJeSieg(n.routeId), n.routeId).toBe(dungeonSterne(n.routeId) * ROUTE_DEFS[n.routeId].rooms * 2);
  });
});

describe('Rangliste: Dungeon-Namen im Satz', () => {
  test('jeder Dungeon der Karte hat seine Formen für «ein Sieg im …» und «bezwingt den …»', () => {
    for (const n of DUNGEON_GRAPH) {
      const satz = DUNGEON_IM_SATZ[n.routeId];
      expect(satz, `${n.routeId}: Zeile in src/data/dungeonNamen.ts fehlt`).toBeDefined();
      expect(satz.wo, n.routeId).toMatch(/^(im|am|in der|in den|an der|an den) \S/);
      expect(satz.wen, n.routeId).toMatch(/^(den|die|das) \S/);
    }
    expect(imDungeon('volcano_core')).toBe('im Vulkankern');
    expect(dungeonWen('drachenhort')).toBe('den Drachenhort');
  });

  test('ohne Zeile: Formen aus dem Namen', () => {
    const name = (routeId: string, text: string): string => {
      ROUTE_DEFS[routeId] = { ...ROUTE_DEFS.forest_short, id: routeId, name: text };
      return `${imDungeon(routeId)} | ${dungeonWen(routeId)}`;
    };
    try {
      expect(name('probe_der', 'Der Sternenturm')).toBe('im Sternenturm | den Sternenturm');
      expect(name('probe_das', 'Das Wolkenschloss')).toBe('im Wolkenschloss | das Wolkenschloss');
      expect(name('probe_die', 'Die Bastion')).toBe('in der Bastion | die Bastion');
      expect(name('probe_mehr', 'Die Himmelsgärten')).toBe('in den Himmelsgärten | die Himmelsgärten');
      expect(name('probe_ohne', 'Sternwarte (kurz)')).toBe('in Sternwarte | Sternwarte');
    } finally {
      for (const id of ['probe_der', 'probe_das', 'probe_die', 'probe_mehr', 'probe_ohne']) delete ROUTE_DEFS[id];
    }
  });
});
