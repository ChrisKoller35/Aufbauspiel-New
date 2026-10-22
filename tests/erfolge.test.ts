import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { createBuildingInstance } from '../src/models/Building';
import { ACHIEVEMENT_DEFS, BEENDETE_EXPEDITIONEN, ERFOLG_GRUPPEN, zaehlerWert } from '../src/data/achievements';
import { GUILD_RANK_DEFS } from '../src/data/guildRanks';
import { ROUTE_DEFS } from '../src/data/routes';
import { BUILDING_DEFS } from '../src/data/buildings';
import { ENEMY_DEFS } from '../src/data/enemies';
import { DUNGEON_SETS, setTeilIds } from '../src/data/dungeonSets';
import { HOECHSTE_STADTSTUFE } from '../src/data/stadtstufen';
import { MEISTER_AB_STUFE, wegeDerKlasse } from '../src/data/spezialisierungen';
import { MAX_HERO_LEVEL } from '../src/systems/HeroProgression';
import { MAX_STUFE_WOHNEN, maxStufe } from '../src/systems/Ausbau';
import { GearSystem } from '../src/systems/GearSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import {
  AchievementSystem, erfolgePruefen, kennzahlenAktualisieren, ungeseheneErfolge,
} from '../src/systems/AchievementSystem';
import { renderHeader } from '../src/ui/screens/HeaderRenderer';
import { erfolgeGeoeffnet } from '../src/ui/screens/AchievementsScreen';

const ALTE_IDS = [
  'first_building', 'first_expedition', 'first_victory', 'first_boss', 'gold_hoarder', 'mass_builder',
  'veteran_explorer', 'boss_slayer', 'survivor_100', 'army_builder', 'kill_100', 'perfectionist',
];

/** Schlüssel, die kennzahlenAktualisieren() schreibt (alle anderen muss das Spiel selbst zählen) */
const KENNZAHLEN = [
  'stadtstufe', 'helden_anzahl', 'helden_mit_weg', 'helden_meister', 'ganze_sets',
  'monsterbuch_entdeckt', 'gildenrang', 'hoechste_wohnstufe', 'gebaeude_auf_hoechststufe',
];

const GRUND = { hp: 100, maxHp: 100, atk: 10, def: 0, spd: 1, critChance: 0, critMult: 1.5 };

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

/** Ein weit fortgeschrittener Spielstand, den man im Spiel erreichen kann */
function grosseStadt(): GameState {
  const state = createNewGameState();
  state.stadtweg = { stufe: HOECHSTE_STADTSTUFE, herzsteine: [], gelesen: HOECHSTE_STADTSTUFE };
  state.guildStats.rank = GUILD_RANK_DEFS.length;

  const gear = new GearSystem();
  const wege = wegeDerKlasse('guardian');
  for (let i = 0; i < 10; i++) {
    const held = createGuildFighter(0, i < 3 ? 'berserker' : 'guardian', `Held ${i}`, GRUND);
    if (i < 3) {
      // Drei Helden mit je einem ganzen Set
      const set = DUNGEON_SETS[i];
      if (set.teile.some(t => t.art === 'schild') && !set.teile.some(t => t.art === 'klinge' || t.art === 'dolch')) {
        state.globalStock.iron_sword = 1;
        gear.equip(state, held, 'iron_sword');
      }
      for (const id of setTeilIds(set)) {
        state.globalStock[id] = 1;
        expect(gear.equip(state, held, id)).toBe(true);
      }
    } else {
      held.level = MAX_HERO_LEVEL;
      held.spezialisierung = wege[0].id;
    }
    state.fighters.push(held);
  }

  const haus = createBuildingInstance('HOUSE_T1', 0, 0, true);
  haus.tier = MAX_STUFE_WOHNEN;
  state.buildings.push(haus);
  state.bestiarium.discovered = [...gegnerInRouten()];

  // Was das Spiel selbst zählt: mit genug Zeit beliebig hoch
  for (const key of alleZaehler().filter(k => !KENNZAHLEN.includes(k))) state.statistics[key] = 100000;
  return state;
}

describe('Erfolge: Liste', () => {
  test('IDs sind eindeutig, die 12 alten IDs gibt es noch', () => {
    const ids = ACHIEVEMENT_DEFS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ALTE_IDS) expect(ids, id).toContain(id);
    expect(ids.length).toBeGreaterThanOrEqual(25);
    expect(ids.length).toBeLessThanOrEqual(30);
  });

  test('jeder Erfolg hat Gruppe, Zeichen, Ziel und Texte mit Umlauten', () => {
    for (const d of ACHIEVEMENT_DEFS) {
      expect(ERFOLG_GRUPPEN, d.id).toContain(d.gruppe);
      expect(d.icon.length, d.id).toBeGreaterThan(0);
      expect(d.ziel, d.id).toBeGreaterThanOrEqual(1);
      expect(`${d.name} ${d.description}`, d.id).not.toMatch(/Gebaeude|zurueck|ueber|Ueber|aempf|fuehr|bekaempf|Schliesse/);
    }
    for (const g of ERFOLG_GRUPPEN) expect(ACHIEVEMENT_DEFS.some(d => d.gruppe === g), g).toBe(true);
  });

  test('kein Erfolg hängt an einem Zähler, den niemand zählt', () => {
    const quellen = quelltexte(join(__dirname, '../src'))
      .filter(p => !p.endsWith(join('data', 'achievements.ts')))
      .map(p => readFileSync(p, 'utf8'))
      .join('\n');
    for (const key of alleZaehler()) {
      if (KENNZAHLEN.includes(key)) continue;
      const gezaehlt = new RegExp(`(\\[['"]${key}['"]\\]|\\.${key})\\s*=(?!=)|add\\(['"]${key}['"]`);
      expect(quellen, key).toMatch(gezaehlt);
    }
  });

  test('jeder Erfolg ist erreichbar: ein weit fortgeschrittener Spielstand erfüllt alle', () => {
    const state = grosseStadt();
    erfolgePruefen(state);
    const fehlen = ACHIEVEMENT_DEFS.filter(d => !state.achievements.includes(d.id)).map(d => d.id);
    expect(fehlen).toEqual([]);
  });

  test('Ziele der Kennzahlen liegen innerhalb dessen, was das Spiel hergibt', () => {
    const grenze: Record<string, number> = {
      stadtstufe: HOECHSTE_STADTSTUFE,
      gildenrang: GUILD_RANK_DEFS.length,
      hoechste_wohnstufe: maxStufe('HOUSE_T1'),
      ganze_sets: DUNGEON_SETS.length,
      monsterbuch_entdeckt: gegnerInRouten().size,
      gebaeude_auf_hoechststufe: Object.keys(BUILDING_DEFS).filter(id => maxStufe(id) > 1).length,
    };
    for (const d of ACHIEVEMENT_DEFS) {
      const key = Array.isArray(d.zaehler) ? null : d.zaehler;
      if (key && grenze[key] != null) expect(d.ziel, d.id).toBeLessThanOrEqual(grenze[key]);
    }
    expect(MAX_HERO_LEVEL).toBeGreaterThanOrEqual(MEISTER_AB_STUFE);
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

describe('Erfolge: Kopfzeile', () => {
  test('die Kopfzeile zeigt die Zahl der neuen Erfolge, nach dem Öffnen des Bildschirms 0', () => {
    const state = createNewGameState();
    expect(renderHeader(state)).toContain('data-nav="achievements"');
    expect(renderHeader(state)).toContain('title="Erfolge"');
    expect(renderHeader(state)).not.toContain('hdr-erfolge-neu');

    state.statistics.total_buildings_built = 1;
    state.statistics.total_expeditions = 1;
    erfolgePruefen(state);
    expect(ungeseheneErfolge(state)).toBe(2);
    expect(renderHeader(state)).toMatch(/<span class="hdr-erfolge-neu">2<\/span>/);

    erfolgeGeoeffnet(state);
    expect(ungeseheneErfolge(state)).toBe(0);
    expect(renderHeader(state)).not.toContain('hdr-erfolge-neu');

    state.statistics.total_victories = 1;
    erfolgePruefen(state);
    expect(renderHeader(state)).toMatch(/<span class="hdr-erfolge-neu">1<\/span>/);
  });
});

describe('Gildenrang: ehrliche Texte', () => {
  const normal = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');

  test('jeder Rang nennt seine Dungeons und Gebäude', () => {
    for (const rang of GUILD_RANK_DEFS) {
      const text = normal(rang.unlocks.join(' | '));
      for (const routeId of rang.routeUnlocks ?? []) {
        expect(text, `Rang ${rang.rank}: ${routeId}`).toContain(normal(ROUTE_DEFS[routeId].name));
      }
      for (const def of Object.values(BUILDING_DEFS)) {
        if (def.freischaltung?.gildenrang === rang.rank) {
          expect(text, `Rang ${rang.rank}: ${def.id}`).toContain(normal(def.name));
        }
      }
    }
    expect(normal(GUILD_RANK_DEFS.find(r => r.rank === 3)!.unlocks.join(' '))).toContain('gildenhaus auf stufe 2');
  });

  test('nichts, was es nicht gibt', () => {
    const alle = GUILD_RANK_DEFS.flatMap(r => r.unlocks).join(' | ');
    expect(alle).not.toMatch(/MVP|Guild Hall|Schmiede-Rezepte|Talisman|Proviant|Banner|Weitere Routen/);
    for (const r of GUILD_RANK_DEFS) expect(r.unlocks.length, `Rang ${r.rank}`).toBeGreaterThan(0);
    // «Titel Gildenmeister» gibt es als Erfolg
    expect(alle).toContain('Gildenmeister');
    expect(ACHIEVEMENT_DEFS.some(d => d.name === 'Gildenmeister')).toBe(true);
  });
});
