// ─── CityMapRenderer ────────────────────────────────────────────
// Owns all map-border, grid, and terrain-decoration rendering.
// Extracted from CityScene to keep CityScene focused on orchestration.
// ──────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import {
  UI_COLORS, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT,
  WORLD_WIDTH, WORLD_HEIGHT, BORDER_MARGIN_TILES, ISO_MODE,
} from '../rendering/Colors';
import {
  gridToIso, isoToGrid as _isoToGrid,
  ISO_WORLD_W, ISO_WORLD_H,
  ISO_TILE_W, ISO_TILE_H, ISO_TILE_HALF_W, ISO_TILE_HALF_H,
  drawIsoDiamond, strokeIsoDiamond,
} from '../rendering/IsoRenderer';
import { GameState } from '../models/GameState';

// ─── Exported constants (used by CityBuildingRenderer + drawGrid) ─

/** Dungeon-Zone: 10×10 Felder, Ursprung bei (DUNGEON_ZONE_OGX, DUNGEON_ZONE_OGY). */
export const DUNGEON_ZONE_W = 10;
export const DUNGEON_ZONE_H = 10;
export const DUNGEON_ZONE_OGX = 0;
export const DUNGEON_ZONE_OGY = 13;
/** Felsige Grautöne für Dungeon-Terrain. */
export const DUNGEON_ROCK_COLORS = [0x4A4235, 0x3D3628, 0x565040, 0x302820];
/** Sumpfzone: 3 Felder Rand um die Dungeon-Zone (außerhalb der Zone selbst). */
export const SWAMP_MARGIN = 3;
/** Trübe Moortöne für Sumpf-Terrain. */
export const SWAMP_COLORS = [0x2D4A2A, 0x3A5530, 0x4A5535, 0x263325];

export function isInDungeonZone(gx: number, gy: number): boolean {
  return gx >= DUNGEON_ZONE_OGX && gx < DUNGEON_ZONE_OGX + DUNGEON_ZONE_W &&
         gy >= DUNGEON_ZONE_OGY && gy < DUNGEON_ZONE_OGY + DUNGEON_ZONE_H;
}

export function isInSwampZone(gx: number, gy: number): boolean {
  const inRing = gx >= DUNGEON_ZONE_OGX - SWAMP_MARGIN &&
                 gx < DUNGEON_ZONE_OGX + DUNGEON_ZONE_W + SWAMP_MARGIN &&
                 gy >= DUNGEON_ZONE_OGY - SWAMP_MARGIN &&
                 gy < DUNGEON_ZONE_OGY + DUNGEON_ZONE_H + SWAMP_MARGIN;
  return inRing && !isInDungeonZone(gx, gy);
}

// ─── CityMapRenderer Class ────────────────────────────────────────

export class CityMapRenderer {
  private grassGraphics!: Phaser.GameObjects.Graphics;
  private gridLinesGraphics!: Phaser.GameObjects.Graphics;
  private decoSprites = new Map<string, Phaser.GameObjects.Image>();
  private gridLinesDrawn = false;

  constructor(private scene: Phaser.Scene, private gameState: GameState) {}

  // ─── Map Border ───────────────────────────────────────────────

  drawMapBorder(): void {
    if (ISO_MODE) {
      this.drawMapBorderIso();
      return;
    }

    const M = BORDER_MARGIN_TILES;
    const T = TILE_SIZE;
    const borderGrass = this.scene.add.graphics().setDepth(-2);
    const borderColors = [UI_COLORS.BORDER_GRASS_DARK, UI_COLORS.BORDER_GRASS_MID];

    for (let by = -M; by < GRID_HEIGHT + M; by++) {
      for (let bx = -M; bx < GRID_WIDTH + M; bx++) {
        if (bx >= 0 && bx < GRID_WIDTH && by >= 0 && by < GRID_HEIGHT) continue;
        const hash = ((bx * 73 + by * 137 + bx * by * 31) >>> 0) % 2;
        borderGrass.fillStyle(borderColors[hash], 1);
        borderGrass.fillRect(bx * T, by * T, T, T);
      }
    }

    if (this.scene.textures.exists('TERRAIN_GRASS')) {
      for (let by = -M; by < GRID_HEIGHT + M; by++) {
        for (let bx = -M; bx < GRID_WIDTH + M; bx++) {
          if (bx >= 0 && bx < GRID_WIDTH && by >= 0 && by < GRID_HEIGHT) continue;
          const img = this.scene.add.image(bx * T + T / 2, by * T + T / 2, 'TERRAIN_GRASS')
            .setDisplaySize(T, T).setDepth(-2).setAlpha(0.35);
          const h = ((bx * 73 + by * 137) >>> 0);
          img.setTint([0xCCDDCC, 0xBBCCBB, 0xAABBAA][h % 3]);
          img.setFlipX((h & 4) !== 0);
          img.setFlipY((h & 8) !== 0);
        }
      }
    }

    let seed = 7777;
    const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

    const treeKeys = ['TERRAIN_TREE_LARGE', 'TERRAIN_TREE_PINE'].filter(k => this.scene.textures.exists(k));
    const smallDecoKeys = ['DECO_ROCK_1', 'DECO_BUSH_1', 'DECO_STONE_LARGE'].filter(k => this.scene.textures.exists(k));

    for (let by = -M; by < GRID_HEIGHT + M; by++) {
      for (let bx = -M; bx < GRID_WIDTH + M; bx++) {
        if (bx >= 0 && bx < GRID_WIDTH && by >= 0 && by < GRID_HEIGHT) continue;

        const r1 = rng();
        const r2 = rng();
        const r3 = rng();
        const r4 = rng();
        const r5 = rng();

        const distFromEdge = Math.min(
          bx < 0 ? -bx : bx >= GRID_WIDTH ? bx - GRID_WIDTH + 1 : 999,
          by < 0 ? -by : by >= GRID_HEIGHT ? by - GRID_HEIGHT + 1 : 999,
        );

        const treeChance = distFromEdge <= 1 ? 0.35 : 0.6;
        if (treeKeys.length > 0 && r1 < treeChance) {
          const treeKey = treeKeys[Math.floor(r2 * treeKeys.length)];
          const offsetX = (r3 - 0.5) * 12;
          const offsetY = (r4 - 0.5) * 12;
          const scale = 0.7 + r5 * 0.5;
          this.scene.add.image(bx * T + T / 2 + offsetX, by * T + T / 2 + offsetY, treeKey)
            .setDisplaySize(T * scale * 1.4, T * scale * 1.8)
            .setDepth(-1)
            .setAlpha(0.85 + r5 * 0.15);
        } else if (smallDecoKeys.length > 0 && r1 < treeChance + 0.15) {
          const decoKey = smallDecoKeys[Math.floor(r2 * smallDecoKeys.length)];
          this.scene.add.image(bx * T + T / 2, by * T + T / 2, decoKey)
            .setDisplaySize(T * 0.6, T * 0.6)
            .setDepth(-1)
            .setAlpha(0.7);
        }
      }
    }

    const edgeGraphics = this.scene.add.graphics().setDepth(0.5);
    for (let x = 0; x < GRID_WIDTH; x++) {
      edgeGraphics.fillStyle(UI_COLORS.BORDER_GRASS_DARK, 0.15);
      edgeGraphics.fillRect(x * T, 0, T, T);
      edgeGraphics.fillRect(x * T, (GRID_HEIGHT - 1) * T, T, T);
    }
    for (let y = 0; y < GRID_HEIGHT; y++) {
      edgeGraphics.fillStyle(UI_COLORS.BORDER_GRASS_DARK, 0.15);
      edgeGraphics.fillRect(0, y * T, T, T);
      edgeGraphics.fillRect((GRID_WIDTH - 1) * T, y * T, T, T);
    }
  }

  // ─── Parallax Background ─────────────────────────────────────

  private drawParallaxBackground(): void {
    const cx = ISO_WORLD_W / 2;
    const cy = ISO_WORLD_H / 2;
    const spread = Math.max(ISO_WORLD_W, ISO_WORLD_H) * 1.5;

    const skyGfx = this.scene.add.graphics().setDepth(-50).setScrollFactor(0);
    const camW = this.scene.scale.width;
    const camH = this.scene.scale.height;
    const gradSteps = 24;
    for (let i = 0; i < gradSteps; i++) {
      const t = i / gradSteps;
      const r = Math.floor(4 + t * 8);
      const g = Math.floor(6 + t * 18);
      const b = Math.floor(16 + t * 30);
      const color = (r << 16) | (g << 8) | b;
      skyGfx.fillStyle(color, 1);
      skyGfx.fillRect(0, (t * camH) | 0, camW, (camH / gradSteps) + 2);
    }

    let seed = 31415;
    const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    const starGfx = this.scene.add.graphics().setDepth(-45).setScrollFactor(0.04);
    for (let i = 0; i < 320; i++) {
      const x = (rng() - 0.5) * spread * 2.5 + cx;
      const y = (rng() - 0.25) * ISO_WORLD_H * 2.5 + cy * 0.5;
      const bright = 0.12 + rng() * 0.65;
      const big = rng() < 0.05;
      const r = rng();
      const starColor = r < 0.06 ? 0xFFCCDD : r < 0.15 ? 0xCCDDFF : 0xFFFFFF;
      starGfx.fillStyle(starColor, bright);
      if (big) starGfx.fillCircle(x, y, 1.5);
      else starGfx.fillRect(x, y, 1, 1);
    }

    const farCloudGfx = this.scene.add.graphics().setDepth(-40).setScrollFactor(0.12);
    for (let i = 0; i < 5; i++) {
      const x = (rng() - 0.5) * spread + cx;
      const y = (rng() - 0.2) * ISO_WORLD_H * 1.5 + cy;
      const w = 200 + rng() * 400;
      const h = 30 + rng() * 60;
      const col = rng() < 0.5 ? 0x6633AA : 0x224488;
      farCloudGfx.fillStyle(col, 0.03 + rng() * 0.04);
      farCloudGfx.fillEllipse(x, y, w, h);
    }

    const farRockGfx = this.scene.add.graphics().setDepth(-30).setScrollFactor(0.3);
    const farRocks: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const x = (rng() - 0.5) * spread * 1.2 + cx;
      const y = cy + ISO_WORLD_H * 0.3 + rng() * ISO_WORLD_H * 0.5;
      const w = 60 + rng() * 120;
      const h = 40 + rng() * 80;
      farRocks.push({ x, y, w, h });
      this.drawFloatingRock(farRockGfx, x, y, w, h, rng, 0.4);
    }

    const cableGfx = this.scene.add.graphics().setDepth(-25).setScrollFactor(0.35);
    for (let i = 0; i < farRocks.length - 1; i++) {
      if (rng() > 0.5) continue;
      const a = farRocks[i];
      const b = farRocks[i + 1];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist > spread * 0.5) continue;
      cableGfx.lineStyle(1.5, 0x6644CC, 0.25);
      cableGfx.beginPath();
      cableGfx.moveTo(a.x, a.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2 + dist * 0.08;
      for (let t = 0; t <= 1; t += 0.1) {
        const px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * midX + t * t * b.x;
        const py = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * midY + t * t * b.y;
        cableGfx.lineTo(px, py);
      }
      cableGfx.strokePath();
      cableGfx.lineStyle(4, 0x8866EE, 0.08);
      cableGfx.beginPath();
      cableGfx.moveTo(a.x, a.y);
      for (let t = 0; t <= 1; t += 0.1) {
        const px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * midX + t * t * b.x;
        const py = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * midY + t * t * b.y;
        cableGfx.lineTo(px, py);
      }
      cableGfx.strokePath();
    }

    const midCloudGfx = this.scene.add.graphics().setDepth(-20).setScrollFactor(0.5);
    for (let i = 0; i < 4; i++) {
      const x = (rng() - 0.5) * spread + cx;
      const y = cy + rng() * ISO_WORLD_H * 0.8;
      const w = 250 + rng() * 400;
      const h = 30 + rng() * 50;
      const col = rng() < 0.5 ? 0x441166 : 0x113355;
      midCloudGfx.fillStyle(col, 0.035 + rng() * 0.04);
      midCloudGfx.fillEllipse(x, y, w, h);
    }

    const nearRockGfx = this.scene.add.graphics().setDepth(-15).setScrollFactor(0.65);
    for (let i = 0; i < 4; i++) {
      const x = (rng() - 0.5) * spread * 0.8 + cx;
      const y = cy + ISO_WORLD_H * 0.35 + rng() * ISO_WORLD_H * 0.4;
      const w = 80 + rng() * 160;
      const h = 50 + rng() * 100;
      this.drawFloatingRock(nearRockGfx, x, y, w, h, rng, 0.6);
    }

    const nearMistGfx = this.scene.add.graphics().setDepth(-12).setScrollFactor(0.8);
    for (let i = 0; i < 4; i++) {
      const x = (rng() - 0.5) * spread * 0.5 + cx;
      const y = cy + ISO_WORLD_H * 0.2 + rng() * ISO_WORLD_H * 0.5;
      const w = 120 + rng() * 180;
      const h = 10 + rng() * 15;
      const col = rng() < 0.5 ? 0x6644CC : 0x2288CC;
      nearMistGfx.fillStyle(col, 0.02 + rng() * 0.025);
      nearMistGfx.fillEllipse(x, y, w, h);
    }
  }

  private drawFloatingRock(
    gfx: Phaser.GameObjects.Graphics,
    cx: number, cy: number, w: number, h: number,
    rng: () => number, opacity: number,
  ): void {
    const points: { x: number; y: number }[] = [];
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const rW = w * 0.5 * (0.7 + rng() * 0.3);
      const rH = h * 0.5 * (0.6 + rng() * 0.3);
      points.push({
        x: cx + Math.cos(angle) * rW,
        y: cy + Math.sin(angle) * rH,
      });
    }

    gfx.fillStyle(0x2A2520, opacity * 0.8);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) gfx.lineTo(points[i].x, points[i].y);
    gfx.closePath();
    gfx.fillPath();

    gfx.fillStyle(0x4A4235, opacity * 0.5);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i <= segments / 2; i++) gfx.lineTo(points[i].x, points[i].y);
    gfx.lineTo(cx, cy);
    gfx.closePath();
    gfx.fillPath();

    const veinCount = 1 + Math.floor(rng() * 3);
    for (let v = 0; v < veinCount; v++) {
      const sx = cx + (rng() - 0.5) * w * 0.4;
      const sy = cy + (rng() - 0.5) * h * 0.3;
      const ex = sx + (rng() - 0.5) * w * 0.3;
      const ey = sy + (rng() - 0.5) * h * 0.3;
      gfx.lineStyle(1.5, 0x7755DD, opacity * 0.4);
      gfx.lineBetween(sx, sy, ex, ey);
      gfx.lineStyle(4, 0x6644CC, opacity * 0.1);
      gfx.lineBetween(sx, sy, ex, ey);
    }

    if (rng() > 0.6) {
      gfx.fillStyle(0x5544BB, opacity * 0.15);
      gfx.fillEllipse(cx, cy - h * 0.15, w * 0.2, h * 0.1);
    }
  }

  // ─── Iso Map Border ──────────────────────────────────────────

  private drawMapBorderIso(): void {
    this.drawParallaxBackground();

    // Near-black void background
    const bgGfx = this.scene.add.graphics().setDepth(-10);
    bgGfx.fillStyle(0x030205, 1);
    bgGfx.fillRect(-600, -600, ISO_WORLD_W + 1200, ISO_WORLD_H + 1200);

    const M = 6;

    // ── Void tiles ─────────────────────────────────────────────────────────
    // Tiles fade from dark-but-visible near the island edge to near-black
    // further out. A cold purple-blue tint gives a mystical "void" feel.

    type BorderTile = { gx: number; gy: number; color: number };
    const borderTiles: BorderTile[] = [];

    for (let gy = -M; gy < GRID_HEIGHT + M; gy++) {
      for (let gx = -M; gx < GRID_WIDTH + M; gx++) {
        if (gx >= 0 && gx < GRID_WIDTH && gy >= 0 && gy < GRID_HEIGHT) continue;

        const dGx = gx < 0 ? -gx : gx >= GRID_WIDTH  ? gx - GRID_WIDTH  + 1 : 0;
        const dGy = gy < 0 ? -gy : gy >= GRID_HEIGHT ? gy - GRID_HEIGHT + 1 : 0;

        // Skip corner tiles (both axes outside grid) — they create concentric
        // ring artifacts because each ring has a different brightness step.
        // The near-black background fills the corners invisibly.
        if (dGx > 0 && dGy > 0) continue;

        const distFromEdge = Math.min(dGx > 0 ? dGx : 999, dGy > 0 ? dGy : 999);

        const hash = ((gx * 73 + gy * 137 + gx * gy * 31) >>> 0);

        // t = 0 near island, 1 at outer edge → brightness drops sharply
        const t  = Math.min((distFromEdge - 1) / (M - 1), 1);
        const br = Math.round(52 * (1 - t * 0.92));            // 52 → ~4
        const n  = ((hash & 0x1F) - 16) * 0.9;                // subtle tile noise

        const R = Math.max(0, Math.min(255, Math.round(br * 0.72 + n)));
        const G = Math.max(0, Math.min(255, Math.round(br * 0.68 + n)));
        const B = Math.max(0, Math.min(255, Math.round(br * 1.18 + n)));

        borderTiles.push({ gx, gy, color: (R << 16) | (G << 8) | B });
      }
    }

    borderTiles.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

    const borderGfx = this.scene.add.graphics().setDepth(-2);
    for (const tile of borderTiles) {
      borderGfx.fillStyle(tile.color, 1);
      drawIsoDiamond(borderGfx, tile.gx, tile.gy);
    }

    // ── Mist / fog overlay ─────────────────────────────────────────────────
    this.drawVoidFog();
  }

  /** Radial fog gradient: transparent at island, blue-purple mist at edges. */
  private drawVoidFog(): void {
    const key = '__void_fog__';

    // Small canvas scaled up — smooth gradient needs only low resolution
    const FW = 512, FH = 256;
    const c  = document.createElement('canvas');
    c.width  = FW; c.height = FH;
    const ctx = c.getContext('2d')!;

    // Gradient centered slightly above the canvas midpoint (where island sits)
    const cx = FW * 0.50;
    const cy = FH * 0.36;
    const grad = ctx.createRadialGradient(cx, cy, FW * 0.08, cx, cy, FW * 0.82);
    grad.addColorStop(0.00, 'rgba(150, 160, 215, 0.00)');
    grad.addColorStop(0.42, 'rgba(140, 150, 205, 0.00)');
    grad.addColorStop(0.65, 'rgba(128, 140, 195, 0.18)');
    grad.addColorStop(0.82, 'rgba(115, 128, 182, 0.52)');
    grad.addColorStop(1.00, 'rgba(100, 115, 168, 0.88)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FW, FH);

    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.scene.textures.addCanvas(key, c);

    const totalW = ISO_WORLD_W + 1200;
    const totalH = ISO_WORLD_H + 800;
    this.scene.add.image(-600, -400, key)
      .setOrigin(0, 0)
      .setDisplaySize(totalW, totalH)
      .setDepth(-1);
  }

  // ─── Grass Tile Textures ─────────────────────────────────────

  private createGrassTileTextures(): void {
    if (this.scene.textures.exists('GRASS_TILE_0')) return;

    const W = ISO_TILE_W;
    const H = ISO_TILE_H;

    const h2 = (px: number, py: number, s: number): number => {
      let h = (px * 374761393 + py * 668265263 + s) >>> 0;
      h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
      return (h >>> 24) / 255;
    };

    const createTile = (key: string, base: number, noiseAmt: number, seed: number, mode: 0 | 1 | 2 | 3 | 4) => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d')!;
      const img = ctx.createImageData(W, H);
      const d = img.data;

      const R = (base >> 16) & 0xFF;
      const G = (base >> 8) & 0xFF;
      const B = base & 0xFF;

      for (let py = 0; py < H; py++) {
        for (let px = 0; px < W; px++) {
          if (Math.abs(px - 32) / 32 + Math.abs(py - 16) / 16 > 1.0) continue;

          const n0 = h2(px, py, seed);
          const n1 = h2(px >> 1, py >> 1, seed + 1);
          const n2 = h2(px >> 1, py, seed + 2);

          let noise: number;
          let rOut = R, gOut = G, bOut = B;

          if (mode === 0) {
            noise = (n0 * 0.55 + n1 * 0.25 + n2 * 0.20 - 0.5) * noiseAmt;
            if (h2(px, py * 3, seed + 7) > 0.93) noise += noiseAmt * 0.55;
            rOut = R + noise;
            gOut = G + noise * 1.1;
            bOut = B + noise * 0.35;
          } else if (mode === 1) {
            const n3 = h2(px >> 2, py >> 2, seed + 3);
            noise = (n0 * 0.35 + n1 * 0.40 + n3 * 0.25 - 0.5) * noiseAmt;
            rOut = R + noise;
            gOut = G + noise * 1.1;
            bOut = B + noise * 0.35;
          } else if (mode === 2) {
            noise = (n0 * 0.35 + n1 * 0.50 + n2 * 0.15 - 0.5) * noiseAmt;
            rOut = R + noise;
            gOut = G + noise * 0.8;
            bOut = B + noise * 0.35;
          } else if (mode === 3) {
            const n3 = h2(px >> 2, py >> 2, seed + 3);
            noise = (n0 * 0.3 + n1 * 0.5 + n3 * 0.2 - 0.5) * noiseAmt;
            rOut = R + noise;
            gOut = G + noise * 0.9;
            bOut = B + noise * 0.85;
            const rivetX = (px + 4) % 16;
            const rivetY = (py + 2) % 10;
            if (rivetX < 2 && rivetY < 2 && rivetX >= 0 && rivetY >= 0) {
              rOut += 15; gOut += 12; bOut += 10;
            }
            const edgeDist = 1.0 - (Math.abs(px - 32) / 32 + Math.abs(py - 16) / 16);
            if (edgeDist < 0.08) {
              rOut += 8; gOut += 6; bOut += 5;
            }
          } else {
            const n3 = h2(px >> 2, py >> 2, seed + 3);
            noise = (n0 * 0.3 + n1 * 0.5 + n3 * 0.2 - 0.5) * noiseAmt;
            rOut = R + noise;
            gOut = G + noise * 0.9;
            bOut = B + noise * 0.85;
            const rivetX4 = (px + 4) % 16;
            const rivetY4 = (py + 2) % 10;
            if (rivetX4 < 2 && rivetY4 < 2 && rivetX4 >= 0 && rivetY4 >= 0) {
              rOut += 15; gOut += 12; bOut += 10;
            }
            const veinLine = Math.abs((px * 0.7 + py * 1.3 + seed * 0.1) % 18 - 9);
            if (veinLine < 1.2) {
              const veinGlow = 1.0 - veinLine / 1.2;
              rOut = rOut * (1 - veinGlow * 0.5) + 90 * veinGlow;
              gOut = gOut * (1 - veinGlow * 0.7) + 50 * veinGlow;
              bOut = bOut * (1 - veinGlow * 0.3) + 200 * veinGlow;
            }
          }

          const i = (py * W + px) * 4;
          d[i]   = Math.max(0, Math.min(255, rOut));
          d[i+1] = Math.max(0, Math.min(255, gOut));
          d[i+2] = Math.max(0, Math.min(255, bOut));
          d[i+3] = 255;
        }
      }

      ctx.putImageData(img, 0, 0);
      this.scene.textures.addCanvas(key, c);
    };

    createTile('GRASS_TILE_0', 0x316728, 18, 1001, 0);
    createTile('GRASS_TILE_1', 0x326828, 16, 2002, 0);
    createTile('GRASS_TILE_2', 0x306527, 17, 3003, 0);
    createTile('GRASS_TILE_3', 0x336929, 15, 4004, 0);

    createTile('DUNGEON_TILE_0', 0x4A4235, 24, 5005, 1);
    createTile('DUNGEON_TILE_1', 0x3D3628, 20, 6006, 1);
    createTile('DUNGEON_TILE_2', 0x565040, 26, 7007, 1);
    createTile('DUNGEON_TILE_3', 0x302820, 18, 8008, 1);

    createTile('SWAMP_TILE_0', 0x2D4A2A, 22, 9009, 2);
    createTile('SWAMP_TILE_1', 0x3A5530, 20, 10010, 2);
    createTile('SWAMP_TILE_2', 0x4A5535, 24, 11011, 2);
    createTile('SWAMP_TILE_3', 0x263325, 18, 12012, 2);

    createTile('METAL_TILE_0', 0x3A3D42, 12, 13013, 3);
    createTile('METAL_TILE_1', 0x353840, 10, 14014, 3);
    createTile('METAL_TILE_2', 0x40434A, 14, 15015, 3);
    createTile('METAL_TILE_3', 0x32353C, 11, 16016, 3);

    createTile('ARKAN_TILE_0', 0x3A3D42, 16, 17017, 4);
    createTile('ARKAN_TILE_1', 0x353840, 14, 18018, 4);
    createTile('ARKAN_TILE_2', 0x40434A, 17, 19019, 4);
    createTile('ARKAN_TILE_3', 0x32353C, 15, 20020, 4);
  }

  // ─── Grid Drawing ────────────────────────────────────────────

  drawGrid(): void {
    const grassColors = [
      UI_COLORS.GRASS_BG, UI_COLORS.GRASS_ALT,
      UI_COLORS.GRASS_LIGHT, UI_COLORS.GRASS_DARK,
    ];

    if (ISO_MODE) {
      this.createGrassTileTextures();

      const terrainGfx = this.scene.add.graphics().setDepth(0);
      const METAL_COLORS = [0x3A3D42, 0x353840, 0x40434A, 0x32353C];

      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          if (isInDungeonZone(gx, gy) || isInSwampZone(gx, gy)) continue;
          const hash = ((gx * 73 + gy * 137 + gx * gy * 31) >>> 0) % 4;
          terrainGfx.fillStyle(METAL_COLORS[hash], 1);
          drawIsoDiamond(terrainGfx, gx, gy);
        }
      }

      terrainGfx.lineStyle(1, 0x4A4D55, 0.3);
      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          if (isInDungeonZone(gx, gy) || isInSwampZone(gx, gy)) continue;
          strokeIsoDiamond(terrainGfx, gx, gy);
        }
      }

      const terrainRT = this.scene.add.renderTexture(0, 0, ISO_WORLD_W, ISO_WORLD_H)
        .setDepth(0.1)
        .setOrigin(0, 0);

      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          const hash = ((gx * 73 + gy * 137 + gx * gy * 31) >>> 0) % 4;
          const iso = gridToIso(gx, gy);
          const drawX = iso.x - ISO_TILE_HALF_W;
          const drawY = iso.y;

          if (isInDungeonZone(gx, gy)) {
            terrainRT.drawFrame(`DUNGEON_TILE_${hash}`, 0, drawX, drawY);
          } else if (isInSwampZone(gx, gy)) {
            terrainRT.drawFrame(`SWAMP_TILE_${hash}`, 0, drawX, drawY);
          } else {
            const fullHash = ((gx * 73 + gy * 137 + gx * gy * 31) >>> 0);
            if ((fullHash % 8) === 0) {
              terrainRT.drawFrame(`ARKAN_TILE_${hash}`, 0, drawX, drawY);
            } else {
              terrainRT.drawFrame(`METAL_TILE_${hash}`, 0, drawX, drawY);
            }
          }
        }
      }

      this.grassGraphics = this.scene.add.graphics().setVisible(false);
      this.gridLinesGraphics = this.scene.add.graphics().setDepth(2).setAlpha(0).setVisible(false);
      return;
    }

    // ── Legacy top-down mode ──
    const hasGrassTex = this.scene.textures.exists('TERRAIN_GRASS');
    this.grassGraphics = this.scene.add.graphics().setDepth(0);
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
          const img = this.scene.add.image(
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

    this.gridLinesGraphics = this.scene.add.graphics().setDepth(1).setAlpha(0);
    this.gridLinesGraphics.lineStyle(1, UI_COLORS.GRID_LINE, 0.25);
    for (let x = 0; x <= GRID_WIDTH; x++) {
      this.gridLinesGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_HEIGHT);
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      this.gridLinesGraphics.lineBetween(0, y * TILE_SIZE, WORLD_WIDTH, y * TILE_SIZE);
    }
  }

  // ─── Terrain Decorations ─────────────────────────────────────

  placeTerrainDecorations(): void {
    const groundDecos = [
      'DECO_FLOWER_1', 'DECO_ROCK_1', 'DECO_BUSH_1',
      'DECO_GRASS_TUFT', 'DECO_STONE_LARGE', 'DECO_MUSHROOM',
      'DECO_LOG', 'DECO_WILDFLOWER_2',
    ].filter(k => this.scene.textures.exists(k));
    const treeDecos = (ISO_MODE
      ? ['ISO_TREE_SMALL', 'DECO_TREE_SMALL']
      : ['DECO_TREE_SMALL']
    ).filter(k => this.scene.textures.exists(k)).slice(0, 1);

    if (groundDecos.length === 0 && treeDecos.length === 0) return;

    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let gy = 0; gy < GRID_HEIGHT; gy++) {
      for (let gx = 0; gx < GRID_WIDTH; gx++) {
        const key = `${gx},${gy}`;

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
          const iso = gridToIso(gx, gy);
          const baseX = iso.x + (r3 - 0.5) * ISO_TILE_HALF_W * 0.5;
          const baseY = iso.y + ISO_TILE_HALF_H + (r4 - 0.5) * ISO_TILE_HALF_H * 0.5;
          const depth = (gx + gy) * 10 + 2;

          if (isInDungeonZone(gx, gy)) {
            const stoneKeys = ['DECO_STONE_LARGE', 'DECO_LOG'].filter(k => this.scene.textures.exists(k));
            if (stoneKeys.length === 0 || r1 > 0.45) continue;
            const sk = stoneKeys[Math.floor(r2 * stoneKeys.length)];
            const scale = 0.5 + r5 * 0.4;
            const img = this.scene.add.image(baseX, baseY, sk)
              .setDisplaySize(ISO_TILE_HALF_W * scale * 1.2, ISO_TILE_HALF_W * scale * 1.2)
              .setDepth(depth)
              .setAlpha(0.65 + r6 * 0.25)
              .setTint(0x888070);
            this.decoSprites.set(key, img);
            continue;
          }

          if (isInSwampZone(gx, gy)) {
            const swampDecos = ['DECO_MUSHROOM', 'DECO_LOG', 'DECO_STONE_LARGE'].filter(k => this.scene.textures.exists(k));
            if (swampDecos.length === 0 || r1 > 0.40) continue;
            const sk = swampDecos[Math.floor(r2 * swampDecos.length)];
            const scale = 0.4 + r5 * 0.35;
            const img = this.scene.add.image(baseX, baseY, sk)
              .setDisplaySize(ISO_TILE_HALF_W * scale * 1.1, ISO_TILE_HALF_W * scale * 1.1)
              .setDepth(depth)
              .setAlpha(0.55 + r6 * 0.30)
              .setTint(0x4A6B3A);
            this.decoSprites.set(key, img);
            continue;
          }

          if (treeDecos.length > 0 && r7 < 0.05) {
            const treeKey = treeDecos[Math.floor(r2 * treeDecos.length)];
            const scale = 0.7 + r5 * 0.4;
            const treeW = ISO_TILE_W * scale;
            const img = this.scene.add.image(baseX, baseY - 6, treeKey)
              .setDisplaySize(treeW, treeW * 1.4)
              .setDepth(depth + 1)
              .setAlpha(0.85 + r6 * 0.15);
            this.decoSprites.set(key, img);
            continue;
          }

          if (groundDecos.length === 0 || r1 > 0.30) continue;
          const decoKey = groundDecos[Math.floor(r2 * groundDecos.length)];
          const scale = 0.4 + r5 * 0.35;
          const img = this.scene.add.image(baseX, baseY, decoKey)
            .setDisplaySize(ISO_TILE_HALF_W * scale, ISO_TILE_HALF_W * scale)
            .setDepth(depth)
            .setAlpha(0.70 + r6 * 0.30);
          this.decoSprites.set(key, img);

        } else {
          if (treeDecos.length > 0 && r7 < 0.05) {
            const treeKey = treeDecos[Math.floor(r2 * treeDecos.length)];
            const scale = 0.8 + r5 * 0.4;
            const img = this.scene.add.image(
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
          const img = this.scene.add.image(
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

  // ─── Grid Lines ──────────────────────────────────────────────

  showGridLines(): void {
    if (ISO_MODE && !this.gridLinesDrawn) {
      this.gridLinesGraphics.lineStyle(1, UI_COLORS.GRID_LINE, 0.22);
      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          strokeIsoDiamond(this.gridLinesGraphics, gx, gy);
        }
      }
      this.gridLinesDrawn = true;
    }
    this.gridLinesGraphics.setVisible(true);
    this.scene.tweens.killTweensOf(this.gridLinesGraphics);
    this.scene.tweens.add({
      targets: this.gridLinesGraphics,
      alpha: 1,
      duration: 200,
      ease: 'Sine.easeOut',
    });
  }

  hideGridLines(): void {
    this.scene.tweens.killTweensOf(this.gridLinesGraphics);
    this.scene.tweens.add({
      targets: this.gridLinesGraphics,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => this.gridLinesGraphics.setVisible(false),
    });
  }

  // ─── Border Walls ─────────────────────────────────────────────

  /**
   * Renders stone wall sprites around the entire grid perimeter.
   * - WALL_CORNER_TOWER at each of the 4 corners (1×1 tile)
   * - WALL_SIDE_A (2×1) along top (y=0) and bottom (y=MAP_H-1) edges
   * - WALL_SIDE_B (1×2) along left (x=0) and right (x=MAP_W-1) edges
   * Sprites are static (not part of game state) and depth-sorted correctly.
   */
  renderBorderWalls(): void {
    if (!ISO_MODE) return;

    const MAP_W = GRID_WIDTH;   // 40
    const MAP_H = GRID_HEIGHT;  // 36

    const placeWall = (key: string, gx: number, gy: number, fw: number, fh: number, yOffsetFactor = 0.22) => {
      if (!this.scene.textures.exists(key)) return;
      const spriteW = (fw + fh) * ISO_TILE_HALF_W;
      const spriteH = spriteW * 1.15;
      const center = gridToIso(gx + fw / 2, gy + fh / 2);
      const depth = (gx + fw - 1 + gy + fh - 1) * 10 + 5;
      this.scene.add.image(center.x, center.y + ISO_TILE_HALF_H - spriteH * yOffsetFactor, key)
        .setDisplaySize(spriteW, spriteH)
        .setOrigin(0.5, 0.5)
        .setDepth(depth);
    };

    // Corner towers (1×1, slightly taller y-offset)
    placeWall('WALL_CORNER_TOWER', 0,          0,          1, 1, 0.30);
    placeWall('WALL_CORNER_TOWER', MAP_W - 1,  0,          1, 1, 0.30);
    placeWall('WALL_CORNER_TOWER', 0,          MAP_H - 1,  1, 1, 0.30);
    placeWall('WALL_CORNER_TOWER', MAP_W - 1,  MAP_H - 1,  1, 1, 0.30);

    // Top edge (y=0): WALL_SIDE_A (2×1), x = 1, 3, 5, …, 37
    for (let x = 1; x < MAP_W - 2; x += 2) {
      placeWall('WALL_SIDE_A', x, 0, 2, 1);
    }

    // Bottom edge (y=MAP_H-1): WALL_SIDE_A (2×1)
    for (let x = 1; x < MAP_W - 2; x += 2) {
      placeWall('WALL_SIDE_A', x, MAP_H - 1, 2, 1);
    }

    // Left edge (x=0): WALL_SIDE_B (1×2), y = 1, 3, 5, …, 33
    for (let y = 1; y < MAP_H - 2; y += 2) {
      placeWall('WALL_SIDE_B', 0, y, 1, 2);
    }

    // Right edge (x=MAP_W-1): WALL_SIDE_B (1×2)
    for (let y = 1; y < MAP_H - 2; y += 2) {
      placeWall('WALL_SIDE_B', MAP_W - 1, y, 1, 2);
    }
  }

  // ─── Decoration Removal ──────────────────────────────────────

  removeDecoAt(gx: number, gy: number): void {
    const key = `${gx},${gy}`;
    const deco = this.decoSprites.get(key);
    if (deco) {
      deco.destroy();
      this.decoSprites.delete(key);
    }
  }
}
