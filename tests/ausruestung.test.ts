import { test, expect } from 'vitest';
import { createGuildFighter } from '../src/models/GuildRoster';
import { CLASS_DEFS } from '../src/data/classes';
import { GearSystem } from '../src/systems/GearSystem';

test('Tempo der Ausrüstung zählt mit Bruchteilen', () => {
  const gear = new GearSystem();
  const wache = createGuildFighter(1, 'guardian', 'Brom', { ...CLASS_DEFS.guardian.baseStats });
  // 0,8 − 0,05 (Aetherschild) + 0,1 (Aetherkristall-Herz); früher −1 durch Abrunden
  wache.gear = { mainHand: 'soulbreaker', offHand: 'aether_guardian_shield', armor: null, trinket: 'aether_heart' };
  expect(gear.getEffectiveStats(wache).spd).toBe(0.85);

  const jaegerin = createGuildFighter(2, 'ranger', 'Lia', { ...CLASS_DEFS.ranger.baseStats });
  // 1,2 + 0,2 (Bogen der Ewigen Jagd); früher fiel der Bonus weg
  jaegerin.gear = { mainHand: 'eternal_hunter_bow', offHand: null, armor: null, trinket: null };
  expect(gear.getEffectiveStats(jaegerin).spd).toBe(1.4);
});
