// ============================================================
// Magic City – HTMLChestUI
// Schatztruhe: Loot-Reveal-Panel nach jeder Expedition.
// Spieler öffnet die Truhe und sieht was er gefunden hat.
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { ITEM_DEFS } from '../../data/items';
import { getItemRarity, getStatLabel, formatStatValue } from './ItemRarity';
import { ItemTooltip } from './ItemTooltip';
import { ItemDetailModal } from './ItemDetailModal';

export class HTMLChestUI extends HTMLPanel {
  public onClose?: () => void;
  public onCollect?: (state: GameState) => void;

  private contentEl!: HTMLElement;
  private chestIconEl!: HTMLElement;
  private _state: GameState | null = null;

  // Video overlay elements
  private videoOverlay!: HTMLElement;
  private videoEl!: HTMLVideoElement;

  constructor() {
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    root.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'transform: translate(-50%, -50%)',
      'width: 480px',
      'max-height: 560px',
      'display: flex',
      'flex-direction: column',
      'pointer-events: auto',
      'overflow: hidden',
    ].join('; ');
    root.setAttribute('hidden', '');
    super(root);
    this.injectStyles();
    this.buildVideoOverlay();
    this.buildShell();
  }

  // ─── Public API ──────────────────────────────────────────

  /** Also returns true while the video overlay is playing. */
  override isVisible(): boolean {
    return !this.el.hasAttribute('hidden') || !this.videoOverlay.hasAttribute('hidden');
  }

  open(state: GameState): void {
    this._state = state;
    this.render(state);
    // Show video first, then reveal loot panel after it ends
    this.playVideoThenOpen();
  }

  // ─── Video Overlay ───────────────────────────────────────

  private buildVideoOverlay(): void {
    this.videoOverlay = document.createElement('div');
    this.videoOverlay.style.cssText = [
      'position: fixed',
      'inset: 0',
      'background: rgba(0,0,0,0.92)',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'z-index: 9999',
      'pointer-events: auto',
      'cursor: pointer',
    ].join('; ');
    this.videoOverlay.setAttribute('hidden', '');

    this.videoEl = document.createElement('video');
    this.videoEl.src = '/assets/video/truheopen.mp4';
    this.videoEl.style.cssText = [
      'max-width: min(640px, 90vw)',
      'max-height: 90vh',
      'border-radius: 8px',
      'box-shadow: 0 0 60px rgba(255,180,0,0.4)',
      'pointer-events: none',
    ].join('; ');
    this.videoEl.playsInline = true;
    this.videoEl.preload = 'auto';

    const skipHint = document.createElement('div');
    skipHint.style.cssText = [
      'position: absolute',
      'bottom: 24px',
      'right: 32px',
      'color: rgba(255,255,255,0.4)',
      'font-size: 11px',
      'font-family: var(--mc-font, monospace)',
      'pointer-events: none',
    ].join('; ');
    skipHint.textContent = 'Klicken zum Überspringen';

    this.videoOverlay.appendChild(this.videoEl);
    this.videoOverlay.appendChild(skipHint);
    document.body.appendChild(this.videoOverlay);

    // Click anywhere to skip
    this.videoOverlay.addEventListener('click', () => this.onVideoEnd());
    // Auto-advance when video finishes
    this.videoEl.addEventListener('ended', () => this.onVideoEnd());
  }

  private playVideoThenOpen(): void {
    this.videoOverlay.removeAttribute('hidden');
    this.videoEl.currentTime = 0;
    this.videoEl.play().catch(() => {
      // Autoplay blocked → skip straight to loot
      this.onVideoEnd();
    });
  }

  private onVideoEnd(): void {
    this.videoEl.pause();
    this.videoOverlay.setAttribute('hidden', '');
    // Now show the loot panel
    this.el.removeAttribute('hidden');
    this.chestIconEl.classList.remove('chest-bounce');
    void this.chestIconEl.offsetWidth;
    this.chestIconEl.classList.add('chest-bounce');
  }

  // ─── Styles (once) ───────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById('mc-chest-styles')) return;
    const style = document.createElement('style');
    style.id = 'mc-chest-styles';
    style.textContent = `
      @keyframes chestBounce {
        0%   { transform: scale(1) rotate(0deg); }
        15%  { transform: scale(1.25) rotate(-8deg); }
        30%  { transform: scale(1.3) rotate(6deg); }
        45%  { transform: scale(1.2) rotate(-4deg); }
        60%  { transform: scale(1.25) rotate(3deg); }
        75%  { transform: scale(1.15) rotate(-2deg); }
        90%  { transform: scale(1.2) rotate(1deg); }
        100% { transform: scale(1.18) rotate(0deg); }
      }
      @keyframes itemFadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .chest-bounce { animation: chestBounce 0.7s ease forwards; }
      .chest-item-anim { animation: itemFadeIn 0.35s ease both; }
    `;
    document.head.appendChild(style);
  }

  // ─── Build Shell (once) ──────────────────────────────────

  private buildShell(): void {
    // Header
    const header = HTMLPanel.el('div', 'mc-panel-header', 'Schatztruhe');
    this.el.appendChild(header);
    this.el.appendChild(HTMLPanel.closeBtn(() => {
      this.hide();
      this.onClose?.();
    }));

    // Chest icon area
    const iconArea = document.createElement('div');
    iconArea.style.cssText = [
      'display: flex',
      'flex-direction: column',
      'align-items: center',
      'padding: 16px 0 8px',
      'background: linear-gradient(180deg, rgba(255,180,0,0.06) 0%, transparent 100%)',
    ].join('; ');

    this.chestIconEl = document.createElement('img') as unknown as HTMLDivElement;
    (this.chestIconEl as unknown as HTMLImageElement).src = '/assets/sprites/final/ISO_TREASURE_CHEST_V2.png';
    this.chestIconEl.style.cssText = [
      'width: 96px',
      'height: 96px',
      'object-fit: contain',
      'image-rendering: auto',
      'filter: drop-shadow(0 0 10px rgba(255,180,0,0.7))',
      'transform-origin: center bottom',
    ].join('; ');

    const subtitle = document.createElement('div');
    subtitle.id = 'mc-chest-subtitle';
    subtitle.style.cssText = 'font-size:11px; color:var(--mc-dim); margin-top:6px; text-align:center;';

    iconArea.appendChild(this.chestIconEl);
    iconArea.appendChild(subtitle);
    this.el.appendChild(iconArea);

    // Content scroll area
    this.contentEl = document.createElement('div');
    this.contentEl.style.cssText = [
      'flex: 1',
      'overflow-y: auto',
      'padding: 8px 16px 4px',
    ].join('; ');
    this.el.appendChild(this.contentEl);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = [
      'padding: 10px 16px 12px',
      'border-top: 1px solid var(--mc-border)',
      'display: flex',
      'gap: 8px',
      'justify-content: center',
    ].join('; ');

    const collectBtn = HTMLPanel.el('button', 'mc-btn mc-btn-primary');
    collectBtn.id = 'mc-chest-collect-btn';
    collectBtn.textContent = '✨ Alles einsammeln';
    collectBtn.style.cssText = 'padding: 8px 24px; font-size: 13px; font-weight: bold;';
    collectBtn.addEventListener('click', () => this.handleCollect());

    const closeBtn2 = HTMLPanel.el('button', 'mc-btn');
    closeBtn2.textContent = 'Schließen';
    closeBtn2.style.cssText = 'padding: 8px 16px; font-size: 13px;';
    closeBtn2.addEventListener('click', () => { this.hide(); this.onClose?.(); });

    footer.appendChild(collectBtn);
    footer.appendChild(closeBtn2);
    this.el.appendChild(footer);
  }

  // ─── Render ──────────────────────────────────────────────

  private render(state: GameState): void {
    const chest = state.pendingChestLoot ?? { items: {}, expeditionCount: 0 };
    const entries = Object.entries(chest.items).filter(([, qty]) => qty > 0);
    const isEmpty = entries.length === 0;

    // Subtitle
    const subtitle = document.getElementById('mc-chest-subtitle');
    if (subtitle) {
      if (isEmpty) {
        subtitle.textContent = 'Die Truhe ist leer.';
      } else if (chest.expeditionCount === 1) {
        subtitle.textContent = '✨ Beute von 1 Expedition!';
      } else {
        subtitle.textContent = `✨ Beute von ${chest.expeditionCount} Expeditionen!`;
      }
    }

    // Icon: dim when empty
    (this.chestIconEl as unknown as HTMLImageElement).style.filter = isEmpty
      ? 'drop-shadow(0 0 4px rgba(128,128,128,0.4)) grayscale(0.6) opacity(0.6)'
      : 'drop-shadow(0 0 12px rgba(255,180,0,0.8))';

    // Collect button state
    const collectBtn = document.getElementById('mc-chest-collect-btn') as HTMLButtonElement | null;
    if (collectBtn) {
      collectBtn.disabled = isEmpty;
      collectBtn.style.opacity = isEmpty ? '0.4' : '1';
    }

    this.contentEl.innerHTML = '';

    if (isEmpty) {
      const msg = HTMLPanel.el('p', undefined, 'Schick deine Helden auf Expedition um Beute zu sammeln!');
      msg.style.cssText = 'color:var(--mc-dim); text-align:center; padding:20px; font-style:italic; font-size:12px;';
      this.contentEl.appendChild(msg);
      return;
    }

    // Section label
    const label = HTMLPanel.el('div', undefined, 'Gefundene Beute:');
    label.style.cssText = 'font-size:11px; color:var(--mc-gold); font-weight:bold; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;';
    this.contentEl.appendChild(label);

    // Sort: gold first, then gear, then consumables, then resources
    const sorted = entries.sort(([a], [b]) => {
      const order = (id: string) => {
        if (id === 'gold') return 0;
        const def = ITEM_DEFS[id];
        if (!def) return 3;
        if (def.type === 'gear') return 1;
        if (def.type === 'consumable') return 2;
        return 3;
      };
      return order(a) - order(b);
    });

    // Loot grid
    const grid = document.createElement('div');
    grid.style.cssText = [
      'display: grid',
      'grid-template-columns: repeat(auto-fill, minmax(196px, 1fr))',
      'gap: 6px',
    ].join('; ');

    sorted.forEach(([itemId, qty], idx) => {
      grid.appendChild(this.buildItemCard(itemId, qty, idx));
    });

    this.contentEl.appendChild(grid);
  }

  private buildItemCard(itemId: string, qty: number, animIdx: number): HTMLElement {
    const isGold = itemId === 'gold';
    const itemDef = isGold ? null : ITEM_DEFS[itemId];
    const isGear  = itemDef?.type === 'gear';
    const rarity  = isGear && itemDef ? getItemRarity(itemDef) : null;
    const displayName = isGold ? 'Gold' : (itemDef?.name ?? itemId.replace(/_/g, ' '));

    const card = document.createElement('div');
    card.className = 'chest-item-anim';
    card.style.cssText = [
      'display: flex',
      'align-items: center',
      'gap: 10px',
      'border-radius: 6px',
      'padding: 8px 10px',
      `animation-delay: ${animIdx * 60}ms`,
      isGear && rarity
        ? `background: linear-gradient(135deg, #0d0f14 0%, ${rarity.bgColor} 100%); border: 1px solid ${rarity.color}; box-shadow: 0 0 10px ${rarity.glow}`
        : 'background: var(--mc-panel-bg); border: 1px solid var(--mc-border)',
    ].join('; ');

    // Icon area — bigger for gear
    const iconSize = isGear ? 52 : 28;
    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = [
      `width: ${iconSize}px`, `height: ${iconSize}px`,
      'flex-shrink: 0', 'display: flex', 'align-items: center', 'justify-content: center',
      'border-radius: 4px',
      isGear && rarity
        ? `background: radial-gradient(circle at center, ${rarity.bgColor.replace('0.0', '0.25').replace('0.09', '0.25')} 0%, rgba(0,0,0,0.5) 80%); border: 1px solid ${rarity.color}44`
        : 'background: var(--mc-panel-bg-darker)',
    ].join('; ');

    if (isGold) {
      iconWrap.appendChild(HTMLPanel.icon('ICON_GOLD', 28));
    } else {
      const spriteKey = `ITEM_${itemId.toUpperCase()}`;
      const img = HTMLPanel.icon(spriteKey, iconSize - 8);
      img.style.cssText = isGear && rarity
        ? `filter: drop-shadow(0 0 6px ${rarity.glow}); object-fit: contain;`
        : 'object-fit: contain;';
      img.onerror = () => { iconWrap.textContent = '◆'; };
      iconWrap.appendChild(img);
    }

    if (isGear && itemDef) {
      ItemTooltip.attach(card, itemId);
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => ItemDetailModal.show(itemId));
    }

    // Text area
    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'flex: 1; min-width: 0;';

    const nameEl = HTMLPanel.el('div', undefined, displayName);
    nameEl.style.cssText = [
      'font-size: 13px',
      'font-weight: bold',
      'white-space: nowrap', 'overflow: hidden', 'text-overflow: ellipsis',
      isGear && rarity ? `color: ${rarity.color}` : 'color: var(--mc-gold)',
    ].join('; ');

    const qtyEl = HTMLPanel.el('div');
    qtyEl.style.cssText = `font-size: 12px; margin-top: 2px; color: ${isGold ? 'var(--mc-gold)' : 'var(--mc-dim)'};`;
    qtyEl.textContent = `× ${qty}`;

    // Gear: kurze Stats-Zeile anzeigen
    if (isGear && itemDef?.statBonuses) {
      const sb = itemDef.statBonuses;
      const parts: string[] = [];
      if (sb.atk) parts.push(`+${sb.atk} ATK`);
      if (sb.def) parts.push(`+${sb.def} DEF`);
      if (sb.hp)  parts.push(`+${sb.hp} HP`);
      if (parts.length > 0) {
        const statsEl = HTMLPanel.el('div');
        statsEl.style.cssText = 'font-size: 11px; color: var(--mc-dim); margin-top: 2px;';
        statsEl.textContent = parts.join('  ');
        textWrap.appendChild(nameEl);
        textWrap.appendChild(statsEl);
      } else {
        textWrap.appendChild(nameEl);
        textWrap.appendChild(qtyEl);
      }
    } else {
      textWrap.appendChild(nameEl);
      textWrap.appendChild(qtyEl);
    }

    // Rarity badge (top-right) für Gear
    if (isGear && rarity) {
      const badge = document.createElement('div');
      badge.style.cssText = [
        'font-size: 10px', 'font-weight: bold',
        `color: ${rarity.color}`,
        'white-space: nowrap',
        'align-self: flex-start',
        'padding-top: 2px',
      ].join('; ');
      badge.textContent = rarity.label;
      card.appendChild(iconWrap);
      card.appendChild(textWrap);
      card.appendChild(badge);
    } else {
      card.appendChild(iconWrap);
      card.appendChild(textWrap);
    }

    return card;
  }

  // ─── Collect Action ──────────────────────────────────────

  private handleCollect(): void {
    if (!this._state) return;
    const chest = this._state.pendingChestLoot;
    if (!chest) return;

    for (const [itemId, qty] of Object.entries(chest.items)) {
      if (qty > 0) {
        this._state.globalStock[itemId] = (this._state.globalStock[itemId] ?? 0) + qty;
      }
    }

    this._state.pendingChestLoot = { items: {}, expeditionCount: 0 };
    this.onCollect?.(this._state);
    this.hide();
    this.onClose?.();
  }
}
