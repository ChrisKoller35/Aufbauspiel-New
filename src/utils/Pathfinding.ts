import { GameState } from '../models/GameState';
import { GRID_WIDTH, GRID_HEIGHT } from '../rendering/Colors';

interface GridPos {
  x: number;
  y: number;
}

const DIRS: GridPos[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/**
 * BFS over road tiles starting from a set of seed positions.
 * Returns a Set of "x,y" keys for every road tile reachable from any seed.
 */
export function bfsRoads(state: GameState, seeds: GridPos[]): Set<string> {
  const visited = new Set<string>();
  const queue: GridPos[] = [];

  for (const s of seeds) {
    const key = `${s.x},${s.y}`;
    if (!visited.has(key)) {
      visited.add(key);
      queue.push(s);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const d of DIRS) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      if (nx < 0 || ny < 0 || nx >= GRID_WIDTH || ny >= GRID_HEIGHT) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      const tile = state.grid[ny][nx];
      if (tile?.isRoad) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return visited;
}
