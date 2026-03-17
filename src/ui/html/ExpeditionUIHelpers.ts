// ============================================================
// Magic City – ExpeditionUIHelpers
// Pure helper functions extracted from HTMLExpeditionUI.
// No class state, no side effects – all functions are stateless.
// ============================================================

import { ExpeditionRun } from '../../models/ExpeditionRun';

// ─── Raum-Typ Symbole & Farben ────────────────────────────────

export interface RoomStyle {
  symbol: string;
  color: string;   // CSS-Farbe für Hintergrund der Icon-Box
  label: string;   // Tooltip/aria-label
}

export function getRoomStyle(type: string): RoomStyle {
  switch (type) {
    case 'combat':     return { symbol: '⚔', color: '#7f1d1d', label: 'Kampf' };
    case 'boss':       return { symbol: 'B', color: '#4c0519', label: 'Boss' };
    case 'rest':       return { symbol: '+', color: '#14532d', label: 'Rast' };
    case 'hazard':     return { symbol: '!', color: '#713f12', label: 'Gefahr' };
    case 'checkpoint': return { symbol: 'C', color: '#1e3a5f', label: 'Checkpoint' };
    case 'find':       return { symbol: '?', color: '#713f12', label: 'Fund' };
    case 'merchant':   return { symbol: '$', color: '#78350f', label: 'Händler' };
    case 'survivor':   return { symbol: 'S', color: '#14532d', label: 'Überlebender' };
    default:           return { symbol: '?', color: '#1e1f23', label: 'Unbekannt' };
  }
}

// ─── Status-Label Hilfsfunktion ───────────────────────────────

export function statusClass(status: ExpeditionRun['status']): string {
  switch (status) {
    case 'victory':  return 'mc-label-heal';
    case 'defeat':   return 'mc-label-damage';
    case 'retreat':  return 'mc-label-bright';
    default:         return 'mc-label-dim';
  }
}

// ─── HP-Balken-Klasse je nach Prozent ────────────────────────

export function hpBarClass(pct: number): 'mc-bar-hp' | 'mc-bar-atk' | 'mc-bar-def' {
  // Wir missbrauchen die vorhandenen Bar-Klassen für HP-Farb-Abstufung:
  // >50% = grün (mc-bar-hp), >20% = orange (mc-bar-def), ≤20% = rot (mc-bar-atk)
  if (pct > 0.5) return 'mc-bar-hp';
  if (pct > 0.2) return 'mc-bar-def';
  return 'mc-bar-atk';
}

// ─── Button-Helper ────────────────────────────────────────────

/**
 * Erstellt einen Aktions-Button im mc-btn-Stil.
 * variant: 'normal' | 'danger' | 'success' | 'dark' | 'expedition'
 */
export function makeButton(
  label: string,
  variant: 'normal' | 'danger' | 'success' | 'dark' | 'expedition',
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'mc-btn';
  btn.textContent = label;
  btn.addEventListener('click', onClick);

  // Varianten-spezifisches Styling überschreibt mc-btn Defaults
  switch (variant) {
    case 'danger':
      btn.classList.add('danger');
      break;
    case 'success':
      btn.classList.add('success');
      break;
    case 'expedition':
      // Expedition-Akzentfarbe: roter Rahmen + Schrift
      btn.style.cssText = [
        'border-color: var(--mc-accent-expedition)',
        'color: var(--mc-accent-expedition)',
        'background: #2a0d14',
      ].join('; ');
      break;
    case 'dark':
      // Noch dunkler als Standard mc-btn
      btn.style.cssText = 'background: var(--mc-btn-dark); color: var(--mc-dim);';
      break;
    // 'normal' nutzt mc-btn Default
  }

  return btn;
}

/**
 * Kleiner "Nutzen"-Button (für Provisions-Liste).
 */
export function makeSmallButton(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'mc-btn';
  btn.textContent = label;
  btn.style.cssText = [
    'padding: 2px 8px',
    'font-size: var(--mc-font-size-xs)',
    'border-color: var(--mc-accent-expedition)',
    'color: var(--mc-accent-expedition)',
    'flex-shrink: 0',
  ].join('; ');
  btn.addEventListener('click', onClick);
  return btn;
}

// ─── Sektion-Header ───────────────────────────────────────────

/**
 * Erstellt einen kleinen Abschnitts-Header "── Titel ──".
 * colorClass: z.B. 'mc-label-info', 'mc-label-damage', etc.
 */
export function buildSectionHeader(text: string, colorClass: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `mc-text-sm mc-bold ${colorClass}`;
  el.style.cssText = 'padding: 2px 0 1px; border-bottom: 1px solid #2a1a20; margin-bottom: 2px;';
  el.textContent = `── ${text} ──`;
  return el;
}
