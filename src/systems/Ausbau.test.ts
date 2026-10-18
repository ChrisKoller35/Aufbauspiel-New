import { describe, it, expect } from 'vitest';
import {
  maxStufe, ausbauKosten, ausbauInfo, ausbauen, zyklusSekunden, arbeitsplaetze, hausKapazitaet, wohnKapazitaet,
  kapazitaetAufStufe, investiert, vereinigeDoppelte, wirkungsStufe, erlaubteStufe, fehlendeStadtstufe,
} from './Ausbau';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, BuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';
import { RECIPE_DEFS } from '../data/recipes';
import { BUILDING_DEFS } from '../data/buildings';

const HOLZ = RECIPE_DEFS.RCP_WOOD_1;
const HUETTE = BUILDING_DEFS.LUMBER_CAMP.buildCost.wood;

function bauen(state: GameState, typeId: string, recipeId?: string): BuildingInstance {
  const b = createBuildingInstance(typeId, 0, 0, true);
  b.connected = true;
  if (recipeId) b.activeRecipeId = recipeId;
  state.buildings.push(b);
  return b;
}

function arbeiter(state: GameState, b: BuildingInstance): void {
  const c = createCitizen('WORKER');
  c.assignedBuildingId = b.id;
  b.assignedWorkerIds.push(c.id);
  state.citizens.push(c);
}

describe('Ausbau: Stufen und Kosten', () => {
  it('höchste Stufe je Gebäude-Art', () => {
    expect(maxStufe('LUMBER_CAMP')).toBe(3);
    expect(maxStufe('SMITHY')).toBe(3);
    expect(maxStufe('HOUSE_T1')).toBe(6);
    expect(maxStufe('GUILD_HALL')).toBe(2);
    expect(maxStufe('MARKETPLACE')).toBe(3);
    expect(maxStufe('BANK')).toBe(3);
    expect(maxStufe('WELL')).toBe(1);
    expect(maxStufe('WAREHOUSE')).toBe(1);
  });

  it('Ausbau kostet Baukosten mal Stufe, Wohnviertel ab Stufe 3 zusätzlich Stein', () => {
    expect(ausbauKosten('LUMBER_CAMP', 2)).toEqual({ wood: HUETTE * 2 });
    expect(ausbauKosten('LUMBER_CAMP', 3)).toEqual({ wood: HUETTE * 3 });
    expect(ausbauKosten('HOUSE_T1', 2)).toEqual({ wood: 28 });
    expect(ausbauKosten('HOUSE_T1', 3)).toEqual({ wood: 42, stone: 5 });
    expect(ausbauKosten('HOUSE_T1', 4)).toEqual({ wood: 56, stone: 10 });
    expect(ausbauKosten('GUILD_HALL', 2)).toEqual({ wood: 60, stone: 20, crystal_shard: 3, gold: 80 });
  });

  it('investiert summiert Bau und alle Ausbauten', () => {
    expect(investiert('LUMBER_CAMP', 1)).toEqual({ wood: HUETTE });
    expect(investiert('LUMBER_CAMP', 3)).toEqual({ wood: HUETTE * 6 });
  });

  it('Wohnviertel: 6 Plätze je Stufe', () => {
    const state = createNewGameState();
    const haus = bauen(state, 'HOUSE_T1');
    expect(hausKapazitaet(haus)).toBe(6);
    haus.tier = 3;
    expect(hausKapazitaet(haus)).toBe(18);
    expect(wohnKapazitaet(state)).toBe(18);
    expect(kapazitaetAufStufe('HOUSE_T1', 6)).toBe(36);
  });
});

describe('Ausbau: ausbauen', () => {
  it('zieht die Kosten ab, hebt die Stufe und gibt einen zweiten Arbeitsplatz', () => {
    const state = createNewGameState();
    state.stadtweg!.stufe = 3; // Dorf: Werkstätten bis Stufe 2
    const huette = bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    arbeiter(state, huette);
    state.globalStock.wood = 100;
    const vorher = zyklusSekunden(huette, HOLZ);

    expect(ausbauen(state, huette)).toBe(true);

    expect(huette.tier).toBe(2);
    expect(state.globalStock.wood).toBe(100 - HUETTE * 2);
    expect(arbeitsplaetze(huette)).toBe(2);
    // Ein Arbeiter auf zwei Plätzen: gleiches Tempo wie vorher
    expect(zyklusSekunden(huette, HOLZ)).toBe(vorher);
    arbeiter(state, huette);
    expect(zyklusSekunden(huette, HOLZ)).toBeCloseTo(vorher / 2);
    expect(state.statistics.total_buildings_built).toBe(1);
    expect(state.statistics.total_upgrades).toBe(1);
  });

  it('ohne Rohstoffe kein Ausbau', () => {
    const state = createNewGameState();
    const huette = bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    state.globalStock.wood = 0;
    expect(ausbauInfo(state, huette).bezahlbar).toBe(false);
    expect(ausbauen(state, huette)).toBe(false);
    expect(huette.tier).toBe(1);
  });

  it('auf der höchsten Stufe gibt es keinen weiteren Ausbau', () => {
    const state = createNewGameState();
    const huette = bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    huette.tier = 3;
    state.globalStock.wood = 1000;
    expect(ausbauInfo(state, huette).naechste).toBeNull();
    expect(ausbauen(state, huette)).toBe(false);
  });

  it('Gildenhaus Stufe 2 braucht Gildenrang 3 und erlaubt 4 Helden je Expedition', () => {
    const state = createNewGameState();
    const gilde = bauen(state, 'GUILD_HALL');
    Object.assign(state.globalStock, { wood: 100, stone: 50, crystal_shard: 5, gold: 200 });
    state.guildStats.rank = 2;
    expect(ausbauInfo(state, gilde).hinweis).toContain('Gildenrang 3');
    expect(ausbauen(state, gilde)).toBe(false);

    state.guildStats.rank = 3;
    expect(ausbauen(state, gilde)).toBe(true);
    expect(gilde.tier).toBe(2);
    expect(state.guildStats.guildHallT2).toBe(true);
    expect(state.globalStock.crystal_shard).toBe(2);
    expect(ausbauInfo(state, gilde).naechste).toBeNull();
  });

  it('Marktplatz und Bank wirken je besetztem Arbeitsplatz', () => {
    const state = createNewGameState();
    const markt = bauen(state, 'MARKETPLACE');
    expect(wirkungsStufe(state, 'MARKETPLACE')).toBe(0);
    arbeiter(state, markt);
    expect(wirkungsStufe(state, 'MARKETPLACE')).toBe(1);
    markt.tier = 3;
    arbeiter(state, markt);
    expect(wirkungsStufe(state, 'MARKETPLACE')).toBe(2);
  });
});

describe('Ausbau: Grenzen der Stadtstufe', () => {
  it('Werkstätten bis Stufe 2 erst ab dem Dorf, Stufe 3 ab der Stadt', () => {
    const state = createNewGameState();
    const huette = bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    state.globalStock.wood = 1000;
    expect(erlaubteStufe(state, 'LUMBER_CAMP')).toBe(1);
    expect(fehlendeStadtstufe(state, huette)).toBe('Dorf');
    expect(ausbauInfo(state, huette).hinweis).toBe('braucht Stadtstufe «Dorf» (Hauptmenü)');
    expect(ausbauen(state, huette)).toBe(false);

    state.stadtweg!.stufe = 3;
    expect(ausbauen(state, huette)).toBe(true);
    expect(fehlendeStadtstufe(state, huette)).toBe('Stadt');
    state.stadtweg!.stufe = 5;
    expect(ausbauen(state, huette)).toBe(true);
    expect(fehlendeStadtstufe(state, huette)).toBeNull();
  });

  it('Wohnviertel wächst mit jeder Stadtstufe um eine Stufe', () => {
    const state = createNewGameState();
    const haus = bauen(state, 'HOUSE_T1');
    state.globalStock.wood = 1000;
    state.globalStock.stone = 1000;
    for (let stadt = 1; stadt <= 6; stadt++) {
      state.stadtweg!.stufe = stadt;
      expect(erlaubteStufe(state, 'HOUSE_T1')).toBe(stadt);
    }
    state.stadtweg!.stufe = 2;
    expect(ausbauen(state, haus)).toBe(true);
    expect(ausbauen(state, haus)).toBe(false);
    expect(fehlendeStadtstufe(state, haus)).toBe('Dorf');
  });

  it('Gebäude ohne Ausbau-Grenze und ältere Spielstände ohne Stadtweg', () => {
    const state = createNewGameState();
    const gilde = bauen(state, 'GUILD_HALL');
    expect(fehlendeStadtstufe(state, gilde)).toBeNull();
    delete state.stadtweg;
    expect(erlaubteStufe(state, 'HOUSE_T1')).toBe(1);
    // Schon höher ausgebaute Gebäude bleiben, wie sie sind
    const haus = bauen(state, 'HOUSE_T1');
    haus.tier = 4;
    expect(hausKapazitaet(haus)).toBe(24);
    expect(fehlendeStadtstufe(state, haus)).toBe('Stadt');
  });
});

describe('vereinigeDoppelte (alte Spielstände)', () => {
  it('drei Holzfällerhütten werden eine Hütte Stufe 3, die Arbeiter ziehen mit', () => {
    const state = createNewGameState();
    const huetten = [1, 2, 3].map(() => bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1'));
    for (const h of huetten) arbeiter(state, h);

    expect(vereinigeDoppelte(state)).toBe(2);

    const rest = state.buildings.filter(b => b.typeId === 'LUMBER_CAMP');
    expect(rest).toHaveLength(1);
    expect(rest[0].tier).toBe(3);
    expect(rest[0].assignedWorkerIds).toHaveLength(3);
    expect(state.citizens.every(c => c.status === 'WORKER' && c.assignedBuildingId === rest[0].id)).toBe(true);
  });

  it('fünf Hütten: höchstens Stufe 3, überzählige Arbeiter werden frei', () => {
    const state = createNewGameState();
    const huetten = [1, 2, 3, 4, 5].map(() => bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1'));
    for (const h of huetten) arbeiter(state, h);

    vereinigeDoppelte(state);

    const rest = state.buildings.filter(b => b.typeId === 'LUMBER_CAMP');
    expect(rest).toHaveLength(1);
    expect(rest[0].tier).toBe(3);
    expect(rest[0].assignedWorkerIds).toHaveLength(3);
    const frei = state.citizens.filter(c => c.status === 'IDLE');
    expect(frei).toHaveLength(2);
    expect(frei.every(c => c.assignedBuildingId === null)).toBe(true);
  });

  it('nicht ausbaubare Gebäude bleiben auf Stufe 1', () => {
    const state = createNewGameState();
    bauen(state, 'WELL');
    bauen(state, 'WELL');
    vereinigeDoppelte(state);
    const brunnen = state.buildings.filter(b => b.typeId === 'WELL');
    expect(brunnen).toHaveLength(1);
    expect(brunnen[0].tier).toBe(1);
  });

  it('Wohnviertel bekommt eine Stufe, auf der alle Bewohner Platz haben', () => {
    const state = createNewGameState();
    bauen(state, 'HOUSE_T1');
    bauen(state, 'HOUSE_T1');
    for (let i = 0; i < 15; i++) state.citizens.push(createCitizen('IDLE'));
    vereinigeDoppelte(state);
    const viertel = state.buildings.filter(b => b.typeId === 'HOUSE_T1');
    expect(viertel).toHaveLength(1);
    expect(viertel[0].tier).toBe(3);
    expect(wohnKapazitaet(state)).toBeGreaterThanOrEqual(15);
  });

  it('Waren aus den Puffern der entfernten Gebäude landen im Lager', () => {
    const state = createNewGameState();
    bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    const zweite = bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    zweite.localOutputBuffer = { wood: 7 };
    const vorher = state.globalStock.wood ?? 0;
    vereinigeDoppelte(state);
    expect(state.globalStock.wood).toBe(vorher + 7);
  });

  it('ohne Doppelte passiert nichts', () => {
    const state = createNewGameState();
    bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    bauen(state, 'QUARRY');
    expect(vereinigeDoppelte(state)).toBe(0);
    expect(state.buildings).toHaveLength(2);
  });
});
