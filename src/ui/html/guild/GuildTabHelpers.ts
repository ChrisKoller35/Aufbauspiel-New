// ─── Magic City – GuildTabHelpers ────────────────────────────────────────────
// Shared DOM helper functions used by all Guild tab components.
// ─────────────────────────────────────────────────────────────────────────────

import { HTMLPanel } from '../HTMLPanel';

/** Creates a simple info text line. */
export function makeInfoText(text: string, colorClass = 'mc-label-dim'): HTMLElement {
  const el = HTMLPanel.el('div', `mc-text-md ${colorClass}`);
  el.style.marginBottom = '8px';
  el.textContent = text;
  return el;
}

/** Creates a red danger text line. */
export function makeDangerText(text: string): HTMLElement {
  return makeInfoText(text, 'mc-label-damage');
}

/** Creates a horizontal divider. */
export function makeDivider(): HTMLElement {
  const el = HTMLPanel.el('div', 'mc-divider');
  el.style.margin = '10px 0';
  return el;
}

/** Creates a golden section header with background. */
export function makeSectionHeader(text: string): HTMLElement {
  const el = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold mc-text-center');
  el.style.cssText = [
    'padding: 5px 10px',
    'background: var(--mc-navy-deep)',
    'border-radius: 4px',
    'border: 1px solid var(--mc-navy-separator)',
    'margin-bottom: 10px',
  ].join('; ');
  el.textContent = text;
  return el;
}

/** Translates English role IDs into German. */
export function translateRole(role: string): string {
  const map: Record<string, string> = {
    tank: 'Tank', dps: 'Angreifer', healer: 'Heiler', support: 'Support',
  };
  return map[role] ?? role;
}

/** Closes the detail overlay if one is open. */
export function closeDetailModal(): void {
  const existing = document.getElementById('mc-detail-overlay');
  if (existing) existing.remove();
}
