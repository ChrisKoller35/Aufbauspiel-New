// ─── Magic City – Preise am Marktplatz ──────────────────────────
// Gehandelt wird in Bündeln zu BUENDEL Stück, für ganze Goldbeträge.
// Nur Stadtwaren; Kristallsplitter, Dungeon-Zutaten, Ausrüstung und
// Tränke kommen weiter aus Dungeons und Werkstätten.
// Kauf = KAUF_FAKTOR × Verkauf, damit Hin und Her nie Gewinn bringt.
// Ein Arbeiter, dessen Tagesproduktion verkauft wird, bringt 1-2 Gold
// pro Tag, etwa so viel wie seine Steuern. Regeln: docs/HANDEL.md.
// ────────────────────────────────────────────────────────────────

/** Stück pro Bündel. */
export const BUENDEL = 10;

/** Kaufpreis = Verkaufspreis × KAUF_FAKTOR. */
export const KAUF_FAKTOR = 3;

/** Gold beim Verkauf von BUENDEL Stück (Schlüssel wie in globalStock). */
export const VERKAUFSPREIS: Readonly<Record<string, number>> = {
  wood: 2,
  grain: 2,
  herb_green: 5,
  stone: 5,
  flour: 5,
  bread: 12,
  iron_scrap: 15,
};

/** Handelbare Waren in Anzeige-Reihenfolge. */
export const HANDELSWAREN: readonly string[] = Object.keys(VERKAUFSPREIS);

/** Gold, das der Kauf von BUENDEL Stück kostet. */
export function kaufpreis(ware: string): number {
  return (VERKAUFSPREIS[ware] ?? 0) * KAUF_FAKTOR;
}

/** Bündel pro Tag nach besetzten Plätzen am Marktplatz (0 = kein Handel). */
export function buendelProTag(besetztePlaetze: number): number {
  return [0, 3, 6, 10][Math.max(0, Math.min(3, Math.floor(besetztePlaetze)))];
}
