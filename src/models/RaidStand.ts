// ─── Magic City – Spielstand des Raids «Über dem Tag» ───────────
// Rechnung: systems/RaidKampf.ts, Ablauf: systems/Raid.ts, Regeln und Zahlen: docs/RAID.md.

/** Ein Feld des Raid-Felds: Reihe 0 ist vorn, Spalte 0 bis 5 sind A bis F (A–C Trupp Links, D–F Trupp Rechts) */
export interface Feld {
  reihe: number;
  spalte: number;
}

/** Ein Ernstkampf im Verlauf (neueste zuerst) */
export interface RaidVersuch {
  zeit: number;
  woche: string;
  sieg: boolean;
  /** Zenits Rest nach dem Kampf, 0 bis 1 */
  rest: number;
  runden: number;
  helden: number;
  stehend: number;
}

/**
 * Stand einer Raid-Stufe: Stufe I in `GameState.raid`, höhere in `GameState.raidStufen[id]`. Fehlt in älteren
 * Spielständen; Raid.raidStand() legt ihn an.
 */
export interface RaidStand {
  /** Held-Id (als Text) → Feld */
  aufstellung: Record<string, Feld>;
  woche: {
    id: string;
    start: number;
    /** Ernstkämpfe in dieser Woche (die ersten drei sind frei) */
    versuche: number;
    /** Die Truhe ab der Hälfte («Was vom Pendel fiel», Stufe II «Was der Gegenzeiger verlor») ist diese Woche offen */
    halbeTruhe: boolean;
    /** Die Siegtruhe («Zenits Truhe», Stufe II «Die dreizehnte Truhe») ist diese Woche schon geöffnet */
    truhe: boolean;
  };
  /** Kleinster Zenit-Rest aus allen Ernstkämpfen (0 = besiegt), null = noch keiner */
  bestRest: number | null;
  versucheGesamt: number;
  siege: number;
  /** Die letzten Ernstkämpfe, neueste zuerst, höchstens 10 */
  verlauf: RaidVersuch[];
  einleitungGelesen: boolean;
  schlussGelesen: boolean;
  /** Wochen-Id, deren Montag-Satz schon gezeigt wurde */
  montagGesehen?: string;
}
