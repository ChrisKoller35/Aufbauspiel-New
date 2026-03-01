// ============================================================
// Magic City – Zentrale Farb- und Style-Definitionen
// ============================================================
// EINZIGE Quelle für alle Farben, Fonts und Text-Styles.
// Nie hardcoded Hex-Werte in UI-Dateien verwenden!
// ============================================================

// ─── Font-Familie (einmal ändern → überall wirksam) ─────────
export const FONT_FAMILY = '"Segoe UI", "Arial", sans-serif';

// ─── Hex-Farben (für Graphics.fillStyle etc.) ───────────────
// Farbschema: Warm-Anthrazit – modernes Dunkelgrau mit amber-goldenen Akzenten
export const UI_COLORS = {
  // Panel-Hintergründe (warmes Dunkelgrau statt Braun)
  PANEL_BG: 0x2B2D31,           // Standard Panel-Hintergrund
  PANEL_BG_DARK: 0x1E1F23,      // Dunkler Modal-Hintergrund
  PANEL_BG_DARKER: 0x141518,    // Dunkelster Hintergrund (ExpeditionUI)
  PANEL_BORDER: 0xD4A54A,       // Panel-Rand (amber-gold)

  // Buttons
  BTN_NORMAL: 0x383A40,         // Button normal
  BTN_HOVER: 0x45474F,          // Button hover (heller)
  BTN_DARK: 0x2F3136,           // Button dunkel (Karten, Palette)
  BTN_DARK_HOVER: 0x3B3D44,     // Button dunkel hover

  // Tabs & Karten
  TAB_ACTIVE: 0x383A40,         // Aktiver Tab
  TAB_INACTIVE: 0x232428,       // Inaktiver Tab
  CARD_BG: 0x232428,            // Karten-Hintergrund
  CARD_BG_LIGHT: 0x333539,      // Karten-Hintergrund hell (injured etc.)

  // Status-Farben
  AFFORDABLE_BG: 0x2A5E2A,      // Leistbar (dunkelgrün Hintergrund)
  AFFORDABLE_BORDER: 0x4CAF50,   // Leistbar (grün Rand)
  SUCCESS_GREEN: 0x4CAF50,       // Fortschrittsbalken, Erfolg
  PROGRESS_BG: 0x1E1F23,        // Fortschrittsbalken Hintergrund

  // Semantische Farben
  GOLD_MID: 0xE8C34A,
  DAMAGE_RED: 0xEF5350,
  HEAL_GREEN: 0x66BB6A,
  CONNECTED_GREEN: 0x66BB6A,
  DISCONNECTED_RED: 0xEF5350,
  DESPERATE_RED: 0x8B0000,
  DESPERATE_RED_HOVER: 0xBF360C,

  // Erfolgs-/Aktions-Buttons (grün)
  SUCCESS_BTN_BG: 0x2E7D32,
  SUCCESS_BTN_HOVER: 0x388E3C,

  // Route/Expedition-Karten
  ROUTE_CARD_BG: 0x1B5E20,
  ROUTE_CARD_BORDER: 0x388E3C,
  ROUTE_CARD_HOVER: 0x2E7D32,
  CARD_HOVER_BORDER: 0x7CB342,

  // Fortschrittsbalken
  PROGRESS_BORDER: 0x4A4A52,

  // Terrain (lebendigeres Grün mit sichtbarem Kontrast)
  GRID_LINE: 0x2A5A24,
  GRASS_BG: 0x3A7A32,
  GRASS_ALT: 0x347230,
  GRASS_LIGHT: 0x428A38,
  GRASS_DARK: 0x2E6828,
  ROAD_TINT: 0x8B8070,
  WATER_BLUE: 0x4488FF,
  BORDER_GRASS_DARK: 0x265A20,    // Dunkleres Gras für Map-Rand
  BORDER_GRASS_MID: 0x2D6B26,     // Mittleres Gras für Map-Rand
  SHADOW_COLOR: 0x000000,          // Gebäude-Schatten

  // Baumodus
  BUILD_VALID: 0x00FF00,
  BUILD_INVALID: 0xFF0000,

  // Construction Overlay
  CONSTRUCTION_OVERLAY: 0x000000,

  // ── Navy-Dark Redesign (2026 Dark Fantasy Style) ──────────
  NAVY_DEEP: 0x0E1018,
  NAVY_PANEL: 0x161929,
  NAVY_CARD: 0x1C2035,
  NAVY_CARD_LIGHT: 0x242840,
  NAVY_BTN: 0x1E2236,
  NAVY_BTN_HOVER: 0x2A3050,
  NAVY_BTN_ACTIVE: 0x2C3460,
  NAVY_SEPARATOR: 0x2A2E45,

  // Resource Chips (Pill-Format HUD)
  CHIP_BG: 0x191D2E,
  CHIP_BORDER: 0x333766,
  CHIP_BORDER_GLOW: 0x4A4F88,

  // Stat-Farben (farbige Balken, MK-Style)
  STAT_HP_BG: 0x1A3A28,
  STAT_HP_FILL: 0x4CAF78,
  STAT_ATK_BG: 0x3A1A0A,
  STAT_ATK_FILL: 0xE06030,
  STAT_DEF_BG: 0x0A1E3A,
  STAT_DEF_FILL: 0x3A8AC8,
  STAT_SPD_BG: 0x2A2200,
  STAT_SPD_FILL: 0xD4B800,

  // Gear Slots (Gold-Frame Style)
  SLOT_BG: 0x0F1220,
  SLOT_BORDER: 0x3A3010,
  SLOT_BORDER_FILLED: 0xA07820,
  SLOT_HOVER: 0x2A2530,

  // XP Bar
  XP_BAR_BG: 0x0E1020,
  XP_BAR_FILL: 0x3A6FD8,

  // Gold Decorative
  GOLD_DECO_DIM: 0x7A5A20,
  GOLD_DECO_BRIGHT: 0xF0C060,

  // ── Dark Glassmorphism Gaming (UI_DESIGN_GUIDE) ───────────
  GLASS_BASE:    0x1A1A2E,   // Panel base dark (#1a1a2e)
  GLASS_OVERLAY: 0x16213E,   // Panel gradient overlay (#16213e)
  GLASS_INFO:    0xFFFFFF,   // Info bar fill (rgba 0.08)

  // Accent-Farben pro Feature-Panel
  GLASS_ACCENT_BUILD:      0xF59E0B,  // Amber  – Bauen
  GLASS_ACCENT_GUILD:      0xFFD700,  // Gold   – Gilde
  GLASS_ACCENT_EXPEDITION: 0xE94560,  // Rot    – Expedition/Kampf
  GLASS_ACCENT_STORAGE:    0x22C55E,  // Grün   – Lager/Inventar
  GLASS_ACCENT_HERO:       0xA855F7,  // Lila   – Helden-Detail
  GLASS_ACCENT_MENU:       0xFFD700,  // Gold   – Hauptmenü
  GLASS_ACCENT_DANGER:     0xE94560,  // Rot    – Gefahr/Löschen
} as const;

// ─── String-Farben (für Text color) ─────────────────────────
export const UI_STR_COLORS = {
  LIGHT: '#F0F0F0',
  DIM: '#A0A4AB',
  MUTED: '#82868E',
  DISABLED: '#5C5F66',
  DARK: '#2B2D31',
  WHITE: '#FFFFFF',

  GOLD: '#D4A54A',
  GOLD_BRIGHT: '#E8C34A',
  GOLD_DECO: '#F0C060',
  DAMAGE: '#EF5350',
  HEAL: '#66BB6A',
  LOOT: '#81C784',
  INFO: '#4FC3F7',
  STAT_HP: '#4CAF78',
  STAT_ATK: '#E06030',
  STAT_DEF: '#3A8AC8',
  STAT_SPD: '#D4B800',
  XP_BLUE: '#5090F0',

  // Glass accent strings (für Text.setColor)
  GLASS_BUILD:      '#F59E0B',
  GLASS_GUILD:      '#FFD700',
  GLASS_EXPEDITION: '#E94560',
  GLASS_STORAGE:    '#22C55E',
  GLASS_HERO:       '#A855F7',
  GLASS_MENU:       '#FFD700',
  GLASS_DIM:        '#AAAAAA',
  GLASS_DISABLED:   '#666666',
} as const;

// ─── Text-Styles (inkl. Font-Familie) ────────────────────────
export const UI_TEXT_STYLES = {
  // Grössen
  TITLE:    { fontFamily: FONT_FAMILY, fontSize: '48px', color: UI_STR_COLORS.GOLD },
  SUBTITLE: { fontFamily: FONT_FAMILY, fontSize: '20px', color: UI_STR_COLORS.DIM },
  H1:       { fontFamily: FONT_FAMILY, fontSize: '22px', color: UI_STR_COLORS.LIGHT },
  H2:       { fontFamily: FONT_FAMILY, fontSize: '18px', color: UI_STR_COLORS.GOLD },
  H3:       { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.GOLD },
  HEADER:   { fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.LIGHT },
  BODY:     { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.LIGHT },
  BODY_DIM: { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.DIM },
  SMALL:    { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM },
  SMALL_LIGHT: { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT },
  TINY:     { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.DIM },
  TINY_LIGHT: { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT },
  MICRO:    { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.MUTED },

  // Semantische Styles
  GOLD:     { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.GOLD },
  GOLD_BODY: { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD_BRIGHT },
  GOLD_SMALL: { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD },
  DAMAGE:   { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.DAMAGE },
  HEAL:     { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.HEAL },
  LOOT:     { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LOOT },
  INFO:     { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.INFO },
  DISABLED: { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.DISABLED },

  // Spezial
  CLOSE_BTN: { fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.DAMAGE },
  LABEL:    { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT },
  LABEL_DIM: { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM },
  CREDITS:  { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.DISABLED },
} as const;

// ─── Grid-Konstanten ────────────────────────────────────────
export const TILE_SIZE = 32;
export const GRID_WIDTH = 40;
export const GRID_HEIGHT = 36;
export const WORLD_WIDTH = GRID_WIDTH * TILE_SIZE;   // 1280
export const WORLD_HEIGHT = GRID_HEIGHT * TILE_SIZE;  // 1152
/** Extra pixels around the playable grid for border decorations (trees, water, rocks) */
export const BORDER_MARGIN_TILES = 5;
export const BORDER_MARGIN_PX = BORDER_MARGIN_TILES * TILE_SIZE;  // 160

// ─── Isometric Mode ──────────────────────────────────────────
/** True = render in isometric projection; False = legacy top-down */
export const ISO_MODE = true;
