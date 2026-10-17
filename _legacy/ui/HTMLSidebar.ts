// ============================================================
// Magic City – HTMLSidebar
// Native HTML-Implementierung der vertikalen Sidebar.
// Kein Phaser-Import – reines DOM/CSS.
// ============================================================

export type SidebarAction = 'build' | 'road' | 'guild' | 'expedition' | 'storage' | 'help';

// ── Accent-Farben pro Button (spiegelt Sidebar.ts wider) ──
const ACCENT: Record<SidebarAction, { main: string; bright: string }> = {
  build:      { main: '#4CC9F0', bright: '#8EE4FF' },
  road:       { main: '#5CDB95', bright: '#9EFFC9' },
  guild:      { main: '#FFB347', bright: '#FFD285' },
  expedition: { main: '#FF6B6B', bright: '#FFA0A0' },
  storage:    { main: '#C77DFF', bright: '#E2B3FF' },
  help:       { main: '#FFE66D', bright: '#FFF3A8' },
};

// ── Fallback-Emojis ──
const SYMBOLS: Record<SidebarAction, string> = {
  build:      '🏗',
  road:       '🛤',
  guild:      '⚔',
  expedition: '🧭',
  storage:    '📦',
  help:       '❓',
};

// ── Button-Definitionen ──
const BUTTON_DEFS: Array<{
  action: SidebarAction;
  label: string;
  icon: string;
  shortcut: string;
}> = [
  { action: 'build',      label: 'Bauen',  icon: 'ICON_BUILD',      shortcut: 'B' },
  { action: 'road',       label: 'Straße', icon: 'ICON_ROAD',        shortcut: 'R' },
  { action: 'guild',      label: 'Gilde',  icon: 'ICON_GUILD',       shortcut: 'G' },
  { action: 'expedition', label: 'Exped.', icon: 'ICON_EXPEDITION',  shortcut: 'E' },
  { action: 'storage',    label: 'Lager',  icon: 'ICON_STORAGE',     shortcut: 'S' },
  { action: 'help',       label: 'Hilfe',  icon: 'ICON_HELP',        shortcut: '?' },
];

// Shortcut-Key → SidebarAction mapping (nur für keydown)
// b/r werden von InputHandler gehandelt (Build/Road-Modus-Toggle)
const SHORTCUT_MAP: Partial<Record<string, SidebarAction>> = {
  // g removed — used by Chest-Adjust tool
  // e removed — used by Chest-Adjust export
  s: 'storage',
};

export class HTMLSidebar {
  public static readonly WIDTH = 72;

  public onAction?: (action: SidebarAction) => void;
  /** Wird aufgerufen wenn der Export-Button geklickt wird. */
  public onExportMap?: () => void;

  private readonly el: HTMLElement;
  private activeAction: SidebarAction | null = null;
  private buttonEls = new Map<SidebarAction, HTMLElement>();
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor() {
    // Root-Element erzeugen
    this.el = document.createElement('div');
    this.el.id = 'ui-sidebar';
    Object.assign(this.el.style, {
      position:        'absolute',
      left:            '0',
      top:             '0',
      width:           '72px',
      height:          '100%',
      zIndex:          '20',
      background:      'linear-gradient(to right, var(--mc-navy-deep) 0%, var(--mc-navy-card) 100%)',
      borderRight:     '1px solid var(--mc-navy-separator)',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      paddingTop:      '4px',
      boxSizing:       'border-box',
      pointerEvents:   'auto',
      fontFamily:      'var(--mc-font)',
    });

    // In #ui-layer einhängen
    const layer = document.getElementById('ui-layer');
    if (layer) layer.appendChild(this.el);

    // Logo-Bereich
    this.el.appendChild(this.buildLogo());

    // Buttons
    for (const def of BUTTON_DEFS) {
      const btn = this.buildButton(def);
      this.buttonEls.set(def.action, btn);
      this.el.appendChild(btn);
    }

    // Export-Button (ganz unten)
    const exportBtn = document.createElement('div');
    exportBtn.title = 'Bodenflächen exportieren';
    Object.assign(exportBtn.style, {
      marginTop:      'auto',
      marginBottom:   '8px',
      width:          '62px',
      padding:        '5px 0',
      borderRadius:   '8px',
      background:     'var(--mc-navy-deep)',
      border:         '1.5px solid #ffffff22',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      cursor:         'pointer',
      pointerEvents:  'auto',
      userSelect:     'none',
    });
    const exportIcon = document.createElement('span');
    exportIcon.textContent = '📋';
    exportIcon.style.fontSize = '16px';
    const exportLabel = document.createElement('span');
    exportLabel.textContent = 'Export';
    Object.assign(exportLabel.style, { fontSize: '9px', color: 'var(--mc-dim)', marginTop: '2px' });
    exportBtn.appendChild(exportIcon);
    exportBtn.appendChild(exportLabel);
    exportBtn.addEventListener('mouseenter', () => { exportBtn.style.borderColor = '#4CC9F066'; });
    exportBtn.addEventListener('mouseleave', () => { exportBtn.style.borderColor = '#ffffff22'; });
    exportBtn.addEventListener('click', () => {
      this.onExportMap?.();
      exportLabel.textContent = 'Kopiert!';
      exportLabel.style.color = '#4CC9F0';
      setTimeout(() => {
        exportLabel.textContent = 'Export';
        exportLabel.style.color = 'var(--mc-dim)';
      }, 2000);
    });
    this.el.appendChild(exportBtn);

    // Keyboard-Shortcuts
    this.keydownHandler = (e: KeyboardEvent) => {
      // Keine Shortcuts wenn ein Eingabefeld fokussiert ist
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      const action = SHORTCUT_MAP[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        this.triggerAction(action);
      }
    };
    window.addEventListener('keydown', this.keydownHandler);
  }

  // ── Logo-Bereich ─────────────────────────────────────────────

  private buildLogo(): HTMLElement {
    const logo = document.createElement('div');
    logo.className = 'mc-sidebar-logo';
    Object.assign(logo.style, {
      width:          '62px',
      height:         '36px',
      background:     'var(--mc-panel-bg-darker)',
      border:         '1px solid var(--mc-navy-separator)',
      borderRadius:   '6px',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      marginBottom:   '4px',
      boxShadow:      '0 0 8px rgba(76,201,240,0.12)',
    });

    const icon = document.createElement('span');
    icon.textContent = '⚔';
    icon.className = 'mc-sidebar-logo-icon';
    Object.assign(icon.style, {
      fontSize:   '13px',
      color:      'var(--mc-gold)',
      lineHeight: '1',
    });

    const label = document.createElement('span');
    label.textContent = 'MC';
    label.className = 'mc-sidebar-logo-label';
    Object.assign(label.style, {
      fontSize:   '11px',
      color:      'var(--mc-dim)',
      fontWeight: 'bold',
      lineHeight: '1',
      marginTop:  '2px',
    });

    logo.appendChild(icon);
    logo.appendChild(label);
    return logo;
  }

  // ── Button ───────────────────────────────────────────────────

  private buildButton(def: {
    action: SidebarAction;
    label: string;
    icon: string;
    shortcut: string;
  }): HTMLElement {
    const accent = ACCENT[def.action];

    const btn = document.createElement('div');
    btn.className = 'mc-sidebar-btn';
    btn.dataset.action = def.action;
    Object.assign(btn.style, {
      position:       'relative',
      width:          '62px',
      height:         '62px',
      marginBottom:   '6px',
      borderRadius:   '10px',
      background:     'var(--mc-navy-deep)',
      border:         `1.5px solid ${accent.main}66`,
      boxSizing:      'border-box',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      cursor:         'pointer',
      pointerEvents:  'auto',
      transition:     'background 0.12s, border-color 0.12s, box-shadow 0.12s',
      userSelect:     'none',
    });

    // Icon-Bereich (Sprite oder Emoji-Fallback)
    const iconWrap = document.createElement('div');
    Object.assign(iconWrap.style, {
      width:          '38px',
      height:         '38px',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      marginBottom:   '2px',
    });

    const img = document.createElement('img');
    img.src = `/assets/sprites/final/${def.icon}.png`;
    img.width = 32;
    img.height = 32;
    img.style.objectFit = 'contain';
    img.style.imageRendering = 'auto';
    img.style.display = 'block';

    // Emoji-Fallback bei Ladefehler
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const emoji = document.createElement('span');
      emoji.textContent = SYMBOLS[def.action];
      emoji.style.fontSize = '22px';
      emoji.style.color = accent.main;
      emoji.style.lineHeight = '1';
      iconWrap.appendChild(emoji);
    });

    iconWrap.appendChild(img);
    btn.appendChild(iconWrap);

    // Label
    const labelEl = document.createElement('span');
    labelEl.textContent = def.label;
    labelEl.className = `mc-sidebar-label mc-sidebar-label-${def.action}`;
    Object.assign(labelEl.style, {
      fontSize:   '11px',
      color:      'var(--mc-dim)',
      fontWeight: 'bold',
      lineHeight: '1',
    });
    btn.appendChild(labelEl);

    // Shortcut-Badge (rechts unten)
    const badge = document.createElement('span');
    badge.textContent = def.shortcut;
    badge.className = 'mc-sidebar-shortcut';
    Object.assign(badge.style, {
      position:       'absolute',
      bottom:         '3px',
      right:          '3px',
      fontSize:       '9px',
      color:          'var(--mc-muted)',
      background:     'var(--mc-panel-bg-darker)',
      border:         '1px solid var(--mc-navy-separator)',
      borderRadius:   '3px',
      padding:        '0 3px',
      lineHeight:     '12px',
      pointerEvents:  'none',
    });
    btn.appendChild(badge);

    // ── Events ──
    btn.addEventListener('mouseenter', () => {
      if (this.activeAction !== def.action) {
        this.applyHoverStyle(btn, def.action);
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (this.activeAction !== def.action) {
        this.applyIdleStyle(btn, def.action);
      }
    });
    btn.addEventListener('click', () => {
      this.triggerAction(def.action);
    });

    return btn;
  }

  // ── Style-Helpers ─────────────────────────────────────────────

  private isHolo(): boolean {
    return document.documentElement.dataset.theme === 'holo';
  }

  private applyIdleStyle(btn: HTMLElement, action: SidebarAction): void {
    const accent = ACCENT[action];
    if (this.isHolo()) {
      btn.style.background   = 'rgba(0,240,255,0.04)';
      btn.style.borderColor  = 'rgba(0,240,255,0.15)';
      btn.style.boxShadow    = 'none';
    } else {
      btn.style.background   = 'var(--mc-navy-deep)';
      btn.style.borderColor  = `${accent.main}66`;
      btn.style.boxShadow    = `0 0 8px ${accent.main}17`;
    }
  }

  private applyHoverStyle(btn: HTMLElement, action: SidebarAction): void {
    const accent = ACCENT[action];
    if (this.isHolo()) {
      btn.style.background   = 'rgba(0,240,255,0.10)';
      btn.style.borderColor  = 'rgba(0,240,255,0.4)';
      btn.style.boxShadow    = '0 0 12px rgba(0,240,255,0.15)';
    } else {
      btn.style.background   = '#181E2E';
      btn.style.borderColor  = `${accent.main}A6`;
      btn.style.boxShadow    = `0 0 12px ${accent.main}2E`;
    }
  }

  private applyActiveStyle(btn: HTMLElement, action: SidebarAction): void {
    const accent = ACCENT[action];
    if (this.isHolo()) {
      btn.style.background   = 'rgba(0,240,255,0.15)';
      btn.style.borderColor  = '#00f0ff';
      btn.style.boxShadow    = '0 0 16px rgba(0,240,255,0.25), inset 0 0 8px rgba(0,240,255,0.08)';
    } else {
      btn.style.background   = '#20263A';
      btn.style.borderColor  = accent.bright;
      btn.style.boxShadow    = `0 0 16px ${accent.main}4D, inset 0 0 8px ${accent.main}1A`;
    }
  }

  private updateLabel(btn: HTMLElement, action: SidebarAction, isActive: boolean): void {
    const labelEl = btn.querySelector<HTMLElement>(`.mc-sidebar-label-${action}`);
    if (labelEl) {
      if (this.isHolo()) {
        labelEl.style.color = isActive ? '#00f0ff' : 'var(--mc-dim)';
      } else {
        labelEl.style.color = isActive ? ACCENT[action].main : 'var(--mc-dim)';
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────

  setActive(action: SidebarAction | null): void {
    // Vorherigen Aktiv-Zustand zurücksetzen
    if (this.activeAction !== null) {
      const prevBtn = this.buttonEls.get(this.activeAction);
      if (prevBtn) {
        this.applyIdleStyle(prevBtn, this.activeAction);
        this.updateLabel(prevBtn, this.activeAction, false);
      }
    }

    this.activeAction = action;

    // Neuen Aktiv-Zustand setzen
    if (action !== null) {
      const btn = this.buttonEls.get(action);
      if (btn) {
        this.applyActiveStyle(btn, action);
        this.updateLabel(btn, action, true);
      }
    }
  }

  getActive(): SidebarAction | null {
    return this.activeAction;
  }

  // No-op – HTML panels are screen-space, kein Kamera-Update nötig
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* no-op */ }

  destroy(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    this.el.remove();
  }

  // ── Internes Trigger ─────────────────────────────────────────

  private triggerAction(action: SidebarAction): void {
    // Toggle: Nochmal klicken = deaktivieren
    if (this.activeAction === action) {
      this.setActive(null);
    } else {
      this.setActive(action);
    }

    this.onAction?.(action);
  }
}
