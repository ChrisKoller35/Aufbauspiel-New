// ─── Magic City – Reusable Header Renderer ─────────────────────
// Returns header HTML string for use across all screens.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { ScreenId } from '../ScreenRouter';

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

