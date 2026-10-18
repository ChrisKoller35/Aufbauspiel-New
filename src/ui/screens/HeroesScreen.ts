// ─── Magic City – Heroes Screen ─────────────────────────────────
// Shows the player's heroes with stats, gear, and hire/train options.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { GuildFighter } from '../../models/GuildRoster';
import { CLASS_DEFS, ClassDef, HERO_IMAGE_MAP } from '../../data/classes';
import { ITEM_DEFS, getItemSpriteKey } from '../../data/items';
import { GearSystem } from '../../systems/GearSystem';
import { ClassUnlockSystem } from '../../systems/ClassUnlockSystem';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';
import { xpProgress, xpForNextLevel, totalXpForLevel, MAX_HERO_LEVEL } from '../../systems/HeroProgression';

const gearSystem = new GearSystem();
const classUnlockSystem = new ClassUnlockSystem();

// ─── State ──────────────────────────────────────────────────────
let gameState: GameState | null = null;

export function initHeroesScreen(state: GameState): void {
  gameState = state;
}

// ─── Helpers ────────────────────────────────────────────────────

const ROLE_EMOJI: Record<string, string> = {
  tank: '\uD83D\uDEE1\uFE0F',
  dps: '\u2694\uFE0F',
  healer: '\uD83D\uDC9A',
  support: '\u2728',
};

function getHeroImageStyle(classId: string): string {
  const img = HERO_IMAGE_MAP[classId];
  return img ? `background-image:url('assets/heroes/${img}.png')` : '';
}

function emojiForClass(classDef: ClassDef): string {
  return ROLE_EMOJI[classDef.role] ?? '\u2694\uFE0F';
}

function gearName(itemId: string | null): string {
  if (!itemId) return '—';
  const def = ITEM_DEFS[itemId];
  return def ? def.name : itemId;
}

function gearStatsSummary(itemId: string | null): string {
  if (!itemId) return '';
  const def = ITEM_DEFS[itemId];
  if (!def?.statBonuses) return '';
  const parts: string[] = [];
  if (def.statBonuses.atk) parts.push(`+${def.statBonuses.atk} ATK`);
  if (def.statBonuses.def) parts.push(`+${def.statBonuses.def} DEF`);
  if (def.statBonuses.hp) parts.push(`+${def.statBonuses.hp} HP`);
  if (def.statBonuses.spd) parts.push(`+${def.statBonuses.spd} SPD`);
  return parts.join(', ');
}

// ─── Tab IDs ────────────────────────────────────────────────────
type HeroTab = 'my' | 'hire' | 'train' | 'inventar';

let activeTab: HeroTab = 'my';

// ─── Hero Card HTML ─────────────────────────────────────────────

function renderHeroCard(fighter: GuildFighter, mode: 'my' | 'train'): string {
  const classDef = CLASS_DEFS[fighter.classId];
  const className = classDef ? classDef.name : fighter.classId;
  const emoji = classDef ? emojiForClass(classDef) : '\u2694\uFE0F';
  const spriteKey = classDef ? classDef.spriteKey : '';
  const pct = fighter.level >= MAX_HERO_LEVEL ? 100 : Math.round(xpProgress(fighter) * 100);
  const xpLabel = fighter.level >= MAX_HERO_LEVEL ? 'MAX' : `${pct}%`;

  const trainingCost = 20 + fighter.level * 10;
  const actionBtn = mode === 'train'
    ? `<button class="btn btn-sm btn-train" data-fighter-id="${fighter.id}" data-cost="${trainingCost}">TRAINIEREN (${trainingCost}G)</button>`
    : '';

  const hasImage = !!HERO_IMAGE_MAP[fighter.classId];
  const bgStyle = getHeroImageStyle(fighter.classId);

  if (hasImage) {
    // Image card: full illustration background, name overlay at bottom
    return `
      <div class="hcard hcard-img" data-fighter-id="${fighter.id}" style="${bgStyle}">
        <div class="hcard-overlay">
          <div class="hc-nm">${className}</div>
          <span class="hc-lv">Lv ${fighter.level}</span>
          ${actionBtn}
        </div>
      </div>`;
  }

  // Fallback: sprite-based card (for classes without illustrations)
  return `
    <div class="hcard" data-fighter-id="${fighter.id}">
      <div class="hc-ico">
        <img src="assets/sprites/final/${spriteKey}.png" class="hc-sprite"
             onerror="this.style.display='none'">
        <span class="hc-emoji">${emoji}</span>
      </div>
      <div class="hc-nm">${fighter.name}</div>
      <div class="hc-cl">${className}</div>
      <span class="hc-lv">Lv ${fighter.level}</span>
      <div class="lvbar"><div class="lvfill" style="width:${pct}%"></div></div>
      <div class="hc-xp">${xpLabel}</div>
      <div class="hc-st">
        <span>\u2694 ${fighter.baseStats.atk}</span>
        <span>\uD83D\uDEE1 ${fighter.baseStats.def}</span>
        <span>\u2764 ${fighter.baseStats.hp}/${fighter.baseStats.maxHp}</span>
      </div>
      ${actionBtn}
    </div>`;
}

// ─── Hire Card (template for recruitable heroes) ────────────────

function renderHireCard(classDef: ClassDef, cost: number): string {
  const emoji = emojiForClass(classDef);
  const hasImage = !!HERO_IMAGE_MAP[classDef.id];
  const bgStyle = getHeroImageStyle(classDef.id);

  if (hasImage) {
    return `
      <div class="hcard-wrap">
        <div class="hcard hcard-img" style="${bgStyle}">
          <div class="hcard-overlay">
            <div class="hc-nm">${classDef.name}</div>
          </div>
        </div>
        <div class="hcard-footer">
          <span class="hc-cost">\uD83D\uDCB0 ${cost} Gold</span>
          <button class="btn btn-sm btn-hire" data-class-id="${classDef.id}"
                  data-cost="${cost}">ANHEUERN</button>
        </div>
      </div>`;
  }

  return `
    <div class="hcard-wrap">
      <div class="hcard hcard-hire">
        <div class="hc-ico">
          <img src="assets/sprites/final/${classDef.spriteKey}.png" class="hc-sprite"
               onerror="this.style.display='none'">
          <span class="hc-emoji">${emoji}</span>
        </div>
        <div class="hc-nm">${classDef.name}</div>
        <div class="hc-cl">${classDef.role}</div>
        <span class="hc-lv">Lv 1</span>
        <div class="hc-st">
          <span>\u2694 ${classDef.baseStats.atk}</span>
          <span>\uD83D\uDEE1 ${classDef.baseStats.def}</span>
          <span>\u2764 ${classDef.baseStats.hp}</span>
        </div>
      </div>
      <div class="hcard-footer">
        <span class="hc-cost">\uD83D\uDCB0 ${cost} Gold</span>
        <button class="btn btn-sm btn-hire" data-class-id="${classDef.id}"
                data-cost="${cost}">ANHEUERN</button>
      </div>
    </div>`;
}

// ─── Hero Detail Modal ──────────────────────────────────────────

// ─── Shared data builders for detail modals ─────────────────────

function buildModalData(fighter: GuildFighter) {
  const classDef = CLASS_DEFS[fighter.classId];
  const className = classDef ? classDef.name : fighter.classId;
  const heroImg = HERO_IMAGE_MAP[fighter.classId];
  const portraitUrl = heroImg ? `assets/heroes/${heroImg}.png` : '';
  const pct = fighter.level >= MAX_HERO_LEVEL ? 100 : Math.round(xpProgress(fighter) * 100);
  const xpLabel = fighter.level >= MAX_HERO_LEVEL ? 'MAX' : `${pct}%`;

  const gearSlots: { label: string; emoji: string; key: string | null; slot: string }[] = [
    { label: 'Haupthand', emoji: '\u2694\uFE0F', key: fighter.gear.mainHand, slot: 'mainHand' },
    { label: 'Nebenhand', emoji: '\uD83D\uDEE1\uFE0F', key: fighter.gear.offHand, slot: 'offHand' },
    { label: 'R\u00FCstung', emoji: '\uD83D\uDC55', key: fighter.gear.armor, slot: 'armor' },
    { label: 'Talisman', emoji: '\uD83D\uDC8D', key: fighter.gear.trinket, slot: 'trinket' },
  ];

  return { classDef, className, portraitUrl, pct, xpLabel, gearSlots };
}

function gearSlotIconHtml(slot: { label: string; emoji: string; key: string | null }): string {
  if (!slot.key) {
    return `<div class="hdm-gear-icon hdm-gear-empty"><span class="hdm-gear-emoji">${slot.emoji}</span></div>`;
  }
  const sprKey = getItemSpriteKey(slot.key);
  return `<div class="hdm-gear-icon"><img src="assets/sprites/final/${sprKey}.png" onerror="this.parentElement.innerHTML='<span class=hdm-gear-emoji>${slot.emoji}</span>'"></div>`;
}

// ─── Hero Detail Modal ──────────────────────────────────────────

function buildInventoryHtml(fighter: GuildFighter): string {
  if (!gameState) return '';

  // Collect equippable gear items from globalStock
  const items: { id: string; name: string; qty: number; sprKey: string; rarCls: string; slot: string }[] = [];
  for (const [id, qty] of Object.entries(gameState.globalStock)) {
    if (qty <= 0) continue;
    const def = ITEM_DEFS[id];
    if (!def || def.type !== 'gear' || !def.gearSlot) continue;
    items.push({
      id,
      name: def.name,
      qty,
      sprKey: getItemSpriteKey(id),
      rarCls: rarityClass(def.tags),
      slot: def.gearSlot,
    });
  }

  // Sort by slot then tier
  items.sort((a, b) => {
    const slotOrder: Record<string, number> = { mainHand: 0, offHand: 1, armor: 2, trinket: 3 };
    const sa = slotOrder[a.slot] ?? 9;
    const sb = slotOrder[b.slot] ?? 9;
    if (sa !== sb) return sa - sb;
    const da = ITEM_DEFS[a.id];
    const db = ITEM_DEFS[b.id];
    return ((db?.tier ?? 0) - (da?.tier ?? 0));
  });

  if (items.length === 0) {
    return '<div class="hdm2-inv-empty">Keine Ausr\u00FCstung im Inventar</div>';
  }

  return items.map(item => `
    <div class="hdm2-inv-slot ${item.rarCls}" data-equip-id="${item.id}" title="${item.name}${gearStatsSummary(item.id) ? '\n' + gearStatsSummary(item.id) : ''}">
      <img src="assets/sprites/final/${item.sprKey}.png" onerror="this.style.display='none'">
      ${item.qty > 1 ? `<span class="hdm2-inv-qty">${item.qty}</span>` : ''}
    </div>`).join('');
}

function renderDetailModal(fighter: GuildFighter): string {
  const { classDef, className, portraitUrl, pct, xpLabel, gearSlots } = buildModalData(fighter);

  const skillsHtml = classDef ? classDef.skills.map(sk => `
    <div class="hdm2-skill">
      <div class="hdm2-skill-name">${sk.name}</div>
      <div class="hdm2-skill-cd">CD: ${sk.cooldown}</div>
      <div class="hdm2-skill-desc">${sk.description}</div>
    </div>`).join('') : '';

  const bgHtml = classDef?.background
    ? `<div class="hdm2-sidebar"><div class="lbl">Hintergrund</div><p>${classDef.background.replace(/\n/g, '<br>')}</p></div>`
    : '';

  return `
    <div class="ov" id="hero-detail-ov">
    <div class="hdm2-outer">
      <div class="hdm2-inv-panel" id="hdm2-inv-panel" style="display:none">
        <div class="hdm2-inv-header">
          <span class="lbl">\uD83C\uDF92 Inventar</span>
        </div>
        <div class="hdm2-inv-grid">
          ${buildInventoryHtml(fighter)}
        </div>
      </div>
      <div class="hdm2">
        <button class="mcl" id="hero-detail-close">\u2715</button>
        <button class="hdm2-inv-btn" id="hdm2-inv-toggle">\uD83C\uDF92 Inventar</button>
        <div class="hdm2-header">
          <div class="hdm2-name">${fighter.name}</div>
          <div class="hdm2-sub">${className} \u00B7 Lv ${fighter.level}</div>
        </div>
        <div class="hdm2-portrait-area">
          <div class="hdm2-gear-col hdm2-gear-left">
            ${gearSlotIconHtml(gearSlots[0])}
            <span class="hdm2-slot-label">${gearSlots[0].label}</span>
            ${gearSlotIconHtml(gearSlots[2])}
            <span class="hdm2-slot-label">${gearSlots[2].label}</span>
          </div>
          <div class="hdm2-portrait" style="background-image:url('${portraitUrl}')"></div>
          <div class="hdm2-gear-col hdm2-gear-right">
            ${gearSlotIconHtml(gearSlots[1])}
            <span class="hdm2-slot-label">${gearSlots[1].label}</span>
            ${gearSlotIconHtml(gearSlots[3])}
            <span class="hdm2-slot-label">${gearSlots[3].label}</span>
          </div>
        </div>
        <div class="hdm2-xp-row">
          <div class="hdm2-xpbar"><div class="hdm2-xpfill" style="width:${pct}%"></div></div>
          <div class="hdm2-xplabel">XP ${xpLabel}</div>
        </div>
        <div class="hdm2-stats">
          <span>\u2694 ATK ${fighter.baseStats.atk}</span>
          <span>\uD83D\uDEE1 DEF ${fighter.baseStats.def}</span>
          <span>\u2764 HP ${fighter.baseStats.hp}/${fighter.baseStats.maxHp}</span>
          <span>\u26A1 SPD ${fighter.baseStats.spd}</span>
          <span>\uD83C\uDFAF CRIT ${Math.round(fighter.baseStats.critChance * 100)}%</span>
        </div>
        <div class="hdm2-skills-area">
          <div class="lbl">F\u00E4higkeiten</div>
          <div class="hdm2-skills">${skillsHtml}</div>
        </div>
      </div>
      ${bgHtml}
    </div>
    </div>`;
}

// ─── Tab Content ────────────────────────────────────────────────

function renderMyHeroes(): string {
  if (!gameState || gameState.fighters.length === 0) {
    return '<div class="empty-msg">Noch keine Helden rekrutiert.</div>';
  }
  const cards = gameState.fighters.map(f => renderHeroCard(f, 'my')).join('');
  return `<div class="hcards">${cards}</div>`;
}

function renderHireTab(): string {
  if (!gameState) return '<div class="empty-msg">Kein Spielstand geladen.</div>';
  const state = gameState;
  const ownedClassIds = new Set(state.fighters.map(f => f.classId));
  const available = Object.values(CLASS_DEFS).filter(
    c => !ownedClassIds.has(c.id) && classUnlockSystem.isClassUnlocked(state, c.id),
  );

  if (available.length === 0) {
    const allUnlocked = Object.values(CLASS_DEFS).every(c => classUnlockSystem.isClassUnlocked(state, c.id));
    return allUnlocked
      ? '<div class="empty-msg">Alle Klassen bereits rekrutiert!</div>'
      : '<div class="empty-msg">Alle freigeschalteten Klassen bereits rekrutiert. Weitere Klassen werden durch Expeditionen freigeschaltet.</div>';
  }

  // Cost scales with how many heroes you already own
  const owned = state.fighters.length;
  const cards = available.map(c => {
    const cost = 50 + owned * 30;
    return renderHireCard(c, cost);
  }).join('');

  return `<div class="hcards">${cards}</div>`;
}

function renderTrainTab(): string {
  if (!gameState || gameState.fighters.length === 0) {
    return '<div class="empty-msg">Noch keine Helden zum Trainieren.</div>';
  }
  const cards = gameState.fighters
    .filter(f => f.level < MAX_HERO_LEVEL)
    .map(f => renderHeroCard(f, 'train'))
    .join('');

  if (!cards) {
    return '<div class="empty-msg">Alle Helden haben das Maximallevel erreicht!</div>';
  }
  return `<div class="hcards">${cards}</div>`;
}

// ─── Inventar Tab ──────────────────────────────────────────────

interface ItemCategory {
  label: string;
  emoji: string;
  filter: (id: string, def: { type: string; tags: string[] }) => boolean;
}

const ITEM_CATEGORIES: ItemCategory[] = [
  { label: 'Waffen', emoji: '\u2694\uFE0F', filter: (_id, def) => def.type === 'gear' && def.tags.includes('weapon') },
  { label: 'R\u00FCstungen & Schilde', emoji: '\uD83D\uDEE1\uFE0F', filter: (_id, def) => def.type === 'gear' && (def.tags.includes('armor') || def.tags.includes('robe') || def.tags.includes('shield')) },
  { label: 'Schmuck', emoji: '\uD83D\uDC8D', filter: (_id, def) => def.type === 'gear' && def.tags.includes('trinket') },
  { label: 'Tr\u00E4nke & Proviant', emoji: '\u2697\uFE0F', filter: (_id, def) => def.type === 'consumable' },
  { label: 'Materialien', emoji: '\uD83D\uDCE6', filter: (_id, def) => def.type === 'material' || def.type === 'special' },
  { label: 'Ressourcen', emoji: '\uD83C\uDF3E', filter: (_id, def) => def.type === 'resource' },
];

function rarityClass(tags: string[]): string {
  if (tags.includes('legendary')) return 'rar-legendary';
  if (tags.includes('epic')) return 'rar-epic';
  if (tags.includes('rare')) return 'rar-rare';
  if (tags.includes('uncommon')) return 'rar-uncommon';
  return 'rar-common';
}

function rarityLabel(tags: string[]): string {
  if (tags.includes('legendary')) return 'Legendär';
  if (tags.includes('epic')) return 'Episch';
  if (tags.includes('rare')) return 'Selten';
  if (tags.includes('uncommon')) return 'Ungewöhnlich';
  return '';
}

function renderInventarTab(): string {
  if (!gameState) return '<div class="empty-msg">Kein Spielstand geladen.</div>';

  const stock = gameState.globalStock;

  // Collect all items the player has (qty > 0)
  const ownedItems: { id: string; def: typeof ITEM_DEFS[string]; qty: number }[] = [];
  for (const [id, qty] of Object.entries(stock)) {
    if (qty <= 0) continue;
    const def = ITEM_DEFS[id];
    if (!def) continue;
    ownedItems.push({ id, def, qty });
  }

  if (ownedItems.length === 0) {
    return `
      <div class="empty-msg">Dein Inventar ist leer.</div>
      ${import.meta.env.DEV ? `<button id="inv-debug-fill" style="margin:12px auto;display:block;background:var(--s3);border:1px solid var(--bdr);color:var(--gold);padding:6px 16px;border-radius:6px;font-size:0.78rem;cursor:pointer;">\uD83D\uDD13 Alle Items einf\u00FCgen (Debug)</button>` : ''}`;
  }

  // Which items are equipped by any hero
  const equippedItems = new Set<string>();
  for (const f of gameState.fighters) {
    if (f.gear.mainHand) equippedItems.add(f.gear.mainHand);
    if (f.gear.offHand) equippedItems.add(f.gear.offHand);
    if (f.gear.armor) equippedItems.add(f.gear.armor);
    if (f.gear.trinket) equippedItems.add(f.gear.trinket);
  }

  let html = '';

  for (const cat of ITEM_CATEGORIES) {
    const items = ownedItems.filter(i => cat.filter(i.id, i.def));
    if (items.length === 0) continue;

    // Sort: higher tier first, then alphabetical
    items.sort((a, b) => (b.def.tier ?? 0) - (a.def.tier ?? 0) || a.def.name.localeCompare(b.def.name));

    const itemCards = items.map(item => {
      const rc = rarityClass(item.def.tags);
      const rl = rarityLabel(item.def.tags);
      const isEquipped = equippedItems.has(item.id);
      const statsStr = gearStatsSummary(item.id);
      const tierStr = item.def.tier ? `T${item.def.tier}` : '';
      const isStackable = (item.def.stackSize ?? 1) > 1;
      const tooltip = [
        item.def.name,
        rl,
        tierStr,
        statsStr,
        item.def.flavorText,
        isEquipped ? 'Ausger\u00FCstet' : '',
      ].filter(Boolean).join('\n');

      const isGear = item.def.type === 'gear';

      return `
        <div class="inv-cell ${rc}${isEquipped ? ' inv-cell-eq' : ''}${isGear ? ' inv-cell-gear' : ''}" title="${tooltip}">
          <img src="assets/sprites/final/${getItemSpriteKey(item.id)}.png" class="${isGear ? 'inv-cell-bg' : 'inv-cell-img'}"
               onerror="this.style.display='none'">
          ${isStackable && item.qty > 1 ? `<span class="inv-cell-qty">\u00D7${item.qty}</span>` : ''}
          ${isEquipped ? '<span class="inv-cell-eqbadge">E</span>' : ''}
          <span class="inv-cell-nm">${item.def.name}</span>
        </div>`;
    }).join('');

    html += `
      <div class="inv-cat">
        <div class="inv-cat-hd">${cat.emoji} ${cat.label} <span class="inv-cat-count">(${items.length})</span></div>
        <div class="inv-grid">${itemCards}</div>
      </div>`;
  }

  const totalItems = ownedItems.reduce((s, i) => s + i.qty, 0);
  const totalTypes = ownedItems.length;

  return `
    <div class="inv-summary">
      ${totalTypes} Gegenst\u00E4nde (${totalItems} gesamt)
      ${import.meta.env.DEV ? `<button id="inv-debug-fill" style="margin-left:auto;background:var(--s3);border:1px solid var(--bdr);color:var(--gold);padding:4px 12px;border-radius:6px;font-size:0.72rem;cursor:pointer;float:right;">\uD83D\uDD13 Alle Items (Debug)</button>` : ''}
    </div>
    ${html}`;
}

// ─── Main Render ────────────────────────────────────────────────

export function renderHeroesScreen(container: HTMLElement): void {
  // Remove previous instance to avoid duplicates on re-render
  const prev = document.getElementById('s-heroes');
  if (prev) prev.remove();

  const state = gameState;
  const headerHtml = state ? renderHeader(state, 'main', 'HELDEN') : '';

  function tabClass(tab: HeroTab): string {
    return `tab${activeTab === tab ? ' active' : ''}`;
  }

  function tabContent(): string {
    switch (activeTab) {
      case 'my': return renderMyHeroes();
      case 'hire': return renderHireTab();
      case 'train': return renderTrainTab();
      case 'inventar': return renderInventarTab();
    }
  }

  const el = document.createElement('div');
  el.id = 's-heroes';
  el.className = 'screen';
  el.innerHTML = `
      ${headerHtml}
      <div class="tabs">
        <button class="${tabClass('my')}" data-tab="my">MEINE HELDEN</button>
        <button class="${tabClass('hire')}" data-tab="hire">ANHEUERN</button>
        <button class="${tabClass('train')}" data-tab="train">TRAINIEREN</button>
        <button class="${tabClass('inventar')}" data-tab="inventar">\uD83C\uDF92 INVENTAR</button>
      </div>
      <div class="tab-content">
        ${tabContent()}
      </div>`;
  container.appendChild(el);

  // ─── Event Binding ──────────────────────────────────────────

  // Back button
  const backBtn = el.querySelector('.hdr-back') as HTMLElement | null;
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const target = backBtn.getAttribute('data-nav');
      if (target) navigateTo(target as any);
    });
  }

  // Tab switching
  const tabs = el.querySelectorAll('.tab');
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', () => {
      const tab = tabs[i].getAttribute('data-tab') as HeroTab;
      if (tab && tab !== activeTab) {
        activeTab = tab;
        renderHeroesScreen(container);
      }
    });
  }

  // Hero card click → detail modal
  const heroCards = el.querySelectorAll('.hcard:not(.hcard-hire)');
  for (let i = 0; i < heroCards.length; i++) {
    heroCards[i].addEventListener('click', (e) => {
      // Don't open modal if clicking a button inside the card
      if ((e.target as HTMLElement).closest('button')) return;

      const fid = Number(heroCards[i].getAttribute('data-fighter-id'));
      const fighter = gameState?.fighters.find(f => f.id === fid);
      if (!fighter) return;

      openDetailModal(fighter, container);
    });
  }

  // Train buttons
  const trainBtns = el.querySelectorAll('.btn-train');
  for (let i = 0; i < trainBtns.length; i++) {
    trainBtns[i].addEventListener('click', () => {
      const fid = Number(trainBtns[i].getAttribute('data-fighter-id'));
      const btn = trainBtns[i] as HTMLElement;
      handleTrain(fid, container, btn);
    });
  }

  // Hire buttons
  const hireBtns = el.querySelectorAll('.btn-hire');
  for (let i = 0; i < hireBtns.length; i++) {
    hireBtns[i].addEventListener('click', () => {
      const classId = hireBtns[i].getAttribute('data-class-id') ?? '';
      const cost = Number(hireBtns[i].getAttribute('data-cost'));
      const btn = hireBtns[i] as HTMLElement;
      handleHire(classId, cost, container, btn);
    });
  }

  // Debug: fill all items into inventory (dev builds only)
  const debugFill = el.querySelector('#inv-debug-fill') as HTMLElement | null;
  if (import.meta.env.DEV && debugFill && gameState) {
    debugFill.addEventListener('click', () => {
      if (!gameState) return;
      for (const [id, def] of Object.entries(ITEM_DEFS)) {
        if (!gameState.globalStock[id] || gameState.globalStock[id] <= 0) {
          gameState.globalStock[id] = (def.stackSize ?? 1) > 1 ? 5 : 1;
        }
      }
      renderHeroesScreen(container);
    });
  }
}

// ─── Modal ──────────────────────────────────────────────────────

function openDetailModal(fighter: GuildFighter, container: HTMLElement): void {
  // Remove any existing modal
  const existing = container.querySelector('#hero-detail-ov');
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderDetailModal(fighter);
  const overlay = wrapper.firstElementChild as HTMLElement;
  overlay.classList.add('on');
  container.appendChild(overlay);

  // Close button
  const closeBtn = overlay.querySelector('#hero-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.remove());
  }

  // Click overlay background to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Inventory panel toggle
  const invToggle = overlay.querySelector('#hdm2-inv-toggle') as HTMLElement | null;
  const invPanel = overlay.querySelector('#hdm2-inv-panel') as HTMLElement | null;
  if (invToggle && invPanel) {
    invToggle.addEventListener('click', () => {
      const isOpen = invPanel.style.display !== 'none';
      invPanel.style.display = isOpen ? 'none' : 'flex';
      invToggle.classList.toggle('active', !isOpen);
    });
  }

  // Equip item on click
  const equipSlots = overlay.querySelectorAll('.hdm2-inv-slot');
  for (let i = 0; i < equipSlots.length; i++) {
    equipSlots[i].addEventListener('click', () => {
      const itemId = equipSlots[i].getAttribute('data-equip-id');
      if (!itemId || !gameState) return;
      const ok = gearSystem.equip(gameState, fighter, itemId);
      if (ok) {
        // Re-render the modal to reflect gear change
        openDetailModal(fighter, container);
        // Re-open the inventory panel
        const newPanel = container.querySelector('#hdm2-inv-panel') as HTMLElement | null;
        const newToggle = container.querySelector('#hdm2-inv-toggle') as HTMLElement | null;
        if (newPanel) newPanel.style.display = 'flex';
        if (newToggle) newToggle.classList.add('active');
      }
    });
  }
}

// ─── Actions ────────────────────────────────────────────────────

function handleTrain(fighterId: number, container: HTMLElement, btn: HTMLElement): void {
  if (!gameState) return;
  const fighter = gameState.fighters.find(f => f.id === fighterId);
  if (!fighter || fighter.level >= MAX_HERO_LEVEL) return;

  const trainingCost = 20 + fighter.level * 10;
  const gold = gameState.globalStock['gold'] ?? 0;

  // Not enough gold — show error feedback on button
  if (gold < trainingCost) {
    const originalText = btn.textContent ?? 'TRAINIEREN';
    const originalBg = btn.style.background;
    btn.textContent = 'Nicht genug Gold!';
    btn.style.background = '#991b1b';
    btn.setAttribute('disabled', 'true');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = originalBg;
      btn.removeAttribute('disabled');
    }, 1500);
    return;
  }

  gameState.globalStock['gold'] = gold - trainingCost;
  const xpGain = 10 + fighter.level * 5;
  fighter.xp += xpGain;

  // Check level-up
  let didLevelUp = false;
  while (fighter.level < MAX_HERO_LEVEL) {
    const needed = xpForNextLevel(fighter.level);
    const xpInLevel = fighter.xp - totalXpForLevel(fighter.level);
    if (xpInLevel >= needed) {
      fighter.level++;
      // Stat growth on level up
      fighter.baseStats.maxHp += 2;
      fighter.baseStats.hp = fighter.baseStats.maxHp;
      fighter.baseStats.atk += 1;
      fighter.baseStats.def += 1;
      didLevelUp = true;
    } else {
      break;
    }
  }

  // Show success feedback, then re-render
  const successText = didLevelUp ? '\u2605 Level Up!' : '\u2713 Trainiert!';
  btn.textContent = successText;
  btn.style.background = '#166534';
  btn.setAttribute('disabled', 'true');
  setTimeout(() => {
    renderHeroesScreen(container);
  }, 600);
}

function handleHire(classId: string, cost: number, container: HTMLElement, btn: HTMLElement): void {
  if (!gameState) return;
  const gold = gameState.globalStock['gold'] ?? 0;

  // Not enough gold — show error feedback on button
  if (gold < cost) {
    const originalText = btn.textContent ?? 'ANHEUERN';
    const originalBg = btn.style.background;
    btn.textContent = 'Nicht genug Gold!';
    btn.style.background = '#991b1b';
    btn.setAttribute('disabled', 'true');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = originalBg;
      btn.removeAttribute('disabled');
    }, 1500);
    return;
  }

  const classDef = CLASS_DEFS[classId];
  if (!classDef) return;

  // Check if already owned
  if (gameState.fighters.some(f => f.classId === classId)) return;

  gameState.globalStock['gold'] = gold - cost;

  // Create a new fighter — use a simple incrementing ID
  const maxId = gameState.fighters.reduce((m, f) => Math.max(m, f.id), 0);
  const newFighter: GuildFighter = {
    id: maxId + 1,
    citizenId: 0,
    classId: classDef.id,
    name: classDef.name,
    baseStats: { ...classDef.baseStats },
    gear: { mainHand: null, offHand: null, armor: null, trinket: null },
    gearNeedsRepair: false,
    xp: 0,
    level: 1,
  };

  gameState.fighters.push(newFighter);

  // Show success feedback, then re-render
  btn.textContent = '\u2713 Rekrutiert!';
  btn.style.background = '#166534';
  btn.setAttribute('disabled', 'true');
  setTimeout(() => {
    renderHeroesScreen(container);
  }, 600);
}
