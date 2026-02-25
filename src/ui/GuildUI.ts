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

type GuildTab = 'training' | 'roster' | 'expedition' | 'scoreboard';

/**
 * Guild Hall modal with 4 tabs: Training | Roster & Gear | Expedition | Ehrentafel.
 * Phase 4.1/4.2: Uses NineSlice textures from UIHelper.
 */
export class GuildUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private gearSystem: GearSystem;
  private talismanSystem = new TalismanSystem();

  // Tab references (kept alive, not rebuilt on refresh)
  private tabs: UITab[] = [];
  private activeTab: GuildTab = 'training';
  private selectedDifficulty: string = 'normal';
  private selectedModifier: string | null = null;

  // Dynamic content that gets rebuilt on refresh
  private contentContainer!: Phaser.GameObjects.Container;

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
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.container.setPosition(cam.scrollX + this.screenX, cam.scrollY + this.screenY);
  }

  private create(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    this.screenX = cx - this.panelW / 2;
    this.screenY = cy - this.panelH / 2;

    this.container = this.scene.add.container(this.screenX, this.screenY)
      .setDepth(980)
      .setVisible(false);

    // ── Panel Background (NineSlice) ──
    const panelBg = createPanel(this.scene, 0, 0, this.panelW, this.panelH, {
      alpha: 0.96,
      fallbackColor: UI_COLORS.PANEL_BG_DARK,
    });
    this.container.add(panelBg);

    // ── Title ──
    this.container.add(
      this.scene.add.text(this.panelW / 2, 12, 'Gildenhaus', {
        fontFamily: FONT_FAMILY, fontSize: '18px', color: UI_STR_COLORS.GOLD,
      }).setOrigin(0.5, 0),
    );

    // ── Close Button ──
    const closeBtn = createButton(this.scene, {
      x: this.panelW - 38, y: 6,
      width: 30, height: 24,
      label: 'X',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.DAMAGE },
      onClick: () => this.hide(),
    });
    this.container.add(closeBtn.container);

    // ── Tab bar ──
    this.createTabs();

    // ── Content area (below tabs) ──
    this.contentContainer = this.scene.add.container(0, 0);
    this.container.add(this.contentContainer);
  }

  private createTabs(): void {
    const tabDefs: { id: GuildTab; label: string }[] = [
      { id: 'training', label: 'Training' },
      { id: 'roster', label: 'Roster & Gear' },
      { id: 'expedition', label: 'Expedition' },
      { id: 'scoreboard', label: 'Ehrentafel' },
    ];

    const tabW = 170;
    const tabH = 30;
    const tabY = 40;
    const startX = (this.panelW - tabDefs.length * tabW) / 2;

    tabDefs.forEach((def, i) => {
      const tx = startX + i * tabW;
      const tab = createTab(this.scene, {
        x: tx, y: tabY,
        width: tabW, height: tabH,
        label: def.label,
        active: def.id === this.activeTab,
        onClick: () => {
          this.activeTab = def.id;
          this.updateTabVisuals();
          if (this.lastState) this.refresh(this.lastState);
        },
      });
      this.container.add(tab.container);
      this.tabs.push(tab);
    });
  }

  private updateTabVisuals(): void {
    const tabIds: GuildTab[] = ['training', 'roster', 'expedition', 'scoreboard'];
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

    switch (this.activeTab) {
      case 'training':
        this.renderTrainingTab(state);
        break;
      case 'roster':
        this.renderRosterTab(state);
        break;
      case 'expedition':
        this.renderExpeditionTab(state);
        break;
      case 'scoreboard':
        this.renderScoreboardTab(state);
        break;
    }
  }

  // ── Training Tab ──────────────────────────────────────────────

  private renderTrainingTab(state: GameState): void {
    const contentTop = 80;
    let y = contentTop;

    // Explanation text
    this.contentContainer.add(
      this.scene.add.text(20, y, 'Trainiere Buerger zu Kaempfern fuer Expeditionen.', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
      }),
    );
    y += 24;

    const guildHall = state.buildings.find(b => b.typeId === 'GUILD_HALL' && b.built);
    const trainingDef = guildHall ? BUILDING_DEFS['GUILD_HALL'].training : null;

    if (!trainingDef) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Kein Gildenhaus gebaut! Baue eins um zu trainieren.', {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.DAMAGE,
        }),
      );
      return;
    }

    // Stats line
    const idleCitizens = state.citizens.filter(c => c.status === 'IDLE');
    const trainingCitizens = state.citizens.filter(c => c.status === 'GUILD_TRAINING');

    this.contentContainer.add(
      this.scene.add.text(20, y,
        `Freie Buerger: ${idleCitizens.length}   |   In Training: ${trainingCitizens.length}   |   Kaempfer: ${state.fighters.length}`,
        { fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT }),
    );
    y += 28;

    // Divider
    const div1 = createDivider(this.scene, 20, y, this.panelW - 40);
    this.contentContainer.add(div1);
    y += 12;

    // Section header
    this.contentContainer.add(
      this.scene.add.text(20, y, 'Klasse waehlen:', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
      }),
    );
    y += 22;

    if (idleCitizens.length === 0 && trainingCitizens.length === 0) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Keine freien Buerger. Baue mehr Wohnhaeuser!', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT,
        }),
      );
      y += 20;
    } else if (idleCitizens.length > 0) {
      const classes = Object.values(CLASS_DEFS);
      const unlockedClasses: string[] = state.classesUnlocked ?? STARTING_CLASSES;
      classes.forEach((cls, i) => {
        const btnX = 20 + i * 230;
        const isUnlocked = unlockedClasses.includes(cls.id);
        this.renderClassCard(btnX, y, cls, trainingDef.trainingCost, state, isUnlocked);
      });
      y += 110;
    }

    // Currently training
    if (trainingCitizens.length > 0) {
      y += 6;
      const div2 = createDivider(this.scene, 20, y, this.panelW - 40);
      this.contentContainer.add(div2);
      y += 12;

      this.contentContainer.add(
        this.scene.add.text(20, y, 'Aktuell in Training:', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
        }),
      );
      y += 22;

      for (const citizen of trainingCitizens) {
        const remaining = Math.ceil(citizen.trainingTimer);
        const cls = CLASS_DEFS[citizen.trainingClassId ?? ''];
        const totalTime = trainingDef.trainingTimeSec;
        const elapsed = totalTime - remaining;
        const pct = totalTime > 0 ? elapsed / totalTime : 0;

        // NineSlice progress bar
        const bar = createProgressBar(this.scene, {
          x: 20, y: y,
          width: 300, height: 16,
          progress: pct,
          fillColor: UI_COLORS.SUCCESS_GREEN,
        });
        this.contentContainer.add(bar.container);

        this.contentContainer.add(
          this.scene.add.text(24, y + 2,
            `${cls?.name ?? citizen.trainingClassId} – ${remaining}s`, {
            fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
          }),
        );
        y += 24;
      }
    }
  }

  private renderClassCard(
    x: number, y: number, cls: typeof CLASS_DEFS[string],
    cost: Record<string, number>, state: GameState,
    isUnlocked: boolean = true,
  ): void {
    const cardW = 215;
    const cardH = 100;
    const canAfford = isUnlocked && Object.entries(cost).every(
      ([res, amt]) => (state.globalStock[res] ?? 0) >= amt,
    );
    const costStr = Object.entries(cost).map(([r, a]) => `${a} ${r}`).join(', ');

    const card = this.scene.add.container(x, y);

    // NineSlice Card Background – grey tint when locked
    const cardBg = createNineSlice(this.scene, 0, 0, cardW, cardH, 'UI_CARD_BG',
      !isUnlocked ? UI_COLORS.PANEL_BG : (canAfford ? UI_COLORS.AFFORDABLE_BG : UI_COLORS.PANEL_BG));
    card.add(cardBg);

    // Hero sprite with gold frame
    const spriteExists = cls.spriteKey && this.scene.textures.exists(cls.spriteKey);
    const spriteAreaW = 56;
    const textX = spriteExists ? spriteAreaW + 8 : 8;

    if (spriteExists) {
      // Gold frame behind sprite
      const frame = createNineSlice(this.scene, 4, (cardH - 56) / 2 - 4, 56, 56,
        'UI_FRAME_GOLD', UI_COLORS.PANEL_BORDER);
      card.add(frame);

      // Hero sprite inside frame – dimmed when locked
      const heroImg = this.scene.add.image(4 + 28, cardH / 2 - 2, cls.spriteKey)
        .setDisplaySize(48, 48);
      if (!isUnlocked) heroImg.setAlpha(0.4);
      card.add(heroImg);
    }

    // Locked overlay: dark semi-transparent rect + lock symbol
    if (!isUnlocked) {
      const lockOverlay = this.scene.add.graphics();
      lockOverlay.fillStyle(0x000000, 0.45);
      lockOverlay.fillRoundedRect(0, 0, cardW, cardH, 6);
      card.add(lockOverlay);

      // Lock symbol centered in card
      card.add(this.scene.add.text(cardW / 2, cardH / 2 - 10, '\uD83D\uDD12', {
        fontFamily: FONT_FAMILY, fontSize: '22px', color: UI_STR_COLORS.DIM,
      }).setOrigin(0.5, 0.5).setAlpha(0.7));
    }

    // Class name
    const nameText = this.scene.add.text(textX, 8, cls.name, {
      fontFamily: FONT_FAMILY, fontSize: '13px',
      color: !isUnlocked ? UI_STR_COLORS.DISABLED : (canAfford ? UI_STR_COLORS.LIGHT : UI_STR_COLORS.DISABLED),
    });
    if (!isUnlocked) nameText.setAlpha(0.4);
    card.add(nameText);

    // Role + stats summary
    const stats = cls.baseStats;
    const statsText = this.scene.add.text(textX, 26, `${cls.role} | HP:${stats.maxHp} ATK:${stats.atk} DEF:${stats.def}`, {
      fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
    });
    if (!isUnlocked) statsText.setAlpha(0.4);
    card.add(statsText);

    if (!isUnlocked) {
      // Show "Gesperrt" label instead of cost/button
      card.add(this.scene.add.text(textX, 42, 'Gesperrt', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DISABLED,
        fontStyle: 'italic',
      }).setAlpha(0.6));
    } else {
      // Cost
      card.add(this.scene.add.text(textX, 42, `Kosten: ${costStr}`, {
        fontFamily: FONT_FAMILY, fontSize: '9px',
        color: canAfford ? UI_STR_COLORS.LOOT : UI_STR_COLORS.DAMAGE,
      }));

      // Requirement text
      card.add(this.scene.add.text(textX, 56, 'Benoetigt: 1 freier Buerger', {
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.GOLD,
      }));

      // Train button (NineSlice)
      const trainBtn = createButton(this.scene, {
        x: textX, y: 72,
        width: cardW - textX - 8, height: 22,
        label: canAfford ? 'Trainieren' : 'Zu teuer',
        textStyle: {
          fontFamily: FONT_FAMILY, fontSize: '10px',
          color: canAfford ? UI_STR_COLORS.LIGHT : UI_STR_COLORS.DISABLED,
        },
        onClick: canAfford ? () => {
          this.startTraining(state, cls.id);
          this.refresh(state);
        } : undefined,
      });
      // Green tint if affordable
      if (canAfford && trainBtn.bg instanceof Phaser.GameObjects.NineSlice) {
        trainBtn.bg.setTint(0x44AA44);
      }
      card.add(trainBtn.container);

      // Card-level hover effect (only if affordable)
      if (canAfford) {
        card.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, cardW, cardH),
          Phaser.Geom.Rectangle.Contains,
        );
        card.on('pointerover', () => {
          if (cardBg instanceof Phaser.GameObjects.NineSlice) {
            cardBg.setTint(0x557755);
          } else if (cardBg instanceof Phaser.GameObjects.Graphics) {
            cardBg.clear();
            cardBg.fillStyle(UI_COLORS.AFFORDABLE_BORDER, 1).fillRoundedRect(0, 0, cardW, cardH, 6);
            cardBg.lineStyle(1, UI_COLORS.CARD_HOVER_BORDER, 1).strokeRoundedRect(0, 0, cardW, cardH, 6);
          }
        });
        card.on('pointerout', () => {
          if (cardBg instanceof Phaser.GameObjects.NineSlice) {
            cardBg.clearTint();
          } else if (cardBg instanceof Phaser.GameObjects.Graphics) {
            cardBg.clear();
            cardBg.fillStyle(UI_COLORS.AFFORDABLE_BG, 1).fillRoundedRect(0, 0, cardW, cardH, 6);
            cardBg.lineStyle(1, UI_COLORS.AFFORDABLE_BORDER, 1).strokeRoundedRect(0, 0, cardW, cardH, 6);
          }
        });
      }
    }

    this.contentContainer.add(card);
  }

  // ── Roster & Gear Tab ─────────────────────────────────────────

  private renderRosterTab(state: GameState): void {
    const contentTop = 80;
    let y = contentTop;

    this.contentContainer.add(
      this.scene.add.text(20, y, 'Deine Kaempfer. Rueste sie aus und manage dein Team.', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
      }),
    );
    y += 24;

    if (state.fighters.length === 0) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Noch keine Kaempfer. Gehe zum Training-Tab!', {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD,
        }),
      );
      return;
    }

    for (const fighter of state.fighters) {
      y = this.renderFighterCard(fighter, y, state);
    }
  }

  private renderFighterCard(fighter: GuildFighter, y: number, state: GameState): number {
    const cardW = this.panelW - 40;
    const cardH = 80;
    const cls = CLASS_DEFS[fighter.classId];
    const stats = this.gearSystem.getEffectiveStats(fighter);
    const citizen = state.citizens.find(c => c.fighterId === fighter.id);

    // Determine fighter status
    const isAvailable = citizen != null && citizen.status === 'GUILD_FIGHTER';
    const isInjured = citizen != null && citizen.status === 'INJURED_REST';
    const isOnExpedition = citizen != null && citizen.status === 'ON_EXPEDITION';

    // NineSlice card background
    const cardBg = createNineSlice(this.scene, 20, y, cardW, cardH, 'UI_CARD_BG',
      isInjured ? UI_COLORS.CARD_BG_LIGHT : UI_COLORS.CARD_BG);
    if (isAvailable && cardBg instanceof Phaser.GameObjects.NineSlice) {
      // Subtle green tint for available fighters
    }
    this.contentContainer.add(cardBg);

    // Fighter sprite (left side of card)
    const hasSprite = cls?.spriteKey && this.scene.textures.exists(cls.spriteKey);
    const textX = hasSprite ? 86 : 30;
    if (hasSprite) {
      // Small frame around sprite
      const spriteFrame = createNineSlice(this.scene, 26, y + 8, 48, 48,
        'UI_FRAME_GOLD', UI_COLORS.PANEL_BORDER);
      this.contentContainer.add(spriteFrame);

      this.contentContainer.add(
        this.scene.add.image(50, y + 32, cls.spriteKey)
          .setDisplaySize(40, 40),
      );
    }

    // Status string with clear distinction between states
    let statusStr = '';
    let statusColor: string = UI_STR_COLORS.INFO;
    if (isInjured) {
      statusStr = ` [Verletzt – ${Math.ceil(citizen!.injuryTimer)}s]`;
      statusColor = UI_STR_COLORS.DAMAGE;
    } else if (isOnExpedition) {
      statusStr = ' [Auf Expedition]';
      statusColor = UI_STR_COLORS.GOLD_BRIGHT;
    } else if (isAvailable) {
      statusStr = ' [Bereit]';
      statusColor = UI_STR_COLORS.HEAL;
    } else {
      statusStr = ' [Nicht verfuegbar]';
      statusColor = UI_STR_COLORS.DISABLED;
    }

    // Name + class
    const nameText = this.scene.add.text(textX, y + 8,
      `${fighter.name} (${cls?.name ?? fighter.classId})`, {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.INFO,
    });
    this.contentContainer.add(nameText);

    // Status badge (placed after name text)
    const statusText = this.scene.add.text(textX + nameText.width + 6, y + 9, statusStr, {
      fontFamily: FONT_FAMILY, fontSize: '10px', color: statusColor,
    });
    this.contentContainer.add(statusText);

    // Stats
    this.contentContainer.add(
      this.scene.add.text(textX, y + 26,
        `HP:${stats.maxHp}  ATK:${stats.atk}  DEF:${stats.def}  SPD:${stats.spd.toFixed(1)}  CRIT:${(stats.critChance * 100).toFixed(0)}%`, {
        fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
      }),
    );

    // Gear slots with item sprites
    this.renderGearSlot(textX, y + 42, 'Waffe', fighter.gear.weapon, state);
    this.renderGearSlot(textX + 150, y + 42, 'Ruestung', fighter.gear.armor, state);
    this.renderGearSlot(textX + 310, y + 42, 'Schmuck', fighter.gear.trinket, state);

    // Equip buttons (show available gear from stock)
    if (isAvailable) {
      let bx = textX;
      const gearItems = Object.entries(state.globalStock)
        .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.gearSlot)
        .map(([id]) => id);

      if (gearItems.length > 0) {
        const equipY = y + 58;
        for (const itemId of gearItems.slice(0, 4)) {
          const itemDef = ITEM_DEFS[itemId];
          const equipBtn = createButton(this.scene, {
            x: bx, y: equipY,
            width: 88, height: 18,
            label: `+${itemDef.name.substring(0, 10)}`,
            textStyle: { fontFamily: FONT_FAMILY, fontSize: '8px', color: UI_STR_COLORS.LOOT },
            onClick: () => {
              this.gearSystem.equip(state, fighter, itemId);
              this.refresh(state);
            },
          });
          this.contentContainer.add(equipBtn.container);
          bx += 92;
        }
      }
    }

    // Retire button (NineSlice, far right)
    const retireBtn = createButton(this.scene, {
      x: 20 + cardW - 66, y: y + 8,
      width: 56, height: 22,
      label: 'Retire',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DAMAGE },
      onClick: () => {
        this.retireFighter(state, fighter);
        this.refresh(state);
      },
    });
    this.contentContainer.add(retireBtn.container);

    return y + cardH + 8;
  }

  /** Renders a gear slot label with optional item sprite. */
  private renderGearSlot(x: number, y: number, label: string, itemId: string | null, _state: GameState): void {
    const gearName = this.getGearName(itemId);

    this.contentContainer.add(
      this.scene.add.text(x, y, `${label}: `, {
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
      }),
    );

    // Item sprite if exists
    if (itemId) {
      const spriteKey = `ITEM_${itemId.toUpperCase()}`;
      if (this.scene.textures.exists(spriteKey)) {
        const labelWidth = label.length * 5.5 + 4; // Approximate text width
        this.contentContainer.add(
          this.scene.add.image(x + labelWidth + 8, y + 5, spriteKey)
            .setDisplaySize(14, 14),
        );
        this.contentContainer.add(
          this.scene.add.text(x + labelWidth + 20, y, gearName, {
            fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.LOOT,
          }),
        );
        return;
      }
    }

    const labelWidth = (label.length + 2) * 5.5;
    this.contentContainer.add(
      this.scene.add.text(x + labelWidth, y, gearName, {
        fontFamily: FONT_FAMILY, fontSize: '9px',
        color: itemId ? UI_STR_COLORS.LOOT : UI_STR_COLORS.DISABLED,
      }),
    );
  }

  private getGearName(itemId: string | null): string {
    if (!itemId) return '–';
    return ITEM_DEFS[itemId]?.name ?? itemId;
  }

  // ── Expedition Tab ────────────────────────────────────────────

  private renderExpeditionTab(state: GameState): void {
    const contentTop = 80;
    let y = contentTop;

    if (state.activeExpedition) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Eine Expedition ist aktiv! Oeffne die Expeditions-Ansicht.', {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD_BRIGHT,
        }),
      );
      y += 30;
      const viewBtn = createButton(this.scene, {
        x: 20, y: y,
        width: 180, height: 30,
        label: 'Expedition anzeigen',
        textStyle: { fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT },
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
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
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
          fontFamily: FONT_FAMILY, fontSize: '9px',
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
          fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
        }),
      );
      y += 14;
    }

    // ── Modifier Selector ──
    this.contentContainer.add(
      this.scene.add.text(20, y, 'Modifikator (optional):', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
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
          fontFamily: FONT_FAMILY, fontSize: '9px',
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
            fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DAMAGE,
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
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT,
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
            fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.INFO,
          }),
        );
        fx += (fighter.name.length + 10) * 5.5 + 12;
      }
    }
    y += 18;

    if (availableFighters.length === 0) {
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Keine Kaempfer bereit! Trainiere zuerst im Training-Tab.', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DAMAGE,
        }),
      );
      return;
    }

    const div1 = createDivider(this.scene, 20, y, this.panelW - 40);
    this.contentContainer.add(div1);
    y += 10;

    // ── Routes ──
    this.contentContainer.add(
      this.scene.add.text(20, y, 'Routen:', {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD,
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

      const cardBg = createNineSlice(this.scene, 20, y, cardW, cardH, 'UI_CARD_BG',
        UI_COLORS.ROUTE_CARD_BG);
      if (cardBg instanceof Phaser.GameObjects.NineSlice) {
        cardBg.setTint(routeUnlocked ? 0x226622 : 0x333333);
      }
      if (!routeUnlocked && cardBg instanceof Phaser.GameObjects.NineSlice) {
        cardBg.setAlpha(0.4);
      }
      this.contentContainer.add(cardBg);

      this.contentContainer.add(
        this.scene.add.text(30, y + 6, route.name, {
          fontFamily: FONT_FAMILY, fontSize: '12px',
          color: routeUnlocked ? UI_STR_COLORS.LIGHT : UI_STR_COLORS.DISABLED,
        }).setAlpha(routeUnlocked ? 1 : 0.4),
      );

      if (routeUnlocked) {
        this.contentContainer.add(
          this.scene.add.text(30, y + 22,
            `${route.rooms} Raeume  |  Empf. Lv${route.recommendedLevel}  |  T${route.tier}${route.bossId ? '  |  Boss' : ''}`, {
            fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
          }),
        );

        // Hover directly on cardBg (no hitZone, avoids Z-order conflict with startBtn)
        if (cardBg instanceof Phaser.GameObjects.NineSlice) {
          cardBg.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, cardW, cardH),
            Phaser.Geom.Rectangle.Contains,
          );
          cardBg.on('pointerover', () => cardBg.setTint(0x338833));
          cardBg.on('pointerout', () => cardBg.setTint(0x226622));
        }

        const startBtn = createButton(this.scene, {
          x: 20 + cardW - 110, y: y + cardH / 2 - 13,
          width: 90, height: 26,
          label: 'Start',
          textStyle: { fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD },
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
            fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DISABLED,
          }).setAlpha(0.5),
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
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD,
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
          fontFamily: FONT_FAMILY, fontSize: '10px',
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
            fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.INFO,
          }),
        );
      }
      y += 30;

      // ── Talisman Crafting ──
      this.contentContainer.add(
        this.scene.add.text(20, y, 'Talismane craften:', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
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
            fontFamily: FONT_FAMILY, fontSize: '9px',
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

    // Banner background (green-tinted card)
    const bannerH = 100;
    const bannerBg = createNineSlice(this.scene, 20, y, this.panelW - 40, bannerH,
      'UI_CARD_BG', UI_COLORS.ROUTE_CARD_BG);
    if (bannerBg instanceof Phaser.GameObjects.NineSlice) {
      bannerBg.setTint(0x1B4A5E);
    }
    this.contentContainer.add(bannerBg);

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
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
      }),
    );

    // Description
    this.contentContainer.add(
      this.scene.add.text(32, y + 24, challenge.description, {
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.LIGHT,
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
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.INFO,
      }),
    );

    // Restrictions
    if (challenge.restrictions.length > 0) {
      const restStr = challenge.restrictions.map(r => r.label).join(', ');
      this.contentContainer.add(
        this.scene.add.text(32, y + 54, `Regeln: ${restStr}`, {
          fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DAMAGE,
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
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
      }),
    );

    // Player status
    const statusStr = attempts > 0
      ? `Dein Bester: ${bestScore}  ${medalSymbols[medal]}  (${attempts} Versuche)`
      : 'Noch kein Versuch';
    this.contentContainer.add(
      this.scene.add.text(32, y + 84, statusStr, {
        fontFamily: FONT_FAMILY, fontSize: '10px',
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
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
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
          fontFamily: FONT_FAMILY, fontSize: '8px',
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
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT,
        }),
      );
      return;
    }

    // ── Top 5 runs ──
    const top5 = [...filtered].sort((a, b) => b.score - a.score).slice(0, 5);

    this.contentContainer.add(
      this.scene.add.text(20, y, 'Top 5 Expeditionen', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
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
          fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
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

      // Row background (alternating)
      if (i % 2 === 0) {
        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(UI_COLORS.CARD_BG, 0.5);
        rowBg.fillRoundedRect(16, y - 2, this.panelW - 32, 22, 3);
        this.contentContainer.add(rowBg);
      }

      // Rank
      this.contentContainer.add(
        this.scene.add.text(colX.rank, y, `${rankPrefix}${i + 1}`, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: rankColor,
        }),
      );

      // Route name
      this.contentContainer.add(
        this.scene.add.text(colX.route, y, routeDef?.name ?? entry.routeId, {
          fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
        }),
      );

      // Score
      this.contentContainer.add(
        this.scene.add.text(colX.score, y, `${entry.score}`, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD_BRIGHT,
          fontStyle: i === 0 ? 'bold' : 'normal',
        }),
      );

      // Difficulty
      this.contentContainer.add(
        this.scene.add.text(colX.diff, y, diffDef?.name ?? entry.difficulty, {
          fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.INFO,
        }),
      );

      // Modifier
      this.contentContainer.add(
        this.scene.add.text(colX.mod, y, modDef?.name ?? 'Keiner', {
          fontFamily: FONT_FAMILY, fontSize: '10px',
          color: modDef ? UI_STR_COLORS.DAMAGE : UI_STR_COLORS.DIM,
        }),
      );

      // Status
      this.contentContainer.add(
        this.scene.add.text(colX.status, y, statusInfo.text, {
          fontFamily: FONT_FAMILY, fontSize: '10px', color: statusInfo.color,
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
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
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

      // NineSlice card for record
      const cardBg = createNineSlice(this.scene, rx, ry, recColW - 8, 32, 'UI_CARD_BG', UI_COLORS.CARD_BG);
      this.contentContainer.add(cardBg);

      this.contentContainer.add(
        this.scene.add.text(rx + 8, ry + 4, rec.label, {
          fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
        }),
      );
      this.contentContainer.add(
        this.scene.add.text(rx + 8, ry + 16, rec.value, {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD_BRIGHT,
          fontStyle: 'bold',
        }),
      );
    });
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
