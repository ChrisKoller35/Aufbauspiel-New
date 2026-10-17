// ─── Magic City – Chest Reveal Overlay ──────────────────────────
// Shows treasure chest video + animated loot reveal after expedition.
// ────────────────────────────────────────────────────────────────

import { ITEM_DEFS, getItemSpriteKey } from '../../data/items';

interface LootEntry {
  itemId: string;
  qty: number;
}

/**
 * Opens a fullscreen chest reveal: video plays → loot items fade in → user collects.
 * Returns a Promise that resolves when user clicks "Einsammeln".
 */
export function showChestReveal(
  loot: Record<string, number>,
  goldEarned: number,
): Promise<void> {
  return new Promise(resolve => {
    // Merge gold into loot entries for display
    const entries: LootEntry[] = [];
    if (goldEarned > 0) entries.push({ itemId: 'gold', qty: goldEarned });
    for (const [id, qty] of Object.entries(loot)) {
      if (qty > 0) entries.push({ itemId: id, qty });
    }

    // Sort: gold → gear → consumable → rest
    entries.sort((a, b) => {
      const order = (e: LootEntry) => {
        if (e.itemId === 'gold') return 0;
        const def = ITEM_DEFS[e.itemId];
        if (!def) return 4;
        if (def.type === 'gear') return 1;
        if (def.type === 'consumable') return 2;
        return 3;
      };
      return order(a) - order(b);
    });

    // ── Build overlay ──
    const overlay = document.createElement('div');
    overlay.className = 'chest-ov';

    // ── Phase 1: Video ──
    const videoWrap = document.createElement('div');
    videoWrap.className = 'chest-video-wrap';

    const video = document.createElement('video');
    video.src = 'assets/video/truheopen.mp4';
    video.playsInline = true;
    video.preload = 'auto';
    video.className = 'chest-video';

    const skipHint = document.createElement('div');
    skipHint.className = 'chest-skip';
    skipHint.textContent = 'Klicken zum Überspringen';

    videoWrap.appendChild(video);
    videoWrap.appendChild(skipHint);

    // ── Phase 2: Loot panel ──
    const lootPanel = document.createElement('div');
    lootPanel.className = 'chest-loot-panel';
    lootPanel.style.display = 'none';

    // Header with chest icon
    const header = document.createElement('div');
    header.className = 'chest-loot-header';
    header.innerHTML = `
      <img src="assets/sprites/final/ISO_TREASURE_CHEST_V2.png" class="chest-icon chest-bounce"
           onerror="this.style.display='none'">
      <div class="chest-title">Schatztruhe</div>
      <div class="chest-subtitle">${entries.length === 0 ? 'Die Truhe ist leer.' : '✨ Beute dieser Expedition!'}</div>
    `;

    // Loot grid
    const grid = document.createElement('div');
    grid.className = 'chest-loot-grid';

    entries.forEach((entry, idx) => {
      const isGold = entry.itemId === 'gold';
      const def = isGold ? null : ITEM_DEFS[entry.itemId];
      const isGear = def?.type === 'gear';
      const name = isGold ? 'Gold' : (def?.name ?? entry.itemId);
      const spriteKey = isGold ? 'ICON_GOLD' : getItemSpriteKey(entry.itemId);

      // Get rarity class
      let rarCls = '';
      if (def?.tags) {
        if (def.tags.includes('legendary')) rarCls = 'rar-legendary';
        else if (def.tags.includes('epic')) rarCls = 'rar-epic';
        else if (def.tags.includes('rare')) rarCls = 'rar-rare';
        else if (def.tags.includes('uncommon')) rarCls = 'rar-uncommon';
      }

      // Stats line for gear
      let statsHtml = '';
      if (isGear && def?.statBonuses) {
        const parts: string[] = [];
        const sb = def.statBonuses;
        if (sb.atk) parts.push(`+${sb.atk} ATK`);
        if (sb.def) parts.push(`+${sb.def} DEF`);
        if (sb.hp) parts.push(`+${sb.hp} HP`);
        if (sb.spd) parts.push(`+${sb.spd} SPD`);
        if (parts.length) statsHtml = `<div class="chest-item-stats">${parts.join(' ')}</div>`;
      }

      const card = document.createElement('div');
      card.className = `chest-item chest-item-anim ${rarCls}${isGear ? ' chest-item-gear' : ''}`;
      card.style.animationDelay = `${idx * 80}ms`;
      card.innerHTML = `
        <img src="assets/sprites/final/${spriteKey}.png" class="${isGear ? 'chest-item-bg' : 'chest-item-ico'}"
             onerror="this.style.display='none'">
        <div class="chest-item-info">
          <span class="chest-item-name ${rarCls}">${name}</span>
          ${statsHtml}
          <span class="chest-item-qty">${isGold ? '💰' : '×'}${entry.qty}</span>
        </div>
      `;
      grid.appendChild(card);
    });

    // Collect button
    const footer = document.createElement('div');
    footer.className = 'chest-loot-footer';
    const collectBtn = document.createElement('button');
    collectBtn.className = 'chest-collect-btn';
    collectBtn.textContent = '✨ Einsammeln';
    footer.appendChild(collectBtn);

    lootPanel.appendChild(header);
    lootPanel.appendChild(grid);
    lootPanel.appendChild(footer);

    overlay.appendChild(videoWrap);
    overlay.appendChild(lootPanel);
    document.body.appendChild(overlay);

    // Force reflow then show
    requestAnimationFrame(() => overlay.classList.add('on'));

    // ── Event handlers ──
    function showLoot(): void {
      video.pause();
      videoWrap.style.display = 'none';
      lootPanel.style.display = 'flex';
    }

    function collect(): void {
      overlay.classList.remove('on');
      setTimeout(() => overlay.remove(), 300);
      resolve();
    }

    // Video end → show loot
    video.addEventListener('ended', showLoot);
    // Click to skip video
    videoWrap.addEventListener('click', showLoot);
    // Collect button
    collectBtn.addEventListener('click', collect);

    // Start video
    video.play().catch(() => {
      // Autoplay blocked → skip to loot immediately
      showLoot();
    });
  });
}
