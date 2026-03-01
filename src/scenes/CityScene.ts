import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT, BORDER_MARGIN_PX, BORDER_MARGIN_TILES, ISO_MODE } from '../rendering/Colors';
import {
  gridToIso, isoToGrid,
  ISO_WORLD_W, ISO_WORLD_H,
  ISO_TILE_W, ISO_TILE_H, ISO_TILE_HALF_W, ISO_TILE_HALF_H,
  drawIsoDiamond, strokeIsoDiamond, strokeIsoBuildingFootprint,
} from '../rendering/IsoRenderer';
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
import { VolumeUI } from '../ui/VolumeUI';
import { StatisticsUI } from '../ui/StatisticsUI';
import { AchievementUI } from '../ui/AchievementUI';
import { AchievementSystem } from '../systems/AchievementSystem';
import { Celebrations } from '../ui/Celebrations';
import { getSynergyLines } from '../utils/SynergyOverlay';
import { applyBuildingAnimation } from '../utils/BuildingAnimations';
import { DungeonMapUI } from '../ui/DungeonMapUI';

/** Dungeon-Zone: 10×10 Felder, Ursprung bei (DUNGEON_ZONE_OGX, DUNGEON_ZONE_OGY). */
const DUNGEON_ZONE_W = 10;
const DUNGEON_ZONE_H = 10;
const DUNGEON_ZONE_OGX = 0;   // linke Kante (gx)
const DUNGEON_ZONE_OGY = 13;  // obere Kante (gy) – Lager bei gy=19, Berg bei gy≈15.5
/** Felsige Grautöne für Dungeon-Terrain. */
const DUNGEON_ROCK_COLORS = [0x4A4235, 0x3D3628, 0x565040, 0x302820];
/** Sumpfzone: 3 Felder Rand um die Dungeon-Zone (außerhalb der Zone selbst). */
const SWAMP_MARGIN = 3;
/** Trübe Moortöne für Sumpf-Terrain. */
const SWAMP_COLORS = [0x2D4A2A, 0x3A5530, 0x4A5535, 0x263325];

function isInDungeonZone(gx: number, gy: number): boolean {
  return gx >= DUNGEON_ZONE_OGX && gx < DUNGEON_ZONE_OGX + DUNGEON_ZONE_W &&
         gy >= DUNGEON_ZONE_OGY && gy < DUNGEON_ZONE_OGY + DUNGEON_ZONE_H;
}

function isInSwampZone(gx: number, gy: number): boolean {
  const inRing = gx >= DUNGEON_ZONE_OGX - SWAMP_MARGIN &&
                 gx < DUNGEON_ZONE_OGX + DUNGEON_ZONE_W + SWAMP_MARGIN &&
                 gy >= DUNGEON_ZONE_OGY - SWAMP_MARGIN &&
                 gy < DUNGEON_ZONE_OGY + DUNGEON_ZONE_H + SWAMP_MARGIN;
  return inRing && !isInDungeonZone(gx, gy);
}

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
  private achievementSystem!: AchievementSystem;
  private autoSaveAccumulator = 0;

  // Rendering layers
  private grassGraphics!: Phaser.GameObjects.Graphics;
  private gridLinesGraphics!: Phaser.GameObjects.Graphics;
  private swampGraphics!: Phaser.GameObjects.Graphics;
  private roadGraphics!: Phaser.GameObjects.Graphics;
  private roadSprites: Phaser.GameObjects.Image[] = [];

  // Swamp editor state
  private swampVariant: 0 | 1 | 2 = 0;
  /** 3 color palettes for swamp variants (light / medium / deep) */
  private static readonly SWAMP_VARIANT_COLORS: [number, number, number][] = [
    [0x3E6B30, 0x4A7838, 0x527040], // 0 = hell (greenish wetland)
    [0x2D5228, 0x3A5C30, 0x455535], // 1 = mittel (green-brown)
    [0x1C3318, 0x243020, 0x2A3822], // 2 = tief  (dark murky)
  ];
  private decoSprites = new Map<string, Phaser.GameObjects.Image>();
  private ghostGraphics!: Phaser.GameObjects.Graphics;
  private synergyGraphics!: Phaser.GameObjects.Graphics;
  private buildingSprites = new Map<number, Phaser.GameObjects.Container>();

  // Ghost preview state
  private ghostGridX = -1;
  private ghostGridY = -1;

  // Camera panning
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

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
  private volumeUI!: VolumeUI;
  private statisticsUI!: StatisticsUI;
  private achievementUI!: AchievementUI;
  private dungeonMapUI!: DungeonMapUI;
  /** true wenn die aktive Expedition vom Dungeon-Lager gestartet wurde. */
  private dungeonExpeditionActive = false;
  private selectedBuildingType: string | null = null;
  private hoverHighlight!: Phaser.GameObjects.Graphics;
  // DEBUG: zoom alignment markers
  private debugBorderDiv!: HTMLDivElement;                // CSS div — immune to Phaser zoom/scroll
  private debugViewportGfx!: Phaser.GameObjects.Graphics; // world-space orange

  // ── Debug: Berg / Lager Positionierung ──────────────────────
  private mountSprite: Phaser.GameObjects.Image | null = null;
  private debugMode: 'mountain' | 'camp' | null = null;
  private mountGx = 2.5;
  private mountGy = 15.5;
  private campDebugGx = 4;
  private campDebugGy = 16;
  private campGhostSprite: Phaser.GameObjects.Image | null = null;
  private debugOverlayText: Phaser.GameObjects.Text | null = null;
  private debugKeyTimer = 0;

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
    this.achievementSystem = new AchievementSystem();

    // Try to load saved game, else create new
    const loaded = this.saveSystem.load();
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

    // Rendering layers (ordered by depth)
    this.drawMapBorder();
    this.drawGrid();
    this.swampGraphics = this.add.graphics().setDepth(0.5); // between grass (0) and roads (1)
    this.roadGraphics = this.add.graphics().setDepth(ISO_MODE ? 1 : 2);
    this.ghostGraphics = this.add.graphics().setDepth(850);
    this.synergyGraphics = this.add.graphics().setDepth(852);

    // DEBUG Line A: world-space viewport rect — moves with camera/zoom (orange thick)
    this.debugViewportGfx = this.add.graphics().setDepth(999);

    // DEBUG Line B: CSS div overlay aligned to the Phaser canvas element.
    // Completely outside Phaser's render pipeline — zoom/scroll can never move it.
    this.debugBorderDiv = document.createElement('div');
    this.debugBorderDiv.style.cssText = [
      'position:fixed',
      'border:2px solid cyan',
      'pointer-events:none',
      'z-index:9999',
      'box-sizing:border-box',
    ].join(';');
    document.body.appendChild(this.debugBorderDiv);
    this.syncDebugBorderToCanvas();

    // Place starting layout (only for new games)
    if (!loaded) {
      this.placeStartingBuildings();
      this.createStartingCitizens();
    }
    this.renderAllBuildings();
    this.renderRoads();
    this.renderSwamp();
    this.placeTerrainDecorations();
    this.placeDungeonMountain();

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
    this.combatOverlay.onPreCombatTarget = (enemyId: number) => {
      const run = this.gameState.activeExpedition;
      if (run) {
        this.expeditionSystem.setFocusTarget(run, enemyId);
      }
    };
    // Give CombatOverlay access to expedition system for provision use in preview
    this.combatOverlay.setExpeditionContext(this.expeditionSystem, this.gameState);

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

    // Volume UI
    this.volumeUI = new VolumeUI(this, this.soundManager);

    // Statistics UI
    this.statisticsUI = new StatisticsUI(this);

    // Achievement UI
    this.achievementUI = new AchievementUI(this);

    // Dungeon Map UI
    this.dungeonMapUI = new DungeonMapUI(this);
    this.dungeonMapUI.partySlots = this.buildingUpgradeSystem.getPartySlots(this.gameState);
    this.dungeonMapUI.onStartExpedition = (routeId, fighterIds, difficulty, modifierId, consumables) => {
      this.dungeonExpeditionActive = true;
      this.expeditionSystem.startExpedition(this.gameState, routeId, fighterIds, difficulty, modifierId, false, consumables);
      if (this.gameState.activeExpedition) {
        this.talismanSystem.applyToParty(this.gameState, this.gameState.activeExpedition.party);
      }
      this.expeditionUI.show(this.gameState);
    };

    // Hover highlight for buildings (above all world objects, below UI)
    this.hoverHighlight = this.add.graphics().setDepth(855);

    // Input & camera
    this.setupCamera();
    this.setupInput();
    this.setupKeyboard();
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Start background music
    this.soundManager.playMusic('music_city');

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

  // ─── Map Border (trees, dark grass around the playable area) ────

  private drawMapBorder(): void {
    if (ISO_MODE) {
      this.drawMapBorderIso();
      return;
    }

    const M = BORDER_MARGIN_TILES;
    const T = TILE_SIZE;
    const borderGrass = this.add.graphics().setDepth(-2);
    const borderColors = [UI_COLORS.BORDER_GRASS_DARK, UI_COLORS.BORDER_GRASS_MID];

    // Fill entire border area with dark grass
    for (let by = -M; by < GRID_HEIGHT + M; by++) {
      for (let bx = -M; bx < GRID_WIDTH + M; bx++) {
        // Skip the playable area (already drawn by drawGrid)
        if (bx >= 0 && bx < GRID_WIDTH && by >= 0 && by < GRID_HEIGHT) continue;
        const hash = ((bx * 73 + by * 137 + bx * by * 31) >>> 0) % 2;
        borderGrass.fillStyle(borderColors[hash], 1);
        borderGrass.fillRect(bx * T, by * T, T, T);
      }
    }

    // Overlay grass texture on border too
    if (this.textures.exists('TERRAIN_GRASS')) {
      for (let by = -M; by < GRID_HEIGHT + M; by++) {
        for (let bx = -M; bx < GRID_WIDTH + M; bx++) {
          if (bx >= 0 && bx < GRID_WIDTH && by >= 0 && by < GRID_HEIGHT) continue;
          const img = this.add.image(bx * T + T / 2, by * T + T / 2, 'TERRAIN_GRASS')
            .setDisplaySize(T, T).setDepth(-2).setAlpha(0.35);
          const h = ((bx * 73 + by * 137) >>> 0);
          img.setTint([0xCCDDCC, 0xBBCCBB, 0xAABBAA][h % 3]);
          img.setFlipX((h & 4) !== 0);
          img.setFlipY((h & 8) !== 0);
        }
      }
    }

    // Scatter trees and rocks on the border
    let seed = 7777;
    const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

    const treeKeys = ['TERRAIN_TREE_LARGE', 'TERRAIN_TREE_PINE'].filter(k => this.textures.exists(k));
    const smallDecoKeys = ['DECO_ROCK_1', 'DECO_BUSH_1', 'DECO_STONE_LARGE'].filter(k => this.textures.exists(k));

    for (let by = -M; by < GRID_HEIGHT + M; by++) {
      for (let bx = -M; bx < GRID_WIDTH + M; bx++) {
        if (bx >= 0 && bx < GRID_WIDTH && by >= 0 && by < GRID_HEIGHT) continue;

        const r1 = rng();
        const r2 = rng();
        const r3 = rng();
        const r4 = rng();
        const r5 = rng();

        // Distance from the playable edge (0 = right at edge, higher = farther out)
        const distFromEdge = Math.min(
          bx < 0 ? -bx : bx >= GRID_WIDTH ? bx - GRID_WIDTH + 1 : 999,
          by < 0 ? -by : by >= GRID_HEIGHT ? by - GRID_HEIGHT + 1 : 999,
        );

        // Trees: denser farther from the edge, sparser near the grid
        const treeChance = distFromEdge <= 1 ? 0.35 : 0.6;
        if (treeKeys.length > 0 && r1 < treeChance) {
          const treeKey = treeKeys[Math.floor(r2 * treeKeys.length)];
          const offsetX = (r3 - 0.5) * 12;
          const offsetY = (r4 - 0.5) * 12;
          const scale = 0.7 + r5 * 0.5;
          this.add.image(bx * T + T / 2 + offsetX, by * T + T / 2 + offsetY, treeKey)
            .setDisplaySize(T * scale * 1.4, T * scale * 1.8)
            .setDepth(-1)
            .setAlpha(0.85 + r5 * 0.15);
        } else if (smallDecoKeys.length > 0 && r1 < treeChance + 0.15) {
          // Small decorations in gaps between trees
          const decoKey = smallDecoKeys[Math.floor(r2 * smallDecoKeys.length)];
          this.add.image(bx * T + T / 2, by * T + T / 2, decoKey)
            .setDisplaySize(T * 0.6, T * 0.6)
            .setDepth(-1)
            .setAlpha(0.7);
        }
      }
    }

    // Soft edge: slightly darkened tiles at the very edge of the playable area
    const edgeGraphics = this.add.graphics().setDepth(0.5);
    for (let x = 0; x < GRID_WIDTH; x++) {
      // Top row
      edgeGraphics.fillStyle(UI_COLORS.BORDER_GRASS_DARK, 0.15);
      edgeGraphics.fillRect(x * T, 0, T, T);
      // Bottom row
      edgeGraphics.fillRect(x * T, (GRID_HEIGHT - 1) * T, T, T);
    }
    for (let y = 0; y < GRID_HEIGHT; y++) {
      // Left column
      edgeGraphics.fillStyle(UI_COLORS.BORDER_GRASS_DARK, 0.15);
      edgeGraphics.fillRect(0, y * T, T, T);
      // Right column
      edgeGraphics.fillRect((GRID_WIDTH - 1) * T, y * T, T, T);
    }
  }

  /** Isometric border: dark void background + ring of darker grass diamonds + trees. */
  private drawMapBorderIso(): void {
    // Dark void background behind everything
    const bgGfx = this.add.graphics().setDepth(-10);
    bgGfx.fillStyle(0x08120A, 1);
    bgGfx.fillRect(-600, -600, ISO_WORLD_W + 1200, ISO_WORLD_H + 1200);

    // Border layout: M=6 rings total
    //   distFromEdge 1   → sand/shore transition
    //   distFromEdge 2-3 → dark grass (forest edge)
    //   distFromEdge 4-6 → water (island ocean border)
    const M = 6;
    const WATER_START = 4; // rings at this distance or more become water
    const SHORE_RING = WATER_START - 1; // sandy transition ring
    const borderGrassColors = [UI_COLORS.BORDER_GRASS_DARK, UI_COLORS.BORDER_GRASS_MID];
    // Shore/sand: warm sandy-brown tones
    const shoreColors = [0x8B7355, 0x9B8263, 0x7A6548];
    // Deep water color: single consistent deep blue-green, no per-tile variation
    const WATER_COLOR = 0x1A5F8A;

    // 1. Water background: one solid filled rectangle behind everything
    const waterGfx = this.add.graphics().setDepth(-3);
    waterGfx.fillStyle(WATER_COLOR, 1);
    const waterPad = M * ISO_TILE_W;
    waterGfx.fillRect(-waterPad * 2, -waterPad, ISO_WORLD_W + waterPad * 4, ISO_WORLD_H + waterPad * 2);

    // 2. Grass rings and shore ring drawn as diamonds
    const borderGfx = this.add.graphics().setDepth(-2);
    for (let gy = -M; gy < GRID_HEIGHT + M; gy++) {
      for (let gx = -M; gx < GRID_WIDTH + M; gx++) {
        if (gx >= 0 && gx < GRID_WIDTH && gy >= 0 && gy < GRID_HEIGHT) continue;
        const hash = ((gx * 73 + gy * 137 + gx * gy * 31) >>> 0);
        const distFromEdge = Math.min(
          gx < 0 ? -gx : gx >= GRID_WIDTH ? gx - GRID_WIDTH + 1 : 999,
          gy < 0 ? -gy : gy >= GRID_HEIGHT ? gy - GRID_HEIGHT + 1 : 999,
        );
        if (distFromEdge >= WATER_START) {
          // Water zone: skip – covered by solid water background
          continue;
        } else if (distFromEdge === SHORE_RING) {
          // Sandy shore transition
          borderGfx.fillStyle(shoreColors[hash % 3], 1);
          drawIsoDiamond(borderGfx, gx, gy);
        } else {
          // Grass border rings
          borderGfx.fillStyle(borderGrassColors[hash % 2], 1);
          drawIsoDiamond(borderGfx, gx, gy);
        }
      }
    }

    // 3. Subtle foam lines at the shore edge (distFromEdge == WATER_START)
    const foamGfx = this.add.graphics().setDepth(-1.5);
    foamGfx.lineStyle(1, 0x7EC8E3, 0.45);
    for (let gy = -M; gy < GRID_HEIGHT + M; gy++) {
      for (let gx = -M; gx < GRID_WIDTH + M; gx++) {
        if (gx >= 0 && gx < GRID_WIDTH && gy >= 0 && gy < GRID_HEIGHT) continue;
        const distFromEdge = Math.min(
          gx < 0 ? -gx : gx >= GRID_WIDTH ? gx - GRID_WIDTH + 1 : 999,
          gy < 0 ? -gy : gy >= GRID_HEIGHT ? gy - GRID_HEIGHT + 1 : 999,
        );
        if (distFromEdge === WATER_START) {
          strokeIsoDiamond(foamGfx, gx, gy);
        }
      }
    }

    // Border trees and deco – only on the grass rings (distFromEdge < WATER_START)
    let seed = 7777;
    const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    // Prefer ISO trees; fall back to terrain trees
    const treeKeys = ['ISO_TREE_LARGE', 'ISO_TREE_PINE', 'TERRAIN_TREE_LARGE', 'TERRAIN_TREE_PINE']
      .filter(k => this.textures.exists(k)).slice(0, 2);
    const smallDecoKeys = ['DECO_ROCK_1', 'DECO_BUSH_1', 'DECO_STONE_LARGE'].filter(k => this.textures.exists(k));

    for (let gy = -M; gy < GRID_HEIGHT + M; gy++) {
      for (let gx = -M; gx < GRID_WIDTH + M; gx++) {
        if (gx >= 0 && gx < GRID_WIDTH && gy >= 0 && gy < GRID_HEIGHT) continue;
        const r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng(), r5 = rng();

        const distFromEdge = Math.min(
          gx < 0 ? -gx : gx >= GRID_WIDTH ? gx - GRID_WIDTH + 1 : 999,
          gy < 0 ? -gy : gy >= GRID_HEIGHT ? gy - GRID_HEIGHT + 1 : 999,
        );
        // Trees only in grass zone
        if (distFromEdge >= WATER_START) continue;

        const treeChance = distFromEdge <= 1 ? 0.30 : 0.55;
        const iso = gridToIso(gx, gy);

        if (treeKeys.length > 0 && r1 < treeChance) {
          const treeKey = treeKeys[Math.floor(r2 * treeKeys.length)];
          const scale = 0.8 + r5 * 0.5;
          const treeW = ISO_TILE_W * scale * 1.2;
          this.add.image(
            iso.x + (r3 - 0.5) * ISO_TILE_W * 0.5,
            iso.y + ISO_TILE_HALF_H + (r4 - 0.5) * ISO_TILE_H * 0.4,
            treeKey,
          )
            .setDisplaySize(treeW, treeW * 1.5)
            .setDepth(-1)
            .setAlpha(0.85 + r5 * 0.15);
        } else if (smallDecoKeys.length > 0 && r1 < treeChance + 0.15) {
          const decoKey = smallDecoKeys[Math.floor(r2 * smallDecoKeys.length)];
          this.add.image(iso.x, iso.y + ISO_TILE_HALF_H, decoKey)
            .setDisplaySize(ISO_TILE_HALF_W, ISO_TILE_HALF_W)
            .setDepth(-1)
            .setAlpha(0.7);
        }
      }
    }
  }

  // ─── Grid Drawing ────────────────────────────────────────────────

  private drawGrid(): void {
    const grassColors = [
      UI_COLORS.GRASS_BG, UI_COLORS.GRASS_ALT,
      UI_COLORS.GRASS_LIGHT, UI_COLORS.GRASS_DARK,
    ];

    if (ISO_MODE) {
      // ── Isometric mode: draw diamond tiles ──
      this.grassGraphics = this.add.graphics().setDepth(0);
      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          const hash = ((gx * 73 + gy * 137 + gx * gy * 31) >>> 0) % 4;
          // Dungeon-Zone: felsige Grautöne – Sumpf-Ring: trübe Moortöne
          if (isInDungeonZone(gx, gy)) {
            this.grassGraphics.fillStyle(DUNGEON_ROCK_COLORS[hash], 1);
          } else if (isInSwampZone(gx, gy)) {
            this.grassGraphics.fillStyle(SWAMP_COLORS[hash], 1);
          } else {
            this.grassGraphics.fillStyle(grassColors[hash], 1);
          }
          drawIsoDiamond(this.grassGraphics, gx, gy);
        }
      }

      // Iso grid lines – diamond outlines shown only in build/road mode
      this.gridLinesGraphics = this.add.graphics().setDepth(870).setAlpha(0);
      this.gridLinesGraphics.lineStyle(1, UI_COLORS.GRID_LINE, 0.35);
      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          strokeIsoDiamond(this.gridLinesGraphics, gx, gy);
        }
      }
      return;
    }

    // ── Legacy top-down mode ──
    const hasGrassTex = this.textures.exists('TERRAIN_GRASS');
    this.grassGraphics = this.add.graphics().setDepth(0);
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const hash = ((x * 73 + y * 137 + x * y * 31) >>> 0) % 4;
        this.grassGraphics.fillStyle(grassColors[hash], 1);
        this.grassGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    if (hasGrassTex) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const img = this.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            'TERRAIN_GRASS',
          ).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0).setAlpha(0.5);
          const tints = [0xFFFFFF, 0xEEFFEE, 0xDDFFDD, 0xEEFFDD, 0xDDEECC];
          const h = ((x * 73 + y * 137) >>> 0);
          img.setTint(tints[h % tints.length]);
          img.setFlipX((h & 4) !== 0);
          img.setFlipY((h & 8) !== 0);
        }
      }
    }

    this.gridLinesGraphics = this.add.graphics().setDepth(1).setAlpha(0);
    this.gridLinesGraphics.lineStyle(1, UI_COLORS.GRID_LINE, 0.25);
    for (let x = 0; x <= GRID_WIDTH; x++) {
      this.gridLinesGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_HEIGHT);
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      this.gridLinesGraphics.lineBetween(0, y * TILE_SIZE, WORLD_WIDTH, y * TILE_SIZE);
    }
  }

  /** Scatter deco sprites on empty tiles — dense and varied for a lively world. */
  private placeTerrainDecorations(): void {
    const groundDecos = [
      'DECO_FLOWER_1', 'DECO_ROCK_1', 'DECO_BUSH_1',
      'DECO_GRASS_TUFT', 'DECO_STONE_LARGE', 'DECO_MUSHROOM',
      'DECO_LOG', 'DECO_WILDFLOWER_2',
    ].filter(k => this.textures.exists(k));
    // Prefer ISO tree in ISO mode, fall back to regular deco tree
    const treeDecos = (ISO_MODE
      ? ['ISO_TREE_SMALL', 'DECO_TREE_SMALL']
      : ['DECO_TREE_SMALL']
    ).filter(k => this.textures.exists(k)).slice(0, 1);

    if (groundDecos.length === 0 && treeDecos.length === 0) return;

    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let gy = 0; gy < GRID_HEIGHT; gy++) {
      for (let gx = 0; gx < GRID_WIDTH; gx++) {
        const key = `${gx},${gy}`;

        // Always consume random values for deterministic seed progression
        const r1 = seededRandom();
        const r2 = seededRandom();
        const r3 = seededRandom();
        const r4 = seededRandom();
        const r5 = seededRandom();
        const r6 = seededRandom();
        const r7 = seededRandom();

        if (this.gameState.grid[gy][gx] !== null) continue;
        this.decoSprites.get(key)?.destroy();

        if (ISO_MODE) {
          // ── Iso mode: position at iso tile center ──
          const iso = gridToIso(gx, gy);
          // Tile center: top vertex + half tile height
          const baseX = iso.x + (r3 - 0.5) * ISO_TILE_HALF_W * 0.5;
          const baseY = iso.y + ISO_TILE_HALF_H + (r4 - 0.5) * ISO_TILE_HALF_H * 0.5;
          const depth = (gx + gy) * 10 + 2;

          // Dungeon-Zone: Felsdekorationen
          if (isInDungeonZone(gx, gy)) {
            const stoneKeys = ['DECO_STONE_LARGE', 'DECO_LOG'].filter(k => this.textures.exists(k));
            if (stoneKeys.length === 0 || r1 > 0.45) continue;
            const sk = stoneKeys[Math.floor(r2 * stoneKeys.length)];
            const scale = 0.5 + r5 * 0.4;
            const img = this.add.image(baseX, baseY, sk)
              .setDisplaySize(ISO_TILE_HALF_W * scale * 1.2, ISO_TILE_HALF_W * scale * 1.2)
              .setDepth(depth)
              .setAlpha(0.65 + r6 * 0.25)
              .setTint(0x888070);
            this.decoSprites.set(key, img);
            continue;
          }

          // Sumpfzone: Pilze, Logs und moosige Dekorationen
          if (isInSwampZone(gx, gy)) {
            const swampDecos = ['DECO_MUSHROOM', 'DECO_LOG', 'DECO_STONE_LARGE'].filter(k => this.textures.exists(k));
            if (swampDecos.length === 0 || r1 > 0.40) continue;
            const sk = swampDecos[Math.floor(r2 * swampDecos.length)];
            const scale = 0.4 + r5 * 0.35;
            const img = this.add.image(baseX, baseY, sk)
              .setDisplaySize(ISO_TILE_HALF_W * scale * 1.1, ISO_TILE_HALF_W * scale * 1.1)
              .setDepth(depth)
              .setAlpha(0.55 + r6 * 0.30)
              .setTint(0x4A6B3A); // moosiger Grünton
            this.decoSprites.set(key, img);
            continue;
          }

          if (treeDecos.length > 0 && r7 < 0.05) {
            const treeKey = treeDecos[Math.floor(r2 * treeDecos.length)];
            const scale = 0.7 + r5 * 0.4;
            const treeW = ISO_TILE_W * scale;
            const img = this.add.image(baseX, baseY - 6, treeKey)
              .setDisplaySize(treeW, treeW * 1.4)
              .setDepth(depth + 1)
              .setAlpha(0.85 + r6 * 0.15);
            this.decoSprites.set(key, img);
            continue;
          }

          if (groundDecos.length === 0 || r1 > 0.30) continue;
          const decoKey = groundDecos[Math.floor(r2 * groundDecos.length)];
          const scale = 0.4 + r5 * 0.35;
          const img = this.add.image(baseX, baseY, decoKey)
            .setDisplaySize(ISO_TILE_HALF_W * scale, ISO_TILE_HALF_W * scale)
            .setDepth(depth)
            .setAlpha(0.70 + r6 * 0.30);
          this.decoSprites.set(key, img);

        } else {
          // ── Legacy top-down mode ──
          if (treeDecos.length > 0 && r7 < 0.05) {
            const treeKey = treeDecos[Math.floor(r2 * treeDecos.length)];
            const scale = 0.8 + r5 * 0.4;
            const img = this.add.image(
              gx * TILE_SIZE + TILE_SIZE / 2 + (r3 - 0.5) * 6,
              gy * TILE_SIZE + TILE_SIZE / 2 - 4 + (r4 - 0.5) * 4,
              treeKey,
            )
              .setDisplaySize(TILE_SIZE * scale, TILE_SIZE * scale * 1.25)
              .setDepth(8)
              .setAlpha(0.85 + r6 * 0.15);
            this.decoSprites.set(key, img);
            continue;
          }

          if (groundDecos.length === 0 || r1 > 0.35) continue;
          const decoKey = groundDecos[Math.floor(r2 * groundDecos.length)];
          const img = this.add.image(
            gx * TILE_SIZE + TILE_SIZE / 2 + (r3 - 0.5) * 10,
            gy * TILE_SIZE + TILE_SIZE / 2 + (r4 - 0.5) * 10,
            decoKey,
          )
            .setDisplaySize(TILE_SIZE * (0.5 + r5 * 0.5), TILE_SIZE * (0.5 + r5 * 0.5))
            .setDepth(3)
            .setAlpha(0.65 + r6 * 0.35);
          this.decoSprites.set(key, img);
        }
      }
    }
  }

  /** Place the dungeon mountain as a large static landmark in the dungeon zone. */
  private placeDungeonMountain(): void {
    if (!ISO_MODE) return;
    if (!this.textures.exists('ISO_DUNGEON_MOUNTAIN')) return;

    // Position "behind" the dungeon camp (gx=2,gy=2) in iso perspective
    const iso = gridToIso(this.mountGx, this.mountGy);
    const mountainW = ISO_TILE_W * 5;    // 320px — spans ~5 tiles wide
    const mountainH = mountainW * 1.25;  // 400px tall (384×480 aspect ratio)
    // depth 25: above background (0), behind dungeon camp (gx+gy=4 → ~43)
    const depth = (this.mountGx + this.mountGy) * 10 - 5;

    this.mountSprite = this.add.image(iso.x, iso.y + ISO_TILE_HALF_H, 'ISO_DUNGEON_MOUNTAIN')
      .setDisplaySize(mountainW, mountainH)
      .setDepth(depth)
      .setOrigin(0.5, 1)   // anchor at bottom-center so base sits on terrain
      .setAlpha(0.95);
  }

  // ─── Debug Positionierung ─────────────────────────────────────

  private toggleDebugMode(mode: 'mountain' | 'camp'): void {
    if (this.debugMode === mode) {
      // Modus beenden
      this.debugMode = null;
      this.debugOverlayText?.destroy();
      this.debugOverlayText = null;
      this.campGhostSprite?.destroy();
      this.campGhostSprite = null;
      return;
    }
    this.debugMode = mode;
    this.debugKeyTimer = 9999;

    // Debug-Text overlay (fixiert zur Kamera via updateUIPositions)
    const cam = this.cameras.main;
    const x = cam.scrollX + 100;
    const y = cam.scrollY + cam.height - 80;
    this.debugOverlayText = this.add.text(x, y, '', {
      fontSize: '14px', color: '#FFE066',
      backgroundColor: '#000000CC', padding: { x: 8, y: 6 },
    }).setDepth(1200).setScrollFactor(0);

    if (mode === 'camp') {
      // Ghost-Sprite für Lager-Vorschau – exakt wie renderBuilding (Footprint 4×4)
      if (this.textures.exists('ISO_DUNGEON_CAMP')) {
        const fp = 4; // DUNGEON_CAMP footprint
        const spriteW = (fp + fp) * ISO_TILE_HALF_W;
        const spriteH = spriteW * 1.15;
        const iso = gridToIso(this.campDebugGx + fp / 2, this.campDebugGy + fp / 2);
        this.campGhostSprite = this.add.image(iso.x, iso.y + ISO_TILE_HALF_H - spriteH * 0.22, 'ISO_DUNGEON_CAMP')
          .setDisplaySize(spriteW, spriteH)
          .setDepth(999).setOrigin(0.5, 0.5).setAlpha(0.6).setTint(0x88AAFF);
      }
    }
    this.updateDebugOverlay();
  }

  private handleDebugMovement(delta: number): void {
    this.debugKeyTimer += delta;
    const firstPress = this.debugKeyTimer > 350;
    const repeat     = this.debugKeyTimer > 100;
    if (!firstPress && !repeat) return;

    const shift = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).isDown;
    const step  = this.debugMode === 'camp' ? 1 : (shift ? 0.1 : 0.5);

    let moved = false;
    // ISO-korrekte Bewegung: UP/DOWN = diagonal, LEFT/RIGHT = diagonal
    if (this.cursors.up.isDown)    { this.adjustDebugPos(-step, -step); moved = true; }
    if (this.cursors.down.isDown)  { this.adjustDebugPos(+step, +step); moved = true; }
    if (this.cursors.left.isDown)  { this.adjustDebugPos(-step, +step); moved = true; }
    if (this.cursors.right.isDown) { this.adjustDebugPos(+step, -step); moved = true; }

    if (moved) {
      this.debugKeyTimer = 0;
      this.updateDebugSprite();
      this.updateDebugOverlay();
    }
  }

  private adjustDebugPos(dgx: number, dgy: number): void {
    if (this.debugMode === 'mountain') {
      this.mountGx = Math.round((this.mountGx + dgx) * 10) / 10;
      this.mountGy = Math.round((this.mountGy + dgy) * 10) / 10;
    } else if (this.debugMode === 'camp') {
      this.campDebugGx = Math.round(this.campDebugGx + dgx);
      this.campDebugGy = Math.round(this.campDebugGy + dgy);
    }
  }

  private updateDebugSprite(): void {
    if (this.debugMode === 'mountain' && this.mountSprite) {
      const iso = gridToIso(this.mountGx, this.mountGy);
      this.mountSprite.setPosition(iso.x, iso.y + ISO_TILE_HALF_H);
      this.mountSprite.setDepth((this.mountGx + this.mountGy) * 10 - 5);
    } else if (this.debugMode === 'camp' && this.campGhostSprite) {
      const fp = 4;
      const spriteH = (fp + fp) * ISO_TILE_HALF_W * 1.15;
      const iso = gridToIso(this.campDebugGx + fp / 2, this.campDebugGy + fp / 2);
      this.campGhostSprite.setPosition(iso.x, iso.y + ISO_TILE_HALF_H - spriteH * 0.22);
      this.campGhostSprite.setDepth((this.campDebugGx + fp + this.campDebugGy + fp) * 10 + 5);
    }
  }

  private updateDebugOverlay(): void {
    if (!this.debugOverlayText) return;
    if (this.debugMode === 'mountain') {
      const gx = this.mountGx.toFixed(1);
      const gy = this.mountGy.toFixed(1);
      this.debugOverlayText.setText(
        `[F2] BERG-MODUS | gx=${gx}  gy=${gy}\n` +
        `[←→↑↓] Bewegen (Shift = fein 0.1)  |  [C] Kopieren  |  [F2] Beenden`
      );
    } else if (this.debugMode === 'camp') {
      this.debugOverlayText.setText(
        `[F4] LAGER-MODUS | gx=${this.campDebugGx}  gy=${this.campDebugGy}\n` +
        `[←→↑↓] Bewegen  |  [C] Kopieren  |  [F4] Beenden`
      );
    }
  }

  private copyDebugPosition(): void {
    let text = '';
    if (this.debugMode === 'mountain') {
      text = `Berg: gridToIso(${this.mountGx}, ${this.mountGy})`;
    } else if (this.debugMode === 'camp') {
      text = `Lager: gx=${this.campDebugGx}, gy=${this.campDebugGy}`;
    }
    navigator.clipboard.writeText(text).then(() => {
      if (this.debugOverlayText) {
        const prev = this.debugOverlayText.text;
        this.debugOverlayText.setText('✓ In Zwischenablage kopiert!\n' + text);
        this.time.delayedCall(1500, () => {
          this.debugOverlayText?.setText(prev);
        });
      }
    }).catch(() => console.log('[DEBUG position]', text));
    console.log('[DEBUG position]', text);
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

    // DUNGEON_CAMP (4×4) in der Dungeon-Zone
    this.placeStarterBuilding('DUNGEON_CAMP', 4, 16);
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

  /** Maps typeId → dedicated isometric sprite key (used when ISO_MODE=true). */
  private static readonly ISO_SPRITE_MAP: Record<string, string> = {
    HOUSE_T1:     'ISO_HOUSE',
    GUILD_HALL:   'ISO_GUILD_HALL',
    DUNGEON_CAMP: 'ISO_DUNGEON_CAMP',
    WAREHOUSE:    'ISO_WAREHOUSE',
    FARM_GRAIN:   'ISO_FARM_GRAIN',
    MILL_WIND:    'ISO_MILL_WIND',
    BAKERY:       'ISO_BAKERY',
    LUMBER_CAMP:  'ISO_LUMBER_CAMP',
    QUARRY:       'ISO_QUARRY',
    HERB_GARDEN:  'ISO_HERB_GARDEN',
    SMITHY:       'ISO_SMITHY',
    IRON_MINE:    'ISO_IRON_MINE',
    WELL:         'ISO_WELL',
  };

  private renderBuilding(building: BuildingInstance): void {
    this.removeBuildingSprite(building.id);

    const def = BUILDING_DEFS[building.typeId];
    const [w, h] = def.footprint;

    if (ISO_MODE) {
      // ── Isometric rendering ──
      // Sprite width spans the full iso footprint (w+h tiles wide)
      const spriteW = (w + h) * ISO_TILE_HALF_W;
      const spriteH = spriteW * 1.15;

      // Container at iso center of the footprint top face
      const centerIso = gridToIso(building.x + w / 2, building.y + h / 2);
      const contX = centerIso.x;
      const contY = centerIso.y + ISO_TILE_HALF_H;

      // Depth: front tile of footprint (highest gx+gy) determines draw order
      const depth = (building.x + w - 1 + building.y + h - 1) * 10 + 5;
      const container = this.add.container(contX, contY).setDepth(depth);

      // Shadow ellipse at base
      const shadowGfx = this.add.graphics();
      shadowGfx.fillStyle(UI_COLORS.SHADOW_COLOR, 0.28);
      shadowGfx.fillEllipse(0, 4, spriteW * 0.85, 14);
      container.add(shadowGfx);

      // Prefer dedicated ISO sprite, fall back to regular sprite
      const isoKey = CityScene.ISO_SPRITE_MAP[building.typeId];
      const effectiveSpriteKey = (isoKey && this.textures.exists(isoKey)) ? isoKey : def.spriteKey;

      // Building sprite or iso-footprint fallback
      if (this.textures.exists(effectiveSpriteKey)) {
        const img = this.add.image(0, -spriteH * 0.22, effectiveSpriteKey)
          .setDisplaySize(spriteW, spriteH)
          .setOrigin(0.5, 0.5);
        container.add(img);
      } else {
        // Fallback: coloured iso diamond with label
        const fbGfx = this.add.graphics();
        fbGfx.fillStyle(UI_COLORS.BTN_DARK, 0.85);
        const halfW = spriteW / 2;
        const halfH = (w + h) * ISO_TILE_HALF_H / 2;
        fbGfx.fillPoints([
          { x: 0,      y: -halfH },
          { x: halfW,  y: 0 },
          { x: 0,      y: halfH },
          { x: -halfW, y: 0 },
        ], true);
        fbGfx.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.6);
        fbGfx.strokePoints([
          { x: 0,      y: -halfH },
          { x: halfW,  y: 0 },
          { x: 0,      y: halfH },
          { x: -halfW, y: 0 },
        ], true);
        container.add(fbGfx);
        const label = this.add.text(0, 0, def.name, {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT,
        }).setOrigin(0.5);
        container.add(label);
      }

      // Under construction overlay
      if (!building.built) {
        const overlay = this.add.graphics();
        overlay.fillStyle(UI_COLORS.CONSTRUCTION_OVERLAY, 0.45);
        overlay.fillCircle(0, -spriteH * 0.25, spriteW * 0.4);
        const pctText = this.add.text(0, -spriteH * 0.25 + 12, 'Bau...', {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD,
        }).setOrigin(0.5);
        container.add([overlay, pctText]);
      }

      // Connectivity indicator
      if (building.built && def.requiresConnectivity) {
        if (building.connected) {
          const dot = this.add.graphics();
          dot.fillStyle(UI_COLORS.CONNECTED_GREEN, 1);
          dot.fillCircle(spriteW / 2 - 4, -spriteH * 0.22 - 2, 4);
          container.add(dot);
        } else {
          const warnBg = this.add.graphics();
          warnBg.fillStyle(UI_COLORS.DISCONNECTED_RED, 0.9);
          warnBg.fillCircle(0, -spriteH * 0.60, 10);
          container.add(warnBg);
          const warn = this.add.text(0, -spriteH * 0.60, '!', {
            fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.WHITE,
            fontStyle: 'bold',
          }).setOrigin(0.5);
          container.add(warn);
        }
      }

      applyBuildingAnimation(this, building, container);
      this.buildingSprites.set(building.id, container);
      return;
    }

    // ── Legacy top-down rendering ──
    const px = building.x * TILE_SIZE;
    const py = building.y * TILE_SIZE;
    const pw = w * TILE_SIZE;
    const ph = h * TILE_SIZE;

    const container = this.add.container(px, py).setDepth(10);

    const shadowGfx = this.add.graphics();
    shadowGfx.fillStyle(UI_COLORS.SHADOW_COLOR, 0.22);
    shadowGfx.fillEllipse(pw / 2, ph - 2, pw * 0.85, ph * 0.3);
    container.add(shadowGfx);

    if (this.textures.exists(def.spriteKey)) {
      const img = this.add.image(pw / 2, ph / 2, def.spriteKey).setDisplaySize(pw, ph);
      container.add(img);
    } else {
      const bg = this.add.graphics();
      bg.fillStyle(UI_COLORS.BTN_DARK, 0.6);
      bg.fillRoundedRect(2, 2, pw - 4, ph - 4, 4);
      container.add(bg);
      const label = this.add.text(pw / 2, ph / 2, def.name, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
      }).setOrigin(0.5);
      container.add(label);
    }

    if (!building.built) {
      const overlay = this.add.graphics();
      overlay.fillStyle(UI_COLORS.CONSTRUCTION_OVERLAY, 0.5);
      overlay.fillRect(0, 0, pw, ph);
      const pctText = this.add.text(pw / 2, ph / 2 + 10, 'Building...', {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD,
      }).setOrigin(0.5);
      container.add([overlay, pctText]);
    }

    if (building.built && def.requiresConnectivity) {
      if (building.connected) {
        const dot = this.add.graphics();
        dot.fillStyle(UI_COLORS.CONNECTED_GREEN, 1);
        dot.fillCircle(pw - 6, 6, 4);
        container.add(dot);
      } else {
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

    applyBuildingAnimation(this, building, container);
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
    for (const sprite of this.roadSprites) sprite.destroy();
    this.roadSprites = [];
    this.roadGraphics.clear();

    if (ISO_MODE) {
      // ── Iso mode: draw darker diamond tiles for roads ──
      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          const tile = this.gameState.grid[gy][gx];
          if (!tile?.isRoad) continue;
          // Subtle variation for natural cobble look
          const h = ((gx * 31 + gy * 47) >>> 0) % 3;
          const roadColors = [0x7A7060, 0x706858, 0x6A6050];
          this.roadGraphics.fillStyle(roadColors[h], 0.92);
          drawIsoDiamond(this.roadGraphics, gx, gy);
          this.roadGraphics.lineStyle(1, 0x5A5040, 0.4);
          strokeIsoDiamond(this.roadGraphics, gx, gy);
        }
      }
      return;
    }

    // ── Legacy top-down road rendering ──
    const hasCobble = this.textures.exists('ROAD_COBBLE');
    const hasRoadSprite = this.textures.exists('ROAD');

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = this.gameState.grid[y][x];
        if (!tile?.isRoad) continue;

        if (hasCobble) {
          const img = this.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            'ROAD_COBBLE',
          ).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(2);
          const h = ((x * 31 + y * 47) >>> 0) % 3;
          img.setTint([0xFFFFFF, 0xEEEEDD, 0xDDDDCC][h]);
          this.roadSprites.push(img);
        } else if (hasRoadSprite) {
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

  // ─── Swamp Terrain Editor ────────────────────────────────────────

  /** Re-draw all manually placed swamp tiles from gameState.swampTiles. */
  private renderSwamp(): void {
    this.swampGraphics.clear();
    const tiles = this.gameState.swampTiles;
    if (!tiles) return;

    for (const [key, variant] of Object.entries(tiles)) {
      const [gxStr, gyStr] = key.split(',');
      const gx = parseInt(gxStr, 10);
      const gy = parseInt(gyStr, 10);
      if (isNaN(gx) || isNaN(gy)) continue;

      const palette = CityScene.SWAMP_VARIANT_COLORS[variant as 0 | 1 | 2] ?? CityScene.SWAMP_VARIANT_COLORS[0];
      const hash = ((gx * 73 + gy * 137 + gx * gy * 31) >>> 0) % palette.length;
      this.swampGraphics.fillStyle(palette[hash], 1);

      if (ISO_MODE) {
        drawIsoDiamond(this.swampGraphics, gx, gy);
      } else {
        this.swampGraphics.fillRect(gx * TILE_SIZE, gy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  /** Paint or erase a swamp tile at (gx, gy). Clicking existing same-variant erases it. */
  private handleSwampPaint(gx: number, gy: number): void {
    if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) return;
    if (!this.gameState.swampTiles) this.gameState.swampTiles = {};

    const key = `${gx},${gy}`;
    const existing = this.gameState.swampTiles[key];

    if (existing === this.swampVariant) {
      // Toggle off (erase)
      delete this.gameState.swampTiles[key];
    } else {
      // Paint with current variant (overwrites different variant too)
      this.gameState.swampTiles[key] = this.swampVariant;
    }

    this.renderSwamp();
  }

  /** Update ghost preview for swamp-paint mode. */
  private updateSwampGhostPreview(worldX: number, worldY: number): void {
    let gx: number, gy: number;
    if (ISO_MODE) {
      const ig = isoToGrid(worldX, worldY);
      gx = ig.gx; gy = ig.gy;
    } else {
      gx = Math.floor(worldX / TILE_SIZE);
      gy = Math.floor(worldY / TILE_SIZE);
    }

    if (gx === this.ghostGridX && gy === this.ghostGridY) return;
    this.ghostGridX = gx;
    this.ghostGridY = gy;

    this.ghostGraphics.clear();

    const palette = CityScene.SWAMP_VARIANT_COLORS[this.swampVariant];
    const previewColor = palette[1]; // middle color for preview

    if (ISO_MODE) {
      this.ghostGraphics.fillStyle(previewColor, 0.55);
      drawIsoDiamond(this.ghostGraphics, gx, gy);
      this.ghostGraphics.lineStyle(2, previewColor, 0.9);
      strokeIsoDiamond(this.ghostGraphics, gx, gy);
    } else {
      this.ghostGraphics.fillStyle(previewColor, 0.5);
      this.ghostGraphics.fillRect(gx * TILE_SIZE, gy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  /** Export swamp tile data to console + clipboard + brief on-screen display. */
  private exportSwampData(): void {
    const tiles = this.gameState.swampTiles ?? {};
    const count = Object.keys(tiles).length;
    const json = JSON.stringify(tiles, null, 2);
    console.log('[SwampExport] Sumpf-Tiles gespeichert:', count, 'Felder');
    console.log(json);
    navigator.clipboard?.writeText(json).catch(() => {});

    // Brief on-screen feedback
    const txt = this.add.text(
      this.cameras.main.worldView.x + this.scale.width / 2,
      this.cameras.main.worldView.y + 60,
      `✓ ${count} Sumpf-Tiles exportiert (Console + Clipboard)`,
      { fontFamily: FONT_FAMILY, fontSize: '13px', color: '#5DE8A0', backgroundColor: '#000000AA',
        padding: { left: 10, right: 10, top: 5, bottom: 5 } },
    ).setOrigin(0.5).setDepth(1000).setScrollFactor(0);
    this.time.delayedCall(3000, () => txt.destroy());
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

    let gx: number, gy: number;
    if (ISO_MODE) {
      const ig = isoToGrid(worldX, worldY);
      gx = ig.gx; gy = ig.gy;
    } else {
      gx = Math.floor(worldX / TILE_SIZE);
      gy = Math.floor(worldY / TILE_SIZE);
    }

    if (gx === this.ghostGridX && gy === this.ghostGridY) return;
    this.ghostGridX = gx;
    this.ghostGridY = gy;

    this.ghostGraphics.clear();

    const canPlace = this.gridSystem.canPlace(this.gameState, typeId, gx, gy);
    const canAfford = this.gridSystem.canAfford(this.gameState, typeId);
    const valid = canPlace && canAfford;
    const color = valid ? UI_COLORS.BUILD_VALID : UI_COLORS.BUILD_INVALID;

    if (ISO_MODE) {
      this.ghostGraphics.fillStyle(color, 0.28);
      for (let dy = 0; dy < fh; dy++) {
        for (let dx = 0; dx < fw; dx++) {
          drawIsoDiamond(this.ghostGraphics, gx + dx, gy + dy);
        }
      }
      this.ghostGraphics.lineStyle(2, color, 0.85);
      strokeIsoBuildingFootprint(this.ghostGraphics, gx, gy, fw, fh);
    } else {
      this.ghostGraphics.fillStyle(color, 0.3);
      this.ghostGraphics.fillRect(gx * TILE_SIZE, gy * TILE_SIZE, fw * TILE_SIZE, fh * TILE_SIZE);
      this.ghostGraphics.lineStyle(2, color, 0.8);
      this.ghostGraphics.strokeRect(gx * TILE_SIZE, gy * TILE_SIZE, fw * TILE_SIZE, fh * TILE_SIZE);
    }

    // Synergy overlay lines — only in top-down mode (iso coords differ)
    this.synergyGraphics.clear();
    if (!ISO_MODE && mode === 'build' && this.selectedBuildingType) {
      const lines = getSynergyLines(this.gameState, this.selectedBuildingType, gx, gy);
      for (const line of lines) {
        const lineColor = line.inRange ? 0x44FF44 : 0xFF4444;
        this.synergyGraphics.lineStyle(2, lineColor, 0.6);
        this.synergyGraphics.lineBetween(line.fromX, line.fromY, line.toX, line.toY);
      }
    }
  }

  private updateDemolishHighlight(worldX: number, worldY: number): void {
    this.ghostGraphics.clear();
    let building: BuildingInstance | null;
    if (ISO_MODE) {
      const { gx, gy } = isoToGrid(worldX, worldY);
      building = this.gridSystem.getBuildingAtGrid(this.gameState, gx, gy);
    } else {
      building = this.gridSystem.getBuildingAtPixel(this.gameState, worldX, worldY, TILE_SIZE);
    }
    if (building) {
      const def = BUILDING_DEFS[building.typeId];
      const [w, h] = def.footprint;
      this.ghostGraphics.fillStyle(UI_COLORS.BUILD_INVALID, 0.15);
      if (ISO_MODE) {
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            drawIsoDiamond(this.ghostGraphics, building.x + dx, building.y + dy);
          }
        }
        this.ghostGraphics.lineStyle(3, UI_COLORS.BUILD_INVALID, 0.8);
        strokeIsoBuildingFootprint(this.ghostGraphics, building.x, building.y, w, h);
      } else {
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
  }

  private clearGhost(): void {
    this.ghostGraphics.clear();
    this.synergyGraphics.clear();
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
      case 'swamp': {
        const variantNames = ['Hell', 'Mittel', 'Tief'];
        status = `Sumpf-Maler (${variantNames[this.swampVariant]})`;
        hint = 'Klicke/Ziehe zum Malen. 1/2/3 = Variante. Klick auf vorh. Tile = löschen. F6 = Exportieren.';
        break;
      }
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
      } else if (mode === 'swamp') {
        this.hoverHighlight.clear();
        this.updateSwampGhostPreview(worldPoint.x, worldPoint.y);
        // Drag-paint while holding left button
        if (pointer.isDown && pointer.leftButtonDown()) {
          if (ISO_MODE) {
            const { gx, gy } = isoToGrid(worldPoint.x, worldPoint.y);
            this.handleSwampPaint(gx, gy);
          } else {
            const gx = Math.floor(worldPoint.x / TILE_SIZE);
            const gy = Math.floor(worldPoint.y / TILE_SIZE);
            this.handleSwampPaint(gx, gy);
          }
        }
      } else {
        this.clearGhost();
        // Hover highlight for buildings in normal mode
        this.hoverHighlight.clear();
        if (pointer.x > Sidebar.WIDTH && pointer.y > 32 && pointer.y < this.scale.height - StatusBar.HEIGHT) {
          let hovBuilding: BuildingInstance | null;
          if (ISO_MODE) {
            const { gx, gy } = isoToGrid(worldPoint.x, worldPoint.y);
            hovBuilding = this.gridSystem.getBuildingAtGrid(this.gameState, gx, gy);
          } else {
            hovBuilding = this.gridSystem.getBuildingAtPixel(this.gameState, worldPoint.x, worldPoint.y, TILE_SIZE);
          }
          if (hovBuilding && hovBuilding.typeId !== 'ROAD' && hovBuilding.built) {
            const def = BUILDING_DEFS[hovBuilding.typeId];
            const [w, h] = def.footprint;
            this.hoverHighlight.lineStyle(2, UI_COLORS.PANEL_BORDER, 0.8);
            if (ISO_MODE) {
              strokeIsoBuildingFootprint(this.hoverHighlight, hovBuilding.x, hovBuilding.y, w, h);
            } else {
              this.hoverHighlight.strokeRect(
                hovBuilding.x * TILE_SIZE, hovBuilding.y * TILE_SIZE,
                w * TILE_SIZE, h * TILE_SIZE,
              );
            }
          }
        }
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      // Block world input when modal UIs are open
      if (this.guildUI.isVisible() || this.expeditionUI.isVisible() || this.storageUI.isVisible() || this.combatOverlay.isVisible() || this.statisticsUI.isVisible() || this.achievementUI.isVisible() || this.dungeonMapUI.isVisible()) return;
      // Ignore clicks on sidebar (left 60px), HUD (top 32px), or status bar (bottom 28px)
      if (pointer.x < Sidebar.WIDTH) return;
      if (pointer.y < 32 || pointer.y > this.scale.height - StatusBar.HEIGHT) return;
      // Ignore clicks on build menu if visible
      if (this.buildMenu.currentMode === 'build' && pointer.y > this.scale.height - 60 - StatusBar.HEIGHT) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      let gx: number, gy: number;
      if (ISO_MODE) {
        const ig = isoToGrid(worldPoint.x, worldPoint.y);
        gx = ig.gx; gy = ig.gy;
      } else {
        gx = Math.floor(worldPoint.x / TILE_SIZE);
        gy = Math.floor(worldPoint.y / TILE_SIZE);
      }
      const mode = this.buildMenu.currentMode;

      if (mode === 'build' && this.selectedBuildingType) {
        this.handlePlacement(this.selectedBuildingType, gx, gy);
      } else if (mode === 'road') {
        this.handlePlacement('ROAD', gx, gy);
      } else if (mode === 'swamp') {
        this.handleSwampPaint(gx, gy);
      } else if (mode === 'demolish') {
        this.handleDemolish(worldPoint.x, worldPoint.y);
      } else if (mode === 'none') {
        // Click on building → show info panel
        const building = ISO_MODE
          ? this.gridSystem.getBuildingAtGrid(this.gameState, gx, gy)
          : this.gridSystem.getBuildingAtPixel(this.gameState, worldPoint.x, worldPoint.y, TILE_SIZE);
        if (building && building.typeId !== 'ROAD' && building.built) {
          if (building.typeId === 'GUILD_HALL') {
            this.guildUI.partySlots = this.buildingUpgradeSystem.getPartySlots(this.gameState);
            this.guildUI.show(this.gameState);
          } else if (building.typeId === 'DUNGEON_CAMP') {
            if (this.gameState.activeExpedition) {
              this.expeditionUI.show(this.gameState);
            } else {
              this.dungeonMapUI.partySlots = this.buildingUpgradeSystem.getPartySlots(this.gameState);
              this.dungeonMapUI.show(this.gameState);
            }
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

    // Statistics: building built (#22)
    this.gameState.statistics.total_buildings_built = (this.gameState.statistics.total_buildings_built ?? 0) + 1;

    this.afterStateChange();

    // Reset ghost so it recalculates on next move
    this.ghostGridX = -1;
    this.ghostGridY = -1;
  }

  private handleDemolish(worldX: number, worldY: number): void {
    let building: BuildingInstance | null;
    if (ISO_MODE) {
      const { gx, gy } = isoToGrid(worldX, worldY);
      building = this.gridSystem.getBuildingAtGrid(this.gameState, gx, gy);
    } else {
      building = this.gridSystem.getBuildingAtPixel(this.gameState, worldX, worldY, TILE_SIZE);
    }
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
      // Statistics: building demolished (#22)
      this.gameState.statistics.total_buildings_demolished = (this.gameState.statistics.total_buildings_demolished ?? 0) + 1;
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
    this.connectivitySystem.update(this.gameState);
    this.satisfactionSystem.update(this.gameState);
    updateSynergies(this.gameState);
    this.renderAllBuildings();
    this.hud.refresh(this.gameState);
  }

  // ─── Camera ──────────────────────────────────────────────────────

  private setupCamera(): void {
    const cam = this.cameras.main;
    if (ISO_MODE) {
      cam.centerOn(ISO_WORLD_W / 2, ISO_WORLD_H / 2);
    } else {
      cam.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    }

    // Zoom with mouse wheel — Phaser pivots zoom at camera center internally,
    // so setZoom alone keeps the visible center fixed. No scroll adjustment needed.
    this.input.on('wheel', (
      _pointer: Phaser.Input.Pointer, _go: unknown[], _dx: number, deltaY: number,
    ) => {
      const newZoom = Phaser.Math.Clamp(cam.zoom + (deltaY > 0 ? -0.1 : 0.1), 0.75, 2.0);
      cam.setZoom(newZoom);
      // Immediately sync worldView so updateUIPositions() uses correct values this frame.
      // Phaser normally defers this to preRender(), causing a 1-frame UI flicker on zoom.
      const wvX = cam.scrollX + cam.width  / 2 * (1 - 1 / newZoom);
      const wvY = cam.scrollY + cam.height / 2 * (1 - 1 / newZoom);
      cam.worldView.setTo(wvX, wvY, cam.width / newZoom, cam.height / newZoom);
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
    // W = Sumpf-Maler Modus (Terrain-Editor, Dev-Tool)
    kb.on('keydown-W', () => {
      this.buildMenu.setMode(this.buildMenu.currentMode === 'swamp' ? 'none' : 'swamp');
      if (this.buildMenu.currentMode === 'none') this.clearGhost();
    });
    // 1/2/3 = Sumpf-Variante wechseln (nur im Sumpf-Modus)
    kb.on('keydown-ONE', () => {
      this.swampVariant = 0;
      if (this.buildMenu.currentMode === 'swamp') this.updateStatusBar();
    });
    kb.on('keydown-TWO', () => {
      this.swampVariant = 1;
      if (this.buildMenu.currentMode === 'swamp') this.updateStatusBar();
    });
    kb.on('keydown-THREE', () => {
      this.swampVariant = 2;
      if (this.buildMenu.currentMode === 'swamp') this.updateStatusBar();
    });
    // F6 = Sumpf-Daten exportieren (JSON in Konsole + Clipboard)
    kb.on('keydown-F6', (e: KeyboardEvent) => {
      e.preventDefault();
      this.exportSwampData();
    });
    kb.on('keydown-F5', (e: KeyboardEvent) => {
      e.preventDefault();
      this.saveSystem.save(this.gameState);
    });
    // DEBUG: P = copy zoom/scroll + orange vs cyan alignment to clipboard
    kb.on('keydown-P', () => {
      const cam = this.cameras.main;
      const cr = this.game.canvas.getBoundingClientRect();
      // Scale factor: how many browser pixels per game pixel
      const sx = cr.width  / cam.width;
      const sy = cr.height / cam.height;
      // Orange viewport rect converted to browser pixels (cam.x/y are game pixels)
      const oL = cr.left + cam.x * sx;
      const oT = cr.top  + cam.y * sy;
      const oR = cr.left + (cam.x + cam.width)  * sx;
      const oB = cr.top  + (cam.y + cam.height) * sy;
      // Drift = orange_browser - cyan_browser (0 = perfect alignment)
      const dL = oL - cr.left;
      const dT = oT - cr.top;
      const dR = oR - (cr.left + cr.width);
      const dB = oB - (cr.top  + cr.height);
      const wv = cam.worldView;
      const wvOffX = (wv.x - cam.scrollX).toFixed(2);
      const wvOffY = (wv.y - cam.scrollY).toFixed(2);
      const info = [
        `zoom=${cam.zoom.toFixed(3)}`,
        `scale=${sx.toFixed(3)}x${sy.toFixed(3)}`,
        `drift=[L:${dL.toFixed(1)} T:${dT.toFixed(1)} R:${dR.toFixed(1)} B:${dB.toFixed(1)}]`,
        `wvOffset=[${wvOffX},${wvOffY}]`,
        `canvasWH=[${cr.width.toFixed(0)},${cr.height.toFixed(0)}]`,
        `scrollXY=[${cam.scrollX.toFixed(1)},${cam.scrollY.toFixed(1)}]`,
      ].join(' | ');
      navigator.clipboard?.writeText(info).catch(() => {});
      console.log('[DEBUG zoom]', info);
    });
    kb.on('keydown-T', () => {
      if (this.statisticsUI.isVisible()) { this.statisticsUI.hide(); }
      else { this.statisticsUI.show(this.gameState); }
    });
    kb.on('keydown-A', () => {
      if (this.achievementUI.isVisible()) { this.achievementUI.hide(); }
      else { this.achievementUI.show(this.gameState); }
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
      } else if (this.dungeonMapUI.isVisible()) {
        this.dungeonMapUI.hide();
      } else if (this.guildUI.isVisible()) {
        this.guildUI.hide();
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
    });

    // ── Debug Positionierungs-Modus ──────────────────────────────
    kb.on('keydown-F2', () => this.toggleDebugMode('mountain'));
    kb.on('keydown-F4', () => this.toggleDebugMode('camp'));
    kb.on('keydown-C', () => { if (this.debugMode) this.copyDebugPosition(); });
  }

  // ─── Game Loop ───────────────────────────────────────────────────

  /** Apply expedition results: loot → stock, injuries, gear repair. */
  private finalizeExpedition(): void {
    const run = this.gameState.activeExpedition;
    if (!run) return;

    // ── Guaranteed gear drop: 1 thematic gear item per completed run ──
    const ROUTE_GEAR_POOLS: Record<string, string[]> = {
      forest_short:  ['wolf_fang_necklace', 'hunter_bow', 'leather_armor'],
      forest_medium: ['wolf_fang_necklace', 'hunter_bow', 'leather_armor'],
      cave_deep:     ['iron_sword', 'iron_shield', 'leather_armor'],
      cave_spider:   ['spider_silk_vest', 'iron_sword', 'wolf_fang_necklace'],
      swamp_long:    ['spider_silk_vest', 'leather_armor', 'wolf_fang_necklace'],
      ruins_crypts:  ['steel_sword', 'steel_armor', 'crystal_pendant'],
      ruins_depths:  ['steel_sword', 'steel_armor', 'ranger_cloak', 'crystal_pendant'],
      volcano_core:  ['steel_armor', 'longbow', 'crystal_staff'],
    };
    const gearPool = ROUTE_GEAR_POOLS[run.routeId];
    if (gearPool && gearPool.length > 0) {
      const guaranteed = gearPool[Math.floor(Math.random() * gearPool.length)];
      run.loot[guaranteed] = (run.loot[guaranteed] ?? 0) + 1;
    }

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

    // ── Statistics tracking (#22) ──
    const stats = this.gameState.statistics;
    stats.total_expeditions = (stats.total_expeditions ?? 0) + 1;
    stats.total_enemies_killed = (stats.total_enemies_killed ?? 0) + run.enemiesKilled;
    stats.total_bosses_killed = (stats.total_bosses_killed ?? 0) + run.bossesKilled;
    stats.total_gold_earned = (stats.total_gold_earned ?? 0) + run.goldEarned;
    if (run.status === 'victory') {
      stats.total_victories = (stats.total_victories ?? 0) + 1;
      // Flawless victory: all party members survived with HP > 0
      const allAlive = run.party.every(u => u.hp > 0);
      if (allAlive) stats.total_flawless_victories = (stats.total_flawless_victories ?? 0) + 1;
    }
    else if (run.status === 'defeat') stats.total_defeats = (stats.total_defeats ?? 0) + 1;
    else stats.total_retreats = (stats.total_retreats ?? 0) + 1;

    // ── Milestone banners ──
    if (stats.total_expeditions === 1) {
      this.tutorialOverlay.showMilestoneBanner('Erste Expedition abgeschlossen!');
    } else if (stats.total_victories === 1) {
      this.tutorialOverlay.showMilestoneBanner('Erster Sieg errungen!');
    } else if (stats.total_bosses_killed === 1 && run.bossesKilled > 0) {
      this.tutorialOverlay.showMilestoneBanner('Erster Boss besiegt!');
    }

    // ── Specialist from survivor room (#17) ──
    if (run.specialistFound) {
      const alreadyOwned = this.gameState.specialists.some(
        s => s.specialistId === run.specialistFound,
      );
      if (!alreadyOwned) {
        this.gameState.specialists.push({
          specialistId: run.specialistFound,
          assignedBuildingId: null,
        });
        run.combatLog.push(`>> Spezialist gefunden: ${run.specialistFound}!`);
      }
    }

    // ── Celebrations (#27) ──
    if (run.bossesKilled > 0) {
      Celebrations.bossConfetti(this);
    }
    if (rankUp) {
      Celebrations.flashBanner(this, `Rang aufgestiegen: ${rankUp.title}!`);
    }

    // ── Achievement check (#23) ──
    const newAchievements = this.achievementSystem.checkAchievements(
      this.gameState.statistics,
      this.gameState.achievements,
    );
    for (const achId of newAchievements) {
      this.gameState.achievements.push(achId);
      Celebrations.floatingNotification(this, `Errungenschaft: ${achId}`);
    }

    this.gameState.activeExpedition = null;
    this.hud.refresh(this.gameState);

    // Wenn die Expedition vom Dungeon-Lager gestartet wurde, Dungeon-Karte erneut öffnen
    if (this.dungeonExpeditionActive) {
      this.dungeonExpeditionActive = false;
      this.dungeonMapUI.partySlots = this.buildingUpgradeSystem.getPartySlots(this.gameState);
      this.dungeonMapUI.show(this.gameState);
    }
  }

  private static readonly CITY_TICK_INTERVAL = 1.0;  // seconds
  private static readonly DAY_TICK_INTERVAL = 60.0;  // seconds
  private static readonly AUTO_SAVE_INTERVAL = 30.0; // seconds

  /** Snap the cyan debug border div to the exact pixel bounds of the Phaser canvas. */
  private syncDebugBorderToCanvas(): void {
    const r = this.game.canvas.getBoundingClientRect();
    const s = this.debugBorderDiv.style;
    s.left   = `${r.left}px`;
    s.top    = `${r.top}px`;
    s.width  = `${r.width}px`;
    s.height = `${r.height}px`;
  }

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
    if (this.volumeUI.isVisible()) this.volumeUI.updatePosition(cam);
    if (this.statisticsUI.isVisible()) this.statisticsUI.updatePosition(cam);
    if (this.achievementUI.isVisible()) this.achievementUI.updatePosition(cam);
    if (this.dungeonMapUI.isVisible()) this.dungeonMapUI.updatePosition(cam);
    // DEBUG: keep cyan div aligned to canvas (handles window resize)
    this.syncDebugBorderToCanvas();
    // DEBUG: scene viewport border — use cam.worldView so Phaser's bounds-correction
    // offset is already included (manual scrollX + scale/zoom misses that offset).
    this.debugViewportGfx.clear();
    this.debugViewportGfx.lineStyle(4, 0xFF6600, 1);
    const wv = cam.worldView;
    this.debugViewportGfx.strokeRect(wv.x, wv.y, wv.width, wv.height);
    // DEBUG: cyan border is a CSS div — no Phaser update needed, it never moves.
  }

  update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;
    const state = this.gameState;

    // ── Keep UI fixed to camera ──
    this.updateUIPositions();

    // ── Arrow key camera panning (disabled when debug mode active) ──
    if (this.debugMode) {
      this.handleDebugMovement(delta);
    } else {
      const cam = this.cameras.main;
      const speed = (300 / cam.zoom) * (delta / 1000);
      if (this.cursors.left.isDown)  cam.scrollX -= speed;
      if (this.cursors.right.isDown) cam.scrollX += speed;
      if (this.cursors.up.isDown)    cam.scrollY -= speed;
      if (this.cursors.down.isDown)  cam.scrollY += speed;
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

      this.economySystem.dayTick(state);
      this.peopleSystem.dayTick(state);
      this.cityEventSystem.dayTick(state);
      this.hud.refresh(state);
      this.cityEventBanner.refresh(state);

      // Statistics: day tracking (#22)
      state.statistics.total_days_survived = state.day;
    }

    // ── Auto-save (every 30s) ──
    this.autoSaveAccumulator += deltaSec;
    if (this.autoSaveAccumulator >= CityScene.AUTO_SAVE_INTERVAL) {
      this.autoSaveAccumulator = 0;
      this.saveSystem.save(state);
    }
  }
}
