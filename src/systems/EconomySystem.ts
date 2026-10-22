import { GameState } from '../models/GameState';
import { FighterSynergySystem } from './FighterSynergySystem';
import { wirkungsStufe, marktBonusProzent, bankGoldProTag } from './Ausbau';
import { stadtSteuerProzent } from './Stadtweg';
import { erfolgePruefen } from './AchievementSystem';

/** Jeder Bewohner zahlt pro Tag so viel Gold, mal Zufriedenheit (0-1). */
export const STEUER_PRO_BEWOHNER = 2;

export interface SteuerRechnung {
  bewohner: number;
  zufriedenheit: number;   // 0-1
  heldenBonus: number;     // Faktor aus FighterSynergySystem
  /** Steuer-Bonus des Marktplatzes in Prozent (0 = wirkt nicht). */
  marktProzent: number;
  /** Steuer-Bonus der erreichten Stadtstufen in Prozent (Stadtweg.ts). */
  stadtProzent: number;
  steuern: number;         // Bewohner × Satz × Zufriedenheit × Boni, abgerundet
  bank: number;            // fester Betrag der Bank
  gesamt: number;
}

/**
 * Handles tax collection and day advancement.
 * Called every day tick (DAY_TICK_INTERVAL in main.ts).
 * Steuern hängen an den Bewohnern, nicht an der Zahl der Häuser:
 * Brot → Bewohner → Arbeit und Gold. Marktplatz und Bank wirken je
 * besetztem Arbeitsplatz (systems/Ausbau.ts), dazu der Bonus der
 * Stadtstufe (systems/Stadtweg.ts).
 */
export class EconomySystem {
  private fighterSynergySystem = new FighterSynergySystem();

  steuerRechnung(state: GameState): SteuerRechnung {
    const bewohner = state.citizens.length;
    const zufriedenheit = Math.max(0, Math.min(1, (state.satisfaction ?? 0) / 100));
    const heldenBonus = this.fighterSynergySystem.getTaxMultiplier(state);
    const marktProzent = marktBonusProzent(wirkungsStufe(state, 'MARKETPLACE'));
    const stadtProzent = stadtSteuerProzent(state);
    const bonus = 1 + (marktProzent + stadtProzent) / 100;
    const steuern = Math.floor(bewohner * STEUER_PRO_BEWOHNER * zufriedenheit * heldenBonus * bonus);
    const bank = bankGoldProTag(wirkungsStufe(state, 'BANK'));
    return { bewohner, zufriedenheit, heldenBonus, marktProzent, stadtProzent, steuern, bank, gesamt: steuern + bank };
  }

  /** Gold, das beim nächsten Tageswechsel eingeht (auch für die Anzeige). */
  steuernProTag(state: GameState): number {
    return this.steuerRechnung(state).gesamt;
  }

  dayTick(state: GameState): void {
    state.globalStock.gold = (state.globalStock.gold ?? 0) + this.steuernProTag(state);
    state.day++;
    state.statistics['total_days_survived'] = (state.statistics['total_days_survived'] ?? 0) + 1;
    // Erfolge auch beim Tageswechsel prüfen (Stadtstufe, Helden, Sets …)
    erfolgePruefen(state);
  }
}
