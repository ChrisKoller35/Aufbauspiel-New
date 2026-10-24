import { describe, it, expect } from 'vitest';
import { ROUTE_DEFS } from '../src/data/routes';
import { kriegsrat } from '../src/systems/Kriegsrat';
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
    expect(a.siege + a.niederlagen + a.rueckzuege).toBe(6);
  });

  it('jede Route läuft ohne Fehler durch', () => {
    const { state, ids, proviant } = stand();
    for (const routeId of Object.keys(ROUTE_DEFS)) {
      const r = kriegsrat(state, routeId, ids, proviant, 2);
      expect(r.siege + r.niederlagen + r.rueckzuege, routeId).toBe(2);
    }
  });
});
