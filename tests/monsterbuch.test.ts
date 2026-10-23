// ─── Monsterbuch: Zählen, Strecke, Seiten, Stufen, Prämien ──────
// Mit echten Läufen über das ExpeditionSystem und den echten Routen
// und Gegnern (docs/MONSTERBUCH.md). Keine erfundenen Gegner oder Routen.
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { SaveSystem, pruefeSpielstandText } from '../src/systems/SaveSystem';
import { CombatEngine } from '../src/systems/CombatEngine';
import { BestiariumSystem } from '../src/systems/BestiariumSystem';
import { SeededRNG } from '../src/utils/RNG';
import { DUNGEON_GRAPH, ROUTE_DEFS } from '../src/data/routes';
import { ENEMY_DEFS } from '../src/data/enemies';
import { LOOT_TABLE_DEFS } from '../src/data/lootTables';
import { musterStand } from '../src/systems/Musterlauf';
import {
  FAEHIGKEIT_ART, SCHWELLEN, anzahlBesiegt, beuteChancen, erreichbareGegner, gesichtet, goldSpanne, praemieAbgeholt,
  praemieAbholen, praemieBetrag, praemieFaellig, praemieGrundbetrag, praemien, seiten, seitenStand, siegeBis, strecke, stufe,
} from '../src/systems/Monsterkunde';

/** Neues Spiel wie main.ts beim ersten Start: ein Guardian. */
function neuesSpiel(): { state: GameState; ids: number[] } {
  const state = createNewGameState();
  placeStartingLayout(state);
  return { state, ids: state.fighters.map(f => f.id) };
}

/**
 * Ein Lauf wie `aufbrechen` (ExpeditionFlow.ts) und `spieleRoute` (Musterlauf.ts): Kontrollpunkt weiter,
 * Händler übergehen, bei einer Wahl Option A. Mit `rueckzugVorRaum` zieht sich das Team zurück, sobald
 * dieser Raum als nächster dran wäre. Danach wie `finishExpedition`: finalizeExpeditionProgress.
 */
function lauf(state: GameState, ids: number[], routeId: string, rueckzugVorRaum?: number): ExpeditionRun {
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  state.activeExpedition = null;
  const run = system.startExpedition(state, routeId, ids, 'normal', null, false, []);
  if (!run) throw new Error(`Route ${routeId} lässt sich nicht starten`);
  for (let schritt = 0; schritt < 500; schritt++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') system.resolveChoice(run, 0);
    else if (rueckzugVorRaum !== undefined && run.currentRoom >= rueckzugVorRaum) {
      system.retreat(run);
      break;
    } else system.processCurrentRoom(state);
  }
  finalizeExpeditionProgress(state, run, system);
  state.activeExpedition = null;
  return run;
}

/** Besiegte Gegner (hp <= 0) je ID in den gespielten Räumen eines Laufs. */
function besiegteImLauf(run: ExpeditionRun): Record<string, number> {
  const zahl: Record<string, number> = {};
  for (const room of run.rooms) {
    if (!room.completed) continue;
    for (const e of room.enemies) if (e.defId && e.hp <= 0) zahl[e.defId] = (zahl[e.defId] ?? 0) + 1;
  }
  return zahl;
}

describe('Zählen: nur gespielte Räume', () => {
  it('Rückzug nach Raum 2: der Boss ist nicht gesichtet, die Gegner der zwei Räume schon', () => {
    // Ein starkes Team, damit es Raum 2 sicher übersteht (der einzelne Guardian fällt im Tiefwald)
    const { state, ids } = musterStand('stark', 7919);
    const route = ROUTE_DEFS.forest_medium;
    expect(route.bossId).toBe('boss_elder_treant');
    const run = lauf(state, ids, 'forest_medium', 2);
    expect(run.status).toBe('retreat');
    expect(run.rooms.filter(r => r.completed).map(r => r.index)).toEqual([0, 1]);
    for (const id of [...route.encounters[0].enemies!, ...route.encounters[1].enemies!]) {
      expect(gesichtet(state, id)).toBe(true);
    }
    expect(state.bestiarium.discovered).not.toContain('boss_elder_treant');
    expect(gesichtet(state, 'boss_elder_treant')).toBe(false);
    // Gegner, die nur in späteren Räumen leben, auch nicht
    for (const id of ['forest_wisp', 'forest_shaman']) {
      if (!route.encounters.slice(0, 2).some(enc => enc.enemies?.includes(id))) {
        expect(gesichtet(state, id)).toBe(false);
      }
    }
  });

  it('Niederlage: die Gegner des Todesraums sind gesichtet, die danach nicht', () => {
    const { state, ids } = neuesSpiel();
    const run = lauf(state, ids, 'himmelsarchiv');
    expect(run.status).toBe('defeat');
    const gespielt = run.rooms.filter(r => r.completed);
    const todesraum = gespielt[gespielt.length - 1];
    expect(todesraum.enemies.length).toBeGreaterThan(0);
    for (const e of todesraum.enemies) expect(gesichtet(state, e.defId!)).toBe(true);
    const gesehen = new Set(gespielt.flatMap(r => r.enemies.map(e => e.defId)));
    const spaeter = run.rooms.filter(r => !r.completed).flatMap(r => r.enemies.map(e => e.defId!)).filter(id => !gesehen.has(id));
    expect(spaeter).toContain('boss_oberarchivar');
    for (const id of spaeter) expect(gesichtet(state, id)).toBe(false);
  });

  it('Strecke = Zahl der Gegner mit hp <= 0, zwei Wölfe im Raum zählen 2', () => {
    const { state, ids } = neuesSpiel();
    const run = lauf(state, ids, 'forest_short');
    const erwartet = besiegteImLauf(run);
    expect(Object.keys(erwartet).length).toBeGreaterThan(0);
    expect(strecke(state)).toEqual(erwartet);
    // Ein zweiter Lauf zählt dazu
    const run2 = lauf(state, ids, 'forest_short');
    const zwei = besiegteImLauf(run2);
    for (const id of new Set([...Object.keys(erwartet), ...Object.keys(zwei)])) {
      expect(anzahlBesiegt(state, id)).toBe((erwartet[id] ?? 0) + (zwei[id] ?? 0));
    }
    // Die Listen für Erfolge und Stadtweg bleiben Listen von IDs
    expect(state.bestiarium.defeated.every(id => typeof id === 'string')).toBe(true);
    expect(state.bestiarium.discovered.every(id => typeof id === 'string')).toBe(true);
  });
});

/** Die erreichbaren Gegner, direkt aus ROUTE_DEFS gerechnet (nicht über Monsterkunde) */
function ausRouten(): Set<string> {
  return new Set(Object.values(ROUTE_DEFS).flatMap(r => r.encounters.flatMap(e => e.enemies ?? [])));
}

describe('Erreichbarkeit aus ROUTE_DEFS', () => {
  it('das Monsterbuch zählt genau die Gegner, die in einer Route vorkommen', () => {
    const erwartet = ausRouten();
    expect(new Set(erreichbareGegner())).toEqual(erwartet);
    expect(erreichbareGegner().length).toBe(erwartet.size);
    expect(new BestiariumSystem().getProgress(createNewGameState()).total).toBe(erwartet.size);
    // monsterbuch_50 bleibt erreichbar
    expect(erwartet.size).toBeGreaterThanOrEqual(50);
    // Die unerreichbaren zählen nicht mit, auch wenn sie in einem alten Stand stehen
    const state = createNewGameState();
    const unerreichbar = Object.keys(ENEMY_DEFS).filter(id => !erwartet.has(id));
    expect(unerreichbar.length).toBe(Object.keys(ENEMY_DEFS).length - erwartet.size);
    state.bestiarium.discovered = [...unerreichbar];
    state.bestiarium.defeated = [...unerreichbar];
    expect(new BestiariumSystem().getProgress(state)).toEqual({ discovered: 0, defeated: 0, total: erwartet.size });
  });

  it('eine Seite je Dungeon in der Reihenfolge der Karte, jeder Gegner auf jeder seiner Seiten', () => {
    const graph = DUNGEON_GRAPH.map(n => n.routeId).filter(id => ROUTE_DEFS[id].encounters.some(e => e.enemies?.length));
    expect(seiten().map(s => s.routeId)).toEqual(graph);
    for (const seite of seiten()) {
      expect(seite.name).toBe(ROUTE_DEFS[seite.routeId].name);
      const inRoute = new Set(ROUTE_DEFS[seite.routeId].encounters.flatMap(e => e.enemies ?? []));
      expect(new Set(seite.gegner)).toEqual(inRoute);
    }
  });

  it('jede Seite ist mit höchstens 10 Siegen erforscht und mit höchstens 30 gemeistert', () => {
    for (const seite of seiten()) {
      const zahl: Record<string, number> = {};
      for (const enc of ROUTE_DEFS[seite.routeId].encounters) for (const id of enc.enemies ?? []) zahl[id] = (zahl[id] ?? 0) + 1;
      const bis = (ziel: 'erforscht' | 'gemeistert') => Math.max(...Object.entries(zahl).map(([id, n]) =>
        Math.ceil((ENEMY_DEFS[id].isBoss ? SCHWELLEN.boss : SCHWELLEN.normal)[ziel] / n)));
      expect(siegeBis(seite.routeId, 'erforscht')).toBe(bis('erforscht'));
      expect(siegeBis(seite.routeId, 'gemeistert')).toBe(bis('gemeistert'));
      expect(bis('erforscht'), seite.routeId).toBeLessThanOrEqual(10);
      expect(bis('gemeistert'), seite.routeId).toBeLessThanOrEqual(30);
    }
    // Stufe 1: genau 30 Siege bis gemeistert
    expect(siegeBis('forest_short', 'gemeistert')).toBe(30);
    expect(siegeBis('forest_ruins', 'gemeistert')).toBe(30);
  });
});

describe('Beute im Fenster = Beute im Spiel', () => {
  it('die Gold-Spanne ist die der Beutetabelle, die Chancen summieren sich zu 1', () => {
    for (const id of erreichbareGegner()) {
      const tabelle = LOOT_TABLE_DEFS[ENEMY_DEFS[id].lootTableId];
      expect(goldSpanne(id)).toEqual(tabelle.guaranteedGold);
      const summe = tabelle.entries.reduce((s, e) => s + e.weight, 0);
      const chancen = beuteChancen(id);
      chancen.forEach((c, i) => expect(c.chance).toBeCloseTo(tabelle.entries[i].weight / summe, 10));
      expect(chancen.reduce((s, c) => s + c.chance, 0)).toBeCloseTo(1, 10);
    }
  });

  it('Gegenprobe mit CombatEngine.rollLoot: 10 000 Ziehungen, höchstens 2 Prozentpunkte daneben', () => {
    const engine = new CombatEngine(new GearSystem());
    for (const id of ['forest_wolf', 'boss_ignarax']) {
      const rng = new SeededRNG(4242);
      const gezogen: Record<string, number> = {};
      const { min, max } = goldSpanne(id);
      const N = 10_000;
      for (let i = 0; i < N; i++) {
        const run = { party: [], loot: {}, goldEarned: 0 } as unknown as ExpeditionRun;
        engine.rollLoot(run, ENEMY_DEFS[id].lootTableId, rng);
        expect(run.goldEarned).toBeGreaterThanOrEqual(min);
        expect(run.goldEarned).toBeLessThanOrEqual(max);
        const [itemId] = Object.keys(run.loot);
        gezogen[itemId] = (gezogen[itemId] ?? 0) + 1;
      }
      const angezeigt: Record<string, number> = {};
      for (const c of beuteChancen(id)) angezeigt[c.itemId] = (angezeigt[c.itemId] ?? 0) + c.chance;
      for (const [itemId, chance] of Object.entries(angezeigt)) {
        expect(Math.abs((gezogen[itemId] ?? 0) / N - chance), `${id} ${itemId}`).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it('jede Fähigkeitsart aus ENEMY_DEFS hat einen deutschen Namen', () => {
    for (const e of Object.values(ENEMY_DEFS)) {
      for (const sk of e.skills) expect(FAEHIGKEIT_ART[sk.effectType], sk.effectType).toMatch(/^[A-ZÄÖÜ][a-zäöü]+$/);
    }
  });
});

describe('Stufen und Seitenprämien', () => {
  it('Stufen nach Siegen: normal 1/10/30, Boss 1/3/10', () => {
    const state = createNewGameState();
    expect(stufe(state, 'forest_wolf')).toBe('unbekannt');
    state.bestiarium.discovered.push('forest_wolf');
    expect(stufe(state, 'forest_wolf')).toBe('gesichtet');
    for (const [n, s] of [[1, 'bekannt'], [9, 'bekannt'], [10, 'erforscht'], [29, 'erforscht'], [30, 'gemeistert']] as const) {
      Object.assign(state.bestiarium, { strecke: { forest_wolf: n, boss_elder_treant: Math.ceil(n / 3) } });
      expect(stufe(state, 'forest_wolf')).toBe(s);
    }
    for (const [n, s] of [[1, 'bekannt'], [2, 'bekannt'], [3, 'erforscht'], [9, 'erforscht'], [10, 'gemeistert']] as const) {
      Object.assign(state.bestiarium, { strecke: { boss_elder_treant: n } });
      expect(stufe(state, 'boss_elder_treant')).toBe(s);
    }
  });

  it('30 echte Siege im Waldpfad: Seite gemeistert, beide Prämien genau einmal (N und 3 × N)', () => {
    const { state, ids } = musterStand('stark', 7919);
    const route = 'forest_short';
    const N = praemieGrundbetrag(route);
    let siege = 0;
    let versuche = 0;
    const abgeholt: { art: string; nachSiegen: number; gold: number }[] = [];
    while (siege < 30 && versuche < 60) {
      versuche++;
      const run = lauf(state, ids, route);
      if (run.status === 'victory') siege++;
      for (const art of ['erforscht', 'gemeistert'] as const) {
        const vorher = state.globalStock.gold;
        const gold = praemieAbholen(state, route, art);
        expect(state.globalStock.gold - vorher).toBe(gold);
        if (gold > 0) {
          abgeholt.push({ art, nachSiegen: siege, gold });
          // Der zweite Klick eines Doppelklicks bringt nichts
          expect(praemieAbholen(state, route, art)).toBe(0);
          expect(state.globalStock.gold - vorher).toBe(gold);
        }
      }
      if (siege === 29) expect(praemieFaellig(state, route, 'gemeistert') || praemieAbgeholt(state, route, 'gemeistert')).toBe(false);
    }
    expect(siege).toBe(30);
    const seite = seiten().find(s => s.routeId === route)!;
    expect(seitenStand(state, seite)).toEqual({ gesamt: seite.gegner.length, erforscht: seite.gegner.length, gemeistert: seite.gegner.length });
    expect(abgeholt.map(a => [a.art, a.gold])).toEqual([['erforscht', N], ['gemeistert', 3 * N]]);
    expect(abgeholt[0].nachSiegen).toBeLessThanOrEqual(siegeBis(route, 'erforscht'));
    expect(praemien(state)).toEqual([`${route}:erforscht`, `${route}:gemeistert`]);
    expect(praemieAbholen(state, route, 'erforscht') + praemieAbholen(state, route, 'gemeistert')).toBe(0);
  });

  it('ohne Anspruch keine Prämie, auch nicht für fremde Seiten', () => {
    const state = createNewGameState();
    const gold = state.globalStock.gold;
    expect(praemieAbholen(state, 'forest_short', 'erforscht')).toBe(0);
    expect(praemieAbholen(state, 'gibt_es_nicht', 'erforscht')).toBe(0);
    expect(state.globalStock.gold).toBe(gold);
    expect(praemien(state)).toEqual([]);
  });

  it('N ist das mittlere Gold eines Siegs, auf 10 gerundet, mindestens 10', () => {
    for (const seite of seiten()) {
      let summe = 0;
      for (const enc of ROUTE_DEFS[seite.routeId].encounters) {
        for (const id of enc.enemies ?? []) {
          const g = LOOT_TABLE_DEFS[ENEMY_DEFS[id].lootTableId].guaranteedGold;
          summe += (g.min + g.max) / 2;
        }
      }
      expect(praemieGrundbetrag(seite.routeId)).toBe(Math.max(10, Math.round(summe / 10) * 10));
      expect(praemieBetrag(seite.routeId, 'gemeistert')).toBe(3 * praemieGrundbetrag(seite.routeId));
    }
  });
});

describe('Strecke lesen: bereinigt', () => {
  it('nur Gegner aus ENEMY_DEFS, nur ganze Zahlen ≥ 0, alte Stände zählen 1', () => {
    const state = createNewGameState();
    state.bestiarium.defeated = ['forest_bear', 'gibt_es_nicht'];
    // Wie aus einer Datei gelesen (JSON.parse legt «__proto__» als echten Schlüssel an)
    const roh = JSON.parse('{"forest_wolf":4.7,"forest_spider":-3,"forest_bandit":"viele","forest_wisp":null,'
      + '"gibt_es_nicht":9,"__proto__":5,"toString":2,"constructor":1}');
    Object.assign(state.bestiarium, { strecke: roh });
    expect(strecke(state)).toEqual({ forest_wolf: 4, forest_bear: 1 });
    expect(anzahlBesiegt(state, 'forest_bear')).toBe(1);
    Object.assign(state.bestiarium, { strecke: 'kaputt' });
    expect(strecke(state)).toEqual({ forest_bear: 1 });
  });
});

describe('Speichern', () => {
  afterEach(() => vi.unstubAllGlobals());

  function speicher(): Storage {
    const data = new Map<string, string>();
    return {
      get length() { return data.size; },
      clear: () => data.clear(),
      getItem: (key: string) => data.get(key) ?? null,
      key: (index: number) => [...data.keys()][index] ?? null,
      removeItem: (key: string) => { data.delete(key); },
      setItem: (key: string, value: string) => { data.set(key, String(value)); },
    };
  }

  it('die Strecke übersteht Speichern und Laden, auch als Spielstand-Datei', () => {
    vi.stubGlobal('localStorage', speicher());
    const { state, ids } = neuesSpiel();
    lauf(state, ids, 'forest_short');
    const vorher = strecke(state);
    const save = new SaveSystem();
    expect(save.save(state)).toBe(true);
    const geladen = save.load()!;
    expect(strecke(geladen)).toEqual(vorher);
    expect(pruefeSpielstandText(JSON.stringify(state)).ok).toBe(true);
  });

  it('kaputte Werte in der Strecke werden nach dem Laden bereinigt', () => {
    vi.stubGlobal('localStorage', speicher());
    const { state } = neuesSpiel();
    Object.assign(state.bestiarium, { strecke: { forest_wolf: 2.5, forest_bear: -1, unbekannt: 3 } });
    const save = new SaveSystem();
    save.save(state);
    expect(strecke(save.load()!)).toEqual({ forest_wolf: 2 });
  });

  it('Prämien überstehen Speichern und Laden, kaputte Einträge fallen weg', () => {
    vi.stubGlobal('localStorage', speicher());
    const { state } = neuesSpiel();
    Object.assign(state.bestiarium, { praemien: ['forest_short:erforscht'] });
    const save = new SaveSystem();
    save.save(state);
    expect(praemien(save.load()!)).toEqual(['forest_short:erforscht']);
    expect(pruefeSpielstandText(JSON.stringify(state)).ok).toBe(true);
    Object.assign(state.bestiarium, { praemien: ['forest_short:erforscht', 'a b', 5, null, 'forest_short:erforscht', 'x-y'] });
    expect(praemien(state)).toEqual(['forest_short:erforscht']);
    Object.assign(state.bestiarium, { praemien: 'kaputt' });
    expect(praemien(state)).toEqual([]);
  });

  it('jede erreichbare Gegner-ID ist ein sicherer Schlüssel für die Spielstand-Datei', () => {
    for (const id of Object.keys(ENEMY_DEFS)) expect(id).toMatch(/^[a-z0-9_]+$/);
  });
});
