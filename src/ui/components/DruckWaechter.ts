// ─── Magic City – Wird gerade gedrückt? ─────────────────────────
// Die Gebäude-Seite und ihre Fenster zeichnen sich laufend nach. Ein
// Knopf, der zwischen Drücken und Loslassen ersetzt wird, verliert den
// Klick; darum wird nichts neu gezeichnet, solange ein Finger oder die
// Maus unten ist (oder eben losgelassen wurde).
// ────────────────────────────────────────────────────────────────

/** Wann zuletzt gedrückt und losgelassen wurde (Maus oder Finger). */
const druck = { seit: 0, los: 0 };
let gebunden = false;

/** Hört einmal auf window; mehrfacher Aufruf ist unschädlich. */
export function bindDruckWaechter(): void {
  if (gebunden) return;
  gebunden = true;
  window.addEventListener('pointerdown', () => { druck.seit = Date.now(); }, true);
  const los = () => { druck.los = Date.now(); };
  window.addEventListener('pointerup', los, true);
  window.addEventListener('pointercancel', los, true);
  window.addEventListener('blur', los);
}

/** Wird gerade gedrückt (oder eben losgelassen)? Hängt das Loslassen, höchstens 2 s. */
export function wirdGedrueckt(): boolean {
  const jetzt = Date.now();
  return (druck.seit > druck.los && jetzt - druck.seit < 2000) || jetzt - druck.los < 300;
}
