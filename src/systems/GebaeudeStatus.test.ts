import { describe, it, expect } from 'vitest';
import { getGebaeudeStatus, freischaltHinweise } from './GebaeudeStatus';
import { engpassFuerGebaeude, engpassFuerKette } from './EngpassSystem';
import { PRODUKTIONSKETTEN } from '../data/produktionsketten';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, BuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';

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

describe('GebaeudeStatus', () => {
  it('ohne Gebäude und ohne Voraussetzung: Bauplatz mit Kosten', () => {
    const state = createNewGameState();
    const s = getGebaeudeStatus(state, 'LUMBER_CAMP');
    expect(s.zustand).toBe('bauplatz');
    expect(s.anzahl).toBe(0);
  });

  it('fehlende Voraussetzung: gesperrt mit Hinweis', () => {
    const state = createNewGameState();
    const s = getGebaeudeStatus(state, 'MILL_WIND');
    expect(s.zustand).toBe('gesperrt');
    expect(s.hinweise?.length).toBeGreaterThan(0);
  });

  it('fehlender Bauplan zählt als Sperre', () => {
    const state = createNewGameState();
    state.guildStats.rank = 5;
    for (const id of ['IRON_MINE', 'GUILD_HALL', 'WAREHOUSE', 'MARKETPLACE']) bauen(state, id);
    expect(freischaltHinweise(state, 'BANK').some(h => h.includes('braucht'))).toBe(true);
    state.globalStock['bauplan_bank'] = 1;
    expect(freischaltHinweise(state, 'BANK')).toEqual([]);
  });

  it('Holzfäller mit Arbeiter läuft und zeigt Ertrag pro Tag', () => {
    const state = createNewGameState();
    arbeiter(state, bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1'));
    const s = getGebaeudeStatus(state, 'LUMBER_CAMP');
    expect(s.zustand).toBe('laeuft');
    expect(s.text).toMatch(/\/ Tag/);
  });

  it('Holzfäller ohne Arbeiter wartet', () => {
    const state = createNewGameState();
    bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    const s = getGebaeudeStatus(state, 'LUMBER_CAMP');
    expect(s.zustand).toBe('wartet');
    expect(s.grund?.art).toBe('kein-arbeiter');
  });
});

describe('EngpassSystem', () => {
  it('fehlende Zutat nennt Vorrat, Bedarf und das Liefergebäude', () => {
    const state = createNewGameState();
    const schmiede = bauen(state, 'SMITHY', 'RCP_IRON_SWORD');
    arbeiter(state, schmiede);
    state.globalStock['iron_scrap'] = 0;
    const satz = engpassFuerGebaeude(state, 'SMITHY');
    expect(satz).toContain('0 im Lager, 2 pro Auftrag');
    expect(satz).toContain('Baue Eisenmine');
  });

  it('Schmiede mit genug Zutaten wartet nur auf den Auftrag: kein Engpass', () => {
    const state = createNewGameState();
    arbeiter(state, bauen(state, 'SMITHY', 'RCP_IRON_SWORD'));
    state.globalStock['iron_scrap'] = 10;
    state.globalStock['wood'] = 10;
    expect(getGebaeudeStatus(state, 'SMITHY').zustand).toBe('bereit');
    expect(engpassFuerGebaeude(state, 'SMITHY')).toBeNull();
  });

  it('Kette meldet das erste fehlende Gebäude in Reihenfolge', () => {
    const state = createNewGameState();
    const brot = PRODUKTIONSKETTEN.find(k => k.id === 'brot')!;
    arbeiter(state, bauen(state, 'FARM_GRAIN', 'RCP_GRAIN_1'));
    const satz = engpassFuerKette(state, brot);
    expect(satz).toContain('Windmühle');
  });
});
