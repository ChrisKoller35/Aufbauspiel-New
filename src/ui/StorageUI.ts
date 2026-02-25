import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createPanel, createButton, createNineSlice, createDivider } from '../rendering/UIHelper';

// Ressourcen-Kategorien fuer die Anzeige
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
    label: 'Verbrauchsgegenstaende',
    icon: '🧴',
    keys: ['healing_potion', 'power_bread'],
  },
  {
    label: 'Ausruestung',
    icon: '⚔',
    keys: ['iron_sword', 'iron_shield', 'leather_armor', 'hunter_bow', 'oak_staff'],
  },
  {
    label: 'Schaetze & Relikte',
    icon: '💎',
    keys: ['wolf_fang_necklace', 'crystal_shard', 'talisman_fragment'],
  },
];

// Lesbarer Name fuer Ressourcen-Keys
const DISPLAY_NAMES: Record<string, string> = {
  wood: 'Holz',
  stone: 'Stein',
  gold: 'Gold',
  grain: 'Getreide',
  flour: 'Mehl',
  bread: 'Brot',
  iron_scrap: 'Eisenschrott',
  herb_green: 'Gruene Kraeuter',
  healing_potion: 'Heiltrank',
  power_bread: 'Kraftbrot',
  iron_sword: 'Eisenschwert',
  iron_shield: 'Eisenschild',
  leather_armor: 'Lederruestung',
  hunter_bow: 'Jaegerbogen',
  oak_staff: 'Eichenstab',
  wolf_fang_necklace: 'Wolfszahn-Kette',
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
    this.container.setPosition(cam.scrollX + this.screenX, cam.scrollY + this.screenY);
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

    // Hintergrund (NineSlice)
    const bg = createPanel(this.scene, 0, 0, this.panelW, this.panelH, {
      alpha: 0.96,
      fallbackColor: UI_COLORS.PANEL_BG_DARK,
    });
    this.container.add(bg);

    // Titel
    this.container.add(
      this.scene.add.text(this.panelW / 2, 12, 'Lager', {
        fontFamily: FONT_FAMILY, fontSize: '18px', color: UI_STR_COLORS.GOLD,
      }).setOrigin(0.5, 0),
    );

    // Schliessen-Button (NineSlice)
    const closeBtn = createButton(this.scene, {
      x: this.panelW - 38, y: 6,
      width: 30, height: 24,
      label: 'X',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.DAMAGE },
      onClick: () => this.hide(),
    });
    this.container.add(closeBtn.container);

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
      // Kategorie-Header (NineSlice)
      const headerBg = createNineSlice(this.scene, left, y, colW, 22,
        'UI_HUD_BAR', UI_COLORS.PANEL_BG, 0.8);
      this.contentContainer.add(headerBg);

      this.contentContainer.add(
        this.scene.add.text(left + 8, y + 3, `${cat.icon} ${cat.label}`, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
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

        // Menge rechts, farbig je nach Bestand
        const color = amount === 0 ? UI_STR_COLORS.DISABLED : amount >= 10 ? UI_STR_COLORS.HEAL : UI_STR_COLORS.LIGHT;
        this.contentContainer.add(
          this.scene.add.text(left + colW - 12, y, String(amount), {
            fontFamily: FONT_FAMILY, fontSize: '12px', color,
          }).setOrigin(1, 0),
        );

        y += 18;
      }

      y += 6; // Abstand zwischen Kategorien
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
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
      }),
    );

    // Panel-Hoehe dynamisch anpassen
    this.panelH = Math.max(300, 40 + y + 32);
    this.redrawBackground();
  }

  private redrawBackground(): void {
    const bg = this.container.getAt(0);
    if (bg instanceof Phaser.GameObjects.NineSlice) {
      bg.setSize(this.panelW, this.panelH);
    } else if (bg instanceof Phaser.GameObjects.Graphics) {
      bg.clear();
      bg.fillStyle(UI_COLORS.PANEL_BG_DARK, 0.96);
      bg.fillRoundedRect(0, 0, this.panelW, this.panelH, 8);
      bg.lineStyle(2, UI_COLORS.PANEL_BORDER, 1);
      bg.strokeRoundedRect(0, 0, this.panelW, this.panelH, 8);
    }

    // Position neu zentrieren
    const cy = this.scene.scale.height / 2;
    this.screenY = cy - this.panelH / 2;

    // Sofort repositionieren damit kein 1-Frame-Glitch entsteht
    const cam = this.scene.cameras.main;
    this.container.setPosition(cam.scrollX + this.screenX, cam.scrollY + this.screenY);
  }
}
