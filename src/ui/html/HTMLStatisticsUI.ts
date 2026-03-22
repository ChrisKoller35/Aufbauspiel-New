// ============================================================
// Magic City – HTMLStatisticsUI
// Zeigt alle gesammelten Spielstatistiken in einem HTML-Modal.
// Tastenkuerzel: T toggelt Sichtbarkeit.
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';

const STAT_DEFINITIONS: { key: string; label: string }[] = [
  { key: 'total_gold_earned',          label: 'Gesamtes Gold verdient' },
  { key: 'total_enemies_killed',       label: 'Gegner besiegt' },
  { key: 'total_bosses_killed',        label: 'Bosse besiegt' },
  { key: 'total_expeditions',          label: 'Expeditionen gesamt' },
  { key: 'total_victories',            label: 'Siege' },
  { key: 'total_defeats',              label: 'Niederlagen' },
  { key: 'total_retreats',             label: 'Rueckzuege' },
  { key: 'total_buildings_built',      label: 'Gebaeude errichtet' },
  { key: 'total_buildings_demolished', label: 'Gebaeude abgerissen' },
  { key: 'total_citizens_born',        label: 'Buerger geboren' },
  { key: 'total_days_survived',        label: 'Tage ueberlebt' },
  { key: 'total_items_crafted',        label: 'Gegenstaende hergestellt' },
];

export class HTMLStatisticsUI extends HTMLPanel {
  public onClose?: () => void;

  private readonly listEl: HTMLElement;
  private readonly footerEl: HTMLElement;

  private boundKeyHandler: (e: KeyboardEvent) => void;

  constructor() {
    // Root element: centered modal
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    root.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'transform: translate(-50%, -50%)',
      'width: 500px',
      'max-height: 480px',
      'display: flex',
      'flex-direction: column',
      'pointer-events: auto',
    ].join('; ');
    root.setAttribute('hidden', '');

    super(root);

    // ── Header ──────────────────────────────────────────────
    const header = HTMLPanel.el('div', 'mc-panel-header');
    header.textContent = '\u{1F4CA} Statistiken';
    root.appendChild(header);
    root.appendChild(HTMLPanel.closeBtn(() => this.hide()));

    // ── Scrollable content ───────────────────────────────────
    const scroll = HTMLPanel.el('div', 'mc-scroll');
    scroll.style.cssText = 'padding: 12px 16px; flex: 1; overflow-y: auto;';
    root.appendChild(scroll);

    this.listEl = HTMLPanel.el('div');
    scroll.appendChild(this.listEl);

    // ── Footer ───────────────────────────────────────────────
    const footerWrap = HTMLPanel.el('div');
    footerWrap.style.cssText = 'padding: 6px 16px 10px; border-top: 1px solid var(--mc-navy-separator);';
    this.footerEl = HTMLPanel.el('div', 'mc-label-dim mc-text-sm mc-text-center');
    footerWrap.appendChild(this.footerEl);
    root.appendChild(footerWrap);

    // ── Keyboard shortcut (T) ────────────────────────────────
    this.boundKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') {
        if (this.isVisible()) {
          this.hide();
        } else {
          // show() without state is a no-op; caller must supply state
          // The T-key toggle is handled by the caller (UIManager / CityScene)
          // Here we only close – opening requires a state reference.
        }
      }
    };
    window.addEventListener('keydown', this.boundKeyHandler);
  }

  /** Befuellt die Statistiken-Liste und zeigt das Modal. */
  show(state?: GameState): void {
    if (state) this.rebuildList(state);
    super.show();
  }

  hide(): void {
    super.hide();
    this.onClose?.();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyHandler);
    super.destroy();
  }

  // ─── Privat ─────────────────────────────────────────────

  private rebuildList(state: GameState): void {
    this.listEl.innerHTML = '';

    const stats = state.statistics ?? {};

    // Grid: label left, value right – one row per stat
    const table = HTMLPanel.el('div');
    table.style.cssText = 'display: grid; grid-template-columns: 1fr auto; gap: 2px 16px;';

    for (const def of STAT_DEFINITIONS) {
      const value = stats[def.key] ?? 0;

      const label = HTMLPanel.el('span', 'mc-label-dim mc-text-md');
      label.textContent = def.label + ':';
      label.style.paddingTop = '5px';

      const val = HTMLPanel.el('span', value > 0 ? 'mc-bold mc-text-md' : 'mc-label-dim mc-text-md');
      val.textContent = String(value);
      val.style.cssText = 'text-align: right; padding-top: 5px; color: ' +
        (value > 0 ? 'var(--mc-light)' : 'var(--mc-disabled)');

      table.appendChild(label);
      table.appendChild(val);
    }

    this.listEl.appendChild(table);

    // Footer text
    this.footerEl.textContent = `Tag ${state.day} \u2013 Statistiken werden laufend aktualisiert`;
  }
}
