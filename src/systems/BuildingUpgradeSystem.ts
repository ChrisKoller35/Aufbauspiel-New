import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { BUILDING_UPGRADE_DEFS, getAvailableUpgrade } from '../data/buildingUpgrades';

/**
 * Handles building tier upgrades.
 * MVP: Only Guild Hall T2 (partySlots 3→4).
 */
export class BuildingUpgradeSystem {
  /**
   * Check if an upgrade is available and affordable for a building.
   */
  canUpgrade(state: GameState, building: BuildingInstance): boolean {
    if (!building.built) return false;
    if (building.upgrading) return false;

    const upgrade = getAvailableUpgrade(building.typeId, building.tier);
    if (!upgrade) return false;

    // Check guild rank requirement
    if (state.guildStats.rank < upgrade.unlockCondition.minGuildRank) return false;

    // Check cost
    for (const [item, amount] of Object.entries(upgrade.cost)) {
      if ((state.globalStock[item] ?? 0) < amount) return false;
    }

    return true;
  }

  /**
   * Start an upgrade. Deducts cost and sets upgrading flag.
   */
  startUpgrade(state: GameState, building: BuildingInstance): boolean {
    if (!this.canUpgrade(state, building)) return false;

    const upgrade = getAvailableUpgrade(building.typeId, building.tier)!;

    // Deduct cost
    for (const [item, amount] of Object.entries(upgrade.cost)) {
      state.globalStock[item] -= amount;
    }

    building.upgrading = true;
    building.upgradeProgress = 0;
    building.upgradeId = upgrade.id;

    return true;
  }

  /**
   * Tick upgrade progress. Called every city tick (1.0s).
   */
  update(state: GameState, deltaSec: number): void {
    for (const building of state.buildings) {
      if (!building.upgrading || !building.upgradeId) continue;

      const upgrade = BUILDING_UPGRADE_DEFS[building.upgradeId];
      if (!upgrade) continue;

      building.upgradeProgress += deltaSec;

      if (building.upgradeProgress >= upgrade.buildTimeSec) {
        // Upgrade complete
        building.tier = upgrade.toTier;
        building.upgrading = false;
        building.upgradeProgress = 0;
        building.upgradeId = null;

        // Apply changes
        if (upgrade.changes.partySlots != null) {
          // Guild Hall: update partySlots
          // This is read dynamically from building.tier in the expedition system
          state.guildStats.guildHallT2 = true;
        }

        console.log(`Building ${building.typeId} upgraded to tier ${upgrade.toTier}`);
      }
    }
  }

  /**
   * Get the current party slots (based on Guild Hall tier).
   */
  getPartySlots(state: GameState): number {
    const guildHall = state.buildings.find(
      b => b.typeId === 'GUILD_HALL' && b.built,
    );
    if (!guildHall) return 3;
    return guildHall.tier >= 2 ? 4 : 3;
  }
}
