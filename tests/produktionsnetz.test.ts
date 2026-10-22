import { describe, it, expect } from 'vitest';
import { NETZ_REIHEN, NETZ_KANTEN, netzKnoten } from '../src/data/produktionsnetz';

// Die Mindmap legt Linien aus den Kartenpositionen (ui/screens/ProduktionTab.ts):
// eine Reihe tiefer als Bogen, in derselben Reihe nur zur Karte direkt daneben.
// Diese Regeln halten die Linien kurz und frei von Kreuzungen.

/** Reihe und Platz (von links) eines Knotens. */
function platz(id: string): { reihe: number; index: number } {
  for (let reihe = 0; reihe < NETZ_REIHEN.length; reihe++) {
    const index = NETZ_REIHEN[reihe].knoten.findIndex(k => k.id === id);
    if (index >= 0) return { reihe, index };
  }
  throw new Error(`Knoten ${id} fehlt im Netz`);
}

/** Der Beute-Balken geht über die ganze Reihe: seine Linien laufen senkrecht zum Ziel. */
function breit(id: string): boolean {
  const k = netzKnoten(id);
  return !!(k && k.art !== 'ziel' && k.breit);
}

describe('Mindmap: Linien', () => {
  it('jede Linie führt eine Reihe tiefer oder zur Karte direkt daneben', () => {
    for (const k of NETZ_KANTEN) {
      const von = platz(k.von);
      const nach = platz(k.nach);
      if (von.reihe === nach.reihe) expect(Math.abs(von.index - nach.index), `${k.von} → ${k.nach}`).toBe(1);
      else expect(nach.reihe - von.reihe, `${k.von} → ${k.nach}`).toBe(1);
    }
  });

  it('Linien zwischen zwei Reihen kreuzen sich nicht', () => {
    const runter = NETZ_KANTEN.filter(k => platz(k.nach).reihe > platz(k.von).reihe && !breit(k.von));
    for (const a of runter) {
      for (const b of runter) {
        if (a === b || platz(a.von).reihe !== platz(b.von).reihe) continue;
        const oben = platz(a.von).index - platz(b.von).index;
        const unten = platz(a.nach).index - platz(b.nach).index;
        expect(oben * unten >= 0, `${a.von} → ${a.nach} kreuzt ${b.von} → ${b.nach}`).toBe(true);
      }
    }
  });

  it('jedes Gebäude kommt genau einmal vor', () => {
    const ids = NETZ_REIHEN.flatMap(r => r.knoten.map(k => k.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
