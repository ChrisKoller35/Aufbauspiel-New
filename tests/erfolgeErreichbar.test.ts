// ─── Erfolge: mit den echten Regeln erreichbar ──────────────────
// Ein Musterspiel spielt mit den Systemen des Spiels (Expeditionen, Beute, Gildenrang,
// Auftragsbrett, Rangliste, Schmiede, Ausbau, Stadtweg, Tageswechsel), bis jeder Erfolg
// freigeschaltet ist. Abgekürzt wird nur, was Zeit kostet: Die drei Helden sind sehr stark
// (ihre Stärke ist eine Frage der Eichung, nicht der Regeln), und Gold und Beute für Bauten,
// Ausbauten und Abgaben kommen dazu, als hätten die Dungeons sie gebracht; Proviant kauft
// die Gilde beim Händler (systems/Haendler.ts). Dazu die Obergrenzen, die die Daten setzen
// (z. B. vier Werkstätten, Werkstatt-Stufe 3). In Wahl-Räumen nimmt die Gilde immer die erste
// Option (das Risiko); so kommen die Gipfel-Taten von selbst. Für «Kleingedrucktes» kehrt sie
// einmal im Mondhof am letzten Kontrollpunkt um. Die versteckten Erfolge holt versteckteTaten() mit je
// einer Expedition; «Ohne Hose» kommt von selbst (beim ersten Boss trägt noch keiner Rüstung); für
// «Unentschieden» kämpft der Guardian einmal ohne Angriff (er steht für eine Gruppe, die den Boss nicht klein kriegt).
// ────────────────────────────────────────────────────────────────

import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { createBuildingInstance } from '../src/models/Building';
import { ACHIEVEMENT_DEFS, SAAL_SOCKEL } from '../src/data/achievements';
import { BUILDING_DEFS, BUILD_MENU_ORDER } from '../src/data/buildings';
import { kaufpreis } from '../src/data/haendler';
import { stadtStufeVon } from '../src/data/stadtstufen';
import { CLASS_DEFS } from '../src/data/classes';
import { STARTING_CLASSES } from '../src/data/classUnlocks';
import { DUNGEON_GRAPH, ROUTE_DEFS } from '../src/data/routes';
import { DUNGEON_SETS, setFuerRoute, setTeilIds, setVonItem } from '../src/data/dungeonSets';
import { GUILD_RANK_DEFS } from '../src/data/guildRanks';
import { HERZSTEINE, HOECHSTE_STADTSTUFE } from '../src/data/stadtstufen';
import { MAX_SCHMIEDE_STUFE, SCHMIEDE_MATERIALIEN } from '../src/data/schmiede';
import { wegeDerKlasse } from '../src/data/spezialisierungen';
import { ENEMY_DEFS } from '../src/data/enemies';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { besitz, getrageneSets, setBeute } from '../src/systems/DungeonSets';
import { materialFuerTeil, schmiedeBeute, schmiedeFehlt, schmiedeKosten, schmiedeStufe, schmieden } from '../src/systems/Schmiede';
import { ausbauen, ausbauInfo, maxStufe, MAX_STUFE_WERKSTATT } from '../src/systems/Ausbau';
import { brettStand, istSpielbar, laufendesKapitel, liefern, saalKapitel, splitterEinloesen } from '../src/systems/Auftragsbrett';
import { belohnungenAbholen, TAG_MS } from '../src/systems/Rangliste';
import { bezwungeneDungeons } from '../src/systems/Bezwungen';
import { merkeHaertegrad } from '../src/systems/Haertegrade';
import { dasGebaeude, freischaltHinweise } from '../src/systems/GebaeudeStatus';
import { kaufen } from '../src/systems/Haendler';
import { aufstiegStand, setzeHerzsteinEin, steigeAuf } from '../src/systems/Stadtweg';
import { kannWegWaehlen, waehleWeg } from '../src/systems/Spezialisierung';
import { erfolgePruefen, saalSterne } from '../src/systems/AchievementSystem';
import { bossTrophaeen, saalGlanz } from '../src/systems/Trophaeensaal';
import { placeStartingLayout, STARTING_BUILDING_TYPES } from '../src/scenes/CityStartingLayout';

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

/** Gold und Beute, als hätten die Dungeons sie gebracht */
function nachfuellen(state: GameState, kosten: Record<string, number>): void {
  for (const [id, n] of Object.entries(kosten)) state.globalStock[id] = Math.max(state.globalStock[id] ?? 0, n);
}

/** Was main.ts nach einer Expedition tut (finishExpedition), ohne Truhe und Dialoge; umkehren 'sofort': vor dem ersten Kampf */
function expedition(state: GameState, system: ExpeditionSystem, routeId: string, helden: number[], umkehren: boolean | 'sofort' = false, grad = 'normal'): void {
  const run = system.startExpedition(state, routeId, helden, grad);
  expect(run, routeId).not.toBeNull();
  state.statistics.total_expeditions = (state.statistics.total_expeditions ?? 0) + 1;
  if (umkehren === 'sofort') system.retreat(run!);
  for (let s = 0; s < 500 && run!.status === 'exploring'; s++) {
    const step = system.nextStep(run!);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run!, umkehren && run!.currentRoom >= run!.rooms.length - 2);
    else if (step === 'merchant') system.merchantSkip(run!);
    else if (step === 'choice') system.resolveChoice(run!, 0);
    else system.processCurrentRoom(state);
  }
  setBeute(state, run!);
  schmiedeBeute(run!);
  const loot = { ...run!.loot };
  finalizeExpeditionProgress(state, run!, system);
  merkeHaertegrad(state, run!);
  system.returnProvisions(state, run!);
  state.activeExpedition = null;
  for (const [id, n] of Object.entries(loot)) state.globalStock[id] = (state.globalStock[id] ?? 0) + n;
  state.globalStock.gold = (state.globalStock.gold ?? 0) + (run!.goldEarned ?? 0);
  erfolgePruefen(state, { hinweis: false });
}

/**
 * Bauen wie im Gebäude-Menü: jede Art einmal, wenn nichts sie mehr sperrt (Gildenrang).
 * Vorher Proviant beim Händler (Erfolg «Erster Kauf»).
 */
function bauen(state: GameState): void {
  if (!state.statistics.total_haendler_kaeufe) {
    nachfuellen(state, { gold: kaufpreis('bread', stadtStufeVon(state)) });
    expect(kaufen(state, 'bread').ok).toBe(true);
  }
  for (const typeId of NEUBAUTEN) {
    const def = BUILDING_DEFS[typeId];
    if (dasGebaeude(state, typeId) || freischaltHinweise(state, typeId).length > 0) continue;
    nachfuellen(state, def.buildCost);
    for (const [id, n] of Object.entries(def.buildCost)) state.globalStock[id] -= n;
    state.buildings.push(createBuildingInstance(typeId));
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
    state.fighters.push(createGuildFighter(klasse, CLASS_DEFS[klasse].name, { ...CLASS_DEFS[klasse].baseStats }));
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

/** Die versteckten Erfolge, je eine Expedition, sobald sie geht; gibt die Zahl der Expeditionen zurück */
function versteckteTaten(state: GameState, system: ExpeditionSystem, trupp: number[]): number {
  const vorher = state.statistics.total_expeditions;
  const fehlt = (id: string): boolean => !state.achievements.includes(id);
  // «Kalte Füsse»: Rückzug, bevor ein Gegner fällt
  if (fehlt('kalte_fuesse')) expedition(state, system, 'forest_short', trupp, 'sofort');
  if (istSpielbar(state, 'forest_medium')) {
    // «Keine Zeugen»: die Waldläuferin allein gegen den Boss des Tiefwalds
    if (fehlt('keine_zeugen')) expedition(state, system, 'forest_medium', [trupp[1]]);
    // «Unentschieden»: der Guardian ohne Angriff hält 20 Runden aus, der Boss auch (er trägt noch nichts; eine Waffe würde mitzählen)
    const guardian = state.fighters.find(f => f.id === trupp[0])!;
    const atk = guardian.baseStats.atk;
    if (fehlt('unentschieden')) {
      guardian.baseStats.atk = 0;
      expedition(state, system, 'forest_medium', [guardian.id]);
      guardian.baseStats.atk = atk;
    }
  }
  // «Schlafstörung»: Albtraum in bezwungenen Dungeons, bis es drei sind
  for (const id of Object.keys(bezwungeneDungeons(state))) {
    if (fehlt('schlafstoerung') && state.haertegrade?.[id] !== 'nightmare') expedition(state, system, id, trupp, false, 'nightmare');
  }
  // «Wörtlich genommen»: ein frisch angeheuerter Held allein auf Albtraum im Tiefwald
  const neuling = state.fighters.find(f => !trupp.includes(f.id));
  if (neuling && fehlt('woertlich_genommen')) expedition(state, system, 'forest_medium', [neuling.id], false, 'nightmare');
  return state.statistics.total_expeditions - vorher;
}

function fehlendeErfolge(state: GameState): string[] {
  return ACHIEVEMENT_DEFS.filter(d => !state.achievements.includes(d.id)).map(d => d.id);
}

/**
 * Das Musterspiel: an jedem Tag (echte Tage, für Auftragsbrett und Rangliste) erst die Stadt
 * (bauen, ausbauen, aufsteigen), dann Helden, Sets, Schmiede, Zettel, sechs Expeditionen
 * und fünf Tageswechsel im Spiel (ein Spieltag dauert 30 Sekunden; main.ts zählt den Tag hoch
 * und prüft die Erfolge).
 */
function musterspiel(): { state: GameState; expeditionen: number; tage: number } {
  const state = createNewGameState();
  state.rngSeed = 4711;
  placeStartingLayout(state);
  const gear = new GearSystem();
  const system = new ExpeditionSystem(gear, new ProvisionSystem());
  // Der Start-Guardian (placeStartingLayout) bleibt, die zwei anderen Startklassen kommen dazu; alle stark
  const trupp = STARTING_CLASSES.map(klasse => {
    const held = state.fighters.find(f => f.classId === klasse) ?? createGuildFighter(klasse, CLASS_DEFS[klasse].name, STARK);
    held.baseStats = { ...STARK };
    if (!state.fighters.includes(held)) state.fighters.push(held);
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
    // «Kleingedrucktes»: im Mondhof dreimal die erste Option und am letzten Kontrollpunkt umkehren
    if (istSpielbar(state, 'mondhof') && !state.achievements.includes('gipfel_kleingedrucktes')) {
      expedition(state, system, 'mondhof', trupp, true);
      expeditionen++;
    }
    expeditionen += versteckteTaten(state, system, trupp);
    for (let i = 0; i < 5; i++) {
      state.day++;
      erfolgePruefen(state);
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
});

describe('Erfolge: Ziele innerhalb dessen, was die Daten hergeben', () => {
  /**
   * Obergrenze je Zähler. Infinity: wächst mit der Zeit (Tage, Expeditionen, Zettel, Wochen).
   * Ein neuer Zähler braucht hier eine Zeile, sonst schlägt der Test fehl.
   */
  function grenzen(): Record<string, number> {
    const helden = Object.keys(CLASS_DEFS).length;
    const werkstaetten = ALLE_BAUTEN.filter(id => BUILDING_DEFS[id].manualCraft);
    return {
      total_buildings_built: NEUBAUTEN.length + ALLE_BAUTEN.reduce((s, id) => s + maxStufe(id) - 1, 0),
      total_upgrades: ALLE_BAUTEN.reduce((s, id) => s + maxStufe(id) - 1, 0),
      werkstaetten: werkstaetten.length,
      werkstatt_hoechste_stufe: Math.max(...werkstaetten.map(maxStufe)),
      total_haendler_kaeufe: Infinity,
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
      // Gipfel-Taten zählen je einmal (systems/GipfelTaten.ts)
      tat_hort: 1,
      tat_archiv: 1,
      tat_esse: 1,
      tat_schlund: 1,
      tat_pfand: 1,
      tat_uhr: 1,
      tat_kleingedrucktes: 1,
      // Das System schaut zu: je Tat höchstens 1, Albtraum in jedem Dungeon der Karte
      kalte_fuesse: 1,
      unentschieden: 1,
      woertlich_genommen: 1,
      keine_zeugen: 1,
      ohne_hose: 1,
      albtraum_dungeons: DUNGEON_GRAPH.length,
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

  test('die vier Werkstätten lassen sich bis Stufe 3 ausbauen, Gildenhaus und Händler sind keine', () => {
    expect(ALLE_BAUTEN.filter(id => BUILDING_DEFS[id].manualCraft)).toHaveLength(4);
    expect(grenzen().werkstatt_hoechste_stufe).toBe(MAX_STUFE_WERKSTATT);
    expect(BUILDING_DEFS.GUILD_HALL.manualCraft).toBeFalsy();
    expect(BUILDING_DEFS.HAENDLER.manualCraft).toBeFalsy();
  });

  test('die Sockel des Saals sind die Kapitel der Kette', () => {
    expect(SAAL_SOCKEL).toBe(saalKapitel().length);
    expect(ACHIEVEMENT_DEFS.find(d => d.id === 'saal_kette')!.ziel).toBe(saalKapitel().length);
    expect(saalKapitel().every(k => setVonItem(setTeilIds(setFuerRoute(k.routeId)!)[0]))).toBe(true);
  });
});
