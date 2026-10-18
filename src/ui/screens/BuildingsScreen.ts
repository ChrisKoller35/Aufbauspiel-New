// ─── Magic City – Gebäude-Seite ─────────────────────────────────
// Reiter «Produktion» (Produktionsketten), «Wohnen», «Crafting» und
// «Aufbau» (Freischalt-Baum). Hergestellt wird in den Gebäuden
// (ProductionSystem); diese Seite wählt Rezepte, gibt Aufträge und baut.
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
import { renderProduktionTab, aktualisiereProduktionTab, bindProduktionTab } from './ProduktionTab';
import { renderWohnenTab, wohnenSignatur, aktualisiereWohnenBalken, bindWohnenTab, WOHN_BAUPLAETZE } from './WohnenTab';
import {
  freischaltHinweise, itemName, stockFor, canAffordRecipe, cycleProgress, produktionsHindernis, WarteGrund,
} from '../../systems/GebaeudeStatus';
import { engpassFuerInstanz } from '../../systems/EngpassSystem';

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

type BuildingsTab = 'produktion' | 'wohnen' | 'crafting' | 'aufbau';

const KATEGORIE_NAME: Record<string, string> = {
  producer: 'Rohstoffe',
  refine: 'Verarbeitung',
  utility: 'Versorgung',
  storage: 'Lager',
  housing: 'Wohnen',
  hub: 'Zentrum',
  infrastructure: 'Wege',
};

function kategorieName(cat: string): string {
  return KATEGORIE_NAME[cat] ?? cat;
}

let cachedState: GameState | null = null;
let currentTab: BuildingsTab = 'produktion';
/** Laufende Aktualisierung von Produktion und Wohnen (nur eine gleichzeitig). */
let liveTimer: number | null = null;

// ── Public API ──────────────────────────────────────────────────

export function initBuildingsScreen(state: GameState): void {
  cachedState = state;
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
      <button class="${tabCls('wohnen')}" data-tab="wohnen">WOHNEN</button>
      <button class="${tabCls('crafting')}" data-tab="crafting">⚗️ CRAFTING</button>
      <button class="${tabCls('aufbau')}" data-tab="aufbau">AUFBAU</button>
    </div>

    <div class="bmain" data-panel="produktion"${panelStyle('produktion')}>
      ${renderProduktionTab(state, getBuildingImageStyle)}
    </div>

    <div class="bmain" data-panel="wohnen"${panelStyle('wohnen')}>
      ${renderWohnenTab(state, getBuildingImageStyle('HOUSE_T1'))}
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

/** Cost chips "Holz 12/20" coloured by availability (Kauf-Fenster). */
function renderCostDetail(cost: Record<string, number>, state: GameState): string {
  const entries = Object.entries(cost);
  if (entries.length === 0) return '<span class="cost-ok">Gratis</span>';
  return entries.map(([res, qty]) => {
    const have = Math.floor(state.globalStock[res] ?? 0);
    const cls = have >= qty ? 'cost-ok' : 'cost-miss';
    return `<span class="ingr ${cls}">${itemName(res)} ${have}/${qty}</span>`;
  }).join('');
}

// ── Bauplätze ───────────────────────────────────────────────────

const BUILD_SLOTS = 24;

function isHousingType(typeId: string): boolean {
  const def = BUILDING_DEFS[typeId];
  return def?.category === 'housing';
}

function hasEmptySlot(state: GameState, typeId: string): boolean {
  const housing = isHousingType(typeId);
  const maxSlots = housing ? WOHN_BAUPLAETZE : BUILD_SLOTS;
  const count = state.buildings.filter(b => b && isHousingType(b.typeId) === housing).length;
  return count < maxSlots;
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
    const owned = state.buildings.filter(b => b && b.typeId === typeId);
    const recipes = def.recipes.map(id => RECIPE_DEFS[id]).filter((r): r is RecipeDef => !!r);
    if (recipes.length === 0) continue;

    const cards = recipes.map(rcp => renderCraftCard(rcp, def, owned, state)).join('');
    const badge = owned.length > 0
      ? `<span class="craft-group-cnt">×${owned.length}${def.manualCraft ? ' · Aufträge per Hand' : ''}</span>`
      : `<span class="craft-lock">🔒 braucht ${def.name}</span>`;
    const html = `
      <div class="craft-group${owned.length > 0 ? '' : ' locked'}">
        <div class="craft-group-hd">${categoryEmoji(def.category)} ${def.name} ${badge}</div>
        <div class="craft-grid">${cards}</div>
      </div>`;
    (owned.length > 0 ? ownedGroups : lockedGroups).push(html);
  }

  const hint = ownedGroups.length === 0
    ? '<p class="craft-hint">Du besitzt noch kein Gebäude mit Rezepten. Baue eines im Reiter «Produktion».</p>'
    : '<p class="craft-hint">Hergestellt wird im Gebäude. Klick auf ein Rezept öffnet die Werkstatt.</p>';

  return `${hint}${ownedGroups.join('')}${lockedGroups.join('')}`;
}

function renderCraftCard(rcp: RecipeDef, def: BuildingDef, owned: BuildingInstance[], state: GameState): string {
  // Determine rarity from output item tags
  const outputKey = Object.keys(rcp.outputs)[0] ?? '';
  const itemDef = ITEM_DEFS[outputKey];
  const rarity = resolveRarity(itemDef);
  const ico = itemDef ? itemIcon(outputKey) : '⚗️';
  const locked = owned.length === 0;

  let status = '';
  if (locked) {
    status = `<span class="craft-lock">braucht ${def.name}</span>`;
  } else if (owned.some(b => b.activeRecipeId === rcp.id && b.producing)) {
    status = '<span class="craft-run">● läuft</span>';
  } else if (owned.some(b => b.activeRecipeId === rcp.id)) {
    status = '<span class="craft-run">► gewählt</span>';
  }

  return `
    <div class="ccard${locked ? ' locked' : ''}" data-rcp="${rcp.id}" data-btype="${def.id}">
      <div class="ccard-hd">
        <span class="cico">${ico}</span>
        <span class="cnm">${rcp.name}</span>
        <span class="crar ${rarity}">${rarity}</span>
      </div>
      <div class="cingr">${renderRecipeChips(rcp, state, null)}</div>
      <div class="ccard-ft">${status}<span class="ccard-time">⏱ ${rcp.cycleTimeSec}s</span></div>
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

/** Crafting tab click: open the workshop of an owned building and select the recipe there. */
function openRecipeInWorkshop(root: HTMLElement, typeId: string, rcpId: string, state: GameState): void {
  const owned = state.buildings.filter(b => b && b.typeId === typeId);
  if (owned.length === 0) {
    showBuyConfirmModal(root, typeId, state);
    return;
  }
  const target = owned.find(b => b.activeRecipeId === rcpId)
    ?? owned.find(b => !b.producing)
    ?? owned[0];
  // Switching is lossless while idle; a running cycle is only switched after confirmation in the modal.
  if (!target.producing) selectRecipe(state, target, rcpId);
  showBuildingModal(root, target, state, rcpId);
}

// ── Events ──────────────────────────────────────────────────────

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
}

/** Erstes Gebäude eines Typs, möglichst ein fertiges. */
function erstesGebaeude(state: GameState, typeId: string): BuildingInstance | undefined {
  const alle = state.buildings.filter(b => b && b.typeId === typeId);
  return alle.find(b => b.built) ?? alle[0];
}

function panelFor(root: HTMLElement, tab: BuildingsTab): HTMLElement | null {
  return root.querySelector(`.bmain[data-panel="${tab}"]`) as HTMLElement | null;
}

/** Balken und Zustände laufend nachführen, ohne die Seite neu zu zeichnen. */
function startLiveTimer(root: HTMLElement, state: GameState): void {
  if (liveTimer !== null) window.clearInterval(liveTimer);
  let wohnSig = wohnenSignatur(state);
  const timer = window.setInterval(() => {
    if (!root.isConnected) {
      window.clearInterval(timer);
      if (liveTimer === timer) liveTimer = null;
      return;
    }
    if (root.offsetParent === null && root.style.display === 'none') return;
    if (currentTab === 'produktion') {
      const panel = panelFor(root, 'produktion');
      if (panel) aktualisiereProduktionTab(panel, state);
    } else if (currentTab === 'wohnen') {
      const panel = panelFor(root, 'wohnen');
      if (!panel) return;
      const sig = wohnenSignatur(state);
      if (sig !== wohnSig) {
        wohnSig = sig;
        panel.innerHTML = renderWohnenTab(state, getBuildingImageStyle('HOUSE_T1'));
      } else {
        aktualisiereWohnenBalken(panel, state);
      }
    }
  }, 500);
  liveTimer = timer;
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

  // Produktion: gebaut → Werkstatt, sonst Bau-Dialog; Dungeon-Zutaten und Ziele → andere Seite
  const produktion = panelFor(root, 'produktion');
  if (produktion) {
    bindProduktionTab(produktion, state, {
      oeffneGebaeude: typeId => {
        const b = erstesGebaeude(state, typeId);
        if (b) showBuildingModal(root, b, state);
      },
      kaufen: typeId => showBuyConfirmModal(root, typeId, state),
      wechseln: screen => navigateTo(screen),
    });
  }

  // Wohnen: Haus → Fenster des Hauses, Bauplatz → Bau-Dialog
  const wohnen = panelFor(root, 'wohnen');
  if (wohnen) {
    bindWohnenTab(wohnen, {
      oeffneHaus: id => {
        const b = state.buildings.find(x => x && x.id === id);
        if (b) showBuildingModal(root, b, state);
      },
      kaufen: typeId => showBuyConfirmModal(root, typeId, state),
    });
  }

  // Aufbau-Reiter: Karte anklicken → Kauf-Dialog
  bindAufbauTab(root, typeId => showBuyConfirmModal(root, typeId, state));

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
}

// ── Buy Confirm Modal ───────────────────────────────────────────

function showBuyConfirmModal(root: HTMLElement, typeId: string, state: GameState): void {
  const def = BUILDING_DEFS[typeId];
  if (!def) return;

  // Remove any existing modal
  const prev = root.querySelector('.ov');
  if (prev) prev.remove();

  const canAfford = Object.entries(def.buildCost).every(
    ([res, qty]) => (state.globalStock[res] ?? 0) >= qty
  );

  const hasFreeSlot = hasEmptySlot(state, typeId);
  const hinweise = freischaltHinweise(state, typeId);
  const unlocked = hinweise.length === 0;
  const canBuild = unlocked && canAfford && hasFreeSlot;
  const anzahl = state.buildings.filter(b => b && b.typeId === typeId).length;

  const recipeNames = def.recipes.map(id => RECIPE_DEFS[id]?.name).filter(Boolean);

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal">
      <h3>${def.name} bauen?</h3>
      ${anzahl > 0 ? `<p>Du hast schon ${anzahl}. Ein weiteres arbeitet zusätzlich.</p>` : ''}
      <p><strong>Kosten:</strong></p>
      <div class="cingr">${renderCostDetail(def.buildCost, state)}</div>
      <p><strong>Kategorie:</strong> ${kategorieName(def.category)}</p>
      ${recipeNames.length > 0 ? `<p><strong>Rezepte:</strong> ${recipeNames.join(', ')}</p>` : ''}
      ${!unlocked
        ? `<p style="color:var(--red,#dc2626)"><strong>🔒 Gesperrt:</strong> ${hinweise.join(', ')}</p>`
        : !hasFreeSlot
        ? '<p style="color:var(--red,#dc2626)"><strong>Kein freier Bauplatz!</strong></p>'
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

  if (!hasEmptySlot(state, typeId)) return;
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

/** Give back the inputs of a running cycle (they are deducted when the cycle starts). */
function refundRunningCycle(state: GameState, b: BuildingInstance): void {
  const recipe = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  if (!recipe) return;
  for (const [item, qty] of Object.entries(recipe.inputs)) {
    if (b.connected) state.globalStock[item] = (state.globalStock[item] ?? 0) + qty;
    else b.localInputBuffer[item] = (b.localInputBuffer[item] ?? 0) + qty;
  }
}

function selectRecipe(state: GameState, b: BuildingInstance, rcpId: string): void {
  if (b.activeRecipeId === rcpId) return;
  refundRunningCycle(state, b);
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
  } else if (def.manualCraft) {
    const canCraft = canAffordRecipe(state, b, recipe);
    body = b.pendingCraft
      ? '<p class="ws-msg">Auftrag erteilt – startet beim nächsten Takt…</p>'
      : `<button class="btn-craft ws-craft"${canCraft ? '' : ' disabled'}>${canCraft ? '⚒ HERSTELLEN' : '⚒ Zu wenig Materialien'}</button>`;
  } else {
    body = canAffordRecipe(state, b, recipe)
      ? '<p class="ws-msg">Startet beim nächsten Takt…</p>'
      : '<p class="ws-msg ws-warn">Wartet auf Zutaten</p>';
  }

  return `<div class="ws-active">► ${recipe.name}</div>${body}`;
}

function renderWorkshop(b: BuildingInstance, def: BuildingDef, state: GameState, highlightId: string | null, confirmSwitchId: string | null): string {
  const recipes = def.recipes.map(id => RECIPE_DEFS[id]).filter((r): r is RecipeDef => !!r);
  if (recipes.length === 0) return '';
  const active = b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;

  const rows = recipes.map(rcp => {
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
          <span class="ccard-time">⏱ ${Math.round(rcp.cycleTimeSec * b.synergySpeedMult)}s</span>
        </div>
        <div class="cingr">${renderRecipeChips(rcp, state, b)}</div>
        ${confirm}
      </div>`;
  }).join('');

  return `
    <div class="ws">
      <span class="lbl">WERKSTATT</span>
      <div class="ws-status">${renderWorkshopStatus(b, def, active, state)}</div>
      <span class="lbl">REZEPTE${def.manualCraft ? ' – jeder Auftrag per Hand' : ''}</span>
      <div class="ws-list">${rows}</div>
    </div>`;
}

/** Everything the modal body depends on, except the running timer. */
function workshopSignature(b: BuildingInstance, def: BuildingDef, state: GameState): string {
  const items = new Set<string>();
  for (const id of def.recipes) {
    for (const item of Object.keys(RECIPE_DEFS[id]?.inputs ?? {})) items.add(item);
  }
  return JSON.stringify([
    b.activeRecipeId, b.producing, b.pendingCraft, b.built, b.connected, b.eventPaused,
    b.waterSupplied, b.assignedWorkerIds.length, b.tier,
    [...items].map(item => stockFor(state, b, item)),
  ]);
}

// ── Demolish ────────────────────────────────────────────────────

/** The last building of each starting type is protected. */
function isProtectedStartBuilding(state: GameState, b: BuildingInstance): boolean {
  if (!STARTING_BUILDING_TYPES.includes(b.typeId)) return false;
  return state.buildings.filter(x => x && x.typeId === b.typeId).length <= 1;
}

function executeDemolish(state: GameState, b: BuildingInstance): void {
  const def = BUILDING_DEFS[b.typeId];
  const idx = state.buildings.indexOf(b);
  if (!def || idx < 0 || isProtectedStartBuilding(state, b)) return;

  // Refund 50% of build cost
  for (const [res, qty] of Object.entries(def.buildCost)) {
    const refund = Math.floor(qty / 2);
    if (refund > 0) state.globalStock[res] = (state.globalStock[res] ?? 0) + refund;
  }

  // Running cycle inputs and buffered goods go back to the warehouse
  refundRunningCycle(state, b);
  for (const buffer of [b.localInputBuffer, b.localOutputBuffer]) {
    for (const [item, qty] of Object.entries(buffer)) {
      if (qty > 0) state.globalStock[item] = (state.globalStock[item] ?? 0) + qty;
    }
  }

  // Free assigned workers/builders
  for (const citizen of state.citizens) {
    const assignedHere = citizen.assignedBuildingId === b.id || b.assignedWorkerIds.includes(citizen.id);
    if (assignedHere && (citizen.status === 'WORKER' || citizen.status === 'BUILDER')) {
      citizen.status = 'IDLE';
      citizen.assignedBuildingId = null;
    }
  }

  state.buildings.splice(idx, 1);
}

// ── Building Detail Modal ───────────────────────────────────────

function showBuildingModal(root: HTMLElement, bInst: BuildingInstance, state: GameState, highlightRecipeId: string | null = null): void {
  const def = BUILDING_DEFS[bInst.typeId];
  if (!def) return;

  // Remove any existing modal
  const prev = root.querySelector('.ov');
  if (prev) prev.remove();

  const spriteKey = def.spriteKey ?? '';
  const isProtected = isProtectedStartBuilding(state, bInst);
  const hasWorkshop = def.recipes.length > 0;
  let confirmSwitchId: string | null = null;
  let confirmDemolish = false;

  // Weitere Gebäude desselben Typs: «1 von 3 ›» blättert weiter
  const gleiche = state.buildings.filter(b => b && b.typeId === bInst.typeId);
  const nr = gleiche.indexOf(bInst);
  const naechstes = gleiche.length > 1 ? gleiche[(nr + 1) % gleiche.length] : null;

  const engpassZeile = (): string => {
    const eng = engpassFuerInstanz(state, bInst);
    return eng ? `<p class="ws-msg ws-warn bm-eng"><strong>Engpass:</strong> ${eng}</p>` : '';
  };

  const renderBody = (): string => {
    const status = !bInst.built ? '🚧 Im Bau'
      : bInst.eventPaused ? '⚠️ Pausiert (Event)'
      : bInst.producing ? '✅ Produziert'
      : '⏸️ Leerlauf';
    return `
      <p><strong>Stufe:</strong> ${bInst.tier}</p>
      <p><strong>Arbeiter:</strong> ${bInst.assignedWorkerIds.length} / ${def.workerSlots}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Verbunden:</strong> ${bInst.connected ? 'Ja' : 'Nein'}</p>
      <p><strong>Kategorie:</strong> ${kategorieName(def.category)}</p>
      ${engpassZeile()}
      ${renderWorkshop(bInst, def, state, highlightRecipeId, confirmSwitchId)}`;
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
      <h3>${def.name}${naechstes ? ` <button class="bm-next" title="Nächstes ${def.name}">${nr + 1} von ${gleiche.length} ›</button>` : ''}</h3>
      <div class="bm-body">${renderBody()}</div>
      <div class="bm-actions" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">
        <span class="bm-demolish">${renderDemolishBtn()}</span>
        <button class="btn-close-modal" style="padding:8px 16px;border:1px solid var(--bdr,#444);background:transparent;color:var(--txt,#e0e0e0);cursor:pointer;border-radius:4px">SCHLIESSEN</button>
      </div>
    </div>
  `;
  root.appendChild(ov);

  const body = ov.querySelector('.bm-body') as HTMLElement;
  let lastSig = workshopSignature(bInst, def, state);
  const refreshBody = () => {
    body.innerHTML = renderBody();
    lastSig = workshopSignature(bInst, def, state);
  };

  if (highlightRecipeId) {
    body.querySelector('.ws-rcp.hl')?.scrollIntoView({ block: 'nearest' });
  }

  // Live progress: full refresh when state changes, otherwise only the bar
  const timer = window.setInterval(() => {
    if (!ov.isConnected || !state.buildings.includes(bInst)) {
      window.clearInterval(timer);
      return;
    }
    if (workshopSignature(bInst, def, state) !== lastSig) {
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

    if (target.classList.contains('bm-next') && naechstes) {
      window.clearInterval(timer);
      ov.remove();
      showBuildingModal(root, naechstes, state);
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

    if (target.classList.contains('ws-craft')) {
      const recipe = bInst.activeRecipeId ? RECIPE_DEFS[bInst.activeRecipeId] : undefined;
      if (recipe && def.manualCraft && !bInst.producing && canAffordRecipe(state, bInst, recipe)) {
        bInst.pendingCraft = true;
        refreshBody();
      }
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
