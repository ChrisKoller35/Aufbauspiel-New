// ============================================================
// Magic City – HTMLExpeditionUI (Orchestrator)
// Verwaltet das DOM-Skelett und koordiniert die Sub-Renderer:
//   - ExpeditionOverviewRenderer  → Raum-Streifen, Party, Gegner, Log
//   - ExpeditionActionsRenderer   → Buttons, Händler, Checkpoint, Choice
//   - CombatViewRenderer          → Inline-Kampf-View + State
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { ExpeditionSystem } from '../../systems/ExpeditionSystem';
import type { HTMLCombatOverlay } from './HTMLCombatOverlay';
import { ExpeditionOverviewRenderer } from './ExpeditionOverviewRenderer';
import { CombatViewRenderer } from './CombatViewRenderer';
import { ExpeditionActionsRenderer } from './ExpeditionActionsRenderer';

export class HTMLExpeditionUI extends HTMLPanel {
  /** Callback: wird aufgerufen wenn das Panel geschlossen wird */
  public onClose?: () => void;

  // ── Sub-Renderer ──
  private readonly overviewRenderer: ExpeditionOverviewRenderer;
  private readonly combatRenderer:   CombatViewRenderer;
  private readonly actionsRenderer:  ExpeditionActionsRenderer;

  // ── Shared state ──
  private lastState: GameState | null = null;
  private combatOverlay: HTMLCombatOverlay | null = null;

  // ── DOM-Bereiche ──
  private readonly roomStripEl:      HTMLElement;
  private readonly mainColsEl:       HTMLElement;
  private readonly logEl:            HTMLElement;
  private readonly actionsEl:        HTMLElement;
  private readonly blockingOverlayEl: HTMLElement;

  constructor(expeditionSystem: ExpeditionSystem) {
    // ── Root: Vollbild-Modal mit Expedition-Akzentfarbe ──────
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    root.style.cssText = [
      'position: absolute',
      'top: 56px',
      'right: 5%',
      'bottom: 82px',
      'left: calc(72px + 5%)',
      'display: flex',
      'flex-direction: column',
      'pointer-events: auto',
      'border-color: var(--mc-accent-expedition)',
      'background: #1a0f14',
      'overflow: hidden',
      'border-radius: 8px',
      'max-width: 1200px',
      'margin: 0 auto',
    ].join('; ');
    root.setAttribute('hidden', '');

    super(root);

    // ── Header ───────────────────────────────────────────────
    const header = HTMLPanel.el('div', 'mc-panel-header');
    header.style.cssText = [
      'border-color: var(--mc-accent-expedition)',
      'color: var(--mc-accent-expedition)',
    ].join('; ');
    header.textContent = 'Expedition';
    root.appendChild(header);

    const closeBtn = HTMLPanel.closeBtn(() => this.hide());
    root.appendChild(closeBtn);

    // ── Raum-Streifen ─────────────────────────────────────────
    this.roomStripEl = HTMLPanel.el('div');
    this.roomStripEl.style.cssText = [
      'padding: 6px 16px 4px',
      'background: #0e0b10',
      'border-bottom: 1px solid #2a1a20',
      'flex-shrink: 0',
    ].join('; ');
    root.appendChild(this.roomStripEl);

    // ── Hauptbereich: zwei Spalten ────────────────────────────
    this.mainColsEl = HTMLPanel.el('div');
    this.mainColsEl.style.cssText = [
      'display: grid',
      'grid-template-columns: 1fr 1fr',
      'gap: 0',
      'padding: 10px 16px',
      'flex: 1 1 auto',
      'overflow-y: auto',
      'min-height: 0',
    ].join('; ');
    root.appendChild(this.mainColsEl);

    // ── Trennlinie ────────────────────────────────────────────
    const divider = HTMLPanel.el('div', 'mc-divider');
    divider.style.margin = '0 16px';
    root.appendChild(divider);

    // ── Kampfprotokoll ────────────────────────────────────────
    const logLabel = HTMLPanel.el('div', 'mc-label-dim mc-text-sm');
    logLabel.style.cssText = 'padding: 4px 16px 2px; flex-shrink: 0; font-weight: bold;';
    logLabel.textContent = '── Kampfprotokoll ──';
    root.appendChild(logLabel);

    this.logEl = HTMLPanel.el('div', 'mc-scroll');
    this.logEl.style.cssText = [
      'flex: 0 0 auto',
      'min-height: 60px',
      'max-height: 120px',
      'padding: 4px 16px 6px',
      'overflow-y: auto',
    ].join('; ');
    root.appendChild(this.logEl);

    // ── Aktions-Buttons ───────────────────────────────────────
    this.actionsEl = HTMLPanel.el('div');
    this.actionsEl.style.cssText = [
      'padding: 8px 16px 10px',
      'border-top: 1px solid #2a1a20',
      'display: flex',
      'flex-wrap: wrap',
      'gap: 8px',
      'align-items: flex-start',
      'flex-shrink: 0',
    ].join('; ');
    root.appendChild(this.actionsEl);

    // ── Blocking Overlay (während CombatOverlay aktiv) ────────
    this.blockingOverlayEl = HTMLPanel.el('div');
    this.blockingOverlayEl.style.cssText = [
      'display: none',
      'position: absolute',
      'inset: 0',
      'background: rgba(0,0,0,0.65)',
      'z-index: 5',
      'border-radius: 8px',
    ].join('; ');
    root.appendChild(this.blockingOverlayEl);

    // ── Renderer instanziieren ────────────────────────────────
    this.overviewRenderer = new ExpeditionOverviewRenderer(
      expeditionSystem,
      () => this.lastState,
      (state) => this.refresh(state),
    );

    this.combatRenderer = new CombatViewRenderer(
      expeditionSystem,
      this.overviewRenderer,
      () => this.hide(),
      (state) => this.refresh(state),
    );

    this.actionsRenderer = new ExpeditionActionsRenderer(
      expeditionSystem,
      this.combatRenderer,
      () => this.combatOverlay,
      () => this.el,
      () => this.hide(),
      (state) => this.refresh(state),
    );
  }

  // ─── Öffentliche API ──────────────────────────────────────

  show(state?: GameState): void {
    if (state) {
      this.lastState = state;
      this.refresh(state);
    } else if (this.lastState) {
      this.refresh(this.lastState);
    }
    super.show();
  }

  hide(): void {
    this.combatRenderer.reset();
    super.hide();
    this.onClose?.();
  }

  setCombatOverlay(overlay: HTMLCombatOverlay): void {
    this.combatOverlay = overlay;
  }

  /** No-op – HTML-Panels sind immer im Screen-Space. */
  updatePosition(_cam: unknown): void { /* no-op */ }

  // ─── Refresh ──────────────────────────────────────────────

  private refresh(state: GameState): void {
    this.lastState = state;
    const run = state.activeExpedition;

    if (!run) {
      this.roomStripEl.innerHTML = '';
      this.mainColsEl.innerHTML = '<div style="padding:20px;color:var(--mc-dim)">Keine aktive Expedition.</div>';
      this.logEl.innerHTML = '';
      this.actionsEl.innerHTML = '';
      return;
    }

    this.overviewRenderer.buildRoomStrip(this.roomStripEl, run);
    this.overviewRenderer.buildMainCols(this.mainColsEl, run, state);
    this.overviewRenderer.buildLog(this.logEl, run);
    this.actionsRenderer.buildActions(
      this.actionsEl, run, state,
      this.mainColsEl, this.roomStripEl, this.logEl,
    );
  }

  destroy(): void {
    super.destroy();
  }
}
