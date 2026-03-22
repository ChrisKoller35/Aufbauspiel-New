// ─── Magic City – GuildRosterTab ─────────────────────────────────────────────
// Renders the Roster tab of the Guild UI.
// ─────────────────────────────────────────────────────────────────────────────

import { HTMLPanel } from '../HTMLPanel';
import { getItemRarity } from '../ItemRarity';
import { ItemTooltip } from '../ItemTooltip';
import { ItemDetailModal } from '../ItemDetailModal';
import { GameState } from '../../../models/GameState';
import { GuildFighter } from '../../../models/GuildRoster';
import { CLASS_DEFS } from '../../../data/classes';
import { ITEM_DEFS } from '../../../data/items';
import { xpProgress, MAX_HERO_LEVEL } from '../../../systems/HeroProgression';
import { GuildTabContext } from './GuildTabContext';
import { makeInfoText, translateRole } from './GuildTabHelpers';

export class GuildRosterTab {
  private ctx: GuildTabContext;

  constructor(ctx: GuildTabContext) {
    this.ctx = ctx;
  }

  render(container: HTMLElement, state: GameState): void {
    const c = container;

    const headerCard = HTMLPanel.el('div', 'mc-card');
    headerCard.style.cssText = 'margin-bottom: 12px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;';
    const headerLeft = HTMLPanel.el('div');
    const headerTitle = HTMLPanel.el('div', 'mc-bold mc-text-lg mc-label-gold');
    headerTitle.textContent = `⚔ Dein Helden-Roster`;
    headerLeft.appendChild(headerTitle);
    const headerSub = HTMLPanel.el('div', 'mc-text-sm mc-label-dim');
    headerSub.textContent = state.fighters.length > 0
      ? `${state.fighters.length} Kaempfer bereit fuer Abenteuer`
      : 'Noch keine Kaempfer rekrutiert';
    headerLeft.appendChild(headerSub);
    headerCard.appendChild(headerLeft);

    if (state.fighters.length > 0) {
      const statsRow = HTMLPanel.el('div');
      statsRow.style.cssText = 'display: flex; gap: 12px;';
      const roles = { tank: 0, dps: 0, healer: 0, support: 0 };
      for (const f of state.fighters) {
        const r = CLASS_DEFS[f.classId]?.role;
        if (r && r in roles) roles[r as keyof typeof roles]++;
      }
      for (const [role, count] of Object.entries(roles)) {
        if (count === 0) continue;
        const pill = HTMLPanel.el('span', 'mc-role-badge');
        pill.setAttribute('data-role', role);
        pill.textContent = `${count}x ${translateRole(role)}`;
        statsRow.appendChild(pill);
      }
      headerCard.appendChild(statsRow);
    }
    c.appendChild(headerCard);

    if (state.fighters.length === 0) {
      c.appendChild(makeInfoText('Noch keine Kaempfer. Gehe zum Training-Tab!', 'mc-label-gold'));
      return;
    }

    for (const fighter of state.fighters) {
      c.appendChild(this.makeFighterCard(fighter, state));
    }
  }

  private makeFighterCard(fighter: GuildFighter, state: GameState): HTMLElement {
    const cls      = CLASS_DEFS[fighter.classId];
    const stats    = this.ctx.gearSystem.getEffectiveStats(fighter);
    const citizen  = state.citizens.find(c => c.fighterId === fighter.id);

    const isAvailable    = citizen?.status === 'GUILD_FIGHTER';
    const isInjured      = citizen?.status === 'INJURED_REST';
    const isOnExpedition = citizen?.status === 'ON_EXPEDITION';

    const card = HTMLPanel.el('div', 'mc-card mc-hero-card');
    card.setAttribute('data-role', cls?.role ?? 'dps');
    card.style.cssText = 'margin-bottom: 10px;';

    if (isInjured && citizen) {
      const injHeader = HTMLPanel.el('div');
      injHeader.style.cssText = [
        'background: rgba(239,83,80,0.12)',
        'border-radius: 4px 4px 0 0',
        'padding: 4px 10px',
        'margin: -10px -12px 8px',
        'color: var(--mc-damage)',
        'font-weight: bold',
        'font-size: var(--mc-font-size-sm)',
      ].join('; ');
      injHeader.textContent = `⚕ VERLETZT — erholt sich in ${Math.ceil(citizen.injuryTimer)}s`;
      card.appendChild(injHeader);
    }

    const topRow = HTMLPanel.el('div');
    topRow.style.cssText = 'display: flex; gap: 12px; align-items: flex-start;';

    if (cls?.spriteKey) {
      const iconFrame = HTMLPanel.el('div', 'mc-hero-portrait');
      iconFrame.setAttribute('data-role', cls.role);
      const icon = HTMLPanel.icon(cls.spriteKey, 60);
      icon.style.cssText = [
        'border-radius: 4px',
        'opacity: ' + (isInjured ? '0.5' : '1'),
      ].join('; ');
      iconFrame.appendChild(icon);
      topRow.appendChild(iconFrame);
    }

    const infoBlock = HTMLPanel.el('div');
    infoBlock.style.flex = '1';

    const nameRow = HTMLPanel.el('div');
    nameRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;';

    const nameEl = HTMLPanel.el('span', 'mc-bold mc-text-lg');
    nameEl.style.color = cls ? `var(--mc-role-${cls.role})` : 'var(--mc-gold)';
    nameEl.textContent = fighter.name;

    let badgeCls: string;
    let statusText: string;
    if (isInjured)           { badgeCls = 'mc-badge mc-badge-injured';  statusText = '● Verletzt'; }
    else if (isOnExpedition) { badgeCls = 'mc-badge mc-badge-training'; statusText = '● Expedition'; }
    else if (isAvailable)    { badgeCls = 'mc-badge mc-badge-ready';    statusText = '● Bereit'; }
    else                     { badgeCls = 'mc-badge';                   statusText = '● Inaktiv'; }

    const badge = HTMLPanel.el('span', badgeCls);
    badge.textContent = statusText;
    if (!isInjured && !isOnExpedition && !isAvailable) {
      badge.style.color = 'var(--mc-disabled)';
    }
    nameRow.appendChild(nameEl);
    nameRow.appendChild(badge);
    infoBlock.appendChild(nameRow);

    const classRow = HTMLPanel.el('div');
    classRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px;';
    const roleBadge = HTMLPanel.el('span', 'mc-role-badge');
    roleBadge.setAttribute('data-role', cls?.role ?? 'dps');
    roleBadge.textContent = cls ? translateRole(cls.role) : fighter.classId;
    classRow.appendChild(roleBadge);
    const lvlEl = HTMLPanel.el('span', 'mc-text-sm mc-label-dim');
    lvlEl.textContent = `Lv. ${fighter.level}`;
    classRow.appendChild(lvlEl);
    const xpPctVal = xpProgress(fighter);
    const xpBar = HTMLPanel.el('div', 'mc-xp-bar');
    xpBar.style.flex = '1';
    const xpFill = HTMLPanel.el('div', 'mc-xp-bar-fill');
    xpFill.style.width = `${Math.round(xpPctVal * 100)}%`;
    xpBar.appendChild(xpFill);
    classRow.appendChild(xpBar);
    const xpLabel = HTMLPanel.el('span', 'mc-text-sm mc-label-muted');
    xpLabel.textContent = fighter.level >= MAX_HERO_LEVEL ? 'MAX' : `${Math.round(xpPctVal * 100)}%`;
    classRow.appendChild(xpLabel);
    infoBlock.appendChild(classRow);

    const statDefs = [
      { label: 'HP',  val: stats.maxHp, max: 300, cls: 'mc-bar-hp'  as const },
      { label: 'ATK', val: stats.atk,   max: 60,  cls: 'mc-bar-atk' as const },
      { label: 'DEF', val: stats.def,   max: 40,  cls: 'mc-bar-def' as const },
    ];
    for (const s of statDefs) {
      const sRow = HTMLPanel.el('div');
      sRow.style.cssText = 'display: flex; align-items: center; gap: 5px; margin-bottom: 3px;';

      const sLbl = HTMLPanel.el('span', 'mc-text-sm mc-label-muted');
      sLbl.style.cssText = 'width: 28px; flex-shrink: 0;';
      sLbl.textContent = s.label;

      const track = HTMLPanel.statBar(s.val, s.max, s.cls);
      track.style.flex = '1';

      const sVal = HTMLPanel.el('span', 'mc-text-sm mc-label-dim');
      sVal.style.cssText = 'min-width: 28px; text-align: right; flex-shrink: 0;';
      sVal.textContent = String(s.val);

      sRow.appendChild(sLbl);
      sRow.appendChild(track);
      sRow.appendChild(sVal);
      infoBlock.appendChild(sRow);
    }

    const extraRow = HTMLPanel.el('div');
    extraRow.style.cssText = 'display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap;';
    const spdChip = HTMLPanel.el('span', 'mc-skill-chip');
    spdChip.innerHTML = `<span class="mc-skill-icon">⚡</span><span>SPD ${stats.spd.toFixed(1)}</span>`;
    const critChip = HTMLPanel.el('span', 'mc-skill-chip');
    critChip.innerHTML = `<span class="mc-skill-icon">🎯</span><span>CRIT ${(stats.critChance * 100).toFixed(0)}%</span>`;
    extraRow.appendChild(spdChip);
    extraRow.appendChild(critChip);
    if (cls?.skills) {
      const skillIcons: Record<string, string> = { damage: '⚔', heal: '💚', taunt: '🛡', buff: '✨', aoe: '💥', summon: '👻' };
      for (const sk of cls.skills) {
        const sChip = HTMLPanel.el('span', 'mc-skill-chip');
        sChip.innerHTML = `<span class="mc-skill-icon">${skillIcons[sk.effectType] ?? '⚡'}</span><span>${sk.name}</span>`;
        extraRow.appendChild(sChip);
      }
    }
    infoBlock.appendChild(extraRow);

    topRow.appendChild(infoBlock);
    card.appendChild(topRow);

    // Gear slots
    const gearRow = HTMLPanel.el('div');
    gearRow.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0;';
    for (const [slot, label] of [['mainHand', 'Waffe'], ['offHand', 'Neben'], ['armor', 'Rüst.'], ['trinket', 'Schmuck']] as const) {
      const itemId  = fighter.gear[slot];
      const itemDef = itemId ? ITEM_DEFS[itemId] : null;
      const rarity  = itemDef ? getItemRarity(itemDef) : null;
      const itemName = itemDef?.name ?? '–';

      const slot_ = document.createElement('div');
      slot_.style.cssText = [
        'display: flex', 'flex-direction: column', 'align-items: center',
        'gap: 3px', 'cursor: default',
        itemId && rarity
          ? `background: linear-gradient(160deg, #0d0f14 0%, ${rarity.bgColor} 100%); border: 1px solid ${rarity.color}; box-shadow: 0 0 8px ${rarity.glow}`
          : 'background: var(--mc-panel-bg-darker); border: 1px dashed #333;',
        'border-radius: 5px', 'padding: 4px 5px', 'min-width: 48px',
      ].join('; ');

      const slotLbl = HTMLPanel.el('div');
      slotLbl.style.cssText = 'font-size: 9px; color: #7a7e8a; letter-spacing: 0.04em; text-transform: uppercase;';
      slotLbl.textContent = label;
      slot_.appendChild(slotLbl);

      const iconArea = document.createElement('div');
      iconArea.style.cssText = 'width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;';
      if (itemId) {
        const img = HTMLPanel.icon(`ITEM_${itemId.toUpperCase()}`, 34);
        img.style.cssText = rarity
          ? `filter: drop-shadow(0 0 5px ${rarity.glow}); object-fit: contain;`
          : 'object-fit: contain;';
        img.onerror = () => { iconArea.textContent = '?'; };
        iconArea.appendChild(img);
      } else {
        iconArea.style.cssText += '; color: #333; font-size: 18px;';
        iconArea.textContent = '○';
      }
      slot_.appendChild(iconArea);

      const nameLbl = HTMLPanel.el('div');
      nameLbl.style.cssText = [
        'font-size: 9px', 'text-align: center', 'max-width: 52px',
        'white-space: nowrap', 'overflow: hidden', 'text-overflow: ellipsis',
        itemId && rarity ? `color: ${rarity.color}` : 'color: #444',
      ].join('; ');
      nameLbl.textContent = itemId ? (itemName.length > 8 ? itemName.substring(0, 7) + '…' : itemName) : '–';
      slot_.appendChild(nameLbl);

      if (itemId && itemDef) ItemTooltip.attach(slot_, itemId);
      gearRow.appendChild(slot_);
    }
    if (fighter.gearNeedsRepair) {
      const repairBadge = HTMLPanel.el('div', 'mc-badge mc-badge-injured');
      repairBadge.textContent = '⚠ Reparatur nötig';
      gearRow.appendChild(repairBadge);
    }
    card.appendChild(gearRow);

    // Action buttons
    const btnRow = HTMLPanel.el('div');
    btnRow.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap;';

    const detBtn = HTMLPanel.el('button', 'mc-btn-details');
    detBtn.textContent = '📋 Helden-Details';
    detBtn.style.flex = '1';
    detBtn.addEventListener('click', () => {
      this.ctx.showHeroDetailModal(fighter, state);
    });
    btnRow.appendChild(detBtn);

    if (isAvailable) {
      const invOpen = this.ctx.heroInventoryOpen.has(fighter.id);
      const invBtn  = HTMLPanel.el('button', 'mc-btn');
      invBtn.textContent = invOpen ? '📦 Inventar ▲' : '📦 Inventar ▼';
      invBtn.style.fontSize = 'var(--mc-font-size-sm)';
      invBtn.addEventListener('click', () => {
        if (this.ctx.heroInventoryOpen.has(fighter.id)) {
          this.ctx.heroInventoryOpen.delete(fighter.id);
        } else {
          this.ctx.heroInventoryOpen.add(fighter.id);
        }
        this.ctx.refresh();
      });
      btnRow.appendChild(invBtn);
    }

    const retireBtn = HTMLPanel.el('button', 'mc-btn danger');
    retireBtn.textContent = 'Entlassen';
    retireBtn.style.fontSize = 'var(--mc-font-size-sm)';
    retireBtn.addEventListener('click', () => {
      this.ctx.retireFighter(state, fighter);
      this.ctx.refresh();
    });
    btnRow.appendChild(retireBtn);

    card.appendChild(btnRow);

    if (this.ctx.heroInventoryOpen.has(fighter.id) && isAvailable) {
      card.appendChild(this.makeHeroInventoryPanel(fighter, state));
    }

    return card;
  }

  private makeHeroInventoryPanel(fighter: GuildFighter, state: GameState): HTMLElement {
    const panel = HTMLPanel.el('div', 'mc-card');
    panel.style.cssText = [
      'margin-top: 8px',
      'background: var(--mc-panel-bg-darker)',
      'border-color: var(--mc-accent-storage)',
    ].join('; ');

    const title = HTMLPanel.el('div', 'mc-text-sm mc-label-dim');
    title.style.marginBottom = '8px';
    title.textContent = '📦 Verfuegbare Ausruestung (klicke zum Ausrüsten)';
    panel.appendChild(title);

    const gearItems = Object.entries(state.globalStock)
      .filter(([id, qty]) => qty > 0 && ITEM_DEFS[id]?.type === 'gear')
      .map(([id]) => ITEM_DEFS[id])
      .filter(Boolean);

    if (gearItems.length === 0) {
      panel.appendChild(makeInfoText('Keine Ausruestung gefunden.', 'mc-label-dim'));
      return panel;
    }

    gearItems.sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0));

    const grid = HTMLPanel.el('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px;';

    for (const item of gearItems) {
      const qty        = state.globalStock[item.id] ?? 0;
      const isEquipped = Object.values(fighter.gear).includes(item.id);
      const slotMatch  = item.gearSlot!;
      const rarity     = getItemRarity(item);

      const tile = document.createElement('div');
      tile.style.cssText = [
        'position: relative', 'overflow: hidden', 'border-radius: 6px',
        'cursor: pointer', 'aspect-ratio: 1',
        isEquipped
          ? `border: 1px solid var(--mc-gold); box-shadow: 0 0 8px rgba(212,165,74,0.5)`
          : `border: 1px solid ${rarity.color}; box-shadow: 0 0 6px ${rarity.glow}`,
        'transition: transform 0.1s, box-shadow 0.15s',
      ].join('; ');
      tile.addEventListener('mouseenter', () => { tile.style.transform = 'scale(1.06)'; });
      tile.addEventListener('mouseleave', () => { tile.style.transform = 'scale(1)'; });
      ItemTooltip.attach(tile, item.id);

      const topBar = document.createElement('div');
      topBar.style.cssText = [
        'position: absolute', 'top: 0', 'left: 0', 'right: 0',
        'height: 3px', 'z-index: 2',
        `background: ${rarity.color}`,
      ].join('; ');
      tile.appendChild(topBar);

      const img = HTMLPanel.icon(`ITEM_${item.id.toUpperCase()}`, 44);
      img.style.cssText = [
        'position: absolute', 'inset: 0',
        'width: 100%', 'height: 100%',
        'object-fit: fill',
        `filter: drop-shadow(0 0 5px ${rarity.glow})`,
      ].join('; ');
      img.onerror = () => {};
      tile.appendChild(img);

      if (qty > 1) {
        const qtyBadge = document.createElement('div');
        qtyBadge.style.cssText = [
          'position: absolute', 'bottom: 4px', 'right: 4px', 'z-index: 2',
          'font-size: 9px', 'font-weight: bold', 'color: var(--mc-dim)',
          'background: rgba(0,0,0,0.7)', 'border-radius: 3px', 'padding: 1px 3px',
        ].join('; ');
        qtyBadge.textContent = `×${qty}`;
        tile.appendChild(qtyBadge);
      }

      if (isEquipped) {
        const check = document.createElement('div');
        check.style.cssText = [
          'position: absolute', 'top: 3px', 'right: 3px', 'z-index: 2',
          'font-size: 10px', 'color: var(--mc-gold)',
        ].join('; ');
        check.textContent = '✓';
        tile.appendChild(check);
      }

      tile.addEventListener('click', () => {
        ItemDetailModal.show(item.id, {
          isEquipped,
          onEquip: () => {
            this.ctx.gearSystem.equip(state, fighter, item.id);
            this.ctx.refresh();
          },
          onUnequip: () => {
            this.ctx.gearSystem.unequip(state, fighter, slotMatch);
            this.ctx.refresh();
          },
        });
      });

      grid.appendChild(tile);
    }
    panel.appendChild(grid);
    return panel;
  }
}
