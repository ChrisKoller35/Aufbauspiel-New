import { GameState } from '../models/GameState';

/**
 * Fighter-Stadt-Synergien.
 * Zählt die Helden aus state.fighters, die gerade zu Hause sind
 * (nicht in der Gruppe der laufenden Expedition). Helden kommen aus dem
 * Heldenhaus und sind an keinen Bewohner gebunden.
 *
 * Bonuses:
 * - ≥1 fighter: +3 satisfaction per house (applied in SatisfactionSystem)
 * - ≥2 fighters: -10% training time (1.1x faster)
 * - ≥3 fighters: +5% tax multiplier (applied in EconomySystem)
 */
export class FighterSynergySystem {
  /**
   * Count heroes at home (not in the active expedition's party).
   */
  getActiveFighterCount(state: GameState): number {
    const unterwegs = new Set((state.activeExpedition?.party ?? []).map(u => u.id));
    return state.fighters.filter(f => !unterwegs.has(f.id)).length;
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
