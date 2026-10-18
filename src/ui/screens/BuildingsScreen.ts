// ─── Magic City – Buildings & Crafting Screen ──────────────────
// Stadtplan grid + Crafting recipes in a two-tab layout.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BUILD_MENU_ORDER, getFreischaltHinweise } from '../../data/buildings';
import { RECIPE_DEFS } from '../../data/recipes';
import { ITEM_DEFS } from '../../data/items';
import { GameState } from '../../models/GameState';
import { createBuildingInstance } from '../../models/Building';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';
import { renderAufbauTab, bindAufbauTab, getBuiltTypeIds, getGildenrang } from './AufbauTab';

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

let cachedState: GameState | null = null;

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
  return `
    ${renderHeader(state, 'main', 'GEB\u00c4UDE & CRAFTING')}

    <div class="btabs">
      <button class="btab active" data-tab="stadtplan">STADTPLAN</button>
      <button class="btab" data-tab="crafting">\u2697\uFE0F CRAFTING</button>
      <button class="btab" data-tab="aufbau">AUFBAU</button>
    </div>

    <div class="bmain" data-panel="stadtplan">
      ${renderStadtplan(state)}
    </div>

    <div class="bmain" data-panel="aufbau" style="display:none">
      ${renderAufbauTab(state, getBuildingImageStyle)}
    </div>

    <div class="bmain" data-panel="crafting" style="display:none">
      ${renderCrafting(state)}
    </div>
  `;
}

// ── Stadtplan Tab ───────────────────────────────────────────────

// Zone layout constants
const BUILD_COLS = 6;
const HOUSE_COLS = 3;
const GRID_ROWS = 4;
const BUILD_SLOTS = BUILD_COLS * GRID_ROWS;  // 24
const HOUSE_SLOTS = HOUSE_COLS * GRID_ROWS;  // 12

function isHousingType(typeId: string): boolean {
  const def = BUILDING_DEFS[typeId];
  return def?.category === 'housing';
}

/** Get buildings filtered by zone, preserving order. */
function getBuildingsForZone(state: GameState, housing: boolean): (import('../../models/Building').BuildingInstance)[] {
  return state.buildings.filter(b => b && isHousingType(b.typeId) === housing);
}

function renderZoneCells(buildings: (import('../../models/Building').BuildingInstance)[], maxSlots: number): string {
  let html = '';
  for (let i = 0; i < maxSlots; i++) {
    const bInst = buildings[i] ?? null;
    if (bInst) {
      const def = BUILDING_DEFS[bInst.typeId];
      const name = def ? def.name : bInst.typeId;
      const bgStyle = getBuildingImageStyle(bInst.typeId);
      html += `
        <div class="bcell occ" data-bid="${bInst.id}" style="${bgStyle}">
          <span class="bcell-nm bcell-overlay">${name}</span>
        </div>`;
    } else {
      html += `
        <div class="bcell emp">\uFF0B</div>`;
    }
  }
  return html;
}

function renderStadtplan(state: GameState): string {
  const buildBuildings = getBuildingsForZone(state, false);
  const houseBuildings = getBuildingsForZone(state, true);

  const buildCells = renderZoneCells(buildBuildings, BUILD_SLOTS);
  const houseCells = renderZoneCells(houseBuildings, HOUSE_SLOTS);

  // Shop bar – available buildings to buy (with sprites); locked ones greyed out
  const built = getBuiltTypeIds(state);
  const rang = getGildenrang(state);
  const shopHTML = BUILD_MENU_ORDER.map(id => {
    const def = BUILDING_DEFS[id];
    if (!def) return '';
    const goldCost = def.buildCost['gold'] ?? 0;
    const woodCost = def.buildCost['wood'] ?? 0;
    const stoneCost = def.buildCost['stone'] ?? 0;
    const costParts: string[] = [];
    if (goldCost) costParts.push(`\uD83D\uDCB0${goldCost}`);
    if (woodCost) costParts.push(`\uD83E\uDEB5${woodCost}`);
    if (stoneCost) costParts.push(`\uD83E\uDEA8${stoneCost}`);
    const costStr = costParts.length ? costParts.join(' ') : 'Gratis';
    const bgStyle = getBuildingImageStyle(def.id);
    const hinweise = getFreischaltHinweise(def.id, built, rang);
    if (hinweise.length) {
      return `
      <div class="bitem locked" data-btype="${def.id}" style="${bgStyle}" title="${hinweise.join(', ')}">
        <span class="bitem-lock">🔒</span>
        <span class="bitem-nm">${def.name}</span>
        <span class="bitem-cost bitem-hint">${hinweise.join('<br>')}</span>
      </div>`;
    }
    return `
      <div class="bitem" data-btype="${def.id}" style="${bgStyle}">
        <span class="bitem-nm">${def.name}</span>
        <span class="bitem-cost">${costStr}</span>
      </div>`;
  }).join('');

  return `
    <div class="bgrid-area">
      <div class="bgrid-zones">
        <div class="bgrid-zone zone-build">
          <div class="zone-label">GEB\u00c4UDE</div>
          <div class="bgrid build-grid">${buildCells}</div>
        </div>
        <div class="bgrid-sep"></div>
        <div class="bgrid-zone zone-house">
          <div class="zone-label">WOHNH\u00c4USER</div>
          <div class="bgrid house-grid">${houseCells}</div>
        </div>
      </div>
    </div>
    <div class="bshop">
      <div class="bshop-row">${shopHTML}</div>
    </div>
  `;
}

function categoryEmoji(cat: string): string {
  switch (cat) {
    case 'producer': return '\uD83C\uDF3E';
    case 'refine': return '\u2699\uFE0F';
    case 'utility': return '\uD83D\uDEE0\uFE0F';
    case 'storage': return '\uD83D\uDCE6';
    case 'housing': return '\uD83C\uDFE0';
    case 'hub': return '\uD83C\uDFF0';
    case 'infrastructure': return '\uD83D\uDEE3\uFE0F';
    default: return '\uD83C\uDFD7\uFE0F';
  }
}

// ── Crafting Tab ────────────────────────────────────────────────

function renderCrafting(state: GameState): string {
  const cards = Object.values(RECIPE_DEFS).map(rcp => {
    // Determine rarity from output item tags
    const outputKey = Object.keys(rcp.outputs)[0] ?? '';
    const itemDef = ITEM_DEFS[outputKey];
    const rarity = resolveRarity(itemDef);

    // Ingredients chips — show current stock / required
    const ingrHTML = Object.entries(rcp.inputs).map(([key, qty]) => {
      const iDef = ITEM_DEFS[key];
      const iName = iDef ? iDef.name : key;
      const have = state.globalStock[key] ?? 0;
      const color = have >= qty ? 'var(--grn, #16a34a)' : 'var(--red, #dc2626)';
      return `<span class="ingr" style="color:${color}">${iName} ${have}/${qty}</span>`;
    }).join('');
    const noIngr = Object.keys(rcp.inputs).length === 0;

    // Icon from output item
    const ico = itemDef ? itemIcon(outputKey) : '\u2697\uFE0F';

    return `
      <div class="ccard" data-rcp="${rcp.id}">
        <div class="ccard-hd">
          <span class="cico">${ico}</span>
          <span class="cnm">${rcp.name}</span>
          <span class="crar ${rarity}">${rarity}</span>
        </div>
        <div class="cingr">
          ${noIngr ? '<span class="ingr">Keine Zutaten</span>' : ingrHTML}
        </div>
        <button class="btn-craft">HERSTELLEN</button>
      </div>`;
  }).join('');

  return `<div class="craft-grid">${cards}</div>`;
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
    grain: '\uD83C\uDF3E', wood: '\uD83E\uDEB5', stone: '\uD83E\uDEA8',
    bread: '\uD83C\uDF5E', flour: '\uD83E\uDED3', herb_green: '\uD83C\uDF3F',
    healing_potion: '\u2697\uFE0F', iron_scrap: '\u2699\uFE0F',
    iron_sword: '\u2694\uFE0F', iron_shield: '\uD83D\uDEE1\uFE0F',
    leather_armor: '\uD83E\uDDE5', crystal_shard: '\uD83D\uDC8E',
    power_bread: '\uD83C\uDF5E', steel_sword: '\u2694\uFE0F',
    longbow: '\uD83C\uDFF9', crystal_staff: '\uD83E\uDE84',
    steel_armor: '\uD83D\uDEE1\uFE0F',
  };
  return map[key] ?? '\uD83D\uDCE6';
}

// ── Events ──────────────────────────────────────────────────────

function bindEvents(root: HTMLElement, state: GameState): void {
  // Tab switching
  const tabs = root.querySelectorAll('.btab');
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', () => {
      const tabId = (tabs[i] as HTMLElement).dataset.tab!;
      // Toggle active tab
      for (let j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
      tabs[i].classList.add('active');
      // Toggle panels
      const panels = root.querySelectorAll('.bmain');
      for (let p = 0; p < panels.length; p++) {
        const panel = panels[p] as HTMLElement;
        panel.style.display = panel.dataset.panel === tabId ? '' : 'none';
      }
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

  // Empty cell click → scroll to shop
  const empCells = root.querySelectorAll('.bcell.emp');
  for (let i = 0; i < empCells.length; i++) {
    empCells[i].addEventListener('click', () => {
      const shop = root.querySelector('.bshop');
      if (shop) shop.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Occupied cell click → building detail modal
  const occCells = root.querySelectorAll('.bcell.occ');
  for (let i = 0; i < occCells.length; i++) {
    occCells[i].addEventListener('click', () => {
      const bid = parseInt((occCells[i] as HTMLElement).dataset.bid ?? '0', 10);
      const bInst = state.buildings.find(b => b && b.id === bid);
      if (bInst) showBuildingModal(root, bInst, state);
    });
  }

  // Shop item click → buy building confirm modal
  const shopItems = root.querySelectorAll('.bitem');
  for (let i = 0; i < shopItems.length; i++) {
    shopItems[i].addEventListener('click', () => {
      const typeId = (shopItems[i] as HTMLElement).dataset.btype;
      if (typeId) showBuyConfirmModal(root, typeId, state);
    });
  }

  // Aufbau-Reiter: Karte anklicken → Kauf-Dialog
  bindAufbauTab(root, typeId => showBuyConfirmModal(root, typeId, state));

  // Craft buttons
  const craftBtns = root.querySelectorAll('.btn-craft');
  for (let i = 0; i < craftBtns.length; i++) {
    craftBtns[i].addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest('.ccard') as HTMLElement;
      if (!card) return;
      const rcpId = card.dataset.rcp;
      if (rcpId) handleCraft(root, rcpId, state);
    });
  }
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
  const hinweise = getFreischaltHinweise(typeId, getBuiltTypeIds(state), getGildenrang(state));
  const unlocked = hinweise.length === 0;

  // Build cost display with current/required amounts
  const costHtml = Object.keys(def.buildCost).length === 0
    ? '<span style="color:var(--grn,#16a34a)">Gratis</span>'
    : Object.entries(def.buildCost).map(([res, qty]) => {
        const have = state.globalStock[res] ?? 0;
        const color = have >= qty ? 'var(--grn,#16a34a)' : 'var(--red,#dc2626)';
        return `<span style="color:${color}">${res}: ${have}/${qty}</span>`;
      }).join(' &middot; ');

  const canBuild = unlocked && canAfford && hasFreeSlot;

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal">
      <h3>${def.name} bauen?</h3>
      <p><strong>Kosten:</strong> ${costHtml}</p>
      <p><strong>Kategorie:</strong> ${def.category}</p>
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

  if (!hasEmptySlot(state, typeId)) return;
  if (getFreischaltHinweise(typeId, getBuiltTypeIds(state), getGildenrang(state)).length) return;

  // Deduct resources
  for (const [res, qty] of Object.entries(def.buildCost)) {
    state.globalStock[res] = (state.globalStock[res] ?? 0) - qty;
  }

  // Create building instance and push to array
  const building = createBuildingInstance(typeId, 0, 0, true);
  if (def.recipes.length > 0) building.activeRecipeId = def.recipes[0];
  building.connected = true;
  state.buildings.push(building);

  // Track statistics
  state.statistics['total_buildings_built'] = (state.statistics['total_buildings_built'] ?? 0) + 1;

  // Re-render, stay on the tab the purchase came from (e.g. «Aufbau»)
  const activeTab = (root.querySelector('.btab.active') as HTMLElement | null)?.dataset.tab;
  reRenderBuildingsScreen(root, state);
  if (activeTab && activeTab !== 'stadtplan') {
    (root.querySelector(`.btab[data-tab="${activeTab}"]`) as HTMLElement | null)?.click();
  }
}

function hasEmptySlot(state: GameState, typeId: string): boolean {
  const housing = isHousingType(typeId);
  const maxSlots = housing ? HOUSE_SLOTS : BUILD_SLOTS;
  const count = state.buildings.filter(b => b && isHousingType(b.typeId) === housing).length;
  return count < maxSlots;
}

// ── Crafting Logic ──────────────────────────────────────────────

function handleCraft(root: HTMLElement, rcpId: string, state: GameState): void {
  const recipe = RECIPE_DEFS[rcpId];
  if (!recipe) return;

  const card = root.querySelector(`.ccard[data-rcp="${rcpId}"]`);
  const btn = card?.querySelector('.btn-craft') as HTMLElement | null;

  // Check inputs
  for (const [itemId, qty] of Object.entries(recipe.inputs)) {
    if ((state.globalStock[itemId] ?? 0) < qty) {
      // Not enough resources — show error on button
      if (btn) {
        const originalText = btn.textContent ?? 'HERSTELLEN';
        const originalBg = btn.style.background;
        btn.textContent = 'Nicht genug!';
        btn.style.background = '#991b1b';
        btn.setAttribute('disabled', 'true');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = originalBg;
          btn.removeAttribute('disabled');
        }, 1500);
      }
      return;
    }
  }

  // Deduct inputs
  for (const [itemId, qty] of Object.entries(recipe.inputs)) {
    state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) - qty;
  }

  // Add outputs
  for (const [itemId, qty] of Object.entries(recipe.outputs)) {
    state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + qty;
  }

  // Show success feedback, then re-render to update stock counts
  if (btn) {
    btn.textContent = '\u2713 Hergestellt!';
    btn.style.background = '#166534';
    btn.setAttribute('disabled', 'true');
    setTimeout(() => {
      reRenderBuildingsScreen(root, state);
      // Restore crafting tab visibility
      const panels = root.querySelectorAll('.bmain');
      const tabs = root.querySelectorAll('.btab');
      for (let p = 0; p < panels.length; p++) {
        const panel = panels[p] as HTMLElement;
        panel.style.display = panel.dataset.panel === 'crafting' ? '' : 'none';
      }
      for (let t = 0; t < tabs.length; t++) {
        const tab = tabs[t] as HTMLElement;
        if (tab.dataset.tab === 'crafting') tab.classList.add('active');
        else tab.classList.remove('active');
      }
    }, 800);
  }
}

// ── Building Detail Modal ───────────────────────────────────────

function showBuildingModal(root: HTMLElement, bInst: { typeId: string; tier: number; built: boolean; assignedWorkerIds: number[]; producing: boolean; connected: boolean; eventPaused: boolean }, state: GameState): void {
  const def = BUILDING_DEFS[bInst.typeId];
  if (!def) return;

  // Remove any existing modal
  const prev = root.querySelector('.ov');
  if (prev) prev.remove();

  // Find building index in state.buildings
  const bIdx = state.buildings.findIndex(b => b === bInst);

  const status = !bInst.built ? '\uD83D\uDEA7 Im Bau'
    : bInst.eventPaused ? '\u26A0\uFE0F Pausiert (Event)'
    : bInst.producing ? '\u2705 Produziert'
    : '\u23F8\uFE0F Leerlauf';

  const spriteKey = def.spriteKey ?? '';

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal">
      <div style="text-align:center;margin-bottom:8px;">
        <img src="assets/sprites/final/${spriteKey}.png" style="width:64px;height:64px;object-fit:contain;"
             onerror="this.style.display='none'">
      </div>
      <h3>${def.name}</h3>
      <p><strong>Stufe:</strong> ${bInst.tier}</p>
      <p><strong>Arbeiter:</strong> ${bInst.assignedWorkerIds.length} / ${def.workerSlots}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Verbunden:</strong> ${bInst.connected ? 'Ja' : 'Nein'}</p>
      <p><strong>Kategorie:</strong> ${def.category}</p>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        ${bIdx >= 0 ? '<button class="btn-demolish" style="background:#991b1b;color:#fff;padding:8px 16px;border:none;cursor:pointer;border-radius:4px">\uD83D\uDDD1 ABREISSEN</button>' : ''}
        <button class="btn-close-modal" style="padding:8px 16px;border:1px solid var(--bdr,#444);background:transparent;color:var(--txt,#e0e0e0);cursor:pointer;border-radius:4px">SCHLIESSEN</button>
      </div>
    </div>
  `;
  root.appendChild(ov);

  // Close on overlay click or button
  ov.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === ov || target.classList.contains('btn-close-modal')) {
      ov.remove();
    }
    if (target.classList.contains('btn-demolish') && bIdx >= 0) {
      // Refund 50% of build cost
      for (const [res, qty] of Object.entries(def.buildCost)) {
        const refund = Math.floor(qty / 2);
        if (refund > 0) {
          state.globalStock[res] = (state.globalStock[res] ?? 0) + refund;
        }
      }
      // Remove building from array
      state.buildings.splice(bIdx, 1);
      ov.remove();
      reRenderBuildingsScreen(root, state);
    }
  });
}
