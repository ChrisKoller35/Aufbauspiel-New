import { describe, test, expect, vi, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { createBuildingInstance } from '../src/models/Building';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { GearSystem } from '../src/systems/GearSystem';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { SaveSystem } from '../src/systems/SaveSystem';
import { besitz, istMeisterset, setBonusWerte } from '../src/systems/DungeonSets';
import {
  bereiteTeile, einschmelzen, kannEinschmelzen, materialJeSieg, neuBereit, schmieden, schmiedeBeute,
  schmiedeFehlt, schmiedeKosten, schmiedeRabatt, schmiedeStufe, schmiedeStufen, verbesserteWerte, werteMitStufe,
} from '../src/systems/Schmiede';
import { musterStand, spieleRoute } from '../src/systems/Musterlauf';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { placeStartingLayout, createStartingCitizens } from '../src/scenes/CityStartingLayout';
import {
  HAUPTWERT, MAX_SCHMIEDE_STUFE, SCHMIEDE_MATERIALIEN, grundMenge, materialFuerRoute,
} from '../src/data/schmiede';
import { DUNGEON_SETS, getSet, setTeilIds, teilArtVonItem } from '../src/data/dungeonSets';
import { ITEM_DEFS } from '../src/data/items';
import { ROUTE_DEFS } from '../src/data/routes';
import { schmiedeTabHtml } from '../src/ui/screens/SchmiedeTab';
import { truhenHinweise } from '../src/ui/components/SchmiedeAnzeige';

const gear = new GearSystem();
const GRUND = { hp: 100, maxHp: 100, atk: 10, def: 0, spd: 1, critChance: 0, critMult: 1.5 };
const ALLE_TEILE = DUNGEON_SETS.flatMap(setTeilIds);
const KLINGE = 'set_wyrm_klinge';
const WYRM = getSet('wyrm')!;

/** Ein Held mit dem ganzen Set (oder ohne Ausrüstung) */
function held(setId: string | null = null): GuildFighter {
  const f = createGuildFighter(0, 'berserker', setId ? `Träger ${setId}` : 'Ohne', { ...GRUND });
  if (setId) for (const id of setTeilIds(getSet(setId)!)) f.gear[ITEM_DEFS[id].gearSlot!] = id;
  return f;
}

/** Spielstand mit Gold, Material und Splittern, um genug für ein paar Stufen zu haben */
function reich(extra: Record<string, number> = {}): GameState {
  const state = createNewGameState();
  Object.assign(state.globalStock, { gold: 50000, crystal_shard: 100, mat_glutkern: 1000, [KLINGE]: 1, ...extra });
  return state;
}

function lauf(routeId: string, status: ExpeditionRun['status'], geschafft: number, raeume = 10, difficulty = 'normal'): ExpeditionRun {
  return {
    routeId, party: [], currentRoom: geschafft, combatLog: [], loot: {}, goldEarned: 0, provisions: [], status,
    rooms: Array.from({ length: raeume }, (_, i) => ({
      index: i, type: 'combat' as const, enemies: [], healPercent: 0, hazardDamage: 0, completed: i < geschafft,
    })),
    lastCheckpoint: 0, desperateResolveUsed: false, rngSeed: 1, focusTarget: null, focusTargetCooldown: 0,
    difficulty, activeModifier: null, score: 0, totalCombatRounds: 0, enemiesKilled: 0, bossesKilled: 0, abilitiesUsed: {},
  };
}

describe('Schmiede: Material', () => {
  test('jeder Dungeon lässt genau ein Material fallen, und jedes Material hat ein Bild', () => {
    for (const id of Object.keys(ROUTE_DEFS)) {
      const zahl = SCHMIEDE_MATERIALIEN.filter(m => m.routen.includes(id)).length;
      expect(zahl, id).toBe(1);
    }
    for (const m of SCHMIEDE_MATERIALIEN) {
      for (const r of m.routen) expect(ROUTE_DEFS[r], `${m.id}: ${r}`).toBeTruthy();
      expect(ITEM_DEFS[m.id]?.type).toBe('material');
      expect(existsSync(`public/assets/sprites/final/${m.bild}.png`), m.bild).toBe(true);
    }
  });

  test('jedes Set-Teil hat ein Material aus dem Gebiet seines Dungeons', () => {
    for (const set of DUNGEON_SETS) {
      expect(materialFuerRoute(set.routeId), set.id).toBeTruthy();
    }
    expect(materialFuerRoute('volcano_core')?.name).toBe('Glutkern');
    expect(materialFuerRoute('forest_short')?.name).toBe('Waldharz');
  });

  test('ein Sieg bringt die Grundmenge der Ebene, schwerere Stufen mehr', () => {
    expect(materialJeSieg('forest_short')).toMatchObject({ menge: 3 });
    expect(materialJeSieg('volcano_core')).toMatchObject({ menge: 6 });
    expect(materialJeSieg('volcano_core', 'hard')?.menge).toBe(9);
    expect(materialJeSieg('volcano_core', 'nightmare')?.menge).toBe(12);
    expect(materialJeSieg('volcano_core', 'infernal')?.menge).toBe(18);
    expect(materialJeSieg('himmelsarchiv')).toMatchObject({ menge: 8 });
  });
});

describe('Schmiede: Werte je Stufe', () => {
  test('Stufe 0 und andere Gegenstände bleiben, wie sie sind', () => {
    expect(verbesserteWerte(KLINGE, 0)).toEqual(ITEM_DEFS[KLINGE].statBonuses);
    expect(verbesserteWerte('soulbreaker', 5)).toEqual(ITEM_DEFS.soulbreaker.statBonuses);
    expect(werteMitStufe(KLINGE, {})).toEqual(ITEM_DEFS[KLINGE].statBonuses);
  });

  test('Beispiel Wyrmzahnklinge: +3 und +5', () => {
    expect(ITEM_DEFS[KLINGE].statBonuses).toEqual({ atk: 10, def: 2, critChance: 0.08 });
    expect(verbesserteWerte(KLINGE, 3)).toEqual({ atk: 13, def: 3, critChance: 0.1 });
    expect(verbesserteWerte(KLINGE, 5)).toEqual({ atk: 15, def: 3, critChance: 0.12 });
    expect(verbesserteWerte('set_wyrm_platte', 5)).toEqual({ def: 18, hp: 30 });
  });

  test('der Ring wächst bei der Krit-Chance, nicht beim kleinen Angriff', () => {
    const ring = 'set_irrlicht_ring';
    expect(ITEM_DEFS[ring].statBonuses).toEqual({ atk: 2, spd: 0.05, critChance: 0.06 });
    expect(verbesserteWerte(ring, 1)).toEqual({ atk: 2, spd: 0.06, critChance: 0.07 });
    expect(verbesserteWerte(ring, 5)).toEqual({ atk: 3, spd: 0.08, critChance: 0.11 });
  });

  test('jede Stufe macht jedes Teil sichtbar besser und nie einen Wert schlechter', () => {
    for (const id of ALLE_TEILE) {
      const haupt = HAUPTWERT[teilArtVonItem(id)!];
      for (let n = 1; n <= MAX_SCHMIEDE_STUFE; n++) {
        const vorher = verbesserteWerte(id, n - 1)!;
        const nachher = verbesserteWerte(id, n)!;
        for (const [stat, wert] of Object.entries(vorher) as [keyof typeof vorher, number][]) {
          expect(nachher[stat]!, `${id} +${n} ${stat}`).toBeGreaterThanOrEqual(wert);
        }
        const schritt = haupt === 'critChance' ? 0.01 : 1;
        expect((nachher[haupt] ?? 0) - (vorher[haupt] ?? 0), `${id} +${n} ${haupt}`).toBeGreaterThanOrEqual(schritt - 1e-9);
      }
    }
  });

  test('+5 macht die Werte um mindestens die Hälfte stärker, negatives Tempo bleibt', () => {
    for (const id of ALLE_TEILE) {
      const basis = ITEM_DEFS[id].statBonuses!;
      const voll = verbesserteWerte(id, MAX_SCHMIEDE_STUFE)!;
      for (const [stat, wert] of Object.entries(basis) as [keyof typeof basis, number][]) {
        if (wert < 0) expect(voll[stat], `${id} ${stat}`).toBe(wert);
        else if (stat === 'atk' || stat === 'def' || stat === 'hp') expect(voll[stat]!, `${id} ${stat}`).toBeGreaterThanOrEqual(Math.round(wert * 1.5));
        else expect(voll[stat]!, `${id} ${stat}`).toBeGreaterThan(wert);
      }
    }
  });
});

describe('Schmiede: Kosten und Schmieden', () => {
  test('Kosten wachsen mit Stufe und Ebene, ab +3 kommen Kristallsplitter dazu', () => {
    const state = reich();
    expect(schmiedeKosten(state, KLINGE)).toMatchObject({ aufStufe: 1, menge: 12, gold: 80, splitter: 0, rabatt: 0 });
    state.schmiede = { stufen: { [KLINGE]: 2 } };
    expect(schmiedeKosten(state, KLINGE)).toMatchObject({ aufStufe: 3, menge: 30, gold: 320, splitter: 3 });
    state.schmiede.stufen[KLINGE] = 4;
    expect(schmiedeKosten(state, KLINGE)).toMatchObject({ aufStufe: 5, menge: 72, gold: 1280, splitter: 12 });
    state.schmiede.stufen[KLINGE] = 5;
    expect(schmiedeKosten(state, KLINGE)).toBeNull();
    expect(schmiedeKosten(state, 'soulbreaker')).toBeNull();
    expect(schmiedeKosten(reich(), 'set_rudel_klinge')).toMatchObject({ menge: 6, gold: 20 });
  });

  test('die Schmiede in der Stadt spart Gold, 10 % je Ausbaustufe, nur fertig gebaut', () => {
    const state = reich();
    const schmiede = createBuildingInstance('SMITHY', 0, 0, false);
    state.buildings.push(schmiede);
    expect(schmiedeRabatt(state)).toBe(0);
    schmiede.built = true;
    schmiede.tier = 2;
    expect(schmiedeRabatt(state)).toBe(0.2);
    expect(schmiedeKosten(state, KLINGE)?.gold).toBe(64);
  });

  test('schmieden bezahlt genau und hebt die Stufe für alle Exemplare', () => {
    const state = reich({ [KLINGE]: 1 });
    const traeger = held();
    traeger.gear.mainHand = KLINGE;
    state.fighters.push(traeger);
    const vorher = { ...state.globalStock };
    expect(schmieden(state, KLINGE)).toBe(1);
    expect(state.globalStock.mat_glutkern).toBe(vorher.mat_glutkern - 12);
    expect(state.globalStock.gold).toBe(vorher.gold - 80);
    expect(state.globalStock.crystal_shard).toBe(vorher.crystal_shard);
    expect(schmiedeStufe(state, KLINGE)).toBe(1);
    expect(schmieden(state, KLINGE)).toBe(2);
    expect(schmieden(state, KLINGE)).toBe(3);
    expect(state.globalStock.crystal_shard).toBe(vorher.crystal_shard - 3);
    // getragen und im Lager: dieselbe Stufe, dieselben Werte
    expect(gear.getEffectiveStats(traeger, schmiedeStufen(state)).atk).toBe(GRUND.atk + 13);
    expect(werteMitStufe(KLINGE, schmiedeStufen(state))?.atk).toBe(13);
  });

  test('fehlt etwas, passiert nichts, und die Schmiede sagt, was fehlt', () => {
    const state = createNewGameState();
    Object.assign(state.globalStock, { gold: 50, mat_glutkern: 5, [KLINGE]: 1 });
    expect(schmiedeFehlt(state, KLINGE)).toEqual([
      { was: 'material', name: 'Glutkern', fehlt: 7 },
      { was: 'gold', name: 'Gold', fehlt: 30 },
    ]);
    const vorher = { ...state.globalStock };
    expect(schmieden(state, KLINGE)).toBeNull();
    expect(state.globalStock).toEqual(vorher);
    expect(state.schmiede).toBeUndefined();
  });

  test('ohne das Teil kein Schmieden, ein Teil am Helden reicht', () => {
    const state = reich({ [KLINGE]: 0 });
    expect(schmieden(state, KLINGE)).toBeNull();
    const traeger = held('wyrm');
    state.fighters.push(traeger);
    expect(schmieden(state, KLINGE)).toBe(1);
  });

  test('nach +5 geht nichts mehr', () => {
    const state = reich();
    for (let n = 1; n <= MAX_SCHMIEDE_STUFE; n++) expect(schmieden(state, KLINGE)).toBe(n);
    expect(schmieden(state, KLINGE)).toBeNull();
    expect(schmiedeStufe(state, KLINGE)).toBe(5);
  });
});

describe('Schmiede: Einschmelzen', () => {
  test('nur ein doppeltes Exemplar aus dem Lager, das letzte der Gilde bleibt', () => {
    const state = createNewGameState();
    state.globalStock[KLINGE] = 1;
    expect(kannEinschmelzen(state, KLINGE)).toBe(false);
    state.globalStock[KLINGE] = 2;
    expect(kannEinschmelzen(state, KLINGE)).toBe(true);

    // Zwei Helden tragen je eins, im Lager liegt keins: nichts einzuschmelzen
    const zwei = createNewGameState();
    zwei.fighters.push(held('wyrm'), held('wyrm'));
    expect(besitz(zwei, KLINGE)).toBe(2);
    expect(kannEinschmelzen(zwei, KLINGE)).toBe(false);

    // Einer trägt eins, eins liegt im Lager: das im Lager darf weg
    const getragen = createNewGameState();
    getragen.fighters.push(held('wyrm'));
    getragen.globalStock[KLINGE] = 1;
    expect(kannEinschmelzen(getragen, KLINGE)).toBe(true);
  });

  test('bringt zwei Grundmengen Material und lässt die Stufe stehen', () => {
    const state = createNewGameState();
    state.globalStock[KLINGE] = 2;
    state.schmiede = { stufen: { [KLINGE]: 3 } };
    expect(einschmelzen(state, KLINGE)).toMatchObject({ menge: 12 });
    expect(state.globalStock[KLINGE]).toBe(1);
    expect(state.globalStock.mat_glutkern).toBe(12);
    expect(schmiedeStufe(state, KLINGE)).toBe(3);
    expect(einschmelzen(state, KLINGE)).toBeNull();
    expect(state.globalStock[KLINGE]).toBe(1);
  });
});

describe('Schmiede: Helden und Kampf', () => {
  test('verbesserte Teile zählen in den Werten, ohne Stufen bleibt alles wie vorher', () => {
    const traeger = held('wyrm');
    const ohne = gear.getEffectiveStats(traeger);
    expect(gear.getEffectiveStats(traeger, {})).toEqual(ohne);
    const stufen = { [KLINGE]: 3, set_wyrm_platte: 1 };
    const mit = gear.getEffectiveStats(traeger, stufen);
    expect(mit.atk - ohne.atk).toBe(3);
    expect(mit.def - ohne.def).toBe(1 + 1);
    expect(mit.maxHp - ohne.maxHp).toBe(2);
    expect(mit.critChance - ohne.critChance).toBeCloseTo(0.02);
  });

  test('Meisterset: alle drei Teile auf +5 zählen den Zwei-Teile-Bonus doppelt', () => {
    const traeger = held('wyrm');
    const alle5 = Object.fromEntries(setTeilIds(WYRM).map(id => [id, 5]));
    expect(istMeisterset(WYRM, traeger.gear, alle5)).toBe(true);
    expect(istMeisterset(WYRM, traeger.gear, { ...alle5, set_wyrm_amulett: 4 })).toBe(false);
    expect(istMeisterset(WYRM, traeger.gear, undefined)).toBe(false);
    expect(setBonusWerte(traeger.gear, alle5).atk).toBe(2 * WYRM.zweiTeile.atk!);
    expect(setBonusWerte(traeger.gear).atk).toBe(WYRM.zweiTeile.atk);

    // Zwei Teile auf +5 an einem Helden mit nur zwei Teilen: kein Meisterset
    const zwei = held();
    zwei.gear.mainHand = KLINGE;
    zwei.gear.armor = 'set_wyrm_platte';
    expect(istMeisterset(WYRM, zwei.gear, alle5)).toBe(false);

    const ohne = gear.getEffectiveStats(traeger, { ...alle5, set_wyrm_amulett: 4 });
    const mit = gear.getEffectiveStats(traeger, alle5);
    const amulettSchritt = verbesserteWerte('set_wyrm_amulett', 5)!.atk! - verbesserteWerte('set_wyrm_amulett', 4)!.atk!;
    expect(mit.atk - ohne.atk).toBe(WYRM.zweiTeile.atk! + amulettSchritt);
  });

  test('die Expedition rechnet mit den Stufen der Gilde', () => {
    const angriff = (stufen?: Record<string, number>): number => {
      const state = createNewGameState();
      if (stufen) state.schmiede = { stufen };
      const traeger = held('wyrm');
      state.fighters.push(traeger);
      const run = new ExpeditionSystem(gear, new ProvisionSystem()).startExpedition(state, 'forest_short', [traeger.id])!;
      return run.party[0].atk;
    };
    expect(angriff({ [KLINGE]: 5 }) - angriff()).toBe(5);
  });
});

describe('Schmiede: Beute nach der Expedition', () => {
  test('Sieg: volle Menge in die Beute, ein zweiter Aufruf gibt nichts mehr', () => {
    const run = lauf('volcano_core', 'victory', 10);
    expect(schmiedeBeute(run)).toEqual({ itemId: 'mat_glutkern', menge: 6 });
    expect(run.loot.mat_glutkern).toBe(6);
    expect(schmiedeBeute(run)).toBeNull();
    expect(run.loot.mat_glutkern).toBe(6);
    const schwer = lauf('volcano_core', 'victory', 10, 10, 'infernal');
    expect(schmiedeBeute(schwer)?.menge).toBe(18);
  });

  test('Niederlage und Rückzug: die Hälfte nach den geschafften Räumen', () => {
    const halb = lauf('volcano_core', 'defeat', 5, 10, 'nightmare');
    expect(schmiedeBeute(halb)).toEqual({ itemId: 'mat_glutkern', menge: 3 });
    const frueh = lauf('volcano_core', 'retreat', 1, 10);
    expect(schmiedeBeute(frueh)).toBeNull();
    expect(frueh.loot).toEqual({});
    expect(frueh.schmiedeMaterial).toBeNull();
  });

  test('eine ganze Expedition bringt Material des Dungeons in die Truhe', () => {
    const { state, ids } = musterStand('gut', 7);
    const run = spieleRoute(state, ids, 'cave_spider', 'klug');
    expect(run.status).toBe('victory');
    const beute = schmiedeBeute(run);
    expect(beute).toEqual({ itemId: 'mat_hoehlenerz', menge: grundMenge(ROUTE_DEFS.cave_spider.tier) });
    expect(run.loot.mat_hoehlenerz).toBe(beute!.menge);
  });

  test('Truhe: Set-Teile nennen ihre Stufe, das Material sagt, wofür es ist', () => {
    const state = createNewGameState();
    state.schmiede = { stufen: { [KLINGE]: 2 } };
    const hinweise = truhenHinweise(state, { [KLINGE]: '🔥 Glut des Magma-Wyrms · schon da' }, 'mat_glutkern');
    expect(hinweise[KLINGE]).toBe('🔥 Glut des Magma-Wyrms · schon da · ⚒️ +2');
    expect(hinweise.mat_glutkern).toBe('⚒️ Für die Schmiede: Set-Teile aus dem Feuer');
  });

  test('nach der Beute: was in der Schmiede neu möglich ist', () => {
    const state = createNewGameState();
    Object.assign(state.globalStock, { gold: 1000, [KLINGE]: 1, mat_glutkern: 6 });
    const vorher = bereiteTeile(state);
    expect(vorher).not.toContain(KLINGE);
    state.globalStock.mat_glutkern += 6;
    expect(neuBereit(state, vorher)).toEqual(['Wyrmzahnklinge auf +1']);
    expect(neuBereit(state, bereiteTeile(state))).toEqual([]);
  });
});

describe('Schmiede: Spielstand, Probespiel und Anzeige', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('alte Spielstände ohne Schmiede laufen, die Stufen überstehen Speichern und Laden', () => {
    const daten = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => daten.get(k) ?? null,
      setItem: (k: string, v: string) => { daten.set(k, v); },
      removeItem: (k: string) => { daten.delete(k); },
    });
    const alt = createNewGameState();
    expect(schmiedeStufen(alt)).toEqual({});
    expect(schmiedeStufe(alt, KLINGE)).toBe(0);
    const state = reich();
    schmieden(state, KLINGE);
    const system = new SaveSystem();
    system.save(state);
    expect(system.load()?.schmiede).toEqual({ stufen: { [KLINGE]: 1 } });
  });

  test('Probespiel: das Wyrm-Set mit doppelter Klinge und Glutkern für drei Stufen', () => {
    const state = createNewGameState();
    placeStartingLayout(state);
    createStartingCitizens(state);
    richteProbespielEin(state);
    expect(kannEinschmelzen(state, KLINGE)).toBe(true);
    expect([schmieden(state, KLINGE), schmieden(state, KLINGE), schmieden(state, KLINGE)]).toEqual([1, 2, 3]);
    expect(schmieden(state, KLINGE)).toBeNull();
    expect(schmiedeFehlt(state, KLINGE)?.map(f => f.was)).toEqual(['material']);
  });

  test('der Tab zeigt Teile, Kosten, Einschmelzen und was fehlt', () => {
    const state = createNewGameState();
    Object.assign(state.globalStock, { gold: 1000, [KLINGE]: 2, set_wyrm_platte: 1, mat_glutkern: 14 });
    state.schmiede = { stufen: { set_wyrm_platte: 5 } };
    const html = schmiedeTabHtml(state);
    expect(html).toContain('Glut des Magma-Wyrms');
    expect(html).toContain(`data-schmieden="${KLINGE}"`);
    expect(html).toContain('⚒️ AUF +1');
    expect(html).toContain('Glutkern <b>14/12</b>');
    expect(html).toContain('🔥 Einschmelzen +12');
    expect(html).toContain('✦ Höchste Stufe');
    expect(html).toContain('Meisterset 1/3');
    expect(html).not.toContain('Es fehlen');
    state.globalStock.gold = 10;
    expect(schmiedeTabHtml(state)).toContain('Es fehlen 70 Gold.');
    expect(schmiedeTabHtml(createNewGameState())).toContain('Noch keine Set-Teile');
  });
});
