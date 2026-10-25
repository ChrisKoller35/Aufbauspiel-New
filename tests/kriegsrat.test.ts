import { describe, it, expect, vi } from 'vitest';
import { ROUTE_DEFS } from '../src/data/routes';
import { GameState } from '../src/models/GameState';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { kriegsrat, kriegsratLaeufe } from '../src/systems/Kriegsrat';
import { musterStand } from '../src/systems/Musterlauf';

const ROUTE = Object.keys(ROUTE_DEFS)[0];

function stand() {
  const { state, ids } = musterStand('gut', 1);
  state.globalStock.bread = 5;
  state.globalStock.healing_potion = 3;
  return { state, ids, proviant: { bread: 2, healing_potion: 1 } };
}

describe('Kriegsrat', () => {
  it('lässt den echten Spielstand unberührt', () => {
    const { state, ids, proviant } = stand();
    const vorher = JSON.stringify(state);
    kriegsrat(state, ROUTE, ids, proviant, 5);
    expect(JSON.stringify(state)).toBe(vorher);
  });

  it('gleiche Eingabe, gleiches Ergebnis; jeder Lauf zählt genau einmal', () => {
    const { state, ids, proviant } = stand();
    const a = kriegsrat(state, ROUTE, ids, proviant, 6);
    const b = kriegsrat(state, ROUTE, ids, proviant, 6);
    expect(b).toEqual(a);
    expect(a.siege + a.niederlagen + a.bossUeberlebt).toBe(6);
  });

  it('jede Route läuft ohne Fehler durch', () => {
    const { state, ids, proviant } = stand();
    for (const routeId of Object.keys(ROUTE_DEFS)) {
      const r = kriegsrat(state, routeId, ids, proviant, 2);
      expect(r.siege + r.niederlagen + r.bossUeberlebt, routeId).toBe(2);
    }
  });

  it('Drachenhort mit «gut»: genaue Zahlen, der Startwert des Spielstands zählt nicht', () => {
    const { state, ids } = musterStand('gut', 1);
    const a = kriegsrat(state, 'drachenhort', ids, {}, 20);
    expect(a).toEqual({
      siege: 13, niederlagen: 7, bossUeberlebt: 0,
      gefaehrlichsterRaum: { nummer: 15, gegner: ['Ignarax, der Uralte'], laeufe: 7 },
      goldSchnitt: 519,
    });
    state.rngSeed = 424242;
    expect(kriegsrat(state, 'drachenhort', ids, {}, 20)).toEqual(a);
  });

  it('Boss überlebt: Nach dem Rundenlimit zählt der Lauf weder als Sieg noch als Niederlage', () => {
    const { state, ids } = musterStand('stark', 1, 'sterne5');
    expect(kriegsrat(state, 'sternenschlund', ids, {}, 20)).toEqual({
      siege: 12, niederlagen: 6, bossUeberlebt: 2,
      gefaehrlichsterRaum: { nummer: 16, gegner: ['Nyxar, der Sternenfresser'], laeufe: 8 },
      goldSchnitt: 687,
    });
  });

  it('Proviant nur vor Kampfräumen, wie die Kampf-Vorschau im Spiel', () => {
    const typen: string[] = [];
    const original = ExpeditionSystem.prototype.useProvision;
    const spion = vi.spyOn(ExpeditionSystem.prototype, 'useProvision').mockImplementation(
      function (this: ExpeditionSystem, s: GameState, index: number) {
        const run = s.activeExpedition!;
        typen.push(run.rooms[run.currentRoom].type);
        original.call(this, s, index);
      },
    );
    try {
      const { state, ids } = musterStand('gut', 1);
      kriegsrat(state, 'himmelsarchiv', ids, {}, 20);
    } finally {
      spion.mockRestore();
    }
    expect(typen.length).toBeGreaterThan(0);
    expect(new Set(typen)).toEqual(new Set(typen.filter(t => ['combat', 'boss', 'fortification'].includes(t))));
  });

  it('Lauf für Lauf: zählt 1 bis n und endet mit demselben Ergebnis wie am Stück', () => {
    const { state, ids, proviant } = stand();
    const laeufe = kriegsratLaeufe(state, ROUTE, ids, proviant, 4);
    const fertig: number[] = [];
    let schritt = laeufe.next();
    while (!schritt.done) {
      fertig.push(schritt.value);
      schritt = laeufe.next();
    }
    expect(fertig).toEqual([1, 2, 3, 4]);
    expect(schritt.value).toEqual(kriegsrat(state, ROUTE, ids, proviant, 4));
  });
});
