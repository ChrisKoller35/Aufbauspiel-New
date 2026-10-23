import { describe, test, expect } from 'vitest';
import { CLASS_DEFS } from '../src/data/classes';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import {
  awardXP, totalXpForLevel, ueberschuss, LEVEL_BONUSES, MAX_HERO_LEVEL,
} from '../src/systems/HeroProgression';
import { trainieren, trainingsKosten, trainingsXp } from '../src/systems/Ausbildung';

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
