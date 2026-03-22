// ============================================================
// Magic City – HTMLBestiariumUI
// Bestiarium der Arche: Monster-Lexikon (HTML-Panel).
// Hotkey: K
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { ENEMY_DEFS, ENEMY_LORE, EnemyDef } from '../../data/enemies';
import { LOOT_TABLE_DEFS } from '../../data/lootTables';
import { ITEM_DEFS } from '../../data/items';
import { BESTIARIUM_ROUTE_BONUS } from '../../systems/BestiariumSystem';

type RouteFilter = 'all' | 'forest' | 'cave' | 'swamp' | 'ruins' | 'volcano';

const ROUTE_FILTERS: { key: RouteFilter; label: string; icon: string }[] = [
  { key: 'all',     label: 'Alle',   icon: '📖' },
  { key: 'forest',  label: 'Wald',   icon: '🌲' },
  { key: 'cave',    label: 'Höhle',  icon: '⛰️' },
  { key: 'swamp',   label: 'Sumpf',  icon: '🌿' },
  { key: 'ruins',   label: 'Ruinen', icon: '🏛️' },
  { key: 'volcano', label: 'Vulkan', icon: '🌋' },
];

// Map lore route strings to filter keys
const ROUTE_MAP: Record<string, RouteFilter> = {
  forest: 'forest', wald: 'forest',
  cave: 'cave', höhle: 'cave', hohle: 'cave',
  swamp: 'swamp', sumpf: 'swamp',
  ruins: 'ruins', ruinen: 'ruins',
  volcano: 'volcano', vulkan: 'volcano',
};

const ROUTE_LABELS: Record<RouteFilter, string> = {
  all: 'Alle', forest: 'Wald', cave: 'Höhle',
  swamp: 'Sumpf', ruins: 'Ruinen', volcano: 'Vulkan',
};

/** Uses the shared route bonus from BestiariumSystem */

function getEnemyRoute(id: string): RouteFilter {
  const raw = (ENEMY_LORE[id]?.route ?? ENEMY_DEFS[id]?.route ?? '').toLowerCase();
  return ROUTE_MAP[raw] ?? 'all';
}

function getEnemiesForRoute(route: RouteFilter): string[] {
  const allIds = Object.keys(ENEMY_DEFS);
  if (route === 'all') return allIds;
  return allIds.filter(id => getEnemyRoute(id) === route);
}

export class HTMLBestiariumUI extends HTMLPanel {
  public onClose?: () => void;

  private activeFilter: RouteFilter = 'all';
  private searchQuery = '';
  private expandedId: string | null = null;
  private revealAll = false;
  private tabsEl!: HTMLElement;
  private progressEl!: HTMLElement;
  private routeProgressEl!: HTMLElement;
  private searchEl!: HTMLInputElement;
  private scrollEl!: HTMLElement;
  private state: GameState | null = null;

  constructor() {
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    root.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'transform: translate(-50%, -50%)',
      'width: 780px',
      'max-height: 620px',
      'display: flex',
      'flex-direction: column',
      'pointer-events: auto',
    ].join('; ');
    root.setAttribute('hidden', '');
    super(root);
    this.buildShell();
  }

  // ─── Public API ──────────────────────────────────────────

  open(state: GameState): void {
    this.state = state;
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.expandedId = null;
    this.searchEl.value = '';
    this.refreshTabs();
    this.renderContent();
    this.el.removeAttribute('hidden');
  }

  /** Returns completed routes for external systems (e.g. loot bonus) */
  getCompletedRoutes(state: GameState): RouteFilter[] {
    const completed: RouteFilter[] = [];
    for (const { key } of ROUTE_FILTERS) {
      if (key === 'all') continue;
      const enemies = getEnemiesForRoute(key);
      if (enemies.length > 0 && enemies.every(id => state.bestiarium.defeated.includes(id))) {
        completed.push(key);
      }
    }
    return completed;
  }

  /** Loot bonus multiplier for a given route */
  getRouteLootBonus(state: GameState, route: string): number {
    const routeKey = ROUTE_MAP[route.toLowerCase()];
    if (!routeKey) return 0;
    const enemies = getEnemiesForRoute(routeKey);
    if (enemies.length > 0 && enemies.every(id => state.bestiarium.defeated.includes(id))) {
      return BESTIARIUM_ROUTE_BONUS;
    }
    return 0;
  }

  // ─── Build (once) ────────────────────────────────────────

  private buildShell(): void {
    // Header row
    const header = HTMLPanel.el('div', 'mc-panel-header');
    this.el.appendChild(header);

    const titleSpan = document.createElement('span');
    titleSpan.textContent = '📖 Bestiarium der Arche';
    header.appendChild(titleSpan);

    this.progressEl = document.createElement('span');
    this.progressEl.style.cssText = 'font-size:12px; color:var(--mc-dim); font-weight:normal; margin-left:12px;';
    header.appendChild(this.progressEl);

    this.el.appendChild(HTMLPanel.closeBtn(() => {
      this.hide();
      this.onClose?.();
    }));

    // Tabs row
    this.tabsEl = HTMLPanel.el('div', 'mc-tabs');
    this.el.appendChild(this.tabsEl);

    for (const { key, label, icon } of ROUTE_FILTERS) {
      const btn = document.createElement('button');
      btn.className = 'mc-tab';
      btn.textContent = `${icon} ${label}`;
      btn.dataset['route'] = key;
      btn.addEventListener('click', () => {
        this.activeFilter = key;
        this.expandedId = null;
        this.refreshTabs();
        this.renderContent();
      });
      this.tabsEl.appendChild(btn);
    }

    // Search + route progress row
    const controlRow = document.createElement('div');
    controlRow.style.cssText = 'display:flex; align-items:center; gap:10px; padding:6px 12px; border-bottom:1px solid var(--mc-navy-separator);';
    this.el.appendChild(controlRow);

    this.searchEl = document.createElement('input');
    this.searchEl.type = 'text';
    this.searchEl.placeholder = '🔍 Kreatur suchen...';
    this.searchEl.style.cssText = [
      'flex:1; padding:5px 10px; border-radius:4px; border:1px solid var(--mc-navy-separator)',
      'background:var(--mc-navy-deep); color:var(--mc-light); font-size:12px; outline:none',
      'font-family:var(--mc-font)',
    ].join('; ');
    this.searchEl.addEventListener('input', () => {
      this.searchQuery = this.searchEl.value.toLowerCase().trim();
      this.renderContent();
    });
    controlRow.appendChild(this.searchEl);

    // "Alle zeigen" toggle button
    const revealBtn = document.createElement('button');
    revealBtn.textContent = '👁️ Alle zeigen';
    revealBtn.style.cssText = [
      'padding:4px 10px; border-radius:4px; border:1px solid var(--mc-navy-separator)',
      'background:var(--mc-navy-deep); color:var(--mc-dim); font-size:11px; cursor:pointer',
      'font-family:var(--mc-font); white-space:nowrap; transition:background 0.15s, color 0.15s',
    ].join('; ');
    revealBtn.addEventListener('click', () => {
      this.revealAll = !this.revealAll;
      revealBtn.style.background = this.revealAll ? 'var(--mc-gold-deco)' : 'var(--mc-navy-deep)';
      revealBtn.style.color = this.revealAll ? 'var(--mc-light)' : 'var(--mc-dim)';
      revealBtn.textContent = this.revealAll ? '👁️ Alle sichtbar' : '👁️ Alle zeigen';
      this.renderContent();
    });
    controlRow.appendChild(revealBtn);

    this.routeProgressEl = document.createElement('div');
    this.routeProgressEl.style.cssText = 'font-size:11px; color:var(--mc-dim); white-space:nowrap;';
    controlRow.appendChild(this.routeProgressEl);

    // Scrollable content area
    this.scrollEl = HTMLPanel.el('div', 'mc-scroll');
    this.scrollEl.style.cssText = 'flex: 1; padding: 12px; overflow-y: auto;';
    this.el.appendChild(this.scrollEl);
  }

  // ─── Render ──────────────────────────────────────────────

  private refreshTabs(): void {
    Array.from(this.tabsEl.querySelectorAll<HTMLButtonElement>('.mc-tab')).forEach(btn => {
      btn.classList.toggle('active', btn.dataset['route'] === this.activeFilter);
    });
  }

  private renderContent(): void {
    if (!this.state) return;
    this.scrollEl.innerHTML = '';

    const allIds = Object.keys(ENEMY_DEFS);

    // Apply route filter
    let filteredIds = this.activeFilter === 'all'
      ? allIds
      : allIds.filter(id => getEnemyRoute(id) === this.activeFilter);

    // Apply search filter
    if (this.searchQuery) {
      filteredIds = filteredIds.filter(id => {
        const def = ENEMY_DEFS[id];
        if (this.revealAll) return def.name.toLowerCase().includes(this.searchQuery);
        const isDiscovered = this.state!.bestiarium.discovered.includes(id);
        if (!isDiscovered) return false;
        return def.name.toLowerCase().includes(this.searchQuery);
      });
    }

    // Global progress
    const discovered = this.state.bestiarium.discovered.length;
    const defeated   = this.state.bestiarium.defeated.length;
    this.progressEl.textContent = `${discovered}/${allIds.length} entdeckt · ${defeated} besiegt`;

    // Route-specific progress
    this.renderRouteProgress();

    if (filteredIds.length === 0) {
      const empty = HTMLPanel.el('p', undefined,
        this.searchQuery ? 'Keine Treffer für diese Suche.' : 'Keine Einträge für diese Route.');
      empty.style.cssText = 'color:var(--mc-dim); text-align:center; padding:20px;';
      this.scrollEl.appendChild(empty);
      return;
    }

    // Sort: bosses first, then alphabetical within discovered/undiscovered
    const sorted = [
      ...filteredIds.filter(id => ENEMY_DEFS[id]?.isBoss),
      ...filteredIds.filter(id => !ENEMY_DEFS[id]?.isBoss),
    ];

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:8px;';
    this.scrollEl.appendChild(grid);

    for (const id of sorted) {
      grid.appendChild(this.buildCard(id));
    }
  }

  private renderRouteProgress(): void {
    if (!this.state) return;
    const route = this.activeFilter;

    if (route === 'all') {
      // Show mini route completion overview
      const parts: string[] = [];
      for (const { key, icon } of ROUTE_FILTERS) {
        if (key === 'all') continue;
        const enemies = getEnemiesForRoute(key);
        const defeatedCount = enemies.filter(id => this.state!.bestiarium.defeated.includes(id)).length;
        const complete = defeatedCount === enemies.length && enemies.length > 0;
        parts.push(`${icon} ${defeatedCount}/${enemies.length}${complete ? ' ✓' : ''}`);
      }
      this.routeProgressEl.textContent = parts.join('  ');
    } else {
      const enemies = getEnemiesForRoute(route);
      const discoveredCount = enemies.filter(id => this.state!.bestiarium.discovered.includes(id)).length;
      const defeatedCount = enemies.filter(id => this.state!.bestiarium.defeated.includes(id)).length;
      const allDefeated = defeatedCount === enemies.length && enemies.length > 0;
      this.routeProgressEl.innerHTML = '';

      const text = document.createElement('span');
      text.textContent = `${ROUTE_LABELS[route]}: ${defeatedCount}/${enemies.length} besiegt`;
      this.routeProgressEl.appendChild(text);

      if (allDefeated) {
        const bonus = document.createElement('span');
        bonus.style.cssText = 'color:var(--mc-gold); margin-left:6px; font-weight:bold;';
        bonus.textContent = `✦ +${(BESTIARIUM_ROUTE_BONUS * 100).toFixed(0)}% Loot`;
        this.routeProgressEl.appendChild(bonus);
      } else {
        // Mini progress bar
        const bar = document.createElement('div');
        bar.style.cssText = 'display:inline-block; width:60px; height:6px; background:var(--mc-navy-deep); border-radius:3px; margin-left:8px; vertical-align:middle; overflow:hidden;';
        const fill = document.createElement('div');
        const pct = enemies.length > 0 ? (defeatedCount / enemies.length) * 100 : 0;
        fill.style.cssText = `width:${pct}%; height:100%; background:var(--mc-gold); border-radius:3px; transition:width 0.3s;`;
        bar.appendChild(fill);
        this.routeProgressEl.appendChild(bar);
      }
    }
  }

  private buildCard(defId: string): HTMLElement {
    if (!this.state) return document.createElement('div');
    const def  = ENEMY_DEFS[defId];
    const lore = ENEMY_LORE[defId];
    if (!def) return document.createElement('div');

    const isDiscovered = this.revealAll || this.state.bestiarium.discovered.includes(defId);
    const isDefeated   = this.revealAll || this.state.bestiarium.defeated.includes(defId);
    const isExpanded   = this.expandedId === defId;

    const wrapper = document.createElement('div');

    const card = document.createElement('div');
    card.style.cssText = [
      'display:flex; gap:10px; padding:10px; border-radius:6px; cursor:pointer; transition:background 0.15s',
      `background: ${def.isBoss ? 'rgba(180,60,60,0.12)' : 'var(--mc-navy-card)'}`,
      `border: 1px solid ${isDefeated ? 'var(--mc-gold-deco)' : isDiscovered ? 'var(--mc-navy-separator)' : 'transparent'}`,
      isExpanded ? 'border-bottom-left-radius:0; border-bottom-right-radius:0' : '',
    ].join('; ');

    card.addEventListener('click', () => {
      if (!isDiscovered && !this.revealAll) return;
      this.expandedId = isExpanded ? null : defId;
      this.renderContent();
    });

    // Sprite box – Silhouette system
    const spriteBox = document.createElement('div');
    spriteBox.style.cssText = 'width:48px; height:48px; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:var(--mc-navy-deep); border-radius:4px; overflow:hidden;';
    card.appendChild(spriteBox);

    if (def.spriteKey) {
      const img = document.createElement('img');
      img.src = `assets/sprites/final/${def.spriteKey}.png`;
      img.alt = isDiscovered ? def.name : '???';
      if (!isDiscovered) {
        // Black silhouette: show sprite shape but fully black
        img.style.cssText = 'width:44px; height:44px; object-fit:contain; filter:brightness(0); opacity:0.5;';
      } else if (!isDefeated) {
        // Discovered but not defeated: desaturated + dark
        img.style.cssText = 'width:44px; height:44px; object-fit:contain; filter:brightness(0.4) saturate(0);';
      } else {
        // Fully revealed
        img.style.cssText = 'width:44px; height:44px; object-fit:contain;';
      }
      img.onerror = () => { img.remove(); spriteBox.textContent = '?'; spriteBox.style.cssText += '; color:var(--mc-dim); font-size:20px;'; };
      spriteBox.appendChild(img);
    } else {
      spriteBox.style.cssText += '; color:var(--mc-dim); font-size:20px;';
      spriteBox.textContent = '?';
    }

    // Info column
    const info = document.createElement('div');
    info.style.cssText = 'flex:1; min-width:0;';
    card.appendChild(info);

    // Name + badges
    const nameRow = document.createElement('div');
    nameRow.style.cssText = 'display:flex; gap:5px; align-items:center; flex-wrap:wrap; margin-bottom:3px;';
    info.appendChild(nameRow);

    const nameEl = document.createElement('span');
    nameEl.style.cssText = `font-size:13px; font-weight:bold; color:${isDiscovered ? 'var(--mc-light)' : 'var(--mc-dim)'};`;
    nameEl.textContent = isDiscovered ? def.name : '???';
    nameRow.appendChild(nameEl);

    if (isDiscovered) {
      nameRow.appendChild(this.badge(this.roleLabel(def.role), this.roleColor(def.role)));
      if (def.isBoss) nameRow.appendChild(this.badge('BOSS', 'var(--mc-damage)'));
      if (isDefeated) nameRow.appendChild(this.badge('✓ Besiegt', 'var(--mc-gold)'));
    }

    if (isDiscovered && lore?.route) {
      const routeEl = document.createElement('div');
      routeEl.style.cssText = 'font-size:11px; color:var(--mc-dim); margin-bottom:3px;';
      routeEl.textContent = `Route: ${lore.route}`;
      info.appendChild(routeEl);
    }

    // Lore preview (short)
    const loreEl = document.createElement('p');
    loreEl.style.cssText = 'font-size:11px; color:var(--mc-dim); margin:0; line-height:1.4; font-style:italic;';
    if (isDefeated && lore?.lore) {
      // Truncate lore in card view
      const maxLen = 100;
      const full = lore.lore;
      loreEl.textContent = full.length > maxLen ? full.substring(0, maxLen) + '…' : full;
      loreEl.style.color = 'var(--mc-muted)';
    } else if (isDiscovered) {
      loreEl.textContent = 'Besiege diesen Gegner um den Eintrag zu vervollständigen.';
    } else {
      loreEl.textContent = 'Unbekannte Kreatur. Begegne ihr im Dungeon.';
    }
    info.appendChild(loreEl);

    // Compact stats for defeated
    if (isDefeated) {
      info.appendChild(this.buildStatRow(def));
    }

    wrapper.appendChild(card);

    // ── Expanded detail panel ──
    if (isExpanded && isDiscovered) {
      wrapper.appendChild(this.buildDetailPanel(defId, def, lore, isDefeated));
    }

    return wrapper;
  }

  // ─── Detail Panel ──────────────────────────────────────

  private buildDetailPanel(
    defId: string,
    def: EnemyDef,
    lore: { lore: string; route: string; skillDescriptions?: Record<string, string> } | undefined,
    isDefeated: boolean,
  ): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = [
      'background:var(--mc-navy-card-light); border:1px solid var(--mc-navy-separator)',
      'border-top:none; border-radius:0 0 6px 6px; padding:12px',
      'display:flex; gap:14px',
    ].join('; ');

    // ── Left content column ──
    const contentCol = document.createElement('div');
    contentCol.style.cssText = 'flex:1; min-width:0;';
    panel.appendChild(contentCol);

    // ── Right image column ──
    if (def.spriteKey && isDefeated) {
      const imageCol = document.createElement('div');
      imageCol.style.cssText = 'width:120px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:6px;';

      const imgWrap = document.createElement('div');
      imgWrap.style.cssText = 'width:112px; height:112px; background:var(--mc-navy-deep); border-radius:8px; border:1px solid var(--mc-navy-separator); display:flex; align-items:center; justify-content:center; overflow:hidden;';

      const img = document.createElement('img');
      img.src = `assets/sprites/final/${def.spriteKey}.png`;
      img.alt = def.name;
      img.style.cssText = 'width:104px; height:104px; object-fit:contain; image-rendering:pixelated;';
      img.onerror = () => imgWrap.remove();
      imgWrap.appendChild(img);
      imageCol.appendChild(imgWrap);

      const nameLabel = document.createElement('div');
      nameLabel.style.cssText = 'font-size:10px; color:var(--mc-dim); text-align:center; line-height:1.3;';
      nameLabel.textContent = def.name;
      imageCol.appendChild(nameLabel);

      panel.appendChild(imageCol);
    }

    // ── Full Lore Text ──
    if (isDefeated && lore?.lore) {
      const loreSection = document.createElement('div');
      loreSection.style.cssText = 'margin-bottom:10px;';
      const loreLabel = document.createElement('div');
      loreLabel.style.cssText = 'font-size:11px; color:var(--mc-gold); font-weight:bold; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;';
      loreLabel.textContent = '📜 Lore';
      loreSection.appendChild(loreLabel);
      const loreText = document.createElement('p');
      loreText.style.cssText = 'font-size:12px; color:var(--mc-muted); margin:0; line-height:1.5; font-style:italic;';
      loreText.textContent = lore.lore;
      loreSection.appendChild(loreText);
      contentCol.appendChild(loreSection);
    }

    // ── Full Stats (only when defeated) ──
    if (isDefeated) {
      const statsSection = document.createElement('div');
      statsSection.style.cssText = 'margin-bottom:10px;';
      const statsLabel = document.createElement('div');
      statsLabel.style.cssText = 'font-size:11px; color:var(--mc-gold); font-weight:bold; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;';
      statsLabel.textContent = '⚔️ Werte';
      statsSection.appendChild(statsLabel);

      const statsGrid = document.createElement('div');
      statsGrid.style.cssText = 'display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;';

      const statDefs: [string, string, number, string][] = [
        ['HP', '❤️', def.hp, 'var(--mc-hp)'],
        ['ATK', '⚔️', def.atk, 'var(--mc-atk)'],
        ['DEF', '🛡️', def.def, 'var(--mc-def)'],
        ['SPD', '💨', def.spd, 'var(--mc-spd)'],
        ['Krit%', '💥', Math.round(def.critChance * 100), 'var(--mc-damage)'],
        ['XP', '✨', def.xpReward, 'var(--mc-xp)'],
      ];

      for (const [label, icon, value, color] of statDefs) {
        const statEl = document.createElement('div');
        statEl.style.cssText = 'font-size:12px; display:flex; align-items:center; gap:4px;';
        statEl.innerHTML = `<span>${icon}</span> <span style="color:var(--mc-dim)">${label}:</span> <span style="color:${color}; font-weight:bold">${value}</span>`;
        statsGrid.appendChild(statEl);
      }
      statsSection.appendChild(statsGrid);

      // Enrage info for bosses
      if (def.enrage) {
        const enrageEl = document.createElement('div');
        enrageEl.style.cssText = 'font-size:11px; color:var(--mc-damage); margin-top:6px; font-style:italic;';
        enrageEl.textContent = `🔥 Enrage ab Runde ${def.enrage.afterRound}: +${Math.round((def.enrage.atkMult - 1) * 100)}% ATK, +${Math.round((def.enrage.spdMult - 1) * 100)}% SPD`;
        statsSection.appendChild(enrageEl);
      }

      contentCol.appendChild(statsSection);
    }

    // ── Skills (shown when discovered, full detail when defeated) ──
    if (def.skills.length > 0) {
      const skillSection = document.createElement('div');
      skillSection.style.cssText = 'margin-bottom:10px;';
      const skillLabel = document.createElement('div');
      skillLabel.style.cssText = 'font-size:11px; color:var(--mc-gold); font-weight:bold; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;';
      skillLabel.textContent = `⚡ Fähigkeiten (${def.skills.length})`;
      skillSection.appendChild(skillLabel);

      for (const skill of def.skills) {
        const skillEl = document.createElement('div');
        skillEl.style.cssText = 'display:flex; align-items:flex-start; gap:8px; padding:6px 8px; background:var(--mc-navy-card); border-radius:4px; margin-bottom:4px;';

        const skillIcon = document.createElement('span');
        skillIcon.style.cssText = 'font-size:14px; flex-shrink:0; margin-top:1px;';
        skillIcon.textContent = this.effectIcon(skill.effectType);
        skillEl.appendChild(skillIcon);

        const skillInfo = document.createElement('div');
        skillInfo.style.cssText = 'flex:1; min-width:0;';

        const skillName = document.createElement('div');
        skillName.style.cssText = 'font-size:12px; font-weight:bold; color:var(--mc-light);';
        skillName.textContent = skill.name;
        skillInfo.appendChild(skillName);

        if (isDefeated) {
          // Full info revealed
          const meta = document.createElement('div');
          meta.style.cssText = 'font-size:11px; color:var(--mc-dim); display:flex; gap:8px; margin-top:2px;';
          meta.innerHTML = [
            `<span>CD: ${skill.cooldown}</span>`,
            `<span>${this.effectLabel(skill.effectType)}</span>`,
            `<span>Stärke: ${skill.power}x</span>`,
          ].join('');
          skillInfo.appendChild(meta);

          // Skill description from lore
          const desc = lore?.skillDescriptions?.[skill.id];
          if (desc) {
            const descEl = document.createElement('div');
            descEl.style.cssText = 'font-size:11px; color:var(--mc-muted); margin-top:2px; font-style:italic;';
            descEl.textContent = desc;
            skillInfo.appendChild(descEl);
          }
        } else {
          const unknown = document.createElement('div');
          unknown.style.cssText = 'font-size:11px; color:var(--mc-disabled); font-style:italic;';
          unknown.textContent = 'Besiege den Gegner für Details';
          skillInfo.appendChild(unknown);
        }

        skillEl.appendChild(skillInfo);

        // Cooldown badge
        const cdBadge = document.createElement('span');
        cdBadge.style.cssText = 'font-size:10px; padding:2px 6px; border-radius:3px; background:var(--mc-navy-deep); color:var(--mc-dim); white-space:nowrap; flex-shrink:0;';
        cdBadge.textContent = `CD ${skill.cooldown}`;
        skillEl.appendChild(cdBadge);

        skillSection.appendChild(skillEl);
      }
      contentCol.appendChild(skillSection);
    }

    // ── Drops (only when defeated) ──
    if (isDefeated && def.lootTableId) {
      const dropSection = document.createElement('div');
      const dropLabel = document.createElement('div');
      dropLabel.style.cssText = 'font-size:11px; color:var(--mc-gold); font-weight:bold; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;';
      dropLabel.textContent = '🎁 Bekannte Beute';
      dropSection.appendChild(dropLabel);

      const table = LOOT_TABLE_DEFS[def.lootTableId];
      if (table) {
        const dropGrid = document.createElement('div');
        dropGrid.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px;';

        for (const entry of table.entries) {
          const item = ITEM_DEFS[entry.itemId];
          if (!item) continue;

          const dropEl = document.createElement('span');
          const rarity = this.dropRarity(entry.weight);
          dropEl.style.cssText = `font-size:11px; padding:2px 8px; border-radius:3px; background:var(--mc-navy-card); color:${rarity.color}; border:1px solid ${rarity.border};`;
          dropEl.textContent = item.name;
          dropEl.title = `Gewicht: ${entry.weight} | Menge: ${entry.minQty}-${entry.maxQty}`;
          dropGrid.appendChild(dropEl);
        }

        if (table.guaranteedGold.max > 0) {
          const goldEl = document.createElement('span');
          goldEl.style.cssText = 'font-size:11px; padding:2px 8px; border-radius:3px; background:var(--mc-navy-card); color:var(--mc-gold); border:1px solid var(--mc-gold-deco);';
          goldEl.textContent = `${table.guaranteedGold.min}-${table.guaranteedGold.max} Gold`;
          dropGrid.appendChild(goldEl);
        }

        dropSection.appendChild(dropGrid);
      }
      contentCol.appendChild(dropSection);
    }

    return panel;
  }

  // ─── Helpers ─────────────────────────────────────────────

  private buildStatRow(def: EnemyDef): HTMLElement {
    const stats = document.createElement('div');
    stats.style.cssText = 'font-size:11px; margin-top:4px; display:flex; gap:8px;';
    stats.innerHTML = [
      `<span style="color:var(--mc-hp)">❤️${def.hp}</span>`,
      `<span style="color:var(--mc-atk)">⚔️${def.atk}</span>`,
      `<span style="color:var(--mc-def)">🛡️${def.def}</span>`,
    ].join('');
    return stats;
  }

  private badge(text: string, color: string): HTMLElement {
    const b = document.createElement('span');
    b.style.cssText = `font-size:10px; padding:1px 5px; border-radius:3px; background:rgba(0,0,0,0.3); color:${color}; border:1px solid ${color}; white-space:nowrap;`;
    b.textContent = text;
    return b;
  }

  private roleLabel(role: string): string {
    switch (role) {
      case 'melee': return 'NAHKAMPF';
      case 'ranged': return 'FERNKAMPF';
      case 'support': return 'SUPPORT';
      case 'boss': return 'BOSS';
      default: return role.toUpperCase();
    }
  }

  private roleColor(role: string): string {
    switch (role) {
      case 'melee': return 'var(--mc-role-dps)';
      case 'ranged': return 'var(--mc-info)';
      case 'support': return 'var(--mc-role-support)';
      case 'boss': return 'var(--mc-damage)';
      default: return 'var(--mc-dim)';
    }
  }

  private effectIcon(type: string): string {
    switch (type) {
      case 'damage': return '⚔️';
      case 'heal': return '💚';
      case 'buff': return '🔵';
      case 'aoe': return '💥';
      case 'summon': return '👥';
      default: return '❓';
    }
  }

  private effectLabel(type: string): string {
    switch (type) {
      case 'damage': return 'Schaden';
      case 'heal': return 'Heilung';
      case 'buff': return 'Buff';
      case 'aoe': return 'Flächenschaden';
      case 'summon': return 'Beschwörung';
      default: return type;
    }
  }

  private dropRarity(weight: number): { color: string; border: string } {
    if (weight <= 5) return { color: '#E8C34A', border: 'rgba(232,195,74,0.4)' }; // legendary
    if (weight <= 10) return { color: '#A855F7', border: 'rgba(168,85,247,0.4)' }; // rare
    if (weight <= 15) return { color: '#4FC3F7', border: 'rgba(79,195,247,0.3)' }; // uncommon
    return { color: 'var(--mc-dim)', border: 'var(--mc-navy-separator)' }; // common
  }
}
