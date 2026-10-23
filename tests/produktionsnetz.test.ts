import { describe, it, expect } from 'vitest';
import { NETZ_REIHEN, netzGebaeudeIds } from '../src/data/produktionsnetz';
import { BUILDING_DEFS } from '../src/data/buildings';

// Die Mindmap im Reiter «Stadt» zeigt drei Reihen ohne Verbindungslinien
// (ui/screens/ProduktionTab.ts); der Händler steht in der mittleren Reihe vorne.

describe('Mindmap: Reihen', () => {
  it('jedes Gebäude kommt genau einmal vor, alle sechs sind da', () => {
    const ids = NETZ_REIHEN.flatMap(r => r.knoten.map(k => k.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect([...netzGebaeudeIds()].sort()).toEqual(Object.keys(BUILDING_DEFS).sort());
  });

  it('der Händler steht an erster Stelle der Werkstatt-Reihe', () => {
    const reihe = NETZ_REIHEN.find(r => r.id === 'werkstaetten')!;
    expect(reihe.knoten[0].id).toBe('HAENDLER');
  });
});
