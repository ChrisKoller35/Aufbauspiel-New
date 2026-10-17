import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT, BORDER_MARGIN_PX, ISO_MODE } from '../rendering/Colors';
import {
  gridToIso, isoToGrid,
  ISO_WORLD_W, ISO_WORLD_H,
  ISO_TILE_W, ISO_TILE_HALF_W, ISO_TILE_HALF_H,
  strokeIsoBuildingFootprint,
} from '../rendering/IsoRenderer';
import { GameState, createNewGameState, TileData } from '../models/GameState';
import { BuildingInstance, createBuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';
import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS } from '../data/recipes';
import { GridSystem } from '../systems/GridSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { CitySystemContainer } from '../systems/CitySystemContainer';
import { getEventBus, resetEventBus, EventBus } from '../systems/EventBus';
import { InputHandler, ICityScene } from '../systems/InputHandler';
import { updateSynergies } from '../data/synergies';
import { BuildMode } from '../ui/html/HTMLBuildMenu';
import { UIManager } from '../ui/UIManager';
import { isInView } from '../utils/Culling';
import { VisualFX } from '../rendering/VisualFX';
import { CityMapRenderer } from './CityMapRenderer';
import { CityBuildingRenderer } from './CityBuildingRenderer';
import { ExpeditionFinalizer } from '../systems/ExpeditionFinalizer';
import { DebugPositioner } from './DebugPositioner';
import { placeStartingLayout, createStartingCitizens } from './CityStartingLayout';

export class CityScene extends Phaser.Scene implements ICityScene {
  // Core state
  public gameState!: GameState;

  // ── Extracted system container (replaces 21 individual system properties) ──
  private systems!: CitySystemContainer;

  // ── ICityScene: gridSystem + saveSystem must remain public properties ──
  get gridSystem(): GridSystem { return this.systems.grid; }
  get saveSystem(): SaveSystem { return this.systems.save; }

  // ── UIManager + InputHandler + EventBus ──
  private uiManager!: UIManager;
  private visualFX!: VisualFX;
  private inputHandler!: InputHandler;
  private bus!: EventBus;

  // ── Extracted renderer / finalizer helpers ──
  private mapRenderer!: CityMapRenderer;
  private buildingRenderer!: CityBuildingRenderer;
  private expeditionFinalizer!: ExpeditionFinalizer;

  /** true wenn die aktive Expedition vom Dungeon-Lager gestartet wurde. */
  private dungeonExpeditionActive = false;

  /** When Three.js handles rendering, skip Phaser sprite creation/culling. */
  private readonly threeActive: boolean;
  private hoverHighlight!: Phaser.GameObjects.Graphics;
  private chestGlowGraphics!: Phaser.GameObjects.Graphics;
  private chestGlowTween!: Phaser.Tweens.Tween;
  private _chestLootCache = false;

  // ── Debug positioning (extracted to DebugPositioner) ──
  private debugPositioner!: DebugPositioner;

  private autoSaveAccumulator = 0;

  constructor() {
    super({ key: 'CityScene' });
    // Three.js is active when the #three-canvas element exists
    this.threeActive = !!document.getElementById('three-canvas');
  }

  create(): void {
    this.systems = new CitySystemContainer(this);

    // Try to load saved game, else create new
    const loaded = this.systems.save.load();
    this.gameState = loaded ?? createNewGameState();

    // Camera bounds: isometric diamond world or legacy top-down
    if (ISO_MODE) {
      this.cameras.main.setBounds(-400, -400, ISO_WORLD_W + 800, ISO_WORLD_H + 800);
    } else {
      this.cameras.main.setBounds(
        -BORDER_MARGIN_PX, -BORDER_MARGIN_PX,
        WORLD_WIDTH + BORDER_MARGIN_PX * 2,
        WORLD_HEIGHT + BORDER_MARGIN_PX * 2,
      );
    }
    this.physics?.world?.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // ── Renderer helpers (Phaser sprites — skipped when Three.js is active) ──
    this.mapRenderer = new CityMapRenderer(this, this.gameState);
    this.buildingRenderer = new CityBuildingRenderer(this, this.gameState, this.systems.grid);
    this.buildingRenderer.init();

    // Place starting layout (only for new games)
    if (!loaded) {
      placeStartingLayout(this.gameState);
      createStartingCitizens(this.gameState);
    } else {
      // Patch: ensure DUNGEON_CAMP exists in old saves
      if (!this.gameState.buildings.some(b => b.typeId === 'DUNGEON_CAMP')) {
        this.placeStarterBuilding('DUNGEON_CAMP', 4, 16);
      }
    }

    if (!this.threeActive) {
      this.mapRenderer.drawMapBorder();
      this.mapRenderer.drawGrid();
      this.buildingRenderer.renderAllBuildings();
      this.buildingRenderer.renderRoads();
      this.buildingRenderer.renderSwamp();
      this.buildingRenderer.renderGray();
      this.buildingRenderer.renderDirt();
      this.mapRenderer.placeTerrainDecorations();
      this.placeDungeonMountain();
    }

    // Compute initial connectivity
    this.systems.connectivity.update(this.gameState);
    this.buildingRenderer.renderAllBuildings();

    // Hover highlight for buildings (above all world objects, below UI)
    this.hoverHighlight = this.add.graphics().setDepth(855);

    // Chest glow: pulsing gold outline when loot is waiting
    this.chestGlowGraphics = this.add.graphics().setDepth(853).setVisible(false);
    this.drawChestGlow();
    this.chestGlowTween = this.tweens.add({
      targets: this.chestGlowGraphics,
      alpha: { from: 0.3, to: 1.0 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true,
    });

    // ── EventBus ──
    resetEventBus();
    this.bus = getEventBus();

    // ── UIManager (creates + wires all 15 UI components) ──
    this.uiManager = new UIManager({
      scene: this,
      bus: this.bus,
      gameState: this.gameState,
      gearSystem: this.systems.gear,
      expeditionSystem: this.systems.expedition,
      soundManager: this.systems.sound,
      buildingUpgradeSystem: this.systems.buildingUpgrade,
      onSaveRequest: () => this.systems.save.save(this.gameState),
    });
    this.updateStatusBar();

    // ── ExpeditionFinalizer (created after uiManager, needs all systems) ──
    this.expeditionFinalizer = new ExpeditionFinalizer(
      this, this.gameState, this.uiManager,
      this.systems.buildingUpgrade, this.systems.expedition, this.systems.provision,
      this.systems.gearMaintenance, this.systems.guildRank, this.systems.classUnlock,
      this.systems.achievement, this.systems.bestiarium, this.systems.npcRescue,
    );

    // ── VisualFX (post-processing, particles, day/night) ──
    this.visualFX = new VisualFX(this);
    this.visualFX.initAllBuildingFX(this.gameState.buildings);
    this.buildingRenderer.setVisualFX(this.visualFX);

    // ── DebugPositioner ──
    this.debugPositioner = new DebugPositioner(this);
    // Hand the mountain sprite over so DebugPositioner can reposition it
    if (this._pendingMountSprite) {
      this.debugPositioner.setMountSprite(this._pendingMountSprite);
      this._pendingMountSprite = null;
    }

    // ── InputHandler (all pointer, keyboard, camera input) ──
    this.setupCamera();
    this.inputHandler = new InputHandler(this, this.bus);
    // ── Subscribe to EventBus events ──
    this.subscribeEvents();

    // Cleanup on scene shutdown (prevents listener stacking on restart)
    this.events.once('shutdown', () => {
      this.inputHandler.destroy();
      this.uiManager.destroy();
    }, this);

    // Start background music
    this.systems.sound.playMusic('music_city');

    // Auto-start tutorial for new games
    if (!this.gameState.tutorial.done) {
      this.uiManager.tutorialOverlay.show(this.gameState);
    }

    console.log(
      'CityScene created. Buildings:', this.gameState.buildings.length,
      'Citizens:', this.gameState.citizens.length,
      loaded ? '(loaded save)' : '(new game)',
    );
  }

  // ─── EventBus Subscriptions ────────────────────────────────────

  private subscribeEvents(): void {
    const bus = this.bus;

    // Building demolished (from BuildingPanel via UIManager)
    bus.on('building:demolished', ({ buildingId }) => {
      this.handleDemolishById(buildingId);
    });

    // Building upgraded (from BuildingPanel via UIManager)
    bus.on('building:upgraded', ({ buildingId }) => {
      const building = this.gameState.buildings.find(b => b.id === buildingId);
      if (building && this.systems.buildingUpgrade.startUpgrade(this.gameState, building)) {
        this.uiManager.buildingPanel.show(building, this.gameState);
        this.uiManager.refreshHUD(this.gameState);
      }
    });

    // Expedition started (from GuildUI or DungeonMapUI via UIManager)
    bus.on('expedition:started', ({ routeId, fighterIds, difficulty, modifierId, fromDungeon, consumables }) => {
      if (fromDungeon) this.dungeonExpeditionActive = true;
      this.systems.expedition.startExpedition(
        this.gameState, routeId, fighterIds, difficulty, modifierId, false, consumables,
      );
      if (this.gameState.activeExpedition) {
        this.systems.talisman.applyToParty(this.gameState, this.gameState.activeExpedition.party);
      }
      if (!fromDungeon) {
        this.uiManager.guildUI.hide();
      }
      this.uiManager.expeditionUI.show(this.gameState);
    });

    // Pre-combat target (from CombatOverlay via UIManager)
    bus.on('expedition:combatTarget', ({ enemyId }) => {
      const run = this.gameState.activeExpedition;
      if (run) this.systems.expedition.setFocusTarget(run, enemyId);
    });

    // Expedition returned (from ExpeditionUI via UIManager)
    bus.on('expedition:returned', () => {
      this.expeditionFinalizer.finalize(
        this.dungeonExpeditionActive,
        () => {
          this.dungeonExpeditionActive = false;
          this.uiManager.dungeonMapUI.partySlots = this.systems.buildingUpgrade.getPartySlots(this.gameState);
          this.uiManager.dungeonMapUI.show(this.gameState);
        },
      );
    });

    // Build mode changed (from BuildMenu via UIManager)
    bus.on('mode:changed', ({ mode }) => {
      this.uiManager.selectedBuildingType = null;
      this.buildingRenderer.clearGhost();
      this.uiManager.buildingPanel.hide();
      if (mode === 'build' || mode === 'road') {
        this.mapRenderer.showGridLines();
      } else {
        this.mapRenderer.hideGridLines();
      }
      this.updateStatusBar();
    });

    // Building type selected in build palette (from BuildMenu via UIManager)
    bus.on('mode:buildingSelected', () => {
      this.buildingRenderer.clearGhost();
      this.uiManager.buildingPanel.hide();
    });

    // Sidebar action (from Sidebar via UIManager)
    bus.on('sidebar:action', ({ action }) => {
      this.uiManager.handleSidebarAction(action, this.gameState, this.systems.buildingUpgrade);
      this.updateStatusBar();
    });

    // Tutorial completed
    bus.on('tutorial:completed', () => {
      this.gameState.tutorial.done = true;
      this.gameState.tutorial.currentStep = 0;
    });

    // City event trade accepted
    bus.on('cityevent:tradeAccepted', () => {
      this.systems.cityEvent.acceptTrade(this.gameState);
      this.uiManager.cityEventBanner.refresh(this.gameState);
      this.uiManager.refreshHUD(this.gameState);
    });
  }

  // ─── Dungeon Mountain (stays in CityScene — hands sprite to DebugPositioner) ──

  private placeDungeonMountain(): void {
    if (!ISO_MODE) return;
    if (!this.textures.exists('ISO_DUNGEON_MOUNTAIN')) return;

    // Use the default mountain position (gx=2.5, gy=15.5 as in original)
    const mountGx = 2.5;
    const mountGy = 15.5;
    const iso = gridToIso(mountGx, mountGy);
    const mountainW = ISO_TILE_W * 5;
    const mountainH = mountainW * 1.25;
    const depth = (mountGx + mountGy) * 10 - 5;

    const sprite = this.add.image(iso.x, iso.y + ISO_TILE_HALF_H, 'ISO_DUNGEON_MOUNTAIN')
      .setDisplaySize(mountainW, mountainH)
      .setDepth(depth)
      .setOrigin(0.5, 1)
      .setAlpha(0.95);

    // Hand the sprite to DebugPositioner for interactive repositioning
    // (DebugPositioner is created right after this call in create())
    // We store it temporarily so we can pass it after DebugPositioner is ready.
    this._pendingMountSprite = sprite;
  }

  /** Temporary storage between placeDungeonMountain() and DebugPositioner init. */
  private _pendingMountSprite: Phaser.GameObjects.Image | null = null;

  // ─── Debug Positionierung — delegates to DebugPositioner ─────────────

  toggleDebugMode(mode: 'mountain' | 'camp'): void {
    this.debugPositioner.toggle(mode);
  }

  handleDebugMovement(delta: number): void {
    this.debugPositioner.handleMovement(delta, this.inputHandler.cursors);
  }

  copyDebugPosition(): void {
    this.debugPositioner.copyPosition();
  }

  isDebugMode(): boolean {
    return this.debugPositioner.isActive();
  }

  // ─── Starting Buildings (old save patch only — new games use CityStartingLayout) ──

  private placeStarterBuilding(typeId: string, gx: number, gy: number): void {
    const def = BUILDING_DEFS[typeId];
    const [w, h] = def.footprint;

    const building = createBuildingInstance(typeId, gx, gy, true);
    if (def.recipes.length > 0) building.activeRecipeId = def.recipes[0];
    building.connected = true;

    const tileData: TileData = { buildingId: building.id, isRoad: typeId === 'ROAD' };
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.gameState.grid[gy + dy][gx + dx] = tileData;
      }
    }
    this.gameState.buildings.push(building);
  }

  // ─── Sidebar Actions ────────────────────────────────────────────

  /** Delegate to UIManager for status bar updates. */
  updateStatusBar(): void {
    const disconnected = this.gameState.buildings.filter(
      b => b.built && BUILDING_DEFS[b.typeId].requiresConnectivity && !b.connected,
    ).length;
    this.uiManager.updateStatusBar(
      this.uiManager.selectedBuildingType,
      disconnected,
      this.buildingRenderer.getSwampVariant(),
      this.buildingRenderer.getGrayVariant(),
      this.buildingRenderer.getDirtVariant(),
    );
  }

  // ─── ICityScene Interface Methods (used by InputHandler) ────────

  getSelectedBuildingType(): string | null {
    return this.uiManager.selectedBuildingType;
  }

  getCurrentBuildMode(): BuildMode {
    return this.uiManager.buildMenu.currentMode;
  }

  isAnyModalOpen(): boolean {
    return this.uiManager.isAnyModalOpen();
  }

  private static readonly LOOT_BUILDINGS = new Set(['BANK_V2', 'BANK', 'BANK_WITH_CHEST', 'VAULT']);

  handleBuildingClick(building: BuildingInstance): void {
    if (CityScene.LOOT_BUILDINGS.has(building.typeId)) {
      this.uiManager.chestUI.open(this.gameState);
    } else if (building.typeId === 'GUILD_HALL') {
      this.uiManager.guildUI.partySlots = this.systems.buildingUpgrade.getPartySlots(this.gameState);
      this.uiManager.guildUI.show(this.gameState);
    } else if (building.typeId === 'DUNGEON_CAMP') {
      if (this.gameState.activeExpedition) {
        this.uiManager.expeditionUI.show(this.gameState);
      } else {
        this.uiManager.dungeonMapUI.partySlots = this.systems.buildingUpgrade.getPartySlots(this.gameState);
        this.uiManager.dungeonMapUI.show(this.gameState);
      }
    } else {
      this.uiManager.buildingPanel.show(building, this.gameState);
    }
  }

  hideBuildingPanel(): void {
    this.uiManager.buildingPanel.hide();
  }

  clearHoverHighlight(): void {
    this.hoverHighlight.clear();
  }

  private drawChestGlow(): void {
    const lootBuildings = this.gameState.buildings.filter(
      b => CityScene.LOOT_BUILDINGS.has(b.typeId)
    );
    if (lootBuildings.length === 0) return;
    this.chestGlowGraphics.clear();
    this.chestGlowGraphics.lineStyle(3, 0xFFD700, 1.0);
    for (const b of lootBuildings) {
      const def = BUILDING_DEFS[b.typeId];
      const [w, h] = def.footprint;
      if (ISO_MODE) {
        strokeIsoBuildingFootprint(this.chestGlowGraphics, b.x, b.y, w, h);
      } else {
        const TILE_SIZE = 32;
        this.chestGlowGraphics.strokeRect(
          b.x * TILE_SIZE - 2, b.y * TILE_SIZE - 2,
          w * TILE_SIZE + 4, h * TILE_SIZE + 4,
        );
      }
    }
  }

  /** Show/hide chest glow based on whether loot is waiting. */
  private updateChestGlowState(): void {
    const hasLoot = (this.gameState.pendingChestLoot?.expeditionCount ?? 0) > 0;
    if (hasLoot === this._chestLootCache) return;
    this._chestLootCache = hasLoot;
    if (hasLoot) {
      this.drawChestGlow();
      this.chestGlowGraphics.setVisible(true);
      this.chestGlowTween.resume();
    } else {
      this.chestGlowTween.pause();
      this.chestGlowGraphics.setVisible(false);
    }
  }

  drawHoverHighlight(building: BuildingInstance): void {
    const def = BUILDING_DEFS[building.typeId];
    const [w, h] = def.footprint;
    this.hoverHighlight.lineStyle(2, UI_COLORS.PANEL_BORDER, 0.8);
    if (ISO_MODE) {
      strokeIsoBuildingFootprint(this.hoverHighlight, building.x, building.y, w, h);
    } else {
      this.hoverHighlight.strokeRect(
        building.x * TILE_SIZE, building.y * TILE_SIZE,
        w * TILE_SIZE, h * TILE_SIZE,
      );
    }
  }

  setSwampVariant(v: 0 | 1 | 2): void {
    this.buildingRenderer.setSwampVariant(v);
  }

  setBuildMode(mode: BuildMode): void {
    this.uiManager.buildMenu.setMode(mode);
  }

  toggleStatisticsUI(): void {
    if (this.uiManager.statisticsUI.isVisible()) {
      this.uiManager.statisticsUI.hide();
    } else {
      this.uiManager.statisticsUI.show(this.gameState);
    }
  }

  toggleAchievementUI(): void {
    if (this.uiManager.achievementUI.isVisible()) {
      this.uiManager.achievementUI.hide();
    } else {
      this.uiManager.achievementUI.show(this.gameState);
    }
  }

  handleEscape(): void {
    this.uiManager.handleEscape(this.gameState);
  }

  // ── ICityScene: ghost/swamp/demolish delegates → buildingRenderer ──

  updateGhostPreview(worldX: number, worldY: number): void {
    this.buildingRenderer.updateGhostPreview(
      worldX, worldY,
      this.uiManager.buildMenu.currentMode,
      this.uiManager.selectedBuildingType,
    );
  }

  updateDemolishHighlight(worldX: number, worldY: number): void {
    this.buildingRenderer.updateDemolishHighlight(worldX, worldY);
  }

  updateSwampGhostPreview(worldX: number, worldY: number): void {
    this.buildingRenderer.updateSwampGhostPreview(worldX, worldY);
  }

  clearGhost(): void {
    this.buildingRenderer.clearGhost();
  }

  handleSwampPaint(gx: number, gy: number): void {
    this.buildingRenderer.handleSwampPaint(gx, gy);
  }

  handleGrayPaint(gx: number, gy: number): void {
    this.buildingRenderer.handleGrayPaint(gx, gy);
  }

  handleDirtPaint(gx: number, gy: number): void {
    this.buildingRenderer.handleDirtPaint(gx, gy);
  }

  updateGrayGhostPreview(worldX: number, worldY: number): void {
    this.buildingRenderer.updateGrayGhostPreview(worldX, worldY);
  }

  updateDirtGhostPreview(worldX: number, worldY: number): void {
    this.buildingRenderer.updateDirtGhostPreview(worldX, worldY);
  }

  setGrayVariant(v: 0 | 1 | 2): void { this.buildingRenderer.setGrayVariant(v); }
  setDirtVariant(v: 0 | 1 | 2): void { this.buildingRenderer.setDirtVariant(v); }
  getGrayVariant(): 0 | 1 | 2 { return this.buildingRenderer.getGrayVariant(); }
  getDirtVariant(): 0 | 1 | 2 { return this.buildingRenderer.getDirtVariant(); }

  exportSwampData(): void {
    this.buildingRenderer.exportSwampData();
  }

  handlePlacement(typeId: string, gx: number, gy: number): void {
    const result = this.systems.grid.placeBuilding(this.gameState, typeId, gx, gy);
    if (!result) {
      console.warn(`[Placement] FAILED: ${typeId} @ ${gx},${gy}`);
      return;
    }
    console.log(`[Placement] OK: ${typeId} @ ${gx},${gy} → id=${result.id}`);

    // Phase 2: instant build (construction timers come in Phase 4)
    result.built = true;

    // Remove deco sprites under new building footprint
    const def = BUILDING_DEFS[typeId];
    const [fw, fh] = def ? def.footprint : [1, 1];
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        this.mapRenderer.removeDecoAt(gx + dx, gy + dy);
      }
    }

    if (typeId === 'ROAD') {
      this.buildingRenderer.renderRoads();
    } else {
      this.buildingRenderer.renderBuilding(result);
    }

    // Statistics: building built (#22)
    this.gameState.statistics.total_buildings_built = (this.gameState.statistics.total_buildings_built ?? 0) + 1;

    this.afterStateChange();

    // Notify Three.js overlay that the scene changed
    this.bus.emit('scene:buildingsChanged', {});

    // Reset ghost so it recalculates on next move (delegated to renderer)
    this.buildingRenderer.clearGhost();
  }

  handleDemolish(worldX: number, worldY: number): void {
    let building: BuildingInstance | null;
    if (ISO_MODE) {
      const { gx, gy } = isoToGrid(worldX, worldY);
      building = this.systems.grid.getBuildingAtGrid(this.gameState, gx, gy);
    } else {
      building = this.systems.grid.getBuildingAtPixel(this.gameState, worldX, worldY, TILE_SIZE);
    }
    if (!building) return;
    this.handleDemolishById(building.id);
  }

  handleDemolishById(buildingId: number): void {
    const building = this.gameState.buildings.find(b => b.id === buildingId);
    if (!building) return;

    const refund = this.systems.grid.demolish(this.gameState, buildingId);
    if (refund !== null) {
      if (building.typeId === 'ROAD') {
        this.buildingRenderer.renderRoads();
      } else {
        this.buildingRenderer.removeBuildingSprite(buildingId);
      }
      // Statistics: building demolished (#22)
      this.gameState.statistics.total_buildings_demolished = (this.gameState.statistics.total_buildings_demolished ?? 0) + 1;
      this.afterStateChange();

      // Notify Three.js overlay that the scene changed
      this.bus.emit('scene:buildingsChanged', {});

      this.buildingRenderer.clearGhost();
    }
  }

  /** Show floating "+X resource" text above a building when production completes. */
  private showProductionPopup(building: BuildingInstance): void {
    const recipe = RECIPE_DEFS[building.activeRecipeId!];
    if (!recipe) return;

    const def = BUILDING_DEFS[building.typeId];
    const [w, h] = def.footprint;
    let px: number, py: number;
    if (ISO_MODE) {
      const iso = gridToIso(building.x + w / 2, building.y + h / 2);
      px = iso.x;
      py = iso.y - 20;
    } else {
      px = building.x * TILE_SIZE + (w * TILE_SIZE) / 2;
      py = building.y * TILE_SIZE;
    }

    const outputStr = Object.entries(recipe.outputs)
      .map(([k, v]) => `+${v} ${k}`)
      .join(' ');

    const popup = this.add.text(px, py - 8, outputStr, {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LOOT,
      fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(870);

    this.tweens.add({
      targets: popup,
      y: py - 36,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  /** Recalculate connectivity + water + synergies, re-render buildings, refresh HUD. */
  private afterStateChange(): void {
    this.systems.connectivity.update(this.gameState);
    this.systems.satisfaction.update(this.gameState);
    updateSynergies(this.gameState);
    if (!this.threeActive) {
      this.buildingRenderer.renderAllBuildings();
    }
    this.uiManager.refreshHUD(this.gameState);
  }

  // ─── Camera (initial position only — zoom/pan handled by InputHandler) ──

  private setupCamera(): void {
    const cam = this.cameras.main;
    if (ISO_MODE) {
      cam.centerOn(ISO_WORLD_W / 2, ISO_WORLD_H / 2);
    } else {
      cam.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    }
  }

  // ─── Keyboard Shortcuts (now in InputHandler) ──────────────────

  // ─── Game Loop ───────────────────────────────────────────────────

  private static readonly CITY_TICK_INTERVAL = 1.0;  // seconds
  private static readonly DAY_TICK_INTERVAL = 60.0;  // seconds
  private static readonly AUTO_SAVE_INTERVAL = 30.0; // seconds

  /** Reposition all UI panels to follow the camera every frame. */
  private updateUIPositions(): void {
    const cam = this.cameras.main;
    this.uiManager.updatePositions(cam);
  }

  update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;
    const state = this.gameState;

    // ── Keep UI fixed to camera ──
    this.updateUIPositions();

    // ── Chest glow: pulse when loot is waiting ──
    this.updateChestGlowState();

    // ── Visual FX update (day/night, overlays, weather) ──
    this.visualFX.update(delta);

    // ── Phase 3.3: Building focus mode — desaturate when panel is open ──
    this.visualFX.setFocusMode(this.uiManager.buildingPanel.isVisible());

    // ── Arrow key camera panning (disabled in debug mode + chest panel) ──
    if (this.debugPositioner.isActive()) {
      this.debugPositioner.handleMovement(delta, this.inputHandler.cursors);
    } else {
      this.inputHandler.updateCameraPan(delta);
    }

    // ── Culling: hide off-screen building + road sprites (skip when Three.js renders) ──
    if (!this.threeActive) {
      const cam = this.cameras.main;
      const CULL_MARGIN = 128;

      for (const [id, container] of this.buildingRenderer.buildingSprites) {
        const b = state.buildings.find(b => b.id === id);
        if (!b) continue;
        let wx: number, wy: number, ww: number, wh: number;
        if (ISO_MODE) {
          const def = BUILDING_DEFS[b.typeId];
          const [fw, fh] = def.footprint;
          const spriteW = (fw + fh) * ISO_TILE_HALF_W;
          const spriteH = spriteW * 1.15;
          const isoPos = gridToIso(b.x + fw / 2, b.y + fh / 2);
          wx = isoPos.x - spriteW / 2;
          wy = isoPos.y - spriteH;
          ww = spriteW;
          wh = spriteH;
        } else {
          const def = BUILDING_DEFS[b.typeId];
          const [fw, fh] = def.footprint;
          wx = b.x * TILE_SIZE;
          wy = b.y * TILE_SIZE;
          ww = fw * TILE_SIZE;
          wh = fh * TILE_SIZE;
        }
        container.setVisible(isInView(cam, wx, wy, ww, wh, CULL_MARGIN));
      }

      for (const sprite of this.buildingRenderer.roadSprites) {
        const wx = sprite.x - TILE_SIZE / 2;
        const wy = sprite.y - TILE_SIZE / 2;
        sprite.setVisible(isInView(cam, wx, wy, TILE_SIZE, TILE_SIZE, CULL_MARGIN));
      }
    }

    // ── City Tick (every 1s) ──
    state.cityTickAccumulator += deltaSec;
    if (state.cityTickAccumulator >= CityScene.CITY_TICK_INTERVAL) {
      const tickDelta = state.cityTickAccumulator;
      state.cityTickAccumulator = 0;

      // Snapshot production timers before tick (for popup detection)
      const preTimers = new Map<number, number>();
      for (const b of state.buildings) {
        if (b.producing && b.activeRecipeId) preTimers.set(b.id, b.productionTimer);
      }

      this.systems.people.cityTick(state, tickDelta);
      this.systems.production.update(state, tickDelta);
      this.systems.buildingUpgrade.update(state, tickDelta);

      // Fighter synergy: apply training speed bonus (≥2 fighters → 10% faster)
      const trainMult = this.systems.fighterSynergy.getTrainingSpeedMult(state);
      if (trainMult < 1.0) {
        for (const citizen of state.citizens) {
          if (citizen.status === 'GUILD_TRAINING') {
            // Apply bonus: subtract extra time proportional to the speed-up
            citizen.trainingTimer -= tickDelta * (1.0 / trainMult - 1.0);
          }
        }
      }

      this.uiManager.refreshHUD(state);
      this.uiManager.buildingPanel.updateProgress();

      // Production completion popups + statistics tracking
      for (const b of state.buildings) {
        if (!b.activeRecipeId) continue;
        const prevTimer = preTimers.get(b.id);
        // If timer was > 0 and now reset (production completed)
        if (prevTimer !== undefined && prevTimer > 0 && prevTimer <= tickDelta + 0.1) {
          this.showProductionPopup(b);
          state.statistics.total_items_crafted = (state.statistics.total_items_crafted ?? 0) + 1;
        }
      }
    }

    // ── Day Tick (every 60s) ──
    state.dayTickAccumulator += deltaSec;
    if (state.dayTickAccumulator >= CityScene.DAY_TICK_INTERVAL) {
      state.dayTickAccumulator = 0;

      this.systems.economy.dayTick(state);
      this.systems.people.dayTick(state);
      this.systems.cityEvent.dayTick(state);
      this.uiManager.refreshHUD(state);
      this.uiManager.cityEventBanner.refresh(state);

      // Statistics: day tracking (#22)
      state.statistics.total_days_survived = state.day;
    }

    // ── Auto-save (every 30s) ──
    this.autoSaveAccumulator += deltaSec;
    if (this.autoSaveAccumulator >= CityScene.AUTO_SAVE_INTERVAL) {
      this.autoSaveAccumulator = 0;
      this.systems.save.save(state);
    }
  }
}
