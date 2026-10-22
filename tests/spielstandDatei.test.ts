// ─── Echte Spielstände bestehen die Prüfung der Spielstand-Datei ────
// Was das Spiel selbst speichert, muss sich herunterladen und wieder laden
// lassen (docs/SPIELSTAND.md): ein neues Spiel, das Probespiel «Gut» (?probe)
// und «Stark» (?probe=sterne), ein lange gespieltes Spiel (Tage, Expeditionen,
// Gildenhaus, Rangliste mit Wochenwertung, Schmiede, Geschichten, Wege) und ein
// Stand mitten in einer Expedition. Ändert jemand die Form eines gespeicherten
// Felds, schlägt dieser Test an: dann die Form in SaveSystem.ts nachführen.
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { CLASS_DEFS } from '../src/data/classes';
import { BUILDING_DEFS } from '../src/data/buildings';
import { BuildingInstance, createBuildingInstance } from '../src/models/Building';
import { wegeDerKlasse } from '../src/data/spezialisierungen';
import { placeStartingLayout, createStartingCitizens } from '../src/scenes/CityStartingLayout';
import { SaveSystem, hebeSperreNachLadenAuf, pruefeSpielstandText } from '../src/systems/SaveSystem';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { ProductionSystem } from '../src/systems/ProductionSystem';
import { PeopleSystem } from '../src/systems/PeopleSystem';
import { SatisfactionSystem } from '../src/systems/SatisfactionSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { ConnectivitySystem } from '../src/systems/ConnectivitySystem';
import { loeseHeldenBindungen } from '../src/systems/HeldenBindung';
import { TAG_SEKUNDEN } from '../src/systems/GebaeudeStatus';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { setBeute } from '../src/systems/DungeonSets';
import { schmieden } from '../src/systems/Schmiede';
import { einleitungGelesen, geschichtsBilanz, ungeleseneEinleitung } from '../src/systems/Geschichten';
import { brettGesehen, brettStand, kannLiefern, liefern, tauschen } from '../src/systems/Auftragsbrett';
import { belohnungenAbholen, ranglisteStand } from '../src/systems/Rangliste';
import { kannWegWaehlen, waehleWeg } from '../src/systems/Spezialisierung';
import { spieleRoute } from '../src/systems/Musterlauf';
import { auftragGeben } from '../src/systems/Auftraege';

/** Montag, 2. November 2026, 10:00 (Ortszeit) */
const MONTAG = new Date(2026, 10, 2, 10, 0).getTime();
const TAG = 86_400_000;

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

/** Neues Spiel wie main.ts beim ersten Start, mit `probe` wie ?probe («gut») oder ?probe=sterne. */
function neuesSpiel(probe?: 'gut' | 'sterne'): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  createStartingCitizens(state);
  if (probe) richteProbespielEin(state, probe === 'sterne');
  return state;
}

/** Die Spielschleife aus main.ts: Stadt-Takt jede Sekunde, Tageswechsel alle TAG_SEKUNDEN. */
function spieleSekunden(state: GameState, sekunden: number): void {
  const verbindung = new ConnectivitySystem();
  const produktion = new ProductionSystem();
  const leute = new PeopleSystem();
  const zufriedenheit = new SatisfactionSystem();
  const wirtschaft = new EconomySystem();
  for (let sekunde = 1; sekunde <= sekunden; sekunde++) {
    verbindung.update(state);
    produktion.update(state, 1);
    leute.cityTick(state, 1);
    zufriedenheit.update(state);
    if (sekunde % TAG_SEKUNDEN === 0) {
      wirtschaft.dayTick(state);
      leute.dayTick(state);
      loeseHeldenBindungen(state);
    }
  }
}

function spieleTage(state: GameState, tage: number): void {
  spieleSekunden(state, tage * TAG_SEKUNDEN);
}

/** Bauen wie im Gebäude-Menü (BuildingsScreen.handleBuild), hier ohne Kosten. */
function baue(state: GameState, typeId: string): BuildingInstance {
  const b = createBuildingInstance(typeId, 0, 0, true);
  if (BUILDING_DEFS[typeId].recipes.length > 0) b.activeRecipeId = BUILDING_DEFS[typeId].recipes[0];
  b.connected = true;
  state.buildings.push(b);
  return b;
}

/** Anheuern wie im Heldenhaus (HeroesScreen.handleHire): Helden sind keine Bewohner. */
function heuereAn(state: GameState, classId: string): void {
  const def = CLASS_DEFS[classId];
  state.fighters.push({
    id: state.fighters.reduce((m, f) => Math.max(m, f.id), 0) + 1, citizenId: 0, classId, name: def.name,
    baseStats: { ...def.baseStats }, gear: { mainHand: null, offHand: null, armor: null, trinket: null },
    gearNeedsRepair: false, xp: 0, level: 1,
  });
}

/** Eine Expedition wie in main.ts: Einleitung lesen, spielen, danach finishExpedition. */
function expedition(state: GameState, routeId: string): ExpeditionRun {
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  if (ungeleseneEinleitung(state, routeId)) einleitungGelesen(state, routeId);
  const run = spieleRoute(state, state.fighters.slice(0, 4).map(f => f.id), routeId, 'klug');
  setBeute(state, run);
  const loot = { ...run.loot };
  finalizeExpeditionProgress(state, run, system);
  system.returnProvisions(state, run);
  geschichtsBilanz(state, run);
  state.activeExpedition = null;
  for (const [itemId, menge] of Object.entries(loot)) state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + menge;
  state.globalStock.gold = (state.globalStock.gold ?? 0) + (run.goldEarned ?? 0);
  return run;
}

/** Speichern wie das Spiel und die Datei prüfen, wie das Fenster «Spielstand» es tut. */
function dateiVon(state: GameState): string {
  const saveSystem = new SaveSystem();
  expect(saveSystem.save(state)).toBe(true);
  return saveSystem.spielstandText()!;
}

/** Die Datei besteht die Prüfung, lässt sich schreiben und lädt als derselbe Stand. */
function bestehtUndLaedt(state: GameState): void {
  const text = dateiVon(state);
  const pruefung = pruefeSpielstandText(text);
  expect(pruefung).toMatchObject({ ok: true, zusammenfassung: { tag: state.day, helden: state.fighters.length } });

  vi.stubGlobal('localStorage', speicher());
  const saveSystem = new SaveSystem();
  expect(saveSystem.schreibeSpielstandText(text).ok).toBe(true);
  hebeSperreNachLadenAuf();
  expect(JSON.stringify(saveSystem.load())).toBe(JSON.stringify(JSON.parse(text)));
}

describe('echte Spielstände bestehen die Prüfung der Datei', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', speicher());
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MONTAG);
    hebeSperreNachLadenAuf();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('ein neues Spiel, wie main.ts es anlegt', () => {
    bestehtUndLaedt(neuesSpiel());
  });

  it('das Probespiel «Gut» (?probe) und «Stark» (?probe=sterne)', () => {
    bestehtUndLaedt(neuesSpiel('gut'));
    bestehtUndLaedt(neuesSpiel('sterne'));
  });

  it('ein Spiel ohne Probespiel nach 40 Tagen mit zwei angeheuerten Helden und ersten Expeditionen', () => {
    const state = neuesSpiel();
    spieleTage(state, 20);
    heuereAn(state, 'guardian');
    heuereAn(state, 'ranger');
    for (let i = 0; i < 4; i++) expedition(state, 'forest_short');
    spieleTage(state, 20);

    expect(state.day).toBeGreaterThan(40);
    expect(state.scoreboard.length).toBe(4);
    bestehtUndLaedt(state);
  });

  it('ein lange gespieltes Spiel: drei Wochen Rangliste, Gildenhaus, Schmiede, Geschichten und Wege', () => {
    const state = neuesSpiel('gut');
    for (const held of state.fighters) {
      if (kannWegWaehlen(held)) waehleWeg(held, wegeDerKlasse(held.classId)[0].id);
    }
    schmieden(state, 'set_wyrm_klinge');
    for (const typeId of ['WELL', 'FARM_GRAIN', 'MILL_WIND', 'BAKERY']) baue(state, typeId);
    const garten = baue(state, 'HERB_GARDEN');
    for (let woche = 0; woche < 3; woche++) {
      for (const [i, routeId] of ['forest_medium', 'cave_spider', 'ocean_depths', 'volcano_core', 'drachenhort'].entries()) {
        vi.setSystemTime(MONTAG + woche * 7 * TAG + i * TAG);
        spieleTage(state, 2);
        expedition(state, routeId);
        const jetzt = Date.now();
        brettGesehen(state, jetzt);
        tauschen(state, 0, jetzt);
        const lieferbar = brettStand(state, jetzt).auftraege.findIndex(a => !a.fertig && kannLiefern(state, a));
        if (lieferbar >= 0) liefern(state, lieferbar, jetzt);
      }
    }
    vi.setSystemTime(MONTAG + 22 * TAG);
    ranglisteStand(state, Date.now());
    belohnungenAbholen(state, Date.now());
    // Die Kräuter sind aufgebraucht, dann ein Heiltrank-Auftrag: Der Kräutergarten zieht sie
    // zuerst von selbst (b.vonSelbst), der Auftrag wartet in b.auftraege
    state.globalStock.herb_green = 0;
    expect(auftragGeben(garten, 'RCP_HEALING_POTION')).toBe(true);
    for (let sekunde = 0; sekunde < 60 && !garten.vonSelbst; sekunde++) spieleSekunden(state, 1);

    // Alle Felder aus PR #29 sind da und gefüllt, sonst prüft dieser Test sie nicht
    expect(state.geschichten?.erlebt.length).toBeGreaterThan(0);
    expect(Object.keys(state.bezwungen ?? {}).length).toBeGreaterThan(0);
    expect(state.rangliste?.verlauf.length).toBeGreaterThan(0);
    expect(Object.keys(state.schmiede?.stufen ?? {})).toContain('set_wyrm_klinge');
    expect(state.auftragsbrett?.gesehen).toBeTruthy();
    expect(Object.keys(state.trophaeen?.siege ?? {}).length).toBeGreaterThan(0);
    expect(garten.vonSelbst).toEqual({ art: 'vorstufe', fuer: 'RCP_HEALING_POTION' });
    expect(garten.auftraege?.length).toBeGreaterThan(0);
    expect(state.fighters.some(f => f.wegBilanz && Object.keys(f.wegBilanz).length > 0)).toBe(true);
    // Was das Spiel schreibt, enthält kein Zeichen, das die Prüfung ablehnt (< > ")
    expect(JSON.stringify(state)).not.toMatch(/\\"|[<>]/);

    bestehtUndLaedt(state);
  });

  it('mitten in einer Expedition gespeichert: Der Bericht enthält «>>», der Start bricht die Expedition ab', () => {
    const state = neuesSpiel('gut');
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    const run = system.startExpedition(state, 'forest_medium', state.fighters.map(f => f.id))!;
    for (let schritt = 0; schritt < 40 && !run.combatLog.some(z => z.startsWith('>>')); schritt++) {
      const step = system.nextStep(run);
      if (step === 'finish') break;
      if (step === 'checkpoint') system.resolveCheckpoint(run, true);
      else if (step === 'merchant') system.merchantSkip(run);
      else if (step === 'choice') system.resolveChoice(run, 0);
      else system.processCurrentRoom(state);
    }
    const text = dateiVon(state);
    expect(state.activeExpedition).not.toBeNull();
    expect(text).toContain('>>');

    expect(pruefeSpielstandText(text).ok).toBe(true);
  });
});
