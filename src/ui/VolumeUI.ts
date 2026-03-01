import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createPanel, createButton } from '../rendering/UIHelper';
import { SoundManager } from '../systems/SoundManager';

const PANEL_W = 200;
const PANEL_H = 148;
const MARGIN = 12;
const BAR_W = 140;
const BAR_H = 8;
const HANDLE_SIZE = 12;

/**
 * Kleines Lautstaerke-Panel mit SFX- und Musik-Slider und Stumm-Button.
 * Tastenkuerzel: M toggelt Sichtbarkeit.
 * Position: oben rechts (screenW - 220, 40).
 * Nutzt das updatePosition(cam) Pattern wie alle anderen UI-Panels.
 */
export class VolumeUI {
  private scene: Phaser.Scene;
  private soundManager: SoundManager;
  private container!: Phaser.GameObjects.Container;

  private screenX = 0;
  private screenY = 0;

  // Slider-Referenzen (SFX)
  private sfxFill!: Phaser.GameObjects.Graphics;
  private sfxHandle!: Phaser.GameObjects.Rectangle;
  private sfxLabel!: Phaser.GameObjects.Text;

  // Slider-Referenzen (Musik)
  private musicFill!: Phaser.GameObjects.Graphics;
  private musicHandle!: Phaser.GameObjects.Rectangle;
  private musicLabel!: Phaser.GameObjects.Text;

  // Stumm-Button
  private muteBtn!: ReturnType<typeof createButton>;

  // Keyboard-Listener
  private mKey!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, soundManager: SoundManager) {
    this.scene = scene;
    this.soundManager = soundManager;
    this.create();
    this.setupKeyboard();
  }

  // ─── Oeffentliche API ───────────────────────────────────────

  show(): void {
    this.syncFromSoundManager();
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  toggle(): void {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z = cam.zoom;
    this.container.setPosition(cam.worldView.x + this.screenX / z, cam.worldView.y + this.screenY / z);
    this.container.setScale(1 / z);
  }

  destroy(): void {
    this.mKey?.destroy();
    this.container.destroy();
  }

  // ─── Privat: Aufbau ─────────────────────────────────────────

  private create(): void {
    const sw = this.scene.scale.width;
    this.screenX = sw - PANEL_W - 20;
    this.screenY = 40;

    this.container = this.scene.add.container(this.screenX, this.screenY)
      .setDepth(960)
      .setVisible(false);

    // Hintergrund (NineSlice via createPanel)
    const bg = createPanel(this.scene, 0, 0, PANEL_W, PANEL_H, {
      alpha: 0.96,
      fallbackColor: UI_COLORS.PANEL_BG_DARK,
    });
    this.container.add(bg);

    // Titel
    this.container.add(
      this.scene.add.text(PANEL_W / 2, 10, 'Lautst\u00e4rke', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: UI_STR_COLORS.GOLD,
      }).setOrigin(0.5, 0),
    );

    // Schliessen-Button
    const closeBtn = createButton(this.scene, {
      x: PANEL_W - 28, y: 6,
      width: 22, height: 20,
      label: 'X',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.DAMAGE },
      onClick: () => this.hide(),
    });
    this.container.add(closeBtn.container);

    // ── SFX-Slider ─────────────────────────────────────────────
    const sfxY = 36;
    this.sfxLabel = this.scene.add.text(MARGIN, sfxY, 'Effekte: 50%', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
    });
    this.container.add(this.sfxLabel);

    const [sfxBar, sfxFill, sfxHandle] = this.buildSlider(
      MARGIN, sfxY + 16,
      this.soundManager.getSFXVolume(),
      (pct) => {
        this.soundManager.setSFXVolume(pct);
        this.sfxLabel.setText(`Effekte: ${Math.round(pct * 100)}%`);
      },
    );
    this.sfxFill = sfxFill;
    this.sfxHandle = sfxHandle;
    this.container.add(sfxBar);

    // ── Musik-Slider ────────────────────────────────────────────
    const musicY = 76;
    this.musicLabel = this.scene.add.text(MARGIN, musicY, 'Musik: 30%', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
    });
    this.container.add(this.musicLabel);

    const [musicBar, musicFill, musicHandle] = this.buildSlider(
      MARGIN, musicY + 16,
      this.soundManager.getMusicVolume(),
      (pct) => {
        this.soundManager.setMusicVolume(pct);
        this.musicLabel.setText(`Musik: ${Math.round(pct * 100)}%`);
      },
    );
    this.musicFill = musicFill;
    this.musicHandle = musicHandle;
    this.container.add(musicBar);

    // ── Stumm-Button ────────────────────────────────────────────
    this.muteBtn = createButton(this.scene, {
      x: PANEL_W / 2 - 36, y: PANEL_H - 34,
      width: 72, height: 24,
      label: this.soundManager.isMuted ? 'Ton an' : 'Stumm',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT },
      onClick: () => {
        this.soundManager.toggleMute();
        this.muteBtn.setLabel(this.soundManager.isMuted ? 'Ton an' : 'Stumm');
      },
    });
    this.container.add(this.muteBtn.container);
  }

  /**
   * Baut einen horizontalen Slider.
   * Gibt [container, fillGraphics, handle] zurueck.
   */
  private buildSlider(
    x: number,
    y: number,
    initialPct: number,
    onChange: (pct: number) => void,
  ): [Phaser.GameObjects.Container, Phaser.GameObjects.Graphics, Phaser.GameObjects.Rectangle] {
    const sliderContainer = this.scene.add.container(x, y);

    // Hintergrundleiste
    const bgBar = this.scene.add.graphics();
    bgBar.fillStyle(UI_COLORS.PROGRESS_BG, 1);
    bgBar.fillRoundedRect(0, 0, BAR_W, BAR_H, 3);
    bgBar.lineStyle(1, UI_COLORS.PROGRESS_BORDER, 0.8);
    bgBar.strokeRoundedRect(0, 0, BAR_W, BAR_H, 3);
    sliderContainer.add(bgBar);

    // Fuell-Leiste (gold)
    const fill = this.scene.add.graphics();
    this.drawFill(fill, initialPct);
    sliderContainer.add(fill);

    // Handle – klickbares/draggbares Rechteck
    const handleX = initialPct * BAR_W - HANDLE_SIZE / 2;
    const handle = this.scene.add.rectangle(
      handleX + HANDLE_SIZE / 2,
      BAR_H / 2,
      HANDLE_SIZE, HANDLE_SIZE,
      UI_COLORS.PANEL_BORDER, 1,
    ).setOrigin(0.5);

    handle.setInteractive({ draggable: true, useHandCursor: true });

    // Interaktive Hintergrundleiste (Klick zum Setzen)
    const hitZone = this.scene.add.rectangle(BAR_W / 2, BAR_H / 2, BAR_W, HANDLE_SIZE + 4, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      // ptr.x ist Bildschirm-X; container.x + x ergibt den Balken-Ursprung in Welt-Koordinaten
      const barWorldX = this.container.x + x;
      const pct = Phaser.Math.Clamp((ptr.x - barWorldX) / BAR_W, 0, 1);
      handle.setX(pct * BAR_W);
      this.drawFill(fill, pct);
      onChange(pct);
    });

    this.scene.input.on('drag', (ptr: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj !== handle) return;
      // ptr.x ist Bildschirm-X; container.x und sliderContainer-Offset x addiert ergeben den Ursprung des Balkens
      const barWorldX = this.container.x + x;
      const pct = Phaser.Math.Clamp((ptr.x - barWorldX) / BAR_W, 0, 1);
      handle.setX(pct * BAR_W);
      this.drawFill(fill, pct);
      onChange(pct);
    });

    sliderContainer.add(hitZone);
    sliderContainer.add(handle);

    return [sliderContainer, fill, handle];
  }

  private drawFill(g: Phaser.GameObjects.Graphics, pct: number): void {
    g.clear();
    const w = Math.max(0, pct * BAR_W);
    if (w > 0) {
      g.fillStyle(UI_COLORS.PANEL_BORDER, 1); // amber-gold
      g.fillRoundedRect(0, 0, w, BAR_H, 3);
    }
  }

  // ─── Keyboard ───────────────────────────────────────────────

  private setupKeyboard(): void {
    if (!this.scene.input.keyboard) return;
    this.mKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.mKey.on('down', () => {
      this.toggle();
    });
  }

  // ─── Sync ───────────────────────────────────────────────────

  /**
   * Synchronisiert Slider-Positionen und Labels aus dem aktuellen SoundManager-Zustand.
   * Wird bei show() aufgerufen damit die UI immer aktuell ist.
   */
  private syncFromSoundManager(): void {
    const sfxPct = this.soundManager.getSFXVolume();
    const musicPct = this.soundManager.getMusicVolume();

    this.drawFill(this.sfxFill, sfxPct);
    this.sfxHandle.setX(sfxPct * BAR_W);
    this.sfxLabel.setText(`Effekte: ${Math.round(sfxPct * 100)}%`);

    this.drawFill(this.musicFill, musicPct);
    this.musicHandle.setX(musicPct * BAR_W);
    this.musicLabel.setText(`Musik: ${Math.round(musicPct * 100)}%`);

    this.muteBtn.setLabel(this.soundManager.isMuted ? 'Ton an' : 'Stumm');
  }
}
