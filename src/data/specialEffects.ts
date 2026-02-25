/**
 * Special-Effect Definitionen fuer T3/T4 Gear.
 * Jeder Effect wird ueber den 'special:*' Tag im ItemDef aktiviert.
 */

export type SpecialTrigger = 'on_deal_damage' | 'on_take_damage' | 'on_round_end' | 'on_death' | 'on_skill_use';

export interface SpecialEffectDef {
  id: string;
  name: string;          // Deutscher Anzeigename
  description: string;   // Deutsche Kurzbeschreibung
  trigger: SpecialTrigger;
  /** Proc-Chance (0-1). 1.0 = immer */
  procChance: number;
  /** Effekt-Staerke (Interpretation abhaengig vom Typ) */
  power: number;
}

export const SPECIAL_EFFECT_DEFS: Record<string, SpecialEffectDef> = {
  lifesteal: {
    id: 'lifesteal',
    name: 'Lebensraub',
    description: 'Heilt 25% des verursachten Schadens',
    trigger: 'on_deal_damage',
    procChance: 1.0,
    power: 0.25,
  },
  dodge: {
    id: 'dodge',
    name: 'Ausweichen',
    description: '15% Chance, einem Angriff auszuweichen',
    trigger: 'on_take_damage',
    procChance: 0.15,
    power: 1.0, // 100% damage reduction on proc
  },
  reflect: {
    id: 'reflect',
    name: 'Reflexion',
    description: 'Reflektiert 20% des erlittenen Schadens',
    trigger: 'on_take_damage',
    procChance: 1.0,
    power: 0.20,
  },
  revive: {
    id: 'revive',
    name: 'Wiedergeburt',
    description: 'Steht einmalig mit 30% HP wieder auf',
    trigger: 'on_death',
    procChance: 1.0,
    power: 0.30, // 30% maxHp restored
  },
  double_strike: {
    id: 'double_strike',
    name: 'Doppelschlag',
    description: '30% Chance auf einen zweiten Angriff',
    trigger: 'on_deal_damage',
    procChance: 0.30,
    power: 1.0, // full damage on second strike
  },
  anti_heal: {
    id: 'anti_heal',
    name: 'Wundfluch',
    description: 'Reduziert gegnerische Heilung um 50%',
    trigger: 'on_deal_damage',
    procChance: 1.0,
    power: 0.50,
  },
  regen: {
    id: 'regen',
    name: 'Regeneration',
    description: 'Heilt 3 HP pro Runde',
    trigger: 'on_round_end',
    procChance: 1.0,
    power: 3,
  },
  aoe_resist: {
    id: 'aoe_resist',
    name: 'AoE-Resistenz',
    description: 'Reduziert Flaechenschaden um 30%',
    trigger: 'on_take_damage',
    procChance: 1.0,
    power: 0.30,
  },
  spell_power: {
    id: 'spell_power',
    name: 'Zaubermacht',
    description: 'Erhoeht Skill-Schaden um 25%',
    trigger: 'on_skill_use',
    procChance: 1.0,
    power: 0.25,
  },
  fire_resist: {
    id: 'fire_resist',
    name: 'Feuerresistenz',
    description: 'Reduziert Hazard-Schaden um 30%',
    trigger: 'on_take_damage',
    procChance: 1.0,
    power: 0.30,
  },
};

/** Extract special effect IDs from an item's tags array */
export function extractSpecialTags(tags: string[]): string[] {
  return tags
    .filter(t => t.startsWith('special:'))
    .map(t => t.replace('special:', ''));
}
