// ============================================================
// ThreeApp.ts — Three.js Renderer (Phase 0: Parallel to Phaser)
// ============================================================
// Creates a WebGL renderer on a dedicated canvas, with orbit
// camera controls and a render loop. Does NOT touch Phaser.
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** Disposable interface for objects registered with ThreeApp. */
export interface Disposable {
  dispose(): void;
}

export class ThreeApp {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly cloudScene: THREE.Scene;  // Separate scene for clouds (no SSAO)
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly composer: EffectComposer;
  readonly ssaoPass: SSAOPass;

  private rafId = 0;
  private running = false;
  private readonly boundResize: () => void;
  private disposables: Disposable[] = [];
  private updateCallbacks: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    // ── Renderer ──────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,            // opaque — sky background via scene.background
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Shadow mapping
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Tone mapping for cinematic look
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // ── Scene ─────────────────────────────────────────────────
    this.scene = new THREE.Scene();

    // ── Procedural Sky ──────────────────────────────────────
    const sky = new Sky();
    sky.scale.setScalar(10000);
    this.scene.add(sky);

    const sunPosition = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(88);    // sun elevation (88° = near horizon)
    const theta = THREE.MathUtils.degToRad(220); // sun azimuth
    sunPosition.setFromSphericalCoords(1, phi, theta);

    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 2;           // Trübung (2 = klar)
    skyUniforms['rayleigh'].value = 1.2;          // Blau-Streuung
    skyUniforms['mieCoefficient'].value = 0.0025; // weniger Dunst
    skyUniforms['mieDirectionalG'].value = 0.72;  // dezenter Sonnen-Halo
    skyUniforms['sunPosition'].value.copy(sunPosition);

    // Separate cloud scene — rendered after SSAO to avoid artifacts
    this.cloudScene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xc9e8f0, 0.00009); // cleaner, less haze over island

    // ── Camera ────────────────────────────────────────────────
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 10000);
    this.camera.layers.enable(1); // See layer 1 (clouds) in addition to layer 0

    // Position: 45° elevation looking at grid center from the south-east
    // Grid centre = (640, 0, 576). At 45° polar, Y = dist * sin(45°), Z-offset = dist * cos(45°)
    const dist = 1400;
    const centerX = 640, centerZ = 576;
    this.camera.position.set(centerX + dist * 0.5, dist * 0.707, centerZ + dist * 0.707);
    this.camera.lookAt(centerX, 0, centerZ);

    // ── OrbitControls ─────────────────────────────────────────
    // Bind directly to the Three.js canvas (has pointer-events: auto).
    // UI elements in #game-container (z-index:2) sit above the canvas
    // (z-index:1) and intercept their own clicks.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = 0.2;   // fast senkrecht von oben
    this.controls.maxPolarAngle = 1.5;   // fast flach — frei drehen zum Testen
    this.controls.target.set(640, 0, 576);
    // Disable left-click orbit (reserved for grid picking)
    // RIGHT = rotate, MIDDLE = dolly
    this.controls.mouseButtons = {
      LEFT: undefined as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.update();

    // ── Post-Processing ─────────────────────────────────────────
    // SSAO disabled — conflicts with transparent cloud sprites (black outlines).
    // Shadows from DirectionalLight provide sufficient ambient occlusion.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ssaoPass = null as unknown as SSAOPass; // kept for type compat
    this.composer.addPass(new OutputPass());

    // ── Resize handler (bound once, removable on dispose) ─────
    this.boundResize = this.resize.bind(this);
    window.addEventListener('resize', this.boundResize);
  }

  /** Begin the render loop. */
  start(): void {
    if (this.running) return;
    this.running = true;

    // Camera angle HUD overlay
    let angleDiv = document.getElementById('camera-angle-hud');
    if (!angleDiv) {
      angleDiv = document.createElement('div');
      angleDiv.id = 'camera-angle-hud';
      angleDiv.style.cssText = 'position:fixed;top:40px;right:10px;color:#0f0;font:bold 16px monospace;z-index:9999;background:rgba(0,0,0,0.7);padding:6px 10px;border-radius:4px;pointer-events:none;';
      document.body.appendChild(angleDiv);
    }

    const loop = (): void => {
      if (!this.running) return;
      this.controls.update();
      for (const cb of this.updateCallbacks) cb();

      this.composer.render();

      // Show current polar angle in degrees
      const polarRad = this.controls.getPolarAngle();
      const polarDeg = Math.round(polarRad * 180 / Math.PI);
      const elevationDeg = 90 - polarDeg; // elevation from ground
      if (angleDiv) {
        angleDiv.textContent = `Kamera: ${elevationDeg}° (polar: ${polarDeg}°)`;
      }

      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  /** Handle window resize. */
  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  /** Register a disposable that will be cleaned up when ThreeApp is disposed. */
  addDisposable(d: Disposable): void {
    this.disposables.push(d);
  }

  /** Register a callback to run every frame before rendering. */
  addUpdateCallback(fn: () => void): void {
    this.updateCallbacks.push(fn);
  }

  /** Stop the render loop and release GPU resources. */
  dispose(): void {
    // Cancel RAF first to guarantee no further frames are rendered
    cancelAnimationFrame(this.rafId);
    this.running = false;

    // Clear update callbacks
    this.updateCallbacks = [];

    // Dispose all registered disposables first
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];

    window.removeEventListener('resize', this.boundResize);
    this.controls.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
