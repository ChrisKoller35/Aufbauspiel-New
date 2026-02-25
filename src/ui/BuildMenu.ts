import Phaser from 'phaser';
import { BUILDING_DEFS, BUILD_MENU_ORDER } from '../data/buildings';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createNineSlice, createButton, UIButton } from '../rendering/UIHelper';
import { StatusBar } from './StatusBar';
import { Sidebar } from './Sidebar';

export type BuildMode = 'none' | 'build' | 'road' | 'demolish';

export class BuildMenu {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Container[] = [];
  private selectedTypeId: string | null = null;
  private modeButtonRefs: UIButton[] = [];
  private modeButtons: Phaser.GameObjects.Container[] = [];
  public currentMode: BuildMode = 'none';
  public onSelectBuilding?: (typeId: string | null) => void;
  public onModeChange?: (mode: BuildMode) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private screenY!: number;

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.container.setPosition(cam.scrollX, cam.scrollY + this.screenY);
  }

  private create(): void {
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;
    this.screenY = screenH - 60 - StatusBar.HEIGHT;
    this.container = this.scene.add.container(0, this.screenY).setDepth(900);

    // ── Background bar (NineSlice or Graphics fallback) ──
    const bg = createNineSlice(
      this.scene, 0, 0, screenW, 60,
      'UI_BUILDMENU_BG',
      UI_COLORS.PANEL_BG, 0.9,
    );
    this.container.add(bg);
    // For Graphics fallback, add top border line
    if (bg instanceof Phaser.GameObjects.Graphics) {
      bg.lineStyle(2, UI_COLORS.PANEL_BORDER, 1);
      bg.lineBetween(0, 0, screenW, 0);
    }

    // ── Mode buttons: Build, Road, Demolish ──
    const modes: { label: string; mode: BuildMode }[] = [
      { label: 'Bauen [B]', mode: 'build' },
      { label: 'Strasse [R]', mode: 'road' },
      { label: 'Abriss [D]', mode: 'demolish' },
    ];

    modes.forEach((m, i) => {
      const uiBtn = createButton(this.scene, {
        x: Sidebar.WIDTH + 10 + i * 100,
        y: 8,
        width: 90,
        height: 44,
        label: m.label,
        textStyle: { fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT },
        onClick: () => {
          if (this.currentMode === m.mode) {
            this.setMode('none');
          } else {
            this.setMode(m.mode);
          }
        },
      });
      this.container.add(uiBtn.container);
      this.modeButtonRefs.push(uiBtn);
      this.modeButtons.push(uiBtn.container);
    });

    // ── Cancel hint ──
    const cancelText = this.scene.add.text(screenW - 140, 20, 'ESC = Abbrechen', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
    });
    this.container.add(cancelText);

    // ── Building palette (hidden until build mode) ──
    this.createBuildingPalette();
  }

  private createBuildingPalette(): void {
    BUILD_MENU_ORDER.forEach((typeId, i) => {
      const def = BUILDING_DEFS[typeId];
      const x = Sidebar.WIDTH + 320 + i * 70;
      const cardW = 64;
      const cardH = 50;

      const btn = this.scene.add.container(x, 5);

      // Card background (NineSlice or Graphics fallback)
      const cardBg = createNineSlice(
        this.scene, 0, 0, cardW, cardH,
        'UI_CARD_BG',
        UI_COLORS.BTN_DARK, 1.0,
      );
      btn.add(cardBg);

      // Try to use sprite, fallback to text
      let icon: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
      if (this.scene.textures.exists(def.spriteKey)) {
        icon = this.scene.add.image(32, 20, def.spriteKey)
          .setDisplaySize(34, 34);
      } else {
        icon = this.scene.add.text(32, 18, typeId.substring(0, 3), {
          fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
        }).setOrigin(0.5);
      }

      const label = this.scene.add.text(32, 44, def.name.substring(0, 8), {
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
      }).setOrigin(0.5);

      btn.add([icon, label]);
      btn.setVisible(false);

      btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, cardW, cardH), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerdown', () => {
        this.selectedTypeId = typeId;
        this.onSelectBuilding?.(typeId);
      });

      // Hover: swap texture if NineSlice, else redraw Graphics
      btn.on('pointerover', () => {
        if (cardBg instanceof Phaser.GameObjects.NineSlice) {
          // Slightly brighten via tint
          cardBg.setTint(0xBBBBBB);
        } else {
          (cardBg as Phaser.GameObjects.Graphics).clear()
            .fillStyle(UI_COLORS.BTN_DARK_HOVER, 1)
            .fillRoundedRect(0, 0, cardW, cardH, 6);
          (cardBg as Phaser.GameObjects.Graphics).lineStyle(2, UI_COLORS.PANEL_BORDER, 0.6);
          (cardBg as Phaser.GameObjects.Graphics).strokeRoundedRect(0, 0, cardW, cardH, 6);
        }
      });
      btn.on('pointerout', () => {
        if (cardBg instanceof Phaser.GameObjects.NineSlice) {
          cardBg.clearTint();
        } else {
          (cardBg as Phaser.GameObjects.Graphics).clear()
            .fillStyle(UI_COLORS.BTN_DARK, 1)
            .fillRoundedRect(0, 0, cardW, cardH, 6);
          (cardBg as Phaser.GameObjects.Graphics).lineStyle(2, UI_COLORS.PANEL_BORDER, 0.6);
          (cardBg as Phaser.GameObjects.Graphics).strokeRoundedRect(0, 0, cardW, cardH, 6);
        }
      });

      this.container.add(btn);
      this.buttons.push(btn);
    });
  }

  setMode(mode: BuildMode): void {
    this.currentMode = mode;
    this.selectedTypeId = null;

    // Show/hide building palette
    this.buttons.forEach(btn => btn.setVisible(mode === 'build'));

    // Update button highlights via setActive
    const modes: BuildMode[] = ['build', 'road', 'demolish'];
    this.modeButtonRefs.forEach((uiBtn, i) => {
      uiBtn.setActive(this.currentMode === modes[i]);
    });

    this.onModeChange?.(mode);
    if (mode !== 'build') {
      this.onSelectBuilding?.(null);
    }
  }

  getSelectedTypeId(): string | null {
    return this.selectedTypeId;
  }

  destroy(): void {
    this.container.destroy();
  }
}
