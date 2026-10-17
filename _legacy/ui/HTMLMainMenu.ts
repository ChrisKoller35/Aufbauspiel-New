// ============================================================
// Magic City – HTMLMainMenu
// Einladende Startseite: Shimmer-Titel, schwebende Helden,
// Glasmorph-Panel mit Buttons. Kein Phaser-Import nötig.
// ============================================================

export class HTMLMainMenu {
  private readonly root: HTMLElement;

  constructor(
    hasSave: boolean,
    onNewGame:    () => void,
    onContinue:   () => void,
    onExportSave: () => void,
    onImportSave: () => Promise<void>,
  ) {
    this.root = document.createElement('div');
    this.root.id = 'mc-main-menu';

    const layer = document.getElementById('ui-layer');
    if (layer) layer.appendChild(this.root);

    this.build(hasSave, onNewGame, onContinue, onExportSave, onImportSave);
  }

  // ─── Build ───────────────────────────────────────────────

  private build(
    hasSave: boolean,
    onNewGame:    () => void,
    onContinue:   () => void,
    onExportSave: () => void,
    onImportSave: () => Promise<void>,
  ): void {

    // ── Center column (title + body row + footer) ─────────
    const center = document.createElement('div');
    center.className = 'mc-menu-center';
    this.root.appendChild(center);

    // Title
    const title = document.createElement('div');
    title.className = 'mc-menu-title';
    title.textContent = '\u2736 Magic City \u2736';
    center.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.className = 'mc-menu-subtitle';
    subtitle.textContent = 'Aethermoor  \u00b7  Techno-Fantasy  \u00b7  City Builder & RPG';
    center.appendChild(subtitle);

    // ── Body row: hero-left | panel | hero-right ──────────
    const bodyRow = document.createElement('div');
    bodyRow.className = 'mc-menu-body-row';
    center.appendChild(bodyRow);

    bodyRow.appendChild(this.makeHeroImg('assets/sprites/final/HERO_GUARDIAN.png', 'left'));

    // Panel
    const panel = document.createElement('div');
    panel.className = 'mc-menu-panel';
    bodyRow.appendChild(panel);

    // Welcome text
    const welcome = document.createElement('p');
    welcome.className = 'mc-menu-welcome';
    welcome.textContent = hasSave
      ? 'Willkommen zur\u00fcck, Stadtmeister! Valdris wartet auf dich.'
      : 'Willkommen auf Aethermoor! Errichte Valdris, rekrutiere Helden und erkunde die Dungeons.';
    panel.appendChild(welcome);

    // Lore intro (nur beim ersten Spielstart)
    if (!hasSave) {
      const lore = document.createElement('p');
      lore.className = 'mc-menu-lore';
      lore.textContent = '\u201eVor unz\u00e4hligen Generationen fiel unsere Arche vom Himmel und Aethermoor wurde unser hartes, unerbittliches Zuhause. Jetzt erwachen die alten Maschinen erneut. F\u00fchre deine Helden in die st\u00e4hlernen Dungeons und errichte eine Stadt, die der Dunkelheit trotzt.\u201c';
      panel.appendChild(lore);
    }

    // Neues Spiel (primary CTA)
    panel.appendChild(
      this.makeBtn('\u2694\u2009Neues Spiel', 'mc-menu-btn-primary', onNewGame),
    );

    // Fortsetzen (only if save exists)
    if (hasSave) {
      panel.appendChild(
        this.makeBtn('\u25b6\u2009Fortsetzen', 'mc-menu-btn-secondary', onContinue),
      );
    }

    // Divider
    const divider = document.createElement('div');
    divider.className = 'mc-menu-divider';
    panel.appendChild(divider);

    // Util button row
    const utilRow = document.createElement('div');
    utilRow.className = 'mc-menu-util-row';
    panel.appendChild(utilRow);

    if (hasSave) {
      utilRow.appendChild(
        this.makeBtn('\u{1F4E4} Exportieren', 'mc-menu-btn-util', onExportSave),
      );
    }
    utilRow.appendChild(
      this.makeBtn('\u{1F4E5} Importieren', 'mc-menu-btn-util', onImportSave),
    );

    bodyRow.appendChild(this.makeHeroImg('assets/sprites/final/HERO_PALADIN.png', 'right'));

    // ── Footer ───────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'mc-menu-footer';
    footer.textContent = 'Magic City  \u00b7  Valdris auf Aethermoor  \u00b7  Techno-Fantasy Aufbauspiel';
    center.appendChild(footer);
  }

  // ─── Helpers ────────────────────────────────────────────

  private makeHeroImg(src: string, side: 'left' | 'right'): HTMLImageElement {
    const img = document.createElement('img');
    img.src  = src;
    img.alt  = '';
    img.className = `mc-menu-hero mc-menu-hero-${side}`;
    return img;
  }

  private makeBtn(
    label: string,
    className: string,
    onClick: () => void | Promise<void>,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className   = className;
    btn.textContent = label;
    btn.addEventListener('click', () => { void onClick(); });
    return btn;
  }

  // ─── Public API ─────────────────────────────────────────

  destroy(): void {
    this.root.remove();
  }
}
