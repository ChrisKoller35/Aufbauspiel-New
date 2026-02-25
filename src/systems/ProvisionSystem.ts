import { GameState } from '../models/GameState';
import { PROVISION_ITEMS, ITEM_DEFS } from '../data/items';

/**
 * Handles loading provisions from global stock for expeditions.
 */
export class ProvisionSystem {
  /**
   * Load provisions from global stock into the given provision slots.
   * Returns the updated provisions array.
   */
  loadProvisions(
    state: GameState,
    maxSlots: number,
    currentProvisions: { itemId: string; qty: number }[],
  ): { itemId: string; qty: number }[] {
    const provisions = [...currentProvisions];

    // Auto-fill: try to fill empty slots with available provision items
    for (const itemId of PROVISION_ITEMS) {
      if (provisions.length >= maxSlots) break;
      const available = state.globalStock[itemId] ?? 0;
      if (available <= 0) continue;

      const existing = provisions.find(p => p.itemId === itemId);
      if (existing) continue; // already have this type

      const qty = Math.min(available, 3); // max 3 per slot
      state.globalStock[itemId] -= qty;
      provisions.push({ itemId, qty });
    }

    return provisions;
  }

  /**
   * Return unused provisions back to global stock.
   */
  returnProvisions(
    state: GameState,
    provisions: { itemId: string; qty: number }[],
  ): void {
    for (const p of provisions) {
      if (p.qty > 0) {
        state.globalStock[p.itemId] = (state.globalStock[p.itemId] ?? 0) + p.qty;
      }
    }
  }

  /**
   * Use a provision during expedition. Returns the item def or null.
   */
  useProvision(
    provisions: { itemId: string; qty: number }[],
    index: number,
  ): { itemId: string; qty: number } | null {
    if (index < 0 || index >= provisions.length) return null;
    const slot = provisions[index];
    if (slot.qty <= 0) return null;

    slot.qty -= 1;
    return { itemId: slot.itemId, qty: 1 };
  }
}
