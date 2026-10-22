import { describe, it, expect } from 'vitest';
import {
  maxStufe, ausbauKosten, ausbauInfo, ausbauen, zyklusSekunden, tempoFaktor, investiert, vereinigeDoppelte,
  erlaubteStufe, fehlendeStadtstufe, ausbauWirkung, heldenJeExpedition, entferneGebaeude, erstatteLaufendenZyklus,
} from './Ausbau';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, BuildingInstance } from '../models/Building';
import { RECIPE_DEFS } from '../data/recipes';
import { BUILDING_DEFS } from '../data/buildings';

const SCHWERT = RECIPE_DEFS.RCP_IRON_SWORD; // 2 Eisenschrott + 10 Gold, 90 s
const SCHMIEDE_GOLD = BUILDING_DEFS.SMITHY.buildCost.gold;

function bauen(state: GameState, typeId: string): BuildingInstance {
  const b = createBuildingInstance(typeId);
  state.buildings.push(b);
  return b;
}

describe('Ausbau: Stufen und Kosten', () => {
  it('höchste Stufe je Gebäude-Art: Werkstätten 3, Gildenhaus 2, Händler 1', () => {
    expect(maxStufe('SMITHY')).toBe(3);
    expect(maxStufe('HERB_GARDEN')).toBe(3);
    expect(maxStufe('ARCANE_SMITHY')).toBe(3);
    expect(maxStufe('WAR_MACHINE_WORKSHOP')).toBe(3);
    expect(maxStufe('GUILD_HALL')).toBe(2);
    expect(maxStufe('HAENDLER')).toBe(1);
    expect(maxStufe('GIBT_ES_NICHT')).toBe(1);
  });

  it('Ausbau kostet Gold der Baukosten mal Stufe plus Beute nach der Tabelle in docs/GILDENSTADT.md', () => {
    expect(ausbauKosten('SMITHY', 2)).toEqual({ gold: 100, iron_scrap: 10 });
    expect(ausbauKosten('SMITHY', 3)).toEqual({ gold: 150, iron_scrap: 20 });
    expect(ausbauKosten('HERB_GARDEN', 2)).toEqual({ gold: 80, herb_green: 5 });
    expect(ausbauKosten('HERB_GARDEN', 3)).toEqual({ gold: 120, herb_green: 10 });
    expect(ausbauKosten('ARCANE_SMITHY', 2)).toEqual({ gold: 160, crystal_shard: 5 });
    expect(ausbauKosten('ARCANE_SMITHY', 3)).toEqual({ gold: 240, crystal_shard: 10 });
    expect(ausbauKosten('WAR_MACHINE_WORKSHOP', 2)).toEqual({ gold: 200, iron_scrap: 10 });
    expect(ausbauKosten('WAR_MACHINE_WORKSHOP', 3)).toEqual({ gold: 300, iron_scrap: 20 });
    expect(ausbauKosten('GUILD_HALL', 2)).toEqual({ gold: 80, crystal_shard: 3 });
  });

  it('investiert summiert Bau und alle Ausbauten', () => {
    expect(investiert('SMITHY', 1)).toEqual({ gold: SCHMIEDE_GOLD });
    expect(investiert('SMITHY', 3)).toEqual({ gold: SCHMIEDE_GOLD * 6, iron_scrap: 30 });
    expect(investiert('ARCANE_SMITHY', 2)).toEqual({ gold: 240, iron_scrap: 5, crystal_shard: 8 });
  });

  it('Wirkung in Spielersprache: Werkstatt N-mal so schnell, Gildenhaus vier Helden', () => {
    expect(ausbauWirkung('SMITHY', 1)).toBe('arbeitet in gewohntem Tempo');
    expect(ausbauWirkung('SMITHY', 2)).toBe('arbeitet 2-mal so schnell');
    expect(ausbauWirkung('HERB_GARDEN', 3)).toBe('arbeitet 3-mal so schnell');
    expect(ausbauWirkung('GUILD_HALL', 2)).toContain('4');
    expect(ausbauWirkung('HAENDLER', 1)).toBe('');
  });
});

describe('Ausbau: ausbauen', () => {
  it('zieht die Kosten ab, hebt die Stufe und macht die Werkstatt doppelt so schnell', () => {
    const state = createNewGameState();
    state.stadtweg!.stufe = 3; // Dorf: Werkstätten bis Stufe 2
    const schmiede = bauen(state, 'SMITHY');
    state.globalStock.gold = 500;
    state.globalStock.iron_scrap = 25;
    expect(tempoFaktor(schmiede)).toBe(1);
    expect(zyklusSekunden(schmiede, SCHWERT)).toBe(90);

    expect(ausbauen(state, schmiede)).toBe(true);

    expect(schmiede.tier).toBe(2);
    expect(state.globalStock.gold).toBe(400);
    expect(state.globalStock.iron_scrap).toBe(15);
    expect(tempoFaktor(schmiede)).toBe(2);
    expect(zyklusSekunden(schmiede, SCHWERT)).toBe(45);
    expect(state.statistics.total_buildings_built).toBe(1);
    expect(state.statistics.total_upgrades).toBe(1);
  });

  it('ohne Gold oder Beute kein Ausbau', () => {
    const state = createNewGameState();
    state.stadtweg!.stufe = 3;
    const schmiede = bauen(state, 'SMITHY');
    state.globalStock.gold = 500;
    state.globalStock.iron_scrap = 9;
    expect(ausbauInfo(state, schmiede).bezahlbar).toBe(false);
    expect(ausbauen(state, schmiede)).toBe(false);
    state.globalStock.iron_scrap = 10;
    state.globalStock.gold = 99;
    expect(ausbauen(state, schmiede)).toBe(false);
    expect(schmiede.tier).toBe(1);
  });

  it('auf der höchsten Stufe gibt es keinen weiteren Ausbau', () => {
    const state = createNewGameState();
    state.stadtweg!.stufe = 7;
    const schmiede = bauen(state, 'SMITHY');
    schmiede.tier = 3;
    state.globalStock.gold = 1000;
    state.globalStock.iron_scrap = 100;
    expect(ausbauInfo(state, schmiede).naechste).toBeNull();
    expect(ausbauen(state, schmiede)).toBe(false);
    expect(tempoFaktor(schmiede)).toBe(3);
  });

  it('Gildenhaus Stufe 2 braucht Gildenrang 3 und erlaubt 4 Helden je Expedition', () => {
    const state = createNewGameState();
    const gilde = bauen(state, 'GUILD_HALL');
    Object.assign(state.globalStock, { crystal_shard: 5, gold: 200 });
    state.guildStats.rank = 2;
    expect(heldenJeExpedition(state)).toBe(3);
    expect(ausbauInfo(state, gilde).hinweis).toContain('Gildenrang 3');
    expect(ausbauen(state, gilde)).toBe(false);

    state.guildStats.rank = 3;
    expect(ausbauen(state, gilde)).toBe(true);
    expect(gilde.tier).toBe(2);
    expect(state.guildStats.guildHallT2).toBe(true);
    expect(state.globalStock.crystal_shard).toBe(2);
    expect(state.globalStock.gold).toBe(120);
    expect(heldenJeExpedition(state)).toBe(4);
    expect(ausbauInfo(state, gilde).naechste).toBeNull();
    // Das Gildenhaus ist keine Werkstatt: die Stufe ändert kein Tempo
    expect(tempoFaktor(gilde)).toBe(1);
  });

  it('der Händler lässt sich nicht ausbauen', () => {
    const state = createNewGameState();
    const haendler = bauen(state, 'HAENDLER');
    state.globalStock.gold = 1000;
    expect(ausbauInfo(state, haendler).naechste).toBeNull();
    expect(ausbauen(state, haendler)).toBe(false);
  });
});

describe('Ausbau: Grenzen der Stadtstufe', () => {
  it('Werkstätten bis Stufe 2 erst ab dem Dorf, Stufe 3 ab der Stadt', () => {
    const state = createNewGameState();
    const kueche = bauen(state, 'HERB_GARDEN');
    state.globalStock.gold = 1000;
    state.globalStock.herb_green = 100;
    expect(erlaubteStufe(state, 'HERB_GARDEN')).toBe(1);
    expect(fehlendeStadtstufe(state, kueche)).toBe('Dorf');
    expect(ausbauInfo(state, kueche).hinweis).toBe('braucht Stadtstufe «Dorf» (Hauptmenü)');
    expect(ausbauen(state, kueche)).toBe(false);

    state.stadtweg!.stufe = 3;
    expect(ausbauen(state, kueche)).toBe(true);
    expect(fehlendeStadtstufe(state, kueche)).toBe('Stadt');
    expect(ausbauen(state, kueche)).toBe(false);
    state.stadtweg!.stufe = 5;
    expect(ausbauen(state, kueche)).toBe(true);
    expect(fehlendeStadtstufe(state, kueche)).toBeNull();
    expect(state.globalStock.herb_green).toBe(85);
  });

  it('Gebäude ohne Ausbau-Grenze und Spielstände ohne Stadtweg', () => {
    const state = createNewGameState();
    const gilde = bauen(state, 'GUILD_HALL');
    expect(fehlendeStadtstufe(state, gilde)).toBeNull();
    expect(erlaubteStufe(state, 'GUILD_HALL')).toBe(2);
    delete state.stadtweg;
    expect(erlaubteStufe(state, 'SMITHY')).toBe(1);
    // Eine schon höher ausgebaute Werkstatt bleibt, wie sie ist, und arbeitet so schnell
    const schmiede = bauen(state, 'SMITHY');
    schmiede.tier = 3;
    expect(tempoFaktor(schmiede)).toBe(3);
    expect(fehlendeStadtstufe(state, schmiede)).toBeNull();
  });
});

describe('Gebäude entfernen und verschmelzen', () => {
  it('entferneGebaeude gibt die Zutaten des laufenden Zyklus ins Lager zurück', () => {
    const state = createNewGameState();
    const schmiede = bauen(state, 'SMITHY');
    schmiede.producing = true;
    schmiede.activeRecipeId = SCHWERT.id;
    state.globalStock.iron_scrap = 0;
    state.globalStock.gold = 0;
    erstatteLaufendenZyklus(state, schmiede);
    expect(state.globalStock.iron_scrap).toBe(2);
    expect(state.globalStock.gold).toBe(10);
    entferneGebaeude(state, new Set([schmiede.id]));
    expect(state.buildings).toHaveLength(0);
    expect(state.globalStock.iron_scrap).toBe(4);
  });

  it('drei Schmieden werden eine Schmiede Stufe 3', () => {
    const state = createNewGameState();
    [1, 2, 3].map(() => bauen(state, 'SMITHY'));
    expect(vereinigeDoppelte(state)).toBe(2);
    const rest = state.buildings.filter(b => b.typeId === 'SMITHY');
    expect(rest).toHaveLength(1);
    expect(rest[0].tier).toBe(3);
  });

  it('fünf Schmieden: höchstens Stufe 3; zwei Händler bleiben auf Stufe 1', () => {
    const state = createNewGameState();
    [1, 2, 3, 4, 5].map(() => bauen(state, 'SMITHY'));
    bauen(state, 'HAENDLER');
    bauen(state, 'HAENDLER');
    expect(vereinigeDoppelte(state)).toBe(5);
    expect(state.buildings.find(b => b.typeId === 'SMITHY')!.tier).toBe(3);
    expect(state.buildings.filter(b => b.typeId === 'HAENDLER')).toHaveLength(1);
    expect(state.buildings.find(b => b.typeId === 'HAENDLER')!.tier).toBe(1);
  });

  it('ohne Doppelte passiert nichts', () => {
    const state = createNewGameState();
    bauen(state, 'SMITHY');
    bauen(state, 'HERB_GARDEN');
    expect(vereinigeDoppelte(state)).toBe(0);
    expect(state.buildings).toHaveLength(2);
  });
});
