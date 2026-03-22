// ─── CityBuildingRenderer ───────────────────────────────────────
// Owns all building/road/swamp/ghost rendering logic.
// Extracted from CityScene to keep CityScene focused on orchestration.
// ──────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import {
  UI_COLORS, UI_STR_COLORS, FONT_FAMILY, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT,
  ISO_MODE,
} from '../rendering/Colors';
import {
  gridToIso, isoToGrid,
  ISO_TILE_HALF_W, ISO_TILE_HALF_H,
  ISO_WORLD_W, ISO_WORLD_H,
  drawIsoDiamond, strokeIsoDiamond, strokeIsoBuildingFootprint,
} from '../rendering/IsoRenderer';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { BUILDING_DEFS } from '../data/buildings';
import { GridSystem } from '../systems/GridSystem';
import { VisualFX } from '../rendering/VisualFX';
import { applyBuildingAnimation } from '../utils/BuildingAnimations';
import { getSynergyLines } from '../utils/SynergyOverlay';
import { BuildMode } from '../ui/html/HTMLBuildMenu';

export class CityBuildingRenderer {
  // ── Public fields accessible by CityScene culling ──
  readonly buildingSprites = new Map<number, Phaser.GameObjects.Container>();
  roadSprites: Phaser.GameObjects.Image[] = [];

  // ── Private graphics layers ──
  private roadGraphics!: Phaser.GameObjects.Graphics;
  private swampGraphics!: Phaser.GameObjects.Graphics;
  private ghostGraphics!: Phaser.GameObjects.Graphics;
  private synergyGraphics!: Phaser.GameObjects.Graphics;

  // ── Ghost preview state ──
  private ghostGridX = -1;
  private ghostGridY = -1;

  // ── Swamp editor ──
  private swampVariant: 0 | 1 | 2 = 0;

  // ── Terrain painter (gray / dirt) ──
  private paintVariant: 0 | 1 | 2 = 0;       // 0=light, 1=medium, 2=dark
  private paintType: 'gray' | 'dirt' = 'gray';
  private paintRT!: Phaser.GameObjects.RenderTexture;

  // ── Optional VisualFX reference ──
  private visualFX?: VisualFX;

  /** 3 color palettes for swamp variants (light / medium / deep) */
  static readonly SWAMP_VARIANT_COLORS: [number, number, number][] = [
    [0x3E6B30, 0x4A7838, 0x527040],
    [0x2D5228, 0x3A5C30, 0x455535],
    [0x1C3318, 0x243020, 0x2A3822],
  ];

  // Tile-Keys für die 3 Varianten (exakt die Texturen die das Spiel verwendet)
  // Grau = METAL_TILE, Braun = DUNGEON_TILE
  static readonly GRAY_TILE_KEYS: string[] = ['METAL_TILE_2', 'METAL_TILE_0', 'METAL_TILE_3'];
  static readonly DIRT_TILE_KEYS: string[] = ['DUNGEON_TILE_2', 'DUNGEON_TILE_0', 'DUNGEON_TILE_3'];
  // Ghost-Preview Farben passend zu den Tiles
  static readonly GRAY_GHOST_COLORS: number[] = [0x40434A, 0x3A3D42, 0x32353C];
  static readonly DIRT_GHOST_COLORS: number[] = [0x565040, 0x4A4235, 0x302820];

  /** Maps typeId → dedicated isometric sprite key. */
  static readonly ISO_SPRITE_MAP: Record<string, string> = {
    HOUSE_T1:     'ISO_HOUSE_MED',
    GUILD_HALL:   'ISO_GUILD_HALL_MED',
    DUNGEON_CAMP: 'ISO_DUNGEON_CAMP_MED',
    WAREHOUSE:    'ISO_WAREHOUSE_MED',
    FARM_GRAIN:   'ISO_FARM_GRAIN_MED',
    MILL_WIND:    'ISO_MILL_WIND_MED',
    BAKERY:       'ISO_BAKERY_MED',
    LUMBER_CAMP:  'ISO_LUMBER_CAMP_MED',
    QUARRY:       'ISO_QUARRY_MED',
    HERB_GARDEN:  'ISO_HERB_GARDEN_MED',
    SMITHY:       'ISO_SMITHY_MED',
    IRON_MINE:      'ISO_IRON_MINE_MED',
    WELL:           'ISO_WELL_MED',
    ARCANE_SMITHY:  'ISO_ARCANE_SMITHY_MED',
    MARKETPLACE:    'ISO_MARKETPLACE_MED',
    WAR_MACHINE_WORKSHOP: 'ISO_WAR_MACHINE_WORKSHOP_MED',
    TREASURE_CHEST:       'ISO_BANK',
    BANK_V2:              'ISO_BANK_V2',
    BANK:                 'ISO_BANK',
    BANK_WITH_CHEST:      'ISO_BANK_WITH_CHEST',
    VAULT:                'ISO_VAULT',
  };

  /**
   * Per-building vertical offset multiplier for iso sprites.
   * Default is 0.22 (lifts sprite above ground).
   */
  static readonly ISO_Y_OFFSET: Record<string, number> = {
    FARM_GRAIN:   0.08,
    HERB_GARDEN:  0.08,
    LUMBER_CAMP:  0.10,
    WELL:         0.06,
    BAKERY:       0.12,
    HOUSE_T1:     0.12,
    MILL_WIND:    0.14,
    QUARRY:       0.08,
    SMITHY:       0.12,
    IRON_MINE:    0.10,
    WAREHOUSE:    0.14,
    GUILD_HALL:   0.16,
    DUNGEON_CAMP:     0.14,
    TREASURE_CHEST:   -0.05,
  };

  /** Extra Y shift (px) added to container position — positive = further south (forward). */
  static readonly ISO_CONTAINER_Y_SHIFT: Record<string, number> = {
    TREASURE_CHEST: 20,
  };

  /** Display scale multiplier — allows sprite to render larger than tile footprint. */
  static readonly ISO_SPRITE_SCALE: Record<string, number> = {
    TREASURE_CHEST: 2.0,
  };


  constructor(
    private scene: Phaser.Scene,
    private gameState: GameState,
    private gridSystem: GridSystem,
  ) {}

  /** Create graphics objects. Must be called once after construction. */
  init(): void {
    this.roadGraphics = this.scene.add.graphics().setDepth(ISO_MODE ? 1 : 2);
    this.swampGraphics = this.scene.add.graphics().setDepth(0.5);
    // paintRT: Render-Texture-Layer für bemalte gray/dirt Tiles (echte Tile-Sprites)
    this.paintRT = this.scene.add.renderTexture(0, 0, ISO_WORLD_W, ISO_WORLD_H)
      .setDepth(0.6).setOrigin(0, 0);
    this.ghostGraphics = this.scene.add.graphics().setDepth(850);
    this.synergyGraphics = this.scene.add.graphics().setDepth(852);
  }

  setVisualFX(fx: VisualFX): void {
    this.visualFX = fx;
  }

  getSwampVariant(): 0 | 1 | 2 {
    return this.swampVariant;
  }

  setSwampVariant(v: 0 | 1 | 2): void {
    this.swampVariant = v;
  }

  // ─── Building Rendering ──────────────────────────────────────

  renderAllBuildings(): void {
    for (const building of this.gameState.buildings) {
      if (building.typeId !== 'ROAD') {
        this.renderBuilding(building);
      }
    }
  }

  renderBuilding(building: BuildingInstance): void {
    this.removeBuildingSprite(building.id);

    const def = BUILDING_DEFS[building.typeId];
    const [w, h] = def.footprint;

    if (ISO_MODE) {
      const spriteW = (w + h) * ISO_TILE_HALF_W;
      const spriteH = spriteW * 1.15;

      const centerIso = gridToIso(building.x + w / 2, building.y + h / 2);
      const contX = centerIso.x;
      const contYShift = CityBuildingRenderer.ISO_CONTAINER_Y_SHIFT[building.typeId] ?? 0;
      const contY = centerIso.y + ISO_TILE_HALF_H + contYShift;

      const depth = (building.x + w - 1 + building.y + h - 1) * 10 + 5;
      const container = this.scene.add.container(contX, contY).setDepth(depth);

      const shadowGfx = this.scene.add.graphics();
      shadowGfx.fillStyle(UI_COLORS.SHADOW_COLOR, 0.30);
      const shHW = (w + h) * ISO_TILE_HALF_W * 0.40;
      const shHH = (w + h) * ISO_TILE_HALF_H * 0.40;
      const shX  = (w + h) * ISO_TILE_HALF_W * 0.12;
      const shY  = ISO_TILE_HALF_H * 0.35 + 4;
      shadowGfx.fillPoints([
        { x: shX,        y: shY - shHH },
        { x: shX + shHW, y: shY },
        { x: shX,        y: shY + shHH },
        { x: shX - shHW, y: shY },
      ], true);
      container.add(shadowGfx);

      const isoKey = CityBuildingRenderer.ISO_SPRITE_MAP[building.typeId];
      const v2Key = isoKey ? `${isoKey}_V2` : null;
      const effectiveSpriteKey =
        (v2Key && this.scene.textures.exists(v2Key)) ? v2Key :
        (isoKey && this.scene.textures.exists(isoKey)) ? isoKey : def.spriteKey;
      const yOffsetFactor = CityBuildingRenderer.ISO_Y_OFFSET[building.typeId] ?? 0.22;

      if (this.scene.textures.exists(effectiveSpriteKey)) {
        const spriteScaleMult = CityBuildingRenderer.ISO_SPRITE_SCALE[building.typeId] ?? 1.0;
        const img = this.scene.add.image(0, -spriteH * yOffsetFactor, effectiveSpriteKey)
          .setDisplaySize(spriteW * spriteScaleMult, spriteH * spriteScaleMult)
          .setOrigin(0.5, 0.5);
        container.add(img);
      } else {
        const fbGfx = this.scene.add.graphics();
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
        const label = this.scene.add.text(0, 0, def.name, {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT,
        }).setOrigin(0.5);
        container.add(label);
      }

      if (!building.built) {
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(UI_COLORS.CONSTRUCTION_OVERLAY, 0.45);
        overlay.fillCircle(0, -spriteH * (yOffsetFactor + 0.03), spriteW * 0.4);
        const pctText = this.scene.add.text(0, -spriteH * (yOffsetFactor + 0.03) + 12, 'Bau...', {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD,
        }).setOrigin(0.5);
        container.add([overlay, pctText]);
      }

      if (building.built && def.requiresConnectivity) {
        if (building.connected) {
          const dot = this.scene.add.graphics();
          dot.fillStyle(UI_COLORS.CONNECTED_GREEN, 1);
          dot.fillCircle(spriteW / 2 - 4, -spriteH * yOffsetFactor - 2, 4);
          container.add(dot);
        } else {
          const warnBg = this.scene.add.graphics();
          warnBg.fillStyle(UI_COLORS.DISCONNECTED_RED, 0.9);
          warnBg.fillCircle(0, -spriteH * 0.60, 10);
          container.add(warnBg);
          const warn = this.scene.add.text(0, -spriteH * 0.60, '!', {
            fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.WHITE,
            fontStyle: 'bold',
          }).setOrigin(0.5);
          container.add(warn);
        }
      }

      applyBuildingAnimation(this.scene, building, container);
      this.buildingSprites.set(building.id, container);
      this.visualFX?.addBuildingFX(building);
      return;
    }

    // ── Legacy top-down rendering ──
    const px = building.x * TILE_SIZE;
    const py = building.y * TILE_SIZE;
    const pw = w * TILE_SIZE;
    const ph = h * TILE_SIZE;

    const container = this.scene.add.container(px, py).setDepth(10);

    const shadowGfx = this.scene.add.graphics();
    shadowGfx.fillStyle(UI_COLORS.SHADOW_COLOR, 0.22);
    shadowGfx.fillEllipse(pw / 2, ph - 2, pw * 0.85, ph * 0.3);
    container.add(shadowGfx);

    if (this.scene.textures.exists(def.spriteKey)) {
      const img = this.scene.add.image(pw / 2, ph / 2, def.spriteKey).setDisplaySize(pw, ph);
      container.add(img);
    } else {
      const bg = this.scene.add.graphics();
      bg.fillStyle(UI_COLORS.BTN_DARK, 0.6);
      bg.fillRoundedRect(2, 2, pw - 4, ph - 4, 4);
      container.add(bg);
      const label = this.scene.add.text(pw / 2, ph / 2, def.name, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
      }).setOrigin(0.5);
      container.add(label);
    }

    if (!building.built) {
      const overlay = this.scene.add.graphics();
      overlay.fillStyle(UI_COLORS.CONSTRUCTION_OVERLAY, 0.5);
      overlay.fillRect(0, 0, pw, ph);
      const pctText = this.scene.add.text(pw / 2, ph / 2 + 10, 'Building...', {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD,
      }).setOrigin(0.5);
      container.add([overlay, pctText]);
    }

    if (building.built && def.requiresConnectivity) {
      if (building.connected) {
        const dot = this.scene.add.graphics();
        dot.fillStyle(UI_COLORS.CONNECTED_GREEN, 1);
        dot.fillCircle(pw - 6, 6, 4);
        container.add(dot);
      } else {
        const warnBg = this.scene.add.graphics();
        warnBg.fillStyle(UI_COLORS.DISCONNECTED_RED, 0.9);
        warnBg.fillCircle(pw / 2, -4, 10);
        container.add(warnBg);
        const warn = this.scene.add.text(pw / 2, -4, '!', {
          fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.WHITE,
          fontStyle: 'bold',
        }).setOrigin(0.5);
        container.add(warn);
      }
    }

    applyBuildingAnimation(this.scene, building, container);
    this.buildingSprites.set(building.id, container);
  }

  removeBuildingSprite(buildingId: number): void {
    const existing = this.buildingSprites.get(buildingId);
    if (existing) {
      existing.destroy();
      this.buildingSprites.delete(buildingId);
    }
    this.visualFX?.removeBuildingFX(buildingId);
  }

  // ─── Road Rendering ──────────────────────────────────────────

  renderRoads(): void {
    for (const sprite of this.roadSprites) sprite.destroy();
    this.roadSprites = [];
    this.roadGraphics.clear();

    if (ISO_MODE) {
      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          const tile = this.gameState.grid[gy][gx];
          if (!tile?.isRoad) continue;
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

    const hasCobble = this.scene.textures.exists('ROAD_COBBLE');
    const hasRoadSprite = this.scene.textures.exists('ROAD');

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = this.gameState.grid[y][x];
        if (!tile?.isRoad) continue;

        if (hasCobble) {
          const img = this.scene.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            'ROAD_COBBLE',
          ).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(2);
          const h = ((x * 31 + y * 47) >>> 0) % 3;
          img.setTint([0xFFFFFF, 0xEEEEDD, 0xDDDDCC][h]);
          this.roadSprites.push(img);
        } else if (hasRoadSprite) {
          const img = this.scene.add.image(
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

  // ─── Swamp Rendering ─────────────────────────────────────────

  renderSwamp(): void {
    this.swampGraphics.clear();
    const tiles = this.gameState.swampTiles;
    if (!tiles) return;

    for (const [key, variant] of Object.entries(tiles)) {
      const [gxStr, gyStr] = key.split(',');
      const gx = parseInt(gxStr, 10);
      const gy = parseInt(gyStr, 10);
      if (isNaN(gx) || isNaN(gy)) continue;

      const palette = CityBuildingRenderer.SWAMP_VARIANT_COLORS[variant as 0 | 1 | 2] ?? CityBuildingRenderer.SWAMP_VARIANT_COLORS[0];
      const hash = ((gx * 73 + gy * 137 + gx * gy * 31) >>> 0) % palette.length;
      this.swampGraphics.fillStyle(palette[hash], 1);

      if (ISO_MODE) {
        drawIsoDiamond(this.swampGraphics, gx, gy);
      } else {
        this.swampGraphics.fillRect(gx * TILE_SIZE, gy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  handleSwampPaint(gx: number, gy: number): void {
    if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) return;
    if (!this.gameState.swampTiles) this.gameState.swampTiles = {};

    const key = `${gx},${gy}`;
    const existing = this.gameState.swampTiles[key];

    if (existing === this.swampVariant) {
      delete this.gameState.swampTiles[key];
    } else {
      this.gameState.swampTiles[key] = this.swampVariant;
    }

    this.renderSwamp();
  }

  updateSwampGhostPreview(worldX: number, worldY: number): void {
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

    const palette = CityBuildingRenderer.SWAMP_VARIANT_COLORS[this.swampVariant];
    const previewColor = palette[1];

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

  exportSwampData(): void {
    const tiles = this.gameState.swampTiles ?? {};
    const count = Object.keys(tiles).length;
    const json = JSON.stringify(tiles, null, 2);
    console.log('[SwampExport] Sumpf-Tiles gespeichert:', count, 'Felder');
    console.log(json);
    navigator.clipboard?.writeText(json).catch(() => {});

    const txt = this.scene.add.text(
      this.scene.cameras.main.worldView.x + this.scene.scale.width / 2,
      this.scene.cameras.main.worldView.y + 60,
      `✓ ${count} Sumpf-Tiles exportiert (Console + Clipboard)`,
      { fontFamily: FONT_FAMILY, fontSize: '13px', color: '#5DE8A0', backgroundColor: '#000000AA',
        padding: { left: 10, right: 10, top: 5, bottom: 5 } },
    ).setOrigin(0.5).setDepth(1000).setScrollFactor(0);
    this.scene.time.delayedCall(3000, () => txt.destroy());
  }

  // ─── Terrain Painter (Gray / Dirt) ──────────────────────────

  getPaintVariant(): 0 | 1 | 2 { return this.paintVariant; }
  setPaintVariant(v: 0 | 1 | 2): void { this.paintVariant = v; }
  getPaintType(): 'gray' | 'dirt' { return this.paintType; }
  setPaintType(t: 'gray' | 'dirt'): void { this.paintType = t; }

  // Zeichnet alle bemalten Tiles neu in die paintRT (echte Tile-Sprites)
  redrawPaintLayer(): void {
    this.paintRT.clear();
    const drawTiles = (record: Record<string, number> | undefined, keys: string[]) => {
      if (!record) return;
      for (const [key, variant] of Object.entries(record)) {
        const [gxStr, gyStr] = key.split(',');
        const gx = parseInt(gxStr, 10);
        const gy = parseInt(gyStr, 10);
        if (isNaN(gx) || isNaN(gy)) continue;
        const tileKey = keys[variant as 0 | 1 | 2] ?? keys[0];
        if (!this.scene.textures.exists(tileKey)) continue;
        const iso = gridToIso(gx, gy);
        this.paintRT.draw(tileKey, iso.x - ISO_TILE_HALF_W, iso.y);
      }
    };
    drawTiles(this.gameState.grayTiles, CityBuildingRenderer.GRAY_TILE_KEYS);
    drawTiles(this.gameState.dirtTiles, CityBuildingRenderer.DIRT_TILE_KEYS);
  }

  // renderGray / renderDirt: beide rufen redrawPaintLayer auf (gemeinsame RT)
  renderGray(): void { this.redrawPaintLayer(); }
  renderDirt(): void { this.redrawPaintLayer(); }

  handleGrayPaint(gx: number, gy: number): void {
    if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) return;
    if (!this.gameState.grayTiles) this.gameState.grayTiles = {};
    // Dirt-Tile an dieser Stelle entfernen (kein Überlappen)
    if (this.gameState.dirtTiles) delete this.gameState.dirtTiles[`${gx},${gy}`];
    const key = `${gx},${gy}`;
    if (this.gameState.grayTiles[key] === this.paintVariant) {
      delete this.gameState.grayTiles[key];
    } else {
      this.gameState.grayTiles[key] = this.paintVariant;
    }
    this.redrawPaintLayer();
  }

  handleDirtPaint(gx: number, gy: number): void {
    if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) return;
    if (!this.gameState.dirtTiles) this.gameState.dirtTiles = {};
    // Gray-Tile an dieser Stelle entfernen (kein Überlappen)
    if (this.gameState.grayTiles) delete this.gameState.grayTiles[`${gx},${gy}`];
    const key = `${gx},${gy}`;
    if (this.gameState.dirtTiles[key] === this.paintVariant) {
      delete this.gameState.dirtTiles[key];
    } else {
      this.gameState.dirtTiles[key] = this.paintVariant;
    }
    this.redrawPaintLayer();
  }

  private updateTerrainGhostPreview(worldX: number, worldY: number, ghostColor: number): void {
    let gx: number, gy: number;
    if (ISO_MODE) {
      const ig = isoToGrid(worldX, worldY);
      gx = ig.gx; gy = ig.gy;
    } else {
      gx = Math.floor(worldX / TILE_SIZE);
      gy = Math.floor(worldY / TILE_SIZE);
    }
    if (gx === this.ghostGridX && gy === this.ghostGridY) return;
    this.ghostGridX = gx; this.ghostGridY = gy;
    this.ghostGraphics.clear();
    if (ISO_MODE) {
      this.ghostGraphics.fillStyle(ghostColor, 0.5);
      drawIsoDiamond(this.ghostGraphics, gx, gy);
      this.ghostGraphics.lineStyle(2, ghostColor, 0.85);
      strokeIsoDiamond(this.ghostGraphics, gx, gy);
    } else {
      this.ghostGraphics.fillStyle(ghostColor, 0.5);
      this.ghostGraphics.fillRect(gx * TILE_SIZE, gy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  updateGrayGhostPreview(worldX: number, worldY: number): void {
    this.updateTerrainGhostPreview(worldX, worldY, CityBuildingRenderer.GRAY_GHOST_COLORS[this.paintVariant]);
  }

  updateDirtGhostPreview(worldX: number, worldY: number): void {
    this.updateTerrainGhostPreview(worldX, worldY, CityBuildingRenderer.DIRT_GHOST_COLORS[this.paintVariant]);
  }

  // Getter/Setter die CityScene erwartet (delegieren auf paintVariant)
  getGrayVariant(): 0 | 1 | 2 { return this.paintVariant; }
  setGrayVariant(v: 0 | 1 | 2): void { this.paintVariant = v; }
  getDirtVariant(): 0 | 1 | 2 { return this.paintVariant; }
  setDirtVariant(v: 0 | 1 | 2): void { this.paintVariant = v; }

  // ─── Ghost Preview ───────────────────────────────────────────

  updateGhostPreview(worldX: number, worldY: number, mode: BuildMode, selectedBuildingType: string | null): void {
    let typeId: string;
    let fw: number, fh: number;

    if (mode === 'build' && selectedBuildingType) {
      typeId = selectedBuildingType;
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

    this.synergyGraphics.clear();
    if (!ISO_MODE && mode === 'build' && selectedBuildingType) {
      const lines = getSynergyLines(this.gameState, selectedBuildingType, gx, gy);
      for (const line of lines) {
        const lineColor = line.inRange ? 0x44FF44 : 0xFF4444;
        this.synergyGraphics.lineStyle(2, lineColor, 0.6);
        this.synergyGraphics.lineBetween(line.fromX, line.fromY, line.toX, line.toY);
      }
    }
  }

  updateDemolishHighlight(worldX: number, worldY: number): void {
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

  clearGhost(): void {
    this.ghostGraphics.clear();
    this.synergyGraphics.clear();
    this.ghostGridX = -1;
    this.ghostGridY = -1;
  }
}
