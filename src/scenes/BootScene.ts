import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // TODO: Use TexturePacker or similar to combine sprites into atlas for fewer draw calls.
    // Steps to migrate:
    //   1. Run TexturePacker (or `npx free-tex-packer`) on public/assets/sprites/final/
    //      to produce atlas.png + atlas.json (Phaser 3 / JSON Hash format).
    //   2. Replace the individual `this.load.image(key, ...)` calls below with:
    //        this.load.atlas('game_atlas', 'assets/sprites/atlas.png', 'assets/sprites/atlas.json');
    //   3. Update all `this.add.image(...)` / `this.add.sprite(...)` calls in CityScene,
    //      GuildUI, etc. to pass the atlas key and frame name instead of individual texture keys.
    //      Example: this.add.image(x, y, 'game_atlas', 'FARM_GRAIN')
    //   4. Remove or keep the individual loads as fallback for non-atlas frames.
    // Benefit: reduces GPU draw calls (potentially 50+ -> 1 per atlas) for better performance.

    // --- Progress bar ---
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(UI_COLORS.PANEL_BG, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    const loadingText = this.add.text(width / 2, height / 2 - 40, 'Magic City wird geladen...', {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.GOLD,
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.LIGHT,
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(UI_COLORS.PANEL_BORDER, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // --- Gebäude Sprites ---
    const buildings = [
      'FARM_GRAIN', 'MILL_WIND', 'BAKERY', 'LUMBER_CAMP', 'QUARRY',
      'WAREHOUSE', 'HOUSE_T1', 'GUILD_HALL', 'WELL', 'HERB_GARDEN',
      'SMITHY', 'IRON_MINE', 'ROAD',
    ];
    buildings.forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- Isometric Building Sprites (used when ISO_MODE = true) ---
    [
      'ISO_HOUSE', 'ISO_GUILD_HALL', 'ISO_WAREHOUSE',
      'ISO_FARM_GRAIN', 'ISO_MILL_WIND', 'ISO_BAKERY', 'ISO_LUMBER_CAMP',
      'ISO_QUARRY', 'ISO_HERB_GARDEN', 'ISO_SMITHY', 'ISO_IRON_MINE', 'ISO_WELL',
      'ISO_DUNGEON_CAMP', 'ISO_DUNGEON_MOUNTAIN',
      'ISO_GRASS_TILE', 'ISO_WATER_TILE',
      'ISO_TREE_LARGE', 'ISO_TREE_PINE', 'ISO_TREE_SMALL',
    ].forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- Helden Sprites ---
    ['HERO_GUARDIAN', 'HERO_RANGER', 'HERO_CLERIC',
     'HERO_BERSERKER', 'HERO_ASSASSIN', 'HERO_PALADIN', 'HERO_BARD',
     'HERO_WITCH', 'HERO_NECROMANCER', 'HERO_DRUID'].forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- Held-Portraits (große Charakter-Illustrationen) ---
    ['PORTRAIT_GUARDIAN', 'PORTRAIT_RANGER', 'PORTRAIT_CLERIC'].forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- Boss Sprites ---
    ['BOSS_ELDER_TREANT', 'BOSS_BANDIT_CHIEF', 'BOSS_CRYSTAL_GOLEM', 'BOSS_SWAMP_HYDRA',
     'BOSS_SPIDER_QUEEN', 'BOSS_FALLEN_KNIGHT', 'BOSS_SHADOW_LICH', 'BOSS_MAGMA_WYRM',
     'BOSS_ARCHIV_WATCHER', 'BOSS_ANCIENT_DRAGON'].forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- Gegner Sprites ---
    const enemies = [
      // MVP enemies
      'ENEMY_FOREST_WOLF', 'ENEMY_BANDIT_RAIDER', 'ENEMY_CAVE_SLIME',
      'ENEMY_THORN_SPRITE', 'ENEMY_FUNGAL_CREEPER', 'ENEMY_SHADOW_BAT',
      'ENEMY_MOSS_GOLEM', 'ENEMY_VENOMFANG_SPIDER', 'ENEMY_GOBLIN_SCOUT',
      'ENEMY_WILD_BOAR', 'ENEMY_HOLLOW_SHADE', 'ENEMY_BRAMBLE_BEAR',
      'ENEMY_CURSED_WISP', 'ENEMY_CRYSTAL_BEETLE', 'ENEMY_DEEP_CRAWLER',
      'ENEMY_MINE_SPECTER', 'ENEMY_STALACTITE_BAT', 'ENEMY_MAGMA_SLUG',
      'ENEMY_BOG_WITCH', 'ENEMY_SWAMP_TROLL', 'ENEMY_LEECH_SWARM',
      'ENEMY_MIRE_PHANTOM', 'ENEMY_TOXIC_TOAD', 'ENEMY_ROT_WALKER',
      // Post-MVP enemies (sprites exist in final/)
      'ENEMY_SKELETON_WARRIOR', 'ENEMY_CURSED_KNIGHT', 'ENEMY_TOMB_WRAITH',
      'ENEMY_BONE_ARCHER', 'ENEMY_GIANT_SPIDER', 'ENEMY_EGG_SAC_GUARDIAN',
      'ENEMY_VENOMOUS_LURKER', 'ENEMY_LAVA_GOLEM', 'ENEMY_FLAME_SPIRIT',
      'ENEMY_ASH_GOLEM', 'ENEMY_CURSED_PRIEST', 'ENEMY_GHOST_MAGE',
      'ENEMY_TOME_GUARDIAN',
    ];
    enemies.forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- Item Sprites ---
    [
      'ITEM_BREAD', 'ITEM_HEALING_POTION', 'ITEM_IRON_SWORD',
      'ITEM_IRON_SHIELD', 'ITEM_LEATHER_ARMOR', 'ITEM_CRYSTAL_SHARD',
      // Post-MVP items (sprites exist in final/)
      'ITEM_FROSTUMHANG', 'ITEM_FLAMMENWARD', 'ITEM_ANTIDOT_AMULETT',
      'ITEM_STURMMANTEL', 'ITEM_SCHATTENSCHLEIER', 'ITEM_MAGIESCHILD',
      // T1 gear
      'ITEM_HUNTER_BOW', 'ITEM_OAK_STAFF', 'ITEM_WOLF_FANG_NECKLACE',
      // T2 gear
      'ITEM_STEEL_SWORD', 'ITEM_LONGBOW', 'ITEM_CRYSTAL_STAFF',
      'ITEM_STEEL_ARMOR', 'ITEM_RANGER_CLOAK', 'ITEM_CRYSTAL_PENDANT',
      // T3 boss drops
      'ITEM_TREANT_HEARTWOOD_SHIELD', 'ITEM_CRYSTAL_GOLEM_CORE',
      'ITEM_HYDRA_VENOMFANG', 'ITEM_BANDIT_KINGS_CLOAK',
      'ITEM_SPIDER_SILK_VEST', 'ITEM_FALLEN_KNIGHTS_BLADE',
      'ITEM_LICH_PHYLACTERY', 'ITEM_WYRM_SCALE_SHIELD',
      // T4 legendary
      'ITEM_BLADE_OF_THOUSAND_SHADOWS', 'ITEM_SHIELD_OF_THE_ANCIENT',
      'ITEM_AMULET_OF_REBIRTH',
      // Misc
      'ITEM_POWER_BREAD', 'ITEM_HERB_GREEN', 'ITEM_OLD_COIN',
      'ITEM_TALISMAN_FRAGMENT',
    ].forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- Specialist Sprites ---
    ['SPEC_BAKER_MASTER', 'SPEC_HERB_SAGE', 'SPEC_FORGE_SMITH'].forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- Terrain & Deko Sprites ---
    [
      'TERRAIN_GRASS', 'TERRAIN_TREE_LARGE', 'TERRAIN_TREE_PINE',
      'TERRAIN_DIRT', 'TERRAIN_WATER', 'ROAD_COBBLE',
      'DECO_FLOWER_1', 'DECO_ROCK_1', 'DECO_BUSH_1',
      'DECO_TREE_SMALL', 'DECO_GRASS_TUFT', 'DECO_STONE_LARGE',
      'DECO_MUSHROOM', 'DECO_LOG', 'DECO_WILDFLOWER_2',
    ].forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- UI Sprites (Icons, Panels, Texturen) ---
    const uiSprites = [
      'UI_PANEL_BG', 'UI_PANEL_HEADER', 'UI_BUTTON_NORMAL', 'UI_BUTTON_HOVER',
      'UI_BUTTON_ACTIVE', 'UI_HUD_BAR', 'UI_SIDEBAR_BG', 'UI_BUILDMENU_BG',
      'UI_TAB_ACTIVE', 'UI_TAB_INACTIVE', 'UI_TOOLTIP_BG', 'UI_FRAME_GOLD',
      'UI_PROGRESS_BAR_BG', 'UI_PROGRESS_BAR_FILL', 'UI_HP_BAR_FILL',
      'UI_RESOURCE_SLOT', 'UI_CARD_BG', 'UI_DIVIDER', 'UI_LOGO',
      'ICON_BUILD', 'ICON_ROAD', 'ICON_GUILD', 'ICON_EXPEDITION',
      'ICON_STORAGE', 'ICON_HELP', 'ICON_WOOD', 'ICON_STONE',
      'ICON_BREAD', 'ICON_GOLD', 'ICON_POP', 'ICON_TRAINING',
      'BG_MAIN_MENU',
    ];
    uiSprites.forEach(key => {
      this.load.image(key, `assets/sprites/final/${key}.png`);
    });

    // --- SFX ---
    const sfxFiles = [
      'ui_click', 'ui_coin', 'combat_hit', 'combat_sword', 'combat_arrow',
      'combat_heal', 'build_place', 'production_bread', 'production_mill',
      'production_smithy', 'settler_arrive', 'specialist_found', 'achievement',
      'rank_up', 'checkpoint_reached', 'dungeon_enter', 'dungeon_footstep',
      'dungeon_creak', 'dungeon_drip', 'dungeon_wind', 'biome_forest_enter',
      'biome_cave_enter', 'biome_swamp_enter', 'boss_intro', 'boss_victory',
      'party_wipe', 'encounter_alert', 'retreat_horn', 'expedition_start',
      'trap_trigger', 'chest_open',
    ];
    sfxFiles.forEach(key => {
      this.load.audio(key, `assets/audio/sfx/${key}.wav`);
    });

    // --- Music ---
    this.load.audio('music_city', 'assets/audio/music/ambient_city.mp3');
    this.load.audio('music_forest', 'assets/audio/music/ambient_forest.mp3');
    this.load.audio('music_swamp', 'assets/audio/music/ambient_swamp.mp3');
    this.load.audio('music_cave', 'assets/audio/music/Ecambient_cave.mp3');
    this.load.audio('music_boss', 'assets/audio/music/ambient_boss.mp3');
  }

  create(): void {
    // Background removal now happens offline via: npm run remove-bg
    // No runtime pixel manipulation needed – sprites are pre-processed with transparency.
    this.generateCleanUITextures();
    this.scene.start('MainMenuScene');
  }

  /**
   * Generate clean, flat UI textures via Canvas that work properly with NineSlice.
   * Replaces the AI-generated illustration-style sprites which distort when stretched.
   */
  private generateCleanUITextures(): void {
    const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
    const bgDark = hex(UI_COLORS.PANEL_BG_DARK);
    const bg = hex(UI_COLORS.PANEL_BG);
    const border = hex(UI_COLORS.PANEL_BORDER);
    const btnNormal = hex(UI_COLORS.BTN_NORMAL);
    const btnHover = hex(UI_COLORS.BTN_HOVER);
    const btnDark = hex(UI_COLORS.BTN_DARK);
    const tabActive = hex(UI_COLORS.TAB_ACTIVE);
    const tabInactive = hex(UI_COLORS.TAB_INACTIVE);
    const cardBg = hex(UI_COLORS.CARD_BG);
    const progressBg = hex(UI_COLORS.PROGRESS_BG);
    const progressBorder = hex(UI_COLORS.PROGRESS_BORDER);
    const successGreen = hex(UI_COLORS.SUCCESS_GREEN);
    const goldMid = hex(UI_COLORS.GOLD_MID);
    const damageRed = hex(UI_COLORS.DAMAGE_RED);

    const make = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d')!;
      draw(ctx);
      this.textures.addCanvas(key, c);
    };

    const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // Helper: filled rounded rect with border
    const panel = (ctx: CanvasRenderingContext2D, w: number, h: number,
      fill: string, stroke: string, lineW: number, radius: number) => {
      rr(ctx, 0, 0, w, h, radius);
      ctx.fillStyle = fill;
      ctx.fill();
      rr(ctx, lineW / 2, lineW / 2, w - lineW, h - lineW, Math.max(0, radius - 1));
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineW;
      ctx.stroke();
    };

    // ── Panels ──
    // NineSlice borders: [32,32,32,32] → texture ≥ 65px
    make('UI_PANEL_BG', 96, 96, (ctx) => panel(ctx, 96, 96, bgDark, border, 2, 8));

    // NineSlice borders: [24,24,24,24]
    make('UI_PANEL_HEADER', 72, 72, (ctx) => {
      panel(ctx, 72, 72, bg, border, 1.5, 4);
      // Subtle inner highlight at top
      ctx.fillStyle = 'rgba(212, 165, 74, 0.08)';
      ctx.fillRect(2, 2, 68, 34);
    });

    // NineSlice borders: [16,16,16,16]
    make('UI_SIDEBAR_BG', 48, 48, (ctx) => panel(ctx, 48, 48, bgDark, border, 1.5, 4));
    make('UI_BUILDMENU_BG', 48, 48, (ctx) => panel(ctx, 48, 48, bgDark, border, 1.5, 4));

    // ── HUD Bar ── borders: [8,8,8,8]
    make('UI_HUD_BAR', 32, 32, (ctx) => panel(ctx, 32, 32, bgDark, border, 1, 3));

    // ── Buttons ── borders: [16,16,16,16]
    make('UI_BUTTON_NORMAL', 48, 48, (ctx) => panel(ctx, 48, 48, btnNormal, border, 1.5, 6));
    make('UI_BUTTON_HOVER', 48, 48, (ctx) => panel(ctx, 48, 48, btnHover, goldMid, 1.5, 6));
    make('UI_BUTTON_ACTIVE', 48, 48, (ctx) => panel(ctx, 48, 48, btnDark, border, 2, 6));

    // ── Tabs ── borders: [12,12,12,12]
    make('UI_TAB_ACTIVE', 36, 36, (ctx) => {
      panel(ctx, 36, 36, tabActive, border, 1, 4);
      // Bottom gold accent line
      ctx.fillStyle = border;
      ctx.fillRect(4, 33, 28, 2);
    });
    make('UI_TAB_INACTIVE', 36, 36, (ctx) => panel(ctx, 36, 36, tabInactive, progressBorder, 1, 4));

    // ── Cards ── borders: [16,16,16,16]
    make('UI_CARD_BG', 48, 48, (ctx) => panel(ctx, 48, 48, cardBg, progressBorder, 1, 4));

    // ── Tooltip ── borders: [12,12,12,12]
    make('UI_TOOLTIP_BG', 36, 36, (ctx) => panel(ctx, 36, 36, bgDark, progressBorder, 1, 5));

    // ── Progress Bars ── borders: [6,6,6,6]
    make('UI_PROGRESS_BAR_BG', 24, 24, (ctx) => panel(ctx, 24, 24, progressBg, progressBorder, 1, 3));
    make('UI_PROGRESS_BAR_FILL', 24, 24, (ctx) => panel(ctx, 24, 24, successGreen, successGreen, 0, 3));
    make('UI_HP_BAR_FILL', 24, 24, (ctx) => panel(ctx, 24, 24, damageRed, damageRed, 0, 3));

    // ── Resource Slot ── borders: [8,8,8,8]
    make('UI_RESOURCE_SLOT', 24, 24, (ctx) => panel(ctx, 24, 24, bg, progressBorder, 1, 3));

    // ── Divider ── simple gold line
    make('UI_DIVIDER', 32, 8, (ctx) => {
      ctx.fillStyle = 'rgba(212, 165, 74, 0.4)';
      ctx.fillRect(0, 3, 32, 2);
    });

    // ── Frame Gold ── borders: [20,20,20,20], transparent center
    make('UI_FRAME_GOLD', 64, 64, (ctx) => {
      rr(ctx, 0, 0, 64, 64, 4);
      ctx.strokeStyle = border;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Inner stroke
      rr(ctx, 4, 4, 56, 56, 2);
      ctx.strokeStyle = 'rgba(212, 165, 74, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // ── Remove ROAD texture (AI generated a building, not a road tile) ──
    if (this.textures.exists('ROAD')) {
      this.textures.remove('ROAD');
    }
  }

  /**
   * Fallback: Remove any remaining magenta/black pixels at runtime.
   * Main removal happens offline via `npm run remove-bg`.
   */
  private removeBlackBackgrounds(): void {
    // UI textures are replaced by generateCleanUITextures() – skip them
    const skipKeys = new Set([
      '__DEFAULT', '__MISSING', '__WHITE',
      'UI_PANEL_BG', 'UI_PANEL_HEADER', 'UI_SIDEBAR_BG', 'UI_BUILDMENU_BG',
      'UI_HUD_BAR', 'UI_BUTTON_NORMAL', 'UI_BUTTON_HOVER', 'UI_BUTTON_ACTIVE',
      'UI_TAB_ACTIVE', 'UI_TAB_INACTIVE', 'UI_CARD_BG', 'UI_TOOLTIP_BG',
      'UI_PROGRESS_BAR_BG', 'UI_PROGRESS_BAR_FILL', 'UI_HP_BAR_FILL',
      'UI_RESOURCE_SLOT', 'UI_DIVIDER', 'UI_FRAME_GOLD', 'ROAD',
      'BG_MAIN_MENU',
    ]);
    const allKeys = this.textures.getTextureKeys();

    for (const key of allKeys) {
      if (skipKeys.has(key)) continue;
      const texture = this.textures.get(key);
      const source = texture.getSourceImage() as HTMLImageElement;
      if (!source || !source.width || source.width === 0) continue;

      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.drawImage(source, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      let changed = false;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
        if (a === 0) continue;

        // Magenta: R hoch, G niedrig, B hoch (clear cases)
        if (r > 180 && g < 100 && b > 180) {
          d[i + 3] = 0; changed = true; continue;
        }
        if (r > 160 && g < 80 && b > 160 && (r + b) > (g * 4)) {
          d[i + 3] = 0; changed = true; continue;
        }

        // Soft magenta edge – only very confident matches (preserve reddish/brownish pixels)
        if (g < r && g < b && r > 140 && b > 140) {
          const rF = Math.min(1, r / 180);
          const bF = Math.min(1, b / 180);
          const gI = 1 - (g / Math.max(r, b, 1));
          const mag = rF * bF * gI;
          if (mag > 0.55) {
            d[i + 3] = Math.round((1 - mag) * a);
            changed = true; continue;
          }
        }

        // Black – very conservative to preserve shadows and outlines
        const maxCh = Math.max(r, g, b);
        if (maxCh < 15) {
          d[i + 3] = 0; changed = true;
        } else if (maxCh < 30) {
          d[i + 3] = Math.round(((maxCh - 15) / 15) * a);
          changed = true;
        }
      }

      if (changed) {
        ctx.putImageData(imageData, 0, 0);
        this.textures.remove(key);
        this.textures.addCanvas(key, canvas);
      }
    }
  }
}
