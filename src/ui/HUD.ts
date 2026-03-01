import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { CLASS_DEFS } from '../data/classes';
import { CITY_EVENT_DEFS } from '../data/cityEvents';
import { GUILD_RANK_DEFS } from '../data/guildRanks';

const BAR_H = 48;

/**
 * Top-bar HUD: Navy-Dark Redesign 2026.
 * Resource Chips (Pill-Format), Glow-Border unten, bessere Typografie.
 */
export class HUD {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;

  // Resource chip value texts
  private goldVal!:  Phaser.GameObjects.Text;
  private woodVal!:  Phaser.GameObjects.Text;
  private stoneVal!: Phaser.GameObjects.Text;
  private breadVal!: Phaser.GameObjects.Text;
  private popVal!:   Phaser.GameObjects.Text;

  // Info section
  private satisfactionText!: Phaser.GameObjects.Text;
  private guildRankText!:    Phaser.GameObjects.Text;
  private eventText!:        Phaser.GameObjects.Text;
  private workersText!:      Phaser.GameObjects.Text;
  private dayText!:          Phaser.GameObjects.Text;

  // Training indicator
  private trainingContainer!: Phaser.GameObjects.Container;
  private trainingText!:      Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z = cam.zoom;
    this.container.setPosition(cam.worldView.x, cam.worldView.y);
    this.container.setScale(1 / z);
  }

  private create(): void {
    const sw = this.scene.scale.width;
    this.container = this.scene.add.container(0, 0).setDepth(900);

    // ── Background: Navy-Panel mit Gradient-Simulation ──
    const bg = this.scene.add.graphics();
    // Leicht hellere obere Hälfte (gradient simulation)
    bg.fillStyle(UI_COLORS.NAVY_PANEL, 1);
    bg.fillRect(0, 0, sw, BAR_H);
    // Dunklerer unten-Streifen
    bg.fillStyle(UI_COLORS.NAVY_DEEP, 0.4);
    bg.fillRect(0, BAR_H * 0.6, sw, BAR_H * 0.4);
    // Amber Glow-Border unten (doppelt: dim außen, hell innen)
    bg.lineStyle(2, UI_COLORS.GOLD_DECO_DIM, 0.6);
    bg.lineBetween(0, BAR_H, sw, BAR_H);
    bg.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.8);
    bg.lineBetween(0, BAR_H - 1, sw, BAR_H - 1);
    this.container.add(bg);

    // ── Resource Chips ──
    const chipW = 90;
    const chipH = 34;
    const chipY = (BAR_H - chipH) / 2;
    const chipGap = 8;
    const sidebarW = 76;
    let cx = sidebarW + 8;

    const resources: Array<{ key: string; icon: string; label: string; ref: 'g'|'w'|'s'|'b'|'p' }> = [
      { key: 'gold',  icon: 'ICON_GOLD',  label: 'Gold',   ref: 'g' },
      { key: 'wood',  icon: 'ICON_WOOD',  label: 'Holz',   ref: 'w' },
      { key: 'stone', icon: 'ICON_STONE', label: 'Stein',  ref: 's' },
      { key: 'bread', icon: 'ICON_BREAD', label: 'Brot',   ref: 'b' },
      { key: 'pop',   icon: 'ICON_POP',   label: 'Pop',    ref: 'p' },
    ];

    const valueTexts: Phaser.GameObjects.Text[] = [];

    for (const res of resources) {
      const chip = this.makeChip(cx, chipY, chipW, chipH, res.icon, res.label);
      this.container.add(chip.container);
      valueTexts.push(chip.valueText);
      cx += chipW + chipGap;
    }

    [this.goldVal, this.woodVal, this.stoneVal, this.breadVal, this.popVal] = valueTexts;

    // Separator line after resources
    const sepX = cx + 4;
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, UI_COLORS.NAVY_SEPARATOR, 1);
    sep.lineBetween(sepX, 8, sepX, BAR_H - 8);
    this.container.add(sep);

    // ── Info Section (Satisfaction, Rang, Arbeiter) ──
    const infoX = sepX + 14;
    const labelStyle = { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM };
    const valStyle   = { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.LIGHT };

    // Satisfaction
    const satLabel = this.scene.add.text(infoX, 6, 'ZUFRIEDENHEIT', labelStyle);
    this.satisfactionText = this.scene.add.text(infoX, 20, '50% Akzeptabel', valStyle);
    this.container.add([satLabel, this.satisfactionText]);

    // Guild Rank
    const rankX = infoX + 145;
    const rankLabel = this.scene.add.text(rankX, 6, 'GILDENRANG', labelStyle);
    this.guildRankText = this.scene.add.text(rankX, 20, 'Novize', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.GOLD,
    });
    this.container.add([rankLabel, this.guildRankText]);

    // Workers
    const wrkX = rankX + 120;
    const wrkLabel = this.scene.add.text(wrkX, 6, 'ARBEITER', labelStyle);
    this.workersText = this.scene.add.text(wrkX, 20, '0/0', valStyle);
    this.container.add([wrkLabel, this.workersText]);

    // Event indicator (hidden by default)
    this.eventText = this.scene.add.text(wrkX + 90, 14, '', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: '#FF9944',
    }).setVisible(false);
    this.container.add(this.eventText);

    // ── Training Indicator ──
    this.trainingContainer = this.scene.add.container(wrkX + 90, 0).setVisible(false);
    const trainBg = this.scene.add.graphics();
    trainBg.fillStyle(UI_COLORS.NAVY_CARD, 0.9);
    trainBg.fillRoundedRect(0, 8, 160, 32, 4);
    trainBg.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.5);
    trainBg.strokeRoundedRect(0, 8, 160, 32, 4);
    this.trainingText = this.scene.add.text(30, 16, '', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
    });
    const trainIcon = this.scene.textures.exists('ICON_TRAINING')
      ? this.scene.add.image(14, 24, 'ICON_TRAINING').setDisplaySize(18, 18)
      : this.scene.add.text(6, 14, '⚔', { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.GOLD });
    this.trainingContainer.add([trainBg, trainIcon, this.trainingText]);
    this.container.add(this.trainingContainer);

    // ── Day (right side, prominent) ──
    const dayLabel = this.scene.add.text(sw - 90, 6, 'TAG', labelStyle);
    this.dayText = this.scene.add.text(sw - 90, 20, '1', {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.GOLD,
    });
    this.container.add([dayLabel, this.dayText]);
  }

  /** Erstellt einen Resource-Chip im Pill-Format */
  private makeChip(
    x: number, y: number, w: number, h: number,
    iconKey: string, label: string,
  ): { container: Phaser.GameObjects.Container; valueText: Phaser.GameObjects.Text } {
    const container = this.scene.add.container(x, y);

    // Chip Hintergrund
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_COLORS.CHIP_BG, 1);
    bg.fillRoundedRect(0, 0, w, h, 6);
    bg.lineStyle(1, UI_COLORS.CHIP_BORDER, 1);
    bg.strokeRoundedRect(0, 0, w, h, 6);
    container.add(bg);

    // Icon
    const iconSize = 20;
    if (this.scene.textures.exists(iconKey)) {
      container.add(
        this.scene.add.image(10 + iconSize / 2, h / 2, iconKey)
          .setDisplaySize(iconSize, iconSize)
          .setTint(UI_COLORS.PANEL_BORDER),
      );
    } else {
      container.add(
        this.scene.add.text(8, h / 2 - 6, label[0], {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
        }),
      );
    }

    // Label (klein oben)
    container.add(
      this.scene.add.text(34, 4, label.toUpperCase(), {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.DIM,
      }),
    );

    // Wert (groß unten)
    const valueText = this.scene.add.text(34, 15, '0', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.LIGHT,
    });
    container.add(valueText);

    return { container, valueText };
  }

  refresh(state: GameState): void {
    // Resources
    this.goldVal.setText(String(Math.floor(state.globalStock.gold ?? 0)));
    this.woodVal.setText(String(Math.floor(state.globalStock.wood ?? 0)));
    this.stoneVal.setText(String(Math.floor(state.globalStock.stone ?? 0)));
    this.breadVal.setText(String(Math.floor(state.globalStock.bread ?? 0)));

    // Population
    const totalPop    = state.citizens.length;
    const workerCount = state.citizens.filter(c => c.status === 'WORKER').length;
    const builderCount = state.citizens.filter(c => c.status === 'BUILDER').length;
    const idleCount   = state.citizens.filter(c => c.status === 'IDLE').length;
    this.popVal.setText(String(totalPop));
    this.workersText.setText(`${workerCount + builderCount}/${totalPop - idleCount}`);

    // Training
    const trainingCitizen = state.citizens.find(c => c.status === 'GUILD_TRAINING');
    if (trainingCitizen?.trainingClassId) {
      const cls       = CLASS_DEFS[trainingCitizen.trainingClassId];
      const remaining = Math.ceil(trainingCitizen.trainingTimer);
      this.trainingText.setText(`${cls?.name ?? trainingCitizen.trainingClassId} ${remaining}s`);
      this.trainingContainer.setVisible(true);
    } else {
      this.trainingContainer.setVisible(false);
    }

    // Day
    this.dayText.setText(String(state.day));

    // Satisfaction
    const sat = Math.round(state.satisfaction ?? 50);
    let satLabel: string;
    let satColor: string;
    if (sat >= 80)      { satLabel = 'Hervorragend'; satColor = UI_STR_COLORS.HEAL; }
    else if (sat >= 60) { satLabel = 'Gut';          satColor = '#88CC88'; }
    else if (sat >= 40) { satLabel = 'Akzeptabel';   satColor = UI_STR_COLORS.GOLD; }
    else if (sat >= 20) { satLabel = 'Schlecht';     satColor = '#FF9944'; }
    else                { satLabel = 'Kritisch';     satColor = UI_STR_COLORS.DAMAGE; }
    this.satisfactionText.setText(`${sat}% ${satLabel}`);
    this.satisfactionText.setColor(satColor);

    // Guild Rank
    const rank    = state.guildStats?.rank ?? 1;
    const rankDef = GUILD_RANK_DEFS.find(r => r.rank === rank);
    const MAX_RANK = 5;
    if (rank >= MAX_RANK) {
      this.guildRankText.setText(`${rankDef?.name ?? 'Legende'} ★`);
    } else {
      const nextRankDef = GUILD_RANK_DEFS.find(r => r.rank === rank + 1);
      let progressText = '';
      if (nextRankDef?.conditions) {
        const cond = nextRankDef.conditions;
        if (cond.forestShortCompleted != null) {
          progressText = ` (${state.guildStats?.forestShortCompleted ?? 0}/${cond.forestShortCompleted})`;
        } else if (cond.totalBossesDefeated != null) {
          progressText = ` (${state.guildStats?.totalBossesDefeated ?? 0}/${cond.totalBossesDefeated})`;
        } else if (cond.forestMediumBossDefeated != null) {
          progressText = ` (${state.guildStats?.forestMediumBossDefeated ? 1 : 0}/1)`;
        } else if (cond.guildHallT2 != null) {
          progressText = ` (${state.guildStats?.guildHallT2 ? 1 : 0}/1)`;
        }
      }
      this.guildRankText.setText(`${rankDef?.name ?? 'Novize'}${progressText}`);
    }

    // Event
    if (state.activeEvent) {
      const eventDef = CITY_EVENT_DEFS[state.activeEvent.eventId];
      this.eventText.setText(`⚡ ${eventDef?.name ?? state.activeEvent.eventId.replace('EVENT_', '')}`);
      this.eventText.setVisible(true);
    } else {
      this.eventText.setVisible(false);
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
