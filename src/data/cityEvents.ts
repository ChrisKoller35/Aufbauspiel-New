/**
 * City Event definitions.
 * Trigger: Every 3 day-ticks (180s), 50% RNG chance.
 * Only one active event at a time.
 */

export type CityEventEffectType = 'offer_trade' | 'production_mult' | 'pause_building';

export interface CityEventEffect {
  type: CityEventEffectType;
  // offer_trade
  give?: Record<string, number>;
  receive?: Record<string, number>;
  // production_mult
  targetTag?: string;       // building tag to affect (e.g. 'farm')
  multiplier?: number;      // production output multiplier
  // pause_building
  pauseRandom?: boolean;    // pause a random production building
}

export interface CityEventDef {
  id: string;
  name: string;
  description: string;
  weight: number;
  durationSec: number;
  effects: CityEventEffect[];
  tags: string[];           // 'positive', 'negative', 'trade'
}

export const CITY_EVENT_DEFS: Record<string, CityEventDef> = {
  EVENT_MERCHANT: {
    id: 'EVENT_MERCHANT',
    name: 'Wanderhändler',
    description: 'Ein Händler bietet seltene Waren an.',
    weight: 40,
    durationSec: 60,
    effects: [
      { type: 'offer_trade', give: { gold: 20 }, receive: { iron_scrap: 3 } },
    ],
    tags: ['trade', 'positive'],
  },
  EVENT_HARVEST: {
    id: 'EVENT_HARVEST',
    name: 'Erntesegen',
    description: 'Die Ernte ist gesegnet! Farmen produzieren doppelt.',
    weight: 35,
    durationSec: 120,
    effects: [
      { type: 'production_mult', targetTag: 'farm', multiplier: 2.0 },
    ],
    tags: ['positive'],
  },
  EVENT_STORM: {
    id: 'EVENT_STORM',
    name: 'Unwetter',
    description: 'Ein Sturm hat ein Gebäude beschädigt!',
    weight: 25,
    durationSec: 60,
    effects: [
      { type: 'pause_building', pauseRandom: true },
    ],
    tags: ['negative'],
  },
};

/** Weighted random pick from event pool. */
export function pickRandomEvent(rng: () => number): CityEventDef {
  const events = Object.values(CITY_EVENT_DEFS);
  const totalWeight = events.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * totalWeight;
  for (const event of events) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return events[events.length - 1];
}
