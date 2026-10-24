// ─── Magic City – Klang-Schalter (🔊 / 🔇, Taste M) ─────────────
import '../html/klang.css';
import { istStumm, setzeStumm } from '../../systems/Klang';

type TasteInfo = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey'> & {
  target: { tagName?: string; isContentEditable?: boolean } | null;
};

/** M schaltet stumm, aber nicht beim Tippen (input, textarea, select, contenteditable) und nicht mit Strg/Alt/Cmd. */
export function istStummTaste(e: TasteInfo): boolean {
  if (e.key !== 'm' && e.key !== 'M') return false;
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  const tag = e.target?.tagName?.toLowerCase();
  return !(tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable);
}

/** Hängt den Knopf an document.body (main.ts leert #app beim Start). */
export function zeigeKlangSchalter(): void {
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'klang-schalter';
  const zeichnen = () => {
    knopf.textContent = istStumm() ? '🔇' : '🔊';
    knopf.setAttribute('aria-label', istStumm() ? 'Ton an' : 'Ton aus');
  };
  const umschalten = () => {
    setzeStumm(!istStumm());
    zeichnen();
    // Laufendes Truhen-Video (ChestRevealOverlay.ts) gleich mit stummschalten
    if (istStumm()) document.querySelectorAll('video').forEach(v => { v.muted = true; });
  };
  knopf.addEventListener('click', umschalten);
  window.addEventListener('keydown', e => { if (istStummTaste(e as unknown as TasteInfo)) umschalten(); });
  zeichnen();
  document.body.appendChild(knopf);
}
