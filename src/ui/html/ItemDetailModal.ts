// ============================================================
// Magic City – ItemDetailModal
// Große Klick-Vorschau für Items: Artwork, Rarity, Stats, Aktionen.
// Aufruf: ItemDetailModal.show(itemId, opts?)
// ============================================================

import { ITEM_DEFS } from '../../data/items';
import {
  getItemRarity, getStatLabel, formatStatValue,
  getSpecialEffectText, getSlotLabel, getWeaponTypeLabel,
} from './ItemRarity';

const STAT_COLORS: Record<string, string> = {
  atk: '#E06030', def: '#3A8AC8', hp: '#4CAF78', spd: '#D4B800', critChance: '#E8C34A',
};

export interface ItemDetailOptions {
  onEquip?:   () => void;
  onUnequip?: () => void;
  isEquipped?: boolean;
}

export class ItemDetailModal {
  private static overlay: HTMLElement | null = null;
  private static initialized = false;

  // ─── Init ─────────────────────────────────────────────────

  static init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'mc-item-detail-overlay';
    overlay.style.cssText = [
      'position: fixed', 'inset: 0',
      'background: rgba(0,0,0,0.78)',
      'z-index: 100000',
      'display: none',
      'align-items: center', 'justify-content: center',
      'backdrop-filter: blur(4px)',
    ].join('; ');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });
    document.body.appendChild(overlay);
    this.overlay = overlay;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay?.style.display !== 'none') this.hide();
    });
  }

  // ─── Public API ───────────────────────────────────────────

  static show(itemId: string, opts: ItemDetailOptions = {}): void {
    if (!this.overlay) return;
    const item = ITEM_DEFS[itemId];
    if (!item) return;

    const rarity = getItemRarity(item);
    const isGear = item.type === 'gear';
    const sb = item.statBonuses ?? {};
    const special = getSpecialEffectText(item.tags ?? []);
    const slotLbl = item.gearSlot ? getSlotLabel(item.gearSlot) : '';
    const wepLbl = getWeaponTypeLabel(item.weaponSlotType);
    const typeStr = [slotLbl, wepLbl].filter(Boolean).join(' · ');

    this.overlay.innerHTML = '';
    this.overlay.style.display = 'flex';

    // ── Modal ──────────────────────────────────────────────
    const modal = document.createElement('div');
    modal.className = 'mc-item-detail-modal';
    modal.style.cssText = [
      'position: relative',
      'width: 380px',
      'border-radius: 12px',
      'overflow: hidden',
      `border: 2px solid ${rarity.color}`,
      `box-shadow: 0 0 60px ${rarity.glow}, 0 0 120px ${rarity.glow}`,
      'font-family: var(--mc-font, "Segoe UI", sans-serif)',
      'background: #0d0f14',
    ].join('; ');
    modal.addEventListener('click', (e) => e.stopPropagation());

    // ── Header mit Name ────────────────────────────────────
    const header = document.createElement('div');
    header.style.cssText = [
      'padding: 16px 20px 12px',
      `background: linear-gradient(135deg, rgba(0,0,0,0.5) 0%, ${rarity.bgColor} 100%)`,
      `border-bottom: 1px solid ${rarity.color}44`,
      'display: flex', 'justify-content: space-between', 'align-items: center',
    ].join('; ');
    const nameEl = document.createElement('div');
    nameEl.style.cssText = `font-size: 20px; font-weight: bold; color: ${rarity.color}; letter-spacing: 0.02em;`;
    nameEl.textContent = item.name;
    header.appendChild(nameEl);

    // X-Button im Header
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = [
      'background: rgba(0,0,0,0.45)', 'border: 1px solid rgba(255,255,255,0.2)',
      'color: #aaa', 'font-size: 16px', 'cursor: pointer',
      'line-height: 1', 'padding: 5px 10px',
      'border-radius: 5px', 'flex-shrink: 0',
      'transition: background 0.15s, color 0.15s',
    ].join('; ');
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(0,0,0,0.75)'; closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'rgba(0,0,0,0.45)'; closeBtn.style.color = '#aaa'; });
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // ── Body: Bild + Stats ─────────────────────────────────
    const body = document.createElement('div');
    body.style.cssText = 'display: flex; gap: 20px; padding: 20px 20px 16px;';

    // Großes Icon mit Glow
    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = [
      'width: 128px', 'height: 128px', 'flex-shrink: 0',
      'border-radius: 8px',
      `background: radial-gradient(circle at center, ${rarity.bgColor.replace('0.0', '0.25').replace('0.09', '0.3')} 0%, rgba(0,0,0,0.6) 75%)`,
      `border: 2px solid ${rarity.color}55`,
      `box-shadow: inset 0 0 30px ${rarity.glow}`,
      'display: flex', 'align-items: center', 'justify-content: center',
    ].join('; ');
    const img = document.createElement('img');
    img.src = `/assets/sprites/final/ITEM_${itemId.toUpperCase()}.png`;
    img.width = 108;
    img.height = 108;
    img.style.cssText = `object-fit: contain; image-rendering: auto; filter: drop-shadow(0 0 14px ${rarity.glow});`;
    img.onerror = () => { img.style.display = 'none'; };
    imgWrap.appendChild(img);
    body.appendChild(imgWrap);

    // Stats-Spalte
    const statsCol = document.createElement('div');
    statsCol.style.cssText = 'flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; justify-content: center;';

    if (typeStr) {
      const typeEl = document.createElement('div');
      typeEl.style.cssText = 'font-size: 13px; color: #9EA3AC; margin-bottom: 4px;';
      typeEl.textContent = typeStr;
      statsCol.appendChild(typeEl);
    }

    for (const [key, val] of Object.entries(sb)) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 2px 0;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size: 15px; color: #9EA3AC;';
      lbl.textContent = getStatLabel(key);
      const valEl = document.createElement('span');
      valEl.style.cssText = `font-size: 15px; font-weight: bold; color: ${STAT_COLORS[key] ?? '#F2F2F2'};`;
      valEl.textContent = formatStatValue(key, val as number);
      row.appendChild(lbl);
      row.appendChild(valEl);
      statsCol.appendChild(row);
    }
    // Air Bonus (Abyssal-Set)
    const airBonus = (item as any).airBonus as number | undefined;
    if (airBonus) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 2px 0;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size: 15px; color: #90CAF9;';
      lbl.textContent = '🫁 Luftschild';
      const valEl = document.createElement('span');
      valEl.style.cssText = 'font-size: 15px; font-weight: bold; color: #64B5F6;';
      valEl.textContent = `+${airBonus}`;
      row.appendChild(lbl);
      row.appendChild(valEl);
      statsCol.appendChild(row);
    }
    body.appendChild(statsCol);
    modal.appendChild(body);

    // ── Rarity + Tier Footer ───────────────────────────────
    const footer = document.createElement('div');
    footer.style.cssText = [
      'padding: 6px 20px 10px',
      'display: flex', 'justify-content: space-between', 'align-items: center',
      `border-top: 1px solid ${rarity.color}22`,
    ].join('; ');
    const rarBadge = document.createElement('span');
    rarBadge.style.cssText = `font-size: 13px; font-weight: bold; color: ${rarity.color};`;
    rarBadge.textContent = rarity.label;
    footer.appendChild(rarBadge);
    if (item.tier) {
      const tierEl = document.createElement('span');
      tierEl.style.cssText = 'font-size: 12px; color: #9EA3AC; letter-spacing: 0.05em;';
      tierEl.textContent = `Tier ${item.tier}`;
      footer.appendChild(tierEl);
    }
    modal.appendChild(footer);

    // ── Spezialeffekt ──────────────────────────────────────
    if (special) {
      const spEl = document.createElement('div');
      spEl.style.cssText = [
        'padding: 8px 20px 12px',
        `border-top: 1px solid ${rarity.color}33`,
        'background: rgba(30,255,0,0.04)',
        'font-size: 13px', 'color: #1eff00', 'font-style: italic',
        'line-height: 1.5',
      ].join('; ');
      spEl.textContent = '✦ ' + special;
      modal.appendChild(spEl);
    }

    // ── Button-Leiste ──────────────────────────────────────
    const btnStrip = document.createElement('div');
    btnStrip.style.cssText = [
      'padding: 12px 20px 16px',
      'display: flex', 'gap: 10px',
      `border-top: 1px solid rgba(255,255,255,0.08)`,
    ].join('; ');

    if (isGear && opts.isEquipped && opts.onUnequip) {
      const unequipBtn = this.makeBtn('Abziehen', 'rgba(180,40,40,0.75)', '#c83c3c', '#FF7070');
      unequipBtn.addEventListener('click', () => { opts.onUnequip!(); this.hide(); });
      btnStrip.appendChild(unequipBtn);
    } else if (isGear && !opts.isEquipped && opts.onEquip) {
      const equipBtn = this.makeBtn('Ausrüsten', `${rarity.bgColor.replace(/[\d.]+\)$/, '0.75)')}`, rarity.color, rarity.color);
      equipBtn.addEventListener('click', () => { opts.onEquip!(); this.hide(); });
      btnStrip.appendChild(equipBtn);
    }

    const closeAction = this.makeBtn('Schließen', 'rgba(30,30,30,0.75)', '#555', '#aaa');
    closeAction.style.flex = isGear && (opts.onEquip || opts.onUnequip) ? '0 0 100px' : '1';
    closeAction.addEventListener('click', () => this.hide());
    btnStrip.appendChild(closeAction);

    modal.appendChild(btnStrip);
    this.overlay.appendChild(modal);
  }

  static hide(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.overlay.innerHTML = '';
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  private static makeBtn(label: string, bg: string, border: string, color: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = [
      'flex: 1', 'padding: 9px 12px',
      `background: ${bg}`, `border: 1px solid ${border}`,
      `color: ${color}`, 'border-radius: 6px', 'cursor: pointer',
      'font-size: 13px', 'font-weight: bold',
      'transition: filter 0.15s',
    ].join('; ');
    btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(1.35)');
    btn.addEventListener('mouseleave', () => btn.style.filter = '');
    return btn;
  }

  private static injectStyles(): void {
    if (document.getElementById('mc-item-detail-styles')) return;
    const s = document.createElement('style');
    s.id = 'mc-item-detail-styles';
    s.textContent = `
      .mc-item-detail-modal {
        animation: mc-detail-in 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
      }
      @keyframes mc-detail-in {
        from { opacity: 0; transform: scale(0.82) translateY(12px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
    `;
    document.head.appendChild(s);
  }
}
