import Phaser from 'phaser';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { ITEM_DEFS } from '../data/items';
import { ROUTE_DEFS } from '../data/routes';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createNineSlice, createButton, createDivider } from '../rendering/UIHelper';

/**
 * Post-expedition summary modal showing loot, injuries, results.
 */
export class RunSummary {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;

  public onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setDepth(995)
      .setVisible(false);
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.container.setPosition(cam.scrollX, cam.scrollY);
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  show(run: ExpeditionRun): void {
    this.container.removeAll(true);
    const cam = this.scene.cameras.main;
    this.updatePosition(cam);

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const w = 460;

    // Inhalt zuerst berechnen um dynamische Hoehe zu bestimmen
    const lootEntries = Object.entries(run.loot).filter(([_, q]) => q > 0);
    const contentHeight = 80 // Header (Status + Route)
      + 20 + run.party.length * 20  // Party section
      + 20 + (run.goldEarned > 0 ? 18 : 0) + lootEntries.length * 18 + (lootEntries.length === 0 && run.goldEarned === 0 ? 18 : 0)  // Loot
      + 20 + run.rooms.length * 6  // Rooms cleared bar
      + 60;  // Button + padding
    const h = Math.max(320, contentHeight);

    // Background (NineSlice)
    const bg = createNineSlice(
      this.scene, cx - w / 2, cy - h / 2, w, h,
      'UI_PANEL_BG', UI_COLORS.PANEL_BG_DARK, 0.96,
    );
    this.container.add(bg);

    const left = cx - w / 2 + 20;
    const right = cx + w / 2 - 20;
    let y = cy - h / 2 + 20;

    // ── Status Title ──
    const route = ROUTE_DEFS[run.routeId];
    const statusLabel = run.status === 'victory' ? 'SIEG!'
      : run.status === 'defeat' ? 'NIEDERLAGE'
      : 'RUECKZUG';
    const statusColor = run.status === 'victory' ? UI_STR_COLORS.HEAL
      : run.status === 'defeat' ? UI_STR_COLORS.DAMAGE
      : UI_STR_COLORS.GOLD_BRIGHT;

    this.container.add(this.scene.add.text(cx, y, statusLabel, {
      fontFamily: FONT_FAMILY, fontSize: '22px', color: statusColor,
    }).setOrigin(0.5, 0));
    y += 32;

    this.container.add(this.scene.add.text(cx, y, route?.name ?? run.routeId, {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM,
    }).setOrigin(0.5, 0));
    y += 18;

    // Rooms cleared mini-bar
    const roomsCleared = run.currentRoom;
    const totalRooms = run.rooms.length;
    this.container.add(this.scene.add.text(cx, y, `${roomsCleared} / ${totalRooms} Raeume`, {
      fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.MUTED,
    }).setOrigin(0.5, 0));
    y += 18;

    // Trennlinie (NineSlice divider)
    const div1 = createDivider(this.scene, left, y, right - left);
    this.container.add(div1);
    y += 10;

    // ── Party Results ──
    this.container.add(this.scene.add.text(left, y, '── Trupp ──', {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.INFO,
    }));
    y += 18;

    for (const unit of run.party) {
      const alive = unit.hp > 0;
      const statusText = alive ? `${unit.hp}/${unit.maxHp} HP` : 'Bewusstlos';
      const color = alive ? UI_STR_COLORS.HEAL : UI_STR_COLORS.DAMAGE;

      this.container.add(this.scene.add.text(left + 10, y, unit.name, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: alive ? UI_STR_COLORS.LIGHT : UI_STR_COLORS.DISABLED,
      }));
      this.container.add(this.scene.add.text(right - 10, y, statusText, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color,
      }).setOrigin(1, 0));
      y += 20;
    }
    y += 8;

    // ── Loot ──
    this.container.add(this.scene.add.text(left, y, '── Beute ──', {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LOOT,
    }));
    y += 18;

    if (run.goldEarned > 0) {
      let goldTextX = left + 10;
      if (this.scene.textures.exists('ICON_GOLD')) {
        this.container.add(this.scene.add.image(left + 18, y + 7, 'ICON_GOLD').setDisplaySize(14, 14));
        goldTextX = left + 28;
      }
      this.container.add(this.scene.add.text(goldTextX, y, 'Gold', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD_BRIGHT,
      }));
      this.container.add(this.scene.add.text(right - 10, y, `+${run.goldEarned}`, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD_BRIGHT,
      }).setOrigin(1, 0));
      y += 18;
    }
    for (const [itemId, qty] of lootEntries) {
      const name = ITEM_DEFS[itemId]?.name ?? itemId;
      let itemTextX = left + 10;
      const spriteKey = `ITEM_${itemId.toUpperCase()}`;
      if (this.scene.textures.exists(spriteKey)) {
        this.container.add(this.scene.add.image(left + 18, y + 7, spriteKey).setDisplaySize(14, 14));
        itemTextX = left + 28;
      }
      this.container.add(this.scene.add.text(itemTextX, y, name, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT,
      }));
      this.container.add(this.scene.add.text(right - 10, y, `x${qty}`, {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.LIGHT,
      }).setOrigin(1, 0));
      y += 18;
    }
    if (lootEntries.length === 0 && run.goldEarned === 0) {
      this.container.add(this.scene.add.text(left + 10, y, 'Keine Beute', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DISABLED,
      }));
      y += 18;
    }
    y += 16;

    // ── Close Button (NineSlice) ──
    const btnW = 160;
    const closeBtn = createButton(this.scene, {
      x: cx - btnW / 2,
      y,
      width: btnW,
      height: 34,
      label: 'Einsammeln',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.LIGHT },
      onClick: () => {
        this.hide();
        this.onClose?.();
      },
    });
    // Green tint for success button
    if (closeBtn.bg instanceof Phaser.GameObjects.NineSlice) {
      closeBtn.bg.setTint(0x2E7D32);
    }
    this.container.add(closeBtn.container);

    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}
