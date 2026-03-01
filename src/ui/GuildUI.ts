import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { GuildFighter } from '../models/GuildRoster';
import { CLASS_DEFS } from '../data/classes';
import { ITEM_DEFS } from '../data/items';
import { BUILDING_DEFS } from '../data/buildings';
import { ROUTE_DEFS } from '../data/routes';
import { DIFFICULTY_DEFS } from '../data/difficulty';
import { MODIFIER_DEFS } from '../data/modifiers';
import { GearSystem } from '../systems/GearSystem';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import {
  createNineSlice, createPanel, createButton, createProgressBar,
  createTab, createDivider, UITab,
  drawGlassPanel, drawGlassInfoBar,
} from '../rendering/UIHelper';
import { ScoreboardEntry } from '../models/ScoreboardEntry';
import {
  generateWeeklyChallenge, getMedalThresholds, determineMedal,
  getTimeUntilNextChallenge, WeeklyChallengeDef,
} from '../data/weeklyChallenges';
import { STARTING_CLASSES } from '../data/classUnlocks';
import { TALISMAN_DEFS } from '../data/talismans';
import { GUILD_RANK_DEFS } from '../data/guildRanks';
import { TalismanSystem } from '../systems/TalismanSystem';
import { HeroDetailPanel } from './HeroDetailPanel';

type GuildTab = 'training' | 'roster' | 'inventory' | 'expedition' | 'scoreboard';

/**
 * Guild Hall modal with 4 tabs: Training | Roster & Gear | Expedition | Ehrentafel.
 * Phase 4.1/4.2: Uses NineSlice textures from UIHelper.
 */
export class GuildUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private gearSystem: GearSystem;
  private talismanSystem   = new TalismanSystem();
  private heroDetailPanel!: HeroDetailPanel;

  // Tab references (kept alive, not rebuilt on refresh)
  private tabs: UITab[] = [];
  private activeTab: GuildTab = 'training';
  private selectedDifficulty: string = 'normal';
  private selectedModifier: string | null = null;

  // Track which hero inventory panels are expanded in Roster tab
  private heroInventoryOpen: Set<number> = new Set();
  private invBtnBounds = new Map<number, { x: number; y: number; w: number; h: number }>();

  // Dynamic content that gets rebuilt on refresh
  private contentContainer!: Phaser.GameObjects.Container;
  private scrollY      = 0;
  private maxScrollY   = 0;
  private contentHeight = 0;
  private scrollMaskGfx?: Phaser.GameObjects.Graphics;
  private readonly SCROLL_CLIP_TOP = 73;

  // Callbacks
  public onClose?: () => void;
  public onStartExpedition?: (routeId: string, fighterIds: number[], difficulty: string, modifierId: string | null) => void;
  public partySlots: number = 3; // updated by CityScene via BuildingUpgradeSystem

  private panelW = 720;
  private panelH = 600;
  private screenX: number = 0;
  private screenY: number = 0;

  // Store state ref for tab switch without external call
  private lastState: GameState | null = null;

  constructor(scene: Phaser.Scene, gearSystem: GearSystem) {
    this.scene = scene;
    this.gearSystem = gearSystem;
    this.create();
    this.heroDetailPanel = new HeroDetailPanel(scene, gearSystem);
    this.heroDetailPanel.onGearChanged = (state) => {
      this.lastState = state;
    };
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z = cam.zoom;
    this.container.setPosition(cam.worldView.x + this.screenX / z, cam.worldView.y + this.screenY / z);
    this.container.setScale(1 / z);
    this.updateScrollMask();
    if (this.heroDetailPanel?.visible) {
      this.heroDetailPanel.updatePosition(cam);
    }
  }

  /** Redraws the geometry mask so it covers exactly the panel content area in world space. */
  private updateScrollMask(): void {
    if (!this.scrollMaskGfx) return;
    const cx = this.container.x;
    const cy = this.container.y;
    const s  = this.container.scaleX; // = 1/zoom
    this.scrollMaskGfx.clear();
    this.scrollMaskGfx.fillStyle(0xffffff);
    this.scrollMaskGfx.fillRect(
      cx,
      cy + this.SCROLL_CLIP_TOP * s,
      this.panelW * s,
      (this.panelH - this.SCROLL_CLIP_TOP - 6) * s,
    );
  }

  private create(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    this.screenX = cx - this.panelW / 2;
    this.screenY = cy - this.panelH / 2;

    this.container = this.scene.add.container(this.screenX, this.screenY)
      .setDepth(980)
      .setVisible(false);

    // ── Panel Background (Dark Glassmorphism) ──
    const panelBg = this.scene.add.graphics();
    drawGlassPanel(panelBg, 0, 0, this.panelW, this.panelH, UI_COLORS.GLASS_ACCENT_GUILD);
    this.container.add(panelBg);

    // ── Title ──
    this.container.add(
      this.scene.add.text(this.panelW / 2, 12, 'Gildenhaus', {
        fontFamily: FONT_FAMILY, fontSize: '18px', color: UI_STR_COLORS.GLASS_GUILD,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0),
    );

    // ── Close Button (red circle) ──
    const closeBtnContainer = this.scene.add.container(this.panelW - 36, 10);
    const closeBtnGfx = this.scene.add.graphics();
    closeBtnGfx.fillStyle(0xE94560, 1);
    closeBtnGfx.fillCircle(12, 12, 12);
    closeBtnGfx.lineStyle(2, 0xFF6B8A, 0.5);
    closeBtnGfx.strokeCircle(12, 12, 12);
    const closeBtnLabel = this.scene.add.text(12, 12, '✕', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    closeBtnContainer.add([closeBtnGfx, closeBtnLabel]);
    closeBtnContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 24, 24),
      Phaser.Geom.Rectangle.Contains,
    );
    closeBtnContainer.on('pointerover', () => {
      closeBtnGfx.clear();
      closeBtnGfx.fillStyle(0xFF1A3C, 1);
      closeBtnGfx.fillCircle(12, 12, 12);
    });
    closeBtnContainer.on('pointerout', () => {
      closeBtnGfx.clear();
      closeBtnGfx.fillStyle(0xE94560, 1);
      closeBtnGfx.fillCircle(12, 12, 12);
      closeBtnGfx.lineStyle(2, 0xFF6B8A, 0.5);
      closeBtnGfx.strokeCircle(12, 12, 12);
    });
    closeBtnContainer.on('pointerdown', () => this.hide());
    this.container.add(closeBtnContainer);

    // ── Tab bar ──
    this.createTabs();

    // ── Content area (below tabs) ──
    this.contentContainer = this.scene.add.container(0, 0);
    this.container.add(this.contentContainer);

    // ── Scroll mask: clips contentContainer to the content area below the tab bar.
    //    Uses scene.make.graphics({ add: false }) so it never renders as a visible sprite.
    //    Position is kept in sync via updateScrollMask() called from updatePosition().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.scrollMaskGfx = (this.scene.make as any).graphics({ add: false }) as Phaser.GameObjects.Graphics;
    this.contentContainer.setMask(this.scrollMaskGfx.createGeometryMask());

    // ── Mouse-wheel scrolling ──
    this.scene.input.on('wheel', (_p: any, _o: any, _dx: number, deltaY: number) => {
      if (!this.container.visible || this.maxScrollY <= 0) return;
      const ptr = this.scene.input.activePointer;
      const localX = (ptr.worldX - this.container.x) / this.container.scaleX;
      const localY = (ptr.worldY - this.container.y) / this.container.scaleY;
      if (localX < 0 || localX > this.panelW || localY < this.SCROLL_CLIP_TOP || localY > this.panelH) return;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScrollY);
      this.contentContainer.y = -this.scrollY;
    });

    // ── Inventar-Button click (same coordinate math as wheel handler to bypass
    //    Phaser container input quirks with masked/scaled nested containers) ──
    this.scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (!this.container.visible || this.activeTab !== 'roster') return;
      const s = this.container.scaleX;
      const localX = (ptr.worldX - this.container.x) / s;
      const localY = (ptr.worldY - this.container.y) / s + this.scrollY;
      for (const [fighterId, b] of this.invBtnBounds) {
        if (localX >= b.x && localX <= b.x + b.w && localY >= b.y && localY <= b.y + b.h) {
          if (this.heroInventoryOpen.has(fighterId)) {
            this.heroInventoryOpen.delete(fighterId);
          } else {
            this.heroInventoryOpen.add(fighterId);
          }
          this.refresh(this.lastState!);
          break;
        }
      }
    });
  }

  private createTabs(): void {
    const tabDefs: { id: GuildTab; label: string }[] = [
      { id: 'training',    label: '⚒ Training' },
      { id: 'roster',      label: '⚔ Roster' },
      { id: 'inventory',   label: '📦 Inventar' },
      { id: 'expedition',  label: '🗺 Expedition' },
      { id: 'scoreboard',  label: '★ Ehrentafel' },
    ];

    const tabW    = 136;
    const tabH    = 32;
    const tabY    = 38;
    const startX  = (this.panelW - tabDefs.length * tabW) / 2;

    tabDefs.forEach((def, i) => {
      const tx = startX + i * tabW;
      const isActive = def.id === this.activeTab;

      const tabContainer = this.scene.add.container(tx, tabY);

      const bg = this.scene.add.graphics();
      const label = this.scene.add.text(tabW / 2, tabH / 2, def.label, {
        fontFamily: FONT_FAMILY, fontSize: '13px',
        color: isActive ? UI_STR_COLORS.GOLD : UI_STR_COLORS.DIM,
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5, 0.5);

      const underline = this.scene.add.graphics();

      const drawBg = (active: boolean) => {
        bg.clear();
        if (active) {
          // Active tab: gold fill with glow
          bg.lineStyle(6, UI_COLORS.GLASS_ACCENT_GUILD, 0.18);
          bg.strokeRoundedRect(-3, -3, tabW + 6, tabH + 6, { tl: 9, tr: 9, bl: 0, br: 0 });
          bg.fillStyle(UI_COLORS.GLASS_ACCENT_GUILD, 0.85);
          bg.fillRoundedRect(0, 0, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
          bg.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 1);
          bg.strokeRoundedRect(0, 0, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
          // Shine
          bg.lineStyle(1, 0xFFFFFF, 0.15);
          bg.lineBetween(8, 1, tabW - 8, 1);
        } else {
          // Inactive tab: semi-transparent glass
          bg.fillStyle(0xFFFFFF, 0.08);
          bg.fillRoundedRect(0, 0, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
          bg.lineStyle(1, 0xFFFFFF, 0.15);
          bg.strokeRoundedRect(0, 0, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
        }
        if (active) {
          underline.clear();
          underline.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 1);
          underline.lineBetween(4, tabH - 1, tabW - 4, tabH - 1);
        } else {
          underline.clear();
        }
        label.setColor(active ? '#111111' : UI_STR_COLORS.GLASS_DIM);
        label.setFontStyle(active ? 'bold' : 'normal');
      };

      drawBg(isActive);
      tabContainer.add([bg, underline, label]);

      tabContainer.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, tabW, tabH),
        Phaser.Geom.Rectangle.Contains,
      );
      tabContainer.on('pointerover', () => {
        if (!this.tabs[i]?.setActive) return;
        // only highlight if not active
        const isCurrentlyActive = this.activeTab === def.id;
        if (!isCurrentlyActive) {
          bg.clear();
          bg.fillStyle(0xFFFFFF, 0.14);
          bg.fillRoundedRect(0, 0, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
          bg.lineStyle(1, UI_COLORS.GLASS_ACCENT_GUILD, 0.4);
          bg.strokeRoundedRect(0, 0, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
        }
      });
      tabContainer.on('pointerout', () => {
        drawBg(this.activeTab === def.id);
      });
      tabContainer.on('pointerdown', () => {
        this.activeTab = def.id;
        this.updateTabVisuals();
        if (this.lastState) this.refresh(this.lastState);
      });

      this.container.add(tabContainer);
      this.tabs.push({
        container: tabContainer,
        setActive: (active: boolean) => drawBg(active),
      });
    });
  }

  private updateTabVisuals(): void {
    const tabIds: GuildTab[] = ['training', 'roster', 'inventory', 'expedition', 'scoreboard'];
    tabIds.forEach((id, i) => {
      this.tabs[i].setActive(id === this.activeTab);
    });
  }

  show(state: GameState, tab?: GuildTab): void {
    if (tab) this.activeTab = tab;
    this.updateTabVisuals();
    const cam = this.scene.cameras.main;
    this.updatePosition(cam);
    this.refresh(state);
    this.container.setVisible(true);
  }

  hide(): void {
    this.scoreboardRouteFilter = null;
    this.container.setVisible(false);
    this.onClose?.();
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  refresh(state: GameState): void {
    this.lastState = state;
    this.contentContainer.removeAll(true);
    this.invBtnBounds.clear();
    this.scrollY = 0;
    this.contentContainer.y = 0;

    switch (this.activeTab) {
      case 'training':   this.renderTrainingTab(state);   break;
      case 'roster':     this.renderRosterTab(state);     break;
      case 'inventory':  this.renderInventoryTab(state);  break;
      case 'expedition': this.renderExpeditionTab(state); break;
      case 'scoreboard': this.renderScoreboardTab(state); break;
    }

    // Compute how far the user can scroll in this tab
    const visibleH = this.panelH - 73 - 6;
    this.maxScrollY = Math.max(0, this.contentHeight - visibleH);
  }

  // ── Training Tab ──────────────────────────────────────────────

  private renderTrainingTab(state: GameState): void {
    const contentTop = 80;
    let y = contentTop;

    // Explanation text
    this.contentContainer.add(
      this.scene.add.text(20, y, 'Trainiere Buerger zu Kaempfern fuer Expeditionen.', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM,
      }),
    );
    y += 24;

    const guildHall = state.buildings.find(b => b.typeId === 'GUILD_HALL' && b.built);
    const trainingDef = guildHall ? BUILDING_DEFS['GUILD_HALL'].training : null;

    if (!trainingDef) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Kein Gildenhaus gebaut! Baue eins um zu trainieren.', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DAMAGE,
        }),
      );
      this.contentHeight = y + 30;
      return;
    }

    // Stats line (glass info bar)
    const idleCitizens = state.citizens.filter(c => c.status === 'IDLE');
    const trainingCitizens = state.citizens.filter(c => c.status === 'GUILD_TRAINING');

    const statsBarGfx = this.scene.add.graphics();
    drawGlassInfoBar(statsBarGfx, 20, y, this.panelW - 40, 22, 6);
    this.contentContainer.add(statsBarGfx);
    this.contentContainer.add(
      this.scene.add.text(this.panelW / 2, y + 11,
        `Freie Buerger: ${idleCitizens.length}   |   In Training: ${trainingCitizens.length}   |   Kaempfer: ${state.fighters.length}`,
        { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_GUILD }).setOrigin(0.5, 0.5),
    );
    y += 30;

    // ── Aktuell in Training (OBEN, immer sichtbar) ──────────────
    if (trainingCitizens.length > 0) {
      const divT = createDivider(this.scene, 20, y, this.panelW - 40);
      this.contentContainer.add(divT);
      y += 12;
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Aktuell in Training:', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
        }),
      );
      y += 22;

      for (const citizen of trainingCitizens) {
        const remaining = Math.ceil(citizen.trainingTimer);
        const cls = CLASS_DEFS[citizen.trainingClassId ?? ''];
        const totalTime = trainingDef.trainingTimeSec;
        const elapsed = totalTime - remaining;
        const pct = totalTime > 0 ? elapsed / totalTime : 0;

        const bar = createProgressBar(this.scene, {
          x: 20, y: y,
          width: this.panelW - 120, height: 16,
          progress: pct,
          fillColor: UI_COLORS.SUCCESS_GREEN,
        });
        this.contentContainer.add(bar.container);
        this.contentContainer.add(
          this.scene.add.text(24, y + 2,
            `${cls?.name ?? citizen.trainingClassId} – noch ${remaining}s`, {
              fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
            }),
        );
        y += 26;
      }
      y += 6;
    }

    // ── Klasse waehlen ───────────────────────────────────────────
    const dividers = createDivider(this.scene, 20, y, this.panelW - 40);
    this.contentContainer.add(dividers);
    y += 12;

    this.contentContainer.add(
      this.scene.add.text(20, y, 'Klasse waehlen:', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
      }),
    );
    y += 22;

    // Hint when no idle citizens
    if (idleCitizens.length === 0) {
      this.contentContainer.add(
        this.scene.add.text(20, y,
          trainingCitizens.length > 0
            ? 'Alle Buerger im Einsatz – Karten zeigen laufendes Training.'
            : 'Keine freien Buerger. Baue mehr Wohnhaeuser!', {
          fontFamily: FONT_FAMILY, fontSize: '13px',
          color: trainingCitizens.length > 0 ? UI_STR_COLORS.GOLD : UI_STR_COLORS.DAMAGE,
        }),
      );
      y += 18;
    }

    // Class cards – always rendered (unlocked = full card, locked = chip)
    const allClasses = Object.values(CLASS_DEFS);
    const unlockedIds: string[] = state.classesUnlocked ?? STARTING_CLASSES;
    const unlocked = allClasses.filter(c => unlockedIds.includes(c.id));
    const locked   = allClasses.filter(c => !unlockedIds.includes(c.id));
    const canTrain = idleCitizens.length > 0;

    const COLS     = 3;
    const COL_STEP = 233; // cardW 215 + 18px gap
    const ROW_STEP = 294; // cardH 282 (base 256 + 26 trainee slot) + 12 gap

    // Precompute trainees per class
    const traineesByClass: Record<string, Array<{remaining: number; pct: number}>> = {};
    for (const c of trainingCitizens) {
      const key = c.trainingClassId ?? '';
      if (!traineesByClass[key]) traineesByClass[key] = [];
      const remaining = Math.ceil(c.trainingTimer);
      const pct = trainingDef.trainingTimeSec > 0
        ? Math.max(0, Math.min(1, (trainingDef.trainingTimeSec - c.trainingTimer) / trainingDef.trainingTimeSec))
        : 0;
      traineesByClass[key].push({ remaining, pct });
    }

    unlocked.forEach((cls, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const trainees = traineesByClass[cls.id] ?? [];
      this.renderClassCard(20 + col * COL_STEP, y + row * ROW_STEP, cls, trainingDef.trainingCost, state, true, trainees, canTrain);
    });
    y += Math.ceil(unlocked.length / COLS) * ROW_STEP;

    // Locked classes – compact chips
    if (locked.length > 0) {
      y += 6;
      const divL = createDivider(this.scene, 20, y, this.panelW - 40);
      this.contentContainer.add(divL);
      y += 12;
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Gesperrte Klassen:', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM, fontStyle: 'bold',
        }),
      );
      y += 20;

      const CHIP_W = 215;
      const CHIP_H = 52;
      locked.forEach((cls, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx = 20 + col * COL_STEP;
        const cy = y + row * (CHIP_H + 8);
        const chipGfx = this.scene.add.graphics();
        chipGfx.fillStyle(0x111520, 1);
        chipGfx.fillRoundedRect(cx, cy, CHIP_W, CHIP_H, 8);
        chipGfx.lineStyle(1, 0x444466, 0.5);
        chipGfx.strokeRoundedRect(cx, cy, CHIP_W, CHIP_H, 8);
        this.contentContainer.add(chipGfx);
        this.contentContainer.add(
          this.scene.add.text(cx + CHIP_W / 2, cy + 13, '🔒', { fontFamily: FONT_FAMILY, fontSize: '16px' }).setOrigin(0.5, 0.5),
        );
        this.contentContainer.add(
          this.scene.add.text(cx + CHIP_W / 2, cy + 32, cls.name, {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DISABLED,
          }).setOrigin(0.5, 0.5),
        );
        this.contentContainer.add(
          this.scene.add.text(cx + CHIP_W / 2, cy + 45, 'Gesperrt', {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DISABLED, fontStyle: 'italic',
          }).setOrigin(0.5, 0.5),
        );
      });
      y += Math.ceil(locked.length / COLS) * (CHIP_H + 8);
    }

    y += 16; // bottom padding
    this.contentHeight = y;
  }

  private renderClassCard(
    x: number, y: number, cls: typeof CLASS_DEFS[string],
    cost: Record<string, number>, state: GameState,
    isUnlocked: boolean = true,
    trainees: Array<{remaining: number; pct: number}> = [],
    canTrain: boolean = true,
  ): void {
    const cardW      = 215;
    const hasTrainees = trainees.length > 0;
    const cardH      = 256 + (hasTrainees ? 26 : 0); // extend card for trainee slot
    const portraitH  = 130; // top section: portrait image
    const canAfford  = isUnlocked && canTrain && Object.entries(cost).every(
      ([res, amt]) => (state.globalStock[res] ?? 0) >= amt,
    );
    const costStr = Object.entries(cost).map(([r, a]) => `${a} ${r}`).join(', ');

    const card = this.scene.add.container(x, y);

    // ── Card Background (Dark Glass) ──
    const cardBg = this.scene.add.graphics();
    const borderColor = !isUnlocked
      ? 0x444466
      : canAfford
        ? UI_COLORS.GLASS_ACCENT_GUILD
        : 0x555577;
    // Glow ring for affordable cards
    if (!isUnlocked) {
      cardBg.fillStyle(0x111520, 1);
      cardBg.fillRoundedRect(0, 0, cardW, cardH, 10);
      cardBg.lineStyle(1, borderColor, 0.4);
      cardBg.strokeRoundedRect(0, 0, cardW, cardH, 10);
    } else {
      // Subtle glow
      cardBg.lineStyle(8, borderColor, 0.08);
      cardBg.strokeRoundedRect(-4, -4, cardW + 8, cardH + 8, 14);
      cardBg.lineStyle(4, borderColor, 0.15);
      cardBg.strokeRoundedRect(-2, -2, cardW + 4, cardH + 4, 12);
      // Card body
      cardBg.fillStyle(0x111520, 1);
      cardBg.fillRoundedRect(0, 0, cardW, cardH, 10);
      cardBg.fillStyle(UI_COLORS.GLASS_OVERLAY, 0.35);
      cardBg.fillRoundedRect(cardW * 0.4, 0, cardW * 0.6, cardH, 10);
      cardBg.lineStyle(canAfford ? 2 : 1, borderColor, canAfford ? 0.9 : 0.5);
      cardBg.strokeRoundedRect(0, 0, cardW, cardH, 10);
      // Top shine
      cardBg.lineStyle(1, 0xFFFFFF, 0.07);
      cardBg.lineBetween(10, 1, cardW - 10, 1);
    }
    card.add(cardBg);

    // ── Portrait zone background (dark, top section) ──
    const portraitBg = this.scene.add.graphics();
    portraitBg.fillStyle(0x0C0D14, 1);
    portraitBg.fillRoundedRect(1, 1, cardW - 2, portraitH, { tl: 7, tr: 7, bl: 0, br: 0 });
    card.add(portraitBg);

    // ── Portrait Image — HERO_* sprite first, PORTRAIT_* as fallback ──
    const heroKey     = cls.spriteKey ?? '';
    const portraitKey = `PORTRAIT_${cls.id.toUpperCase()}`;
    const hasHeroSprite = !!(heroKey && this.scene.textures.exists(heroKey));
    const hasPortrait   = this.scene.textures.exists(portraitKey);

    if (hasHeroSprite || hasPortrait) {
      const imgKey     = hasHeroSprite ? heroKey : portraitKey;
      const squareSide = portraitH - 4;
      const heroImg = this.scene.add.image(cardW / 2, portraitH / 2, imgKey)
        .setDisplaySize(squareSide, squareSide)
        .setAlpha(isUnlocked ? 1 : 0.35);
      card.add(heroImg);
    }

    // ── Dark gradient strip at bottom of portrait (for text legibility) ──
    const gradGfx = this.scene.add.graphics();
    gradGfx.fillStyle(0x000000, 0.55);
    gradGfx.fillRect(1, portraitH - 26, cardW - 2, 26);
    card.add(gradGfx);

    // ── Locked overlay ──
    if (!isUnlocked) {
      const lockGfx = this.scene.add.graphics();
      lockGfx.fillStyle(UI_COLORS.NAVY_DEEP, 0.7);
      lockGfx.fillRoundedRect(0, 0, cardW, cardH, 8);
      card.add(lockGfx);
      card.add(this.scene.add.text(cardW / 2, cardH / 2 - 10, '🔒', {
        fontFamily: FONT_FAMILY, fontSize: '22px',
      }).setOrigin(0.5, 0.5).setAlpha(0.9));
      card.add(this.scene.add.text(cardW / 2, cardH / 2 + 16, 'Gesperrt', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DISABLED,
        fontStyle: 'italic',
      }).setOrigin(0.5, 0));
      this.contentContainer.add(card);
      return;
    }

    // ── Class Name (overlay on portrait, bottom-left) ──
    card.add(this.scene.add.text(8, portraitH - 20, cls.name, {
      fontFamily: FONT_FAMILY, fontSize: '11px',
      color: UI_STR_COLORS.LIGHT, fontStyle: 'bold',
    }));

    // ── Role Badge (overlay on portrait, bottom-right) ──
    const roleText = cls.role ?? 'Kämpfer';
    const badgeW = roleText.length * 6 + 10;
    const roleBadge = this.scene.add.graphics();
    roleBadge.fillStyle(UI_COLORS.NAVY_DEEP, 0.85);
    roleBadge.fillRoundedRect(cardW - badgeW - 6, portraitH - 19, badgeW, 14, 3);
    card.add(roleBadge);
    card.add(this.scene.add.text(cardW - badgeW - 1, portraitH - 18, roleText, {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.INFO,
    }));

    // ── Mini Stat Bars ──
    const stats = cls.baseStats;
    const maxStatVal = 200;
    const statLeft = 18;
    const barW = cardW - statLeft - 10;
    const barH = 5;
    const statData = [
      { label: 'HP',  val: stats.maxHp,  fillColor: UI_COLORS.STAT_HP_FILL,  bgColor: UI_COLORS.STAT_HP_BG },
      { label: 'ATK', val: stats.atk * 5, fillColor: UI_COLORS.STAT_ATK_FILL, bgColor: UI_COLORS.STAT_ATK_BG },
      { label: 'DEF', val: stats.def * 8, fillColor: UI_COLORS.STAT_DEF_FILL, bgColor: UI_COLORS.STAT_DEF_BG },
    ];
    statData.forEach((s, idx) => {
      const sy = portraitH + 8 + idx * 13;
      const pct = Math.min(s.val / maxStatVal, 1);
      const bg = this.scene.add.graphics();
      bg.fillStyle(s.bgColor, 1);
      bg.fillRoundedRect(statLeft, sy, barW, barH, 2);
      bg.fillStyle(s.fillColor, 1);
      bg.fillRoundedRect(statLeft, sy, barW * pct, barH, 2);
      card.add(bg);
      card.add(this.scene.add.text(statLeft - 2, sy - 1, s.label, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.MUTED,
      }).setOrigin(1, 0));
    });

    // ── Cost Line ──
    const costY = portraitH + 8 + 3 * 13 + 3;
    card.add(this.scene.add.text(cardW / 2, costY, `Kosten: ${costStr}`, {
      fontFamily: FONT_FAMILY, fontSize: '11px',
      color: canAfford ? UI_STR_COLORS.GLASS_GUILD : UI_STR_COLORS.DAMAGE,
    }).setOrigin(0.5, 0));

    // ── Train Button (fixed at y=218 regardless of card height) ──
    const btnY = 218;
    const btnW = cardW - 16;
    const btnLabel = canAfford ? 'Trainieren' : !canTrain ? 'Kein freier Buerger' : 'Zu teuer';
    const btnGfx = this.scene.add.graphics();
    const drawTrainBtn = (hover: boolean) => {
      btnGfx.clear();
      if (canAfford) {
        if (hover) {
          btnGfx.lineStyle(6, UI_COLORS.GLASS_ACCENT_GUILD, 0.25);
          btnGfx.strokeRoundedRect(5, btnY - 3, btnW + 6, 28, 7);
          btnGfx.fillStyle(UI_COLORS.GLASS_ACCENT_GUILD, 1);
          btnGfx.fillRoundedRect(8, btnY, btnW, 22, 6);
        } else {
          btnGfx.fillStyle(0x0b1320, 1);
          btnGfx.fillRoundedRect(8, btnY, btnW, 22, 6);
          btnGfx.fillStyle(UI_COLORS.GLASS_ACCENT_GUILD, 0.22);
          btnGfx.fillRoundedRect(8, btnY, btnW, 12, 6);
          btnGfx.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 0.75);
          btnGfx.strokeRoundedRect(8, btnY, btnW, 22, 6);
        }
      } else {
        btnGfx.fillStyle(0x1A1A2E, 1);
        btnGfx.fillRoundedRect(8, btnY, btnW, 22, 6);
        btnGfx.lineStyle(1, 0x444466, 0.5);
        btnGfx.strokeRoundedRect(8, btnY, btnW, 22, 6);
      }
    };
    drawTrainBtn(false);
    card.add(btnGfx);
    card.add(this.scene.add.text(cardW / 2, btnY + 11, btnLabel, {
      fontFamily: FONT_FAMILY, fontSize: '13px',
      color: canAfford ? '#111111' : UI_STR_COLORS.GLASS_DISABLED,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5));

    // ── Training Progress (directly below button, if trainees exist) ──
    if (hasTrainees) {
      const progressTopY = btnY + 28; // 4px below button
      const trainee = trainees[0];    // show first (most advanced) trainee

      // Separator line
      const sepGfx = this.scene.add.graphics();
      sepGfx.lineStyle(1, UI_COLORS.NAVY_SEPARATOR, 0.6);
      sepGfx.lineBetween(8, progressTopY, cardW - 8, progressTopY);
      card.add(sepGfx);

      // Label
      const countLabel = trainees.length > 1 ? `${trainees.length}x ` : '';
      card.add(this.scene.add.text(cardW / 2, progressTopY + 5,
        `${countLabel}In Ausbildung – ${trainee.remaining}s`, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
        }).setOrigin(0.5, 0));

      // Progress bar
      const barX = 10;
      const barW = cardW - 20;
      const barGfx = this.scene.add.graphics();
      barGfx.fillStyle(UI_COLORS.XP_BAR_BG, 1);
      barGfx.fillRoundedRect(barX, progressTopY + 16, barW, 7, 3);
      barGfx.fillStyle(UI_COLORS.SUCCESS_GREEN, 1);
      barGfx.fillRoundedRect(barX, progressTopY + 16, barW * trainee.pct, 7, 3);
      barGfx.fillStyle(0xFFFFFF, 0.12);
      barGfx.fillRoundedRect(barX, progressTopY + 16, barW * trainee.pct, 4, 3);
      card.add(barGfx);
    }

    if (canAfford) {
      card.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, cardW, cardH),
        Phaser.Geom.Rectangle.Contains,
      );
      card.on('pointerover', () => {
        cardBg.clear();
        // Brighter glow on hover
        cardBg.lineStyle(10, UI_COLORS.GLASS_ACCENT_GUILD, 0.20);
        cardBg.strokeRoundedRect(-5, -5, cardW + 10, cardH + 10, 15);
        cardBg.lineStyle(5, UI_COLORS.GLASS_ACCENT_GUILD, 0.35);
        cardBg.strokeRoundedRect(-2, -2, cardW + 4, cardH + 4, 12);
        cardBg.fillStyle(0x1a2030, 1);
        cardBg.fillRoundedRect(0, 0, cardW, cardH, 10);
        cardBg.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 1);
        cardBg.strokeRoundedRect(0, 0, cardW, cardH, 10);
        drawTrainBtn(true);
      });
      card.on('pointerout', () => {
        cardBg.clear();
        cardBg.lineStyle(8, UI_COLORS.GLASS_ACCENT_GUILD, 0.08);
        cardBg.strokeRoundedRect(-4, -4, cardW + 8, cardH + 8, 14);
        cardBg.lineStyle(4, UI_COLORS.GLASS_ACCENT_GUILD, 0.15);
        cardBg.strokeRoundedRect(-2, -2, cardW + 4, cardH + 4, 12);
        cardBg.fillStyle(0x111520, 1);
        cardBg.fillRoundedRect(0, 0, cardW, cardH, 10);
        cardBg.fillStyle(UI_COLORS.GLASS_OVERLAY, 0.35);
        cardBg.fillRoundedRect(cardW * 0.4, 0, cardW * 0.6, cardH, 10);
        cardBg.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 0.9);
        cardBg.strokeRoundedRect(0, 0, cardW, cardH, 10);
        cardBg.lineStyle(1, 0xFFFFFF, 0.07);
        cardBg.lineBetween(10, 1, cardW - 10, 1);
        drawTrainBtn(false);
      });
      card.on('pointerdown', () => {
        this.startTraining(state, cls.id);
        this.refresh(state);
      });
    }

    this.contentContainer.add(card);
  }

  // ── Roster & Gear Tab ─────────────────────────────────────────

  private renderRosterTab(state: GameState): void {
    const contentTop = 80;
    let y = contentTop;

    this.contentContainer.add(
      this.scene.add.text(20, y, 'Deine Kaempfer. Rueste sie aus und manage dein Team.', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM,
      }),
    );
    y += 24;

    if (state.fighters.length === 0) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Noch keine Kaempfer. Gehe zum Training-Tab!', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
        }),
      );
      this.contentHeight = y + 30;
      return;
    }

    for (const fighter of state.fighters) {
      y = this.renderFighterCard(fighter, y, state);
    }
    this.contentHeight = y + 16;
  }

  private renderFighterCard(fighter: GuildFighter, y: number, state: GameState): number {
    const cardW   = this.panelW - 40;
    const cls     = CLASS_DEFS[fighter.classId];
    const stats   = this.gearSystem.getEffectiveStats(fighter);
    const citizen = state.citizens.find(c => c.fighterId === fighter.id);

    const isAvailable    = citizen?.status === 'GUILD_FIGHTER';
    const isInjured      = citizen?.status === 'INJURED_REST';
    const isOnExpedition = citizen?.status === 'ON_EXPEDITION';

    const cardH = isInjured ? 134 : 118;
    const cx = 20;

    // ── Dark Glass Card Background ──
    const cardGfx = this.scene.add.graphics();
    const borderCol = isInjured
      ? UI_COLORS.GLASS_ACCENT_EXPEDITION
      : isAvailable
        ? UI_COLORS.GLASS_ACCENT_GUILD
        : 0x333355;
    const borderAlpha = isInjured ? 0.9 : isAvailable ? 0.75 : 0.35;
    if (isAvailable || isInjured) {
      cardGfx.lineStyle(6, borderCol, 0.10);
      cardGfx.strokeRoundedRect(cx - 3, y - 3, cardW + 6, cardH + 6, 12);
      cardGfx.lineStyle(3, borderCol, 0.20);
      cardGfx.strokeRoundedRect(cx - 1, y - 1, cardW + 2, cardH + 2, 10);
    }
    cardGfx.fillStyle(0x111520, 1);
    cardGfx.fillRoundedRect(cx, y, cardW, cardH, 10);
    if (isAvailable || isInjured) {
      cardGfx.fillStyle(UI_COLORS.GLASS_OVERLAY, 0.30);
      cardGfx.fillRoundedRect(cx + cardW * 0.4, y, cardW * 0.6, cardH, 10);
    }
    cardGfx.lineStyle(isAvailable || isInjured ? 2 : 1, borderCol, borderAlpha);
    cardGfx.strokeRoundedRect(cx, y, cardW, cardH, 10);
    // Top shine
    cardGfx.lineStyle(1, 0xFFFFFF, 0.06);
    cardGfx.lineBetween(cx + 10, y + 1, cx + cardW - 10, y + 1);
    this.contentContainer.add(cardGfx);

    // ── Verletzt-Header ──
    if (isInjured) {
      const injGfx = this.scene.add.graphics();
      injGfx.fillStyle(UI_COLORS.GLASS_ACCENT_EXPEDITION, 0.18);
      injGfx.fillRoundedRect(cx, y, cardW, 20, { tl: 10, tr: 10, bl: 0, br: 0 });
      injGfx.lineStyle(1, UI_COLORS.GLASS_ACCENT_EXPEDITION, 0.5);
      injGfx.lineBetween(cx + 10, y + 20, cx + cardW - 10, y + 20);
      this.contentContainer.add(injGfx);
      const timerSec = Math.ceil(citizen!.injuryTimer);
      this.contentContainer.add(
        this.scene.add.text(cx + cardW / 2, y + 3, `⚕ VERLETZT — erholt sich in ${timerSec}s`, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DAMAGE, fontStyle: 'bold',
        }).setOrigin(0.5, 0),
      );
    }

    // ── Portrait (links) ──
    const hasSprite = !!(cls?.spriteKey && this.scene.textures.exists(cls.spriteKey));
    const portraitW = 58;
    const portraitTop = isInjured ? y + 22 : y + 6;
    const textX = cx + (hasSprite ? portraitW + 14 : 10);

    if (hasSprite) {
      const frmGfx = this.scene.add.graphics();
      frmGfx.fillStyle(UI_COLORS.SLOT_BG, 1);
      frmGfx.fillRoundedRect(cx + 6, portraitTop, portraitW - 4, cardH - (isInjured ? 30 : 14), 6);
      frmGfx.lineStyle(1, isAvailable ? UI_COLORS.SLOT_BORDER_FILLED : UI_COLORS.SLOT_BORDER, 1);
      frmGfx.strokeRoundedRect(cx + 6, portraitTop, portraitW - 4, cardH - (isInjured ? 30 : 14), 6);
      this.contentContainer.add(frmGfx);
      this.contentContainer.add(
        this.scene.add.image(cx + 6 + (portraitW - 4) / 2, portraitTop + (cardH - (isInjured ? 30 : 14)) / 2, cls!.spriteKey)
          .setDisplaySize(44, 44)
          .setAlpha(isInjured ? 0.5 : 1),
      );
    }

    const nameTop = isInjured ? y + 24 : y + 8;

    // Status badge
    let statusStr: string;
    let statusColor: string;
    if (isInjured)          { statusStr = '● Verletzt';     statusColor = UI_STR_COLORS.DAMAGE; }
    else if (isOnExpedition){ statusStr = '● Expedition';   statusColor = UI_STR_COLORS.GOLD_BRIGHT; }
    else if (isAvailable)   { statusStr = '● Bereit';       statusColor = UI_STR_COLORS.HEAL; }
    else                    { statusStr = '● Inaktiv';      statusColor = UI_STR_COLORS.DISABLED; }

    // Name + Class
    this.contentContainer.add(
      this.scene.add.text(textX, nameTop, `${fighter.name}`, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT, fontStyle: 'bold',
      }),
    );
    this.contentContainer.add(
      this.scene.add.text(textX, nameTop + 16, cls?.name ?? fighter.classId, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.INFO,
      }),
    );
    this.contentContainer.add(
      this.scene.add.text(cx + cardW - 80, nameTop + 2, statusStr, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: statusColor,
      }),
    );

    // ── Stat Bars (HP / ATK / DEF) ──
    const barY      = nameTop + 32;
    const barW      = 140;
    const barHeight = 5;
    const statDefs  = [
      { label: 'HP',  val: stats.maxHp,  max: 300, fill: UI_COLORS.STAT_HP_FILL,  bg: UI_COLORS.STAT_HP_BG },
      { label: 'ATK', val: stats.atk,    max: 60,  fill: UI_COLORS.STAT_ATK_FILL, bg: UI_COLORS.STAT_ATK_BG },
      { label: 'DEF', val: stats.def,    max: 40,  fill: UI_COLORS.STAT_DEF_FILL, bg: UI_COLORS.STAT_DEF_BG },
    ];
    const statGfx = this.scene.add.graphics();
    statDefs.forEach((s, idx) => {
      const sx  = textX;
      const sy  = barY + idx * 11;
      const pct = Math.min(s.val / s.max, 1);
      statGfx.fillStyle(s.bg, 1);
      statGfx.fillRoundedRect(sx, sy, barW, barHeight, 2);
      statGfx.fillStyle(s.fill, 1);
      statGfx.fillRoundedRect(sx, sy, barW * pct, barHeight, 2);
    });
    this.contentContainer.add(statGfx);

    // Stat values — rechts der Balken (kein Overlap mit Portrait)
    const statLines = statDefs.map(s => `${s.label} ${s.val}`).join('\n');
    this.contentContainer.add(
      this.scene.add.text(textX + barW + 6, barY, statLines, {
        fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.MUTED,
        lineSpacing: 1,
      }),
    );

    // SPD + CRIT (weiter rechts, nach Stat-Values)
    this.contentContainer.add(
      this.scene.add.text(textX + barW + 60, barY, `SPD ${stats.spd.toFixed(1)}\nCRIT ${(stats.critChance * 100).toFixed(0)}%`, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
        lineSpacing: 4,
      }),
    );

    // ── Gear Slots ──
    const gearY = nameTop + 68;
    this.renderGearSlot(textX,       gearY, 'Waffe',   fighter.gear.weapon,  state);
    this.renderGearSlot(textX + 150, gearY, 'Rüstung', fighter.gear.armor,   state);
    this.renderGearSlot(textX + 310, gearY, 'Schmuck', fighter.gear.trinket, state);

    // ── Retire Button (unten rechts, danger glass style) ──
    const retireX = cx + cardW - 64;
    const retireY = y + cardH - 30;
    const retireGfx = this.scene.add.graphics();
    const drawRetireBtn = (hover: boolean) => {
      retireGfx.clear();
      if (hover) {
        retireGfx.lineStyle(6, 0xE94560, 0.20);
        retireGfx.strokeRoundedRect(retireX - 3, retireY - 3, 60, 26, 7);
        retireGfx.fillStyle(0xE94560, 0.85);
        retireGfx.fillRoundedRect(retireX, retireY, 54, 20, 5);
      } else {
        retireGfx.fillStyle(0x110810, 1);
        retireGfx.fillRoundedRect(retireX, retireY, 54, 20, 5);
        retireGfx.fillStyle(0xE94560, 0.12);
        retireGfx.fillRoundedRect(retireX, retireY, 54, 10, 5);
        retireGfx.lineStyle(1, 0xE94560, 0.65);
        retireGfx.strokeRoundedRect(retireX, retireY, 54, 20, 5);
      }
    };
    drawRetireBtn(false);
    retireGfx.setInteractive(new Phaser.Geom.Rectangle(retireX, retireY, 54, 20), Phaser.Geom.Rectangle.Contains);
    retireGfx.on('pointerover', () => drawRetireBtn(true));
    retireGfx.on('pointerout',  () => drawRetireBtn(false));
    retireGfx.on('pointerdown', () => { this.retireFighter(state, fighter); this.refresh(state); });
    this.contentContainer.add(retireGfx);
    this.contentContainer.add(
      this.scene.add.text(retireX + 27, retireY + 10, 'Entlass.', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DAMAGE,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5),
    );

    // ── Inventar-Button (öffnet/schließt Hero-Gear-Inventar unterhalb) ──
    const invOpen = this.heroInventoryOpen.has(fighter.id);
    const invBtnX = cx + cardW - 204;
    const invBtnY = y + cardH - 30;
    const invBtnGfx = this.scene.add.graphics();
    const drawInvBtn = (hover: boolean) => {
      invBtnGfx.clear();
      if (hover || invOpen) {
        invBtnGfx.lineStyle(5, UI_COLORS.GLASS_ACCENT_STORAGE, 0.20);
        invBtnGfx.strokeRoundedRect(invBtnX - 2, invBtnY - 2, 68, 24, 7);
        invBtnGfx.fillStyle(0x0b1a18, 1);
        invBtnGfx.fillRoundedRect(invBtnX, invBtnY, 64, 20, 5);
        invBtnGfx.fillStyle(UI_COLORS.GLASS_ACCENT_STORAGE, 0.22);
        invBtnGfx.fillRoundedRect(invBtnX, invBtnY, 64, 11, 5);
        invBtnGfx.lineStyle(2, UI_COLORS.GLASS_ACCENT_STORAGE, 0.90);
        invBtnGfx.strokeRoundedRect(invBtnX, invBtnY, 64, 20, 5);
      } else {
        invBtnGfx.fillStyle(0x0b1a18, 1);
        invBtnGfx.fillRoundedRect(invBtnX, invBtnY, 64, 20, 5);
        invBtnGfx.lineStyle(1, UI_COLORS.GLASS_ACCENT_STORAGE, 0.45);
        invBtnGfx.strokeRoundedRect(invBtnX, invBtnY, 64, 20, 5);
      }
    };
    drawInvBtn(false);
    // Store bounds for scene-level pointerdown handler (bypasses Phaser container input quirks)
    this.invBtnBounds.set(fighter.id, { x: invBtnX, y: invBtnY, w: 64, h: 20 });
    invBtnGfx.setInteractive(new Phaser.Geom.Rectangle(invBtnX, invBtnY, 64, 20), Phaser.Geom.Rectangle.Contains);
    invBtnGfx.on('pointerover', () => drawInvBtn(true));
    invBtnGfx.on('pointerout',  () => drawInvBtn(false));
    this.contentContainer.add(invBtnGfx);
    this.contentContainer.add(
      this.scene.add.text(invBtnX + 32, invBtnY + 10, '📦 Inventar', {
        fontFamily: FONT_FAMILY, fontSize: '11px',
        color: invOpen ? UI_STR_COLORS.GLASS_GUILD : UI_STR_COLORS.GLASS_DIM,
        fontStyle: invOpen ? 'bold' : 'normal',
      }).setOrigin(0.5, 0.5),
    );

    // ── Details-Button (öffnet HeroDetailPanel, glass style) ──
    // Uses Container.setInteractive (same pattern as tabs/createButton) for reliable input in scaled containers
    const detailX = retireX - 68;
    const detailContainer = this.scene.add.container(detailX, retireY);
    const detailGfx = this.scene.add.graphics();
    const drawDetailBtn = (hover: boolean) => {
      detailGfx.clear();
      if (hover) {
        detailGfx.lineStyle(5, UI_COLORS.GLASS_ACCENT_GUILD, 0.20);
        detailGfx.strokeRoundedRect(-2, -2, 62, 24, 7);
        detailGfx.fillStyle(0x1a2030, 1);
        detailGfx.fillRoundedRect(0, 0, 58, 20, 5);
        detailGfx.fillStyle(UI_COLORS.GLASS_ACCENT_GUILD, 0.22);
        detailGfx.fillRoundedRect(0, 0, 58, 11, 5);
        detailGfx.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 0.90);
        detailGfx.strokeRoundedRect(0, 0, 58, 20, 5);
      } else {
        detailGfx.fillStyle(0x0b1320, 1);
        detailGfx.fillRoundedRect(0, 0, 58, 20, 5);
        detailGfx.fillStyle(UI_COLORS.GLASS_ACCENT_GUILD, 0.14);
        detailGfx.fillRoundedRect(0, 0, 58, 10, 5);
        detailGfx.lineStyle(1, UI_COLORS.GLASS_ACCENT_GUILD, 0.55);
        detailGfx.strokeRoundedRect(0, 0, 58, 20, 5);
      }
    };
    drawDetailBtn(false);
    const detailLabel = this.scene.add.text(29, 10, '📋 Details', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GLASS_GUILD,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    detailContainer.add([detailGfx, detailLabel]);
    detailContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, 58, 20), Phaser.Geom.Rectangle.Contains);
    detailContainer.on('pointerover', () => drawDetailBtn(true));
    detailContainer.on('pointerout',  () => drawDetailBtn(false));
    detailContainer.on('pointerdown', () => this.heroDetailPanel.open(fighter, this.lastState ?? state));
    this.contentContainer.add(detailContainer);

    let nextY = y + cardH + 8;

    // ── Hero-Inventar (aufklappbar) ──
    if (this.heroInventoryOpen.has(fighter.id) && isAvailable) {
      nextY = this.renderHeroInventory(fighter, nextY, state);
    }

    return nextY;
  }

  /**
   * Renders the gear inventory for a single hero (shown below their card when expanded).
   * Shows all gear items in global stock that have qty > 0.
   */
  private renderHeroInventory(fighter: GuildFighter, startY: number, state: GameState): number {
    const INV_W    = this.panelW - 40;
    const INV_X    = 20;
    const ITEM_W   = 130;
    const ITEM_H   = 72;
    const GAP      = 6;
    const COLS     = Math.floor((INV_W + GAP) / (ITEM_W + GAP));

    // Collect gear items in stock
    const gearItems = Object.entries(state.globalStock)
      .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.type === 'gear')
      .map(([id]) => ITEM_DEFS[id])
      .filter(Boolean);

    // Panel background
    const rows = Math.ceil(gearItems.length / COLS) || 1;
    const panelH = rows * (ITEM_H + GAP) + 36;

    const panGfx = this.scene.add.graphics();
    panGfx.fillStyle(0x0a1018, 1);
    panGfx.fillRoundedRect(INV_X, startY, INV_W, panelH, 8);
    panGfx.lineStyle(1, UI_COLORS.GLASS_ACCENT_STORAGE, 0.5);
    panGfx.strokeRoundedRect(INV_X, startY, INV_W, panelH, 8);
    this.contentContainer.add(panGfx);

    this.contentContainer.add(
      this.scene.add.text(INV_X + 10, startY + 8, '📦 Verfügbare Ausrüstung (Tippe zum Ausrüsten)', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GLASS_DIM,
      }),
    );

    if (gearItems.length === 0) {
      this.contentContainer.add(
        this.scene.add.text(INV_X + INV_W / 2, startY + panelH / 2 + 8, 'Keine Ausrüstung gefunden.', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DISABLED,
        }).setOrigin(0.5, 0.5),
      );
      return startY + panelH + 6;
    }

    const itemsTop = startY + 28;

    gearItems.forEach((item, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const ix  = INV_X + GAP + col * (ITEM_W + GAP);
      const iy  = itemsTop + row * (ITEM_H + GAP);

      const qty          = state.globalStock[item.id] ?? 0;
      const isEquipped   = Object.values(fighter.gear).includes(item.id);
      const slotMatch    = item.gearSlot;
      const currentInSlot = fighter.gear[slotMatch!];

      const itemGfx = this.scene.add.graphics();
      const borderCol = isEquipped
        ? UI_COLORS.GLASS_ACCENT_GUILD
        : 0x223344;
      const bgCol = isEquipped ? 0x0d1e10 : 0x0b1420;
      itemGfx.fillStyle(bgCol, 1);
      itemGfx.fillRoundedRect(ix, iy, ITEM_W, ITEM_H, 6);
      itemGfx.lineStyle(isEquipped ? 2 : 1, borderCol, isEquipped ? 0.9 : 0.4);
      itemGfx.strokeRoundedRect(ix, iy, ITEM_W, ITEM_H, 6);
      this.contentContainer.add(itemGfx);

      // Item Sprite
      const spriteKey = `ITEM_${item.id.toUpperCase()}`;
      if (this.scene.textures.exists(spriteKey)) {
        this.contentContainer.add(
          this.scene.add.image(ix + 18, iy + ITEM_H / 2, spriteKey)
            .setDisplaySize(28, 28),
        );
      }

      // Item Name — truncated to single line
      const tierTag = item.tags.find(t => t.startsWith('tier'));
      const tierCol: string = tierTag?.includes('4') ? UI_STR_COLORS.GOLD_BRIGHT
        : tierTag?.includes('3') ? UI_STR_COLORS.LOOT
        : tierTag?.includes('2') ? UI_STR_COLORS.INFO
        : UI_STR_COLORS.LIGHT;
      const displayName = item.name.length > 12 ? item.name.substring(0, 11) + '…' : item.name;
      this.contentContainer.add(
        this.scene.add.text(ix + 35, iy + 8, displayName, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: tierCol, fontStyle: 'bold',
        }),
      );

      // Slot type + stat bonus — truncated to fit card
      const slotLabel = slotMatch === 'weapon' ? 'Waffe' : slotMatch === 'armor' ? 'Rüst.' : 'Schmuck';
      const bonus = item.statBonuses
        ? Object.entries(item.statBonuses).map(([k, v]) => `${k.toUpperCase()}+${v}`).join(' ').substring(0, 12)
        : '';
      this.contentContainer.add(
        this.scene.add.text(ix + 35, iy + 22, `${slotLabel} · ${bonus}`, {
          fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DIM,
        }),
      );

      // Quantity badge
      this.contentContainer.add(
        this.scene.add.text(ix + ITEM_W - 5, iy + 5, `×${qty}`, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.MUTED,
        }).setOrigin(1, 0),
      );

      // Action button
      const btnLabel = isEquipped ? '✓ Ausgerüstet' : currentInSlot ? '↔ Tauschen' : '+ Ausrüsten';
      const btnColor = isEquipped ? UI_STR_COLORS.HEAL : UI_STR_COLORS.GLASS_GUILD;
      const btnGfx = this.scene.add.graphics();
      const drawBtn = (hover: boolean) => {
        btnGfx.clear();
        btnGfx.fillStyle(hover ? 0x1a3020 : 0x0a1810, 1);
        btnGfx.fillRoundedRect(ix + 4, iy + ITEM_H - 20, ITEM_W - 8, 15, 4);
        btnGfx.lineStyle(1, UI_COLORS.GLASS_ACCENT_STORAGE, hover ? 0.8 : 0.4);
        btnGfx.strokeRoundedRect(ix + 4, iy + ITEM_H - 20, ITEM_W - 8, 15, 4);
      };
      drawBtn(false);
      this.contentContainer.add(btnGfx);
      this.contentContainer.add(
        this.scene.add.text(ix + ITEM_W / 2, iy + ITEM_H - 12, btnLabel, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: isEquipped ? '#66FF88' : btnColor,
        }).setOrigin(0.5, 0.5),
      );

      if (!isEquipped && qty > 0) {
        btnGfx.setInteractive(
          new Phaser.Geom.Rectangle(ix + 4, iy + ITEM_H - 20, ITEM_W - 8, 15),
          Phaser.Geom.Rectangle.Contains,
        );
        btnGfx.on('pointerover', () => drawBtn(true));
        btnGfx.on('pointerout',  () => drawBtn(false));
        btnGfx.on('pointerdown', () => {
          this.gearSystem.equip(state, fighter, item.id);
          this.refresh(this.lastState ?? state);
        });
      } else if (isEquipped) {
        btnGfx.setInteractive(
          new Phaser.Geom.Rectangle(ix + 4, iy + ITEM_H - 20, ITEM_W - 8, 15),
          Phaser.Geom.Rectangle.Contains,
        );
        btnGfx.on('pointerover', () => { btnGfx.clear(); btnGfx.fillStyle(0x1a0a0a, 1); btnGfx.fillRoundedRect(ix + 4, iy + ITEM_H - 20, ITEM_W - 8, 15, 4); btnGfx.lineStyle(1, 0xFF4444, 0.6); btnGfx.strokeRoundedRect(ix + 4, iy + ITEM_H - 20, ITEM_W - 8, 15, 4); });
        btnGfx.on('pointerout',  () => drawBtn(false));
        btnGfx.on('pointerdown', () => {
          this.gearSystem.unequip(state, fighter, slotMatch!);
          this.refresh(this.lastState ?? state);
        });
      }
    });

    return startY + panelH + 6;
  }

  /** Renders a gear slot label with optional item sprite. */
  private renderGearSlot(x: number, y: number, label: string, itemId: string | null, _state: GameState): void {
    const gearName = this.getGearName(itemId);

    this.contentContainer.add(
      this.scene.add.text(x, y, `${label}: `, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
      }),
    );

    // Item sprite if exists
    const shortName = gearName.length > 11 ? gearName.substring(0, 10) + '…' : gearName;
    if (itemId) {
      const spriteKey = `ITEM_${itemId.toUpperCase()}`;
      if (this.scene.textures.exists(spriteKey)) {
        const labelWidth = label.length * 5.5 + 4;
        this.contentContainer.add(
          this.scene.add.image(x + labelWidth + 8, y + 5, spriteKey)
            .setDisplaySize(14, 14),
        );
        this.contentContainer.add(
          this.scene.add.text(x + labelWidth + 20, y, shortName, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LOOT,
          }),
        );
        return;
      }
    }

    const labelWidth = (label.length + 2) * 5.5;
    this.contentContainer.add(
      this.scene.add.text(x + labelWidth, y, shortName, {
        fontFamily: FONT_FAMILY, fontSize: '11px',
        color: itemId ? UI_STR_COLORS.LOOT : UI_STR_COLORS.DISABLED,
      }),
    );
  }

  private getGearName(itemId: string | null): string {
    if (!itemId) return '–';
    return ITEM_DEFS[itemId]?.name ?? itemId;
  }

  // ── Inventory Tab ─────────────────────────────────────────────

  private renderInventoryTab(state: GameState): void {
    const contentTop = 80;
    let y = contentTop;

    this.contentContainer.add(
      this.scene.add.text(20, y, 'Alle gesammelten Gegenstände und Vorräte.', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM,
      }),
    );
    y += 28;

    // ── Gear Section ──
    const gearItems = Object.entries(state.globalStock)
      .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.type === 'gear')
      .map(([id, qty]) => ({ item: ITEM_DEFS[id], qty }))
      .filter(x => x.item != null);

    {
      const hdrGfx = this.scene.add.graphics();
      drawGlassInfoBar(hdrGfx, 20, y, this.panelW - 40, 22, 6);
      this.contentContainer.add(hdrGfx);
      this.contentContainer.add(
        this.scene.add.text(this.panelW / 2, y + 11, `⚔ AUSRÜSTUNG  (${gearItems.length} Typen)`, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
        }).setOrigin(0.5, 0.5),
      );
      y += 28;

      if (gearItems.length === 0) {
        this.contentContainer.add(
          this.scene.add.text(20, y, 'Noch keine Ausrüstung gefunden. Starte Expeditionen!', {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DISABLED,
          }),
        );
        y += 22;
      } else {
        const CARD_W  = 200;
        const CARD_H  = 80;
        const GAP     = 8;
        const COLS    = 3;
        const COL_W   = CARD_W + GAP;

        gearItems.forEach(({ item, qty }, idx) => {
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          const cx  = 20 + col * COL_W;
          const cy  = y + row * (CARD_H + GAP);

          const tierTag   = item.tags.find((t: string) => t.startsWith('tier'));
          const tierNum   = tierTag ? parseInt(tierTag.replace('tier', ''), 10) : 0;
          const tierColor: string = tierNum >= 4 ? UI_STR_COLORS.GOLD_BRIGHT
            : tierNum >= 3 ? UI_STR_COLORS.LOOT
            : tierNum >= 2 ? UI_STR_COLORS.INFO
            : UI_STR_COLORS.LIGHT;
          const borderCol: number = tierNum >= 4 ? 0xE8C84A
            : tierNum >= 3 ? 0xC078FF
            : tierNum >= 2 ? 0x4488CC
            : 0x335566;

          const cardGfx = this.scene.add.graphics();
          cardGfx.fillStyle(0x0b1420, 1);
          cardGfx.fillRoundedRect(cx, cy, CARD_W, CARD_H, 8);
          cardGfx.lineStyle(1, borderCol, 0.65);
          cardGfx.strokeRoundedRect(cx, cy, CARD_W, CARD_H, 8);
          this.contentContainer.add(cardGfx);

          // Sprite
          const spriteKey = `ITEM_${item.id.toUpperCase()}`;
          if (this.scene.textures.exists(spriteKey)) {
            this.contentContainer.add(
              this.scene.add.image(cx + 20, cy + CARD_H / 2, spriteKey)
                .setDisplaySize(30, 30),
            );
          }

          // Name
          this.contentContainer.add(
            this.scene.add.text(cx + 38, cy + 8, item.name, {
              fontFamily: FONT_FAMILY, fontSize: '13px', color: tierColor, fontStyle: 'bold',
              wordWrap: { width: CARD_W - 44 },
            }),
          );

          // Slot + Stats
          const slotStr = item.gearSlot === 'weapon' ? '⚔ Waffe'
            : item.gearSlot === 'armor' ? '🛡 Rüstung'
            : '💍 Schmuck';
          this.contentContainer.add(
            this.scene.add.text(cx + 38, cy + 26, slotStr, {
              fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
            }),
          );

          const bonusStr = item.statBonuses
            ? Object.entries(item.statBonuses).map(([k, v]) => `${k.toUpperCase()}+${v}`).join('  ').substring(0, 28)
            : '–';
          this.contentContainer.add(
            this.scene.add.text(cx + 38, cy + 42, bonusStr, {
              fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.MUTED,
            }),
          );

          // Tier badge
          if (tierNum > 0) {
            const tierBg = this.scene.add.graphics();
            tierBg.fillStyle(0x111122, 0.9);
            tierBg.fillRoundedRect(cx + 4, cy + 4, 20, 13, 3);
            this.contentContainer.add(tierBg);
            this.contentContainer.add(
              this.scene.add.text(cx + 14, cy + 10, `T${tierNum}`, {
                fontFamily: FONT_FAMILY, fontSize: '11px', color: tierColor,
              }).setOrigin(0.5, 0.5),
            );
          }

          // Quantity badge (top-right)
          this.contentContainer.add(
            this.scene.add.text(cx + CARD_W - 6, cy + 6, `×${qty}`, {
              fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD, fontStyle: 'bold',
            }).setOrigin(1, 0),
          );

          // Equipped-by info
          const equippedBy = state.fighters.filter(f =>
            Object.values(f.gear).includes(item.id),
          ).map(f => f.name);
          if (equippedBy.length > 0) {
            this.contentContainer.add(
              this.scene.add.text(cx + 38, cy + CARD_H - 14, `Ausgerüstet: ${equippedBy.join(', ')}`, {
                fontFamily: FONT_FAMILY, fontSize: '11px', color: '#66AA88',
              }),
            );
          }
        });

        y += Math.ceil(gearItems.length / COLS) * (CARD_H + GAP) + 4;
      }
    }

    y += 16;

    // ── Consumables / Proviant Section ──
    const consumables = Object.entries(state.globalStock)
      .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.type === 'consumable')
      .map(([id, qty]) => ({ item: ITEM_DEFS[id], qty }))
      .filter(x => x.item != null);

    {
      const hdrGfx = this.scene.add.graphics();
      drawGlassInfoBar(hdrGfx, 20, y, this.panelW - 40, 22, 6);
      this.contentContainer.add(hdrGfx);
      this.contentContainer.add(
        this.scene.add.text(this.panelW / 2, y + 11, `🍞 PROVIANT  (${consumables.length} Typen)`, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD, fontStyle: 'bold',
        }).setOrigin(0.5, 0.5),
      );
      y += 28;

      if (consumables.length === 0) {
        this.contentContainer.add(
          this.scene.add.text(20, y, 'Kein Proviant vorhanden. Baue eine Bäckerei oder Kräutergarten!', {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DISABLED,
          }),
        );
        y += 22;
      } else {
        const ROW_H = 52;
        const GAP   = 6;

        consumables.forEach(({ item, qty }, idx) => {
          const ry  = y + idx * (ROW_H + GAP);
          const W   = this.panelW - 40;

          const rowGfx = this.scene.add.graphics();
          rowGfx.fillStyle(0x0d1a10, 1);
          rowGfx.fillRoundedRect(20, ry, W, ROW_H, 8);
          rowGfx.lineStyle(1, 0x335533, 0.6);
          rowGfx.strokeRoundedRect(20, ry, W, ROW_H, 8);
          this.contentContainer.add(rowGfx);

          // Sprite
          const spriteKey = `ITEM_${item.id.toUpperCase()}`;
          if (this.scene.textures.exists(spriteKey)) {
            this.contentContainer.add(
              this.scene.add.image(44, ry + ROW_H / 2, spriteKey)
                .setDisplaySize(30, 30),
            );
          }

          // Name + count
          this.contentContainer.add(
            this.scene.add.text(64, ry + 10, item.name, {
              fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT, fontStyle: 'bold',
            }),
          );

          // Effect text
          let effectStr = '';
          if (item.healAmount) effectStr = `Heilt ${item.healAmount} HP`;
          if (item.buffEffect) effectStr = `${item.buffEffect.stat.toUpperCase()}+${item.buffEffect.value} für ${item.buffEffect.durationRooms} Räume`;
          if (effectStr) {
            this.contentContainer.add(
              this.scene.add.text(64, ry + 28, effectStr, {
                fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.HEAL,
              }),
            );
          }

          // Quantity
          this.contentContainer.add(
            this.scene.add.text(20 + W - 10, ry + ROW_H / 2, `×${qty}`, {
              fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.GOLD, fontStyle: 'bold',
            }).setOrigin(1, 0.5),
          );
        });

        y += consumables.length * (ROW_H + GAP);
      }
    }

    y += 20;
    this.contentHeight = y;
  }

  // ── Expedition Tab ────────────────────────────────────────────

  private renderExpeditionTab(state: GameState): void {
    const contentTop = 80;
    let y = contentTop;

    if (state.activeExpedition) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Eine Expedition ist aktiv! Oeffne die Expeditions-Ansicht.', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD_BRIGHT,
        }),
      );
      y += 30;
      const viewBtn = createButton(this.scene, {
        x: 20, y: y,
        width: 180, height: 30,
        label: 'Expedition anzeigen',
        textStyle: { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT },
        onClick: () => {
          this.hide();
        },
      });
      this.contentContainer.add(viewBtn.container);
      return;
    }

    // Available fighters
    const availableFighters = state.fighters.filter(f => {
      const citizen = state.citizens.find(c => c.fighterId === f.id);
      return citizen && citizen.status === 'GUILD_FIGHTER';
    });

    // ── Difficulty Selector ──
    this.contentContainer.add(
      this.scene.add.text(20, y, 'Schwierigkeit:', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
      }),
    );
    y += 16;

    const diffs = Object.values(DIFFICULTY_DEFS);
    const btnW = 162;
    const btnH = 22;
    const gap = 6;
    diffs.forEach((diff, i) => {
      const bx = 20 + i * (btnW + gap);
      const active = this.selectedDifficulty === diff.id;
      const btn = createButton(this.scene, {
        x: bx, y,
        width: btnW, height: btnH,
        label: `${diff.name} (x${diff.scoreMult})`,
        textStyle: {
          fontFamily: FONT_FAMILY, fontSize: '11px',
          color: active ? UI_STR_COLORS.GOLD : UI_STR_COLORS.DIM,
        },
        onClick: () => {
          this.selectedDifficulty = diff.id;
          if (this.lastState) this.refresh(this.lastState);
        },
      });
      if (active && btn.bg instanceof Phaser.GameObjects.NineSlice) {
        btn.bg.setTint(UI_COLORS.SUCCESS_GREEN);
      }
      this.contentContainer.add(btn.container);
    });
    y += btnH + 6;

    const selDiff = DIFFICULTY_DEFS[this.selectedDifficulty];
    if (selDiff) {
      this.contentContainer.add(
        this.scene.add.text(20, y, selDiff.description, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
        }),
      );
      y += 14;
    }

    // ── Modifier Selector ──
    this.contentContainer.add(
      this.scene.add.text(20, y, 'Modifikator (optional):', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
      }),
    );
    y += 16;

    const modOptions: { id: string | null; label: string }[] = [
      { id: null, label: 'Keiner' },
      ...Object.values(MODIFIER_DEFS).map(m => ({ id: m.id as string | null, label: m.name })),
    ];
    const maxPerRow = 4;
    modOptions.forEach((opt, i) => {
      const col = i % maxPerRow;
      const row = Math.floor(i / maxPerRow);
      const bx = 20 + col * (btnW + gap);
      const by = y + row * (btnH + 4);
      const active = this.selectedModifier === opt.id;
      const btn = createButton(this.scene, {
        x: bx, y: by,
        width: btnW, height: btnH,
        label: opt.label,
        textStyle: {
          fontFamily: FONT_FAMILY, fontSize: '11px',
          color: active ? UI_STR_COLORS.GOLD_BRIGHT : UI_STR_COLORS.DIM,
        },
        onClick: () => {
          this.selectedModifier = opt.id;
          if (this.lastState) this.refresh(this.lastState);
        },
      });
      if (active && btn.bg instanceof Phaser.GameObjects.NineSlice) {
        btn.bg.setTint(opt.id ? UI_COLORS.GOLD_MID : UI_COLORS.SUCCESS_GREEN);
      }
      this.contentContainer.add(btn.container);
    });
    const modRows = Math.ceil(modOptions.length / maxPerRow);
    y += modRows * (btnH + 4) + 4;

    if (this.selectedModifier) {
      const selMod = MODIFIER_DEFS[this.selectedModifier];
      if (selMod) {
        this.contentContainer.add(
          this.scene.add.text(20, y, `→ ${selMod.description}  (Score x${selMod.scoreMult})`, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DAMAGE,
          }),
        );
        y += 14;
      }
    }

    y += 4;
    const div0 = createDivider(this.scene, 20, y, this.panelW - 40);
    this.contentContainer.add(div0);
    y += 10;

    // ── Fighters (compact) ──
    this.contentContainer.add(
      this.scene.add.text(20, y, `Kaempfer: ${availableFighters.length}`, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
      }),
    );

    if (availableFighters.length > 0) {
      let fx = 120;
      for (const fighter of availableFighters.slice(0, this.partySlots)) {
        const cls = CLASS_DEFS[fighter.classId];
        if (cls?.spriteKey && this.scene.textures.exists(cls.spriteKey)) {
          this.contentContainer.add(
            this.scene.add.image(fx + 8, y + 7, cls.spriteKey).setDisplaySize(16, 16),
          );
          fx += 20;
        }
        const stats = this.gearSystem.getEffectiveStats(fighter);
        this.contentContainer.add(
          this.scene.add.text(fx, y + 1, `${fighter.name} A:${stats.atk} D:${stats.def}`, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.INFO,
          }),
        );
        fx += (fighter.name.length + 10) * 5.5 + 12;
      }
    }
    y += 18;

    if (availableFighters.length === 0) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Keine Kaempfer bereit! Trainiere zuerst im Training-Tab.', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DAMAGE,
        }),
      );
      this.contentHeight = y + 30;
      return;
    }

    const div1 = createDivider(this.scene, 20, y, this.panelW - 40);
    this.contentContainer.add(div1);
    y += 10;

    // ── Routes ──
    this.contentContainer.add(
      this.scene.add.text(20, y, 'Routen:', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
      }),
    );
    y += 20;

    // Build a set of route IDs unlocked at the player's current rank
    const currentRank = state.guildStats?.rank ?? 1;
    const unlockedRouteIds = new Set<string>();
    for (const rankDef of GUILD_RANK_DEFS) {
      if (rankDef.rank <= currentRank) {
        for (const rid of (rankDef.routeUnlocks ?? [])) {
          unlockedRouteIds.add(rid);
        }
      }
    }
    // Determine which rank first unlocks a given route
    const routeRequiredRank: Record<string, number> = {};
    for (const rankDef of GUILD_RANK_DEFS) {
      for (const rid of (rankDef.routeUnlocks ?? [])) {
        if (routeRequiredRank[rid] === undefined) {
          routeRequiredRank[rid] = rankDef.rank;
        }
      }
    }

    const routes = Object.values(ROUTE_DEFS);
    routes.forEach((route) => {
      const cardW = this.panelW - 40;
      const cardH = 50;
      const routeUnlocked = unlockedRouteIds.has(route.id);

      // Glass-style route card
      const routeCardGfx = this.scene.add.graphics();
      if (routeUnlocked) {
        routeCardGfx.lineStyle(5, UI_COLORS.GLASS_ACCENT_GUILD, 0.10);
        routeCardGfx.strokeRoundedRect(20 - 2, y - 2, cardW + 4, cardH + 4, 12);
        routeCardGfx.fillStyle(0x111520, 1);
        routeCardGfx.fillRoundedRect(20, y, cardW, cardH, 10);
        routeCardGfx.fillStyle(UI_COLORS.GLASS_OVERLAY, 0.30);
        routeCardGfx.fillRoundedRect(20 + cardW * 0.4, y, cardW * 0.6, cardH, 10);
        routeCardGfx.lineStyle(1, UI_COLORS.GLASS_ACCENT_GUILD, 0.55);
        routeCardGfx.strokeRoundedRect(20, y, cardW, cardH, 10);
        routeCardGfx.lineStyle(1, 0xFFFFFF, 0.06);
        routeCardGfx.lineBetween(30, y + 1, 20 + cardW - 10, y + 1);
      } else {
        routeCardGfx.fillStyle(0x0D0E14, 1);
        routeCardGfx.fillRoundedRect(20, y, cardW, cardH, 10);
        routeCardGfx.lineStyle(1, 0x333355, 0.4);
        routeCardGfx.strokeRoundedRect(20, y, cardW, cardH, 10);
        routeCardGfx.setAlpha(0.5);
      }
      this.contentContainer.add(routeCardGfx);

      this.contentContainer.add(
        this.scene.add.text(30, y + 6, route.name, {
          fontFamily: FONT_FAMILY, fontSize: '11px',
          color: routeUnlocked ? UI_STR_COLORS.LIGHT : UI_STR_COLORS.DISABLED,
        }).setAlpha(routeUnlocked ? 1 : 0.4),
      );

      if (routeUnlocked) {
        this.contentContainer.add(
          this.scene.add.text(30, y + 22,
            `${route.rooms} Raeume  |  Empf. Lv${route.recommendedLevel}  |  T${route.tier}${route.bossId ? '  |  Boss' : ''}`, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
          }),
        );

        // Hover directly on routeCardGfx
        routeCardGfx.setInteractive(
          new Phaser.Geom.Rectangle(20, y, cardW, cardH),
          Phaser.Geom.Rectangle.Contains,
        );
        routeCardGfx.on('pointerover', () => {
          routeCardGfx.clear();
          routeCardGfx.lineStyle(8, UI_COLORS.GLASS_ACCENT_GUILD, 0.18);
          routeCardGfx.strokeRoundedRect(20 - 4, y - 4, cardW + 8, cardH + 8, 14);
          routeCardGfx.fillStyle(0x1a2030, 1);
          routeCardGfx.fillRoundedRect(20, y, cardW, cardH, 10);
          routeCardGfx.fillStyle(UI_COLORS.GLASS_OVERLAY, 0.40);
          routeCardGfx.fillRoundedRect(20 + cardW * 0.4, y, cardW * 0.6, cardH, 10);
          routeCardGfx.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 0.90);
          routeCardGfx.strokeRoundedRect(20, y, cardW, cardH, 10);
        });
        routeCardGfx.on('pointerout', () => {
          routeCardGfx.clear();
          routeCardGfx.lineStyle(5, UI_COLORS.GLASS_ACCENT_GUILD, 0.10);
          routeCardGfx.strokeRoundedRect(20 - 2, y - 2, cardW + 4, cardH + 4, 12);
          routeCardGfx.fillStyle(0x111520, 1);
          routeCardGfx.fillRoundedRect(20, y, cardW, cardH, 10);
          routeCardGfx.fillStyle(UI_COLORS.GLASS_OVERLAY, 0.30);
          routeCardGfx.fillRoundedRect(20 + cardW * 0.4, y, cardW * 0.6, cardH, 10);
          routeCardGfx.lineStyle(1, UI_COLORS.GLASS_ACCENT_GUILD, 0.55);
          routeCardGfx.strokeRoundedRect(20, y, cardW, cardH, 10);
          routeCardGfx.lineStyle(1, 0xFFFFFF, 0.06);
          routeCardGfx.lineBetween(30, y + 1, 20 + cardW - 10, y + 1);
        });

        const startBtn = createButton(this.scene, {
          x: 20 + cardW - 110, y: y + cardH / 2 - 13,
          width: 90, height: 26,
          label: 'Start',
          textStyle: { fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD },
          onClick: () => {
            const fighterIds = availableFighters.slice(0, this.partySlots).map(f => f.id);
            this.onStartExpedition?.(route.id, fighterIds, this.selectedDifficulty, this.selectedModifier);
          },
        });
        this.contentContainer.add(startBtn.container);
      } else {
        // Show "Rang X required" text on locked routes
        const requiredRank = routeRequiredRank[route.id] ?? '?';
        this.contentContainer.add(
          this.scene.add.text(30, y + 22, `Rang ${requiredRank} benoetigt`, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DISABLED,
          }),
        );
      }

      y += cardH + 6;
    });

    // ── Talisman Section (Rang III+) ──
    if (currentRank >= 3) {
      y += 4;
      const divTal = createDivider(this.scene, 20, y, this.panelW - 40);
      this.contentContainer.add(divTal);
      y += 10;

      this.contentContainer.add(
        this.scene.add.text(20, y, 'Talisman:', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
        }),
      );

      // Talisman selector – cycle through owned talismans + null
      const owned: Array<string | null> = [null, ...(state.talismanInventory ?? [])];
      const currentSel: string | null = state.selectedTalisman ?? null;
      const selIdx = owned.indexOf(currentSel);
      const selLabel = currentSel ? (TALISMAN_DEFS[currentSel]?.name ?? currentSel) : 'Kein Talisman';

      const talBtn = createButton(this.scene, {
        x: 110, y,
        width: 200, height: 22,
        label: `${selLabel} \u25BC`,
        textStyle: {
          fontFamily: FONT_FAMILY, fontSize: '13px',
          color: currentSel ? UI_STR_COLORS.LOOT : UI_STR_COLORS.DIM,
        },
        onClick: () => {
          const nextIdx = (selIdx + 1) % owned.length;
          state.selectedTalisman = owned[nextIdx];
          if (this.lastState) this.refresh(this.lastState);
        },
      });
      this.contentContainer.add(talBtn.container);

      if (currentSel && TALISMAN_DEFS[currentSel]) {
        this.contentContainer.add(
          this.scene.add.text(316, y + 4, TALISMAN_DEFS[currentSel].description, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.INFO,
          }),
        );
      }
      y += 30;

      // ── Talisman Crafting ──
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Talismane craften:', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
        }),
      );
      y += 18;

      for (const talDef of Object.values(TALISMAN_DEFS)) {
        const alreadyOwned = (state.talismanInventory ?? []).includes(talDef.id);
        if (alreadyOwned) continue; // skip already-owned talismans

        const costParts = Object.entries(talDef.craftCost)
          .map(([res, amt]) => `${amt}x ${res.replace(/_/g, ' ')}`)
          .join(' + ');
        const canCraft = this.talismanSystem.canCraft(state, talDef.id);

        const craftBtn = createButton(this.scene, {
          x: 20, y,
          width: 340, height: 22,
          label: `${talDef.name} craften  (${costParts})`,
          textStyle: {
            fontFamily: FONT_FAMILY, fontSize: '11px',
            color: canCraft ? UI_STR_COLORS.LOOT : UI_STR_COLORS.DISABLED,
          },
          onClick: canCraft ? () => {
            this.talismanSystem.craft(state, talDef.id);
            if (this.lastState) this.refresh(this.lastState);
          } : undefined,
        });
        if (canCraft && craftBtn.bg instanceof Phaser.GameObjects.NineSlice) {
          craftBtn.bg.setTint(0x4477AA);
        }
        this.contentContainer.add(craftBtn.container);
        y += 28;
      }
    }
    this.contentHeight = y + 16;
  }

  // ── Scoreboard Tab ──────────────────────────────────────────

  /** Current scoreboard route filter. null = global view. */
  private scoreboardRouteFilter: string | null = null;

  /**
   * Renders the weekly challenge banner at the top of the scoreboard tab.
   * Returns the y position after the banner.
   */
  private renderWeeklyChallengeBanner(state: GameState, startY: number): number {
    let y = startY;
    const challenge = generateWeeklyChallenge();
    const thresholds = getMedalThresholds(challenge);
    const routeDef = ROUTE_DEFS[challenge.routeId];
    const diffDef = DIFFICULTY_DEFS[challenge.difficulty];
    const modDef = challenge.requiredModifier ? MODIFIER_DEFS[challenge.requiredModifier] : null;

    // Challenge state from save
    const wcState = state.weeklyChallenge;
    const isActive = wcState?.currentChallengeId === challenge.id;
    const bestScore = isActive ? (wcState?.bestScore ?? 0) : 0;
    const medal = isActive ? (wcState?.medal ?? 'none') : 'none';
    const attempts = isActive ? (wcState?.attempts ?? 0) : 0;

    // Banner background (glass-style weekly challenge)
    const bannerH = 100;
    const bannerW = this.panelW - 40;
    const bannerGfx = this.scene.add.graphics();
    bannerGfx.lineStyle(6, UI_COLORS.GLASS_ACCENT_GUILD, 0.12);
    bannerGfx.strokeRoundedRect(20 - 3, y - 3, bannerW + 6, bannerH + 6, 13);
    bannerGfx.fillStyle(0x0E1520, 1);
    bannerGfx.fillRoundedRect(20, y, bannerW, bannerH, 10);
    bannerGfx.fillStyle(0x112233, 0.6);
    bannerGfx.fillRoundedRect(20 + bannerW * 0.35, y, bannerW * 0.65, bannerH, 10);
    bannerGfx.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 0.65);
    bannerGfx.strokeRoundedRect(20, y, bannerW, bannerH, 10);
    bannerGfx.lineStyle(1, 0xFFFFFF, 0.06);
    bannerGfx.lineBetween(30, y + 1, 20 + bannerW - 10, y + 1);
    this.contentContainer.add(bannerGfx);

    // Challenge title
    this.contentContainer.add(
      this.scene.add.text(32, y + 6, `\u2694 ${challenge.displayName}`, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD_BRIGHT,
        fontStyle: 'bold',
      }),
    );

    // Timer (time until next challenge)
    const msLeft = getTimeUntilNextChallenge();
    const hoursLeft = Math.floor(msLeft / 3600000);
    const daysLeft = Math.floor(hoursLeft / 24);
    const timerStr = daysLeft > 0 ? `${daysLeft}T ${hoursLeft % 24}h` : `${hoursLeft}h`;
    this.contentContainer.add(
      this.scene.add.text(this.panelW - 100, y + 8, `Endet in: ${timerStr}`, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
      }),
    );

    // Description
    this.contentContainer.add(
      this.scene.add.text(32, y + 24, challenge.description, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT,
        wordWrap: { width: this.panelW - 80 },
      }),
    );

    // Route + Difficulty + Modifier
    const reqParts = [
      `Route: ${routeDef?.name ?? challenge.routeId}`,
      `Schwierigkeit: ${diffDef?.name ?? challenge.difficulty}`,
    ];
    if (modDef) reqParts.push(`Modifier: ${modDef.name}`);
    this.contentContainer.add(
      this.scene.add.text(32, y + 40, reqParts.join('  |  '), {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.INFO,
      }),
    );

    // Restrictions
    if (challenge.restrictions.length > 0) {
      const restStr = challenge.restrictions.map(r => r.label).join(', ');
      this.contentContainer.add(
        this.scene.add.text(32, y + 54, `Regeln: ${restStr}`, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DAMAGE,
        }),
      );
    }

    // Medal thresholds + player progress
    const medalSymbols: Record<string, string> = {
      none: '-', bronze: '[Bronze]', silver: '[Silber]', gold: '[Gold]',
    };
    const medalColors: Record<string, string> = {
      none: UI_STR_COLORS.DIM, bronze: '#CD7F32', silver: '#C0C0C0', gold: UI_STR_COLORS.GOLD_BRIGHT,
    };
    const thresholdStr = `Bronze: ${thresholds.bronze}  |  Silber: ${thresholds.silver}  |  Gold: ${thresholds.gold}`;
    this.contentContainer.add(
      this.scene.add.text(32, y + 70, thresholdStr, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
      }),
    );

    // Player status
    const statusStr = attempts > 0
      ? `Dein Bester: ${bestScore}  ${medalSymbols[medal]}  (${attempts} Versuche)`
      : 'Noch kein Versuch';
    this.contentContainer.add(
      this.scene.add.text(32, y + 84, statusStr, {
        fontFamily: FONT_FAMILY, fontSize: '13px',
        color: medalColors[medal] ?? UI_STR_COLORS.DIM,
        fontStyle: medal !== 'none' ? 'bold' : 'normal',
      }),
    );

    return y + bannerH + 4;
  }

  private renderScoreboardTab(state: GameState): void {
    const contentTop = 80;
    let y = contentTop;

    // Ensure scoreboard exists (save-compat)
    const entries: ScoreboardEntry[] = state.scoreboard ?? [];

    // ── Weekly Challenge Banner ──
    y = this.renderWeeklyChallengeBanner(state, y);
    y += 6;

    this.contentContainer.add(
      this.scene.add.text(20, y, 'Die besten Expeditionen deiner Gilde.', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM,
      }),
    );
    y += 22;

    // ── Route filter buttons ──
    const routeOptions: { id: string | null; label: string }[] = [
      { id: null, label: 'Alle' },
      ...Object.values(ROUTE_DEFS).map(r => ({ id: r.id as string | null, label: r.name })),
    ];

    const filterBtnW = 82;
    const filterBtnH = 20;
    const filterGap = 4;
    const maxPerRow = 8;
    routeOptions.forEach((opt, i) => {
      const col = i % maxPerRow;
      const row = Math.floor(i / maxPerRow);
      const bx = 20 + col * (filterBtnW + filterGap);
      const by = y + row * (filterBtnH + 4);
      const active = this.scoreboardRouteFilter === opt.id;
      const btn = createButton(this.scene, {
        x: bx, y: by,
        width: filterBtnW, height: filterBtnH,
        label: opt.label.length > 12 ? opt.label.substring(0, 11) + '..' : opt.label,
        textStyle: {
          fontFamily: FONT_FAMILY, fontSize: '11px',
          color: active ? UI_STR_COLORS.GOLD : UI_STR_COLORS.DIM,
        },
        onClick: () => {
          this.scoreboardRouteFilter = opt.id;
          if (this.lastState) this.refresh(this.lastState);
        },
      });
      if (active && btn.bg instanceof Phaser.GameObjects.NineSlice) {
        btn.bg.setTint(UI_COLORS.SUCCESS_GREEN);
      }
      this.contentContainer.add(btn.container);
    });
    const filterRows = Math.ceil(routeOptions.length / maxPerRow);
    y += filterRows * (filterBtnH + 4) + 8;

    const div1 = createDivider(this.scene, 20, y, this.panelW - 40);
    this.contentContainer.add(div1);
    y += 10;

    // ── Filter entries ──
    const filtered = this.scoreboardRouteFilter
      ? entries.filter(e => e.routeId === this.scoreboardRouteFilter)
      : entries;

    if (filtered.length === 0) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Noch keine Eintraege. Schliesse Expeditionen ab!', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT,
        }),
      );
      return;
    }

    // ── Top 5 runs ──
    const top5 = [...filtered].sort((a, b) => b.score - a.score).slice(0, 5);

    this.contentContainer.add(
      this.scene.add.text(20, y, 'Top 5 Expeditionen', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
      }),
    );
    y += 20;

    // Table header
    const colX = { rank: 20, route: 50, score: 260, diff: 340, mod: 440, status: 580 };
    const headerTexts = [
      { x: colX.rank, text: '#' },
      { x: colX.route, text: 'Route' },
      { x: colX.score, text: 'Score' },
      { x: colX.diff, text: 'Schwierigkeit' },
      { x: colX.mod, text: 'Modifikator' },
      { x: colX.status, text: 'Ergebnis' },
    ];
    for (const h of headerTexts) {
      this.contentContainer.add(
        this.scene.add.text(h.x, y, h.text, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
        }),
      );
    }
    y += 16;

    const div2 = createDivider(this.scene, 20, y, this.panelW - 40);
    this.contentContainer.add(div2);
    y += 8;

    // Rows
    top5.forEach((entry, i) => {
      const rankColors = [UI_STR_COLORS.GOLD_BRIGHT, UI_STR_COLORS.LIGHT, '#CD7F32', UI_STR_COLORS.DIM, UI_STR_COLORS.DIM];
      const rankColor = rankColors[i] ?? UI_STR_COLORS.DIM;
      const rankPrefix = i === 0 ? '\u2605 ' : '';

      const routeDef = ROUTE_DEFS[entry.routeId];
      const diffDef = DIFFICULTY_DEFS[entry.difficulty];
      const modDef = entry.modifier ? MODIFIER_DEFS[entry.modifier] : null;

      const statusMap: Record<string, { text: string; color: string }> = {
        victory: { text: 'Sieg', color: UI_STR_COLORS.HEAL },
        defeat: { text: 'Niederlage', color: UI_STR_COLORS.DAMAGE },
        retreat: { text: 'Rueckzug', color: UI_STR_COLORS.GOLD },
      };
      const statusInfo = statusMap[entry.status] ?? { text: entry.status, color: UI_STR_COLORS.LIGHT };

      // Row background (alternating glass info bars)
      {
        const rowBg = this.scene.add.graphics();
        if (i % 2 === 0) {
          drawGlassInfoBar(rowBg, 16, y - 2, this.panelW - 32, 22, 4);
        }
        this.contentContainer.add(rowBg);
      }

      // Rank
      this.contentContainer.add(
        this.scene.add.text(colX.rank, y, `${rankPrefix}${i + 1}`, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: rankColor,
        }),
      );

      // Route name
      this.contentContainer.add(
        this.scene.add.text(colX.route, y, routeDef?.name ?? entry.routeId, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
        }),
      );

      // Score
      this.contentContainer.add(
        this.scene.add.text(colX.score, y, `${entry.score}`, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD_BRIGHT,
          fontStyle: i === 0 ? 'bold' : 'normal',
        }),
      );

      // Difficulty
      this.contentContainer.add(
        this.scene.add.text(colX.diff, y, diffDef?.name ?? entry.difficulty, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.INFO,
        }),
      );

      // Modifier
      this.contentContainer.add(
        this.scene.add.text(colX.mod, y, modDef?.name ?? 'Keiner', {
          fontFamily: FONT_FAMILY, fontSize: '13px',
          color: modDef ? UI_STR_COLORS.DAMAGE : UI_STR_COLORS.DIM,
        }),
      );

      // Status
      this.contentContainer.add(
        this.scene.add.text(colX.status, y, statusInfo.text, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: statusInfo.color,
        }),
      );

      y += 24;
    });

    y += 8;
    const div3 = createDivider(this.scene, 20, y, this.panelW - 40);
    this.contentContainer.add(div3);
    y += 12;

    // ── Global Records ──
    this.contentContainer.add(
      this.scene.add.text(20, y, 'Rekorde', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_GUILD, fontStyle: 'bold',
      }),
    );
    y += 20;

    const allSorted = [...filtered].sort((a, b) => b.score - a.score);
    const victories = filtered.filter(e => e.status === 'victory');
    const totalEnemies = filtered.reduce((s, e) => s + e.enemiesKilled, 0);
    const totalBosses = filtered.reduce((s, e) => s + e.bossesKilled, 0);

    const records = [
      { label: 'Hoechster Score', value: allSorted[0]?.score.toString() ?? '-' },
      { label: 'Expeditionen gesamt', value: `${filtered.length}` },
      { label: 'Siege', value: `${victories.length}` },
      { label: 'Siegquote', value: filtered.length > 0 ? `${Math.round(victories.length / filtered.length * 100)}%` : '-' },
      { label: 'Gegner besiegt', value: `${totalEnemies}` },
      { label: 'Bosse besiegt', value: `${totalBosses}` },
    ];

    const recColW = (this.panelW - 40) / 3;
    records.forEach((rec, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const rx = 20 + col * recColW;
      const ry = y + row * 36;

      // Glass card for record
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(0x111520, 1);
      cardBg.fillRoundedRect(rx, ry, recColW - 8, 32, 8);
      cardBg.lineStyle(1, UI_COLORS.GLASS_ACCENT_GUILD, 0.45);
      cardBg.strokeRoundedRect(rx, ry, recColW - 8, 32, 8);
      cardBg.lineStyle(1, 0xFFFFFF, 0.05);
      cardBg.lineBetween(rx + 8, ry + 1, rx + recColW - 16, ry + 1);
      this.contentContainer.add(cardBg);

      this.contentContainer.add(
        this.scene.add.text(rx + 8, ry + 4, rec.label, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
        }),
      );
      this.contentContainer.add(
        this.scene.add.text(rx + 8, ry + 16, rec.value, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD_BRIGHT,
          fontStyle: 'bold',
        }),
      );
    });
    this.contentHeight = y + 16;
  }

  // ── Shared Logic ──────────────────────────────────────────────

  private startTraining(state: GameState, classId: string): void {
    const idle = state.citizens.find(c => c.status === 'IDLE');
    if (!idle) return;

    const guildHall = state.buildings.find(b => b.typeId === 'GUILD_HALL' && b.built);
    if (!guildHall) return;

    const trainingDef = BUILDING_DEFS['GUILD_HALL'].training!;

    // Check cost
    for (const [res, amt] of Object.entries(trainingDef.trainingCost)) {
      if ((state.globalStock[res] ?? 0) < amt) return;
    }

    // Deduct cost
    for (const [res, amt] of Object.entries(trainingDef.trainingCost)) {
      state.globalStock[res] -= amt;
    }

    // Start training
    idle.status = 'GUILD_TRAINING';
    idle.trainingClassId = classId;
    idle.trainingTimer = trainingDef.trainingTimeSec;
  }

  private retireFighter(state: GameState, fighter: GuildFighter): void {
    // Return gear to stock
    this.gearSystem.unequipAll(state, fighter);

    // Find linked citizen and set to IDLE
    const citizen = state.citizens.find(c => c.fighterId === fighter.id);
    if (citizen) {
      citizen.status = 'IDLE';
      citizen.fighterId = null;
    }

    // Remove from roster
    const idx = state.fighters.findIndex(f => f.id === fighter.id);
    if (idx !== -1) state.fighters.splice(idx, 1);
  }

  destroy(): void {
    this.container.destroy();
  }
}
