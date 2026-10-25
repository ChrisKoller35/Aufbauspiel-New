import { describe, it, expect, vi } from 'vitest';
import { ROUTE_DEFS } from '../src/data/routes';
import { GameState } from '../src/models/GameState';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { kriegsrat, kriegsratLaeufe } from '../src/systems/Kriegsrat';
import { musterStand } from '../src/systems/Musterlauf';
import { rechneHaeppchen } from '../src/ui/components/KriegsratFenster';

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

  it('Schritt für Schritt: zählt die fertigen Läufe von 0 bis n, mehrere Schritte je Lauf, gleiches Ergebnis', () => {
    const { state, ids, proviant } = stand();
    const laeufe = kriegsratLaeufe(state, ROUTE, ids, proviant, 4);
    const fertig: number[] = [];
    let schritt = laeufe.next();
    while (!schritt.done) {
      fertig.push(schritt.value);
      schritt = laeufe.next();
    }
    expect(fertig[0]).toBe(0);
    expect(fertig.at(-1)).toBe(4);
    expect(fertig.every((n, i) => i === 0 || n === fertig[i - 1] || n === fertig[i - 1] + 1)).toBe(true);
    // Ein Schritt je Raum (dazu Wahl, Kontrollpunkt, Händler): Auch ein langer Lauf rechnet nie am Stück
    for (let lauf = 0; lauf < 4; lauf++) expect(fertig.filter(n => n === lauf).length).toBeGreaterThan(1);
    expect(schritt.value).toEqual(kriegsrat(state, ROUTE, ids, proviant, 4));
  });

  it('der Start eines Laufs ist ein eigener Schritt: Ein Häppchen von 0 ms rechnet nur ihn', () => {
    const { state, ids, proviant } = stand();
    const start = vi.spyOn(ExpeditionSystem.prototype, 'startExpedition');
    const weiter = vi.spyOn(ExpeditionSystem.prototype, 'nextStep');
    try {
      const laeufe = kriegsratLaeufe(state, ROUTE, ids, proviant, 2);
      expect(rechneHaeppchen(laeufe, 0, () => 0)).toEqual({ value: 0, done: false });
      expect(start).toHaveBeenCalledTimes(1);
      expect(weiter).not.toHaveBeenCalled();
      laeufe.next();
      expect(weiter).toHaveBeenCalledTimes(1);
    } finally {
      start.mockRestore();
      weiter.mockRestore();
    }
  });

  it('kopiert den Spielstand beim Aufruf: Was danach geschieht, ändert das Ergebnis nicht', () => {
    const { state, ids } = musterStand('gut', 1);
    const vorher = kriegsrat(state, 'drachenhort', ids, {}, 20);
    const laeufe = kriegsratLaeufe(state, 'drachenhort', ids, {}, 20);
    // Die Stadt läuft weiter, bevor das erste Häppchen rechnet: Die Helden legen alles ab und verlernen das Kämpfen
    for (const held of state.fighters) {
      held.gear = { mainHand: null, offHand: null, armor: null, trinket: null };
      held.baseStats.atk = 1;
    }
    expect(kriegsrat(state, 'drachenhort', ids, {}, 20)).not.toEqual(vorher);
    let schritt = laeufe.next();
    while (!schritt.done) schritt = laeufe.next();
    expect(schritt.value).toEqual(vorher);
  });
});

describe('Häppchen (KriegsratFenster.ts)', () => {
  /** Schritte, die je `dauer` ms auf der Ersatz-Uhr brauchen */
  function* schritte(uhr: { jetzt: number }, anzahl: number, dauer: number): Generator<number, string, void> {
    for (let i = 1; i <= anzahl; i++) {
      uhr.jetzt += dauer;
      yield i;
    }
    return 'fertig';
  }

  it('rechnet, bis die Zeit um ist; der letzte Schritt rechnet noch fertig', () => {
    const uhr = { jetzt: 0 };
    const it = schritte(uhr, 10, 7);
    expect(rechneHaeppchen(it, 30, () => uhr.jetzt)).toEqual({ value: 5, done: false });
    expect(uhr.jetzt).toBe(35);
    expect(rechneHaeppchen(it, 30, () => uhr.jetzt)).toEqual({ value: 10, done: false });
    expect(rechneHaeppchen(it, 30, () => uhr.jetzt)).toEqual({ value: 'fertig', done: true });
  });

  it('mindestens ein Schritt je Häppchen, auch wenn einer länger dauert als das Häppchen', () => {
    const uhr = { jetzt: 0 };
    const it = schritte(uhr, 3, 100);
    const ergebnisse = [1, 2, 3].map(() => rechneHaeppchen(it, 30, () => uhr.jetzt).value);
    expect(ergebnisse).toEqual([1, 2, 3]);
    expect(rechneHaeppchen(it, 30, () => uhr.jetzt)).toEqual({ value: 'fertig', done: true });
  });

  it('der echte Rat in Häppchen: dasselbe Ergebnis wie am Stück', () => {
    const { state, ids } = musterStand('gut', 1);
    const laeufe = kriegsratLaeufe(state, 'drachenhort', ids, {}, 20);
    const uhr = { jetzt: 0 };
    let haeppchen = 0;
    let schritt = rechneHaeppchen(laeufe, 30, () => (uhr.jetzt += 4));
    while (!schritt.done) {
      haeppchen++;
      schritt = rechneHaeppchen(laeufe, 30, () => (uhr.jetzt += 4));
    }
    expect(haeppchen).toBeGreaterThan(20);
    expect(schritt.value).toEqual(kriegsrat(state, 'drachenhort', ids, {}, 20));
  });
});
