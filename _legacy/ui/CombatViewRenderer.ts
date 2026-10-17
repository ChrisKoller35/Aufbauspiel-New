// ============================================================
// Magic City – CombatViewRenderer
// Verwaltet den gesamten Inline-Combat-View inkl. State.
// Extrahiert aus HTMLExpeditionUI für bessere Trennung.
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { ExpeditionRun, CombatUnit, EncounterRoom } from '../../models/ExpeditionRun';
import { CLASS_DEFS } from '../../data/classes';
import { ENEMY_DEFS } from '../../data/enemies';
import { ITEM_DEFS } from '../../data/items';
import { ROUTE_DEFS } from '../../data/routes';
import { ExpeditionSystem } from '../../systems/ExpeditionSystem';
import { buildSectionHeader, makeButton, makeSmallButton, hpBarClass } from './ExpeditionUIHelpers';
import type { ExpeditionOverviewRenderer } from './ExpeditionOverviewRenderer';

export type CombatPhase = 'none' | 'preview' | 'fighting' | 'result';

export class CombatViewRenderer {
  // ── State ─────────────────────────────────────────────────
  combatPhase: CombatPhase = 'none';
  combatRoomIndex = -1;
  readonly selectedAbilities = new Map<number, string>(); // unitId → skillId
  readonly preHpSnapshot = new Map<number, number>();     // unitId → HP vor Kampf
  private fightingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly expSys: ExpeditionSystem,
    private readonly overviewRenderer: ExpeditionOverviewRenderer,
    private readonly onHide: () => void,
    private readonly onRefresh: (state: GameState) => void,
  ) {}

  // ─── State Reset ──────────────────────────────────────────

  reset(): void {
    this.combatPhase = 'none';
    this.combatRoomIndex = -1;
    this.selectedAbilities.clear();
    this.preHpSnapshot.clear();
    if (this.fightingTimer) {
      clearTimeout(this.fightingTimer);
      this.fightingTimer = null;
    }
  }

  // ─── Haupt-Einstiegspunkt ─────────────────────────────────

  /**
   * Baut die Kampf-Vorschau oder das Kampf-Ergebnis im selben Panel auf.
   * Ersetzt mainColsEl, logEl, actionsEl mit kampfspezifischem Inhalt.
   */
  buildCombatView(
    mainColsEl: HTMLElement,
    roomStripEl: HTMLElement,
    logEl: HTMLElement,
    actionsEl: HTMLElement,
    run: ExpeditionRun,
    state: GameState,
    room: EncounterRoom,
    roomIndex: number,
  ): void {
    const isBoss = room.type === 'boss';

    // Room strip bleibt
    this.overviewRenderer.buildRoomStrip(roomStripEl, run);

    // ── Hauptbereich: Party links, Gegner rechts ──
    mainColsEl.innerHTML = '';
    mainColsEl.style.gridTemplateColumns = '1fr 1fr';

    // Titel
    const titleRow = HTMLPanel.el('div');
    titleRow.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 4px 0 8px;';
    const titleEl = HTMLPanel.el('div', isBoss ? 'mc-label-damage mc-bold' : 'mc-label-gold mc-bold');
    titleEl.style.fontSize = '16px';
    if (this.combatPhase === 'fighting') {
      titleEl.textContent = isBoss ? '⚔ BOSS KAMPF! ⚔' : '⚔ KAMPF ⚔';
      titleEl.style.animation = 'mc-combat-pulse 0.6s ease-in-out infinite';
    } else {
      titleEl.textContent = isBoss ? '⚔ BOSS KAMPF! ⚔' : '⚔ KAMPF ⚔';
    }
    titleRow.appendChild(titleEl);
    const roomInfo = HTMLPanel.el('div', 'mc-label-dim mc-text-sm');
    roomInfo.textContent = `Raum ${roomIndex + 1} / ${run.rooms.length}`;
    titleRow.appendChild(roomInfo);
    mainColsEl.appendChild(titleRow);

    // Inject combat animation keyframes (einmalig)
    if (!document.getElementById('mc-combat-anims')) {
      const style = document.createElement('style');
      style.id = 'mc-combat-anims';
      style.textContent = `
        @keyframes mc-attack-right {
          0%   { transform: translateX(0); }
          30%  { transform: translateX(20px); }
          50%  { transform: translateX(20px) scale(1.05); }
          70%  { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
        @keyframes mc-attack-left {
          0%   { transform: translateX(0); }
          30%  { transform: translateX(-20px); }
          50%  { transform: translateX(-20px) scale(1.05); }
          70%  { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
        @keyframes mc-damage-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-4px); }
          30% { transform: translateX(4px); }
          45% { transform: translateX(-3px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }
        @keyframes mc-damage-flash {
          0%   { background: transparent; }
          20%  { background: rgba(255, 60, 60, 0.3); }
          100% { background: transparent; }
        }
        @keyframes mc-combat-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
        @keyframes mc-dmg-float {
          0%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes mc-hp-drain {
          from { filter: brightness(1.5); }
          to   { filter: brightness(1); }
        }
      `;
      document.head.appendChild(style);
    }

    // Linke Spalte: Party
    const leftCol = HTMLPanel.el('div');
    leftCol.style.cssText = 'padding-right: 12px; border-right: 1px solid #2a1a20; display: flex; flex-direction: column; gap: 4px;';
    leftCol.appendChild(buildSectionHeader('Dein Team', 'mc-label-info'));
    for (let idx = 0; idx < run.party.length; idx++) {
      const unit = run.party[idx];
      const row = this.buildCombatUnitRow(unit, false, run);
      // Kampf-Animationen
      if (this.combatPhase === 'fighting' && unit.hp > 0) {
        const delay = idx * 0.25;
        row.style.animation = `mc-attack-right 0.6s ease ${delay}s`;
      }
      if (this.combatPhase === 'fighting') {
        const preHp = this.preHpSnapshot.get(unit.id) ?? unit.maxHp;
        if (unit.hp < preHp) {
          // Schaden erhalten → Shake + Flash nach Delay
          const dmgDelay = 0.8 + idx * 0.15;
          row.style.animation = `mc-damage-shake 0.5s ease ${dmgDelay}s, mc-damage-flash 0.5s ease ${dmgDelay}s`;
        }
      }
      leftCol.appendChild(row);
    }
    mainColsEl.appendChild(leftCol);

    // Rechte Spalte: Gegner
    const rightCol = HTMLPanel.el('div');
    rightCol.style.cssText = 'padding-left: 12px; display: flex; flex-direction: column; gap: 4px;';
    rightCol.appendChild(buildSectionHeader('Gegner', 'mc-label-damage'));
    for (let idx = 0; idx < room.enemies.length; idx++) {
      const enemy = room.enemies[idx];
      const isFocused = run.focusTarget?.enemyId === enemy.id;
      const row = this.buildCombatUnitRow(enemy, true, run, isFocused);

      // Kampf-Animationen für Gegner
      if (this.combatPhase === 'fighting') {
        const preHp = this.preHpSnapshot.get(enemy.id) ?? enemy.maxHp;
        if (enemy.hp < preHp) {
          // Gegner bekommt Schaden → Shake + Flash
          const dmgDelay = 0.3 + idx * 0.2;
          row.style.animation = `mc-damage-shake 0.5s ease ${dmgDelay}s, mc-damage-flash 0.5s ease ${dmgDelay}s`;
        }
        if (enemy.hp > 0) {
          // Gegner greift an (nach Party-Angriff)
          const atkDelay = 0.7 + idx * 0.25;
          // Nur Attack-Animation wenn nicht schon Shake hat
          if (enemy.hp >= preHp) {
            row.style.animation = `mc-attack-left 0.6s ease ${atkDelay}s`;
          }
        }
      }

      // Fokus-Target klickbar (nur im Preview)
      if (this.combatPhase === 'preview' && enemy.hp > 0 && run.focusTargetCooldown === 0) {
        row.style.cursor = 'pointer';
        row.title = 'Klicken um Fokus-Ziel zu setzen';
        row.addEventListener('click', () => {
          this.expSys.setFocusTarget(run, enemy.id);
          this.buildCombatView(mainColsEl, roomStripEl, logEl, actionsEl, run, state, room, roomIndex);
        });
        row.addEventListener('mouseenter', () => { row.style.background = '#2a1520'; });
        row.addEventListener('mouseleave', () => { row.style.background = ''; });
      }
      rightCol.appendChild(row);
    }
    mainColsEl.appendChild(rightCol);

    // ── Fähigkeiten-Sektion (nur Preview, nur ab Tier 2) ──
    if (this.combatPhase === 'preview') {
      const routeTier = ROUTE_DEFS[run.routeId]?.tier ?? 1;
      if (routeTier >= 2) {
        const abilitySection = this.buildAbilitySection(run, room, state, roomIndex, mainColsEl, logEl, actionsEl, roomStripEl);
        if (abilitySection) {
          // Füge als volle Zeile unter Party/Gegner ein
          abilitySection.style.gridColumn = '1 / -1';
          mainColsEl.appendChild(abilitySection);
        }
      }

      // Proviant-Sektion im Preview (vor Kampf nutzbar)
      const provSection = this.buildCombatProviantSection(run, state, room, roomIndex, mainColsEl, logEl, actionsEl, roomStripEl);
      if (provSection) {
        provSection.style.gridColumn = '1 / -1';
        mainColsEl.appendChild(provSection);
      }
    }

    // ── Log ──
    this.overviewRenderer.buildLog(logEl, run);

    // ── Aktions-Buttons ──
    actionsEl.innerHTML = '';

    if (this.combatPhase === 'preview') {
      // "Kampf starten!" Button
      const fightBtn = makeButton('⚔ Kampf starten!', 'expedition', () => {
        // Fähigkeiten anwenden
        for (const [unitId, skillId] of this.selectedAbilities) {
          this.expSys.useAbilityInPreview(run, unitId, skillId, room);
        }
        this.selectedAbilities.clear();

        // Kampf verarbeiten (Ergebnis steht danach in run)
        this.expSys.processCurrentRoom(state);

        // In Kampf-Animations-Phase wechseln
        this.combatPhase = 'fighting';
        this.buildCombatView(mainColsEl, roomStripEl, logEl, actionsEl, run, state, room, roomIndex);
      });
      fightBtn.style.fontSize = '15px';
      fightBtn.style.padding = '8px 24px';
      actionsEl.appendChild(fightBtn);

    } else if (this.combatPhase === 'fighting') {
      // Kampf-Animation läuft – "Kämpfe..." Label + automatischer Übergang
      const fightingLabel = HTMLPanel.el('div', 'mc-label-bright mc-bold');
      fightingLabel.style.cssText = 'width: 100%; text-align: center; font-size: 14px;';
      fightingLabel.textContent = '⚔ Kampf läuft...';
      actionsEl.appendChild(fightingLabel);

      // Nach Animations-Dauer automatisch zu Result wechseln
      if (this.fightingTimer) clearTimeout(this.fightingTimer);
      this.fightingTimer = setTimeout(() => {
        this.fightingTimer = null;
        this.combatPhase = 'result';
        this.buildCombatView(mainColsEl, roomStripEl, logEl, actionsEl, run, state, room, roomIndex);
      }, 2200);

    } else if (this.combatPhase === 'result') {
      // Ergebnis-Zusammenfassung
      const isOver = run.status !== 'exploring';
      if (isOver) {
        const outcomeText = run.status === 'victory' ? '🏆 SIEG!'
          : run.status === 'defeat' ? '💀 NIEDERLAGE...'
          : '🏳 RÜCKZUG';
        const outcomeClass = run.status === 'victory' ? 'mc-label-heal'
          : run.status === 'defeat' ? 'mc-label-damage'
          : 'mc-label-bright';
        const outcomeEl = HTMLPanel.el('div', `mc-bold ${outcomeClass}`);
        outcomeEl.style.cssText = 'width: 100%; text-align: center; font-size: 16px; margin-bottom: 6px;';
        outcomeEl.textContent = outcomeText;
        actionsEl.appendChild(outcomeEl);
      }

      // Schadens-Zusammenfassung
      const dmgSummary = this.buildDamageSummary(run, room);
      if (dmgSummary) actionsEl.appendChild(dmgSummary);

      const continueLabel = isOver ? 'Einsammeln & Schließen' : 'Weiter';
      const continueVariant = isOver ? 'success' as const : 'expedition' as const;
      const continueBtn = makeButton(continueLabel, continueVariant, () => {
        this.combatPhase = 'none';
        if (isOver) {
          this.onHide();
        } else {
          this.onRefresh(state);
        }
      });
      actionsEl.appendChild(continueBtn);
    }
  }

  // ─── Kampf-Unit-Zeile (erweitert mit SPD + Spezialeffekte) ──

  private buildCombatUnitRow(unit: CombatUnit, isEnemy: boolean, run: ExpeditionRun, isFocused = false): HTMLElement {
    const alive = unit.hp > 0;
    const hpPct = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
    const preHp = this.preHpSnapshot.get(unit.id);
    const hpDiff = preHp !== undefined ? preHp - unit.hp : 0;

    const row = HTMLPanel.el('div');
    row.style.cssText = [
      'border-radius: 4px',
      'padding: 4px 6px',
      'display: flex',
      'align-items: center',
      'gap: 6px',
      'transition: background 0.15s',
      isFocused ? 'background: #2a1520; border: 1px solid var(--mc-gold)' : '',
    ].filter(Boolean).join('; ');

    // Portrait
    const spriteKey = unit.spriteKey
      ?? (unit.classId ? CLASS_DEFS[unit.classId]?.spriteKey : undefined)
      ?? (isEnemy && unit.defId ? ENEMY_DEFS[unit.defId]?.spriteKey : undefined)
      ?? (isEnemy ? `ENEMY_${unit.name.toUpperCase().replace(/[\s-]+/g, '_')}` : undefined);
    if (spriteKey) {
      const icon = HTMLPanel.icon(spriteKey, 80);
      icon.style.cssText = [
        'border-radius: 4px',
        'background: rgba(0,0,0,0.4)',
        'flex-shrink: 0',
        'border: 2px solid ' + (isFocused ? 'var(--mc-gold)' : isEnemy ? '#4a2020' : '#1a2a3a'),
        alive ? '' : 'opacity: 0.3; filter: grayscale(1)',
      ].filter(Boolean).join('; ');
      icon.onerror = () => { icon.style.display = 'none'; };
      row.appendChild(icon);
    }

    // Info column
    const infoCol = HTMLPanel.el('div');
    infoCol.style.cssText = 'flex: 1; min-width: 0;';

    // Name + Stats
    const nameRow = HTMLPanel.el('div');
    nameRow.style.cssText = 'display: flex; justify-content: space-between; align-items: baseline; gap: 4px;';

    const prefix = isFocused ? '▶ ' : !alive ? '[X] ' : '';
    const nameClass = !alive ? 'mc-label-dim mc-text-md'
      : isFocused ? 'mc-label-bright mc-bold mc-text-md'
      : isEnemy ? 'mc-label-damage mc-text-md'
      : 'mc-text-md';
    const nameEl = HTMLPanel.el('span', nameClass);
    nameEl.textContent = prefix + unit.name;
    nameRow.appendChild(nameEl);

    if (alive) {
      const statsEl = HTMLPanel.el('span', 'mc-text-sm');
      const hpColor = hpPct > 0.5 ? 'var(--mc-hp)' : hpPct > 0.2 ? 'var(--mc-gold-bright)' : 'var(--mc-damage)';
      statsEl.style.cssText = `color: ${hpColor}; white-space: nowrap;`;
      statsEl.textContent = `${Math.max(0, unit.hp)}/${unit.maxHp}  A:${unit.atk} D:${unit.def} S:${unit.spd.toFixed(1)}`;
      nameRow.appendChild(statsEl);
    }
    infoCol.appendChild(nameRow);

    // HP bar + Schadensänderung
    if (alive || (this.combatPhase === 'result' && preHp !== undefined && preHp > 0)) {
      const barRow = HTMLPanel.el('div');
      barRow.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-top: 2px;';
      const bar = HTMLPanel.statBar(Math.max(0, unit.hp), unit.maxHp, hpBarClass(hpPct));
      bar.style.flex = '1';

      // CSS-Transition auf dem Fill-Balken
      const fill = bar.querySelector('.mc-bar-fill') as HTMLElement;
      if (fill && this.combatPhase === 'result') {
        fill.style.transition = 'width 0.6s ease-out';
      }

      barRow.appendChild(bar);

      // Schadensanzeige nach Kampf
      if (this.combatPhase === 'result' && hpDiff !== 0) {
        const dmgEl = HTMLPanel.el('span', 'mc-text-sm mc-bold');
        dmgEl.style.cssText = hpDiff > 0
          ? 'color: var(--mc-damage); white-space: nowrap;'
          : 'color: var(--mc-hp); white-space: nowrap;';
        dmgEl.textContent = hpDiff > 0 ? `-${hpDiff}` : `+${Math.abs(hpDiff)}`;
        barRow.appendChild(dmgEl);
      }
      infoCol.appendChild(barRow);
    }

    // Spezialeffekte (Badges)
    if (unit.specialEffects && unit.specialEffects.length > 0 && alive) {
      const badgeRow = HTMLPanel.el('div');
      badgeRow.style.cssText = 'display: flex; gap: 3px; margin-top: 2px; flex-wrap: wrap;';
      for (const eff of unit.specialEffects) {
        const badge = HTMLPanel.el('span', 'mc-text-xs');
        badge.style.cssText = 'background: #333; color: #ffd700; padding: 1px 4px; border-radius: 2px; font-size: 10px;';
        badge.textContent = eff.id.substring(0, 8);
        badge.title = eff.id;
        badgeRow.appendChild(badge);
      }
      infoCol.appendChild(badgeRow);
    }

    row.appendChild(infoCol);
    return row;
  }

  // ─── Fähigkeiten-Sektion (Preview-Phase) ─────────────────

  private buildAbilitySection(
    run: ExpeditionRun,
    room: EncounterRoom,
    state: GameState,
    roomIndex: number,
    mainColsEl: HTMLElement,
    logEl: HTMLElement,
    actionsEl: HTMLElement,
    roomStripEl: HTMLElement,
  ): HTMLElement | null {
    const partyWithSkills = run.party.filter(u => u.skills.length > 0);
    const enemiesWithSkills = room.enemies.filter(e => e.hp > 0 && e.skills.length > 0);
    if (partyWithSkills.length === 0 && enemiesWithSkills.length === 0) return null;

    const section = HTMLPanel.el('div');
    section.style.cssText = 'padding: 8px 0 4px; border-top: 1px solid #2a1a20;';

    // Header
    section.appendChild(buildSectionHeader('Fähigkeiten (1× pro Expedition)', 'mc-label-info'));

    const grid = HTMLPanel.el('div');
    grid.style.cssText = 'display: flex; gap: 16px; flex-wrap: wrap; margin-top: 4px;';

    // Helden-Fähigkeiten
    for (const unit of partyWithSkills) {
      const alreadyUsed = !!run.abilitiesUsed[unit.id];
      const isDead = unit.hp <= 0;
      const canInteract = !alreadyUsed && !isDead;

      const col = HTMLPanel.el('div');
      col.style.cssText = 'display: flex; flex-direction: column; gap: 3px; min-width: 120px;';

      const headerEl = HTMLPanel.el('div', `mc-text-sm mc-bold ${isDead ? 'mc-label-dim' : alreadyUsed ? 'mc-label-dim' : 'mc-label-gold'}`);
      headerEl.textContent = unit.name;
      col.appendChild(headerEl);

      for (const skill of unit.skills) {
        const isSelected = this.selectedAbilities.get(unit.id) === skill.id;

        const btn = document.createElement('button');
        btn.className = 'mc-btn';
        btn.textContent = (isSelected ? '▶ ' : '') + skill.name + (alreadyUsed ? ' ✓' : '');

        if (!canInteract) {
          btn.disabled = true;
          btn.style.cssText = 'opacity: 0.4; cursor: default; font-size: 11px; padding: 2px 8px;';
        } else if (isSelected) {
          btn.style.cssText = 'border-color: var(--mc-gold); color: var(--mc-gold-bright); background: #3a2a10; font-size: 11px; padding: 2px 8px; position: relative;';
        } else {
          btn.style.cssText = 'border-color: #4A90D8; color: #ddd; background: #1E2A3A; font-size: 11px; padding: 2px 8px; position: relative;';
        }

        // Ability tooltip on hover
        const classDef = CLASS_DEFS[unit.classId ?? ''];
        const skillDef = classDef?.skills.find(s => s.id === skill.id);
        if (skillDef) {
          const effectLabels: Record<string, string> = {
            damage: 'Schaden', heal: 'Heilung', taunt: 'Provokation',
            buff: 'Buff', aoe: 'Flächenschaden', summon: 'Beschwörung',
          };
          const tipLines = [
            skillDef.name,
            `Typ: ${effectLabels[skillDef.effectType] ?? skillDef.effectType} · CD: ${skillDef.cooldown} Runden`,
            `Stärke: ${skillDef.power}${skillDef.effectType === 'damage' || skillDef.effectType === 'aoe' ? '× ATK' : ''}`,
          ];
          if (skillDef.description) tipLines.push(skillDef.description);
          btn.title = tipLines.join('\n');
        }

        if (canInteract) {
          btn.addEventListener('click', () => {
            if (this.selectedAbilities.get(unit.id) === skill.id) {
              this.selectedAbilities.delete(unit.id);
            } else {
              this.selectedAbilities.set(unit.id, skill.id);
            }
            this.buildCombatView(mainColsEl, roomStripEl, logEl, actionsEl, run, state, room, roomIndex);
          });
        }
        col.appendChild(btn);
      }
      grid.appendChild(col);
    }

    // Gegner-Fähigkeiten (nur Anzeige)
    if (enemiesWithSkills.length > 0) {
      const enemyCol = HTMLPanel.el('div');
      enemyCol.style.cssText = 'display: flex; flex-direction: column; gap: 2px; min-width: 120px; margin-left: auto;';
      const enemyHeader = HTMLPanel.el('div', 'mc-text-sm mc-bold mc-label-damage');
      enemyHeader.textContent = 'Gegner-Fähigkeiten';
      enemyCol.appendChild(enemyHeader);
      for (const enemy of enemiesWithSkills) {
        for (const skill of enemy.skills) {
          const line = HTMLPanel.el('div', 'mc-label-dim mc-text-sm');
          line.textContent = `• ${enemy.name.substring(0, 10)}: ${skill.name}`;
          // Enemy skill tooltip: name, type, cooldown
          const enemyDef = enemy.defId ? ENEMY_DEFS[enemy.defId] : null;
          const enemySkillDef = enemyDef?.skills?.find((s: { id: string }) => s.id === skill.id);
          if (enemySkillDef) {
            line.title = `${skill.name}\nCD: ${skill.cooldown} Runden · Stärke: ${enemySkillDef.power}`;
          }
          line.style.cursor = 'help';
          enemyCol.appendChild(line);
        }
      }
      grid.appendChild(enemyCol);
    }

    section.appendChild(grid);
    return section;
  }

  // ─── Proviant im Combat-Preview ──────────────────────────

  private buildCombatProviantSection(
    run: ExpeditionRun,
    state: GameState,
    room: EncounterRoom,
    roomIndex: number,
    mainColsEl: HTMLElement,
    logEl: HTMLElement,
    actionsEl: HTMLElement,
    roomStripEl: HTMLElement,
  ): HTMLElement | null {
    const activeProvisions = run.provisions.filter(p => p.qty > 0);
    if (activeProvisions.length === 0) return null;

    const section = HTMLPanel.el('div');
    section.style.cssText = 'padding: 6px 0 2px; border-top: 1px solid #2a1a20;';
    section.appendChild(buildSectionHeader('Vorräte (vor Kampf nutzbar)', 'mc-label-bright'));

    const row = HTMLPanel.el('div');
    row.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;';

    for (let i = 0; i < run.provisions.length; i++) {
      const p = run.provisions[i];
      if (p.qty <= 0) continue;

      const itemDef = ITEM_DEFS[p.itemId];
      const card = HTMLPanel.el('div');
      card.style.cssText = 'display: flex; align-items: center; gap: 4px; background: #1a1520; border: 1px solid #2a2030; border-radius: 4px; padding: 3px 6px;';

      const spriteKey = `ITEM_${p.itemId.toUpperCase()}`;
      const img = document.createElement('img');
      img.src = `/assets/sprites/final/${spriteKey}.png`;
      img.width = 18;
      img.height = 18;
      img.style.cssText = 'object-fit: contain; flex-shrink: 0;';
      img.onerror = () => { img.style.display = 'none'; };
      card.appendChild(img);

      const nameEl = HTMLPanel.el('span', 'mc-text-sm');
      nameEl.textContent = `${(itemDef as { name?: string })?.name ?? p.itemId} ×${p.qty}`;
      card.appendChild(nameEl);

      const useBtn = makeSmallButton('Nutzen', () => {
        this.expSys.useProvision(state, i);
        // HP-Snapshot aktualisieren (Heilung vor Kampf)
        for (const u of run.party) this.preHpSnapshot.set(u.id, u.hp);
        this.buildCombatView(mainColsEl, roomStripEl, logEl, actionsEl, run, state, room, roomIndex);
      });
      card.appendChild(useBtn);
      row.appendChild(card);
    }

    section.appendChild(row);
    return section;
  }

  // ─── Schadens-Zusammenfassung ────────────────────────────

  private buildDamageSummary(run: ExpeditionRun, room: EncounterRoom): HTMLElement | null {
    const changes: string[] = [];

    for (const u of run.party) {
      const pre = this.preHpSnapshot.get(u.id) ?? u.maxHp;
      const diff = pre - u.hp;
      if (diff > 0) changes.push(`${u.name}: -${diff} HP`);
      else if (diff < 0) changes.push(`${u.name}: +${Math.abs(diff)} HP`);
      if (u.hp <= 0 && pre > 0) changes.push(`💀 ${u.name} gefallen!`);
    }
    for (const e of room.enemies) {
      if (e.hp <= 0) changes.push(`✗ ${e.name} besiegt`);
    }

    if (changes.length === 0) return null;

    const el = HTMLPanel.el('div');
    el.style.cssText = 'width: 100%; display: flex; flex-wrap: wrap; gap: 6px 12px; margin-bottom: 6px;';
    for (const c of changes) {
      const chip = HTMLPanel.el('span', 'mc-text-sm');
      chip.style.cssText = c.includes('-') || c.includes('💀')
        ? 'color: var(--mc-damage);'
        : c.includes('✗')
          ? 'color: var(--mc-gold);'
          : 'color: var(--mc-hp);';
      chip.textContent = c;
      el.appendChild(chip);
    }
    return el;
  }
}
