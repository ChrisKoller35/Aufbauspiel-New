// ─── Magic City – InputHandler ────────────────────────────────────
// Centralises all pointer, keyboard, and camera input handling.
// Uses an ICityScene interface to avoid circular imports.
// ──────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { BUILDING_DEFS } from '../data/buildings';
import { TILE_SIZE, ISO_MODE, UI_COLORS } from '../rendering/Colors';
import {
  isoToGrid, strokeIsoBuildingFootprint,
} from '../rendering/IsoRenderer';
import { GridSystem } from './GridSystem';
import { SaveSystem } from './SaveSystem';
import { EventBus } from './EventBus';
import { HTMLSidebar } from '../ui/html/HTMLSidebar';
import { HTMLStatusBar } from '../ui/html/HTMLStatusBar';
import { BuildMode } from '../ui/html/HTMLBuildMenu';

// ─── ICityScene Interface ────────────────────────────────────────
// Defines exactly what InputHandler needs from CityScene.
// CityScene implements this interface — no circular import.

export interface ICityScene extends Phaser.Scene {
  gameState: GameState;

  // ── Build state (read-only from InputHandler's perspective) ──
  getSelectedBuildingType(): string | null;
  getCurrentBuildMode(): BuildMode;
  isAnyModalOpen(): boolean;

  // ── Placement / Demolish ──
  handlePlacement(typeId: string, gx: number, gy: number): void;
  handleDemolish(worldX: number, worldY: number): void;

  // ── Building selection ──
  handleBuildingClick(building: BuildingInstance): void;
  hideBuildingPanel(): void;

  // ── Ghost / Hover rendering ──
  updateGhostPreview(worldX: number, worldY: number): void;
  updateDemolishHighlight(worldX: number, worldY: number): void;
  updateSwampGhostPreview(worldX: number, worldY: number): void;
  clearGhost(): void;
  clearHoverHighlight(): void;
  drawHoverHighlight(building: BuildingInstance): void;

  // ── Terrain editors ──
  handleSwampPaint(gx: number, gy: number): void;
  setSwampVariant(v: 0 | 1 | 2): void;
  exportSwampData(): void;
  handleGrayPaint(gx: number, gy: number): void;
  setGrayVariant(v: 0 | 1 | 2): void;
  getGrayVariant(): 0 | 1 | 2;
  handleDirtPaint(gx: number, gy: number): void;
  setDirtVariant(v: 0 | 1 | 2): void;
  getDirtVariant(): 0 | 1 | 2;
  updateGrayGhostPreview(worldX: number, worldY: number): void;
  updateDirtGhostPreview(worldX: number, worldY: number): void;

  // ── Grid ──
  gridSystem: GridSystem;

  // ── Mode switching ──
  setBuildMode(mode: BuildMode): void;

  // ── Save ──
  saveSystem: SaveSystem;

  // ── Debug positioning ──
  toggleDebugMode(mode: 'mountain' | 'camp'): void;
  copyDebugPosition(): void;
  isDebugMode(): boolean;
  handleDebugMovement(delta: number): void;

  // ── Status bar ──
  updateStatusBar(): void;

  // ── UI panel toggles (for keyboard shortcuts) ──
  toggleStatisticsUI(): void;
  toggleAchievementUI(): void;
  handleEscape(): void;
}

// ─── InputHandler Class ──────────────────────────────────────────

export class InputHandler {
  private scene: ICityScene;
  private bus: EventBus;

  // Camera panning state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // Arrow key cursors
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  // ── Stored callbacks for clean removal in destroy() ──────────
  private _onPointerMove!: (pointer: Phaser.Input.Pointer) => void;
  private _onPointerDown!: (pointer: Phaser.Input.Pointer) => void;
  private _onPointerUp!: (pointer: Phaser.Input.Pointer) => void;
  private _onWheel!: (pointer: Phaser.Input.Pointer, go: unknown[], dx: number, deltaY: number) => void;
  private _onPointerDownCam!: (pointer: Phaser.Input.Pointer) => void;
  private _onPointerMoveCam!: (pointer: Phaser.Input.Pointer) => void;

  // Keyboard callbacks
  private _onKeyB!: () => void;
  private _onKeyR!: () => void;
  private _onKeyD!: () => void;
  private _onKeyW!: () => void;
  private _onKeyF7!: (e: KeyboardEvent) => void;
  private _onKeyF8!: (e: KeyboardEvent) => void;
  private _onKeyOne!: () => void;
  private _onKeyTwo!: () => void;
  private _onKeyThree!: () => void;
  private _onKeyF5!: (e: KeyboardEvent) => void;
  private _onKeyF6!: (e: KeyboardEvent) => void;
  private _onKeyP!: () => void;
  private _onKeyT!: () => void;
  private _onKeyA!: () => void;
  private _onKeyEsc!: () => void;
  private _onKeyF2!: () => void;
  private _onKeyF4!: () => void;
  private _onKeyC!: () => void;

  constructor(scene: ICityScene, bus: EventBus) {
    this.scene = scene;
    this.bus = bus;

    this.setupPointerInput();
    this.setupCameraInput();
    this.setupKeyboard();
    this.cursors = scene.input.keyboard!.createCursorKeys();
  }

  // ─── Pointer Events ────────────────────────────────────────────

  private setupPointerInput(): void {
    const scene = this.scene;

    this._onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) return;
      const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const mode = scene.getCurrentBuildMode();

      if (mode === 'build' || mode === 'road') {
        scene.clearHoverHighlight();
        scene.updateGhostPreview(worldPoint.x, worldPoint.y);
      } else if (mode === 'demolish') {
        scene.clearHoverHighlight();
        scene.updateDemolishHighlight(worldPoint.x, worldPoint.y);
      } else if (mode === 'swamp') {
        scene.clearHoverHighlight();
        scene.updateSwampGhostPreview(worldPoint.x, worldPoint.y);
        if (pointer.isDown && pointer.leftButtonDown()) {
          const { gx, gy } = this.worldToGrid(worldPoint.x, worldPoint.y);
          scene.handleSwampPaint(gx, gy);
        }
      } else if (mode === 'gray') {
        scene.clearHoverHighlight();
        scene.updateGrayGhostPreview(worldPoint.x, worldPoint.y);
        if (pointer.isDown && pointer.leftButtonDown()) {
          const { gx, gy } = this.worldToGrid(worldPoint.x, worldPoint.y);
          scene.handleGrayPaint(gx, gy);
        }
      } else if (mode === 'dirt') {
        scene.clearHoverHighlight();
        scene.updateDirtGhostPreview(worldPoint.x, worldPoint.y);
        if (pointer.isDown && pointer.leftButtonDown()) {
          const { gx, gy } = this.worldToGrid(worldPoint.x, worldPoint.y);
          scene.handleDirtPaint(gx, gy);
        }
      } else {
        scene.clearGhost();
        scene.clearHoverHighlight();
        // Hover highlight for buildings in normal mode
        if (pointer.x > HTMLSidebar.WIDTH && pointer.y > 32 && pointer.y < scene.scale.height - HTMLStatusBar.HEIGHT) {
          const { gx, gy } = this.worldToGrid(worldPoint.x, worldPoint.y);
          let hovBuilding: BuildingInstance | null;
          if (ISO_MODE) {
            hovBuilding = scene.gridSystem.getBuildingAtGrid(scene.gameState, gx, gy);
          } else {
            hovBuilding = scene.gridSystem.getBuildingAtPixel(scene.gameState, worldPoint.x, worldPoint.y, TILE_SIZE);
          }
          if (hovBuilding && hovBuilding.typeId !== 'ROAD' && hovBuilding.built) {
            scene.drawHoverHighlight(hovBuilding);
          }
        }
      }
    };
    scene.input.on('pointermove', this._onPointerMove);

    this._onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      // Block world input when modal UIs are open
      if (scene.isAnyModalOpen()) return;
      // Ignore clicks on sidebar, HUD, or status bar
      if (pointer.x < HTMLSidebar.WIDTH) return;
      if (pointer.y < 32 || pointer.y > scene.scale.height - HTMLStatusBar.HEIGHT) return;

      const mode = scene.getCurrentBuildMode();
      // Ignore clicks on build menu palette area
      if (mode === 'build' && pointer.y > scene.scale.height - 60 - HTMLStatusBar.HEIGHT) return;

      const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const { gx, gy } = this.worldToGrid(worldPoint.x, worldPoint.y);

      if (mode === 'build' && scene.getSelectedBuildingType()) {
        scene.handlePlacement(scene.getSelectedBuildingType()!, gx, gy);
      } else if (mode === 'road') {
        scene.handlePlacement('ROAD', gx, gy);
      } else if (mode === 'swamp') {
        scene.handleSwampPaint(gx, gy);
      } else if (mode === 'gray') {
        scene.handleGrayPaint(gx, gy);
      } else if (mode === 'dirt') {
        scene.handleDirtPaint(gx, gy);
      } else if (mode === 'demolish') {
        scene.handleDemolish(worldPoint.x, worldPoint.y);
      } else if (mode === 'none') {
        // Click on building -> show info panel
        const building = ISO_MODE
          ? scene.gridSystem.getBuildingAtGrid(scene.gameState, gx, gy)
          : scene.gridSystem.getBuildingAtPixel(scene.gameState, worldPoint.x, worldPoint.y, TILE_SIZE);
        if (building && building.typeId !== 'ROAD' && building.built) {
          scene.handleBuildingClick(building);
        } else {
          scene.hideBuildingPanel();
        }
      }
    };
    scene.input.on('pointerdown', this._onPointerDown);
  }

  // ─── Camera Input ──────────────────────────────────────────────

  private setupCameraInput(): void {
    const cam = this.scene.cameras.main;

    // Zoom with mouse wheel
    this._onWheel = (
      _pointer: Phaser.Input.Pointer, _go: unknown[], _dx: number, deltaY: number,
    ) => {
      const newZoom = Phaser.Math.Clamp(cam.zoom + (deltaY > 0 ? -0.1 : 0.1), 0.75, 2.0);
      cam.setZoom(newZoom);
      // Immediately sync worldView to prevent 1-frame UI flicker
      const wvX = cam.scrollX + cam.width / 2 * (1 - 1 / newZoom);
      const wvY = cam.scrollY + cam.height / 2 * (1 - 1 / newZoom);
      cam.worldView.setTo(wvX, wvY, cam.width / newZoom, cam.height / newZoom);
    };
    this.scene.input.on('wheel', this._onWheel);

    // Pan with middle mouse button
    this._onPointerDownCam = (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    };
    this.scene.input.on('pointerdown', this._onPointerDownCam);

    this._onPointerMoveCam = (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        cam.scrollX += (this.dragStartX - pointer.x) / cam.zoom;
        cam.scrollY += (this.dragStartY - pointer.y) / cam.zoom;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    };
    this.scene.input.on('pointermove', this._onPointerMoveCam);

    this._onPointerUp = (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonReleased()) this.isDragging = false;
    };
    this.scene.input.on('pointerup', this._onPointerUp);
  }

  // ─── Keyboard Shortcuts ────────────────────────────────────────

  private setupKeyboard(): void {
    const kb = this.scene.input.keyboard!;
    const scene = this.scene;

    // Build mode toggles
    this._onKeyB = () => {
      scene.setBuildMode(scene.getCurrentBuildMode() === 'build' ? 'none' : 'build');
    };
    kb.on('keydown-B', this._onKeyB);

    this._onKeyR = () => {
      scene.setBuildMode(scene.getCurrentBuildMode() === 'road' ? 'none' : 'road');
    };
    kb.on('keydown-R', this._onKeyR);

    this._onKeyD = () => {
      scene.setBuildMode(scene.getCurrentBuildMode() === 'demolish' ? 'none' : 'demolish');
    };
    kb.on('keydown-D', this._onKeyD);

    // Terrain editor modes (Dev tools)
    this._onKeyW = () => {
      scene.setBuildMode(scene.getCurrentBuildMode() === 'swamp' ? 'none' : 'swamp');
      if (scene.getCurrentBuildMode() === 'none') scene.clearGhost();
    };
    kb.on('keydown-W', this._onKeyW);

    this._onKeyF7 = (e: KeyboardEvent) => {
      e.preventDefault();
      scene.setBuildMode(scene.getCurrentBuildMode() === 'gray' ? 'none' : 'gray');
      if (scene.getCurrentBuildMode() === 'none') scene.clearGhost();
    };
    kb.on('keydown-F7', this._onKeyF7);

    this._onKeyF8 = (e: KeyboardEvent) => {
      e.preventDefault();
      scene.setBuildMode(scene.getCurrentBuildMode() === 'dirt' ? 'none' : 'dirt');
      if (scene.getCurrentBuildMode() === 'none') scene.clearGhost();
    };
    kb.on('keydown-F8', this._onKeyF8);

    // Variant selection 1/2/3 — works for swamp, gray and dirt modes
    this._onKeyOne = () => {
      const m = scene.getCurrentBuildMode();
      if (m === 'swamp') { scene.setSwampVariant(0); scene.updateStatusBar(); }
      else if (m === 'gray') { scene.setGrayVariant(0); scene.updateStatusBar(); }
      else if (m === 'dirt') { scene.setDirtVariant(0); scene.updateStatusBar(); }
    };
    kb.on('keydown-ONE', this._onKeyOne);

    this._onKeyTwo = () => {
      const m = scene.getCurrentBuildMode();
      if (m === 'swamp') { scene.setSwampVariant(1); scene.updateStatusBar(); }
      else if (m === 'gray') { scene.setGrayVariant(1); scene.updateStatusBar(); }
      else if (m === 'dirt') { scene.setDirtVariant(1); scene.updateStatusBar(); }
    };
    kb.on('keydown-TWO', this._onKeyTwo);

    this._onKeyThree = () => {
      const m = scene.getCurrentBuildMode();
      if (m === 'swamp') { scene.setSwampVariant(2); scene.updateStatusBar(); }
      else if (m === 'gray') { scene.setGrayVariant(2); scene.updateStatusBar(); }
      else if (m === 'dirt') { scene.setDirtVariant(2); scene.updateStatusBar(); }
    };
    kb.on('keydown-THREE', this._onKeyThree);

    // Save / Export
    this._onKeyF5 = (e: KeyboardEvent) => {
      e.preventDefault();
      scene.saveSystem.save(scene.gameState);
    };
    kb.on('keydown-F5', this._onKeyF5);

    this._onKeyF6 = (e: KeyboardEvent) => {
      e.preventDefault();
      scene.exportSwampData();
    };
    kb.on('keydown-F6', this._onKeyF6);

    // Debug: zoom/scroll info to clipboard
    this._onKeyP = () => {
      const cam = scene.cameras.main;
      const cr = scene.game.canvas.getBoundingClientRect();
      const sx = cr.width / cam.width;
      const sy = cr.height / cam.height;
      const oL = cr.left + cam.x * sx;
      const oT = cr.top + cam.y * sy;
      const oR = cr.left + (cam.x + cam.width) * sx;
      const oB = cr.top + (cam.y + cam.height) * sy;
      const dL = oL - cr.left;
      const dT = oT - cr.top;
      const dR = oR - (cr.left + cr.width);
      const dB = oB - (cr.top + cr.height);
      const wv = cam.worldView;
      const wvOffX = (wv.x - cam.scrollX).toFixed(2);
      const wvOffY = (wv.y - cam.scrollY).toFixed(2);
      const info = [
        `zoom=${cam.zoom.toFixed(3)}`,
        `scale=${sx.toFixed(3)}x${sy.toFixed(3)}`,
        `drift=[L:${dL.toFixed(1)} T:${dT.toFixed(1)} R:${dR.toFixed(1)} B:${dB.toFixed(1)}]`,
        `wvOffset=[${wvOffX},${wvOffY}]`,
        `canvasWH=[${cr.width.toFixed(0)},${cr.height.toFixed(0)}]`,
        `scrollXY=[${cam.scrollX.toFixed(1)},${cam.scrollY.toFixed(1)}]`,
      ].join(' | ');
      navigator.clipboard?.writeText(info).catch(() => {});
      console.log('[DEBUG zoom]', info);
    };
    kb.on('keydown-P', this._onKeyP);

    // UI panel toggles
    this._onKeyT = () => scene.toggleStatisticsUI();
    kb.on('keydown-T', this._onKeyT);

    this._onKeyA = () => scene.toggleAchievementUI();
    kb.on('keydown-A', this._onKeyA);

    this._onKeyEsc = () => scene.handleEscape();
    kb.on('keydown-ESC', this._onKeyEsc);

    // Note: M key for VolumeUI is handled by VolumeUI itself (has its own listener)

    // Debug positioning modes
    this._onKeyF2 = () => scene.toggleDebugMode('mountain');
    kb.on('keydown-F2', this._onKeyF2);

    this._onKeyF4 = () => scene.toggleDebugMode('camp');
    kb.on('keydown-F4', this._onKeyF4);

    this._onKeyC = () => {
      if (scene.isDebugMode()) scene.copyDebugPosition();
    };
    kb.on('keydown-C', this._onKeyC);
  }

  // ─── Cleanup ───────────────────────────────────────────────────

  /**
   * Remove all registered input listeners.
   * Must be called when the scene shuts down to prevent listener stacking on restart.
   */
  destroy(): void {
    const input = this.scene.input;
    const kb = this.scene.input.keyboard;

    // Pointer listeners
    input.off('pointermove', this._onPointerMove);
    input.off('pointerdown', this._onPointerDown);
    input.off('pointermove', this._onPointerMoveCam);
    input.off('pointerdown', this._onPointerDownCam);
    input.off('pointerup', this._onPointerUp);
    input.off('wheel', this._onWheel);

    // Keyboard listeners
    if (kb) {
      kb.off('keydown-B', this._onKeyB);
      kb.off('keydown-R', this._onKeyR);
      kb.off('keydown-D', this._onKeyD);
      kb.off('keydown-W', this._onKeyW);
      kb.off('keydown-F7', this._onKeyF7);
      kb.off('keydown-F8', this._onKeyF8);
      kb.off('keydown-ONE', this._onKeyOne);
      kb.off('keydown-TWO', this._onKeyTwo);
      kb.off('keydown-THREE', this._onKeyThree);
      kb.off('keydown-F5', this._onKeyF5);
      kb.off('keydown-F6', this._onKeyF6);
      kb.off('keydown-P', this._onKeyP);
      kb.off('keydown-T', this._onKeyT);
      kb.off('keydown-A', this._onKeyA);
      kb.off('keydown-ESC', this._onKeyEsc);
      kb.off('keydown-F2', this._onKeyF2);
      kb.off('keydown-F4', this._onKeyF4);
      kb.off('keydown-C', this._onKeyC);
    }
  }

  // ─── Per-frame Camera Panning (Arrow Keys) ─────────────────────

  /** Call from CityScene.update() each frame for arrow-key camera panning. */
  updateCameraPan(delta: number): void {
    const cam = this.scene.cameras.main;
    const speed = (300 / cam.zoom) * (delta / 1000);
    if (this.cursors.left.isDown) cam.scrollX -= speed;
    if (this.cursors.right.isDown) cam.scrollX += speed;
    if (this.cursors.up.isDown) cam.scrollY -= speed;
    if (this.cursors.down.isDown) cam.scrollY += speed;
  }

  // ─── Helpers ───────────────────────────────────────────────────

  /** Convert world coordinates to grid coordinates (handles ISO_MODE). */
  private worldToGrid(worldX: number, worldY: number): { gx: number; gy: number } {
    if (ISO_MODE) {
      return isoToGrid(worldX, worldY);
    }
    return {
      gx: Math.floor(worldX / TILE_SIZE),
      gy: Math.floor(worldY / TILE_SIZE),
    };
  }

  /** Whether camera is currently being dragged (blocks other pointer events). */
  get isDraggingCamera(): boolean {
    return this.isDragging;
  }
}
