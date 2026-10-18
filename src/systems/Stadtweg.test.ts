import { describe, it, expect } from 'vitest';
import {
  stadtweg, aktuelleStufe, naechsteStufe, aufstiegStand, aufstiegBereit, steigeAuf, belohnungsZeilen,
  stadtSteuerProzent, besiegteBosse, neuesKapitel, kapitelGelesen, herzsteinZeilen, setzeHerzsteinEin, herzOffen,
} from './Stadtweg';
import { EconomySystem } from './EconomySystem';
import { STADTSTUFEN, HERZSTEINE, HOECHSTE_STADTSTUFE, stufeDef } from '../data/stadtstufen';
import { BUILDING_DEFS } from '../data/buildings';
import { ENEMY_DEFS } from '../data/enemies';
import { ROUTE_DEFS } from '../data/routes';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';

function bauen(state: GameState, typeId: string): void {
  const b = createBuildingInstance(typeId, 0, 0, true);
  b.connected = true;
  state.buildings.push(b);
}

function bewohner(state: GameState, anzahl: number): void {
  while (state.citizens.length < anzahl) state.citizens.push(createCitizen('IDLE'));
}

/** Spielstand, der alles für den Weiler erfüllt. */
function bereitFuerWeiler(): GameState {
  const state = createNewGameState();
  bauen(state, 'QUARRY');
  bauen(state, 'FARM_GRAIN');
  state.statistics.total_victories = 1;
  state.globalStock.wood = 50;
  state.globalStock.gold = 10;
  return state;
}

describe('Stadtweg: Daten', () => {
  it('sieben Stufen in Reihenfolge, Grenzen wachsen nie zurück', () => {
    expect(HOECHSTE_STADTSTUFE).toBe(7);
    STADTSTUFEN.forEach((s, i) => {
      expect(s.stufe).toBe(i + 1);
      expect(s.kapitel.length).toBeGreaterThan(100);
      if (i === 0) return;
      const vorher = STADTSTUFEN[i - 1].grenzen;
      expect(s.grenzen.wohnen).toBeGreaterThanOrEqual(vorher.wohnen);
      expect(s.grenzen.werkstatt).toBeGreaterThanOrEqual(vorher.werkstatt);
      expect(s.grenzen.handel).toBeGreaterThanOrEqual(vorher.handel);
      expect(s.aufgaben.length).toBeGreaterThan(0);
    });
  });

  it('jede Aufgabe nennt ein echtes Gebäude, jeder Herzstein einen echten Boss mit Route', () => {
    for (const s of STADTSTUFEN) {
      for (const a of s.aufgaben) {
        if (a.art === 'gebaeude') expect(BUILDING_DEFS[a.typeId], a.typeId).toBeDefined();
      }
    }
    for (const h of HERZSTEINE) {
      expect(ENEMY_DEFS[h.bossId]?.role, h.bossId).toBe('boss');
      expect(Object.values(ROUTE_DEFS).some(r => r.bossId === h.bossId), h.bossId).toBe(true);
    }
  });

  it('Bewohner-Aufgaben passen ins Wohnviertel, das die Stufe davor erlaubt', () => {
    for (const s of STADTSTUFEN) {
      const plaetze = 6 * stufeDef(s.stufe - 1).grenzen.wohnen;
      for (const a of s.aufgaben) {
        if (a.art === 'bewohner') expect(a.anzahl, s.name).toBeLessThanOrEqual(plaetze);
      }
    }
  });
});

describe('Stadtweg: aufsteigen', () => {
  it('ein neues Spiel steht am Lagerfeuer, das erste Kapitel ist ungelesen', () => {
    const state = createNewGameState();
    expect(aktuelleStufe(state).name).toBe('Lagerfeuer');
    expect(naechsteStufe(state)?.name).toBe('Weiler');
    expect(neuesKapitel(state)).toBe(true);
    kapitelGelesen(state, 1);
    expect(neuesKapitel(state)).toBe(false);
  });

  it('ältere Spielstände ohne Stadtweg beginnen am Lagerfeuer', () => {
    const state = createNewGameState();
    delete state.stadtweg;
    expect(aktuelleStufe(state).stufe).toBe(1);
    expect(stadtweg(state)).toEqual({ stufe: 1, herzsteine: [], gelesen: 0 });
  });

  it('zeigt Aufgaben mit Fortschritt und zählt die Abgabe als Schritt', () => {
    const state = createNewGameState();
    const stand = aufstiegStand(state)!;
    expect(stand.aufgaben.map(a => a.text)).toEqual(['Steinbruch steht', 'Getreidefarm steht', 'Eine Expedition gewonnen']);
    expect(stand.aufgaben[2]).toMatchObject({ erledigt: false, ist: 0, soll: 1 });
    expect(stand.gesamt).toBe(4);
    expect(stand.erledigt).toBe(1); // 80 Holz zum Start reichen für die Abgabe
    expect(stand.bereit).toBe(false);
  });

  it('Aufstieg zahlt die Abgabe, gibt das Geschenk und ein neues Kapitel', () => {
    const state = bereitFuerWeiler();
    expect(aufstiegBereit(state)).toBe(true);
    kapitelGelesen(state, 1);
    const neu = steigeAuf(state);
    expect(neu?.name).toBe('Weiler');
    expect(state.stadtweg?.stufe).toBe(2);
    expect(state.globalStock.wood).toBe(10);
    expect(state.globalStock.gold).toBe(70);
    expect(neuesKapitel(state)).toBe(true);
    expect(steigeAuf(state)).toBeNull(); // Für das Dorf fehlt noch alles
  });

  it('ohne genug Rohstoffe für die Abgabe kein Aufstieg', () => {
    const state = bereitFuerWeiler();
    state.globalStock.wood = 39;
    expect(aufstiegStand(state)?.abgabeBezahlbar).toBe(false);
    expect(steigeAuf(state)).toBeNull();
    expect(state.stadtweg?.stufe).toBe(1);
  });

  it('Belohnungen in Worten', () => {
    expect(belohnungsZeilen(stufeDef(2))).toEqual(['60 Gold', 'Wohnviertel bis Stufe 2', 'Kapitel 2 der Stadtchronik']);
    expect(belohnungsZeilen(stufeDef(4))).toContain('+10 % Steuern');
    expect(belohnungsZeilen(stufeDef(4))).toContain('Marktplatz und Bank bis Stufe 2');
  });

  it('Bosse zählen aus der Gildenstatistik und aus dem Monsterbuch, ohne Doppelte', () => {
    const state = createNewGameState();
    state.guildStats.bossesDefeatedIds = ['boss_elder_treant'];
    state.bestiarium.defeated = ['boss_elder_treant', 'boss_crystal_golem', 'forest_wolf'];
    expect([...besiegteBosse(state)].sort()).toEqual(['boss_crystal_golem', 'boss_elder_treant']);
  });

  it('Stadtrecht: Steuer-Bonus wächst mit den Stufen und wirkt auf die Steuern', () => {
    const state = createNewGameState();
    bewohner(state, 10);
    state.satisfaction = 100;
    const economy = new EconomySystem();
    expect(stadtSteuerProzent(state)).toBe(0);
    expect(economy.steuernProTag(state)).toBe(20);
    state.stadtweg!.stufe = 4;
    expect(stadtSteuerProzent(state)).toBe(10);
    expect(economy.steuerRechnung(state).stadtProzent).toBe(10);
    expect(economy.steuernProTag(state)).toBe(22);
    state.stadtweg!.stufe = 7;
    expect(stadtSteuerProzent(state)).toBe(50);
  });
});

describe('Stadtweg: das Arkane Herz', () => {
  it('Herzsteine erst ab der Grossstadt, mit besiegtem Boss und den Kosten', () => {
    const state = createNewGameState();
    Object.assign(state.globalStock, { stone: 1000, gold: 1000 });
    state.guildStats.bossesDefeatedIds = ['boss_spider_queen'];
    expect(herzOffen(state)).toBe(false);
    expect(setzeHerzsteinEin(state, 'herz_spinne')).toBe(false);

    state.stadtweg!.stufe = 6;
    expect(setzeHerzsteinEin(state, 'herz_hydra')).toBe(false); // Hydra nicht besiegt
    expect(setzeHerzsteinEin(state, 'herz_spinne')).toBe(true);
    expect(state.globalStock.stone).toBe(850);
    expect(state.globalStock.gold).toBe(900);
    expect(setzeHerzsteinEin(state, 'herz_spinne')).toBe(false); // nur einmal
    const zeile = herzsteinZeilen(state).find(z => z.def.id === 'herz_spinne')!;
    expect(zeile).toMatchObject({ eingesetzt: true, bossName: 'Spinnenkönigin' });
  });

  it('alle fünf Herzsteine öffnen die Magische Stadt, danach gibt es keinen Aufstieg mehr', () => {
    const state = createNewGameState();
    state.stadtweg = { stufe: 6, herzsteine: HERZSTEINE.slice(0, 4).map(h => h.id), gelesen: 6 };
    expect(aufstiegBereit(state)).toBe(false);
    state.stadtweg.herzsteine.push(HERZSTEINE[4].id);
    expect(steigeAuf(state)?.name).toBe('Magische Stadt');
    expect(naechsteStufe(state)).toBeNull();
    expect(aufstiegStand(state)).toBeNull();
  });
});
