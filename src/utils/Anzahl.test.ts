import { describe, it, expect } from 'vitest';
import { anzahlText } from './Anzahl';
import { createNewGameState } from '../models/GameState';
import { placeStartingLayout } from '../scenes/CityStartingLayout';
import { createGuildFighter } from '../models/GuildRoster';
import { CLASS_DEFS } from '../data/classes';
import { getGebaeudeStatus } from '../systems/GebaeudeStatus';
import { zielWert } from '../ui/screens/MindmapTexte';

describe('anzahlText: Zahl mit Wort, bei genau 1 in der Einzahl', () => {
  it('1 → Einzahl, sonst Mehrzahl (auch 0), Tausender mit Punkt, geschütztes Leerzeichen dazwischen', () => {
    expect(anzahlText(1, 'Held', 'Helden')).toBe('1\u00a0Held');
    expect(anzahlText(0, 'Held', 'Helden')).toBe('0\u00a0Helden');
    expect(anzahlText(2, 'Held', 'Helden')).toBe('2\u00a0Helden');
    expect(anzahlText(1250, 'Trank', 'Tränke')).toBe('1.250\u00a0Tränke');
  });

  it('neues Spiel (ein Held, zwei Heiltränke): «1 Held in der Gilde» und «1 Held · 2 Tränke»', () => {
    const state = createNewGameState();
    placeStartingLayout(state);
    expect(state.fighters).toHaveLength(1);
    expect(getGebaeudeStatus(state, 'GUILD_HALL').text).toBe('1\u00a0Held in der Gilde');
    expect(zielWert(state, 'expeditionen')).toBe('1\u00a0Held · 2\u00a0Tränke');
    state.globalStock.healing_potion = 1;
    expect(zielWert(state, 'expeditionen')).toBe('1\u00a0Held · 1\u00a0Trank');
    const ranger = CLASS_DEFS.ranger;
    state.fighters.push(createGuildFighter(ranger.id, ranger.name, ranger.baseStats));
    state.globalStock.healing_potion = 0;
    expect(getGebaeudeStatus(state, 'GUILD_HALL').text).toBe('2\u00a0Helden in der Gilde');
    expect(zielWert(state, 'expeditionen')).toBe('2\u00a0Helden · 0\u00a0Tränke');
  });
});
