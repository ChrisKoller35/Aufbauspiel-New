// ============================================================
// Magic City – HTMLBuildMenu
// Native HTML-Implementierung des Bau-Menüs am unteren Rand.
// Kein Phaser-Import – reines DOM/CSS.
// Zeigt Gebäude-Buttons in Build-Mode, Modus-Buttons sonst.
// ============================================================

import { BUILDING_DEFS, BUILD_MENU_ORDER } from '../../data/buildings';

export type BuildMode = 'none' | 'build' | 'road' | 'demolish' | 'swamp' | 'gray' | 'dirt';

// ── Modus-Button-Definitionen ─────────────────────────────────
interface ModeBtnDef {
  mode: BuildMode;
  label: string;
  shortcut: string;
}

const MODE_BTNS: ModeBtnDef[] = [
  { mode: 'build',    label: 'Bauen',    shortcut: 'B' },
  { mode: 'road',     label: 'Straße',   shortcut: 'R' },
  { mode: 'demolish', label: 'Abriss',   shortcut: 'D' },
  { mode: 'gray',     label: 'Grau',     shortcut: '' },
  { mode: 'dirt',     label: 'Erde',     shortcut: '' },
];

// ── Farb-Akzente für Modus-Buttons ───────────────────────────
const MODE_ACCENT: Partial<Record<BuildMode, string>> = {
  build:    '#F59E0B',
  road:     '#5CDB95',
  demolish: '#EF5350',
  gray:     '#8899AA',
  dirt:     '#A07850',
};

export class HTMLBuildMenu {
  // ── Öffentliche API ───────────────────────────────────────
  public onSelectBuilding?: (typeId: string) => void;
  public onModeChange?:     (mode: BuildMode) => void;

  private _currentMode: BuildMode = 'none';
  private _selectedTypeId: string | null = null;

  // ── DOM-Referenzen ────────────────────────────────────────
  private readonly el: HTMLElement;
  private readonly modeBar: HTMLElement;
  private readonly paletteRow: HTMLElement;

  // Button-Maps für State-Updates
  private readonly modeBtnEls  = new Map<BuildMode, HTMLElement>();
  private readonly buildBtnEls = new Map<string, HTMLElement>();

  // ── Getter ────────────────────────────────────────────────
  get currentMode(): BuildMode { return this._currentMode; }

  constructor() {
    // Root-Container
    this.el = document.createElement('div');
    this.el.id = 'ui-build-menu';
    Object.assign(this.el.style, {
      position:      'absolute',
      bottom:        '30px',
      left:          '72px',
      right:         '0',
      zIndex:        '15',
      background:    'var(--mc-navy-panel)',
      borderTop:     '2px solid var(--mc-panel-border)',
      display:       'flex',
      flexDirection: 'column',
      pointerEvents: 'auto',
      fontFamily:    'var(--mc-font)',
      boxSizing:     'border-box',
    });

    // ── Modus-Leiste (immer sichtbar) ─────────────────────
    this.modeBar = document.createElement('div');
    Object.assign(this.modeBar.style, {
      display:    'flex',
      alignItems: 'center',
      gap:        '6px',
      padding:    '4px 10px',
      background: 'var(--mc-navy-deep)',
      borderBottom: '1px solid var(--mc-navy-separator)',
      minHeight:  '38px',
      boxSizing:  'border-box',
    });
    this.buildModBar();
    this.el.appendChild(this.modeBar);

    // ── Gebäude-Palette (nur im Build-Mode sichtbar) ───────
    this.paletteRow = document.createElement('div');
    Object.assign(this.paletteRow.style, {
      display:    'none',
      alignItems: 'center',
      gap:        '6px',
      padding:    '5px 10px',
      overflowX:  'auto',
      flexWrap:   'nowrap',
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--mc-panel-border) var(--mc-navy-panel)',
    });
    this.buildPaletteRow();
    this.el.appendChild(this.paletteRow);

    // In #ui-layer einhängen
    const layer = document.getElementById('ui-layer');
    if (layer) layer.appendChild(this.el);
  }

  // ── Modus-Leiste aufbauen ──────────────────────────────────

  private buildModBar(): void {
    // ESC-Hinweis ganz links (klein)
    const escHint = document.createElement('span');
    escHint.textContent = 'ESC = Normal';
    Object.assign(escHint.style, {
      fontSize:   '11px',
      color:      'var(--mc-disabled)',
      marginRight: '6px',
      whiteSpace: 'nowrap',
    });
    this.modeBar.appendChild(escHint);

    // Modus-Buttons
    for (const def of MODE_BTNS) {
      const btn = this.buildModeBtn(def);
      this.modeBtnEls.set(def.mode, btn);
      this.modeBar.appendChild(btn);
    }

    // Flexibler Abstandhalter
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    this.modeBar.appendChild(spacer);

    // Aktueller Modus-Label rechts
    const modeLabel = document.createElement('span');
    modeLabel.id = 'ui-build-menu-mode-label';
    Object.assign(modeLabel.style, {
      fontSize:   '11px',
      color:      'var(--mc-disabled)',
      whiteSpace: 'nowrap',
    });
    this.modeBar.appendChild(modeLabel);
  }

  private buildModeBtn(def: ModeBtnDef): HTMLElement {
    const accent = MODE_ACCENT[def.mode] ?? 'var(--mc-gold)';

    const btn = document.createElement('button');
    btn.className = 'mc-btn mc-build-mode-btn';
    Object.assign(btn.style, {
      display:        'flex',
      alignItems:     'center',
      gap:            '5px',
      padding:        '4px 12px',
      fontSize:       '13px',
      background:     'var(--mc-navy-btn)',
      borderColor:    `${accent}55`,
      color:          'var(--mc-dim)',
      minWidth:       '80px',
      justifyContent: 'center',
      transition:     'background 0.1s, border-color 0.1s, color 0.1s',
      cursor:         'pointer',
      whiteSpace:     'nowrap',
    });

    // Label + Shortcut-Badge
    const labelEl = document.createElement('span');
    labelEl.textContent = def.label;
    btn.appendChild(labelEl);

    const badge = document.createElement('span');
    badge.textContent = def.shortcut;
    badge.className = 'mc-build-shortcut';
    Object.assign(badge.style, {
      fontSize:     '9px',
      color:        'var(--mc-muted)',
      background:   'var(--mc-panel-bg-darker)',
      border:       '1px solid var(--mc-navy-separator)',
      borderRadius: '3px',
      padding:      '0 3px',
      lineHeight:   '13px',
      marginLeft:   '2px',
    });
    btn.appendChild(badge);

    btn.addEventListener('mouseenter', () => {
      if (this._currentMode !== def.mode) {
        btn.style.background   = 'var(--mc-navy-btn-hover)';
        btn.style.borderColor  = `${accent}99`;
        btn.style.color        = 'var(--mc-light)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (this._currentMode !== def.mode) {
        this.applyModeBtnIdle(btn, def.mode);
      }
    });
    btn.addEventListener('click', () => {
      // Toggle: nochmal klicken = none
      if (this._currentMode === def.mode) {
        this.setMode('none');
      } else {
        this.setMode(def.mode);
      }
    });

    return btn;
  }

  // ── Gebäude-Palette aufbauen ───────────────────────────────

  private buildPaletteRow(): void {
    // Trennlinie-Label
    const label = document.createElement('span');
    label.textContent = 'Gebäude:';
    Object.assign(label.style, {
      fontSize:   '11px',
      color:      'var(--mc-disabled)',
      whiteSpace: 'nowrap',
      flexShrink: '0',
    });
    this.paletteRow.appendChild(label);

    // Gebäude-Buttons in BUILD_MENU_ORDER (ohne ROAD und DUNGEON_CAMP)
    for (const typeId of BUILD_MENU_ORDER) {
      if (typeId === 'ROAD' || typeId === 'DUNGEON_CAMP') continue;
      const def = BUILDING_DEFS[typeId];
      if (!def) continue;

      const btn = this.buildBuildingBtn(typeId, def.name, def.buildCost);
      this.buildBtnEls.set(typeId, btn);
      this.paletteRow.appendChild(btn);
    }
  }

  private buildBuildingBtn(
    typeId: string,
    name: string,
    cost: Record<string, number>,
  ): HTMLElement {
    const btn = document.createElement('div');
    btn.className = 'mc-build-building-btn';
    Object.assign(btn.style, {
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'space-between',
      width:          '78px',
      minWidth:       '78px',
      padding:        '5px 4px 4px',
      background:     'var(--mc-navy-card)',
      border:         '1.5px solid var(--mc-navy-separator)',
      borderRadius:   '7px',
      cursor:         'pointer',
      boxSizing:      'border-box',
      flexShrink:     '0',
      transition:     'background 0.1s, border-color 0.1s',
      userSelect:     'none',
    });

    // ── Sprite-Icon ───────────────────────────────────────
    const imgWrap = document.createElement('div');
    Object.assign(imgWrap.style, {
      width:          '44px',
      height:         '44px',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
    });

    const img = document.createElement('img');
    img.src = `/assets/sprites/final/${typeId}.png`;
    img.width  = 40;
    img.height = 40;
    img.style.objectFit    = 'contain';
    img.style.imageRendering = 'auto';
    img.style.display      = 'block';

    // Fallback: ersten 3 Buchstaben des Namens anzeigen
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const fallback = document.createElement('span');
      fallback.textContent = typeId.substring(0, 3);
      Object.assign(fallback.style, {
        fontSize:   '13px',
        color:      '#F59E0B',
        fontWeight: 'bold',
      });
      imgWrap.appendChild(fallback);
    });

    imgWrap.appendChild(img);
    btn.appendChild(imgWrap);

    // ── Gebäude-Name (truncated) ──────────────────────────
    const nameEl = document.createElement('span');
    // Namen auf max 10 Zeichen kürzen für engen Layout
    nameEl.textContent = name.length > 10 ? `${name.substring(0, 9)}…` : name;
    nameEl.className = 'mc-build-name';
    Object.assign(nameEl.style, {
      fontSize:  '11px',
      color:     'var(--mc-light)',
      textAlign: 'center',
      lineHeight: '1.2',
      marginTop: '2px',
      width:     '100%',
    });
    btn.appendChild(nameEl);

    // ── Kosten-Zeile ──────────────────────────────────────
    const costEl = document.createElement('div');
    Object.assign(costEl.style, {
      display:    'flex',
      flexWrap:   'wrap',
      gap:        '2px',
      justifyContent: 'center',
      marginTop:  '3px',
    });

    const costEntries = Object.entries(cost);
    for (const [res, amount] of costEntries) {
      const chip = document.createElement('span');
      chip.textContent = `${this.resIcon(res)}${amount}`;
      chip.className = 'mc-build-cost-chip';
      Object.assign(chip.style, {
        fontSize:     '10px',
        color:        'var(--mc-gold)',
        background:   'var(--mc-navy-deep)',
        borderRadius: '3px',
        padding:      '0 3px',
        lineHeight:   '14px',
        whiteSpace:   'nowrap',
      });
      costEl.appendChild(chip);
    }
    if (costEntries.length === 0) {
      const freeEl = document.createElement('span');
      freeEl.textContent = 'Gratis';
      Object.assign(freeEl.style, {
        fontSize: '10px',
        color:    '#66BB6A',
      });
      costEl.appendChild(freeEl);
    }
    btn.appendChild(costEl);

    // ── Hover- und Klick-Events ───────────────────────────
    btn.addEventListener('mouseenter', () => {
      if (this._selectedTypeId !== typeId) {
        btn.style.background  = 'var(--mc-navy-card-light)';
        btn.style.borderColor = 'var(--mc-panel-border)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (this._selectedTypeId !== typeId) {
        this.applyBuildBtnIdle(btn);
      }
    });
    btn.addEventListener('click', () => {
      this._selectedTypeId = typeId;
      this.refreshBuildBtnStyles();
      this.onSelectBuilding?.(typeId);
    });

    return btn;
  }

  // ── Ressourcen-Icon Emoji-Shorthand ───────────────────────

  private resIcon(key: string): string {
    const icons: Record<string, string> = {
      wood:  '🪵',
      stone: '🪨',
      gold:  '🪙',
      bread: '🍞',
    };
    return icons[key] ?? '';
  }

  // ── Style-Helpers ─────────────────────────────────────────

  private applyModeBtnIdle(btn: HTMLElement, mode: BuildMode): void {
    const accent = MODE_ACCENT[mode] ?? 'var(--mc-gold)';
    btn.style.background  = 'var(--mc-navy-btn)';
    btn.style.borderColor = `${accent}55`;
    btn.style.color       = 'var(--mc-dim)';
  }

  private applyModeBtnActive(btn: HTMLElement, mode: BuildMode): void {
    const accent = MODE_ACCENT[mode] ?? 'var(--mc-gold)';
    btn.style.background  = 'var(--mc-navy-btn-hover)';
    btn.style.borderColor = accent;
    btn.style.color       = accent;
  }

  private applyBuildBtnIdle(btn: HTMLElement): void {
    btn.style.background  = 'var(--mc-navy-card)';
    btn.style.borderColor = 'var(--mc-navy-separator)';
  }

  private applyBuildBtnActive(btn: HTMLElement): void {
    btn.style.background  = 'var(--mc-navy-card-light)';
    btn.style.borderColor = 'var(--mc-panel-border)';
  }

  private refreshModeBtnStyles(): void {
    for (const [mode, btn] of this.modeBtnEls) {
      if (this._currentMode === mode) {
        this.applyModeBtnActive(btn, mode);
      } else {
        this.applyModeBtnIdle(btn, mode);
      }
    }
  }

  private refreshBuildBtnStyles(): void {
    for (const [typeId, btn] of this.buildBtnEls) {
      if (this._selectedTypeId === typeId) {
        this.applyBuildBtnActive(btn);
      } else {
        this.applyBuildBtnIdle(btn);
      }
    }
  }

  private updateModeLabel(): void {
    const labelEl = this.el.querySelector<HTMLElement>('#ui-build-menu-mode-label');
    if (!labelEl) return;
    const labels: Partial<Record<BuildMode, string>> = {
      none:     '',
      build:    'Bau-Modus',
      road:     'Straßen-Modus',
      demolish: 'Abriss-Modus',
      swamp:    'Sumpf-Maler',
    };
    labelEl.textContent = labels[this._currentMode] ?? '';
  }

  // ── Öffentliche API ───────────────────────────────────────

  setMode(mode: BuildMode): void {
    this._currentMode   = mode;
    this._selectedTypeId = null;

    // Palette ein-/ausblenden
    this.paletteRow.style.display = mode === 'build' ? 'flex' : 'none';

    // Button-Styles aktualisieren
    this.refreshModeBtnStyles();
    this.refreshBuildBtnStyles();
    this.updateModeLabel();

    // Callbacks
    this.onModeChange?.(mode);
    if (mode !== 'build') {
      // Kein Gebäude mehr ausgewählt → UIManager-Callback ohne typeId
      // (UIManager setzt selectedBuildingType = null)
    }
  }

  /** No-op – HTML-Panels sind screen-space, kein Kamera-Update nötig. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* no-op */ }

  isVisible(): boolean {
    return !this.el.hasAttribute('hidden');
  }

  destroy(): void {
    this.el.remove();
  }
}
