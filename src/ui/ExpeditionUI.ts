import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { ROUTE_DEFS } from '../data/routes';
import { ITEM_DEFS } from '../data/items';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { ExpeditionSystem } from '../systems/ExpeditionSystem';
import { CombatOverlay } from './CombatOverlay';

/**
 * Full-screen overlay for active expedition: room progress, HP bars, combat log, provisions.
 */
export class ExpeditionUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private contentContainer!: Phaser.GameObjects.Container;
  private expeditionSystem: ExpeditionSystem;
  private combatOverlay: CombatOverlay | null = null;

  public onClose?: () => void;

  private panelW: number;
  private panelH: number;

  /** Stores the GameState ref for combat overlay callbacks */
  private lastState: GameState | null = null;

  constructor(scene: Phaser.Scene, expeditionSystem: ExpeditionSystem) {
    this.scene = scene;
    this.expeditionSystem = expeditionSystem;
    this.panelW = scene.scale.width - 40;
    this.panelH = scene.scale.height - 40;
    this.create();
  }

  /** Set the CombatOverlay instance (created by CityScene). */
  setCombatOverlay(overlay: CombatOverlay): void {
    this.combatOverlay = overlay;
  }

  private screenX = 20;
  private screenY = 20;

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.container.setPosition(cam.scrollX + this.screenX, cam.scrollY + this.screenY);
  }

  private create(): void {
    this.container = this.scene.add.container(this.screenX, this.screenY)
      .setDepth(990)
      .setVisible(false);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_COLORS.PANEL_BG_DARKER, 0.96);
    bg.fillRoundedRect(0, 0, this.panelW, this.panelH, 8);
    bg.lineStyle(2, UI_COLORS.PANEL_BORDER, 1);
    bg.strokeRoundedRect(0, 0, this.panelW, this.panelH, 8);
    this.container.add(bg);

    // Title
    this.container.add(
      this.scene.add.text(this.panelW / 2, 12, 'Expedition', {
        fontFamily: FONT_FAMILY, fontSize: '18px', color: UI_STR_COLORS.GOLD,
      }).setOrigin(0.5, 0),
    );

    this.contentContainer = this.scene.add.container(0, 0);
    this.container.add(this.contentContainer);
  }

  show(state: GameState): void {
    const cam = this.scene.cameras.main;
    this.updatePosition(cam);
    this.refresh(state);
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
    this.onClose?.();
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  refresh(state: GameState): void {
    this.lastState = state;
    this.contentContainer.removeAll(true);

    const run = state.activeExpedition;
    if (!run) {
      this.contentContainer.add(
        this.scene.add.text(20, 50, 'Keine aktive Expedition.', {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT,
        }),
      );
      return;
    }

    const route = ROUTE_DEFS[run.routeId];
    let y = 45;

    // ── Route Info ──
    const statusLabel = run.status === 'exploring' ? 'Unterwegs'
      : run.status === 'victory' ? 'Sieg!'
      : run.status === 'defeat' ? 'Niederlage'
      : 'Rueckzug';
    const statusColor = run.status === 'victory' ? UI_STR_COLORS.HEAL
      : run.status === 'defeat' ? UI_STR_COLORS.DAMAGE
      : run.status === 'retreat' ? UI_STR_COLORS.GOLD_BRIGHT
      : UI_STR_COLORS.LIGHT;

    this.contentContainer.add(
      this.scene.add.text(20, y, `Route: ${route?.name ?? run.routeId}`, {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT,
      }),
    );
    this.contentContainer.add(
      this.scene.add.text(this.panelW - 20, y, statusLabel, {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: statusColor,
      }).setOrigin(1, 0),
    );
    y += 20;

    // Room progress bar
    const progressW = this.panelW - 40;
    const progressG = this.scene.add.graphics();
    progressG.fillStyle(UI_COLORS.PROGRESS_BG, 1);
    progressG.fillRoundedRect(20, y, progressW, 14, 3);
    const filled = run.rooms.length > 0 ? (run.currentRoom / run.rooms.length) * progressW : 0;
    progressG.fillStyle(UI_COLORS.SUCCESS_GREEN, 1);
    progressG.fillRoundedRect(20, y, filled, 14, 3);
    this.contentContainer.add(progressG);

    this.contentContainer.add(
      this.scene.add.text(20 + progressW / 2, y + 1, `Raum ${run.currentRoom} / ${run.rooms.length}`, {
        fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
      }).setOrigin(0.5, 0),
    );
    y += 24;

    // Zwei-Spalten-Layout: Links Party + Enemies, Rechts Provisions + Loot
    const colLeft = 20;
    const colRight = this.panelW / 2 + 10;
    const colW = this.panelW / 2 - 30;
    let yLeft = y;
    let yRight = y;

    // ── Linke Spalte: Party ──
    yLeft = this.drawSectionHeader(colLeft, yLeft, 'Party', UI_STR_COLORS.INFO);

    for (const unit of run.party) {
      const hpPct = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
      const alive = unit.hp > 0;

      // Name + HP Text
      const hpColor = !alive ? UI_STR_COLORS.DISABLED : hpPct > 0.5 ? UI_STR_COLORS.HEAL : hpPct > 0.2 ? UI_STR_COLORS.GOLD_BRIGHT : UI_STR_COLORS.DAMAGE;
      this.contentContainer.add(
        this.scene.add.text(colLeft, yLeft,
          `${alive ? '' : '[X] '}${unit.name}`,
          { fontFamily: FONT_FAMILY, fontSize: '10px', color: alive ? UI_STR_COLORS.LIGHT : UI_STR_COLORS.DISABLED }),
      );
      this.contentContainer.add(
        this.scene.add.text(colLeft + colW, yLeft,
          `${Math.max(0, unit.hp)}/${unit.maxHp}  A:${unit.atk} D:${unit.def}`,
          { fontFamily: FONT_FAMILY, fontSize: '10px', color: hpColor }).setOrigin(1, 0),
      );
      yLeft += 14;

      // Mini HP Bar
      if (alive) {
        const barW = colW;
        const hpG = this.scene.add.graphics();
        hpG.fillStyle(UI_COLORS.PROGRESS_BG, 1);
        hpG.fillRect(colLeft, yLeft, barW, 4);
        const hpFillColor = hpPct > 0.5 ? UI_COLORS.HEAL_GREEN : hpPct > 0.2 ? UI_COLORS.GOLD_MID : UI_COLORS.DAMAGE_RED;
        hpG.fillStyle(hpFillColor, 1);
        hpG.fillRect(colLeft, yLeft, barW * hpPct, 4);
        this.contentContainer.add(hpG);
        yLeft += 8;
      } else {
        yLeft += 4;
      }
    }
    yLeft += 8;

    // ── Linke Spalte: Enemies (if combat) ──
    if (run.currentRoom < run.rooms.length) {
      const currentRoom = run.rooms[run.currentRoom];
      if ((currentRoom.type === 'combat' || currentRoom.type === 'boss') && currentRoom.enemies.length > 0) {
        // Focus status in header (check active first, then cooldown)
        const focusLabel = run.focusTarget
          ? 'Gegner (Fokus aktiv)'
          : run.focusTargetCooldown > 0
            ? `Gegner (Fokus CD: ${run.focusTargetCooldown})`
            : 'Gegner (Klick = Fokus)';
        yLeft = this.drawSectionHeader(colLeft, yLeft, focusLabel, UI_STR_COLORS.DAMAGE);

        for (const enemy of currentRoom.enemies) {
          const alive = enemy.hp > 0;
          const isFocused = run.focusTarget?.enemyId === enemy.id;
          const prefix = isFocused ? '\u25B6 ' : alive ? '' : '[X] ';
          const nameColor = isFocused ? UI_STR_COLORS.GOLD_BRIGHT
            : alive ? UI_STR_COLORS.DAMAGE : UI_STR_COLORS.DISABLED;

          this.contentContainer.add(
            this.scene.add.text(colLeft, yLeft,
              `${prefix}${enemy.name}`,
              { fontFamily: FONT_FAMILY, fontSize: '10px', color: nameColor }),
          );
          this.contentContainer.add(
            this.scene.add.text(colLeft + colW, yLeft,
              `${Math.max(0, enemy.hp)}/${enemy.maxHp}`,
              { fontFamily: FONT_FAMILY, fontSize: '10px', color: alive ? UI_STR_COLORS.DAMAGE : UI_STR_COLORS.DISABLED }).setOrigin(1, 0),
          );

          // Clickable focus target (alive, exploring, no cooldown)
          if (alive && run.status === 'exploring' && run.focusTargetCooldown === 0) {
            const hitZone = this.scene.add.zone(colLeft + colW / 2, yLeft + 6, colW, 14)
              .setInteractive({ useHandCursor: true });
            hitZone.on('pointerdown', () => {
              this.expeditionSystem.setFocusTarget(run, enemy.id);
              if (this.lastState) this.refresh(this.lastState);
            });
            this.contentContainer.add(hitZone);
          }

          yLeft += 14;
        }
        yLeft += 8;
      }
    }

    // ── Rechte Spalte: Provisions ──
    yRight = this.drawSectionHeader(colRight, yRight, 'Proviant', UI_STR_COLORS.GOLD_BRIGHT);
    if (run.provisions.length === 0) {
      this.contentContainer.add(
        this.scene.add.text(colRight, yRight, 'Kein Proviant', {
          fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DISABLED,
        }),
      );
      yRight += 14;
    }
    for (let i = 0; i < run.provisions.length; i++) {
      const p = run.provisions[i];
      const itemDef = ITEM_DEFS[p.itemId];
      let textOffset = 0;

      // Item sprite if available
      const spriteKey = `ITEM_${p.itemId.toUpperCase()}`;
      if (this.scene.textures.exists(spriteKey)) {
        this.contentContainer.add(
          this.scene.add.image(colRight + 8, yRight + 7, spriteKey)
            .setDisplaySize(14, 14),
        );
        textOffset = 20;
      }

      this.contentContainer.add(
        this.scene.add.text(colRight + textOffset, yRight, `${itemDef?.name ?? p.itemId} x${p.qty}`, {
          fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
        }),
      );

      // Use-Button (nur wenn Expedition laeuft und Item nutzbar)
      if (run.status === 'exploring' && p.qty > 0) {
        const useX = colRight + colW - 40;
        this.addSmallButton(useX, yRight - 2, 'Nutzen', () => {
          this.expeditionSystem.useProvision(state, i);
          this.refresh(state);
        });
      }
      yRight += 18;
    }
    yRight += 8;

    // ── Rechte Spalte: Loot ──
    const lootEntries = Object.entries(run.loot).filter(([_, q]) => q > 0);
    if (lootEntries.length > 0 || run.goldEarned > 0) {
      yRight = this.drawSectionHeader(colRight, yRight, 'Beute', UI_STR_COLORS.LOOT);
      if (run.goldEarned > 0) {
        let goldOffset = 0;
        if (this.scene.textures.exists('ICON_GOLD')) {
          this.contentContainer.add(
            this.scene.add.image(colRight + 8, yRight + 7, 'ICON_GOLD')
              .setDisplaySize(14, 14),
          );
          goldOffset = 20;
        }
        this.contentContainer.add(
          this.scene.add.text(colRight + goldOffset, yRight, `Gold: ${run.goldEarned}`, {
            fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.GOLD_BRIGHT,
          }),
        );
        yRight += 14;
      }
      for (const [itemId, qty] of lootEntries) {
        const itemDef = ITEM_DEFS[itemId];
        let lootOffset = 0;

        // Item sprite if available
        const lootSpriteKey = `ITEM_${itemId.toUpperCase()}`;
        if (this.scene.textures.exists(lootSpriteKey)) {
          this.contentContainer.add(
            this.scene.add.image(colRight + 8, yRight + 7, lootSpriteKey)
              .setDisplaySize(14, 14),
          );
          lootOffset = 20;
        }

        this.contentContainer.add(
          this.scene.add.text(colRight + lootOffset, yRight, `${itemDef?.name ?? itemId}: ${qty}`, {
            fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
          }),
        );
        yRight += 14;
      }
      yRight += 8;
    }

    // ── Combat Log (unter beiden Spalten) ──
    y = Math.max(yLeft, yRight) + 4;

    // Trennlinie
    const divG = this.scene.add.graphics();
    divG.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.3);
    divG.lineBetween(20, y, this.panelW - 20, y);
    this.contentContainer.add(divG);
    y += 6;

    y = this.drawSectionHeader(20, y, 'Kampfprotokoll', UI_STR_COLORS.DIM);
    const logSlice = run.combatLog.slice(-12);
    for (const line of logSlice) {
      this.contentContainer.add(
        this.scene.add.text(20, y, line, { fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.MUTED }),
      );
      y += 12;
    }
    y += 12;

    // ── Action Buttons (dynamisch positioniert) ──
    if (run.status === 'exploring') {
      let btnX = 20;

      this.addButton(btnX, y, 'Naechster Raum', () => {
        this.handleNextRoom(state);
      });
      btnX += 150;

      if (!run.desperateResolveUsed) {
        this.addButton(btnX, y, 'Verzweifelter Wille', () => {
          this.expeditionSystem.desperateResolve(run);
          this.refresh(state);
        }, UI_COLORS.DESPERATE_RED);
        btnX += 170;
      }

      this.addButton(btnX, y, 'Rueckzug', () => {
        this.expeditionSystem.retreat(run);
        this.refresh(state);
      }, UI_COLORS.BTN_HOVER);
    } else {
      // Expedition ended
      this.addButton(20, y, 'Einsammeln & Schliessen', () => {
        this.hide();
      }, UI_COLORS.SUCCESS_BTN_BG);
    }
  }

  /**
   * Handles the "Nächster Raum" action.
   * Combat/boss rooms → open CombatOverlay for animated combat.
   * Other rooms (rest, hazard, checkpoint) → process directly.
   */
  private handleNextRoom(state: GameState): void {
    const run = state.activeExpedition;
    if (!run || run.status !== 'exploring') return;

    const roomIndex = run.currentRoom;
    if (roomIndex >= run.rooms.length) return;

    const room = run.rooms[roomIndex];

    // Non-combat rooms: process directly
    if (room.type !== 'combat' && room.type !== 'boss') {
      this.expeditionSystem.processCurrentRoom(state);
      this.refresh(state);
      return;
    }

    // Combat/boss room: use CombatOverlay if available
    if (!this.combatOverlay) {
      // Fallback: process directly if no overlay
      this.expeditionSystem.processCurrentRoom(state);
      this.refresh(state);
      return;
    }

    // Block ExpeditionUI input while CombatOverlay is active
    this.contentContainer.setVisible(false);

    // Show combat overlay in preview state (BEFORE processing combat)
    this.combatOverlay.show(run, roomIndex);

    // Wire up "Kampf!" button → process combat → animate
    this.combatOverlay.onFightClicked = () => {
      this.expeditionSystem.processCurrentRoom(state);
      this.combatOverlay!.startCombatAnimation(run, room);
    };

    // Wire up "Weiter" button → hide overlay → refresh expedition UI
    this.combatOverlay.onComplete = () => {
      this.contentContainer.setVisible(true);
      this.refresh(state);
    };
  }

  private drawSectionHeader(x: number, y: number, text: string, color: string): number {
    this.contentContainer.add(
      this.scene.add.text(x, y, `── ${text} ──`, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color,
      }),
    );
    return y + 16;
  }

  private addButton(x: number, y: number, label: string, onClick: () => void, bgColor: number = UI_COLORS.BTN_NORMAL): void {
    const w = Math.max(130, label.length * 8 + 20);
    const bg = this.scene.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(x, y, w, 28, 4);

    const text = this.scene.add.text(x + w / 2, y + 14, label, {
      fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.LIGHT,
    }).setOrigin(0.5);

    const hitArea = this.scene.add.zone(x + w / 2, y + 14, w, 28).setInteractive();
    hitArea.on('pointerdown', onClick);
    const hoverColor = Math.min(bgColor + 0x111111, 0xFFFFFF);
    hitArea.on('pointerover', () => bg.clear().fillStyle(hoverColor, 1).fillRoundedRect(x, y, w, 28, 4));
    hitArea.on('pointerout', () => bg.clear().fillStyle(bgColor, 1).fillRoundedRect(x, y, w, 28, 4));

    this.contentContainer.add([bg, text, hitArea]);
  }

  private addSmallButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_COLORS.BTN_NORMAL, 1);
    bg.fillRoundedRect(x, y, 40, 16, 3);

    const text = this.scene.add.text(x + 20, y + 8, label, {
      fontFamily: FONT_FAMILY, fontSize: '8px', color: UI_STR_COLORS.LIGHT,
    }).setOrigin(0.5);

    const hitArea = this.scene.add.zone(x + 20, y + 8, 40, 16).setInteractive();
    hitArea.on('pointerdown', onClick);
    hitArea.on('pointerover', () => bg.clear().fillStyle(UI_COLORS.BTN_HOVER, 1).fillRoundedRect(x, y, 40, 16, 3));
    hitArea.on('pointerout', () => bg.clear().fillStyle(UI_COLORS.BTN_NORMAL, 1).fillRoundedRect(x, y, 40, 16, 3));

    this.contentContainer.add([bg, text, hitArea]);
  }

  destroy(): void {
    this.container.destroy();
  }
}
