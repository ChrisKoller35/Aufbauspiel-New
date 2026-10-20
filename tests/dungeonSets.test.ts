import { describe, test, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { CombatUnit, EncounterRoom, ExpeditionRun } from '../src/models/ExpeditionRun';
import { CombatEngine } from '../src/systems/CombatEngine';
import { GearSystem } from '../src/systems/GearSystem';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import {
  besitz, gesammelteTeile, getrageneSets, setBeute, setChance, setTeilWuerfeln, SET_CHANCE,
} from '../src/systems/DungeonSets';
import { DUNGEON_SETS, getSet, setFuerRoute, setTeilIds, setVonItem } from '../src/data/dungeonSets';
import { ITEM_DEFS } from '../src/data/items';
import { ROUTE_DEFS } from '../src/data/routes';
import { LOOT_TABLE_DEFS } from '../src/data/lootTables';
import { SPECIAL_EFFECT_DEFS } from '../src/data/specialEffects';
import { SeededRNG } from '../src/utils/RNG';

const gear = new GearSystem();
const engine = new CombatEngine(gear);

const GRUND = { hp: 100, maxHp: 100, atk: 10, def: 0, spd: 1, critChance: 0, critMult: 1.5 };

/** Ein Held, der alle drei Teile des Sets trägt (oder nur die ersten anzahl Teile) */
function heldMitSet(setId: string | null, anzahl = 3, werte: Partial<typeof GRUND> = {}): GuildFighter {
  const fighter = createGuildFighter(0, 'berserker', setId ? `Träger ${setId}` : 'Begleiter', { ...GRUND, ...werte });
  if (setId) {
    const set = getSet(setId)!;
    for (const id of setTeilIds(set).slice(0, anzahl)) fighter.gear[ITEM_DEFS[id].gearSlot!] = id;
  }
  return fighter;
}

/** Kampfeinheit eines Helden; Krit ist aus, damit Schaden genau vorhersagbar ist */
function einheit(fighter: GuildFighter, werte: Partial<CombatUnit> = {}): CombatUnit {
  return { ...engine.fighterToCombatUnit(fighter), critChance: 0, ...werte };
}

let gegnerId = 5000;
function gegner(name: string, werte: Partial<CombatUnit> = {}): CombatUnit {
  return {
    id: gegnerId++, name, isPlayer: false, hp: 1000, maxHp: 1000, atk: 1, def: 0, spd: 0.5,
    critChance: 0, critMult: 1, threat: 0, tauntRounds: 0, skills: [], buffs: [], lootTableId: null,
    ...werte,
  };
}

function lauf(party: CombatUnit[], enemies: CombatUnit[], extra: Partial<ExpeditionRun> = {}): { run: ExpeditionRun; room: EncounterRoom } {
  const room: EncounterRoom = { index: 0, type: 'combat', enemies, healPercent: 0, hazardDamage: 0, completed: false };
  const run: ExpeditionRun = {
    routeId: 'forest_short', party, rooms: [room], currentRoom: 0, combatLog: [], loot: {}, goldEarned: 0,
    provisions: [], status: 'exploring', lastCheckpoint: 0, desperateResolveUsed: false, rngSeed: 1,
    focusTarget: null, focusTargetCooldown: 0, difficulty: 'normal', activeModifier: null, score: 0,
    totalCombatRounds: 0, enemiesKilled: 0, bossesKilled: 0, abilitiesUsed: {}, ...extra,
  };
  return { run, room };
}

function kampf(party: CombatUnit[], enemies: CombatUnit[], extra: Partial<ExpeditionRun> = {}, seed = 7): ExpeditionRun {
  const { run, room } = lauf(party, enemies, extra);
  engine.processCombat(run, room, new SeededRNG(seed));
  return run;
}

function runde(run: ExpeditionRun, nr: number): string[] {
  return run.combatRoundSnapshots!.find(s => s.round === nr)?.logLines ?? [];
}

// ── Daten ──

describe('Set-Daten', () => {
  test('jeder Dungeon hat genau ein Set mit drei Teilen, die zusammen tragbar sind', () => {
    expect(DUNGEON_SETS).toHaveLength(Object.keys(ROUTE_DEFS).length);
    for (const route of Object.values(ROUTE_DEFS)) expect(setFuerRoute(route.id), route.id).toBeTruthy();

    const state = createNewGameState();
    for (const set of DUNGEON_SETS) {
      const fighter = createGuildFighter(0, 'guardian', 'Probe', GRUND);
      state.fighters = [fighter];
      // Ein Schild braucht eine Einhandwaffe in der Haupthand
      if (set.teile.some(t => t.art === 'schild') && !set.teile.some(t => t.art === 'klinge' || t.art === 'dolch')) {
        state.globalStock.iron_sword = 1;
        expect(gear.equip(state, fighter, 'iron_sword')).toBe(true);
      }
      for (const id of setTeilIds(set)) {
        state.globalStock[id] = 1;
        expect(gear.equip(state, fighter, id), `${set.id}: ${id}`).toBe(true);
      }
      expect(getrageneSets(fighter.gear)).toEqual([{ set, teile: 3 }]);
    }
  });

  test('Set-Teile sind gültige Ausrüstung mit vorhandenem Bild', () => {
    const namen = new Set<string>();
    for (const set of DUNGEON_SETS) {
      expect(getSet(set.id)).toBe(set);
      for (const id of setTeilIds(set)) {
        const def = ITEM_DEFS[id];
        expect(def, id).toBeTruthy();
        expect(def.type).toBe('gear');
        expect(def.tags).toContain(`set:${set.id}`);
        expect(def.tier).toBe(set.tier);
        expect(setVonItem(id)).toBe(set);
        expect(existsSync(`public/assets/sprites/final/${def.spriteKey}.png`), def.spriteKey).toBe(true);
        expect(namen.has(def.name), def.name).toBe(false);
        namen.add(def.name);
      }
      for (const e of set.dreiTeile.effekte) expect(SPECIAL_EFFECT_DEFS[e.id], e.id).toBeTruthy();
    }
    expect(setVonItem('iron_sword')).toBeUndefined();
  });
});

// ── Zählen und Werte ──

describe('Set-Boni', () => {
  test('ein Teil gibt nur seine Werte, zwei den Zwei-Teile-Bonus, drei die Fähigkeit', () => {
    const rudel = getSet('rudel')!;
    const ohne = (f: GuildFighter): number => {
      let atk = f.baseStats.atk;
      for (const id of Object.values(f.gear)) if (id) atk += ITEM_DEFS[id].statBonuses?.atk ?? 0;
      return atk;
    };
    const eins = heldMitSet('rudel', 1);
    expect(gear.getEffectiveStats(eins).atk).toBe(ohne(eins));
    expect(gear.getSpecialEffects(eins)).toEqual([]);

    const zwei = heldMitSet('rudel', 2);
    expect(gear.getEffectiveStats(zwei).atk).toBe(ohne(zwei) + rudel.zweiTeile.atk!);
    expect(gear.getSpecialEffects(zwei)).toEqual([]);

    const drei = heldMitSet('rudel', 3);
    expect(gear.getEffectiveStats(drei).atk).toBe(ohne(drei) + rudel.zweiTeile.atk!);
    expect(gear.getSpecialEffects(drei)).toEqual([{ id: 'rudelgeheul', power: 2, runden: 3, set: 'rudel', usesLeft: -1 }]);
  });

  test('zwei gleiche Klingen zählen als ein Teil', () => {
    const f = createGuildFighter(0, 'assassin', 'Zwilling', GRUND);
    f.gear.mainHand = 'set_rudel_klinge';
    f.gear.offHand = 'set_rudel_klinge';
    expect(getrageneSets(f.gear)).toEqual([{ set: getSet('rudel'), teile: 1 }]);
  });

  test('zwei halbe Sets geben beide Zwei-Teile-Boni', () => {
    const f = createGuildFighter(0, 'guardian', 'Mischer', GRUND);
    f.gear.mainHand = 'set_rudel_klinge';
    f.gear.trinket = 'set_rudel_amulett';
    f.gear.offHand = 'set_lichtung_schild';
    f.gear.armor = 'set_lichtung_platte';
    const stats = gear.getEffectiveStats(f);
    let hp = GRUND.maxHp;
    for (const id of Object.values(f.gear)) hp += ITEM_DEFS[id!].statBonuses?.hp ?? 0;
    expect(stats.maxHp).toBe(hp + getSet('rudel')!.zweiTeile.hp! + getSet('lichtung')!.zweiTeile.hp!);
  });

  test('Kristallschliff gibt Krit-Chance und Krit-Schaden', () => {
    const f = heldMitSet('kristall');
    let krit = 0;
    for (const id of Object.values(f.gear)) if (id) krit += ITEM_DEFS[id].statBonuses?.critChance ?? 0;
    const stats = gear.getEffectiveStats(f);
    expect(stats.critMult).toBeCloseTo(GRUND.critMult + 0.6);
    expect(stats.critChance).toBeCloseTo(krit + 0.06 + 0.08);
  });

  test('Ausrüstung, die repariert werden muss, gibt auch halben Set-Bonus', () => {
    const f = heldMitSet('borke', 2);
    const voll = gear.getEffectiveStats(f).maxHp;
    f.gearNeedsRepair = true;
    expect(gear.getEffectiveStats(f).maxHp).toBeLessThan(voll);
  });
});

// ── Beute ──

describe('Set-Beute', () => {
  function sieg(state: GameState, routeId: string, rngSeed: number, difficulty = 'normal'): ExpeditionRun {
    const { run } = lauf([], [], { routeId, rngSeed, difficulty, status: 'victory' });
    setBeute(state, run);
    return run;
  }

  test('der erste Sieg bringt sicher ein Teil, danach je nach Schwierigkeit', () => {
    const state = createNewGameState();
    const set = setFuerRoute('cave_spider')!;
    expect(setChance(state, set, 'normal')).toBe(1);
    const run = sieg(state, 'cave_spider', 1);
    expect(run.setTeil).toBeTruthy();
    expect(run.loot[run.setTeil!]).toBe(1);
    expect(run.combatLog.at(-1)).toContain('Set-Teil gefunden');

    state.globalStock[run.setTeil!] = 1;
    expect(setChance(state, set, 'normal')).toBe(SET_CHANCE.normal);
    expect(setChance(state, set, 'infernal')).toBe(1);
    let treffer = 0;
    for (let seed = 1; seed <= 1000; seed++) if (setTeilWuerfeln(state, 'cave_spider', 'normal', new SeededRNG(seed))) treffer++;
    expect(treffer).toBeGreaterThan(450);
    expect(treffer).toBeLessThan(550);
  });

  test('fehlende Teile kommen zuerst, auch wenn ein Held das Teil trägt', () => {
    const state = createNewGameState();
    const set = getSet('spinne')!;
    const [dolch, leder, amulett] = setTeilIds(set);
    state.globalStock[dolch] = 1;
    const held = createGuildFighter(0, 'assassin', 'Träger', GRUND);
    held.gear.armor = leder;
    state.fighters.push(held);
    expect(besitz(state, leder)).toBe(1);
    expect(gesammelteTeile(state, set)).toEqual([dolch, leder]);
    for (let seed = 1; seed <= 200; seed++) {
      const teil = setTeilWuerfeln(state, 'cave_spider', 'infernal', new SeededRNG(seed));
      expect(teil).toBe(amulett);
    }

    // Alle drei da: jedes Teil kann fallen (für einen zweiten Helden)
    state.globalStock[amulett] = 1;
    const gefallen = new Set<string | null>();
    for (let seed = 1; seed <= 200; seed++) gefallen.add(setTeilWuerfeln(state, 'cave_spider', 'infernal', new SeededRNG(seed)));
    expect(gefallen).toEqual(new Set([dolch, leder, amulett]));
  });

  test('nur ein Sieg bringt ein Set-Teil, und nur einmal', () => {
    const state = createNewGameState();
    const { run } = lauf([], [], { routeId: 'cave_spider', status: 'defeat' });
    expect(setBeute(state, run)).toBeNull();
    expect(run.loot).toEqual({});

    const gewonnen = sieg(state, 'cave_spider', 3);
    const teil = gewonnen.setTeil!;
    expect(setBeute(state, gewonnen)).toBe(teil);
    expect(gewonnen.loot[teil]).toBe(1);
  });
});

// ── Fähigkeiten im Kampf ──

describe('Set-Fähigkeiten im Kampf', () => {
  test('Rudelgeheul: das Team hat 3 Runden mehr Angriff, danach wieder normal', () => {
    const traeger = einheit(heldMitSet('rudel'));
    const begleiter = einheit(heldMitSet(null));
    const atkVorher = begleiter.atk;
    const run = kampf([traeger, begleiter], [gegner('Strohpuppe', { hp: 5000, maxHp: 5000 })]);
    expect(runde(run, 1)[0]).toBe(`✦ ${traeger.name} setzt Rudelgeheul ein → das ganze Team hat +2 Angriff`);
    expect(runde(run, 1)).toContain(`${begleiter.name} greift Strohpuppe an für ${atkVorher + 2}`);
    expect(runde(run, 4)).toContain(`${begleiter.name} greift Strohpuppe an für ${atkVorher}`);
    expect(begleiter.atk).toBe(atkVorher);
  });

  test('Moospolster: ein Schild schluckt die ersten 12 Schaden', () => {
    const traeger = einheit(heldMitSet('lichtung'));
    const leben = traeger.hp;
    const run = kampf([traeger], [gegner('Schläger', { atk: 100, spd: 5 })]);
    const dmg = 100 - Math.floor(traeger.def * 0.7);
    expect(runde(run, 1)).toContain(`Schläger greift ${traeger.name} an für ${dmg} (davon 12 vom Schild)`);
    expect(run.combatLog.filter(l => l.includes('vom Schild'))).toHaveLength(1);
    expect(leben - (dmg - 12)).toBeGreaterThanOrEqual(traeger.hp);
    expect(traeger.schild).toBe(0);
  });

  test('Giftbiss: Treffer vergiften 3 Runden lang', () => {
    const traeger = einheit(heldMitSet('spinne'), { atk: 1 });
    const run = kampf([traeger], [gegner('Käfer', { def: 50 })]);
    expect(runde(run, 1)).toContain('  Käfer: Gift −4 Leben');
    expect(run.combatLog.filter(l => l.includes('Gift −4')).length).toBeGreaterThanOrEqual(3);
  });

  test('Klebrige Finger: mehr Gold, zusammen höchstens das Doppelte', () => {
    const tabelle = Object.keys(LOOT_TABLE_DEFS).find(id => LOOT_TABLE_DEFS[id].guaranteedGold.min >= 10)!;
    const gold = (party: CombatUnit[]): number => {
      const { run } = lauf(party, []);
      engine.rollLoot(run, tabelle, new SeededRNG(11));
      return run.goldEarned;
    };
    const normal = gold([einheit(heldMitSet(null))]);
    expect(gold([einheit(heldMitSet('goblin'))])).toBe(Math.floor(normal * 1.3));
    const vieleFinger = [1, 2, 3, 4].map(() => einheit(heldMitSet('goblin')));
    expect(gold(vieleFinger)).toBe(normal * 2);
  });

  test('Gezeitenwelle: alle 3 Runden heilt der verletzteste Verbündete', () => {
    const traeger = einheit(heldMitSet('kueste'));
    const verletzt = einheit(heldMitSet(null), { hp: 40 });
    const run = kampf([traeger, verletzt], [gegner('Fels', { def: 99 })]);
    const heilung = Math.floor(verletzt.maxHp * 0.15);
    expect(runde(run, 2).some(l => l.includes('Gezeitenwelle'))).toBe(false);
    expect(runde(run, 3)).toContain(`✦ ${traeger.name} setzt Gezeitenwelle ein → ${verletzt.name} +${heilung} Leben`);
  });

  test('Schildwall: das ganze Team hat auf der Expedition mehr Verteidigung, zwei zählen nicht doppelt', () => {
    const verteidigung = (sets: (string | null)[]): number[] => {
      const state = createNewGameState();
      const fighters = sets.map(s => heldMitSet(s));
      state.fighters.push(...fighters);
      const system = new ExpeditionSystem(gear, new ProvisionSystem());
      const run = system.startExpedition(state, 'forest_short', fighters.map(f => f.id))!;
      return run.party.map((u, i) => u.def - gear.getEffectiveStats(fighters[i]).def);
    };
    expect(verteidigung(['kommandant', null])).toEqual([3, 3]);
    expect(verteidigung(['kommandant', 'kommandant'])).toEqual([3, 3]);
    expect(verteidigung([null, null])).toEqual([0, 0]);
  });

  test('Druckwelle: alle 4 Runden trifft der Träger alle Gegner', () => {
    const traeger = einheit(heldMitSet('leviathan'));
    const run = kampf([traeger], [gegner('Hai A', { def: 0 }), gegner('Hai B', { def: 0 })]);
    const zeilen = runde(run, 4);
    const start = zeilen.indexOf(`✦ ${traeger.name} setzt Druckwelle ein → trifft alle Gegner`);
    expect(start).toBeGreaterThanOrEqual(0);
    const dmg = Math.floor(traeger.atk * 0.6);
    expect(zeilen.slice(start + 1, start + 3)).toEqual([`  Hai A erleidet ${dmg}`, `  Hai B erleidet ${dmg}`]);
    expect(runde(run, 3).some(l => l.includes('Druckwelle'))).toBe(false);
  });

  test('Glutpanzer: wer den Träger trifft, verbrennt sich', () => {
    const traeger = einheit(heldMitSet('obsidian'), { atk: 1 });
    const angreifer = gegner('Ork', { spd: 5, def: 99 });
    const run = kampf([traeger], [angreifer]);
    expect(runde(run, 1)).toContain(`  ${traeger.name}: Glutpanzer! Ork erleidet 6 Feuerschaden.`);
  });

  test('Seelenernte: stirbt ein Gegner, heilt das Team', () => {
    const traeger = einheit(heldMitSet('lich'), { spd: 5 });
    const verletzt = einheit(heldMitSet(null), { hp: 30, spd: 4 });
    const run = kampf([traeger, verletzt], [gegner('Ratte', { hp: 1, maxHp: 1 }), gegner('Fels', { def: 99 })]);
    expect(run.combatLog).toContain(`✦ ${traeger.name} setzt Seelenernte ein → Ratte nährt das Team (+8 Leben)`);
    expect(verletzt.hp).toBeGreaterThanOrEqual(38 - 20);
  });

  test('Feueratem: zu Kampfbeginn erleiden alle Gegner Schaden, auch tödlichen', () => {
    const traeger = einheit(heldMitSet('wyrm'));
    const schwach = gegner('Funke', { hp: 15, maxHp: 15, spd: 9 });
    const zaeh = gegner('Golem', { def: 999 });
    const run = kampf([traeger], [schwach, zaeh]);
    expect(runde(run, 1)[0]).toBe(`✦ ${traeger.name} setzt Feueratem ein → alle Gegner erleiden 20 Schaden`);
    expect(schwach.hp).toBeLessThanOrEqual(0);
    expect(run.combatLog.some(l => l.startsWith('Funke greift'))).toBe(false);
  });

  test('Letzte Bastion: zieht zu Beginn die Angriffe auf sich, unter halben Leben mehr Verteidigung', () => {
    const traeger = einheit(heldMitSet('festung'), { spd: 0.1 });
    const andere = [1, 2].map(() => einheit(heldMitSet(null), { spd: 0.1 }));
    const angreifer = [1, 2, 3].map(i => gegner(`Wolf ${i}`, { spd: 3, def: 999 }));
    const run = kampf([traeger, ...andere], angreifer);
    expect(runde(run, 1)).toContain(`✦ ${traeger.name} setzt Letzte Bastion ein → zieht alle Angriffe auf sich`);
    const angriffe = runde(run, 1).filter(l => l.startsWith('Wolf'));
    expect(angriffe).toHaveLength(3);
    for (const l of angriffe) expect(l).toContain(`greift ${traeger.name} an`);

    const angeschlagen = einheit(heldMitSet('festung'), { hp: 20 });
    const defVorher = angeschlagen.def;
    kampf([angeschlagen], [gegner('Fels', { def: 999 })]);
    expect(angeschlagen.def).toBe(defVorher + 6);
  });

  test('Tiefenrausch: unter halben Leben mehr Angriff', () => {
    const traeger = einheit(heldMitSet('abyss'), { hp: 30 });
    const atk = traeger.atk;
    const run = kampf([traeger], [gegner('Qualle')]);
    expect(runde(run, 1)).toContain(`${traeger.name} greift Qualle an für ${atk + 8}`);
  });

  test('Schattenstoss: der erste Treffer jedes Kampfs macht doppelten Schaden', () => {
    const traeger = einheit(heldMitSet('schatten'));
    const run = kampf([traeger], [gegner('Wache')]);
    const zeilen = run.combatLog.filter(l => l.includes('greift Wache an') || l.includes('Schattenstoss'));
    expect(zeilen[0]).toContain('setzt Schattenstoss ein');
    expect(zeilen[1]).toBe(`${traeger.name} greift Wache an für ${traeger.atk * 2}`);
    expect(zeilen[2]).toBe(`${traeger.name} greift Wache an für ${traeger.atk}`);
  });

  test('Glutherz: jeder Sieg gibt mehr Angriff bis Kampfende, höchstens +12', () => {
    const traeger = einheit(heldMitSet('asche'), { spd: 5 });
    const atk = traeger.atk;
    const ratten = [1, 2, 3, 4, 5, 6].map(i => gegner(`Ratte ${i}`, { hp: 1, maxHp: 1 }));
    const run = kampf([traeger], [...ratten, gegner('Fels', { def: 999 })]);
    expect(run.combatLog).toContain(`✦ ${traeger.name} setzt Glutherz ein → +3 Angriff bis Kampfende`);
    expect(run.combatLog).toContain(`✦ ${traeger.name} setzt Glutherz ein → +12 Angriff bis Kampfende`);
    expect(run.combatLog.some(l => l.includes('+15 Angriff'))).toBe(false);
    expect(traeger.atk).toBe(atk);
  });

  test('Funkenflug: jeder Treffer springt auf einen zweiten Gegner über', () => {
    const traeger = einheit(heldMitSet('magma'));
    const run = kampf([traeger], [gegner('Ziel A'), gegner('Ziel B')]);
    const spritzer = Math.floor(traeger.atk * 0.4);
    expect(runde(run, 1).some(l => l.startsWith(`  ${traeger.name}: Funkenflug! Ziel`) && l.endsWith(`erleidet ${spritzer}`))).toBe(true);
  });

  test('Drachengier: mehr Angriff je 40 Gold im Gepäck, höchstens +15', () => {
    const traeger = einheit(heldMitSet('hort'));
    const atk = traeger.atk;
    const run = kampf([traeger], [gegner('Dieb')], { goldEarned: 400 });
    expect(runde(run, 1)[0]).toBe(`✦ ${traeger.name} setzt Drachengier ein → 400 Gold im Gepäck: +10 Angriff`);
    expect(runde(run, 1)).toContain(`${traeger.name} greift Dieb an für ${atk + 10}`);

    const reich = einheit(heldMitSet('hort'));
    kampf([reich], [gegner('Dieb')], { goldEarned: 5000 });
    expect(reich.effektBoni?.['drachengier:atk']).toBe(15);
  });

  test('Verbotene Fussnote: alle 3 Runden eine von drei Seiten', () => {
    const seiten = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const traeger = einheit(heldMitSet('archiv'));
      const run = kampf([traeger], [gegner('Buchwurm', { def: 999 })], {}, seed);
      const zeile = runde(run, 3).find(l => l.startsWith(`✦ ${traeger.name} setzt`))!;
      expect(zeile, `Seed ${seed}`).toMatch(/setzt (Flammenseite|Heilseite|Schutzseite) ein →/);
      seiten.add(zeile.match(/setzt (\S+) ein/)![1]);
      expect(runde(run, 2).some(l => l.includes('seite ein'))).toBe(false);
    }
    expect(seiten.size).toBe(3);
  });

  test('Einfrieren: der Gegner setzt einen Zug aus, aber nie zwei hintereinander', () => {
    const traeger = einheit(heldMitSet('frost'), { spd: 5 });
    traeger.specialEffects!.find(e => e.id === 'stun_strike')!.chance = 1;
    const opfer = gegner('Yeti', { spd: 1, def: 999 });
    const run = kampf([traeger], [opfer]);
    expect(runde(run, 1)).toContain(`✦ ${traeger.name} setzt Einfrieren ein → Yeti setzt einen Zug aus`);
    expect(runde(run, 1)).toContain('  Yeti setzt aus (Einfrieren).');
    // Nach dem Aussetzen greift der Yeti in der nächsten Runde an
    expect(runde(run, 2).some(l => l.startsWith('Yeti greift'))).toBe(true);
  });

  test('eigene Werte der Sets: Wurzelkraft heilt 4, Unbeugsam steht mit 40 % auf, Blutegelbiss heilt 20 %', () => {
    const borke = einheit(heldMitSet('borke'), { hp: 50 });
    const run1 = kampf([borke], [gegner('Fels', { def: 999 })]);
    expect(runde(run1, 1)).toContain(`  ${borke.name}: Regeneration +4 HP`);

    const ritter = einheit(heldMitSet('ritter'), { hp: 1, spd: 0.1 });
    const run2 = kampf([ritter], [gegner('Henker', { atk: 500, spd: 5 })]);
    expect(run2.combatLog).toContain(`>> ${ritter.name}: WIEDERGEBURT! Steht mit ${Math.floor(ritter.maxHp * 0.4)} HP wieder auf!`);

    const sumpf = einheit(heldMitSet('sumpfdorf'), { hp: 50 });
    const run3 = kampf([sumpf], [gegner('Frosch')]);
    expect(runde(run3, 1)).toContain(`  ${sumpf.name}: Lebensraub +${Math.floor(sumpf.atk * 0.2)} HP`);
  });

  test('Kampfeffekte bleiben nach dem Kampf nicht hängen', () => {
    const traeger = einheit(heldMitSet('archiv'));
    const run = kampf([traeger], [gegner('Wurm', { hp: 5, maxHp: 5 })]);
    expect(run.status).toBe('exploring');
    expect(traeger.schild).toBe(0);
    expect(traeger.betaeubt).toBeUndefined();
    expect(traeger.buffs.filter(b => b.quelle)).toEqual([]);
  });
});
