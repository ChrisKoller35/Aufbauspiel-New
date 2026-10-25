// ─── Magic City – Expeditions Screen ────────────────────────────
// Two-part screen: expedition list + team selection.
// ────────────────────────────────────────────────────────────────

import { navigateTo } from '../ScreenRouter';
import { GameState } from '../../models/GameState';
import { GuildFighter } from '../../models/GuildRoster';
import { ROUTE_DEFS, RouteDef, ROUTE_IMAGE_MAP, isRouteAvailable, isRouteCompleted, getRouteLockReasons, biomFuerRoute, type Biom } from '../../data/routes';
import { ITEM_DEFS, PROVISION_ITEMS } from '../../data/items';
import { CLASS_DEFS, HERO_IMAGE_MAP } from '../../data/classes';
import { renderHeader } from './HeaderRenderer';
import { heldenJeExpedition } from '../../systems/Ausbau';
import { setFuerRoute, DungeonSetDef } from '../../data/dungeonSets';
import { setKurzinfo } from '../components/SetAnzeige';
import { escapeAttr, materialZeile } from '../components/SchmiedeAnzeige';
import { routenGeschichteHtml } from '../components/GeschichtsAnzeige';
import { auftraegeFuerDungeon } from '../../systems/Auftragsbrett';
import { zeigeGildenhaus } from './GildenhausScreen';
import { zeigeKriegsrat } from '../components/KriegsratFenster';

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

const BIOM_KLASSE: Record<Biom, string> = {
  Drachengipfel: 'tag-gipfel', Himmel: 'tag-himmel', Sterne: 'tag-sterne', Mond: 'tag-mond',
  Unterwasser: 'tag-unterwasser', Belagerung: 'tag-belagerung', Vulkan: 'tag-vulkan', Ruinen: 'tag-ruinen',
  Sumpf: 'tag-sumpf', Frost: 'tag-frost', Höhle: 'tag-hoehle', Wald: 'tag-wald',
};

function getBiomeTag(route: RouteDef): { label: string; cls: string } {
  const biom = biomFuerRoute(route);
  return { label: biom, cls: BIOM_KLASSE[biom] };
}

/** Wie auf der Dungeon-Karte: Ebenen über 5 bekommen je einen Funken dazu (★★★★★✦). */
function difficultyStars(tier: number): string {
  const max = 5;
  const filled = Math.min(tier, max);
  return '★'.repeat(filled) + '☆'.repeat(max - filled) + '✦'.repeat(Math.max(0, tier - max));
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
  selectRoute(routeId);
  refreshTeamScreen();
}

function selectRoute(routeId: string): void {
  selectedRouteId = routeId;
  selectedHeroes = [];
  provisions = {};
  PROVISION_ITEMS.forEach(id => { provisions[id] = 0; });
}

export function renderExpeditionsScreen(container: HTMLElement): void {
  // Screen 1: Expedition list
  renderExpeditionList(container);
  // Screen 2: Team selection
  renderTeamScreen(container);
}

// ── Screen 1: Expedition List ──

/** Same rule as the dungeon map: available, or already won once (replay). */
function isRoutePlayable(route: RouteDef): boolean {
  return isRouteAvailable(route, gameState) || isRouteCompleted(route.id, gameState);
}

function buildExpeditionListHTML(): string {
  const routes = Object.values(ROUTE_DEFS);
  const jetzt = Date.now();
  const cards = routes.map(route => {
    const biome = getBiomeTag(route);
    const locked = !isRoutePlayable(route);
    const set = setFuerRoute(route.id);
    // Auftragsbrett: Zettel und Kapitel der Kette, die hier zählen
    const auftraege = locked ? [] : auftraegeFuerDungeon(gameState, route.id, jetzt);
    const footer = locked
      ? getRouteLockReasons(route, gameState).map(r => `<span class="exp-lock">🔒 ${r}</span>`).join('')
      : `<span class="exp-rew">Belohnung: ${routeRewards(route)}</span>`
        + (set ? `<span class="exp-set">${setKurzinfo(gameState, set)}</span>` : '')
        + `<span class="exp-mat">${materialZeile(route.id)}</span>`
        + (auftraege.length > 0 ? `<span class="exp-auftrag" title="${escapeAttr(auftraege.join(' · '))}">📜 ${auftraege.join(' · ')}</span>` : '');
    return `
      <div class="exp-card${locked ? ' locked' : ''}" data-route="${route.id}" style="${getRouteImageStyle(route.id)}">
        <div class="exp-card-info">
          <span class="exp-tag ${biome.cls}">${biome.label}</span>
          <span class="exp-name">${route.name}</span>
          <span class="exp-star">${difficultyStars(route.tier)}</span>
          <span class="exp-blurb">${routeDescription(route)}</span>
          ${footer}
        </div>
      </div>`;
  }).join('');

  return `
    ${renderHeader(gameState, 'main', 'ROUTENÜBERSICHT')}
    <div style="display:flex;gap:8px;padding:0 16px;flex-wrap:wrap">
      <button class="btn-dungeon-map" data-nav="dungeon">\uD83D\uDDFA\uFE0F Dungeonkarte</button>
      <button class="btn-dungeon-map" data-nav="bestiarium">\uD83D\uDCD6 Monsterbuch</button>
      <button class="btn-dungeon-map" data-gildenhaus="brett">\uD83D\uDCDC Auftragsbrett</button>
      <button class="btn-dungeon-map" data-gildenhaus="saal">\uD83C\uDFC6 Troph\u00e4ensaal</button>
    </div>
    <div class="content"><div class="exp-grid">${cards}</div></div>
  `;
}

function renderExpeditionList(container: HTMLElement): void {
  const el = document.createElement('div');
  el.id = 's-expeditions';
  el.className = 'screen';
  el.innerHTML = buildExpeditionListHTML();

  // Click handler: card → team screen (delegated, survives innerHTML rebuilds)
  el.addEventListener('click', (e: MouseEvent) => {
    const gilde = (e.target as HTMLElement).closest<HTMLElement>('[data-gildenhaus]');
    if (gilde) {
      zeigeGildenhaus(gilde.dataset.gildenhaus === 'saal' ? 'saal' : 'brett');
      return;
    }
    const back = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
    if (back) {
      navigateTo(back.dataset.nav as any);
      return;
    }
    const card = (e.target as HTMLElement).closest<HTMLElement>('.exp-card:not(.locked)');
    if (card && card.dataset.route) {
      selectRoute(card.dataset.route);
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

/** Rebuild both expedition screens with current state (delegated listeners persist). */
export function refreshExpeditionsScreens(): void {
  const list = document.getElementById('s-expeditions');
  if (list) list.innerHTML = buildExpeditionListHTML();
  refreshTeamScreen();
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
  const maxSlots = heldenJeExpedition(gameState);
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
            <div class="hc-nm">${escapeAttr(hero.name)}</div>
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
          <div class="hc-nm">${escapeAttr(f.name)}</div>
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
    // Was der Vorrat im Dungeon bewirkt, als Halbsatz (docs/GILDENSTADT.md «Tränke mit Wirkung»)
    const wirkungHtml = def.wirkungText ? `<br><span class="prw">${def.wirkungText}</span>` : '';
    return `
      <div class="pr" data-prov="${itemId}">
        <span class="prn">${def.name} (${stock})${wirkungHtml}</span>
        <button class="prbtn" data-prov-action="dec" data-prov-id="${itemId}">−</button>
        <span class="prov-qty">${qty}</span>
        <button class="prbtn" data-prov-action="inc" data-prov-id="${itemId}">+</button>
      </div>`;
  }).join('');

  return `
    ${renderHeader(gameState, 'expeditions', routeName)}
    ${routeInfoHTML(recLevel, route?.besonderheit, route ? setFuerRoute(route.id) : undefined, route ? routenGeschichteHtml(gameState, route.id) : '')}
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
        <button class="btn-kriegsrat"${document.querySelector('.kr-ov') ? ' disabled' : ''}>🎲 Kriegsrat</button>
        <button class="btn-go">EXPEDITION STARTEN</button>
      </div>
    </div>
  `;
}

/** Empfehlung, Besonderheit, Set und Geschichte der Route als Band über dem Team. */
function routeInfoHTML(recLevel: string, besonderheit: string | undefined, set: DungeonSetDef | undefined, geschichte: string): string {
  if (!recLevel && !besonderheit && !set && !geschichte) return '';
  return `
    <div class="exp-info">
      ${recLevel ? `<span class="exp-rec">Empfohlen: ${recLevel}</span>` : ''}
      ${besonderheit ? `<span class="exp-besonderheit">✦ ${besonderheit}</span>` : ''}
      ${set ? `<span class="exp-set-info">Set-Beute: ${setKurzinfo(gameState, set, true)}</span>` : ''}
      ${set ? `<span class="exp-mat-info">⚒️ Schmiede: ${materialZeile(set.routeId)}</span>` : ''}
      ${geschichte}
    </div>`;
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
      if (selectedHeroes.length < heldenJeExpedition(gameState)) {
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

    // Kriegsrat: Probeläufe mit denselben Werten wie der Start; gesperrt, solange das Fenster offen ist
    const ratBtn = target.closest<HTMLButtonElement>('.btn-kriegsrat');
    if (ratBtn) {
      const route = selectedRouteId ? ROUTE_DEFS[selectedRouteId] : null;
      if (ratBtn.disabled || document.querySelector('.kr-ov') || selectedHeroes.length === 0 || !route || !isRoutePlayable(route)) return;
      ratBtn.disabled = true;
      zeigeKriegsrat(document.body, gameState, route.id, selectedHeroes.map(h => h.id), { ...provisions }, () => {
        // Wieder frei, und der Fokus kehrt zum Knopf zurück (sonst landet er auf der Seite)
        const knopf = el.querySelector<HTMLButtonElement>('.btn-kriegsrat');
        knopf?.removeAttribute('disabled');
        if (knopf?.offsetParent) knopf.focus();
      });
      return;
    }

    // Start expedition button
    if (target.closest('.btn-go')) {
      if (selectedHeroes.length === 0) return;
      const route = selectedRouteId ? ROUTE_DEFS[selectedRouteId] : null;
      if (!route || !isRoutePlayable(route)) return;
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
