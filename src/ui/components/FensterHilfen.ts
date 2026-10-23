// ─── Magic City – Hilfen für Fenster über dem Spiel ─────────────
// Gemeinsam für die Fenster «Spielstand» (SpielstandFenster.ts), «Der
// Weg zur Magischen Stadt» (StadtwegFenster.ts), das Fundbuch
// (FundbuchFenster.ts), das Heldenfenster (HeroesScreen.ts), das
// Monsterbuch und die Fenster der Gebäude-Seite (HaendlerFenster.ts,
// GebaeudeFenster.ts, Bau-Dialog), dazu «Lernen» im Lehrbuch (Lehrbuch.ts):
// Tasten gehen nicht an das Spiel dahinter, Tab bleibt im Fenster, und
// der zweite Klick eines Doppelklicks löst nichts aus, was hinter dem
// Fenster liegt. Sein Druck nimmt keinen Fokus weg und markiert nichts,
// auch wenn er einen gesperrten Knopf trifft (dorthin schickt Chromium
// nur pointerdown, kein mousedown).
// ────────────────────────────────────────────────────────────────

/**
 * Tab und Umschalt+Tab bleiben im Fenster (es ist modal). Ziele sind Knöpfe und Eingabefelder (die Suche
 * im Fundbuch): Sonst entkäme der Fokus aus einem Eingabefeld, nach dem kein Knopf mehr kommt.
 */
function halteFokusImFenster(e: KeyboardEvent, fenster: HTMLElement): void {
  const ziele = Array.from(fenster.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([hidden])'));
  const aktiv = document.activeElement;
  const draussen = !(aktiv instanceof HTMLElement) || aktiv === fenster || !fenster.contains(aktiv);
  if (ziele.length === 0) {
    e.preventDefault();
    fenster.focus();
  } else if (e.shiftKey && (draussen || aktiv === ziele[0])) {
    e.preventDefault();
    ziele[ziele.length - 1].focus();
  } else if (!e.shiftKey && (draussen || aktiv === ziele[ziele.length - 1])) {
    e.preventDefault();
    ziele[0].focus();
  }
}

/**
 * Tasten, solange ein Fenster offen ist. Gehört auf window in die Capture-Phase, also vor alle
 * anderen: Escape schliesst, Tab bleibt im Fenster. Die Tastenkürzel des Spiels dahinter (K, A, G,
 * Escape in main.ts, 1/2/3/0 im Hauptmenü) bekommen die Taste nicht. Enter und Leertaste auf
 * Knöpfen wirken weiter, sie sind kein Tastenkürzel. F5 geht durch: main.ts speichert damit statt
 * neu zu laden.
 */
export function fensterTaste(e: KeyboardEvent, fenster: HTMLElement | null, schliessen: () => void): void {
  if (!fenster || e.key === 'F5') return;
  e.stopImmediatePropagation();
  if (e.key === 'Escape') {
    e.preventDefault();
    schliessen();
  } else if (e.key === 'Tab') {
    halteFokusImFenster(e, fenster);
  }
}

/**
 * Tasten für ein Fenster, das in der Seite liegt (`.ov` der Gebäude-Seite): bindet fensterTaste in
 * der Capture-Phase, solange `ov` in der Seite hängt. Wird das Fenster anders entfernt als über
 * `schliessen` (Neuzeichnen der Seite, ein nächstes Fenster), löst sich der Hörer beim nächsten
 * Tastendruck selbst. Liegt die Seite versteckt hinter einer anderen, bleibt die Taste dem Spiel.
 * Gibt die Funktion zurück, die den Hörer löst (im `schliessen` des Fensters aufrufen).
 */
export function bindeFensterTasten(ov: HTMLElement, fenster: HTMLElement | null, schliessen: () => void): () => void {
  const hoerer = (e: KeyboardEvent) => {
    if (!ov.isConnected) {
      loesen();
      return;
    }
    if (ov.getClientRects().length === 0) return;
    fensterTaste(e, fenster, schliessen);
  };
  const loesen = () => window.removeEventListener('keydown', hoerer, true);
  window.addEventListener('keydown', hoerer, true);
  return loesen;
}

/**
 * Nach einem Klick, der ein Fenster öffnet oder schliesst: Der zweite Klick eines Doppelklicks (✕,
 * Hintergrund) träfe sonst, was jetzt dort liegt, und öffnete zum Beispiel eine Kachel. Schon sein
 * Druck nähme sonst den Fokus weg (etwa aus dem Suchfeld des Fundbuchs) und markierte Text.
 * Gilt 700 ms lang, bis ein neuer einfacher Druck (detail 1) kommt. Landet ein Druck auf einem
 * gesperrten Knopf, schickt Chromium nur pointerdown (immer mit detail 0), kein mousedown und keinen
 * Klick: Solange das hier gilt, nimmt auch ein solcher Druck den Fokus nicht weg.
 */
export function schluckeZweitenKlick(): void {
  const schlucke = (e: MouseEvent) => {
    if (e.detail > 1) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    window.removeEventListener('click', schlucke, true);
  };
  const halteBeiGesperrt = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest?.('button:disabled')) e.preventDefault();
  };
  const halte = (e: MouseEvent) => {
    if (e.detail > 1) e.preventDefault();
    else {
      window.removeEventListener('mousedown', halte, true);
      window.removeEventListener('pointerdown', halteBeiGesperrt, true);
    }
  };
  window.addEventListener('click', schlucke, true);
  window.addEventListener('mousedown', halte, true);
  window.addEventListener('pointerdown', halteBeiGesperrt, true);
  setTimeout(() => {
    window.removeEventListener('click', schlucke, true);
    window.removeEventListener('mousedown', halte, true);
    window.removeEventListener('pointerdown', halteBeiGesperrt, true);
  }, 700);
}

/**
 * Merkt sich, ob ein Druck auf dem Hintergrund begann. Der Hintergrund schliesst nur, wenn der
 * Klick dort begann und kein Doppelklick ist: Der zweite Klick eines Doppelklicks auf den Knopf,
 * der das Fenster öffnet, träfe sonst den eben geöffneten Hintergrund.
 */
export function hintergrundKlick(ov: HTMLElement): (e: MouseEvent) => boolean {
  let druckAufHintergrund = false;
  ov.addEventListener('pointerdown', e => {
    druckAufHintergrund = e.target === ov;
  });
  return e => e.target === ov && druckAufHintergrund && e.detail === 1;
}
