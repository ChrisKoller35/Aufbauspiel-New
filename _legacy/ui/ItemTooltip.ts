// ============================================================
// Magic City – ItemTooltip
// Globaler schwebender Item-Tooltip: WoW-Karten-Style.
// Aktivierung via ItemTooltip.attach(el, itemId).
// ============================================================

import { ITEM_DEFS } from '../../data/items';
import {
  getItemRarity, getStatLabel, formatStatValue,
  getSpecialEffectText, getSlotLabel, getWeaponTypeLabel,
} from './ItemRarity';

const STAT_COLORS: Record<string, string> = {
  atk: '#E06030', def: '#3A8AC8', hp: '#4CAF78', spd: '#D4B800', critChance: '#E8C34A',
};

export class ItemTooltip {
  private static tooltipEl: HTMLElement | null = null;
  private static initialized = false;

  // ─── Init (call once from main.ts or UIManager) ───────────

  static init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.injectStyles();

    const el = document.createElement('div');
    el.id = 'mc-item-tooltip';
    document.body.appendChild(el);
    this.tooltipEl = el;

    document.addEventListener('mousemove', (e) => {
      if (!this.tooltipEl || this.tooltipEl.style.display === 'none') return;
      const pad = 14;
      let x = e.clientX + pad;
      let y = e.clientY + pad;
      const tw = this.tooltipEl.offsetWidth;
      const th = this.tooltipEl.offsetHeight;
      if (x + tw > window.innerWidth  - 8) x = e.clientX - tw - pad;
      if (y + th > window.innerHeight - 8) y = e.clientY - th - pad;
      this.tooltipEl.style.left = x + 'px';
      this.tooltipEl.style.top  = y + 'px';
    });
  }

  // ─── Public API ───────────────────────────────────────────

  /** Hängt Hover-Listener an ein Element. itemId = ITEM_DEFS key (z.B. "iron_sword"). */
  static attach(el: HTMLElement, itemId: string): void {
    el.addEventListener('mouseenter', () => this.show(itemId));
    el.addEventListener('mouseleave', () => this.hide());
  }

  static show(itemId: string): void {
    if (!this.tooltipEl) return;
    const item = ITEM_DEFS[itemId];
    if (!item || item.type !== 'gear') return;

    const rarity   = getItemRarity(item);
    const sb       = item.statBonuses ?? {};
    const special  = getSpecialEffectText(item.tags ?? []);
    const slotLbl  = item.gearSlot ? getSlotLabel(item.gearSlot) : '';
    const wepLbl   = getWeaponTypeLabel(item.weaponSlotType);
    const typeStr  = [slotLbl, wepLbl].filter(Boolean).join(' · ');

    // ── Container ──
    const t = this.tooltipEl;
    t.innerHTML = '';
    t.style.cssText = [
      'position: fixed',
      'z-index: 99999',
      'pointer-events: none',
      'max-width: 260px',
      'min-width: 190px',
      'display: block',
      `background: #0d0f14`,
      `border: 1px solid ${rarity.color}`,
      `box-shadow: 0 0 22px ${rarity.glow}, inset 0 0 40px ${rarity.bgColor}`,
      'border-radius: 6px',
      'overflow: hidden',
      'font-family: var(--mc-font, "Segoe UI", sans-serif)',
      'left: -9999px', // hidden until next mousemove places it
    ].join('; ');

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = [
      'padding: 8px 12px 6px',
      `background: linear-gradient(135deg, rgba(0,0,0,0.5) 0%, ${rarity.bgColor} 100%)`,
      `border-bottom: 1px solid ${rarity.color}44`,
    ].join('; ');
    const nameEl = document.createElement('div');
    nameEl.style.cssText = `font-size: 14px; font-weight: bold; color: ${rarity.color}; letter-spacing: 0.02em;`;
    nameEl.textContent = item.name;
    header.appendChild(nameEl);
    t.appendChild(header);

    // ── Body: image + stats ──
    const body = document.createElement('div');
    body.style.cssText = 'display: flex; gap: 10px; padding: 10px 12px;';

    // Image with glow backdrop
    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = [
      'width: 68px', 'height: 68px', 'flex-shrink: 0',
      'border-radius: 5px',
      `background: radial-gradient(circle at center, ${rarity.bgColor.replace('0.0', '0.2').replace('0.09', '0.25')} 0%, rgba(0,0,0,0.6) 75%)`,
      `border: 1px solid ${rarity.color}55`,
      `box-shadow: inset 0 0 18px ${rarity.glow}`,
      'display: flex', 'align-items: center', 'justify-content: center',
    ].join('; ');
    const img = document.createElement('img');
    img.src    = `/assets/sprites/final/ITEM_${itemId.toUpperCase()}.png`;
    img.width  = 56;
    img.height = 56;
    img.style.cssText = `object-fit: contain; image-rendering: auto; filter: drop-shadow(0 0 8px ${rarity.glow});`;
    imgWrap.appendChild(img);
    body.appendChild(imgWrap);

    // Stats column
    const statsCol = document.createElement('div');
    statsCol.style.cssText = 'flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;';

    if (typeStr) {
      const typeEl = document.createElement('div');
      typeEl.style.cssText = 'font-size: 11px; color: #9EA3AC; margin-bottom: 5px;';
      typeEl.textContent = typeStr;
      statsCol.appendChild(typeEl);
    }

    for (const [key, val] of Object.entries(sb)) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size: 12px; color: #9EA3AC;';
      lbl.textContent = getStatLabel(key);
      const valEl = document.createElement('span');
      valEl.style.cssText = `font-size: 12px; font-weight: bold; color: ${STAT_COLORS[key] ?? '#F2F2F2'};`;
      valEl.textContent = formatStatValue(key, val as number);
      row.appendChild(lbl);
      row.appendChild(valEl);
      statsCol.appendChild(row);
    }
    // Air Bonus (Abyssal-Set)
    const airBonus = (item as any).airBonus as number | undefined;
    if (airBonus) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size: 12px; color: #90CAF9;';
      lbl.textContent = '🫁 Luftschild';
      const valEl = document.createElement('span');
      valEl.style.cssText = 'font-size: 12px; font-weight: bold; color: #64B5F6;';
      valEl.textContent = `+${airBonus}`;
      row.appendChild(lbl);
      row.appendChild(valEl);
      statsCol.appendChild(row);
    }
    body.appendChild(statsCol);
    t.appendChild(body);

    // ── Footer: rarity + tier ──
    const footer = document.createElement('div');
    footer.style.cssText = [
      'padding: 3px 12px 7px',
      'display: flex', 'justify-content: space-between', 'align-items: center',
    ].join('; ');
    const rarBadge = document.createElement('span');
    rarBadge.style.cssText = `font-size: 11px; font-weight: bold; color: ${rarity.color};`;
    rarBadge.textContent = rarity.label;
    footer.appendChild(rarBadge);
    if (item.tier) {
      const tierEl = document.createElement('span');
      tierEl.style.cssText = 'font-size: 10px; color: #9EA3AC; letter-spacing: 0.05em;';
      tierEl.textContent = `Tier ${item.tier}`;
      footer.appendChild(tierEl);
    }
    t.appendChild(footer);

    // ── Special effect ──
    if (special) {
      const spEl = document.createElement('div');
      spEl.style.cssText = [
        'padding: 5px 12px 8px',
        `border-top: 1px solid ${rarity.color}33`,
        'background: rgba(30,255,0,0.04)',
        'font-size: 11px', 'color: #1eff00', 'font-style: italic',
        'line-height: 1.4',
      ].join('; ');
      spEl.textContent = '✦ ' + special;
      t.appendChild(spEl);
    }
  }

  static hide(): void {
    if (this.tooltipEl) this.tooltipEl.style.display = 'none';
  }

  // ─── CSS ──────────────────────────────────────────────────

  private static injectStyles(): void {
    if (document.getElementById('mc-item-tooltip-styles')) return;
    const s = document.createElement('style');
    s.id = 'mc-item-tooltip-styles';
    s.textContent = `
      /* Rarity slot classes — importierbar überall */
      .mc-item-slot-common    { border-color: #9d9d9d !important; }
      .mc-item-slot-uncommon  { border-color: #1eff00 !important; box-shadow: 0 0  8px rgba(30,255,0,0.40)  !important; }
      .mc-item-slot-rare      { border-color: #0070dd !important; box-shadow: 0 0 10px rgba(0,112,221,0.50) !important; }
      .mc-item-slot-epic      { border-color: #a335ee !important; box-shadow: 0 0 12px rgba(163,53,238,0.60) !important; }
      .mc-item-slot-legendary { border-color: #ff8000 !important; box-shadow: 0 0 16px rgba(255,128,0,0.70) !important; }

      .mc-rarity-common    { color: #9d9d9d; }
      .mc-rarity-uncommon  { color: #1eff00; }
      .mc-rarity-rare      { color: #0070dd; }
      .mc-rarity-epic      { color: #a335ee; }
      .mc-rarity-legendary { color: #ff8000; }
    `;
    document.head.appendChild(s);
  }
}
