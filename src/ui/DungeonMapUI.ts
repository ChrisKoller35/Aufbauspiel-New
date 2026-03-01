// ============================================================
// Magic City – DungeonMapUI
// Zeigt die Dungeon-Karte mit Missions-Wegpunkten,
// Party-Auswahl und Expeditions-Start.
// ============================================================

import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { ROUTE_DEFS } from '../data/routes';
import { CLASS_DEFS } from '../data/classes';
import { ITEM_DEFS, PROVISION_ITEMS } from '../data/items';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { createNineSlice } from '../rendering/UIHelper';

// ─── Konstanten ────────────────────────────────────────────

/** Anzeigereihenfolge der Routen auf der Dungeon-Karte (Tier 1 → 4). */
const ROUTE_DISPLAY_ORDER = [
  'forest_short',
  'forest_medium',
  'cave_deep',
  'cave_spider',
  'swamp_long',
  'ruins_crypts',
  'ruins_depths',
  'volcano_core',
];

/** Hex-Farbe pro Tier für Node-Kreise und Akzente. */
const TIER_HEX: Record<number, number> = {
  1: 0x4CAF50,
  2: 0x2196F3,
  3: 0x9C27B0,
  4: 0xE53935,
};

/** CSS-Farbe pro Tier für Phaser-Texte. */
const TIER_STR: Record<number, string> = {
  1: '#66BB6A',
  2: '#64B5F6',
  3: '#CE93D8',
  4: '#EF9A9A',
};

const DIFFICULTIES = ['normal', 'hard', 'nightmare', 'infernal'] as const;
type Difficulty = typeof DIFFICULTIES[number];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  normal: 'Normal',
  hard: 'Schwer',
  nightmare: 'Alptraum',
  infernal: 'Höllisch',
};

// ─── DungeonMapUI ──────────────────────────────────────────

export class DungeonMapUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private visible = false;
  private currentState: GameState | null = null;

  private readonly panelW = 740;
  private readonly panelH = 560;

  // Auswahl-State
  private selectedRouteId: string | null = null;
  private selectedFighterIds: Set<number> = new Set();
  private selectedDifficulty: Difficulty = 'normal';
  /** Bis zu 3 Proviant-Slots (null = leer). */
  private selectedConsumables: Array<string | null> = [null, null, null];

  /** Aus CityScene gesetzt (BuildingUpgradeSystem). */
  public partySlots = 3;

  /** Callback wenn Expedition gestartet wird. */
  public onStartExpedition?: (
    routeId: string,
    fighterIds: number[],
    difficulty: string,
    modifierId: string | null,
    consumables: string[],
  ) => void;

  /** Callback wenn Panel geschlossen wird. */
  public onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ─── Öffentliche API ──────────────────────────────────────

  show(state: GameState): void {
    this.currentState = state;
    if (this.visible) {
      this.rebuild();
      return;
    }
    this.visible = true;
    this.selectedRouteId = null;
    this.selectedFighterIds = new Set();
    this.selectedDifficulty = 'normal';
    this.selectedConsumables = [null, null, null];
    this.rebuild();
  }

  hide(): void {
    this.visible = false;
    this.container?.destroy();
    this.container = null;
    this.onClose?.();
  }

  isVisible(): boolean {
    return this.visible;
  }

  refresh(state: GameState): void {
    this.currentState = state;
    if (!this.visible) return;
    this.rebuild();
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    if (!this.container) return;
    const cx = cam.scrollX + cam.width / 2;
    const cy = cam.scrollY + cam.height / 2;
    this.container.setPosition(cx - this.panelW / 2, cy - this.panelH / 2);
  }

  // ─── Interner Aufbau ──────────────────────────────────────

  private rebuild(): void {
    this.container?.destroy();
    this.container = null;
    if (!this.currentState) return;
    this.buildPanel(this.currentState);
  }

  private buildPanel(state: GameState): void {
    const { scene } = this;
    const W = this.panelW;
    const H = this.panelH;

    const cam = scene.cameras.main;
    const ox = cam.scrollX + cam.width / 2 - W / 2;
    const oy = cam.scrollY + cam.height / 2 - H / 2;

    this.container = scene.add.container(ox, oy).setDepth(910);

    // Hintergrund
    const bg = createNineSlice(scene, 0, 0, W, H, 'UI_PANEL_BG', UI_COLORS.PANEL_BG_DARKER, 0.97);
    this.container.add(bg);

    const overlay = scene.add.graphics();
    overlay.fillStyle(0x050508, 0.90);
    overlay.fillRoundedRect(3, 3, W - 6, H - 6, 7);
    this.container.add(overlay);

    // Dungeon-Atmosphäre Randleuchten (dunkelrot)
    const glowGfx = scene.add.graphics();
    glowGfx.lineStyle(2, 0x6B0000, 0.7);
    glowGfx.strokeRoundedRect(3, 3, W - 6, H - 6, 7);
    this.container.add(glowGfx);

    // ── Header ──
    this.container.add(
      scene.add.text(W / 2, 19, '⚔  DUNGEON-KARTE  ⚔', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#C8922A',
      }).setOrigin(0.5, 0.5),
    );

    const closeTxt = scene.add.text(W - 14, 10, '✕', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#AAAAAA',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeTxt.on('pointerover', () => closeTxt.setColor('#FF5555'));
    closeTxt.on('pointerout', () => closeTxt.setColor('#AAAAAA'));
    closeTxt.on('pointerdown', () => this.hide());
    this.container.add(closeTxt);

    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x6B0000, 0.6);
    sep.lineBetween(16, 36, W - 16, 36);
    this.container.add(sep);

    // ── Linke Sektion: Dungeon-Karte ──
    const MAP_X = 14;
    const MAP_Y = 44;
    const MAP_W = 230;
    const MAP_H = H - MAP_Y - 14;
    this.drawRouteMap(state, MAP_X, MAP_Y, MAP_W, MAP_H);

    // Vertikaler Trenner
    const vSep = scene.add.graphics();
    vSep.lineStyle(1, 0x6B0000, 0.4);
    vSep.lineBetween(MAP_X + MAP_W + 8, 38, MAP_X + MAP_W + 8, H - 12);
    this.container.add(vSep);

    // ── Rechte Sektion: Info + Party ──
    const RIGHT_X = MAP_X + MAP_W + 20;
    const RIGHT_W = W - RIGHT_X - 14;
    this.drawRightPanel(state, RIGHT_X, MAP_Y, RIGHT_W, H - MAP_Y - 14);
  }

  // ─── Dungeon-Karte (linke Sektion) ────────────────────────

  private drawRouteMap(
    state: GameState,
    x: number, y: number, w: number, h: number,
  ): void {
    const { scene } = this;
    const defeated = state.guildStats.bossesDefeatedIds;
    const routes = ROUTE_DISPLAY_ORDER
      .map(id => ROUTE_DEFS[id])
      .filter(Boolean);

    // Dungeon-Eingang Label
    this.container!.add(
      scene.add.text(x + w / 2, y + 2, '⛰  DUNGEON-EINGANG', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: '#666666',
      }).setOrigin(0.5, 0),
    );

    const entryLine = scene.add.graphics();
    entryLine.lineStyle(1, 0x333333, 0.6);
    entryLine.lineBetween(x + w / 2 - 1, y + 16, x + w / 2 - 1, y + 28);
    this.container!.add(entryLine);

    const itemH = (h - 30) / routes.length;
    const nodeX = x + 18;

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const rowY = y + 30 + i * itemH;
      const nodeY = rowY + itemH / 2;

      const isUnlocked = !route.unlockCondition ||
        route.unlockCondition.bossesDefeated.every((b: string) => defeated.includes(b));
      const isSelected = this.selectedRouteId === route.id;
      const isCompleted = route.bossId
        ? defeated.includes(route.bossId)
        : (route.id === 'forest_short' && state.guildStats.forestShortCompleted > 0);

      const tierCol = TIER_HEX[route.tier] ?? 0x666666;
      const tierStr = TIER_STR[route.tier] ?? '#666666';

      // Verbindungslinie zum vorherigen Knoten
      if (i > 0) {
        const prevY = y + 30 + (i - 1) * itemH + itemH / 2;
        const lineGfx = scene.add.graphics();
        lineGfx.lineStyle(1, isUnlocked ? 0x444444 : 0x222222, 0.8);
        lineGfx.lineBetween(nodeX, prevY + 8, nodeX, nodeY - 8);
        this.container!.add(lineGfx);
      }

      // Knoten-Kreis
      const nodeGfx = scene.add.graphics();
      if (isUnlocked) {
        nodeGfx.fillStyle(isSelected ? tierCol : 0x141420, 1);
        nodeGfx.fillCircle(nodeX, nodeY, 8);
        nodeGfx.lineStyle(2, tierCol, isSelected ? 1.0 : 0.55);
        nodeGfx.strokeCircle(nodeX, nodeY, 8);
        if (isCompleted) {
          nodeGfx.fillStyle(0xFFFFFF, 0.95);
          nodeGfx.fillCircle(nodeX, nodeY, 3);
        }
      } else {
        nodeGfx.fillStyle(0x111111, 1);
        nodeGfx.fillCircle(nodeX, nodeY, 8);
        nodeGfx.lineStyle(1, 0x2A2A2A, 0.9);
        nodeGfx.strokeCircle(nodeX, nodeY, 8);
        // Schloss-Symbol
        nodeGfx.fillStyle(0x333333, 0.8);
        nodeGfx.fillRect(nodeX - 2.5, nodeY - 1, 5, 4);
      }
      this.container!.add(nodeGfx);

      // Selektions-Leiste links
      if (isSelected) {
        const selBar = scene.add.graphics();
        selBar.fillStyle(tierCol, 0.85);
        selBar.fillRect(x, rowY + 2, 3, itemH - 4);
        this.container!.add(selBar);
      }

      // Routen-Name
      const nameCol = isUnlocked
        ? (isSelected ? '#FFD700' : '#BBBBBB')
        : '#3A3A3A';
      const nameTxt = scene.add.text(nodeX + 14, nodeY, route.name, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: nameCol,
      }).setOrigin(0, 0.5);
      this.container!.add(nameTxt);

      // Tier-Sterne (rechts)
      this.container!.add(
        scene.add.text(x + w - 2, nodeY, '★'.repeat(route.tier), {
          fontFamily: FONT_FAMILY,
          fontSize: '11px',
          color: isUnlocked ? tierStr : '#2A2A2A',
        }).setOrigin(1, 0.5),
      );

      // Klick-Bereich (nur wenn freigeschaltet und keine aktive Expedition)
      if (isUnlocked && !this.currentState?.activeExpedition) {
        const hit = scene.add.rectangle(x, rowY, w, itemH, 0xFFFFFF, 0)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
          if (!isSelected) nameTxt.setColor('#FFDD77');
        });
        hit.on('pointerout', () => {
          if (!isSelected) nameTxt.setColor(nameCol);
        });
        hit.on('pointerdown', () => {
          this.selectedRouteId = route.id;
          this.selectedFighterIds = new Set();
          this.rebuild();
        });
        this.container!.add(hit);
      }
    }
  }

  // ─── Rechtes Panel: Info + Party + Start ──────────────────

  private drawRightPanel(
    state: GameState,
    x: number, y: number, w: number, h: number,
  ): void {
    const { scene } = this;

    // Wenn keine Route ausgewählt: Hinweis
    if (!this.selectedRouteId) {
      this.container!.add(
        scene.add.text(x + w / 2, y + h / 3, '← Wähle eine Mission\naus der Dungeon-Karte', {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: '#555555',
          align: 'center',
        }).setOrigin(0.5, 0.5),
      );
      this.container!.add(
        scene.add.text(x + w / 2, y + h / 2 + 20, 'Der Dungeon birgt gefährliche\nKreaturen und mächtige Schätze.', {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: '#3A3A3A',
          align: 'center',
        }).setOrigin(0.5, 0.5),
      );
      return;
    }

    const route = ROUTE_DEFS[this.selectedRouteId];
    if (!route) return;

    const defeated = state.guildStats.bossesDefeatedIds;
    const tierStr = TIER_STR[route.tier] ?? '#888888';

    let cy = y;

    // ── Routen-Infos ──
    this.container!.add(
      scene.add.text(x, cy, route.name, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: tierStr,
      }),
    );
    cy += 20;

    // Sterne + Empfehlung
    this.container!.add(
      scene.add.text(x, cy, '★'.repeat(route.tier) + '☆'.repeat(4 - route.tier), {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: tierStr,
      }),
    );
    this.container!.add(
      scene.add.text(x + w, cy, route.recommendedLevel, {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: '#666666',
      }).setOrigin(1, 0),
    );
    cy += 18;

    // Boss-Info
    const bossStr = route.bossId
      ? `Boss: ${this.formatBossName(route.bossId)}`
      : 'Kein Boss (Trainingspfad)';
    const bossCol = route.bossId
      ? (defeated.includes(route.bossId) ? '#4CAF50' : '#FF6B6B')
      : '#666666';
    this.container!.add(
      scene.add.text(x, cy, bossStr, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: bossCol,
      }),
    );
    cy += 16;

    // Raumanzahl
    this.container!.add(
      scene.add.text(x, cy, `${route.rooms} Räume  |  Tier ${route.tier}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: '#555555',
      }),
    );
    cy += 18;

    this.addDivider(x, cy, w);
    cy += 10;

    // ── Party-Auswahl ──
    this.container!.add(
      scene.add.text(x, cy, 'PARTY AUSWAHL', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#888888',
      }),
    );
    cy += 16;

    const availFighters = state.fighters.filter(f => {
      const cit = state.citizens.find(c => c.fighterId === f.id);
      return cit && cit.status === 'GUILD_FIGHTER';
    });

    if (availFighters.length === 0) {
      this.container!.add(
        scene.add.text(x + w / 2, cy + 20, 'Keine Kämpfer verfügbar.\nTrainiere Kämpfer in der Gilde!', {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: '#555555',
          align: 'center',
        }).setOrigin(0.5, 0),
      );
      cy += 54;
    } else {
      cy = this.drawFighterCards(state, availFighters, x, cy, w);
    }

    // Party-Slots Anzeige
    const slotsStr = Array.from({ length: this.partySlots }, (_, i) =>
      i < this.selectedFighterIds.size ? '●' : '○',
    ).join('  ');
    this.container!.add(
      scene.add.text(x + w / 2, cy, `Party: ${slotsStr}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#888888',
      }).setOrigin(0.5, 0),
    );
    cy += 20;

    this.addDivider(x, cy, w);
    cy += 8;

    // ── Proviant-Auswahl ──
    cy = this.drawConsumableSlots(state, x, cy, w);

    this.addDivider(x, cy, w);
    cy += 8;

    // ── Schwierigkeit ──
    this.container!.add(
      scene.add.text(x, cy, 'SCHWIERIGKEIT', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#888888',
      }),
    );
    cy += 15;

    const diffBtnW = Math.floor((w - (DIFFICULTIES.length - 1) * 4) / DIFFICULTIES.length);
    DIFFICULTIES.forEach((diff, i) => {
      const bx = x + i * (diffBtnW + 4);
      const isSel = this.selectedDifficulty === diff;

      const gfx = scene.add.graphics();
      gfx.fillStyle(isSel ? 0x1E2040 : 0x0A0A14, 0.95);
      gfx.lineStyle(1, isSel ? 0x5A5EAA : 0x2A2A2A, 0.9);
      gfx.fillRoundedRect(bx, cy, diffBtnW, 22, 3);
      gfx.strokeRoundedRect(bx, cy, diffBtnW, 22, 3);
      this.container!.add(gfx);

      this.container!.add(
        scene.add.text(bx + diffBtnW / 2, cy + 11, DIFFICULTY_LABELS[diff], {
          fontFamily: FONT_FAMILY,
          fontSize: '11px',
          color: isSel ? '#9999FF' : '#555555',
        }).setOrigin(0.5, 0.5),
      );

      const hit = scene.add.rectangle(bx, cy, diffBtnW, 22, 0xFFFFFF, 0)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.selectedDifficulty = diff;
        this.rebuild();
      });
      this.container!.add(hit);
    });
    cy += 28;

    // ── Start-Button ──
    const canStart = this.selectedFighterIds.size > 0;
    const btnH = 36;

    const btnGfx = scene.add.graphics();
    if (canStart) {
      btnGfx.fillStyle(0x6B0000, 0.95);
      btnGfx.lineStyle(2, 0xFF4444, 0.85);
    } else {
      btnGfx.fillStyle(0x111111, 0.85);
      btnGfx.lineStyle(1, 0x2A2A2A, 0.6);
    }
    btnGfx.fillRoundedRect(x, cy, w, btnH, 5);
    btnGfx.strokeRoundedRect(x, cy, w, btnH, 5);
    this.container!.add(btnGfx);

    this.container!.add(
      scene.add.text(x + w / 2, cy + btnH / 2, canStart ? '⚔  KAMPF STARTEN!' : 'Kämpfer auswählen...', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: canStart ? '#FF9999' : '#3A3A3A',
      }).setOrigin(0.5, 0.5),
    );

    if (canStart) {
      const btnHit = scene.add.rectangle(x, cy, w, btnH, 0xFFFFFF, 0)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      btnHit.on('pointerover', () => {
        btnGfx.clear();
        btnGfx.fillStyle(0x8B0000, 0.95);
        btnGfx.lineStyle(2, 0xFF6666, 0.9);
        btnGfx.fillRoundedRect(x, cy, w, btnH, 5);
        btnGfx.strokeRoundedRect(x, cy, w, btnH, 5);
      });
      btnHit.on('pointerout', () => {
        btnGfx.clear();
        btnGfx.fillStyle(0x6B0000, 0.95);
        btnGfx.lineStyle(2, 0xFF4444, 0.85);
        btnGfx.fillRoundedRect(x, cy, w, btnH, 5);
        btnGfx.strokeRoundedRect(x, cy, w, btnH, 5);
      });
      btnHit.on('pointerdown', () => {
        const fighterIds   = Array.from(this.selectedFighterIds);
        const consumables  = this.selectedConsumables.filter((c): c is string => c !== null);
        this.onStartExpedition?.(this.selectedRouteId!, fighterIds, this.selectedDifficulty, null, consumables);
        this.hide();
      });
      this.container!.add(btnHit);
    }
  }

  // ─── Proviant-Slots ───────────────────────────────────────

  /**
   * Zeichnet 3 Proviant-Slots unter der Party-Auswahl.
   * Spieler kann aus verfügbarem Proviant wählen.
   * Gibt die neue cy zurück.
   */
  private drawConsumableSlots(
    state: GameState,
    x: number, startCy: number, w: number,
  ): number {
    const { scene } = this;
    let cy = startCy;

    scene.add.text(x, cy, 'PROVIANT', {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: '#888888',
    });
    this.container!.add(
      scene.add.text(x, cy, 'PROVIANT', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#888888',
      }),
    );
    cy += 16;

    // Verfügbare Proviant-Typen aus Stock
    const available = PROVISION_ITEMS.filter(id => (state.globalStock[id] ?? 0) > 0);

    const SLOT_W = Math.floor((w - 8) / 3);
    const SLOT_H = 50;
    const SLOT_GAP = 4;

    for (let si = 0; si < 3; si++) {
      const sx  = x + si * (SLOT_W + SLOT_GAP);
      const sel = this.selectedConsumables[si];
      const itemDef = sel ? ITEM_DEFS[sel] : null;
      const qty = sel ? (state.globalStock[sel] ?? 0) : 0;

      // Check how many of this item are already used in other slots
      const usedInOtherSlots = sel
        ? this.selectedConsumables.filter((s, i) => i !== si && s === sel).length
        : 0;
      const effectiveQty = qty - usedInOtherSlots;

      const slotGfx = scene.add.graphics();
      if (sel) {
        slotGfx.fillStyle(0x0d1a10, 0.95);
        slotGfx.lineStyle(1, 0x446644, 0.8);
      } else {
        slotGfx.fillStyle(0x0a0a14, 0.8);
        slotGfx.lineStyle(1, 0x222233, 0.6);
      }
      slotGfx.fillRoundedRect(sx, cy, SLOT_W, SLOT_H, 5);
      slotGfx.strokeRoundedRect(sx, cy, SLOT_W, SLOT_H, 5);
      this.container!.add(slotGfx);

      if (itemDef) {
        // Sprite
        const spriteKey = `ITEM_${sel!.toUpperCase()}`;
        if (scene.textures.exists(spriteKey)) {
          this.container!.add(
            scene.add.image(sx + 14, cy + SLOT_H / 2, spriteKey)
              .setDisplaySize(22, 22),
          );
        }
        // Name (truncated)
        this.container!.add(
          scene.add.text(sx + 28, cy + 8, itemDef.name, {
            fontFamily: FONT_FAMILY,
            fontSize: '11px',
            color: '#BBBBBB',
          }),
        );
        // Qty
        this.container!.add(
          scene.add.text(sx + 28, cy + 22, `×${Math.max(0, effectiveQty)} vorhanden`, {
            fontFamily: FONT_FAMILY,
            fontSize: '11px',
            color: effectiveQty > 0 ? '#66AA66' : '#AA4444',
          }),
        );
        // Remove hint
        this.container!.add(
          scene.add.text(sx + SLOT_W / 2, cy + SLOT_H - 8, '✕ entfernen', {
            fontFamily: FONT_FAMILY,
            fontSize: '11px',
            color: '#555555',
          }).setOrigin(0.5, 1),
        );
      } else {
        // Empty slot
        this.container!.add(
          scene.add.text(sx + SLOT_W / 2, cy + SLOT_H / 2,
            available.length > 0 ? '+ Proviant\nhinzufügen' : '— leer —', {
              fontFamily: FONT_FAMILY,
              fontSize: '11px',
              color: available.length > 0 ? '#446644' : '#2A2A2A',
              align: 'center',
            }).setOrigin(0.5, 0.5),
        );
      }

      // Klick-Interaktion: Proviant-Typ wechseln oder entfernen
      const hit = scene.add.rectangle(sx, cy, SLOT_W, SLOT_H, 0xFFFFFF, 0)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (sel) {
          // Entfernen
          this.selectedConsumables[si] = null;
        } else {
          // Nächsten verfügbaren Typ wählen (der noch Bestand hat)
          const candidates = PROVISION_ITEMS.filter(id => {
            const stockQty = state.globalStock[id] ?? 0;
            const alreadyUsed = this.selectedConsumables.filter(s => s === id).length;
            return stockQty > alreadyUsed;
          });
          if (candidates.length > 0) {
            this.selectedConsumables[si] = candidates[0];
          }
        }
        this.rebuild();
      });
      this.container!.add(hit);

      // Cycle-Button (kleiner Pfeil rechts) nur bei belegtem Slot und mehreren Optionen
      if (sel && available.length > 1) {
        const cycleHit = scene.add.text(sx + SLOT_W - 4, cy + 4, '▶', {
          fontFamily: FONT_FAMILY,
          fontSize: '11px',
          color: '#555555',
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        cycleHit.on('pointerover', () => cycleHit.setColor('#AAAAAA'));
        cycleHit.on('pointerout',  () => cycleHit.setColor('#555555'));
        cycleHit.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
          ptr.event.stopPropagation();
          const idx = PROVISION_ITEMS.indexOf(sel);
          // Find next available item
          let next = null;
          for (let n = 1; n <= PROVISION_ITEMS.length; n++) {
            const candidate = PROVISION_ITEMS[(idx + n) % PROVISION_ITEMS.length];
            const stockQty  = state.globalStock[candidate] ?? 0;
            const usedCount = this.selectedConsumables.filter((s, i) => i !== si && s === candidate).length;
            if (stockQty > usedCount) { next = candidate; break; }
          }
          if (next) this.selectedConsumables[si] = next;
          this.rebuild();
        });
        this.container!.add(cycleHit);
      }
    }

    cy += SLOT_H + 8;
    return cy;
  }

  // ─── Kämpfer-Karten ───────────────────────────────────────

  private drawFighterCards(
    state: GameState,
    fighters: ReturnType<typeof state.fighters.filter>,
    x: number, startY: number, w: number,
  ): number {
    const { scene } = this;
    const CARD_W = Math.floor((w - 6) / 2);
    const CARD_H = 38;
    const GAP = 4;
    const MAX_ROWS = 4;

    const visible = fighters.slice(0, MAX_ROWS * 2);
    let cy = startY;

    for (let i = 0; i < visible.length; i++) {
      const fighter = visible[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const fx = x + col * (CARD_W + GAP);
      const fy = cy + row * (CARD_H + GAP);

      const isSel = this.selectedFighterIds.has(fighter.id);
      const partyFull = !isSel && this.selectedFighterIds.size >= this.partySlots;

      // Karte Hintergrund
      const cardGfx = scene.add.graphics();
      if (isSel) {
        cardGfx.fillStyle(0x0D2210, 0.95);
        cardGfx.lineStyle(1, 0x4CAF50, 0.9);
      } else if (partyFull) {
        cardGfx.fillStyle(0x0A0A0A, 0.8);
        cardGfx.lineStyle(1, 0x1A1A1A, 0.5);
      } else {
        cardGfx.fillStyle(0x0D0D1A, 0.9);
        cardGfx.lineStyle(1, 0x2A2A3A, 0.7);
      }
      cardGfx.fillRoundedRect(fx, fy, CARD_W, CARD_H, 4);
      cardGfx.strokeRoundedRect(fx, fy, CARD_W, CARD_H, 4);
      this.container!.add(cardGfx);

      // Name
      const nameCol = isSel ? '#88FF88' : (partyFull ? '#333333' : '#BBBBBB');
      this.container!.add(
        scene.add.text(fx + 6, fy + 6, fighter.name, {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: nameCol,
        }),
      );

      // Klasse + Level
      const cls = CLASS_DEFS[fighter.classId];
      this.container!.add(
        scene.add.text(fx + 6, fy + 18, `${cls?.name ?? fighter.classId} Lv.${fighter.level}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '11px',
          color: '#555555',
        }),
      );

      // HP-Leiste
      const hpPct = Math.max(0, fighter.baseStats.hp / fighter.baseStats.maxHp);
      const barW = CARD_W - 12;
      const hpGfx = scene.add.graphics();
      hpGfx.fillStyle(0x111111, 1);
      hpGfx.fillRect(fx + 6, fy + 30, barW, 4);
      const hpCol = hpPct > 0.5 ? 0x2ECC40 : (hpPct > 0.25 ? 0xFF851B : 0xFF4136);
      hpGfx.fillStyle(hpCol, 0.9);
      hpGfx.fillRect(fx + 6, fy + 30, barW * hpPct, 4);
      this.container!.add(hpGfx);

      // Häkchen bei ausgewählt
      if (isSel) {
        this.container!.add(
          scene.add.text(fx + CARD_W - 5, fy + 4, '✓', {
            fontFamily: FONT_FAMILY,
            fontSize: '13px',
            color: '#4CAF50',
          }).setOrigin(1, 0),
        );
      }

      // Verletzt-Marker
      const isInjured = fighter.baseStats.hp < fighter.baseStats.maxHp;
      if (isInjured && !isSel) {
        this.container!.add(
          scene.add.text(fx + CARD_W - 5, fy + 4, '⚕', {
            fontFamily: FONT_FAMILY,
            fontSize: '11px',
            color: '#FF6B6B',
          }).setOrigin(1, 0),
        );
      }

      // Klick-Interaktion
      if (!partyFull || isSel) {
        const hit = scene.add.rectangle(fx, fy, CARD_W, CARD_H, 0xFFFFFF, 0)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          if (isSel) {
            this.selectedFighterIds.delete(fighter.id);
          } else {
            this.selectedFighterIds.add(fighter.id);
          }
          this.rebuild();
        });
        this.container!.add(hit);
      }
    }

    const rows = Math.ceil(visible.length / 2);
    return startY + rows * (CARD_H + GAP) + 6;
  }

  // ─── Hilfsfunktionen ──────────────────────────────────────

  private addDivider(x: number, y: number, w: number): void {
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(1, 0x222222, 0.7);
    gfx.lineBetween(x, y, x + w, y);
    this.container!.add(gfx);
  }

  private formatBossName(bossId: string): string {
    return bossId
      .replace(/^boss_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}
