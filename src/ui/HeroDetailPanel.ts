import Phaser from 'phaser';
import { GuildFighter } from '../models/GuildRoster';
import { GameState } from '../models/GameState';
import { CLASS_DEFS } from '../data/classes';
import { ITEM_DEFS, ItemDef } from '../data/items';
import { GearSystem } from '../systems/GearSystem';
import { xpProgress, xpForNextLevel, MAX_HERO_LEVEL } from '../systems/HeroProgression';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';

const PANEL_W = 600;
const PANEL_H = 680;
const RADIUS  = 10;

/**
 * HeroDetailPanel – 600×680px Modal (2026 Dark Fantasy Style).
 * Zeigt vollständige Heldendetails: Portrait, Stats (Bars), Gear, XP-Fortschritt.
 * Öffnen: panel.open(fighter, state)
 * Schließen: panel.close()
 */
export class HeroDetailPanel {
  private scene:     Phaser.Scene;
  private gearSys:   GearSystem;
  private container: Phaser.GameObjects.Container;
  private content:   Phaser.GameObjects.Container;
  private isVisible  = false;
  private itemPopup?: Phaser.GameObjects.Container;

  public onGearChanged?: (state: GameState) => void;

  constructor(scene: Phaser.Scene, gearSystem: GearSystem) {
    this.scene   = scene;
    this.gearSys = gearSystem;
    this.container = scene.add.container(0, 0).setDepth(990).setVisible(false);
    this.content   = scene.add.container(0, 0);
    this.buildFrame();               // dim/bg/close-btn first (lower draw order)
    this.container.add(this.content); // content on top → visible + clickable
  }

  // ─── Public API ─────────────────────────────────────────────

  open(fighter: GuildFighter, state: GameState): void {
    this.positionCenter();
    try {
      this.rebuildContent(fighter, state);
    } catch (e) {
      console.error('[HeroDetailPanel] rebuildContent error:', e);
    }
    this.container.setVisible(true);
    this.isVisible = true;
  }

  close(): void {
    this.container.setVisible(false);
    this.isVisible = false;
  }

  get visible(): boolean { return this.isVisible; }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z      = cam.zoom;
    const sw     = this.scene.scale.width;
    const sh     = this.scene.scale.height;
    const screenX = (sw - PANEL_W) / 2;
    const screenY = (sh - PANEL_H) / 2;
    this.container.setPosition(cam.worldView.x + screenX / z, cam.worldView.y + screenY / z);
    this.container.setScale(1 / z);
  }

  // ─── Frame (permanent, gebaut einmalig) ─────────────────────

  private buildFrame(): void {
    // Dimm-Overlay hinter dem Panel – blockiert Klicks auf GuildUI darunter
    const dim = this.scene.add.graphics();
    dim.fillStyle(0x000000, 0.55);
    dim.fillRect(-2000, -2000, 6000, 6000);
    dim.setInteractive(new Phaser.Geom.Rectangle(-2000, -2000, 6000, 6000), Phaser.Geom.Rectangle.Contains);
    this.container.add(dim);

    // Panel-Hintergrund
    const bg = this.scene.add.graphics();
    // Outer glow border (dim)
    bg.lineStyle(3, UI_COLORS.GOLD_DECO_DIM, 0.4);
    bg.strokeRoundedRect(-1, -1, PANEL_W + 2, PANEL_H + 2, RADIUS + 1);
    // Navy BG
    bg.fillStyle(UI_COLORS.NAVY_DEEP, 1);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, RADIUS);
    // Inner bright border
    bg.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.9);
    bg.strokeRoundedRect(0, 0, PANEL_W, PANEL_H, RADIUS);
    // Header-Gradient-Stripe
    bg.fillStyle(UI_COLORS.NAVY_PANEL, 1);
    bg.fillRoundedRect(0, 0, PANEL_W, 60, { tl: RADIUS, tr: RADIUS, bl: 0, br: 0 });
    // Header bottom separator
    bg.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.5);
    bg.lineBetween(0, 60, PANEL_W, 60);
    this.container.add(bg);

    // Schließen-Button (X) oben rechts
    const closeBtnX = PANEL_W - 36;
    const closeBtnY = 14;
    const closeGfx  = this.scene.add.graphics();
    closeGfx.fillStyle(UI_COLORS.NAVY_BTN, 1);
    closeGfx.fillRoundedRect(closeBtnX, closeBtnY, 28, 28, 5);
    closeGfx.lineStyle(1, UI_COLORS.DAMAGE_RED, 0.5);
    closeGfx.strokeRoundedRect(closeBtnX, closeBtnY, 28, 28, 5);
    closeGfx.setInteractive(new Phaser.Geom.Rectangle(closeBtnX, closeBtnY, 28, 28), Phaser.Geom.Rectangle.Contains);
    closeGfx.on('pointerover', () => { closeGfx.clear(); closeGfx.fillStyle(UI_COLORS.DAMAGE_RED, 0.8); closeGfx.fillRoundedRect(closeBtnX, closeBtnY, 28, 28, 5); });
    closeGfx.on('pointerout',  () => { closeGfx.clear(); closeGfx.fillStyle(UI_COLORS.NAVY_BTN, 1); closeGfx.fillRoundedRect(closeBtnX, closeBtnY, 28, 28, 5); closeGfx.lineStyle(1, UI_COLORS.DAMAGE_RED, 0.5); closeGfx.strokeRoundedRect(closeBtnX, closeBtnY, 28, 28, 5); });
    closeGfx.on('pointerdown', () => this.close());
    this.container.add(closeGfx);
    this.container.add(
      this.scene.add.text(closeBtnX + 14, closeBtnY + 14, '✕', {
        fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.DAMAGE,
      }).setOrigin(0.5, 0.5),
    );
  }

  // ─── Dynamic Content ─────────────────────────────────────────

  private positionCenter(): void {
    const cam    = this.scene.cameras.main;
    const z      = cam.zoom;
    const sw     = this.scene.scale.width;
    const sh     = this.scene.scale.height;
    const screenX = (sw - PANEL_W) / 2;
    const screenY = (sh - PANEL_H) / 2;
    this.container.setPosition(cam.worldView.x + screenX / z, cam.worldView.y + screenY / z);
    this.container.setScale(1 / z);
  }

  private rebuildContent(fighter: GuildFighter, state: GameState): void {
    this.itemPopup = undefined; // cleared by removeAll(true) below
    this.content.removeAll(true);
    const cls   = CLASS_DEFS[fighter.classId];
    const stats = this.gearSys.getEffectiveStats(fighter);
    const citizen = state.citizens.find(c => c.fighterId === fighter.id);

    let y = 0;

    // ═══════════════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════════════
    // Hero Name
    this.content.add(
      this.scene.add.text(20, 18, fighter.name, {
        fontFamily: FONT_FAMILY, fontSize: '22px', color: UI_STR_COLORS.LIGHT, fontStyle: 'bold',
      }),
    );
    // Level Badge (oben rechts, neben X-Button Platz lassen)
    const lvlBadge = this.scene.add.graphics();
    lvlBadge.fillStyle(UI_COLORS.NAVY_BTN_ACTIVE, 1);
    lvlBadge.fillRoundedRect(PANEL_W - 120, 16, 70, 28, 5);
    lvlBadge.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.8);
    lvlBadge.strokeRoundedRect(PANEL_W - 120, 16, 70, 28, 5);
    this.content.add(lvlBadge);
    this.content.add(
      this.scene.add.text(PANEL_W - 85, 30, `LVL ${fighter.level}`, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5),
    );

    y = 70;

    // ═══════════════════════════════════════════════════
    // PORTRAIT + KLASSE + XP
    // ═══════════════════════════════════════════════════
    const portraitX = 20;
    const portraitW = 180;
    const portraitH = 225;

    // Portrait zone background (very dark)
    const pBg = this.scene.add.graphics();
    pBg.fillStyle(0x0C0D14, 1);
    pBg.fillRoundedRect(portraitX, y, portraitW, portraitH, 8);
    this.content.add(pBg);

    // Portrait image — HERO_* sprite first, PORTRAIT_* as fallback
    const heroKey     = cls?.spriteKey ?? '';
    const portraitKey = `PORTRAIT_${fighter.classId.toUpperCase()}`;
    const hasHeroSprite = !!(heroKey && this.scene.textures.exists(heroKey));
    const hasPortrait   = this.scene.textures.exists(portraitKey);

    if (hasHeroSprite || hasPortrait) {
      const imgKey = hasHeroSprite ? heroKey : portraitKey;
      this.content.add(
        this.scene.add.image(portraitX + portraitW / 2, y + portraitH / 2, imgKey)
          .setDisplaySize(portraitW - 2, portraitH - 2),
      );
    } else {
      this.content.add(
        this.scene.add.text(portraitX + portraitW / 2, y + portraitH / 2, '?', {
          fontFamily: FONT_FAMILY, fontSize: '48px', color: UI_STR_COLORS.DIM,
        }).setOrigin(0.5, 0.5),
      );
    }

    // Gold frame around portrait
    const pFrame = this.scene.add.graphics();
    pFrame.lineStyle(2, UI_COLORS.SLOT_BORDER_FILLED, 0.8);
    pFrame.strokeRoundedRect(portraitX, y, portraitW, portraitH, 8);
    this.content.add(pFrame);

    // Right side of portrait area
    const infoX = portraitX + portraitW + 20;
    const infoW = PANEL_W - infoX - 20;

    // Klassen-Badge
    const roleStr  = cls?.role ?? cls?.name ?? fighter.classId;
    const badgeGfx = this.scene.add.graphics();
    badgeGfx.fillStyle(UI_COLORS.NAVY_PANEL, 1);
    badgeGfx.fillRoundedRect(infoX, y + 4, roleStr.length * 7 + 16, 20, 4);
    badgeGfx.lineStyle(1, UI_COLORS.CHIP_BORDER_GLOW, 0.8);
    badgeGfx.strokeRoundedRect(infoX, y + 4, roleStr.length * 7 + 16, 20, 4);
    this.content.add(badgeGfx);
    this.content.add(
      this.scene.add.text(infoX + 8, y + 6, roleStr, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.INFO,
      }),
    );

    // Klassen-Name
    this.content.add(
      this.scene.add.text(infoX, y + 30, cls?.name ?? fighter.classId, {
        fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.GOLD, fontStyle: 'bold',
      }),
    );

    // Status
    let statusStr = '● Bereit';
    let statusCol: string = UI_STR_COLORS.HEAL;
    if (citizen?.status === 'INJURED_REST')   { statusStr = `● Verletzt (${Math.ceil(citizen.injuryTimer)}s)`;  statusCol = UI_STR_COLORS.DAMAGE; }
    else if (citizen?.status === 'ON_EXPEDITION') { statusStr = '● Auf Expedition'; statusCol = UI_STR_COLORS.GOLD_BRIGHT; }
    else if (!citizen || citizen.status !== 'GUILD_FIGHTER') { statusStr = '● Inaktiv'; statusCol = UI_STR_COLORS.DISABLED; }
    this.content.add(
      this.scene.add.text(infoX, y + 52, statusStr, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: statusCol,
      }),
    );

    // XP Bar
    const xpBarY   = y + 76;
    const xpW      = infoW;
    const xpPct    = xpProgress(fighter);
    const xpNeeded = fighter.level < MAX_HERO_LEVEL ? xpForNextLevel(fighter.level) : 0;
    const xpInLvl  = fighter.level < MAX_HERO_LEVEL ? xpNeeded - Math.max(0, xpNeeded - (fighter.xp - xpNeeded)) : 0;

    this.content.add(
      this.scene.add.text(infoX, xpBarY - 14, `XP bis Level ${fighter.level + 1}`, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.MUTED,
      }),
    );

    const xpBarGfx = this.scene.add.graphics();
    xpBarGfx.fillStyle(UI_COLORS.XP_BAR_BG, 1);
    xpBarGfx.fillRoundedRect(infoX, xpBarY, xpW, 10, 4);
    xpBarGfx.fillStyle(UI_COLORS.XP_BAR_FILL, 1);
    xpBarGfx.fillRoundedRect(infoX, xpBarY, xpW * xpPct, 10, 4);
    // Glow highlight auf dem Fill
    xpBarGfx.fillStyle(0xFFFFFF, 0.15);
    xpBarGfx.fillRoundedRect(infoX, xpBarY, xpW * xpPct, 5, 4);
    this.content.add(xpBarGfx);
    this.content.add(
      this.scene.add.text(infoX + xpW / 2, xpBarY + 5,
        fighter.level >= MAX_HERO_LEVEL ? 'MAX LEVEL' : `${Math.round(xpPct * 100)}%`, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT,
        }).setOrigin(0.5, 0.5),
    );

    // Total XP info
    this.content.add(
      this.scene.add.text(infoX, xpBarY + 16,
        `Gesamt XP: ${fighter.xp}  ·  Nächstes Level: ${fighter.level >= MAX_HERO_LEVEL ? 'MAX' : `${xpNeeded} XP`}`, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
        }),
    );

    y += portraitH + 18;

    // ═══════════════════════════════════════════════════
    // SECTION SEPARATOR helper
    // ═══════════════════════════════════════════════════
    const addSection = (label: string, sy: number): void => {
      const sepGfx = this.scene.add.graphics();
      sepGfx.lineStyle(1, UI_COLORS.NAVY_SEPARATOR, 1);
      sepGfx.lineBetween(20, sy, PANEL_W - 20, sy);
      sepGfx.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.3);
      sepGfx.lineBetween(20, sy + 1, PANEL_W - 20, sy + 1);
      this.content.add(sepGfx);
      this.content.add(
        this.scene.add.text(20, sy + 6, label, {
          fontFamily: FONT_FAMILY, fontSize: '13px',
          color: UI_STR_COLORS.GOLD, fontStyle: 'bold',
        }),
      );
    };

    // ═══════════════════════════════════════════════════
    // KAMPFWERTE
    // ═══════════════════════════════════════════════════
    addSection('KAMPFWERTE', y);
    y += 24;

    const statDefs = [
      { label: 'HP',   val: stats.maxHp,           max: 300, fill: UI_COLORS.STAT_HP_FILL,  bg: UI_COLORS.STAT_HP_BG,  str: `${stats.maxHp}` },
      { label: 'ATK',  val: stats.atk,              max: 60,  fill: UI_COLORS.STAT_ATK_FILL, bg: UI_COLORS.STAT_ATK_BG, str: `${stats.atk}` },
      { label: 'DEF',  val: stats.def,              max: 40,  fill: UI_COLORS.STAT_DEF_FILL, bg: UI_COLORS.STAT_DEF_BG, str: `${stats.def}` },
      { label: 'SPD',  val: stats.spd * 10,         max: 100, fill: UI_COLORS.STAT_SPD_FILL, bg: UI_COLORS.STAT_SPD_BG, str: `${stats.spd.toFixed(1)}` },
      { label: 'CRIT', val: stats.critChance * 100, max: 50,  fill: UI_COLORS.STAT_ATK_FILL, bg: UI_COLORS.STAT_ATK_BG, str: `${(stats.critChance * 100).toFixed(0)}%` },
    ];

    // 2-column layout für Stats
    const statBarW = 200;
    const col2X    = PANEL_W / 2 + 10;
    const statGfx  = this.scene.add.graphics();

    statDefs.forEach((s, idx) => {
      const col   = idx % 2;
      const row   = Math.floor(idx / 2);
      const sx    = col === 0 ? 20 : col2X;
      const sy    = y + row * 28;
      const pct   = Math.min(s.val / s.max, 1);

      // BG bar
      statGfx.fillStyle(s.bg, 1);
      statGfx.fillRoundedRect(sx + 36, sy + 8, statBarW, 10, 4);
      // Fill bar
      statGfx.fillStyle(s.fill, 1);
      statGfx.fillRoundedRect(sx + 36, sy + 8, statBarW * pct, 10, 4);
      // Shine
      statGfx.fillStyle(0xFFFFFF, 0.12);
      statGfx.fillRoundedRect(sx + 36, sy + 8, statBarW * pct, 5, 4);

      this.content.add(
        this.scene.add.text(sx, sy + 12, s.label, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM, fontStyle: 'bold',
        }).setOrigin(0, 0.5),
      );
      this.content.add(
        this.scene.add.text(sx + 36 + statBarW + 6, sy + 12, s.str, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
        }).setOrigin(0, 0.5),
      );
    });
    this.content.add(statGfx);

    y += Math.ceil(statDefs.length / 2) * 28 + 8;

    // ═══════════════════════════════════════════════════
    // AUSRÜSTUNG
    // ═══════════════════════════════════════════════════
    addSection('AUSRÜSTUNG', y);
    y += 24;

    const slotDefs: Array<{ label: string; key: string | null; slotType: 'weapon'|'armor'|'trinket' }> = [
      { label: 'Waffe',   key: fighter.gear.weapon,  slotType: 'weapon' },
      { label: 'Rüstung', key: fighter.gear.armor,   slotType: 'armor' },
      { label: 'Schmuck', key: fighter.gear.trinket, slotType: 'trinket' },
    ];

    const slotW  = 160;
    const slotH  = 90;
    const slotGap = 10;
    const totalSlotsW = slotDefs.length * slotW + (slotDefs.length - 1) * slotGap;
    const slotsStartX = (PANEL_W - totalSlotsW) / 2;

    slotDefs.forEach((slot, si) => {
      const sx  = slotsStartX + si * (slotW + slotGap);
      const item = slot.key ? ITEM_DEFS[slot.key] : null;

      const slotGfx = this.scene.add.graphics();
      slotGfx.fillStyle(item ? UI_COLORS.SLOT_BG : UI_COLORS.NAVY_DEEP, 1);
      slotGfx.fillRoundedRect(sx, y, slotW, slotH, 8);
      slotGfx.lineStyle(1, item ? UI_COLORS.SLOT_BORDER_FILLED : UI_COLORS.SLOT_BORDER, 1);
      slotGfx.strokeRoundedRect(sx, y, slotW, slotH, 8);
      this.content.add(slotGfx);

      // Slot type label (oben)
      this.content.add(
        this.scene.add.text(sx + slotW / 2, y + 6, slot.label.toUpperCase(), {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.MUTED,
        }).setOrigin(0.5, 0),
      );

      if (item) {
        // Item Icon
        const spriteKey = slot.key ? `ITEM_${slot.key.toUpperCase()}` : null;
        if (spriteKey && this.scene.textures.exists(spriteKey)) {
          this.content.add(
            this.scene.add.image(sx + slotW / 2, y + 42, spriteKey)
              .setDisplaySize(36, 36),
          );
        }
        // Item Name
        this.content.add(
          this.scene.add.text(sx + slotW / 2, y + 66, item.name, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
          }).setOrigin(0.5, 0),
        );
        // Tier badge (aus tags ableiten: tier2, tier3, tier4)
        const tierTag = item.tags.find(t => t.startsWith('tier'));
        const tierNum = tierTag ? parseInt(tierTag.replace('tier', ''), 10) : 0;
        if (tierNum > 0) {
          const tierColor: string = tierNum >= 4 ? UI_STR_COLORS.GOLD_BRIGHT : tierNum >= 3 ? UI_STR_COLORS.LOOT : UI_STR_COLORS.INFO;
          const tierBg = this.scene.add.graphics();
          tierBg.fillStyle(UI_COLORS.NAVY_BTN, 0.9);
          tierBg.fillRoundedRect(sx + 4, y + 4, 22, 14, 3);
          this.content.add(tierBg);
          this.content.add(
            this.scene.add.text(sx + 15, y + 11, `T${tierNum}`, {
              fontFamily: FONT_FAMILY, fontSize: '11px', color: tierColor,
            }).setOrigin(0.5, 0.5),
          );
        }
      } else {
        // Leer-State
        this.content.add(
          this.scene.add.text(sx + slotW / 2, y + slotH / 2, '—', {
            fontFamily: FONT_FAMILY, fontSize: '20px', color: UI_STR_COLORS.DISABLED,
          }).setOrigin(0.5, 0.5),
        );
        this.content.add(
          this.scene.add.text(sx + slotW / 2, y + slotH - 14, 'Leer', {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DISABLED,
          }).setOrigin(0.5, 0),
        );
      }

      // Klickbar: Gear aus Inventar ausrüsten
      const availableGear = Object.entries(state.globalStock)
        .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.gearSlot === slot.slotType)
        .map(([id]) => id);

      if (availableGear.length > 0) {
        slotGfx.setInteractive(
          new Phaser.Geom.Rectangle(sx, y, slotW, slotH),
          Phaser.Geom.Rectangle.Contains,
        );
        slotGfx.on('pointerover', () => {
          slotGfx.clear();
          slotGfx.fillStyle(UI_COLORS.SLOT_HOVER, 1);
          slotGfx.fillRoundedRect(sx, y, slotW, slotH, 8);
          slotGfx.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.8);
          slotGfx.strokeRoundedRect(sx, y, slotW, slotH, 8);
        });
        slotGfx.on('pointerout', () => {
          slotGfx.clear();
          slotGfx.fillStyle(item ? UI_COLORS.SLOT_BG : UI_COLORS.NAVY_DEEP, 1);
          slotGfx.fillRoundedRect(sx, y, slotW, slotH, 8);
          slotGfx.lineStyle(1, item ? UI_COLORS.SLOT_BORDER_FILLED : UI_COLORS.SLOT_BORDER, 1);
          slotGfx.strokeRoundedRect(sx, y, slotW, slotH, 8);
        });
        slotGfx.on('pointerdown', () => {
          this.closeItemPopup();
          // Cycle through available gear
          const currentIdx = slot.key ? availableGear.indexOf(slot.key) : -1;
          const nextItem   = availableGear[(currentIdx + 1) % availableGear.length];
          this.gearSys.equip(state, fighter, nextItem);
          this.onGearChanged?.(state);
          this.rebuildContent(fighter, state);
        });

        // "Verfügbar" hint
        this.content.add(
          this.scene.add.text(sx + slotW - 4, y + slotH - 4,
            `${availableGear.length} verfügbar`, {
              fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LOOT,
            }).setOrigin(1, 1),
        );
      }

      // ── Info-Button for equipped items ──
      if (item) {
        const btnR  = 9;
        const btnX  = sx + slotW - btnR - 4;
        const btnY2 = y + btnR + 4;
        const infoBtn = this.scene.add.graphics();
        infoBtn.fillStyle(UI_COLORS.NAVY_BTN, 1);
        infoBtn.fillCircle(btnX, btnY2, btnR);
        infoBtn.lineStyle(1, UI_COLORS.CHIP_BORDER_GLOW, 0.9);
        infoBtn.strokeCircle(btnX, btnY2, btnR);
        infoBtn.setInteractive(
          new Phaser.Geom.Circle(btnX, btnY2, btnR),
          Phaser.Geom.Circle.Contains,
        );
        infoBtn.on('pointerover', () => {
          infoBtn.clear();
          infoBtn.fillStyle(UI_COLORS.NAVY_BTN_HOVER, 1);
          infoBtn.fillCircle(btnX, btnY2, btnR);
          infoBtn.lineStyle(1, UI_COLORS.CHIP_BORDER_GLOW, 1);
          infoBtn.strokeCircle(btnX, btnY2, btnR);
        });
        infoBtn.on('pointerout', () => {
          infoBtn.clear();
          infoBtn.fillStyle(UI_COLORS.NAVY_BTN, 1);
          infoBtn.fillCircle(btnX, btnY2, btnR);
          infoBtn.lineStyle(1, UI_COLORS.CHIP_BORDER_GLOW, 0.9);
          infoBtn.strokeCircle(btnX, btnY2, btnR);
        });
        infoBtn.on('pointerdown', () => {
          this.showItemPopup(item, sx + slotW / 2, y);
        });
        this.content.add(infoBtn);
        this.content.add(
          this.scene.add.text(btnX, btnY2, 'i', {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.INFO, fontStyle: 'bold',
          }).setOrigin(0.5, 0.5),
        );
      }
    });

    y += slotH + 16;

    // ═══════════════════════════════════════════════════
    // SCHLIESSEN BUTTON (unten)
    // ═══════════════════════════════════════════════════
    const closeBtnW = 160;
    const closeBtnX = (PANEL_W - closeBtnW) / 2;
    const closeBtnY = PANEL_H - 50;

    const closeBtnGfx = this.scene.add.graphics();
    closeBtnGfx.fillStyle(UI_COLORS.NAVY_BTN, 1);
    closeBtnGfx.fillRoundedRect(closeBtnX, closeBtnY, closeBtnW, 36, 6);
    closeBtnGfx.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.5);
    closeBtnGfx.strokeRoundedRect(closeBtnX, closeBtnY, closeBtnW, 36, 6);
    closeBtnGfx.setInteractive(
      new Phaser.Geom.Rectangle(closeBtnX, closeBtnY, closeBtnW, 36),
      Phaser.Geom.Rectangle.Contains,
    );
    closeBtnGfx.on('pointerover', () => {
      closeBtnGfx.clear();
      closeBtnGfx.fillStyle(UI_COLORS.NAVY_BTN_HOVER, 1);
      closeBtnGfx.fillRoundedRect(closeBtnX, closeBtnY, closeBtnW, 36, 6);
      closeBtnGfx.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.8);
      closeBtnGfx.strokeRoundedRect(closeBtnX, closeBtnY, closeBtnW, 36, 6);
    });
    closeBtnGfx.on('pointerout', () => {
      closeBtnGfx.clear();
      closeBtnGfx.fillStyle(UI_COLORS.NAVY_BTN, 1);
      closeBtnGfx.fillRoundedRect(closeBtnX, closeBtnY, closeBtnW, 36, 6);
      closeBtnGfx.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.5);
      closeBtnGfx.strokeRoundedRect(closeBtnX, closeBtnY, closeBtnW, 36, 6);
    });
    closeBtnGfx.on('pointerdown', () => this.close());
    this.content.add(closeBtnGfx);
    this.content.add(
      this.scene.add.text(closeBtnX + closeBtnW / 2, closeBtnY + 18, 'Schließen', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
      }).setOrigin(0.5, 0.5),
    );
  }

  // ─── Item Info Popup ─────────────────────────────────────────
  private closeItemPopup(): void {
    this.itemPopup?.destroy();
    this.itemPopup = undefined;
  }

  private showItemPopup(item: ItemDef, slotCenterX: number, slotTopY: number): void {
    this.closeItemPopup();

    const popW = 220;
    const padding = 12;

    // Build stat lines
    const lines: Array<{ text: string; color: string }> = [];
    const sb = item.statBonuses ?? {};
    if (sb.atk)       lines.push({ text: `+${sb.atk} ATK`,                                color: UI_STR_COLORS.DAMAGE });
    if (sb.def)       lines.push({ text: `+${sb.def} DEF`,                                color: UI_STR_COLORS.INFO });
    if (sb.hp)        lines.push({ text: `+${sb.hp} HP`,                                  color: UI_STR_COLORS.HEAL });
    if (sb.spd)       lines.push({ text: `${sb.spd > 0 ? '+' : ''}${sb.spd.toFixed(2)} SPD`, color: sb.spd > 0 ? UI_STR_COLORS.HEAL : UI_STR_COLORS.DAMAGE });
    if (sb.critChance) lines.push({ text: `+${(sb.critChance * 100).toFixed(0)}% CRIT`,   color: UI_STR_COLORS.GOLD_BRIGHT });
    if (item.healAmount) lines.push({ text: `Heilt ${item.healAmount} HP`,                color: UI_STR_COLORS.HEAL });
    if (item.buffEffect) {
      const b = item.buffEffect;
      lines.push({ text: `+${b.value} ${b.stat.toUpperCase()} (${b.durationRooms} Räume)`, color: UI_STR_COLORS.LOOT });
    }

    const lineH  = 18;
    const popH   = padding + 20 + 8 + lines.length * lineH + padding + 26;

    // Position: try above slot, clamp to panel
    let px = slotCenterX - popW / 2;
    let py = slotTopY - popH - 6;
    if (px < 10) px = 10;
    if (px + popW > PANEL_W - 10) px = PANEL_W - 10 - popW;
    if (py < 10) py = slotTopY + 96 + 6;  // flip below if no space above

    const pop = this.scene.add.container(0, 0);
    this.itemPopup = pop;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_COLORS.NAVY_DEEP, 0.97);
    bg.fillRoundedRect(px, py, popW, popH, 8);
    bg.lineStyle(1, UI_COLORS.SLOT_BORDER_FILLED, 0.9);
    bg.strokeRoundedRect(px, py, popW, popH, 8);
    pop.add(bg);

    // Item name
    pop.add(
      this.scene.add.text(px + popW / 2, py + padding, item.name, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD, fontStyle: 'bold',
      }).setOrigin(0.5, 0),
    );

    // Divider
    const divGfx = this.scene.add.graphics();
    divGfx.lineStyle(1, UI_COLORS.NAVY_SEPARATOR, 1);
    divGfx.lineBetween(px + 10, py + padding + 20, px + popW - 10, py + padding + 20);
    pop.add(divGfx);

    // Stat lines
    lines.forEach((ln, i) => {
      pop.add(
        this.scene.add.text(px + popW / 2, py + padding + 28 + i * lineH, ln.text, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: ln.color,
        }).setOrigin(0.5, 0),
      );
    });

    if (lines.length === 0) {
      pop.add(
        this.scene.add.text(px + popW / 2, py + padding + 28, 'Keine Boni', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM,
        }).setOrigin(0.5, 0),
      );
    }

    // Close hint
    pop.add(
      this.scene.add.text(px + popW / 2, py + popH - padding - 4, '[ Klicken zum Schließen ]', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.MUTED,
      }).setOrigin(0.5, 1),
    );

    // Close on click anywhere in popup area
    bg.setInteractive(
      new Phaser.Geom.Rectangle(px, py, popW, popH),
      Phaser.Geom.Rectangle.Contains,
    );
    bg.on('pointerdown', () => this.closeItemPopup());

    this.content.add(pop);
  }

  destroy(): void {
    this.container.destroy();
  }
}
