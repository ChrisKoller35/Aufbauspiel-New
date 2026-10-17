// ============================================================
// ThreeGridPicker.ts — Raycaster-based Grid Picking for Three.js
// ============================================================
// Converts mouse/pointer events into grid coordinates by
// raycasting against the terrain mesh.
//
// Events are registered on `document` (not the canvas) because
// #three-canvas has pointer-events:none so it does not block
// the HTML UI layer. Events that originate from UI elements
// (`.html-panel`, `#ui-layer` children) are ignored.
// ============================================================

import * as THREE from 'three';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE } from './Colors';

type GridCallback = (gx: number, gy: number) => void;
type GridLeaveCallback = () => void;

export class ThreeGridPicker {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private currentGrid: { gx: number; gy: number } | null = null;

  private hoverCallbacks: GridCallback[] = [];
  private clickCallbacks: GridCallback[] = [];
  private leaveCallbacks: GridLeaveCallback[] = [];

  private boundPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundPointerDown: ((e: PointerEvent) => void) | null = null;
  private boundPointerLeave: ((e: PointerEvent) => void) | null = null;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private terrainMesh: THREE.Mesh,
    private canvas: HTMLCanvasElement,
  ) {}

  // ─── Public API ──────────────────────────────────────────────

  /** Register pointer events on document for hover/click detection. */
  enable(): void {
    if (this.boundPointerMove) return; // already enabled

    this.boundPointerMove = (e: PointerEvent) => this.onPointerMove(e);
    this.boundPointerDown = (e: PointerEvent) => this.onPointerDown(e);
    this.boundPointerLeave = () => this.onPointerLeave();

    // Listen directly on the Three.js canvas (has pointer-events: auto)
    this.canvas.addEventListener('pointermove', this.boundPointerMove);
    this.canvas.addEventListener('pointerdown', this.boundPointerDown);
    this.canvas.addEventListener('pointerleave', this.boundPointerLeave);
  }

  /** Remove all event listeners. */
  disable(): void {
    if (this.boundPointerMove) {
      this.canvas.removeEventListener('pointermove', this.boundPointerMove);
      this.boundPointerMove = null;
    }
    if (this.boundPointerDown) {
      this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
      this.boundPointerDown = null;
    }
    if (this.boundPointerLeave) {
      this.canvas.removeEventListener('pointerleave', this.boundPointerLeave);
      this.boundPointerLeave = null;
    }
  }

  /** Returns the current grid position under the mouse, or null. */
  getGridPosition(): { gx: number; gy: number } | null {
    return this.currentGrid;
  }

  /** Register a callback fired when the hovered grid cell changes. */
  onGridHover(callback: GridCallback): void {
    this.hoverCallbacks.push(callback);
  }

  /** Register a callback fired on left-click on a grid cell. */
  onGridClick(callback: GridCallback): void {
    this.clickCallbacks.push(callback);
  }

  /** Register a callback fired when the pointer leaves the grid area. */
  onGridLeave(callback: GridLeaveCallback): void {
    this.leaveCallbacks.push(callback);
  }

  /** Clean up all resources. */
  dispose(): void {
    this.disable();
    this.hoverCallbacks = [];
    this.clickCallbacks = [];
    this.leaveCallbacks = [];
    this.currentGrid = null;
  }

  // ─── Private ─────────────────────────────────────────────────

  /**
   * Returns true if the event target is a UI element that should
   * consume the pointer event (HTML panels, ui-layer children).
   */
  private isUIEvent(e: PointerEvent): boolean {
    const target = e.target as HTMLElement | null;
    if (!target) return false;
    // Block if the event hit any element inside #ui-layer (sidebar, HUD,
    // build menu, status bar, panels etc.). The #ui-layer itself has
    // pointer-events:none, so only its interactive children fire events.
    // Also block clicks on any element with the html-panel class.
    return !!(
      target.closest('#ui-layer') ||
      target.closest('#ui-sidebar') ||
      target.closest('#ui-hud') ||
      target.closest('#ui-statusbar') ||
      target.closest('#ui-build-menu') ||
      target.closest('.html-panel')
    );
  }

  /** Update the normalised mouse coordinates from a pointer event. */
  private updateMouse(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /** Raycast against the terrain mesh and return clamped grid coords or null. */
  private raycastToGrid(): { gx: number; gy: number } | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.terrainMesh);
    if (hits.length === 0) return null;

    const point = hits[0].point;
    const gx = Math.floor(point.x / TILE_SIZE);
    const gy = Math.floor(point.z / TILE_SIZE);

    // Clamp to valid grid range
    const clampedGx = Math.max(0, Math.min(GRID_WIDTH - 1, gx));
    const clampedGy = Math.max(0, Math.min(GRID_HEIGHT - 1, gy));

    return { gx: clampedGx, gy: clampedGy };
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.isUIEvent(e)) {
      // Pointer is over UI — treat as leaving the grid
      if (this.currentGrid) {
        this.currentGrid = null;
        for (const cb of this.leaveCallbacks) cb();
      }
      return;
    }

    this.updateMouse(e);
    const grid = this.raycastToGrid();

    if (!grid) {
      if (this.currentGrid) {
        this.currentGrid = null;
        for (const cb of this.leaveCallbacks) cb();
      }
      return;
    }

    // Only fire callbacks when the grid cell actually changes
    if (
      !this.currentGrid ||
      this.currentGrid.gx !== grid.gx ||
      this.currentGrid.gy !== grid.gy
    ) {
      this.currentGrid = grid;
      for (const cb of this.hoverCallbacks) {
        cb(grid.gx, grid.gy);
      }
    }
  }

  private onPointerDown(e: PointerEvent): void {
    // Only respond to left-click (button 0), ignore middle/right
    if (e.button !== 0) return;
    // Ignore clicks on UI elements
    if (this.isUIEvent(e)) return;

    this.updateMouse(e);
    const grid = this.raycastToGrid();
    if (!grid) return;

    for (const cb of this.clickCallbacks) {
      cb(grid.gx, grid.gy);
    }
  }

  private onPointerLeave(): void {
    if (this.currentGrid) {
      this.currentGrid = null;
      for (const cb of this.leaveCallbacks) cb();
    }
  }
}
