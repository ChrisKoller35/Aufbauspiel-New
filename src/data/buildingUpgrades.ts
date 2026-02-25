/**
 * Building upgrade definitions.
 * MVP: Only Guild Hall T2 (partySlots 3→4).
 * Unlocked at Guild Rank III.
 */

export interface BuildingUpgradeDef {
  id: string;
  buildingTypeId: string;
  fromTier: number;
  toTier: number;
  name: string;
  description: string;
  cost: Record<string, number>;
  buildTimeSec: number;
  changes: {
    partySlots?: number;       // new partySlots value
    workerSlots?: number;      // new workerSlots value
    housingCapacity?: number;  // new housing capacity
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
    cost: { wood: 60, stone: 20, crystal_shard: 3, gold: 80 },
    buildTimeSec: 120,
    changes: {
      partySlots: 4,
    },
    unlockCondition: {
      minGuildRank: 3,
    },
  },
};

/** Find available upgrade for a building type + tier. */
export function getAvailableUpgrade(
  buildingTypeId: string,
  currentTier: number,
): BuildingUpgradeDef | null {
  return Object.values(BUILDING_UPGRADE_DEFS).find(
    u => u.buildingTypeId === buildingTypeId && u.fromTier === currentTier,
  ) ?? null;
}
