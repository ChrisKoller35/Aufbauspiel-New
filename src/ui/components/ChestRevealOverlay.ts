// ─── Magic City – Chest Reveal Overlay ──────────────────────────
// Shows treasure chest video + animated loot reveal after expedition.
// ────────────────────────────────────────────────────────────────

import { itemEigenschaften } from '../../data/specialEffects';
import { ITEM_DEFS, getItemSpriteKey, isBauplan } from '../../data/items';
import { BUILDING_DEFS } from '../../data/buildings';

/** Inline-Styles für die Bauplan-Hervorhebung (pergamentfarben, volle Breite, Glow). */
const BAUPLAN_CARD_STYLE = 'grid-column:1/-1;border:2px solid #f59e0b;'
  + 'background:linear-gradient(135deg,rgba(245,158,11,.22),rgba(120,72,20,.25));'
  + 'box-shadow:0 0 14px rgba(245,158,11,.45);padding:10px 12px;';

interface LootEntry {
  itemId: string;
  qty: number;
}

/**
 * Opens a fullscreen chest reveal: video plays → loot items fade in → user collects.
 * Returns a Promise that resolves when user clicks "Einsammeln".
 * hinweise: extra line per item, e.g. the set of a set piece («🐺 Rudel des Waldpfads · Teil 2 von 3»).
 * untertitel: line under «Schatztruhe» instead of the expedition default (e.g. the weekly Ruhmestruhe).
 */
export function showChestReveal(
  loot: Record<string, number>,
  goldEarned: number,
  hinweise: Record<string, string> = {},
  untertitel?: string,
): Promise<void> {
  return new Promise(resolve => {
    // Merge gold into loot entries for display
    const entries: LootEntry[] = [];
    if (goldEarned > 0) entries.push({ itemId: 'gold', qty: goldEarned });
    for (const [id, qty] of Object.entries(loot)) {
      if (qty > 0) entries.push({ itemId: id, qty });
    }

    // Sort: bauplan → set piece → gold → gear → consumable → rest
    entries.sort((a, b) => {
      const order = (e: LootEntry) => {
        if (isBauplan(e.itemId)) return -2;
        if (ITEM_DEFS[e.itemId]?.tags.includes('set')) return -1;
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
      <div class="chest-subtitle">${entries.length === 0 ? 'Die Truhe ist leer.'
        : untertitel ? untertitel
        : entries.some(e => isBauplan(e.itemId)) ? '📜 Ein Bauplan ist in der Beute!'
        : entries.some(e => ITEM_DEFS[e.itemId]?.tags.includes('set')) ? '✦ Ein Set-Teil ist in der Beute!'
        : '✨ Beute dieser Expedition!'}</div>
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
        if (def.tags.includes('set')) rarCls = 'rar-set';
        else if (def.tags.includes('legendary')) rarCls = 'rar-legendary';
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
        if (sb.spd) parts.push(`${sb.spd > 0 ? '+' : '−'}${Math.abs(sb.spd)} SPD`);
        if (sb.critChance) parts.push(`+${Math.round(sb.critChance * 100)} % CRIT`);
        if (parts.length) statsHtml = `<div class="chest-item-stats">${parts.join(' ')}</div>`;
      }
      // Eigenschaften (Doppelschlag, Reflexion …) mit Erklärung beim Darüberfahren
      const eigenschaften = isGear && def ? itemEigenschaften(def.tags) : [];
      if (eigenschaften.length) {
        statsHtml += eigenschaften
          .map(e => `<div class="chest-item-eigenschaft" title="${e.description}">✦ ${e.name}</div>`).join('');
      }

      const card = document.createElement('div');
      card.className = `chest-item chest-item-anim ${rarCls}${isGear ? ' chest-item-gear' : ''}`;
      card.style.animationDelay = `${idx * 80}ms`;

      // Bauplan: hervorgehoben, volle Breite, mit freigeschaltetem Gebäude
      if (isBauplan(entry.itemId)) {
        const building = def?.bauplanFuer ? BUILDING_DEFS[def.bauplanFuer] : undefined;
        card.classList.add('chest-item-bauplan');
        card.style.cssText += BAUPLAN_CARD_STYLE;
        card.innerHTML = `
          <span class="chest-item-ico" style="font-size:2rem;line-height:36px;text-align:center">📜</span>
          <div class="chest-item-info">
            <span style="font-size:0.68rem;font-weight:700;letter-spacing:.08em;color:#fbbf24">NEUER BAUPLAN!</span>
            <span class="chest-item-name" style="color:#fde68a">${name}</span>
            ${building ? `<span class="chest-item-stats" style="color:#fcd34d">Schaltet frei: ${building.name}</span>` : ''}
          </div>
        `;
        grid.appendChild(card);
        return;
      }

      const hinweis = hinweise[entry.itemId];
      if (rarCls === 'rar-set') card.classList.add('chest-item-set');
      card.innerHTML = `
        <img src="assets/sprites/final/${spriteKey}.png" class="${isGear ? 'chest-item-bg' : 'chest-item-ico'}"
             onerror="this.style.display='none'">
        <div class="chest-item-info">
          ${rarCls === 'rar-set' ? '<span class="chest-item-setlabel">✦ SET-TEIL</span>' : ''}
          <span class="chest-item-name ${rarCls}">${name}</span>
          ${hinweis ? `<span class="chest-item-hinweis">${hinweis}</span>` : ''}
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
