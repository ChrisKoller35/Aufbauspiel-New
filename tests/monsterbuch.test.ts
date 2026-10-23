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
import { ROUTE_DEFS } from '../src/data/routes';
import { ENEMY_DEFS } from '../src/data/enemies';
import { musterStand } from '../src/systems/Musterlauf';
import { anzahlBesiegt, gesichtet, strecke } from '../src/systems/Monsterkunde';

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

  it('jede erreichbare Gegner-ID ist ein sicherer Schlüssel für die Spielstand-Datei', () => {
    for (const id of Object.keys(ENEMY_DEFS)) expect(id).toMatch(/^[a-z0-9_]+$/);
  });
});
