import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { CombatUnit, ExpeditionRun } from '../src/models/ExpeditionRun';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';

const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());

/** Spielstand mit zwei übermächtigen Helden, die jeden Kampf gewinnen, und dem gewünschten Vorrat im Lager. */
function aufbruch(vorrat: Record<string, number>, mitnehmen: string[]): { state: GameState; run: ExpeditionRun; ids: [number, number] } {
  const state = createNewGameState();
  const ids = ['Testheld', 'Testheldin'].map((name, i) => {
    const held = createGuildFighter(i + 1, 'guardian', name, {
      hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1,
    });
    state.fighters.push(held);
    return held.id;
  }) as [number, number];
  Object.assign(state.globalStock, vorrat);
  const run = system.startExpedition(state, 'cave_deep', ids, 'normal', null, false, mitnehmen)!;
  expect(run).toBeTruthy();
  return { state, run, ids };
}

/** Platz des Vorrats im Gepäck */
function platz(run: ExpeditionRun, itemId: string): number {
  const i = run.provisions.findIndex(p => p.itemId === itemId && p.qty > 0);
  expect(i, `${itemId} im Gepäck`).toBeGreaterThanOrEqual(0);
  return i;
}

function trinken(state: GameState, itemId: string): void {
  system.useProvision(state, platz(state.activeExpedition!, itemId));
}

function menge(run: ExpeditionRun, itemId: string): number {
  return run.provisions.filter(p => p.itemId === itemId).reduce((s, p) => s + p.qty, 0);
}

/** Spielt weiter, bis Raum `raum` betreten ist (Kontrollpunkte weiter, Wahl-Räume Option A). */
function bisRaum(state: GameState, run: ExpeditionRun, raum: number): void {
  for (let schritt = 0; schritt < 100 && run.currentRoom < raum; schritt++) {
    const step = system.nextStep(run);
    if (step === 'finish') throw new Error(`Lauf zu Ende (${run.status}) vor Raum ${raum}`);
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'choice') system.resolveChoice(run, 0);
    else system.processCurrentRoom(state);
  }
  expect(run.currentRoom).toBe(raum);
  expect(run.status).toBe('exploring');
}

/** Der erste (0) oder zweite (1) Held der Gruppe */
const held = (run: ExpeditionRun, nr: 0 | 1): CombatUnit => run.party[nr];
const letzteZeile = (run: ExpeditionRun) => run.combatLog[run.combatLog.length - 1];

describe('Tränke mit Wirkung', () => {
  it('die Gilde gibt ein Brot und einen Heiltrank mit, kein Kraft-Brot mehr', () => {
    const { run } = aufbruch({}, []);
    expect(run.provisions.filter(p => p.gifted).map(p => p.itemId).sort()).toEqual(['bread', 'healing_potion']);
    expect(menge(run, 'power_bread')).toBe(0);
  });

  it('Brot und Heiltrank heilen die lebende Gruppe sofort, nie über die maximalen Leben', () => {
    const { state, run } = aufbruch({ healing_potion: 1 }, ['healing_potion']);
    const [a, b] = [held(run, 0), held(run, 1)];
    a.hp = 100;
    b.hp = b.maxHp - 3;
    trinken(state, 'bread');
    expect(a.hp).toBe(108);
    expect(b.hp).toBe(b.maxHp);
    expect(letzteZeile(run)).toBe('>> Brot: Die Gruppe heilt 8 Leben.');
    trinken(state, 'healing_potion');
    expect(a.hp).toBe(123);
    expect(letzteZeile(run)).toBe('>> Heiltrank: Die Gruppe heilt 15 Leben.');
  });

  it('Kraft-Brot gibt +2 Angriff als flachen Bonus, nur den Lebenden und nie der Kriegsmaschine', () => {
    const { state, run, ids } = aufbruch({ power_bread: 1 }, ['power_bread']);
    const [a, b] = [held(run, 0), held(run, 1)];
    const maschine: CombatUnit = { ...a, id: 99, name: 'Katapult', isWarMachine: true, skills: [], buffs: [], effektBoni: undefined };
    run.party.push(maschine);
    b.hp = 0;
    const atkA = a.atk, atkB = b.atk, atkM = maschine.atk;
    trinken(state, 'power_bread');
    expect(a.atk).toBe(atkA + 2);
    expect(a.effektBoni?.['trank:atk']).toBe(2);
    expect(b.atk).toBe(atkB);
    expect(b.effektBoni?.['trank:atk']).toBeUndefined();
    expect(maschine.atk).toBe(atkM);
    expect(letzteZeile(run)).toBe('>> Kraft-Brot: +2 Angriff für die nächsten 3 Räume.');
    expect(run.trankWirkungen).toEqual([{ itemId: 'power_bread', stat: 'atk', wert: 2, bisRaum: 3, helden: [ids[0]] }]);
  });

  it('Kraft-Brot ist nach drei Räumen verdaut: der Bonus geht genau wieder weg', () => {
    const { state, run } = aufbruch({ power_bread: 1 }, ['power_bread']);
    const a = held(run, 0);
    const atk = a.atk;
    trinken(state, 'power_bread');
    bisRaum(state, run, 2);
    expect(a.atk).toBe(atk + 2);
    expect(run.combatLog.some(z => z.includes('verdaut'))).toBe(false);
    bisRaum(state, run, 3);
    expect(a.atk).toBe(atk);
    expect(a.effektBoni?.['trank:atk']).toBeUndefined();
    expect(run.trankWirkungen).toEqual([]);
    expect(run.combatLog).toContain('>> Kraft-Brot ist verdaut.');
  });

  it('Krafttrank gibt +3 Angriff bis zum Ende; ein zweiter wirkt nicht und bleibt im Gepäck', () => {
    const { state, run, ids } = aufbruch({ potion_strength: 2 }, ['potion_strength', 'potion_strength']);
    const a = held(run, 0);
    const atk = a.atk;
    trinken(state, 'potion_strength');
    expect(a.atk).toBe(atk + 3);
    expect(letzteZeile(run)).toBe('>> Krafttrank: +3 Angriff bis zum Ende des Dungeons.');
    expect(menge(run, 'potion_strength')).toBe(1);
    trinken(state, 'potion_strength');
    expect(a.atk).toBe(atk + 3);
    expect(menge(run, 'potion_strength')).toBe(1);
    expect(letzteZeile(run)).toBe('>> Krafttrank wirkt schon bis zum Ende des Dungeons – der Vorrat bleibt.');
    bisRaum(state, run, 6);
    expect(a.atk).toBe(atk + 3);
    expect(run.trankWirkungen).toEqual([{ itemId: 'potion_strength', stat: 'atk', wert: 3, bisRaum: undefined, helden: ids }]);
  });

  it('Kraft-Brot und Krafttrank zusammen: ein flacher Bonus, den das Sternenfeuer nicht mitskaliert', () => {
    const { state, run } = aufbruch({ power_bread: 1, potion_strength: 1 }, ['power_bread', 'potion_strength']);
    const a = held(run, 0);
    const atk = a.atk;
    trinken(state, 'power_bread');
    trinken(state, 'potion_strength');
    expect(a.effektBoni?.['trank:atk']).toBe(5);
    expect(a.atk).toBe(atk + 5);
    // Sternenfeuer: +50 % auf den Angriff ohne die Tränke
    (system as unknown as { gruppenAngriffWaechst(run: ExpeditionRun, c: unknown): void })
      .gruppenAngriffWaechst(run, { label: 'Sternenfeuer', flavorText: '', effect: 'angriff', value: 50 });
    expect(a.atk).toBe(Math.round(atk * 1.5) + 5);
    bisRaum(state, run, 3);
    expect(a.effektBoni?.['trank:atk']).toBe(3);
    expect(a.atk).toBe(Math.round(atk * 1.5) + 3);
  });

  it('Titan-Gebräu gibt +10 maximale Leben und +10 Leben bis zum Ende', () => {
    const { state, run } = aufbruch({ potion_titan: 1 }, ['potion_titan']);
    const a = held(run, 0);
    a.hp = 500;
    const maxHp = a.maxHp;
    trinken(state, 'potion_titan');
    expect(a.maxHp).toBe(maxHp + 10);
    expect(a.hp).toBe(510);
    expect(letzteZeile(run)).toBe('>> Titan-Gebräu: +10 maximale Leben bis zum Ende des Dungeons.');
    bisRaum(state, run, 6);
    expect(a.maxHp).toBe(maxHp + 10);
  });

  it('Schnelligkeitstrank gibt +0,2 Tempo für zwei Räume; nachtrinken setzt die Dauer neu, stapelt aber nicht', () => {
    const { state, run } = aufbruch({ potion_speed: 2 }, ['potion_speed', 'potion_speed']);
    const a = held(run, 0);
    const spd = a.spd;
    trinken(state, 'potion_speed');
    expect(a.spd).toBeCloseTo(spd + 0.2, 5);
    expect(letzteZeile(run)).toBe('>> Schnelligkeitstrank: +0,2 Tempo für die nächsten 2 Räume.');
    expect(run.trankWirkungen?.[0].bisRaum).toBe(2);
    bisRaum(state, run, 1);
    trinken(state, 'potion_speed');
    expect(menge(run, 'potion_speed')).toBe(0);
    expect(a.spd).toBeCloseTo(spd + 0.2, 5);
    expect(a.effektBoni?.['trank:spd']).toBe(0.2);
    expect(run.trankWirkungen?.[0].bisRaum).toBe(3);
    bisRaum(state, run, 2);
    expect(a.spd).toBeCloseTo(spd + 0.2, 5);
    bisRaum(state, run, 3);
    expect(a.spd).toBe(spd);
    expect(a.effektBoni?.['trank:spd']).toBeUndefined();
    expect(run.combatLog).toContain('>> Schnelligkeitstrank ist verflogen.');
  });

  it('Manatrank macht alle Fähigkeiten sofort wieder bereit', () => {
    const { state, run } = aufbruch({ potion_mana: 1 }, ['potion_mana']);
    const a = held(run, 0);
    expect(a.skills.length).toBeGreaterThan(0);
    for (const s of a.skills) s.currentCooldown = 3;
    run.abilitiesUsed[a.id] = true;
    trinken(state, 'potion_mana');
    expect(a.skills.every(s => s.currentCooldown === 0)).toBe(true);
    expect(run.abilitiesUsed[a.id]).toBeUndefined();
    expect(letzteZeile(run)).toBe('>> Manatrank: Alle Fähigkeiten sind wieder bereit.');
  });

  it('Gegengift nimmt das Gift weg und heilt 5', () => {
    const { state, run } = aufbruch({ potion_antidote: 1 }, ['potion_antidote']);
    const a = held(run, 0);
    a.gift = { schaden: 4, runden: 3 };
    a.hp = 100;
    trinken(state, 'potion_antidote');
    expect(a.gift).toBeUndefined();
    expect(a.hp).toBe(105);
    expect(letzteZeile(run)).toBe('>> Gegengift: Das Gift ist weg, die Gruppe heilt 5 Leben.');
  });

  it('nicht getrunkene Vorräte kommen unverändert zurück, der nicht verbrauchte zweite Krafttrank auch', () => {
    const { state, run } = aufbruch(
      { potion_strength: 2, power_bread: 3, potion_speed: 1 },
      ['potion_strength', 'potion_strength', 'power_bread', 'power_bread'],
    );
    expect(state.globalStock.potion_strength).toBe(0);
    expect(state.globalStock.power_bread).toBe(1);
    const brot = state.globalStock.bread ?? 0;
    const heiltrank = state.globalStock.healing_potion ?? 0;
    trinken(state, 'potion_strength');
    trinken(state, 'potion_strength'); // wirkt schon, bleibt
    trinken(state, 'power_bread');
    system.retreat(run);
    system.returnProvisions(state, run);
    expect(state.globalStock.potion_strength).toBe(1);
    expect(state.globalStock.power_bread).toBe(2);
    expect(state.globalStock.potion_speed).toBe(1);
    // Die Wegzehrung der Gilde landet nie im Lager
    expect(state.globalStock.bread ?? 0).toBe(brot);
    expect(state.globalStock.healing_potion ?? 0).toBe(heiltrank);
  });
});
