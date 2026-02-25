import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createPanel, createButton, createDivider } from '../rendering/UIHelper';

/**
 * Statistik-Keys und ihre Anzeigenamen.
 * Diese Keys werden in state.statistics gespeichert.
 * Tracking-Aufrufe muessen in CityScene.ts hinzugefuegt werden:
 *   state.statistics['total_buildings_built'] = (state.statistics['total_buildings_built'] ?? 0) + 1;
 *   state.statistics['total_buildings_demolished'] = ...
 *   state.statistics['total_days_survived'] = state.day;
 *   state.statistics['total_citizens_born'] = ...
 *   state.statistics['total_items_crafted'] = ...
 *   state.statistics['total_gold_earned'] = ... (in resource gain code)
 * Expedition-seitige Werte (total_enemies_killed, total_bosses_killed,
 *   total_expeditions, total_victories, total_defeats, total_retreats)
 *   werden in ExpeditionSystem.ts getrackt.
 */
const STAT_DEFINITIONS: { key: string; label: string }[] = [
  { key: 'total_gold_earned',         label: 'Gesamtes Gold verdient' },
  { key: 'total_enemies_killed',      label: 'Gegner besiegt' },
  { key: 'total_bosses_killed',       label: 'Bosse besiegt' },
  { key: 'total_expeditions',         label: 'Expeditionen gesamt' },
  { key: 'total_victories',           label: 'Siege' },
  { key: 'total_defeats',             label: 'Niederlagen' },
  { key: 'total_retreats',            label: 'Rueckzuege' },
  { key: 'total_buildings_built',     label: 'Gebaeude errichtet' },
  { key: 'total_buildings_demolished', label: 'Gebaeude abgerissen' },
  { key: 'total_citizens_born',       label: 'Buerger geboren' },
  { key: 'total_days_survived',       label: 'Tage ueberlebt' },
  { key: 'total_items_crafted',       label: 'Gegenstaende hergestellt' },
];

/**
 * Statistiken-Modal: Zeigt alle gesammelten Spielstatistiken an.
 * Depth 975, updatePosition-Pattern.
 */
export class StatisticsUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private contentContainer!: Phaser.GameObjects.Container;

  public onClose?: () => void;

  private panelW = 460;
  private panelH = 420;
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
      .setDepth(975)
      .setVisible(false);

    // Hintergrund (NineSlice)
    const bg = createPanel(this.scene, 0, 0, this.panelW, this.panelH, {
      alpha: 0.96,
      fallbackColor: UI_COLORS.PANEL_BG_DARK,
    });
    this.container.add(bg);

    // Titel
    this.container.add(
      this.scene.add.text(this.panelW / 2, 12, 'Statistiken', {
        fontFamily: FONT_FAMILY, fontSize: '18px', color: UI_STR_COLORS.GOLD,
      }).setOrigin(0.5, 0),
    );

    // Schliessen-Button
    const closeBtn = createButton(this.scene, {
      x: this.panelW - 38, y: 6,
      width: 30, height: 24,
      label: 'X',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.DAMAGE },
      onClick: () => this.hide(),
    });
    this.container.add(closeBtn.container);

    // Content-Container (wird bei jedem show() neu gebaut)
    this.contentContainer = this.scene.add.container(0, 44);
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

    const stats = state.statistics ?? {};
    const left = 20;
    const colW = this.panelW - 40;
    const colMid = Math.floor(colW / 2);

    // Trennlinie oben
    const divider = createDivider(this.scene, left, 0, colW);
    this.contentContainer.add(divider);

    let y = 10;
    const rowH = 24;
    const half = Math.ceil(STAT_DEFINITIONS.length / 2);

    // Zweispaltiges Layout
    for (let i = 0; i < half; i++) {
      const leftDef = STAT_DEFINITIONS[i];
      const rightDef = STAT_DEFINITIONS[i + half];

      // Linke Spalte
      this.renderStatRow(left, y, colMid - 10, leftDef.label, stats[leftDef.key] ?? 0);

      // Rechte Spalte (falls vorhanden)
      if (rightDef) {
        this.renderStatRow(left + colMid, y, colMid - 10, rightDef.label, stats[rightDef.key] ?? 0);
      }

      y += rowH;
    }

    // Untere Trennlinie
    y += 6;
    const divider2 = createDivider(this.scene, left, y, colW);
    this.contentContainer.add(divider2);
    y += 10;

    // Fusszeile
    this.contentContainer.add(
      this.scene.add.text(left + colW / 2, y, `Tag ${state.day} – Statistiken werden laufend aktualisiert`, {
        fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DIM,
      }).setOrigin(0.5, 0),
    );

    // Panel-Hoehe anpassen
    this.panelH = Math.max(300, 44 + y + 30);
    this.redrawBackground();
  }

  private renderStatRow(x: number, y: number, maxW: number, label: string, value: number): void {
    // Label (links)
    this.contentContainer.add(
      this.scene.add.text(x, y, label + ':', {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
        wordWrap: { width: maxW - 40 },
      }),
    );

    // Wert (rechts ausgerichtet innerhalb der Spalte)
    const valueColor = value > 0 ? UI_STR_COLORS.LIGHT : UI_STR_COLORS.DISABLED;
    this.contentContainer.add(
      this.scene.add.text(x + maxW - 4, y, String(value), {
        fontFamily: FONT_FAMILY, fontSize: '11px', color: valueColor,
      }).setOrigin(1, 0),
    );
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

    const cam = this.scene.cameras.main;
    this.container.setPosition(cam.scrollX + this.screenX, cam.scrollY + this.screenY);
  }
}
