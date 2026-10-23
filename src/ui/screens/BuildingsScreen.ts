// ─── Magic City – Gebäude-Seite ─────────────────────────────────
// Reiter «Stadt» (Mindmap, ProduktionTab.ts), «Crafting» (CraftingTab.ts)
// und «Aufbau» (AufbauTab.ts). Jedes Gebäude gibt es genau einmal: Bauen
// schaltet es direkt auf seinem Feld frei (Gold und Beute), danach
// wird es ausgebaut (systems/Ausbau.ts). Hier: Reiter, Bau-Dialog und die
// Fenster (GebaeudeFenster.ts, HaendlerFenster.ts) öffnen.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../../data/buildings';
import { ERKLAERUNG } from '../../data/gebaeudeErklaerungen';
import { RECIPE_DEFS } from '../../data/recipes';
import { GameState } from '../../models/GameState';
import { createBuildingInstance } from '../../models/Building';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';
import { renderAufbauTab, bindAufbauTab } from './AufbauTab';
import { renderProduktionTab, aktualisiereProduktionTab, bindProduktionTab, ProduktionZiel } from './ProduktionTab';
import { renderCrafting, aktualisiereCrafting, bindCraftingTab } from './CraftingTab';
import { showBuildingModal, renderCostDetail } from './GebaeudeFenster';
import { showHaendlerFenster, HaendlerAbschnitt } from './HaendlerFenster';
import { erfolgePruefen } from '../../systems/AchievementSystem';
import { freischaltHinweise, dasGebaeude } from '../../systems/GebaeudeStatus';
import { maxStufe } from '../../systems/Ausbau';
import { bindeFensterTasten, hintergrundKlick, schluckeZweitenKlick } from '../components/FensterHilfen';
import { bindDruckWaechter, wirdGedrueckt } from '../components/DruckWaechter';
import { oeffneFundbuch } from '../components/FundbuchFenster';

/** Kartenbild je Gebäude-Art. */
const BUILDING_IMAGE_MAP: Record<string, string> = {
  GUILD_HALL: 'bld_guild_hall',
  HAENDLER: 'bld_marketplace',
  SMITHY: 'bld_smithy',
  HERB_GARDEN: 'bld_herb_garden',
  ARCANE_SMITHY: 'bld_arcane_smithy',
  WAR_MACHINE_WORKSHOP: 'bld_war_workshop',
};

function getBuildingImageStyle(typeId: string): string {
  const img = BUILDING_IMAGE_MAP[typeId];
  if (img) return `background-image:url('assets/buildings/${img}.png')`;
  const def = BUILDING_DEFS[typeId];
  return def?.spriteKey ? `background-image:url('assets/sprites/final/${def.spriteKey}.png')` : '';
}

type BuildingsTab = 'produktion' | 'crafting' | 'aufbau';

let cachedState: GameState | null = null;
let currentTab: BuildingsTab = 'produktion';
/** Laufende Aktualisierung der Mindmap (Balken, Zustände, Linien). */
let liveTimer: number | null = null;
let globalListenersBound = false;

// ── Public API ──────────────────────────────────────────────────

export function initBuildingsScreen(state: GameState): void {
  cachedState = state;
  bindGlobalListeners();
}

export function renderBuildingsScreen(container: HTMLElement): void {
  const state = cachedState;
  if (!state) return;
  document.getElementById('s-buildings')?.remove();

  const el = document.createElement('div');
  el.id = 's-buildings';
  el.className = 'screen';
  el.innerHTML = buildHTML(state);
  container.appendChild(el);
  bindEvents(el, state);
}

/** Seite neu zeichnen; der aktive Reiter bleibt (currentTab). */
function reRenderBuildingsScreen(root: HTMLElement, state: GameState): void {
  root.innerHTML = buildHTML(state);
  bindEvents(root, state);
}

// ── HTML ────────────────────────────────────────────────────────

function buildHTML(state: GameState): string {
  const tabCls = (tab: BuildingsTab) => (tab === currentTab ? 'btab active on' : 'btab');
  const panelStyle = (tab: BuildingsTab) => (tab === currentTab ? '' : ' style="display:none"');
  return `
    ${renderHeader(state, 'main', 'GEBÄUDE & CRAFTING')}

    <div class="btabs">
      <button class="${tabCls('produktion')}" data-tab="produktion">STADT</button>
      <button class="${tabCls('crafting')}" data-tab="crafting">⚗️ CRAFTING</button>
      <button class="${tabCls('aufbau')}" data-tab="aufbau">AUFBAU</button>
    </div>

    <div class="bmain" data-panel="produktion"${panelStyle('produktion')}>
      ${renderProduktionTab(state, getBuildingImageStyle)}
    </div>

    <div class="bmain" data-panel="crafting"${panelStyle('crafting')}>
      ${renderCrafting(state)}
    </div>

    <div class="bmain" data-panel="aufbau"${panelStyle('aufbau')}>
      ${renderAufbauTab(state, getBuildingImageStyle)}
    </div>
  `;
}

// ── Reiter und laufende Aktualisierung ──────────────────────────

function panelFor(root: HTMLElement, tab: BuildingsTab): HTMLElement | null {
  return root.querySelector(`.bmain[data-panel="${tab}"]`) as HTMLElement | null;
}

/** Mindmap nachführen (Zustände, Balken, Linien); nur sinnvoll, wenn sie sichtbar ist. */
function aktualisiereMindmap(root: HTMLElement, state: GameState): void {
  if (currentTab !== 'produktion') return;
  const panel = panelFor(root, 'produktion');
  if (panel) aktualisiereProduktionTab(panel, state);
}

function switchTab(root: HTMLElement, tabId: BuildingsTab): void {
  currentTab = tabId;
  root.querySelectorAll<HTMLElement>('.btab').forEach(tab => {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle('active', active);
    tab.classList.toggle('on', active);
  });
  root.querySelectorAll<HTMLElement>('.bmain').forEach(panel => {
    panel.style.display = panel.dataset.panel === tabId ? '' : 'none';
  });
  // Die Linien hängen an den Kartenpositionen und können erst sichtbar gezeichnet werden
  if (cachedState) aktualisiereMindmap(root, cachedState);
}

/** Linien neu legen, wenn das Fenster seine Grösse ändert oder die Seite aufgerufen wird. */
function bindGlobalListeners(): void {
  if (globalListenersBound) return;
  globalListenersBound = true;
  bindDruckWaechter();
  const redraw = () => {
    const root = document.getElementById('s-buildings');
    if (root && cachedState) aktualisiereMindmap(root, cachedState);
  };
  window.addEventListener('resize', redraw);
  window.addEventListener('mc:navigate', (e) => {
    if ((e as CustomEvent).detail?.screen === 'buildings') redraw();
  });
}

/** Balken und Zustände laufend nachführen, ohne die Seite neu zu zeichnen. */
function startLiveTimer(root: HTMLElement, state: GameState): void {
  if (liveTimer !== null) window.clearInterval(liveTimer);
  const timer = window.setInterval(() => {
    if (!root.isConnected) {
      window.clearInterval(timer);
      if (liveTimer === timer) liveTimer = null;
      return;
    }
    if (root.offsetParent === null && root.style.display === 'none') return;
    if (wirdGedrueckt()) return;
    aktualisiereMindmap(root, state);
    const crafting = panelFor(root, 'crafting');
    if (currentTab === 'crafting' && crafting) aktualisiereCrafting(crafting, state);
  }, 500);
  liveTimer = timer;
}

// ── Fenster öffnen ──────────────────────────────────────────────

function oeffneHaendler(root: HTMLElement, state: GameState, abschnitt?: HaendlerAbschnitt): void {
  showHaendlerFenster(root, state, { abschnitt, beimSchliessen: () => reRenderBuildingsScreen(root, state) });
}

/** Händler → sein Fenster; gebaut → Fenster des Gebäudes; sonst Bau-Dialog (zeigt auch den Sperrgrund). */
function oeffneGebaeude(root: HTMLElement, typeId: string, state: GameState, highlightRecipeId: string | null = null): void {
  if (typeId === 'HAENDLER') {
    oeffneHaendler(root, state);
    return;
  }
  const b = dasGebaeude(state, typeId);
  if (b) showBuildingModal(root, b, state, { highlightRecipeId, beimSchliessen: () => reRenderBuildingsScreen(root, state) });
  else showBuyConfirmModal(root, typeId, state);
}

function bindEvents(root: HTMLElement, state: GameState): void {
  root.querySelectorAll<HTMLElement>('.btab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(root, tab.dataset.tab as BuildingsTab));
  });

  const backBtn = root.querySelector('.hdr-back') as HTMLElement | null;
  backBtn?.addEventListener('click', () => {
    const target = backBtn.dataset.nav;
    if (target) navigateTo(target as 'main');
  });

  // Stadt: Gebäude → Fenster, Bauplatz → Bau-Dialog, Beute und Ziele → andere Seite
  const produktion = panelFor(root, 'produktion');
  if (produktion) {
    bindProduktionTab(produktion, state, {
      oeffneGebaeude: typeId => oeffneGebaeude(root, typeId, state),
      kaufen: typeId => showBuyConfirmModal(root, typeId, state),
      wechseln: (ziel: ProduktionZiel) => {
        if (ziel === 'aufbau') switchTab(root, 'aufbau');
        else navigateTo(ziel);
      },
    });
  }

  const aufbau = panelFor(root, 'aufbau');
  if (aufbau) {
    bindAufbauTab(aufbau, {
      oeffne: typeId => oeffneGebaeude(root, typeId, state),
      zuDenHelden: () => navigateTo('heroes'),
      fundbuch: bauplanId => oeffneFundbuch(state, bauplanId),
    });
  }

  const crafting = panelFor(root, 'crafting');
  if (crafting) {
    bindCraftingTab(crafting, state, {
      oeffneWerkstatt: (typeId, recipeId) => oeffneGebaeude(root, typeId, state, recipeId),
      bauen: typeId => showBuyConfirmModal(root, typeId, state),
    });
  }

  startLiveTimer(root, state);
  aktualisiereMindmap(root, state);
}

// ── Bau-Dialog ──────────────────────────────────────────────────

function showBuyConfirmModal(root: HTMLElement, typeId: string, state: GameState): void {
  const def = BUILDING_DEFS[typeId];
  if (!def) return;
  // Es gibt jedes Gebäude nur einmal: steht es schon, geht es zum Ausbau
  if (dasGebaeude(state, typeId)) {
    oeffneGebaeude(root, typeId, state);
    return;
  }
  root.querySelector('.ov')?.remove();

  const canAfford = Object.entries(def.buildCost).every(([res, qty]) => (state.globalStock[res] ?? 0) >= qty);
  const hinweise = freischaltHinweise(state, typeId);
  const unlocked = hinweise.length === 0;
  const recipeNames = def.recipes.map(id => RECIPE_DEFS[id]?.name).filter(Boolean);
  const erklaerung = ERKLAERUNG[typeId];
  const max = maxStufe(typeId);

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal">
      <h3>${def.name} bauen?</h3>
      ${erklaerung ? `<p class="bm-info">${erklaerung}</p>` : ''}
      <p><strong>Kosten:</strong></p>
      <div class="cingr">${renderCostDetail(def.buildCost, state)}</div>
      ${recipeNames.length > 0 ? `<p><strong>Rezepte:</strong> ${recipeNames.join(', ')}</p>` : ''}
      ${max > 1 ? `<p class="bm-info">Es gibt jedes Gebäude nur einmal. Danach lässt es sich bis Stufe ${max} ausbauen.</p>` : ''}
      ${!unlocked ? `<p class="ws-warn"><strong>🔒 Gesperrt:</strong> ${hinweise.join(', ')}</p>`
        : !canAfford ? '<p class="ws-warn">Nicht genug Gold oder Beute.</p>' : ''}
      <div class="bm-actions">
        ${unlocked && canAfford ? '<button class="fk-btn ok btn-confirm-buy">BAUEN</button>' : ''}
        <button class="fk-btn btn-close-modal">ABBRECHEN</button>
      </div>
    </div>`;
  root.appendChild(ov);

  const close = () => {
    tastenLoesen();
    ov.remove();
  };
  const tastenLoesen = bindeFensterTasten(ov, ov.querySelector('.modal'), close);

  // Der Hintergrund schliesst nur bei einem einfachen Klick, der dort begann
  const hintergrund = hintergrundKlick(ov);
  ov.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if ((target === ov && hintergrund(e)) || target.classList.contains('btn-close-modal')) {
      close();
      schluckeZweitenKlick();
    } else if (target.classList.contains('btn-confirm-buy')) {
      close();
      executeBuy(root, typeId, state);
    }
  });
}

/** Baut sofort (keine Bauzeit): Gold und Beute abziehen. */
function executeBuy(root: HTMLElement, typeId: string, state: GameState): void {
  const def = BUILDING_DEFS[typeId];
  if (!def || dasGebaeude(state, typeId) || freischaltHinweise(state, typeId).length) return;
  for (const [res, qty] of Object.entries(def.buildCost)) {
    if ((state.globalStock[res] ?? 0) < qty) return;
  }

  for (const [res, qty] of Object.entries(def.buildCost)) {
    state.globalStock[res] = (state.globalStock[res] ?? 0) - qty;
  }
  state.buildings.push(createBuildingInstance(typeId));

  state.statistics['total_buildings_built'] = (state.statistics['total_buildings_built'] ?? 0) + 1;
  erfolgePruefen(state); // «Grundsteinlegung» gleich zählen, nicht erst beim Tageswechsel
  window.dispatchEvent(new Event('mc:speichern'));
  reRenderBuildingsScreen(root, state);
}
