// ============================================================
// Magic City – HTMLGuildUI
// Gildenhaus-Modal als native HTML-Version (kein Phaser).
// Erbt von HTMLPanel. 4 Tabs: Training | Roster | Inventar | Ehrentafel
// Tab-Implementierungen liegen in src/ui/html/guild/
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { GuildFighter } from '../../models/GuildRoster';
import { ClassDef } from '../../data/classes';
import { BUILDING_DEFS } from '../../data/buildings';
import { GearSystem } from '../../systems/GearSystem';
import { TalismanSystem } from '../../systems/TalismanSystem';

import { GuildTabContext } from './guild/GuildTabContext';
import { GuildTrainingTab } from './guild/GuildTrainingTab';
import { GuildRosterTab } from './guild/GuildRosterTab';
import { GuildInventoryTab } from './guild/GuildInventoryTab';
import { GuildScoreboardTab } from './guild/GuildScoreboardTab';
import { showClassDetailModal, showHeroDetailModal } from './guild/GuildModals';
import { closeDetailModal } from './guild/GuildTabHelpers';

// Possible tab types
type GuildTab = 'training' | 'roster' | 'inventory' | 'scoreboard';

// ── Callback type ─────────────────────────────────────────────
type ExpeditionCallback = (
  routeId: string,
  fighterIds: number[],
  difficulty: string,
  modifierId: string | null,
) => void;

export class HTMLGuildUI extends HTMLPanel {
  // ── External callbacks ────────────────────────────────────────
  public onClose?: () => void;
  public onStartExpedition?: ExpeditionCallback;

  // ── Party slots (set by CityScene) ────────────────────────────
  public partySlots: number = 3;

  // ── Internal state ────────────────────────────────────────────
  private gearSystem: GearSystem;
  private talismanSystem = new TalismanSystem();

  private activeTab: GuildTab = 'training';
  private selectedDifficulty: string = 'normal';
  private selectedModifier: string | null = null;
  private scoreboardRouteFilter: string | null = null;

  private heroInventoryOpen: Set<number> = new Set();
  private heroDetailsOpen: Set<number>   = new Set();
  private selectedFighterIds: Set<number> = new Set();

  private lastState: GameState | null = null;

  // ── DOM elements ──────────────────────────────────────────────
  private readonly tabButtons: Partial<Record<GuildTab, HTMLButtonElement>> = {};
  private readonly contentEl: HTMLElement;

  // ── Tab instances ─────────────────────────────────────────────
  private trainingTab!: GuildTrainingTab;
  private rosterTab!: GuildRosterTab;
  private inventoryTab!: GuildInventoryTab;
  private scoreboardTab!: GuildScoreboardTab;

  // ── Constants ─────────────────────────────────────────────────
  private static readonly PANEL_W = 900;
  private static readonly TAB_DEFS: { id: GuildTab; label: string }[] = [
    { id: 'training',   label: '⚒ Training' },
    { id: 'roster',     label: '⚔ Roster' },
    { id: 'inventory',  label: '📦 Inventar' },
    { id: 'scoreboard', label: '★ Ehrentafel' },
  ];

  constructor(_scene: unknown, gearSystem: GearSystem) {
    // ── Build root element ──────────────────────────────────────
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    root.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'transform: translate(-50%, -50%)',
      'width: 900px',
      'max-height: 80vh',
      'min-height: 400px',
      'display: flex',
      'flex-direction: column',
      'pointer-events: auto',
      'z-index: 100',
    ].join('; ');
    root.setAttribute('hidden', '');

    super(root);

    this.gearSystem = gearSystem;

    // ── Header ─────────────────────────────────────────────────
    const header = HTMLPanel.el('div', 'mc-panel-header');
    header.textContent = '⚔ Gildenhaus';
    root.appendChild(header);
    root.appendChild(HTMLPanel.closeBtn(() => this.hide()));

    // ── Tab bar ────────────────────────────────────────────────
    const tabBar = HTMLPanel.el('div', 'mc-tabs');
    for (const def of HTMLGuildUI.TAB_DEFS) {
      const btn = HTMLPanel.el('button', 'mc-tab');
      btn.textContent = def.label;
      btn.addEventListener('click', () => this.switchTab(def.id));
      this.tabButtons[def.id] = btn;
      tabBar.appendChild(btn);
    }
    root.appendChild(tabBar);

    // ── Scrollable content area ────────────────────────────────
    this.contentEl = HTMLPanel.el('div', 'mc-scroll');
    this.contentEl.style.cssText = [
      'flex: 1',
      'overflow-y: auto',
      'padding: 12px 16px 16px',
      'min-height: 0',
    ].join('; ');
    root.appendChild(this.contentEl);

    // ── Build tab context and instantiate tabs ─────────────────
    this.initTabs();
  }

  // ─── Context setup ────────────────────────────────────────────

  private buildContext(): GuildTabContext {
    // The context is a live view of the mutable fields on this class.
    // Using getters/setters ensures tabs always read the current value.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      get lastState()             { return self.lastState; },
      set lastState(v)            { self.lastState = v; },
      get selectedDifficulty()    { return self.selectedDifficulty; },
      set selectedDifficulty(v)   { self.selectedDifficulty = v; },
      get selectedModifier()      { return self.selectedModifier; },
      set selectedModifier(v)     { self.selectedModifier = v; },
      get scoreboardRouteFilter() { return self.scoreboardRouteFilter; },
      set scoreboardRouteFilter(v){ self.scoreboardRouteFilter = v; },
      get heroInventoryOpen()     { return self.heroInventoryOpen; },
      get heroDetailsOpen()       { return self.heroDetailsOpen; },
      get selectedFighterIds()    { return self.selectedFighterIds; },
      get partySlots()            { return self.partySlots; },

      gearSystem:     self.gearSystem,
      get talismanSystem() { return self.talismanSystem; },

      refresh() { if (self.lastState) self.renderActiveTab(self.lastState); },

      startTraining(state, classId, trainingDef) {
        const idle = state.citizens.find(c => c.status === 'IDLE');
        if (!idle) return;
        for (const [res, amt] of Object.entries(trainingDef.trainingCost)) {
          if ((state.globalStock[res] ?? 0) < amt) return;
        }
        for (const [res, amt] of Object.entries(trainingDef.trainingCost)) {
          state.globalStock[res] -= amt;
        }
        idle.status          = 'GUILD_TRAINING';
        idle.trainingClassId = classId;
        idle.trainingTimer   = trainingDef.trainingTimeSec;
      },

      retireFighter(state, fighter) {
        self.gearSystem.unequipAll(state, fighter);
        const citizen = state.citizens.find(c => c.fighterId === fighter.id);
        if (citizen) {
          citizen.status    = 'IDLE';
          citizen.fighterId = null;
        }
        const idx = state.fighters.findIndex(f => f.id === fighter.id);
        if (idx !== -1) state.fighters.splice(idx, 1);
        self.selectedFighterIds.delete(fighter.id);
        self.heroInventoryOpen.delete(fighter.id);
      },

      get onStartExpedition() { return self.onStartExpedition; },

      hidePanel() { self.hide(); },

      showClassDetailModal(cls: ClassDef) { showClassDetailModal(cls); },

      showHeroDetailModal(fighter: GuildFighter, state: GameState) {
        showHeroDetailModal(fighter, state, self.gearSystem);
      },
    };
  }

  private initTabs(): void {
    const ctx = this.buildContext();
    this.trainingTab   = new GuildTrainingTab(ctx);
    this.rosterTab     = new GuildRosterTab(ctx);
    this.inventoryTab  = new GuildInventoryTab();
    this.scoreboardTab = new GuildScoreboardTab(ctx);
  }

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Open the panel. Compatible with GuildUI.show(state, tab?).
   * Extended signature over the HTMLPanel base class.
   */
  show(state?: GameState, tab?: GuildTab): void {
    if (state) {
      if (tab) this.activeTab = tab;
      this.lastState = state;
      this.updateTabVisuals();
      this.renderActiveTab(state);
    }
    super.show();
  }

  hide(): void {
    this.scoreboardRouteFilter = null;
    closeDetailModal();
    super.hide();
    this.onClose?.();
  }

  isVisible(): boolean {
    return super.isVisible();
  }

  /** Manual refresh (e.g. after gear change from outside). */
  refresh(state: GameState): void {
    this.lastState = state;
    this.renderActiveTab(state);
  }

  /** No-op – HTML panels don't need camera updates. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* screen-space, no update needed */ }

  // ─── Tab management ───────────────────────────────────────────

  private switchTab(tab: GuildTab): void {
    this.activeTab = tab;
    this.updateTabVisuals();
    if (this.lastState) this.renderActiveTab(this.lastState);
  }

  private updateTabVisuals(): void {
    for (const def of HTMLGuildUI.TAB_DEFS) {
      const btn = this.tabButtons[def.id];
      if (!btn) continue;
      if (def.id === this.activeTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }

  private renderActiveTab(state: GameState): void {
    this.contentEl.innerHTML = '';
    switch (this.activeTab) {
      case 'training':   this.trainingTab.render(this.contentEl, state);   break;
      case 'roster':     this.rosterTab.render(this.contentEl, state);     break;
      case 'inventory':  this.inventoryTab.render(this.contentEl, state);  break;
      case 'scoreboard': this.scoreboardTab.render(this.contentEl, state); break;
    }
  }
}
