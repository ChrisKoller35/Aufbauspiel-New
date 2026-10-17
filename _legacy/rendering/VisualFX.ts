// ============================================================
// VisualFX.ts — Visuelles Post-Processing & Atmosphären-System
// ============================================================
// Kapselt alle visuellen Effekte:
//   Phase 1: Vignette, Warm Tint, Fake AO (in CityScene), Magic Particles
//   Phase 2: Bloom, Terrain Transitions, Smoke Particles, Aerial Perspective
//   Phase 3: Day/Night Cycle, Weather System, Building Focus Mode
// ============================================================

import Phaser from 'phaser';
import {
  GRID_WIDTH, GRID_HEIGHT, ISO_MODE,
} from './Colors';
import {
  gridToIso, drawIsoDiamond,
  ISO_TILE_HALF_W, ISO_TILE_HALF_H,
} from './IsoRenderer';
import { BuildingInstance } from '../models/Building';
import { BUILDING_DEFS } from '../data/buildings';

// ── Dungeon/Swamp Zone Detection (mirrors CityScene constants) ─
const DUNGEON_ZONE_OGX = 0;
const DUNGEON_ZONE_OGY = 13;
const DUNGEON_ZONE_W   = 10;
const DUNGEON_ZONE_H   = 10;
const SWAMP_MARGIN     = 3;

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

// ── Building FX Categories ────────────────────────────────────
const SMOKE_BUILDINGS   = new Set(['SMITHY', 'BAKERY', 'IRON_MINE']);
const MAGIC_BUILDINGS   = new Set(['GUILD_HALL', 'DUNGEON_CAMP']);
const NATURE_BUILDINGS  = new Set(['FARM_GRAIN', 'HERB_GARDEN', 'WELL', 'LUMBER_CAMP']);

// ─────────────────────────────────────────────────────────────
export class VisualFX {
  private scene: Phaser.Scene;
  private isWebGL: boolean;

  // ── Camera FX (WebGL only) ────────────────────────────────
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private vignetteEffect: Phaser.FX.Vignette   | null = null;
  private bloomEffect: Phaser.FX.Bloom          | null = null;

  // ── Screen-space overlays (Phaser Rects, position synced each frame) ─
  private warmOverlay!: Phaser.GameObjects.Rectangle;     // subtle amber tint
  private nightOverlay!: Phaser.GameObjects.Rectangle;    // deep blue darkness
  private dawnDuskOverlay!: Phaser.GameObjects.Rectangle; // warm orange glow

  // ── Aerial perspective overlay ────────────────────────────
  private aerialOverlay: Phaser.GameObjects.Image | null = null;

  // ── Per-building particle emitters ───────────────────────
  private buildingEmitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>();

  // ── Weather ───────────────────────────────────────────────
  private weatherEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private currentWeather: 'none' | 'rain' | 'snow' = 'none';
  private weatherTimer    = 0;
  private nextWeatherChange = 200; // seconds until first possible weather event

  // ── Day/Night cycle ───────────────────────────────────────
  /** 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk */
  private timeOfDay  = 0.32; // start at late morning
  private readonly DAY_DURATION = 300; // 5 real minutes per full day cycle

  // ── Building Focus mode ───────────────────────────────────
  private focusActive = false;

  // ── Color matrix update throttle ─────────────────────────
  private cmDirty = true;
  private cmTimer = 0;
  private readonly CM_UPDATE_INTERVAL = 2.5; // seconds between ColorMatrix updates

  // ==========================================================
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.isWebGL = scene.sys.game.renderer.type === Phaser.WEBGL;

    this.createTextures();
    this.setupOverlays();

    if (this.isWebGL) this.setupCameraFX();
    if (ISO_MODE) this.drawTerrainTransitions();
    if (ISO_MODE) this.setupAerialPerspective();
  }

  // ==========================================================
  // ── Texture Generation ─────────────────────────────────────

  private createTextures(): void {
    const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.scene.textures.exists(key)) return;
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    // Magic sparkle — golden glowing dot for Gilde
    make('vfx_sparkle', 16, 16, g => {
      g.fillStyle(0xFFD700, 0.9); g.fillCircle(8, 8, 7);
      g.fillStyle(0xFFEE88, 0.6); g.fillCircle(8, 8, 4);
      g.fillStyle(0xFFFFFF, 0.4); g.fillCircle(8, 8, 2);
    });

    // Dungeon sparkle — eerie purple for Dungeon Camp
    make('vfx_dungeon_spark', 14, 14, g => {
      g.fillStyle(0xAA44FF, 0.85); g.fillCircle(7, 7, 6);
      g.fillStyle(0xCC88FF, 0.5);  g.fillCircle(7, 7, 3);
    });

    // Smoke — soft grey puff for SMITHY/BAKERY/IRON_MINE
    make('vfx_smoke', 24, 24, g => {
      g.fillStyle(0xAAAAAA, 0.45); g.fillCircle(12, 12, 11);
      g.fillStyle(0xCCCCCC, 0.20); g.fillCircle(10, 9, 7);
    });

    // Dark smoke — brownish for IRON_MINE
    make('vfx_smoke_dark', 22, 22, g => {
      g.fillStyle(0x886655, 0.50); g.fillCircle(11, 11, 10);
      g.fillStyle(0xAA8866, 0.20); g.fillCircle(9, 9, 6);
    });

    // Nature leaf/pollen — for FARM/HERB/WELL
    make('vfx_leaf', 10, 10, g => {
      g.fillStyle(0x66BB44, 0.70); g.fillEllipse(5, 5, 9, 5);
      g.fillStyle(0x88DD66, 0.35); g.fillEllipse(5, 4, 6, 3);
    });

    // Rain drop — thin bright streak (4×10 px)
    make('vfx_rain', 4, 10, g => {
      g.fillStyle(0xCCDDFF, 0.55); g.fillRect(1, 0, 2, 9);
      g.fillStyle(0xEEF4FF, 0.30); g.fillRect(0, 0, 1, 9);
    });

    // Snow flake — soft white circle
    make('vfx_snow', 10, 10, g => {
      g.fillStyle(0xFFFFFF, 0.80); g.fillCircle(5, 5, 5);
      g.fillStyle(0xEEF0FF, 0.35); g.fillCircle(5, 5, 3);
    });
  }

  // ==========================================================
  // ── Screen-Space Overlays ──────────────────────────────────

  private setupOverlays(): void {
    // All rectangles start centered at origin; position synced each frame via syncOverlays().
    // Depth 890-892: above world content, below UI (HTML overlays always on top of Phaser).

    // Phase 1.2: Warm tint — constant subtle amber glow
    this.warmOverlay = this.scene.add.rectangle(0, 0, 1280, 720, 0xFFCC44, 0.02)
      .setDepth(890);

    // Phase 3.1: Dawn/Dusk — warm orange bloom at sunrise/sunset
    this.dawnDuskOverlay = this.scene.add.rectangle(0, 0, 1280, 720, 0xFF6A00, 0)
      .setDepth(891);

    // Phase 3.1: Night — cool dark blue overlay
    this.nightOverlay = this.scene.add.rectangle(0, 0, 1280, 720, 0x0A1432, 0)
      .setDepth(892);
  }

  /** Keep screen overlays covering the entire camera view regardless of scroll/zoom. */
  private syncOverlays(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z  = cam.zoom;
    const cx = cam.scrollX + cam.width  / (2 * z);
    const cy = cam.scrollY + cam.height / (2 * z);
    const w  = cam.width  / z;
    const h  = cam.height / z;
    this.warmOverlay.setPosition(cx, cy).setSize(w, h);
    this.dawnDuskOverlay.setPosition(cx, cy).setSize(w, h);
    this.nightOverlay.setPosition(cx, cy).setSize(w, h);
    if (this.aerialOverlay) this.aerialOverlay.setPosition(cx, cy).setDisplaySize(w, h);
  }

  // ==========================================================
  // ── Camera PostFX (Phaser 3.60+ WebGL) ─────────────────────

  private setupCameraFX(): void {
    const cam = this.scene.cameras.main;

    // Phase 1.1: Vignette — subtle dark edges, draws focus to center
    this.vignetteEffect = cam.postFX.addVignette(0.5, 0.5, 0.78, 0.18);

    // Phase 1.2 + 3.1: ColorMatrix — warm tint + day/night brightness/saturation
    this.colorMatrix = cam.postFX.addColorMatrix();
    this.applyColorMatrix();

    // Phase 2.1: Bloom — entfernt. Bei Sprite-Spielen erzeugt jeder Bloom-Wert
    // einen sichtbaren Haze über der gesamten Szene. Kein Mehrwert.
  }

  // ==========================================================
  // ── Phase 2.2: Terrain Transitions ─────────────────────────

  private drawTerrainTransitions(): void {
    // Draw subtle blending diamonds at zone boundaries (depth 0.2, between grass=0 and swamp=0.5)
    const transGfx = this.scene.add.graphics().setDepth(0.2);

    for (let gy = 0; gy < GRID_HEIGHT; gy++) {
      for (let gx = 0; gx < GRID_WIDTH; gx++) {
        const isDungeon = isInDungeonZone(gx, gy);
        const isSwamp   = isInSwampZone(gx, gy);

        // Count cross-zone neighbor tiles
        let diffNeighbors = 0;
        let blendColor    = 0x000000;
        const dirs = [
          [1,0],[-1,0],[0,1],[0,-1],
          [1,1],[-1,-1],[1,-1],[-1,1],
        ];

        for (const [dx, dy] of dirs) {
          const nx = gx + dx, ny = gy + dy;
          if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) continue;

          const nDungeon = isInDungeonZone(nx, ny);
          const nSwamp   = isInSwampZone(nx, ny);
          const sameZone = (isDungeon === nDungeon) && (isSwamp === nSwamp);

          if (!sameZone) {
            diffNeighbors++;
            // Blend toward current tile's edge zone color
            if (isDungeon || nDungeon) blendColor = 0x3D3628;
            else if (isSwamp || nSwamp) blendColor = 0x2D4A28;
          }
        }

        if (diffNeighbors > 0 && blendColor !== 0x000000) {
          const alpha = Math.min(0.32, diffNeighbors * 0.06);
          transGfx.fillStyle(blendColor, alpha);
          drawIsoDiamond(transGfx, gx, gy);
        }
      }
    }
  }

  // ==========================================================
  // ── Phase 2.4: Aerial Perspective ──────────────────────────

  private setupAerialPerspective(): void {
    const key = 'vfx_aerial_haze';
    if (!this.scene.textures.exists(key)) {
      const sz = 512;
      const canvas = document.createElement('canvas');
      canvas.width = sz; canvas.height = sz;
      const ctx = canvas.getContext('2d')!;
      // Radial gradient: transparent center → subtle cool blue-grey at edges
      const grad = ctx.createRadialGradient(sz/2, sz/2, sz*0.2, sz/2, sz/2, sz/2);
      grad.addColorStop(0,   'rgba(90,110,150,0)');
      grad.addColorStop(0.55,'rgba(90,110,150,0.01)');
      grad.addColorStop(1,   'rgba(70, 90,130,0.04)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, sz, sz);
      this.scene.textures.addCanvas(key, canvas);
    }

    // Positioned each frame by syncOverlays(); depth 893 (above world, below UI)
    this.aerialOverlay = this.scene.add.image(0, 0, key)
      .setDepth(893)
      .setAlpha(1.0);
  }

  // ==========================================================
  // ── Phase 1.2 + 3.1: Color Matrix ──────────────────────────

  private applyColorMatrix(): void {
    if (!this.colorMatrix) return;

    const t         = this.timeOfDay;
    const sunAngle  = Math.PI * 2 * t;
    const sunHeight = Math.sin(sunAngle - Math.PI / 2) * 0.5 + 0.5; // 0=midnight, 1=noon

    // Brightness stays at 1.0 during the day — darkness comes ONLY from the
    // night Rectangle overlay, NOT from the ColorMatrix. This avoids the "veil" look.
    this.colorMatrix.brightness(1.0);

    // Saturation: nearly neutral all day (-0.08 night, +0.06 noon)
    const saturation = -0.08 + sunHeight * 0.14;
    this.colorMatrix.saturate(saturation, true);

    // Contrast: very subtle constant boost
    this.colorMatrix.contrast(0.04, true);

    // Phase 3.3: Focus mode — slight desaturation when building panel is open
    if (this.focusActive) {
      this.colorMatrix.saturate(-0.20, true);
    }

    this.cmDirty = false;
  }

  /** Update the night/dawn overlay alpha values based on current time of day. */
  private updateDayNightOverlays(): void {
    const t         = this.timeOfDay;
    const sunAngle  = Math.PI * 2 * t;
    const sunHeight = Math.sin(sunAngle - Math.PI / 2) * 0.5 + 0.5;

    // Night overlay: deep blue, max alpha at midnight (sunHeight=0)
    const nightAlpha = Math.max(0, (0.38 - sunHeight) / 0.38) * 0.55;
    this.nightOverlay.setAlpha(nightAlpha);

    // Dawn/Dusk warm glow: peaks at sunrise (~0.25) and sunset (~0.75)
    // sin(2*angle) gives peaks at t=0.25 and t=0.75
    const dawnDusk = Math.pow(Math.abs(Math.sin(sunAngle * 2)), 1.8) * Math.pow(sunHeight, 0.4);
    this.dawnDuskOverlay.setAlpha(dawnDusk * 0.14);
  }

  // ==========================================================
  // ── Phase 1.4 + 2.3: Building Visual FX ───────────────────

  /** Add particles for a single building. Call from renderBuilding(). */
  addBuildingFX(building: BuildingInstance): void {
    if (!building.built) return;
    this.removeBuildingFX(building.id); // clear any stale emitter

    const def = BUILDING_DEFS[building.typeId];
    if (!def) return;

    const [w, h] = def.footprint;
    const iso  = gridToIso(building.x + w / 2, building.y + h / 2);
    const spriteH = (w + h) * ISO_TILE_HALF_W * 1.15;
    const emitY   = iso.y + ISO_TILE_HALF_H - spriteH * 0.45; // near top of building
    const emitX   = iso.x;
    const depth   = (building.x + w - 1 + building.y + h - 1) * 10 + 8;

    let emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    if (SMOKE_BUILDINGS.has(building.typeId)) {
      // Smoke: soft billowing puffs rising from forge chimneys
      const isDark = building.typeId === 'IRON_MINE';
      emitter = this.scene.add.particles(emitX, emitY, isDark ? 'vfx_smoke_dark' : 'vfx_smoke', {
        speed:     { min: 8,  max: 22 },
        angle:     { min: 255, max: 285 }, // mostly straight up
        scale:     { start: 0.25, end: 1.0 },
        alpha:     { start: 0.55, end: 0  },
        lifespan:  { min: 2000, max: 3200 },
        frequency: 700,
        maxParticles: 10,
        gravityY:  -8,
      });

    } else if (MAGIC_BUILDINGS.has(building.typeId)) {
      // Magic sparkles: rising glowing particles floating around the building
      const isDungeon = building.typeId === 'DUNGEON_CAMP';
      const footRadius = (w + h) * ISO_TILE_HALF_W * 0.4;
      emitter = this.scene.add.particles(emitX, emitY, isDungeon ? 'vfx_dungeon_spark' : 'vfx_sparkle', {
        speed:     { min: 12, max: 35 },
        angle:     { min: 0,   max: 360 },
        scale:     { start: 0.6, end: 0.1 },
        alpha:     { start: 0.9, end: 0   },
        lifespan:  { min: 1200, max: 2200 },
        frequency: 150,
        maxParticles: 25,
        gravityY:  -18,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, footRadius * 2, footRadius) } as any,
      });

    } else if (NATURE_BUILDINGS.has(building.typeId)) {
      // Nature: gentle leaf/pollen particles drifting upward
      emitter = this.scene.add.particles(emitX, emitY, 'vfx_leaf', {
        speed:     { min: 6,  max: 16 },
        angle:     { min: 240, max: 300 },
        scale:     { start: 0.5, end: 0.1 },
        alpha:     { start: 0.7, end: 0   },
        lifespan:  { min: 2500, max: 4000 },
        frequency: 1400,
        maxParticles: 6,
        gravityY:  4,
        rotate:    { min: 0, max: 360 },
      });
    }

    if (emitter) {
      emitter.setDepth(depth);
      this.buildingEmitters.set(building.id, emitter);
    }
  }

  /** Remove particle emitter for a demolished building. */
  removeBuildingFX(buildingId: number): void {
    const e = this.buildingEmitters.get(buildingId);
    if (e) { e.destroy(); this.buildingEmitters.delete(buildingId); }
  }

  /** Initialize FX for all pre-existing buildings after scene load. */
  initAllBuildingFX(buildings: BuildingInstance[]): void {
    for (const b of buildings) {
      if (b.typeId !== 'ROAD') this.addBuildingFX(b);
    }
  }

  // ==========================================================
  // ── Phase 3.2: Weather System ──────────────────────────────

  setWeather(weather: 'none' | 'rain' | 'snow'): void {
    if (this.currentWeather === weather) return;

    if (this.weatherEmitter) {
      this.weatherEmitter.destroy();
      this.weatherEmitter = null;
    }
    this.currentWeather = weather;
    if (weather === 'none') return;

    const cam = this.scene.cameras.main;
    const w   = cam.width;

    if (weather === 'rain') {
      this.weatherEmitter = this.scene.add.particles(0, 0, 'vfx_rain', {
        x:         { min: -120, max: w + 80 },
        y:         { min: -30,  max: -8     },
        speedX:    { min: -70,  max: -35    },
        speedY:    { min: 520,  max: 680    },
        lifespan:  { min: 700,  max: 1000   },
        quantity:  4,
        frequency: 18,
        maxParticles: 280,
        alpha:     { min: 0.30, max: 0.60  },
        scale:     { min: 0.8,  max: 1.5   },
      });

    } else if (weather === 'snow') {
      this.weatherEmitter = this.scene.add.particles(0, 0, 'vfx_snow', {
        x:         { min: -60,  max: w + 60 },
        y:         { min: -15,  max: -5     },
        speedX:    { min: -25,  max: 12     },
        speedY:    { min: 38,   max: 72     },
        lifespan:  { min: 5000, max: 8000   },
        quantity:  1,
        frequency: 90,
        maxParticles: 140,
        alpha:     { start: 0.85, end: 0.20 },
        scale:     { start: 0.90, end: 0.55 },
        rotate:    { min: 0, max: 360        },
      });
    }

    if (this.weatherEmitter) {
      this.weatherEmitter.setScrollFactor(0).setDepth(920);
    }
  }

  private tickWeather(): void {
    if (this.currentWeather !== 'none') {
      // Stop current weather, wait 1-3 min before next event
      this.setWeather('none');
      this.nextWeatherChange = 60 + Math.random() * 120;
      return;
    }

    const roll = Math.random();
    if (roll < 0.28) {
      // Rain (common): lasts 1-2.5 min
      this.setWeather('rain');
      this.nextWeatherChange = 60 + Math.random() * 90;
    } else if (roll < 0.42 && this.timeOfDay < 0.28) {
      // Snow (rare, only at night): lasts 1.5-3 min
      this.setWeather('snow');
      this.nextWeatherChange = 90 + Math.random() * 90;
    } else {
      // Clear continues: check again in 2-4 min
      this.nextWeatherChange = 120 + Math.random() * 120;
    }
  }

  // ==========================================================
  // ── Phase 3.3: Building Focus Mode ─────────────────────────

  setFocusMode(active: boolean): void {
    if (this.focusActive === active) return;
    this.focusActive = active;
    this.cmDirty = true;
  }

  // ==========================================================
  // ── Update Loop ────────────────────────────────────────────

  update(delta: number): void {
    const dt  = delta / 1000;
    const cam = this.scene.cameras.main;

    // Day/Night cycle progression
    this.timeOfDay = (this.timeOfDay + dt / this.DAY_DURATION) % 1;

    // Update ColorMatrix on a throttle (every ~2.5s) to save GPU overhead
    this.cmTimer += dt;
    if (this.cmDirty || this.cmTimer >= this.CM_UPDATE_INTERVAL) {
      this.applyColorMatrix();
      this.updateDayNightOverlays();
      this.cmTimer = 0;
    }

    // Sync screen-space overlays to current camera scroll/zoom
    this.syncOverlays(cam);

    // Weather auto-progression
    this.weatherTimer += dt;
    if (this.weatherTimer >= this.nextWeatherChange) {
      this.weatherTimer = 0;
      this.tickWeather();
    }
  }

  // ==========================================================
  // ── Cleanup ────────────────────────────────────────────────

  destroy(): void {
    for (const e of this.buildingEmitters.values()) e.destroy();
    this.buildingEmitters.clear();
    this.weatherEmitter?.destroy();
    this.aerialOverlay?.destroy();
    this.warmOverlay?.destroy();
    this.nightOverlay?.destroy();
    this.dawnDuskOverlay?.destroy();
  }
}
