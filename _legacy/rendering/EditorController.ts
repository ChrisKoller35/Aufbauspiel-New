// ============================================================
// EditorController.ts — 3D Editor with TransformControls
// ============================================================
// Provides translate/rotate/scale gizmos for selected objects.
// Bound to document.body (not canvas) because the Three.js
// canvas has pointer-events:none.
// ============================================================

import * as THREE from 'three';
import { TransformControls, TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TILE_SIZE } from './Colors';

export class EditorController {
  private readonly transformControls: TransformControls;
  private readonly threeScene: THREE.Scene;
  private readonly orbitControls: OrbitControls;

  private active = false;
  private selected: THREE.Object3D | null = null;
  private boxHelper: THREE.BoxHelper | null = null;

  // HUD element
  private hudDiv: HTMLDivElement | null = null;

  // Bound event handlers (for removal)
  private readonly boundKeyDown: (e: KeyboardEvent) => void;

  constructor(
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    orbitControls: OrbitControls,
  ) {
    this.threeScene = scene;
    this.orbitControls = orbitControls;

    // Bind TransformControls to document.body (canvas has pointer-events:none)
    this.transformControls = new TransformControls(camera, document.body);
    this.transformControls.enabled = false;

    // Add the visual helper (gizmo) to the scene
    const helper = this.transformControls.getHelper();
    this.threeScene.add(helper);

    // Default snaps
    this.transformControls.setTranslationSnap(TILE_SIZE);
    this.transformControls.setRotationSnap(Math.PI / 4);

    // Pause orbit controls while dragging the gizmo
    this.transformControls.addEventListener('dragging-changed', (event: { value: unknown }) => {
      this.orbitControls.enabled = !event.value;
    });

    // Key handler for mode switching
    this.boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);

    // Create HUD (hidden by default)
    this.createHUD();
  }

  // ─── Public API ──────────────────────────────────────────────

  activate(): void {
    if (this.active) return;
    this.active = true;
    this.transformControls.enabled = true;
    window.addEventListener('keydown', this.boundKeyDown);
    this.updateHUD();
    console.log('[EditorController] Activated');
  }

  deactivate(): void {
    if (!this.active) return;
    this.deselectObject();
    this.active = false;
    this.transformControls.enabled = false;
    window.removeEventListener('keydown', this.boundKeyDown);
    this.updateHUD();
    console.log('[EditorController] Deactivated');
  }

  isActive(): boolean {
    return this.active;
  }

  selectObject(object: THREE.Object3D): void {
    if (!this.active) return;

    // Deselect previous
    this.clearSelection();

    this.selected = object;
    this.transformControls.attach(object);

    // Outline via BoxHelper
    this.boxHelper = new THREE.BoxHelper(object, 0xffff00);
    this.threeScene.add(this.boxHelper);

    this.updateHUD();
    console.log(`[EditorController] Selected: ${object.name || object.uuid}`);
  }

  deselectObject(): void {
    this.clearSelection();
    this.updateHUD();
  }

  getSelectedObject(): THREE.Object3D | null {
    return this.selected;
  }

  setMode(mode: TransformControlsMode): void {
    this.transformControls.setMode(mode);
    this.updateHUD();
  }

  setTranslationSnap(size: number): void {
    this.transformControls.setTranslationSnap(size);
    this.updateHUD();
  }

  setRotationSnap(radians: number): void {
    this.transformControls.setRotationSnap(radians);
    this.updateHUD();
  }

  /** Must be called each frame to keep the BoxHelper in sync. */
  update(): void {
    if (this.boxHelper && this.selected) {
      this.boxHelper.update();
    }
  }

  dispose(): void {
    this.deactivate();
    const helper = this.transformControls.getHelper();
    this.threeScene.remove(helper);
    this.transformControls.dispose();

    if (this.boxHelper) {
      this.threeScene.remove(this.boxHelper);
      this.boxHelper.dispose();
      this.boxHelper = null;
    }

    if (this.hudDiv && this.hudDiv.parentElement) {
      this.hudDiv.parentElement.removeChild(this.hudDiv);
    }
    this.hudDiv = null;
  }

  // ─── Private ─────────────────────────────────────────────────

  private clearSelection(): void {
    if (this.selected) {
      this.transformControls.detach();
      this.selected = null;
    }
    if (this.boxHelper) {
      this.threeScene.remove(this.boxHelper);
      this.boxHelper.dispose();
      this.boxHelper = null;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.active) return;

    // Ignore if typing in an input
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key.toLowerCase()) {
      case 't':
        // T is already used by StatisticsUI — use Shift+T for translate in editor
        // Actually, when editor is active these keys are editor-specific
        this.setMode('translate');
        e.preventDefault();
        break;
      case 'r':
        this.setMode('rotate');
        e.preventDefault();
        break;
      case 'delete':
        this.deselectObject();
        e.preventDefault();
        break;
    }
  }

  private createHUD(): void {
    this.hudDiv = document.createElement('div');
    this.hudDiv.id = 'editor-hud';
    this.hudDiv.style.cssText = [
      'position:fixed',
      'bottom:10px',
      'left:50%',
      'transform:translateX(-50%)',
      'color:#0f0',
      'font:bold 14px monospace',
      'z-index:9999',
      'background:rgba(0,0,0,0.8)',
      'padding:8px 16px',
      'border-radius:6px',
      'border:1px solid #0f0',
      'pointer-events:none',
      'display:none',
    ].join(';');
    document.body.appendChild(this.hudDiv);
  }

  private updateHUD(): void {
    if (!this.hudDiv) return;

    if (!this.active) {
      this.hudDiv.style.display = 'none';
      return;
    }

    this.hudDiv.style.display = 'block';
    const mode = this.transformControls.getMode();
    const snap = mode === 'translate'
      ? `${this.transformControls.translationSnap ?? 'off'}`
      : mode === 'rotate'
        ? `${((this.transformControls.rotationSnap ?? 0) * 180 / Math.PI).toFixed(0)}°`
        : 'off';

    const selectedName = this.selected
      ? (this.selected.name || this.selected.uuid.slice(0, 8))
      : 'none';

    this.hudDiv.textContent = `Editor: [${mode.toUpperCase()}] | Snap: ${snap} | Selected: ${selectedName} | T=translate R=rotate DEL=deselect`;
  }
}
