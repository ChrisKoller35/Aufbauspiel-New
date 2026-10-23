// ─── Magic City – Wann wurde gedrückt? ──────────────────────────
// Manche Knöpfe nehmen kurz nach einem Klick keinen an: Ein langsamer
// zweiter Druck soll nicht gleich bestätigen, was der erste eben gefragt
// hat. Gezählt wird ab dem Druck, nicht ab dem Moment, in dem das Spiel
// dazu kommt; ist es gerade beschäftigt, gälte ein Klick sonst als später.
// ────────────────────────────────────────────────────────────────

/** So lange kann ein Klick nicht auf das Spiel warten; liegt e.timeStamp weiter weg, zählt er auf einer anderen Uhr */
const HOECHSTENS_MS = 5000;

/**
 * Wann gedrückt wurde, auf der Uhr von performance.now: e.timeStamp. Zählt ein Browser auf einer anderen Uhr (ältere
 * ab 1970) oder gibt er keine Zeit mit (0), gilt jetzt
 */
export function gedruecktUm(e: Event): number {
  const jetzt = performance.now();
  return e.timeStamp > 0 && Math.abs(jetzt - e.timeStamp) < HOECHSTENS_MS ? e.timeStamp : jetzt;
}
