// ============================================================
// Magic City – ExpeditionOverviewRenderer
// Renders the "overview" sections of the ExpeditionUI:
// room strip, main columns (party / enemies / provisions / loot)
// and the combat log. Extracted from HTMLExpeditionUI so that
// the overview rendering logic can be tested and reused
// independently of the full panel lifecycle.
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { ExpeditionRun, CombatUnit } from '../../models/ExpeditionRun';
import { ITEM_DEFS } from '../../data/items';
import { CLASS_DEFS } from '../../data/classes';
import { ExpeditionSystem } from '../../systems/ExpeditionSystem';
import { getLogLineColor } from '../../rendering/Colors';
import { ROUTE_DEFS } from '../../data/routes';
import {
  getRoomStyle,
  statusClass,
  hpBarClass,
  buildSectionHeader,
  makeSmallButton,
} from './ExpeditionUIHelpers';

// ─── statusLabel (used locally, not exported) ────────────────

function statusLabel(status: ExpeditionRun['status']): string {
  switch (status) {
    case 'exploring': return 'Unterwegs';
    case 'victory':   return 'Sieg!';
    case 'defeat':    return 'Niederlage';
    case 'retreat':   return 'Rückzug';
  }
}

// ─── ExpeditionOverviewRenderer ──────────────────────────────

export class ExpeditionOverviewRenderer {
  constructor(
    private expSys: ExpeditionSystem,
    private getState: () => GameState | null,
    private refresh: (state: GameState) => void,
  ) {}

  // ─── Raum-Streifen ──────────────────────────────────────

  /**
   * Feature #12: Horizontaler Streifen mit je einem Icon pro Raum.
   * Abgeschlossene Räume: gedimmt. Aktueller Raum: gold hervorgehoben.
   * Zukünftige Räume: dunkel/fog-of-war.
   */
  buildRoomStrip(container: HTMLElement, run: ExpeditionRun): void {
    container.innerHTML = '';

    const totalRooms = run.rooms.length;
    if (totalRooms === 0) return;

    // Äußerer Wrapper: flex-row mit Raumzähler rechts
    const wrapper = HTMLPanel.el('div');
    wrapper.style.cssText = [
      'display: flex',
      'align-items: center',
      'gap: 4px',
    ].join('; ');

    // Icon-Liste
    const iconsRow = HTMLPanel.el('div');
    iconsRow.style.cssText = [
      'display: flex',
      'flex-wrap: nowrap',
      'gap: 2px',
      'overflow: hidden',
      'flex: 1',
    ].join('; ');

    for (let i = 0; i < totalRooms; i++) {
      const room = run.rooms[i];
      const style = getRoomStyle(room.type);

      const isCompleted = i < run.currentRoom;
      const isCurrent   = i === run.currentRoom && run.status === 'exploring';

      const icon = HTMLPanel.el('div');
      icon.title = style.label;
      icon.textContent = style.symbol;
      icon.style.cssText = [
        'width: 22px',
        'height: 22px',
        'border-radius: 3px',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'font-size: 11px',
        'font-weight: bold',
        'flex-shrink: 0',
        'transition: box-shadow 0.1s',
        // Farbe je nach Status
        `background: ${isCompleted ? '#1a1a1e' : isCurrent ? style.color : '#0e0b10'}`,
        `color: ${isCompleted ? '#555560' : isCurrent ? '#ffffff' : '#333344'}`,
        `border: 1px solid ${isCurrent ? 'var(--mc-gold)' : isCompleted ? '#2a2a30' : '#1a1a22'}`,
        isCurrent ? 'box-shadow: 0 0 6px var(--mc-accent-expedition)' : '',
      ].filter(Boolean).join('; ');

      iconsRow.appendChild(icon);
    }

    wrapper.appendChild(iconsRow);

    // Raum-Zähler rechts (z.B. "3/10")
    const roomLabel = run.status === 'exploring'
      ? `${run.currentRoom + 1}/${totalRooms}`
      : `${totalRooms}/${totalRooms}`;

    const counter = HTMLPanel.el('div', 'mc-label-gold mc-text-sm mc-bold');
    counter.style.cssText = 'white-space: nowrap; padding-left: 8px; flex-shrink: 0;';
    counter.textContent = roomLabel;
    wrapper.appendChild(counter);

    container.appendChild(wrapper);
  }

  // ─── Zwei-Spalten-Hauptbereich ───────────────────────────

  buildMainCols(container: HTMLElement, run: ExpeditionRun, state: GameState): void {
    container.innerHTML = '';

    // Linke Spalte: Party + Gegner
    const leftCol = HTMLPanel.el('div');
    leftCol.style.cssText = 'padding-right: 12px; border-right: 1px solid #2a1a20; display: flex; flex-direction: column; gap: 8px;';

    // Routenname + Status-Badge in einer Zeile
    const routeRow = HTMLPanel.el('div');
    routeRow.style.cssText = 'display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px;';

    const route = ROUTE_DEFS[run.routeId];
    const routeNameEl = HTMLPanel.el('span', 'mc-label-dim mc-text-md');
    routeNameEl.textContent = `Route: ${route?.name ?? run.routeId}`;
    routeRow.appendChild(routeNameEl);

    const statusEl = HTMLPanel.el('span', `mc-bold mc-text-sm ${statusClass(run.status)}`);
    statusEl.textContent = statusLabel(run.status);
    routeRow.appendChild(statusEl);
    leftCol.appendChild(routeRow);

    // Party-Sektion
    leftCol.appendChild(buildSectionHeader('Party', 'mc-label-info'));
    leftCol.appendChild(this.buildPartySection(run));

    // Gegner-Sektion (nur wenn im aktuellen Raum Kampf läuft)
    const enemySection = this.buildEnemySection(run, state);
    if (enemySection) {
      leftCol.appendChild(enemySection);
    }

    // Rechte Spalte: Proviant + Beute
    const rightCol = HTMLPanel.el('div');
    rightCol.style.cssText = 'padding-left: 12px; display: flex; flex-direction: column; gap: 8px;';

    rightCol.appendChild(buildSectionHeader('Proviant', 'mc-label-bright'));
    rightCol.appendChild(this.buildProviantSection(run, state));

    const lootSection = this.buildLootSection(run);
    if (lootSection) {
      rightCol.appendChild(buildSectionHeader('Beute', 'mc-label-loot'));
      rightCol.appendChild(lootSection);
    }

    container.appendChild(leftCol);
    container.appendChild(rightCol);
  }

  // ─── Kampfprotokoll ─────────────────────────────────────

  buildLog(logEl: HTMLElement, run: ExpeditionRun): void {
    logEl.innerHTML = '';

    const logSlice = run.combatLog.slice(-18);
    for (const line of logSlice) {
      const entry = HTMLPanel.el('div', 'mc-text-sm');
      entry.style.cssText = `padding: 1px 0; line-height: 1.4; color: ${getLogLineColor(line)};`;
      entry.textContent = line;
      logEl.appendChild(entry);
    }

    // Automatisch zum Ende scrollen (neueste Einträge unten)
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ─── Party-Sektion ──────────────────────────────────────

  private buildPartySection(run: ExpeditionRun): HTMLElement {
    const container = HTMLPanel.el('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    for (const unit of run.party) {
      container.appendChild(this.buildUnitRow(unit, false));
    }

    return container;
  }

  // ─── Gegner-Sektion ─────────────────────────────────────

  private buildEnemySection(run: ExpeditionRun, state: GameState): HTMLElement | null {
    if (run.currentRoom >= run.rooms.length) return null;

    const currentRoom = run.rooms[run.currentRoom];
    if (currentRoom.type !== 'combat' && currentRoom.type !== 'boss') return null;
    if (currentRoom.enemies.length === 0) return null;

    // Fokus-Status im Header
    const focusLabel = run.focusTarget
      ? 'Gegner (Fokus aktiv)'
      : run.focusTargetCooldown > 0
        ? `Gegner (Fokus CD: ${run.focusTargetCooldown})`
        : 'Gegner (Klick = Fokus)';

    const wrapper = HTMLPanel.el('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    wrapper.appendChild(buildSectionHeader(focusLabel, 'mc-label-damage'));

    for (const enemy of currentRoom.enemies) {
      const isFocused = run.focusTarget?.enemyId === enemy.id;

      // Klickbar wenn: lebendig, exploring, kein Cooldown
      const canFocus = enemy.hp > 0
        && run.status === 'exploring'
        && run.focusTargetCooldown === 0;

      const row = this.buildUnitRow(enemy, true, isFocused);

      if (canFocus) {
        row.style.cursor = 'pointer';
        row.title = 'Klicken um Fokus-Ziel zu setzen';
        row.addEventListener('click', () => {
          const currentState = this.getState();
          if (!currentState?.activeExpedition) return;
          this.expSys.setFocusTarget(currentState.activeExpedition, enemy.id);
          if (currentState) this.refresh(currentState);
        });
        // Hover-Effekt
        row.addEventListener('mouseenter', () => {
          row.style.background = '#2a1520';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = '';
        });
      }

      wrapper.appendChild(row);
    }

    return wrapper;
  }

  // ─── Einzel-Unit-Zeile (Party oder Gegner) ───────────────

  private buildUnitRow(unit: CombatUnit, isEnemy: boolean, isFocused = false): HTMLElement {
    const alive  = unit.hp > 0;
    const hpPct  = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;

    const row = HTMLPanel.el('div');
    row.style.cssText = [
      'border-radius: 4px',
      'padding: 3px 4px',
      'display: flex',
      'align-items: center',
      'gap: 6px',
    ].join('; ');

    // Portrait icon
    const spriteKey = unit.spriteKey
      ?? (unit.classId ? CLASS_DEFS[unit.classId]?.spriteKey : undefined)
      ?? (isEnemy ? `ENEMY_${unit.name.toUpperCase().replace(/[\s-]+/g, '_')}` : undefined);
    if (spriteKey) {
      const icon = HTMLPanel.icon(spriteKey, 80);
      icon.style.cssText = [
        'border-radius: 4px',
        'background: rgba(0,0,0,0.4)',
        'flex-shrink: 0',
        'border: 1px solid ' + (isFocused ? 'var(--mc-gold)' : isEnemy ? '#4a2020' : '#1a2a3a'),
        alive ? '' : 'opacity: 0.3; filter: grayscale(1)',
      ].filter(Boolean).join('; ');
      icon.onerror = () => { icon.style.display = 'none'; };
      row.appendChild(icon);
    }

    // Info column
    const infoCol = HTMLPanel.el('div');
    infoCol.style.cssText = 'flex: 1; min-width: 0;';

    // Name + HP-Text in einer Zeile
    const nameRow = HTMLPanel.el('div');
    nameRow.style.cssText = 'display: flex; justify-content: space-between; align-items: baseline; gap: 6px;';

    // Fokus-Marker oder gestorben-Marker vor dem Namen
    const prefix = isFocused ? '▶ ' : !alive ? '[X] ' : '';
    const nameClass = !alive
      ? 'mc-label-dim mc-text-md'
      : isFocused
        ? 'mc-label-bright mc-bold mc-text-md'
        : isEnemy
          ? 'mc-label-damage mc-text-md'
          : 'mc-text-md';

    const nameEl = HTMLPanel.el('span', nameClass);
    nameEl.textContent = prefix + unit.name;
    nameRow.appendChild(nameEl);

    // HP + ATK + DEF Zahlen (rechts)
    if (alive) {
      const statsEl = HTMLPanel.el('span', 'mc-text-sm');
      // HP-Farbe je nach Prozent
      const hpColor = hpPct > 0.5
        ? 'var(--mc-hp)'
        : hpPct > 0.2
          ? 'var(--mc-gold-bright)'
          : 'var(--mc-damage)';
      statsEl.style.color = hpColor;
      statsEl.style.whiteSpace = 'nowrap';
      if (isEnemy) {
        statsEl.textContent = `${Math.max(0, unit.hp)}/${unit.maxHp}`;
      } else {
        statsEl.textContent = `${Math.max(0, unit.hp)}/${unit.maxHp}  A:${unit.atk} D:${unit.def}`;
      }
      nameRow.appendChild(statsEl);
    }

    infoCol.appendChild(nameRow);

    // HP-Balken (nur für lebende Einheiten)
    if (alive) {
      const barWrapper = HTMLPanel.el('div');
      barWrapper.style.marginTop = '2px';
      barWrapper.appendChild(HTMLPanel.statBar(Math.max(0, unit.hp), unit.maxHp, hpBarClass(hpPct)));
      infoCol.appendChild(barWrapper);
    }

    row.appendChild(infoCol);

    return row;
  }

  // ─── Proviant-Sektion ────────────────────────────────────

  private buildProviantSection(run: ExpeditionRun, state: GameState): HTMLElement {
    const container = HTMLPanel.el('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    if (run.provisions.length === 0) {
      const empty = HTMLPanel.el('div', 'mc-label-dim mc-text-md');
      empty.textContent = 'Kein Proviant';
      container.appendChild(empty);
      return container;
    }

    for (let i = 0; i < run.provisions.length; i++) {
      const p = run.provisions[i];
      const itemDef = ITEM_DEFS[p.itemId];

      const row = HTMLPanel.el('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 6px;';

      // Sprite-Icon falls verfügbar
      const spriteKey = `ITEM_${p.itemId.toUpperCase()}`;
      const imgPath = `/assets/sprites/final/${spriteKey}.png`;
      const img = document.createElement('img');
      img.src = imgPath;
      img.width = 14;
      img.height = 14;
      img.style.cssText = 'object-fit: contain; image-rendering: auto; flex-shrink: 0;';
      // Bild verstecken falls es nicht lädt (404)
      img.onerror = () => { img.style.display = 'none'; };
      row.appendChild(img);

      const nameEl = HTMLPanel.el('span', 'mc-text-md');
      nameEl.textContent = `${itemDef?.name ?? p.itemId} ×${p.qty}`;
      nameEl.style.flex = '1';
      row.appendChild(nameEl);

      // "Nutzen"-Button nur wenn Expedition läuft und Item vorhanden
      if (run.status === 'exploring' && p.qty > 0) {
        const useBtn = makeSmallButton('Nutzen', () => {
          this.expSys.useProvision(state, i);
          this.refresh(state);
        });
        row.appendChild(useBtn);
      }

      container.appendChild(row);
    }

    return container;
  }

  // ─── Beute-Sektion ───────────────────────────────────────

  private buildLootSection(run: ExpeditionRun): HTMLElement | null {
    const lootEntries = Object.entries(run.loot).filter(([, q]) => q > 0);
    if (lootEntries.length === 0 && run.goldEarned === 0) return null;

    const container = HTMLPanel.el('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    // Gold (falls vorhanden)
    if (run.goldEarned > 0) {
      const goldRow = HTMLPanel.el('div');
      goldRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';

      const goldImg = document.createElement('img');
      goldImg.src = '/assets/sprites/final/ICON_GOLD.png';
      goldImg.width = 14;
      goldImg.height = 14;
      goldImg.style.cssText = 'object-fit: contain; flex-shrink: 0;';
      goldImg.onerror = () => { goldImg.style.display = 'none'; };
      goldRow.appendChild(goldImg);

      const goldEl = HTMLPanel.el('span', 'mc-label-bright mc-text-md');
      goldEl.textContent = `Gold: ${run.goldEarned}`;
      goldRow.appendChild(goldEl);

      container.appendChild(goldRow);
    }

    // Weitere Loot-Items
    for (const [itemId, qty] of lootEntries) {
      const itemDef = ITEM_DEFS[itemId];
      const row = HTMLPanel.el('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 6px;';

      const spriteKey = `ITEM_${itemId.toUpperCase()}`;
      const img = document.createElement('img');
      img.src = `/assets/sprites/final/${spriteKey}.png`;
      img.width = 14;
      img.height = 14;
      img.style.cssText = 'object-fit: contain; flex-shrink: 0;';
      img.onerror = () => { img.style.display = 'none'; };
      row.appendChild(img);

      const nameEl = HTMLPanel.el('span', 'mc-label-loot mc-text-md');
      nameEl.textContent = `${itemDef?.name ?? itemId}: ${qty}`;
      row.appendChild(nameEl);

      container.appendChild(row);
    }

    return container;
  }
}
