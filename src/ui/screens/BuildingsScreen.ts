// ─── Magic City – Gebäude-Seite ─────────────────────────────────
// Reiter «Produktion» (Mindmap der Stadt), «Crafting» und «Aufbau»
// (Freischalt-Baum). Jedes Gebäude gibt es genau einmal: Bauen schaltet
// es frei, danach wird es ausgebaut (systems/Ausbau.ts). Hergestellt wird
// in den Gebäuden (ProductionSystem); diese Seite wählt Rezepte, gibt
// Aufträge, baut und baut aus.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BUILD_MENU_ORDER, BuildingDef } from '../../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../../data/recipes';
import { ITEM_DEFS } from '../../data/items';
import { GameState } from '../../models/GameState';
import { BuildingInstance, createBuildingInstance } from '../../models/Building';
import { STARTING_BUILDING_TYPES } from '../../scenes/CityStartingLayout';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';
import { renderAufbauTab, bindAufbauTab } from './AufbauTab';
import { renderProduktionTab, aktualisiereProduktionTab, bindProduktionTab, ProduktionZiel } from './ProduktionTab';
import {
  freischaltHinweise, itemName, stockFor, canAffordRecipe, cycleProgress, produktionsHindernis, WarteGrund,
  dasGebaeude, wachstum, tagFortschritt, wohnKapazitaet, einzelStatus,
} from '../../systems/GebaeudeStatus';
import { engpassFuerInstanz } from '../../systems/EngpassSystem';
import {
  ausbauInfo, ausbauen, ausbauWirkung, maxStufe, stufeVon, arbeitsplaetze, besetzt, zyklusSekunden,
  erstatteLaufendenZyklus, entferneGebaeude, investiert, wirkungsStufe, marktBonusProzent, bankGoldProTag,
} from '../../systems/Ausbau';
import { EconomySystem, STEUER_PRO_BEWOHNER } from '../../systems/EconomySystem';
import {
  MAX_AUFTRAEGE, auftragsListe, auftragGeben, auftragAbbrechen, hatAuftragsliste, kannAuftragGeben, restzeitSekunden,
} from '../../systems/Auftraege';

/** Map building typeId to card background image. */
const BUILDING_IMAGE_MAP: Record<string, string> = {
  WAREHOUSE: 'bld_warehouse',
  GUILD_HALL: 'bld_guild_hall',
  LUMBER_CAMP: 'bld_lumber_camp',
  FARM_GRAIN: 'bld_farm_grain',
  MILL_WIND: 'bld_mill_wind',
  BAKERY: 'bld_bakery',
  WELL: 'bld_well',
  HOUSE_T1: 'bld_house',
  QUARRY: 'bld_quarry',
  HERB_GARDEN: 'bld_herb_garden',
  SMITHY: 'bld_smithy',
  IRON_MINE: 'bld_iron_mine',
  ARCANE_SMITHY: 'bld_arcane_smithy',
  MARKETPLACE: 'bld_marketplace',
  WAR_MACHINE_WORKSHOP: 'bld_war_workshop',
  BANK: 'bld_bank',
};

function getBuildingImageStyle(typeId: string): string {
  const img = BUILDING_IMAGE_MAP[typeId];
  if (img) return `background-image:url('assets/buildings/${img}.png')`;
  // Fallback: use sprite from final/ folder
  const def = BUILDING_DEFS[typeId];
  if (def?.spriteKey) return `background-image:url('assets/sprites/final/${def.spriteKey}.png')`;
  return '';
}

type BuildingsTab = 'produktion' | 'crafting' | 'aufbau';

let cachedState: GameState | null = null;
let currentTab: BuildingsTab = 'produktion';
/** Laufende Aktualisierung der Mindmap (Balken, Zustände, Linien). */
let liveTimer: number | null = null;
let globalListenersBound = false;
const economy = new EconomySystem();

// ── Public API ──────────────────────────────────────────────────

export function initBuildingsScreen(state: GameState): void {
  cachedState = state;
  bindGlobalListeners();
}

export function renderBuildingsScreen(container: HTMLElement): void {
  const state = cachedState;
  if (!state) return;

  // Remove previous instance to avoid duplicates on re-render
  const prev = document.getElementById('s-buildings');
  if (prev) prev.remove();

  const el = document.createElement('div');
  el.id = 's-buildings';
  el.className = 'screen';

  el.innerHTML = buildHTML(state);
  container.appendChild(el);
  bindEvents(el, state);
}

// ── Re-Render (replaces content, rebinds events) ────────────────

function reRenderBuildingsScreen(root: HTMLElement, state: GameState): void {
  root.innerHTML = buildHTML(state);
  bindEvents(root, state);
}

// ── HTML Builder ────────────────────────────────────────────────

function buildHTML(state: GameState): string {
  const tabCls = (tab: BuildingsTab) => (tab === currentTab ? 'btab active on' : 'btab');
  const panelStyle = (tab: BuildingsTab) => (tab === currentTab ? '' : ' style="display:none"');
  return `
    ${renderHeader(state, 'main', 'GEBÄUDE & CRAFTING')}

    <div class="btabs">
      <button class="${tabCls('produktion')}" data-tab="produktion">PRODUKTION</button>
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

// ── Cost Helpers ────────────────────────────────────────────────

/** Cost chips "Holz 12/20" coloured by availability (Kauf- und Ausbau-Fenster). */
function renderCostDetail(cost: Record<string, number>, state: GameState): string {
  const entries = Object.entries(cost);
  if (entries.length === 0) return '<span class="cost-ok">Gratis</span>';
  return entries.map(([res, qty]) => {
    const have = Math.floor(state.globalStock[res] ?? 0);
    const cls = have >= qty ? 'cost-ok' : 'cost-miss';
    return `<span class="ingr ${cls}">${itemName(res)} ${have}/${qty}</span>`;
  }).join('');
}

function categoryEmoji(cat: string): string {
  switch (cat) {
    case 'producer': return '🌾';
    case 'refine': return '⚙️';
    case 'utility': return '🛠️';
    case 'storage': return '📦';
    case 'housing': return '🏠';
    case 'hub': return '🏰';
    case 'infrastructure': return '🛣️';
    default: return '🏗️';
  }
}

function stufenText(b: BuildingInstance): string {
  const max = maxStufe(b.typeId);
  return max > 1 ? `Stufe ${stufeVon(b)} von ${max}` : '';
}

// ── Crafting Tab ────────────────────────────────────────────────

/** Building types that own recipes, in shop order. */
function craftingBuildingTypes(): string[] {
  const ordered = BUILD_MENU_ORDER.filter(id => (BUILDING_DEFS[id]?.recipes.length ?? 0) > 0);
  const rest = Object.keys(BUILDING_DEFS).filter(
    id => !ordered.includes(id) && BUILDING_DEFS[id].recipes.length > 0,
  );
  return [...ordered, ...rest];
}

function renderCrafting(state: GameState): string {
  const ownedGroups: string[] = [];
  const lockedGroups: string[] = [];

  for (const typeId of craftingBuildingTypes()) {
    const def = BUILDING_DEFS[typeId];
    const b = dasGebaeude(state, typeId);
    const recipes = def.recipes.map(id => RECIPE_DEFS[id]).filter((r): r is RecipeDef => !!r);
    if (recipes.length === 0) continue;

    const cards = recipes.map(rcp => renderCraftCard(rcp, def, b, state)).join('');
    const badge = b
      ? `<span class="craft-group-cnt">${stufenText(b)}${def.manualCraft ? ' · Aufträge per Hand' : ''}</span>`
      : `<span class="craft-lock">🔒 braucht ${def.name}</span>`;
    const html = `
      <div class="craft-group${b ? '' : ' locked'}">
        <div class="craft-group-hd">${categoryEmoji(def.category)} ${def.name} ${badge}</div>
        ${b ? `<div class="craft-lauf" data-lauf="${typeId}">${renderLaufend(state, b)}</div>` : ''}
        <div class="craft-grid">${cards}</div>
      </div>`;
    (b ? ownedGroups : lockedGroups).push(html);
  }

  const hint = ownedGroups.length === 0
    ? '<p class="craft-hint">Du besitzt noch kein Gebäude mit Rezepten. Baue eines im Reiter «Produktion».</p>'
    : '<p class="craft-hint">Hergestellt wird im Gebäude. Klick auf ein Rezept öffnet die Werkstatt.</p>';

  return `${hint}${ownedGroups.join('')}${lockedGroups.join('')}`;
}

/** Was in der Werkstatt gerade läuft und was noch wartet, mit Restzeit (Reiter «Crafting»). */
function renderLaufend(state: GameState, b: BuildingInstance): string {
  const name = (id: string) => RECIPE_DEFS[id]?.name ?? id;
  if (hatAuftragsliste(b)) {
    const liste = auftragsListe(b);
    if (liste.length === 0) return '<span class="ws-msg">Keine Aufträge</span>';
    const chips = liste.map((id, i) => i === 0 && b.producing
      ? `<span class="ingr craft-run">● ${name(id)} · noch ${sekundenText(b.productionTimer)}</span>`
      : `<span class="ingr">${i + 1}. ${name(id)}</span>`).join('');
    return `${chips}<span class="ccard-time">Aufträge ${restzeitText(b)}</span>`;
  }
  const st = einzelStatus(state, b);
  if (b.producing && st.recipe) {
    return `<span class="ingr craft-run">● ${st.recipe.name} · noch ${sekundenText(b.productionTimer)}</span>`;
  }
  return `<span class="ws-msg">${st.recipe ? `${st.recipe.name}: ` : ''}${st.laeuft ? 'startet gleich' : 'wartet'}</span>`;
}

function renderCraftCard(rcp: RecipeDef, def: BuildingDef, b: BuildingInstance | undefined, state: GameState): string {
  // Determine rarity from output item tags
  const outputKey = Object.keys(rcp.outputs)[0] ?? '';
  const itemDef = ITEM_DEFS[outputKey];
  const rarity = resolveRarity(itemDef);
  const ico = itemDef ? itemIcon(outputKey) : '⚗️';
  const locked = !b;

  let status = '';
  if (!b) {
    status = `<span class="craft-lock">braucht ${def.name}</span>`;
  } else if (b.activeRecipeId === rcp.id && b.producing) {
    status = '<span class="craft-run">● läuft</span>';
  } else if (hatAuftragsliste(b)) {
    const wartend = b.auftraege.filter(id => id === rcp.id).length;
    if (wartend > 0) status = `<span class="craft-run">${wartend}× in Auftrag</span>`;
  } else if (b.activeRecipeId === rcp.id) {
    status = '<span class="craft-run">► gewählt</span>';
  }
  const sekunden = Math.round(b ? zyklusSekunden(b, rcp) : rcp.cycleTimeSec);

  return `
    <div class="ccard${locked ? ' locked' : ''}" data-rcp="${rcp.id}" data-btype="${def.id}">
      <div class="ccard-hd">
        <span class="cico">${ico}</span>
        <span class="cnm">${rcp.name}</span>
        <span class="crar ${rarity}">${rarity}</span>
      </div>
      <div class="cingr">${renderRecipeChips(rcp, state, b ?? null)}</div>
      <div class="ccard-ft">${status}<span class="ccard-time">⏱ ${sekunden}s</span></div>
      <button class="btn-craft">${locked ? 'GEBÄUDE BAUEN' : 'ZUR WERKSTATT'}</button>
    </div>`;
}

/** Output + ingredient chips (Bestand/benötigt). */
function renderRecipeChips(rcp: RecipeDef, state: GameState, b: BuildingInstance | null): string {
  const outHTML = Object.entries(rcp.outputs)
    .map(([key, qty]) => `<span class="ingr ingr-out">→ ${qty}× ${itemName(key)}</span>`)
    .join('');
  const inEntries = Object.entries(rcp.inputs);
  const inHTML = inEntries.length === 0
    ? '<span class="ingr">Keine Zutaten</span>'
    : inEntries.map(([key, qty]) => {
        const have = b ? stockFor(state, b, key) : (state.globalStock[key] ?? 0);
        const cls = have >= qty ? 'cost-ok' : 'cost-miss';
        return `<span class="ingr ${cls}">${itemName(key)} ${have}/${qty}</span>`;
      }).join('');
  const water = rcp.requirements?.waterSupplied ? '<span class="ingr">💧 braucht Brunnen</span>' : '';
  return outHTML + inHTML + water;
}

function resolveRarity(itemDef: { tags: string[] } | undefined): string {
  if (!itemDef) return 'common';
  const tags = itemDef.tags;
  if (tags.includes('legendary')) return 'legendary';
  if (tags.includes('epic')) return 'epic';
  if (tags.includes('rare')) return 'rare';
  if (tags.includes('uncommon')) return 'uncommon';
  return 'common';
}

function itemIcon(key: string): string {
  const map: Record<string, string> = {
    grain: '🌾', wood: '🪵', stone: '🪨',
    bread: '🍞', flour: '🫓', herb_green: '🌿',
    healing_potion: '⚗️', iron_scrap: '⚙️',
    iron_sword: '⚔️', iron_shield: '🛡️',
    leather_armor: '🧥', crystal_shard: '💎',
    power_bread: '🍞', steel_sword: '⚔️',
    longbow: '🏹', crystal_staff: '🪄',
    steel_armor: '🛡️',
  };
  return map[key] ?? '📦';
}

/** Crafting tab click: open the workshop of the building and select the recipe there. */
function openRecipeInWorkshop(root: HTMLElement, typeId: string, rcpId: string, state: GameState): void {
  const b = dasGebaeude(state, typeId);
  if (!b) {
    showBuyConfirmModal(root, typeId, state);
    return;
  }
  // Switching is lossless while idle; a running cycle is only switched after confirmation in the modal.
  // Werkstätten mit Auftragsliste: das Rezept wird nur hervorgehoben, Aufträge gibt man im Fenster.
  if (!b.producing && !hatAuftragsliste(b)) selectRecipe(state, b, rcpId);
  showBuildingModal(root, b, state, rcpId);
}

// ── Events ──────────────────────────────────────────────────────

function panelFor(root: HTMLElement, tab: BuildingsTab): HTMLElement | null {
  return root.querySelector(`.bmain[data-panel="${tab}"]`) as HTMLElement | null;
}

/** Mindmap nachführen (Zustände, Balken, Linien); nur sinnvoll, wenn sie sichtbar ist. */
function aktualisiereMindmap(root: HTMLElement, state: GameState): void {
  if (currentTab !== 'produktion') return;
  const panel = panelFor(root, 'produktion');
  if (panel) aktualisiereProduktionTab(panel, state);
}

/** Laufende Aufträge im Reiter «Crafting» nachführen (nur die kleinen Zeilen, nicht die Karten). */
function aktualisiereCrafting(root: HTMLElement, state: GameState): void {
  if (currentTab !== 'crafting') return;
  const zeilen = root.querySelectorAll('.craft-lauf');
  for (let i = 0; i < zeilen.length; i++) {
    const el = zeilen[i] as HTMLElement;
    const b = dasGebaeude(state, el.dataset.lauf ?? '');
    if (b) el.innerHTML = renderLaufend(state, b);
  }
}

function switchTab(root: HTMLElement, tabId: BuildingsTab): void {
  currentTab = tabId;
  const tabs = root.querySelectorAll('.btab');
  for (let j = 0; j < tabs.length; j++) {
    const active = (tabs[j] as HTMLElement).dataset.tab === tabId;
    tabs[j].classList.toggle('active', active);
    tabs[j].classList.toggle('on', active);
  }
  const panels = root.querySelectorAll('.bmain');
  for (let p = 0; p < panels.length; p++) {
    const panel = panels[p] as HTMLElement;
    panel.style.display = panel.dataset.panel === tabId ? '' : 'none';
  }
  // Die Linien hängen an den Kartenpositionen und können erst sichtbar gezeichnet werden
  if (cachedState) aktualisiereMindmap(root, cachedState);
}

/** Linien neu legen, wenn das Fenster seine Grösse ändert oder die Seite aufgerufen wird. */
function bindGlobalListeners(): void {
  if (globalListenersBound) return;
  globalListenersBound = true;
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
    aktualisiereMindmap(root, state);
    aktualisiereCrafting(root, state);
  }, 500);
  liveTimer = timer;
}

/** Gebaut → Fenster des Gebäudes, sonst Bau-Dialog (zeigt auch den Sperrgrund). */
function oeffneGebaeudeOderBau(root: HTMLElement, typeId: string, state: GameState): void {
  const b = dasGebaeude(state, typeId);
  if (b) showBuildingModal(root, b, state);
  else showBuyConfirmModal(root, typeId, state);
}

function bindEvents(root: HTMLElement, state: GameState): void {
  // Tab switching
  const tabs = root.querySelectorAll('.btab');
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', () => {
      switchTab(root, (tabs[i] as HTMLElement).dataset.tab as BuildingsTab);
    });
  }

  // Header back button
  const backBtn = root.querySelector('.hdr-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const target = (backBtn as HTMLElement).dataset.nav;
      if (target) navigateTo(target as 'main');
    });
  }

  // Produktion: Gebäude → Fenster, Bauplatz → Bau-Dialog, Dungeon-Zutaten und Ziele → andere Seite
  const produktion = panelFor(root, 'produktion');
  if (produktion) {
    bindProduktionTab(produktion, state, {
      oeffneGebaeude: typeId => oeffneGebaeudeOderBau(root, typeId, state),
      kaufen: typeId => showBuyConfirmModal(root, typeId, state),
      wechseln: (ziel: ProduktionZiel) => {
        if (ziel === 'aufbau') switchTab(root, 'aufbau');
        else navigateTo(ziel);
      },
    });
  }

  // Aufbau-Reiter: Karte anklicken → Fenster des Gebäudes oder Bau-Dialog
  bindAufbauTab(root, typeId => oeffneGebaeudeOderBau(root, typeId, state));

  // Recipe cards → open the building's workshop (locked: offer to build it)
  const craftCards = root.querySelectorAll('.ccard');
  for (let i = 0; i < craftCards.length; i++) {
    craftCards[i].addEventListener('click', () => {
      const card = craftCards[i] as HTMLElement;
      const { rcp, btype } = card.dataset;
      if (rcp && btype) openRecipeInWorkshop(root, btype, rcp, state);
    });
  }

  startLiveTimer(root, state);
  aktualisiereMindmap(root, state);
}

// ── Buy Confirm Modal ───────────────────────────────────────────

function showBuyConfirmModal(root: HTMLElement, typeId: string, state: GameState): void {
  const def = BUILDING_DEFS[typeId];
  if (!def) return;

  // Es gibt jedes Gebäude nur einmal: steht es schon, geht es zum Ausbau
  const vorhanden = dasGebaeude(state, typeId);
  if (vorhanden) {
    showBuildingModal(root, vorhanden, state);
    return;
  }

  // Remove any existing modal
  const prev = root.querySelector('.ov');
  if (prev) prev.remove();

  const canAfford = Object.entries(def.buildCost).every(
    ([res, qty]) => (state.globalStock[res] ?? 0) >= qty
  );

  const hinweise = freischaltHinweise(state, typeId);
  const unlocked = hinweise.length === 0;
  const canBuild = unlocked && canAfford;

  const recipeNames = def.recipes.map(id => RECIPE_DEFS[id]?.name).filter(Boolean);
  const wirkung = ausbauWirkung(typeId, 1);
  const max = maxStufe(typeId);

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal">
      <h3>${def.name} bauen?</h3>
      <p><strong>Kosten:</strong></p>
      <div class="cingr">${renderCostDetail(def.buildCost, state)}</div>
      ${wirkung ? `<p><strong>Bringt:</strong> ${wirkung}</p>` : ''}
      ${recipeNames.length > 0 ? `<p><strong>Rezepte:</strong> ${recipeNames.join(', ')}</p>` : ''}
      ${max > 1 ? `<p class="bm-info">Es gibt jedes Gebäude nur einmal. Danach lässt es sich bis Stufe ${max} ausbauen.</p>` : ''}
      ${!unlocked
        ? `<p style="color:var(--red,#dc2626)"><strong>🔒 Gesperrt:</strong> ${hinweise.join(', ')}</p>`
        : !canAfford
          ? '<p style="color:var(--red,#dc2626)">Nicht genug Ressourcen!</p>'
          : ''
      }
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        ${canBuild
          ? '<button class="btn-confirm-buy" style="background:var(--grn,#16a34a);color:#fff;padding:8px 16px;border:none;cursor:pointer;border-radius:4px">BAUEN</button>'
          : ''
        }
        ${!unlocked
          ? '<button class="btn-zum-aufbau" style="padding:8px 16px;border:1px solid var(--gd);background:transparent;color:var(--gold);cursor:pointer;border-radius:4px">ZUM AUFBAU</button>'
          : ''
        }
        <button class="btn-close-modal" style="padding:8px 16px;border:1px solid var(--bdr,#444);background:transparent;color:var(--txt,#e0e0e0);cursor:pointer;border-radius:4px">ABBRECHEN</button>
      </div>
    </div>
  `;
  root.appendChild(ov);

  // Close handlers
  ov.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === ov || target.classList.contains('btn-close-modal')) {
      ov.remove();
    }
    if (target.classList.contains('btn-zum-aufbau')) {
      ov.remove();
      switchTab(root, 'aufbau');
    }
    if (target.classList.contains('btn-confirm-buy')) {
      ov.remove();
      executeBuy(root, typeId, state);
    }
  });
}

function executeBuy(root: HTMLElement, typeId: string, state: GameState): void {
  const def = BUILDING_DEFS[typeId];
  if (!def) return;

  // Verify resources (double-check before mutating)
  for (const [res, qty] of Object.entries(def.buildCost)) {
    if ((state.globalStock[res] ?? 0) < qty) return;
  }

  // Bauplan-Freischaltung: Bauplan muss im Lager liegen
  const bauplan = def.freischaltung?.bauplan;
  if (bauplan && (state.globalStock[bauplan] ?? 0) < 1) return;

  if (dasGebaeude(state, typeId)) return;
  if (freischaltHinweise(state, typeId).length) return;

  // Deduct resources
  for (const [res, qty] of Object.entries(def.buildCost)) {
    state.globalStock[res] = (state.globalStock[res] ?? 0) - qty;
  }
  // Bauplan wird beim Bau verbraucht
  if (bauplan) state.globalStock[bauplan] -= 1;

  // Create building instance and push to array
  const building = createBuildingInstance(typeId, 0, 0, true);
  if (def.recipes.length > 0) building.activeRecipeId = def.recipes[0];
  building.connected = true;
  state.buildings.push(building);

  // Track statistics
  state.statistics['total_buildings_built'] = (state.statistics['total_buildings_built'] ?? 0) + 1;

  // Re-render; der aktive Reiter bleibt (currentTab)
  reRenderBuildingsScreen(root, state);
}

// ── Workshop Logic ──────────────────────────────────────────────

function selectRecipe(state: GameState, b: BuildingInstance, rcpId: string): void {
  if (b.activeRecipeId === rcpId) return;
  erstatteLaufendenZyklus(state, b);
  b.activeRecipeId = rcpId;
  b.producing = false;
  b.productionTimer = 0;
  b.pendingCraft = false;
}

const BLOCKER_TEXT: Partial<Record<WarteGrund['art'], string>> = {
  'im-bau': 'Im Bau',
  unwetter: 'Pausiert durch Unwetter',
  'nicht-verbunden': 'Nicht verbunden – keine Produktion',
  'kein-arbeiter': 'Kein Arbeiter – freie Bewohner werden automatisch eingeteilt',
  'kein-wasser': 'Braucht Wasser – baue einen Brunnen',
};

/** Reason why production cannot run right now (mirrors ProductionSystem checks). */
function productionBlocker(b: BuildingInstance, def: BuildingDef, recipe: RecipeDef): string | null {
  const grund = produktionsHindernis(b, def, recipe);
  return grund ? BLOCKER_TEXT[grund.art] ?? null : null;
}

function renderWorkshopStatus(b: BuildingInstance, def: BuildingDef, recipe: RecipeDef | undefined, state: GameState): string {
  if (!recipe) return '<p class="ws-msg">Kein Rezept gewählt – wähle unten eines aus.</p>';

  const blocker = productionBlocker(b, def, recipe);
  let body = '';
  if (b.producing) {
    const pct = Math.round(cycleProgress(b, recipe) * 100);
    body = `
      <div class="ws-bar"><div class="ws-bar-fill" style="width:${pct}%"></div></div>
      <div class="ws-bar-txt">${blocker ? `Angehalten: ${blocker}` : `noch ${Math.ceil(b.productionTimer)}s`}</div>`;
  } else if (blocker) {
    body = `<p class="ws-msg ws-warn">${blocker}</p>`;
  } else {
    body = canAffordRecipe(state, b, recipe)
      ? '<p class="ws-msg">Startet beim nächsten Takt…</p>'
      : '<p class="ws-msg ws-warn">Wartet auf Zutaten</p>';
  }

  return `<div class="ws-active">► ${recipe.name}</div>${body}`;
}

function sekundenText(sek: number): string {
  const s = Math.ceil(sek);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s}s`;
}

function restzeitText(b: BuildingInstance): string {
  const liste = auftragsListe(b);
  return liste.length > 0 ? `${liste.length}/${MAX_AUFTRAEGE} · gesamt noch ${sekundenText(restzeitSekunden(b))}` : `0/${MAX_AUFTRAEGE}`;
}

/** Auftragsliste einer Werkstatt mit Aufträgen per Hand: laufender mit Balken, dann die wartenden. */
function renderAuftragsliste(b: BuildingInstance, def: BuildingDef, state: GameState): string {
  const liste = auftragsListe(b);
  const kopf = `<div class="ws-active">AUFTRÄGE <span class="ws-rest">${restzeitText(b)}</span></div>`;
  if (liste.length === 0) return `${kopf}<p class="ws-msg">Keine Aufträge. Gib unten einen Auftrag (bis ${MAX_AUFTRAEGE} nacheinander).</p>`;

  const zeilen = liste.map((id, i) => {
    const recipe = RECIPE_DEFS[id];
    if (!recipe) return '';
    const blocker = productionBlocker(b, def, recipe);
    let unten: string;
    if (b.producing && i === 0) {
      const pct = Math.round(cycleProgress(b, recipe) * 100);
      unten = `
        <div class="ws-bar"><div class="ws-bar-fill" style="width:${pct}%"></div></div>
        <div class="ws-bar-txt">${blocker ? `Angehalten: ${blocker}` : `noch ${Math.ceil(b.productionTimer)}s`}</div>`;
    } else if (i === 0) {
      const text = blocker ?? (canAffordRecipe(state, b, recipe) ? 'Startet beim nächsten Takt…' : 'Wartet auf Zutaten');
      unten = `<div class="ws-msg${blocker || text === 'Wartet auf Zutaten' ? ' ws-warn' : ''}">${text}</div>`;
    } else {
      unten = `<div class="ws-msg">wartet · ⏱ ${Math.round(zyklusSekunden(b, recipe))}s</div>`;
    }
    return `
      <div class="ws-auf${b.producing && i === 0 ? ' on' : ''}">
        <div class="ws-rcp-hd">
          <span class="cico">${itemIcon(Object.keys(recipe.outputs)[0] ?? '')}</span>
          <span class="ws-rcp-nm">${i + 1}. ${recipe.name}</span>
          <button class="ws-cancel" data-ws-cancel="${i}" title="Abbrechen${b.producing && i === 0 ? ' (Zutaten zurück)' : ''}">✕</button>
        </div>
        ${unten}
      </div>`;
  }).join('');
  return `${kopf}<div class="ws-list">${zeilen}</div>`;
}

function renderWorkshop(b: BuildingInstance, def: BuildingDef, state: GameState, highlightId: string | null, confirmSwitchId: string | null): string {
  const recipes = def.recipes.map(id => RECIPE_DEFS[id]).filter((r): r is RecipeDef => !!r);
  if (recipes.length === 0) return '';
  const active = b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  const liste = hatAuftragsliste(b);

  const rows = recipes.map(rcp => {
    if (liste) {
      const geht = kannAuftragGeben(b, rcp.id);
      return `
      <div class="ws-rcp ws-rcp-auf${rcp.id === highlightId ? ' hl' : ''}">
        <div class="ws-rcp-hd">
          <span class="cico">${itemIcon(Object.keys(rcp.outputs)[0] ?? '')}</span>
          <span class="ws-rcp-nm">${rcp.name}</span>
          <span class="ccard-time">⏱ ${Math.round(zyklusSekunden(b, rcp))}s</span>
          <button class="btn-craft ws-add" data-ws-add="${rcp.id}"${geht ? '' : ' disabled'}>+ AUFTRAG</button>
        </div>
        <div class="cingr">${renderRecipeChips(rcp, state, b)}</div>
      </div>`;
    }
    const isActive = rcp.id === b.activeRecipeId;
    const cls = ['ws-rcp', isActive ? 'on' : '', rcp.id === highlightId ? 'hl' : ''].filter(Boolean).join(' ');
    const confirm = rcp.id === confirmSwitchId
      ? '<div class="ws-msg ws-warn">Nochmal klicken: laufende Produktion abbrechen (Zutaten zurück) und wechseln.</div>'
      : '';
    return `
      <div class="${cls}" data-ws-rcp="${rcp.id}">
        <div class="ws-rcp-hd">
          <span class="cico">${itemIcon(Object.keys(rcp.outputs)[0] ?? '')}</span>
          <span class="ws-rcp-nm">${isActive ? '► ' : ''}${rcp.name}</span>
          <span class="ccard-time">⏱ ${Math.round(zyklusSekunden(b, rcp))}s</span>
        </div>
        <div class="cingr">${renderRecipeChips(rcp, state, b)}</div>
        ${confirm}
      </div>`;
  }).join('');

  return `
    <div class="ws">
      <span class="lbl">WERKSTATT</span>
      <div class="ws-status">${liste ? renderAuftragsliste(b, def, state) : renderWorkshopStatus(b, def, active, state)}</div>
      <span class="lbl">REZEPTE${liste ? ' – Zutaten werden beim Start eines Auftrags abgezogen' : ''}</span>
      <div class="ws-list">${rows}</div>
    </div>`;
}

// ── Gebäude-Fenster: Angaben, Ausbau ────────────────────────────

interface InfoZeile {
  label: string;
  wert: string;
  cls?: string;
  /** Erklärung in kleiner Schrift unter der Zeile. */
  klein?: string;
}

function prozent(wert: number): string {
  return `${Math.round(wert * 100)} %`;
}

/** Die Zeilen oben im Fenster, je nach Gebäude-Art. */
function infoZeilen(state: GameState, b: BuildingInstance, def: BuildingDef): InfoZeile[] {
  const zeilen: InfoZeile[] = [];

  if (def.workerSlots > 0) {
    const plaetze = arbeitsplaetze(b);
    const da = besetzt(b);
    zeilen.push({
      label: 'Arbeiter', wert: `${da} / ${plaetze}`, cls: da < plaetze ? 'schlecht' : 'gut',
      klein: da < plaetze ? 'Freie Bewohner werden automatisch eingeteilt.' : undefined,
    });
  }

  if (def.recipes.length > 0) {
    const status = !b.built ? '🚧 Im Bau'
      : b.eventPaused ? '⚠️ Pausiert (Unwetter)'
      : b.producing ? '✅ Produziert'
      : '⏸️ Leerlauf';
    zeilen.push({ label: 'Status', wert: status });
    return zeilen;
  }

  if (def.housing) {
    const bewohner = state.citizens.length;
    const plaetze = wohnKapazitaet(state);
    const arbeiten = state.citizens.filter(c => c.status === 'WORKER' || c.status === 'BUILDER').length;
    const frei = state.citizens.filter(c => c.status === 'IDLE').length;
    const r = economy.steuerRechnung(state);
    const zufrieden = Math.round(state.satisfaction ?? 0);
    let rechnung = `${r.bewohner} Bewohner × ${STEUER_PRO_BEWOHNER} Gold × ${prozent(r.zufriedenheit)} Zufriedenheit`;
    if (r.heldenBonus !== 1) rechnung += ` × ${r.heldenBonus.toFixed(2)} Helden-Bonus`;
    if (r.marktProzent) rechnung += ` + ${r.marktProzent} % Marktplatz`;
    if (r.bank) rechnung += ` + ${r.bank} Gold von der Bank`;
    zeilen.push({ label: 'Bewohner', wert: `${bewohner} / ${plaetze}`, cls: bewohner > plaetze ? 'schlecht' : 'gut' });
    zeilen.push({ label: 'Arbeiten · frei', wert: `${arbeiten} · ${frei}` });
    zeilen.push({ label: 'Zufriedenheit', wert: `${zufrieden} %`, cls: zufrieden >= 50 ? 'gut' : 'schlecht' });
    zeilen.push({ label: 'Brot im Lager', wert: `${Math.floor(state.globalStock.bread ?? 0)}`, cls: (state.globalStock.bread ?? 0) >= 1 ? 'gut' : 'schlecht' });
    zeilen.push({ label: 'Steuern pro Tag', wert: `${r.gesamt} Gold`, cls: 'gut', klein: rechnung });
    return zeilen;
  }

  if (def.id === 'MARKETPLACE') {
    const n = wirkungsStufe(state, def.id);
    zeilen.push({ label: 'Wirkung', wert: `+${marktBonusProzent(n)} % Steuern`, cls: n > 0 ? 'gut' : 'schlecht',
      klein: n > 0 ? undefined : 'Wirkt erst mit einem Arbeiter.' });
  } else if (def.id === 'BANK') {
    const n = wirkungsStufe(state, def.id);
    zeilen.push({ label: 'Wirkung', wert: `+${bankGoldProTag(n)} Gold / Tag`, cls: n > 0 ? 'gut' : 'schlecht',
      klein: n > 0 ? undefined : 'Wirkt erst mit einem Arbeiter.' });
  } else if (def.expeditions) {
    const slots = state.guildStats?.guildHallT2 ? 4 : def.expeditions.partySlots;
    zeilen.push({ label: 'Helden in der Gilde', wert: `${state.fighters.length}` });
    zeilen.push({ label: 'Helden je Expedition', wert: `${slots}` });
  } else if (def.radiusEffect?.type === 'water') {
    zeilen.push({ label: 'Wirkung', wert: 'Wasser für Kräutergarten und Bäckerei', cls: 'gut' });
  }
  return zeilen;
}

function renderZeilen(zeilen: InfoZeile[]): string {
  if (zeilen.length === 0) return '';
  return `<div class="bm-zeilen">${zeilen.map(z => `
    <div class="bm-zeile"><span>${z.label}</span><b class="${z.cls ?? ''}">${z.wert}</b>${z.klein ? `<small>${z.klein}</small>` : ''}</div>`).join('')}</div>`;
}

/** Wohnviertel: wächst die Stadt, und wann kommt der nächste Bewohner? */
function renderWachstum(state: GameState): string {
  const w = wachstum(state);
  const text = w.waechst ? 'Der nächste Bewohner kommt beim Tageswechsel.'
    : w.grund?.art === 'voll' ? 'Das Wohnviertel ist voll: baue es aus, damit neue Bewohner kommen.'
    : 'Neue Bewohner kommen nur mit Brot im Lager.';
  const pct = Math.round(tagFortschritt(state) * 100);
  return `
    <div class="bm-wachs ${w.waechst ? 'gut' : 'schlecht'}">
      <span>${text}</span>
      <div class="pk-bar"${w.waechst ? '' : ' hidden'}><i style="width:${pct}%"></i></div>
    </div>`;
}

/** Lagerhaus: alles, was im Lager liegt. */
function vorratChips(state: GameState): string {
  const eintraege = Object.entries(state.globalStock)
    .map(([item, qty]) => [item, Math.floor(qty ?? 0)] as const)
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => itemName(a[0]).localeCompare(itemName(b[0]), 'de'));
  if (eintraege.length === 0) return '<span class="ws-msg">Das Lager ist leer.</span>';
  return eintraege.map(([item, qty]) => `<span class="pk-chip"><b>${qty}</b> ${itemName(item)}</span>`).join('');
}

function renderVorrat(state: GameState): string {
  return `<span class="lbl">VORRAT</span><div class="pk-chips bm-vorrat">${vorratChips(state)}</div>`;
}

function renderAusbau(state: GameState, b: BuildingInstance): string {
  if (maxStufe(b.typeId) <= 1) return '';
  const info = ausbauInfo(state, b);
  if (info.naechste === null) {
    return `<div class="bm-ausbau"><span class="lbl">AUSBAU</span><p class="ws-msg">Höchste Stufe erreicht.</p></div>`;
  }
  const geht = b.built && info.bezahlbar;
  return `
    <div class="bm-ausbau">
      <span class="lbl">AUSBAU</span>
      <p class="bm-ausbau-w"><strong>Stufe ${info.naechste}:</strong> ${info.wirkung}</p>
      <div class="cingr">${renderCostDetail(info.kosten, state)}</div>
      ${info.hinweis ? `<p class="ws-msg ws-warn">🔒 ${info.hinweis}</p>` : ''}
      <button class="btn-craft btn-ausbau"${geht ? '' : ' disabled'}>⬆ AUSBAUEN AUF STUFE ${info.naechste}</button>
    </div>`;
}

/** Everything the modal body depends on, except the running bars. */
function modalSignature(b: BuildingInstance, def: BuildingDef, state: GameState): string {
  const items = new Set<string>();
  for (const id of def.recipes) {
    for (const item of Object.keys(RECIPE_DEFS[id]?.inputs ?? {})) items.add(item);
  }
  const info = ausbauInfo(state, b);
  return JSON.stringify([
    b.activeRecipeId, b.producing, b.pendingCraft, b.auftraege, b.built, b.connected, b.eventPaused,
    b.waterSupplied, besetzt(b), b.tier, info.bezahlbar, info.hinweis, info.kosten,
    [...items].map(item => stockFor(state, b, item)),
    infoZeilen(state, b, def),
    def.housing ? (wachstum(state).grund?.art ?? 'waechst') : null,
    def.id === 'WAREHOUSE' ? vorratChips(state) : null,
    engpassFuerInstanz(state, b),
  ]);
}

// ── Demolish ────────────────────────────────────────────────────

/** Startgebäude bleiben stehen (es gibt jedes Gebäude nur einmal). */
function isProtectedStartBuilding(b: BuildingInstance): boolean {
  return STARTING_BUILDING_TYPES.includes(b.typeId);
}

function executeDemolish(state: GameState, b: BuildingInstance): void {
  const def = BUILDING_DEFS[b.typeId];
  if (!def || !state.buildings.includes(b) || isProtectedStartBuilding(b)) return;

  // Die Hälfte von allem, was Bau und Ausbau gekostet haben, kommt zurück
  for (const [res, qty] of Object.entries(investiert(b.typeId, stufeVon(b)))) {
    const refund = Math.floor(qty / 2);
    if (refund > 0) state.globalStock[res] = (state.globalStock[res] ?? 0) + refund;
  }
  // Laufender Zyklus und Puffer gehen ins Lager, Arbeiter werden frei
  entferneGebaeude(state, new Set([b.id]));
}

// ── Building Detail Modal ───────────────────────────────────────

function showBuildingModal(root: HTMLElement, bInst: BuildingInstance, state: GameState, highlightRecipeId: string | null = null): void {
  const def = BUILDING_DEFS[bInst.typeId];
  if (!def) return;

  // Remove any existing modal
  const prev = root.querySelector('.ov');
  if (prev) prev.remove();

  const spriteKey = def.spriteKey ?? '';
  const isProtected = isProtectedStartBuilding(bInst);
  const hasWorkshop = def.recipes.length > 0;
  let confirmSwitchId: string | null = null;
  let confirmDemolish = false;

  const engpassZeile = (): string => {
    const eng = engpassFuerInstanz(state, bInst);
    return eng ? `<p class="ws-msg ws-warn bm-eng"><strong>Engpass:</strong> ${eng}</p>` : '';
  };

  const renderBody = (): string => `
      ${renderZeilen(infoZeilen(state, bInst, def))}
      ${def.housing ? renderWachstum(state) : ''}
      ${def.id === 'WAREHOUSE' ? renderVorrat(state) : ''}
      ${engpassZeile()}
      ${renderWorkshop(bInst, def, state, highlightRecipeId, confirmSwitchId)}
      ${renderAusbau(state, bInst)}`;

  const renderTitle = (): string => {
    const stufen = stufenText(bInst);
    return `${def.name}${stufen ? ` <span class="bm-stufe">${stufen}</span>` : ''}`;
  };

  const renderDemolishBtn = (): string => isProtected
    ? '<span class="ws-msg">Startgebäude – kann nicht abgerissen werden</span>'
    : `<button class="btn-demolish" style="background:#991b1b;color:#fff;padding:8px 16px;border:none;cursor:pointer;border-radius:4px">${confirmDemolish ? 'WIRKLICH ABREISSEN?' : '🗑 ABREISSEN'}</button>`;

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal${hasWorkshop ? ' modal-ws' : ''}">
      <div style="text-align:center;margin-bottom:8px;">
        <img src="assets/sprites/final/${spriteKey}.png" style="width:64px;height:64px;object-fit:contain;"
             onerror="this.style.display='none'">
      </div>
      <h3 class="bm-title">${renderTitle()}</h3>
      <div class="bm-body">${renderBody()}</div>
      <div class="bm-actions" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">
        <span class="bm-demolish">${renderDemolishBtn()}</span>
        <button class="btn-close-modal" style="padding:8px 16px;border:1px solid var(--bdr,#444);background:transparent;color:var(--txt,#e0e0e0);cursor:pointer;border-radius:4px">SCHLIESSEN</button>
      </div>
    </div>
  `;
  root.appendChild(ov);

  const body = ov.querySelector('.bm-body') as HTMLElement;
  const title = ov.querySelector('.bm-title') as HTMLElement;
  let lastSig = modalSignature(bInst, def, state);
  const refreshBody = () => {
    body.innerHTML = renderBody();
    title.innerHTML = renderTitle();
    lastSig = modalSignature(bInst, def, state);
  };

  if (highlightRecipeId) {
    body.querySelector('.ws-rcp.hl')?.scrollIntoView({ block: 'nearest' });
  }

  // Live progress: full refresh when state changes, otherwise only the bars
  const timer = window.setInterval(() => {
    if (!ov.isConnected || !state.buildings.includes(bInst)) {
      window.clearInterval(timer);
      return;
    }
    if (modalSignature(bInst, def, state) !== lastSig) {
      refreshBody();
      return;
    }
    const recipe = bInst.activeRecipeId ? RECIPE_DEFS[bInst.activeRecipeId] : undefined;
    const fill = body.querySelector('.ws-bar-fill') as HTMLElement | null;
    const txt = body.querySelector('.ws-bar-txt') as HTMLElement | null;
    if (recipe && bInst.producing && fill && txt) {
      fill.style.width = `${Math.round(cycleProgress(bInst, recipe) * 100)}%`;
      const blocker = productionBlocker(bInst, def, recipe);
      txt.textContent = blocker ? `Angehalten: ${blocker}` : `noch ${Math.ceil(bInst.productionTimer)}s`;
    }
    const rest = body.querySelector('.ws-rest') as HTMLElement | null;
    if (rest) rest.textContent = restzeitText(bInst);
    const wachs = body.querySelector('.bm-wachs .pk-bar > i') as HTMLElement | null;
    if (wachs) wachs.style.width = `${Math.round(tagFortschritt(state) * 100)}%`;
  }, 500);

  const close = () => {
    window.clearInterval(timer);
    ov.remove();
    // Crafting tab shows recipe/production state → refresh
    reRenderBuildingsScreen(root, state);
  };

  ov.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === ov || target.classList.contains('btn-close-modal')) {
      close();
      return;
    }

    if (target.classList.contains('btn-demolish')) {
      if (!confirmDemolish) {
        confirmDemolish = true;
        (ov.querySelector('.bm-demolish') as HTMLElement).innerHTML = renderDemolishBtn();
        return;
      }
      executeDemolish(state, bInst);
      close();
      return;
    }

    if (target.classList.contains('btn-ausbau')) {
      if (ausbauen(state, bInst)) refreshBody();
      return;
    }

    const add = target.closest('[data-ws-add]') as HTMLElement | null;
    if (add) {
      if (auftragGeben(bInst, add.dataset.wsAdd!)) refreshBody();
      return;
    }
    const cancel = target.closest('[data-ws-cancel]') as HTMLElement | null;
    if (cancel) {
      if (auftragAbbrechen(state, bInst, Number(cancel.dataset.wsCancel))) refreshBody();
      return;
    }

    const row = target.closest('[data-ws-rcp]') as HTMLElement | null;
    if (row) {
      const rcpId = row.dataset.wsRcp!;
      if (rcpId === bInst.activeRecipeId) return;
      // A running cycle is only aborted after a second click
      if (bInst.producing && confirmSwitchId !== rcpId) {
        confirmSwitchId = rcpId;
      } else {
        selectRecipe(state, bInst, rcpId);
        confirmSwitchId = null;
      }
      highlightRecipeId = null;
      refreshBody();
    }
  });
}
