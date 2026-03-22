// ============================================================
// Magic City – HTMLBuildingPanel
// Rechts-Panel das beim Anklicken eines Gebäudes erscheint.
// Zeigt Gebäude-Infos, Produktion, Rezepte und Aktions-Buttons.
// Kein Phaser-Import – reines DOM/CSS.
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { BuildingInstance } from '../../models/Building';
import { GameState } from '../../models/GameState';
import { BUILDING_DEFS, BuildingDef } from '../../data/buildings';
import { RECIPE_DEFS } from '../../data/recipes';
import { SPECIALIST_DEFS } from '../../data/specialists';
import { getAvailableUpgrade, BUILDING_UPGRADE_DEFS as UPGRADE_DEFS_MAP } from '../../data/buildingUpgrades';

export class HTMLBuildingPanel extends HTMLPanel {
  // Callbacks für UIManager
  public onDemolish?: (buildingId: number) => void;
  public onUpgrade?: (buildingId: number) => void;

  // Interner State
  private selectedBuilding: BuildingInstance | null = null;
  private lastState: GameState | null = null;

  // DOM-Referenzen für Live-Updates (ohne rebuild)
  private timerEl: HTMLElement | null = null;
  private progressFillEl: HTMLElement | null = null;
  private upgradeProgressFillEl: HTMLElement | null = null;

  // Der scrollbare Content-Bereich wird bei jedem show() neu gebaut
  private contentEl!: HTMLElement;

  constructor() {
    // Root-Element: zentriert auf dem Bildschirm
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    root.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'transform: translate(-50%, -50%)',
      'width: 480px',
      'max-height: 85vh',
      'display: flex',
      'flex-direction: column',
      'pointer-events: auto',
      'z-index: 100',
    ].join('; ');
    root.setAttribute('hidden', '');

    super(root);

    // Content-Bereich (wird bei show() gefüllt)
    this.contentEl = HTMLPanel.el('div', 'mc-scroll');
    this.contentEl.style.cssText = 'flex: 1; overflow-y: auto; padding: 0 0 10px 0;';
    root.appendChild(this.contentEl);
  }

  // ─── Öffentliche API ────────────────────────────────────────

  show(building?: BuildingInstance, state?: GameState): void {
    if (!building || !state) return;
    this.selectedBuilding = building;
    this.lastState = state;
    this.rebuildContent();
    super.show();
  }

  hide(): void {
    this.selectedBuilding = null;
    this.lastState = null;
    this.timerEl = null;
    this.progressFillEl = null;
    this.upgradeProgressFillEl = null;
    super.hide();
  }

  isVisible(): boolean {
    return super.isVisible();
  }

  // No-op: HTML-Panels brauchen kein Kamera-Update
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* no-op */ }

  // ─── Live-Update (wird vom CityScene-Tick aufgerufen) ──────

  /**
   * Aktualisiert nur Timer-Text und Fortschrittsbalken
   * ohne den gesamten Panel neu aufzubauen.
   */
  updateProgress(): void {
    if (!this.selectedBuilding || !this.lastState) return;
    if (!this.isVisible()) return;

    const building = this.selectedBuilding;

    // Produktions-Timer Text
    if (this.timerEl) {
      const remaining = Math.max(0, building.productionTimer);
      this.timerEl.textContent = `${remaining.toFixed(0)}s verbleibend`;
    }

    // Produktions-Fortschritt
    if (this.progressFillEl && building.activeRecipeId) {
      const recipe = RECIPE_DEFS[building.activeRecipeId];
      if (recipe) {
        const cycleSec = recipe.cycleTimeSec * (building.synergySpeedMult || 1);
        const elapsed = cycleSec - building.productionTimer;
        const pct = cycleSec > 0 ? Math.min(100, (elapsed / cycleSec) * 100) : 0;
        this.progressFillEl.style.width = `${pct}%`;
      }
    }

    // Upgrade-Fortschritt
    if (this.upgradeProgressFillEl && building.upgrading && building.upgradeId) {
      const upgDef = UPGRADE_DEFS_MAP[building.upgradeId];
      if (upgDef) {
        const pct = upgDef.buildTimeSec > 0
          ? Math.min(100, (building.upgradeProgress / upgDef.buildTimeSec) * 100)
          : 0;
        this.upgradeProgressFillEl.style.width = `${pct}%`;
      }
    }
  }

  // ─── Content-Aufbau ────────────────────────────────────────

  private rebuildContent(): void {
    if (!this.selectedBuilding || !this.lastState) return;

    // Live-Update-Refs zurücksetzen
    this.timerEl = null;
    this.progressFillEl = null;
    this.upgradeProgressFillEl = null;

    // Content leeren
    this.contentEl.innerHTML = '';

    const building = this.selectedBuilding;
    const state = this.lastState;
    const def = BUILDING_DEFS[building.typeId];
    if (!def) return;

    // ── Header ──
    const header = this.buildHeader(def.name, def.spriteKey);
    this.contentEl.appendChild(header);

    // ── Info-Sektion ──
    const infoSection = HTMLPanel.el('div');
    infoSection.style.cssText = 'padding: 10px 16px 6px;';
    this.contentEl.appendChild(infoSection);

    // Baustatus
    if (!building.built) {
      const pct = def.buildTimeSec > 0
        ? Math.round((building.buildProgress / def.buildTimeSec) * 100)
        : 100;
      infoSection.appendChild(this.buildRow('Status', `Im Bau (${pct}%)`, '#D4A54A'));
    } else {
      infoSection.appendChild(this.buildRow('Typ', def.category, '#9EA3AC'));
    }

    // Fußabdruck
    infoSection.appendChild(
      this.buildRow('Fläche', `${def.footprint[0]}×${def.footprint[1]}`, '#9EA3AC'),
    );

    // Verbindungs-Status
    if (def.requiresConnectivity) {
      const col = building.connected ? '#66BB6A' : '#EF5350';
      const label = building.connected ? 'Verbunden' : 'Nicht verbunden!';
      infoSection.appendChild(this.buildRow('Status', label, col));
    }

    // Wasser
    if (def.requirements?.waterSupplied) {
      const col = building.waterSupplied ? '#66BB6A' : '#EF5350';
      infoSection.appendChild(
        this.buildRow('Wasser', building.waterSupplied ? 'Ja' : 'Nein', col),
      );
    }

    // Arbeiter
    if (def.workerSlots > 0) {
      infoSection.appendChild(
        this.buildRow('Arbeiter', `${building.assignedWorkerIds.length}/${def.workerSlots}`, '#F2F2F2'),
      );
    }

    // Wohnraum
    if (def.housing) {
      infoSection.appendChild(
        this.buildRow('Bewohner', String(def.housing.capacity), '#F2F2F2'),
      );
      infoSection.appendChild(
        this.buildRow('Steuer', `${def.housing.baseTaxPerMin} Gold/min`, '#9EA3AC'),
      );
    }

    // ── Produktions-Sektion ──
    if (building.activeRecipeId) {
      this.contentEl.appendChild(this.buildDivider());
      const prodSection = this.buildProductionSection(building, state, def);
      if (prodSection) this.contentEl.appendChild(prodSection);
    }

    // ── Rezept-Wechsel ──
    if (def.recipes.length > 1) {
      this.contentEl.appendChild(this.buildDivider());
      this.contentEl.appendChild(this.buildRecipeSwitcher(building, state, def));
    }

    // ── Spezialist-Anzeige ──
    this.contentEl.appendChild(this.buildDivider());
    this.contentEl.appendChild(this.buildSpecialistSection(building));

    // ── Synergy-Bonus ──
    if (building.synergySpeedMult < 1.0) {
      const bonusPct = Math.round((1 - building.synergySpeedMult) * 100);
      const synRow = HTMLPanel.el('div');
      synRow.style.cssText = 'padding: 0 12px 4px;';
      const span = HTMLPanel.el('span', 'mc-label-heal mc-text-sm');
      span.textContent = `Synergie-Bonus: +${bonusPct}% Produktion`;
      synRow.appendChild(span);
      this.contentEl.appendChild(synRow);
    }

    // ── Upgrade in Arbeit ──
    if (building.upgrading && building.upgradeId) {
      this.contentEl.appendChild(this.buildDivider());
      this.contentEl.appendChild(this.buildUpgradeProgressSection(building));
    }

    // ── Upgrade-Button ──
    if (!building.upgrading) {
      const upgradeDef = getAvailableUpgrade(building.typeId, building.tier);
      if (upgradeDef) {
        this.contentEl.appendChild(this.buildDivider());
        this.contentEl.appendChild(this.buildUpgradeButton(building, state, upgradeDef));
      }
    }

    // ── Abriss-Button ──
    const isLastWarehouse = building.typeId === 'WAREHOUSE'
      && state.buildings.filter(b => b.typeId === 'WAREHOUSE').length <= 1;

    if (!isLastWarehouse) {
      this.contentEl.appendChild(this.buildDemolishButton(building));
    }
  }

  // ─── Header ────────────────────────────────────────────────

  private buildHeader(name: string, spriteKey: string): HTMLElement {
    const header = document.createElement('div');
    header.className = 'mc-panel-header';
    Object.assign(header.style, {
      display:        'flex',
      alignItems:     'center',
      gap:            '12px',
      justifyContent: 'center',
      padding:        '14px 40px 14px 16px',
      fontSize:       '16px',
    });

    // Sprite-Icon
    const img = HTMLPanel.icon(spriteKey, 40);
    header.appendChild(img);

    // Name
    const nameEl = document.createElement('span');
    nameEl.style.fontWeight = 'bold';
    nameEl.textContent = name;
    header.appendChild(nameEl);

    // Schließen-Button
    const closeBtn = HTMLPanel.closeBtn(() => this.hide());
    header.appendChild(closeBtn);

    return header;
  }

  // ─── Hilfs-Zeile ───────────────────────────────────────────

  private buildRow(label: string, value: string, valueColor: string): HTMLElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'baseline',
      marginBottom:   '6px',
      fontSize:       '14px',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label + ':';
    labelEl.style.color = '#9EA3AC';
    row.appendChild(labelEl);

    const valEl = document.createElement('span');
    valEl.textContent = value;
    valEl.style.color = valueColor;
    valEl.style.fontWeight = 'bold';
    row.appendChild(valEl);

    return row;
  }

  // ─── Trennlinie ────────────────────────────────────────────

  private buildDivider(): HTMLElement {
    const div = HTMLPanel.el('div', 'mc-divider');
    div.style.margin = '8px 16px';
    return div;
  }

  // ─── Produktions-Sektion ───────────────────────────────────

  private buildProductionSection(
    building: BuildingInstance,
    state: GameState,
    def: BuildingDef,
  ): HTMLElement | null {
    const recipe = building.activeRecipeId ? RECIPE_DEFS[building.activeRecipeId] : null;
    if (!recipe) return null;

    const section = HTMLPanel.el('div');
    section.style.cssText = 'padding: 6px 16px 6px;';

    // Titel
    const title = HTMLPanel.el('div', 'mc-label-gold mc-bold');
    title.style.cssText = 'font-size: 14px; margin-bottom: 8px;';
    title.textContent = 'Produktion:';
    section.appendChild(title);

    // Rezept-Name
    const recipeName = HTMLPanel.el('div');
    recipeName.style.cssText = 'font-size: 14px; margin-bottom: 6px;';
    recipeName.textContent = recipe.name;
    section.appendChild(recipeName);

    // Inputs mit Icons
    const inputs = Object.entries(recipe.inputs);
    if (inputs.length > 0) {
      const inContainer = HTMLPanel.el('div', 'mc-label-dim');
      inContainer.style.cssText = 'font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;';
      const inLabel = HTMLPanel.el('span');
      inLabel.textContent = 'Braucht: ';
      inContainer.appendChild(inLabel);
      for (const [k, v] of inputs) {
        const itemIcon = HTMLPanel.icon(`ITEM_${k.toUpperCase()}`, 20);
        itemIcon.style.cssText = 'vertical-align: middle; border-radius: 3px;';
        inContainer.appendChild(itemIcon);
        const itemText = HTMLPanel.el('span');
        itemText.textContent = `${v} ${k}`;
        itemText.style.marginRight = '6px';
        inContainer.appendChild(itemText);
      }
      section.appendChild(inContainer);
    }

    // Outputs mit Icons
    const outputs = Object.entries(recipe.outputs);
    const outContainer = HTMLPanel.el('div', 'mc-label-loot');
    outContainer.style.cssText = 'font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;';
    const outLabel = HTMLPanel.el('span');
    outLabel.textContent = 'Erzeugt: ';
    outContainer.appendChild(outLabel);
    for (const [k, v] of outputs) {
      const itemIcon = HTMLPanel.icon(`ITEM_${k.toUpperCase()}`, 20);
      itemIcon.style.cssText = 'vertical-align: middle; border-radius: 3px;';
      outContainer.appendChild(itemIcon);
      const itemText = HTMLPanel.el('span');
      itemText.textContent = `${v} ${k}`;
      itemText.style.marginRight = '6px';
      outContainer.appendChild(itemText);
    }
    section.appendChild(outContainer);

    // Zustand: Produziert
    if (building.producing && building.connected) {
      const cycleSec = recipe.cycleTimeSec * (building.synergySpeedMult || 1);
      const elapsed = cycleSec - building.productionTimer;
      const pct = cycleSec > 0 ? Math.min(100, (elapsed / cycleSec) * 100) : 0;

      // Timer-Text
      const timerEl = HTMLPanel.el('div', 'mc-label-dim mc-text-sm');
      const remaining = Math.max(0, building.productionTimer);
      timerEl.textContent = `${remaining.toFixed(0)}s verbleibend`;
      timerEl.style.marginBottom = '4px';
      section.appendChild(timerEl);
      this.timerEl = timerEl; // Referenz für Live-Updates

      // Fortschrittsbalken
      const barTrack = HTMLPanel.el('div', 'mc-bar-track');
      barTrack.style.height = '10px';
      const barFill = HTMLPanel.el('div', 'mc-bar-fill mc-bar-hp');
      barFill.style.width = `${pct}%`;
      barTrack.appendChild(barFill);
      section.appendChild(barTrack);
      this.progressFillEl = barFill; // Referenz für Live-Updates

    } else if (!building.connected) {
      const msg = HTMLPanel.el('div', 'mc-label-damage mc-text-sm');
      msg.textContent = 'Nicht verbunden – keine Produktion';
      section.appendChild(msg);

    } else if (building.assignedWorkerIds.length === 0 && def.workerSlots > 0) {
      const msg = HTMLPanel.el('div', 'mc-label-damage mc-text-sm');
      msg.textContent = 'Kein Arbeiter zugewiesen';
      section.appendChild(msg);

    } else if (def.manualCraft && !building.producing) {
      // Manueller Craft-Button
      const canCraft = this.canAffordRecipe(state, building, recipe);
      const craftBtn = this.buildCraftButton(building, state, canCraft);
      section.appendChild(craftBtn);

      if (building.pendingCraft) {
        const pendingEl = HTMLPanel.el('div', 'mc-label-gold mc-text-sm mc-text-center');
        pendingEl.textContent = 'Wartet auf Start...';
        pendingEl.style.marginTop = '4px';
        section.appendChild(pendingEl);
      }
    }

    return section;
  }

  // ─── Craft-Button ──────────────────────────────────────────

  private buildCraftButton(
    building: BuildingInstance,
    state: GameState,
    canCraft: boolean,
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.className = canCraft ? 'mc-btn success' : 'mc-btn';
    btn.style.cssText = 'width: 100%; margin-top: 4px;';
    btn.textContent = canCraft ? '⚒ Herstellen' : '⚒ Zu wenig Materialien';
    btn.disabled = !canCraft;

    if (canCraft) {
      btn.addEventListener('click', () => {
        building.pendingCraft = true;
        this.rebuildContent();
      });
    }

    return btn;
  }

  // ─── Rezept-Wechsel ────────────────────────────────────────

  private buildRecipeSwitcher(
    building: BuildingInstance,
    state: GameState,
    def: BuildingDef,
  ): HTMLElement {
    const section = HTMLPanel.el('div');
    section.style.cssText = 'padding: 6px 16px 6px;';

    const title = HTMLPanel.el('div', 'mc-label-gold mc-bold');
    title.style.cssText = 'font-size: 14px; margin-bottom: 8px;';
    title.textContent = 'Rezept wechseln:';
    title.style.marginBottom = '6px';
    section.appendChild(title);

    for (const recipeId of def.recipes) {
      const recipe = RECIPE_DEFS[recipeId];
      if (!recipe) continue;

      const isActive = building.activeRecipeId === recipeId;

      const card = document.createElement('div');
      card.className = 'mc-card';
      Object.assign(card.style, {
        marginBottom:    '6px',
        cursor:          isActive ? 'default' : 'pointer',
        borderColor:     isActive ? 'var(--mc-heal)' : 'var(--mc-navy-separator)',
        backgroundColor: isActive ? 'rgba(76,175,80,0.1)' : 'var(--mc-navy-card)',
        padding:         '8px 12px',
      });

      const nameEl = HTMLPanel.el('div', isActive ? 'mc-label-loot mc-bold' : 'mc-label-dim');
      nameEl.style.cssText = 'font-size: 13px; margin-bottom: 4px;';
      nameEl.textContent = (isActive ? '► ' : '  ') + recipe.name;
      card.appendChild(nameEl);

      // Output mit Icons
      const outRow = HTMLPanel.el('div');
      outRow.style.cssText = 'display: flex; align-items: center; gap: 4px; flex-wrap: wrap;';
      for (const [k, v] of Object.entries(recipe.outputs)) {
        const icon = HTMLPanel.icon(`ITEM_${k.toUpperCase()}`, 18);
        icon.style.borderRadius = '3px';
        outRow.appendChild(icon);
        const txt = HTMLPanel.el('span', isActive ? 'mc-label-heal' : '');
        txt.style.cssText = `font-size: 12px; margin-right: 4px; color: ${isActive ? 'var(--mc-heal)' : 'var(--mc-disabled)'};`;
        txt.textContent = `${v} ${k}`;
        outRow.appendChild(txt);
      }
      card.appendChild(outRow);

      if (!isActive) {
        card.addEventListener('mouseenter', () => {
          card.style.borderColor = 'var(--mc-panel-border)';
          card.style.backgroundColor = 'var(--mc-navy-card-light)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = 'var(--mc-navy-separator)';
          card.style.backgroundColor = 'var(--mc-navy-card)';
        });
        card.addEventListener('click', () => {
          building.activeRecipeId = recipeId;
          building.productionTimer = 0;
          building.producing = false;
          this.rebuildContent();
        });
      }

      section.appendChild(card);
    }

    return section;
  }

  // ─── Spezialist-Sektion ────────────────────────────────────

  private buildSpecialistSection(building: BuildingInstance): HTMLElement {
    const section = HTMLPanel.el('div');
    section.style.cssText = 'padding: 6px 16px 6px;';

    if (building.specialistId) {
      const spec = SPECIALIST_DEFS[building.specialistId];
      if (spec) {
        const headerRow = document.createElement('div');
        Object.assign(headerRow.style, {
          display:     'flex',
          justifyContent: 'space-between',
          marginBottom: '2px',
        });
        const labelEl = HTMLPanel.el('span', 'mc-label-gold mc-text-sm');
        labelEl.textContent = 'Spezialist:';
        const specName = HTMLPanel.el('span', 'mc-label-bright mc-text-sm mc-bold');
        specName.textContent = `${spec.name} ★`;
        headerRow.appendChild(labelEl);
        headerRow.appendChild(specName);
        section.appendChild(headerRow);

        // Flavor-Text
        const flavor = HTMLPanel.el('div', 'mc-label-dim mc-text-sm mc-italic');
        flavor.textContent = `"${spec.flavorText}"`;
        flavor.style.marginBottom = '2px';
        section.appendChild(flavor);

        // Bonus
        const speedBonus = Math.round((1 - spec.productionSpeedMult) * 100);
        const bonusEl = HTMLPanel.el('div', 'mc-label-heal mc-text-sm');
        bonusEl.textContent = `Bonus: ${speedBonus}% schnellere Produktion`;
        section.appendChild(bonusEl);
      }
    } else {
      const emptyEl = HTMLPanel.el('div', 'mc-label-muted mc-text-sm');
      emptyEl.textContent = 'Spezialist: — (keiner zugewiesen)';
      section.appendChild(emptyEl);
    }

    return section;
  }

  // ─── Upgrade-Fortschritt ───────────────────────────────────

  private buildUpgradeProgressSection(building: BuildingInstance): HTMLElement {
    const section = HTMLPanel.el('div');
    section.style.cssText = 'padding: 6px 16px 6px;';

    const title = HTMLPanel.el('div', 'mc-label-gold mc-text-sm mc-bold');
    title.textContent = 'Upgrade läuft…';
    title.style.marginBottom = '6px';
    section.appendChild(title);

    if (building.upgradeId) {
      const upgDef = UPGRADE_DEFS_MAP[building.upgradeId];
      if (upgDef) {
        const pct = upgDef.buildTimeSec > 0
          ? Math.min(100, (building.upgradeProgress / upgDef.buildTimeSec) * 100)
          : 0;

        const track = HTMLPanel.el('div', 'mc-bar-track');
        track.style.height = '10px';
        const fill = HTMLPanel.el('div', 'mc-bar-fill');
        fill.style.cssText = `width: ${pct}%; background: var(--mc-gold);`;
        track.appendChild(fill);
        section.appendChild(track);
        this.upgradeProgressFillEl = fill; // Referenz für Live-Updates
      }
    }

    return section;
  }

  // ─── Upgrade-Button ────────────────────────────────────────

  private buildUpgradeButton(
    building: BuildingInstance,
    state: GameState,
    upgradeDef: ReturnType<typeof getAvailableUpgrade>,
  ): HTMLElement {
    if (!upgradeDef) return HTMLPanel.el('div');

    const section = HTMLPanel.el('div');
    section.style.cssText = 'padding: 6px 16px 6px;';

    // Bezahlbarkeit prüfen
    const guildRank = state.guildStats?.rank ?? 0;
    const rankOk = guildRank >= upgradeDef.unlockCondition.minGuildRank;
    let canAfford = rankOk;
    if (rankOk) {
      for (const [res, amount] of Object.entries(upgradeDef.cost)) {
        if ((state.globalStock[res] ?? 0) < amount) {
          canAfford = false;
          break;
        }
      }
    }

    const costParts = Object.entries(upgradeDef.cost)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ');

    // Rang-Hinweis
    if (!rankOk) {
      const rankHint = HTMLPanel.el('div', 'mc-label-damage mc-text-sm');
      rankHint.textContent = `Rang ${upgradeDef.unlockCondition.minGuildRank} benötigt`;
      rankHint.style.marginBottom = '4px';
      section.appendChild(rankHint);
    }

    // Upgrade-Button
    const btn = document.createElement('button');
    btn.className = canAfford ? 'mc-btn success' : 'mc-btn';
    btn.style.cssText = 'width: 100%; display: flex; flex-direction: column; align-items: center; padding: 8px 12px;';
    btn.disabled = !canAfford;

    const btnLabel = HTMLPanel.el('span', 'mc-bold mc-text-sm');
    btnLabel.textContent = `Upgrade auf T${upgradeDef.toTier}`;
    btn.appendChild(btnLabel);

    const costEl = HTMLPanel.el('span');
    costEl.style.cssText = 'font-size: var(--mc-font-size-xs); color: var(--mc-dim); margin-top: 2px;';
    costEl.textContent = costParts;
    btn.appendChild(costEl);

    if (canAfford) {
      btn.addEventListener('click', () => {
        if (this.selectedBuilding) {
          this.onUpgrade?.(this.selectedBuilding.id);
        }
      });
    }

    section.appendChild(btn);
    return section;
  }

  // ─── Abriss-Button ─────────────────────────────────────────

  private buildDemolishButton(building: BuildingInstance): HTMLElement {
    const section = HTMLPanel.el('div');
    section.style.cssText = 'padding: 6px 16px 10px;';

    const btn = document.createElement('button');
    btn.className = 'mc-btn danger';
    btn.style.cssText = 'width: 100%;';
    btn.textContent = 'Abreissen';

    btn.addEventListener('click', () => {
      if (this.selectedBuilding) {
        this.onDemolish?.(this.selectedBuilding.id);
      }
    });

    section.appendChild(btn);
    return section;
  }

  // ─── Hilfsmethode: Rezept bezahlbar? ───────────────────────

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
}
