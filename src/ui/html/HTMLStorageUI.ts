// ============================================================
// Magic City – HTMLStorageUI
// Zentriertes Modal für die Lagerbestand-Übersicht.
// Erbt von HTMLPanel. Kein Phaser-Import.
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { ITEM_DEFS } from '../../data/items';

// ── Ressourcen-Kategorien (fest definiert, immer angezeigt) ──
interface ResourceCategory {
  label:   string;
  emoji:   string;
  keys:    string[];
}

const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    label: 'Rohstoffe',
    emoji: '⛏',
    keys:  ['wood', 'stone', 'gold'],
  },
  {
    label: 'Nahrung',
    emoji: '🌾',
    keys:  ['grain', 'flour', 'bread'],
  },
  {
    label: 'Expeditionsmaterial',
    emoji: '🧪',
    keys:  ['iron_scrap', 'herb_green'],
  },
  {
    label: 'Verbrauchsgegenstände',
    emoji: '🧴',
    keys:  ['healing_potion', 'power_bread'],
  },
];

// ── Lesbare Namen für Ressourcen-Keys ─────────────────────────
const DISPLAY_NAMES: Record<string, string> = {
  wood:             'Holz',
  stone:            'Stein',
  gold:             'Gold',
  grain:            'Getreide',
  flour:            'Mehl',
  bread:            'Brot',
  iron_scrap:       'Eisenschrott',
  herb_green:       'Grüne Kräuter',
  healing_potion:   'Heiltrank',
  power_bread:      'Kraftbrot',
  crystal_shard:    'Kristallsplitter',
  talisman_fragment:'Talisman-Fragment',
};

// ── Icon-Keys für Basis-Ressourcen ─────────────────────────────
const ICON_KEYS: Partial<Record<string, string>> = {
  gold:  'ICON_GOLD',
  wood:  'ICON_WOOD',
  stone: 'ICON_STONE',
  bread: 'ICON_BREAD',
};

// ── Tier-Farben für Ausrüstung ─────────────────────────────────
function tierColor(tierNum: number): string {
  if (tierNum >= 5) return '#E8E8E8'; // T5 Nemesis – Silber
  if (tierNum >= 4) return '#FF8C00'; // T4 Legendär – Orange
  if (tierNum >= 3) return '#a335ee'; // T3 Selten   – Violett
  if (tierNum >= 2) return '#4FC3F7'; // T2 Ungewöhnl – Blau
  return '#1eff00';                   // T1 Gewöhnl  – Grün
}

// ── Spezial-Items (Relikte) ────────────────────────────────────
const SPECIAL_KEYS = ['crystal_shard', 'talisman_fragment'];

// ─────────────────────────────────────────────────────────────
// HTMLStorageUI
// ─────────────────────────────────────────────────────────────

export class HTMLStorageUI extends HTMLPanel {
  public onClose?: () => void;

  // Content-Bereich, der bei jedem show() neu befüllt wird
  private readonly contentEl: HTMLElement;

  constructor() {
    // Root-Element erzeugen
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    Object.assign(root.style, {
      position:  'absolute',
      left:      '50%',
      top:       '50%',
      transform: 'translate(-50%, -50%)',
      width:     '500px',
      maxHeight: '80vh',
      display:   'flex',
      flexDirection: 'column',
      zIndex:    '50',
    });
    root.setAttribute('hidden', '');

    super(root);

    // ── Header ──────────────────────────────────────────────
    const header = HTMLPanel.el('div', 'mc-panel-header');
    header.textContent = 'Lager';
    root.appendChild(header);

    // ── Schließen-Button ─────────────────────────────────────
    root.appendChild(HTMLPanel.closeBtn(() => this.hide()));

    // ── Scrollbarer Content-Bereich ───────────────────────────
    this.contentEl = HTMLPanel.el('div', 'mc-scroll');
    Object.assign(this.contentEl.style, {
      padding:  '12px 16px 16px',
      overflowY: 'auto',
      flex:     '1',
    });
    root.appendChild(this.contentEl);
  }

  // ── Öffentliche API ───────────────────────────────────────

  /**
   * Panel befüllen und anzeigen.
   * Überschreibt show() mit einem Parameter – HTMLPanel.show() wird intern aufgerufen.
   */
  show(state: GameState): void;
  show(): void;
  show(state?: GameState): void {
    if (state !== undefined) {
      this.buildContent(state);
    }
    super.show();
  }

  override hide(): void {
    super.hide();
    this.onClose?.();
  }

  // ── Content aufbauen ──────────────────────────────────────

  private buildContent(state: GameState): void {
    // Vorherigen Inhalt leeren
    this.contentEl.innerHTML = '';

    const stock = state.globalStock;

    // ── Lager-Kapazität oben ──────────────────────────────
    const maxStorage   = (state as GameState & { maxStorage?: number }).maxStorage ?? 1000;
    const totalItems   = Object.values(stock).reduce((sum, v) => sum + v, 0);
    const capBarEl     = this.buildCapacityBar(totalItems, maxStorage);
    this.contentEl.appendChild(capBarEl);

    // ── Ressourcen-Kategorien ─────────────────────────────
    for (const cat of RESOURCE_CATEGORIES) {
      this.contentEl.appendChild(this.buildCategorySection(cat, stock));
    }

    // ── Ausrüstung (dynamisch aus globalStock) ────────────
    const gearInStock = Object.entries(stock)
      .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.gearSlot)
      .sort(([a], [b]) => {
        // Aufsteigend nach Tier sortieren
        const tierA = ITEM_DEFS[a]?.tags.find(t => t.startsWith('tier'));
        const tierB = ITEM_DEFS[b]?.tags.find(t => t.startsWith('tier'));
        const numA  = tierA ? parseInt(tierA.replace('tier', ''), 10) : 1;
        const numB  = tierB ? parseInt(tierB.replace('tier', ''), 10) : 1;
        return numA - numB;
      });

    if (gearInStock.length > 0) {
      const gearSection = this.buildGearSection(gearInStock);
      this.contentEl.appendChild(gearSection);
    }

    // ── Relikte (crystal_shard, talisman_fragment) ────────
    const specialInStock = SPECIAL_KEYS.filter(k => (stock[k] ?? 0) > 0);
    if (specialInStock.length > 0) {
      const reliktSection = this.buildReliktSection(specialInStock, stock);
      this.contentEl.appendChild(reliktSection);
    }

    // ── Trennlinie + Gesamtzeile ──────────────────────────
    const divider = HTMLPanel.el('div', 'mc-divider');
    divider.style.margin = '12px 0 6px';
    this.contentEl.appendChild(divider);

    const totalGold   = stock.gold ?? 0;
    const nonGoldTotal = Object.entries(stock)
      .filter(([k]) => k !== 'gold')
      .reduce((sum, [, v]) => sum + v, 0);

    const totalLine = document.createElement('div');
    Object.assign(totalLine.style, {
      fontSize: 'var(--mc-font-size-sm)',
      color:    'var(--mc-muted)',
      textAlign: 'center',
    });
    totalLine.textContent = `Gesamt: ${nonGoldTotal} Gegenstände | ${Math.floor(totalGold)} Gold`;
    this.contentEl.appendChild(totalLine);

    // ── Bevölkerungs-Anzeige ───────────────────────────────
    const popLine = document.createElement('div');
    Object.assign(popLine.style, {
      fontSize:  'var(--mc-font-size-sm)',
      color:     'var(--mc-dim)',
      textAlign: 'center',
      marginTop: '4px',
    });
    const citizenCount = state.citizens?.length ?? 0;
    popLine.textContent = `Einwohner: ${citizenCount}`;
    this.contentEl.appendChild(popLine);
  }

  // ── Kapazitäts-Balken ─────────────────────────────────────

  private buildCapacityBar(current: number, max: number): HTMLElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      marginBottom: '10px',
    });

    // Label-Zeile
    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'baseline',
      marginBottom:   '4px',
    });

    const leftLabel = document.createElement('span');
    leftLabel.textContent = 'Lagerkapazität';
    Object.assign(leftLabel.style, {
      fontSize: 'var(--mc-font-size-sm)',
      color:    'var(--mc-dim)',
    });

    const rightLabel = document.createElement('span');
    const pct = Math.min(100, Math.round((current / Math.max(max, 1)) * 100));
    rightLabel.textContent = `${Math.floor(current)} / ${max} (${pct}%)`;
    Object.assign(rightLabel.style, {
      fontSize:   'var(--mc-font-size-sm)',
      color:      pct >= 90 ? 'var(--mc-damage)' : pct >= 70 ? 'var(--mc-gold)' : 'var(--mc-heal)',
      fontWeight: 'bold',
    });

    labelRow.appendChild(leftLabel);
    labelRow.appendChild(rightLabel);
    wrap.appendChild(labelRow);

    // Balken-Track
    const track = document.createElement('div');
    track.className = 'mc-bar-track';
    track.style.height = '8px';

    const fill = document.createElement('div');
    fill.className = 'mc-bar-fill';
    const fillColor = pct >= 90 ? 'var(--mc-damage)' : pct >= 70 ? 'var(--mc-gold)' : 'var(--mc-accent-storage)';
    fill.style.width      = `${pct}%`;
    fill.style.background = fillColor;
    track.appendChild(fill);
    wrap.appendChild(track);

    return wrap;
  }

  // ── Kategorie-Sektion ─────────────────────────────────────

  private buildCategorySection(
    cat: ResourceCategory,
    stock: Record<string, number>,
  ): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '8px';

    // Kategorie-Header
    section.appendChild(this.buildSectionHeader(`${cat.emoji} ${cat.label}`, 'var(--mc-accent-storage)'));

    // Ressourcen-Zeilen
    for (const key of cat.keys) {
      const amount = stock[key] ?? 0;
      const name   = DISPLAY_NAMES[key] ?? key;
      const iconKey = ICON_KEYS[key] ?? `ITEM_${key.toUpperCase()}`;
      const amtColor = amount === 0
        ? 'var(--mc-disabled)'
        : amount >= 10
          ? 'var(--mc-accent-storage)'
          : 'var(--mc-light)';

      section.appendChild(this.buildResourceRow(iconKey, name, amount, amtColor));
    }

    return section;
  }

  // ── Ausrüstungs-Sektion ───────────────────────────────────

  private buildGearSection(gearInStock: [string, number][]): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '8px';

    section.appendChild(this.buildSectionHeader('⚔ Ausrüstung', 'var(--mc-accent-hero)'));

    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display:             'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap:                 '4px',
      padding:             '4px',
    });

    for (const [id, qty] of gearInStock) {
      const def     = ITEM_DEFS[id];
      const name    = def?.name ?? id;
      const tierTag = def?.tags.find(t => t.startsWith('tier'));
      const tierNum = tierTag ? parseInt(tierTag.replace('tier', ''), 10) : 1;
      const color   = tierColor(tierNum);
      const iconKey = `ITEM_${id.toUpperCase()}`;

      const tile = document.createElement('div');
      Object.assign(tile.style, {
        position:     'relative',
        aspectRatio:  '1',
        border:       `1px solid ${color}66`,
        borderRadius: '4px',
        overflow:     'hidden',
        cursor:       'default',
        background:   'var(--mc-navy-deep)',
      });
      tile.title = `${name} (T${tierNum}) ×${qty}`;

      const img = document.createElement('img');
      img.src = `/assets/sprites/final/${iconKey}.png`;
      Object.assign(img.style, {
        width:          '100%',
        height:         '100%',
        objectFit:      'fill',
        imageRendering: 'auto',
        display:        'block',
      });
      img.addEventListener('error', () => { img.style.display = 'none'; });
      tile.appendChild(img);

      if (qty > 1) {
        const badge = document.createElement('span');
        badge.textContent = String(qty);
        Object.assign(badge.style, {
          position:   'absolute',
          bottom:     '2px',
          right:      '3px',
          fontSize:   '10px',
          fontWeight: 'bold',
          color:      color,
          textShadow: '0 0 3px #000, 0 0 3px #000',
          lineHeight: '1',
        });
        tile.appendChild(badge);
      }

      grid.appendChild(tile);
    }

    section.appendChild(grid);
    return section;
  }

  // ── Relikte-Sektion ───────────────────────────────────────

  private buildReliktSection(
    specialInStock: string[],
    stock: Record<string, number>,
  ): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '8px';

    section.appendChild(this.buildSectionHeader('💎 Relikte', 'var(--mc-gold)'));

    for (const key of specialInStock) {
      const qty  = stock[key] ?? 0;
      const name = DISPLAY_NAMES[key] ?? key;
      section.appendChild(this.buildResourceRow(`ITEM_${key.toUpperCase()}`, name, qty, 'var(--mc-light)'));
    }

    return section;
  }

  // ── Helper: Abschnitts-Header ─────────────────────────────

  private buildSectionHeader(text: string, accentColor: string): HTMLElement {
    const header = document.createElement('div');
    Object.assign(header.style, {
      background:   'var(--mc-navy-deep)',
      border:       `1px solid ${accentColor}55`,
      borderRadius: '5px',
      padding:      '3px 8px',
      marginBottom: '4px',
      fontSize:     'var(--mc-font-size-sm)',
      color:        accentColor,
      fontWeight:   'bold',
    });
    header.textContent = text;
    return header;
  }

  // ── Helper: Ressourcen-Zeile ───────────────────────────────

  private buildResourceRow(
    iconKey: string,
    label: string,
    amount: number,
    amountColor: string,
  ): HTMLElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display:        'flex',
      alignItems:     'center',
      gap:            '6px',
      padding:        '2px 4px',
      minHeight:      '22px',
    });

    // Icon
    const img = document.createElement('img');
    img.src    = `/assets/sprites/final/${iconKey}.png`;
    img.width  = 16;
    img.height = 16;
    img.style.objectFit     = 'contain';
    img.style.imageRendering = 'auto';
    img.style.flexShrink    = '0';

    // Fehler-Fallback: kleiner Platzhalter-Kreis
    img.addEventListener('error', () => {
      img.style.display = 'none';
    });

    row.appendChild(img);

    // Name
    const nameEl = document.createElement('span');
    nameEl.textContent = label;
    Object.assign(nameEl.style, {
      fontSize: 'var(--mc-font-size-sm)',
      color:    'var(--mc-light)',
      flex:     '1',
    });
    row.appendChild(nameEl);

    // Menge (rechtsbündig)
    const amtEl = document.createElement('span');
    amtEl.textContent = String(Math.floor(amount));
    Object.assign(amtEl.style, {
      fontSize:   'var(--mc-font-size-sm)',
      color:      amountColor,
      fontWeight: 'bold',
      textAlign:  'right',
      minWidth:   '36px',
    });
    row.appendChild(amtEl);

    return row;
  }
}
