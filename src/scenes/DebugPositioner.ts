// ─── Magic City – DebugPositioner ───────────────────────────────────────────
// Handles interactive debug positioning of the dungeon mountain and camp sprites.
// Extracted from CityScene to reduce God-Object surface; no logic changes.
// ─────────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import {
  gridToIso,
  ISO_TILE_W, ISO_TILE_HALF_W, ISO_TILE_HALF_H,
} from '../rendering/IsoRenderer';

export class DebugPositioner {
  private scene: Phaser.Scene;

  // Mountain sprite (placed on scene init; kept here for position updates)
  private mountSprite: Phaser.GameObjects.Image | null = null;

  // Active debug mode
  private _mode: 'mountain' | 'camp' | null = null;

  // Mountain position
  private mountGx = 2.5;
  private mountGy = 15.5;

  // Camp position
  private campDebugGx = 4;
  private campDebugGy = 16;
  private campGhostSprite: Phaser.GameObjects.Image | null = null;

  // Overlay text
  private debugOverlayText: Phaser.GameObjects.Text | null = null;
  private debugKeyTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Called by CityScene after placeDungeonMountain() to hand over the sprite
   * so DebugPositioner can reposition it during debug movement.
   */
  setMountSprite(sprite: Phaser.GameObjects.Image | null): void {
    this.mountSprite = sprite;
  }

  // ── Public API ──────────────────────────────────────────────────

  toggle(mode: 'mountain' | 'camp'): void {
    if (this._mode === mode) {
      this._mode = null;
      this.debugOverlayText?.destroy();
      this.debugOverlayText = null;
      this.campGhostSprite?.destroy();
      this.campGhostSprite = null;
      return;
    }
    this._mode = mode;
    this.debugKeyTimer = 9999;

    const cam = this.scene.cameras.main;
    const x = cam.scrollX + 100;
    const y = cam.scrollY + cam.height - 80;
    this.debugOverlayText = this.scene.add.text(x, y, '', {
      fontSize: '14px', color: '#FFE066',
      backgroundColor: '#000000CC', padding: { x: 8, y: 6 },
    }).setDepth(1200).setScrollFactor(0);

    if (mode === 'camp') {
      const campKey = this.scene.textures.exists('ISO_DUNGEON_CAMP_V2') ? 'ISO_DUNGEON_CAMP_V2' : 'ISO_DUNGEON_CAMP';
      if (this.scene.textures.exists(campKey)) {
        const fp = 4;
        const spriteW = (fp + fp) * ISO_TILE_HALF_W;
        const spriteH = spriteW * 1.15;
        const iso = gridToIso(this.campDebugGx + fp / 2, this.campDebugGy + fp / 2);
        this.campGhostSprite = this.scene.add.image(iso.x, iso.y + ISO_TILE_HALF_H - spriteH * 0.22, campKey)
          .setDisplaySize(spriteW, spriteH)
          .setDepth(999).setOrigin(0.5, 0.5).setAlpha(0.6).setTint(0x88AAFF);
      }
    }
    this.updateDebugOverlay();
  }

  handleMovement(delta: number, cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    this.debugKeyTimer += delta;
    const firstPress = this.debugKeyTimer > 350;
    const repeat     = this.debugKeyTimer > 100;
    if (!firstPress && !repeat) return;

    const shift = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).isDown;
    const step  = this._mode === 'camp' ? 1 : (shift ? 0.1 : 0.5);

    let moved = false;
    if (cursors.up.isDown)    { this.adjustDebugPos(-step, -step); moved = true; }
    if (cursors.down.isDown)  { this.adjustDebugPos(+step, +step); moved = true; }
    if (cursors.left.isDown)  { this.adjustDebugPos(-step, +step); moved = true; }
    if (cursors.right.isDown) { this.adjustDebugPos(+step, -step); moved = true; }

    if (moved) {
      this.debugKeyTimer = 0;
      this.updateDebugSprite();
      this.updateDebugOverlay();
    }
  }

  copyPosition(): void {
    let text = '';
    if (this._mode === 'mountain') {
      text = `Berg: gridToIso(${this.mountGx}, ${this.mountGy})`;
    } else if (this._mode === 'camp') {
      text = `Lager: gx=${this.campDebugGx}, gy=${this.campDebugGy}`;
    }
    navigator.clipboard.writeText(text).then(() => {
      if (this.debugOverlayText) {
        const prev = this.debugOverlayText.text;
        this.debugOverlayText.setText('✓ In Zwischenablage kopiert!\n' + text);
        this.scene.time.delayedCall(1500, () => {
          this.debugOverlayText?.setText(prev);
        });
      }
    }).catch(() => console.log('[DEBUG position]', text));
    console.log('[DEBUG position]', text);
  }

  isActive(): boolean {
    return this._mode !== null;
  }

  getMode(): 'mountain' | 'camp' | null {
    return this._mode;
  }

  // ── Private helpers ─────────────────────────────────────────────

  private adjustDebugPos(dgx: number, dgy: number): void {
    if (this._mode === 'mountain') {
      this.mountGx = Math.round((this.mountGx + dgx) * 10) / 10;
      this.mountGy = Math.round((this.mountGy + dgy) * 10) / 10;
    } else if (this._mode === 'camp') {
      this.campDebugGx = Math.round(this.campDebugGx + dgx);
      this.campDebugGy = Math.round(this.campDebugGy + dgy);
    }
  }

  private updateDebugSprite(): void {
    if (this._mode === 'mountain' && this.mountSprite) {
      const iso = gridToIso(this.mountGx, this.mountGy);
      this.mountSprite.setPosition(iso.x, iso.y + ISO_TILE_HALF_H);
      this.mountSprite.setDepth((this.mountGx + this.mountGy) * 10 - 5);
    } else if (this._mode === 'camp' && this.campGhostSprite) {
      const fp = 4;
      const spriteH = (fp + fp) * ISO_TILE_HALF_W * 1.15;
      const iso = gridToIso(this.campDebugGx + fp / 2, this.campDebugGy + fp / 2);
      this.campGhostSprite.setPosition(iso.x, iso.y + ISO_TILE_HALF_H - spriteH * 0.22);
      this.campGhostSprite.setDepth((this.campDebugGx + fp + this.campDebugGy + fp) * 10 + 5);
    }
  }

  private updateDebugOverlay(): void {
    if (!this.debugOverlayText) return;
    if (this._mode === 'mountain') {
      const gx = this.mountGx.toFixed(1);
      const gy = this.mountGy.toFixed(1);
      this.debugOverlayText.setText(
        `[F2] BERG-MODUS | gx=${gx}  gy=${gy}\n` +
        `[←→↑↓] Bewegen (Shift = fein 0.1)  |  [C] Kopieren  |  [F2] Beenden`
      );
    } else if (this._mode === 'camp') {
      this.debugOverlayText.setText(
        `[F4] LAGER-MODUS | gx=${this.campDebugGx}  gy=${this.campDebugGy}\n` +
        `[←→↑↓] Bewegen  |  [C] Kopieren  |  [F4] Beenden`
      );
    }
  }
}
