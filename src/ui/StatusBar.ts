import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createNineSlice } from '../rendering/UIHelper';

/**
 * Bottom status bar showing current mode and contextual hints.
 * Uses UI_HUD_BAR NineSlice texture with Graphics fallback.
 */
export class StatusBar {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  public static readonly HEIGHT = 28;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const y = this.scene.scale.height - StatusBar.HEIGHT;
    this.container = this.scene.add.container(0, y).setDepth(910);

    // Hintergrund: UI_HUD_BAR NineSlice (volle Breite, Hoehe 28)
    const bg = createNineSlice(
      this.scene,
      0, 0,
      this.scene.scale.width, StatusBar.HEIGHT,
      'UI_HUD_BAR',
      UI_COLORS.PANEL_BG_DARK,
      0.88,
    );
    if (bg instanceof Phaser.GameObjects.NineSlice) {
      bg.setAlpha(0.88);
    }
    this.container.add(bg);

    // Status-Text (links)
    this.statusText = this.scene.add.text(70, 6, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
    });
    this.container.add(this.statusText);

    // Hint-Text (mitte)
    this.hintText = this.scene.add.text(300, 6, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
    });
    this.container.add(this.hintText);

    // ESC-Hint (rechts)
    this.container.add(
      this.scene.add.text(this.scene.scale.width - 120, 6, 'ESC = Abbrechen', {
        fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DISABLED,
      }),
    );
  }

  setStatus(mode: string, hint: string): void {
    this.statusText.setText(mode);
    this.hintText.setText(hint);
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const y = this.scene.scale.height - StatusBar.HEIGHT;
    this.container.setPosition(cam.scrollX, cam.scrollY + y);
  }

  destroy(): void {
    this.container.destroy();
  }
}
