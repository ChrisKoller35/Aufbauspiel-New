import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';

const BAR_H = 36;

// Mode → Icon-Emoji Mapping
const MODE_ICONS: Record<string, string> = {
  'Baumodus':        '🏗',
  'Straßenmodus':    '🛤',
  'Abreißmodus':     '🔨',
  'Expeditionsmodus':'⚔',
};

const MODE_COLORS: Record<string, string> = {
  'Baumodus':        UI_STR_COLORS.HEAL,
  'Straßenmodus':    UI_STR_COLORS.INFO,
  'Abreißmodus':     UI_STR_COLORS.DAMAGE,
  'Expeditionsmodus': UI_STR_COLORS.GOLD,
};

/**
 * Bottom status bar – Navy-Dark Redesign 2026.
 * Gradient-BG, Mode-Icon, ESC-Badge.
 */
export class StatusBar {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private statusIcon!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!:   Phaser.GameObjects.Text;

  public static readonly HEIGHT = BAR_H;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const sw = this.scene.scale.width;
    const y  = this.scene.scale.height - BAR_H;
    this.container = this.scene.add.container(0, y).setDepth(910);

    // ── Hintergrund: Navy mit Gradient-Simulation ──
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_COLORS.NAVY_PANEL, 1);
    bg.fillRect(0, 0, sw, BAR_H);
    // Dünner hellerer Streifen oben
    bg.fillStyle(UI_COLORS.NAVY_CARD, 0.4);
    bg.fillRect(0, 0, sw, 8);
    // Obere Trennlinie: Doppelt (amber-glow)
    bg.lineStyle(2, UI_COLORS.GOLD_DECO_DIM, 0.5);
    bg.lineBetween(0, 0, sw, 0);
    bg.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.6);
    bg.lineBetween(0, 1, sw, 1);
    this.container.add(bg);

    // ── Mode-Icon (links neben Status) ──
    this.statusIcon = this.scene.add.text(76, BAR_H / 2, '', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.GOLD,
    }).setOrigin(0, 0.5);
    this.container.add(this.statusIcon);

    // ── Status-Text ──
    this.statusText = this.scene.add.text(96, BAR_H / 2, '', {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.container.add(this.statusText);

    // ── Hint-Text (mitte) ──
    this.hintText = this.scene.add.text(sw / 2, BAR_H / 2, '', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM,
    }).setOrigin(0.5, 0.5);
    this.container.add(this.hintText);

    // ── ESC Badge (rechts) ──
    const escX = sw - 110;
    const escBg = this.scene.add.graphics();
    escBg.fillStyle(UI_COLORS.NAVY_DEEP, 0.9);
    escBg.fillRoundedRect(escX, 6, 100, 24, 4);
    escBg.lineStyle(1, UI_COLORS.NAVY_SEPARATOR, 1);
    escBg.strokeRoundedRect(escX, 6, 100, 24, 4);
    this.container.add(escBg);
    this.container.add(
      this.scene.add.text(escX + 50, BAR_H / 2, 'ESC = Abbrechen', {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.DISABLED,
      }).setOrigin(0.5, 0.5),
    );
  }

  setStatus(mode: string, hint: string): void {
    const icon  = MODE_ICONS[mode]  ?? '';
    const color = MODE_COLORS[mode] ?? UI_STR_COLORS.LIGHT;
    this.statusIcon.setText(icon);
    this.statusText.setText(mode).setColor(color);
    this.hintText.setText(hint);
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z = cam.zoom;
    const y = this.scene.scale.height - BAR_H;
    this.container.setPosition(cam.worldView.x, cam.worldView.y + y / z);
    this.container.setScale(1 / z);
  }

  destroy(): void {
    this.container.destroy();
  }
}
