// ─── Magic City – Grösse der Mindmap ────────────────────────────
// Anpassung des Reiters «Stadt» an die Breite: normal, verkleinert
// oder Raster (Handy). Aufruf: ProduktionTab.ts.
// ────────────────────────────────────────────────────────────────

// ── Grösse: normal, verkleinert oder Raster ─────────────────────

/** Unter diesem Faktor wäre die Schrift zu klein: dann Raster. */
const KLEINSTER_FAKTOR = 0.72;

export type Modus = 'voll' | 'zoom' | 'kompakt';

/** Welche Darstellung bei dieser Breite? (reine Rechnung, für Tests) */
export function modusFuer(verfuegbar: number, natuerlich: number): { modus: Modus; faktor: number } {
  if (natuerlich <= 0 || verfuegbar >= natuerlich) return { modus: 'voll', faktor: 1 };
  const faktor = verfuegbar / natuerlich;
  return faktor >= KLEINSTER_FAKTOR ? { modus: 'zoom', faktor } : { modus: 'kompakt', faktor: 1 };
}

/**
 * Misst nur neu, wenn sich die Breite geändert hat. Im Zoom-Modus wird das
 * Netz per transform verkleinert; der Rahmen bekommt die verkleinerte Höhe,
 * damit nichts seitlich übersteht.
 */
function passeGroesseAn(pk: HTMLElement, rahmen: HTMLElement, netz: HTMLElement): Modus {
  const verfuegbar = rahmen.clientWidth;
  let modus = (pk.dataset.modus as Modus | undefined) ?? 'voll';
  if (String(verfuegbar) !== pk.dataset.breite) {
    pk.dataset.breite = String(verfuegbar);
    pk.dataset.modus = 'voll';
    netz.style.transform = '';
    rahmen.style.height = '';
    const r = modusFuer(verfuegbar, netz.scrollWidth);
    modus = r.modus;
    pk.dataset.modus = modus;
    pk.dataset.faktor = String(r.faktor);
    if (modus === 'zoom') netz.style.transform = `scale(${r.faktor})`;
  }
  if (modus === 'zoom') {
    const hoehe = `${Math.ceil(netz.offsetHeight * Number(pk.dataset.faktor ?? 1))}px`;
    if (rahmen.style.height !== hoehe) rahmen.style.height = hoehe;
  }
  return modus;
}

/** Passt die Mindmap an die Breite an (misst nur neu, wenn sich die Breite geändert hat). */
export function passeMindmapAn(panel: HTMLElement): void {
  const pk = panel.querySelector('.pk') as HTMLElement | null;
  const rahmen = panel.querySelector('.pk-rahmen') as HTMLElement | null;
  const netz = panel.querySelector('.pk-netz') as HTMLElement | null;
  if (!pk || !rahmen || !netz || netz.clientWidth === 0) return;
  passeGroesseAn(pk, rahmen, netz);
}
