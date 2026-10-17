// ============================================================
// BuildingRenderer3D.ts — Central Building Renderer (Three.js)
// ============================================================
// Renders ALL buildings as coloured 3D boxes (placeholder) with
// optional GLB model replacement, roads as flat terrain quads,
// ghost preview for build mode, and per-building click picking.
// ============================================================

import * as THREE from 'three';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, UI_COLORS } from './Colors';
import { TerrainRenderer3D } from './TerrainRenderer3D';
import { GLBModelLoader } from './GLBModelLoader';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { BUILDING_DEFS } from '../data/buildings';

// ─── Category → colour mapping ─────────────────────────────
const CATEGORY_COLORS: Record<string, number> = {
  producer:       0x4CAF50, // green
  refine:         0xFF9800, // orange
  utility:        0x2196F3, // blue
  storage:        0x9C27B0, // purple
  housing:        0xFFEB3B, // yellow
  hub:            0xF44336, // red
  infrastructure: 0x795548, // brown
};

// Road tile colours (pseudo-random per tile, matching CityBuildingRenderer)
const ROAD_COLORS = [0x7A7060, 0x706858, 0x6A6050];

// ─── Per-building tracking info ─────────────────────────────
interface BuildingEntry {
  buildingId: number;
  typeId: string;
  gx: number;
  gy: number;
  /** The placeholder box mesh (hidden when GLB is active) */
  boxMesh: THREE.Mesh;
  /** True if this building has a GLB model placed */
  usesInstancing: boolean;
  /** The placed GLB clone, if any */
  glbClone?: THREE.Object3D;
}

// ─── BuildingRenderer3D ─────────────────────────────────────

export class BuildingRenderer3D {
  private threeScene: THREE.Scene;
  private terrain: TerrainRenderer3D;
  private glbLoader: GLBModelLoader | null = null;

  /** All building meshes live in this group (for raycaster picking) */
  private buildingGroup: THREE.Group;

  /** buildingId → entry */
  private buildings = new Map<number, BuildingEntry>();

  /** Mesh UUID → buildingId (for reverse-lookup on raycaster hits) */
  private meshToBuildingId = new Map<string, number>();

  // Ghost preview state
  private ghostMesh: THREE.Mesh | null = null;
  private ghostFootprintMeshes: THREE.Mesh[] = [];
  private ghostGx = -1;
  private ghostGy = -1;
  private ghostTypeId = '';
  private ghostValid = true;

  // Demolish highlight state
  private demolishHighlightMeshes: THREE.Mesh[] = [];

  // Road meshes
  private roadGroup: THREE.Group;

  constructor(scene: THREE.Scene, terrainRenderer: TerrainRenderer3D) {
    this.threeScene = scene;
    this.terrain = terrainRenderer;

    this.buildingGroup = new THREE.Group();
    this.buildingGroup.name = 'buildings-3d';
    this.threeScene.add(this.buildingGroup);

    this.roadGroup = new THREE.Group();
    this.roadGroup.name = 'roads-3d';
    this.threeScene.add(this.roadGroup);
  }

  // ─── Public API ────────────────────────────────────────────

  /**
   * Render (or re-render) all buildings from the full game state.
   * Clears existing buildings first.
   */
  renderAllBuildings(gameState: GameState): void {
    this.clearAllBuildings();

    for (const building of gameState.buildings) {
      if (building.typeId === 'ROAD') continue;
      this.addBuilding(building);
    }
  }

  /**
   * Add a single building to the 3D scene.
   */
  addBuilding(building: BuildingInstance): void {
    // Remove existing entry for this id if present
    this.removeBuilding(building.id);

    const def = BUILDING_DEFS[building.typeId];
    if (!def) return;

    const [fw, fh] = def.footprint;

    // Box dimensions
    const cubeW = fw * TILE_SIZE;
    const cubeD = fh * TILE_SIZE;
    const cubeH = Math.max(fw, fh) * TILE_SIZE * 0.8;

    // Special buildings get extra height
    const isBig = building.typeId === 'DUNGEON_CAMP' || building.typeId === 'GUILD_HALL';
    const finalH = isBig ? cubeH * 1.5 : cubeH;

    // Geometry + material
    const geo = new THREE.BoxGeometry(cubeW, finalH, cubeD);
    const color = CATEGORY_COLORS[def.category] ?? 0x888888;
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
    });

    // Construction sites are semi-transparent
    if (!building.built) {
      mat.transparent = true;
      mat.opacity = 0.55;
    }

    const boxMesh = new THREE.Mesh(geo, mat);
    boxMesh.name = `building-${building.typeId}-${building.x}-${building.y}`;
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    boxMesh.visible = false; // hidden by default — GLB models replace them

    // Position: centre of footprint, bottom edge on real island surface
    const centerX = (building.x + fw / 2) * TILE_SIZE;
    const centerZ = (building.y + fh / 2) * TILE_SIZE;
    const surfaceY = this.terrain.getAverageSurfaceHeight(building.x, building.y, fw, fh);
    boxMesh.position.set(centerX, surfaceY + finalH / 2, centerZ);

    this.buildingGroup.add(boxMesh);

    // Track
    const entry: BuildingEntry = {
      buildingId: building.id,
      typeId: building.typeId,
      gx: building.x,
      gy: building.y,
      boxMesh,
      usesInstancing: false,
    };
    this.buildings.set(building.id, entry);
    this.meshToBuildingId.set(boxMesh.uuid, building.id);

    // Try to place via InstancedMesh or legacy GLB clone
    this.tryPlaceGLB(entry, building.x, building.y, fw, fh, surfaceY);
  }

  /**
   * Remove a building by its ID.
   */
  removeBuilding(buildingId: number): void {
    const entry = this.buildings.get(buildingId);
    if (!entry) return;

    // Remove box mesh
    this.buildingGroup.remove(entry.boxMesh);
    entry.boxMesh.geometry.dispose();
    (entry.boxMesh.material as THREE.Material).dispose();
    this.meshToBuildingId.delete(entry.boxMesh.uuid);

    // Remove GLB clone if present
    if (entry.glbClone) {
      this.buildingGroup.remove(entry.glbClone);
      if (this.glbLoader) this.glbLoader.removeModel(entry.glbClone);
    }

    this.buildings.delete(buildingId);
  }

  // ─── Roads ─────────────────────────────────────────────────

  /**
   * Render all road tiles from game state.
   * Currently a no-op in 3D mode — the flat road quads from the 2D system
   * don't make sense on the 3D island. Road GLB models can be added later.
   */
  renderRoads(_gameState: GameState): void {
    this.clearRoads();
    // TODO: Replace with 3D road models when available
  }

  // ─── Per-frame update (no-op for 3D boxes, kept for API compat) ──

  /**
   * Per-frame update. No-op for 3D boxes (billboard rotation was only
   * needed for the old sprite-plane approach). Kept for caller compat.
   */
  update(_camera: THREE.Camera): void {
    // Intentionally empty — 3D boxes don't need billboard rotation.
  }

  /** Show or hide all building and road placeholder meshes. */
  setSceneVisualsVisible(visible: boolean): void {
    this.buildingGroup.visible = visible;
    this.roadGroup.visible = visible;
  }

  // ─── Ghost Preview ─────────────────────────────────────────

  /**
   * Show a semi-transparent wireframe box where a building would be placed.
   * Green wireframe = valid, red wireframe = invalid.
   */
  showGhost(typeId: string, gx: number, gy: number, valid: boolean): void {
    // Skip if unchanged
    if (gx === this.ghostGx && gy === this.ghostGy
        && typeId === this.ghostTypeId && valid === this.ghostValid) {
      return;
    }

    this.hideGhost();
    this.ghostGx = gx;
    this.ghostGy = gy;
    this.ghostTypeId = typeId;
    this.ghostValid = valid;

    const def = BUILDING_DEFS[typeId];
    if (!def) return;

    const [fw, fh] = def.footprint;

    // Box dimensions (same formula as addBuilding)
    const cubeW = fw * TILE_SIZE;
    const cubeD = fh * TILE_SIZE;
    const cubeH = Math.max(fw, fh) * TILE_SIZE * 0.8;
    const isBig = typeId === 'DUNGEON_CAMP' || typeId === 'GUILD_HALL';
    const finalH = isBig ? cubeH * 1.5 : cubeH;

    // Wireframe material
    const wireColor = valid ? 0x44FF44 : 0xFF4444;
    const mat = new THREE.MeshBasicMaterial({
      color: wireColor,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    const geo = new THREE.BoxGeometry(cubeW, finalH, cubeD);
    this.ghostMesh = new THREE.Mesh(geo, mat);
    this.ghostMesh.name = 'ghost-preview';

    // Position ghost on the real island surface (baked from GLB raycast).
    const centerX = (gx + fw / 2) * TILE_SIZE;
    const centerZ = (gy + fh / 2) * TILE_SIZE;
    const surfaceY = this.terrain.getAverageSurfaceHeight(gx, gy, fw, fh);
    this.ghostMesh.position.set(centerX, surfaceY + finalH / 2, centerZ);
    this.ghostMesh.renderOrder = 9000;
    this.threeScene.add(this.ghostMesh);

    // Footprint highlight quads
    const highlightColor = valid ? UI_COLORS.BUILD_VALID : UI_COLORS.BUILD_INVALID;
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const tileH = this.terrain.getSurfaceHeightAt(gx + dx, gy + dy);
        const quad = this.createTerrainQuad(gx + dx, gy + dy, highlightColor, 0.3, tileH + 0.5);
        quad.renderOrder = 9001;
        this.ghostFootprintMeshes.push(quad);
        this.threeScene.add(quad);
      }
    }
  }

  /**
   * Hide the ghost preview.
   */
  hideGhost(): void {
    if (this.ghostMesh) {
      this.threeScene.remove(this.ghostMesh);
      this.ghostMesh.geometry.dispose();
      (this.ghostMesh.material as THREE.Material).dispose();
      this.ghostMesh = null;
    }
    for (const mesh of this.ghostFootprintMeshes) {
      this.threeScene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.ghostFootprintMeshes = [];
    this.ghostGx = -1;
    this.ghostGy = -1;
    this.ghostTypeId = '';
  }

  /** Alias for backward compatibility with callers using the old API. */
  showGhostPreview(gx: number, gy: number, typeId: string, valid: boolean): void {
    this.showGhost(typeId, gx, gy, valid);
  }

  /** Alias for backward compatibility with callers using the old API. */
  hideGhostPreview(): void {
    this.hideGhost();
  }

  // ─── Demolish Highlight (3D) ──────────────────────────────

  /**
   * Show a red highlight over the building at the given grid cell.
   * Used by ThreeGridPicker in demolish mode.
   */
  showDemolishHighlight(gx: number, gy: number, gameState: GameState): void {
    // Find building at this grid position
    const building = gameState.buildings.find(b => {
      const def = BUILDING_DEFS[b.typeId];
      if (!def) return false;
      const [fw, fh] = def.footprint;
      return gx >= b.x && gx < b.x + fw && gy >= b.y && gy < b.y + fh;
    });

    if (!building) {
      this.hideDemolishHighlight();
      return;
    }

    // If already highlighting the same building, skip
    if (
      this.demolishHighlightMeshes.length > 0 &&
      this.demolishHighlightMeshes[0].userData['buildingId'] === building.id
    ) {
      return;
    }

    this.hideDemolishHighlight();

    const def = BUILDING_DEFS[building.typeId];
    const [fw, fh] = def.footprint;

    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const tileH = this.terrain.getSurfaceHeightAt(building.x + dx, building.y + dy);
        const quad = this.createTerrainQuad(
          building.x + dx, building.y + dy,
          UI_COLORS.BUILD_INVALID, 0.35, tileH + 0.6,
        );
        quad.renderOrder = 9001;
        quad.userData['buildingId'] = building.id;
        this.demolishHighlightMeshes.push(quad);
        this.threeScene.add(quad);
      }
    }
  }

  /** Remove the demolish highlight. */
  hideDemolishHighlight(): void {
    for (const mesh of this.demolishHighlightMeshes) {
      this.threeScene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.demolishHighlightMeshes = [];
  }

  // ─── Raycaster / Picking ───────────────────────────────────

  /**
   * Returns the THREE.Group that contains all building meshes.
   * Pass `group.children` to a Raycaster to detect clicks on buildings.
   */
  getBuildingGroup(): THREE.Group {
    return this.buildingGroup;
  }

  /**
   * Given a mesh hit by a raycaster, returns the building info or null.
   * Walks up the parent chain to handle GLB model sub-meshes.
   */
  getBuildingAtMesh(mesh: THREE.Object3D): { buildingId: number; typeId: string } | null {
    // Direct box mesh hit
    const directId = this.meshToBuildingId.get(mesh.uuid);
    if (directId !== undefined) {
      const entry = this.buildings.get(directId);
      if (entry) return { buildingId: entry.buildingId, typeId: entry.typeId };
    }

    // Walk up parent chain for GLB sub-meshes
    let current: THREE.Object3D | null = mesh;
    while (current) {
      if (current.parent === this.buildingGroup) {
        // This is a direct child of the building group — find which entry owns it
        for (const entry of this.buildings.values()) {
          if (entry.boxMesh === current) {
            return { buildingId: entry.buildingId, typeId: entry.typeId };
          }
        }
      }
      current = current.parent;
    }

    return null;
  }

  // ─── GLB Model Support ─────────────────────────────────────

  /**
   * Set the GLB model loader. Once set, buildings with available GLB
   * models will automatically swap their placeholder boxes for the model.
   */
  setGLBLoader(loader: GLBModelLoader): void {
    this.glbLoader = loader;

    // Re-check all existing buildings for available GLB models
    for (const entry of this.buildings.values()) {
      if (entry.usesInstancing) continue;
      const def = BUILDING_DEFS[entry.typeId];
      if (!def) continue;
      const [fw, fh] = def.footprint;
      const surfaceY = this.terrain.getAverageSurfaceHeight(entry.gx, entry.gy, fw, fh);
      this.tryPlaceGLB(entry, entry.gx, entry.gy, fw, fh, surfaceY);
    }
  }

  /**
   * Called after a GLB model has been loaded externally.
   * Scans all buildings of the given typeId and replaces their
   * placeholder box with the GLB model.
   */
  replaceWithGLB(typeId: string): void {
    if (!this.glbLoader) return;
    for (const entry of this.buildings.values()) {
      if (entry.typeId !== typeId || entry.usesInstancing) continue;
      const def = BUILDING_DEFS[typeId];
      if (!def) continue;
      const [fw, fh] = def.footprint;
      const surfaceY = this.terrain.getAverageSurfaceHeight(entry.gx, entry.gy, fw, fh);
      this.tryPlaceGLB(entry, entry.gx, entry.gy, fw, fh, surfaceY);
    }
  }

  // ─── Dispose ───────────────────────────────────────────────

  /**
   * Release all GPU resources.
   */
  dispose(): void {
    this.clearAllBuildings();
    this.hideGhost();
    this.clearRoads();

    this.threeScene.remove(this.buildingGroup);
    this.threeScene.remove(this.roadGroup);
  }

  // ─── Private Helpers ───────────────────────────────────────

  /**
   * Attempt to place a GLB model for a building entry.
   * If the model key is loaded in the GLBModelLoader, the box becomes
   * invisible and the GLB instance is added to the building group.
   */
  private tryPlaceGLB(
    entry: BuildingEntry,
    gx: number, gy: number,
    fw: number, fh: number,
    terrainY: number,
  ): void {
    if (!this.glbLoader) return;

    const glbKey = entry.typeId;
    if (!this.glbLoader.hasModel(glbKey)) return;

    // Clone-based placement (placeModel adds it to the scene root)
    const placed = this.glbLoader.placeModel(glbKey, gx, gy, terrainY);
    if (!placed) return;

    // Scale the GLB to cover the full footprint
    const box = new THREE.Box3().setFromObject(placed);
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetW = fw * TILE_SIZE;
    const targetD = fh * TILE_SIZE;
    if (size.x > 0 && size.z > 0) {
      const scaleX = targetW / size.x;
      const scaleZ = targetD / size.z;
      const uniformScale = Math.min(scaleX, scaleZ);
      placed.scale.multiplyScalar(uniformScale);
    }

    // Reposition after rescale: centre on footprint, bottom flush with
    // the island surface. The terrain mesh is flat (constant PEAK_Y),
    // so all buildings get a uniform base height across the entire island.
    const centerX = (gx + fw / 2) * TILE_SIZE;
    const centerZ = (gy + fh / 2) * TILE_SIZE;
    const rescaledBox = new THREE.Box3().setFromObject(placed);
    const bottomY = rescaledBox.min.y;
    placed.position.set(centerX, terrainY - bottomY, centerZ);

    // Enable shadows on all sub-meshes
    placed.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Hide the placeholder box
    entry.boxMesh.visible = false;
    entry.usesInstancing = true;
    entry.glbClone = placed;

    // Move from scene root into building group
    this.threeScene.remove(placed);
    this.buildingGroup.add(placed);
  }

  /**
   * Remove all building meshes from the scene.
   */
  private clearAllBuildings(): void {
    for (const entry of this.buildings.values()) {
      this.buildingGroup.remove(entry.boxMesh);
      entry.boxMesh.geometry.dispose();
      (entry.boxMesh.material as THREE.Material).dispose();

      if (entry.glbClone) {
        this.buildingGroup.remove(entry.glbClone);
        if (this.glbLoader) this.glbLoader.removeModel(entry.glbClone);
      }
    }
    this.buildings.clear();
    this.meshToBuildingId.clear();
  }

  /**
   * Remove all road meshes.
   */
  private clearRoads(): void {
    while (this.roadGroup.children.length > 0) {
      const mesh = this.roadGroup.children[0] as THREE.Mesh;
      this.roadGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }

  /**
   * Compute average terrain height across a building footprint.
   * Samples all corner vertices of the footprint tiles.
   */
  private getAverageFootprintHeight(gx: number, gy: number, fw: number, fh: number): number {
    let sum = 0;
    let count = 0;
    for (let dy = 0; dy <= fh; dy++) {
      for (let dx = 0; dx <= fw; dx++) {
        sum += this.terrain.getHeightAt(gx + dx, gy + dy);
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * Create a flat quad at a grid position on the island surface.
   * Used for roads and footprint highlights.
   * Uses a fixed Y instead of the heightmap because the visible surface
   * is the island GLB model, not the procedural terrain mesh.
   */
  private createTerrainQuad(
    gx: number,
    gy: number,
    color: number,
    opacity: number,
    yOffset: number = 0.8,
  ): THREE.Mesh {
    const h00 = yOffset;
    const h10 = yOffset;
    const h01 = yOffset;
    const h11 = yOffset;

    const x0 = gx * TILE_SIZE;
    const z0 = gy * TILE_SIZE;
    const x1 = (gx + 1) * TILE_SIZE;
    const z1 = (gy + 1) * TILE_SIZE;

    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      x0, h00, z0,  // 0: top-left
      x1, h10, z0,  // 1: top-right
      x0, h01, z1,  // 2: bottom-left
      x1, h11, z1,  // 3: bottom-right
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex([0, 1, 2, 2, 1, 3]);
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    return new THREE.Mesh(geo, mat);
  }
}
