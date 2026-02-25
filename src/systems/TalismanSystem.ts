import { GameState } from '../models/GameState';
import { TALISMAN_DEFS, TalismanDef } from '../data/talismans';

/**
 * Handles talisman crafting and expedition loadout selection.
 * Unlock: Guild Rank III (Veteran).
 * Max 1 talisman per expedition.
 */
export class TalismanSystem {
  /**
   * Check if talisman crafting is unlocked (Rank III+).
   */
  isUnlocked(state: GameState): boolean {
    return state.guildStats.rank >= 3;
  }

  /**
   * Check if a talisman can be crafted (materials available).
   */
  canCraft(state: GameState, talismanId: string): boolean {
    const def = TALISMAN_DEFS[talismanId];
    if (!def) return false;
    if (!this.isUnlocked(state)) return false;

    for (const [item, amount] of Object.entries(def.craftCost)) {
      if ((state.globalStock[item] ?? 0) < amount) return false;
    }
    return true;
  }

  /**
   * Craft a talisman (instant, no worker needed).
   * Returns true if successful.
   */
  craft(state: GameState, talismanId: string): boolean {
    if (!this.canCraft(state, talismanId)) return false;

    const def = TALISMAN_DEFS[talismanId];

    // Deduct materials
    for (const [item, amount] of Object.entries(def.craftCost)) {
      state.globalStock[item] -= amount;
    }

    // Add to inventory
    if (!state.talismanInventory.includes(talismanId)) {
      state.talismanInventory.push(talismanId);
    }

    return true;
  }

  /**
   * Select a talisman for the next expedition.
   */
  selectForExpedition(state: GameState, talismanId: string | null): void {
    if (talismanId && !state.talismanInventory.includes(talismanId)) return;
    state.selectedTalisman = talismanId;
  }

  /**
   * Get the currently selected talisman def (or null).
   */
  getSelectedTalisman(state: GameState): TalismanDef | null {
    if (!state.selectedTalisman) return null;
    return TALISMAN_DEFS[state.selectedTalisman] ?? null;
  }

  /**
   * Apply talisman buffs to party at expedition start.
   * Called from ExpeditionSystem.startExpedition().
   */
  applyToParty(
    state: GameState,
    partyUnits: { hp: number; maxHp: number; atk: number; def: number; spd: number }[],
  ): void {
    const talisman = this.getSelectedTalisman(state);
    if (!talisman) return;

    for (const unit of partyUnits) {
      const effect = talisman.effect;
      switch (effect.stat) {
        case 'hp':
          unit.hp += effect.value;
          unit.maxHp += effect.value;
          break;
        case 'atk':
          unit.atk += effect.value;
          break;
        case 'def':
          unit.def += effect.value;
          break;
        case 'spd':
          unit.spd += effect.value;
          break;
      }
    }
  }
}
