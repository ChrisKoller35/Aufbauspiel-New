// ─── Magic City – UIManager ───────────────────────────────────────
// Owns and wires all UI components. Emits EventBus events instead
// of having CityScene manually connect every callback.
// ──────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { EventBus } from '../systems/EventBus';
import { GearSystem } from '../systems/GearSystem';
import { ExpeditionSystem } from '../systems/ExpeditionSystem';
import { SoundManager } from '../systems/SoundManager';
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem';

import { BuildMode } from './html/HTMLBuildMenu';
import { HTMLCombatOverlay } from './html/HTMLCombatOverlay';
import { SidebarAction } from './html/HTMLSidebar';
import { TutorialOverlay } from './TutorialOverlay';
import { CityEventBanner } from './CityEventBanner';

// ── HTML UI components (Phase 2-3: always-visible bars) ──
import { HTMLHUD } from './html/HTMLHUD';
import { HTMLSidebar } from './html/HTMLSidebar';
import { HTMLStatusBar } from './html/HTMLStatusBar';
import { HTMLVolumeUI } from './html/HTMLVolumeUI';
import { HTMLStatisticsUI } from './html/HTMLStatisticsUI';
import { HTMLAchievementUI } from './html/HTMLAchievementUI';

// ── HTML UI components (Phase 4-6: panels & modals) ──
import { HTMLBuildMenu } from './html/HTMLBuildMenu';
import { HTMLBuildingPanel } from './html/HTMLBuildingPanel';
import { HTMLGuildUI } from './html/HTMLGuildUI';
import { HTMLExpeditionUI } from './html/HTMLExpeditionUI';
import { HTMLStorageUI } from './html/HTMLStorageUI';
import { HTMLDungeonMapUI } from './html/HTMLDungeonMapUI';
import { HTMLBestiariumUI } from './html/HTMLBestiariumUI';
import { HTMLNpcPanel } from './html/HTMLNpcPanel';
import { HTMLChestUI } from './html/HTMLChestUI';
import { ItemTooltip } from './html/ItemTooltip';
import { ItemDetailModal } from './html/ItemDetailModal';

// ─── Dependencies passed to UIManager ────────────────────────────

/** Minimal sound interface for UIManager (allows stub when no Phaser). */
export interface SoundManagerLike {
  getSFXVolume(): number;
  getMusicVolume(): number;
  setSFXVolume(v: number): void;
  setMusicVolume(v: number): void;
  playSFX(key: string): void;
}

export interface UIManagerDeps {
  scene?: Phaser.Scene;          // optional — nur für TutorialOverlay + CityEventBanner
  bus: EventBus;
  gameState: GameState;
  gearSystem?: GearSystem;       // optional — 3D-Modus braucht kein Gear
  expeditionSystem?: ExpeditionSystem;
  soundManager?: SoundManagerLike;
  buildingUpgradeSystem?: BuildingUpgradeSystem;
  onSaveRequest?: () => void;
}

// ─── UIManager Class ─────────────────────────────────────────────

export class UIManager {
  private scene: Phaser.Scene | null;
  private bus: EventBus;

  // ── HTML UI components (Phase 2-3) ──
  readonly hud: HTMLHUD;
  readonly sidebar: HTMLSidebar;
  readonly statusBar: HTMLStatusBar;
  readonly volumeUI: HTMLVolumeUI;
  readonly statisticsUI: HTMLStatisticsUI;
  readonly achievementUI: HTMLAchievementUI;

  // ── HTML UI components (Phase 4-6: panels & modals) ──
  readonly buildMenu: HTMLBuildMenu;
  readonly buildingPanel: HTMLBuildingPanel;
  readonly guildUI: HTMLGuildUI;
  readonly expeditionUI: HTMLExpeditionUI;
  readonly storageUI: HTMLStorageUI;
  readonly dungeonMapUI: HTMLDungeonMapUI;
  readonly bestiariumUI: HTMLBestiariumUI;
  readonly npcPanel: HTMLNpcPanel;
  readonly chestUI: HTMLChestUI;

  // ── HTML UI components (migrated from Phaser canvas) ──
  readonly combatOverlay: HTMLCombatOverlay;
  readonly tutorialOverlay: TutorialOverlay;
  readonly cityEventBanner: CityEventBanner;

  // ── Build selection state ──
  private _selectedBuildingType: string | null = null;
  private _windowKeydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(deps: UIManagerDeps) {
    this.scene = deps.scene ?? null;
    this.bus = deps.bus;
    ItemTooltip.init();
    ItemDetailModal.init();

    const { scene, gameState, gearSystem, expeditionSystem, soundManager, buildingUpgradeSystem, onSaveRequest } = deps;

    // ── 1. Instantiate all UI components ──

    // ── HTML components (Phase 2-3: screen-space, no camera jitter) ──

    // HUD (top bar)
    this.hud = new HTMLHUD();
    this.hud.refresh(gameState);
    this.hud.onThemeChanged = (theme) => {
      gameState.uiTheme = theme;
    };

    // Sidebar (left)
    this.sidebar = new HTMLSidebar();
    this.sidebar.onExportMap = () => {
      const tiles = gameState.swampTiles ?? {};
      const entries = Object.entries(tiles)
        .map(([k, v]) => `'${k}': ${v}`)
        .join(', ');
      const text = `{ ${entries} }`;
      navigator.clipboard.writeText(text).catch(() => { /* ignore */ });
    };

    // Status bar (bottom bar)
    this.statusBar = new HTMLStatusBar();
    this.statusBar.onSave = onSaveRequest;

    // Volume UI (top-right corner modal)
    this.volumeUI = new HTMLVolumeUI();
    if (soundManager) {
      this.volumeUI.onVolumeChange = (sfx, music) => {
        soundManager.setSFXVolume(sfx);
        soundManager.setMusicVolume(music);
      };
    }
    // M key: open Volume UI with current volumes (closing is handled inside HTMLVolumeUI)
    // K key: open Bestiarium
    // Stored as field so destroy() can remove it cleanly on scene restart.
    this._windowKeydownHandler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if ((e.key === 'm' || e.key === 'M') && !this.volumeUI.isVisible()) {
        if (soundManager) {
          this.volumeUI.setVolumes(soundManager.getSFXVolume(), soundManager.getMusicVolume());
        }
        this.volumeUI.show();
      }
      if ((e.key === 'k' || e.key === 'K') && !this.bestiariumUI.isVisible()) {
        this.bestiariumUI.open(gameState);
      }
    };
    window.addEventListener('keydown', this._windowKeydownHandler);

    // Statistics UI (modal)
    this.statisticsUI = new HTMLStatisticsUI();

    // Achievement UI (modal)
    this.achievementUI = new HTMLAchievementUI();

    // ── HTML components (Phase 4-6: panels & modals) ──

    // Build menu (bottom palette)
    this.buildMenu = new HTMLBuildMenu();

    // Building info panel (right side)
    this.buildingPanel = new HTMLBuildingPanel();

    // Guild UI (modal, 4 tabs) — gearSystem only needed when panel is opened
    this.guildUI = new HTMLGuildUI(null, gearSystem as GearSystem);

    // Expedition UI (full-screen overlay) — expeditionSystem only needed when panel is opened
    this.expeditionUI = new HTMLExpeditionUI(expeditionSystem as ExpeditionSystem);

    // Storage UI (modal)
    this.storageUI = new HTMLStorageUI();

    // Dungeon Map UI (modal)
    this.dungeonMapUI = new HTMLDungeonMapUI();
    if (buildingUpgradeSystem) {
      this.dungeonMapUI.partySlots = buildingUpgradeSystem.getPartySlots(gameState);
    }

    // Bestiarium UI (modal, Hotkey: K)
    this.bestiariumUI = new HTMLBestiariumUI();
    this.bestiariumUI.onClose = () => {};

    // NPC Panel (modal)
    this.npcPanel = new HTMLNpcPanel();
    this.npcPanel.onClose = () => {};

    // Treasure Chest UI (modal)
    this.chestUI = new HTMLChestUI();
    this.chestUI.onClose = () => {};
    this.chestUI.onCollect = (state) => {
      this.refreshHUD(state);
    };

    // ── Phaser components (stays Canvas: animations/particles) ──

    // Combat overlay (HTML: CSS animations, identische Schärfe wie ExpeditionUI)
    this.combatOverlay = new HTMLCombatOverlay(scene ?? null);
    if (expeditionSystem) {
      this.combatOverlay.setExpeditionContext(expeditionSystem, gameState);
    }
    if (soundManager) {
      this.combatOverlay.setSoundManager(soundManager as SoundManager);
    }
    this.expeditionUI.setCombatOverlay(this.combatOverlay);

    // Tutorial overlay + City event banner: only created when Phaser scene is available.
    // Without scene, null-object stubs are used (no-op, never visible).
    if (scene) {
      this.tutorialOverlay = new TutorialOverlay(scene);
      this.cityEventBanner = new CityEventBanner(scene);
    } else {
      this.tutorialOverlay = UIManager.createNullTutorialOverlay();
      this.cityEventBanner = UIManager.createNullCityEventBanner();
    }

    // ── 2. Wire callbacks to EventBus ──
    this.wireCallbacks(gameState);
  }

  // ─── Callback Wiring ──────────────────────────────────────────

  private wireCallbacks(gameState: GameState): void {
    const bus = this.bus;

    // BuildingPanel: demolish / upgrade
    this.buildingPanel.onDemolish = (id) => {
      bus.emit('building:demolished', { buildingId: id });
      this.buildingPanel.hide();
    };
    this.buildingPanel.onUpgrade = (id) => {
      bus.emit('building:upgraded', { buildingId: id });
    };

    // GuildUI: start expedition
    this.guildUI.onStartExpedition = (routeId, fighterIds, difficulty, modifierId) => {
      bus.emit('expedition:started', {
        routeId, fighterIds, difficulty, modifierId,
        fromDungeon: false,
      });
    };

    // CombatOverlay: pre-combat target selection
    this.combatOverlay.onPreCombatTarget = (enemyId) => {
      bus.emit('expedition:combatTarget', { enemyId });
    };

    // ExpeditionUI: expedition finalized (close = return)
    this.expeditionUI.onClose = () => {
      bus.emit('expedition:returned', {});
    };

    // BuildMenu: building type selection
    this.buildMenu.onSelectBuilding = (typeId) => {
      this._selectedBuildingType = typeId;
      bus.emit('mode:buildingSelected', { typeId });
    };

    // BuildMenu: mode change
    this.buildMenu.onModeChange = (mode) => {
      const prev = this.buildMenu.currentMode;
      this._selectedBuildingType = null;
      bus.emit('mode:changed', { mode, previousMode: prev });
    };

    // Sidebar: action buttons → EventBus (HTMLSidebar delegates through here)
    this.sidebar.onAction = (action) => {
      bus.emit('sidebar:action', { action });
    };
    // Note: HTMLSidebar manages its own active state visually via setActive().

    // StorageUI: close
    this.storageUI.onClose = () => {
      bus.emit('ui:panel:close', { panel: 'storage' });
    };

    // TutorialOverlay: completed
    this.tutorialOverlay.onComplete = () => {
      bus.emit('tutorial:completed', {});
    };

    // CityEventBanner: accept trade
    this.cityEventBanner.onAcceptTrade = () => {
      bus.emit('cityevent:tradeAccepted', {});
    };

    // DungeonMapUI: start expedition from dungeon
    this.dungeonMapUI.onStartExpedition = (routeId, fighterIds, difficulty, modifierId, consumables) => {
      bus.emit('expedition:started', {
        routeId, fighterIds, difficulty, modifierId,
        fromDungeon: true,
        consumables,
      });
    };
  }

  // ─── Public API ────────────────────────────────────────────────

  /** Selected building type in build mode. */
  get selectedBuildingType(): string | null { return this._selectedBuildingType; }
  set selectedBuildingType(v: string | null) { this._selectedBuildingType = v; }

  /** Reposition all UI panels relative to camera. Called every frame.
   *  HTML panels (hud, sidebar, statusBar, volumeUI, statisticsUI, achievementUI)
   *  are screen-space and their updatePosition() is a no-op — skipped for clarity.
   *  Only Phaser canvas panels still need camera-relative repositioning. */
  updatePositions(cam: Phaser.Cameras.Scene2D.Camera): void {
    // Phaser panels: camera-relative
    this.buildMenu.updatePosition(cam);
    this.buildingPanel.updatePosition(cam);
    if (this.guildUI.isVisible())         this.guildUI.updatePosition(cam);
    if (this.expeditionUI.isVisible())    this.expeditionUI.updatePosition(cam);
    if (this.storageUI.isVisible())       this.storageUI.updatePosition(cam);
    if (this.tutorialOverlay.isVisible()) this.tutorialOverlay.updatePosition(cam);
    if (this.cityEventBanner.isVisible()) this.cityEventBanner.updatePosition(cam);
    if (this.dungeonMapUI.isVisible())    this.dungeonMapUI.updatePosition(cam);
  }

  /** Check if any modal UI is currently open (blocks world input). */
  isAnyModalOpen(): boolean {
    return (
      this.guildUI.isVisible() ||
      this.expeditionUI.isVisible() ||
      this.storageUI.isVisible() ||
      this.combatOverlay.isVisible() ||
      this.statisticsUI.isVisible() ||
      this.achievementUI.isVisible() ||
      this.dungeonMapUI.isVisible() ||
      this.bestiariumUI.isVisible() ||
      this.npcPanel.isVisible() ||
      this.chestUI.isVisible()
    );
  }

  /** Hide all panels (utility for mode switching). */
  hideAllPanels(): void {
    this.buildingPanel.hide();
    if (this.guildUI.isVisible()) this.guildUI.hide();
    if (this.expeditionUI.isVisible()) this.expeditionUI.hide();
    if (this.storageUI.isVisible()) this.storageUI.hide();
    if (this.combatOverlay.isVisible()) this.combatOverlay.hide();
    if (this.statisticsUI.isVisible()) this.statisticsUI.hide();
    if (this.achievementUI.isVisible()) this.achievementUI.hide();
    if (this.volumeUI.isVisible()) this.volumeUI.hide();
    if (this.dungeonMapUI.isVisible()) this.dungeonMapUI.hide();
    if (this.bestiariumUI.isVisible()) this.bestiariumUI.hide();
    if (this.npcPanel.isVisible()) this.npcPanel.hide();
    if (this.chestUI.isVisible()) this.chestUI.hide();
  }

  /** Refresh HUD with current game state. */
  refreshHUD(state: GameState): void {
    this.hud.refresh(state);
  }

  /** Handle ESC key: close the topmost active panel. */
  handleEscape(gameState: GameState): void {
    if (this.combatOverlay.isVisible()) {
      // Don't close combat overlay with ESC (must click button)
    } else if (this.tutorialOverlay.isVisible()) {
      gameState.tutorial.done = true;
      this.tutorialOverlay.hide();
    } else if (this.expeditionUI.isVisible()) {
      // Don't close expedition with ESC while exploring
    } else if (this.dungeonMapUI.isVisible()) {
      this.dungeonMapUI.hide();
    } else if (this.guildUI.isVisible()) {
      this.guildUI.hide();
    } else if (this.bestiariumUI.isVisible()) {
      this.bestiariumUI.hide();
    } else if (this.npcPanel.isVisible()) {
      this.npcPanel.hide();
    } else if (this.chestUI.isVisible()) {
      this.chestUI.hide();
    } else if (this.statisticsUI.isVisible()) {
      this.statisticsUI.hide();
    } else if (this.achievementUI.isVisible()) {
      this.achievementUI.hide();
    } else if (this.volumeUI.isVisible()) {
      this.volumeUI.hide();
    } else if (this.storageUI.isVisible()) {
      this.storageUI.hide();
    } else if (this.buildingPanel.isVisible()) {
      this.buildingPanel.hide();
    } else {
      this.buildMenu.setMode('none');
    }
  }

  /** Handle sidebar action: open panels, switch modes. */
  handleSidebarAction(
    action: SidebarAction,
    gameState: GameState,
    buildingUpgradeSystem: BuildingUpgradeSystem,
  ): void {
    this.buildingPanel.hide();

    switch (action) {
      case 'build':
        if (this.buildMenu.currentMode === 'build') {
          this.buildMenu.setMode('none');
          this.sidebar.setActive(null);
        } else {
          this.buildMenu.setMode('build');
        }
        break;
      case 'road':
        if (this.buildMenu.currentMode === 'road') {
          this.buildMenu.setMode('none');
          this.sidebar.setActive(null);
        } else {
          this.buildMenu.setMode('road');
        }
        break;
      case 'guild':
        this.buildMenu.setMode('none');
        this.guildUI.partySlots = buildingUpgradeSystem.getPartySlots(gameState);
        this.guildUI.show(gameState);
        this.sidebar.setActive(null);
        break;
      case 'expedition':
        this.buildMenu.setMode('none');
        if (gameState.activeExpedition) {
          this.expeditionUI.show(gameState);
        } else {
          // Expedition-Tab wurde aus der Gilde entfernt – zeige Gilde ohne Tab
          this.guildUI.partySlots = buildingUpgradeSystem.getPartySlots(gameState);
          this.guildUI.show(gameState);
        }
        this.sidebar.setActive(null);
        break;
      case 'storage':
        this.buildMenu.setMode('none');
        this.storageUI.show(gameState);
        this.sidebar.setActive(null);
        break;
      case 'help':
        this.buildMenu.setMode('none');
        this.sidebar.setActive(null);
        this.tutorialOverlay.show(gameState);
        break;
    }
  }

  /** Remove global event listeners. Call on scene shutdown to prevent listener stacking. */
  destroy(): void {
    if (this._windowKeydownHandler) {
      window.removeEventListener('keydown', this._windowKeydownHandler);
      this._windowKeydownHandler = null;
    }
  }

  // ─── Null-Object Stubs (when no Phaser scene) ────────────────

  /** No-op TutorialOverlay for 3D mode (no Phaser scene). */
  private static createNullTutorialOverlay(): TutorialOverlay {
    return {
      onComplete: undefined,
      show(_state: GameState) { /* no-op */ },
      hide() { /* no-op */ },
      isVisible() { return false; },
      updatePosition() { /* no-op */ },
      showMilestoneBanner(_msg: string) { /* no-op */ },
    } as unknown as TutorialOverlay;
  }

  /** No-op CityEventBanner for 3D mode (no Phaser scene). */
  private static createNullCityEventBanner(): CityEventBanner {
    return {
      onAcceptTrade: null,
      refresh(_state: GameState) { /* no-op */ },
      isVisible() { return false; },
      updatePosition() { /* no-op */ },
    } as unknown as CityEventBanner;
  }

  /** Update status bar text based on current build mode. */
  updateStatusBar(
    selectedBuildingType: string | null,
    disconnectedCount: number,
    swampVariant?: number,
    grayVariant?: number,
    dirtVariant?: number,
  ): void {
    const mode = this.buildMenu.currentMode;
    let status = '';
    let hint = '';

    switch (mode) {
      case 'build':
        status = 'Bau-Modus';
        hint = selectedBuildingType
          ? `Klicke auf eine freie Fl\u00e4che um ${BUILDING_DEFS[selectedBuildingType]?.name ?? ''} zu platzieren`
          : 'W\u00e4hle ein Geb\u00e4ude aus der Palette';
        break;
      case 'road':
        status = 'Strassen-Modus';
        hint = 'Klicke um Strassen zu bauen. Verbinde Geb\u00e4ude mit dem Lagerhaus!';
        break;
      case 'demolish':
        status = 'Abriss-Modus';
        hint = 'Klicke auf ein Geb\u00e4ude zum Abreissen';
        break;
      case 'swamp': {
        const variantNames = ['Hell', 'Mittel', 'Tief'];
        status = `Sumpf-Maler (${variantNames[swampVariant ?? 0]})`;
        hint = 'Klicke/Ziehe zum Malen. 1/2/3 = Variante. Klick auf vorh. Tile = l\u00f6schen. F5 = Speichern.';
        break;
      }
      case 'gray': {
        const variantNames = ['Hell', 'Mittel', 'Dunkel'];
        status = `Grau-Maler (${variantNames[grayVariant ?? 0]})`;
        hint = 'Klicke/Ziehe zum Malen. 1/2/3 = Variante. Klick auf vorh. Tile = l\u00f6schen. F5 = Speichern.';
        break;
      }
      case 'dirt': {
        const variantNames = ['Hell', 'Mittel', 'Dunkel'];
        status = `Erde-Maler (${variantNames[dirtVariant ?? 0]})`;
        hint = 'Klicke/Ziehe zum Malen. 1/2/3 = Variante. Klick auf vorh. Tile = l\u00f6schen. F5 = Speichern.';
        break;
      }
      default:
        status = '';
        if (disconnectedCount > 0) {
          hint = `${disconnectedCount} Geb\u00e4ude nicht verbunden! Baue Strassen zum Lagerhaus.`;
        } else {
          hint = 'Klicke auf Geb\u00e4ude f\u00fcr Info. Nutze die Sidebar links.';
        }
    }

    this.statusBar.setStatus(status, hint);
  }
}
