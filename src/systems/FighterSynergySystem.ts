import { GameState } from '../models/GameState';

/**
 * Fighter-Stadt-Synergien.
 * Counts active GUILD_FIGHTER citizens (not on expedition, not training, not injured).
 *
 * Bonuses:
 * - ≥1 fighter: +3 satisfaction per house (applied in SatisfactionSystem)
 * - ≥2 fighters: -10% training time (1.1x faster)
 * - ≥3 fighters: +5% tax multiplier (applied in EconomySystem)
 */
export class FighterSynergySystem {
  /**
   * Count active fighters in city (not on expedition, training, or injured).
   */
  getActiveFighterCount(state: GameState): number {
    return state.citizens.filter(
      c => c.status === 'GUILD_FIGHTER'
    ).length;
  }

  /**
   * Get satisfaction bonus from fighters.
   * ≥1 fighter → +3 per house.
   */
  getSatisfactionBonus(state: GameState): number {
    const count = this.getActiveFighterCount(state);
    return count >= 1 ? 3 : 0;
  }

  /**
   * Get training speed multiplier.
   * ≥2 fighters → 0.9 (10% faster).
   */
  getTrainingSpeedMult(state: GameState): number {
    const count = this.getActiveFighterCount(state);
    return count >= 2 ? 0.9 : 1.0;
  }

  /**
   * Get tax multiplier bonus.
   * ≥3 fighters → 1.05 (+5%).
   */
  getTaxMultiplier(state: GameState): number {
    const count = this.getActiveFighterCount(state);
    return count >= 3 ? 1.05 : 1.0;
  }
}
