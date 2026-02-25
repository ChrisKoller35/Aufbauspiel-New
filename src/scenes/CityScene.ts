import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT } from '../rendering/Colors';
import { GameState, createNewGameState, TileData } from '../models/GameState';
import { BuildingInstance, createBuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';
import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS } from '../data/recipes';
import { GridSystem } from '../systems/GridSystem';
import { ConnectivitySystem } from '../systems/ConnectivitySystem';
import { ProductionSystem } from '../systems/ProductionSystem';
import { SatisfactionSystem } from '../systems/SatisfactionSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { PeopleSystem } from '../systems/PeopleSystem';
import { GearSystem } from '../systems/GearSystem';
import { ExpeditionSystem } from '../systems/ExpeditionSystem';
import { ProvisionSystem } from '../systems/ProvisionSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { awardXP } from '../systems/HeroProgression';
import { generateWeeklyChallenge, determineMedal } from '../data/weeklyChallenges';
import { createEmptyWeeklyChallengeState } from '../models/WeeklyChallengeState';
import { SoundManager } from '../systems/SoundManager';
import { GuildRankSystem } from '../systems/GuildRankSystem';
import { CityEventSystem } from '../systems/CityEventSystem';
import { FighterSynergySystem } from '../systems/FighterSynergySystem';
import { GearMaintenanceSystem } from '../systems/GearMaintenanceSystem';
import { TalismanSystem } from '../systems/TalismanSystem';
import { ClassUnlockSystem } from '../systems/ClassUnlockSystem';
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem';
import { updateSynergies } from '../data/synergies';
import { CITY_EVENT_DEFS } from '../data/cityEvents';
import { CLASS_DEFS } from '../data/classes';
import { BuildMenu } from '../ui/BuildMenu';
import { HUD } from '../ui/HUD';
import { BuildingPanel } from '../ui/BuildingPanel';
import { GuildUI } from '../ui/GuildUI';
import { ExpeditionUI } from '../ui/ExpeditionUI';
import { Sidebar, SidebarAction } from '../ui/Sidebar';
import { StatusBar } from '../ui/StatusBar';
import { StorageUI } from '../ui/StorageUI';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { CombatOverlay } from '../ui/CombatOverlay';
import { CityEventBanner } from '../ui/CityEventBanner';

export class CityScene extends Phaser.Scene {
  // Core state
  public gameState!: GameState;
  private gridSystem!: GridSystem;
  private connectivitySystem!: ConnectivitySystem;
  private productionSystem!: ProductionSystem;
  private satisfactionSystem!: SatisfactionSystem;
  private economySystem!: EconomySystem;
  private peopleSystem!: PeopleSystem;
  private gearSystem!: GearSystem;
  private expeditionSystem!: ExpeditionSystem;
  private provisionSystem!: ProvisionSystem;
  private saveSystem!: SaveSystem;
  private soundManager!: SoundManager;
  private guildRankSystem!: GuildRankSystem;
  private cityEventSystem!: CityEventSystem;
  private fighterSynergySystem!: FighterSynergySystem;
  private gearMaintenanceSystem!: GearMaintenanceSystem;
  private talismanSystem!: TalismanSystem;
  private classUnlockSystem!: ClassUnlockSystem;
  private buildingUpgradeSystem!: BuildingUpgradeSystem;
  private autoSaveAccumulator = 0;

  // Rendering layers
  private grassGraphics!: Phaser.GameObjects.Graphics;
  private gridLinesGraphics!: Phaser.GameObjects.Graphics;
  private roadGraphics!: Phaser.GameObjects.Graphics;
  private roadSprites: Phaser.GameObjects.Image[] = [];
  private decoSprites = new Map<string, Phaser.GameObjects.Image>();
  private ghostGraphics!: Phaser.GameObjects.Graphics;
  private buildingSprites = new Map<number, Phaser.GameObjects.Container>();

  // Ghost preview state
  private ghostGridX = -1;
  private ghostGridY = -1;

  // Camera panning
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // UI
  private buildMenu!: BuildMenu;
  private hud!: HUD;
  private buildingPanel!: BuildingPanel;
  private guildUI!: GuildUI;
  private expeditionUI!: ExpeditionUI;
  private sidebar!: Sidebar;
  private statusBar!: StatusBar;
  private storageUI!: StorageUI;
  private tutorialOverlay!: TutorialOverlay;
  private combatOverlay!: CombatOverlay;
  private cityEventBanner!: CityEventBanner;
  private selectedBuildingType: string | null = null;
  private hoverHighlight!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'CityScene' });
  }

  create(): void {
    this.gridSystem = new GridSystem();
    this.connectivitySystem = new ConnectivitySystem();
    this.productionSystem = new ProductionSystem();
    this.satisfactionSystem = new SatisfactionSystem();
    this.economySystem = new EconomySystem();
    this.peopleSystem = new PeopleSystem();
    this.gearSystem = new GearSystem();
    this.provisionSystem = new ProvisionSystem();
    this.expeditionSystem = new ExpeditionSystem(this.gearSystem, this.provisionSystem);
    this.saveSystem = new SaveSystem();
    this.soundManager = new SoundManager(this);
    this.guildRankSystem = new GuildRankSystem();
    this.cityEventSystem = new CityEventSystem();
    this.fighterSynergySystem = new FighterSynergySystem();
    this.gearMaintenanceSystem = new GearMaintenanceSystem();
    this.talismanSystem = new TalismanSystem();
    this.classUnlockSystem = new ClassUnlockSystem();
    this.buildingUpgradeSystem = new BuildingUpgradeSystem();

    // Try to load saved game, else create new
    const loaded = this.saveSystem.load();
    this.gameState = loaded ?? createNewGameState();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics?.world?.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Rendering layers (ordered by depth)
    this.drawGrid();
    this.roadGraphics = this.add.graphics().setDepth(2);
    this.ghostGraphics = this.add.graphics().setDepth(500);

    // Place starting layout (only for new games)
    if (!loaded) {
      this.placeStartingBuildings();
      this.createStartingCitizens();
    }
    this.renderAllBuildings();
    this.renderRoads();
    this.placeTerrainDecorations();

    // Compute initial connectivity
    this.connectivitySystem.update(this.gameState);
    this.renderAllBuildings();

    // HUD
    this.hud = new HUD(this);
    this.hud.refresh(this.gameState);

    // Building Panel
    this.buildingPanel = new BuildingPanel(this);
    this.buildingPanel.onDemolish = (id) => {
      this.handleDemolishById(id);
      this.buildingPanel.hide();
    };
    this.buildingPanel.onUpgrade = (id) => {
      const building = this.gameState.buildings.find(b => b.id === id);
      if (building && this.buildingUpgradeSystem.startUpgrade(this.gameState, building)) {
        this.buildingPanel.show(building, this.gameState);
        this.hud.refresh(this.gameState);
      }
    };

    // Guild UI
    this.guildUI = new GuildUI(this, this.gearSystem);
    this.guildUI.onStartExpedition = (routeId: string, fighterIds: number[], difficulty: string, modifierId: string | null) => {
      this.expeditionSystem.startExpedition(this.gameState, routeId, fighterIds, difficulty, modifierId);
      // Apply talisman buffs to party
      if (this.gameState.activeExpedition) {
        this.talismanSystem.applyToParty(this.gameState, this.gameState.activeExpedition.party);
      }
      this.guildUI.hide();
      this.expeditionUI.show(this.gameState);
    };

    // Combat Overlay (created before ExpeditionUI to pass reference)
    this.combatOverlay = new CombatOverlay(this);

    // Expedition UI
    this.expeditionUI = new ExpeditionUI(this, this.expeditionSystem);
    this.expeditionUI.setCombatOverlay(this.combatOverlay);
    this.expeditionUI.onClose = () => {
      this.finalizeExpedition();
    };

    // Build menu (now serves as build palette)
    this.buildMenu = new BuildMenu(this);
    this.buildMenu.onSelectBuilding = (typeId) => {
      this.selectedBuildingType = typeId;
      this.clearGhost();
      this.buildingPanel.hide();
    };
    this.buildMenu.onModeChange = (mode) => {
      this.selectedBuildingType = null;
      this.clearGhost();
      this.buildingPanel.hide();
      // Show grid lines only in build/road mode
      if (mode === 'build' || mode === 'road') {
        this.showGridLines();
      } else {
        this.hideGridLines();
      }
    };

    // Sidebar
    this.sidebar = new Sidebar(this);
    this.sidebar.onAction = (action) => this.handleSidebarAction(action);

    // Storage UI
    this.storageUI = new StorageUI(this);
    this.storageUI.onClose = () => { /* nothing extra needed */ };

    // Tutorial overlay
    this.tutorialOverlay = new TutorialOverlay(this);
    this.tutorialOverlay.onComplete = () => {
      this.gameState.tutorial.done = true;
      this.gameState.tutorial.currentStep = 0;
    };

    // Status bar
    this.statusBar = new StatusBar(this);
    this.updateStatusBar();

    // City Event Banner
    this.cityEventBanner = new CityEventBanner(this);
    this.cityEventBanner.onAcceptTrade = () => {
      this.cityEventSystem.acceptTrade(this.gameState);
      this.cityEventBanner.refresh(this.gameState);
      this.hud.refresh(this.gameState);
    };

    // Hover highlight for buildings
    this.hoverHighlight = this.add.graphics().setDepth(9);

    // Input & camera
    this.setupCamera();
    this.setupInput();
    this.setupKeyboard();

    // Start background music
    this.soundManager.playMusic('music_city_day');

    // Auto-start tutorial for new games
    if (!this.gameState.tutorial.done) {
      this.tutorialOverlay.show(this.gameState);
    }

    console.log(
      'CityScene created. Buildings:', this.gameState.buildings.length,
      'Citizens:', this.gameState.citizens.length,
      loaded ? '(loaded save)' : '(new game)',
    );
  }

  // ─── Grid Drawing ────────────────────────────────────────────────

  private drawGrid(): void {
    const hasGrassTex = this.textures.exists('TERRAIN_GRASS');

    // Grass layer – always visible, 4-color natural pattern
    this.grassGraphics = this.add.graphics().setDepth(0);
    const grassColors = [
      UI_COLORS.GRASS_BG, UI_COLORS.GRASS_ALT,
      UI_COLORS.GRASS_LIGHT, UI_COLORS.GRASS_DARK,
    ];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        // Pseudo-random pattern using hash (looks natural, not checkerboard)
        const hash = ((x * 73 + y * 137 + x * y * 31) >>> 0) % 4;
        this.grassGraphics.fillStyle(grassColors[hash], 1);
        this.grassGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Overlay grass texture tiles if available (adds visual depth)
    if (hasGrassTex) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const img = this.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            'TERRAIN_GRASS',
          ).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0).setAlpha(0.5);
          // Random tint + flip for variety
          const tints = [0xFFFFFF, 0xEEFFEE, 0xDDFFDD, 0xEEFFDD, 0xDDEECC];
          const h = ((x * 73 + y * 137) >>> 0);
          img.setTint(tints[h % tints.length]);
          img.setFlipX((h & 4) !== 0);
          img.setFlipY((h & 8) !== 0);
        }
      }
    }

    // Grid lines layer – hidden by default, shown only in build/road mode
    this.gridLinesGraphics = this.add.graphics().setDepth(1).setAlpha(0);
    this.gridLinesGraphics.lineStyle(1, UI_COLORS.GRID_LINE, 0.25);
    for (let x = 0; x <= GRID_WIDTH; x++) {
      this.gridLinesGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_HEIGHT);
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      this.gridLinesGraphics.lineBetween(0, y * TILE_SIZE, WORLD_WIDTH, y * TILE_SIZE);
    }
  }

  /** Scatter small deco sprites (flowers, rocks, bushes) on empty tiles. */
  private placeTerrainDecorations(): void {
    const decoKeys = ['DECO_FLOWER_1', 'DECO_ROCK_1', 'DECO_BUSH_1'];
    const availableDecos = decoKeys.filter(k => this.textures.exists(k));
    if (availableDecos.length === 0) return;

    // Seeded pseudo-random for consistent placement across loads
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const key = `${x},${y}`;

        // Always consume random values for deterministic seed progression
        const r1 = seededRandom(); // chance
        const r2 = seededRandom(); // deco type
        const r3 = seededRandom(); // offsetX
        const r4 = seededRandom(); // offsetY
        const r5 = seededRandom(); // scale
        const r6 = seededRandom(); // alpha

        // Only decorate empty tiles (no buildings, no roads)
        if (this.gameState.grid[y][x] !== null) continue;

        // ~10% chance
        if (r1 > 0.10) continue;

        // Remove old deco if present (e.g. after demolish re-call)
        this.decoSprites.get(key)?.destroy();

        const decoKey = availableDecos[Math.floor(r2 * availableDecos.length)];
        const offsetX = (r3 - 0.5) * 8;
        const offsetY = (r4 - 0.5) * 8;
        const scale = 0.6 + r5 * 0.4;

        const img = this.add.image(
          x * TILE_SIZE + TILE_SIZE / 2 + offsetX,
          y * TILE_SIZE + TILE_SIZE / 2 + offsetY,
          decoKey,
        )
          .setDisplaySize(TILE_SIZE * scale, TILE_SIZE * scale)
          .setDepth(3)
          .setAlpha(0.7 + r6 * 0.3);

        this.decoSprites.set(key, img);
      }
    }
  }

  /** Remove deco sprite at given grid tile (called when building). */
  private removeDecoAt(gx: number, gy: number): void {
    const key = `${gx},${gy}`;
    const deco = this.decoSprites.get(key);
    if (deco) {
      deco.destroy();
      this.decoSprites.delete(key);
    }
  }

  private showGridLines(): void {
    this.tweens.killTweensOf(this.gridLinesGraphics);
    this.tweens.add({
      targets: this.gridLinesGraphics,
      alpha: 1,
      duration: 200,
      ease: 'Sine.easeOut',
    });
  }

  private hideGridLines(): void {
    this.tweens.killTweensOf(this.gridLinesGraphics);
    this.tweens.add({
      targets: this.gridLinesGraphics,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
    });
  }

  // ─── Starting Buildings ──────────────────────────────────────────

  private placeStartingBuildings(): void {
    // WAREHOUSE (4×3) at grid centre
    this.placeStarterBuilding('WAREHOUSE', 18, 17);
    // HOUSE_T1 (2×2) east of warehouse
    this.placeStarterBuilding('HOUSE_T1', 23, 17);
    // GUILD_HALL (4×4) west of warehouse
    this.placeStarterBuilding('GUILD_HALL', 13, 16);

    // Roads connecting guild hall → warehouse
    for (let y = 17; y <= 19; y++) this.placeStarterBuilding('ROAD', 17, y);
    // Roads connecting warehouse → house
    for (let y = 17; y <= 18; y++) this.placeStarterBuilding('ROAD', 22, y);
  }

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

  private createStartingCitizens(): void {
    for (let i = 0; i < 6; i++) {
      this.gameState.citizens.push(createCitizen('IDLE'));
    }
  }

  // ─── Building Rendering ──────────────────────────────────────────

  private renderAllBuildings(): void {
    for (const building of this.gameState.buildings) {
      if (building.typeId !== 'ROAD') {
        this.renderBuilding(building);
      }
    }
  }

  private renderBuilding(building: BuildingInstance): void {
    this.removeBuildingSprite(building.id);

    const def = BUILDING_DEFS[building.typeId];
    const [w, h] = def.footprint;
    const px = building.x * TILE_SIZE;
    const py = building.y * TILE_SIZE;
    const pw = w * TILE_SIZE;
    const ph = h * TILE_SIZE;

    const container = this.add.container(px, py).setDepth(10);

    // Sprite or fallback
    if (this.textures.exists(def.spriteKey)) {
      const img = this.add.image(pw / 2, ph / 2, def.spriteKey).setDisplaySize(pw, ph);
      container.add(img);
    } else {
      // Only show background for buildings without sprites
      const bg = this.add.graphics();
      bg.fillStyle(UI_COLORS.BTN_DARK, 0.6);
      bg.fillRoundedRect(2, 2, pw - 4, ph - 4, 4);
      container.add(bg);
      const label = this.add.text(pw / 2, ph / 2, def.name, {
        fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
      }).setOrigin(0.5);
      container.add(label);
    }

    // Under construction overlay
    if (!building.built) {
      const overlay = this.add.graphics();
      overlay.fillStyle(UI_COLORS.CONSTRUCTION_OVERLAY, 0.5);
      overlay.fillRect(0, 0, pw, ph);
      const pctText = this.add.text(pw / 2, ph / 2 + 10, 'Building...', {
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.GOLD,
      }).setOrigin(0.5);
      container.add([overlay, pctText]);
    }

    // Connectivity indicator
    if (building.built && def.requiresConnectivity) {
      if (building.connected) {
        const dot = this.add.graphics();
        dot.fillStyle(UI_COLORS.CONNECTED_GREEN, 1);
        dot.fillCircle(pw - 6, 6, 4);
        container.add(dot);
      } else {
        // Large red "!" warning for disconnected buildings
        const warnBg = this.add.graphics();
        warnBg.fillStyle(UI_COLORS.DISCONNECTED_RED, 0.9);
        warnBg.fillCircle(pw / 2, -4, 10);
        container.add(warnBg);
        const warn = this.add.text(pw / 2, -4, '!', {
          fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.WHITE,
          fontStyle: 'bold',
        }).setOrigin(0.5);
        container.add(warn);
      }
    }

    this.buildingSprites.set(building.id, container);
  }

  private removeBuildingSprite(buildingId: number): void {
    const existing = this.buildingSprites.get(buildingId);
    if (existing) {
      existing.destroy();
      this.buildingSprites.delete(buildingId);
    }
  }

  private renderRoads(): void {
    // Clear previous road sprites
    for (const sprite of this.roadSprites) sprite.destroy();
    this.roadSprites = [];
    this.roadGraphics.clear();

    const hasRoadSprite = this.textures.exists('ROAD');

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = this.gameState.grid[y][x];
        if (!tile?.isRoad) continue;

        if (hasRoadSprite) {
          const img = this.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            'ROAD',
          ).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(2);
          this.roadSprites.push(img);
        } else {
          this.roadGraphics.fillStyle(UI_COLORS.ROAD_TINT, 1);
          this.roadGraphics.fillRect(
            x * TILE_SIZE + 2, y * TILE_SIZE + 2,
            TILE_SIZE - 4, TILE_SIZE - 4,
          );
        }
      }
    }
  }

  // ─── Ghost Preview ───────────────────────────────────────────────

  private updateGhostPreview(worldX: number, worldY: number): void {
    const mode = this.buildMenu.currentMode;
    let typeId: string;
    let fw: number, fh: number;

    if (mode === 'build' && this.selectedBuildingType) {
      typeId = this.selectedBuildingType;
      const def = BUILDING_DEFS[typeId];
      [fw, fh] = def.footprint;
    } else if (mode === 'road') {
      typeId = 'ROAD';
      fw = 1; fh = 1;
    } else {
      this.clearGhost();
      return;
    }

    const gx = Math.floor(worldX / TILE_SIZE);
    const gy = Math.floor(worldY / TILE_SIZE);

    // Only redraw when grid cell changes
    if (gx === this.ghostGridX && gy === this.ghostGridY) return;
    this.ghostGridX = gx;
    this.ghostGridY = gy;

    this.ghostGraphics.clear();

    const canPlace = this.gridSystem.canPlace(this.gameState, typeId, gx, gy);
    const canAfford = this.gridSystem.canAfford(this.gameState, typeId);
    const valid = canPlace && canAfford;

    const color = valid ? UI_COLORS.BUILD_VALID : UI_COLORS.BUILD_INVALID;
    this.ghostGraphics.fillStyle(color, 0.3);
    this.ghostGraphics.fillRect(gx * TILE_SIZE, gy * TILE_SIZE, fw * TILE_SIZE, fh * TILE_SIZE);
    this.ghostGraphics.lineStyle(2, color, 0.8);
    this.ghostGraphics.strokeRect(gx * TILE_SIZE, gy * TILE_SIZE, fw * TILE_SIZE, fh * TILE_SIZE);
  }

  private updateDemolishHighlight(worldX: number, worldY: number): void {
    this.ghostGraphics.clear();
    const building = this.gridSystem.getBuildingAtPixel(this.gameState, worldX, worldY, TILE_SIZE);
    if (building) {
      const def = BUILDING_DEFS[building.typeId];
      const [w, h] = def.footprint;
      this.ghostGraphics.fillStyle(UI_COLORS.BUILD_INVALID, 0.15);
      this.ghostGraphics.fillRect(
        building.x * TILE_SIZE, building.y * TILE_SIZE,
        w * TILE_SIZE, h * TILE_SIZE,
      );
      this.ghostGraphics.lineStyle(3, UI_COLORS.BUILD_INVALID, 0.8);
      this.ghostGraphics.strokeRect(
        building.x * TILE_SIZE, building.y * TILE_SIZE,
        w * TILE_SIZE, h * TILE_SIZE,
      );
    }
  }

  private clearGhost(): void {
    this.ghostGraphics.clear();
    this.ghostGridX = -1;
    this.ghostGridY = -1;
  }

  // ─── Sidebar Actions ────────────────────────────────────────────

  private handleSidebarAction(action: SidebarAction): void {
    // Close any open panels first
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
        this.guildUI.partySlots = this.buildingUpgradeSystem.getPartySlots(this.gameState);
        this.guildUI.show(this.gameState);
        this.sidebar.setActive(null);
        break;
      case 'expedition':
        this.buildMenu.setMode('none');
        if (this.gameState.activeExpedition) {
          this.expeditionUI.show(this.gameState);
        } else {
          this.guildUI.partySlots = this.buildingUpgradeSystem.getPartySlots(this.gameState);
          this.guildUI.show(this.gameState, 'expedition');
        }
        this.sidebar.setActive(null);
        break;
      case 'storage':
        this.buildMenu.setMode('none');
        this.storageUI.show(this.gameState);
        this.sidebar.setActive(null);
        break;
      case 'help':
        this.buildMenu.setMode('none');
        this.sidebar.setActive(null);
        this.tutorialOverlay.show(this.gameState);
        break;
    }
    this.updateStatusBar();
  }

  private updateStatusBar(): void {
    const mode = this.buildMenu.currentMode;
    const disconnected = this.gameState.buildings.filter(
      b => b.built && BUILDING_DEFS[b.typeId].requiresConnectivity && !b.connected,
    ).length;

    let status = '';
    let hint = '';

    switch (mode) {
      case 'build':
        status = 'Bau-Modus';
        hint = this.selectedBuildingType
          ? `Klicke auf eine freie Fläche um ${BUILDING_DEFS[this.selectedBuildingType]?.name ?? ''} zu platzieren`
          : 'Wähle ein Gebäude aus der Palette';
        break;
      case 'road':
        status = 'Strassen-Modus';
        hint = 'Klicke um Strassen zu bauen. Verbinde Gebäude mit dem Lagerhaus!';
        break;
      case 'demolish':
        status = 'Abriss-Modus';
        hint = 'Klicke auf ein Gebäude zum Abreissen';
        break;
      default:
        status = '';
        if (disconnected > 0) {
          hint = `${disconnected} Gebäude nicht verbunden! Baue Strassen zum Lagerhaus.`;
        } else {
          hint = 'Klicke auf Gebäude für Info. Nutze die Sidebar links.';
        }
    }

    this.statusBar.setStatus(status, hint);
  }

  // ─── Input Handling ──────────────────────────────────────────────

  private setupInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) return;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const mode = this.buildMenu.currentMode;

      if (mode === 'build' || mode === 'road') {
        this.hoverHighlight.clear();
        this.updateGhostPreview(worldPoint.x, worldPoint.y);
      } else if (mode === 'demolish') {
        this.hoverHighlight.clear();
        this.updateDemolishHighlight(worldPoint.x, worldPoint.y);
      } else {
        this.clearGhost();
        // Hover highlight for buildings in normal mode
        this.hoverHighlight.clear();
        if (pointer.x > Sidebar.WIDTH && pointer.y > 32 && pointer.y < this.scale.height - StatusBar.HEIGHT) {
          const building = this.gridSystem.getBuildingAtPixel(this.gameState, worldPoint.x, worldPoint.y, TILE_SIZE);
          if (building && building.typeId !== 'ROAD' && building.built) {
            const def = BUILDING_DEFS[building.typeId];
            const [w, h] = def.footprint;
            this.hoverHighlight.lineStyle(2, UI_COLORS.PANEL_BORDER, 0.8);
            this.hoverHighlight.strokeRect(
              building.x * TILE_SIZE, building.y * TILE_SIZE,
              w * TILE_SIZE, h * TILE_SIZE,
            );
          }
        }
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      // Block world input when modal UIs are open
      if (this.guildUI.isVisible() || this.expeditionUI.isVisible() || this.storageUI.isVisible() || this.combatOverlay.isVisible()) return;
      // Ignore clicks on sidebar (left 60px), HUD (top 32px), or status bar (bottom 28px)
      if (pointer.x < Sidebar.WIDTH) return;
      if (pointer.y < 32 || pointer.y > this.scale.height - StatusBar.HEIGHT) return;
      // Ignore clicks on build menu if visible
      if (this.buildMenu.currentMode === 'build' && pointer.y > this.scale.height - 60 - StatusBar.HEIGHT) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const gx = Math.floor(worldPoint.x / TILE_SIZE);
      const gy = Math.floor(worldPoint.y / TILE_SIZE);
      const mode = this.buildMenu.currentMode;

      if (mode === 'build' && this.selectedBuildingType) {
        this.handlePlacement(this.selectedBuildingType, gx, gy);
      } else if (mode === 'road') {
        this.handlePlacement('ROAD', gx, gy);
      } else if (mode === 'demolish') {
        this.handleDemolish(worldPoint.x, worldPoint.y);
      } else if (mode === 'none') {
        // Click on building → show info panel
        const building = this.gridSystem.getBuildingAtPixel(
          this.gameState, worldPoint.x, worldPoint.y, TILE_SIZE,
        );
        if (building && building.typeId !== 'ROAD' && building.built) {
          if (building.typeId === 'GUILD_HALL') {
            this.guildUI.partySlots = this.buildingUpgradeSystem.getPartySlots(this.gameState);
            this.guildUI.show(this.gameState);
          } else {
            this.buildingPanel.show(building, this.gameState);
          }
        } else {
          this.buildingPanel.hide();
        }
      }
    });
  }

  private handlePlacement(typeId: string, gx: number, gy: number): void {
    const result = this.gridSystem.placeBuilding(this.gameState, typeId, gx, gy);
    if (!result) return;

    // Phase 2: instant build (construction timers come in Phase 4)
    result.built = true;

    // Remove deco sprites under new building footprint
    const def = BUILDING_DEFS[typeId];
    const [fw, fh] = def ? def.footprint : [1, 1];
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        this.removeDecoAt(gx + dx, gy + dy);
      }
    }

    if (typeId === 'ROAD') {
      this.renderRoads();
    } else {
      this.renderBuilding(result);
    }

    this.afterStateChange();

    // Reset ghost so it recalculates on next move
    this.ghostGridX = -1;
    this.ghostGridY = -1;
  }

  private handleDemolish(worldX: number, worldY: number): void {
    const building = this.gridSystem.getBuildingAtPixel(this.gameState, worldX, worldY, TILE_SIZE);
    if (!building) return;
    this.handleDemolishById(building.id);
  }

  private handleDemolishById(buildingId: number): void {
    const building = this.gameState.buildings.find(b => b.id === buildingId);
    if (!building) return;

    const refund = this.gridSystem.demolish(this.gameState, buildingId);
    if (refund !== null) {
      if (building.typeId === 'ROAD') {
        this.renderRoads();
      } else {
        this.removeBuildingSprite(buildingId);
      }
      this.afterStateChange();
      this.clearGhost();
    }
  }

  /** Show floating "+X resource" text above a building when production completes. */
  private showProductionPopup(building: BuildingInstance): void {
    const recipe = RECIPE_DEFS[building.activeRecipeId!];
    if (!recipe) return;

    const def = BUILDING_DEFS[building.typeId];
    const [w, h] = def.footprint;
    const px = building.x * TILE_SIZE + (w * TILE_SIZE) / 2;
    const py = building.y * TILE_SIZE;

    const outputStr = Object.entries(recipe.outputs)
      .map(([k, v]) => `+${v} ${k}`)
      .join(' ');

    const popup = this.add.text(px, py - 8, outputStr, {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LOOT,
      fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(800);

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
    this.connectivitySystem.update(this.gameState);
    this.satisfactionSystem.update(this.gameState);
    updateSynergies(this.gameState);
    this.renderAllBuildings();
    this.hud.refresh(this.gameState);
  }

  // ─── Camera ──────────────────────────────────────────────────────

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);

    // Zoom with mouse wheel
    this.input.on('wheel', (
      _p: Phaser.Input.Pointer, _go: unknown[], _dx: number, deltaY: number,
    ) => {
      const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom + zoomDelta, 0.75, 2.0));
    });

    // Pan with middle mouse button
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        cam.scrollX += (this.dragStartX - pointer.x) / cam.zoom;
        cam.scrollY += (this.dragStartY - pointer.y) / cam.zoom;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonReleased()) this.isDragging = false;
    });

    // Edge scrolling
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) return;
      const edge = 30;
      const speed = 8 / cam.zoom;
      if (pointer.x < edge) cam.scrollX -= speed;
      if (pointer.x > this.scale.width - edge) cam.scrollX += speed;
      if (pointer.y < edge) cam.scrollY -= speed;
      if (pointer.y > this.scale.height - edge) cam.scrollY += speed;
    });
  }

  // ─── Keyboard Shortcuts ──────────────────────────────────────────

  private setupKeyboard(): void {
    const kb = this.input.keyboard!;
    kb.on('keydown-B', () => {
      this.buildMenu.setMode(this.buildMenu.currentMode === 'build' ? 'none' : 'build');
    });
    kb.on('keydown-R', () => {
      this.buildMenu.setMode(this.buildMenu.currentMode === 'road' ? 'none' : 'road');
    });
    kb.on('keydown-D', () => {
      this.buildMenu.setMode(this.buildMenu.currentMode === 'demolish' ? 'none' : 'demolish');
    });
    kb.on('keydown-F5', (e: KeyboardEvent) => {
      e.preventDefault();
      this.saveSystem.save(this.gameState);
    });
    kb.on('keydown-ESC', () => {
      if (this.combatOverlay.isVisible()) {
        // Don't close combat overlay with ESC (must click button)
      } else if (this.tutorialOverlay.isVisible()) {
        // Skip tutorial with ESC
        this.gameState.tutorial.done = true;
        this.tutorialOverlay.hide();
      } else if (this.expeditionUI.isVisible()) {
        // Don't close expedition with ESC while exploring
      } else if (this.guildUI.isVisible()) {
        this.guildUI.hide();
      } else if (this.storageUI.isVisible()) {
        this.storageUI.hide();
      } else if (this.buildingPanel.isVisible()) {
        this.buildingPanel.hide();
      } else {
        this.buildMenu.setMode('none');
      }
    });
  }

  // ─── Game Loop ───────────────────────────────────────────────────

  /** Apply expedition results: loot → stock, injuries, gear repair. */
  private finalizeExpedition(): void {
    const run = this.gameState.activeExpedition;
    if (!run) return;

    // Add loot to global stock
    for (const [itemId, qty] of Object.entries(run.loot)) {
      this.gameState.globalStock[itemId] = (this.gameState.globalStock[itemId] ?? 0) + qty;
    }
    this.gameState.globalStock.gold = (this.gameState.globalStock.gold ?? 0) + run.goldEarned;

    // Return unused provisions
    this.provisionSystem.returnProvisions(this.gameState, run.provisions);

    // Award XP to fighters (+10 bonus for completing the run)
    const xpMap = run.xpEarned ?? {};
    const runBonus = run.status === 'victory' ? 10 : 0;
    for (const unit of run.party) {
      const fighter = this.gameState.fighters.find(f => f.id === unit.id);
      if (!fighter) continue;

      const earnedXp = (xpMap[unit.id] ?? 0) + runBonus;
      if (earnedXp > 0) {
        const levelUps = awardXP(fighter, earnedXp);
        if (levelUps > 0) {
          run.combatLog.push(`>> ${fighter.name} erreicht Level ${fighter.level}!`);
        }
      }
    }

    // Calculate score before clearing the run
    this.expeditionSystem.calculateScore(run);

    // Save to scoreboard
    if (!this.gameState.scoreboard) this.gameState.scoreboard = [];
    this.gameState.scoreboard.push({
      routeId: run.routeId,
      score: run.score,
      difficulty: run.difficulty,
      modifier: run.activeModifier,
      status: run.status === 'exploring' ? 'retreat' : run.status,
      partyClasses: run.party.map(u => {
        const fighter = this.gameState.fighters.find(f => f.id === u.id);
        return fighter?.classId ?? 'unknown';
      }),
      timestamp: Date.now(),
      day: this.gameState.day,
      enemiesKilled: run.enemiesKilled,
      bossesKilled: run.bossesKilled,
    });
    // Keep scoreboard bounded (max 100 entries, drop lowest scores)
    if (this.gameState.scoreboard.length > 100) {
      this.gameState.scoreboard.sort((a, b) => b.score - a.score);
      this.gameState.scoreboard.length = 100;
    }

    // Update weekly challenge tracking
    const currentChallenge = generateWeeklyChallenge();
    const wc = this.gameState.weeklyChallenge;
    if (!wc || wc.currentChallengeId !== currentChallenge.id) {
      this.gameState.weeklyChallenge = createEmptyWeeklyChallengeState(currentChallenge.id);
    }
    // Check if this run matches the weekly challenge (route + difficulty + modifier must match)
    const challengeMatch =
      run.routeId === currentChallenge.routeId &&
      run.difficulty === currentChallenge.difficulty &&
      (currentChallenge.requiredModifier === null || run.activeModifier === currentChallenge.requiredModifier);
    if (challengeMatch) {
      const wcState = this.gameState.weeklyChallenge!;
      wcState.attempts++;
      if (run.score > wcState.bestScore) {
        wcState.bestScore = run.score;
        const newMedal = determineMedal(run.score, currentChallenge);
        if (newMedal !== 'none' && wcState.completedAt === null) {
          wcState.completedAt = Date.now();
        }
        wcState.medal = newMedal;
      }
    }

    // Handle fighters: surviving = IDLE, downed = INJURED_REST
    for (const unit of run.party) {
      const fighter = this.gameState.fighters.find(f => f.id === unit.id);
      if (!fighter) continue;
      const citizen = this.gameState.citizens.find(c => c.fighterId === fighter.id);
      if (!citizen) continue;

      if (unit.hp <= 0) {
        citizen.status = 'INJURED_REST';
        citizen.injuryTimer = 120; // 120s recovery
      } else {
        citizen.status = 'GUILD_FIGHTER';
      }

      // Gear wear: flag needs repair (costs gold to fix later)
      if (unit.hp <= 0) {
        fighter.gearNeedsRepair = true;
      }
    }

    // ── Gear Maintenance (5 Gold/item, first item free) ──
    const fighterIds = run.party.map(u => u.id);
    const maintenanceCost = this.gearMaintenanceSystem.processAfterExpedition(
      this.gameState, fighterIds,
    );
    if (maintenanceCost > 0) {
      run.combatLog.push(`>> Reparaturkosten: ${maintenanceCost} Gold`);
    }

    // ── Guild Rank: update stats + check rank-up ──
    const bossIds = run.rooms
      .filter(r => r.type === 'boss' && r.completed)
      .flatMap(r => r.enemies.filter(e => e.hp <= 0).map(e => e.defId ?? ''))
      .filter(id => id !== '');
    this.guildRankSystem.updateStats(
      this.gameState, run.routeId, run.bossesKilled, bossIds,
    );
    const rankUp = this.guildRankSystem.checkRankUp(this.gameState);
    if (rankUp) {
      run.combatLog.push(`>> ${rankUp.title}!`);
      for (const unlock of rankUp.unlocks) {
        run.combatLog.push(`   Freigeschaltet: ${unlock}`);
      }
    }

    // ── Class Unlock check ──
    const newClasses = this.classUnlockSystem.checkUnlocks(this.gameState);
    for (const classId of newClasses) {
      const cls = CLASS_DEFS[classId];
      if (cls) {
        run.combatLog.push(`>> Neue Klasse freigeschaltet: ${cls.name}!`);
      }
    }

    this.gameState.activeExpedition = null;
    this.hud.refresh(this.gameState);
  }

  private static readonly CITY_TICK_INTERVAL = 1.0;  // seconds
  private static readonly DAY_TICK_INTERVAL = 60.0;  // seconds
  private static readonly AUTO_SAVE_INTERVAL = 30.0; // seconds

  /** Reposition all UI panels to follow the camera every frame. */
  private updateUIPositions(): void {
    const cam = this.cameras.main;
    this.hud.updatePosition(cam);
    this.buildMenu.updatePosition(cam);
    this.buildingPanel.updatePosition(cam);
    this.sidebar.updatePosition(cam);
    this.statusBar.updatePosition(cam);
    if (this.guildUI.isVisible()) this.guildUI.updatePosition(cam);
    if (this.expeditionUI.isVisible()) this.expeditionUI.updatePosition(cam);
    if (this.storageUI.isVisible()) this.storageUI.updatePosition(cam);
    if (this.tutorialOverlay.isVisible()) this.tutorialOverlay.updatePosition(cam);
    if (this.combatOverlay.isVisible()) this.combatOverlay.updatePosition(cam);
    if (this.cityEventBanner.isVisible()) this.cityEventBanner.updatePosition(cam);
  }

  update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;
    const state = this.gameState;

    // ── Keep UI fixed to camera ──
    this.updateUIPositions();

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

      this.peopleSystem.cityTick(state, tickDelta);
      this.productionSystem.update(state, tickDelta);
      this.buildingUpgradeSystem.update(state, tickDelta);

      // Fighter synergy: apply training speed bonus (≥2 fighters → 10% faster)
      const trainMult = this.fighterSynergySystem.getTrainingSpeedMult(state);
      if (trainMult < 1.0) {
        for (const citizen of state.citizens) {
          if (citizen.status === 'GUILD_TRAINING') {
            // Apply bonus: subtract extra time proportional to the speed-up
            citizen.trainingTimer -= tickDelta * (1.0 / trainMult - 1.0);
          }
        }
      }

      this.hud.refresh(state);
      this.buildingPanel.updateProgress();

      // Production completion popups
      for (const b of state.buildings) {
        if (!b.activeRecipeId) continue;
        const prevTimer = preTimers.get(b.id);
        // If timer was > 0 and now reset (production completed)
        if (prevTimer !== undefined && prevTimer > 0 && prevTimer <= tickDelta + 0.1) {
          this.showProductionPopup(b);
        }
      }
    }

    // ── Day Tick (every 60s) ──
    state.dayTickAccumulator += deltaSec;
    if (state.dayTickAccumulator >= CityScene.DAY_TICK_INTERVAL) {
      state.dayTickAccumulator = 0;

      this.economySystem.dayTick(state);
      this.peopleSystem.dayTick(state);
      this.cityEventSystem.dayTick(state);
      this.hud.refresh(state);
      this.cityEventBanner.refresh(state);
    }

    // ── Auto-save (every 30s) ──
    this.autoSaveAccumulator += deltaSec;
    if (this.autoSaveAccumulator >= CityScene.AUTO_SAVE_INTERVAL) {
      this.autoSaveAccumulator = 0;
      this.saveSystem.save(state);
    }
  }
}
