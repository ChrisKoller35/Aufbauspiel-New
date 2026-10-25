// ─── Magic City – Klang-Schalter (🔊 / 🔇, Taste M) ─────────────
// Ein Knopf in jeder Kopfzeile (HeaderRenderer.ts renderHeader, vor 🏅) und im Kopf des
// Kampfs (CombatScreen.ts buildDOM, neben x1/x1.5/x2): Dort liegt er über nichts. Ein
// Klick-Hörer und die Taste M für alle Knöpfe (bindeKlangSchalter, aus klang.ts).
// ────────────────────────────────────────────────────────────────

import '../html/klang.css';
import { istStumm, setzeStumm } from '../../systems/Klang';

export type TasteInfo = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey'> & {
  repeat?: boolean;
  target: { tagName?: string; isContentEditable?: boolean } | null;
};

/**
 * M schaltet stumm, aber nicht beim Tippen (input, textarea, select, contenteditable), nicht mit Strg/Alt/Cmd
 * und nicht beim Halten (die Tastenwiederholung schaltete sonst hin und her).
 */
export function istStummTaste(e: TasteInfo): boolean {
  if (e.key !== 'm' && e.key !== 'M') return false;
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return false;
  const tag = e.target?.tagName?.toLowerCase();
  return !(tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable);
}

const zeichen = (): string => (istStumm() ? '🔇' : '🔊');
const name = (): string => (istStumm() ? 'Ton an' : 'Ton aus');

/** Der Knopf als HTML; `klasse` gibt ihm das Aussehen seiner Kopfzeile. */
export function klangKnopfHtml(klasse: string): string {
  return `<button type="button" class="${klasse} klang-knopf" aria-label="${name()}" title="${name()} (M)">${zeichen()}</button>`;
}

/** Schaltet um und setzt Zeichen und Namen an allen Knöpfen neu, auch am versteckten im Kampf. */
export function schalteKlang(): void {
  setzeStumm(!istStumm());
  document.querySelectorAll<HTMLElement>('.klang-knopf').forEach(k => {
    k.textContent = zeichen();
    k.setAttribute('aria-label', name());
    k.title = `${name()} (M)`;
  });
  // Das Truhen-Video (ChestRevealOverlay.ts) hat eigenen Ton
  document.querySelectorAll('video').forEach(v => { v.muted = istStumm(); });
}

/** Einmal aufrufen (klang.ts). M wirkt nicht, solange ein Fenster offen ist (FensterHilfen.ts fensterTaste). */
export function bindeKlangSchalter(): void {
  document.addEventListener('click', e => {
    if ((e.target as Element | null)?.closest?.('.klang-knopf')) schalteKlang();
  });
  window.addEventListener('keydown', e => { if (istStummTaste(e as unknown as TasteInfo)) schalteKlang(); });
}
