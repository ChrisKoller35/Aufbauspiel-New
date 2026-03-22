import { GameState } from '../models/GameState';
import { GuildFighter } from '../models/GuildRoster';

const MAINTENANCE_COST_PER_ITEM = 5; // Gold per equipped gear item

/**
 * Gear maintenance: deducts gold after each expedition.
 * First gear item is free (tutorial relief).
 * If unpaid: gearNeedsRepair = true (50% stat bonus reduction).
 */
export class GearMaintenanceSystem {
  /**
   * Process gear maintenance for fighters who participated in an expedition.
   * Returns total gold deducted.
   */
  processAfterExpedition(state: GameState, fighterIds: number[]): number {
    let totalCost = 0;

    for (const fId of fighterIds) {
      const fighter = state.fighters.find(f => f.id === fId);
      if (!fighter) continue;

      const equippedCount = this.countEquippedItems(fighter);
      if (equippedCount === 0) continue;

      // First item is free (tutorial relief)
      const billableItems = Math.max(0, equippedCount - 1);
      const cost = billableItems * MAINTENANCE_COST_PER_ITEM;

      if (cost > 0) {
        if ((state.globalStock.gold ?? 0) >= cost) {
          state.globalStock.gold -= cost;
          fighter.gearNeedsRepair = false;
          totalCost += cost;
        } else {
          // Can't afford → gear needs repair
          fighter.gearNeedsRepair = true;
        }
      }
    }

    return totalCost;
  }

  private countEquippedItems(fighter: GuildFighter): number {
    let count = 0;
    if (fighter.gear.mainHand) count++;
    if (fighter.gear.offHand) count++;
    if (fighter.gear.armor) count++;
    if (fighter.gear.trinket) count++;
    return count;
  }
}
