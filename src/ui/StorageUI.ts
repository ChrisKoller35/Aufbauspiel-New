import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { ITEM_DEFS } from '../data/items';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createPanel, createButton, createNineSlice, createDivider, drawGlassPanel, drawGlassInfoBar } from '../rendering/UIHelper';

// Feste Ressourcen-Kategorien (immer angezeigt, auch wenn qty=0)
const RESOURCE_CATEGORIES: { label: string; icon: string; keys: string[] }[] = [
  {
    label: 'Rohstoffe',
    icon: '⛏',
    keys: ['wood', 'stone', 'gold'],
  },
  {
    label: 'Nahrung',
    icon: '🌾',
    keys: ['grain', 'flour', 'bread'],
  },
  {
    label: 'Expeditionsmaterial',
    icon: '🧪',
    keys: ['iron_scrap', 'herb_green'],
  },
  {
    label: 'Verbrauchsgegenstände',
    icon: '🧴',
    keys: ['healing_potion', 'power_bread'],
  },
];

// Lesbarer Name fuer Ressourcen-Keys (gear names come from ITEM_DEFS.name)
const DISPLAY_NAMES: Record<string, string> = {
  wood: 'Holz',
  stone: 'Stein',
  gold: 'Gold',
  grain: 'Getreide',
  flour: 'Mehl',
  bread: 'Brot',
  iron_scrap: 'Eisenschrott',
  herb_green: 'Grüne Kräuter',
  healing_potion: 'Heiltrank',
  power_bread: 'Kraftbrot',
  crystal_shard: 'Kristallsplitter',
  talisman_fragment: 'Talisman-Fragment',
};

/**
 * Lager-Uebersicht: Zeigt alle Ressourcen gruppiert nach Kategorie.
 */
export class StorageUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private contentContainer!: Phaser.GameObjects.Container;

  public onClose?: () => void;

  private panelW = 420;
  private panelH = 480;
  private screenX: number = 0;
  private screenY: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z = cam.zoom;
    this.container.setPosition(cam.worldView.x + this.screenX / z, cam.worldView.y + this.screenY / z);
    this.container.setScale(1 / z);
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  private create(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    this.screenX = cx - this.panelW / 2;
    this.screenY = cy - this.panelH / 2;

    this.container = this.scene.add.container(this.screenX, this.screenY)
      .setDepth(980)
      .setVisible(false);

    // Hintergrund – Dark Glassmorphism (accent: Storage green)
    const bg = this.scene.add.graphics();
    drawGlassPanel(bg, 0, 0, this.panelW, this.panelH, UI_COLORS.GLASS_ACCENT_STORAGE, 16);
    this.container.add(bg);

    // Titel
    this.container.add(
      this.scene.add.text(this.panelW / 2, 12, 'Lager', {
        fontFamily: FONT_FAMILY, fontSize: '18px', color: UI_STR_COLORS.GLASS_STORAGE,
      }).setOrigin(0.5, 0),
    );

    // Schliessen-Button – danger red circle
    const closeBtnBg = this.scene.add.graphics();
    closeBtnBg.fillStyle(0xE94560, 1);
    closeBtnBg.fillRoundedRect(this.panelW - 38, 6, 30, 24, 8);
    closeBtnBg.lineStyle(1, 0xFF6080, 0.6);
    closeBtnBg.strokeRoundedRect(this.panelW - 38, 6, 30, 24, 8);
    this.container.add(closeBtnBg);

    const closeText = this.scene.add.text(this.panelW - 38 + 15, 6 + 12, 'X', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(closeText);

    const closeHit = this.scene.add.zone(this.panelW - 38 + 15, 6 + 12, 30, 24).setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => this.hide());
    closeHit.on('pointerover', () => {
      closeBtnBg.clear();
      closeBtnBg.fillStyle(0xFF1040, 1);
      closeBtnBg.fillRoundedRect(this.panelW - 38, 6, 30, 24, 8);
    });
    closeHit.on('pointerout', () => {
      closeBtnBg.clear();
      closeBtnBg.fillStyle(0xE94560, 1);
      closeBtnBg.fillRoundedRect(this.panelW - 38, 6, 30, 24, 8);
      closeBtnBg.lineStyle(1, 0xFF6080, 0.6);
      closeBtnBg.strokeRoundedRect(this.panelW - 38, 6, 30, 24, 8);
    });
    this.container.add(closeHit);

    // Content-Container (wird bei jedem show() neu gebaut)
    this.contentContainer = this.scene.add.container(0, 40);
    this.container.add(this.contentContainer);
  }

  show(state: GameState): void {
    this.rebuildContent(state);
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
    this.onClose?.();
  }

  private rebuildContent(state: GameState): void {
    this.contentContainer.removeAll(true);

    const stock = state.globalStock;
    const left = 16;
    const colW = this.panelW - 32;
    let y = 0;

    for (const cat of RESOURCE_CATEGORIES) {
      // Kategorie-Header – glass info bar
      const headerBg = this.scene.add.graphics();
      drawGlassInfoBar(headerBg, left, y, colW, 22, 8);
      headerBg.lineStyle(1, UI_COLORS.GLASS_ACCENT_STORAGE, 0.35);
      headerBg.strokeRoundedRect(left, y, colW, 22, 8);
      this.contentContainer.add(headerBg);

      this.contentContainer.add(
        this.scene.add.text(left + 8, y + 3, `${cat.icon} ${cat.label}`, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_STORAGE,
        }),
      );
      y += 26;

      // Ressourcen in dieser Kategorie
      for (const key of cat.keys) {
        const amount = stock[key] ?? 0;
        const name = DISPLAY_NAMES[key] ?? key;

        // Item sprite if available
        let textX = left + 12;
        const spriteKey = `ITEM_${key.toUpperCase()}`;
        if (key === 'gold' && this.scene.textures.exists('ICON_GOLD')) {
          this.contentContainer.add(
            this.scene.add.image(left + 18, y + 7, 'ICON_GOLD').setDisplaySize(12, 12),
          );
          textX = left + 28;
        } else if (this.scene.textures.exists(spriteKey)) {
          this.contentContainer.add(
            this.scene.add.image(left + 18, y + 7, spriteKey).setDisplaySize(12, 12),
          );
          textX = left + 28;
        }

        // Name links
        this.contentContainer.add(
          this.scene.add.text(textX, y, name, {
            fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT,
          }),
        );

        // Menge rechts, farbig je nach Bestand (glass palette)
        const color = amount === 0 ? UI_STR_COLORS.GLASS_DISABLED : amount >= 10 ? UI_STR_COLORS.GLASS_STORAGE : UI_STR_COLORS.LIGHT;
        this.contentContainer.add(
          this.scene.add.text(left + colW - 12, y, String(amount), {
            fontFamily: FONT_FAMILY, fontSize: '12px', color,
          }).setOrigin(1, 0),
        );

        y += 18;
      }

      y += 6; // Abstand zwischen Kategorien
    }

    // ── Dynamische Gear-Sektion: alle Ausrüstungs-Items aus globalStock ──
    const gearInStock = Object.entries(stock)
      .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.gearSlot)
      .sort(([a], [b]) => {
        // Sort by tier (ascending): no tier tag = T1
        const tierA = ITEM_DEFS[a]?.tags.find(t => t.startsWith('tier'));
        const tierB = ITEM_DEFS[b]?.tags.find(t => t.startsWith('tier'));
        const numA = tierA ? parseInt(tierA.replace('tier', ''), 10) : 1;
        const numB = tierB ? parseInt(tierB.replace('tier', ''), 10) : 1;
        return numA - numB;
      });

    if (gearInStock.length > 0) {
      const headerBg = this.scene.add.graphics();
      drawGlassInfoBar(headerBg, left, y, colW, 22, 8);
      headerBg.lineStyle(1, UI_COLORS.GLASS_ACCENT_STORAGE, 0.35);
      headerBg.strokeRoundedRect(left, y, colW, 22, 8);
      this.contentContainer.add(headerBg);
      this.contentContainer.add(
        this.scene.add.text(left + 8, y + 3, '⚔ Ausrüstung', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_STORAGE,
        }),
      );
      y += 26;

      for (const [id, qty] of gearInStock) {
        const def = ITEM_DEFS[id];
        const name = def?.name ?? id;
        const tierTag = def?.tags.find(t => t.startsWith('tier'));
        const tierNum = tierTag ? parseInt(tierTag.replace('tier', ''), 10) : 1;
        const tierColor = tierNum >= 4 ? UI_STR_COLORS.GOLD_BRIGHT : tierNum >= 3 ? UI_STR_COLORS.LOOT : tierNum >= 2 ? UI_STR_COLORS.INFO : UI_STR_COLORS.LIGHT;

        let textX = left + 12;
        const spriteKey = `ITEM_${id.toUpperCase()}`;
        if (this.scene.textures.exists(spriteKey)) {
          this.contentContainer.add(
            this.scene.add.image(left + 18, y + 7, spriteKey).setDisplaySize(12, 12),
          );
          textX = left + 28;
        }

        this.contentContainer.add(
          this.scene.add.text(textX, y, `${name} (T${tierNum})`, {
            fontFamily: FONT_FAMILY, fontSize: '12px', color: tierColor,
          }),
        );
        this.contentContainer.add(
          this.scene.add.text(left + colW - 12, y, String(qty), {
            fontFamily: FONT_FAMILY, fontSize: '12px', color: tierColor,
          }).setOrigin(1, 0),
        );
        y += 18;
      }
      y += 6;
    }

    // ── Spezial-Items (crystal_shard, talisman_fragment) ──
    const specialKeys = ['crystal_shard', 'talisman_fragment'];
    const specialInStock = specialKeys.filter(k => (stock[k] ?? 0) > 0);
    if (specialInStock.length > 0) {
      const headerBg2 = this.scene.add.graphics();
      drawGlassInfoBar(headerBg2, left, y, colW, 22, 8);
      headerBg2.lineStyle(1, UI_COLORS.GLASS_ACCENT_STORAGE, 0.35);
      headerBg2.strokeRoundedRect(left, y, colW, 22, 8);
      this.contentContainer.add(headerBg2);
      this.contentContainer.add(
        this.scene.add.text(left + 8, y + 3, '💎 Relikte', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_STORAGE,
        }),
      );
      y += 26;
      for (const key of specialInStock) {
        const qty = stock[key] ?? 0;
        const name = DISPLAY_NAMES[key] ?? key;
        this.contentContainer.add(
          this.scene.add.text(left + 12, y, name, {
            fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT,
          }),
        );
        this.contentContainer.add(
          this.scene.add.text(left + colW - 12, y, String(qty), {
            fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT,
          }).setOrigin(1, 0),
        );
        y += 18;
      }
      y += 6;
    }

    // Gesamtwert-Zeile
    const totalGold = stock.gold ?? 0;
    const totalItems = Object.values(stock).reduce((sum, v) => sum + v, 0) - totalGold;

    y += 4;
    const divider = createDivider(this.scene, left, y, colW);
    this.contentContainer.add(divider);
    y += 8;

    this.contentContainer.add(
      this.scene.add.text(left + 8, y, `Gesamt: ${totalItems} Gegenstaende | ${totalGold} Gold`, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_DIM,
      }),
    );

    // Panel-Hoehe dynamisch anpassen
    this.panelH = Math.max(300, 40 + y + 32);
    this.redrawBackground();
  }

  private redrawBackground(): void {
    const bg = this.container.getAt(0);
    if (bg instanceof Phaser.GameObjects.Graphics) {
      bg.clear();
      drawGlassPanel(bg, 0, 0, this.panelW, this.panelH, UI_COLORS.GLASS_ACCENT_STORAGE, 16);
    } else if (bg instanceof Phaser.GameObjects.NineSlice) {
      bg.setSize(this.panelW, this.panelH);
    }

    // Position neu zentrieren
    const cy = this.scene.scale.height / 2;
    this.screenY = cy - this.panelH / 2;

    // Sofort repositionieren damit kein 1-Frame-Glitch entsteht
    const cam = this.scene.cameras.main;
    this.container.setPosition(cam.worldView.x + this.screenX, cam.worldView.y + this.screenY);
  }
}
