// Truhe nach der Expedition: alles Gold in einer Karte (truhenEintraege), und genau das kommt ins Lager
// (beuteEinlagern), ohne Browser
import { describe, expect, it } from 'vitest';
import { truhenEintraege } from '../src/ui/components/ChestRevealOverlay';
import { beuteEinlagern } from '../src/ui/screens/ExpeditionFlow';
import { createNewGameState } from '../src/models/GameState';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { spieleRoute } from '../src/systems/Musterlauf';
import { setBeute } from '../src/systems/DungeonSets';
import { schmiedeBeute } from '../src/systems/Schmiede';

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

  it('echte Läufe in den Schattenkatakomben (?probe=sterne): beuteEinlagern legt genau die Karten ins Lager', () => {
    for (const seed of [1001, 1002, 1003]) {
      const state = createNewGameState();
      placeStartingLayout(state);
      richteProbespielEin(state, 'sterne');
      state.rngSeed = seed;
      const run = spieleRoute(state, state.fighters.map(f => f.id), 'shadow_catacombs', 'klug');
      // Wie finishExpedition: Set-Teil und Material für die Schmiede liegen mit in der Truhe
      setBeute(state, run);
      schmiedeBeute(run);
      expect(run.loot.gold ?? 0).toBeGreaterThan(0);
      const karten = truhenEintraege(run.loot, run.goldEarned);
      expect(karten.filter(k => k.itemId === 'gold'))
        .toEqual([{ itemId: 'gold', qty: run.goldEarned + run.loot.gold }]);
      expect(karten.some(k => k.itemId !== 'gold')).toBe(true);

      // Einlagern wie nach dem Einsammeln (applyLootAndFinish): Gold wächst um den Betrag der Gold-Karte, jedes
      // andere Teil um die Menge seiner Karte, und nichts wächst ohne Karte
      const vorher = { ...state.globalStock };
      beuteEinlagern(state.globalStock, run.loot, run.goldEarned);
      const zuwachs: Record<string, number> = {};
      for (const [id, menge] of Object.entries(state.globalStock)) {
        const mehr = menge - (vorher[id] ?? 0);
        if (mehr !== 0) zuwachs[id] = mehr;
      }
      expect(zuwachs).toEqual(Object.fromEntries(karten.map(k => [k.itemId, k.qty])));
    }
  });
});
