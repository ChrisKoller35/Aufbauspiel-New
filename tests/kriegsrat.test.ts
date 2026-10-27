import { describe, it, expect, vi } from 'vitest';
import { ROUTE_DEFS } from '../src/data/routes';
import { GameState } from '../src/models/GameState';
import { PROVISION_ITEMS } from '../src/data/items';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { GearSystem } from '../src/systems/GearSystem';
import { xpForNextLevel } from '../src/systems/HeroProgression';
import { kopieFuerLauf, kriegsrat, kriegsratLaeufe, kriegsratSchluessel, probelauf } from '../src/systems/Kriegsrat';
import { musterStand } from '../src/systems/Musterlauf';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { materialJeSieg } from '../src/systems/Schmiede';
import { haertegradWahlHtml } from '../src/ui/components/HaertegradAnzeige';
import {
  haeppchenweise, letzterRatHtml, merkeLetztenRat, rechneHaeppchen, rechneImHintergrund,
} from '../src/ui/components/KriegsratFenster';

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
    expect(a).toMatchObject({
      siege: 13, niederlagen: 7, bossUeberlebt: 0,
      gefaehrlichsterRaum: { nummer: 15, gegner: ['Ignarax, der Uralte'], laeufe: 7 },
      goldSchnitt: 578,
    });
    state.rngSeed = 424242;
    expect(kriegsrat(state, 'drachenhort', ids, {}, 20)).toEqual(a);
  });

  it('Boss überlebt: Nach dem Rundenlimit zählt der Lauf weder als Sieg noch als Niederlage', () => {
    const { state, ids } = musterStand('stark', 1, 'sterne5');
    expect(kriegsrat(state, 'sternenschlund', ids, {}, 20)).toMatchObject({
      siege: 12, niederlagen: 6, bossUeberlebt: 2,
      gefaehrlichsterRaum: { nummer: 16, gegner: ['Nyxar, der Sternenfresser'], laeufe: 8 },
      goldSchnitt: 732,
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

  it('XP, Aufstieg und Gold wie nach der echten Expedition', () => {
    for (const routeId of ['forest_short', 'himmelsarchiv']) {
      const { state, ids, proviant } = stand();
      // Brom fehlen 5 XP bis zum Aufstieg
      state.fighters[0].xp += xpForNextLevel(state.fighters[0].level) - 5;
      const vorher = JSON.stringify(state);
      const r = kriegsrat(state, routeId, ids, proviant, 1);
      expect(JSON.stringify(state)).toBe(vorher);

      const kopie = kopieFuerLauf(vorher, 0);
      const lauf = probelauf(kopie, routeId, ids, proviant);
      let s = lauf.next();
      while (!s.done) s = lauf.next();
      const { run } = s.value;
      expect(run.status, routeId).toBe(routeId === 'forest_short' ? 'victory' : 'defeat');
      const gold = run.goldEarned + (run.loot.gold ?? 0);
      const bilanz = finalizeExpeditionProgress(kopie, run, new ExpeditionSystem(new GearSystem(), new ProvisionSystem()));
      expect(r.helden.map(h => h.id)).toEqual(bilanz.xp.map(x => x.id));
      for (const x of bilanz.xp) {
        const held = r.helden.find(h => h.id === x.id)!;
        expect(held.xpSchnitt, `${routeId} ${x.name}`).toBe(x.xp);
        expect(held.besteStufe, `${routeId} ${x.name}`).toBe(x.level);
        expect(held.aufstiege === 1, `${routeId} ${x.name}`).toBe(x.levelUps > 0);
      }
      expect(r.helden[0].aufstiege, routeId).toBe(1);
      expect(r.goldSchnitt, routeId).toBe(gold);
    }
  });

  it('Beute wie in der Truhe', () => {
    const { state, ids, proviant } = stand();
    const r = kriegsrat(state, 'forest_short', ids, proviant, 5);
    expect(r.siege).toBe(5);
    // Ohne Teil des Sets ist das erste bei jedem Sieg sicher (der Rat legt nichts ins Lager)
    expect(r.beute.setLaeufe).toBe(5);
    expect(r.beute.material?.schnitt).toBe(materialJeSieg('forest_short')!.menge);
    expect(r.beute.ausruestung.length).toBeLessThanOrEqual(3);
  });

  it('Proviant wirkt', () => {
    const { state, ids } = musterStand('stark', 1, 'sterne3');
    for (const id of PROVISION_ITEMS) state.globalStock[id] = 0;
    const nurGeschenk = kriegsrat(state, 'sternenschlund', ids, {}, 20);
    state.globalStock.healing_potion = 10;
    const mitTraenken = kriegsrat(state, 'sternenschlund', ids, { healing_potion: 10 }, 20);
    expect(mitTraenken.proviantEingesetzt).toBeGreaterThan(nurGeschenk.proviantEingesetzt);
    expect(mitTraenken.lebenSchnitt).toBeGreaterThanOrEqual(nurGeschenk.lebenSchnitt);
  });

  // Auf Albtraum keine Zahlen zu Gold, Ausrüstung und Splittern: Die ändert #91 (ein Wurf mehr auf die Boss-Beute)
  it('Härtegrad: Gegner, Material und Set-Teil des gewählten Grads, ohne Angabe Normal', () => {
    const { state, ids } = musterStand('stark', 1, 'sterne3');
    const normal = kriegsrat(state, 'drachenhort', ids, {}, 20, 'normal');
    expect(normal).toEqual(kriegsrat(state, 'drachenhort', ids, {}, 20));
    expect(normal).toMatchObject({ siege: 20, niederlagen: 0, bossUeberlebt: 0, lebenSchnitt: 83,
      wahlen: { wagnis: 45, sicher: 15 }, beute: { setLaeufe: 9, material: { schnitt: 7 } } });
    expect(kriegsrat(state, 'drachenhort', ids, {}, 20, 'hard')).toMatchObject({ siege: 20, niederlagen: 0,
      bossUeberlebt: 0, lebenSchnitt: 68, wahlen: { wagnis: 40, sicher: 20 }, beute: { setLaeufe: 16, material: { schnitt: 11 } } });
    // Je schwerer der Grad, desto öfter fehlen die 85 % Leben fürs Wagnis
    expect(kriegsrat(state, 'drachenhort', ids, {}, 20, 'nightmare')).toMatchObject({ siege: 19, niederlagen: 1,
      bossUeberlebt: 0, lebenSchnitt: 32, wahlen: { wagnis: 36, sicher: 24 }, beute: { material: { schnitt: 14 } } });
    expect(kriegsrat(state, 'himmelsarchiv', ids, {}, 20, 'nightmare')).toMatchObject({ siege: 0, niederlagen: 20,
      bossUeberlebt: 0, lebenSchnitt: 0, beute: { material: { schnitt: 8 } } });
    const schluessel = JSON.parse(kriegsratSchluessel(state, 'drachenhort', ids, {}, 'nightmare'));
    expect(schluessel.difficulty).toBe('nightmare');
    expect(schluessel.rooms.at(-1).enemies[0].maxHp).toBe(1534);
    expect(JSON.parse(kriegsratSchluessel(state, 'drachenhort', ids, {})).rooms.at(-1).enemies[0].maxHp).toBe(959);
    expect(haertegradWahlHtml(state, 'drachenhort', 'nightmare')).not.toContain('Kriegsrat');
  });

  it('der letzte Rat bleibt stehen, solange Dungeon, Helden mit Reihenfolge, Proviant und Grad gleich sind', () => {
    const neu = () => musterStand('stark', 1, 'sterne3').state;
    const { state, ids } = musterStand('stark', 1, 'sterne3');
    const vorher = JSON.stringify(state);
    merkeLetztenRat(state, 'drachenhort', ids, {}, 'nightmare', kriegsrat(state, 'drachenhort', ids, {}, 20, 'nightmare'));
    const zeile = '<p class="kr-letzter">Letzter Rat&nbsp;· ☠&nbsp;Albtraum:&nbsp;19&nbsp;Siege&nbsp;· 1&nbsp;Niederlage</p>';
    expect(letzterRatHtml(state, 'drachenhort', ids, {}, 'nightmare')).toBe(zeile);
    expect(JSON.stringify(state)).toBe(vorher);
    // Gold, Tag, XP und mehr Brot im Lager (ohne Auswahl nimmt der Start je Sorte höchstens 3) ändern nichts
    const reicher = neu();
    reicher.globalStock.gold += 500;
    reicher.day += 1;
    reicher.fighters[0].xp += 10;
    reicher.globalStock.bread = 30;
    expect(letzterRatHtml(reicher, 'drachenhort', ids, {}, 'nightmare')).toBe(zeile);
    const rueckwaerts = [...ids].reverse();
    expect(kriegsrat(state, 'drachenhort', rueckwaerts, {}, 20, 'nightmare').siege).toBe(18);
    expect(letzterRatHtml(state, 'drachenhort', rueckwaerts, {}, 'nightmare')).toBe('');
    expect(letzterRatHtml(state, 'drachenhort', ids, {}, 'hard')).toBe('');
    expect(letzterRatHtml(state, 'himmelsarchiv', ids, {}, 'nightmare')).toBe('');
    expect(letzterRatHtml(state, 'drachenhort', ids, { healing_potion: 1 }, 'nightmare')).toBe('');
    expect(letzterRatHtml(state, 'drachenhort', ids.slice(0, 3), {}, 'nightmare')).toBe('');
    const ohneTalisman = neu();
    ohneTalisman.fighters[0].gear.trinket = null;
    expect(kriegsrat(ohneTalisman, 'drachenhort', ids, {}, 20, 'nightmare').siege).toBe(4);
    const schwaecher = neu();
    schwaecher.schmiede!.stufen.set_hort_klinge = 2;
    const wenigBrot = neu();
    wenigBrot.globalStock.bread = 1;
    for (const s of [ohneTalisman, schwaecher, wenigBrot]) {
      expect(letzterRatHtml(s, 'drachenhort', ids, {}, 'nightmare')).toBe('');
    }
    // Nur der letzte Rat bleibt
    const sterne5 = musterStand('stark', 1, 'sterne5');
    merkeLetztenRat(sterne5.state, 'sternenschlund', sterne5.ids, {}, 'normal',
      kriegsrat(sterne5.state, 'sternenschlund', sterne5.ids, {}, 20));
    expect(letzterRatHtml(sterne5.state, 'sternenschlund', sterne5.ids, {}, 'normal')).toBe(
      '<p class="kr-letzter">Letzter Rat&nbsp;· Normal:&nbsp;12&nbsp;Siege&nbsp;· 6&nbsp;Niederlagen&nbsp;· 2×&nbsp;Boss&nbsp;überlebt</p>');
    expect(letzterRatHtml(state, 'drachenhort', ids, {}, 'nightmare')).toBe('');
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

  it('häppchenweise: Das erste Häppchen rechnet nur einen Schritt, danach je eines bis 30 ms', () => {
    const uhr = { jetzt: 0 };
    const naechstes = haeppchenweise(schritte(uhr, 12, 7), 30, () => uhr.jetzt);
    expect(naechstes()).toEqual({ value: 1, done: false });
    expect(naechstes()).toEqual({ value: 6, done: false });
    expect(naechstes()).toEqual({ value: 11, done: false });
    expect(naechstes()).toEqual({ value: 'fertig', done: true });
  });

  it('im Hintergrund: ein Häppchen je Aufgabe (sonst 30 ms), dazwischen der Stand, am Ende das Ergebnis', () => {
    vi.useFakeTimers();
    try {
      const uhr = { jetzt: 0 };
      const meldungen: unknown[] = [];
      const melde = {
        zwischen: (n: number) => meldungen.push(n), fertig: (r: string) => meldungen.push(r), fehler: (e: unknown) => meldungen.push(e),
      };
      rechneImHintergrund(haeppchenweise(schritte(uhr, 12, 7), undefined, () => uhr.jetzt), () => true, melde);
      expect(meldungen).toEqual([]);
      vi.advanceTimersToNextTimer();
      expect(meldungen).toEqual([1]);
      vi.runAllTimers();
      expect(meldungen).toEqual([1, 6, 11, 'fertig']);

      // Das Fenster ist nach dem ersten Häppchen zu: Es rechnet nicht weiter
      let offen = true;
      meldungen.length = 0;
      rechneImHintergrund(haeppchenweise(schritte(uhr, 12, 7), undefined, () => uhr.jetzt), () => offen, melde);
      vi.advanceTimersToNextTimer();
      offen = false;
      vi.runAllTimers();
      expect(meldungen).toEqual([1]);

      // Eine Ausnahme beendet das Rechnen mit der Meldung
      meldungen.length = 0;
      const fehler = new Error('kaputt');
      rechneImHintergrund(() => { throw fehler; }, () => true, melde);
      vi.runAllTimers();
      expect(meldungen).toEqual([fehler]);
    } finally {
      vi.useRealTimers();
    }
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
