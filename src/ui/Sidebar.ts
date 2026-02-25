import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createNineSlice, createButton, UIButton } from '../rendering/UIHelper';

export type SidebarAction = 'build' | 'road' | 'guild' | 'expedition' | 'storage' | 'help';

interface SidebarButtonEntry {
  action: SidebarAction;
  uiButton: UIButton;
}

/**
 * Vertical sidebar on the left side with large, labeled buttons.
 * Uses NineSlice textures for background and buttons (with Graphics fallback).
 */
export class Sidebar {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private buttons: SidebarButtonEntry[] = [];
  private activeAction: SidebarAction | null = null;
  private bgObject!: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics;

  public static readonly WIDTH = 60;

  public onAction?: (action: SidebarAction) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    this.container = this.scene.add.container(0, 0).setDepth(910);

    // Background panel – NineSlice with fallback
    this.bgObject = createNineSlice(
      this.scene,
      0, 0,
      Sidebar.WIDTH, this.scene.scale.height,
      'UI_SIDEBAR_BG',
      UI_COLORS.PANEL_BG_DARK,
      0.92,
    );
    this.container.add(this.bgObject);

    // Right border line (immer sichtbar, trennt Sidebar vom Spielbereich)
    const borderLine = this.scene.add.graphics();
    borderLine.lineStyle(2, UI_COLORS.PANEL_BORDER, 0.6);
    borderLine.lineBetween(Sidebar.WIDTH, 0, Sidebar.WIDTH, this.scene.scale.height);
    this.container.add(borderLine);

    // Title "MC"
    this.container.add(
      this.scene.add.text(Sidebar.WIDTH / 2, 8, 'MC', {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD,
      }).setOrigin(0.5, 0),
    );

    // Button definitions
    const buttonDefs: { action: SidebarAction; label: string; iconFallback: string; iconKey: string }[] = [
      { action: 'build', label: 'Bauen', iconFallback: 'B', iconKey: 'ICON_BUILD' },
      { action: 'road', label: 'Strasse', iconFallback: 'R', iconKey: 'ICON_ROAD' },
      { action: 'guild', label: 'Gilde', iconFallback: 'G', iconKey: 'ICON_GUILD' },
      { action: 'expedition', label: 'Exped.', iconFallback: 'E', iconKey: 'ICON_EXPEDITION' },
      { action: 'storage', label: 'Lager', iconFallback: 'L', iconKey: 'ICON_STORAGE' },
      { action: 'help', label: 'Hilfe', iconFallback: '?', iconKey: 'ICON_HELP' },
    ];

    const startY = 32;
    const btnW = Sidebar.WIDTH - 8;
    const btnH = 56;
    const gap = 6;

    buttonDefs.forEach((def, i) => {
      const y = startY + i * (btnH + gap);

      const uiButton = createButton(this.scene, {
        x: 4,
        y,
        width: btnW,
        height: btnH,
        label: def.label,
        textStyle: { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT, fontStyle: 'bold' },
        iconKey: def.iconKey,
        iconSize: 32,
        onClick: () => {
          if (this.activeAction === def.action) {
            this.setActive(null);
          } else {
            this.setActive(def.action);
          }
          this.onAction?.(def.action);
        },
      });

      // If icon sprite was not available, add a text fallback
      if (!uiButton.icon && !this.scene.textures.exists(def.iconKey)) {
        const fallbackText = this.scene.add.text(btnW / 2, btnH / 2 - 6, def.iconFallback, {
          fontFamily: FONT_FAMILY, fontSize: '18px', color: UI_STR_COLORS.GOLD,
        }).setOrigin(0.5);
        uiButton.container.add(fallbackText);
      }

      this.container.add(uiButton.container);
      this.buttons.push({ action: def.action, uiButton });
    });
  }

  setActive(action: SidebarAction | null): void {
    this.activeAction = action;
    for (const btn of this.buttons) {
      btn.uiButton.setActive(btn.action === action);
    }
  }

  getActive(): SidebarAction | null {
    return this.activeAction;
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.container.setPosition(cam.scrollX, cam.scrollY);
  }

  destroy(): void {
    this.container.destroy();
  }
}
