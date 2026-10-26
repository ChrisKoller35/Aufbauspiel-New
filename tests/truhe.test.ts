// Truhe nach der Expedition: alles Gold in einer Karte (truhenEintraege, ohne Browser)
import { describe, expect, it } from 'vitest';
import { truhenEintraege } from '../src/ui/components/ChestRevealOverlay';
import { createNewGameState } from '../src/models/GameState';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { spieleRoute } from '../src/systems/Musterlauf';

describe('Truhe: Karten', () => {
  it('Gold der Kämpfe und Gold der Beutetabelle stehen in einer Karte', () => {
    expect(truhenEintraege({ gold: 12, iron_sword: 1 }, 170)).toEqual([{ itemId: 'gold', qty: 182 }, { itemId: 'iron_sword', qty: 1 }]);
    expect(truhenEintraege({ gold: 5 }, 0)).toEqual([{ itemId: 'gold', qty: 5 }]);
    expect(truhenEintraege({}, 7)).toEqual([{ itemId: 'gold', qty: 7 }]);
    expect(truhenEintraege({ gold: 0 }, 0)).toEqual([]);
  });

  it('Reihenfolge wie bisher: Set-Teil, Gold, Ausrüstung, Verbrauch, Rest', () => {
    const karten = truhenEintraege({ iron_scrap: 2, bread: 1, iron_sword: 1, set_rudel_klinge: 1, gold: 3 }, 10);
    expect(karten.map(k => k.itemId)).toEqual(['set_rudel_klinge', 'gold', 'iron_sword', 'bread', 'iron_scrap']);
    expect(karten[1].qty).toBe(13);
  });

  it('echte Läufe in den Schattenkatakomben (?probe=sterne): eine Karte mit dem Gold, das ins Lager kommt', () => {
    for (const seed of [1001, 1002, 1003]) {
      const state = createNewGameState();
      placeStartingLayout(state);
      richteProbespielEin(state, 'sterne');
      state.rngSeed = seed;
      const run = spieleRoute(state, state.fighters.map(f => f.id), 'shadow_catacombs', 'klug');
      expect(run.loot.gold ?? 0).toBeGreaterThan(0);
      expect(truhenEintraege(run.loot, run.goldEarned).filter(k => k.itemId === 'gold'))
        .toEqual([{ itemId: 'gold', qty: run.goldEarned + run.loot.gold }]);
    }
  });
});
