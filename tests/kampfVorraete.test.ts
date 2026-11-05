// Vorräte in der Kampf-Vorschau (src/ui/components/KampfVorraete.ts, CombatScreen.buildItemSection)
import { describe, it, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { vorratZeilen, vorratTitel, zeigeVorratBereich, nutzeVorrat, VorratZeile } from '../src/ui/components/KampfVorraete';

const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());

/** Zwei Helden auf einer Expedition, mit dem gewünschten eigenen Vorrat (dazu die Wegzehrung der Gilde) */
function aufbruch(vorrat: Record<string, number>, mitnehmen: string[]): { state: GameState; run: ExpeditionRun } {
  const state = createNewGameState();
  const ids = ['Testheld', 'Testheldin'].map(name => {
    const held = createGuildFighter('guardian', name, { hp: 500, maxHp: 500, atk: 50, def: 50, spd: 5, critChance: 0, critMult: 1 });
    state.fighters.push(held);
    return held.id;
  });
  Object.assign(state.globalStock, vorrat);
  const run = system.startExpedition(state, 'cave_deep', ids, 'normal', null, false, mitnehmen)!;
  expect(run).toBeTruthy();
  return { state, run };
}

const zeile = (run: ExpeditionRun, itemId: string): VorratZeile => {
  const z = vorratZeilen(run.provisions).find(v => v.itemId === itemId);
  expect(z, `${itemId} in den Vorräten`).toBeTruthy();
  return z!;
};

describe('Vorräte im Kampf', () => {
  it('fasst gleiche Vorräte in einer Zeile zusammen (eigenes Brot und Wegzehrung)', () => {
    const { run } = aufbruch({ bread: 3 }, ['bread', 'bread', 'bread']);
    expect(run.provisions.filter(p => p.itemId === 'bread').length).toBe(2);
    const zeilen = vorratZeilen(run.provisions);
    expect(zeilen.filter(z => z.itemId === 'bread').length).toBe(1);
    expect(zeile(run, 'bread').menge).toBe(4);
    expect(zeile(run, 'bread').name).toBe('Brot');
    expect(zeile(run, 'healing_potion').menge).toBe(1);
  });

  it('verbraucht zuerst die Wegzehrung der Gilde, der eigene Vorrat geht danach ins Lager zurück', () => {
    const { state, run } = aufbruch({ bread: 3 }, ['bread', 'bread', 'bread']);
    run.party[0].hp = 100;
    const meldung = nutzeVorrat(system, state, zeile(run, 'bread'));
    expect(meldung).toBe('Brot: Die Gruppe heilt 8 Leben.');
    expect(run.provisions.find(p => p.itemId === 'bread' && p.gifted)).toBeUndefined();
    expect(run.provisions.find(p => p.itemId === 'bread' && !p.gifted)?.qty).toBe(3);
    expect(zeile(run, 'bread').menge).toBe(3);
  });

  it('Tooltip am PC heisst «Name: Wirkung»', () => {
    const { run } = aufbruch({}, []);
    expect(vorratTitel(zeile(run, 'bread'))).toBe('Brot: +8 Leben, sofort');
    expect(vorratTitel(zeile(run, 'healing_potion'))).toBe('Heiltrank: +15 Leben, sofort');
    expect(vorratTitel({ itemId: 'x', name: 'Etwas', wirkung: '', menge: 1, index: 0 })).toBe('Etwas');
  });

  it('nach dem letzten Vorrat bleibt der Bereich mit der Meldung stehen', () => {
    const { state, run } = aufbruch({}, []);
    run.provisions = run.provisions.filter(p => p.gifted); // nur die Wegzehrung: ein Brot, ein Heiltrank
    let meldung = '';
    for (const itemId of ['bread', 'healing_potion']) meldung = nutzeVorrat(system, state, zeile(run, itemId));
    expect(vorratZeilen(run.provisions)).toEqual([]);
    expect(meldung).toBe('Heiltrank: Die Gruppe heilt 15 Leben.');
    expect(zeigeVorratBereich([], meldung)).toBe(true);
    expect(zeigeVorratBereich([], '')).toBe(false);
  });

  it('Manatrank gibt die Fähigkeiten sofort frei', () => {
    const { state, run } = aufbruch({ potion_mana: 1 }, ['potion_mana']);
    const held = run.party[0];
    run.abilitiesUsed[held.id] = true;
    for (const s of held.skills) s.currentCooldown = 2;
    const meldung = nutzeVorrat(system, state, zeile(run, 'potion_mana'));
    expect(meldung).toBe('Manatrank: Alle Fähigkeiten sind wieder bereit.');
    // CombatScreen.buildAbilitySection zeichnet die Knöpfe nach run.abilitiesUsed: wieder wählbar
    expect(run.abilitiesUsed[held.id]).toBeUndefined();
    expect(held.skills.every(s => s.currentCooldown === 0)).toBe(true);
  });
});
