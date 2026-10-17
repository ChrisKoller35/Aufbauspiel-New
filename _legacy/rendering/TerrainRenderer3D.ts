// ============================================================
// TerrainRenderer3D.ts — Full Terrain Renderer for Three.js
// ============================================================
// Renders the 40×36 grid terrain with correct zone colouring
// (grass, dungeon rock, swamp), grid-line overlay, hover
// highlight, decorations (billboard sprites), and a realistic
// island heightmap.  Replaces the PoC functions in TerrainMesh.ts.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {
  GRID_WIDTH, GRID_HEIGHT, TILE_SIZE,
  UI_COLORS,
} from './Colors';
import { GameState } from '../models/GameState';
import {
  isInDungeonZone, isInSwampZone,
  DUNGEON_ZONE_OGX, DUNGEON_ZONE_OGY,
  DUNGEON_ZONE_W, DUNGEON_ZONE_H,
  DUNGEON_ROCK_COLORS, SWAMP_COLORS,
} from '../scenes/CityMapRenderer';

// ─── Constants ───────────────────────────────────────────────
const WORLD_W   = GRID_WIDTH  * TILE_SIZE;  // 1280
const WORLD_H   = GRID_HEIGHT * TILE_SIZE;  // 1152
const WATER_Y   = -8;                       // Y position for the water plane
const PEAK_Y    = 35;                       // Maximum terrain height at island centre
// DUNGEON_DIP removed — terrain is now flat for accurate raycasting

// Shore/sand band colour
const SAND_COLOR = 0x8B7D5A;

// Grass colours from Colors.ts (used for normal terrain)
const GRASS_COLORS = [
  UI_COLORS.GRASS_BG,     // 0x316728
  UI_COLORS.GRASS_ALT,    // 0x2D6024
  UI_COLORS.GRASS_LIGHT,  // 0x376C2E
  UI_COLORS.GRASS_DARK,   // 0x2B5C22
];

// Metal-platform colours (the current iso terrain uses these for "normal" tiles)
const METAL_COLORS = [0x3A3D42, 0x353840, 0x40434A, 0x32353C];

// ─── Helpers ─────────────────────────────────────────────────

/** Deterministic hash used by CityMapRenderer for tile variety. */
function tileHash(gx: number, gy: number): number {
  return ((gx * 73 + gy * 137 + gx * gy * 31) >>> 0);
}

/** Convert a 0xRRGGBB integer to a THREE.Color. */
function colorFromHex(hex: number): THREE.Color {
  return new THREE.Color(hex);
}

/** Simple seeded RNG (same as CityMapRenderer). */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── TerrainRenderer3D ──────────────────────────────────────

export class TerrainRenderer3D {
  private threeScene: THREE.Scene;

  // Meshes we own
  private terrainMesh: THREE.Mesh | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private islandBaseMesh: THREE.Mesh | null = null;
  private islandVisualGLB: THREE.Object3D | null = null;
  private gridLines: THREE.LineSegments | null = null;
  private highlightMesh: THREE.Mesh | null = null;

  // Decoration sprites
  private decorations: THREE.Sprite[] = [];

  // Texture and material caches for decorations (shared across sprites)
  private textureCache = new Map<string, THREE.Texture>();
  private materialCache = new Map<string, THREE.SpriteMaterial>();

  // Lighting we add
  private hemisphereLight: THREE.HemisphereLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private undersideFillLight: THREE.DirectionalLight | null = null;
  private undersideFillLightBack: THREE.DirectionalLight | null = null;
  private undersideRingLights: THREE.PointLight[] = [];

  // Height cache: heightCache[gy][gx] = Y height at that grid vertex (for terrain mesh)
  private heightCache: number[][] = [];

  // Surface height cache: baked from GLB island raycast — world-space Y of actual surface
  // Used for positioning buildings, ghosts, highlights on the real island surface.
  private surfaceHeightCache: number[][] | null = null;

  // Current gameState reference
  private gameState: GameState | null = null;

  constructor(scene: THREE.Scene) {
    this.threeScene = scene;
  }

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Build the full terrain mesh from the game state.
   * This creates the heightmap geometry with per-vertex colours matching
   * the zone types from CityMapRenderer.
   */
  createTerrain(gameState: GameState): THREE.Mesh {
    this.gameState = gameState;
    this.dispose(); // clean up previous terrain if any

    // Subdivide per grid cell (one vertex per grid corner → (W+1)×(H+1) verts)
    const segsX = GRID_WIDTH;
    const segsZ = GRID_HEIGHT;
    const geo = new THREE.PlaneGeometry(WORLD_W, WORLD_H, segsX, segsZ);
    geo.rotateX(-Math.PI / 2); // Y-up

    const pos = geo.attributes.position;
    const vertCount = pos.count;
    const colours = new Float32Array(vertCount * 3);

    // Precompute height cache
    this.heightCache = [];
    for (let gz = 0; gz <= GRID_HEIGHT; gz++) {
      this.heightCache[gz] = [];
      for (let gxIdx = 0; gxIdx <= GRID_WIDTH; gxIdx++) {
        this.heightCache[gz][gxIdx] = this.computeHeight(gxIdx, gz);
      }
    }

    // Apply heights and colours to geometry vertices.
    // PlaneGeometry after rotateX(-PI/2) has vertices laid out as:
    //   row-major from (-halfW, 0, -halfH) to (+halfW, 0, +halfH)
    // We shift the mesh later so grid(0,0) ≈ world(0,0,0).
    const halfW = WORLD_W / 2;
    const halfH = WORLD_H / 2;

    for (let i = 0; i < vertCount; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Map local coords to grid indices
      const gxF = (x + halfW) / TILE_SIZE;
      const gzF = (z + halfH) / TILE_SIZE;
      const gxI = Math.round(gxF);
      const gzI = Math.round(gzF);
      const gxC = Math.max(0, Math.min(GRID_WIDTH, gxI));
      const gzC = Math.max(0, Math.min(GRID_HEIGHT, gzI));

      const height = this.heightCache[gzC][gxC];
      pos.setY(i, height);

      // Determine zone colour
      const col = this.getVertexColor(gxC, gzC, height);
      colours[i * 3]     = col.r;
      colours[i * 3 + 1] = col.g;
      colours[i * 3 + 2] = col.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geo.computeVertexNormals();

    // Material
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    // Shift so grid (0,0) maps to world (0, height, 0)
    this.terrainMesh.position.set(halfW, 0, halfH);
    this.threeScene.add(this.terrainMesh);

    // Solid base block under the terrain — gives the island visual depth
    this.createIslandBase();

    // Water plane disabled — island floats in sky with clouds
    // this.createWaterPlane();

    // Lighting
    this.createLighting();

    // Grid-line overlay (hidden by default)
    this.createGridLines();

    // Hover highlight (hidden by default)
    this.createHighlightMesh();

    return this.terrainMesh;
  }

  /**
   * Toggle grid-line overlay visibility.
   * Typically shown when a build mode is active.
   */
  showGrid(visible: boolean): void {
    if (this.gridLines) {
      this.gridLines.visible = visible;
    }
  }

  /**
   * Show a translucent highlight quad at the given grid position.
   * The quad's 4 corners follow the terrain height for a snug fit.
   */
  showHoverHighlight(gx: number, gy: number): void {
    if (!this.highlightMesh) return;

    // Use real island surface height (baked from GLB raycast).
    const yOffset = 0.5;
    const h00 = this.getSurfaceHeightAt(gx, gy) + yOffset;
    const h10 = this.getSurfaceHeightAt(gx + 1, gy) + yOffset;
    const h01 = this.getSurfaceHeightAt(gx, gy + 1) + yOffset;
    const h11 = this.getSurfaceHeightAt(gx + 1, gy + 1) + yOffset;

    const x0 = gx * TILE_SIZE;
    const z0 = gy * TILE_SIZE;
    const x1 = (gx + 1) * TILE_SIZE;
    const z1 = (gy + 1) * TILE_SIZE;

    const pos = this.highlightMesh.geometry.attributes.position as THREE.BufferAttribute;
    // Vertex 0: top-left  (gx, gy)
    pos.setXYZ(0, x0, h00, z0);
    // Vertex 1: top-right (gx+1, gy)
    pos.setXYZ(1, x1, h10, z0);
    // Vertex 2: bottom-left (gx, gy+1)
    pos.setXYZ(2, x0, h01, z1);
    // Vertex 3: bottom-right (gx+1, gy+1)
    pos.setXYZ(3, x1, h11, z1);
    pos.needsUpdate = true;

    this.highlightMesh.visible = true;
  }

  /**
   * Hide the hover highlight.
   */
  hideHoverHighlight(): void {
    if (this.highlightMesh) {
      this.highlightMesh.visible = false;
    }
  }

  /**
   * Add billboard-sprite decorations (trees, rocks, mushrooms, etc.)
   * matching what CityMapRenderer.placeTerrainDecorations() does.
   */
  addDecorations(): void {
    if (!this.gameState) return;
    this.clearDecorations();

    const groundDecoKeys = [
      'DECO_FLOWER_1', 'DECO_ROCK_1', 'DECO_BUSH_1',
      'DECO_GRASS_TUFT', 'DECO_STONE_LARGE', 'DECO_MUSHROOM',
      'DECO_LOG', 'DECO_WILDFLOWER_2',
    ];
    const treeDecoKeys = ['ISO_TREE_SMALL', 'DECO_TREE_SMALL'];

    // Ensure all needed textures are in the instance cache
    const loader = new THREE.TextureLoader();
    const allKeys = [...groundDecoKeys, ...treeDecoKeys];
    for (const key of allKeys) {
      if (!this.textureCache.has(key)) {
        const path = `assets/sprites/final/${key}.png`;
        const tex = loader.load(path);
        tex.colorSpace = THREE.SRGBColorSpace;
        this.textureCache.set(key, tex);
      }
    }

    const rng = makeRng(42); // same seed as CityMapRenderer

    for (let gy = 0; gy < GRID_HEIGHT; gy++) {
      for (let gx = 0; gx < GRID_WIDTH; gx++) {
        const r1 = rng();
        const r2 = rng();
        const r3 = rng();
        const r4 = rng();
        const r5 = rng();
        const r6 = rng();
        const r7 = rng();

        // Skip occupied tiles
        if (this.gameState.grid[gy][gx] !== null) continue;

        const worldPos = this.gridToWorld(gx, gy);
        const baseX = worldPos.x + TILE_SIZE / 2 + (r3 - 0.5) * TILE_SIZE * 0.4;
        const baseZ = worldPos.z + TILE_SIZE / 2 + (r4 - 0.5) * TILE_SIZE * 0.4;
        const baseY = worldPos.y;

        // Dungeon zone: stones only
        if (isInDungeonZone(gx, gy)) {
          const stoneKeys = ['DECO_STONE_LARGE', 'DECO_LOG'];
          if (r1 > 0.45) continue;
          const sk = stoneKeys[Math.floor(r2 * stoneKeys.length)];
          const tex = this.textureCache.get(sk);
          if (!tex) continue;
          const scale = (0.5 + r5 * 0.4) * TILE_SIZE * 0.6;
          const opacity = 0.65 + r6 * 0.25;
          const mat = this.getOrCreateMaterial(sk, tex, opacity);
          const sprite = new THREE.Sprite(mat);
          sprite.scale.set(scale, scale, 1);
          sprite.position.set(baseX, baseY + scale * 0.5, baseZ);
          this.threeScene.add(sprite);
          this.decorations.push(sprite);
          continue;
        }

        // Swamp zone: mushrooms, logs, stones
        if (isInSwampZone(gx, gy)) {
          const swampKeys = ['DECO_MUSHROOM', 'DECO_LOG', 'DECO_STONE_LARGE'];
          if (r1 > 0.40) continue;
          const sk = swampKeys[Math.floor(r2 * swampKeys.length)];
          const tex = this.textureCache.get(sk);
          if (!tex) continue;
          const scale = (0.4 + r5 * 0.35) * TILE_SIZE * 0.55;
          const opacity = 0.55 + r6 * 0.30;
          const mat = this.getOrCreateMaterial(sk, tex, opacity);
          const sprite = new THREE.Sprite(mat);
          sprite.scale.set(scale, scale, 1);
          sprite.position.set(baseX, baseY + scale * 0.5, baseZ);
          this.threeScene.add(sprite);
          this.decorations.push(sprite);
          continue;
        }

        // Trees (rare)
        if (r7 < 0.05 && treeDecoKeys.length > 0) {
          const treeKey = treeDecoKeys[Math.floor(r2 * treeDecoKeys.length)];
          const tex = this.textureCache.get(treeKey);
          if (!tex) continue;
          const scale = (0.7 + r5 * 0.4) * TILE_SIZE;
          const opacity = 0.85 + r6 * 0.15;
          const mat = this.getOrCreateMaterial(treeKey, tex, opacity);
          const sprite = new THREE.Sprite(mat);
          sprite.scale.set(scale, scale * 1.4, 1);
          sprite.position.set(baseX, baseY + (scale * 1.4) * 0.5, baseZ);
          this.threeScene.add(sprite);
          this.decorations.push(sprite);
          continue;
        }

        // Ground decorations
        if (r1 > 0.30 || groundDecoKeys.length === 0) continue;
        const decoKey = groundDecoKeys[Math.floor(r2 * groundDecoKeys.length)];
        const tex = this.textureCache.get(decoKey);
        if (!tex) continue;
        const scale = (0.4 + r5 * 0.35) * TILE_SIZE * 0.5;
        const opacity = 0.70 + r6 * 0.30;
        const mat = this.getOrCreateMaterial(decoKey, tex, opacity);
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(scale, scale, 1);
        sprite.position.set(baseX, baseY + scale * 0.5, baseZ);
        this.threeScene.add(sprite);
        this.decorations.push(sprite);
      }
    }
  }

  /**
   * Convert grid coordinates to 3D world position.
   * Returns the top-left corner of the tile at terrain height.
   * Pass a reusable `target` vector to avoid GC pressure in hot loops.
   */
  gridToWorld(gx: number, gy: number, target?: THREE.Vector3): THREE.Vector3 {
    const v = target ?? new THREE.Vector3();
    const worldX = gx * TILE_SIZE;
    const worldZ = gy * TILE_SIZE;
    const height = this.getHeightAt(gx, gy);
    return v.set(worldX, height, worldZ);
  }

  /**
   * Get the terrain height at a grid position (raw heightmap for mesh).
   * Returns 0 if outside bounds or before terrain creation.
   */
  getHeightAt(gx: number, gy: number): number {
    if (this.heightCache.length === 0) return 0;
    const gz = Math.max(0, Math.min(Math.floor(gy), GRID_HEIGHT));
    const gxC = Math.max(0, Math.min(Math.floor(gx), GRID_WIDTH));
    const row = this.heightCache[gz];
    if (!row) return 0;
    return row[gxC] ?? 0;
  }

  /**
   * Get the REAL island surface height at a grid position (world-space Y).
   * Returns baked GLB surface height if available, otherwise falls back
   * to a scaled approximation of the terrain height.
   */
  getSurfaceHeightAt(gx: number, gy: number): number {
    if (this.surfaceHeightCache) {
      const gz = Math.max(0, Math.min(Math.floor(gy), GRID_HEIGHT));
      const gxC = Math.max(0, Math.min(Math.floor(gx), GRID_WIDTH));
      const row = this.surfaceHeightCache[gz];
      if (row && row[gxC] !== undefined) return row[gxC];
    }
    // Fallback: scaled approximation (pre-bake)
    return this.getHeightAt(gx, gy) * 0.12;
  }

  /**
   * Get average surface height across a building footprint.
   */
  getAverageSurfaceHeight(gx: number, gy: number, fw: number, fh: number): number {
    let sum = 0;
    let count = 0;
    for (let dy = 0; dy <= fh; dy++) {
      for (let dx = 0; dx <= fw; dx++) {
        sum += this.getSurfaceHeightAt(gx + dx, gy + dy);
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * Bake surface heights from the GLB island model.
   * Uses sparse sampling (every STEP tiles) + bilinear interpolation
   * to avoid freezing the browser with thousands of raycasts.
   * Call this AFTER the island GLB has been loaded and positioned.
   */
  bakeSurfaceHeights(): void {
    if (!this.islandVisualGLB) {
      console.warn('[TerrainRenderer3D] No island GLB — cannot bake surface heights');
      return;
    }

    const raycaster = new THREE.Raycaster();
    const downDir = new THREE.Vector3(0, -1, 0);
    const startY = 500;
    const STEP = 4; // sample every 4th tile → ~100 raycasts instead of ~1500
    const FALLBACK_Y = this.getHeightAt(0, 0) * 0.12;

    // Phase 1: Sparse raycast sampling
    const sparseGrid: (number | null)[][] = [];
    let hitCount = 0;

    for (let gz = 0; gz <= GRID_HEIGHT; gz += STEP) {
      if (!sparseGrid[gz]) sparseGrid[gz] = [];
      for (let gx = 0; gx <= GRID_WIDTH; gx += STEP) {
        const worldX = gx * TILE_SIZE;
        const worldZ = gz * TILE_SIZE;

        raycaster.set(new THREE.Vector3(worldX, startY, worldZ), downDir);
        const hits = raycaster.intersectObject(this.islandVisualGLB, true);

        if (hits.length > 0) {
          sparseGrid[gz][gx] = hits[0].point.y;
          hitCount++;
        } else {
          sparseGrid[gz][gx] = null; // off-island
        }
      }
    }

    console.log(`[TerrainRenderer3D] Sparse sample: ${hitCount} hits`);

    // If no hits at all, the GLB might not be suitable for raycasting
    if (hitCount === 0) {
      console.warn('[TerrainRenderer3D] No raycast hits on island GLB — surface bake failed');
      return;
    }

    // Phase 2: Bilinear interpolation to fill all grid vertices
    this.surfaceHeightCache = [];

    // Helper: get sparse sample (nearest available)
    const getSparse = (gx: number, gz: number): number | null => {
      // Snap to nearest sparse grid point
      const sx = Math.min(Math.round(gx / STEP) * STEP, Math.floor(GRID_WIDTH / STEP) * STEP);
      const sz = Math.min(Math.round(gz / STEP) * STEP, Math.floor(GRID_HEIGHT / STEP) * STEP);
      return sparseGrid[sz]?.[sx] ?? null;
    };

    // Bilinear interpolation between sparse samples
    const bilinear = (gx: number, gz: number): number => {
      const x0 = Math.floor(gx / STEP) * STEP;
      const x1 = Math.min(x0 + STEP, Math.floor(GRID_WIDTH / STEP) * STEP);
      const z0 = Math.floor(gz / STEP) * STEP;
      const z1 = Math.min(z0 + STEP, Math.floor(GRID_HEIGHT / STEP) * STEP);

      const h00 = sparseGrid[z0]?.[x0];
      const h10 = sparseGrid[z0]?.[x1];
      const h01 = sparseGrid[z1]?.[x0];
      const h11 = sparseGrid[z1]?.[x1];

      // If any corner is null (off-island), use nearest valid or fallback
      const values = [h00, h10, h01, h11].filter((v): v is number => v !== null);
      if (values.length === 0) return FALLBACK_Y;
      if (values.length < 4) {
        // Not all corners valid — use average of available
        return values.reduce((a, b) => a + b, 0) / values.length;
      }

      // Full bilinear interpolation
      const tx = x1 > x0 ? (gx - x0) / (x1 - x0) : 0;
      const tz = z1 > z0 ? (gz - z0) / (z1 - z0) : 0;
      const top = h00! * (1 - tx) + h10! * tx;
      const bot = h01! * (1 - tx) + h11! * tx;
      return top * (1 - tz) + bot * tz;
    };

    for (let gz = 0; gz <= GRID_HEIGHT; gz++) {
      this.surfaceHeightCache[gz] = [];
      for (let gx = 0; gx <= GRID_WIDTH; gx++) {
        this.surfaceHeightCache[gz][gx] = bilinear(gx, gz);
      }
    }

    console.log(`[TerrainRenderer3D] Surface bake complete: ${(GRID_WIDTH + 1) * (GRID_HEIGHT + 1)} cells interpolated from ${hitCount} samples`);
  }

  /**
   * Return the terrain mesh (for raycasting / grid picking).
   * Returns null if createTerrain() has not been called yet.
   */
  getTerrainMesh(): THREE.Mesh | null {
    return this.terrainMesh;
  }

  /**
   * Get the terrain mesh's world-space Y offset.
   */
  getTerrainWorldOffsetY(): number {
    return this.terrainMesh?.position.y ?? 0;
  }

  /**
   * Show or hide the procedural terrain visuals (mesh + base) while keeping
   * all gameplay/raycast data active.
   */
  setProceduralVisualsVisible(visible: boolean): void {
    this.setTerrainSurfaceVisible(visible);
    this.setIslandBaseVisible(visible);
  }

  /** Show or hide only the top terrain surface mesh. */
  setTerrainSurfaceVisible(visible: boolean): void {
    if (!this.terrainMesh) return;

    const terrainMaterial = this.terrainMesh.material;
    const terrainMaterials = Array.isArray(terrainMaterial) ? terrainMaterial : [terrainMaterial];
    for (const material of terrainMaterials) {
      material.transparent = true;
      material.opacity = visible ? 1 : 0;
      material.depthWrite = visible;
    }
  }

  /** Show or hide only the solid island base block under the terrain. */
  setIslandBaseVisible(visible: boolean): void {
    if (this.islandBaseMesh) {
      this.islandBaseMesh.visible = visible;
    }
  }

  /** Move island GLB vertically for fine tuning during alignment. */
  nudgeIslandVisualY(deltaY: number): void {
    if (!this.islandVisualGLB) return;
    this.islandVisualGLB.position.y += deltaY;
  }


  /**
   * Replace the procedural island visuals with a GLB model while keeping
   * the terrain mesh active for height sampling and raycasting.
   */
  async replaceVisualIslandWithGLB(path: string, options?: {
    hideProceduralTerrainVisuals?: boolean;
    verticalOffset?: number;
  }): Promise<void> {
    if (!this.terrainMesh) return;

    const hideProcedural = options?.hideProceduralTerrainVisuals ?? true;
    const verticalOffset = options?.verticalOffset ?? 0;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    const gltf = await new Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>((resolve, reject) => {
      loader.load(path, resolve, undefined, reject);
    });

    if (this.islandVisualGLB) {
      this.threeScene.remove(this.islandVisualGLB);
      this.islandVisualGLB = null;
    }

    const root = gltf.scene;
    root.name = 'island-visual-glb';
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Scale the model to map width/depth and align its top to the
    // highest terrain surface height so buildings/grid match the island.
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxXZ = Math.max(size.x, size.z);
    if (maxXZ <= 0) {
      throw new Error('Island GLB has invalid dimensions.');
    }

    const targetSize = Math.max(WORLD_W, WORLD_H);
    const scale = targetSize / maxXZ;
    root.scale.multiplyScalar(scale);

    box.setFromObject(root);
    const center = new THREE.Vector3();
    box.getCenter(center);

    let maxTerrainY = 0;
    for (const row of this.heightCache) {
      if (!row) continue;
      for (const h of row) {
        if (h > maxTerrainY) maxTerrainY = h;
      }
    }

    root.position.x += WORLD_W / 2 - center.x;
    root.position.z += WORLD_H / 2 - center.z;
    root.position.y += maxTerrainY + verticalOffset - box.max.y;

    if (hideProcedural) {
      this.setTerrainSurfaceVisible(false);
      this.setIslandBaseVisible(false);
    } else {
      // Keep surface as alignment helper, but do not force base visibility.
      this.setTerrainSurfaceVisible(true);
    }

    this.threeScene.add(root);
    this.islandVisualGLB = root;
  }

  /**
   * Release all GPU resources.
   */
  dispose(): void {
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
      this.threeScene.remove(this.terrainMesh);
      this.terrainMesh = null;
    }
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      (this.waterMesh.material as THREE.Material).dispose();
      this.threeScene.remove(this.waterMesh);
      this.waterMesh = null;
    }
    if (this.islandBaseMesh) {
      this.islandBaseMesh.geometry.dispose();
      (this.islandBaseMesh.material as THREE.Material).dispose();
      this.threeScene.remove(this.islandBaseMesh);
      this.islandBaseMesh = null;
    }
    if (this.islandVisualGLB) {
      this.threeScene.remove(this.islandVisualGLB);
      this.islandVisualGLB = null;
    }
    if (this.gridLines) {
      this.gridLines.geometry.dispose();
      (this.gridLines.material as THREE.Material).dispose();
      this.threeScene.remove(this.gridLines);
      this.gridLines = null;
    }
    if (this.highlightMesh) {
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.threeScene.remove(this.highlightMesh);
      this.highlightMesh = null;
    }
    // Remove decoration sprites from the scene (materials/textures cleaned below)
    this.clearDecorations();

    // Dispose all cached materials
    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
    this.materialCache.clear();

    // Dispose all cached textures
    for (const tex of this.textureCache.values()) {
      tex.dispose();
    }
    this.textureCache.clear();

    if (this.hemisphereLight) {
      this.threeScene.remove(this.hemisphereLight);
      this.hemisphereLight = null;
    }
    if (this.sunLight) {
      this.threeScene.remove(this.sunLight.target);
      this.threeScene.remove(this.sunLight);
      this.sunLight = null;
    }
    if (this.undersideFillLight) {
      this.threeScene.remove(this.undersideFillLight.target);
      this.threeScene.remove(this.undersideFillLight);
      this.undersideFillLight = null;
    }
    if (this.undersideFillLightBack) {
      this.threeScene.remove(this.undersideFillLightBack.target);
      this.threeScene.remove(this.undersideFillLightBack);
      this.undersideFillLightBack = null;
    }
    for (const light of this.undersideRingLights) {
      this.threeScene.remove(light);
    }
    this.undersideRingLights = [];
  }

  // ─── Private Methods ─────────────────────────────────────────

  /**
   * Compute terrain height at a grid vertex.
   * Island shape: dome in the centre, falloff to edges, dip for dungeon.
   */
  private computeHeight(_gxIdx: number, _gzIdx: number): number {
    // Flat terrain plane — the visible island is the GLB model, this mesh
    // is only used for raycasting (grid picking) and height queries.
    // A flat surface ensures accurate grid coordinate calculation from any
    // camera angle (no parallax from dome curvature) and consistent
    // building placement height across the entire island.
    return PEAK_Y;
  }

  /**
   * Determine the vertex colour for a grid position based on zone type.
   * Matches the colours used in CityMapRenderer.drawGrid().
   */
  private getVertexColor(gx: number, gz: number, height: number): THREE.Color {
    // Below or at water level → blue-ish water tint (for shore blend)
    if (height <= WATER_Y + 2) {
      return colorFromHex(UI_COLORS.WATER_BLUE);
    }

    // Shore/sand band
    if (height <= WATER_Y + 5) {
      return colorFromHex(SAND_COLOR);
    }

    // Clamp to valid grid range for zone checks
    const tgx = Math.min(gx, GRID_WIDTH - 1);
    const tgz = Math.min(gz, GRID_HEIGHT - 1);

    // Dungeon zone
    if (isInDungeonZone(tgx, tgz)) {
      const hash = tileHash(tgx, tgz) % 4;
      return colorFromHex(DUNGEON_ROCK_COLORS[hash]);
    }

    // Swamp zone
    if (isInSwampZone(tgx, tgz)) {
      const hash = tileHash(tgx, tgz) % 4;
      return colorFromHex(SWAMP_COLORS[hash]);
    }

    // Check gameState for swamp tiles (hand-painted from terrain editor)
    if (this.gameState?.swampTiles) {
      const key = `${tgx},${tgz}`;
      if (key in this.gameState.swampTiles) {
        const variant = this.gameState.swampTiles[key];
        return colorFromHex(SWAMP_COLORS[Math.min(variant, SWAMP_COLORS.length - 1)]);
      }
    }

    // Normal terrain: use grass colours for a natural look
    const hash = tileHash(tgx, tgz) % 4;
    return colorFromHex(GRASS_COLORS[hash]);
  }

  /**
   * Create a translucent water plane surrounding the island.
   */
  /**
   * Create a solid box under the terrain to give the island visual depth.
   * Same width/depth as the map, tall enough to be visible from the side.
   * Top edge sits at Y=0 (terrain base level), giving a cliff/earth look.
   */
  private createIslandBase(): void {
    const baseHeight = WORLD_W * 0.17; // ~220 units tall — half height
    const geo = new THREE.BoxGeometry(WORLD_W, baseHeight, WORLD_H);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xC8C0B8, // helles Grau-Weiß — Fels/Kalkstein-Look
      roughness: 0.9,
      metalness: 0.0,
    });
    const base = new THREE.Mesh(geo, mat);
    base.receiveShadow = true;
    // Top edge at Y=0, so it connects seamlessly to the terrain above
    base.position.set(WORLD_W / 2, -baseHeight / 2, WORLD_H / 2);
    this.threeScene.add(base);
    this.islandBaseMesh = base;
  }

  private createWaterPlane(): void {
    const waterGeo = new THREE.PlaneGeometry(WORLD_W * 2, WORLD_H * 2);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a5276,
      transparent: true,
      opacity: 0.65,
      roughness: 0.15,
      metalness: 0.1,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(WORLD_W / 2, WATER_Y, WORLD_H / 2);
    this.threeScene.add(this.waterMesh);
  }

  /**
   * Add hemisphere + directional lighting with shadows to the scene.
   */
  private createLighting(): void {
    // HemisphereLight: strong fill to brighten shadow areas
    this.hemisphereLight = new THREE.HemisphereLight(0xa9d7ff, 0x87a79d, 0.85);
    this.threeScene.add(this.hemisphereLight);

    // DirectionalLight: warm sunset tone, from above-left (schräg oben)
    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.sunLight.position.set(WORLD_W * 0.3, 800, -WORLD_H * 0.2);
    this.sunLight.target.position.set(WORLD_W / 2, 0, WORLD_H / 2);

    // Shadows
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.left = -WORLD_W / 2;
    this.sunLight.shadow.camera.right = WORLD_W / 2;
    this.sunLight.shadow.camera.top = WORLD_H / 2;
    this.sunLight.shadow.camera.bottom = -WORLD_H / 2;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 2600;
    this.sunLight.shadow.bias = -0.00035;
    this.sunLight.shadow.normalBias = 0.015;
    this.sunLight.shadow.intensity = 0.68;

    this.threeScene.add(this.sunLight);
    this.threeScene.add(this.sunLight.target);

    // Soft underside fill so the floating island bottom keeps visible detail.
    this.undersideFillLight = new THREE.DirectionalLight(0xa7cdf1, 1.8);
    this.undersideFillLight.position.set(WORLD_W / 2, -260, WORLD_H * 1.05);
    this.undersideFillLight.target.position.set(WORLD_W / 2, -80, WORLD_H / 2);
    this.undersideFillLight.castShadow = false;
    this.threeScene.add(this.undersideFillLight);
    this.threeScene.add(this.undersideFillLight.target);

    // Opposite-side fill so the far underside does not collapse to black.
    this.undersideFillLightBack = new THREE.DirectionalLight(0x9fc7eb, 1.4);
    this.undersideFillLightBack.position.set(WORLD_W / 2, -220, -WORLD_H * 0.35);
    this.undersideFillLightBack.target.position.set(WORLD_W / 2, -120, WORLD_H / 2);
    this.undersideFillLightBack.castShadow = false;
    this.threeScene.add(this.undersideFillLightBack);
    this.threeScene.add(this.undersideFillLightBack.target);

    // Four warm point-lights around the island underside for a cinematic rim fill.
    const warmColor = 0xffc38a;
    const radius = Math.max(WORLD_W, WORLD_H) * 0.62;
    const y = -230;
    const points: Array<[number, number]> = [
      [Math.cos(0) * radius, Math.sin(0) * radius],
      [Math.cos(Math.PI * 0.5) * radius, Math.sin(Math.PI * 0.5) * radius],
      [Math.cos(Math.PI) * radius, Math.sin(Math.PI) * radius],
      [Math.cos(Math.PI * 1.5) * radius, Math.sin(Math.PI * 1.5) * radius],
    ];

    for (const [dx, dz] of points) {
      const light = new THREE.PointLight(warmColor, 2.9, 2400, 2);
      light.position.set(WORLD_W / 2 + dx, y, WORLD_H / 2 + dz);
      light.castShadow = false;
      this.threeScene.add(light);
      this.undersideRingLights.push(light);
    }
  }

  /**
   * Create grid-line overlay as LineSegments.
   * Lines follow the terrain surface (Y from heightmap).
   */
  private createGridLines(): void {
    const points: number[] = [];
    const gridColor = new THREE.Color(UI_COLORS.GRID_LINE);

    // Vertical lines (constant gx, varying gy)
    for (let gx = 0; gx <= GRID_WIDTH; gx++) {
      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        const h0 = this.getHeightAt(gx, gy);
        const h1 = this.getHeightAt(gx, gy + 1);
        points.push(gx * TILE_SIZE, h0 + 0.3, gy * TILE_SIZE);
        points.push(gx * TILE_SIZE, h1 + 0.3, (gy + 1) * TILE_SIZE);
      }
    }

    // Horizontal lines (constant gy, varying gx)
    for (let gy = 0; gy <= GRID_HEIGHT; gy++) {
      for (let gx = 0; gx < GRID_WIDTH; gx++) {
        const h0 = this.getHeightAt(gx, gy);
        const h1 = this.getHeightAt(gx + 1, gy);
        points.push(gx * TILE_SIZE, h0 + 0.3, gy * TILE_SIZE);
        points.push((gx + 1) * TILE_SIZE, h1 + 0.3, gy * TILE_SIZE);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

    const mat = new THREE.LineBasicMaterial({
      color: gridColor,
      transparent: true,
      opacity: 0.25,
    });

    this.gridLines = new THREE.LineSegments(geo, mat);
    this.gridLines.visible = false; // hidden by default
    this.threeScene.add(this.gridLines);
  }

  /**
   * Create the hover-highlight mesh (a terrain-following quad).
   * Uses a raw BufferGeometry with 4 vertices whose positions are
   * updated in-place by showHoverHighlight() — zero allocations per frame.
   */
  private createHighlightMesh(): void {
    const geo = new THREE.BufferGeometry();
    // 4 vertices, initialised to origin — will be set by showHoverHighlight()
    const vertices = new Float32Array(4 * 3); // 4 verts × 3 components
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    // Two triangles: (0,1,2) and (2,1,3)
    geo.setIndex([0, 1, 2, 2, 1, 3]);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.highlightMesh = new THREE.Mesh(geo, mat);
    this.highlightMesh.visible = false;
    this.threeScene.add(this.highlightMesh);
  }

  /**
   * Get or create a shared SpriteMaterial for the given texture key and opacity.
   * Materials are cached so sprites with the same texture+opacity share one instance.
   */
  private getOrCreateMaterial(textureKey: string, texture: THREE.Texture, opacity: number): THREE.SpriteMaterial {
    // Quantise opacity to 2 decimal places to avoid near-duplicate materials
    const q = Math.round(opacity * 100);
    const cacheKey = `${textureKey}_${q}`;
    let mat = this.materialCache.get(cacheKey);
    if (!mat) {
      mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity });
      this.materialCache.set(cacheKey, mat);
    }
    return mat;
  }

  /**
   * Remove all decoration sprites from the scene.
   * Does NOT dispose textures or materials — those are shared via caches
   * and cleaned up centrally in dispose().
   */
  private clearDecorations(): void {
    for (const sprite of this.decorations) {
      this.threeScene.remove(sprite);
    }
    this.decorations = [];
  }
}
