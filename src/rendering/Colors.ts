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

  // Baumodus
  BUILD_VALID: 0x00FF00,
  BUILD_INVALID: 0xFF0000,

  // Construction Overlay
  CONSTRUCTION_OVERLAY: 0x000000,
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
  DAMAGE: '#EF5350',
  HEAL: '#66BB6A',
  LOOT: '#81C784',
  INFO: '#4FC3F7',
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
  BODY:     { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT },
  BODY_DIM: { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.DIM },
  SMALL:    { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DIM },
  SMALL_LIGHT: { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT },
  TINY:     { fontFamily: FONT_FAMILY, fontSize: '8px', color: UI_STR_COLORS.DIM },
  TINY_LIGHT: { fontFamily: FONT_FAMILY, fontSize: '8px', color: UI_STR_COLORS.LIGHT },
  MICRO:    { fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.MUTED },

  // Semantische Styles
  GOLD:     { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.GOLD },
  GOLD_BODY: { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD_BRIGHT },
  GOLD_SMALL: { fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD },
  DAMAGE:   { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.DAMAGE },
  HEAL:     { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.HEAL },
  LOOT:     { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LOOT },
  INFO:     { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.INFO },
  DISABLED: { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DISABLED },

  // Spezial
  CLOSE_BTN: { fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.DAMAGE },
  LABEL:    { fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT },
  LABEL_DIM: { fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM },
  CREDITS:  { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DISABLED },
} as const;

// ─── Grid-Konstanten ────────────────────────────────────────
export const TILE_SIZE = 32;
export const GRID_WIDTH = 40;
export const GRID_HEIGHT = 36;
export const WORLD_WIDTH = GRID_WIDTH * TILE_SIZE;   // 1280
export const WORLD_HEIGHT = GRID_HEIGHT * TILE_SIZE;  // 1152
