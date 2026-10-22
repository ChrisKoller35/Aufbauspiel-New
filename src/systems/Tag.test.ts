import { describe, it, expect } from 'vitest';
import { createNewGameState } from '../models/GameState';
import { neuerTag, TAG_SEKUNDEN, STADT_TAKT_SEKUNDEN } from './Tag';

describe('neuer Tag', () => {
  it('zählt den Tag und die überstandenen Tage hoch', () => {
    const state = createNewGameState();
    expect(state.day).toBe(1);
    neuerTag(state);
    expect(state.day).toBe(2);
    expect(state.statistics.total_days_survived).toBe(1);
    neuerTag(state);
    expect(state.statistics.total_days_survived).toBe(2);
  });

  it('prüft die Erfolge gleich mit: nach 100 Tagen «Überlebenskünstler», genau einmal', () => {
    const state = createNewGameState();
    for (let i = 0; i < 99; i++) neuerTag(state);
    expect(state.achievements).not.toContain('survivor_100');
    neuerTag(state);
    expect(state.achievements.filter(id => id === 'survivor_100')).toHaveLength(1);
    neuerTag(state);
    expect(state.achievements.filter(id => id === 'survivor_100')).toHaveLength(1);
  });

  it('ein Tag dauert 30 Sekunden, die Werkstätten arbeiten jede Sekunde', () => {
    expect(TAG_SEKUNDEN).toBe(30);
    expect(STADT_TAKT_SEKUNDEN).toBe(1);
  });
});
