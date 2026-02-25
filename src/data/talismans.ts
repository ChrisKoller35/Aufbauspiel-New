/**
 * Talisman definitions.
 * Crafted in Guild Hall UI (instant, no worker needed).
 * Max 1 talisman per expedition.
 * Unlock: Guild Rank III (Veteran).
 */

export interface TalismanEffect {
  type: 'party_buff';
  stat: 'hp' | 'atk' | 'def' | 'spd';
  value: number;
  scope: 'expedition';        // applies to entire party for full run
}

export interface TalismanDef {
  id: string;
  name: string;
  description: string;
  effect: TalismanEffect;
  craftCost: Record<string, number>;
  baseValue: number;
}

export const TALISMAN_DEFS: Record<string, TalismanDef> = {
  talisman_fortitude: {
    id: 'talisman_fortitude',
    name: 'Talisman der Ausdauer',
    description: '+10 HP für die gesamte Party.',
    effect: { type: 'party_buff', stat: 'hp', value: 10, scope: 'expedition' },
    craftCost: { talisman_fragment: 2, crystal_shard: 1 },
    baseValue: 25,
  },
  talisman_striker: {
    id: 'talisman_striker',
    name: 'Talisman des Angreifers',
    description: '+1 ATK für die gesamte Party.',
    effect: { type: 'party_buff', stat: 'atk', value: 1, scope: 'expedition' },
    craftCost: { talisman_fragment: 3, iron_scrap: 2 },
    baseValue: 25,
  },
};
