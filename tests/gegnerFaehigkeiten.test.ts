import { describe, expect, it } from 'vitest';
import { CombatEngine } from '../src/systems/CombatEngine';
import { GearSystem } from '../src/systems/GearSystem';
import { ENEMY_DEFS } from '../src/data/enemies';

// enemyToCombatUnit übernimmt die zwei Gegner-Fähigkeiten aus enemies.ts (bis 05.11.2026 gingen sie verloren):
// drainAirAmount einer Fähigkeit (Druckwelle des Leviathans) und prefersWarMachineTarget (Fernkämpfer der Belagerung).
// Dass der Kampf sie nutzt, prüft tests/monsterbuch.test.ts am Kampfprotokoll (Luft, Treffer auf das Katapult).
describe('Gegner-Fähigkeiten im Kampf', () => {
  const engine = new CombatEngine(new GearSystem());

  it('drainAirAmount kommt mit der Fähigkeit an, nur wo es in enemies.ts steht', () => {
    for (const [id, def] of Object.entries(ENEMY_DEFS)) {
      const einheit = engine.enemyToCombatUnit(id);
      def.skills.forEach((sk, i) => expect(einheit.skills[i].drainAirAmount, `${id} ${sk.id}`).toBe(sk.drainAirAmount));
    }
    expect(engine.enemyToCombatUnit('boss_leviathan').skills.find(s => s.id === 'druckwelle')!.drainAirAmount).toBe(18);
  });

  it('prefersWarMachineTarget kommt an: Mauerschütze, Armbrustschütze, Kampfmagier, sonst niemand', () => {
    const mitZiel = Object.keys(ENEMY_DEFS).filter(id => engine.enemyToCombatUnit(id).prefersWarMachineTarget);
    expect(mitZiel.sort()).toEqual(['siege_crossbowman', 'siege_mage', 'wall_archer']);
    for (const id of Object.keys(ENEMY_DEFS)) {
      expect(!!engine.enemyToCombatUnit(id).prefersWarMachineTarget, id).toBe(!!ENEMY_DEFS[id].prefersWarMachineTarget);
    }
  });
});
