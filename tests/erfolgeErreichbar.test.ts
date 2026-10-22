// ─── Erfolge: mit den echten Regeln erreichbar ──────────────────
// Ein Musterspiel spielt mit den Systemen des Spiels (Expeditionen, Beute, Gildenrang,
// Auftragsbrett, Rangliste, Schmiede, Ausbau, Stadtweg, Tageswechsel), bis jeder Erfolg
// freigeschaltet ist. Abgekürzt wird nur, was Zeit kostet: Die drei Helden sind sehr stark
// (ihre Stärke ist eine Frage der Eichung, nicht der Regeln), und Rohstoffe für Bauten,
// Ausbauten und Abgaben kommen dazu, als hätten die Werkstätten sie hergestellt. Dazu die
// Obergrenzen, die die Daten setzen (z. B. höchstens 30 neue Bewohner).
// ────────────────────────────────────────────────────────────────

import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { createBuildingInstance } from '../src/models/Building';
import { ACHIEVEMENT_DEFS, SAAL_SOCKEL } from '../src/data/achievements';
import { BUILDING_DEFS, BUILD_MENU_ORDER } from '../src/data/buildings';
import { CLASS_DEFS } from '../src/data/classes';
import { STARTING_CLASSES } from '../src/data/classUnlocks';
import { DUNGEON_GRAPH, ROUTE_DEFS, getRouteBauplan } from '../src/data/routes';
import { DUNGEON_SETS, setFuerRoute, setTeilIds, setVonItem } from '../src/data/dungeonSets';
import { GUILD_RANK_DEFS } from '../src/data/guildRanks';
import { HERZSTEINE, HOECHSTE_STADTSTUFE } from '../src/data/stadtstufen';
import { MAX_SCHMIEDE_STUFE, SCHMIEDE_MATERIALIEN } from '../src/data/schmiede';
import { wegeDerKlasse } from '../src/data/spezialisierungen';
import { ENEMY_DEFS } from '../src/data/enemies';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { PeopleSystem } from '../src/systems/PeopleSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { besitz, getrageneSets, setBeute } from '../src/systems/DungeonSets';
import { materialFuerTeil, schmiedeBeute, schmiedeFehlt, schmiedeKosten, schmiedeStufe, schmieden } from '../src/systems/Schmiede';
import { ausbauen, ausbauInfo, maxStufe, PLAETZE_PRO_STUFE, wohnKapazitaet } from '../src/systems/Ausbau';
import { brettStand, istSpielbar, laufendesKapitel, liefern, saalKapitel, splitterEinloesen } from '../src/systems/Auftragsbrett';
import { belohnungenAbholen, TAG_MS } from '../src/systems/Rangliste';
import { bezwungeneDungeons } from '../src/systems/Bezwungen';
import { dasGebaeude, freischaltHinweise } from '../src/systems/GebaeudeStatus';
import { aufstiegStand, setzeHerzsteinEin, steigeAuf } from '../src/systems/Stadtweg';
import { kannWegWaehlen, waehleWeg } from '../src/systems/Spezialisierung';
import { erfolgePruefen, saalSterne } from '../src/systems/AchievementSystem';
import { bossTrophaeen, saalGlanz } from '../src/systems/Trophaeensaal';
import { createStartingCitizens, placeStartingLayout, STARTING_BUILDING_TYPES } from '../src/scenes/CityStartingLayout';

/** Montag, 19. Oktober 2026, 9 Uhr: Auftragsbrett (Tage) und Rangliste (Wochen) gehen nach dieser Uhr */
const START = new Date(2026, 9, 19, 9, 0).getTime();
const STARK = { hp: 99999, maxHp: 99999, atk: 9999, def: 9999, spd: 99, critChance: 0, critMult: 1 };

/** Alle Gegner, die in einer Route vorkommen können (Begegnungen und Boss) */
function gegnerInRouten(): Set<string> {
  const ids = new Set<string>();
  const sammle = (wert: unknown): void => {
    if (Array.isArray(wert)) { wert.forEach(sammle); return; }
    if (!wert || typeof wert !== 'object') return;
    for (const [key, v] of Object.entries(wert)) {
      if (key === 'enemies' && Array.isArray(v)) v.forEach(id => typeof id === 'string' && ids.add(id));
      else sammle(v);
    }
  };
  for (const route of Object.values(ROUTE_DEFS)) {
    sammle(route.encounters);
    if (route.bossId) ids.add(route.bossId);
  }
  return new Set([...ids].filter(id => ENEMY_DEFS[id]));
}

/** Gebäude, die der Spieler selbst bauen kann (Baumenü ohne die Gebäude, die schon zum Start stehen) */
const NEUBAUTEN = BUILD_MENU_ORDER.filter(id => !STARTING_BUILDING_TYPES.includes(id));
/** Gebäude, die zum Start stehen oder gebaut werden können */
const ALLE_BAUTEN = [...new Set([...STARTING_BUILDING_TYPES, ...BUILD_MENU_ORDER])];

/** Rohstoffe, als hätten die Werkstätten sie hergestellt */
function nachfuellen(state: GameState, kosten: Record<string, number>): void {
  for (const [id, n] of Object.entries(kosten)) state.globalStock[id] = Math.max(state.globalStock[id] ?? 0, n);
}

/** Was main.ts nach einer Expedition tut (finishExpedition), ohne Truhe und Dialoge */
function expedition(state: GameState, system: ExpeditionSystem, routeId: string, helden: number[]): void {
  const run = system.startExpedition(state, routeId, helden);
  expect(run, routeId).not.toBeNull();
  state.statistics.total_expeditions = (state.statistics.total_expeditions ?? 0) + 1;
  for (let s = 0; s < 500 && run!.status === 'exploring'; s++) {
    const step = system.nextStep(run!);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run!, false);
    else if (step === 'merchant') system.merchantSkip(run!);
    else if (step === 'choice') system.resolveChoice(run!, 0);
    else system.processCurrentRoom(state);
  }
  setBeute(state, run!);
  schmiedeBeute(run!);
  const loot = { ...run!.loot };
  const bauplan = run!.bossesKilled > 0 ? getRouteBauplan(run!.routeId) : null;
  const neuerBauplan = bauplan && !state.erhalteneBauplaene.includes(bauplan) ? bauplan : null;
  if (neuerBauplan) loot[neuerBauplan] = (loot[neuerBauplan] ?? 0) + 1;
  finalizeExpeditionProgress(state, run!, system);
  system.returnProvisions(state, run!);
  state.activeExpedition = null;
  for (const [id, n] of Object.entries(loot)) state.globalStock[id] = (state.globalStock[id] ?? 0) + n;
  state.globalStock.gold = (state.globalStock.gold ?? 0) + (run!.goldEarned ?? 0);
  if (neuerBauplan) state.erhalteneBauplaene.push(neuerBauplan);
  erfolgePruefen(state, { hinweis: false });
}

/** Bauen wie BuildingsScreen.executeBuy: jede Art einmal, wenn nichts sie mehr sperrt (Gildenrang, Bauplan, Vorgänger) */
function bauen(state: GameState): void {
  for (const typeId of NEUBAUTEN) {
    const def = BUILDING_DEFS[typeId];
    if (dasGebaeude(state, typeId) || freischaltHinweise(state, typeId).length > 0) continue;
    nachfuellen(state, def.buildCost);
    for (const [id, n] of Object.entries(def.buildCost)) state.globalStock[id] -= n;
    if (def.freischaltung.bauplan) state.globalStock[def.freischaltung.bauplan] -= 1;
    const b = createBuildingInstance(typeId, 0, 0, true);
    if (def.recipes.length > 0) b.activeRecipeId = def.recipes[0];
    b.connected = true;
    state.buildings.push(b);
    state.statistics.total_buildings_built = (state.statistics.total_buildings_built ?? 0) + 1;
  }
}

/** Ausbauen, so weit die Stadtstufe und der Gildenrang es erlauben (systems/Ausbau.ts) */
function ausbauenWasGeht(state: GameState): void {
  for (const b of state.buildings.filter(x => x.built)) {
    for (let info = ausbauInfo(state, b); info.naechste !== null && !info.hinweis; info = ausbauInfo(state, b)) {
      nachfuellen(state, info.kosten);
      expect(ausbauen(state, b), b.typeId).toBe(true);
    }
  }
}

/** Der Weg zur Magischen Stadt: aufsteigen, sobald alle Aufgaben erfüllt sind, und die Herzsteine einsetzen */
function stadtweg(state: GameState): void {
  for (const h of HERZSTEINE) {
    nachfuellen(state, h.kosten);
    setzeHerzsteinEin(state, h.id);
  }
  for (let stand = aufstiegStand(state); stand && stand.aufgaben.every(a => a.erledigt); stand = aufstiegStand(state)) {
    nachfuellen(state, stand.ziel.abgabe);
    expect(steigeAuf(state)?.stufe).toBe(stand.ziel.stufe);
  }
}

/** Neue Helden: einer je freigeschalteter Klasse (wie «Anheuern» im Heldenbildschirm) */
function anheuern(state: GameState): void {
  for (const klasse of [...STARTING_CLASSES, ...state.classesUnlocked]) {
    if (state.fighters.some(f => f.classId === klasse)) continue;
    state.fighters.push(createGuildFighter(0, klasse, CLASS_DEFS[klasse].name, { ...CLASS_DEFS[klasse].baseStats }));
  }
  for (const held of state.fighters) {
    if (kannWegWaehlen(held)) waehleWeg(held, wegeDerKlasse(held.classId)[0].id);
  }
}

/** Ganze Sets aus dem Lager anlegen: jedes Set auf einen Helden, der noch kein ganzes trägt */
function setsAnlegen(state: GameState, gear: GearSystem): void {
  for (const set of DUNGEON_SETS) {
    const ids = setTeilIds(set);
    if (!ids.every(id => (state.globalStock[id] ?? 0) > 0)) continue;
    const held = state.fighters.find(f => !getrageneSets(f.gear).some(s => s.teile >= 3));
    if (!held) return;
    for (const id of ids) gear.equip(state, held, id);
  }
}

/** Das Teil, das in der Schmiede am wenigsten Material bis +5 braucht, und wo es sein Material gibt */
function schmiedeZiel(state: GameState): { teil: string; route: string } | null {
  const teile = DUNGEON_SETS.flatMap(setTeilIds).filter(id => besitz(state, id) > 0 && schmiedeKosten(state, id));
  teile.sort((a, b) => schmiedeKosten(state, a)!.menge - schmiedeKosten(state, b)!.menge
    || schmiedeStufe(state, b) - schmiedeStufe(state, a));
  for (const teil of teile) {
    const material = SCHMIEDE_MATERIALIEN.find(m => m.id === materialFuerTeil(teil)?.id);
    const route = material?.routen.filter(id => istSpielbar(state, id)).sort((a, b) => ROUTE_DEFS[b].tier - ROUTE_DEFS[a].tier)[0];
    if (route) return { teil, route };
  }
  return null;
}

/** Schmieden, solange Material, Gold und Splitter reichen; fehlende Splitter gegen Gildensiegel */
function schmiedenWasGeht(state: GameState, jetzt: number): void {
  const ziel = schmiedeZiel(state);
  if (!ziel) return;
  for (let fehlt = schmiedeFehlt(state, ziel.teil); fehlt; fehlt = schmiedeFehlt(state, ziel.teil)) {
    if (fehlt.some(f => f.was === 'splitter') && splitterEinloesen(state, jetzt)) continue;
    if (fehlt.length > 0 || schmieden(state, ziel.teil) === null) return;
  }
}

/** Wohin die Gilde als Nächstes zieht: Zettel am Brett, Kapitel der Kette, Neues, sonst Sets, Material und Bosse */
function naechstesZiel(state: GameState, jetzt: number): string {
  const brett = brettStand(state, jetzt);
  const zettel = brett.auftraege.find(a => !a.fertig && a.art !== 'lieferung' && istSpielbar(state, a.routeId));
  if (zettel) return zettel.routeId;
  const kapitel = laufendesKapitel(brett);
  if (kapitel && istSpielbar(state, kapitel.routeId)) return kapitel.routeId;
  const merker = bezwungeneDungeons(state);
  const spielbar = [...DUNGEON_GRAPH].sort((a, b) => b.y - a.y).map(n => n.routeId).filter(id => istSpielbar(state, id));
  const neu = spielbar.find(id => !(id in merker));
  if (neu) return neu;
  // Sets der Boss-Dungeons vervollständigen (Sterne im Trophäensaal, drei ganze Sets für die Helden)
  const setFehlt = spielbar.find(id => {
    const set = setFuerRoute(id);
    return ROUTE_DEFS[id].bossId && set && setTeilIds(set).some(t => besitz(state, t) === 0);
  });
  const glanzZiel = ACHIEVEMENT_DEFS.find(d => d.id === 'saal_glanz')!.ziel;
  if (setFehlt && (state.statistics.saal_sterne ?? 0) < glanzZiel) return setFehlt;
  const schmiede = schmiedeZiel(state);
  if (schmiede && (state.statistics.schmiede_hoechste_stufe ?? 0) < MAX_SCHMIEDE_STUFE) return schmiede.route;
  // Bosse und Gegner: der höchste Boss-Dungeon
  return spielbar.filter(id => ROUTE_DEFS[id].bossId).at(-1) ?? 'forest_short';
}

function fehlendeErfolge(state: GameState): string[] {
  return ACHIEVEMENT_DEFS.filter(d => !state.achievements.includes(d.id)).map(d => d.id);
}

/**
 * Das Musterspiel: an jedem Tag (echte Tage, für Auftragsbrett und Rangliste) erst die Stadt
 * (bauen, ausbauen, aufsteigen), dann Helden, Sets, Schmiede, Zettel, sechs Expeditionen
 * und fünf Tageswechsel im Spiel (ein Spieltag dauert 30 Sekunden).
 */
function musterspiel(): { state: GameState; expeditionen: number; tage: number } {
  const state = createNewGameState();
  state.rngSeed = 4711;
  placeStartingLayout(state);
  createStartingCitizens(state);
  const gear = new GearSystem();
  const system = new ExpeditionSystem(gear, new ProvisionSystem());
  const economy = new EconomySystem();
  const people = new PeopleSystem();
  const trupp = STARTING_CLASSES.map(klasse => {
    const held = createGuildFighter(0, klasse, CLASS_DEFS[klasse].name, { ...STARK });
    state.fighters.push(held);
    return held.id;
  });

  let expeditionen = 0;
  let tag = 0;
  for (; tag < 120 && fehlendeErfolge(state).length > 0; tag++) {
    const jetzt = START + tag * TAG_MS;
    vi.setSystemTime(jetzt);
    bauen(state);
    ausbauenWasGeht(state);
    stadtweg(state);
    anheuern(state);
    setsAnlegen(state, gear);
    schmiedenWasGeht(state, jetzt);
    belohnungenAbholen(state, jetzt);
    // Liefer-Zettel: die Ware, als hätte die Werkstatt sie hergestellt
    brettStand(state, jetzt).auftraege.forEach((a, i) => {
      if (a.fertig || a.art !== 'lieferung' || !a.itemId) return;
      nachfuellen(state, { [a.itemId]: a.ziel });
      liefern(state, i, jetzt);
    });
    for (let i = 0; i < 6; i++) {
      expedition(state, system, naechstesZiel(state, jetzt), trupp);
      expeditionen++;
    }
    for (let i = 0; i < 5; i++) {
      nachfuellen(state, { bread: 10 });
      economy.dayTick(state);
      people.dayTick(state);
    }
  }
  erfolgePruefen(state);
  return { state, expeditionen, tage: tag };
}

describe('Erfolge: mit den echten Regeln erreichbar', () => {
  beforeAll(() => { vi.useFakeTimers({ now: START, toFake: ['Date'] }); });
  afterAll(() => { vi.useRealTimers(); });

  test('Musterspiel: eine starke Gilde schafft jeden Erfolg, ohne einen Zähler von Hand zu setzen', () => {
    const { state, expeditionen, tage } = musterspiel();
    expect(fehlendeErfolge(state)).toEqual([]);
    // Grob im Rahmen: kein Erfolg braucht ein endloses Spiel
    expect(tage).toBeLessThan(60);
    expect(expeditionen).toBeLessThan(400);
    expect(state.guildStats.rank).toBe(GUILD_RANK_DEFS.length);
    // Die Sterne zählt der Erfolg wie der Trophäensaal sie zeigt
    const glanz = saalGlanz(bossTrophaeen(state, Date.now()));
    expect(saalSterne(state)).toBe(glanz.sterne);
    expect(glanz.max).toBe(3 * SAAL_SOCKEL);
  }, 30_000);

  test('Wachsende Stadt: höchstens 30 neue Bewohner, darum 25 statt 50', () => {
    const state = createNewGameState();
    placeStartingLayout(state);
    createStartingCitizens(state);
    state.stadtweg = { stufe: HOECHSTE_STADTSTUFE, herzsteine: [], gelesen: HOECHSTE_STADTSTUFE };
    ausbauenWasGeht(state);
    // Ein Wohnviertel, jede Art nur einmal: Plätze auf der höchsten Stufe minus die Bewohner vom Start
    expect(NEUBAUTEN.some(id => BUILDING_DEFS[id].housing)).toBe(false);
    const plaetze = wohnKapazitaet(state);
    expect(plaetze).toBe(maxStufe('HOUSE_T1') * PLAETZE_PRO_STUFE);
    const people = new PeopleSystem();
    for (let i = 0; i < 100; i++) {
      nachfuellen(state, { bread: 10 });
      people.dayTick(state);
    }
    const geboren = state.statistics.total_citizens_born ?? 0;
    expect(geboren).toBe(plaetze - 6);
    const ziel = ACHIEVEMENT_DEFS.find(d => d.zaehler === 'total_citizens_born')!.ziel;
    expect(ziel).toBeLessThanOrEqual(geboren);
    expect(50).toBeGreaterThan(geboren);
  });
});

describe('Erfolge: Ziele innerhalb dessen, was die Daten hergeben', () => {
  /**
   * Obergrenze je Zähler. Infinity: wächst mit der Zeit (Tage, Expeditionen, Zettel, Wochen).
   * Ein neuer Zähler braucht hier eine Zeile, sonst schlägt der Test fehl.
   */
  function grenzen(): Record<string, number> {
    const helden = Object.keys(CLASS_DEFS).length;
    return {
      total_buildings_built: NEUBAUTEN.length + ALLE_BAUTEN.reduce((s, id) => s + maxStufe(id) - 1, 0),
      total_upgrades: ALLE_BAUTEN.reduce((s, id) => s + maxStufe(id) - 1, 0),
      gebaeude_auf_hoechststufe: ALLE_BAUTEN.filter(id => maxStufe(id) > 1).length,
      hoechste_wohnstufe: maxStufe('HOUSE_T1'),
      total_citizens_born: maxStufe('HOUSE_T1') * PLAETZE_PRO_STUFE - 6,
      stadtstufe: HOECHSTE_STADTSTUFE,
      total_days_survived: Infinity,
      gildenrang: GUILD_RANK_DEFS.length,
      zettel_erledigt: Infinity,
      saal_prunkstuecke: saalKapitel().length,
      saal_sterne: 3 * saalKapitel().length,
      rangliste_pokale: Infinity,
      gipfel_spitze: 1,
      // Je Klasse ein Held (Anheuern), Wege und Meister unter ihnen
      helden_anzahl: helden,
      helden_mit_weg: helden,
      helden_meister: helden,
      total_expeditions: Infinity,
      total_victories: Infinity,
      total_defeats: Infinity,
      total_retreats: Infinity,
      total_flawless_victories: Infinity,
      total_bosses_killed: Infinity,
      total_gold_earned: Infinity,
      total_enemies_killed: Infinity,
      // Ganze Sets zählen nur, wenn ein Held sie trägt
      ganze_sets: Math.min(DUNGEON_SETS.length, helden),
      monsterbuch_entdeckt: gegnerInRouten().size,
      schmiede_hoechste_stufe: MAX_SCHMIEDE_STUFE,
    };
  }

  test('jeder Zähler hat eine Grenze, und kein Ziel liegt darüber', () => {
    const g = grenzen();
    for (const d of ACHIEVEMENT_DEFS) {
      for (const key of Array.isArray(d.zaehler) ? d.zaehler : [d.zaehler]) {
        expect(g[key], `Zähler ${key} (${d.id}) fehlt in grenzen()`).toBeDefined();
      }
      const grenze = (Array.isArray(d.zaehler) ? d.zaehler : [d.zaehler]).reduce((s, k) => s + g[k], 0);
      expect(d.ziel, d.id).toBeLessThanOrEqual(grenze);
    }
  });

  test('die Sockel des Saals sind die Kapitel der Kette', () => {
    expect(SAAL_SOCKEL).toBe(saalKapitel().length);
    expect(ACHIEVEMENT_DEFS.find(d => d.id === 'saal_kette')!.ziel).toBe(saalKapitel().length);
    expect(saalKapitel().every(k => setVonItem(setTeilIds(setFuerRoute(k.routeId)!)[0]))).toBe(true);
  });
});
