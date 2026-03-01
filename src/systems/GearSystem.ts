import { GameState } from '../models/GameState';
import { GuildFighter, FighterStats } from '../models/GuildRoster';
import { SpecialEffect } from '../models/ExpeditionRun';
import { ITEM_DEFS } from '../data/items';
import { CLASS_DEFS } from '../data/classes';
import { extractSpecialTags, SPECIAL_EFFECT_DEFS } from '../data/specialEffects';

/**
 * Handles equipping/unequipping gear and computing effective stats.
 */
export class GearSystem {
  /**
   * Equip an item from global stock onto a fighter's gear slot.
   * Returns true on success.
   */
  equip(state: GameState, fighter: GuildFighter, itemId: string): boolean {
    const itemDef = ITEM_DEFS[itemId];
    if (!itemDef || !itemDef.gearSlot) return false;

    // Check stock
    if ((state.globalStock[itemId] ?? 0) < 1) return false;

    // Unequip current item in that slot first
    this.unequip(state, fighter, itemDef.gearSlot);

    // Equip
    state.globalStock[itemId] -= 1;
    fighter.gear[itemDef.gearSlot] = itemId;

    return true;
  }

  /**
   * Unequip a gear slot, returning the item to global stock.
   */
  unequip(state: GameState, fighter: GuildFighter, slot: 'weapon' | 'armor' | 'trinket'): void {
    const current = fighter.gear[slot];
    if (current) {
      state.globalStock[current] = (state.globalStock[current] ?? 0) + 1;
      fighter.gear[slot] = null;
    }
  }

  /**
   * Calculate effective stats = base + gear bonuses.
   */
  getEffectiveStats(fighter: GuildFighter): FighterStats {
    // Use fighter.baseStats (includes level-up bonuses), not CLASS_DEFS (static base)
    const base = fighter.baseStats;

    const stats: FighterStats = { ...base, hp: base.maxHp, maxHp: base.maxHp };

    // Apply gear bonuses (halved if gear needs repair)
    const gearMult = fighter.gearNeedsRepair ? 0.5 : 1.0;
    for (const slot of ['weapon', 'armor', 'trinket'] as const) {
      const itemId = fighter.gear[slot];
      if (!itemId) continue;
      const itemDef = ITEM_DEFS[itemId];
      if (!itemDef?.statBonuses) continue;

      if (itemDef.statBonuses.atk) stats.atk += Math.floor(itemDef.statBonuses.atk * gearMult);
      if (itemDef.statBonuses.def) stats.def += Math.floor(itemDef.statBonuses.def * gearMult);
      if (itemDef.statBonuses.hp) {
        const hpBonus = Math.floor(itemDef.statBonuses.hp * gearMult);
        stats.maxHp += hpBonus;
        stats.hp += hpBonus;
      }
      if (itemDef.statBonuses.spd) stats.spd += Math.floor(itemDef.statBonuses.spd * gearMult);
      if (itemDef.statBonuses.critChance) stats.critChance += itemDef.statBonuses.critChance * gearMult;
    }

    return stats;
  }

  /**
   * Collect special effects from all equipped gear items.
   */
  getSpecialEffects(fighter: GuildFighter): SpecialEffect[] {
    const effects: SpecialEffect[] = [];
    for (const slot of ['weapon', 'armor', 'trinket'] as const) {
      const itemId = fighter.gear[slot];
      if (!itemId) continue;
      const itemDef = ITEM_DEFS[itemId];
      if (!itemDef) continue;
      const tags = extractSpecialTags(itemDef.tags);
      for (const tag of tags) {
        if (SPECIAL_EFFECT_DEFS[tag]) {
          effects.push({
            id: tag,
            usesLeft: tag === 'revive' ? 1 : -1, // revive is one-time
          });
        }
      }
    }
    return effects;
  }

  /**
   * Unequip all gear from a fighter back to stock.
   */
  unequipAll(state: GameState, fighter: GuildFighter): void {
    this.unequip(state, fighter, 'weapon');
    this.unequip(state, fighter, 'armor');
    this.unequip(state, fighter, 'trinket');
  }
}
