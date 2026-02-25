import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';

/**
 * Hover tooltip that follows the mouse.
 */
export class Tooltip {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.bg = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', {
      fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
      wordWrap: { width: 200 },
    });

    this.container = scene.add.container(0, 0, [this.bg, this.text])
      .setDepth(1500)
      .setVisible(false);
  }

  show(x: number, y: number, content: string): void {
    this.text.setText(content);
    this.text.setPosition(8, 6);

    const w = this.text.width + 16;
    const h = this.text.height + 12;

    this.bg.clear();
    this.bg.fillStyle(UI_COLORS.PANEL_BG_DARK, 0.95);
    this.bg.fillRoundedRect(0, 0, w, h, 4);
    this.bg.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.6);
    this.bg.strokeRoundedRect(0, 0, w, h, 4);

    // Position in world space relative to camera
    const cam = this.scene.cameras.main;
    const sx = Math.min(x, this.scene.scale.width - w - 4);
    const sy = Math.min(y, this.scene.scale.height - h - 4);
    this.container.setPosition(cam.scrollX + sx, cam.scrollY + sy);
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}
