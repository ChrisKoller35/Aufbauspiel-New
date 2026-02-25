import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createNineSlice, createResourceSlot, UIResourceSlot } from '../rendering/UIHelper';
import { CLASS_DEFS } from '../data/classes';
import { CITY_EVENT_DEFS } from '../data/cityEvents';
import { GUILD_RANK_DEFS } from '../data/guildRanks';

/**
 * Top-bar HUD showing key resource counts, population, training status, and day.
 * Uses NineSlice textures via UIHelper with Graphics fallback.
 */
export class HUD {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;

  // Resource slots (updated each refresh)
  private goldSlot!: UIResourceSlot;
  private woodSlot!: UIResourceSlot;
  private stoneSlot!: UIResourceSlot;
  private breadSlot!: UIResourceSlot;
  private popSlot!: UIResourceSlot;

  // Satisfaction, Guild Rank, Event
  private satisfactionText!: Phaser.GameObjects.Text;
  private guildRankText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;

  // Workers + Day labels
  private workersText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;

  // Training indicator
  private trainingContainer!: Phaser.GameObjects.Container;
  private trainingIcon!: Phaser.GameObjects.Image | Phaser.GameObjects.Text | null;
  private trainingText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.container.setPosition(cam.scrollX, cam.scrollY);
  }

  private create(): void {
    const screenW = this.scene.scale.width;
    this.container = this.scene.add.container(0, 0).setDepth(900);

    // ── Background bar (NineSlice or Graphics fallback) ──
    const bg = createNineSlice(
      this.scene, 0, 0, screenW, 32,
      'UI_HUD_BAR',
      UI_COLORS.PANEL_BG, 0.9,
    );
    this.container.add(bg);
    // NineSlice needs depth ordering within container – add border line for fallback
    if (bg instanceof Phaser.GameObjects.Graphics) {
      bg.lineStyle(2, UI_COLORS.PANEL_BORDER, 1);
      bg.lineBetween(0, 32, screenW, 32);
    }

    // ── Resource Slots ──
    let x = 70; // start after sidebar
    const slotSpacing = 78;

    this.goldSlot = createResourceSlot(this.scene, {
      x, y: 2, iconKey: 'ICON_GOLD', fallbackLabel: 'G',
    });
    this.container.add(this.goldSlot.container);
    x += slotSpacing;

    this.woodSlot = createResourceSlot(this.scene, {
      x, y: 2, iconKey: 'ICON_WOOD', fallbackLabel: 'W',
    });
    this.container.add(this.woodSlot.container);
    x += slotSpacing;

    this.stoneSlot = createResourceSlot(this.scene, {
      x, y: 2, iconKey: 'ICON_STONE', fallbackLabel: 'S',
    });
    this.container.add(this.stoneSlot.container);
    x += slotSpacing;

    this.breadSlot = createResourceSlot(this.scene, {
      x, y: 2, iconKey: 'ICON_BREAD', fallbackLabel: 'B',
    });
    this.container.add(this.breadSlot.container);
    x += slotSpacing;

    this.popSlot = createResourceSlot(this.scene, {
      x, y: 2, iconKey: 'ICON_POP', fallbackLabel: 'Pop',
    });
    this.container.add(this.popSlot.container);
    x += slotSpacing;

    // Satisfaction
    this.satisfactionText = this.scene.add.text(x, 8, 'Zuf: 50%', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT,
    });
    this.container.add(this.satisfactionText);
    x += 60;

    // Guild Rank
    this.guildRankText = this.scene.add.text(x, 8, 'Rang: Novize', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
    });
    this.container.add(this.guildRankText);
    x += 90;

    // Event indicator (hidden by default)
    this.eventText = this.scene.add.text(x, 8, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: '#FF9944',
    });
    this.container.add(this.eventText);

    // ── Workers (text only, no icon needed) ──
    const valStyle = { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT };
    this.container.add(this.scene.add.text(x, 8, 'Arb:', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
    }));
    this.workersText = this.scene.add.text(x + 30, 8, '0', valStyle);
    this.container.add(this.workersText);

    // ── Training Indicator (hidden by default) ──
    this.trainingContainer = this.scene.add.container(x + 80, 2);
    this.trainingContainer.setVisible(false);

    if (this.scene.textures.exists('ICON_TRAINING')) {
      this.trainingIcon = this.scene.add.image(10, 14, 'ICON_TRAINING')
        .setDisplaySize(18, 18);
    } else {
      this.trainingIcon = this.scene.add.text(2, 6, 'T', {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.GOLD,
      });
    }
    this.trainingContainer.add(this.trainingIcon);

    this.trainingText = this.scene.add.text(24, 7, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
    });
    this.trainingContainer.add(this.trainingText);

    this.container.add(this.trainingContainer);

    // ── Day (right-aligned) ──
    const dayStyle = { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD };
    this.dayText = this.scene.add.text(screenW - 90, 8, 'Tag 1', dayStyle);
    this.container.add(this.dayText);
  }

  refresh(state: GameState): void {
    // Resource values
    this.goldSlot.setValue(String(Math.floor(state.globalStock.gold ?? 0)));
    this.woodSlot.setValue(String(Math.floor(state.globalStock.wood ?? 0)));
    this.stoneSlot.setValue(String(Math.floor(state.globalStock.stone ?? 0)));
    this.breadSlot.setValue(String(Math.floor(state.globalStock.bread ?? 0)));

    // Population
    const totalPop = state.citizens.length;
    const workerCount = state.citizens.filter(c => c.status === 'WORKER').length;
    const builderCount = state.citizens.filter(c => c.status === 'BUILDER').length;
    const idleCount = state.citizens.filter(c => c.status === 'IDLE').length;

    this.popSlot.setValue(`${totalPop}`);
    this.workersText.setText(`${workerCount + builderCount}/${totalPop - idleCount}`);

    // Training indicator
    const trainingCitizen = state.citizens.find(c => c.status === 'GUILD_TRAINING');
    if (trainingCitizen && trainingCitizen.trainingClassId) {
      const cls = CLASS_DEFS[trainingCitizen.trainingClassId];
      const remaining = Math.ceil(trainingCitizen.trainingTimer);
      const className = cls?.name ?? trainingCitizen.trainingClassId;
      this.trainingText.setText(`Training: ${className} ${remaining}s`);
      this.trainingContainer.setVisible(true);
    } else {
      this.trainingContainer.setVisible(false);
    }

    // Day
    this.dayText.setText(`Tag ${state.day}`);

    // Satisfaction
    const sat = Math.round(state.satisfaction ?? 50);
    const satColor = sat >= 60 ? (UI_STR_COLORS.HEAL ?? '#66BB6A') : sat >= 40 ? UI_STR_COLORS.GOLD : '#FF4444';
    this.satisfactionText.setText(`Zuf: ${sat}%`);
    this.satisfactionText.setColor(satColor);

    // Guild Rank
    const rank = state.guildStats?.rank ?? 1;
    const rankDef = GUILD_RANK_DEFS.find(r => r.rank === rank);
    this.guildRankText.setText(`Rang: ${rankDef?.name ?? 'Novize'}`);

    // Event indicator
    if (state.activeEvent) {
      const eventDef = CITY_EVENT_DEFS[state.activeEvent.eventId];
      this.eventText.setText(`Event: ${eventDef?.name ?? state.activeEvent.eventId.replace('EVENT_', '')}`);
      this.eventText.setVisible(true);
    } else {
      this.eventText.setVisible(false);
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
