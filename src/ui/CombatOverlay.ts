import Phaser from 'phaser';
import { ExpeditionRun, CombatUnit, EncounterRoom } from '../models/ExpeditionRun';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createNineSlice, createButton, createProgressBar, UIButton, UIProgressBar } from '../rendering/UIHelper';
import { SPECIAL_EFFECT_DEFS } from '../data/specialEffects';

type CombatState = 'preview' | 'animating' | 'result';

interface UnitDisplay {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  hpBar: UIProgressBar;
  unitId: number;
  startX: number; // original x for tween-back
  focusGlow?: Phaser.GameObjects.Graphics; // Feature #14: gold border for pre-combat targeting
}

/**
 * Full-screen combat overlay with sprites, HP bars, and attack animations.
 * Shown by ExpeditionUI when entering a combat/boss room.
 *
 * Flow: preview → user clicks "Kampf!" → animating → result → user clicks "Weiter"
 */
export class CombatOverlay {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private state: CombatState = 'preview';

  // Layout
  private panelW: number;
  private panelH: number;
  private screenX = 20;
  private screenY = 20;

  // Persistent UI elements
  private titleText!: Phaser.GameObjects.Text;
  private roomInfoText!: Phaser.GameObjects.Text;
  private logContainer!: Phaser.GameObjects.Container;
  private actionContainer!: Phaser.GameObjects.Container;

  // Unit displays (persistent – NOT destroyed between states)
  private partyDisplays: UnitDisplay[] = [];
  private enemyDisplays: UnitDisplay[] = [];

  // Pre-combat HP snapshot (for animation)
  private preHpMap: Map<number, number> = new Map();

  // Feature #13: Combat speed (1.0 / 1.5 / 2.0)
  private combatSpeed: number = 1.0;
  private speedButtons: UIButton[] = [];

  // Feature #14: Pre-combat targeting
  private preTargetEnemyId: number | null = null;
  private countdownTimer?: Phaser.Time.TimerEvent;
  private countdownText?: Phaser.GameObjects.Text;
  private targetLabelText?: Phaser.GameObjects.Text;

  // Callbacks
  public onComplete?: () => void;
  /** Feature #14: Called when player clicks an enemy during preview phase */
  public onPreCombatTarget?: (enemyId: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelW = scene.scale.width - 40;
    this.panelH = scene.scale.height - 40;
    this.create();
  }

  private create(): void {
    this.container = this.scene.add.container(this.screenX, this.screenY)
      .setDepth(995)
      .setVisible(false);

    // Background panel
    const bg = createNineSlice(
      this.scene, 0, 0, this.panelW, this.panelH,
      'UI_PANEL_BG', UI_COLORS.PANEL_BG_DARKER, 0.97,
    );
    if (bg instanceof Phaser.GameObjects.NineSlice) bg.setAlpha(0.97);
    this.container.add(bg);

    // Title
    this.titleText = this.scene.add.text(this.panelW / 2, 14, 'KAMPF', {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: UI_STR_COLORS.GOLD,
    }).setOrigin(0.5, 0);
    this.container.add(this.titleText);

    // Room info
    this.roomInfoText = this.scene.add.text(this.panelW / 2, 38, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
    }).setOrigin(0.5, 0);
    this.container.add(this.roomInfoText);

    // Combat log area
    this.logContainer = this.scene.add.container(0, 0);
    this.container.add(this.logContainer);

    // Action button area
    this.actionContainer = this.scene.add.container(0, 0);
    this.container.add(this.actionContainer);
  }

  /**
   * Show the overlay for a combat room in PREVIEW state.
   * Call BEFORE processCurrentRoom() so we can snapshot HP.
   */
  show(run: ExpeditionRun, roomIndex: number): void {
    this.state = 'preview';
    this.preTargetEnemyId = null;

    // Clear any running countdown from a previous fight
    this.stopCountdown();

    const room = run.rooms[roomIndex];
    const isBoss = room.type === 'boss';

    this.titleText.setText(isBoss ? 'BOSS KAMPF!' : 'KAMPF');
    this.titleText.setColor(isBoss ? UI_STR_COLORS.DAMAGE : UI_STR_COLORS.GOLD);
    this.roomInfoText.setText(`Raum ${roomIndex + 1} / ${run.rooms.length}`);

    // Snapshot pre-combat HP
    this.preHpMap.clear();
    for (const u of run.party) this.preHpMap.set(u.id, u.hp);
    for (const e of room.enemies) this.preHpMap.set(e.id, e.hp);

    // Build unit displays
    this.clearDisplays();
    this.buildPartyDisplays(run.party);
    this.buildEnemyDisplays(room.enemies);

    // Show combat log (empty for now)
    this.updateLog([]);

    // Show "Kampf!" button + speed controls + targeting label
    this.showPreviewActions();

    // Feature #13: Show speed buttons
    this.showSpeedButtons();

    const cam = this.scene.cameras.main;
    this.container.setPosition(cam.scrollX + this.screenX, cam.scrollY + this.screenY);
    this.container.setVisible(true);

    // Feature #14: Start 2s countdown for pre-combat targeting
    this.startTargetingCountdown();
  }

  hide(): void {
    this.stopCountdown();
    this.container.setVisible(false);
    this.clearDisplays();
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.container.setPosition(cam.scrollX + this.screenX, cam.scrollY + this.screenY);
  }

  // ─── Unit Display Builders ───────────────────────────────

  private buildPartyDisplays(party: CombatUnit[]): void {
    const startX = 30;
    const startY = 70;
    const spacing = 80;

    party.forEach((unit, i) => {
      const y = startY + i * spacing;
      const display = this.createUnitDisplay(unit, startX, y, false);
      this.partyDisplays.push(display);
      this.container.add(display.container);
    });
  }

  private buildEnemyDisplays(enemies: CombatUnit[]): void {
    const startX = this.panelW - 200;
    const startY = 70;
    const spacing = 80;

    enemies.forEach((unit, i) => {
      const y = startY + i * spacing;
      const display = this.createUnitDisplay(unit, startX, y, true);
      this.enemyDisplays.push(display);
      this.container.add(display.container);
    });
  }

  /**
   * Feature #14: Make enemy displays interactive for pre-combat targeting.
   * Called after buildEnemyDisplays when entering preview state.
   */
  private makeEnemiesTargetable(): void {
    for (const display of this.enemyDisplays) {
      const spriteSize = 48;
      const hitZone = this.scene.add.zone(
        spriteSize / 2, spriteSize / 2,
        spriteSize + 20, spriteSize + 20,
      ).setInteractive({ useHandCursor: true });

      hitZone.on('pointerdown', () => {
        if (this.state !== 'preview') return;
        this.setPreCombatTarget(display.unitId);
      });

      hitZone.on('pointerover', () => {
        if (this.state !== 'preview') return;
        // Subtle highlight on hover if not already targeted
        if (this.preTargetEnemyId !== display.unitId) {
          display.container.setAlpha(0.8);
        }
      });

      hitZone.on('pointerout', () => {
        if (this.preTargetEnemyId !== display.unitId) {
          display.container.setAlpha(1.0);
        }
      });

      display.container.add(hitZone);
    }
  }

  /** Feature #14: Set an enemy as the pre-combat focus target. */
  private setPreCombatTarget(enemyId: number): void {
    this.preTargetEnemyId = enemyId;

    // Update glow on all enemy displays
    for (const display of this.enemyDisplays) {
      if (!display.focusGlow) {
        const spriteSize = 48;
        const glow = this.scene.add.graphics();
        glow.lineStyle(3, UI_COLORS.PANEL_BORDER, 1);
        glow.strokeRoundedRect(-4, -4, spriteSize + 8, spriteSize + 8, 4);
        display.focusGlow = glow;
        display.container.add(glow);
      }
      display.focusGlow.setVisible(display.unitId === enemyId);
    }

    // Notify callback
    this.onPreCombatTarget?.(enemyId);
  }

  private createUnitDisplay(unit: CombatUnit, x: number, y: number, isEnemy: boolean): UnitDisplay {
    const c = this.scene.add.container(x, y);
    const spriteSize = 48;

    // Frame + Sprite
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
    if (unit.spriteKey && this.scene.textures.exists(unit.spriteKey)) {
      // Gold frame behind sprite
      if (this.scene.textures.exists('UI_FRAME_GOLD')) {
        const frame = this.scene.add.nineslice(
          spriteSize / 2, spriteSize / 2,
          'UI_FRAME_GOLD', undefined,
          spriteSize + 8, spriteSize + 8,
          20, 20, 20, 20,
        ).setOrigin(0.5).setAlpha(0.7);
        c.add(frame);
      }
      sprite = this.scene.add.image(spriteSize / 2, spriteSize / 2, unit.spriteKey)
        .setDisplaySize(spriteSize, spriteSize);
    } else {
      // Fallback text
      const initials = unit.name.substring(0, 2).toUpperCase();
      sprite = this.scene.add.text(spriteSize / 2, spriteSize / 2, initials, {
        fontFamily: FONT_FAMILY, fontSize: '18px',
        color: isEnemy ? UI_STR_COLORS.DAMAGE : UI_STR_COLORS.INFO,
      }).setOrigin(0.5);
    }
    c.add(sprite);

    // Name
    const nameText = this.scene.add.text(spriteSize + 10, 2, unit.name, {
      fontFamily: FONT_FAMILY, fontSize: '11px',
      color: isEnemy ? UI_STR_COLORS.DAMAGE : UI_STR_COLORS.LIGHT,
    });
    c.add(nameText);

    // Stats line
    const statsText = this.scene.add.text(spriteSize + 10, 16, `ATK:${unit.atk} DEF:${unit.def} SPD:${unit.spd.toFixed(1)}`, {
      fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
    });
    c.add(statsText);

    // HP text
    const hpStr = `${Math.max(0, unit.hp)} / ${unit.maxHp}`;
    const hpText = this.scene.add.text(spriteSize + 10, 30, hpStr, {
      fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.HEAL,
    });
    c.add(hpText);

    // HP bar
    const barW = 120;
    const hpBar = createProgressBar(this.scene, {
      x: spriteSize + 10, y: 44,
      width: barW, height: 10,
      progress: unit.maxHp > 0 ? unit.hp / unit.maxHp : 0,
      fillColor: UI_COLORS.HEAL_GREEN,
    });
    c.add(hpBar.container);

    // Special effect badges (only for party members with gear effects)
    if (unit.specialEffects && unit.specialEffects.length > 0) {
      let badgeX = spriteSize + 10;
      const badgeY = 56;
      for (const eff of unit.specialEffects) {
        const def = SPECIAL_EFFECT_DEFS[eff.id];
        if (!def) continue;
        const abbrev = def.name.substring(0, 3).toUpperCase();
        const badge = this.scene.add.text(badgeX, badgeY, abbrev, {
          fontFamily: FONT_FAMILY, fontSize: '8px', color: '#ffd700',
          backgroundColor: '#333',
          padding: { left: 2, right: 2, top: 1, bottom: 1 },
        });
        c.add(badge);
        badgeX += (badge.width || 22) + 3;
      }
    }

    // Dead overlay
    if (unit.hp <= 0) {
      sprite.setAlpha(0.3);
      nameText.setAlpha(0.3);
    }

    return {
      container: c,
      sprite,
      nameText,
      hpText,
      hpBar,
      unitId: unit.id,
      startX: x,
    };
  }

  // ─── State: Preview ──────────────────────────────────────

  private showPreviewActions(): void {
    this.actionContainer.removeAll(true);

    const btnY = this.panelH - 60;
    const fightBtn = createButton(this.scene, {
      x: this.panelW / 2 - 80,
      y: btnY,
      width: 160,
      height: 40,
      label: 'Kampf!',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.LIGHT },
      onClick: () => {
        if (this.state !== 'preview') return;
        this.state = 'animating'; // sofort setzen → Doppel-Click-Schutz
        this.stopCountdown();
        this.onFightClicked?.();
      },
    });
    this.actionContainer.add(fightBtn.container);

    // Feature #14: Countdown text above "Kampf!" button
    this.countdownText = this.scene.add.text(
      this.panelW / 2,
      btnY - 24,
      'Zielauswahl: 2s...',
      { fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD },
    ).setOrigin(0.5, 0);
    this.actionContainer.add(this.countdownText);

    // Feature #14: "Klick = Fokus" label near enemy column
    this.targetLabelText = this.scene.add.text(
      this.panelW - 200,
      this.panelH - 90,
      'Klick = Fokus',
      { fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.GOLD },
    );
    this.actionContainer.add(this.targetLabelText);

    // Make enemies clickable for targeting
    this.makeEnemiesTargetable();
  }

  /**
   * Feature #13: Show x1/x1.5/x2 speed toggle buttons in top-right area.
   */
  private showSpeedButtons(): void {
    // Remove old speed buttons if any
    for (const btn of this.speedButtons) {
      this.container.remove(btn.container, true);
    }
    this.speedButtons = [];

    const speeds = [1.0, 1.5, 2.0];
    const labels = ['x1', 'x1.5', 'x2'];
    const btnW = 40;
    const btnH = 22;
    const btnPad = 4;
    const startX = this.panelW - (btnW + btnPad) * speeds.length - 10;
    const btnY = 10;

    speeds.forEach((speed, i) => {
      const x = startX + i * (btnW + btnPad);
      const isActive = this.combatSpeed === speed;
      const btn = createButton(this.scene, {
        x,
        y: btnY,
        width: btnW,
        height: btnH,
        label: labels[i],
        textStyle: {
          fontFamily: FONT_FAMILY,
          fontSize: '10px',
          color: isActive ? UI_STR_COLORS.GOLD : UI_STR_COLORS.DIM,
        },
        onClick: () => {
          this.combatSpeed = speed;
          // Refresh button highlight states
          this.updateSpeedButtonHighlights();
        },
      });
      btn.setActive(isActive);
      this.speedButtons.push(btn);
      this.container.add(btn.container);
    });
  }

  private updateSpeedButtonHighlights(): void {
    const speeds = [1.0, 1.5, 2.0];
    for (let i = 0; i < this.speedButtons.length; i++) {
      const btn = this.speedButtons[i];
      const isActive = this.combatSpeed === speeds[i];
      btn.setActive(isActive);
      btn.labelText?.setColor(isActive ? UI_STR_COLORS.GOLD : UI_STR_COLORS.DIM);
    }
  }

  /**
   * Feature #14: Start the 2-second pre-combat targeting countdown.
   * After 2s automatically triggers fight.
   */
  private startTargetingCountdown(): void {
    let remaining = 2;

    const tick = () => {
      if (this.state !== 'preview') return;
      remaining--;
      if (remaining > 0) {
        this.countdownText?.setText(`Zielauswahl: ${remaining}s...`);
        this.countdownTimer = this.scene.time.delayedCall(1000, tick);
      } else {
        // Time's up – auto-fight
        this.countdownText?.setText('Kampf beginnt...');
        this.countdownTimer = this.scene.time.delayedCall(300, () => {
          if (this.state !== 'preview') return;
          this.state = 'animating';
          this.stopCountdown();
          this.onFightClicked?.();
        });
      }
    };

    this.countdownTimer = this.scene.time.delayedCall(1000, tick);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
      this.countdownTimer = undefined;
    }
    this.countdownText = undefined;
    this.targetLabelText = undefined;
  }

  /**
   * Set by ExpeditionUI: called when user clicks "Kampf!".
   * ExpeditionUI should call processCurrentRoom(), then call startCombatAnimation().
   */
  public onFightClicked?: () => void;

  // ─── State: Animating ────────────────────────────────────

  /**
   * Called AFTER processCurrentRoom() to animate the combat result.
   * Compares pre-combat HP snapshot with current HP and animates the difference.
   * Feature #13: All durations divided by combatSpeed.
   */
  startCombatAnimation(run: ExpeditionRun, room: EncounterRoom): void {
    this.state = 'animating';
    this.actionContainer.removeAll(true);

    const spd = this.combatSpeed;

    // Guard: if no displays, skip straight to result
    if (this.partyDisplays.length === 0 && this.enemyDisplays.length === 0) {
      this.updateLog(run.combatLog.slice(-8));
      this.scene.time.delayedCall(Math.round(300 / spd), () => this.showResult(run));
      return;
    }

    const afterEnemyAttack = () => {
      // Show damage on party
      this.showDamageNumbers(run.party, this.partyDisplays, spd);

      // Animate HP bars to final values
      this.animateHpBars(run.party, this.partyDisplays, spd);
      this.animateHpBars(room.enemies, this.enemyDisplays, spd);

      // Update combat log
      this.updateLog(run.combatLog.slice(-8));

      // After HP animation, show result
      this.scene.time.delayedCall(Math.round(600 / spd), () => this.showResult(run));
    };

    const afterPartyAttack = () => {
      // Show damage on enemies
      this.showDamageNumbers(room.enemies, this.enemyDisplays, spd);

      // Run enemy attack animation
      if (this.enemyDisplays.length === 0) {
        afterEnemyAttack();
        return;
      }
      this.scene.tweens.add({
        targets: this.enemyDisplays.map(d => d.container),
        x: (_target: Phaser.GameObjects.Container, _key: string, _value: number, idx: number) => {
          const display = this.enemyDisplays[idx];
          return display ? display.startX - 40 : 0;
        },
        duration: Math.round(200 / spd),
        yoyo: true,
        ease: 'Power2',
        onComplete: afterEnemyAttack,
      });
    };

    // Run party attack animation
    if (this.partyDisplays.length === 0) {
      afterPartyAttack();
      return;
    }
    this.scene.tweens.add({
      targets: this.partyDisplays.map(d => d.container),
      x: (_target: Phaser.GameObjects.Container, _key: string, _value: number, idx: number) => {
        const display = this.partyDisplays[idx];
        return display ? display.startX + 40 : 0;
      },
      duration: Math.round(200 / spd),
      yoyo: true,
      ease: 'Power2',
      onComplete: afterPartyAttack,
    });
  }

  private showDamageNumbers(units: CombatUnit[], displays: UnitDisplay[], spd: number = 1): void {
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const display = displays[i];
      if (!display) continue;

      const preHp = this.preHpMap.get(unit.id) ?? unit.maxHp;
      const hpDiff = preHp - unit.hp;

      if (hpDiff > 0) {
        // Damage number floating up
        const dmgText = this.scene.add.text(
          display.container.x + 24, display.container.y - 5,
          `-${hpDiff}`,
          { fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.DAMAGE },
        ).setOrigin(0.5);
        this.container.add(dmgText);

        this.scene.tweens.add({
          targets: dmgText,
          y: dmgText.y - 30,
          alpha: 0,
          duration: Math.round(800 / spd),
          ease: 'Power2',
          onComplete: () => dmgText.destroy(),
        });
      } else if (hpDiff < 0) {
        // Heal number
        const healText = this.scene.add.text(
          display.container.x + 24, display.container.y - 5,
          `+${Math.abs(hpDiff)}`,
          { fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.HEAL },
        ).setOrigin(0.5);
        this.container.add(healText);

        this.scene.tweens.add({
          targets: healText,
          y: healText.y - 30,
          alpha: 0,
          duration: Math.round(800 / spd),
          ease: 'Power2',
          onComplete: () => healText.destroy(),
        });
      }
    }
  }

  private animateHpBars(units: CombatUnit[], displays: UnitDisplay[], spd: number = 1): void {
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const display = displays[i];
      if (!display) continue;

      const finalPct = unit.maxHp > 0 ? Math.max(0, unit.hp) / unit.maxHp : 0;

      // Animate progress bar
      const startPct = unit.maxHp > 0 ? (this.preHpMap.get(unit.id) ?? unit.maxHp) / unit.maxHp : 0;
      const obj = { pct: startPct };
      this.scene.tweens.add({
        targets: obj,
        pct: finalPct,
        duration: Math.round(500 / spd),
        ease: 'Power1',
        onUpdate: () => {
          display.hpBar.setProgress(obj.pct);
        },
      });

      // Update HP text
      display.hpText.setText(`${Math.max(0, unit.hp)} / ${unit.maxHp}`);
      const hpPct = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
      display.hpText.setColor(
        hpPct > 0.5 ? UI_STR_COLORS.HEAL
        : hpPct > 0.2 ? UI_STR_COLORS.GOLD_BRIGHT
        : UI_STR_COLORS.DAMAGE,
      );

      // Dead units fade
      if (unit.hp <= 0) {
        this.scene.tweens.add({
          targets: [display.sprite, display.nameText],
          alpha: 0.3,
          duration: Math.round(400 / spd),
        });
      }
    }
  }

  // ─── State: Result ───────────────────────────────────────

  private showResult(run: ExpeditionRun): void {
    this.state = 'result';
    this.actionContainer.removeAll(true);

    const btnY = this.panelH - 60;
    const isOver = run.status !== 'exploring';
    const label = isOver ? 'Einsammeln & Schliessen' : 'Weiter';

    const btn = createButton(this.scene, {
      x: this.panelW / 2 - 80,
      y: btnY,
      width: 160,
      height: 40,
      label,
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.LIGHT },
      onClick: () => {
        if (this.state !== 'result') return;
        this.hide();
        this.onComplete?.();
      },
    });
    this.actionContainer.add(btn.container);

    // Show outcome text
    if (isOver) {
      const outcomeText = run.status === 'victory' ? 'SIEG!'
        : run.status === 'defeat' ? 'NIEDERLAGE...'
        : 'RUECKZUG';
      const outcomeColor = run.status === 'victory' ? UI_STR_COLORS.HEAL
        : run.status === 'defeat' ? UI_STR_COLORS.DAMAGE
        : UI_STR_COLORS.GOLD_BRIGHT;
      const outcome = this.scene.add.text(this.panelW / 2, btnY - 30, outcomeText, {
        fontFamily: FONT_FAMILY, fontSize: '18px', color: outcomeColor,
      }).setOrigin(0.5);
      this.actionContainer.add(outcome);
    }
  }

  // ─── Combat Log ──────────────────────────────────────────

  private updateLog(lines: string[]): void {
    this.logContainer.removeAll(true);

    const logY = this.panelH - 180;
    const logX = 30;

    // Log background
    if (this.scene.textures.exists('UI_TOOLTIP_BG')) {
      const logBg = this.scene.add.nineslice(
        this.panelW / 2, logY + 40,
        'UI_TOOLTIP_BG', undefined,
        this.panelW - 60, 100,
        12, 12, 12, 12,
      ).setOrigin(0.5).setAlpha(0.6);
      this.logContainer.add(logBg);
    } else {
      const logBg = this.scene.add.graphics();
      logBg.fillStyle(UI_COLORS.PANEL_BG, 0.5);
      logBg.fillRoundedRect(logX, logY - 5, this.panelW - 60, 100, 4);
      this.logContainer.add(logBg);
    }

    // Header
    this.logContainer.add(
      this.scene.add.text(logX + 5, logY, 'Kampfprotokoll', {
        fontFamily: FONT_FAMILY, fontSize: '9px', color: UI_STR_COLORS.DIM,
      }),
    );

    // Lines
    let y = logY + 14;
    for (const line of lines) {
      const color = this.getLogLineColor(line);
      this.logContainer.add(
        this.scene.add.text(logX + 5, y, line, {
          fontFamily: FONT_FAMILY, fontSize: '9px', color,
        }),
      );
      y += 11;
    }
  }

  // ─── Log Line Color Helper ──────────────────────────────

  private getLogLineColor(line: string): string {
    // Special effects (highest priority visual feedback)
    if (line.includes('WIEDERGEBURT')) return '#ffd700'; // gold – revive
    if (line.includes('AUSGEWICHEN')) return '#00e5ff'; // cyan – dodge
    if (line.includes('DOPPELSCHLAG')) return '#ff8c00'; // orange – double strike
    if (line.includes('Reflexion')) return '#ce93d8'; // purple – reflect
    if (line.includes('Lebensraub')) return UI_STR_COLORS.HEAL; // green – lifesteal
    if (line.includes('Regeneration')) return UI_STR_COLORS.HEAL; // green – regen
    if (line.includes('AoE-Resistenz')) return '#64b5f6'; // blue – aoe resist
    // Standard combat log colors
    if (line.includes('CRIT')) return UI_STR_COLORS.GOLD_BRIGHT;
    if (line.includes('ENRAGE')) return UI_STR_COLORS.DAMAGE;
    if (line.includes('heals')) return UI_STR_COLORS.HEAL;
    if (line.includes('heilt')) return UI_STR_COLORS.HEAL;
    if (line.includes('>>')) return UI_STR_COLORS.DIM;
    return UI_STR_COLORS.MUTED;
  }

  // ─── Cleanup ─────────────────────────────────────────────

  private clearDisplays(): void {
    for (const d of this.partyDisplays) this.container.remove(d.container, true);
    for (const d of this.enemyDisplays) this.container.remove(d.container, true);
    this.partyDisplays = [];
    this.enemyDisplays = [];
    this.logContainer.removeAll(true);
    this.actionContainer.removeAll(true);
    // Clean up speed buttons (they live directly on container, not actionContainer)
    for (const btn of this.speedButtons) this.container.remove(btn.container, true);
    this.speedButtons = [];
    this.preTargetEnemyId = null;
  }

  destroy(): void {
    this.stopCountdown();
    this.container.destroy();
  }
}
