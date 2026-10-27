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
import { setBeute } from '../src/systems/DungeonSets';
import { schmiedeBeute } from '../src/systems/Schmiede';
import { neueVorschau, vorschauNachLauf } from '../src/systems/KriegsratVorschau';
import { haertegradKnoten } from '../src/ui/screens/DungeonMapScreen';
import {
  Haertegrad, albtraumBeute, albtraumHinweise, haertegradBilanz, haertegradSatz, haertegradWaehlbar, hoechsterHaertegrad,
  merkeHaertegrad,
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
      + ' Dafür: Punkte ×2 · 14 Drachenschuppe je Sieg statt 7 · Set-Teil 80 % statt 50 % · ein Wurf mehr auf die Boss-Beute.');
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
    expect(haertegradBilanz(sieg, true)).toEqual(['☠ Albtraum bezwungen: Das Himmelsarchiv. Das System vermerkt: Diese Gilde hört nicht auf, wenn es reicht.']);
    expect(haertegradBilanz(sieg, false)).toEqual([]);
    const rundenlimit: ExpeditionRun = { ...sieg, bossesKilled: 0 };
    const satz = 'nicht bezwungen: Das Himmelsarchiv. Der Boss stand nach dem Rundenlimit noch. Das System vermerkt: Beute ja, Punkte wie auf Normal.';
    expect(haertegradBilanz(rundenlimit, false)).toEqual([`☠ Albtraum ${satz}`]);
    expect(haertegradBilanz({ ...rundenlimit, difficulty: 'hard' }, false)).toEqual([`⚔ Schwer ${satz}`]);
    expect(haertegradBilanz({ ...rundenlimit, difficulty: 'normal' }, false)).toEqual([]);
    expect(haertegradBilanz({ ...rundenlimit, status: 'defeat' }, false)).toEqual([]);
  });

  it('Albtraum-Beute: ein Wurf mehr auf die Boss-Beute, nur nach bezwungenem Albtraum', () => {
    const sieg = lauf('himmelsarchiv', 'nightmare');
    const vorher: ExpeditionRun = { ...sieg, loot: { ...sieg.loot } };
    const beute = albtraumBeute(sieg);
    expect(beute).toEqual({ gold: 192, dinge: { amulet_of_rebirth: 1 } });
    expect(sieg.goldEarned).toBe(vorher.goldEarned + 192);
    expect(sieg.loot).toEqual({ ...vorher.loot, amulet_of_rebirth: (vorher.loot.amulet_of_rebirth ?? 0) + 1 });
    expect(sieg.rngSeed).toBe(vorher.rngSeed);
    expect(albtraumHinweise(beute, sieg.loot)).toEqual({ amulet_of_rebirth: '☠ Albtraum-\u2060Beute' });
    expect(haertegradBilanz(sieg, true, beute)).toEqual([
      '☠ Albtraum bezwungen: Das Himmelsarchiv. Das System vermerkt: Diese Gilde hört nicht auf, wenn es reicht.',
      '☠ Albtraum-\u2060Beute: 192\u00a0Gold und Amulett der Wiedergeburt',
    ]);
    const zwei = lauf('himmelsarchiv', 'nightmare', 2);
    const beuteZwei = albtraumBeute(zwei);
    expect(haertegradBilanz(zwei, false, beuteZwei)).toEqual(['☠ Albtraum-\u2060Beute: 213\u00a0Gold und 9×\u00a0Kristallsplitter']);
    expect(albtraumHinweise(beuteZwei, zwei.loot)).toEqual({ crystal_shard: '☠ 9\u00a0davon aus der Albtraum-\u2060Beute' });
    expect(albtraumHinweise(null, zwei.loot)).toEqual({});
    expect(albtraumBeute(lauf('himmelsarchiv', 'hard'))).toBeNull();
    expect(albtraumBeute({ ...vorher, bossesKilled: 0 })).toBeNull();
    expect(albtraumBeute({ ...vorher, status: 'retreat' })).toBeNull();
    expect(albtraumBeute(lauf('sternenschlund', 'nightmare'))).toBeNull();
  });

  it('Kriegsrat: vorschauNachLauf würfelt die Albtraum-Beute vor dem Zählen, wie finishExpedition', () => {
    const { state, ids } = musterStand('stark', 7919, 'mond5');
    const sieg = lauf('himmelsarchiv', 'nightmare');
    const rat: ExpeditionRun = structuredClone(sieg);
    const ende: ExpeditionRun = structuredClone(sieg);
    const v = neueVorschau(state, 'himmelsarchiv', ids);
    vorschauNachLauf(v, structuredClone(state), rat);
    const kopie = structuredClone(state);
    setBeute(kopie, ende);
    schmiedeBeute(ende);
    albtraumBeute(ende);
    expect(rat.goldEarned).toBe(sieg.goldEarned + 192);
    expect(rat.loot).toEqual(ende.loot);
    expect(v.ausruestung.get('amulet_of_rebirth')).toBe(1);
  });

  it('ehrliche Punkte: den Faktor des Grads gibt es nur für bezwungene Dungeons', () => {
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    const punkte = (run: ExpeditionRun, grad: Haertegrad, mehr: Partial<ExpeditionRun> = {}) =>
      system.calculateScore({ ...run, difficulty: grad, ...mehr });
    const sieg = lauf('himmelsarchiv', 'nightmare');
    expect(punkte(sieg, 'nightmare')).toBe(6420);
    expect(punkte(sieg, 'normal')).toBe(3210);
    expect(punkte(sieg, 'nightmare', { bossesKilled: 0 })).toBe(2710);
    expect(punkte(sieg, 'nightmare', { status: 'retreat' })).toBe(3210);
    const verloren = lauf('sternenschlund', 'nightmare');
    expect(verloren.status).toBe('defeat');
    expect(punkte(verloren, 'nightmare')).toBe(1730);
    const zehn = (grad: Haertegrad) => Array.from({ length: 10 }, (_, i) => lauf('sternenschlund', grad, i + 1));
    const besteNiederlage = Math.max(...zehn('nightmare').filter(r => !dungeonBezwungen(r)).map(r => punkte(r, 'nightmare')));
    const schwaechsterSieg = Math.min(...zehn('normal').filter(dungeonBezwungen).map(r => punkte(r, 'normal')));
    expect(besteNiederlage).toBe(1970);
    expect(schwaechsterSieg).toBe(2995);
  });

  it('Marke auf der Dungeon-Karte', () => {
    expect(haertegradKnoten(undefined, 100, 200)).toBe('');
    const albtraum = haertegradKnoten('nightmare', 100, 200);
    for (const teil of ['dmap-haerte nightmare', '<title>☠ Albtraum bezwungen</title>', 'cx="100" cy="200"', '#dc2626', '☠']) {
      expect(albtraum).toContain(teil);
    }
    const schwer = haertegradKnoten('hard', 100, 200);
    for (const teil of ['dmap-haerte hard', '<title>⚔ Schwer bezwungen</title>', '#c8a227', '⚔']) expect(schwer).toContain(teil);
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
