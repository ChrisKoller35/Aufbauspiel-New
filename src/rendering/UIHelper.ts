// ============================================================
// Magic City – UI Helper (NineSlice Panels, Buttons, Bars)
// ============================================================
// Zentrale Stelle für texturierte UI-Elemente.
// Fallback auf Graphics-basierte Flat-Colors wenn Textur fehlt.
// ============================================================

import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from './Colors';

// ─── NineSlice Border-Definitionen ─────────────────────────
// [left, right, top, bottom] in Pixeln
const NINE_SLICE = {
  UI_PANEL_BG:        [32, 32, 32, 32],
  UI_PANEL_HEADER:    [24, 24, 24, 24],
  UI_BUTTON_NORMAL:   [16, 16, 16, 16],
  UI_BUTTON_HOVER:    [16, 16, 16, 16],
  UI_BUTTON_ACTIVE:   [16, 16, 16, 16],
  UI_HUD_BAR:         [8, 8, 8, 8],
  UI_SIDEBAR_BG:      [16, 16, 16, 16],
  UI_BUILDMENU_BG:    [16, 16, 16, 16],
  UI_TAB_ACTIVE:      [12, 12, 12, 12],
  UI_TAB_INACTIVE:    [12, 12, 12, 12],
  UI_TOOLTIP_BG:      [12, 12, 12, 12],
  UI_FRAME_GOLD:      [20, 20, 20, 20],
  UI_PROGRESS_BAR_BG: [6, 6, 6, 6],
  UI_RESOURCE_SLOT:   [8, 8, 8, 8],
  UI_CARD_BG:         [16, 16, 16, 16],
} as const;

type NineSliceKey = keyof typeof NINE_SLICE;

// ─── Helper-Funktionen ─────────────────────────────────────

/**
 * Erstellt ein NineSlice-Objekt wenn die Textur existiert, sonst Graphics-Fallback.
 */
export function createNineSlice(
  scene: Phaser.Scene,
  x: number, y: number,
  width: number, height: number,
  textureKey: NineSliceKey,
  fallbackColor: number = UI_COLORS.PANEL_BG,
  fallbackAlpha: number = 0.92,
): Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics {
  if (scene.textures.exists(textureKey)) {
    const [l, r, t, b] = NINE_SLICE[textureKey];
    return scene.add.nineslice(
      x + width / 2, y + height / 2,
      textureKey, undefined,
      width, height,
      l, r, t, b,
    ).setOrigin(0.5);
  }
  // Fallback: einfaches Rechteck
  const g = scene.add.graphics();
  g.fillStyle(fallbackColor, fallbackAlpha);
  g.fillRoundedRect(x, y, width, height, 6);
  g.lineStyle(2, UI_COLORS.PANEL_BORDER, 0.6);
  g.strokeRoundedRect(x, y, width, height, 6);
  return g;
}

// ─── Panel ─────────────────────────────────────────────────

export interface PanelOptions {
  alpha?: number;
  borderColor?: number;
  borderAlpha?: number;
  fallbackColor?: number;
}

/**
 * Erstellt ein Panel mit UI_PANEL_BG NineSlice-Textur.
 */
export function createPanel(
  scene: Phaser.Scene,
  x: number, y: number,
  width: number, height: number,
  opts: PanelOptions = {},
): Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics {
  const bg = createNineSlice(
    scene, x, y, width, height,
    'UI_PANEL_BG',
    opts.fallbackColor ?? UI_COLORS.PANEL_BG,
    opts.alpha ?? 0.92,
  );
  if (bg instanceof Phaser.GameObjects.NineSlice) {
    bg.setAlpha(opts.alpha ?? 0.92);
  }
  return bg;
}

// ─── Button ────────────────────────────────────────────────

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  iconKey?: string;
  iconSize?: number;
  onClick?: () => void;
  onHover?: () => void;
  onOut?: () => void;
}

export interface UIButton {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics;
  labelText?: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Image;
  setActive: (active: boolean) => void;
  setLabel: (text: string) => void;
}

/**
 * Erstellt einen texturierten Button mit optionalem Icon + Label.
 */
export function createButton(
  scene: Phaser.Scene,
  config: ButtonConfig,
): UIButton {
  const { x, y, width, height, label, textStyle, iconKey, iconSize = 24 } = config;
  const container = scene.add.container(x, y);
  const hasTexture = scene.textures.exists('UI_BUTTON_NORMAL');

  let bg: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics;
  let hoverBg: (() => void) | null = null;
  let normalBg: (() => void) | null = null;
  let activeBg: (() => void) | null = null;

  if (hasTexture) {
    const [l, r, t, b] = NINE_SLICE.UI_BUTTON_NORMAL;
    bg = scene.add.nineslice(
      width / 2, height / 2,
      'UI_BUTTON_NORMAL', undefined,
      width, height,
      l, r, t, b,
    ).setOrigin(0.5);

    normalBg = () => (bg as Phaser.GameObjects.NineSlice).setTexture('UI_BUTTON_NORMAL');
    hoverBg = () => {
      if (scene.textures.exists('UI_BUTTON_HOVER')) {
        (bg as Phaser.GameObjects.NineSlice).setTexture('UI_BUTTON_HOVER');
      }
    };
    activeBg = () => {
      if (scene.textures.exists('UI_BUTTON_ACTIVE')) {
        (bg as Phaser.GameObjects.NineSlice).setTexture('UI_BUTTON_ACTIVE');
      }
    };
  } else {
    bg = scene.add.graphics();
    (bg as Phaser.GameObjects.Graphics).fillStyle(UI_COLORS.BTN_NORMAL, 1);
    (bg as Phaser.GameObjects.Graphics).fillRoundedRect(0, 0, width, height, 6);

    normalBg = () => {
      (bg as Phaser.GameObjects.Graphics).clear().fillStyle(UI_COLORS.BTN_NORMAL, 1).fillRoundedRect(0, 0, width, height, 6);
    };
    hoverBg = () => {
      (bg as Phaser.GameObjects.Graphics).clear().fillStyle(UI_COLORS.BTN_HOVER, 1).fillRoundedRect(0, 0, width, height, 6);
    };
    activeBg = () => {
      (bg as Phaser.GameObjects.Graphics).clear().fillStyle(UI_COLORS.PANEL_BORDER, 1).fillRoundedRect(0, 0, width, height, 6);
    };
  }
  container.add(bg);

  // Icon
  let icon: Phaser.GameObjects.Image | undefined;
  if (iconKey && scene.textures.exists(iconKey)) {
    const iconY = label ? height / 2 - 6 : height / 2;
    icon = scene.add.image(width / 2, iconY, iconKey).setDisplaySize(iconSize, iconSize);
    container.add(icon);
  }

  // Label
  let labelText: Phaser.GameObjects.Text | undefined;
  if (label) {
    const labelY = iconKey ? height / 2 + iconSize / 2 : height / 2;
    const style = textStyle ?? { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT };
    labelText = scene.add.text(width / 2, labelY, label, style).setOrigin(0.5);
    container.add(labelText);
  }

  // Interactivity
  container.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );

  let isActive = false;
  container.on('pointerover', () => {
    if (!isActive) hoverBg?.();
    config.onHover?.();
  });
  container.on('pointerout', () => {
    if (isActive) activeBg?.();
    else normalBg?.();
    config.onOut?.();
  });
  container.on('pointerdown', () => {
    config.onClick?.();
  });

  const setActive = (active: boolean) => {
    isActive = active;
    if (active) activeBg?.();
    else normalBg?.();
  };

  const setLabel = (text: string) => {
    labelText?.setText(text);
  };

  return { container, bg, labelText, icon, setActive, setLabel };
}

// ─── Progress Bar ──────────────────────────────────────────

export interface ProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height?: number;
  progress?: number;  // 0..1
  fillColor?: number;
}

export interface UIProgressBar {
  container: Phaser.GameObjects.Container;
  setProgress: (pct: number) => void;
  destroy: () => void;
}

/**
 * Erstellt einen texturierten Fortschrittsbalken.
 */
export function createProgressBar(
  scene: Phaser.Scene,
  config: ProgressBarConfig,
): UIProgressBar {
  const { x, y, width, height = 14 } = config;
  const container = scene.add.container(x, y);
  const hasTexture = scene.textures.exists('UI_PROGRESS_BAR_BG');

  // Background
  if (hasTexture) {
    const [l, r, t, b] = NINE_SLICE.UI_PROGRESS_BAR_BG;
    const bgNs = scene.add.nineslice(
      width / 2, height / 2,
      'UI_PROGRESS_BAR_BG', undefined,
      width, height,
      l, r, t, b,
    ).setOrigin(0.5);
    container.add(bgNs);
  } else {
    const bgG = scene.add.graphics();
    bgG.fillStyle(UI_COLORS.PROGRESS_BG, 1);
    bgG.fillRoundedRect(0, 0, width, height, 3);
    bgG.lineStyle(1, UI_COLORS.PROGRESS_BORDER, 1);
    bgG.strokeRoundedRect(0, 0, width, height, 3);
    container.add(bgG);
  }

  // Fill – wir nutzen eine Graphics-Maske auf dem NineSlice-Fill oder ein einfaches Rect
  let fillObj: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics;
  const hasFillTexture = scene.textures.exists('UI_PROGRESS_BAR_FILL');
  const innerPad = hasTexture ? 3 : 2;
  const fillMaxW = width - innerPad * 2;
  const fillH = height - innerPad * 2;

  if (hasFillTexture) {
    fillObj = scene.add.nineslice(
      innerPad + fillMaxW / 2, height / 2,
      'UI_PROGRESS_BAR_FILL', undefined,
      fillMaxW, fillH,
      4, 4, 4, 4,
    ).setOrigin(0.5);
    container.add(fillObj);
  } else {
    fillObj = scene.add.graphics();
    (fillObj as Phaser.GameObjects.Graphics).fillStyle(config.fillColor ?? UI_COLORS.SUCCESS_GREEN, 1);
    (fillObj as Phaser.GameObjects.Graphics).fillRoundedRect(innerPad, innerPad, fillMaxW, fillH, 2);
    container.add(fillObj);
  }

  const setProgress = (pct: number) => {
    if (!fillObj.active) return;
    const clamped = Math.max(0, Math.min(1, pct));
    if (fillObj instanceof Phaser.GameObjects.NineSlice) {
      // Resize via setSize – NineSlice stretcht automatisch
      const newW = Math.max(8, fillMaxW * clamped);
      fillObj.setSize(newW, fillH);
      fillObj.setPosition(innerPad + newW / 2, height / 2);
    } else {
      // Graphics: neu zeichnen
      fillObj.clear();
      if (clamped > 0) {
        fillObj.fillStyle(config.fillColor ?? UI_COLORS.SUCCESS_GREEN, 1);
        fillObj.fillRoundedRect(innerPad, innerPad, fillMaxW * clamped, fillH, 2);
      }
    }
  };

  // Initial
  setProgress(config.progress ?? 0);

  return {
    container,
    setProgress,
    destroy: () => container.destroy(),
  };
}

// ─── Tab ───────────────────────────────────────────────────

export interface TabConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export interface UITab {
  container: Phaser.GameObjects.Container;
  setActive: (active: boolean) => void;
}

/**
 * Erstellt einen texturierten Tab-Button.
 */
export function createTab(
  scene: Phaser.Scene,
  config: TabConfig,
): UITab {
  const { x, y, width, height, label } = config;
  const container = scene.add.container(x, y);
  const hasActive = scene.textures.exists('UI_TAB_ACTIVE');
  const hasInactive = scene.textures.exists('UI_TAB_INACTIVE');

  let bg: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics;

  if (hasActive && hasInactive) {
    const key = config.active ? 'UI_TAB_ACTIVE' : 'UI_TAB_INACTIVE';
    const [l, r, t, b] = NINE_SLICE[config.active ? 'UI_TAB_ACTIVE' : 'UI_TAB_INACTIVE'];
    bg = scene.add.nineslice(
      width / 2, height / 2,
      key, undefined,
      width, height,
      l, r, t, b,
    ).setOrigin(0.5);
  } else {
    bg = scene.add.graphics();
    const color = config.active ? UI_COLORS.TAB_ACTIVE : UI_COLORS.TAB_INACTIVE;
    (bg as Phaser.GameObjects.Graphics).fillStyle(color, 1).fillRoundedRect(0, 0, width, height, 4);
  }
  container.add(bg);

  const textColor = config.active ? UI_STR_COLORS.GOLD : UI_STR_COLORS.DIM;
  const labelText = scene.add.text(width / 2, height / 2, label, {
    fontFamily: FONT_FAMILY, fontSize: '13px', color: textColor,
  }).setOrigin(0.5);
  container.add(labelText);

  container.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  container.on('pointerdown', () => config.onClick?.());

  const setActive = (active: boolean) => {
    if (bg instanceof Phaser.GameObjects.NineSlice) {
      if (active && hasActive) bg.setTexture('UI_TAB_ACTIVE');
      else if (!active && hasInactive) bg.setTexture('UI_TAB_INACTIVE');
    } else {
      const color = active ? UI_COLORS.TAB_ACTIVE : UI_COLORS.TAB_INACTIVE;
      (bg as Phaser.GameObjects.Graphics).clear().fillStyle(color, 1).fillRoundedRect(0, 0, width, height, 4);
    }
    labelText.setColor(active ? UI_STR_COLORS.GOLD : UI_STR_COLORS.DIM);
  };

  return { container, setActive };
}

// ─── Divider ───────────────────────────────────────────────

/**
 * Erstellt eine dekorative Trennlinie.
 */
export function createDivider(
  scene: Phaser.Scene,
  x: number, y: number,
  width: number,
): Phaser.GameObjects.Image | Phaser.GameObjects.Graphics {
  if (scene.textures.exists('UI_DIVIDER')) {
    return scene.add.image(x + width / 2, y + 4, 'UI_DIVIDER')
      .setDisplaySize(width, 8)
      .setOrigin(0.5);
  }
  const g = scene.add.graphics();
  g.lineStyle(1, UI_COLORS.BTN_NORMAL, 0.6);
  g.lineBetween(x, y, x + width, y);
  return g;
}

// ─── Resource Slot (HUD) ──────────────────────────────────

export interface ResourceSlotConfig {
  x: number;
  y: number;
  iconKey: string;
  fallbackLabel: string;
  width?: number;
  height?: number;
}

export interface UIResourceSlot {
  container: Phaser.GameObjects.Container;
  valueText: Phaser.GameObjects.Text;
  setValue: (val: string) => void;
}

/**
 * Erstellt einen Ressourcen-Slot mit Icon + Wert für die HUD-Leiste.
 */
export function createResourceSlot(
  scene: Phaser.Scene,
  config: ResourceSlotConfig,
): UIResourceSlot {
  const { x, y, iconKey, fallbackLabel, width = 72, height = 28 } = config;
  const container = scene.add.container(x, y);

  // Slot-Hintergrund
  if (scene.textures.exists('UI_RESOURCE_SLOT')) {
    const [l, r, t, b] = NINE_SLICE.UI_RESOURCE_SLOT;
    const slotBg = scene.add.nineslice(
      width / 2, height / 2,
      'UI_RESOURCE_SLOT', undefined,
      width, height,
      l, r, t, b,
    ).setOrigin(0.5).setAlpha(0.85);
    container.add(slotBg);
  } else {
    const fallbackBg = scene.add.graphics();
    fallbackBg.fillStyle(UI_COLORS.PANEL_BG, 0.85);
    fallbackBg.fillRoundedRect(0, 0, width, height, 3);
    fallbackBg.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.4);
    fallbackBg.strokeRoundedRect(0, 0, width, height, 3);
    container.add(fallbackBg);
  }

  // Icon
  const iconX = 14;
  if (scene.textures.exists(iconKey)) {
    container.add(
      scene.add.image(iconX, height / 2, iconKey).setDisplaySize(18, 18),
    );
  } else {
    container.add(
      scene.add.text(4, height / 2 - 6, fallbackLabel, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
      }),
    );
  }

  // Wert-Text
  const valueText = scene.add.text(iconX + 14, height / 2, '0', {
    fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
  }).setOrigin(0, 0.5);
  container.add(valueText);

  return {
    container,
    valueText,
    setValue: (val: string) => valueText.setText(val),
  };
}

// ============================================================
// DARK GLASSMORPHISM GAMING STYLE (UI_DESIGN_GUIDE)
// Per-Panel Accent Colors + Neon Glow Borders
// ============================================================

/**
 * Draws a Dark Glassmorphism panel onto a Graphics object.
 * Simulates: dark gradient bg + 3px colored border + box-shadow 40px glow.
 */
export function drawGlassPanel(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  w: number, h: number,
  accentColor: number,
  radius = 16,
): void {
  // Glow rings (box-shadow: 0 0 40px rgba(accent, 0.4) simulation)
  g.lineStyle(16, accentColor, 0.04);
  g.strokeRoundedRect(x - 8, y - 8, w + 16, h + 16, radius + 8);
  g.lineStyle(10, accentColor, 0.10);
  g.strokeRoundedRect(x - 5, y - 5, w + 10, h + 10, radius + 5);
  g.lineStyle(5,  accentColor, 0.22);
  g.strokeRoundedRect(x - 2, y - 2, w + 4,  h + 4,  radius + 2);

  // Dark gradient background (linear-gradient(135deg, #1a1a2e, #16213e) simulation)
  g.fillStyle(UI_COLORS.GLASS_BASE, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  // Diagonal overlay: upper-right lighter
  g.fillStyle(UI_COLORS.GLASS_OVERLAY, 0.55);
  g.fillRoundedRect(x + Math.floor(w * 0.25), y, Math.floor(w * 0.75), h, radius);

  // Colored border (border: 3px solid accent)
  g.lineStyle(3, accentColor, 0.88);
  g.strokeRoundedRect(x, y, w, h, radius);

  // Subtle top-edge shine
  g.lineStyle(1, 0xFFFFFF, 0.06);
  g.lineBetween(x + radius, y + 1, x + w - radius, y + 1);
}

/**
 * Draws a semi-transparent info bar (rgba(255,255,255,0.08) style).
 */
export function drawGlassInfoBar(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  w: number, h: number,
  radius = 8,
): void {
  g.fillStyle(0xFFFFFF, 0.08);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, 0xFFFFFF, 0.12);
  g.strokeRoundedRect(x, y, w, h, radius);
}

// ─── Glass Button ───────────────────────────────────────────

export interface GlassButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  accentColor: number;    // Phaser hex, e.g. UI_COLORS.GLASS_ACCENT_GUILD
  accentStr: string;      // CSS string, e.g. UI_STR_COLORS.GLASS_GUILD
  onClick: () => void;
  fontSize?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * Creates a Dark Glassmorphism button.
 * primary = gradient fill + glow
 * secondary = transparent with dim border
 * danger = red tint
 */
export function createGlassButton(
  scene: Phaser.Scene,
  config: GlassButtonConfig,
): Phaser.GameObjects.Container {
  const {
    x, y, width, height, label,
    accentColor, accentStr, onClick,
    fontSize = '15px',
    variant = 'primary',
  } = config;
  const R = 8;
  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();

  const drawNormal = () => {
    bg.clear();
    if (variant === 'primary') {
      bg.fillStyle(0x0b1320, 1);
      bg.fillRoundedRect(0, 0, width, height, R);
      // Accent overlay on top half (gradient simulation)
      bg.fillStyle(accentColor, 0.20);
      bg.fillRoundedRect(0, 0, width, Math.floor(height * 0.55), R);
      bg.lineStyle(2, accentColor, 0.65);
      bg.strokeRoundedRect(0, 0, width, height, R);
    } else if (variant === 'secondary') {
      bg.fillStyle(0xFFFFFF, 0.06);
      bg.fillRoundedRect(0, 0, width, height, R);
      bg.lineStyle(1, 0xFFFFFF, 0.18);
      bg.strokeRoundedRect(0, 0, width, height, R);
    } else {
      bg.fillStyle(0xE94560, 0.15);
      bg.fillRoundedRect(0, 0, width, height, R);
      bg.lineStyle(1, 0xE94560, 0.7);
      bg.strokeRoundedRect(0, 0, width, height, R);
    }
    bg.lineStyle(1, 0xFFFFFF, 0.05);
    bg.lineBetween(R, 1, width - R, 1);
  };

  const drawHover = () => {
    bg.clear();
    if (variant === 'primary') {
      // Glow
      bg.lineStyle(8, accentColor, 0.12);
      bg.strokeRoundedRect(-4, -4, width + 8, height + 8, R + 4);
      bg.lineStyle(4, accentColor, 0.28);
      bg.strokeRoundedRect(-2, -2, width + 4, height + 4, R + 2);
      // Body
      bg.fillStyle(0x1a2640, 1);
      bg.fillRoundedRect(0, 0, width, height, R);
      bg.fillStyle(accentColor, 0.35);
      bg.fillRoundedRect(0, 0, width, Math.floor(height * 0.55), R);
      bg.lineStyle(2, accentColor, 0.95);
      bg.strokeRoundedRect(0, 0, width, height, R);
    } else if (variant === 'secondary') {
      bg.fillStyle(0xFFFFFF, 0.12);
      bg.fillRoundedRect(0, 0, width, height, R);
      bg.lineStyle(1, 0xFFFFFF, 0.32);
      bg.strokeRoundedRect(0, 0, width, height, R);
    } else {
      bg.fillStyle(0xE94560, 0.25);
      bg.fillRoundedRect(0, 0, width, height, R);
      bg.lineStyle(2, 0xE94560, 0.90);
      bg.strokeRoundedRect(0, 0, width, height, R);
    }
    bg.lineStyle(1, 0xFFFFFF, 0.09);
    bg.lineBetween(R, 1, width - R, 1);
  };

  drawNormal();
  container.add(bg);

  const labelColor = variant === 'primary' ? accentStr
    : variant === 'secondary' ? '#cccccc'
    : '#E94560';

  const labelText = scene.add.text(width / 2, height / 2, label, {
    fontFamily: FONT_FAMILY, fontSize, color: labelColor, fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(labelText);

  container.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  container.on('pointerover',  () => drawHover());
  container.on('pointerout',   () => drawNormal());
  container.on('pointerdown',  onClick);

  return container;
}
