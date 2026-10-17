// ============================================================
// IsoRenderer.ts — True Isometric Coordinate System
// ============================================================
// Converts between grid coordinates (gx, gy) and isometric
// screen coordinates (screenX, screenY).
//
// Tile layout (2:1 ratio diamond):
//       *
//      * *
//     *   *
//      * *
//       *
// Width = 64px, Height = 32px
// ============================================================

import { GRID_WIDTH, GRID_HEIGHT } from './Colors';

// ─── Tile Dimensions ─────────────────────────────────────────
export const ISO_TILE_W      = 64;   // Full diamond width
export const ISO_TILE_H      = 32;   // Full diamond height (2:1 ratio)
export const ISO_TILE_HALF_W = 32;   // Half width (horizontal step per grid unit)
export const ISO_TILE_HALF_H = 16;   // Half height (vertical step per grid unit)

// ─── World Origin ─────────────────────────────────────────────
// Place origin so that tile (0,0) is at the top of the diamond.
// The leftmost tile is (0, GRID_HEIGHT-1), rightmost is (GRID_WIDTH-1, 0).
// We set originX so the left edge doesn't clip below x=0.
export const ISO_ORIGIN_X = GRID_HEIGHT * ISO_TILE_HALF_W;  // 36 * 32 = 1152
export const ISO_ORIGIN_Y = 280;   // Top margin for buildings extending upward

// ─── World Dimensions (for camera bounds) ────────────────────
// Diamond extent: width = (GRID_WIDTH + GRID_HEIGHT) * TILE_HALF_W
//                height = (GRID_WIDTH + GRID_HEIGHT) * TILE_HALF_H
export const ISO_WORLD_W = (GRID_WIDTH + GRID_HEIGHT) * ISO_TILE_HALF_W;  // 2432
export const ISO_WORLD_H = (GRID_WIDTH + GRID_HEIGHT) * ISO_TILE_HALF_H + ISO_ORIGIN_Y + 200; // ~1696

// ─── Coordinate Conversion ───────────────────────────────────

/**
 * Convert grid coordinates to isometric screen position.
 * Returns the TOP CENTER of the tile diamond.
 */
export function gridToIso(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * ISO_TILE_HALF_W + ISO_ORIGIN_X,
    y: (gx + gy) * ISO_TILE_HALF_H + ISO_ORIGIN_Y,
  };
}

/**
 * Convert isometric screen coordinates to the nearest grid tile.
 * Note: result may be outside grid bounds — caller must clamp.
 */
export function isoToGrid(sx: number, sy: number): { gx: number; gy: number } {
  const relX = sx - ISO_ORIGIN_X;
  const relY = sy - ISO_ORIGIN_Y;
  // Inverse of gridToIso:  relX = (gx-gy)*HALF_W,  relY = (gx+gy)*HALF_H
  // → gx = (relX/HALF_W + relY/HALF_H) / 2
  // → gy = (relY/HALF_H - relX/HALF_W) / 2
  return {
    gx: Math.floor((relX / ISO_TILE_HALF_W + relY / ISO_TILE_HALF_H) / 2),
    gy: Math.floor((relY / ISO_TILE_HALF_H - relX / ISO_TILE_HALF_W) / 2),
  };
}

/**
 * Clamp grid coordinates to valid grid range.
 */
export function clampGrid(gx: number, gy: number): { gx: number; gy: number } {
  return {
    gx: Math.max(0, Math.min(GRID_WIDTH - 1, gx)),
    gy: Math.max(0, Math.min(GRID_HEIGHT - 1, gy)),
  };
}

/**
 * Check if grid coordinates are within bounds.
 */
export function inGrid(gx: number, gy: number): boolean {
  return gx >= 0 && gx < GRID_WIDTH && gy >= 0 && gy < GRID_HEIGHT;
}

/**
 * Depth value for iso rendering — tiles/objects with higher (gx+gy) are
 * drawn on top of those with lower (gx+gy). Multiply by a step to allow
 * for objects of different heights at the same depth band.
 */
export function isoDepth(gx: number, gy: number, heightOffset = 0): number {
  return (gx + gy) * 100 + heightOffset;
}

/**
 * Draw a filled isometric diamond tile on a Phaser Graphics object.
 * @param gfx  Phaser Graphics to draw on
 * @param gx   Grid X
 * @param gy   Grid Y
 */
export function drawIsoDiamond(
  gfx: Phaser.GameObjects.Graphics,
  gx: number,
  gy: number,
): void {
  const { x, y } = gridToIso(gx, gy);
  gfx.fillPoints(
    [
      { x,                         y },                           // top
      { x: x + ISO_TILE_HALF_W,    y: y + ISO_TILE_HALF_H },     // right
      { x,                         y: y + ISO_TILE_H },           // bottom
      { x: x - ISO_TILE_HALF_W,    y: y + ISO_TILE_HALF_H },     // left
    ],
    true,
  );
}

/**
 * Stroke the outline of an isometric diamond tile.
 */
export function strokeIsoDiamond(
  gfx: Phaser.GameObjects.Graphics,
  gx: number,
  gy: number,
): void {
  const { x, y } = gridToIso(gx, gy);
  gfx.strokePoints(
    [
      { x,                         y },
      { x: x + ISO_TILE_HALF_W,    y: y + ISO_TILE_HALF_H },
      { x,                         y: y + ISO_TILE_H },
      { x: x - ISO_TILE_HALF_W,    y: y + ISO_TILE_HALF_H },
    ],
    true,
  );
}

/**
 * Draw a multi-tile building footprint diamond outline (w × h tiles).
 * The outline follows the outer edge of the combined footprint.
 */
export function strokeIsoBuildingFootprint(
  gfx: Phaser.GameObjects.Graphics,
  gx: number,
  gy: number,
  w: number,
  h: number,
): void {
  // Corners of the rectangular footprint in grid space → iso screen
  const topLeft     = gridToIso(gx,     gy);
  const topRight    = gridToIso(gx + w, gy);
  const bottomRight = gridToIso(gx + w, gy + h);
  const bottomLeft  = gridToIso(gx,     gy + h);

  gfx.strokePoints(
    [
      { x: topLeft.x,     y: topLeft.y },
      { x: topRight.x,    y: topRight.y },
      { x: bottomRight.x, y: bottomRight.y },
      { x: bottomLeft.x,  y: bottomLeft.y },
    ],
    true,
  );
}
