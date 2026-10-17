// ============================================================
// CloudSystem.ts — Procedural cloud layers for floating island
// ============================================================
// Creates three layers of clouds around the island to give the
// impression it is floating in the sky.  All textures are
// procedurally generated (no external images).
// ============================================================

import * as THREE from 'three';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE } from './Colors';
import { Disposable } from './ThreeApp';

// ─── Constants ─────────────────────────────────────────────
const WORLD_W = GRID_WIDTH * TILE_SIZE;   // 1280
const WORLD_H = GRID_HEIGHT * TILE_SIZE;  // 1152
const CENTER_X = WORLD_W / 2;             // 640
const CENTER_Z = WORLD_H / 2;             // 576

// Wrap boundaries (clouds teleport when they drift past these)
const WRAP_MIN_X = -WORLD_W * 0.5;
const WRAP_MAX_X = WORLD_W * 1.5;
const WRAP_MIN_Z = -WORLD_H * 0.5;
const WRAP_MAX_Z = WORLD_H * 1.5;
const WRAP_RANGE_X = WRAP_MAX_X - WRAP_MIN_X;
const WRAP_RANGE_Z = WRAP_MAX_Z - WRAP_MIN_Z;

// ─── Seeded RNG ────────────────────────────────────────────
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Cloud data ────────────────────────────────────────────
interface CloudEntry {
  mesh: THREE.Mesh;
  driftX: number;
  driftZ: number;
  isFlat: boolean;   // flat clouds (under island) vs billboard clouds
}

// ─── Layer definitions ─────────────────────────────────────
interface LayerDef {
  count: number;
  yMin: number;
  yMax: number;
  sizeMin: number;
  sizeMax: number;
  opacityMin: number;
  opacityMax: number;
  flat: boolean;
  /** Spawn radius from island centre on XZ */
  radiusMin: number;
  radiusMax: number;
}

const LAYER_BELOW: LayerDef = {
  count: 10,
  yMin: -300,
  yMax: -100,
  sizeMin: 200,
  sizeMax: 500,
  opacityMin: 0.16,
  opacityMax: 0.32,
  flat: true,
  radiusMin: 0,
  radiusMax: WORLD_W * 0.7,
};

const LAYER_MIDDLE: LayerDef = {
  count: 7,
  yMin: -50,
  yMax: 50,
  sizeMin: 150,
  sizeMax: 350,
  opacityMin: 0.08,
  opacityMax: 0.2,
  flat: false,
  radiusMin: WORLD_W * 0.5,
  radiusMax: WORLD_W * 1.0,
};

const LAYER_HIGH: LayerDef = {
  count: 4,
  yMin: 200,
  yMax: 500,
  sizeMin: 300,
  sizeMax: 600,
  opacityMin: 0.05,
  opacityMax: 0.12,
  flat: false,
  radiusMin: 0,
  radiusMax: WORLD_W * 1.2,
};

// ─── CloudSystem ───────────────────────────────────────────

export class CloudSystem implements Disposable {
  private threeScene: THREE.Scene;
  private clouds: CloudEntry[] = [];
  private cloudTexture: THREE.Texture | null = null;
  private cloudGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.threeScene = scene;
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'cloud-system';
    this.threeScene.add(this.cloudGroup);
  }

  // ── Public API ──────────────────────────────────────────

  createClouds(): void {
    this.cloudTexture = this.generateCloudTexture();
    const rng = makeRng(42);

    this.spawnLayer(LAYER_BELOW, rng);
    this.spawnLayer(LAYER_MIDDLE, rng);
    this.spawnLayer(LAYER_HIGH, rng);
  }

  update(deltaTime: number, camera: THREE.Camera): void {
    for (const cloud of this.clouds) {
      // Drift
      cloud.mesh.position.x += cloud.driftX * deltaTime;
      cloud.mesh.position.z += cloud.driftZ * deltaTime;

      // Wrap around
      if (cloud.mesh.position.x > WRAP_MAX_X) cloud.mesh.position.x -= WRAP_RANGE_X;
      if (cloud.mesh.position.x < WRAP_MIN_X) cloud.mesh.position.x += WRAP_RANGE_X;
      if (cloud.mesh.position.z > WRAP_MAX_Z) cloud.mesh.position.z -= WRAP_RANGE_Z;
      if (cloud.mesh.position.z < WRAP_MIN_Z) cloud.mesh.position.z += WRAP_RANGE_Z;

      // Billboard rotation for non-flat clouds
      if (!cloud.isFlat) {
        cloud.mesh.lookAt(camera.position);
        cloud.mesh.rotation.x = 0;
        cloud.mesh.rotation.z = 0;
      }
    }
  }

  dispose(): void {
    // Remove all cloud meshes
    for (const cloud of this.clouds) {
      const mat = cloud.mesh.material as THREE.MeshBasicMaterial;
      mat.dispose();
      cloud.mesh.geometry.dispose();
    }
    this.clouds = [];

    // Remove group from scene
    this.threeScene.remove(this.cloudGroup);

    // Dispose shared texture
    if (this.cloudTexture) {
      this.cloudTexture.dispose();
      this.cloudTexture = null;
    }
  }

  // ── Private ─────────────────────────────────────────────

  private spawnLayer(layer: LayerDef, rng: () => number): void {
    if (!this.cloudTexture) return;

    for (let i = 0; i < layer.count; i++) {
      const size = layer.sizeMin + rng() * (layer.sizeMax - layer.sizeMin);
      const aspect = 0.4 + rng() * 0.4; // height = 40%-80% of width
      const w = size;
      const h = size * aspect;

      const opacity = layer.opacityMin + rng() * (layer.opacityMax - layer.opacityMin);

      const geo = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.MeshBasicMaterial({
        map: this.cloudTexture,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      // Position
      const angle = rng() * Math.PI * 2;
      const radius = layer.radiusMin + rng() * (layer.radiusMax - layer.radiusMin);
      const px = CENTER_X + Math.cos(angle) * radius;
      const pz = CENTER_Z + Math.sin(angle) * radius;
      const py = layer.yMin + rng() * (layer.yMax - layer.yMin);
      mesh.position.set(px, py, pz);

      // Flat clouds lie horizontal (visible from above)
      if (layer.flat) {
        mesh.rotation.x = -Math.PI / 2;
        // Add slight random Y rotation for variety
        mesh.rotation.z = rng() * Math.PI * 2;
      }

      // Drift speed: 5-15 units/sec, random direction
      const driftAngle = rng() * Math.PI * 2;
      const driftSpeed = 5 + rng() * 10;
      const driftX = Math.cos(driftAngle) * driftSpeed;
      const driftZ = Math.sin(driftAngle) * driftSpeed;

      this.cloudGroup.add(mesh);
      this.clouds.push({ mesh, driftX, driftZ, isFlat: layer.flat });
    }
  }

  private generateCloudTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base cloud — large central gradient
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.06)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Overlapping blobs for irregular shape (seeded positions)
    const rng = makeRng(123);
    for (let i = 0; i < 5; i++) {
      const ox = 80 + rng() * 96;
      const oy = 80 + rng() * 96;
      const r = 40 + rng() * 60;
      const g2 = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
      g2.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
      g2.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}
