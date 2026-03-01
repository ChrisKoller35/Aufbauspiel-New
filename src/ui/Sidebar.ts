import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';

export type SidebarAction = 'build' | 'road' | 'guild' | 'expedition' | 'storage' | 'help';

const WIDTH    = 72;
const BTN_W    = WIDTH - 10;
const BTN_H    = 62;
const BTN_GAP  = 6;
const START_Y  = 44;
const RADIUS   = 10;

// ── Per-button symbols ───────────────────────────────────────────
const SYMBOLS: Record<SidebarAction, string> = {
  build:      '🏗',
  road:       '🛤',
  guild:      '⚔',
  expedition: '🧭',
  storage:    '📦',
  help:       '❓',
};

// ── Per-button accent colors (Gaming UI Kit style) ──────────────
const ACCENT: Record<SidebarAction, { main: number; bright: number; label: string }> = {
  build:      { main: 0x4CC9F0, bright: 0x8EE4FF, label: '#4CC9F0' },  // Ice blue
  road:       { main: 0x5CDB95, bright: 0x9EFFC9, label: '#5CDB95' },  // Mint green
  guild:      { main: 0xFFB347, bright: 0xFFD285, label: '#FFB347' },  // Amber
  expedition: { main: 0xFF6B6B, bright: 0xFFA0A0, label: '#FF6B6B' },  // Coral red
  storage:    { main: 0xC77DFF, bright: 0xE2B3FF, label: '#C77DFF' },  // Lavender
  help:       { main: 0xFFE66D, bright: 0xFFF3A8, label: '#FFE66D' },  // Gold yellow
};

/**
 * Vertical sidebar – Gaming UI Style 2026.
 * Per-button accent colors, dark body with depth, glow borders.
 */
export class Sidebar {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private btnEntries: Array<{
    action: SidebarAction;
    bg: Phaser.GameObjects.Graphics;
    activeBorder: Phaser.GameObjects.Graphics;
    iconImg?: Phaser.GameObjects.Image;
    labelText: Phaser.GameObjects.Text;
    isActive: boolean;
  }> = [];
  private activeAction: SidebarAction | null = null;

  public static readonly WIDTH = WIDTH;
  public onAction?: (action: SidebarAction) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    this.container = this.scene.add.container(0, 0).setDepth(910);

    // ── Background panel ──
    const panelBg = this.scene.add.graphics();
    // Very dark base (near-black, slightly blue)
    panelBg.fillStyle(0x0D0F14, 1);
    panelBg.fillRect(0, 0, WIDTH, this.scene.scale.height);
    // Subtle blue-gray gradient overlay (lighter center)
    panelBg.fillStyle(0x1A1F2E, 0.6);
    panelBg.fillRect(4, 0, WIDTH - 8, this.scene.scale.height);
    // Right edge separator: dim outer + bright inner
    panelBg.lineStyle(2, 0x2A3048, 0.8);
    panelBg.lineBetween(WIDTH, 0, WIDTH, this.scene.scale.height);
    panelBg.lineStyle(1, 0x3A4060, 0.5);
    panelBg.lineBetween(WIDTH - 1, 0, WIDTH - 1, this.scene.scale.height);
    this.container.add(panelBg);

    // ── Logo / Title ──
    const logoGfx = this.scene.add.graphics();
    logoGfx.fillStyle(0x0A0C10, 1);
    logoGfx.fillRoundedRect(5, 4, WIDTH - 10, 33, 6);
    logoGfx.lineStyle(1, 0x2A3048, 0.7);
    logoGfx.strokeRoundedRect(5, 4, WIDTH - 10, 33, 6);
    // Subtle glow on logo box
    logoGfx.lineStyle(1, 0x4CC9F0, 0.2);
    logoGfx.strokeRoundedRect(4, 3, WIDTH - 8, 35, 7);
    this.container.add(logoGfx);

    this.container.add(
      this.scene.add.text(WIDTH / 2, 9, '⚔', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: '#4CC9F0',
      }).setOrigin(0.5, 0),
    );
    this.container.add(
      this.scene.add.text(WIDTH / 2, 22, 'MC', {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.DIM,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0),
    );

    // ── Buttons ──
    const defs: Array<{ action: SidebarAction; label: string; icon: string; shortcut: string }> = [
      { action: 'build',      label: 'Bauen',   icon: 'ICON_BUILD',      shortcut: 'B' },
      { action: 'road',       label: 'Straße',  icon: 'ICON_ROAD',       shortcut: 'R' },
      { action: 'guild',      label: 'Gilde',   icon: 'ICON_GUILD',      shortcut: 'G' },
      { action: 'expedition', label: 'Exped.',  icon: 'ICON_EXPEDITION', shortcut: 'E' },
      { action: 'storage',    label: 'Lager',   icon: 'ICON_STORAGE',    shortcut: 'S' },
      { action: 'help',       label: 'Hilfe',   icon: 'ICON_HELP',       shortcut: '?' },
    ];

    defs.forEach((def, i) => {
      const bx = 5;
      const by = START_Y + i * (BTN_H + BTN_GAP);
      this.addButton(bx, by, def.action, def.label, def.icon, def.shortcut);
    });
  }

  private addButton(
    bx: number, by: number,
    action: SidebarAction,
    label: string,
    iconKey: string,
    shortcut: string,
  ): void {
    const container = this.scene.add.container(bx, by);

    // Button background
    const bg = this.scene.add.graphics();
    this.drawBtnBg(bg, action, false);
    container.add(bg);

    // Active border overlay (color-coded glow, hidden by default)
    const activeBorder = this.scene.add.graphics();
    this.drawActiveBorder(activeBorder, action);
    activeBorder.setAlpha(0);
    container.add(activeBorder);

    // Icon
    const iconY = BTN_H / 2 - 12;
    let iconImg: Phaser.GameObjects.Image | undefined;
    if (this.scene.textures.exists(iconKey)) {
      iconImg = this.scene.add.image(BTN_W / 2, iconY, iconKey)
        .setDisplaySize(38, 38)
        .setOrigin(0.5, 0.5);
      container.add(iconImg);
    } else {
      // Symbol glyph with accent color
      container.add(
        this.scene.add.text(BTN_W / 2, iconY, SYMBOLS[action], {
          fontFamily: FONT_FAMILY, fontSize: '26px', color: ACCENT[action].label,
        }).setOrigin(0.5, 0.5),
      );
    }

    // Label
    const labelText = this.scene.add.text(BTN_W / 2, BTN_H - 14, label, {
      fontFamily: FONT_FAMILY, fontSize: '12px',
      color: UI_STR_COLORS.DIM, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    container.add(labelText);

    // Shortcut badge (bottom-right)
    const badgeBg = this.scene.add.graphics();
    badgeBg.fillStyle(0x080A0E, 0.95);
    badgeBg.fillRoundedRect(BTN_W - 15, BTN_H - 13, 13, 11, 3);
    badgeBg.lineStyle(1, 0x2A3A5A, 1);
    badgeBg.strokeRoundedRect(BTN_W - 15, BTN_H - 13, 13, 11, 3);
    container.add(badgeBg);
    container.add(
      this.scene.add.text(BTN_W - 9, BTN_H - 8, shortcut, {
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.MUTED,
      }).setOrigin(0.5, 0.5),
    );

    // Interactivity
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, BTN_W, BTN_H),
      Phaser.Geom.Rectangle.Contains,
    );

    const entry = { action, bg, activeBorder, iconImg, labelText, isActive: false };
    this.btnEntries.push(entry);

    container.on('pointerover', () => {
      if (!entry.isActive) this.drawBtnBg(bg, action, false, true);
    });
    container.on('pointerout', () => {
      if (!entry.isActive) this.drawBtnBg(bg, action, false);
    });
    container.on('pointerdown', () => {
      if (this.activeAction === action) {
        this.setActive(null);
      } else {
        this.setActive(action);
      }
      this.onAction?.(action);
    });

    this.container.add(container);
  }

  private drawBtnBg(
    g: Phaser.GameObjects.Graphics,
    action: SidebarAction,
    active: boolean,
    hover = false,
  ): void {
    g.clear();
    const { main } = ACCENT[action];

    // Outer ambient glow — visible even in idle state
    const glowAlpha = active ? 0.30 : hover ? 0.18 : 0.09;
    g.fillStyle(main, glowAlpha);
    g.fillRoundedRect(-5, -5, BTN_W + 10, BTN_H + 10, RADIUS + 5);

    // Dark button body
    const bodyColor = active ? 0x20263A : hover ? 0x181E2E : 0x111520;
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(0, 0, BTN_W, BTN_H, RADIUS);

    // Colored border — always visible, bright on active/hover
    const borderAlpha = active ? 0.95 : hover ? 0.65 : 0.40;
    const borderW = active ? 2 : 1.5;
    g.lineStyle(borderW, main, borderAlpha);
    g.strokeRoundedRect(0, 0, BTN_W, BTN_H, RADIUS);

    // Top shine highlight
    g.lineStyle(1, 0xFFFFFF, active ? 0.18 : hover ? 0.10 : 0.05);
    g.lineBetween(RADIUS, 1, BTN_W - RADIUS, 1);
  }

  private drawActiveBorder(g: Phaser.GameObjects.Graphics, action: SidebarAction): void {
    g.clear();
    const { main, bright } = ACCENT[action];

    // Widest outer soft glow
    g.lineStyle(12, main, 0.08);
    g.strokeRoundedRect(-6, -6, BTN_W + 12, BTN_H + 12, RADIUS + 6);

    // Mid glow ring
    g.lineStyle(6, main, 0.20);
    g.strokeRoundedRect(-3, -3, BTN_W + 6, BTN_H + 6, RADIUS + 3);

    // Inner glow ring
    g.lineStyle(3, main, 0.45);
    g.strokeRoundedRect(-1, -1, BTN_W + 2, BTN_H + 2, RADIUS + 1);

    // Bright crisp border
    g.lineStyle(2, bright, 1.0);
    g.strokeRoundedRect(0, 0, BTN_W, BTN_H, RADIUS);
  }

  setActive(action: SidebarAction | null): void {
    this.activeAction = action;
    for (const entry of this.btnEntries) {
      entry.isActive = entry.action === action;
      this.drawBtnBg(entry.bg, entry.action, entry.isActive);
      entry.activeBorder.setAlpha(entry.isActive ? 1 : 0);
      // Label: accent color when active, very dim otherwise
      entry.labelText.setColor(
        entry.isActive ? ACCENT[entry.action].label : UI_STR_COLORS.DIM,
      );
    }
  }

  getActive(): SidebarAction | null {
    return this.activeAction;
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z = cam.zoom;
    this.container.setPosition(cam.worldView.x, cam.worldView.y);
    this.container.setScale(1 / z);
  }

  destroy(): void {
    this.container.destroy();
  }
}
