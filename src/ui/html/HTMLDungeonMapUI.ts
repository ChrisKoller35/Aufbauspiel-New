// ============================================================
// Magic City – HTMLDungeonMapUI
// Großes Modal für Dungeon-Routen-Auswahl, Party-Zusammenstellung,
// Schwierigkeitsgrad und Proviant-Auswahl.
// Kein Phaser-Import – reines DOM/CSS.
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { ROUTE_DEFS, RouteDef } from '../../data/routes';
import { ITEM_DEFS, PROVISION_ITEMS } from '../../data/items';
import { CLASS_DEFS } from '../../data/classes';

// ─── Konstanten ─────────────────────────────────────────────

/** Reihenfolge der Routen-Anzeige (Tier 1 → 4). */
const ROUTE_DISPLAY_ORDER = [
  'forest_short',
  'forest_medium',
  'cave_deep',
  'cave_spider',
  'swamp_long',
  'ruins_crypts',
  'ruins_depths',
  'volcano_core',
];

/** Ozean-Routen — neue linke Spalte. */
const OCEAN_ROUTE_DISPLAY_ORDER = [
  'ocean_shallows',
  'ocean_depths',
];

/** Belagerungs-Routen — links neben den Ozean-Routen. */
const SIEGE_ROUTE_DISPLAY_ORDER = [
  'siege_walls',
  'siege_fortress',
];

/** CSS-Farbe pro Tier für Akzente und Labels. */
const TIER_COLOR: Record<number, string> = {
  1: '#66BB6A',
  2: '#64B5F6',
  3: '#CE93D8',
  4: '#EF9A9A',
};

/** Border-Farbe pro Tier für Karten-Rahmen. */
const TIER_BORDER: Record<number, string> = {
  1: '#2E7D32',
  2: '#1565C0',
  3: '#6A1B9A',
  4: '#B71C1C',
};

const DIFFICULTIES = ['normal', 'hard', 'nightmare', 'infernal'] as const;
type Difficulty = typeof DIFFICULTIES[number];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  normal:    'Normal',
  hard:      'Schwer',
  nightmare: 'Alptraum',
  infernal:  'Höllisch',
};

// ─── HTMLDungeonMapUI ────────────────────────────────────────

export class HTMLDungeonMapUI extends HTMLPanel {
  // ── Callbacks ──
  public onStartExpedition?: (
    routeId: string,
    fighterIds: number[],
    difficulty: string,
    modifierId: string | null,
    consumables: string[],
  ) => void;
  public onClose?: () => void;

  // ── Auswahl-State ──
  private selectedRouteId: string | null = null;
  private selectedFighterIds: Set<number> = new Set();
  private selectedDifficulty: Difficulty = 'normal';
  /** Bis zu 3 Proviant-Slots (null = leer). */
  private selectedConsumables: Array<string | null> = [null, null, null];

  /** Aus CityScene gesetzt (BuildingUpgradeSystem). */
  public partySlots = 3;

  // ── Interne DOM-Bereiche ──
  private currentState: GameState | null = null;

  // Scrollbare Bereiche die bei Selektion neu gebaut werden
  private rightPanelEl!: HTMLElement;
  private routeListEl!: HTMLElement;

  constructor() {
    // Backdrop + Modal zusammen in einem Wrapper-Div
    const wrapper = document.createElement('div');
    wrapper.className = 'mc-modal';
    wrapper.style.cssText = [
      'position: absolute',
      'inset: 0',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'background: rgba(0,0,0,0.55)',
      'pointer-events: auto',
      'z-index: 100',
    ].join('; ');
    wrapper.setAttribute('hidden', '');

    super(wrapper);
  }

  // ─── Öffentliche API ──────────────────────────────────────

  /** Öffnet das Modal mit dem aktuellen GameState. */
  showWithState(state: GameState): void {
    this.currentState = state;
    if (this.isVisible()) {
      // Bereits offen: Nur Inhalt aktualisieren
      this.buildModal();
      return;
    }
    // Neu öffnen: State zurücksetzen
    this.selectedRouteId = null;
    this.selectedFighterIds = new Set();
    this.selectedDifficulty = 'normal';
    this.selectedConsumables = [null, null, null];
    this.buildModal();
    super.show();
  }

  /** HTMLPanel-kompatible show()-Überschreibung.
   *  Akzeptiert optionalen State (CityScene ruft show(state) auf). */
  override show(state?: GameState): void {
    if (state) this.currentState = state;
    if (!this.currentState) return;
    this.showWithState(this.currentState);
  }

  hide(): void {
    this.el.innerHTML = '';
    super.hide();
    this.onClose?.();
  }

  isVisible(): boolean {
    return super.isVisible();
  }

  // No-op: HTML-Panels brauchen kein Kamera-Update
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* no-op */ }

  // ─── Haupt-Modal-Aufbau ───────────────────────────────────

  private buildModal(): void {
    this.el.innerHTML = '';
    if (!this.currentState) return;

    const modal = document.createElement('div');
    modal.className = 'mc-panel';
    Object.assign(modal.style, {
      width:         '960px',
      maxWidth:      '98vw',
      height:        '700px',
      maxHeight:     '92vh',
      display:       'flex',
      flexDirection: 'column',
      background:    '#09090f',
      borderColor:   '#6B0000',
      borderWidth:   '2px',
      position:      'relative',
    });

    // Header
    const header = this.buildModalHeader();
    modal.appendChild(header);

    // Body: Linke Routen-Liste + Rechter Panel
    const body = document.createElement('div');
    Object.assign(body.style, {
      display:  'flex',
      flex:     '1',
      overflow: 'hidden',
      minHeight: '0',
    });

    // Belagerungs-Routen (ganz linke Spalte)
    const siegeCol = this.buildSiegeRouteList(this.currentState);
    body.appendChild(siegeCol);

    // Trenner nach Belagerungs-Spalte
    const siegeDivider = document.createElement('div');
    Object.assign(siegeDivider.style, {
      width:      '1px',
      background: '#4a2a0a',
      flexShrink: '0',
      margin:     '8px 0',
    });
    body.appendChild(siegeDivider);

    // Ozean-Routen
    const oceanCol = this.buildOceanRouteList(this.currentState);
    body.appendChild(oceanCol);

    // Trenner nach Ozean-Spalte
    const oceanDivider = document.createElement('div');
    Object.assign(oceanDivider.style, {
      width:      '1px',
      background: '#0d2a4a',
      flexShrink: '0',
      margin:     '8px 0',
    });
    body.appendChild(oceanDivider);

    // Land-Routen (bisherige linke Spalte)
    const leftCol = this.buildRouteList(this.currentState);
    this.routeListEl = leftCol;
    body.appendChild(leftCol);

    // Vertikaler Trenner
    const vDivider = document.createElement('div');
    Object.assign(vDivider.style, {
      width:      '1px',
      background: '#3B0000',
      flexShrink: '0',
      margin:     '8px 0',
    });
    body.appendChild(vDivider);

    // Rechte Seite: Info + Party
    const rightCol = document.createElement('div');
    Object.assign(rightCol.style, {
      flex:      '1',
      display:   'flex',
      flexDirection: 'column',
      overflow:  'hidden',
      minHeight: '0',
    });

    this.rightPanelEl = document.createElement('div');
    this.rightPanelEl.className = 'mc-scroll';
    Object.assign(this.rightPanelEl.style, {
      flex:    '1',
      padding: '12px 14px',
      overflowY: 'auto',
    });

    this.buildRightPanel(this.currentState);
    rightCol.appendChild(this.rightPanelEl);

    body.appendChild(rightCol);
    modal.appendChild(body);
    this.el.appendChild(modal);

    // Klick auf Backdrop (außerhalb Modal) schließt nicht
    // (User muss explizit auf X klicken)
  }

  // ─── Modal-Header ────────────────────────────────────────

  private buildModalHeader(): HTMLElement {
    const header = document.createElement('div');
    Object.assign(header.style, {
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      position:       'relative',
      padding:        '10px 40px',
      borderBottom:   '1px solid #6B0000',
      background:     '#060609',
      borderRadius:   '8px 8px 0 0',
      flexShrink:     '0',
    });

    const title = document.createElement('span');
    title.textContent = '⚔  DUNGEON-KARTE  ⚔';
    Object.assign(title.style, {
      color:      '#C8922A',
      fontSize:   'var(--mc-font-size-base)',
      fontWeight: 'bold',
      fontFamily: 'var(--mc-font)',
    });
    header.appendChild(title);

    const closeBtn = HTMLPanel.closeBtn(() => this.hide());
    closeBtn.style.right = '10px';
    closeBtn.style.top = '50%';
    closeBtn.style.transform = 'translateY(-50%)';
    header.appendChild(closeBtn);

    return header;
  }

  // ─── Belagerungs-Spalte ───────────────────────────────────

  private buildSiegeRouteList(state: GameState): HTMLElement {
    const col = document.createElement('div');
    Object.assign(col.style, {
      width:         '155px',
      flexShrink:    '0',
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
    });

    const label = HTMLPanel.el('div', 'mc-label-muted mc-text-sm mc-text-center');
    label.textContent = '⚙️ BELAGERUNG';
    Object.assign(label.style, {
      padding:    '8px 8px 4px',
      flexShrink: '0',
      color:      '#FF8C00',
    });
    col.appendChild(label);

    const topLine = HTMLPanel.el('div');
    Object.assign(topLine.style, {
      height:     '1px',
      background: '#4a2a0a',
      margin:     '0 16px 6px',
    });
    col.appendChild(topLine);

    const scroll = HTMLPanel.el('div', 'mc-scroll');
    scroll.style.cssText = 'flex: 1; overflow-y: auto; padding: 2px 6px 8px;';

    const defeated = state.guildStats.bossesDefeatedIds;
    const routes = SIEGE_ROUTE_DISPLAY_ORDER
      .map(id => ROUTE_DEFS[id])
      .filter(Boolean);

    for (const route of routes) {
      const isUnlocked = !route.unlockCondition ||
        route.unlockCondition.bossesDefeated.every((b: string) => defeated.includes(b));
      const isSelected = this.selectedRouteId === route.id;
      const isCompleted = route.bossId ? defeated.includes(route.bossId) : false;
      const card = this.buildRouteCard(route, isUnlocked, isSelected, isCompleted, state);
      scroll.appendChild(card);
    }

    col.appendChild(scroll);
    return col;
  }

  // ─── Ozean-Spalte (neue linke Seite) ─────────────────────

  private buildOceanRouteList(state: GameState): HTMLElement {
    const col = document.createElement('div');
    Object.assign(col.style, {
      width:         '155px',
      flexShrink:    '0',
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
    });

    const label = HTMLPanel.el('div', 'mc-label-muted mc-text-sm mc-text-center');
    label.textContent = '🌊 OZEAN';
    Object.assign(label.style, {
      padding:    '8px 8px 4px',
      flexShrink: '0',
      color:      '#64B5F6',
    });
    col.appendChild(label);

    const topLine = HTMLPanel.el('div');
    Object.assign(topLine.style, {
      height:     '1px',
      background: '#0d2a4a',
      margin:     '0 16px 6px',
    });
    col.appendChild(topLine);

    const scroll = HTMLPanel.el('div', 'mc-scroll');
    scroll.style.cssText = 'flex: 1; overflow-y: auto; padding: 2px 6px 8px;';

    const defeated = state.guildStats.bossesDefeatedIds;
    const routes = OCEAN_ROUTE_DISPLAY_ORDER
      .map(id => ROUTE_DEFS[id])
      .filter(Boolean);

    for (const route of routes) {
      const isUnlocked = !route.unlockCondition ||
        route.unlockCondition.bossesDefeated.every((b: string) => defeated.includes(b));
      const isSelected = this.selectedRouteId === route.id;
      const isCompleted = route.bossId
        ? defeated.includes(route.bossId)
        : false;

      const card = this.buildRouteCard(route, isUnlocked, isSelected, isCompleted, state);
      scroll.appendChild(card);
    }

    col.appendChild(scroll);
    return col;
  }

  // ─── Linke Seite: Land-Routen-Liste ─────────────────────

  private buildRouteList(state: GameState): HTMLElement {
    const col = document.createElement('div');
    Object.assign(col.style, {
      width:         '200px',
      flexShrink:    '0',
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
    });

    // Dungeon-Eingang Label
    const label = HTMLPanel.el('div', 'mc-label-muted mc-text-sm mc-text-center');
    label.textContent = '⛰ DUNGEON-EINGANG';
    Object.assign(label.style, {
      padding:    '8px 8px 4px',
      flexShrink: '0',
    });
    col.appendChild(label);

    // Trennlinie
    const topLine = HTMLPanel.el('div');
    Object.assign(topLine.style, {
      height:     '1px',
      background: '#222',
      margin:     '0 16px 6px',
    });
    col.appendChild(topLine);

    // Scrollbarer Routen-Bereich
    const scroll = HTMLPanel.el('div', 'mc-scroll');
    scroll.style.cssText = 'flex: 1; overflow-y: auto; padding: 2px 6px 8px;';

    const defeated = state.guildStats.bossesDefeatedIds;
    const routes = ROUTE_DISPLAY_ORDER
      .map(id => ROUTE_DEFS[id])
      .filter(Boolean);

    for (const route of routes) {
      const isUnlocked = !route.unlockCondition ||
        route.unlockCondition.bossesDefeated.every((b: string) => defeated.includes(b));
      const isSelected = this.selectedRouteId === route.id;
      const isCompleted = route.bossId
        ? defeated.includes(route.bossId)
        : (route.id === 'forest_short' && state.guildStats.forestShortCompleted > 0);

      const card = this.buildRouteCard(route, isUnlocked, isSelected, isCompleted, state);
      scroll.appendChild(card);
    }

    col.appendChild(scroll);
    return col;
  }

  private buildRouteCard(
    route: RouteDef,
    isUnlocked: boolean,
    isSelected: boolean,
    isCompleted: boolean,
    state: GameState,
  ): HTMLElement {
    const tierColor = TIER_COLOR[route.tier] ?? '#888';
    const tierBorder = TIER_BORDER[route.tier] ?? '#333';

    const card = document.createElement('div');
    Object.assign(card.style, {
      padding:         '7px 10px',
      marginBottom:    '3px',
      borderRadius:    '5px',
      border:          isSelected
        ? `1px solid ${tierBorder}`
        : '1px solid transparent',
      background:      isSelected
        ? 'rgba(255,255,255,0.05)'
        : 'transparent',
      cursor:          isUnlocked && !state.activeExpedition ? 'pointer' : 'default',
      opacity:         isUnlocked ? '1' : '0.4',
      display:         'flex',
      alignItems:      'center',
      gap:             '8px',
      transition:      'background 0.1s, border-color 0.1s',
    });

    // Knoten-Indikator (kleiner Kreis)
    const node = document.createElement('div');
    Object.assign(node.style, {
      width:        '10px',
      height:       '10px',
      borderRadius: '50%',
      flexShrink:   '0',
      border:       `2px solid ${isUnlocked ? tierColor : '#333'}`,
      background:   isSelected ? tierColor : (isCompleted ? 'rgba(255,255,255,0.3)' : 'transparent'),
    });
    card.appendChild(node);

    // Routen-Info
    const info = document.createElement('div');
    info.style.flex = '1';

    const nameLine = document.createElement('div');
    Object.assign(nameLine.style, {
      fontSize:   'var(--mc-font-size-sm)',
      color:      isUnlocked ? (isSelected ? '#FFD700' : '#CCCCCC') : '#444',
      fontWeight: isSelected ? 'bold' : 'normal',
    });
    nameLine.textContent = route.name;
    info.appendChild(nameLine);

    const tierLine = document.createElement('div');
    Object.assign(tierLine.style, {
      fontSize: 'var(--mc-font-size-xs)',
      color:    isUnlocked ? tierColor : '#333',
      marginTop: '1px',
    });
    tierLine.textContent = '★'.repeat(route.tier) + '☆'.repeat(4 - route.tier)
      + `  ${route.rooms}R`;
    info.appendChild(tierLine);

    card.appendChild(info);

    // Lock-Symbol oder Haken
    if (!isUnlocked) {
      const lockEl = HTMLPanel.el('span');
      lockEl.textContent = '🔒';
      lockEl.style.fontSize = '12px';
      lockEl.style.flexShrink = '0';
      card.appendChild(lockEl);
    } else if (isCompleted) {
      const checkEl = HTMLPanel.el('span', 'mc-label-heal');
      checkEl.textContent = '✓';
      checkEl.style.fontSize = '12px';
      checkEl.style.flexShrink = '0';
      card.appendChild(checkEl);
    }

    // Hover + Klick
    if (isUnlocked && !state.activeExpedition) {
      card.addEventListener('mouseenter', () => {
        if (!isSelected) {
          card.style.background = 'rgba(255,255,255,0.04)';
          nameLine.style.color = '#FFDD77';
        }
      });
      card.addEventListener('mouseleave', () => {
        if (!isSelected) {
          card.style.background = 'transparent';
          nameLine.style.color = '#CCCCCC';
        }
      });
      card.addEventListener('click', () => {
        this.selectedRouteId = route.id;
        this.selectedFighterIds = new Set();
        this.rebuildPanels();
      });
    }

    return card;
  }

  // ─── Rechter Panel ───────────────────────────────────────

  private buildRightPanel(state: GameState): void {
    this.rightPanelEl.innerHTML = '';

    if (!this.selectedRouteId) {
      // Kein Hinweis-Text wenn keine Route gewählt
      const hint = HTMLPanel.el('div', 'mc-label-dim mc-text-center');
      Object.assign(hint.style, {
        paddingTop: '60px',
        lineHeight: '1.7',
        fontSize:   'var(--mc-font-size-base)',
      });
      hint.innerHTML = '← Wähle eine Mission<br>aus der Dungeon-Karte';
      this.rightPanelEl.appendChild(hint);

      const subHint = HTMLPanel.el('div', 'mc-text-sm mc-text-center');
      Object.assign(subHint.style, {
        marginTop: '16px',
        color:     '#2A2A2A',
      });
      subHint.innerHTML = 'Der Dungeon birgt gefährliche<br>Kreaturen und mächtige Schätze.';
      this.rightPanelEl.appendChild(subHint);
      return;
    }

    const route = ROUTE_DEFS[this.selectedRouteId];
    if (!route) return;

    const defeated = state.guildStats.bossesDefeatedIds;
    const tierColor = TIER_COLOR[route.tier] ?? '#888';

    // ── Routen-Infos ──
    const routeInfoSection = this.buildRouteInfoSection(route, defeated, tierColor);
    this.rightPanelEl.appendChild(routeInfoSection);

    this.rightPanelEl.appendChild(this.buildSectionDivider());

    // ── Party-Auswahl ──
    this.rightPanelEl.appendChild(
      this.buildSectionTitle('PARTY AUSWAHL'),
    );

    // Kämpfer aus state.fighters filtern: nur GUILD_FIGHTER
    const availFighters = state.fighters.filter(f => {
      const cit = state.citizens.find(c => c.fighterId === f.id);
      return cit && cit.status === 'GUILD_FIGHTER';
    });

    if (availFighters.length === 0) {
      const emptyMsg = HTMLPanel.el('div', 'mc-label-dim mc-text-sm mc-text-center');
      emptyMsg.style.cssText = 'padding: 12px 0; line-height: 1.6;';
      emptyMsg.innerHTML = 'Keine Kämpfer verfügbar.<br>Trainiere Kämpfer in der Gilde!';
      this.rightPanelEl.appendChild(emptyMsg);
    } else {
      const fighterGrid = this.buildFighterGrid(state, availFighters);
      this.rightPanelEl.appendChild(fighterGrid);
    }

    // Party-Slots Anzeige
    const slotsRow = HTMLPanel.el('div', 'mc-text-sm mc-text-center');
    Object.assign(slotsRow.style, {
      color:       '#888',
      margin:      '6px 0 8px',
      letterSpacing: '4px',
    });
    slotsRow.textContent = 'Party: ' + Array.from({ length: this.partySlots }, (_, i) =>
      i < this.selectedFighterIds.size ? '●' : '○',
    ).join(' ');
    this.rightPanelEl.appendChild(slotsRow);

    // ── Kriegsmaschine (nur Belagerungs-Routen) ──
    if (route.isSiegeRoute) {
      this.rightPanelEl.appendChild(this.buildSectionDivider());
      this.rightPanelEl.appendChild(this.buildSectionTitle('⚙️ KRIEGSMASCHINE'));
      this.rightPanelEl.appendChild(this.buildWarMachineInfo(state));
    }

    this.rightPanelEl.appendChild(this.buildSectionDivider());

    // ── Proviant-Auswahl ──
    this.rightPanelEl.appendChild(
      this.buildSectionTitle('PROVIANT'),
    );
    this.rightPanelEl.appendChild(this.buildConsumableSlots(state));

    this.rightPanelEl.appendChild(this.buildSectionDivider());

    // ── Schwierigkeit ──
    this.rightPanelEl.appendChild(
      this.buildSectionTitle('SCHWIERIGKEIT'),
    );
    this.rightPanelEl.appendChild(this.buildDifficultyButtons());

    // ── Start-Button ──
    this.rightPanelEl.appendChild(this.buildStartButton());
  }

  // ─── Routen-Info-Sektion ─────────────────────────────────

  private buildRouteInfoSection(
    route: RouteDef,
    defeated: string[],
    tierColor: string,
  ): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '6px';

    // Name + Tier
    const nameRow = document.createElement('div');
    Object.assign(nameRow.style, {
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'baseline',
      marginBottom:   '4px',
    });

    const nameEl = HTMLPanel.el('span', 'mc-bold');
    nameEl.style.cssText = `color: ${tierColor}; font-size: var(--mc-font-size-base);`;
    nameEl.textContent = route.name;
    nameRow.appendChild(nameEl);

    const levelEl = HTMLPanel.el('span', 'mc-label-muted mc-text-sm');
    levelEl.textContent = route.recommendedLevel;
    nameRow.appendChild(levelEl);
    section.appendChild(nameRow);

    // Sterne + Räume
    const metaRow = document.createElement('div');
    Object.assign(metaRow.style, {
      display:       'flex',
      gap:           '12px',
      marginBottom:  '4px',
    });

    const starsEl = HTMLPanel.el('span', 'mc-text-sm');
    starsEl.style.color = tierColor;
    starsEl.textContent = '★'.repeat(route.tier) + '☆'.repeat(4 - route.tier);
    metaRow.appendChild(starsEl);

    const roomsEl = HTMLPanel.el('span', 'mc-label-dim mc-text-sm');
    roomsEl.textContent = `${route.rooms} Räume  |  Tier ${route.tier}`;
    metaRow.appendChild(roomsEl);
    section.appendChild(metaRow);

    // Boss-Info
    const bossStr = route.bossId
      ? `Boss: ${this.formatBossName(route.bossId)}`
      : 'Kein Boss (Trainingspfad)';
    const bossCol = route.bossId
      ? (defeated.includes(route.bossId) ? '#4CAF50' : '#FF6B6B')
      : '#555';
    const bossEl = HTMLPanel.el('div', 'mc-text-sm');
    bossEl.style.color = bossCol;
    bossEl.textContent = bossStr;
    section.appendChild(bossEl);

    return section;
  }

  // ─── Kämpfer-Raster ──────────────────────────────────────

  private buildFighterGrid(
    state: GameState,
    fighters: ReturnType<typeof state.fighters.filter>,
  ): HTMLElement {
    const visible = fighters;

    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display:             'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap:                 '6px',
      marginBottom:        '6px',
    });

    for (const fighter of visible) {
      const isSel = this.selectedFighterIds.has(fighter.id);
      const partyFull = !isSel && this.selectedFighterIds.size >= this.partySlots;
      const isInjured = fighter.baseStats.hp < fighter.baseStats.maxHp;
      const hpPct = Math.max(0, fighter.baseStats.hp / fighter.baseStats.maxHp);

      const card = document.createElement('div');
      Object.assign(card.style, {
        padding:      '6px',
        borderRadius: '6px',
        border:       isSel
          ? '2px solid #4CAF50'
          : partyFull ? '2px solid #1A1A1A' : '2px solid #2A2A3A',
        background:   isSel
          ? 'rgba(13,34,16,0.95)'
          : partyFull ? 'rgba(10,10,10,0.8)' : 'rgba(13,13,26,0.9)',
        cursor:       (!partyFull || isSel) ? 'pointer' : 'default',
        position:     'relative',
        transition:   'border-color 0.1s, background 0.1s',
        display:      'flex',
        flexDirection: 'column',
        alignItems:   'center',
        textAlign:    'center',
      });

      // Hero portrait
      const cls = CLASS_DEFS[fighter.classId];
      if (cls?.spriteKey) {
        const icon = HTMLPanel.icon(cls.spriteKey, 80);
        Object.assign(icon.style, {
          borderRadius: '6px',
          background:   'rgba(0,0,0,0.35)',
          flexShrink:   '0',
          border:       isSel ? '2px solid #4CAF50' : '2px solid #2A2A3A',
        });
        card.appendChild(icon);
      }

      // Info column
      const infoCol = document.createElement('div');
      infoCol.style.cssText = 'width: 100%; margin-top: 4px;';

      // Name
      const nameEl = HTMLPanel.el('div', 'mc-text-sm mc-bold');
      nameEl.style.cssText = `color: ${isSel ? '#88FF88' : (partyFull ? '#333' : '#CCCCCC')}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
      nameEl.textContent = fighter.name;
      infoCol.appendChild(nameEl);

      // Klasse + Level
      const classEl = HTMLPanel.el('div');
      classEl.style.cssText = 'font-size: var(--mc-font-size-xs); color: var(--mc-disabled); margin-top: 1px;';
      classEl.textContent = `${cls?.name ?? fighter.classId} Lv.${fighter.level}`;
      infoCol.appendChild(classEl);

      // Stats-Balken (inkl. HP)
      const s = fighter.baseStats;
      const hpCol = hpPct > 0.5 ? '#2ECC40' : (hpPct > 0.25 ? '#FF851B' : '#FF4136');
      const statBars: [string, string, number, number, string][] = [
        ['HP',  hpCol,    s.hp,  s.maxHp, `${Math.round(s.hp)}/${Math.round(s.maxHp)}`],
        ['ATK', '#E06030', s.atk, 30,      s.atk % 1 ? s.atk.toFixed(1) : String(s.atk)],
        ['DEF', '#3A8AC8', s.def, 15,      s.def % 1 ? s.def.toFixed(1) : String(s.def)],
        ['SPD', '#D4B800', s.spd, 2.0,     s.spd.toFixed(1)],
      ];
      for (const [label, color, val, max, display] of statBars) {
        const row = HTMLPanel.el('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 3px; margin-top: 3px;';

        const lbl = HTMLPanel.el('span');
        lbl.style.cssText = `font-size: 9px; color: ${color}; width: 26px; text-align: right; flex-shrink: 0;`;
        lbl.textContent = label;
        row.appendChild(lbl);

        const track = HTMLPanel.el('div');
        Object.assign(track.style, {
          flex:         '1',
          height:       '4px',
          background:   '#111',
          borderRadius: '2px',
          overflow:     'hidden',
        });
        const pct = Math.min(100, (val / max) * 100);
        const fill = HTMLPanel.el('div');
        fill.style.cssText = `height: 100%; width: ${pct}%; background: ${color}; border-radius: 2px;`;
        track.appendChild(fill);
        row.appendChild(track);

        const valEl = HTMLPanel.el('span');
        valEl.style.cssText = `font-size: 9px; color: #999; width: 34px; flex-shrink: 0; text-align: right;`;
        valEl.textContent = display;
        row.appendChild(valEl);

        infoCol.appendChild(row);
      }

      card.appendChild(infoCol);

      // Häkchen oder Verletzt-Symbol oben rechts
      if (isSel) {
        const check = HTMLPanel.el('span', 'mc-label-heal');
        check.style.cssText = 'position: absolute; top: 3px; right: 5px; font-size: 12px;';
        check.textContent = '✓';
        card.appendChild(check);
      } else if (isInjured) {
        const injEl = HTMLPanel.el('span', 'mc-label-damage');
        injEl.style.cssText = 'position: absolute; top: 3px; right: 5px; font-size: 11px;';
        injEl.textContent = '⚕';
        card.appendChild(injEl);
      }

      // Klick-Handler
      if (!partyFull || isSel) {
        card.addEventListener('click', () => {
          if (isSel) {
            this.selectedFighterIds.delete(fighter.id);
          } else {
            this.selectedFighterIds.add(fighter.id);
          }
          this.rebuildPanels();
        });

        if (!isSel) {
          card.addEventListener('mouseenter', () => {
            if (!this.selectedFighterIds.has(fighter.id)) {
              card.style.borderColor = '#4A4A5A';
            }
          });
          card.addEventListener('mouseleave', () => {
            if (!this.selectedFighterIds.has(fighter.id)) {
              card.style.borderColor = '#2A2A3A';
            }
          });
        }
      }

      grid.appendChild(card);
    }

    return grid;
  }

  // ─── Proviant-Slots ──────────────────────────────────────

  private buildConsumableSlots(state: GameState): HTMLElement {
    const SLOT_COUNT = 3;
    const container = document.createElement('div');
    Object.assign(container.style, {
      display:             'grid',
      gridTemplateColumns: `repeat(${SLOT_COUNT}, 1fr)`,
      gap:                 '4px',
      marginBottom:        '8px',
    });

    const available = PROVISION_ITEMS.filter(id => (state.globalStock[id] ?? 0) > 0);

    for (let si = 0; si < SLOT_COUNT; si++) {
      const sel = this.selectedConsumables[si];
      const itemDef = sel ? ITEM_DEFS[sel] : null;
      const qty = sel ? (state.globalStock[sel] ?? 0) : 0;
      const usedInOtherSlots = sel
        ? this.selectedConsumables.filter((s, i) => i !== si && s === sel).length
        : 0;
      const effectiveQty = qty - usedInOtherSlots;

      const slot = document.createElement('div');
      Object.assign(slot.style, {
        padding:      '6px 7px',
        borderRadius: '5px',
        border:       sel ? '1px solid #446644' : '1px solid #222233',
        background:   sel ? 'rgba(13,26,16,0.95)' : 'rgba(10,10,20,0.8)',
        cursor:       'pointer',
        minHeight:    '58px',
        position:     'relative',
        transition:   'border-color 0.1s',
      });

      if (itemDef && sel) {
        // Gefüllter Slot: Icon + Name + Menge
        const iconRow = document.createElement('div');
        Object.assign(iconRow.style, {
          display:    'flex',
          alignItems: 'center',
          gap:        '5px',
          marginBottom: '3px',
        });

        const img = HTMLPanel.icon(`ITEM_${sel.toUpperCase()}`, 18);
        img.addEventListener('error', () => { img.style.display = 'none'; });
        iconRow.appendChild(img);

        const nameEl = HTMLPanel.el('span', 'mc-label-dim mc-text-sm');
        nameEl.textContent = itemDef.name;
        nameEl.style.overflow = 'hidden';
        nameEl.style.whiteSpace = 'nowrap';
        nameEl.style.textOverflow = 'ellipsis';
        iconRow.appendChild(nameEl);
        slot.appendChild(iconRow);

        // Bestand
        const qtyEl = HTMLPanel.el('div');
        qtyEl.style.cssText = `font-size: var(--mc-font-size-xs); color: ${effectiveQty > 0 ? '#66AA66' : '#AA4444'};`;
        qtyEl.textContent = `×${Math.max(0, effectiveQty)} vorh.`;
        slot.appendChild(qtyEl);

        // Entfernen-Hinweis
        const removeEl = HTMLPanel.el('div');
        Object.assign(removeEl.style, {
          fontSize:  'var(--mc-font-size-xs)',
          color:     '#444',
          textAlign: 'center',
          marginTop: '3px',
        });
        removeEl.textContent = '✕ entfernen';
        slot.appendChild(removeEl);

        // Cycle-Button wenn mehrere Optionen
        if (available.length > 1) {
          const cycleBtn = HTMLPanel.el('span');
          cycleBtn.textContent = '▶';
          Object.assign(cycleBtn.style, {
            position:  'absolute',
            top:       '4px',
            right:     '5px',
            fontSize:  '11px',
            color:     '#444',
            cursor:    'pointer',
          });
          cycleBtn.addEventListener('mouseenter', () => { cycleBtn.style.color = '#AAA'; });
          cycleBtn.addEventListener('mouseleave', () => { cycleBtn.style.color = '#444'; });
          cycleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = PROVISION_ITEMS.indexOf(sel);
            let next: string | null = null;
            for (let n = 1; n <= PROVISION_ITEMS.length; n++) {
              const candidate = PROVISION_ITEMS[(idx + n) % PROVISION_ITEMS.length];
              const stockQty = state.globalStock[candidate] ?? 0;
              const usedCount = this.selectedConsumables.filter((s, i) => i !== si && s === candidate).length;
              if (stockQty > usedCount) { next = candidate; break; }
            }
            if (next) this.selectedConsumables[si] = next;
            this.rebuildPanels();
          });
          slot.appendChild(cycleBtn);
        }

      } else {
        // Leerer Slot
        const emptyEl = HTMLPanel.el('div', 'mc-text-sm mc-text-center');
        Object.assign(emptyEl.style, {
          color:     available.length > 0 ? '#446644' : '#2A2A2A',
          paddingTop: '10px',
          lineHeight: '1.5',
        });
        emptyEl.innerHTML = available.length > 0
          ? '+ Proviant<br>hinzufügen'
          : '— leer —';
        slot.appendChild(emptyEl);
      }

      // Klick: Entfernen oder nächsten verfügbaren Typ wählen
      slot.addEventListener('click', () => {
        if (sel) {
          this.selectedConsumables[si] = null;
        } else {
          const candidates = PROVISION_ITEMS.filter(id => {
            const stockQty = state.globalStock[id] ?? 0;
            const alreadyUsed = this.selectedConsumables.filter(s => s === id).length;
            return stockQty > alreadyUsed;
          });
          if (candidates.length > 0) {
            this.selectedConsumables[si] = candidates[0];
          }
        }
        this.rebuildPanels();
      });

      slot.addEventListener('mouseenter', () => {
        slot.style.borderColor = sel ? '#558855' : '#333355';
      });
      slot.addEventListener('mouseleave', () => {
        slot.style.borderColor = sel ? '#446644' : '#222233';
      });

      container.appendChild(slot);
    }

    return container;
  }

  // ─── Schwierigkeits-Buttons ──────────────────────────────

  private buildDifficultyButtons(): HTMLElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display:             'grid',
      gridTemplateColumns: `repeat(${DIFFICULTIES.length}, 1fr)`,
      gap:                 '4px',
      marginBottom:        '10px',
    });

    for (const diff of DIFFICULTIES) {
      const isSel = this.selectedDifficulty === diff;

      const btn = document.createElement('button');
      Object.assign(btn.style, {
        padding:      '6px 4px',
        borderRadius: '4px',
        border:       isSel ? '1px solid #5A5EAA' : '1px solid #2A2A2A',
        background:   isSel ? '#1E2040' : '#0A0A14',
        color:        isSel ? '#9999FF' : '#555',
        fontSize:     'var(--mc-font-size-xs)',
        cursor:       'pointer',
        fontFamily:   'var(--mc-font)',
        transition:   'background 0.1s, border-color 0.1s',
      });
      btn.textContent = DIFFICULTY_LABELS[diff];

      if (!isSel) {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = '#12121C';
          btn.style.color = '#888';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = '#0A0A14';
          btn.style.color = '#555';
        });
      }

      btn.addEventListener('click', () => {
        this.selectedDifficulty = diff;
        this.rebuildPanels();
      });

      row.appendChild(btn);
    }

    return row;
  }

  // ─── Kriegsmaschine Info ─────────────────────────────────

  private buildWarMachineInfo(state: GameState): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 6px;';

    // Check globalStock for available war machines
    const cannonQty = state.globalStock['war_cannon'] ?? 0;
    const catapultQty = state.globalStock['war_catapult'] ?? 0;
    const wmId: string | null = cannonQty > 0 ? 'war_cannon' : catapultQty > 0 ? 'war_catapult' : null;
    const hasWM = wmId !== null;

    if (!hasWM) {
      // Kein War Machine verfügbar
      const hint = HTMLPanel.el('div', 'mc-text-sm');
      hint.style.cssText = 'color: #FF6B6B; padding: 6px 0; line-height: 1.5;';
      hint.innerHTML = '⚠ Keine Kriegsmaschine verfügbar!<br>' +
        '<span style="color:#888">Schmiedet eine Kanone oder Katapult in der Kriegsmaschinen-Werkstatt.</span>';
      container.appendChild(hint);
    } else {
      const itemDef = ITEM_DEFS[wmId];
      const name = itemDef?.name ?? wmId;
      const qty = wmId === 'war_cannon' ? cannonQty : catapultQty;

      const card = HTMLPanel.el('div', 'mc-text-sm');
      card.style.cssText = [
        'background: #1a1000',
        'border: 1px solid #FF8C00',
        'border-radius: 4px',
        'padding: 6px 8px',
        'display: flex',
        'align-items: center',
        'gap: 8px',
        'color: #FF8C00',
      ].join('; ');

      const icon = document.createElement('span');
      icon.style.fontSize = '18px';
      icon.textContent = wmId === 'war_cannon' ? '🏹' : '⚙️';
      card.appendChild(icon);

      const info = document.createElement('div');
      info.innerHTML = `<strong>${name}</strong><br><span style="color:#888">${qty}x verfügbar · +1 Party-Slot</span>`;
      card.appendChild(info);

      container.appendChild(card);
    }

    return container;
  }

  // ─── Start-Button ────────────────────────────────────────

  private buildStartButton(): HTMLElement {
    const route = this.selectedRouteId ? ROUTE_DEFS[this.selectedRouteId] : null;
    const state = this.currentState;
    const isSiege = route?.isSiegeRoute ?? false;
    const hasFighters = this.selectedFighterIds.size > 0;
    const hasWarMachine = !isSiege || (
      state !== null &&
      ((state.globalStock['war_cannon'] ?? 0) > 0 || (state.globalStock['war_catapult'] ?? 0) > 0)
    );
    const canStart = hasFighters && this.selectedRouteId !== null && hasWarMachine;

    let btnLabel = 'Kämpfer auswählen...';
    if (hasFighters && isSiege && !hasWarMachine) {
      btnLabel = '⚠ Kriegsmaschine fehlt!';
    } else if (canStart) {
      btnLabel = '⚔  KAMPF STARTEN!';
    }

    const btn = document.createElement('button');
    Object.assign(btn.style, {
      width:        '100%',
      padding:      '12px',
      borderRadius: '5px',
      border:       canStart ? '2px solid #FF4444' : '1px solid #2A2A2A',
      background:   canStart ? '#6B0000' : '#111',
      color:        canStart ? '#FF9999' : (hasFighters && isSiege && !hasWarMachine ? '#FF8C00' : '#3A3A3A'),
      fontSize:     'var(--mc-font-size-base)',
      fontWeight:   'bold',
      cursor:       canStart ? 'pointer' : 'not-allowed',
      fontFamily:   'var(--mc-font)',
      transition:   'background 0.1s, border-color 0.1s',
      marginTop:    '4px',
    });
    btn.textContent = btnLabel;

    if (canStart) {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#8B0000';
        btn.style.borderColor = '#FF6666';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#6B0000';
        btn.style.borderColor = '#FF4444';
      });
      btn.addEventListener('click', () => {
        if (!this.selectedRouteId) return;
        const fighterIds = Array.from(this.selectedFighterIds);
        const consumables = this.selectedConsumables.filter((c): c is string => c !== null);
        this.onStartExpedition?.(
          this.selectedRouteId,
          fighterIds,
          this.selectedDifficulty,
          null,
          consumables,
        );
        this.hide();
      });
    }

    return btn;
  }

  // ─── Hilfs-Bausteine ─────────────────────────────────────

  private buildSectionTitle(text: string): HTMLElement {
    const el = HTMLPanel.el('div', 'mc-text-sm mc-bold');
    Object.assign(el.style, {
      color:        '#888',
      marginBottom: '6px',
      letterSpacing: '0.5px',
    });
    el.textContent = text;
    return el;
  }

  private buildSectionDivider(): HTMLElement {
    const div = HTMLPanel.el('div', 'mc-divider');
    div.style.margin = '8px 0';
    div.style.background = '#222';
    return div;
  }

  // ─── Panels neu aufbauen (nach Selektion) ─────────────────

  /**
   * Baut die Routen-Liste und den rechten Panel neu auf.
   * Wird bei jeder Auswahl-Änderung aufgerufen.
   */
  private rebuildPanels(): void {
    if (!this.currentState) return;

    // Rechten Panel neu aufbauen
    this.buildRightPanel(this.currentState);

    // Routen-Liste: ausgewählte Karte hervorheben
    // (Einfachste Lösung: gesamte linke Seite neu bauen wäre ein Full-Rebuild.
    //  Stattdessen: nur rechter Panel wird neu gebaut, linke Liste bleibt stabil.
    //  Die Routen-Karten-Selektion wird über die CSS-Klassen in buildModal gesetzt.)
    // Für eine vollständige Selektion: gesamtes Modal neu bauen.
    this.buildModal();
    // Nach buildModal() ist super.show() nicht nötig da das el schon sichtbar ist.
    if (!this.el.hasAttribute('hidden')) return;
    super.show();
  }

  // ─── Hilfsfunktionen ─────────────────────────────────────

  private formatBossName(bossId: string): string {
    return bossId
      .replace(/^boss_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}
