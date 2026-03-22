// ─── Magic City – GuildInventoryTab ──────────────────────────────────────────
// Renders the Inventory tab of the Guild UI.
// ─────────────────────────────────────────────────────────────────────────────

import { HTMLPanel } from '../HTMLPanel';
import { ItemTooltip } from '../ItemTooltip';
import { ItemDetailModal } from '../ItemDetailModal';
import { GameState } from '../../../models/GameState';
import { ITEM_DEFS } from '../../../data/items';
import { makeInfoText, makeDivider, makeSectionHeader } from './GuildTabHelpers';

export class GuildInventoryTab {
  render(container: HTMLElement, state: GameState): void {
    const c = container;
    c.appendChild(makeInfoText('Alle gesammelten Gegenstaende und Vorraete.'));

    // ── Gear section ──
    const gearItems = Object.entries(state.globalStock)
      .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.type === 'gear')
      .map(([id, qty]) => ({ item: ITEM_DEFS[id], qty }))
      .filter(x => x.item != null);

    c.appendChild(makeSectionHeader(`⚔ AUSRUESTUNG  (${gearItems.length} Typen)`));

    if (gearItems.length === 0) {
      c.appendChild(makeInfoText('Noch keine Ausruestung gefunden. Starte Expeditionen!', 'mc-label-dim'));
    } else {
      const grid = HTMLPanel.el('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-bottom: 16px;';

      for (const { item, qty } of gearItems) {
        const tierTag  = item.tags.find((t: string) => t.startsWith('tier'));
        const tierNum  = tierTag ? parseInt(tierTag.replace('tier', ''), 10) : 0;
        let tierColor  = 'var(--mc-light)';
        if (tierNum >= 4)      tierColor = 'var(--mc-gold-bright)';
        else if (tierNum >= 3) tierColor = 'var(--mc-loot)';
        else if (tierNum >= 2) tierColor = 'var(--mc-info)';

        const card = HTMLPanel.el('div', 'mc-card');
        card.style.padding = '8px 10px';

        const topRow = HTMLPanel.el('div');
        topRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;';
        const gearIcon = HTMLPanel.icon(`ITEM_${item.id.toUpperCase()}`, 36);
        gearIcon.style.cssText = 'border-radius: 4px; background: var(--mc-panel-bg-darker); flex-shrink: 0;';
        topRow.appendChild(gearIcon);
        const nameEl = HTMLPanel.el('span', 'mc-text-md mc-bold');
        nameEl.style.cssText = `color: ${tierColor}; flex: 1;`;
        nameEl.textContent = item.name;
        const qtyEl = HTMLPanel.el('span', 'mc-bold mc-label-gold mc-text-md');
        qtyEl.textContent = `×${qty}`;
        topRow.appendChild(nameEl);
        topRow.appendChild(qtyEl);
        card.appendChild(topRow);

        const slotStr = item.gearSlot === 'mainHand' ? '⚔ Waffe'
          : item.gearSlot === 'offHand' ? '🛡 Nebenhand'
          : item.gearSlot === 'armor' ? '🛡 Ruestung'
          : '💍 Schmuck';
        const slotEl = HTMLPanel.el('div', 'mc-text-sm mc-label-dim');
        slotEl.textContent = slotStr;
        card.appendChild(slotEl);

        const bonusStr = item.statBonuses
          ? Object.entries(item.statBonuses).map(([k, v]) => `${k.toUpperCase()}+${v}`).join('  ')
          : '–';
        const bonusEl = HTMLPanel.el('div', 'mc-text-sm mc-label-muted');
        bonusEl.textContent = bonusStr;
        card.appendChild(bonusEl);

        const footRow = HTMLPanel.el('div');
        footRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: 4px;';
        const tierBadge = HTMLPanel.el('span', 'mc-badge');
        tierBadge.style.background = 'var(--mc-navy-card)';
        tierBadge.style.color = tierColor;
        tierBadge.textContent = tierNum > 0 ? `T${tierNum}` : '–';
        footRow.appendChild(tierBadge);

        const equippedBy = state.fighters
          .filter(f => Object.values(f.gear).includes(item.id))
          .map(f => f.name);
        if (equippedBy.length > 0) {
          const eq = HTMLPanel.el('span', 'mc-text-sm mc-label-heal');
          eq.textContent = equippedBy.join(', ');
          footRow.appendChild(eq);
        }
        card.appendChild(footRow);

        card.style.cursor = 'pointer';
        card.addEventListener('click', () => ItemDetailModal.show(item.id));
        ItemTooltip.attach(card, item.id);

        grid.appendChild(card);
      }
      c.appendChild(grid);
    }

    c.appendChild(makeDivider());

    // ── Consumables section ──
    const consumables = Object.entries(state.globalStock)
      .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.type === 'consumable')
      .map(([id, qty]) => ({ item: ITEM_DEFS[id], qty }))
      .filter(x => x.item != null);

    c.appendChild(makeSectionHeader(`🍞 PROVIANT  (${consumables.length} Typen)`));

    if (consumables.length === 0) {
      c.appendChild(makeInfoText('Kein Proviant vorhanden. Baue eine Baeckerei oder Kraeuter garten!', 'mc-label-dim'));
    } else {
      const list = HTMLPanel.el('div');
      list.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

      for (const { item, qty } of consumables) {
        const row = HTMLPanel.el('div', 'mc-card');
        row.style.cssText = 'padding: 6px 12px; display: flex; align-items: center; gap: 12px;';

        const icon = HTMLPanel.icon(`ITEM_${item.id.toUpperCase()}`, 28);
        row.appendChild(icon);

        const infoCol = HTMLPanel.el('div');
        infoCol.style.flex = '1';

        const nameEl = HTMLPanel.el('div', 'mc-bold mc-text-md');
        nameEl.textContent = item.name;
        infoCol.appendChild(nameEl);

        let effectStr = '';
        if (item.healAmount)  effectStr = `Heilt ${item.healAmount} HP`;
        if (item.buffEffect)  effectStr = `${item.buffEffect.stat.toUpperCase()}+${item.buffEffect.value} fuer ${item.buffEffect.durationRooms} Raeume`;
        if (effectStr) {
          const effectEl = HTMLPanel.el('div', 'mc-text-sm mc-label-heal');
          effectEl.textContent = effectStr;
          infoCol.appendChild(effectEl);
        }
        row.appendChild(infoCol);

        const qtyEl = HTMLPanel.el('span', 'mc-bold mc-label-gold mc-text-lg');
        qtyEl.textContent = `×${qty}`;
        row.appendChild(qtyEl);

        list.appendChild(row);
      }
      c.appendChild(list);
    }
  }
}
