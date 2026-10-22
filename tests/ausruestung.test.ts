import { test, expect } from 'vitest';
import { createGuildFighter } from '../src/models/GuildRoster';
import { CLASS_DEFS } from '../src/data/classes';
import { GearSystem } from '../src/systems/GearSystem';
import { createNewGameState } from '../src/models/GameState';

test('Tempo der Ausrüstung zählt mit Bruchteilen', () => {
  const gear = new GearSystem();
  const wache = createGuildFighter('guardian', 'Brom', { ...CLASS_DEFS.guardian.baseStats });
  // 0,8 − 0,05 (Aetherschild) + 0,1 (Aetherkristall-Herz); früher −1 durch Abrunden
  wache.gear = { mainHand: 'soulbreaker', offHand: 'aether_guardian_shield', armor: null, trinket: 'aether_heart' };
  expect(gear.getEffectiveStats(wache).spd).toBe(0.85);

  const jaegerin = createGuildFighter('ranger', 'Lia', { ...CLASS_DEFS.ranger.baseStats });
  // 1,2 + 0,2 (Bogen der Ewigen Jagd); früher fiel der Bonus weg
  jaegerin.gear = { mainHand: 'eternal_hunter_bow', offHand: null, armor: null, trinket: null };
  expect(gear.getEffectiveStats(jaegerin).spd).toBe(1.4);
});

test('neue Einhandwaffe ersetzt die Waffe, der Schild bleibt', () => {
  const gear = new GearSystem();
  const state = createNewGameState();
  const wache = createGuildFighter('guardian', 'Brom', { ...CLASS_DEFS.guardian.baseStats });
  wache.gear = { mainHand: 'soulbreaker', offHand: 'aether_guardian_shield', armor: null, trinket: null };
  state.fighters = [wache];
  state.globalStock.iron_sword = 1;
  expect(gear.equip(state, wache, 'iron_sword')).toBe(true);
  expect(wache.gear).toMatchObject({ mainHand: 'iron_sword', offHand: 'aether_guardian_shield' });
  expect(state.globalStock.soulbreaker).toBe(1);
});

test('zweite Einhandwaffe: ohne Wahl in die freie Nebenhand, sonst in die angetippte Hand', () => {
  const gear = new GearSystem();
  const sina = createGuildFighter('assassin', 'Sina', { ...CLASS_DEFS.assassin.baseStats });
  sina.gear = { mainHand: 'steel_sword', offHand: null, armor: null, trinket: null };
  expect(gear.resolveEquipSlot(sina, 'iron_sword')).toBe('offHand');
  expect(gear.resolveEquipSlot(sina, 'iron_sword', 'mainHand')).toBe('mainHand');
  expect(gear.resolveEquipSlot(sina, 'iron_sword', 'offHand')).toBe('offHand');
  // Rüstung und Schmuck kennen nur ihren eigenen Platz
  expect(gear.resolveEquipSlot(sina, 'leather_armor', 'mainHand')).toBe('armor');

  // Die Nebenhand geht nur neben einer Einhandwaffe: sonst landet die Waffe in der Haupthand
  sina.gear = { mainHand: null, offHand: null, armor: null, trinket: null };
  expect(gear.resolveEquipSlot(sina, 'iron_sword', 'offHand')).toBe('mainHand');
  sina.gear.mainHand = 'eternal_hunter_bow';
  expect(gear.resolveEquipSlot(sina, 'iron_sword', 'offHand')).toBe('mainHand');
});
