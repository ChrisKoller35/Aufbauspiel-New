import { GameState } from '../models/GameState';
import { GuildFighter, FighterStats } from '../models/GuildRoster';
import { SpecialEffect } from '../models/ExpeditionRun';
import { ITEM_DEFS, ItemDef } from '../data/items';
import { extractSpecialTags, SPECIAL_EFFECT_DEFS } from '../data/specialEffects';
import { setBonusWerte, setFaehigkeiten } from './DungeonSets';
import { wegEffekte, wegWerte } from './Spezialisierung';
import { SchmiedeStufen, werteMitStufe } from './Schmiede';

export type EquipSlot = 'mainHand' | 'offHand' | 'armor' | 'trinket';

/**
 * Handles equipping/unequipping gear and computing effective stats.
 *
 * Weapon slot rules:
 *  - 2H weapon  → mainHand; offHand forced to null
 *  - Shield     → offHand only if mainHand holds a 1H weapon
 *  - 1H weapon  → mainHand; if mainHand already has a 1H, swap offHand (dual-wield)
 */
export class GearSystem {
  /**
   * Equip an item from global stock onto a fighter.
   * Slot placement follows 2-slot weapon rules (see above).
   * Returns true on success.
   */
  equip(state: GameState, fighter: GuildFighter, itemId: string, wunsch?: EquipSlot): boolean {
    const itemDef = ITEM_DEFS[itemId];
    if (!itemDef || !itemDef.gearSlot) return false;

    // Check stock
    if ((state.globalStock[itemId] ?? 0) < 1) return false;

    const slot = this.resolveEquipSlot(fighter, itemId, wunsch);
    if (!slot) return false;

    // If placing a 2H weapon, clear offHand first
    if (itemDef.gearSlot === 'mainHand' && itemDef.weaponSlotType === '2h') {
      this.unequip(state, fighter, 'offHand');
    }

    // Unequip whatever is currently in the target slot
    this.unequip(state, fighter, slot);

    // Equip
    state.globalStock[itemId] -= 1;
    fighter.gear[slot] = itemId;

    return true;
  }

  /**
   * Determine which physical gear slot an item should go into.
   * Returns null if the item cannot be equipped (e.g. shield without 1H mainHand).
   * wunsch: der Platz, den der Spieler auf der Heldenseite angetippt hat. Eine Einhandwaffe
   * kommt dann in genau diese Hand (die Nebenhand nur neben einer Einhandwaffe).
   */
  resolveEquipSlot(fighter: GuildFighter, itemId: string, wunsch?: EquipSlot): EquipSlot | null {
    const itemDef = ITEM_DEFS[itemId];
    if (!itemDef || !itemDef.gearSlot) return null;

    if (itemDef.gearSlot === 'armor') return 'armor';
    if (itemDef.gearSlot === 'trinket') return 'trinket';

    // Weapon handling
    const wst = itemDef.weaponSlotType;

    if (wst === '2h') {
      return 'mainHand';
    }

    if (wst === 'shield') {
      // Can only equip shield if mainHand holds a 1H weapon
      const mhDef = fighter.gear.mainHand ? ITEM_DEFS[fighter.gear.mainHand] : null;
      if (mhDef && mhDef.weaponSlotType === '1h') return 'offHand';
      return null;
    }

    // 1H weapon: mainHand preferred; if mainHand already has a 1H → offHand (dual-wield),
    // ausser dort liegt ein Schild: dann wird die Hauptwaffe getauscht und der Schild bleibt
    if (wst === '1h') {
      const mhDef = fighter.gear.mainHand ? ITEM_DEFS[fighter.gear.mainHand] : null;
      const ohDef = fighter.gear.offHand ? ITEM_DEFS[fighter.gear.offHand] : null;
      const zweiteWaffeMoeglich = mhDef?.weaponSlotType === '1h';
      if (wunsch === 'mainHand') return 'mainHand';
      if (wunsch === 'offHand') return zweiteWaffeMoeglich ? 'offHand' : 'mainHand';
      if (zweiteWaffeMoeglich && ohDef?.weaponSlotType !== 'shield') return 'offHand';
      return 'mainHand';
    }

    // Fallback: treat as mainHand
    return 'mainHand';
  }

  /**
   * Unequip a gear slot, returning the item to global stock.
   */
  unequip(state: GameState, fighter: GuildFighter, slot: EquipSlot): void {
    const current = fighter.gear[slot];
    if (current) {
      state.globalStock[current] = (state.globalStock[current] ?? 0) + 1;
      fighter.gear[slot] = null;
    }
  }

  /**
   * Calculate effective stats = base + gear bonuses from all 4 slots + set bonuses (DungeonSets)
   * + Werte des Wegs (Spezialisierung, nicht von Reparaturen betroffen).
   * stufen: Stufen der Schmiede (Schmiede.schmiedeStufen); verbesserte Set-Teile zählen mit ihren
   * höheren Werten, ein Meisterset mit doppeltem Zwei-Teile-Bonus. Ohne sie: Grundwerte.
   */
  getEffectiveStats(fighter: GuildFighter, stufen?: SchmiedeStufen): FighterStats {
    const base = fighter.baseStats;
    const stats: FighterStats = { ...base, hp: base.maxHp, maxHp: base.maxHp };

    // Apply gear bonuses (halved if gear needs repair)
    const gearMult = fighter.gearNeedsRepair ? 0.5 : 1.0;
    const add = (bonus: NonNullable<ItemDef['statBonuses']> & { critMult?: number }, mult = gearMult): void => {
      if (bonus.atk) stats.atk += Math.floor(bonus.atk * mult);
      if (bonus.def) stats.def += Math.floor(bonus.def * mult);
      if (bonus.hp) {
        const hpBonus = Math.floor(bonus.hp * mult);
        stats.maxHp += hpBonus;
        stats.hp += hpBonus;
      }
      // Tempo-Boni sind Bruchteile (−0.1 bis +0.2): nicht abrunden, sonst wird +0.1 zu 0 und −0.05 zu −1
      if (bonus.spd) stats.spd = Math.round((stats.spd + bonus.spd * mult) * 100) / 100;
      if (bonus.critChance) stats.critChance += bonus.critChance * mult;
      if (bonus.critMult) stats.critMult = Math.round((stats.critMult + bonus.critMult * mult) * 100) / 100;
    };
    for (const slot of ['mainHand', 'offHand', 'armor', 'trinket'] as const) {
      const itemId = fighter.gear[slot];
      if (!itemId) continue;
      const werte = werteMitStufe(itemId, stufen);
      if (werte) add(werte);
    }
    add(setBonusWerte(fighter.gear, stufen));
    add(wegWerte(fighter), 1);

    return stats;
  }

  /**
   * Collect special effects from all equipped gear items, complete sets and the hero's Weg.
   */
  getSpecialEffects(fighter: GuildFighter): SpecialEffect[] {
    const effects: SpecialEffect[] = [];
    for (const slot of ['mainHand', 'offHand', 'armor', 'trinket'] as const) {
      const itemId = fighter.gear[slot];
      if (!itemId) continue;
      const itemDef = ITEM_DEFS[itemId];
      if (!itemDef) continue;
      const tags = extractSpecialTags(itemDef.tags);
      for (const tag of tags) {
        if (SPECIAL_EFFECT_DEFS[tag]) {
          effects.push({
            id: tag,
            usesLeft: tag === 'revive' ? 1 : -1,
          });
        }
      }
    }
    effects.push(...setFaehigkeiten(fighter.gear));
    effects.push(...wegEffekte(fighter));
    return effects;
  }

  /**
   * Unequip all gear from a fighter back to stock.
   */
  unequipAll(state: GameState, fighter: GuildFighter): void {
    this.unequip(state, fighter, 'mainHand');
    this.unequip(state, fighter, 'offHand');
    this.unequip(state, fighter, 'armor');
    this.unequip(state, fighter, 'trinket');
  }
}
