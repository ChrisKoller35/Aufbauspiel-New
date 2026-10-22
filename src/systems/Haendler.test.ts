import { describe, it, expect } from 'vitest';
import { kaufen, bauplanKaufen, bauplanGekauft, verkaufen, verkaeufliches } from './Haendler';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { placeStartingLayout } from '../scenes/CityStartingLayout';
import { ITEM_DEFS } from '../data/items';
import { ankaufpreis, istAnkaufbar, kaufpreis } from '../data/haendler';

/** Neues Spiel: Gildenhaus und Händler stehen, 100 Gold, 5 Brot, 2 Heiltränke. */
function stadt(gold = 100): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  state.globalStock.gold = gold;
  return state;
}

describe('Händler: kaufen', () => {
  it('Brot und Heiltrank zum Stückpreis, beliebig oft', () => {
    const state = stadt();
    expect(kaufen(state, 'bread', 5)).toEqual({ ok: true, text: '5× Brot gekauft für 20 Gold.' });
    expect(state.globalStock.bread).toBe(10);
    expect(state.globalStock.gold).toBe(80);
    expect(kaufen(state, 'healing_potion')).toEqual({ ok: true, text: '1× Heiltrank gekauft für 10 Gold.' });
    expect(state.globalStock.healing_potion).toBe(3);
    expect(state.globalStock.gold).toBe(70);
    // Zwei Käufe (5 Brot, 1 Heiltrank) für den Erfolg «Erster Kauf»
    expect(state.statistics.total_haendler_kaeufe).toBe(2);
  });

  it('Grundausrüstung für 25 Gold, auch wenn noch keine im Lager liegt', () => {
    const state = stadt();
    delete state.globalStock.leather_armor;
    expect(kaufen(state, 'leather_armor').ok).toBe(true);
    expect(state.globalStock.leather_armor).toBe(1);
    expect(state.globalStock.gold).toBe(75);
  });

  it('zu wenig Gold: nichts passiert, der Satz nennt Preis und Vorrat', () => {
    const state = stadt(30);
    expect(kaufen(state, 'iron_sword', 2)).toEqual({ ok: false, text: 'Zu wenig Gold: 2× Eisenschwert kostet 50 Gold, du hast 30.' });
    expect(state.globalStock.gold).toBe(30);
    expect(state.globalStock.iron_sword).toBe(0);
    expect(state.statistics.total_haendler_kaeufe).toBeUndefined();
  });

  it('Waren, die der Händler nicht führt, und unsinnige Mengen', () => {
    const state = stadt();
    expect(kaufen(state, 'crystal_shard')).toEqual({ ok: false, text: 'Der Händler führt Kristallsplitter nicht.' });
    expect(kaufen(state, 'bread', 0).ok).toBe(false);
    expect(kaufen(state, 'bread', 1.5).ok).toBe(false);
    expect(state.globalStock.gold).toBe(100);
  });

  it('Rabatt ab Stadtstufe 4 (10 %) und auf Stufe 7 (20 %), nie unter 1 Gold', () => {
    const state = stadt(1000);
    state.stadtweg!.stufe = 4;
    expect(kaufpreis('bread', 4)).toBe(4); // 3,6 gerundet
    expect(kaufpreis('healing_potion', 4)).toBe(9);
    expect(kaufen(state, 'iron_sword')).toEqual({ ok: true, text: '1× Eisenschwert gekauft für 23 Gold.' });
    state.stadtweg!.stufe = 7;
    expect(kaufen(state, 'iron_sword')).toEqual({ ok: true, text: '1× Eisenschwert gekauft für 20 Gold.' });
    expect(kaufen(state, 'bread')).toEqual({ ok: true, text: '1× Brot gekauft für 3 Gold.' });
    expect(state.globalStock.gold).toBe(1000 - 23 - 20 - 3);
  });
});

describe('Händler: Baupläne', () => {
  it('Bauplan der Schmiede für 50 Gold, einmal', () => {
    const state = stadt();
    expect(bauplanGekauft(state, 'SMITHY')).toBe(false);
    expect(bauplanKaufen(state, 'SMITHY')).toEqual({
      ok: true, text: 'Bauplan: Schmiede gekauft für 50 Gold. Jetzt kannst du Schmiede bauen.',
    });
    expect(state.globalStock.bauplan_schmiede).toBe(1);
    expect(state.globalStock.gold).toBe(50);
    expect(state.statistics.total_haendler_kaeufe).toBe(1);
    expect(bauplanGekauft(state, 'SMITHY')).toBe(true);
    expect(bauplanKaufen(state, 'SMITHY')).toEqual({ ok: false, text: 'Den Bauplan: Schmiede hast du schon.' });
    expect(state.globalStock.gold).toBe(50);
  });

  it('steht das Gebäude schon, gibt es keinen Bauplan mehr', () => {
    const state = stadt();
    state.buildings.push(createBuildingInstance('SMITHY'));
    expect(bauplanGekauft(state, 'SMITHY')).toBe(true);
    expect(bauplanKaufen(state, 'SMITHY')).toEqual({ ok: false, text: 'Schmiede steht schon.' });
    expect(state.globalStock.gold).toBe(100);
  });

  it('zu wenig Gold, mit Rabatt der Stadtstufe', () => {
    const state = stadt(140);
    expect(bauplanKaufen(state, 'ARCANE_SMITHY')).toEqual({ ok: false, text: 'Zu wenig Gold: Bauplan: Arkanschmiede kostet 150 Gold, du hast 140.' });
    state.stadtweg!.stufe = 4; // 10 %: 135 Gold
    expect(bauplanKaufen(state, 'ARCANE_SMITHY').ok).toBe(true);
    expect(state.globalStock.gold).toBe(5);
    expect(state.globalStock.bauplan_arkanschmiede).toBe(1);
  });

  it('Gildenhaus und Händler haben keinen Bauplan', () => {
    const state = stadt();
    expect(bauplanKaufen(state, 'GUILD_HALL')).toEqual({ ok: false, text: 'Für Gildenhaus gibt es beim Händler keinen Bauplan.' });
    expect(bauplanKaufen(state, 'HAENDLER').ok).toBe(false);
    expect(bauplanKaufen(state, 'GIBT_ES_NICHT').ok).toBe(false);
  });
});

describe('Händler: verkaufen', () => {
  it('Beute, die niemand trägt, zum halben Grundwert, mindestens 1 Gold', () => {
    const state = stadt();
    Object.assign(state.globalStock, { hunter_bow: 2, herb_green: 3, iron_sword: 1 });
    expect(ITEM_DEFS.hunter_bow.baseValue).toBe(14);
    expect(verkaufen(state, 'hunter_bow')).toEqual({ ok: true, text: '1× Jägerbogen verkauft für 7 Gold.' });
    expect(state.globalStock.hunter_bow).toBe(1);
    expect(state.globalStock.gold).toBe(107);
    expect(ITEM_DEFS.herb_green.baseValue).toBe(2);
    expect(ankaufpreis('herb_green')).toBe(1);
    expect(verkaufen(state, 'herb_green', 'alle')).toEqual({ ok: true, text: '3× Grüne Kräuter verkauft für 3 Gold.' });
    expect(state.globalStock.herb_green).toBe(0);
    expect(state.globalStock.gold).toBe(110);
    // Brot: Grundwert 3, halber Wert 1,5 → 1 Gold
    expect(verkaufen(state, 'bread', 5)).toEqual({ ok: true, text: '5× Brot verkauft für 5 Gold.' });
    // Verkaufen ist kein Kauf
    expect(state.statistics.total_haendler_kaeufe).toBeUndefined();
  });

  it('kauft keine Baupläne, Set-Teile und kein Dungeon-Material', () => {
    const state = stadt();
    Object.assign(state.globalStock, { bauplan_schmiede: 1, set_wyrm_klinge: 1, mat_glutkern: 10 });
    expect(verkaufen(state, 'bauplan_schmiede')).toEqual({ ok: false, text: 'Der Händler kauft Bauplan: Schmiede nicht an.' });
    expect(verkaufen(state, 'set_wyrm_klinge').ok).toBe(false);
    expect(verkaufen(state, 'mat_glutkern', 'alle').ok).toBe(false);
    expect(verkaufen(state, 'gold', 1).ok).toBe(false);
    expect(state.globalStock.gold).toBe(100);
    expect(state.globalStock.mat_glutkern).toBe(10);
    expect(verkaeufliches(state).map(v => v.itemId).sort()).toEqual(['bread', 'healing_potion', 'novizenrobe']);
  });

  it('nichts im Lager oder mehr als da ist: nichts passiert', () => {
    const state = stadt();
    expect(verkaufen(state, 'hunter_bow')).toEqual({ ok: false, text: 'Von Jägerbogen liegt nichts im Lager.' });
    expect(verkaufen(state, 'bread', 6)).toEqual({ ok: false, text: 'So viel Brot hast du nicht: 5 im Lager, 6 wolltest du verkaufen.' });
    expect(verkaufen(state, 'bread', 0).ok).toBe(false);
    expect(state.globalStock.bread).toBe(5);
    expect(state.globalStock.gold).toBe(100);
  });

  it('Kristallsplitter und Kriegsmaschinen nimmt er, Gold selbst nicht', () => {
    expect(istAnkaufbar('crystal_shard')).toBe(true);
    expect(ankaufpreis('crystal_shard')).toBe(10);
    expect(istAnkaufbar('war_catapult')).toBe(true);
    expect(istAnkaufbar('gold')).toBe(false);
  });
});
