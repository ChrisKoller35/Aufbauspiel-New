// ============================================================
// GLBModelLoader.ts — GLB/GLTF Model Loader for Three.js
// ============================================================
// Loads GLB models, caches geometry+material, and uses
// InstancedMesh for efficient GPU instancing (1 draw call per
// building type, regardless of how many copies exist).
// Falls back to clone() for models with complex hierarchies.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { TILE_SIZE } from './Colors';

/** Maximum instances per building type (pre-allocated buffer size) */
const MAX_INSTANCES = 64;

/** Tracking info for one instanced mesh pool */
interface InstancePool {
  /** The InstancedMesh objects (one per sub-mesh in the original) */
  meshes: THREE.InstancedMesh[];
  /** Geometries for the sub-meshes */
  geometries: THREE.BufferGeometry[];
  /** Materials for the sub-meshes */
  materials: THREE.Material[];
  /** Currently active instance count */
  count: number;
  /** Map: "gx,gy" → instance index */
  indexMap: Map<string, number>;
  /** The normalised scale factor applied to the template */
  templateScale: number;
  /** Bounding box of the normalised template (for positioning) */
  templateBox: THREE.Box3;
  /** Group containing all InstancedMeshes for this pool */
  group: THREE.Group;
}

/** Tracking info for legacy clone-based placement */
interface ClonePlacement {
  object: THREE.Object3D;
  key: string;
  gx: number;
  gy: number;
}

export class GLBModelLoader {
  private readonly loader: GLTFLoader;
  private readonly cache = new Map<string, THREE.Group>();
  private readonly pools = new Map<string, InstancePool>();
  private readonly clonePlacements: ClonePlacement[] = [];
  private readonly threeScene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.threeScene = scene;
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  /**
   * Load a GLB model from `path`, store it under `key`.
   * Returns the cached original Group (do not add to scene directly — use placeInstance).
   */
  async loadModel(key: string, path: string): Promise<THREE.Group> {
    const existing = this.cache.get(key);
    if (existing) return existing;

    return new Promise<THREE.Group>((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const root = gltf.scene;
          root.name = `glb-template-${key}`;

          // Normalise scale: fit the model into a TILE_SIZE bounding box
          const box = new THREE.Box3().setFromObject(root);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          let scaleFactor = 1;
          if (maxDim > 0) {
            scaleFactor = TILE_SIZE / maxDim;
            root.scale.multiplyScalar(scaleFactor);
          }

          // Center the model's geometry at origin
          box.setFromObject(root);
          const center = new THREE.Vector3();
          box.getCenter(center);
          root.position.sub(center);

          // Wrap in a container group
          const container = new THREE.Group();
          container.name = `glb-cache-${key}`;
          container.add(root);
          this.cache.set(key, container);

          console.log(`[GLBModelLoader] Loaded "${key}" from ${path} (${scaleFactor.toFixed(3)}x scale)`);
          resolve(container);
        },
        undefined,
        (error) => {
          console.error(`[GLBModelLoader] Failed to load "${key}" from ${path}:`, error);
          reject(error);
        },
      );
    });
  }

  /**
   * Pre-create InstancedMesh pool from the template model.
   * Extracts all Mesh children, creates InstancedMesh for each.
   */
  private createInstancePool(key: string, template: THREE.Group, templateScale: number): void {
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const meshes: THREE.InstancedMesh[] = [];

    // Collect all mesh data from the template
    template.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const lowerName = child.name.toLowerCase();
      const isHelper =
        lowerName.includes('shadow') ||
        lowerName.includes('plane') ||
        lowerName.includes('collider') ||
        lowerName.includes('collision') ||
        lowerName.includes('proxy') ||
        lowerName.includes('helper');
      if (isHelper) return;

      // Get world-space geometry (bake the transform chain)
      const geo = child.geometry.clone();
      child.updateWorldMatrix(true, false);
      geo.applyMatrix4(child.matrixWorld);
      geometries.push(geo);

      const mat = Array.isArray(child.material) ? child.material[0] : child.material;
      materials.push(mat);

      const instMesh = new THREE.InstancedMesh(geo, mat, MAX_INSTANCES);
      instMesh.name = `instanced-${key}-${meshes.length}`;
      instMesh.count = 0; // start with 0 visible instances
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;
      instMesh.frustumCulled = false; // instances span wide area
      meshes.push(instMesh);
    });

    // Compute the bounding box of the normalised template
    const templateBox = new THREE.Box3().setFromObject(template);

    const group = new THREE.Group();
    group.name = `instance-pool-${key}`;
    for (const m of meshes) group.add(m);
    this.threeScene.add(group);

    this.pools.set(key, {
      meshes,
      geometries,
      materials,
      count: 0,
      indexMap: new Map(),
      templateScale,
      templateBox,
      group,
    });
  }

  /**
   * Place an instance of a loaded model at grid position (gx, gy).
   * Uses GPU instancing — no extra mesh copies in CPU memory.
   * @param fw footprint width in tiles (for scaling)
   * @param fh footprint height in tiles (for scaling)
   * Returns a dummy Object3D for API compatibility, or null if not loaded.
   */
  placeInstance(key: string, gx: number, gy: number, terrainHeight: number, fw = 1, fh = 1): THREE.Object3D | null {
    const pool = this.pools.get(key);
    if (!pool) return null;

    const coordKey = `${gx},${gy}`;
    if (pool.indexMap.has(coordKey)) return null; // already placed here

    if (pool.count >= MAX_INSTANCES) {
      console.warn(`[GLBModelLoader] Max instances (${MAX_INSTANCES}) reached for "${key}"`);
      return null;
    }

    const idx = pool.count;
    pool.indexMap.set(coordKey, idx);
    pool.count++;

    // Compute position: footprint center, bottom on terrain
    const worldX = (gx + fw / 2) * TILE_SIZE;
    const worldZ = (gy + fh / 2) * TILE_SIZE;
    const bottomY = pool.templateBox.min.y;
    const posY = terrainHeight - bottomY;

    // Scale: template is normalised to 1 TILE_SIZE. Scale to cover footprint.
    const templateSize = new THREE.Vector3();
    pool.templateBox.getSize(templateSize);
    const targetW = fw * TILE_SIZE;
    const targetD = fh * TILE_SIZE;
    const scaleX = templateSize.x > 0 ? targetW / templateSize.x : 1;
    const scaleZ = templateSize.z > 0 ? targetD / templateSize.z : 1;
    const uniformScale = Math.min(scaleX, scaleZ);

    const matrix = new THREE.Matrix4();
    matrix.compose(
      new THREE.Vector3(worldX, posY, worldZ),
      new THREE.Quaternion(),
      new THREE.Vector3(uniformScale, uniformScale, uniformScale),
    );

    // Apply to all sub-meshes
    for (const instMesh of pool.meshes) {
      instMesh.setMatrixAt(idx, matrix);
      instMesh.count = pool.count;
      instMesh.instanceMatrix.needsUpdate = true;
    }

    // Return a lightweight marker object for tracking
    const marker = new THREE.Object3D();
    marker.name = `instance-marker-${key}-${gx}-${gy}`;
    marker.position.set(worldX, posY, worldZ);
    marker.userData = { instanceKey: key, gx, gy, instanceIndex: idx };
    return marker;
  }

  /**
   * Remove an instance at a specific grid position.
   * Swaps the last instance into the removed slot to keep the array dense.
   */
  removeInstance(key: string, gx: number, gy: number): void {
    const pool = this.pools.get(key);
    if (!pool) return;

    const coordKey = `${gx},${gy}`;
    const idx = pool.indexMap.get(coordKey);
    if (idx === undefined) return;

    const lastIdx = pool.count - 1;

    if (idx !== lastIdx) {
      // Swap last instance into this slot
      const lastMatrix = new THREE.Matrix4();
      for (const instMesh of pool.meshes) {
        instMesh.getMatrixAt(lastIdx, lastMatrix);
        instMesh.setMatrixAt(idx, lastMatrix);
      }

      // Update the index map: find which coord had lastIdx
      for (const [coord, i] of pool.indexMap.entries()) {
        if (i === lastIdx) {
          pool.indexMap.set(coord, idx);
          break;
        }
      }
    }

    pool.indexMap.delete(coordKey);
    pool.count--;

    for (const instMesh of pool.meshes) {
      instMesh.count = pool.count;
      instMesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Clear all instances for a given key. */
  clearInstances(key: string): void {
    const pool = this.pools.get(key);
    if (!pool) return;
    pool.count = 0;
    pool.indexMap.clear();
    for (const instMesh of pool.meshes) {
      instMesh.count = 0;
      instMesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Clear all instances for ALL keys. */
  clearAllInstances(): void {
    for (const key of this.pools.keys()) {
      this.clearInstances(key);
    }
  }

  // ─── Legacy clone-based API (for showcase / one-off placements) ──

  /**
   * Place a clone of a loaded model (legacy API for one-off placements
   * like the showcase building). Use placeInstance() for buildings.
   */
  placeModel(key: string, gx: number, gy: number, terrainHeight: number): THREE.Object3D | null {
    const template = this.cache.get(key);
    if (!template) {
      console.warn(`[GLBModelLoader] No cached model for key "${key}"`);
      return null;
    }

    const instance = template.clone();
    instance.name = `glb-clone-${key}-${gx}-${gy}`;

    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const lowerName = child.name.toLowerCase();
        const isHelperMesh =
          lowerName.includes('shadow') ||
          lowerName.includes('plane') ||
          lowerName.includes('collider') ||
          lowerName.includes('collision') ||
          lowerName.includes('proxy') ||
          lowerName.includes('helper');

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        const hasTransparent = mats.some((mat) => mat.transparent || mat.opacity < 0.98);

        child.castShadow = !isHelperMesh && !hasTransparent;
        child.receiveShadow = true;
      }
    });

    const worldX = (gx + 0.5) * TILE_SIZE;
    const worldZ = (gy + 0.5) * TILE_SIZE;
    const box = new THREE.Box3().setFromObject(instance);
    const bottomY = box.min.y;

    instance.position.set(worldX, terrainHeight - bottomY, worldZ);
    this.threeScene.add(instance);
    this.clonePlacements.push({ object: instance, key, gx, gy });

    return instance;
  }

  /** Check if a model is loaded and cached for this key. */
  hasModel(key: string): boolean {
    return this.cache.has(key);
  }

  /** Check if an instance pool exists for this key. */
  hasPool(key: string): boolean {
    return this.pools.has(key);
  }

  /** Get the instance pool group for raycaster picking. */
  getPoolGroup(key: string): THREE.Group | null {
    return this.pools.get(key)?.group ?? null;
  }

  /** Remove a previously placed clone from the scene. */
  removeModel(object: THREE.Object3D): void {
    this.threeScene.remove(object);
    const idx = this.clonePlacements.findIndex(p => p.object === object);
    if (idx >= 0) this.clonePlacements.splice(idx, 1);
  }

  /** Release all GPU resources. */
  dispose(): void {
    // Remove clone placements
    for (const p of this.clonePlacements) {
      this.threeScene.remove(p.object);
    }
    this.clonePlacements.length = 0;

    // Dispose instance pools
    for (const pool of this.pools.values()) {
      for (const instMesh of pool.meshes) {
        instMesh.geometry.dispose();
        const mat = instMesh.material;
        if (Array.isArray(mat)) {
          for (const m of mat) m.dispose();
        } else {
          mat.dispose();
        }
      }
      this.threeScene.remove(pool.group);
    }
    this.pools.clear();

    // Dispose cached templates
    for (const group of this.cache.values()) {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mat = child.material;
          if (Array.isArray(mat)) {
            for (const m of mat) m.dispose();
          } else {
            mat.dispose();
          }
        }
      });
    }
    this.cache.clear();
  }
}
