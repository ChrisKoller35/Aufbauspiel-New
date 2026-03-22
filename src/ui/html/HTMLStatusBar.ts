// ============================================================
// Magic City – HTMLStatusBar
// Native HTML-Implementierung der unteren Statusleiste.
// Kein Phaser-Import – reines DOM/CSS.
// ============================================================

// ── Mode → Icon-Emoji ────────────────────────────────────────
// Keys must match the status strings used in UIManager.updateStatusBar()
const MODE_ICONS: Record<string, string> = {
  'Bau-Modus':     '🏗',
  'Strassen-Modus': '🛤',
  'Abriss-Modus':  '🔨',
};

// ── Mode → Farbe ─────────────────────────────────────────────
const MODE_COLORS: Record<string, string> = {
  'Bau-Modus':     '#66BB6A',  // heal green
  'Strassen-Modus': '#4FC3F7', // info blue
  'Abriss-Modus':  '#EF5350',  // damage red
};

export class HTMLStatusBar {
  public static readonly HEIGHT = 36;

  private readonly el: HTMLElement;
  private readonly statusIconEl: HTMLElement;
  private readonly statusTextEl: HTMLElement;
  private readonly hintTextEl:   HTMLElement;

  /** Wird aufgerufen wenn der Speichern-Button geklickt wird. */
  onSave?: () => void;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'ui-statusbar';
    Object.assign(this.el.style, {
      position:       'absolute',
      bottom:         '0',
      left:           '72px',
      right:          '0',
      height:         '30px',
      zIndex:         '20',
      background:     'var(--mc-navy-panel)',
      borderTop:      '1px solid var(--mc-panel-border)',
      display:        'flex',
      alignItems:     'center',
      padding:        '0 12px',
      boxSizing:      'border-box',
      pointerEvents:  'auto',
      fontFamily:     'var(--mc-font)',
      fontSize:       '12px',
    });

    // In #ui-layer einhängen
    const layer = document.getElementById('ui-layer');
    if (layer) layer.appendChild(this.el);

    // ── Status-Icon (Emoji links) ──
    this.statusIconEl = document.createElement('span');
    Object.assign(this.statusIconEl.style, {
      fontSize:    '14px',
      marginRight: '5px',
      lineHeight:  '1',
    });
    this.el.appendChild(this.statusIconEl);

    // ── Status-Text ──
    this.statusTextEl = document.createElement('span');
    this.statusTextEl.className = 'mc-statusbar-status';
    Object.assign(this.statusTextEl.style, {
      fontWeight:  'bold',
      color:       'var(--mc-gold)',
      marginRight: '8px',
      whiteSpace:  'nowrap',
    });
    this.el.appendChild(this.statusTextEl);

    // ── Hint-Text (zentriert) ──
    this.hintTextEl = document.createElement('span');
    this.hintTextEl.className = 'mc-statusbar-hint';
    Object.assign(this.hintTextEl.style, {
      flex:       '1',
      textAlign:  'center',
      color:      'var(--mc-dim)',
      fontSize:   '12px',
    });
    this.el.appendChild(this.hintTextEl);

    // ── Speichern-Button (rechts, vor ESC) ──
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Speichern';
    Object.assign(saveBtn.style, {
      background:    'var(--mc-navy-deep)',
      border:        '1px solid var(--mc-panel-border)',
      borderRadius:  '4px',
      padding:       '2px 9px',
      fontSize:      '11px',
      color:         'var(--mc-gold)',
      whiteSpace:    'nowrap',
      flexShrink:    '0',
      marginRight:   '8px',
      cursor:        'pointer',
      fontFamily:    'var(--mc-font)',
      pointerEvents: 'all',
    });
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = 'var(--mc-navy-panel)'; });
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = 'var(--mc-navy-deep)'; });
    saveBtn.addEventListener('click', () => { this.onSave?.(); });
    this.el.appendChild(saveBtn);

    // ── ESC-Badge (rechts) ──
    const escBadge = document.createElement('span');
    escBadge.textContent = 'ESC = Abbrechen';
    escBadge.className = 'mc-statusbar-esc';
    Object.assign(escBadge.style, {
      background:   'var(--mc-navy-deep)',
      border:       '1px solid var(--mc-navy-separator)',
      borderRadius: '4px',
      padding:      '1px 7px',
      fontSize:     '11px',
      color:        'var(--mc-disabled)',
      whiteSpace:   'nowrap',
      flexShrink:   '0',
    });
    this.el.appendChild(escBadge);
  }

  // ── Public API ─────────────────────────────────────────────

  /**
   * Setzt den Status-Text (Modus-Name) und Hint-Text.
   * @param status  Modus-Name (z.B. "Baumodus") oder leer
   * @param hint    Hinweis-Text (zentriert angezeigt)
   */
  setStatus(status: string, hint: string): void {
    // Swamp mode uses dynamic strings like 'Sumpf-Maler (Hell)'
    let icon  = MODE_ICONS[status]  ?? '';
    let color = MODE_COLORS[status] ?? '#F2F2F2';
    if (!icon && status.startsWith('Sumpf-Maler')) {
      icon  = '🎨';
      color = '#B0B5BD';
    }

    this.statusIconEl.textContent = icon;
    this.statusTextEl.textContent = status;
    this.statusTextEl.style.color = color;
    this.hintTextEl.textContent   = hint;
  }

  // No-op – HTML panels are screen-space
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* no-op */ }

  destroy(): void {
    this.el.remove();
  }
}
