import { describe, it, expect } from 'vitest';
import { createNewGameState } from '../src/models/GameState';
import { ExpeditionRun, dungeonBezwungen } from '../src/models/ExpeditionRun';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { istGeschichtsWahl } from '../src/systems/Geschichten';
import { musterStand } from '../src/systems/Musterlauf';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { CURRENT_VERSION, pruefeSpielstandText } from '../src/systems/SaveSystem';
import {
  Haertegrad, haertegradBilanz, haertegradSatz, haertegradWaehlbar, hoechsterHaertegrad, merkeHaertegrad,
} from '../src/systems/Haertegrade';

/** Ein Lauf ohne Bildschirm wie spieleRoute «vorsichtig», aber auf dem Grad `grad` */
function lauf(routeId: string, grad: Haertegrad, i = 1): ExpeditionRun {
  const { state, ids } = musterStand('stark', i * 7919, 'mond5');
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  const run = system.startExpedition(state, routeId, ids, grad)!;
  for (let schritt = 0; schritt < 500; schritt++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') {
      const raum = run.rooms[run.pendingChoice!.roomIndex];
      system.resolveChoice(run, istGeschichtsWahl(run.pendingChoice) || raum.type === 'rest' ? 0 : 1);
    } else system.processCurrentRoom(state);
  }
  return run;
}

function probespiel() {
  const state = createNewGameState();
  placeStartingLayout(state);
  richteProbespielEin(state, 'sterne');
  return state;
}

describe('Härtegrade', () => {
  it('Probespiel «sterne»: wählbar nur in bezwungenen Dungeons, Sätze aus den Werten des Spiels', () => {
    const state = probespiel();
    expect(haertegradWaehlbar(state, 'himmelsarchiv')).toBe(true);
    expect(haertegradWaehlbar(state, 'sternenschmiede')).toBe(false);
    expect(hoechsterHaertegrad(state, 'drachenhort')).toBe('normal');
    expect(hoechsterHaertegrad(state, 'sternenschmiede')).toBeNull();
    expect(haertegradSatz(state, 'drachenhort', 'hard')).toBe('⚔ Schwer: Gegner mit 30 % mehr Leben, 20 % mehr Angriff und +1 Verteidigung.'
      + ' Dafür: Punkte ×1,5 · 11 Drachenschuppe je Sieg statt 7 · Set-Teil 65 % statt 50 %.');
    expect(haertegradSatz(state, 'drachenhort', 'nightmare')).toBe('☠ Albtraum: Gegner mit 60 % mehr Leben, 40 % mehr Angriff und +2 Verteidigung.'
      + ' Dafür: Punkte ×2 · 14 Drachenschuppe je Sieg statt 7 · Set-Teil 80 % statt 50 %.');
    expect(haertegradSatz(state, 'himmelsarchiv', 'hard')).not.toContain('Set-Teil');
  });

  it('merkt sich nur bezwungene Läufe und nur einen höheren Grad', () => {
    const { state } = musterStand('stark', 7919, 'mond5');
    const verloren = lauf('sternenschlund', 'nightmare');
    expect(verloren.status).toBe('defeat');
    expect(merkeHaertegrad(state, verloren)).toBe(false);
    const sieg = lauf('himmelsarchiv', 'nightmare');
    expect(merkeHaertegrad(state, { ...sieg, bossesKilled: 0 })).toBe(false);
    expect(merkeHaertegrad(state, sieg)).toBe(true);
    expect(merkeHaertegrad(state, sieg)).toBe(false);
    expect(merkeHaertegrad(state, lauf('himmelsarchiv', 'hard'))).toBe(false);
    expect(state.haertegrade).toEqual({ himmelsarchiv: 'nightmare' });
    expect(haertegradBilanz(sieg, true)).toBe('☠ Albtraum bezwungen: Das Himmelsarchiv. Das System vermerkt: Diese Gilde hört nicht auf, wenn es reicht.');
    expect(haertegradBilanz(sieg, false)).toBeNull();
  });

  it('Leiter: Albtraum eine Ebene tiefer machbar, ganz oben nicht', () => {
    const siege = (routeId: string) => Array.from({ length: 10 }, (_, i) => lauf(routeId, 'nightmare', i + 1)).filter(dungeonBezwungen).length;
    expect(siege('himmelsarchiv')).toBeGreaterThanOrEqual(8);
    expect(siege('sternenschlund')).toBeLessThanOrEqual(1);
  });

  it('der Merker übersteht die Prüfung der Spielstand-Datei', () => {
    const datei = (haertegrade: unknown) => JSON.stringify({ ...probespiel(), saveVersion: CURRENT_VERSION, haertegrade });
    expect(pruefeSpielstandText(datei({ drachenhort: 'nightmare' })).ok).toBe(true);
    expect(pruefeSpielstandText(datei({ drachenhort: 'leicht' }))).toEqual({ ok: false, grund: 'Die Datei ist beschädigt.' });
  });
});
