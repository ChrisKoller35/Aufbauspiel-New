// ============================================================
// Magic City – HTMLHUD
// Native HTML-Implementierung des oberen HUD-Balkens.
// Kein Phaser-Import – reines DOM/CSS.
// ============================================================

import { GameState } from '../../models/GameState';
import { GUILD_RANK_DEFS } from '../../data/guildRanks';
import { CLASS_DEFS } from '../../data/classes';

// ── Ressourcen-Definitionen ──────────────────────────────────
const RESOURCE_DEFS: Array<{
  key: string;
  icon: string;
  label: string;
}> = [
  { key: 'gold',  icon: 'ICON_GOLD',  label: 'GOLD'  },
  { key: 'wood',  icon: 'ICON_WOOD',  label: 'HOLZ'  },
  { key: 'stone', icon: 'ICON_STONE', label: 'STEIN' },
  { key: 'bread', icon: 'ICON_BREAD', label: 'BROT'  },
  { key: 'pop',   icon: 'ICON_POP',   label: 'POP'   },
];

export class HTMLHUD {
  private readonly el: HTMLElement;

  // Ressourcen-Wert-Spans
  private readonly resValues = new Map<string, HTMLElement>();

  // Info-Bereich
  private satisfactionEl!: HTMLElement;
  private guildRankEl!:    HTMLElement;
  private workersEl!:      HTMLElement;
  private dayEl!:          HTMLElement;

  // Training-Indikator
  private trainingBadge!: HTMLElement;
  private trainingText!:  HTMLElement;

  // Event-Indikator
  private eventBadge!: HTMLElement;

  // Theme toggle
  private themeToggleLabel!: HTMLElement;

  /** Callback when user changes theme. UIManager wires this to save state. */
  onThemeChanged: ((theme: 'classic' | 'holo') => void) | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'ui-hud';
    Object.assign(this.el.style, {
      position:       'absolute',
      top:            '0',
      left:           '72px',
      right:          '0',
      height:         '48px',
      zIndex:         '20',
      background:     'var(--mc-navy-panel)',
      borderBottom:   '2px solid var(--mc-panel-border)',
      display:        'flex',
      alignItems:     'center',
      gap:            '6px',
      padding:        '0 10px 0 8px',
      boxSizing:      'border-box',
      pointerEvents:  'auto',
      fontFamily:     'var(--mc-font)',
    });

    // In #ui-layer einhängen
    const layer = document.getElementById('ui-layer');
    if (layer) layer.appendChild(this.el);

    this.buildContent();
  }

  // ── DOM aufbauen ─────────────────────────────────────────────

  private buildContent(): void {
    // Ressourcen-Chips
    for (const res of RESOURCE_DEFS) {
      const chip = this.buildChip(res.icon, res.label);
      this.el.appendChild(chip.el);
      this.resValues.set(res.key, chip.valueEl);
    }

    // Separator
    this.el.appendChild(this.buildSeparator());

    // Info-Bereich (Zufriedenheit + Rang + Arbeiter)
    const infoArea = this.buildInfoArea();
    this.el.appendChild(infoArea);

    // Training-Badge
    this.trainingBadge = this.buildTrainingBadge();
    this.el.appendChild(this.trainingBadge);

    // Event-Badge
    this.eventBadge = this.buildEventBadge();
    this.el.appendChild(this.eventBadge);

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    this.el.appendChild(spacer);

    // Theme Toggle (rechts neben Spacer, vor Tag)
    const themeToggle = this.buildThemeToggle();
    this.el.appendChild(themeToggle);

    // Tag (rechts)
    const dayBlock = this.buildDayBlock();
    this.el.appendChild(dayBlock);
  }

  // ── Chip ─────────────────────────────────────────────────────

  private buildChip(
    iconKey: string,
    label: string,
  ): { el: HTMLElement; valueEl: HTMLElement } {
    const chip = document.createElement('div');
    chip.className = 'mc-chip';
    Object.assign(chip.style, {
      height:     '34px',
      minWidth:   '80px',
      borderRadius: '6px',
    });

    // Icon
    const img = document.createElement('img');
    img.src = `/assets/sprites/final/${iconKey}.png`;
    img.width = 18;
    img.height = 18;
    img.style.objectFit = 'contain';
    img.style.imageRendering = 'auto';
    img.style.flexShrink = '0';

    // Fallback: Ersten Buchstaben des Labels anzeigen
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const letter = document.createElement('span');
      letter.textContent = label[0];
      letter.style.color = 'var(--mc-gold)';
      letter.style.fontSize = '12px';
      letter.style.fontWeight = 'bold';
      chip.insertBefore(letter, chip.firstChild);
    });

    chip.appendChild(img);

    // Label + Wert (Spalte)
    const col = document.createElement('div');
    Object.assign(col.style, {
      display:       'flex',
      flexDirection: 'column',
      lineHeight:    '1',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.className = 'mc-hud-chip-label';
    Object.assign(labelEl.style, {
      fontSize: '10px',
      color:    'var(--mc-dim)',
    });
    col.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.textContent = '0';
    valueEl.className = 'mc-chip-val';
    Object.assign(valueEl.style, {
      fontSize:   '13px',
      color:      'var(--mc-light)',
      fontWeight: 'bold',
    });
    col.appendChild(valueEl);

    chip.appendChild(col);
    return { el: chip, valueEl };
  }

  // ── Separator ─────────────────────────────────────────────────

  private buildSeparator(): HTMLElement {
    const sep = document.createElement('div');
    sep.className = 'mc-hud-separator';
    Object.assign(sep.style, {
      width:      '1px',
      height:     '32px',
      background: 'var(--mc-navy-separator)',
      flexShrink: '0',
      margin:     '0 4px',
    });
    return sep;
  }

  // ── Info-Bereich ──────────────────────────────────────────────

  private buildInfoArea(): HTMLElement {
    const area = document.createElement('div');
    Object.assign(area.style, {
      display:  'flex',
      gap:      '16px',
      alignItems: 'center',
    });

    // Zufriedenheit
    const satBlock = this.buildInfoBlock('ZUFRIEDENHEIT', '50% Akzeptabel');
    this.satisfactionEl = satBlock.valueEl;
    area.appendChild(satBlock.el);

    // Gildenrang
    const rankBlock = this.buildInfoBlock('GILDENRANG', 'Novize');
    this.guildRankEl = rankBlock.valueEl;
    rankBlock.valueEl.style.color = 'var(--mc-gold)';
    area.appendChild(rankBlock.el);

    // Arbeiter
    const wrkBlock = this.buildInfoBlock('ARBEITER', '0/0');
    this.workersEl = wrkBlock.valueEl;
    area.appendChild(wrkBlock.el);

    return area;
  }

  private buildInfoBlock(
    label: string,
    initialValue: string,
  ): { el: HTMLElement; valueEl: HTMLElement } {
    const block = document.createElement('div');
    Object.assign(block.style, {
      display:       'flex',
      flexDirection: 'column',
      lineHeight:    '1',
    });

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.className = 'mc-hud-info-label';
    Object.assign(labelEl.style, {
      fontSize: '11px',
      color:    'var(--mc-dim)',
    });
    block.appendChild(labelEl);

    const valueEl = document.createElement('div');
    valueEl.textContent = initialValue;
    valueEl.className = 'mc-hud-info-value';
    Object.assign(valueEl.style, {
      fontSize:   '13px',
      color:      'var(--mc-light)',
      fontWeight: 'bold',
      marginTop:  '2px',
    });
    block.appendChild(valueEl);

    return { el: block, valueEl };
  }

  // ── Training-Badge ─────────────────────────────────────────────

  private buildTrainingBadge(): HTMLElement {
    const badge = document.createElement('div');
    badge.className = 'mc-hud-training-badge';
    Object.assign(badge.style, {
      background:   'var(--mc-navy-card)',
      border:       '1px solid var(--mc-panel-border)',
      borderRadius: '4px',
      padding:      '3px 8px',
      display:      'none',
      alignItems:   'center',
      gap:          '5px',
      fontSize:     '12px',
      color:        'var(--mc-gold)',
    });

    const icon = document.createElement('span');
    icon.textContent = '⚔';
    badge.appendChild(icon);

    this.trainingText = document.createElement('span');
    this.trainingText.textContent = '';
    badge.appendChild(this.trainingText);

    return badge;
  }

  // ── Event-Badge ────────────────────────────────────────────────

  private buildEventBadge(): HTMLElement {
    const badge = document.createElement('div');
    badge.className = 'mc-hud-event-badge';
    Object.assign(badge.style, {
      background:   'var(--mc-navy-card)',
      border:       '1px solid #FF994480',
      borderRadius: '4px',
      padding:      '3px 8px',
      display:      'none',
      alignItems:   'center',
      fontSize:     '12px',
      color:        '#FF9944',
    });
    return badge;
  }

  // ── Theme Toggle ───────────────────────────────────────────────

  private buildThemeToggle(): HTMLElement {
    const btn = document.createElement('button');
    btn.id = 'mc-theme-toggle';

    const icon = document.createElement('span');
    icon.textContent = '◈';
    btn.appendChild(icon);

    this.themeToggleLabel = document.createElement('span');
    btn.appendChild(this.themeToggleLabel);

    // Read initial theme from DOM (set during refresh)
    this.updateToggleLabel();

    btn.addEventListener('click', () => {
      const isHolo = document.documentElement.dataset.theme === 'holo';
      const newTheme: 'classic' | 'holo' = isHolo ? 'classic' : 'holo';

      if (newTheme === 'holo') {
        document.documentElement.dataset.theme = 'holo';
      } else {
        delete document.documentElement.dataset.theme;
      }

      this.updateToggleLabel();

      if (this.onThemeChanged) {
        this.onThemeChanged(newTheme);
      }
    });

    return btn;
  }

  private updateToggleLabel(): void {
    const isHolo = document.documentElement.dataset.theme === 'holo';
    if (this.themeToggleLabel) {
      this.themeToggleLabel.textContent = isHolo ? 'HOLO' : 'Classic';
    }
  }

  // ── Tag-Block (rechts) ─────────────────────────────────────────

  private buildDayBlock(): HTMLElement {
    const block = document.createElement('div');
    Object.assign(block.style, {
      display:       'flex',
      flexDirection: 'column',
      lineHeight:    '1',
      textAlign:     'right',
    });

    const labelEl = document.createElement('div');
    labelEl.textContent = 'TAG';
    labelEl.className = 'mc-hud-day-label';
    Object.assign(labelEl.style, {
      fontSize: '11px',
      color:    'var(--mc-dim)',
    });
    block.appendChild(labelEl);

    this.dayEl = document.createElement('div');
    this.dayEl.textContent = '1';
    this.dayEl.className = 'mc-hud-day-value';
    Object.assign(this.dayEl.style, {
      fontSize:   '15px',
      color:      'var(--mc-gold)',
      fontWeight: 'bold',
      marginTop:  '2px',
    });
    block.appendChild(this.dayEl);

    return block;
  }

  // ── Public API ─────────────────────────────────────────────────

  refresh(state: GameState): void {
    // ── Theme (apply from state → DOM) ──
    const theme = state.uiTheme ?? 'classic';
    if (theme === 'holo') {
      document.documentElement.dataset.theme = 'holo';
    } else {
      delete document.documentElement.dataset.theme;
    }
    this.updateToggleLabel();

    // ── Ressourcen ──
    const stock = state.globalStock;
    const goldEl  = this.resValues.get('gold');   if (goldEl)  goldEl.textContent  = String(Math.floor(stock.gold  ?? 0));
    const woodEl  = this.resValues.get('wood');   if (woodEl)  woodEl.textContent  = String(Math.floor(stock.wood  ?? 0));
    const stoneEl = this.resValues.get('stone');  if (stoneEl) stoneEl.textContent = String(Math.floor(stock.stone ?? 0));
    const breadEl = this.resValues.get('bread');  if (breadEl) breadEl.textContent = String(Math.floor(stock.bread ?? 0));

    // ── Bevölkerung ──
    const totalPop     = state.citizens.length;
    const workerCount  = state.citizens.filter(c => c.status === 'WORKER').length;
    const builderCount = state.citizens.filter(c => c.status === 'BUILDER').length;
    const idleCount    = state.citizens.filter(c => c.status === 'IDLE').length;
    const popEl = this.resValues.get('pop');
    if (popEl) popEl.textContent = String(totalPop);
    this.workersEl.textContent = `${workerCount + builderCount}/${totalPop - idleCount}`;

    // ── Tag ──
    this.dayEl.textContent = String(state.day);

    // ── Zufriedenheit ──
    const sat = Math.round(state.satisfaction ?? 50);
    let satLabel: string;
    let satColor: string;
    if      (sat >= 80) { satLabel = 'Hervorragend'; satColor = '#66BB6A'; }
    else if (sat >= 60) { satLabel = 'Gut';          satColor = '#88CC88'; }
    else if (sat >= 40) { satLabel = 'Akzeptabel';   satColor = '#D4A54A'; }
    else if (sat >= 20) { satLabel = 'Schlecht';     satColor = '#FF9944'; }
    else                { satLabel = 'Kritisch';     satColor = '#EF5350'; }
    this.satisfactionEl.textContent = `${sat}% ${satLabel}`;
    this.satisfactionEl.style.color = satColor;

    // ── Gildenrang ──
    const rank    = state.guildStats?.rank ?? 1;
    const rankDef = GUILD_RANK_DEFS.find(r => r.rank === rank);
    const MAX_RANK = 5;
    if (rank >= MAX_RANK) {
      this.guildRankEl.textContent = `${rankDef?.name ?? 'Legende'} ★`;
    } else {
      const nextRankDef = GUILD_RANK_DEFS.find(r => r.rank === rank + 1);
      let progressText = '';
      if (nextRankDef?.conditions) {
        const cond = nextRankDef.conditions;
        if (cond.forestShortCompleted != null) {
          progressText = ` (${state.guildStats?.forestShortCompleted ?? 0}/${cond.forestShortCompleted})`;
        } else if (cond.totalBossesDefeated != null) {
          progressText = ` (${state.guildStats?.totalBossesDefeated ?? 0}/${cond.totalBossesDefeated})`;
        } else if (cond.forestMediumBossDefeated != null) {
          progressText = ` (${state.guildStats?.forestMediumBossDefeated ? 1 : 0}/1)`;
        } else if (cond.guildHallT2 != null) {
          progressText = ` (${state.guildStats?.guildHallT2 ? 1 : 0}/1)`;
        }
      }
      this.guildRankEl.textContent = `${rankDef?.name ?? 'Novize'}${progressText}`;
    }

    // ── Training-Indikator ──
    const trainingCitizen = state.citizens.find(c => c.status === 'GUILD_TRAINING');
    if (trainingCitizen?.trainingClassId) {
      const cls       = CLASS_DEFS[trainingCitizen.trainingClassId];
      const remaining = Math.ceil(trainingCitizen.trainingTimer ?? 0);
      this.trainingText.textContent = `${cls?.name ?? trainingCitizen.trainingClassId} ${remaining}s`;
      this.trainingBadge.style.display = 'flex';
    } else {
      this.trainingBadge.style.display = 'none';
    }

    // ── Event-Indikator ──
    if (state.activeEvent) {
      // Einfaches Format ohne CITY_EVENT_DEFS-Import (nur ID bereinigt)
      const eventName = state.activeEvent.eventId.replace('EVENT_', '').replace(/_/g, ' ');
      this.eventBadge.textContent = `⚡ ${eventName}`;
      this.eventBadge.style.display = 'flex';
    } else {
      this.eventBadge.style.display = 'none';
    }
  }

  // No-op – HTML panels are screen-space
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* no-op */ }

  destroy(): void {
    this.el.remove();
  }
}
