import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { CITY_EVENT_DEFS } from '../data/cityEvents';
import { createNineSlice } from '../rendering/UIHelper';

/**
 * Floating banner that shows active city events.
 * Appears at top-center of screen when an event is active.
 * Shows event name, description, timer, and action button (for trades).
 */
export class CityEventBanner {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private actionBtn!: Phaser.GameObjects.Container | null;
  private visible = false;

  /** Callback for accepting a trade. */
  onAcceptTrade: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const screenW = this.scene.scale.width;
    const bannerW = 360;
    const bannerH = 80;
    const bannerX = (screenW - bannerW) / 2;

    this.container = this.scene.add.container(bannerX, 40).setDepth(950);
    this.container.setVisible(false);

    // Background
    const bg = createNineSlice(
      this.scene, 0, 0, bannerW, bannerH,
      'UI_PANEL_BG', UI_COLORS.PANEL_BG, 0.95,
    );
    this.container.add(bg);

    // Border
    const border = this.scene.add.graphics();
    border.lineStyle(2, UI_COLORS.PANEL_BORDER, 1);
    border.strokeRoundedRect(0, 0, bannerW, bannerH, 6);
    this.container.add(border);

    // Event name
    this.nameText = this.scene.add.text(bannerW / 2, 12, '', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.GOLD,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(this.nameText);

    // Description
    this.descText = this.scene.add.text(bannerW / 2, 32, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT,
      wordWrap: { width: bannerW - 20 },
    }).setOrigin(0.5, 0);
    this.container.add(this.descText);

    // Timer
    this.timerText = this.scene.add.text(bannerW - 10, 60, '', {
      fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DIM,
    }).setOrigin(1, 0);
    this.container.add(this.timerText);

    this.actionBtn = null;
  }

  refresh(state: GameState): void {
    if (!state.activeEvent) {
      if (this.visible) {
        this.container.setVisible(false);
        this.visible = false;
      }
      return;
    }

    const event = CITY_EVENT_DEFS[state.activeEvent.eventId];
    if (!event) return;

    this.nameText.setText(event.name);
    this.descText.setText(event.description);
    this.timerText.setText(`${Math.ceil(state.activeEvent.remainingSec)}s`);

    // Show trade button for merchant events
    if (event.tags.includes('trade') && !state.activeEvent.accepted) {
      if (!this.actionBtn) {
        const btn = this.scene.add.container(10, 55);
        const btnBg = this.scene.add.graphics();
        btnBg.fillStyle(UI_COLORS.GOLD_MID, 1);
        btnBg.fillRoundedRect(0, 0, 80, 22, 4);
        btn.add(btnBg);
        const btnText = this.scene.add.text(40, 11, 'Kaufen', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: '#000000',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        btn.add(btnText);
        btnBg.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, 80, 22),
          Phaser.Geom.Rectangle.Contains,
        );
        btnBg.on('pointerdown', () => {
          if (this.onAcceptTrade) this.onAcceptTrade();
        });
        this.container.add(btn);
        this.actionBtn = btn;
      }
      this.actionBtn.setVisible(true);
    } else if (this.actionBtn) {
      this.actionBtn.setVisible(false);
    }

    // Show "Angenommen" text if trade was accepted
    if (state.activeEvent.accepted && this.actionBtn) {
      this.actionBtn.setVisible(false);
    }

    if (!this.visible) {
      this.container.setVisible(true);
      this.visible = true;
    }
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const screenW = this.scene.scale.width;
    const bannerW = 360;
    this.container.setPosition(
      cam.scrollX + (screenW - bannerW) / 2,
      cam.scrollY + 40,
    );
  }

  isVisible(): boolean {
    return this.visible;
  }
}
