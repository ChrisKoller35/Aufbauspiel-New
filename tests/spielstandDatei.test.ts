// ─── Echte Spielstände bestehen die Prüfung der Spielstand-Datei ────
// Was das Spiel selbst speichert, muss sich herunterladen und wieder laden
// lassen (docs/SPIELSTAND.md): ein neues Spiel, das Probespiel «Gut» (?probe)
// und «Stark» (?probe=sterne), ein lange gespieltes Spiel (Tage, Expeditionen,
// Gildenhaus, Rangliste mit Wochenwertung, Schmiede, Geschichten, Wege, Werkstätten)
// und ein Stand mitten in einer Expedition. Ändert jemand die Form eines gespeicherten
// Felds, schlägt dieser Test an: dann die Form in SpielstandSchema.ts nachführen.
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { CLASS_DEFS } from '../src/data/classes';
import { BUILDING_DEFS } from '../src/data/buildings';
import { BuildingInstance, createBuildingInstance } from '../src/models/Building';
import { wegeDerKlasse } from '../src/data/spezialisierungen';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { CURRENT_VERSION, SaveSystem, hebeSperreNachLadenAuf, pruefeSpielstandText } from '../src/systems/SaveSystem';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { ProductionSystem } from '../src/systems/ProductionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { setBeute } from '../src/systems/DungeonSets';
import { schmieden } from '../src/systems/Schmiede';
import { einleitungGelesen, geschichtsBilanz, ungeleseneEinleitung } from '../src/systems/Geschichten';
import { brettGesehen, brettStand, kannLiefern, liefern, tauschen } from '../src/systems/Auftragsbrett';
import { belohnungenAbholen, ranglisteStand } from '../src/systems/Rangliste';
import { kannWegWaehlen, waehleWeg } from '../src/systems/Spezialisierung';
import { spieleRoute } from '../src/systems/Musterlauf';
import { auftragGeben } from '../src/systems/Auftraege';
import { TAG_SEKUNDEN, neuerTag } from '../src/systems/Tag';

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
  if (probe) richteProbespielEin(state, probe === 'sterne' ? 'sterne' : 'neu');
  return state;
}

/** Die Spielschleife aus main.ts: Werkstätten jede Sekunde, Tageswechsel alle TAG_SEKUNDEN (systems/Tag.ts). */
function spieleSekunden(state: GameState, sekunden: number): void {
  const produktion = new ProductionSystem();
  for (let sekunde = 1; sekunde <= sekunden; sekunde++) {
    produktion.update(state, 1);
    if (sekunde % TAG_SEKUNDEN === 0) neuerTag(state);
  }
}

function spieleTage(state: GameState, tage: number): void {
  spieleSekunden(state, tage * TAG_SEKUNDEN);
}

/** Bauen wie im Gebäude-Menü, hier ohne Kosten und Bauplan. */
function baue(state: GameState, typeId: string): BuildingInstance {
  const b = createBuildingInstance(typeId);
  if (BUILDING_DEFS[typeId].recipes.length > 0) b.activeRecipeId = BUILDING_DEFS[typeId].recipes[0];
  state.buildings.push(b);
  return b;
}

/** Anheuern wie im Heldenhaus (HeroesScreen.handleHire): je Klasse ein Held. */
function heuereAn(state: GameState, classId: string): void {
  if (state.fighters.some(f => f.classId === classId)) return;
  const def = CLASS_DEFS[classId];
  state.fighters.push({
    id: state.fighters.reduce((m, f) => Math.max(m, f.id), 0) + 1, classId, name: def.name,
    baseStats: { ...def.baseStats }, gear: { mainHand: null, offHand: null, armor: null, trinket: null },
    xp: 0, level: 1,
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
  expect(JSON.parse(text).saveVersion).toBe(CURRENT_VERSION);

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
    heuereAn(state, 'ranger'); // zum Start-Guardian
    heuereAn(state, 'cleric');
    for (let i = 0; i < 4; i++) expedition(state, 'forest_short');
    spieleTage(state, 20);

    expect(state.day).toBeGreaterThan(40);
    expect(state.scoreboard.length).toBe(4);
    bestehtUndLaedt(state);
  });

  it('ein lange gespieltes Spiel: drei Wochen Rangliste, Gildenhaus, Schmiede, Geschichten, Wege und Werkstätten', () => {
    const state = neuesSpiel('gut');
    for (const held of state.fighters) {
      if (kannWegWaehlen(held)) waehleWeg(held, wegeDerKlasse(held.classId)[0].id);
    }
    schmieden(state, 'set_wyrm_klinge');
    for (const typeId of ['SMITHY', 'HERB_GARDEN']) baue(state, typeId);
    const arkan = baue(state, 'ARCANE_SMITHY');
    const kriegsmaschinen = baue(state, 'WAR_MACHINE_WORKSHOP');
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
    // Eine Kanone ohne Magitech-Komponenten im Lager: Die Arkanschmiede liefert sie von selbst zu
    // (b.vonSelbst), der Auftrag wartet in b.auftraege der Kriegsmaschinen-Werkstatt
    Object.assign(state.globalStock, { iron_scrap: 60, crystal_shard: 40, magitech_component: 0 });
    expect(auftragGeben(kriegsmaschinen, 'RCP_WAR_CANNON')).toBe(true);
    for (let sekunde = 0; sekunde < 60 && !arkan.vonSelbst; sekunde++) spieleSekunden(state, 1);

    // Alle Felder sind da und gefüllt, sonst prüft dieser Test sie nicht
    expect(state.geschichten?.erlebt.length).toBeGreaterThan(0);
    expect(Object.keys(state.bezwungen ?? {}).length).toBeGreaterThan(0);
    expect(state.rangliste?.verlauf.length).toBeGreaterThan(0);
    expect(Object.keys(state.schmiede?.stufen ?? {})).toContain('set_wyrm_klinge');
    expect(state.auftragsbrett?.gesehen).toBeTruthy();
    expect(Object.keys(state.trophaeen?.siege ?? {}).length).toBeGreaterThan(0);
    expect(arkan.vonSelbst).toEqual({ art: 'zulieferung', fuer: 'WAR_MACHINE_WORKSHOP' });
    expect(kriegsmaschinen.auftraege?.length).toBeGreaterThan(0);
    expect(state.fighters.some(f => f.wegBilanz && Object.keys(f.wegBilanz).length > 0)).toBe(true);
    expect(state.achievements.length).toBeGreaterThan(0);
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
