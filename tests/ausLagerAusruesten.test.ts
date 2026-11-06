import { describe, test, expect } from 'vitest';
import { CLASS_DEFS } from '../src/data/classes';
import { ITEM_DEFS } from '../src/data/items';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { ausLagerAusruesten, ausruestPlan } from '../src/systems/Ausruesten';
import { vergleicher } from '../src/systems/Beutevergleich';
import { schmiedeStufen } from '../src/systems/Schmiede';

// «Aus dem Lager ausrüsten» (systems/Ausruesten.ts, docs/AUSBILDUNG.md): leere Plätze nach Haltung der Klasse, Stufe
// und Wert füllen, Getragenes nur gegen Besseres tauschen, nur aus dem Lager

function held(classId: string, name = 'Testheld'): GuildFighter {
  const c = CLASS_DEFS[classId];
  return createGuildFighter(c.id, name, { ...c.baseStats });
}

function gilde(lager: Record<string, number>, ...helden: GuildFighter[]): GameState {
  const state = createNewGameState();
  state.globalStock = { gold: 100, ...lager };
  helden.forEach((h, i) => { h.id = i + 1; });
  state.fighters.push(...helden);
  return state;
}

/** Ein Lager mit Waffen beider Haltungen, Schilden, Rüstungen und einem Talisman (je eins) */
const GEMISCHT = {
  iron_sword: 1, steel_sword: 1, hunter_bow: 1, longbow: 1, iron_shield: 1, steel_shield: 1,
  leather_armor: 1, chain_armor: 1, set_rudel_amulett: 1, bread: 5,
};

describe('Aus dem Lager ausrüsten: leere Plätze', () => {
  test('Wächter (Einhand mit Schild): beste Einhandwaffe vor dem höheren Bogen, dazu Schild, Rüstung, Talisman', () => {
    const w = held('guardian');
    const state = gilde(GEMISCHT, w);
    const wechsel = ausLagerAusruesten(state, w);
    expect(wechsel).toEqual([
      { platz: 'mainHand', neu: 'steel_sword', alt: null },
      { platz: 'offHand', neu: 'steel_shield', alt: null },
      // gleiche Stufe: der höhere Wert (14 gegen 10)
      { platz: 'armor', neu: 'chain_armor', alt: null },
      { platz: 'trinket', neu: 'set_rudel_amulett', alt: null },
    ]);
    expect(w.gear).toEqual({ mainHand: 'steel_sword', offHand: 'steel_shield', armor: 'chain_armor', trinket: 'set_rudel_amulett' });
    // aus dem Lager genommen, der Rest bleibt
    expect(state.globalStock).toMatchObject({ steel_sword: 0, steel_shield: 0, chain_armor: 0, set_rudel_amulett: 0, iron_sword: 1, longbow: 1, bread: 5, gold: 100 });
  });

  test('Waldläuferin (Zweihand): der Bogen, die Nebenhand bleibt frei', () => {
    const r = held('ranger');
    const state = gilde(GEMISCHT, r);
    const wechsel = ausLagerAusruesten(state, r);
    expect(wechsel.map(x => [x.platz, x.neu])).toEqual([['mainHand', 'longbow'], ['armor', 'chain_armor'], ['trinket', 'set_rudel_amulett']]);
    expect(r.gear.offHand).toBeNull();
  });

  test('Berserker (zwei Einhandwaffen): die zweite Waffe vor dem Schild', () => {
    const b = held('berserker');
    const state = gilde({ iron_sword: 1, steel_sword: 1, steel_shield: 1 }, b);
    ausLagerAusruesten(state, b);
    expect(b.gear.mainHand).toBe('steel_sword');
    expect(b.gear.offHand).toBe('iron_sword');
    expect(state.globalStock.steel_shield).toBe(1);
  });

  test('Klassen ohne Haltung nehmen die höchste Stufe', () => {
    const k = held('cleric');
    const state = gilde({ iron_sword: 1, longbow: 1, iron_shield: 1 }, k);
    ausLagerAusruesten(state, k);
    // Langbogen (Stufe 2) vor dem Eisenschwert (Stufe 1); daneben passt kein Schild
    expect(k.gear).toMatchObject({ mainHand: 'longbow', offHand: null });
  });

  test('legt nichts ab, um einen leeren Platz zu füllen: keine Zweihandwaffe neben einem Schild', () => {
    const r = held('ranger');
    r.gear.offHand = 'iron_shield'; // die Waffe daneben wurde abgelegt
    const state = gilde({ longbow: 1, iron_sword: 1 }, r);
    ausLagerAusruesten(state, r);
    expect(r.gear).toMatchObject({ mainHand: 'iron_sword', offHand: 'iron_shield' });
    expect(state.globalStock.longbow).toBe(1);
  });
});

describe('Aus dem Lager ausrüsten: Getragenes', () => {
  test('tauscht nur gegen Besseres (grüner Pfeil); das Alte liegt danach im Lager', () => {
    const w = held('guardian');
    w.gear = { mainHand: 'iron_sword', offHand: 'iron_shield', armor: 'leather_armor', trinket: null };
    // Stahlschwert: nur mehr ATK. Kettenpanzer: mehr DEF, aber weniger HP. Novizenrobe: weniger DEF
    const state = gilde({ steel_sword: 1, chain_armor: 1, novizenrobe: 1 }, w);
    const wechsel = ausLagerAusruesten(state, w);
    expect(wechsel).toEqual([{ platz: 'mainHand', neu: 'steel_sword', alt: 'iron_sword' }]);
    expect(w.gear.armor).toBe('leather_armor');
    expect(state.globalStock).toMatchObject({ iron_sword: 1, steel_sword: 0, chain_armor: 1, novizenrobe: 1 });
  });

  test('nimmt nie einem anderen Helden etwas weg; ohne Passendes im Lager ändert sich nichts', () => {
    const a = held('guardian', 'Brom');
    a.gear = { mainHand: 'steel_sword', offHand: 'steel_shield', armor: 'chain_armor', trinket: null };
    const b = held('guardian', 'Bertram');
    const state = gilde({ bread: 3 }, a, b);
    const vorher = structuredClone(state);
    expect(ausLagerAusruesten(state, b)).toEqual([]);
    expect(state).toEqual(vorher);
  });
});

describe('Aus dem Lager ausrüsten: ein Tipp tut alles', () => {
  /** Jede Ausrüstung bis Stufe 3 einmal im Lager */
  function grossesLager(): Record<string, number> {
    const lager: Record<string, number> = {};
    for (const def of Object.values(ITEM_DEFS)) if (def.type === 'gear' && def.gearSlot && (def.tier ?? 0) <= 3) lager[def.id] = 1;
    return lager;
  }

  for (const classId of Object.keys(CLASS_DEFS)) {
    test(`${classId}: alle Plätze voll, danach findet ein zweiter Tipp nichts mehr, kein Teil im Lager ist noch besser`, () => {
      const h = held(classId);
      const state = gilde(grossesLager(), h);
      const wechsel = ausLagerAusruesten(state, h);
      expect(wechsel.length).toBeGreaterThanOrEqual(3);
      expect(h.gear.mainHand).not.toBeNull();
      expect(h.gear.armor).not.toBeNull();
      expect(h.gear.trinket).not.toBeNull();
      // Zweihandwaffe: Nebenhand frei; sonst belegt
      expect(h.gear.offHand === null).toBe(ITEM_DEFS[h.gear.mainHand!].weaponSlotType === '2h');
      // die Haltung der Klasse (Schild, Zweihand, zwei Einhandwaffen)
      const haltung = CLASS_DEFS[classId].preferredWeaponSetup;
      if (haltung) {
        expect(ITEM_DEFS[h.gear.mainHand!].weaponSlotType).toBe(haltung.mainHand);
        if (haltung.offHand) expect(ITEM_DEFS[h.gear.offHand!].weaponSlotType).toBe(haltung.offHand);
      }
      expect(ausruestPlan(state, h)).toEqual([]);
      const vergleiche = vergleicher(h, schmiedeStufen(state));
      expect(Object.keys(state.globalStock).filter(id => state.globalStock[id] > 0 && vergleiche(id))).toEqual([]);
      // Bestand stimmt: was getragen wird, fehlt im Lager
      for (const id of Object.values(h.gear)) if (id) expect(state.globalStock[id]).toBe(0);
    });
  }
});

describe('Vorschau: ausruestPlan', () => {
  test('zeigt dasselbe wie das Anlegen, ändert aber weder Held noch Lager', () => {
    const w = held('guardian');
    w.gear.mainHand = 'iron_sword';
    const state = gilde(GEMISCHT, w);
    const vorher = structuredClone(state);
    const plan = ausruestPlan(state, w);
    expect(state).toEqual(vorher);
    expect(plan.length).toBeGreaterThan(0);
    expect(ausLagerAusruesten(state, w)).toEqual(plan);
  });
});
