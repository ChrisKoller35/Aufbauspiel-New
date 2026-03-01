import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS } from '../data/recipes';
import { SPECIALIST_DEFS } from '../data/specialists';
import { getAvailableUpgrade, BUILDING_UPGRADE_DEFS as BUILDING_UPGRADE_DEFS_MAP } from '../data/buildingUpgrades';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createNineSlice, createPanel, createDivider, createProgressBar, UIProgressBar } from '../rendering/UIHelper';

/**
 * Right-side info panel shown when a built building is clicked.
 * Shows building info, production progress bar, and recipe switching.
 * Uses NineSlice textures from UIHelper with Graphics fallback.
 */
export class BuildingPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private selectedBuilding: BuildingInstance | null = null;
  private lastState: GameState | null = null;

  // Callbacks
  public onDemolish?: (buildingId: number) => void;
  public onUpgrade: ((buildingId: number) => void) | null = null;

  // Static elements
  private bgObj!: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics;
  private headerObj: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics | null = null;
  private titleText!: Phaser.GameObjects.Text;

  // Dynamic content container (rebuilt on show/update)
  private contentContainer!: Phaser.GameObjects.Container;

  // Aktive Progress-Bar Referenzen (werden nicht in contentContainer zerstoert)
  private progressBar: UIProgressBar | null = null;
  private upgradeProgressBar: UIProgressBar | null = null;

  private panelWidth = 240;
  private panelHeight = 380;
  private panelX: number;
  private screenY = 40;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelX = scene.scale.width - this.panelWidth - 8;
    this.create();
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z = cam.zoom;
    this.container.setPosition(cam.worldView.x + this.panelX / z, cam.worldView.y + this.screenY / z);
    this.container.setScale(1 / z);
  }

  private create(): void {
    this.container = this.scene.add.container(this.panelX, this.screenY)
      .setDepth(950)
      .setVisible(false);

    // Panel-Hintergrund (UI_PANEL_BG NineSlice)
    this.bgObj = createPanel(this.scene, 0, 0, this.panelWidth, this.panelHeight);
    this.container.add(this.bgObj);

    // Optional: Header-Hintergrund (UI_PANEL_HEADER NineSlice)
    this.headerObj = createNineSlice(
      this.scene, 0, 0,
      this.panelWidth, 30,
      'UI_PANEL_HEADER',
      UI_COLORS.PANEL_BG_DARK,
      0.7,
    );
    if (this.headerObj instanceof Phaser.GameObjects.NineSlice) {
      this.headerObj.setAlpha(0.7);
    }
    this.container.add(this.headerObj);

    // Title
    this.titleText = this.scene.add.text(12, 10, '', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.GOLD,
    });
    this.container.add(this.titleText);

    // Close button (X)
    const closeBtn = this.scene.add.text(this.panelWidth - 22, 6, 'X', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.DAMAGE,
    }).setInteractive(new Phaser.Geom.Rectangle(-6, -4, 24, 22), Phaser.Geom.Rectangle.Contains);
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    // Dynamic content area
    this.contentContainer = this.scene.add.container(0, 0);
    this.container.add(this.contentContainer);
  }

  /**
   * Passt den Panel-Hintergrund an die neue Hoehe an.
   * NineSlice: setSize. Graphics: clear + neu zeichnen.
   */
  private drawBg(): void {
    if (this.bgObj instanceof Phaser.GameObjects.NineSlice) {
      this.bgObj.setSize(this.panelWidth, this.panelHeight);
      this.bgObj.setPosition(this.panelWidth / 2, this.panelHeight / 2);
    } else {
      this.bgObj.clear();
      this.bgObj.fillStyle(UI_COLORS.PANEL_BG, 0.92);
      this.bgObj.fillRoundedRect(0, 0, this.panelWidth, this.panelHeight, 6);
      this.bgObj.lineStyle(2, UI_COLORS.PANEL_BORDER, 1);
      this.bgObj.strokeRoundedRect(0, 0, this.panelWidth, this.panelHeight, 6);
    }
  }

  show(building: BuildingInstance, state: GameState): void {
    this.selectedBuilding = building;
    this.lastState = state;
    this.rebuildContent(building, state);
    this.container.setVisible(true);
  }

  /** Called every city tick to update progress bar if panel is open. */
  updateProgress(): void {
    if (!this.selectedBuilding || !this.lastState) return;
    if (!this.container.visible) return;
    this.rebuildContent(this.selectedBuilding, this.lastState);
  }

  private rebuildContent(building: BuildingInstance, state: GameState): void {
    // Alte Progress-Bars aufraeumen (liegen im contentContainer)
    this.progressBar = null;
    this.upgradeProgressBar = null;
    this.contentContainer.removeAll(true);

    const def = BUILDING_DEFS[building.typeId];
    this.titleText.setText(def.name);

    const style = { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT };
    const dimStyle = { fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DIM };
    let y = 34;

    // Type + footprint
    this.addLine(12, y, `Typ: ${def.category}`, dimStyle); y += 16;
    this.addLine(12, y, `Fläche: ${def.footprint[0]}×${def.footprint[1]}`, dimStyle); y += 18;

    // Connectivity
    if (def.requiresConnectivity) {
      const connected = building.connected;
      this.addLine(12, y, `Status: ${connected ? 'Verbunden' : 'Nicht verbunden!'}`, {
        fontFamily: FONT_FAMILY, fontSize: '13px',
        color: connected ? UI_STR_COLORS.HEAL : UI_STR_COLORS.DAMAGE,
      });
      y += 18;
    }

    // Water
    if (def.requirements?.waterSupplied) {
      this.addLine(12, y, `Wasser: ${building.waterSupplied ? 'Ja' : 'Nein'}`, {
        fontFamily: FONT_FAMILY, fontSize: '13px',
        color: building.waterSupplied ? UI_STR_COLORS.HEAL : UI_STR_COLORS.DAMAGE,
      });
      y += 18;
    }

    // Workers
    if (def.workerSlots > 0) {
      this.addLine(12, y, `Arbeiter: ${building.assignedWorkerIds.length}/${def.workerSlots}`, style);
      y += 18;
    }

    // Housing
    if (def.housing) {
      this.addLine(12, y, `Bewohner: ${def.housing.capacity}`, style); y += 16;
      this.addLine(12, y, `Steuer: ${def.housing.baseTaxPerMin} Gold/min`, dimStyle); y += 18;
    }

    // ── Production Section ──
    if (building.activeRecipeId) {
      const recipe = RECIPE_DEFS[building.activeRecipeId];
      if (recipe) {
        y += 4;
        // Divider (texturiert via UIHelper)
        const divider = createDivider(this.scene, 12, y, this.panelWidth - 24);
        this.contentContainer.add(divider);
        y += 8;

        this.addLine(12, y, 'Produktion:', {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
        });
        y += 18;

        // Recipe name
        this.addLine(12, y, recipe.name, style); y += 16;

        // Inputs → Outputs
        const inputs = Object.entries(recipe.inputs);
        const outputs = Object.entries(recipe.outputs);

        if (inputs.length > 0) {
          const inStr = inputs.map(([k, v]) => `${v} ${k}`).join(', ');
          this.addLine(12, y, `Braucht: ${inStr}`, dimStyle); y += 14;
        }
        const outStr = outputs.map(([k, v]) => `${v} ${k}`).join(', ');
        this.addLine(12, y, `Erzeugt: ${outStr}`, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LOOT,
        }); y += 18;

        // Production progress bar (texturiert via UIHelper)
        if (building.producing && building.connected) {
          const cycleSec = recipe.cycleTimeSec * (building.synergySpeedMult || 1);
          const elapsed = cycleSec - building.productionTimer;
          const pct = cycleSec > 0 ? Math.min(1, elapsed / cycleSec) : 0;

          const barW = this.panelWidth - 24;
          const barH = 14;

          // Verbleibende-Zeit Text ueber dem Balken
          const remaining = Math.max(0, building.productionTimer);
          this.addLine(12, y - 1, `${remaining.toFixed(0)}s verbleibend`, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
          });
          y += 12;

          // Progress-Bar aus UIHelper
          this.progressBar = createProgressBar(this.scene, {
            x: 12, y,
            width: barW,
            height: barH,
            progress: pct,
            fillColor: UI_COLORS.SUCCESS_GREEN,
          });
          this.contentContainer.add(this.progressBar.container);
          y += barH + 6;
        } else if (!building.connected) {
          this.addLine(12, y, 'Nicht verbunden – keine Produktion', {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DAMAGE,
          });
          y += 16;
        } else if (building.assignedWorkerIds.length === 0 && def.workerSlots > 0) {
          this.addLine(12, y, 'Kein Arbeiter zugewiesen', {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.DAMAGE,
          });
          y += 16;
        } else if (def.manualCraft && !building.producing) {
          // ── Herstellen-Button for manual craft buildings ──
          const canCraft = this.canAffordRecipe(state, building, recipe);
          const btnW = this.panelWidth - 24;
          const btnH = 26;
          const btnColor = canCraft ? UI_COLORS.GLASS_ACCENT_GUILD : UI_COLORS.SLOT_BG;
          const btnGfx = this.scene.add.graphics();
          btnGfx.fillStyle(canCraft ? 0x1a3020 : 0x111520, 1);
          btnGfx.fillRoundedRect(12, y, btnW, btnH, 5);
          btnGfx.lineStyle(2, btnColor, canCraft ? 0.9 : 0.3);
          btnGfx.strokeRoundedRect(12, y, btnW, btnH, 5);
          this.contentContainer.add(btnGfx);
          this.addLine(12 + btnW / 2, y + 13, canCraft ? '⚒ Herstellen' : '⚒ Zu wenig Materialien', {
            fontFamily: FONT_FAMILY, fontSize: '13px',
            color: canCraft ? UI_STR_COLORS.HEAL : UI_STR_COLORS.DISABLED,
            fontStyle: canCraft ? 'bold' : 'normal',
          }, true);
          if (canCraft) {
            const hitZone = this.scene.add.zone(12 + btnW / 2, y + btnH / 2, btnW, btnH).setInteractive();
            hitZone.on('pointerdown', () => {
              building.pendingCraft = true;
              this.rebuildContent(building, state);
            });
            hitZone.on('pointerover', () => {
              btnGfx.clear();
              btnGfx.fillStyle(0x2a5030, 1);
              btnGfx.fillRoundedRect(12, y, btnW, btnH, 5);
              btnGfx.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 1);
              btnGfx.strokeRoundedRect(12, y, btnW, btnH, 5);
            });
            hitZone.on('pointerout', () => {
              btnGfx.clear();
              btnGfx.fillStyle(0x1a3020, 1);
              btnGfx.fillRoundedRect(12, y, btnW, btnH, 5);
              btnGfx.lineStyle(2, UI_COLORS.GLASS_ACCENT_GUILD, 0.9);
              btnGfx.strokeRoundedRect(12, y, btnW, btnH, 5);
            });
            this.contentContainer.add(hitZone);
          }
          if (building.pendingCraft) {
            this.addLine(12 + btnW / 2, y + btnH + 6, '⏳ Wartet auf Start...', {
              fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.GOLD,
            }, true);
            y += 16;
          }
          y += btnH + 4;
        }
      }
    }

    // ── Recipe Switch ──
    if (def.recipes.length > 1) {
      y += 4;
      // Divider (texturiert)
      const dividerR = createDivider(this.scene, 12, y, this.panelWidth - 24);
      this.contentContainer.add(dividerR);
      y += 8;

      this.addLine(12, y, 'Rezept wechseln:', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
      });
      y += 18;

      for (const recipeId of def.recipes) {
        const recipe = RECIPE_DEFS[recipeId];
        if (!recipe) continue;
        const isActive = building.activeRecipeId === recipeId;
        const outStr = Object.entries(recipe.outputs).map(([k, v]) => `${v} ${k}`).join(', ');

        const btnW = this.panelWidth - 24;
        const btnH = 22;

        // Rezept-Button Hintergrund: UI_CARD_BG NineSlice fuer Nicht-Aktive, AFFORDABLE_BG fuer Aktive
        const btnBg = createNineSlice(
          this.scene,
          12, y,
          btnW, btnH,
          'UI_CARD_BG',
          isActive ? UI_COLORS.AFFORDABLE_BG : UI_COLORS.PANEL_BG,
          1,
        );
        if (isActive && btnBg instanceof Phaser.GameObjects.NineSlice) {
          btnBg.setTint(0x55AA55); // Leichte gruene Hervorhebung fuer aktives Rezept
        }
        this.contentContainer.add(btnBg);

        const label = isActive ? `► ${recipe.name}` : `  ${recipe.name}`;
        this.addLine(16, y + 3, label, {
          fontFamily: FONT_FAMILY, fontSize: '11px',
          color: isActive ? UI_STR_COLORS.LOOT : UI_STR_COLORS.DIM,
        });

        this.addLine(16, y + 13, outStr, {
          fontFamily: FONT_FAMILY, fontSize: '11px',
          color: isActive ? UI_STR_COLORS.HEAL : UI_STR_COLORS.DISABLED,
        });

        if (!isActive) {
          const hitZone = this.scene.add.zone(12 + btnW / 2, y + btnH / 2, btnW, btnH).setInteractive();
          hitZone.on('pointerdown', () => {
            building.activeRecipeId = recipeId;
            building.productionTimer = 0;
            building.producing = false;
            this.rebuildContent(building, state);
          });
          hitZone.on('pointerover', () => {
            if (btnBg instanceof Phaser.GameObjects.NineSlice) {
              btnBg.setAlpha(0.8);
            } else {
              btnBg.clear();
              btnBg.fillStyle(UI_COLORS.BTN_DARK, 1).fillRoundedRect(12, y, btnW, btnH, 3);
            }
          });
          hitZone.on('pointerout', () => {
            if (btnBg instanceof Phaser.GameObjects.NineSlice) {
              btnBg.setAlpha(1);
            } else {
              btnBg.clear();
              btnBg.fillStyle(UI_COLORS.PANEL_BG, 1).fillRoundedRect(12, y, btnW, btnH, 3);
            }
          });
          this.contentContainer.add(hitZone);
        }

        y += btnH + 4;
      }
    }

    // ── Specialist-Anzeige ──
    {
      y += 4;
      const divSpec = createDivider(this.scene, 12, y, this.panelWidth - 24);
      this.contentContainer.add(divSpec);
      y += 8;

      if (building.specialistId) {
        const spec = SPECIALIST_DEFS[building.specialistId];
        if (spec) {
          this.addLine(12, y, 'Spezialist:', {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
          });
          this.addLine(12 + 76, y, `${spec.name} ★`, {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD_BRIGHT,
          });
          y += 16;
          // Flavor text (italic look via smaller size)
          const flavor = `"${spec.flavorText}"`;
          this.addLine(14, y, flavor, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DIM,
            wordWrap: { width: this.panelWidth - 28 },
          });
          y += 22;
          const speedBonus = Math.round((1 - spec.productionSpeedMult) * 100);
          this.addLine(12, y, `Bonus: ${speedBonus}% schnellere Produktion`, {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.HEAL,
          });
          y += 16;
        }
      } else {
        this.addLine(12, y, 'Spezialist: — (keiner zugewiesen)', {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.MUTED,
        });
        y += 16;
      }
    }

    // ── Synergy-Bonus ──
    if (building.synergySpeedMult < 1.0) {
      const bonusPct = Math.round((1 - building.synergySpeedMult) * 100);
      this.addLine(12, y, `Synergie-Bonus: +${bonusPct}% Produktion`, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.HEAL,
      });
      y += 16;
    }

    // ── Upgrade in Progress ──
    if (building.upgrading && building.upgradeId) {
      y += 4;
      const divUpg = createDivider(this.scene, 12, y, this.panelWidth - 24);
      this.contentContainer.add(divUpg);
      y += 8;

      this.addLine(12, y, 'Upgrade läuft…', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
      });
      y += 16;

      // Fortschrittsbalken für Upgrade
      const upgDefSync = BUILDING_UPGRADE_DEFS_MAP[building.upgradeId];
      if (upgDefSync) {
        const upgPct = upgDefSync.buildTimeSec > 0
          ? Math.min(1, building.upgradeProgress / upgDefSync.buildTimeSec)
          : 0;
        const barW = this.panelWidth - 24;
        const barH = 14;
        this.upgradeProgressBar = createProgressBar(this.scene, {
          x: 12, y,
          width: barW,
          height: barH,
          progress: upgPct,
          fillColor: UI_COLORS.GOLD_MID,
        });
        this.contentContainer.add(this.upgradeProgressBar.container);
        y += barH + 6;
      }
    }

    // ── Upgrade-Button ──
    if (!building.upgrading) {
      const upgradeDef = getAvailableUpgrade(building.typeId, building.tier);
      if (upgradeDef) {
        y += 4;
        const divU = createDivider(this.scene, 12, y, this.panelWidth - 24);
        this.contentContainer.add(divU);
        y += 8;

        // Check affordability: enough materials + guild rank
        const guildRank = state.guildStats?.rank ?? 0;
        const rankOk = guildRank >= upgradeDef.unlockCondition.minGuildRank;
        let canAfford = rankOk;
        if (rankOk) {
          for (const [res, amount] of Object.entries(upgradeDef.cost)) {
            const have = (state.globalStock[res] ?? 0);
            if (have < amount) { canAfford = false; break; }
          }
        }

        const costParts = Object.entries(upgradeDef.cost)
          .map(([k, v]) => `${v} ${k}`)
          .join(', ');
        const btnLabel = `Upgrade auf T${upgradeDef.toTier}`;

        const btnW = this.panelWidth - 24;
        const btnH = 28;
        const btnColor = canAfford ? UI_COLORS.SUCCESS_BTN_BG : UI_COLORS.BTN_DARK;
        const btnHoverColor = canAfford ? UI_COLORS.SUCCESS_BTN_HOVER : UI_COLORS.BTN_DARK;
        const labelColor = canAfford ? UI_STR_COLORS.LIGHT : UI_STR_COLORS.DISABLED;

        const upgBtnBg = this.scene.add.graphics();
        upgBtnBg.fillStyle(btnColor, 1).fillRoundedRect(12, y, btnW, btnH, 4);
        this.contentContainer.add(upgBtnBg);

        this.addLine(12 + btnW / 2, y + 7, btnLabel, {
          fontFamily: FONT_FAMILY, fontSize: '13px', color: labelColor,
        }, true);
        this.addLine(12 + btnW / 2, y + 18, costParts, {
          fontFamily: FONT_FAMILY, fontSize: '11px', color: canAfford ? UI_STR_COLORS.DIM : UI_STR_COLORS.DISABLED,
        }, true);

        if (!rankOk) {
          this.addLine(12, y + btnH + 2, `Rang ${upgradeDef.unlockCondition.minGuildRank} benötigt`, {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: UI_STR_COLORS.DAMAGE,
          });
          y += 12;
        }

        if (canAfford) {
          const hitZone = this.scene.add.zone(12 + btnW / 2, y + btnH / 2, btnW, btnH).setInteractive();
          hitZone.on('pointerdown', () => {
            if (this.selectedBuilding) {
              this.onUpgrade?.(this.selectedBuilding.id);
            }
          });
          hitZone.on('pointerover', () => {
            upgBtnBg.clear().fillStyle(btnHoverColor, 1).fillRoundedRect(12, y, btnW, btnH, 4);
          });
          hitZone.on('pointerout', () => {
            upgBtnBg.clear().fillStyle(btnColor, 1).fillRoundedRect(12, y, btnW, btnH, 4);
          });
          this.contentContainer.add(hitZone);
        }

        y += btnH + 4;
      }
    }

    // ── Demolish Button ──
    // Bleibt bewusst bei Graphics (DESPERATE_RED ist spezifisch genug)
    y += 8;
    const isLastWarehouse = building.typeId === 'WAREHOUSE'
      && state.buildings.filter(b => b.typeId === 'WAREHOUSE').length <= 1;

    if (!isLastWarehouse) {
      const btnW = this.panelWidth - 24;
      const btnH = 28;
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(UI_COLORS.DESPERATE_RED, 1);
      btnBg.fillRoundedRect(12, y, btnW, btnH, 4);
      this.contentContainer.add(btnBg);

      this.addLine(12 + btnW / 2, y + btnH / 2, 'Abreissen', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
      }, true);

      const hitZone = this.scene.add.zone(12 + btnW / 2, y + btnH / 2, btnW, btnH).setInteractive();
      hitZone.on('pointerdown', () => {
        if (this.selectedBuilding) {
          this.onDemolish?.(this.selectedBuilding.id);
        }
      });
      hitZone.on('pointerover', () => {
        btnBg.clear().fillStyle(UI_COLORS.DESPERATE_RED_HOVER, 1).fillRoundedRect(12, y, btnW, btnH, 4);
      });
      hitZone.on('pointerout', () => {
        btnBg.clear().fillStyle(UI_COLORS.DESPERATE_RED, 1).fillRoundedRect(12, y, btnW, btnH, 4);
      });
      this.contentContainer.add(hitZone);
      y += btnH + 4;
    }

    // Adjust panel height to content
    this.panelHeight = Math.max(200, y + 12);
    this.drawBg();
  }

  private canAffordRecipe(
    state: GameState,
    building: BuildingInstance,
    recipe: { inputs: Record<string, number> },
  ): boolean {
    for (const [item, needed] of Object.entries(recipe.inputs)) {
      const available = building.connected
        ? (state.globalStock[item] ?? 0)
        : (building.localInputBuffer[item] ?? 0);
      if (available < needed) return false;
    }
    return true;
  }

  private addLine(x: number, y: number, text: string, styleObj: object, centered = false): void {
    const t = this.scene.add.text(x, y, text, styleObj as Phaser.Types.GameObjects.Text.TextStyle);
    if (centered) t.setOrigin(0.5);
    this.contentContainer.add(t);
  }

  hide(): void {
    this.selectedBuilding = null;
    this.lastState = null;
    this.progressBar = null;
    this.upgradeProgressBar = null;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  getSelectedBuildingId(): number | null {
    return this.selectedBuilding?.id ?? null;
  }

  destroy(): void {
    this.container.destroy();
  }
}
