import { describe, it, expect } from 'vitest';
import { modusFuer, flussText, erklaerung } from './ProduktionTab';
import { createNewGameState } from '../../models/GameState';
import { createBuildingInstance } from '../../models/Building';

describe('Mindmap: Darstellung je Breite', () => {
  it('genug Platz: normal', () => {
    expect(modusFuer(1400, 1150).modus).toBe('voll');
  });
  it('etwas zu schmal: verkleinert, Faktor passt genau', () => {
    const r = modusFuer(980, 1150);
    expect(r.modus).toBe('zoom');
    expect(r.faktor).toBeCloseTo(980 / 1150);
  });
  it('viel zu schmal (Handy): Raster', () => {
    expect(modusFuer(370, 1150).modus).toBe('kompakt');
  });
});

describe('Mindmap: Texte', () => {
  it('Karten nennen im Raster, wohin sie liefern', () => {
    expect(flussText('LUMBER_CAMP')).toBe('→ Lagerhaus: Holz');
    expect(flussText('WELL')).toContain('Kräutergarten');
    // Das Lagerhaus beliefert zu viele Ziele für eine Zeile
    expect(flussText('WAREHOUSE')).toBe('');
  });

  it('Erklärung: Bauplatz nennt Kosten und, wenn empfohlen, den Grund', () => {
    const state = createNewGameState();
    const huette = createBuildingInstance('LUMBER_CAMP', 0, 0, true);
    state.buildings.push(huette);
    const e = erklaerung(state, 'QUARRY');
    expect(e.titel).toBe('Steinbruch');
    expect(e.zeilen.join(' ')).toContain('Klick: bauen');
    expect(e.zeilen.join(' ')).toContain('Lohnt sich als Nächstes');
  });

  it('Erklärung: gesperrtes Gebäude nennt den Grund', () => {
    const state = createNewGameState();
    expect(erklaerung(state, 'MILL_WIND').zeilen.join(' ')).toContain('Noch gesperrt');
  });
});
