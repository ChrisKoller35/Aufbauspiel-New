/**
 * Compute the minimum Manhattan distance between two axis-aligned rectangles
 * described by their top-left grid position and footprint size.
 */
export function manhattanFootprintDist(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): number {
  // Horizontal gap
  const dx = Math.max(0, Math.max(ax, bx) - Math.min(ax + aw, bx + bw));
  // Vertical gap
  const dy = Math.max(0, Math.max(ay, by) - Math.min(ay + ah, by + bh));
  return dx + dy;
}
