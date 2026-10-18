// ─── Magic City – Expeditions Screen ────────────────────────────
// Two-part screen: expedition list + team selection.
// ────────────────────────────────────────────────────────────────

import { navigateTo } from '../ScreenRouter';
import { GameState } from '../../models/GameState';
import { GuildFighter } from '../../models/GuildRoster';
import { ROUTE_DEFS, RouteDef, ROUTE_IMAGE_MAP } from '../../data/routes';
import { ITEM_DEFS, PROVISION_ITEMS } from '../../data/items';
import { CLASS_DEFS, HERO_IMAGE_MAP } from '../../data/classes';
import { renderHeader } from './HeaderRenderer';
import { BuildingUpgradeSystem } from '../../systems/BuildingUpgradeSystem';

const buildingUpgradeSystem = new BuildingUpgradeSystem();

// ── Module state ──

let gameState: GameState;
let selectedRouteId: string | null = null;
let selectedHeroes: GuildFighter[] = [];
let provisions: Record<string, number> = {};

// ── Helpers ──



function getRouteImageStyle(routeId: string): string {
  const img = ROUTE_IMAGE_MAP[routeId];
  return img ? `background-image:url('assets/tiles/${img}.png')` : '';
}

function getBiomeTag(route: RouteDef): { label: string; cls: string } {
  const id = route.id;
  if (route.isUnderwater) return { label: 'Unterwasser', cls: 'tag-unterwasser' };
  if (route.isSiegeRoute) return { label: 'Belagerung', cls: 'tag-belagerung' };
  if (id.includes('volcano') || id.includes('obsidian') || id.includes('ash') || id.includes('magma')) return { label: 'Vulkan', cls: 'tag-vulkan' };
  if (id.includes('ruins') || id.includes('shadow')) return { label: 'Ruinen', cls: 'tag-ruinen' };
  if (id.includes('swamp')) return { label: 'Sumpf', cls: 'tag-sumpf' };
  if (id.includes('frozen')) return { label: 'Frost', cls: 'tag-frost' };
  if (id.includes('cave') || id.includes('crystal') || id.includes('spider')) return { label: 'Höhle', cls: 'tag-hoehle' };
  return { label: 'Wald', cls: 'tag-wald' };
}

function difficultyStars(tier: number): string {
  const max = 5;
  const filled = Math.min(tier, max);
  return '★'.repeat(filled) + '☆'.repeat(max - filled);
}

function routeDescription(route: RouteDef): string {
  const parts: string[] = [];
  parts.push(`${route.rooms} Räume`);
  if (route.bossId) parts.push('Boss');
  if (route.isSiegeRoute) parts.push('Belagerung');
  if (route.isUnderwater) parts.push('Unterwasser');
  return parts.join(' · ');
}

function routeRewards(route: RouteDef): string {
  const rewards: string[] = ['Gold', 'XP'];
  if (route.bossId) rewards.push('Boss-Loot');
  if (route.encounters.some(e => e.findItems && e.findItems.length > 0)) rewards.push('Items');
  return rewards.join(', ');
}

// ── Public API ──

export function initExpeditionsScreen(state: GameState): void {
  gameState = state;
  selectedRouteId = null;
  selectedHeroes = [];
  provisions = {};
}

/** Set route from external source (e.g. Dungeon Map) and refresh team screen. */
export function setSelectedRoute(routeId: string): void {
  selectedRouteId = routeId;
  selectedHeroes = [];
  provisions = {};
  PROVISION_ITEMS.forEach(id => { provisions[id] = 0; });
  refreshTeamScreen();
}

export function renderExpeditionsScreen(container: HTMLElement): void {
  // Screen 1: Expedition list
  renderExpeditionList(container);
  // Screen 2: Team selection
  renderTeamScreen(container);
}

// ── Screen 1: Expedition List ──

function renderExpeditionList(container: HTMLElement): void {
  const el = document.createElement('div');
  el.id = 's-expeditions';
  el.className = 'screen';

  const routes = Object.values(ROUTE_DEFS);
  const cards = routes.map(route => {
    const biome = getBiomeTag(route);
    return `
      <div class="exp-card" data-route="${route.id}" style="${getRouteImageStyle(route.id)}">
        <div class="exp-card-info">
          <span class="exp-tag ${biome.cls}">${biome.label}</span>
          <span class="exp-name">${route.name}</span>
          <span class="exp-star">${difficultyStars(route.tier)}</span>
          <span class="exp-blurb">${routeDescription(route)}</span>
          <span class="exp-rew">Belohnung: ${routeRewards(route)}</span>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    ${renderHeader(gameState, 'main', 'ROUTENÜBERSICHT')}
    <div style="display:flex;gap:8px;padding:0 16px;flex-wrap:wrap">
      <button class="btn-dungeon-map" data-nav="dungeon">\uD83D\uDDFA\uFE0F Dungeonkarte</button>
      <button class="btn-dungeon-map" data-nav="bestiarium">\uD83D\uDCD6 Monsterbuch</button>
    </div>
    <div class="content"><div class="exp-grid">${cards}</div></div>
  `;

  // Click handler: card → team screen
  el.addEventListener('click', (e: MouseEvent) => {
    const back = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
    if (back) {
      navigateTo(back.dataset.nav as any);
      return;
    }
    const card = (e.target as HTMLElement).closest<HTMLElement>('.exp-card');
    if (card && card.dataset.route) {
      selectedRouteId = card.dataset.route;
      selectedHeroes = [];
      provisions = {};
      PROVISION_ITEMS.forEach(id => { provisions[id] = 0; });
      refreshTeamScreen();
      navigateTo('team');
    }
  });

  container.appendChild(el);
}

// ── Screen 2: Team Selection ──

function renderTeamScreen(container: HTMLElement): void {
  const el = document.createElement('div');
  el.id = 's-team';
  el.className = 'screen';

  el.innerHTML = buildTeamHTML();
  bindTeamEvents(el);  // bind ONCE — listener stays through innerHTML rebuilds
  container.appendChild(el);
}

function refreshTeamScreen(): void {
  const el = document.getElementById('s-team');
  if (!el) return;
  el.innerHTML = buildTeamHTML();
  // Do NOT re-bind events — the delegated listener on el persists across innerHTML rebuilds
}

function buildTeamHTML(): string {
  const route = selectedRouteId ? ROUTE_DEFS[selectedRouteId] : null;
  const routeName = route ? route.name : 'Expedition';
  const recLevel = route ? route.recommendedLevel : '';

  // Slots (2x2 grid, 3 slots / 4 with Guild Hall T2) — styled like hero cards
  const maxSlots = buildingUpgradeSystem.getPartySlots(gameState);
  let slotsHTML = '';
  for (let i = 0; i < maxSlots; i++) {
    const hero = selectedHeroes[i];
    if (hero) {
      const cls = CLASS_DEFS[hero.classId];
      const clsName = cls ? cls.name : hero.classId;
      const heroImg = HERO_IMAGE_MAP[hero.classId];
      const bgStyle = heroImg ? `background-image:url('assets/heroes/${heroImg}.png')` : '';
      const spriteKey = cls ? cls.spriteKey : 'HERO_GUARDIAN';
      slotsHTML += `
        <div class="exp-slot exp-slot-filled hcard-img" data-slot="${i}" style="${bgStyle}">
          ${!heroImg ? `<img src="assets/sprites/final/${spriteKey}.png" class="hc-sprite" onerror="this.style.display='none'">` : ''}
          <div class="hcard-overlay">
            <div class="hc-nm">${hero.name}</div>
            <span class="hc-lv">Lv ${hero.level}</span>
            <div class="hc-st">
              <span>\u2694${hero.baseStats.atk}</span>
              <span>\uD83D\uDEE1${hero.baseStats.def}</span>
              <span>\u2764${hero.baseStats.hp}</span>
            </div>
          </div>
        </div>`;
    } else {
      slotsHTML += `<div class="exp-slot exp-slot-empty" data-slot="${i}"><span class="exp-slot-plus">+</span><span>Held wählen</span></div>`;
    }
  }

  // Hero selection list — styled as mini hero cards
  const selectedIds = new Set(selectedHeroes.map(h => h.id));
  const available = gameState.fighters.filter(f => !selectedIds.has(f.id));
  const heroListHTML = available.map(f => {
    const cls = CLASS_DEFS[f.classId];
    const clsName = cls ? cls.name : f.classId;
    const heroImg = HERO_IMAGE_MAP[f.classId];
    const bgStyle = heroImg ? `background-image:url('assets/heroes/${heroImg}.png')` : '';
    const spriteKey = cls ? cls.spriteKey : '';
    const hpPct = f.baseStats.maxHp > 0 ? Math.round(f.baseStats.hp / f.baseStats.maxHp * 100) : 100;
    const hpColor = hpPct > 60 ? 'var(--grn,#16a34a)' : hpPct > 30 ? '#ca8a04' : 'var(--red,#dc2626)';
    return `
      <div class="hsm hcard-img" data-hero-id="${f.id}" style="${bgStyle}">
        ${!heroImg ? `<img src="assets/sprites/final/${spriteKey}.png" class="hc-sprite" onerror="this.style.display='none'">` : ''}
        <div class="hcard-overlay">
          <div class="hc-nm">${f.name}</div>
          <div class="hsm-meta">${clsName} Lv${f.level}</div>
          <div class="hc-st">
            <span>\u2694${f.baseStats.atk}</span>
            <span>\uD83D\uDEE1${f.baseStats.def}</span>
            <span style="color:${hpColor}">\u2764${f.baseStats.hp}/${f.baseStats.maxHp}</span>
          </div>
        </div>
      </div>`;
  }).join('') || '<div class="hsm-empty">Keine Helden verfügbar</div>';

  // Provision panel
  const provRows = PROVISION_ITEMS.map(itemId => {
    const def = ITEM_DEFS[itemId];
    if (!def) return '';
    const qty = provisions[itemId] ?? 0;
    const stock = gameState.globalStock[itemId] ?? 0;
    return `
      <div class="pr" data-prov="${itemId}">
        <span class="prn">${def.name} (${stock})</span>
        <button class="prbtn" data-prov-action="dec" data-prov-id="${itemId}">−</button>
        <span class="prov-qty">${qty}</span>
        <button class="prbtn" data-prov-action="inc" data-prov-id="${itemId}">+</button>
      </div>`;
  }).join('');

  return `
    ${renderHeader(gameState, 'expeditions', routeName)}
    ${recLevel ? `<div class="exp-rec">Empfohlen: ${recLevel}</div>` : ''}
    <div class="team-wrap">
      <div class="team-left">
        <div class="lbl" style="margin-bottom:8px">Dein Team</div>
        <div class="exp-slots">${slotsHTML}</div>
        <div class="lbl" style="margin:14px 0 8px">Verfügbare Helden</div>
        <div class="exp-heroes">${heroListHTML}</div>
      </div>
      <div class="prov">
        <div class="prov-hd">Proviant</div>
        ${provRows}
        <button class="btn-go">EXPEDITION STARTEN</button>
      </div>
    </div>
  `;
}

function bindTeamEvents(el: HTMLElement): void {
  el.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Back / nav buttons
    const nav = target.closest<HTMLElement>('[data-nav]');
    if (nav) {
      navigateTo(nav.dataset.nav as any);
      return;
    }

    // Select hero from list
    const heroEl = target.closest<HTMLElement>('.hsm[data-hero-id]');
    if (heroEl) {
      const heroId = Number(heroEl.dataset.heroId);
      if (selectedHeroes.length < buildingUpgradeSystem.getPartySlots(gameState)) {
        const fighter = gameState.fighters.find(f => f.id === heroId);
        if (fighter && !selectedHeroes.some(h => h.id === heroId)) {
          selectedHeroes.push(fighter);
          refreshTeamScreen();
        }
      }
      return;
    }

    // Click filled slot → remove hero
    const slotEl = target.closest<HTMLElement>('.exp-slot-filled[data-slot]');
    if (slotEl) {
      const idx = Number(slotEl.dataset.slot);
      if (idx >= 0 && idx < selectedHeroes.length) {
        selectedHeroes.splice(idx, 1);
        refreshTeamScreen();
      }
      return;
    }

    // Provision +/- buttons
    const provBtn = target.closest<HTMLElement>('.prbtn[data-prov-id]');
    if (provBtn) {
      const itemId = provBtn.dataset.provId!;
      const action = provBtn.dataset.provAction;
      const stock = gameState.globalStock[itemId] ?? 0;
      if (action === 'inc' && (provisions[itemId] ?? 0) < stock) {
        provisions[itemId] = (provisions[itemId] ?? 0) + 1;
      } else if (action === 'dec' && (provisions[itemId] ?? 0) > 0) {
        provisions[itemId] = (provisions[itemId] ?? 0) - 1;
      }
      refreshTeamScreen();
      return;
    }

    // Start expedition button
    if (target.closest('.btn-go')) {
      if (selectedHeroes.length === 0) return;
      // Dispatch custom event for game logic to handle
      window.dispatchEvent(new CustomEvent('mc:startExpedition', {
        detail: {
          routeId: selectedRouteId,
          heroes: selectedHeroes.map(h => h.id),
          provisions: { ...provisions },
        },
      }));
      return;
    }
  });
}
