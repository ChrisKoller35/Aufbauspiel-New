/**
 * Ausbau des Gildenhauses auf Stufe 2: vier Helden je Expedition.
 * Freigeschaltet ab Gildenrang III; der Ausbau ist sofort fertig
 * (systems/Ausbau.ts nutzt diese Kosten für GUILD_HALL).
 */

export interface BuildingUpgradeDef {
  id: string;
  buildingTypeId: string;
  fromTier: number;
  toTier: number;
  name: string;
  description: string;
  cost: Record<string, number>;
  changes: {
    partySlots?: number;       // neue Zahl der Helden je Expedition
  };
  unlockCondition: {
    minGuildRank: number;
  };
}

export const BUILDING_UPGRADE_DEFS: Record<string, BuildingUpgradeDef> = {
  GUILD_HALL_T2: {
    id: 'GUILD_HALL_T2',
    buildingTypeId: 'GUILD_HALL',
    fromTier: 1,
    toTier: 2,
    name: 'Gildenhaus T2',
    description: 'Erweitert die Party auf 4 Kämpfer.',
    cost: { gold: 80, crystal_shard: 3 },
    changes: {
      partySlots: 4,
    },
    unlockCondition: {
      minGuildRank: 3,
    },
  },
};
