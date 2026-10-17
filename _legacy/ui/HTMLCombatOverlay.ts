// ============================================================
// Magic City – HTMLCombatOverlay
// Vollständige HTML-Migration des Phaser CombatOverlay.
// Alle Animationen via CSS @keyframes + setTimeout-Sequenzen.
// Kamera-Shake nutzt weiterhin Phaser scene (einzige Abhängigkeit).
// ============================================================

import Phaser from 'phaser';
import { ExpeditionRun, CombatUnit, CombatSkill, EncounterRoom, CombatRoundSnapshot } from '../../models/ExpeditionRun';
import { ExpeditionSystem } from '../../systems/ExpeditionSystem';
import { GameState } from '../../models/GameState';
import { ROUTE_DEFS } from '../../data/routes';
import { CLASS_DEFS } from '../../data/classes';
import { ENEMY_DEFS } from '../../data/enemies';
import { ITEM_DEFS } from '../../data/items';
import { SPECIAL_EFFECT_DEFS } from '../../data/specialEffects';
import { SoundManager } from '../../systems/SoundManager';
import { getLogLineColor } from '../../rendering/Colors';

type CombatPhase = 'preview' | 'animating' | 'result';

interface UnitEntry {
  el: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  unitId: number;
}

/** HTML-basierter CombatOverlay. Eigene Panel-Implementierung (andere show()-Signatur als HTMLPanel). */
export class HTMLCombatOverlay {
  protected readonly el: HTMLElement;
  private static readonly layer: HTMLElement = document.getElementById('ui-layer') as HTMLElement;
  private phase: CombatPhase = 'preview';
  private combatSpeed: number = 1.0;

  // Phaser scene – nur für camera shake (optional im 3D-Modus)
  private scene: Phaser.Scene | null;

  // Expedition context
  private expSystem: ExpeditionSystem | null = null;
  private expState: GameState | null = null;
  private expRun: ExpeditionRun | null = null;
  private previewRoom: EncounterRoom | null = null;

  private soundManager: SoundManager | null = null;

  // Pre-combat HP snapshot
  private preHpMap = new Map<number, number>();

  // Unit entries (DOM refs)
  private partyEntries: UnitEntry[] = [];
  private enemyEntries: UnitEntry[] = [];

  // Ability selection
  private selectedAbilities = new Map<number, string>();

  // Pre-combat targeting
  private preTargetEnemyId: number | null = null;

  // DOM refs
  private titleEl!: HTMLElement;
  private roomInfoEl!: HTMLElement;
  private partyColEl!: HTMLElement;
  private enemyColEl!: HTMLElement;
  // Abilities/items werden dynamisch als letzte Kinder der Spalten eingefügt
  private abilitiesAreaEl: HTMLElement | null = null;
  private itemsAreaEl: HTMLElement | null = null;
  private logLinesEl!: HTMLElement;
  private actionsEl!: HTMLElement;
  // Air Shield (Unterwasser-Routen)
  private airShieldEl: HTMLElement | null = null;
  // Fortification bar (Belagerungs-Routen)
  private fortBarEl: HTMLElement | null = null;

  // Pending setTimeout IDs for cleanup
  private timers: ReturnType<typeof setTimeout>[] = [];

  // Public callbacks
  public onFightClicked?: () => void;
  public onComplete?: () => void;
  public onPreCombatTarget?: (enemyId: number) => void;

  constructor(scene?: Phaser.Scene | null) {
    const root = document.createElement('div');
    root.id = 'mc-combat-overlay';
    root.className = 'mc-modal mc-combat-overlay';
    this.el = root;
    HTMLCombatOverlay.layer.appendChild(this.el);
    this.scene = scene ?? null;
    this.buildDOM();
    this.hide();
  }

  setExpeditionContext(system: ExpeditionSystem, state: GameState): void {
    this.expSystem = system;
    this.expState = state;
  }

  setSoundManager(sm: SoundManager): void {
    this.soundManager = sm;
  }

  // ─── DOM Builder ──────────────────────────────────────────

  private buildDOM(): void {
    this.el.innerHTML = `
      <div class="mc-co-header">
        <div class="mc-co-title-group">
          <span class="mc-co-title">KAMPF</span>
          <span class="mc-co-room-info"></span>
        </div>
        <div class="mc-co-speed-group">
          <button class="mc-co-speed active" data-speed="1">x1</button>
          <button class="mc-co-speed" data-speed="1.5">x1.5</button>
          <button class="mc-co-speed" data-speed="2">x2</button>
        </div>
      </div>
      <div class="mc-co-air-shield" hidden style="
        display: flex; align-items: center; gap: 10px;
        padding: 4px 14px 5px;
        background: #071020;
        border-bottom: 1px solid #0d2a4a;
        flex-shrink: 0;
      ">
        <span style="font-size:13px; color:#90CAF9; white-space:nowrap;">🫁 Luft</span>
        <div style="flex:1; height:8px; background:#0a1a2a; border-radius:4px; overflow:hidden; min-width:80px;">
          <div class="mc-co-air-fill" style="height:100%; width:100%; background:#2196F3; border-radius:4px; transition:width 0.3s, background 0.3s;"></div>
        </div>
        <span class="mc-co-air-value" style="font-size:12px; color:#90CAF9; white-space:nowrap; min-width:60px; text-align:right;">100 / 100</span>
      </div>
      <div class="mc-co-fort-bar" hidden style="
        display: flex; align-items: center; gap: 10px;
        padding: 4px 14px 5px;
        background: #1a0a0a;
        border-bottom: 1px solid #4a1a0a;
        flex-shrink: 0;
      ">
        <span class="mc-co-fort-name" style="font-size:13px; color:#FF8C00; white-space:nowrap;">🏰 Festung</span>
        <div style="flex:1; height:8px; background:#2a1000; border-radius:4px; overflow:hidden; min-width:80px;">
          <div class="mc-co-fort-fill" style="height:100%; width:100%; background:#FF6600; border-radius:4px; transition:width 0.3s, background 0.3s;"></div>
        </div>
        <span class="mc-co-fort-value" style="font-size:12px; color:#FF8C00; white-space:nowrap; min-width:60px; text-align:right;">100 / 100</span>
      </div>
      <div class="mc-co-body">
        <div class="mc-co-party-col mc-co-col"></div>
        <div class="mc-co-enemy-col mc-co-col"></div>
      </div>
      <div class="mc-co-log-area">
        <div class="mc-co-log-header">Kampfprotokoll</div>
        <div class="mc-co-log-lines"></div>
      </div>
      <div class="mc-co-actions-area"></div>
    `;

    this.titleEl = this.el.querySelector('.mc-co-title')!;
    this.roomInfoEl = this.el.querySelector('.mc-co-room-info')!;
    this.partyColEl = this.el.querySelector('.mc-co-party-col')!;
    this.enemyColEl = this.el.querySelector('.mc-co-enemy-col')!;
    this.logLinesEl = this.el.querySelector('.mc-co-log-lines')!;
    this.actionsEl = this.el.querySelector('.mc-co-actions-area')!;
    this.airShieldEl = this.el.querySelector('.mc-co-air-shield');
    this.fortBarEl = this.el.querySelector('.mc-co-fort-bar');

    // Speed button wiring
    Array.from(this.el.querySelectorAll<HTMLElement>('.mc-co-speed')).forEach(btn => {
      btn.addEventListener('click', () => {
        this.combatSpeed = parseFloat(btn.dataset.speed ?? '1');
        this.updateSpeedButtons();
      });
    });
  }

  // ─── Show / Hide ──────────────────────────────────────────

  show(run: ExpeditionRun, roomIndex: number): void {
    this.phase = 'preview';
    this.preTargetEnemyId = null;
    this.clearTimers();
    this.selectedAbilities.clear();

    const room = run.rooms[roomIndex];
    const isBoss = room.type === 'boss';

    this.titleEl.textContent = isBoss ? 'BOSS KAMPF!' : 'KAMPF';
    this.titleEl.style.color = isBoss ? 'var(--mc-damage)' : 'var(--mc-accent-expedition)';
    this.roomInfoEl.textContent = `Raum ${roomIndex + 1} / ${run.rooms.length}`;

    // HP snapshot
    this.preHpMap.clear();
    for (const u of run.party) this.preHpMap.set(u.id, u.hp);
    for (const e of room.enemies) this.preHpMap.set(e.id, e.hp);

    this.expRun = run;
    this.previewRoom = room;

    // Air Shield (Unterwasser)
    const isUnderwater = ROUTE_DEFS[run.routeId]?.isUnderwater ?? false;
    if (this.airShieldEl) {
      if (isUnderwater) {
        this.airShieldEl.removeAttribute('hidden');
        this.airShieldEl.style.display = 'flex';
        this.updateAirDisplay(run.airShield ?? run.airShieldMax ?? 100, run.airShieldMax ?? 100);
      } else {
        this.airShieldEl.setAttribute('hidden', '');
        this.airShieldEl.style.display = 'none';
      }
    }

    // Fortification bar (Belagerung)
    const isFortRoom = room.type === 'fortification';
    if (this.fortBarEl) {
      if (isFortRoom && room.fortification) {
        this.fortBarEl.removeAttribute('hidden');
        this.fortBarEl.style.display = 'flex';
        const nameEl = this.fortBarEl.querySelector('.mc-co-fort-name') as HTMLElement | null;
        if (nameEl) nameEl.textContent = `🏰 ${room.fortification.name}`;
        this.updateFortDisplay(room.fortification.hp, room.fortification.maxHp);
      } else {
        this.fortBarEl.setAttribute('hidden', '');
        this.fortBarEl.style.display = 'none';
      }
    }

    this.clearDisplays();
    // Include war machine unit in party column if present
    const partyWithWM = run.warMachineUnit ? [...run.party, run.warMachineUnit] : run.party;
    this.buildPartyDisplays(partyWithWM);
    this.buildEnemyDisplays(room.enemies);
    this.updateLog([]);
    this.buildAbilitySection(run, room);
    this.buildItemSection(run, room);
    this.showPreviewActions();
    this.updateSpeedButtons();

    this.el.removeAttribute('hidden');
  }

  hide(): void {
    this.clearTimers();
    this.clearDisplays();
    this.el.setAttribute('hidden', '');
  }

  isVisible(): boolean {
    return !this.el.hasAttribute('hidden');
  }

  /** No-op: HTML panels are always screen-space. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* no-op */ }

  // ─── Speed Buttons ────────────────────────────────────────

  private updateSpeedButtons(): void {
    Array.from(this.el.querySelectorAll<HTMLElement>('.mc-co-speed')).forEach(btn => {
      const s = parseFloat(btn.dataset.speed ?? '1');
      btn.classList.toggle('active', s === this.combatSpeed);
    });
  }

  // ─── Air Shield Display ───────────────────────────────────

  private updateAirDisplay(current: number, max: number): void {
    if (!this.airShieldEl) return;
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    const fill = this.airShieldEl.querySelector('.mc-co-air-fill') as HTMLElement | null;
    const label = this.airShieldEl.querySelector('.mc-co-air-value') as HTMLElement | null;
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.style.background = pct > 50 ? '#2196F3' : pct > 25 ? '#FF9800' : '#F44336';
    }
    if (label) {
      label.textContent = `${Math.round(current)} / ${Math.round(max)}`;
      label.style.color = pct <= 0 ? '#F44336' : pct <= 25 ? '#FF9800' : '#90CAF9';
    }
  }

  // ─── Fortification Bar ────────────────────────────────────

  private updateFortDisplay(current: number, max: number): void {
    if (!this.fortBarEl) return;
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    const fill = this.fortBarEl.querySelector('.mc-co-fort-fill') as HTMLElement | null;
    const label = this.fortBarEl.querySelector('.mc-co-fort-value') as HTMLElement | null;
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.style.background = pct > 50 ? '#FF6600' : pct > 25 ? '#FF4400' : '#CC2200';
    }
    if (label) {
      label.textContent = `${Math.max(0, Math.round(current))} / ${Math.round(max)}`;
    }
  }

  // ─── Unit Displays ────────────────────────────────────────

  private buildPartyDisplays(party: CombatUnit[]): void {
    this.partyColEl.innerHTML = '';
    this.partyEntries = [];
    for (const unit of party) {
      const entry = this.createUnitCard(unit, false);
      this.partyColEl.appendChild(entry.el);
      this.partyEntries.push(entry);
    }
  }

  private buildEnemyDisplays(enemies: CombatUnit[]): void {
    this.enemyColEl.innerHTML = '';
    this.enemyEntries = [];
    for (const unit of enemies) {
      const entry = this.createUnitCard(unit, true);
      // Enemy targeting click
      entry.el.addEventListener('click', () => {
        if (this.phase !== 'preview') return;
        this.setPreCombatTarget(unit.id);
      });
      entry.el.style.cursor = 'pointer';
      entry.el.title = 'Klicken = Fokus-Ziel';
      this.enemyColEl.appendChild(entry.el);
      this.enemyEntries.push(entry);
    }
  }

  private createUnitCard(unit: CombatUnit, isEnemy: boolean): UnitEntry {
    const card = document.createElement('div');
    card.className = `mc-co-unit${unit.hp <= 0 ? ' is-dead' : ''}`;
    card.dataset.unitId = String(unit.id);

    // Sprite — 3-level fallback: spriteKey → classId → defId
    const resolvedSpriteKey = unit.spriteKey
      ?? (unit.classId ? CLASS_DEFS[unit.classId]?.spriteKey : undefined)
      ?? (unit.defId ? ENEMY_DEFS[unit.defId]?.spriteKey : undefined)
      ?? '';
    const spriteEl = document.createElement('img');
    spriteEl.className = 'mc-co-sprite';
    spriteEl.src = `/assets/sprites/final/${resolvedSpriteKey}.png`;
    spriteEl.width = 88;
    spriteEl.height = 88;
    spriteEl.onerror = () => {
      // Fallback: initials
      const fallback = document.createElement('div');
      fallback.className = 'mc-co-sprite-fallback';
      fallback.textContent = unit.name.substring(0, 2).toUpperCase();
      fallback.style.color = isEnemy ? 'var(--mc-damage)' : 'var(--mc-info)';
      card.replaceChild(fallback, spriteEl);
    };

    // Info block
    const info = document.createElement('div');
    info.className = 'mc-co-unit-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'mc-co-unit-name';
    nameEl.style.color = isEnemy ? 'var(--mc-damage)' : 'var(--mc-light)';
    nameEl.textContent = unit.name;

    const statsEl = document.createElement('div');
    statsEl.className = 'mc-co-unit-stats';
    statsEl.textContent = `ATK:${unit.atk} DEF:${unit.def} SPD:${unit.spd.toFixed(1)}`;

    const hpText = document.createElement('div');
    hpText.className = 'mc-co-unit-hp';
    hpText.textContent = `${Math.max(0, unit.hp)} / ${unit.maxHp}`;
    this.colorHpText(hpText, unit.hp, unit.maxHp);

    // HP bar
    const barTrack = document.createElement('div');
    barTrack.className = 'mc-bar-track mc-co-hp-bar';
    const hpFill = document.createElement('div');
    hpFill.className = 'mc-bar-fill mc-bar-hp';
    hpFill.style.width = `${unit.maxHp > 0 ? Math.min(100, Math.max(0, unit.hp) / unit.maxHp * 100) : 0}%`;
    barTrack.appendChild(hpFill);

    // Effect badges
    if (unit.specialEffects && unit.specialEffects.length > 0) {
      const badges = document.createElement('div');
      badges.className = 'mc-co-badges';
      for (const eff of unit.specialEffects) {
        const def = SPECIAL_EFFECT_DEFS[eff.id];
        if (!def) continue;
        const badge = document.createElement('span');
        badge.className = 'mc-co-badge';
        badge.textContent = def.name.substring(0, 3).toUpperCase();
        badges.appendChild(badge);
      }
      info.appendChild(badges);
    }

    info.appendChild(nameEl);
    info.appendChild(statsEl);
    info.appendChild(hpText);
    info.appendChild(barTrack);

    card.appendChild(spriteEl);
    card.appendChild(info);

    return { el: card, hpFill, hpText, unitId: unit.id };
  }

  private colorHpText(el: HTMLElement, hp: number, maxHp: number): void {
    const pct = maxHp > 0 ? hp / maxHp : 0;
    el.style.color = pct > 0.5 ? 'var(--mc-heal)' : pct > 0.2 ? 'var(--mc-gold-bright)' : 'var(--mc-damage)';
  }

  private setPreCombatTarget(enemyId: number): void {
    this.preTargetEnemyId = enemyId;
    for (const entry of this.enemyEntries) {
      entry.el.classList.toggle('is-targeted', entry.unitId === enemyId);
    }
    this.onPreCombatTarget?.(enemyId);
  }

  // ─── Preview: Actions ─────────────────────────────────────

  private showPreviewActions(): void {
    this.actionsEl.innerHTML = '';

    const focusHint = document.createElement('span');
    focusHint.className = 'mc-co-focus-hint';
    focusHint.textContent = 'Klick auf Gegner = Fokus';

    const fightBtn = document.createElement('button');
    fightBtn.className = 'mc-btn mc-co-fight-btn';
    fightBtn.textContent = 'Kampf starten!';
    fightBtn.addEventListener('click', () => {
      if (this.phase !== 'preview') return;
      this.phase = 'animating';
      // Apply queued ability selections
      const run = this.expRun;
      const room = this.previewRoom;
      if (this.expSystem && run && room) {
        for (const [unitId, skillId] of this.selectedAbilities) {
          this.expSystem.useAbilityInPreview(run, unitId, skillId, room);
        }
      }
      this.selectedAbilities.clear();
      // Preview-Sections aus den Spalten entfernen
      this.abilitiesAreaEl?.remove();
      this.abilitiesAreaEl = null;
      this.itemsAreaEl?.remove();
      this.itemsAreaEl = null;
      this.onFightClicked?.();
    });

    this.actionsEl.appendChild(focusHint);
    this.actionsEl.appendChild(fightBtn);
  }

  // ─── Preview: Abilities ───────────────────────────────────

  private buildAbilitySection(run: ExpeditionRun, room: EncounterRoom): void {
    // Alten Container entfernen falls vorhanden (bei Rebuild nach Toggle)
    this.abilitiesAreaEl?.remove();
    this.abilitiesAreaEl = null;

    const routeTier = ROUTE_DEFS[run.routeId]?.tier ?? 1;
    if (routeTier < 2) return;

    // Container direkt in linke Spalte (nach Einheiten-Karten)
    const area = document.createElement('div');
    area.className = 'mc-co-abilities-area';
    this.abilitiesAreaEl = area;
    this.partyColEl.appendChild(area);

    // ── Trennlinie + Header ──
    const divider = document.createElement('div');
    divider.className = 'mc-co-section-divider';
    divider.textContent = 'Fähigkeiten — 1× pro Mission wählbar';
    area.appendChild(divider);

    const cols = document.createElement('div');
    cols.className = 'mc-co-ability-cols';

    for (const unit of run.party) {
      if (unit.skills.length === 0) continue;

      const alreadyUsed = !!run.abilitiesUsed[unit.id];
      const isDead = unit.hp <= 0;
      const canInteract = !alreadyUsed && !isDead;

      const col = document.createElement('div');
      col.className = 'mc-co-ability-col';

      const heroName = document.createElement('div');
      heroName.className = 'mc-co-ability-hero';
      heroName.textContent = unit.name;
      heroName.style.color = isDead || alreadyUsed ? 'var(--mc-dim)' : 'var(--mc-gold)';
      col.appendChild(heroName);

      for (const skill of unit.skills) {
        const btn = this.createAbilityButton(unit, skill, alreadyUsed, isDead, canInteract, run, room);
        col.appendChild(btn);
      }

      cols.appendChild(col);
    }
    area.appendChild(cols);
  }

  private createAbilityButton(
    unit: CombatUnit, skill: CombatSkill,
    alreadyUsed: boolean, isDead: boolean, canInteract: boolean,
    run: ExpeditionRun, room: EncounterRoom,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'mc-co-ability-btn';
    btn.disabled = !canInteract;

    const isSelected = this.selectedAbilities.get(unit.id) === skill.id;

    if (isDead || alreadyUsed) {
      btn.classList.add('used');
      btn.textContent = alreadyUsed ? `✓ ${skill.name}` : skill.name;
    } else if (isSelected) {
      btn.classList.add('selected');
      btn.textContent = `▶ ${skill.name}`;
    } else {
      btn.textContent = skill.name;
    }

    if (canInteract) {
      // Tooltip on hover
      const tooltipLines = this.buildAbilityTooltip(skill);
      btn.title = tooltipLines.join('\n');

      btn.addEventListener('click', () => {
        if (this.phase !== 'preview') return;
        if (this.selectedAbilities.get(unit.id) === skill.id) {
          this.selectedAbilities.delete(unit.id);
        } else {
          this.selectedAbilities.set(unit.id, skill.id);
        }
        this.buildAbilitySection(run, room);
      });
    }

    return btn;
  }

  private buildAbilityTooltip(skill: CombatSkill): string[] {
    const effectLabels: Record<string, string> = {
      damage: 'Schaden', heal: 'Heilung', taunt: 'Provokation',
      buff: 'Buff', aoe: 'Flächenschaden', summon: 'Beschwörung',
    };
    const lines = [
      skill.name,
      `Typ: ${effectLabels[skill.effectType] ?? skill.effectType}`,
      `Cooldown: ${skill.cooldown} Runden`,
      `Stärke: ${skill.power}${skill.effectType === 'damage' || skill.effectType === 'aoe' ? '× ATK' : ''}`,
    ];
    for (const cls of Object.values(CLASS_DEFS)) {
      const found = cls.skills.find(s => s.id === skill.id);
      if (found?.description) { lines.push('', found.description); break; }
    }
    return lines;
  }

  // ─── Preview: Items ───────────────────────────────────────

  private buildItemSection(run: ExpeditionRun, room?: EncounterRoom): void {
    this.itemsAreaEl?.remove();
    this.itemsAreaEl = null;

    // ── Gegnerfähigkeiten → rechte Spalte ──
    if (room) {
      const hasEnemySkills = room.enemies.some(u => u.hp > 0 && u.skills.length > 0);
      if (hasEnemySkills) {
        const enemyArea = document.createElement('div');
        enemyArea.className = 'mc-co-items-area';
        this.enemyColEl.appendChild(enemyArea);

        const divider = document.createElement('div');
        divider.className = 'mc-co-section-divider';
        divider.style.color = 'var(--mc-damage)';
        divider.textContent = 'Gegnerfähigkeiten';
        enemyArea.appendChild(divider);

        for (const unit of room.enemies) {
          if (unit.hp <= 0) continue;
          for (const skill of unit.skills) {
            const line = document.createElement('div');
            line.className = 'mc-co-enemy-skill';
            line.textContent = `• ${unit.name.substring(0, 12)}: ${skill.name}`;
            enemyArea.appendChild(line);
          }
        }
      }
    }

    // ── Vorräte → linke Spalte (nach Fähigkeiten) ──
    const active = run.provisions.filter(p => p.qty > 0);
    if (active.length === 0) return;

    const area = document.createElement('div');
    area.className = 'mc-co-items-area';
    this.itemsAreaEl = area;
    this.partyColEl.appendChild(area);

    const provDivider = document.createElement('div');
    provDivider.className = 'mc-co-section-divider';
    provDivider.style.color = 'var(--mc-gold-bright)';
    provDivider.textContent = 'Vorräte — vor Kampf nutzbar';
    area.appendChild(provDivider);

    const row = document.createElement('div');
    row.className = 'mc-co-items-row';
    area.appendChild(row);

    run.provisions.forEach((prov, idx) => {
      if (prov.qty <= 0) return;
      const itemDef = ITEM_DEFS[prov.itemId as keyof typeof ITEM_DEFS];
      const name = (itemDef as { name?: string })?.name ?? prov.itemId;

      const card = document.createElement('div');
      card.className = 'mc-co-item-card';

      const itemImg = document.createElement('img');
      itemImg.src = `/assets/sprites/final/ITEM_${prov.itemId.toUpperCase()}.png`;
      itemImg.width = 22;
      itemImg.height = 22;
      itemImg.style.objectFit = 'contain';
      itemImg.onerror = () => itemImg.style.display = 'none';

      const itemQty = document.createElement('span');
      itemQty.className = 'mc-co-item-qty';
      itemQty.textContent = `×${prov.qty}`;

      const useBtn = document.createElement('button');
      useBtn.className = 'mc-btn success mc-co-use-btn';
      useBtn.textContent = 'Nutzen';
      useBtn.title = name;
      useBtn.addEventListener('click', () => {
        if (this.phase !== 'preview') return;
        if (!this.expSystem || !this.expState) return;
        this.expSystem.useProvision(this.expState, idx);
        this.refreshAfterProvision();
      });

      card.appendChild(itemImg);
      card.appendChild(itemQty);
      card.appendChild(useBtn);
      row.appendChild(card);
    });
  }

  private refreshAfterProvision(): void {
    const run = this.expRun;
    if (!run) return;
    // Update air shield display
    if (run.airShield !== undefined && (ROUTE_DEFS[run.routeId]?.isUnderwater)) {
      this.updateAirDisplay(run.airShield, run.airShieldMax ?? 100);
    }
    // Update HP bars
    for (const entry of this.partyEntries) {
      const unit = run.party.find(u => u.id === entry.unitId);
      if (!unit) continue;
      const pct = unit.maxHp > 0 ? Math.max(0, unit.hp) / unit.maxHp : 0;
      entry.hpFill.style.width = `${pct * 100}%`;
      entry.hpText.textContent = `${Math.max(0, unit.hp)} / ${unit.maxHp}`;
      this.colorHpText(entry.hpText, unit.hp, unit.maxHp);
      this.preHpMap.set(unit.id, unit.hp);
    }
    this.buildItemSection(run, this.previewRoom ?? undefined);
  }

  // ─── Combat Log ───────────────────────────────────────────

  private updateLog(lines: string[]): void {
    this.logLinesEl.innerHTML = '';
    for (const line of lines) {
      const span = document.createElement('div');
      span.className = 'mc-co-log-line';
      span.style.color = getLogLineColor(line);
      span.textContent = line;
      this.logLinesEl.appendChild(span);
    }
  }

  // ─── Animation: Combat Intro ──────────────────────────────

  startCombatAnimation(run: ExpeditionRun, room: EncounterRoom): void {
    this.phase = 'animating';
    this.actionsEl.innerHTML = '';

    const spd = this.combatSpeed;
    const isBoss = room.type === 'boss';

    this.playCombatIntro(isBoss, spd, () => {
      this.animateRounds(run, room, spd);
    });
  }

  private playCombatIntro(isBoss: boolean, spd: number, onDone: () => void): void {
    this.soundManager?.playSFX(isBoss ? 'boss_intro' : 'combat_sword');
    if (isBoss) this.scene?.cameras.main.shake(Math.round(400 / spd), 0.012);

    // Flash overlay
    const flash = document.createElement('div');
    flash.className = 'mc-co-intro-flash';
    flash.style.background = isBoss ? 'rgba(204,0,0,0.6)' : 'rgba(255,255,255,0.55)';
    flash.style.animationDuration = `${Math.round(600 / spd)}ms`;
    this.el.appendChild(flash);
    this.onAnimEnd(flash, () => flash.remove());

    // Intro title
    const title = document.createElement('div');
    title.className = 'mc-co-intro-title';
    title.textContent = isBoss ? 'BOSS KAMPF!' : 'KAMPF!';
    title.style.color = isBoss ? '#FF3333' : '#FFD700';
    const totalMs = Math.round(1100 / spd);
    title.style.animationDuration = `${totalMs}ms`;
    this.el.appendChild(title);
    this.onAnimEnd(title, () => title.remove());

    this.after(totalMs, onDone);
  }

  // ─── Animation: Round-by-Round ────────────────────────────

  private animateRounds(run: ExpeditionRun, room: EncounterRoom, spd: number): void {
    const snapshots = run.combatRoundSnapshots ?? [];
    // Include war machine in party units for HP animation
    const partyAll = run.warMachineUnit ? [...run.party, run.warMachineUnit] : run.party;

    if (snapshots.length === 0) {
      this.updateLog(run.combatLog.slice(-8));
      this.after(Math.round(400 / spd), () => this.showResult(run));
      return;
    }

    // Show round counter
    let roundCounterEl = this.el.querySelector<HTMLElement>('.mc-co-round-counter');
    if (!roundCounterEl) {
      roundCounterEl = document.createElement('div');
      roundCounterEl.className = 'mc-co-round-counter';
      this.el.querySelector('.mc-co-log-area')?.prepend(roundCounterEl);
    }

    const maxDisplay = Math.min(snapshots.length, 8);
    const displayRounds: CombatRoundSnapshot[] =
      snapshots.length > maxDisplay
        ? [...snapshots.slice(0, 4), ...snapshots.slice(-4)]
        : snapshots;

    let roundIdx = 0;

    const animateNextRound = () => {
      if (roundIdx >= displayRounds.length) {
        roundCounterEl?.remove();
        this.updateLog(run.combatLog.slice(-8));
        this.after(Math.round(300 / spd), () => this.showResult(run));
        return;
      }

      const snapshot = displayRounds[roundIdx];
      const isLastRound = roundIdx === displayRounds.length - 1;
      roundIdx++;

      // Pulse round counter
      if (roundCounterEl) {
        roundCounterEl.textContent = `Runde ${snapshot.round}`;
        roundCounterEl.classList.remove('pulse');
        // Force reflow for restart
        void roundCounterEl.offsetWidth;
        roundCounterEl.classList.add('pulse');
      }

      this.updateLog(snapshot.logLines.slice(-6));
      this.showActionBanners(snapshot.logLines, run.party, room.enemies);

      // Update fortification HP bar during siege rounds
      if (room.type === 'fortification' && room.fortification && snapshot.fortificationHp !== undefined) {
        this.updateFortDisplay(snapshot.fortificationHp, room.fortification.maxHp);
      }

      const atkDur = Math.round(180 / spd);

      // ── Phase 1: Party attack slide right ──
      const aliveParty = this.partyEntries.filter(e => {
        const prevSnap = roundIdx > 1 ? displayRounds[roundIdx - 2] : null;
        const hp = prevSnap ? (prevSnap.partyHp[e.unitId] ?? 0) : (this.preHpMap.get(e.unitId) ?? 1);
        return hp > 0;
      });

      if (aliveParty.length > 0) {
        this.soundManager?.playSFX('combat_sword');
        for (const entry of aliveParty) {
          this.slideUnit(entry.el, 'right', atkDur);
        }
      }

      // ── Phase 2: Enemy damage (after slide impact) ──
      this.after(atkDur + Math.round(80 / spd), () => {
        if (snapshot.hadCrit) this.scene?.cameras.main.shake(Math.round(120 / spd), 0.008);
        this.soundManager?.playSFX('combat_hit');
        this.showRoundDamage(
          room.enemies, this.enemyEntries, snapshot.enemyHp,
          roundIdx > 1 ? displayRounds[roundIdx - 2]?.enemyHp ?? null : null, spd,
        );
        this.animateHpBars(
          room.enemies, this.enemyEntries, snapshot.enemyHp,
          roundIdx > 1 ? displayRounds[roundIdx - 2]?.enemyHp ?? null : null,
        );
      });

      // ── Phase 3: Enemy attack slide left ──
      this.after(atkDur * 2 + Math.round(100 / spd), () => {
        const aliveEnemies = this.enemyEntries.filter(e => (snapshot.enemyHp[e.unitId] ?? 0) > 0);
        if (aliveEnemies.length > 0) {
          this.soundManager?.playSFX('combat_hit');
          for (const entry of aliveEnemies) {
            this.slideUnit(entry.el, 'left', atkDur);
          }
        }
      });

      // ── Phase 4: Party damage + death flash ──
      this.after(atkDur * 3 + Math.round(180 / spd), () => {
        this.showRoundDamage(
          partyAll, this.partyEntries, snapshot.partyHp,
          roundIdx > 1 ? displayRounds[roundIdx - 2]?.partyHp ?? null : null, spd,
        );
        this.animateHpBars(
          partyAll, this.partyEntries, snapshot.partyHp,
          roundIdx > 1 ? displayRounds[roundIdx - 2]?.partyHp ?? null : null,
        );

        if (snapshot.hadDeath) {
          if (snapshot.hadDeath) this.scene?.cameras.main.shake(Math.round(200 / spd), 0.01);
          this.flashDeadUnits(partyAll, this.partyEntries, snapshot.partyHp,
            roundIdx > 1 ? displayRounds[roundIdx - 2]?.partyHp ?? null : null, spd);
          this.flashDeadUnits(room.enemies, this.enemyEntries, snapshot.enemyHp,
            roundIdx > 1 ? displayRounds[roundIdx - 2]?.enemyHp ?? null : null, spd);
        }

        // ── Next round or result ──
        const pauseDelay = Math.round(300 / spd);
        if (isLastRound) {
          this.after(Math.round(400 / spd), () => this.showResult(run));
        } else {
          this.after(pauseDelay, () => {
            this.showRoundContinueButton(animateNextRound);
          });
        }
      });
    };

    animateNextRound();
  }

  private slideUnit(el: HTMLElement, dir: 'right' | 'left', dur: number): void {
    const cls = dir === 'right' ? 'mc-co-slide-right' : 'mc-co-slide-left';
    el.style.setProperty('--co-slide-dur', `${dur * 2}ms`);
    el.classList.remove('mc-co-slide-right', 'mc-co-slide-left');
    void el.offsetWidth; // reflow
    el.classList.add(cls);
    this.onAnimEnd(el, () => el.classList.remove(cls));
  }

  // ─── Animation: Floaty Damage ─────────────────────────────

  private showRoundDamage(
    units: CombatUnit[], entries: UnitEntry[],
    currentHp: Record<number, number>, prevHp: Record<number, number> | null,
    spd: number,
  ): void {
    for (const entry of entries) {
      const unit = units.find(u => u.id === entry.unitId);
      if (!unit) continue;
      const curHp = currentHp[unit.id] ?? 0;
      const preHp = prevHp ? (prevHp[unit.id] ?? unit.maxHp) : (this.preHpMap.get(unit.id) ?? unit.maxHp);
      const diff = preHp - curHp;
      if (diff === 0) continue;

      const floaty = document.createElement('div');
      floaty.className = 'mc-co-floaty';
      floaty.textContent = diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`;
      floaty.style.color = diff > 0 ? 'var(--mc-damage)' : 'var(--mc-heal)';
      floaty.style.fontSize = Math.abs(diff) >= 20 ? '22px' : Math.abs(diff) >= 10 ? '18px' : '16px';
      floaty.style.animationDuration = `${Math.round(900 / spd)}ms`;

      // Position relative to unit card
      const rect = entry.el.getBoundingClientRect();
      const panelRect = this.el.getBoundingClientRect();
      floaty.style.left = `${rect.left - panelRect.left + 24}px`;
      floaty.style.top = `${rect.top - panelRect.top}px`;

      this.el.appendChild(floaty);
      this.onAnimEnd(floaty, () => floaty.remove());
    }
  }

  // ─── Animation: HP Bar Update ─────────────────────────────

  private animateHpBars(
    units: CombatUnit[], entries: UnitEntry[],
    currentHp: Record<number, number>, prevHp: Record<number, number> | null,
  ): void {
    for (const entry of entries) {
      const unit = units.find(u => u.id === entry.unitId);
      if (!unit) continue;
      const curHp = Math.max(0, currentHp[unit.id] ?? 0);
      const pct = unit.maxHp > 0 ? curHp / unit.maxHp : 0;
      entry.hpFill.style.width = `${pct * 100}%`; // CSS transition handles animation
      entry.hpText.textContent = `${curHp} / ${unit.maxHp}`;
      this.colorHpText(entry.hpText, curHp, unit.maxHp);
      if (curHp <= 0) entry.el.classList.add('is-dead');
    }
  }

  // ─── Animation: Death Flash ───────────────────────────────

  private flashDeadUnits(
    units: CombatUnit[], entries: UnitEntry[],
    currentHp: Record<number, number>, prevHp: Record<number, number> | null,
    spd: number,
  ): void {
    for (const entry of entries) {
      const unit = units.find(u => u.id === entry.unitId);
      if (!unit) continue;
      const curHp = currentHp[unit.id] ?? 0;
      const preHp = prevHp ? (prevHp[unit.id] ?? unit.maxHp) : (this.preHpMap.get(unit.id) ?? unit.maxHp);
      if (preHp > 0 && curHp <= 0) {
        const flash = document.createElement('div');
        flash.className = 'mc-co-death-flash';
        flash.style.animationDuration = `${Math.round(400 / spd)}ms`;
        entry.el.appendChild(flash);
        this.onAnimEnd(flash, () => flash.remove());

        if (unit.isPlayer) this.soundManager?.playSFX('party_wipe');
      }
    }
  }

  // ─── Animation: Action Banners ────────────────────────────

  private showActionBanners(lines: string[], partyUnits: CombatUnit[], enemyUnits: CombatUnit[]): void {
    const usesPattern = /^(.+?) uses (.+?) →/;
    const setztPattern = /^(.+?) setzt (.+?) ein →/;
    const enragePattern = /^!! (.+?) ENRAGE !!$/;

    for (const line of lines) {
      let unitName: string | null = null;
      let bannerText: string | null = null;
      let bannerColor = 'var(--mc-info)';

      const usesMatch = line.match(usesPattern);
      const setztMatch = line.match(setztPattern);
      const enrageMatch = line.match(enragePattern);

      if (usesMatch) {
        unitName = usesMatch[1].trim();
        bannerText = usesMatch[2].trim().toUpperCase();
        bannerColor = '#ef9a9a';
      } else if (setztMatch) {
        unitName = setztMatch[1].trim();
        bannerText = setztMatch[2].trim().toUpperCase();
        bannerColor = '#64b5f6';
      } else if (enrageMatch) {
        unitName = enrageMatch[1].trim();
        bannerText = '⚡ ENRAGE! ⚡';
        bannerColor = 'var(--mc-damage)';
      }

      if (!unitName || !bannerText) continue;

      let targetEntry: UnitEntry | undefined;
      const enemyUnit = enemyUnits.find(u => u.name === unitName);
      if (enemyUnit) targetEntry = this.enemyEntries.find(e => e.unitId === enemyUnit.id);
      if (!targetEntry) {
        const partyUnit = partyUnits.find(u => u.name === unitName);
        if (partyUnit) targetEntry = this.partyEntries.find(e => e.unitId === partyUnit.id);
      }
      if (!targetEntry) continue;

      const banner = document.createElement('div');
      banner.className = 'mc-co-action-banner';
      banner.textContent = bannerText;
      banner.style.color = bannerColor;

      const rect = targetEntry.el.getBoundingClientRect();
      const panelRect = this.el.getBoundingClientRect();
      banner.style.left = `${rect.left - panelRect.left + rect.width / 2}px`;
      banner.style.top = `${rect.top - panelRect.top - 28}px`;
      banner.style.transform = 'translateX(-50%)';

      this.el.appendChild(banner);
      this.onAnimEnd(banner, () => banner.remove());
    }
  }

  // ─── Round Continue Button ────────────────────────────────

  private showRoundContinueButton(onContinue: () => void): void {
    this.actionsEl.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'mc-btn mc-co-continue-btn';
    btn.textContent = 'Nächste Runde →';
    btn.addEventListener('click', () => {
      this.actionsEl.innerHTML = '';
      onContinue();
    });
    this.actionsEl.appendChild(btn);
  }

  // ─── State: Result ────────────────────────────────────────

  private showResult(run: ExpeditionRun): void {
    this.phase = 'result';
    this.actionsEl.innerHTML = '';

    const isOver = run.status !== 'exploring';

    if (isOver) {
      if (run.status === 'victory') this.soundManager?.playSFX('boss_victory');
      else if (run.status === 'defeat') this.soundManager?.playSFX('party_wipe');
      else this.soundManager?.playSFX('retreat_horn');

      // Camera shake
      if (run.status === 'victory') this.scene?.cameras.main.shake(300, 0.006);
      else if (run.status === 'defeat') this.scene?.cameras.main.shake(500, 0.015);

      // Outcome text
      const outcomeText = run.status === 'victory' ? 'SIEG!'
        : run.status === 'defeat' ? 'NIEDERLAGE...'
        : 'RÜCKZUG';
      const outcomeColor = run.status === 'victory' ? 'var(--mc-heal)'
        : run.status === 'defeat' ? 'var(--mc-damage)'
        : 'var(--mc-gold-bright)';

      const outcome = document.createElement('div');
      outcome.className = 'mc-co-outcome';
      outcome.textContent = outcomeText;
      outcome.style.color = outcomeColor;
      this.actionsEl.appendChild(outcome);
    } else {
      const cleared = document.createElement('div');
      cleared.className = 'mc-co-room-cleared';
      cleared.textContent = 'Raum geschafft!';
      this.actionsEl.appendChild(cleared);
    }

    const label = isOver ? 'Einsammeln & Schließen' : 'Weiter';
    const btn = document.createElement('button');
    btn.className = 'mc-btn mc-co-continue-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (this.phase !== 'result') return;
      this.hide();
      this.onComplete?.();
    });
    this.actionsEl.appendChild(btn);
  }

  // ─── Cleanup ──────────────────────────────────────────────

  private clearDisplays(): void {
    this.partyColEl.innerHTML = '';
    this.enemyColEl.innerHTML = '';
    this.partyEntries = [];
    this.enemyEntries = [];
    this.logLinesEl.innerHTML = '';
    this.actionsEl.innerHTML = '';
    this.abilitiesAreaEl = null;
    this.itemsAreaEl = null;
    // Remove floaty/banner/flash elements
    this.el.querySelectorAll('.mc-co-floaty, .mc-co-action-banner, .mc-co-intro-flash, .mc-co-intro-title, .mc-co-round-counter').forEach(el => el.remove());
  }

  private clearTimers(): void {
    for (const id of this.timers) clearTimeout(id);
    this.timers = [];
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private onAnimEnd(el: HTMLElement, fn: () => void): void {
    const handler = () => { el.removeEventListener('animationend', handler); fn(); };
    el.addEventListener('animationend', handler);
  }

  destroy(): void {
    this.clearTimers();
    this.el.remove();
  }

  /** No-op für updatePositions() Kompatibilität. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  refresh(_state: unknown): void { /* no-op */ }
}
