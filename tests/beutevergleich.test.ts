import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { CLASS_DEFS } from '../src/data/classes';
import { ITEM_DEFS } from '../src/data/items';
import { EquipSlot, GearSystem } from '../src/systems/GearSystem';
import { besserFuer, besserText, mitTeil, verbesserungFuer } from '../src/systems/Beutevergleich';
import { truhenHinweise } from '../src/ui/components/SchmiedeAnzeige';
import { musterStand, spieleRoute } from '../src/systems/Musterlauf';
import { setBeute, setTeilHinweise } from '../src/systems/DungeonSets';
import { schmiedeBeute } from '../src/systems/Schmiede';

function neuesSpiel(): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  return state;
}

function sterne(): GameState {
  const state = neuesSpiel();
  richteProbespielEin(state, 'sterne');
  return state;
}

const text = (state: GameState, itemId: string): string | null => {
  const b = besserFuer(state, itemId);
  return b ? besserText(b) : null;
};
const held = (state: GameState, name: string) => state.fighters.find(f => f.name === name)!;

describe('Beutevergleich', () => {
  it('a: neues Spiel, der Guardian trägt nichts', () => {
    const state = neuesSpiel();
    const h = truhenHinweise(state, {}, null, { iron_sword: 1, iron_shield: 1, bread: 2, herb_green: 3 });
    expect(h.iron_sword).toBe('<span class="truhe-besser">⬆ Besser für Guardian (Haupthand): ATK +3</span>');
    expect(h.iron_shield).toBeUndefined();
    expect(h.bread).toBeUndefined();
    expect(h.herb_green).toBeUndefined();
    expect(text(state, 'hunter_bow')).toBe('⬆ Besser für Guardian: CRIT +5 % · ATK +2 · SPD +0.1');
  });

  it('b: Probespiel «sterne»', () => {
    const state = sterne();
    for (const id of ['leather_armor', 'wolf_fang_necklace', 'iron_shield', 'eternal_hunter_bow']) {
      expect(besserFuer(state, id)).toBeNull();
    }
    expect(text(state, 'iron_sword')).toBe('⬆ Besser für Sina (Nebenhand): ATK +3 · auch für 1 weiteren');
  });

  it('c: Hände: Zweihandwaffe leert die Nebenhand, Schild braucht eine Einhandwaffe', () => {
    const state = sterne();
    const brom = held(state, 'Brom');
    expect(mitTeil(brom, 'eternal_hunter_bow')!.gear.offHand).toBeNull();
    expect(verbesserungFuer(brom, 'eternal_hunter_bow', state.schmiede?.stufen)).toBeNull();
    expect(mitTeil(held(state, 'Lia'), 'iron_shield')).toBeNull();
  });

  it('d: Set-Bonus, Schmiede-Stufe und verlorene Eigenschaften', () => {
    const berserker = () => createGuildFighter('berserker', 'Test', { ...CLASS_DEFS.berserker.baseStats });
    const test = berserker();
    test.gear.mainHand = 'set_rudel_klinge';
    test.gear.armor = 'leather_armor';
    expect(verbesserungFuer(test, 'set_rudel_leder')!.teile).toEqual(['ATK +1', 'HP +5']);
    const nurLeder = berserker();
    nurLeder.gear.armor = 'leather_armor';
    expect(verbesserungFuer(nurLeder, 'set_rudel_leder')).toBeNull();
    expect(verbesserungFuer(nurLeder, 'set_rudel_leder', { set_rudel_leder: 5 })!.teile).toEqual(['DEF +5', 'HP +3']);
    const robe = berserker();
    robe.gear.armor = 'tide_robe';
    expect(verbesserungFuer(robe, 'magiarch_robe')).toBeNull();
    robe.gear.armor = 'novizenrobe';
    expect(verbesserungFuer(robe, 'magiarch_robe')).not.toBeNull();
  });

  it('e: mitTeil legt an wie ANLEGEN', () => {
    const gearSystem = new GearSystem();
    const teile = ['iron_sword', 'hunter_bow', 'iron_shield', 'chain_armor', 'wolf_fang_necklace', 'wyrm_scale_shield', 'set_hort_klinge'];
    const wuensche: (EquipSlot | undefined)[] = [undefined, 'mainHand', 'offHand'];
    for (const state of [neuesSpiel(), sterne()]) {
      state.fighters.forEach((f, i) => {
        for (const itemId of teile) {
          for (const wunsch of wuensche) {
            const kopie: GameState = JSON.parse(JSON.stringify(state));
            kopie.globalStock[itemId] = 1;
            const kopieHeld = kopie.fighters[i];
            const geklappt = gearSystem.equip(kopie, kopieHeld, itemId, wunsch);
            expect(mitTeil(f, itemId, wunsch)?.gear ?? null, `${f.name} ${itemId} ${wunsch}`)
              .toEqual(geklappt ? kopieHeld.gear : null);
          }
        }
      });
    }
  });

  it('f: Truhe: Set-Text bleibt vorne, Menge 0 nichts, Namen escapt', () => {
    const state = neuesSpiel();
    const set = '🐺 Rudel des Waldpfads · Teil 1 von 3';
    const h = truhenHinweise(state, { set_rudel_klinge: set }, null, { set_rudel_klinge: 1, iron_sword: 0 });
    expect(h.set_rudel_klinge.startsWith(`${set}<span class="truhe-besser">`)).toBe(true);
    expect(h.set_rudel_klinge).toContain('Guardian (Haupthand): ATK +3');
    expect(h.iron_sword).toBeUndefined();
    state.fighters[0].name = '<b>Gu</b>';
    const roh = truhenHinweise(state, {}, null, { iron_sword: 1 }).iron_sword;
    expect(roh).toContain('&lt;b>Gu&lt;/b>');
    expect(roh).not.toContain('<b>');
  });

  it('g: echter Lauf wie finishExpedition', () => {
    const { state, ids } = musterStand('gut', 7919);
    const run = spieleRoute(state, ids, 'cave_spider', 'klug');
    const h = truhenHinweise(state, setTeilHinweise(state, setBeute(state, run)), schmiedeBeute(run)?.itemId ?? null);
    expect(h.set_spinne_dolch).toContain('<span class="truhe-besser">⬆ Besser für Grimm (Nebenhand): CRIT +8 % · ATK +4 · SPD +0.05 · auch für 1 weiteren</span>');
    for (const [itemId, zeile] of Object.entries(h)) {
      if (!zeile.includes('truhe-besser')) continue;
      expect(ITEM_DEFS[itemId]?.type).toBe('gear');
      expect(run.loot[itemId]).toBeGreaterThan(0);
    }
  });
});
