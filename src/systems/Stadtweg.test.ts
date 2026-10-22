import { describe, it, expect } from 'vitest';
import {
  stadtweg, aktuelleStufe, naechsteStufe, aufstiegStand, aufstiegBereit, steigeAuf, belohnungsZeilen,
  besiegteBosse, neuesKapitel, kapitelGelesen, herzsteinZeilen, setzeHerzsteinEin, herzOffen,
} from './Stadtweg';
import { STADTSTUFEN, HERZSTEINE, HOECHSTE_STADTSTUFE, stufeDef } from '../data/stadtstufen';
import { kaufpreis, rabattProzent } from '../data/haendler';
import { BUILDING_DEFS } from '../data/buildings';
import { ENEMY_DEFS } from '../data/enemies';
import { ITEM_DEFS } from '../data/items';
import { ROUTE_DEFS } from '../data/routes';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { createGuildFighter } from '../models/GuildRoster';

function bauen(state: GameState, typeId: string): void {
  state.buildings.push(createBuildingInstance(typeId));
}

function helden(state: GameState, anzahl: number): void {
  const werte = { hp: 30, maxHp: 30, atk: 5, def: 2, spd: 1, critChance: 0, critMult: 1.5 };
  while (state.fighters.length < anzahl) state.fighters.push(createGuildFighter(0, 'guardian', `Held ${state.fighters.length + 1}`, werte));
}

/** Spielstand, der alles für den Weiler erfüllt: Schmiede, ein Sieg, 50 Gold für die Abgabe von 40. */
function bereitFuerWeiler(): GameState {
  const state = createNewGameState();
  bauen(state, 'SMITHY');
  state.statistics.total_victories = 1;
  state.globalStock.gold = 50;
  return state;
}

describe('Stadtweg: Daten', () => {
  it('sieben Stufen in Reihenfolge, Werkstatt-Grenze und Rabatt wachsen nie zurück', () => {
    expect(HOECHSTE_STADTSTUFE).toBe(7);
    STADTSTUFEN.forEach((s, i) => {
      expect(s.stufe).toBe(i + 1);
      expect(s.kapitel.length).toBeGreaterThan(100);
      expect(Object.keys(s.grenzen)).toEqual(['werkstatt']);
      if (i === 0) return;
      const vorher = STADTSTUFEN[i - 1];
      expect(s.grenzen.werkstatt).toBeGreaterThanOrEqual(vorher.grenzen.werkstatt);
      expect(s.haendlerRabatt).toBeGreaterThanOrEqual(vorher.haendlerRabatt);
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

  it('Abgaben, Geschenke und Herzsteine verlangen nur Gold und Beute aus den Dungeons', () => {
    const erlaubt = new Set(['gold', 'iron_scrap', 'crystal_shard']);
    const kosten = [...STADTSTUFEN.flatMap(s => [s.abgabe, s.geschenk]), ...HERZSTEINE.map(h => h.kosten)];
    for (const k of kosten) {
      for (const id of Object.keys(k)) {
        expect(ITEM_DEFS[id], id).toBeDefined();
        expect(erlaubt.has(id), id).toBe(true);
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

  it('ein Spielstand ohne Stadtweg beginnt am Lagerfeuer', () => {
    const state = createNewGameState();
    delete state.stadtweg;
    expect(aktuelleStufe(state).stufe).toBe(1);
    expect(stadtweg(state)).toEqual({ stufe: 1, herzsteine: [], gelesen: 0 });
  });

  it('zeigt Aufgaben mit Fortschritt, dem Weg zum Bauplan und zählt die Abgabe als Schritt', () => {
    const state = createNewGameState();
    const stand = aufstiegStand(state)!;
    expect(stand.aufgaben.map(a => a.text)).toEqual(['Schmiede steht', 'Eine Expedition gewonnen']);
    expect(stand.aufgaben[0].hinweis).toContain('Bauplan beim Händler');
    expect(stand.aufgaben[1]).toMatchObject({ erledigt: false, ist: 0, soll: 1 });
    expect(stand.gesamt).toBe(3);
    expect(stand.erledigt).toBe(1); // 100 Gold zum Start reichen für die Abgabe von 40
    expect(stand.bereit).toBe(false);
  });

  it('die Helden-Aufgabe zählt die Helden der Gilde', () => {
    const state = createNewGameState();
    state.stadtweg!.stufe = 2;
    const zeile = () => aufstiegStand(state)!.aufgaben.find(a => a.text.includes('Helden'))!;
    expect(zeile()).toMatchObject({ text: '2 Helden in der Gilde', erledigt: false, ist: 0, soll: 2 });
    helden(state, 1);
    expect(zeile()).toMatchObject({ erledigt: false, ist: 1, soll: 2 });
    helden(state, 3);
    expect(zeile()).toMatchObject({ erledigt: true, ist: 2, soll: 2 });
  });

  it('Aufstieg zahlt die Abgabe, gibt das Geschenk und ein neues Kapitel', () => {
    const state = bereitFuerWeiler();
    expect(aufstiegBereit(state)).toBe(true);
    kapitelGelesen(state, 1);
    const neu = steigeAuf(state);
    expect(neu?.name).toBe('Weiler');
    expect(state.stadtweg?.stufe).toBe(2);
    expect(state.globalStock.gold).toBe(50 - 40 + 100);
    expect(neuesKapitel(state)).toBe(true);
    expect(steigeAuf(state)).toBeNull(); // Für das Dorf fehlt noch alles
  });

  it('ohne genug Gold für die Abgabe kein Aufstieg', () => {
    const state = bereitFuerWeiler();
    state.globalStock.gold = 39;
    expect(aufstiegStand(state)?.abgabeBezahlbar).toBe(false);
    expect(steigeAuf(state)).toBeNull();
    expect(state.stadtweg?.stufe).toBe(1);
  });

  it('Belohnungen in Worten: Geschenk, Rabatt beim Händler, Werkstatt-Stufen, Kapitel', () => {
    expect(belohnungsZeilen(stufeDef(2))).toEqual(['100 Gold', 'Kapitel 2 der Stadtchronik']);
    expect(belohnungsZeilen(stufeDef(3))).toContain('Werkstätten bis Stufe 2');
    expect(belohnungsZeilen(stufeDef(4))).toContain('10 % Rabatt beim Händler');
    expect(belohnungsZeilen(stufeDef(5))).not.toContain('10 % Rabatt beim Händler'); // gilt schon seit Stufe 4
    expect(belohnungsZeilen(stufeDef(5))).toContain('Werkstätten bis Stufe 3');
    expect(belohnungsZeilen(stufeDef(7))).toContain('20 % Rabatt beim Händler');
    for (const s of STADTSTUFEN) expect(belohnungsZeilen(s).join(' ')).not.toMatch(/Steuer|Wohnviertel|Markt|Bank/);
  });

  it('Bosse zählen aus der Gildenstatistik und aus dem Monsterbuch, ohne Doppelte', () => {
    const state = createNewGameState();
    state.guildStats.bossesDefeatedIds = ['boss_elder_treant'];
    state.bestiarium.defeated = ['boss_elder_treant', 'boss_crystal_golem', 'forest_wolf'];
    expect([...besiegteBosse(state)].sort()).toEqual(['boss_crystal_golem', 'boss_elder_treant']);
  });

  it('Stadtrecht: ab dem Marktflecken gibt der Händler Rabatt, in der Magischen Stadt mehr', () => {
    expect(rabattProzent(1)).toBe(0);
    expect(rabattProzent(4)).toBe(10);
    expect(rabattProzent(7)).toBe(20);
    expect(kaufpreis('healing_potion', 1)).toBe(10);
    expect(kaufpreis('healing_potion', 4)).toBe(9);
    expect(kaufpreis('healing_potion', 7)).toBe(8);
  });
});

describe('Stadtweg: das Arkane Herz', () => {
  it('Herzsteine erst ab der Grossstadt, mit besiegtem Boss und den Kosten', () => {
    const state = createNewGameState();
    Object.assign(state.globalStock, { iron_scrap: 100, gold: 1000 });
    state.guildStats.bossesDefeatedIds = ['boss_spider_queen'];
    expect(herzOffen(state)).toBe(false);
    expect(setzeHerzsteinEin(state, 'herz_spinne')).toBe(false);

    state.stadtweg!.stufe = 6;
    expect(setzeHerzsteinEin(state, 'herz_hydra')).toBe(false); // Hydra nicht besiegt
    expect(setzeHerzsteinEin(state, 'herz_spinne')).toBe(true);
    expect(state.globalStock.iron_scrap).toBe(90);
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
