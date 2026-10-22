// ─── Magic City – Erklärung in der Mindmap ──────────────────────
// Der kleine Kasten beim Darüberfahren (Maus), langen Drücken (Touch)
// oder Fokus: Titel und Zeilen aus MindmapTexte.erklaerung. Er folgt
// den Zahlen, solange er offen ist, und verschwindet mit seinem Kasten.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { erklaerung } from './MindmapTexte';

function escape(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Zu welchem Kasten die offene Erklärung gehört (je Reiter), damit sie mit den Zahlen mitgeht. */
const tippZiel = new WeakMap<HTMLElement, HTMLElement>();

function tippHTML(state: GameState, el: HTMLElement): string | null {
  const id = el.dataset.knoten;
  if (!id) return null;
  const e = erklaerung(state, id);
  return `<b>${escape(e.titel)}</b>${e.zeilen.map(z => `<span>${escape(z)}</span>`).join('')}`;
}

/** Unter den Kasten, sonst darüber; immer ganz im Fenster. */
function legeTipp(tip: HTMLElement, el: HTMLElement): void {
  const r = el.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const top = r.bottom + 8 + h <= window.innerHeight ? r.bottom + 8 : Math.max(8, r.top - h - 8);
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

export function zeigeTipp(panel: HTMLElement, el: HTMLElement, state: GameState): void {
  const tip = panel.querySelector('.pk-tip') as HTMLElement | null;
  const html = tippHTML(state, el);
  if (!tip || html === null) return;
  tip.innerHTML = html;
  tip.hidden = false;
  tippZiel.set(panel, el);
  legeTipp(tip, el);
}

export function versteckeTipp(panel: HTMLElement): void {
  const tip = panel.querySelector('.pk-tip') as HTMLElement | null;
  if (tip) tip.hidden = true;
  tippZiel.delete(panel);
}

/**
 * Offene Erklärung mit den neuen Zahlen auffrischen (Chips und Karten bleiben stehen, es kommt
 * also kein neues «Maus darüber»). Ist ihr Kasten verschwunden, verschwindet sie auch.
 */
export function frischeTippAuf(panel: HTMLElement, state: GameState): void {
  const tip = panel.querySelector('.pk-tip') as HTMLElement | null;
  const el = tippZiel.get(panel);
  if (!tip || !el || tip.hidden) return;
  const html = el.isConnected && panel.contains(el) ? tippHTML(state, el) : null;
  if (html === null) {
    versteckeTipp(panel);
    return;
  }
  if (tip.innerHTML === html) return;
  tip.innerHTML = html;
  legeTipp(tip, el);
}
