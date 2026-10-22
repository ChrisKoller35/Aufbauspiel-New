import { describe, test, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { createBuildingInstance } from '../src/models/Building';
import { ACHIEVEMENT_DEFS, BEENDETE_EXPEDITIONEN, ERFOLG_GRUPPEN, zaehlerWert } from '../src/data/achievements';
import { GUILD_RANK_DEFS, rangFuerEbene } from '../src/data/guildRanks';
import { DUNGEON_GRAPH, ROUTE_DEFS, getRouteLockReasons, isRouteAvailable } from '../src/data/routes';
import { BUILDING_DEFS } from '../src/data/buildings';
import { ENEMY_DEFS } from '../src/data/enemies';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { GuildRankSystem, rangFreischaltungen } from '../src/systems/GuildRankSystem';
import {
  AchievementSystem, beiNeuenErfolgen, erfolgePruefen, freigeschalteteErfolge, kennzahlenAktualisieren,
  ungeseheneErfolge, ungeseheneErfolgIds,
} from '../src/systems/AchievementSystem';
import { erfolgHinweis, renderHeader } from '../src/ui/screens/HeaderRenderer';
import { erfolgeGeoeffnet } from '../src/ui/screens/AchievementsScreen';

const ALTE_IDS = [
  'first_building', 'first_expedition', 'first_victory', 'first_boss', 'gold_hoarder', 'mass_builder',
  'veteran_explorer', 'boss_slayer', 'survivor_100', 'army_builder', 'kill_100', 'perfectionist',
];

/** Schlüssel, die kennzahlenAktualisieren() schreibt (alle anderen muss das Spiel selbst zählen) */
const KENNZAHLEN = [
  'stadtstufe', 'helden_anzahl', 'helden_mit_weg', 'helden_meister', 'ganze_sets',
  'monsterbuch_entdeckt', 'gildenrang', 'hoechste_wohnstufe', 'gebaeude_auf_hoechststufe',
  'zettel_erledigt', 'saal_prunkstuecke', 'saal_sterne', 'rangliste_pokale', 'schmiede_hoechste_stufe',
];

const GRUND = { hp: 100, maxHp: 100, atk: 10, def: 0, spd: 1, critChance: 0, critMult: 1.5 };
const STARK = { hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1 };

function alleZaehler(): string[] {
  return [...new Set(ACHIEVEMENT_DEFS.flatMap(d => (Array.isArray(d.zaehler) ? d.zaehler : [d.zaehler])))];
}

function quelltexte(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const pfad = join(dir, name);
    if (statSync(pfad).isDirectory()) return quelltexte(pfad);
    return pfad.endsWith('.ts') && !pfad.endsWith('.test.ts') ? [pfad] : [];
  });
}

/** Eine Route zu Ende spielen wie main.ts (immer weiter, erste Wahl) */
function spieleRoute(state: GameState, system: ExpeditionSystem, routeId: string, heldId: number) {
  const run = system.startExpedition(state, routeId, [heldId])!;
  expect(run).toBeTruthy();
  for (let schutz = 0; schutz < 100; schutz++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') system.resolveChoice(run, 0);
    else system.processCurrentRoom(state);
  }
  return run;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('Erfolge: Liste', () => {
  test('IDs sind eindeutig, die 12 alten IDs gibt es noch', () => {
    const ids = ACHIEVEMENT_DEFS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ALTE_IDS) expect(ids, id).toContain(id);
    expect(ids.length).toBeGreaterThanOrEqual(25);
    expect(ids.length).toBeLessThanOrEqual(40);
  });

  test('jeder Erfolg hat Gruppe, Zeichen, Ziel und Texte mit Umlauten, ohne ß', () => {
    for (const d of ACHIEVEMENT_DEFS) {
      expect(ERFOLG_GRUPPEN, d.id).toContain(d.gruppe);
      expect(d.icon.length, d.id).toBeGreaterThan(0);
      expect(d.ziel, d.id).toBeGreaterThanOrEqual(1);
      expect(`${d.name} ${d.description}`, d.id).not.toMatch(/Gebaeude|zurueck|ueber|Ueber|aempf|fuehr|Fuehr|bekaempf|Schliesse|stueck|ß/);
    }
    for (const g of ERFOLG_GRUPPEN) expect(ACHIEVEMENT_DEFS.some(d => d.gruppe === g), g).toBe(true);
  });

  test('🏅 ist das Zeichen der Erfolge, kein Erfolg trägt es selbst', () => {
    expect(ACHIEVEMENT_DEFS.some(d => d.icon === '🏅')).toBe(false);
  });

  test('kein Erfolg hängt an einem Zähler, den niemand zählt', () => {
    const quellen = quelltexte(join(__dirname, '../src'))
      .filter(p => !p.endsWith(join('data', 'achievements.ts')))
      .map(p => readFileSync(p, 'utf8'))
      .join('\n');
    const kennzahlen = readFileSync(join(__dirname, '../src/systems/AchievementSystem.ts'), 'utf8');
    for (const key of alleZaehler()) {
      if (KENNZAHLEN.includes(key)) {
        expect(kennzahlen, key).toContain(`hoechstens('${key}'`);
        continue;
      }
      const gezaehlt = new RegExp(`(\\[['"]${key}['"]\\]|\\.${key})\\s*=(?!=)|add\\(['"]${key}['"]`);
      expect(quellen, key).toMatch(gezaehlt);
    }
  });

  test('«Wachsende Stadt» heisst jetzt bewohner_25; die alte ID bewohner_50 stört keinen Spielstand', () => {
    expect(ACHIEVEMENT_DEFS.some(d => d.id === 'bewohner_50')).toBe(false);
    expect(ACHIEVEMENT_DEFS.find(d => d.id === 'bewohner_25')).toMatchObject({ zaehler: 'total_citizens_born', ziel: 25 });

    const state = createNewGameState();
    state.achievements = ['bewohner_50', 'first_building'];
    state.statistics.total_citizens_born = 24;
    expect(() => erfolgePruefen(state)).not.toThrow();
    expect(freigeschalteteErfolge(state)).toBe(1);
    expect(ungeseheneErfolge(state)).toBe(1);
    expect(ungeseheneErfolgIds(state)).toEqual(['first_building']);
    expect(renderHeader(state)).toMatch(/<span class="hdr-erfolge-neu">1<\/span>/);
    expect(state.achievements).not.toContain('bewohner_25');

    state.statistics.total_citizens_born = 25;
    erfolgePruefen(state);
    expect(state.achievements).toContain('bewohner_25');
  });
});

describe('Erfolge: Reparaturen', () => {
  test('«Veteran» zählt keine bloss gestarteten Expeditionen', () => {
    const veteran = ACHIEVEMENT_DEFS.find(d => d.id === 'veteran_explorer')!;
    expect(veteran.condition({ total_expeditions: 50 })).toBe(false);
    expect(veteran.condition({ total_expeditions: 10, total_victories: 9 })).toBe(false);
    expect(veteran.condition({ total_victories: 4, total_defeats: 3, total_retreats: 3 })).toBe(true);
    expect(veteran.zaehler).toEqual(BEENDETE_EXPEDITIONEN);
    expect(zaehlerWert(veteran, { total_victories: 2, total_defeats: 1, total_retreats: 1, total_expeditions: 9 })).toBe(4);
  });

  test('«Armeeführer» zählt die Helden in der Gilde', () => {
    const state = createNewGameState();
    for (let i = 0; i < 10; i++) state.fighters.push(createGuildFighter(0, 'guardian', `H${i}`, GRUND));
    kennzahlenAktualisieren(state);
    expect(state.statistics.helden_anzahl).toBe(10);
    expect(new AchievementSystem().checkAchievements(state.statistics, [])).toContain('army_builder');
  });

  test('der Tageswechsel zählt Tage und trägt neue Erfolge genau einmal ein', () => {
    const state = createNewGameState();
    const economy = new EconomySystem();
    state.stadtweg = { stufe: 3, herzsteine: [], gelesen: 3 };
    economy.dayTick(state);
    expect(state.statistics.total_days_survived).toBe(1);
    expect(state.achievements.filter(id => id === 'stadtstufe_3')).toHaveLength(1);
    economy.dayTick(state);
    expect(state.statistics.total_days_survived).toBe(2);
    expect(state.achievements.filter(id => id === 'stadtstufe_3')).toHaveLength(1);

    for (let i = 0; i < 98; i++) economy.dayTick(state);
    expect(state.statistics.total_days_survived).toBe(100);
    expect(state.achievements.filter(id => id === 'survivor_100')).toHaveLength(1);
    expect(new Set(state.achievements).size).toBe(state.achievements.length);
  });

  test('Kennzahlen fallen nicht zurück, wenn ein Held die Gilde verlässt', () => {
    const state = createNewGameState();
    state.fighters.push(createGuildFighter(0, 'guardian', 'A', GRUND), createGuildFighter(0, 'guardian', 'B', GRUND));
    kennzahlenAktualisieren(state);
    state.fighters.pop();
    kennzahlenAktualisieren(state);
    expect(state.statistics.helden_anzahl).toBe(2);
  });
});

describe('Erfolge: ältere Spielstände holen nach, was ihre Daten hergeben', () => {
  test('«Überlebenskünstler» zählt die Tage, die der Spielstand schon hat', () => {
    const state = createNewGameState();
    state.day = 150;
    delete state.statistics.total_days_survived;
    erfolgePruefen(state);
    expect(state.statistics.total_days_survived).toBe(149);
    expect(state.achievements).toContain('survivor_100');
  });

  test('Siege, Bosse und Gegner aus Gildenstatistik und Bestenliste, Expeditionen mindestens so viele', () => {
    const state = createNewGameState();
    state.statistics = {};
    state.guildStats.totalExpeditionsCompleted = 12;
    state.guildStats.totalBossesDefeated = 6;
    const eintrag = (status: 'victory' | 'defeat' | 'retreat', enemiesKilled: number, bossesKilled = 0) => ({
      routeId: 'forest_short', score: 10, difficulty: 'normal', modifier: null, status,
      partyClasses: ['guardian'], timestamp: 0, day: 1, enemiesKilled, bossesKilled,
    });
    state.scoreboard = [eintrag('victory', 60, 1), eintrag('victory', 50), eintrag('defeat', 5), eintrag('retreat', 2)];
    erfolgePruefen(state);
    const s = state.statistics;
    expect(s.total_victories).toBe(12);
    expect(s.total_defeats).toBe(1);
    expect(s.total_retreats).toBe(1);
    expect(s.total_bosses_killed).toBe(6);
    expect(s.total_enemies_killed).toBe(117);
    expect(s.total_expeditions).toBe(14);
    expect(state.achievements).toEqual(expect.arrayContaining(['first_victory', 'veteran_explorer', 'boss_slayer', 'kill_100']));
  });

  test('Ausbauten aus den Stufen der Gebäude; was schon gezählt ist, bleibt', () => {
    const state = createNewGameState();
    const haus = createBuildingInstance('HOUSE_T1', 0, 0, true);
    haus.tier = 6;
    const huette = createBuildingInstance('LUMBER_CAMP', 0, 0, true);
    huette.tier = 3;
    state.buildings.push(haus, huette);
    erfolgePruefen(state);
    expect(state.statistics.total_upgrades).toBe(7);
    expect(state.statistics.total_buildings_built).toBe(7);
    expect(state.achievements).toContain('wohnviertel_6');

    state.statistics.total_upgrades = 20;
    state.statistics.total_buildings_built = 25;
    erfolgePruefen(state);
    expect(state.statistics.total_upgrades).toBe(20);
    expect(state.statistics.total_buildings_built).toBe(25);
  });

  test('ein neues Spiel bekommt nichts geschenkt', () => {
    const state = createNewGameState();
    erfolgePruefen(state);
    expect(state.achievements).toEqual([]);
    expect(state.statistics.total_days_survived).toBe(0);
  });
});

describe('Erfolge: Ende einer Expedition', () => {
  test('Gildenrang, Kette und Monsterbuch zählen sofort, in der Bilanz und ohne Hinweis in der Kopfzeile', () => {
    const state = createNewGameState();
    const held = createGuildFighter(1, 'guardian', 'Testheld', STARK);
    state.fighters.push(held);
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    const gemeldet: { ids: string[]; hinweis: boolean }[] = [];
    const abmelden = beiNeuenErfolgen((ids, _s, hinweis) => gemeldet.push({ ids, hinweis }));

    // Rang II nach drei Siegen auf dem Waldpfad, dann Rang III nach dem Boss im Tiefwald
    const bilanz: string[] = [];
    for (const routeId of ['forest_short', 'forest_short', 'forest_short', 'forest_medium']) {
      const run = spieleRoute(state, system, routeId, held.id);
      expect(run.status).toBe('victory');
      bilanz.push(...finalizeExpeditionProgress(state, run, system).newAchievements);
      state.activeExpedition = null;
    }
    abmelden();
    expect(state.guildStats.rank).toBe(3);
    expect(bilanz).toContain('Veteranengilde');
    expect(state.achievements).toContain('gildenrang_3');
    expect(gemeldet.every(m => m.hinweis === false)).toBe(true);
    expect(gemeldet.flatMap(m => m.ids)).toContain('gildenrang_3');

    // Der Tageswechsel meldet nichts davon noch einmal
    const spaeter: string[][] = [];
    const ab = beiNeuenErfolgen(ids => spaeter.push(ids));
    new EconomySystem().dayTick(state);
    ab();
    expect(spaeter.flat()).not.toContain('gildenrang_3');
    expect(new Set(state.achievements).size).toBe(state.achievements.length);
  });

  test('Platz 1 der Gipfel-Rangliste nach einer Expedition zählt für «Gipfelstürmer», ein anderer Platz nicht', () => {
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    const nachEinerExpedition = (vorher: (s: GameState) => void) => {
      const state = createNewGameState();
      const held = createGuildFighter(1, 'guardian', 'Testheld', STARK);
      state.fighters.push(held);
      vorher(state);
      const run = spieleRoute(state, system, 'forest_short', held.id);
      return { state, ...finalizeExpeditionProgress(state, run, system) };
    };

    // Neues Spiel: Die Rivalen stehen schon weiter oben
    const neu = nachEinerExpedition(() => {});
    expect(neu.rangliste.platzNachher).toBeGreaterThan(1);
    expect(neu.state.statistics.gipfel_spitze ?? 0).toBe(0);
    expect(neu.newAchievements).not.toContain('Gipfelstürmer');

    // Alle Dungeons schon bezwungen: ganz oben
    const oben = nachEinerExpedition(s => { s.bezwungen = Object.fromEntries(DUNGEON_GRAPH.map(n => [n.routeId, 0])); });
    expect(oben.rangliste.platzNachher).toBe(1);
    expect(oben.state.statistics.gipfel_spitze).toBe(1);
    expect(oben.newAchievements).toContain('Gipfelstürmer');
  });
});

describe('Erfolge: Kopfzeile', () => {
  test('🏅 mit der Zahl der neuen Erfolge, auch für Vorlesehilfen; nach dem Öffnen des Bildschirms 0', () => {
    const state = createNewGameState();
    expect(renderHeader(state)).toContain('data-nav="achievements"');
    expect(renderHeader(state)).toContain('title="Erfolge"');
    expect(renderHeader(state)).toContain('aria-label="Erfolge"');
    expect(renderHeader(state)).toContain('🏅');
    expect(renderHeader(state)).not.toContain('🏆');
    expect(renderHeader(state)).not.toContain('hdr-erfolge-neu');

    state.statistics.total_buildings_built = 1;
    state.statistics.total_expeditions = 1;
    erfolgePruefen(state);
    expect(ungeseheneErfolge(state)).toBe(2);
    expect(renderHeader(state)).toMatch(/<span class="hdr-erfolge-neu">2<\/span>/);
    expect(renderHeader(state)).toContain('aria-label="Erfolge, 2 neu"');

    erfolgeGeoeffnet(state);
    expect(ungeseheneErfolge(state)).toBe(0);
    expect(renderHeader(state)).not.toContain('hdr-erfolge-neu');

    state.statistics.total_victories = 1;
    erfolgePruefen(state);
    expect(renderHeader(state)).toMatch(/<span class="hdr-erfolge-neu">1<\/span>/);
  });

  test('Hinweis: ein oder zwei Erfolge mit Namen, ab drei nur die Zahl', () => {
    expect(erfolgHinweis(['first_building'])).toBe('🏅 Erfolg: Grundsteinlegung');
    expect(erfolgHinweis(['first_building', 'first_victory'])).toBe('🏅 Erfolge: Grundsteinlegung, Siegreich');
    expect(erfolgHinweis(['first_building', 'first_victory', 'first_boss', 'kill_100', 'gold_hoarder'])).toBe('🏅 5 neue Erfolge');
  });

  test('wer die Erfolge anschaut, speichert gleich (mc:speichern), aber nur, wenn sich etwas ändert', () => {
    const fenster = new EventTarget();
    vi.stubGlobal('window', fenster);
    let gespeichert = 0;
    fenster.addEventListener('mc:speichern', () => { gespeichert++; });

    const state = createNewGameState();
    state.statistics.total_expeditions = 1;
    erfolgePruefen(state);
    erfolgeGeoeffnet(state);
    expect(gespeichert).toBe(1);
    erfolgeGeoeffnet(state);
    expect(gespeichert).toBe(1);

    // Ein neuer Erfolg erst beim Öffnen: geprüft, angeschaut, einmal gespeichert
    state.statistics.total_victories = 1;
    erfolgeGeoeffnet(state);
    expect(state.achievements).toContain('first_victory');
    expect(ungeseheneErfolge(state)).toBe(0);
    expect(gespeichert).toBe(2);
  });
});

describe('Gildenrang: Texte aus den echten Regeln', () => {
  const normal = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
  // Wie auf der Karte von unten nach oben (grösseres y = weiter unten)
  const dungeonsVon = (rang: number) => [...DUNGEON_GRAPH].sort((a, b) => b.y - a.y).map(n => ROUTE_DEFS[n.routeId]).filter(r => rangFuerEbene(r.tier) === rang);

  test('jeder Rang nennt alle Dungeons seiner Ebene, mit Zahl, und seine Gebäude', () => {
    for (const rang of GUILD_RANK_DEFS) {
      const text = normal(rangFreischaltungen(rang.rank).join(' | '));
      const dungeons = dungeonsVon(rang.rank);
      for (const r of dungeons) expect(text, `Rang ${rang.rank}: ${r.id}`).toContain(normal(r.name));
      if (dungeons.length > 1) expect(text, `Rang ${rang.rank}`).toContain(`(${dungeons.length})`);
      for (const def of Object.values(BUILDING_DEFS)) {
        if (def.freischaltung?.gildenrang === rang.rank) {
          expect(text, `Rang ${rang.rank}: ${def.id}`).toContain(normal(def.name));
        }
      }
    }
    // Was früher fehlte: alle sieben Dungeons der Ebenen 2 bis 4, und Rang V öffnet alles über dem Vulkankern
    for (const rang of [2, 3, 4]) expect(dungeonsVon(rang).length, `Rang ${rang}`).toBeGreaterThanOrEqual(7);
    const fuenf = rangFreischaltungen(5).join(' | ');
    for (const id of ['drachenhort', 'himmelsarchiv', 'sternenschmiede', 'sternenschlund']) {
      expect(fuenf, id).toContain(ROUTE_DEFS[id].name);
    }
    expect(normal(rangFreischaltungen(3).join(' '))).toContain('gildenhaus stufe 2');
  });

  test('die Sperre auf der Karte folgt derselben Regel (route.tier)', () => {
    const alleBosse = Object.values(ROUTE_DEFS).map(r => r.bossId).filter((b): b is string => !!b);
    for (const route of Object.values(ROUTE_DEFS)) {
      const rang = rangFuerEbene(route.tier);
      const mit = createNewGameState();
      mit.guildStats.rank = rang;
      mit.guildStats.bossesDefeatedIds = alleBosse;
      expect(getRouteLockReasons(route, mit), route.id).toEqual([]);
      if (rang === 1) continue;
      mit.guildStats.rank = rang - 1;
      expect(getRouteLockReasons(route, mit).some(g => g.startsWith('Gildenrang')), route.id).toBe(true);
    }
  });

  test('beim Aufstieg getrennt: was gleich offen ist und was erst nach Bosssiegen', () => {
    const state = createNewGameState();
    state.guildStats.forestShortCompleted = 3;
    const aufstieg = new GuildRankSystem().checkRankUp(state)!;
    expect(aufstieg.newRank).toBe(2);
    const offen = dungeonsVon(2).filter(r => isRouteAvailable(r, state));
    const spaeter = dungeonsVon(2).filter(r => !isRouteAvailable(r, state));
    expect(offen.length).toBeGreaterThan(0);
    expect(spaeter.length).toBeGreaterThan(0);
    const [dungeons, danach, gebaeude] = aufstieg.unlocks;
    expect(dungeons).toBe(`Neue Dungeons (${dungeonsVon(2).length}), gleich offen: ${offen.map(r => r.name).join(', ')}`);
    expect(danach).toBe(`Nach Bosssiegen: ${spaeter.map(r => r.name).join(', ')}`);
    expect(gebaeude).toBe('Neue Gebäude: Arkanschmiede, Marktplatz (je mit Bauplan)');
    // Was gleich offen heisst, ist es auch
    for (const r of offen) expect(getRouteLockReasons(r, state), r.id).toEqual([]);
    for (const r of spaeter) expect(getRouteLockReasons(r, state).every(g => g.startsWith('Besiege')), r.id).toBe(true);
  });

  test('nichts, was es nicht gibt; jeder Aufstieg bringt etwas', () => {
    const alle = GUILD_RANK_DEFS.flatMap(r => rangFreischaltungen(r.rank)).join(' | ');
    expect(alle).not.toMatch(/MVP|Guild Hall|Schmiede-Rezepte|Talisman|Proviant|Banner|Weitere Routen|ß/);
    for (const r of GUILD_RANK_DEFS) expect(rangFreischaltungen(r.rank).length, `Rang ${r.rank}`).toBeGreaterThan(0);
    // «Titel Gildenmeister» gibt es als Erfolg
    expect(rangFreischaltungen(GUILD_RANK_DEFS.length).join(' ')).toContain('Gildenmeister');
    expect(ACHIEVEMENT_DEFS.some(d => d.name === 'Gildenmeister')).toBe(true);
    // Lesbar: keine Zeile länger als zwei Zeilen in der Bilanz
    for (const zeile of GUILD_RANK_DEFS.flatMap(r => rangFreischaltungen(r.rank))) expect(zeile.length, zeile).toBeLessThan(140);
  });

  test('Ränge haben keine eigene Dungeon-Liste mehr, die niemand liest', () => {
    for (const r of GUILD_RANK_DEFS) expect('routeUnlocks' in r, `Rang ${r.rank}`).toBe(false);
    expect('isRouteUnlocked' in GuildRankSystem.prototype).toBe(false);
  });
});

describe('Bildschirmwechsel: Sperre während einer Expedition und «Zurück»', () => {
  test('gesperrt: keine Taste und kein Knopf wechselt den Bildschirm; danach wieder', async () => {
    const fenster = new EventTarget();
    vi.stubGlobal('window', fenster);
    vi.stubGlobal('document', { getElementById: () => ({ children: [] }) });
    const wechsel: { screen: string; prev: string }[] = [];
    fenster.addEventListener('mc:navigate', e => wechsel.push((e as CustomEvent).detail));
    const router = await import('../src/ui/ScreenRouter');

    let unterwegs = true;
    router.setzeNavigationsSperre(() => unterwegs);
    router.navigateTo('achievements');
    router.navigateTo('bestiarium');
    router.goBack();
    expect(router.getCurrentScreen()).toBe('main');
    expect(wechsel).toEqual([]);

    unterwegs = false;
    router.navigateTo('gildenhaus');
    router.navigateTo('achievements');
    expect(router.getCurrentScreen()).toBe('achievements');

    // «Zurück» geht einen Schritt zurück und legt ihn nicht neu in den Verlauf: kein Hin und Her
    router.goBack();
    expect(router.getCurrentScreen()).toBe('gildenhaus');
    expect(router.getPreviousScreen()).toBe('main');
    expect(wechsel.at(-1)).toEqual({ screen: 'gildenhaus', prev: 'achievements' });
    router.goBack();
    expect(router.getCurrentScreen()).toBe('main');
    // Ohne Bildschirm davor: zum Ersatz
    router.goBack('main');
    expect(router.getCurrentScreen()).toBe('main');
    router.setzeNavigationsSperre(() => false);
  });
});

describe('Kennzahlen der Gilde: Auftragsbrett, Saal, Pokale, Schmiede', () => {
  test('aus dem Spielstand gelesen, ohne Auftragsbrett oder Rangliste anzulegen', () => {
    const state = createNewGameState();
    kennzahlenAktualisieren(state);
    expect(state.auftragsbrett).toBeUndefined();
    expect(state.rangliste).toBeUndefined();
    expect(state.trophaeen).toBeUndefined();
    expect(state.bezwungen).toBeUndefined();
    for (const key of ['zettel_erledigt', 'saal_prunkstuecke', 'saal_sterne', 'rangliste_pokale', 'schmiede_hoechste_stufe']) {
      expect(state.statistics[key], key).toBe(0);
    }
  });

  test('Pokale zählen auch, wenn die Ruhmestruhe noch wartet; Schmiede nimmt die beste Stufe', () => {
    const state = createNewGameState();
    state.schmiede = { stufen: { set_rudel_klinge: 2, set_borke_schild: 5 } };
    state.rangliste = {
      runde: 0, samen: 1, startSterne: 0, startEbene: 0, bekannt: {},
      woche: { id: '2026-W43', start: 0, ruhm: 0, ziele: {} },
      offen: [{ wocheId: '2026-W42', platz: 2, ruhm: 50, belohnung: {}, pokal: 'silber' }],
      verlauf: [], pokale: { gold: 1, silber: 0, bronze: 0 },
    };
    kennzahlenAktualisieren(state);
    expect(state.statistics.rangliste_pokale).toBe(2);
    expect(state.statistics.schmiede_hoechste_stufe).toBe(5);
    erfolgePruefen(state);
    expect(state.achievements).toEqual(expect.arrayContaining(['rangliste_pokal', 'schmiede_1', 'schmiede_5']));
  });
});

// Die Gegner-Daten müssen zu den Routen passen (sonst stimmt die Grenze fürs Monsterbuch nicht)
test('jeder Boss einer Route ist ein Boss im Monsterbuch', () => {
  for (const r of Object.values(ROUTE_DEFS)) if (r.bossId) expect(ENEMY_DEFS[r.bossId]?.isBoss, r.id).toBe(true);
});
