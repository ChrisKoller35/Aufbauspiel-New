// ─── Magic City – Der Spieltag ──────────────────────────────────
// Takt der Stadt (main.ts): jede Sekunde arbeiten die Werkstätten
// (systems/ProductionSystem.ts), alle TAG_SEKUNDEN beginnt ein neuer
// Tag. Der Tag zählt für die Erfolge («Überlebenskünstler»), für die
// Bestenliste (Tag der Expedition) und das Fenster «Spielstand».
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { erfolgePruefen } from './AchievementSystem';

/** Länge eines Spieltags in Sekunden. */
export const TAG_SEKUNDEN = 30;

/** Takt der Werkstätten in Sekunden (ProductionSystem.update). */
export const STADT_TAKT_SEKUNDEN = 1;

/**
 * Ein neuer Tag beginnt: Tag hochzählen, die überstandenen Tage in die Statistik
 * (Tag 1 ist der erste Tag, am Ende von Tag 1 ist einer überstanden), dann die Erfolge
 * prüfen (Tage, Stadtstufe und alles, was ohne Kopfzeile dazugekommen ist).
 */
export function neuerTag(state: GameState): void {
  state.day += 1;
  state.statistics.total_days_survived = state.day - 1;
  erfolgePruefen(state);
}
