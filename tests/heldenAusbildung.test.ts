import { describe, test, expect } from 'vitest';
import { CLASS_DEFS } from '../src/data/classes';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import {
  awardXP, totalXpForLevel, ueberschuss, LEVEL_BONUSES, MAX_HERO_LEVEL,
} from '../src/systems/HeroProgression';
import {
  lehrbuchLernen, lehrbuchVorschau, stufeBeiXp, trainieren, trainingsKosten, trainingsXp,
} from '../src/systems/Ausbildung';
import { CLASS_UNLOCK_CONDITIONS, STARTING_CLASSES } from '../src/data/classUnlocks';
import { ENEMY_DEFS } from '../src/data/enemies';
import { ROUTE_DEFS } from '../src/data/routes';
import { ClassUnlockSystem, fortschritt } from '../src/systems/ClassUnlockSystem';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { anheuerKosten } from '../src/systems/Empfehlung';
import { bedingungText, klassenTafelHtml } from '../src/ui/components/KlassenTafel';
import { lehrbuchHtml } from '../src/ui/components/Lehrbuch';

function neuerHeld(classId: string): GuildFighter {
  const c = CLASS_DEFS[classId];
  return createGuildFighter(c.id, c.name, c.baseStats);
}

function spielMitGold(gold: number): GameState {
  const state = createNewGameState();
  state.globalStock['gold'] = gold;
  return state;
}

/** Held auf Stufe 15 über echte awardXP-Aufstiege */
function meister(classId: string): GuildFighter {
  const f = neuerHeld(classId);
  awardXP(f, totalXpForLevel(MAX_HERO_LEVEL));
  return f;
}

describe('Training mit Klassen-Boni', () => {
  for (const classId of Object.keys(CLASS_DEFS)) {
    test(`${classId}: Training 1 bis 15 ergibt dieselben Werte wie dieselbe XP über awardXP`, () => {
      const state = spielMitGold(1_000_000);
      const trainiert = neuerHeld(classId);
      let xpSumme = 0;
      let trainings = 0;
      while (trainiert.level < MAX_HERO_LEVEL) {
        const r = trainieren(state, trainiert);
        expect(r.ok).toBe(true);
        if (r.ok) xpSumme += r.xp;
        trainings++;
      }
      const vergleich = neuerHeld(classId);
      awardXP(vergleich, xpSumme);

      expect(trainiert.level).toBe(15);
      expect(trainiert.xp).toBe(vergleich.xp);
      expect(trainiert.baseStats).toEqual(vergleich.baseStats);
      expect(trainings).toBe(46);
      expect(xpSumme).toBe(2300);
      expect(ueberschuss(trainiert)).toBe(2300 - totalXpForLevel(15)); // 60 XP aus dem letzten Training
      expect(1_000_000 - state.globalStock['gold']).toBe(4600);
    });
  }

  test('ein Aufstieg im Training bringt genau die Klassen-Boni (Guardian)', () => {
    const state = spielMitGold(1000);
    const f = neuerHeld('guardian');
    const vorher = { ...f.baseStats };
    // Stufe 1 → 2 braucht 30 XP, ein Training gibt 15: das zweite steigt auf
    trainieren(state, f);
    expect(f.level).toBe(1);
    const r = trainieren(state, f);
    expect(r.ok && r.levelUps).toBe(1);
    const b = LEVEL_BONUSES.guardian;
    expect(f.baseStats.maxHp).toBe(vorher.maxHp + b.hp!);
    expect(f.baseStats.atk).toBeCloseTo(vorher.atk + b.atk!);
    expect(f.baseStats.def).toBeCloseTo(vorher.def + b.def!);
  });

  test('Training kostet weiter 20 + Stufe × 10 Gold und gibt 10 + Stufe × 5 XP', () => {
    for (let level = 1; level < MAX_HERO_LEVEL; level++) {
      expect(trainingsKosten(level)).toBe(20 + level * 10);
      expect(trainingsXp(level)).toBe(10 + level * 5);
    }
    const state = spielMitGold(100);
    const f = neuerHeld('ranger');
    const r = trainieren(state, f);
    expect(r).toMatchObject({ ok: true, kosten: 30, xp: 15 });
    expect(state.globalStock['gold']).toBe(70);
  });

  test('ohne genug Gold passiert nichts, Gold wird nie negativ', () => {
    const state = spielMitGold(29);
    const f = neuerHeld('cleric');
    expect(trainieren(state, f)).toEqual({ ok: false, grund: 'gold' });
    expect(state.globalStock['gold']).toBe(29);
    expect(f.xp).toBe(0);

    state.globalStock['gold'] = 500;
    while (trainieren(state, f).ok) { /* bis das Gold nicht mehr reicht */ }
    expect(state.globalStock['gold']).toBeGreaterThanOrEqual(0);
    expect(state.globalStock['gold']).toBeLessThan(trainingsKosten(f.level));
  });

  test('ein Held auf Stufe 15 kann nicht mehr trainieren', () => {
    const state = spielMitGold(1000);
    const f = meister('berserker');
    expect(trainieren(state, f)).toEqual({ ok: false, grund: 'max' });
    expect(state.globalStock['gold']).toBe(1000);
  });

  test('Training schaltet den Paladin gleich frei, wenn der Guardian Stufe 5 erreicht', () => {
    const state = spielMitGold(10_000);
    state.guildStats.bossesDefeatedIds.push('boss_elder_treant');
    const g = neuerHeld('guardian');
    state.fighters.push(g);
    const neu: string[] = [];
    while (g.level < 5) {
      const r = trainieren(state, g);
      if (r.ok) neu.push(...r.neueKlassen);
    }
    expect(neu).toContain('paladin');
    expect(state.classesUnlocked).toContain('paladin');
  });
});

describe('Tabelle «Training vorher / nachher» (docs/AUSBILDUNG.md)', () => {
  /** Das alte Training aus HeroesScreen.handleTrain bis Stufe 15: je Aufstieg +2 Leben, +1 Angriff, +1 Verteidigung */
  function altesTraining(classId: string): GuildFighter {
    const f = neuerHeld(classId);
    while (f.level < MAX_HERO_LEVEL) {
      f.xp += 10 + f.level * 5;
      while (f.level < MAX_HERO_LEVEL && f.xp >= totalXpForLevel(f.level + 1)) {
        f.level++;
        f.baseStats.maxHp += 2;
        f.baseStats.hp = f.baseStats.maxHp;
        f.baseStats.atk += 1;
        f.baseStats.def += 1;
      }
    }
    return f;
  }

  // Leben / Angriff / Verteidigung / Krit / Tempo auf Stufe 15
  const TABELLE: Record<string, { vorher: number[]; nachher: number[] }> = {
    guardian:    { vorher: [98, 18, 17, 0.05, 0.8],   nachher: [126, 8.2, 10, 0.05, 0.8] },
    ranger:      { vorher: [78, 22, 15, 0.15, 1.2],   nachher: [78, 16.4, 2.4, 0.29, 1.2] },
    cleric:      { vorher: [83, 17, 15.5, 0.05, 0.9], nachher: [97, 5.8, 5.7, 0.05, 1.18] },
    berserker:   { vorher: [112, 21, 16, 0.12, 1.1],  nachher: [126, 14, 4.8, 0.12, 1.1] },
    assassin:    { vorher: [82, 22, 14, 0.2, 1.4],    nachher: [82, 16.4, 1.4, 0.34, 1.4] },
    paladin:     { vorher: [68, 18, 16.5, 0.05, 0.9], nachher: [96, 8.2, 8.1, 0.05, 0.9] },
    bard:        { vorher: [88, 17, 15, 0.05, 1.1],   nachher: [88, 5.8, 3.8, 0.05, 1.38] },
    witch:       { vorher: [85, 19, 14, 0.08, 1.2],   nachher: [85, 10.6, 1.4, 0.22, 1.2] },
    necromancer: { vorher: [88, 18, 15, 0.05, 1],     nachher: [88, 9.3, 3.8, 0.05, 1] },
    druid:       { vorher: [103, 18, 16, 0.06, 1],    nachher: [117, 8.2, 6.2, 0.06, 1.14] },
  };

  test('deckt alle Klassen ab', () => {
    expect(Object.keys(TABELLE).sort()).toEqual(Object.keys(CLASS_DEFS).sort());
  });

  for (const [classId, { vorher, nachher }] of Object.entries(TABELLE)) {
    test(`${classId}: Werte auf Stufe 15 mit altem und neuem Training`, () => {
      const werte = (f: GuildFighter) => {
        const s = f.baseStats;
        return [s.maxHp, s.atk, s.def, s.critChance, s.spd].map(v => Math.round(v * 100) / 100);
      };
      expect(werte(altesTraining(classId))).toEqual(vorher);
      const state = spielMitGold(1_000_000);
      const neu = neuerHeld(classId);
      while (trainieren(state, neu).ok) { /* bis Stufe 15 */ }
      expect(werte(neu)).toEqual(nachher);
    });
  }
});

describe('Keine verlorenen XP auf Stufe 15', () => {
  test('ein Held auf Stufe 15 behält XP aus awardXP als Überschuss', () => {
    const f = meister('guardian');
    const werte = { ...f.baseStats };
    expect(ueberschuss(f)).toBe(0);
    expect(awardXP(f, 120)).toBe(0);
    expect(awardXP(f, 80)).toBe(0);
    expect(f.level).toBe(15);
    expect(ueberschuss(f)).toBe(200);
    expect(f.xp).toBe(totalXpForLevel(15) + 200);
    expect(f.baseStats).toEqual(werte); // keine Boni über Stufe 15
  });

  test('ein Held unter 15 verhält sich wie vorher', () => {
    const f = neuerHeld('ranger');
    expect(awardXP(f, 29)).toBe(0);
    expect(f.level).toBe(1);
    expect(awardXP(f, 1)).toBe(1);
    expect(f.level).toBe(2);
    expect(ueberschuss(f)).toBe(0);
    // Auf einen Schlag über Stufe 15 hinaus: der Rest bleibt als Überschuss
    const g = neuerHeld('witch');
    expect(awardXP(g, totalXpForLevel(15) + 75)).toBe(14);
    expect(ueberschuss(g)).toBe(75);
    expect(awardXP(g, 0)).toBe(0);
    expect(awardXP(g, -5)).toBe(0);
    expect(ueberschuss(g)).toBe(75);
  });
});

describe('Lehrbuch', () => {
  /** Lehrer mit Überschuss und Schüler auf Stufe 1 in einem Spielstand */
  function klasse(lehrerXp: number): { state: GameState; lehrer: GuildFighter; schueler: GuildFighter } {
    const state = createNewGameState();
    const lehrer = meister('guardian');
    awardXP(lehrer, lehrerXp);
    const schueler = neuerHeld('cleric');
    state.fighters.push(lehrer, schueler);
    return { state, lehrer, schueler };
  }

  test('gibt den Überschuss 1 : 1 weiter, der Schüler steigt mit Klassen-Boni auf', () => {
    const { state, lehrer, schueler } = klasse(800);
    const vergleich = neuerHeld('cleric');
    awardXP(vergleich, 800);

    expect(lehrbuchVorschau(lehrer, schueler)).toEqual({ xp: 800, vonStufe: 1, nachStufe: stufeBeiXp(800) });
    const r = lehrbuchLernen(state, lehrer.id, schueler.id);
    expect(r).toMatchObject({ xp: 800, vonStufe: 1, nachStufe: vergleich.level });
    expect(schueler.xp).toBe(800);
    expect(schueler.baseStats).toEqual(vergleich.baseStats);
    expect(ueberschuss(lehrer)).toBe(0);
    expect(lehrer.level).toBe(15);
    expect(lehrer.xp).toBe(totalXpForLevel(15));
  });

  test('Vorschau: Stufe 9 mit 800 XP', () => {
    const { lehrer } = klasse(800);
    const schueler = neuerHeld('ranger');
    awardXP(schueler, totalXpForLevel(9));
    // Stufe 9 → 11 braucht 190 + 210 = 400 XP, 800 reichen bis Stufe 12 (+ 230)
    expect(lehrbuchVorschau(lehrer, schueler)).toEqual({ xp: 800, vonStufe: 9, nachStufe: 12 });
    expect(stufeBeiXp(totalXpForLevel(9) + 800)).toBe(12);
  });

  test('nie mehr als der Überschuss, nie mehr als bis Stufe 15; der Lehrer bleibt auf 15', () => {
    const { state, lehrer, schueler } = klasse(totalXpForLevel(15) + 300);
    const r = lehrbuchLernen(state, lehrer.id, schueler.id);
    expect(r?.xp).toBe(totalXpForLevel(15));
    expect(schueler.level).toBe(15);
    expect(ueberschuss(schueler)).toBe(0);
    expect(ueberschuss(lehrer)).toBe(300); // der Rest bleibt für den nächsten Schüler
    expect(lehrer.level).toBe(15);
    // Der Schüler ist jetzt selbst auf 15: kein weiteres Lernen
    expect(lehrbuchLernen(state, lehrer.id, schueler.id)).toBeNull();
  });

  test('zweimal schnell hintereinander verschiebt nur, was da ist', () => {
    const { state, lehrer, schueler } = klasse(120);
    const erster = lehrbuchLernen(state, lehrer.id, schueler.id);
    const zweiter = lehrbuchLernen(state, lehrer.id, schueler.id);
    expect(erster?.xp).toBe(120);
    expect(zweiter).toBeNull();
    expect(schueler.xp).toBe(120);
    expect(lehrer.xp).toBe(totalXpForLevel(15));
    expect(lehrer.level).toBe(15);
  });

  test('ohne Überschuss, mit sich selbst oder einem Lehrer unter 15 passiert nichts', () => {
    const { state, lehrer, schueler } = klasse(0);
    expect(lehrbuchLernen(state, lehrer.id, schueler.id)).toBeNull();
    expect(lehrbuchLernen(state, lehrer.id, lehrer.id)).toBeNull();
    expect(lehrbuchLernen(state, schueler.id, lehrer.id)).toBeNull();
    expect(lehrbuchLernen(state, 99999, schueler.id)).toBeNull();
    expect(schueler.xp).toBe(0);
  });

  test('Lernen schaltet den Paladin frei, wenn der Guardian-Schüler Stufe 5 erreicht', () => {
    const state = createNewGameState();
    state.guildStats.bossesDefeatedIds.push('boss_elder_treant');
    const lehrer = meister('ranger');
    awardXP(lehrer, totalXpForLevel(5));
    const guardian = neuerHeld('guardian');
    state.fighters.push(lehrer, guardian);
    // Der Berserker hängt nur am Treant und wird beim selben Prüfen mit frei
    expect(lehrbuchLernen(state, lehrer.id, guardian.id)?.neueKlassen).toEqual(['berserker', 'paladin']);
    expect(guardian.level).toBe(5);
  });

  test('Heldennamen aus dem Spielstand landen escaped im HTML', () => {
    const { state, lehrer, schueler } = klasse(50);
    lehrer.name = '<img src=x onerror=alert(1)>';
    schueler.name = 'Ana "die Kühne"';
    const html = lehrbuchHtml(state);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)>');
    expect(html).toContain('Ana &quot;die Kühne&quot;');
    expect(html).toContain('+50 XP → Stufe 1 auf 2');
    expect(html).toContain('data-lb-lernen');
  });

  test('ohne Helden auf Stufe 15 gibt es kein Lehrbuch', () => {
    const state = createNewGameState();
    state.fighters.push(neuerHeld('guardian'), neuerHeld('cleric'));
    expect(lehrbuchHtml(state)).toBe('');
  });
});

/** Ein Lauf wie aufbrechen (ExpeditionFlow.ts), Raum für Raum wie playRoute (expeditionProgress.test.ts) */
function expedition(state: GameState, system: ExpeditionSystem, routeId: string, heroIds: number[]) {
  const run = system.startExpedition(state, routeId, heroIds, 'normal', null, false, [])!;
  expect(run).toBeTruthy();
  for (let guard = 0; guard < 200; guard++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') system.resolveChoice(run, 0);
    else system.processCurrentRoom(state);
  }
  const progress = finalizeExpeditionProgress(state, run, system);
  state.activeExpedition = null;
  return { run, progress };
}

describe('Lehrbuch in echten Expeditionen', () => {
  /**
   * Guardian auf Stufe 15 mit Cleric und Ranger auf Stufe 1 im Waldpfad. Mit Lehrbuch gibt der
   * Guardian nach jedem Lauf seinen Überschuss dem schwächeren Neuling (bzw. immer dem Cleric).
   */
  function laeufe(anzahl: number, lehrbuch: 'nie' | 'schwaecher' | 'cleric') {
    const state = createNewGameState();
    state.rngSeed = 4242;
    const lehrer = meister('guardian');
    const cleric = neuerHeld('cleric');
    const ranger = neuerHeld('ranger');
    state.fighters.push(lehrer, cleric, ranger);
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    let siege = 0;
    let gegeben = 0;
    let schwaecherBis10: number | null = null;
    let clericBis10: number | null = null;
    for (let n = 1; n <= anzahl; n++) {
      const { run } = expedition(state, system, 'forest_short', [lehrer.id, cleric.id, ranger.id]);
      if (run.status === 'victory') siege++;
      if (lehrbuch !== 'nie') {
        const schueler = lehrbuch === 'cleric' || cleric.xp <= ranger.xp ? cleric : ranger;
        gegeben += lehrbuchLernen(state, lehrer.id, schueler.id)?.xp ?? 0;
      }
      if (schwaecherBis10 === null && Math.min(cleric.level, ranger.level) >= 10) schwaecherBis10 = n;
      if (clericBis10 === null && cleric.level >= 10) clericBis10 = n;
      expect(lehrer.level).toBe(15);
    }
    return { lehrer, cleric, ranger, siege, gegeben, schwaecherBis10, clericBis10 };
  }

  test('20 Läufe: mit Lehrbuch erreicht der schwächere Neuling Stufe 10 nach 19 statt 28 Läufen', () => {
    const ohne = laeufe(20, 'nie');
    expect(ohne.siege).toBe(20);
    expect([ohne.cleric.level, ohne.ranger.level]).toEqual([8, 8]);
    expect([ohne.cleric.xp, ohne.ranger.xp]).toEqual([720, 720]); // 36 XP je Held und Lauf
    expect(ueberschuss(ohne.lehrer)).toBe(720); // früher verloren, jetzt Überschuss
    expect(ohne.schwaecherBis10).toBeNull();

    const mit = laeufe(20, 'schwaecher');
    expect(mit.siege).toBe(20);
    expect(mit.gegeben).toBe(720);
    expect([mit.cleric.level, mit.ranger.level]).toEqual([10, 10]);
    expect([mit.cleric.xp, mit.ranger.xp]).toEqual([1080, 1080]);
    expect(mit.schwaecherBis10).toBe(19);

    // Ohne Lehrbuch weiterspielen, bis der schwächere Neuling Stufe 10 hat
    expect(laeufe(28, 'nie').schwaecherBis10).toBe(28);

    // Alles an einen Schüler: der Cleric hat Stufe 10 schon nach 14 Läufen
    const einer = laeufe(20, 'cleric');
    expect(einer.clericBis10).toBe(14);
    expect(einer.ranger.level).toBe(8);
  }, 60_000);
});

describe('Klassen-Tafel', () => {
  test('jeder Boss aus CLASS_UNLOCK_CONDITIONS lebt in einem Dungeon und hat einen Namen', () => {
    const routenBosse = new Set(Object.values(ROUTE_DEFS).map(r => r.bossId));
    for (const c of CLASS_UNLOCK_CONDITIONS) {
      for (const bossId of c.bossesDefeated ?? []) {
        expect(routenBosse.has(bossId), bossId).toBe(true);
        expect(ENEMY_DEFS[bossId]?.name, bossId).toBeTruthy();
      }
      // Barde (Expeditionen) und die Stufen-Bedingung des Paladins brauchen keine Route
      if (!c.bossesDefeated) expect(c.expeditionsCompleted ?? c.classLevelRequired).toBeDefined();
    }
  });

  test('Texte der Bedingungen mit Fortschritt', () => {
    const state = createNewGameState();
    state.guildStats.totalExpeditionsCompleted = 4;
    const g = neuerHeld('guardian');
    awardXP(g, totalXpForLevel(3));
    state.fighters.push(g);

    expect(fortschritt(state, 'bard').schritte.map(bedingungText)).toEqual(['10 gewonnene Expeditionen: 4/10']);
    expect(fortschritt(state, 'paladin').schritte.map(bedingungText)).toEqual([
      'Besiege «Uralter Treant» im Tiefwald: 0/1',
      'Guardian auf Stufe 5: Stufe 3',
    ]);
    expect(fortschritt(state, 'necromancer').schritte.map(bedingungText)).toEqual([
      'Besiege «Schattenlich» in den Tiefen Ruinen: 0/1',
    ]);
    expect(fortschritt(state, 'guardian')).toEqual({ start: true, frei: true, schritte: [], fertig: false });
  });

  test('zeigt alle Klassen; freie mit Anheuern zum Preis aus anheuerKosten', () => {
    const state = createNewGameState();
    state.fighters.push(neuerHeld('guardian'));
    const html = klassenTafelHtml(state, (c, kosten) => `<button class="btn-hire" data-class-id="${c.id}" data-cost="${kosten}">`);
    for (const id of Object.keys(CLASS_DEFS)) expect(html).toContain(id);
    expect(html).toContain(`data-class-id="ranger" data-cost="${anheuerKosten(1)}"`);
    expect(html).toContain(`data-class-id="cleric" data-cost="${anheuerKosten(1)}"`);
    expect(html).not.toContain('data-class-id="guardian"'); // schon in der Gilde
    expect(html).not.toContain('data-class-id="berserker"'); // gesperrt
    expect(html).toContain('von Anfang an');
    expect(html).toContain('10 gewonnene Expeditionen: 0/10');
    expect(html).toContain(`${STARTING_CLASSES.length} von ${Object.keys(CLASS_DEFS).length} Klassen freigeschaltet`);
  });

  /** Für jede gesperrte Klasse: fortschritt «fertig» ⇔ checkUnlocks schaltet sie frei */
  function pruefeGleichlauf(state: GameState): string[] {
    const fertig = Object.keys(CLASS_DEFS).filter(id => !fortschritt(state, id).frei && fortschritt(state, id).fertig);
    const kopie = structuredClone(state);
    const frei = new ClassUnlockSystem().checkUnlocks(kopie);
    expect(frei.sort()).toEqual(fertig.sort());
    return frei;
  }

  test('Fortschritt «fertig» ⇔ checkUnlocks schaltet frei, mit echten Spielständen', () => {
    const state = createNewGameState();
    const stark = createGuildFighter('guardian', 'Testheld', {
      hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1,
    });
    state.fighters.push(stark);
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    expect(pruefeGleichlauf(state)).toEqual([]);

    // Drei Siege im Waldpfad öffnen den Tiefwald; der Sieg dort besiegt den Uralten Treant
    for (let i = 0; i < 3; i++) expedition(state, system, 'forest_short', [stark.id]);
    const vorTreant = structuredClone(state);
    expect(fortschritt(state, 'berserker').fertig).toBe(false);
    const { run } = expedition(state, system, 'forest_medium', [stark.id]);
    expect(run.status).toBe('victory');
    expect(state.guildStats.bossesDefeatedIds).toContain('boss_elder_treant');
    // finalizeExpeditionProgress hat freigeschaltet, was fortschritt als fertig meldet
    vorTreant.guildStats = structuredClone(state.guildStats);
    expect(pruefeGleichlauf(vorTreant)).toEqual(['berserker']);
    expect(state.classesUnlocked).toContain('berserker');
    expect(fortschritt(state, 'berserker')).toMatchObject({ frei: true, fertig: true });
    // Paladin braucht dazu einen Guardian auf Stufe 5 (der Testheld ist Stufe 1 + XP aus 4 Läufen)
    expect(fortschritt(state, 'paladin').fertig).toBe(stark.level >= 5);
    expect(state.classesUnlocked.includes('paladin')).toBe(stark.level >= 5);

    // Weitere Siege bis 10: der Barde
    while (state.guildStats.totalExpeditionsCompleted < 9) expedition(state, system, 'forest_short', [stark.id]);
    expect(pruefeGleichlauf(state)).toEqual([]);
    expect(bedingungText(fortschritt(state, 'bard').schritte[0])).toBe('10 gewonnene Expeditionen: 9/10');
    const vorBarde = structuredClone(state);
    expedition(state, system, 'forest_short', [stark.id]);
    vorBarde.guildStats = structuredClone(state.guildStats);
    vorBarde.fighters = structuredClone(state.fighters);
    expect(pruefeGleichlauf(vorBarde)).toContain('bard');
    expect(state.classesUnlocked).toContain('bard');
  }, 60_000);

  test('Stufen-Bedingung: Paladin genau dann, wenn ein Guardian Stufe 5 hat', () => {
    const state = createNewGameState();
    state.guildStats.bossesDefeatedIds.push('boss_elder_treant');
    const g = neuerHeld('guardian');
    state.fighters.push(g);
    awardXP(g, totalXpForLevel(5) - 1);
    expect(fortschritt(state, 'paladin').fertig).toBe(false);
    expect(pruefeGleichlauf(state)).not.toContain('paladin');
    awardXP(g, 1);
    expect(fortschritt(state, 'paladin').fertig).toBe(true);
    expect(pruefeGleichlauf(state)).toContain('paladin');
  });
});
