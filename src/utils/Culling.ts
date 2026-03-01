/**
 * Check if a world-position rectangle is visible in the camera viewport.
 * Used to hide building sprites that are off-screen.
 *
 * Usage example in CityScene:
 *
 *   import { isInView } from '../utils/Culling';
 *
 *   // In update():
 *   const cam = this.cameras.main;
 *   for (const [id, sprite] of this.buildingSprites) {
 *     const b = this.state.buildings.find(b => b.id === id);
 *     if (!b) continue;
 *     const visible = isInView(cam, b.x * TILE_SIZE, b.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
 *     sprite.setVisible(visible);
 *   }
 *
 * @param cam   Camera descriptor (Phaser.Cameras.Scene2D.Camera satisfies this shape).
 * @param x     Left edge of the object in world coordinates.
 * @param y     Top edge of the object in world coordinates.
 * @param w     Width of the object in world coordinates.
 * @param h     Height of the object in world coordinates.
 * @param margin Extra pixels added around the viewport to avoid pop-in (default 64).
 */
export function isInView(
  cam: { scrollX: number; scrollY: number; width: number; height: number; zoom: number },
  x: number,
  y: number,
  w: number,
  h: number,
  margin = 64,
): boolean {
  const viewLeft   = cam.worldView.x - margin;
  const viewRight  = cam.worldView.x + cam.width  / cam.zoom + margin;
  const viewTop    = cam.worldView.y - margin;
  const viewBottom = cam.worldView.y + cam.height / cam.zoom + margin;
  return x + w > viewLeft && x < viewRight && y + h > viewTop && y < viewBottom;
}
