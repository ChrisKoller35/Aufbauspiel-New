// ─── Magic City – Reusable Header Renderer ─────────────────────
// Returns header HTML string for use across all screens.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { ScreenId } from '../ScreenRouter';
import { BUILDING_DEFS } from '../../data/buildings';
import { beiAuftragFertig } from '../../systems/Auftraege';

const HINWEIS_MS = 4000;
let hinweisTimer: number | null = null;

/** Kurzer Hinweis in jeder sichtbaren Kopfzeile, verschwindet von selbst (kein Popup). */
export function zeigeKopfHinweis(text: string): void {
  if (typeof document === 'undefined') return;
  const hdrs = document.querySelectorAll('.hdr');
  for (let i = 0; i < hdrs.length; i++) {
    const hdr = hdrs[i] as HTMLElement;
    let note = hdr.querySelector('.hdr-note') as HTMLElement | null;
    if (!note) {
      note = document.createElement('span');
      note.className = 'hdr-note';
      hdr.insertBefore(note, hdr.querySelector('.hdr-space'));
    }
    note.textContent = text;
  }
  if (hinweisTimer !== null) window.clearTimeout(hinweisTimer);
  hinweisTimer = window.setTimeout(() => {
    document.querySelectorAll('.hdr-note').forEach(n => n.remove());
    hinweisTimer = null;
  }, HINWEIS_MS);
}

beiAuftragFertig((b, recipe) => {
  zeigeKopfHinweis(`✔ ${recipe.name} fertig (${BUILDING_DEFS[b.typeId]?.name ?? b.typeId})`);
});

/**
 * Renders the standard header bar with logo, optional back button, and resource display.
 */
export function renderHeader(
  state: GameState,
  backTarget?: ScreenId,
  currentLabel?: string,
): string {
  const gold = state.globalStock['gold'] ?? 0;
  const wood = state.globalStock['wood'] ?? 0;
  const stone = state.globalStock['stone'] ?? 0;
  const bread = state.globalStock['bread'] ?? 0;
  const grain = state.globalStock['grain'] ?? 0;
  const iron = state.globalStock['iron_scrap'] ?? 0;
  const gems = state.globalStock['crystal_shard'] ?? 0;

  const backBtn = backTarget
    ? `<button class="btn-back hdr-back" data-nav="${backTarget}">← Zurück</button>`
    : '';

  const sep = currentLabel ? '<span class="hdr-sep">/</span>' : '';
  const label = currentLabel
    ? `<span class="hdr-cur">${currentLabel}</span>`
    : '';

  return `
    <div class="hdr">
      ${backBtn}
      <span class="hdr-logo">⚔ MAGIC CITY</span>
      ${sep}
      ${label}
      <div class="hdr-space"></div>
      <div class="res">
        <span>\uD83E\uDE99 ${gold.toLocaleString('de')}</span>
        <span>\uD83E\uDEB5 ${wood}</span>
        <span>\uD83E\uDEA8 ${stone}</span>
        <span>\uD83C\uDF5E ${bread}</span>
        <span>\uD83C\uDF3E ${grain}</span>
        <span>\u2699\uFE0F ${iron}</span>
        <span>\uD83D\uDC8E ${gems}</span>
        <span style="color:var(--mut)">Tag ${state.day}</span>
      </div>
    </div>`;
}

