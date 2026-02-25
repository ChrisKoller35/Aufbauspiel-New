import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { ACHIEVEMENT_DEFS } from '../data/achievements';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createPanel, createButton, createNineSlice, createDivider } from '../rendering/UIHelper';

/**
 * Errungenschaften-Modal: Zeigt alle 12 Achievements an.
 * Freigeschaltete: goldener Rahmen + voller Text.
 * Gesperrte: ausgegraut, Beschreibung versteckt ("???").
 * Layout: 2 Spalten x 6 Zeilen.
 * Depth 975.
 */
export class AchievementUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private contentContainer!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;

  public onClose?: () => void;

  private panelW = 520;
  private panelH = 500;
  private screenX: number = 0;
  private screenY: number = 0;

  // Karten-Abmessungen
  private cardW = 220;
  private cardH = 58;
  private cardCols = 2;
  private cardGapX = 16;
  private cardGapY = 8;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.container.setPosition(cam.scrollX + this.screenX, cam.scrollY + this.screenY);
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  private create(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    this.screenX = cx - this.panelW / 2;
    this.screenY = cy - this.panelH / 2;

    this.container = this.scene.add.container(this.screenX, this.screenY)
      .setDepth(975)
      .setVisible(false);

    // Panel-Hintergrund
    const bg = createPanel(this.scene, 0, 0, this.panelW, this.panelH, {
      alpha: 0.96,
      fallbackColor: UI_COLORS.PANEL_BG_DARK,
    });
    this.container.add(bg);

    // Titel (mit Zaehler – wird beim show() aktualisiert)
    this.titleText = this.scene.add.text(this.panelW / 2, 12, 'Errungenschaften', {
      fontFamily: FONT_FAMILY, fontSize: '18px', color: UI_STR_COLORS.GOLD,
    }).setOrigin(0.5, 0);
    this.container.add(this.titleText);

    // Schliessen-Button
    const closeBtn = createButton(this.scene, {
      x: this.panelW - 38, y: 6,
      width: 30, height: 24,
      label: 'X',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.DAMAGE },
      onClick: () => this.hide(),
    });
    this.container.add(closeBtn.container);

    // Content-Container
    this.contentContainer = this.scene.add.container(0, 44);
    this.container.add(this.contentContainer);
  }

  show(state: GameState): void {
    this.rebuildContent(state);
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
    this.onClose?.();
  }

  private rebuildContent(state: GameState): void {
    this.contentContainer.removeAll(true);

    const unlockedIds = state.achievements ?? [];
    const totalAchievements = ACHIEVEMENT_DEFS.length;
    const unlockedCount = ACHIEVEMENT_DEFS.filter(a => unlockedIds.includes(a.id)).length;

    // Titel mit Zaehler
    this.titleText.setText(`Errungenschaften  ${unlockedCount}/${totalAchievements}`);

    const left = 20;
    const colW = this.cardW;
    const totalRowsNeeded = Math.ceil(ACHIEVEMENT_DEFS.length / this.cardCols);

    // Trennlinie
    const divider = createDivider(this.scene, left, 0, this.panelW - 40);
    this.contentContainer.add(divider);

    let y = 10;

    for (let row = 0; row < totalRowsNeeded; row++) {
      for (let col = 0; col < this.cardCols; col++) {
        const idx = row * this.cardCols + col;
        if (idx >= ACHIEVEMENT_DEFS.length) break;

        const def = ACHIEVEMENT_DEFS[idx];
        const isUnlocked = unlockedIds.includes(def.id);
        const cardX = left + col * (colW + this.cardGapX);

        this.renderAchievementCard(cardX, y, def.name, def.description, isUnlocked);
      }
      y += this.cardH + this.cardGapY;
    }

    // Panel-Hoehe anpassen
    this.panelH = Math.max(300, 44 + y + 20);
    this.redrawBackground();
  }

  private renderAchievementCard(
    x: number,
    y: number,
    name: string,
    description: string,
    isUnlocked: boolean,
  ): void {
    const w = this.cardW;
    const h = this.cardH;

    // Karten-Hintergrund
    const cardBgColor = isUnlocked ? UI_COLORS.CARD_BG_LIGHT : UI_COLORS.CARD_BG;
    const cardBg = createNineSlice(
      this.scene, x, y, w, h,
      'UI_CARD_BG', cardBgColor,
    );
    this.contentContainer.add(cardBg);

    // Goldener Rahmen fuer freigeschaltete Achievements
    if (isUnlocked) {
      if (this.scene.textures.exists('UI_FRAME_GOLD')) {
        const frame = createNineSlice(
          this.scene, x, y, w, h,
          'UI_FRAME_GOLD', UI_COLORS.PANEL_BORDER,
        );
        this.contentContainer.add(frame);
      } else {
        // Fallback: goldene Umrandung
        const borderG = this.scene.add.graphics();
        borderG.lineStyle(2, UI_COLORS.PANEL_BORDER, 0.9);
        borderG.strokeRoundedRect(x, y, w, h, 6);
        this.contentContainer.add(borderG);
      }
    }

    // Status-Icon (links)
    const iconText = isUnlocked ? '★' : '□';
    const iconColor = isUnlocked ? UI_STR_COLORS.GOLD : UI_STR_COLORS.DISABLED;
    this.contentContainer.add(
      this.scene.add.text(x + 8, y + h / 2, iconText, {
        fontFamily: FONT_FAMILY, fontSize: '16px', color: iconColor,
      }).setOrigin(0, 0.5),
    );

    const textX = x + 28;
    const textW = w - 36;

    // Name
    const nameColor = isUnlocked ? UI_STR_COLORS.LIGHT : UI_STR_COLORS.DIM;
    this.contentContainer.add(
      this.scene.add.text(textX, y + 8, name, {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: nameColor,
        fontStyle: isUnlocked ? 'bold' : 'normal',
      }),
    );

    // Beschreibung (oder "???" wenn gesperrt)
    const descText = isUnlocked ? description : '???';
    const descColor = isUnlocked ? UI_STR_COLORS.DIM : UI_STR_COLORS.DISABLED;
    this.contentContainer.add(
      this.scene.add.text(textX, y + 26, descText, {
        fontFamily: FONT_FAMILY, fontSize: '10px', color: descColor,
        wordWrap: { width: textW },
      }),
    );

    // "Freigeschaltet!" Badge fuer unlocked
    if (isUnlocked) {
      this.contentContainer.add(
        this.scene.add.text(x + w - 6, y + h - 12, 'Erhalten!', {
          fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.GOLD,
        }).setOrigin(1, 1),
      );
    }
  }

  private redrawBackground(): void {
    const bg = this.container.getAt(0);
    if (bg instanceof Phaser.GameObjects.NineSlice) {
      bg.setSize(this.panelW, this.panelH);
    } else if (bg instanceof Phaser.GameObjects.Graphics) {
      bg.clear();
      bg.fillStyle(UI_COLORS.PANEL_BG_DARK, 0.96);
      bg.fillRoundedRect(0, 0, this.panelW, this.panelH, 8);
      bg.lineStyle(2, UI_COLORS.PANEL_BORDER, 1);
      bg.strokeRoundedRect(0, 0, this.panelW, this.panelH, 8);
    }

    // Position neu zentrieren
    const cy = this.scene.scale.height / 2;
    this.screenY = cy - this.panelH / 2;

    const cam = this.scene.cameras.main;
    this.container.setPosition(cam.scrollX + this.screenX, cam.scrollY + this.screenY);
  }
}
