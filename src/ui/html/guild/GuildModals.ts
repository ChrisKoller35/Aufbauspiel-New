// ─── Magic City – GuildModals ─────────────────────────────────────────────────
// Class detail modal and Hero detail modal for the Guild UI.
// ─────────────────────────────────────────────────────────────────────────────

import { HTMLPanel } from '../HTMLPanel';
import { ItemTooltip } from '../ItemTooltip';
import { getItemRarity } from '../ItemRarity';
import { GameState } from '../../../models/GameState';
import { GuildFighter } from '../../../models/GuildRoster';
import { ClassDef, CLASS_DEFS } from '../../../data/classes';
import { ITEM_DEFS } from '../../../data/items';
import { GearSystem } from '../../../systems/GearSystem';
import { xpProgress, MAX_HERO_LEVEL } from '../../../systems/HeroProgression';
import { translateRole, makeDivider, closeDetailModal } from './GuildTabHelpers';

/** Persists the user's view preference across modal opens. */
let heroDetailViewMode: 'roster' | 'holo' = 'roster';

// ─── Class Detail Modal ──────────────────────────────────────────────────────

export function showClassDetailModal(cls: ClassDef): void {
  closeDetailModal();

  const overlay = HTMLPanel.el('div');
  overlay.id = 'mc-detail-overlay';
  overlay.style.cssText = [
    'position: fixed',
    'inset: 0',
    'background: rgba(0,0,0,0.6)',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'z-index: 200',
    'pointer-events: auto',
  ].join('; ');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetailModal();
  });

  const modal = HTMLPanel.el('div', 'mc-panel');
  modal.style.cssText = [
    'width: 600px',
    'max-height: 80vh',
    'overflow-y: auto',
    'padding: 0',
    'display: flex',
    'flex-direction: column',
  ].join('; ');

  const header = HTMLPanel.el('div', 'mc-panel-header');
  header.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px 40px 14px 16px; font-size: 18px;';
  const headerIcon = HTMLPanel.icon(cls.spriteKey, 36);
  header.appendChild(headerIcon);
  const headerTitle = HTMLPanel.el('span');
  headerTitle.style.fontWeight = 'bold';
  headerTitle.textContent = cls.name;
  header.appendChild(headerTitle);
  const closeBtnEl = HTMLPanel.closeBtn(() => closeDetailModal());
  header.appendChild(closeBtnEl);
  modal.appendChild(header);

  const content = HTMLPanel.el('div');
  content.style.cssText = 'padding: 16px 20px;';

  const topRow = HTMLPanel.el('div');
  topRow.style.cssText = 'display: flex; gap: 20px; margin-bottom: 16px;';

  const portraitBox = HTMLPanel.el('div');
  portraitBox.style.cssText = 'width: 180px; height: 200px; background: var(--mc-panel-bg-darker); border-radius: 10px; border: 2px solid var(--mc-gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;';
  const portraitImg = HTMLPanel.icon(cls.spriteKey, 160);
  portraitImg.style.cssText = 'width: 160px; height: 160px; object-fit: contain;';
  portraitBox.appendChild(portraitImg);
  topRow.appendChild(portraitBox);

  const infoBox = HTMLPanel.el('div');
  infoBox.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 8px;';

  const roleBadge = HTMLPanel.el('div');
  roleBadge.style.cssText = 'display: inline-block; padding: 3px 12px; background: var(--mc-accent-info); color: var(--mc-panel-bg); border-radius: 4px; font-size: 13px; font-weight: bold; width: fit-content;';
  roleBadge.textContent = translateRole(cls.role);
  infoBox.appendChild(roleBadge);

  const loreText = cls.background ?? '';
  for (const paragraph of loreText.split('\n\n')) {
    const descEl = HTMLPanel.el('div', 'mc-text-md mc-label-dim');
    descEl.style.marginBottom = '6px';
    descEl.textContent = paragraph;
    infoBox.appendChild(descEl);
  }

  topRow.appendChild(infoBox);
  content.appendChild(topRow);

  content.appendChild(makeDivider());

  const statsTitle = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
  statsTitle.style.marginBottom = '10px';
  statsTitle.textContent = 'KAMPFWERTE (Basis)';
  content.appendChild(statsTitle);

  const stats = cls.baseStats;
  const statsGrid = HTMLPanel.el('div');
  statsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 16px;';

  const allStats = [
    { label: 'HP',   val: stats.maxHp,                        max: 50, barCls: 'mc-bar-hp'  as const },
    { label: 'ATK',  val: stats.atk,                          max: 12, barCls: 'mc-bar-atk' as const },
    { label: 'DEF',  val: stats.def,                          max: 10, barCls: 'mc-bar-def' as const },
    { label: 'SPD',  val: parseFloat(stats.spd.toFixed(1)),   max: 3,  barCls: 'mc-bar-hp'  as const },
    { label: 'CRIT', val: Math.round(stats.critChance * 100), max: 30, barCls: 'mc-bar-atk' as const },
  ];

  for (const s of allStats) {
    const sRow = HTMLPanel.el('div');
    sRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';

    const sLbl = HTMLPanel.el('span', 'mc-text-md mc-label-muted mc-bold');
    sLbl.style.cssText = 'width: 36px; flex-shrink: 0;';
    sLbl.textContent = s.label;

    const track = HTMLPanel.statBar(s.val, s.max, s.barCls);
    track.style.flex = '1';
    track.style.height = '14px';

    const sVal = HTMLPanel.el('span', 'mc-text-md');
    sVal.style.cssText = 'min-width: 36px; text-align: right; flex-shrink: 0;';
    sVal.textContent = s.label === 'CRIT' ? `${s.val}%` : String(s.val);

    sRow.appendChild(sLbl);
    sRow.appendChild(track);
    sRow.appendChild(sVal);
    statsGrid.appendChild(sRow);
  }
  content.appendChild(statsGrid);

  content.appendChild(makeDivider());

  const skillsTitle = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
  skillsTitle.style.marginBottom = '10px';
  skillsTitle.textContent = 'FÄHIGKEITEN';
  content.appendChild(skillsTitle);

  const skillGrid = HTMLPanel.el('div');
  skillGrid.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

  for (const skill of cls.skills) {
    const skillCard = HTMLPanel.el('div', 'mc-card');
    skillCard.style.cssText = 'padding: 10px 14px; border-color: var(--mc-accent-info);';

    const skillHeader = HTMLPanel.el('div');
    skillHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';

    const skillName = HTMLPanel.el('span', 'mc-bold mc-text-md mc-label-info');
    skillName.textContent = skill.name;
    skillHeader.appendChild(skillName);

    const cdBadge = HTMLPanel.el('span', 'mc-text-sm mc-label-dim');
    cdBadge.textContent = `${skill.cooldown} Runden CD`;
    skillHeader.appendChild(cdBadge);

    skillCard.appendChild(skillHeader);

    const effectTypeNames: Record<string, string> = {
      damage: '⚔ Schaden', heal: '💚 Heilung', taunt: '🛡 Spott',
      buff: '✨ Buff', aoe: '💥 Flächenschaden', summon: '🐾 Beschwörung',
    };
    const targetNames: Record<string, string> = {
      enemy: 'Ein Gegner', ally_lowest_hp: 'Schwächster Verbündeter',
      self: 'Selbst', all_enemies: 'Alle Gegner',
    };
    const effectEl = HTMLPanel.el('div', 'mc-text-sm');
    effectEl.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

    const typeEl = HTMLPanel.el('span', 'mc-label-loot');
    typeEl.textContent = effectTypeNames[skill.effectType] ?? skill.effectType;
    effectEl.appendChild(typeEl);

    const powerEl = HTMLPanel.el('span', 'mc-label-dim');
    powerEl.textContent = `Stärke: ${skill.power}x`;
    effectEl.appendChild(powerEl);

    const targetEl = HTMLPanel.el('span', 'mc-label-dim');
    targetEl.textContent = `Ziel: ${targetNames[skill.target] ?? skill.target}`;
    effectEl.appendChild(targetEl);

    skillCard.appendChild(effectEl);
    skillGrid.appendChild(skillCard);
  }
  content.appendChild(skillGrid);

  const closeRow = HTMLPanel.el('div');
  closeRow.style.cssText = 'text-align: center; margin-top: 16px;';
  const closeBtnFull = HTMLPanel.el('button', 'mc-btn');
  closeBtnFull.textContent = 'Schließen';
  closeBtnFull.style.cssText = 'padding: 8px 40px;';
  closeBtnFull.addEventListener('click', () => closeDetailModal());
  closeRow.appendChild(closeBtnFull);
  content.appendChild(closeRow);

  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ─── Hero Detail Modal ───────────────────────────────────────────────────────

export function showHeroDetailModal(
  fighter: GuildFighter,
  state: GameState,
  gearSystem: GearSystem,
): void {
  closeDetailModal();

  const overlay = HTMLPanel.el('div');
  overlay.id = 'mc-detail-overlay';
  overlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,4,12,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; pointer-events: auto;`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDetailModal(); });

  const renderCurrentView = () => {
    // Clear overlay children except the overlay itself
    overlay.innerHTML = '';
    if (heroDetailViewMode === 'holo') {
      overlay.appendChild(buildHoloView(fighter, state, gearSystem, renderCurrentView));
    } else {
      overlay.appendChild(buildRosterView(fighter, state, gearSystem, renderCurrentView));
    }
  };

  renderCurrentView();
  document.body.appendChild(overlay);
}

// ─── Toggle Button Helper ────────────────────────────────────────────────────

function buildViewToggle(onToggle: () => void): HTMLElement {
  const wrap = HTMLPanel.el('div');
  wrap.style.cssText = 'display: flex; justify-content: center; gap: 0; margin-bottom: 12px;';

  const rosterBtn = HTMLPanel.el('button');
  const holoBtn = HTMLPanel.el('button');

  const baseStyle = 'padding: 5px 16px; font-size: 12px; font-weight: bold; cursor: pointer; border: 1px solid; transition: all 0.15s; letter-spacing: 0.5px;';

  const isRoster = heroDetailViewMode === 'roster';

  rosterBtn.textContent = '📋 Roster';
  rosterBtn.style.cssText = baseStyle + `border-radius: 4px 0 0 4px; border-color: var(--mc-gold); ${isRoster
    ? 'background: var(--mc-gold); color: #0d0f14;'
    : 'background: transparent; color: var(--mc-gold);'}`;

  holoBtn.textContent = '🔮 Terminal';
  holoBtn.style.cssText = baseStyle + `border-radius: 0 4px 4px 0; border-color: #00f0ff; border-left: none; ${!isRoster
    ? 'background: #00f0ff; color: #0d0f14;'
    : 'background: transparent; color: #00f0ff;'}`;

  rosterBtn.addEventListener('click', () => { if (heroDetailViewMode !== 'roster') { heroDetailViewMode = 'roster'; onToggle(); } });
  holoBtn.addEventListener('click', () => { if (heroDetailViewMode !== 'holo') { heroDetailViewMode = 'holo'; onToggle(); } });

  wrap.appendChild(rosterBtn);
  wrap.appendChild(holoBtn);
  return wrap;
}

// ─── Roster-Style View ───────────────────────────────────────────────────────

function buildRosterView(
  fighter: GuildFighter,
  state: GameState,
  gearSystem: GearSystem,
  onToggle: () => void,
): HTMLElement {
  const cls = CLASS_DEFS[fighter.classId];
  const stats = gearSystem.getEffectiveStats(fighter);
  const citizen = state.citizens.find(c => c.fighterId === fighter.id);
  const xpPct = xpProgress(fighter);
  const isMaxLvl = fighter.level >= MAX_HERO_LEVEL;

  const isAvailable = citizen?.status === 'GUILD_FIGHTER';
  const isInjured = citizen?.status === 'INJURED_REST';
  const isOnExpedition = citizen?.status === 'ON_EXPEDITION';

  const modal = HTMLPanel.el('div', 'mc-panel');
  modal.style.cssText = [
    'width: 520px', 'max-height: 90vh', 'overflow-y: auto',
    'padding: 0', 'display: flex', 'flex-direction: column',
    'animation: mc-in 0.18s ease-out',
  ].join('; ');

  // ── Header ──
  const header = HTMLPanel.el('div', 'mc-panel-header');
  header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;';

  const headerLeft = HTMLPanel.el('div');
  headerLeft.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  const headerTitle = HTMLPanel.el('span', 'mc-bold mc-text-lg mc-label-gold');
  headerTitle.textContent = '⚔ Helden-Details';
  headerLeft.appendChild(headerTitle);
  header.appendChild(headerLeft);

  const closeBtnEl = HTMLPanel.closeBtn(() => closeDetailModal());
  header.appendChild(closeBtnEl);
  modal.appendChild(header);

  const content = HTMLPanel.el('div');
  content.style.cssText = 'padding: 16px 20px;';

  // ── View Toggle ──
  content.appendChild(buildViewToggle(onToggle));

  // ── Injury banner ──
  if (isInjured && citizen) {
    const injBanner = HTMLPanel.el('div');
    injBanner.style.cssText = 'background: rgba(239,83,80,0.12); border-radius: 4px; padding: 6px 12px; margin-bottom: 12px; color: var(--mc-damage); font-weight: bold; font-size: var(--mc-font-size-sm);';
    injBanner.textContent = `⚕ VERLETZT — erholt sich in ${Math.ceil(citizen.injuryTimer)}s`;
    content.appendChild(injBanner);
  }

  // ── Top Row: Portrait + Info ──
  const topRow = HTMLPanel.el('div');
  topRow.style.cssText = 'display: flex; gap: 16px; align-items: flex-start; margin-bottom: 14px;';

  if (cls?.spriteKey) {
    const iconFrame = HTMLPanel.el('div', 'mc-hero-portrait');
    iconFrame.setAttribute('data-role', cls.role);
    iconFrame.style.cssText += '; width: 90px; height: 100px; flex-shrink: 0;';
    const icon = HTMLPanel.icon(cls.spriteKey, 80);
    icon.style.cssText = 'border-radius: 4px; opacity: ' + (isInjured ? '0.5' : '1') + ';';
    iconFrame.appendChild(icon);
    topRow.appendChild(iconFrame);
  }

  const infoBlock = HTMLPanel.el('div');
  infoBlock.style.cssText = 'flex: 1;';

  // Name + Status Row
  const nameRow = HTMLPanel.el('div');
  nameRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';

  const nameEl = HTMLPanel.el('span', 'mc-bold');
  nameEl.style.cssText = `font-size: 20px; color: ${cls ? `var(--mc-role-${cls.role})` : 'var(--mc-gold)'};`;
  nameEl.textContent = fighter.name;
  nameRow.appendChild(nameEl);

  let badgeCls: string;
  let statusText: string;
  if (isInjured) { badgeCls = 'mc-badge mc-badge-injured'; statusText = '● Verletzt'; }
  else if (isOnExpedition) { badgeCls = 'mc-badge mc-badge-training'; statusText = '● Expedition'; }
  else if (isAvailable) { badgeCls = 'mc-badge mc-badge-ready'; statusText = '● Bereit'; }
  else { badgeCls = 'mc-badge'; statusText = '● Inaktiv'; }

  const badge = HTMLPanel.el('span', badgeCls);
  badge.textContent = statusText;
  if (!isInjured && !isOnExpedition && !isAvailable) badge.style.color = 'var(--mc-disabled)';
  nameRow.appendChild(badge);
  infoBlock.appendChild(nameRow);

  // Class + Level + XP Row
  const classRow = HTMLPanel.el('div');
  classRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';

  const roleBadge = HTMLPanel.el('span', 'mc-role-badge');
  roleBadge.setAttribute('data-role', cls?.role ?? 'dps');
  roleBadge.textContent = cls ? translateRole(cls.role) : fighter.classId;
  classRow.appendChild(roleBadge);

  const clsName = HTMLPanel.el('span', 'mc-text-sm mc-label-dim');
  clsName.textContent = cls?.name ?? fighter.classId;
  classRow.appendChild(clsName);

  const lvlEl = HTMLPanel.el('span', 'mc-text-sm mc-label-dim');
  lvlEl.textContent = `Lv. ${fighter.level}`;
  classRow.appendChild(lvlEl);

  const xpBar = HTMLPanel.el('div', 'mc-xp-bar');
  xpBar.style.flex = '1';
  const xpFill = HTMLPanel.el('div', 'mc-xp-bar-fill');
  xpFill.style.width = `${Math.round(xpPct * 100)}%`;
  xpBar.appendChild(xpFill);
  classRow.appendChild(xpBar);

  const xpLabel = HTMLPanel.el('span', 'mc-text-sm mc-label-muted');
  xpLabel.textContent = isMaxLvl ? 'MAX' : `${Math.round(xpPct * 100)}%`;
  classRow.appendChild(xpLabel);
  infoBlock.appendChild(classRow);

  topRow.appendChild(infoBlock);
  content.appendChild(topRow);

  content.appendChild(makeDivider());

  // ── Stats Section ──
  const statsTitle = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
  statsTitle.style.marginBottom = '10px';
  statsTitle.textContent = 'KAMPFWERTE';
  content.appendChild(statsTitle);

  const statDefs = [
    { label: 'HP', val: stats.maxHp, max: 300, cls: 'mc-bar-hp' as const },
    { label: 'ATK', val: stats.atk, max: 60, cls: 'mc-bar-atk' as const },
    { label: 'DEF', val: stats.def, max: 40, cls: 'mc-bar-def' as const },
  ];
  for (const s of statDefs) {
    const sRow = HTMLPanel.el('div');
    sRow.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-bottom: 4px;';

    const sLbl = HTMLPanel.el('span', 'mc-text-md mc-label-muted mc-bold');
    sLbl.style.cssText = 'width: 36px; flex-shrink: 0;';
    sLbl.textContent = s.label;

    const track = HTMLPanel.statBar(s.val, s.max, s.cls);
    track.style.flex = '1';
    track.style.height = '14px';

    const sVal = HTMLPanel.el('span', 'mc-text-md');
    sVal.style.cssText = 'min-width: 36px; text-align: right; flex-shrink: 0; font-weight: bold;';
    sVal.textContent = String(s.val);

    sRow.appendChild(sLbl);
    sRow.appendChild(track);
    sRow.appendChild(sVal);
    content.appendChild(sRow);
  }

  // SPD + CRIT + Skills chips
  const extraRow = HTMLPanel.el('div');
  extraRow.style.cssText = 'display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;';

  const spdChip = HTMLPanel.el('span', 'mc-skill-chip');
  spdChip.innerHTML = `<span class="mc-skill-icon">⚡</span><span>SPD ${stats.spd.toFixed(1)}</span>`;
  extraRow.appendChild(spdChip);

  const critChip = HTMLPanel.el('span', 'mc-skill-chip');
  critChip.innerHTML = `<span class="mc-skill-icon">🎯</span><span>CRIT ${(stats.critChance * 100).toFixed(0)}%</span>`;
  extraRow.appendChild(critChip);

  if (cls?.skills) {
    const skillIcons: Record<string, string> = { damage: '⚔', heal: '💚', taunt: '🛡', buff: '✨', aoe: '💥', summon: '👻' };
    for (const sk of cls.skills) {
      const sChip = HTMLPanel.el('span', 'mc-skill-chip');
      sChip.innerHTML = `<span class="mc-skill-icon">${skillIcons[sk.effectType] ?? '⚡'}</span><span>${sk.name}</span>`;
      extraRow.appendChild(sChip);
    }
  }
  content.appendChild(extraRow);

  content.appendChild(makeDivider());

  // ── Skills Section (detailed) ──
  if (cls?.skills && cls.skills.length > 0) {
    const skillsTitle = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
    skillsTitle.style.marginBottom = '10px';
    skillsTitle.textContent = 'FÄHIGKEITEN';
    content.appendChild(skillsTitle);

    const effectTypeNames: Record<string, string> = {
      damage: '⚔ Schaden', heal: '💚 Heilung', taunt: '🛡 Spott',
      buff: '✨ Buff', aoe: '💥 Flächenschaden', summon: '🐾 Beschwörung',
    };
    const targetNames: Record<string, string> = {
      enemy: 'Ein Gegner', ally_lowest_hp: 'Schwächster Verbündeter',
      self: 'Selbst', all_enemies: 'Alle Gegner',
    };

    for (const skill of cls.skills) {
      const skillCard = HTMLPanel.el('div', 'mc-card');
      skillCard.style.cssText = 'padding: 10px 14px; margin-bottom: 6px; border-color: var(--mc-accent-info);';

      const skillHeader = HTMLPanel.el('div');
      skillHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';

      const skillName = HTMLPanel.el('span', 'mc-bold mc-text-md mc-label-info');
      skillName.textContent = skill.name;
      skillHeader.appendChild(skillName);

      const cdBadge = HTMLPanel.el('span', 'mc-text-sm mc-label-dim');
      cdBadge.textContent = `${skill.cooldown} Runden CD`;
      skillHeader.appendChild(cdBadge);
      skillCard.appendChild(skillHeader);

      const effectEl = HTMLPanel.el('div', 'mc-text-sm');
      effectEl.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

      const typeEl = HTMLPanel.el('span', 'mc-label-loot');
      typeEl.textContent = effectTypeNames[skill.effectType] ?? skill.effectType;
      effectEl.appendChild(typeEl);

      const powerEl = HTMLPanel.el('span', 'mc-label-dim');
      powerEl.textContent = `Stärke: ${skill.power}x`;
      effectEl.appendChild(powerEl);

      const targetEl = HTMLPanel.el('span', 'mc-label-dim');
      targetEl.textContent = `Ziel: ${targetNames[skill.target] ?? skill.target}`;
      effectEl.appendChild(targetEl);

      skillCard.appendChild(effectEl);
      content.appendChild(skillCard);
    }

    content.appendChild(makeDivider());
  }

  // ── Equipment Section ──
  const gearTitle = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
  gearTitle.style.marginBottom = '10px';
  gearTitle.textContent = 'AUSRÜSTUNG';
  content.appendChild(gearTitle);

  const gearRow = HTMLPanel.el('div');
  gearRow.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;';

  for (const [slot, label] of [['mainHand', 'Waffe'], ['offHand', 'Neben'], ['armor', 'Rüstung'], ['trinket', 'Schmuck']] as const) {
    const itemId = fighter.gear[slot];
    const itemDef = itemId ? ITEM_DEFS[itemId] : null;
    const rarity = itemDef ? getItemRarity(itemDef) : null;
    const itemName = itemDef?.name ?? '–';

    const slotEl = HTMLPanel.el('div');
    slotEl.style.cssText = [
      'display: flex', 'flex-direction: column', 'align-items: center',
      'gap: 4px', 'flex: 1', 'min-width: 80px',
      itemId && rarity
        ? `background: linear-gradient(160deg, #0d0f14 0%, ${rarity.bgColor} 100%); border: 1px solid ${rarity.color}; box-shadow: 0 0 8px ${rarity.glow}`
        : 'background: var(--mc-panel-bg-darker); border: 1px dashed #333;',
      'border-radius: 6px', 'padding: 8px 6px',
    ].join('; ');

    const slotLbl = HTMLPanel.el('div');
    slotLbl.style.cssText = 'font-size: 10px; color: #7a7e8a; letter-spacing: 0.04em; text-transform: uppercase;';
    slotLbl.textContent = label;
    slotEl.appendChild(slotLbl);

    const iconArea = HTMLPanel.el('div');
    iconArea.style.cssText = 'width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;';
    if (itemId) {
      const img = HTMLPanel.icon(`ITEM_${itemId.toUpperCase()}`, 44);
      img.style.cssText = rarity ? `filter: drop-shadow(0 0 5px ${rarity.glow}); object-fit: contain;` : 'object-fit: contain;';
      img.onerror = () => { iconArea.textContent = '?'; };
      iconArea.appendChild(img);
    } else {
      iconArea.style.cssText += '; color: #333; font-size: 22px;';
      iconArea.textContent = '○';
    }
    slotEl.appendChild(iconArea);

    const nameLbl = HTMLPanel.el('div');
    nameLbl.style.cssText = [
      'font-size: 11px', 'text-align: center', 'max-width: 80px',
      'white-space: nowrap', 'overflow: hidden', 'text-overflow: ellipsis',
      itemId && rarity ? `color: ${rarity.color}; font-weight: bold` : 'color: #444',
    ].join('; ');
    nameLbl.textContent = itemId ? itemName : '–';
    slotEl.appendChild(nameLbl);

    // Show stat bonuses
    if (itemDef?.statBonuses) {
      const sb = itemDef.statBonuses;
      const parts: string[] = [];
      if (sb.atk) parts.push(`+${sb.atk}ATK`);
      if (sb.def) parts.push(`+${sb.def}DEF`);
      if (sb.hp) parts.push(`+${sb.hp}HP`);
      if (sb.spd) parts.push(`+${sb.spd.toFixed(1)}SPD`);
      if (sb.critChance) parts.push(`+${(sb.critChance * 100).toFixed(0)}%CRT`);
      if (parts.length > 0) {
        const bonusEl = HTMLPanel.el('div');
        bonusEl.style.cssText = 'font-size: 9px; color: #00ff88; text-align: center;';
        bonusEl.textContent = parts.join(' ');
        slotEl.appendChild(bonusEl);
      }
    }

    if (itemId && itemDef) ItemTooltip.attach(slotEl, itemId);
    gearRow.appendChild(slotEl);
  }

  if (fighter.gearNeedsRepair) {
    const repairBadge = HTMLPanel.el('div', 'mc-badge mc-badge-injured');
    repairBadge.textContent = '⚠ Reparatur nötig';
    gearRow.appendChild(repairBadge);
  }
  content.appendChild(gearRow);

  // ── Close Button ──
  const closeRow = HTMLPanel.el('div');
  closeRow.style.cssText = 'text-align: center; margin-top: 8px;';
  const closeBtnFull = HTMLPanel.el('button', 'mc-btn');
  closeBtnFull.textContent = 'Schließen';
  closeBtnFull.style.cssText = 'padding: 8px 40px;';
  closeBtnFull.addEventListener('click', () => closeDetailModal());
  closeRow.appendChild(closeBtnFull);
  content.appendChild(closeRow);

  modal.appendChild(content);
  return modal;
}

// ─── Holo Terminal View ──────────────────────────────────────────────────────

function buildHoloView(
  fighter: GuildFighter,
  state: GameState,
  gearSystem: GearSystem,
  onToggle: () => void,
): HTMLElement {

  const cls     = CLASS_DEFS[fighter.classId];
  const stats   = gearSystem.getEffectiveStats(fighter);
  const citizen = state.citizens.find(c => c.fighterId === fighter.id);
  const xpPct   = xpProgress(fighter);
  const isMaxLvl = fighter.level >= MAX_HERO_LEVEL;

  if (!document.getElementById('mc-holo-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'mc-holo-styles';
    styleTag.textContent = `
      @keyframes mc-holo-scan { 0% { top: -2px; } 100% { top: 100%; } }
      @keyframes mc-holo-border { 0%,100% { border-color: rgba(0,240,255,0.3); } 50% { border-color: rgba(0,240,255,0.7); } }
      @keyframes mc-holo-glow { 0%,100% { box-shadow: 0 0 20px rgba(0,240,255,0.1), inset 0 0 30px rgba(0,240,255,0.02); } 50% { box-shadow: 0 0 40px rgba(0,240,255,0.2), inset 0 0 40px rgba(0,240,255,0.05); } }
      @keyframes mc-holo-flicker { 0%,97%,100% { opacity: 1; } 98% { opacity: 0.85; } 99% { opacity: 0.95; } }
      @keyframes mc-holo-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      @keyframes mc-holo-bar-shine { 0% { left: -100%; } 100% { left: 200%; } }
    `;
    document.head.appendChild(styleTag);
  }

  const C = {
    cyan: '#00f0ff', cyanDim: 'rgba(0,240,255,0.5)', cyanGlow: 'rgba(0,240,255,0.15)',
    bg: '#080c14', bgCard: 'rgba(8,16,28,0.85)', border: 'rgba(0,240,255,0.25)',
    text: '#c8e6ff', textDim: '#5a7a9a', accent: '#ff3860', gold: '#ffd700',
  };

  const modal = HTMLPanel.el('div');
  modal.style.cssText = [
    'width: 700px', 'max-height: 90vh', 'overflow-y: auto',
    `background: linear-gradient(170deg, ${C.bg} 0%, #0a1628 40%, #060e1c 100%)`,
    `border: 1px solid ${C.border}`,
    'border-radius: 4px',
    `box-shadow: 0 0 60px rgba(0,240,255,0.08), 0 30px 80px rgba(0,0,0,0.8)`,
    'padding: 0',
    'font-family: "Consolas", "Courier New", monospace',
    `color: ${C.text}`,
    'position: relative',
    'animation: mc-holo-glow 3s ease-in-out infinite, mc-holo-border 4s ease-in-out infinite, mc-in 0.18s ease-out',
    'scrollbar-width: thin', `scrollbar-color: ${C.cyanDim} transparent`,
  ].join('; ');

  const scanOverlay = HTMLPanel.el('div');
  scanOverlay.style.cssText = `position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: 4px; z-index: 1;`;
  const scanLine = HTMLPanel.el('div');
  scanLine.style.cssText = `position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, ${C.cyanDim}, transparent); animation: mc-holo-scan 4s linear infinite; opacity: 0.4;`;
  scanOverlay.appendChild(scanLine);
  const scanPattern = HTMLPanel.el('div');
  scanPattern.style.cssText = `position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px); pointer-events: none;`;
  scanOverlay.appendChild(scanPattern);
  modal.appendChild(scanOverlay);

  const closeBtn = HTMLPanel.el('button');
  closeBtn.style.cssText = `position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; background: transparent; border: 1px solid ${C.accent}; border-radius: 2px; color: ${C.accent}; font-size: 14px; font-weight: bold; cursor: pointer; pointer-events: auto; z-index: 10; font-family: monospace; transition: all 0.15s;`;
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = C.accent; closeBtn.style.color = '#fff'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = C.accent; });
  closeBtn.addEventListener('click', () => closeDetailModal());
  modal.appendChild(closeBtn);

  const wrap = HTMLPanel.el('div');
  wrap.style.cssText = 'position: relative; z-index: 2;';

  const termHeader = HTMLPanel.el('div');
  termHeader.style.cssText = `padding: 16px 20px 8px; border-bottom: 1px solid ${C.border};`;

  const termTitle = HTMLPanel.el('div');
  termTitle.style.cssText = `font-size: 10px; color: ${C.textDim}; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 4px; animation: mc-holo-flicker 8s infinite;`;
  termTitle.textContent = '▸ GUILD TERMINAL // HERO DATABASE';
  termHeader.appendChild(termTitle);

  const termSubtitle = HTMLPanel.el('div');
  termSubtitle.style.cssText = `font-size: 10px; color: ${C.textDim}; letter-spacing: 2px;`;
  termSubtitle.textContent = `SYS.TIME ${new Date().toLocaleTimeString('de-DE')} // RECORD #${String(fighter.id).padStart(4, '0')}`;
  termHeader.appendChild(termSubtitle);

  wrap.appendChild(termHeader);

  const content = HTMLPanel.el('div');
  content.style.cssText = 'padding: 16px 20px;';

  // ── View Toggle ──
  content.appendChild(buildViewToggle(onToggle));

  // ── Identity block: portrait + info ──
  const identBlock = HTMLPanel.el('div');
  identBlock.style.cssText = 'display: flex; gap: 20px; margin-bottom: 20px;';

  const portraitFrame = HTMLPanel.el('div');
  portraitFrame.style.cssText = [
    'width: 150px', 'height: 170px', 'flex-shrink: 0',
    `background: linear-gradient(180deg, rgba(0,240,255,0.05) 0%, rgba(0,0,0,0.9) 100%)`,
    `border: 1px solid ${C.cyan}`,
    'border-radius: 2px',
    'position: relative',
    'display: flex', 'align-items: center', 'justify-content: center',
    `box-shadow: inset 0 0 30px rgba(0,240,255,0.06), 0 0 20px rgba(0,240,255,0.08)`,
    'overflow: hidden',
  ].join('; ');

  for (const [t, l] of [['0','0'],['0','auto'],['auto','0'],['auto','auto']]) {
    const corner = HTMLPanel.el('div');
    corner.style.cssText = `position: absolute; width: 12px; height: 12px; border: 1px solid ${C.cyan}; ${t === '0' ? 'top: 4px' : 'bottom: 4px'}; ${l === '0' ? 'left: 4px' : 'right: 4px'}; ${t === '0' && l === '0' ? 'border-right: none; border-bottom: none;' : t === '0' ? 'border-left: none; border-bottom: none;' : l === '0' ? 'border-right: none; border-top: none;' : 'border-left: none; border-top: none;'}`;
    portraitFrame.appendChild(corner);
  }

  if (cls?.spriteKey) {
    const img = HTMLPanel.icon(cls.spriteKey, 120);
    img.style.cssText = `width: 120px; height: 140px; object-fit: contain; filter: drop-shadow(0 0 8px ${C.cyanDim}) brightness(1.1); animation: mc-holo-flicker 12s infinite;`;
    portraitFrame.appendChild(img);
  }

  const scanLabel = HTMLPanel.el('div');
  scanLabel.style.cssText = `position: absolute; bottom: 4px; left: 0; right: 0; text-align: center; font-size: 8px; letter-spacing: 3px; color: ${C.cyan}; animation: mc-holo-pulse 2s infinite;`;
  scanLabel.textContent = 'SCANNING';
  portraitFrame.appendChild(scanLabel);

  identBlock.appendChild(portraitFrame);

  const idInfo = HTMLPanel.el('div');
  idInfo.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 6px;';

  const holoNameEl = HTMLPanel.el('div');
  holoNameEl.style.cssText = `font-size: 26px; font-weight: 900; color: ${C.cyan}; letter-spacing: 3px; text-transform: uppercase; text-shadow: 0 0 20px rgba(0,240,255,0.4), 0 0 40px rgba(0,240,255,0.1); line-height: 1;`;
  holoNameEl.textContent = fighter.name;
  idInfo.appendChild(holoNameEl);

  const desigLine = HTMLPanel.el('div');
  desigLine.style.cssText = `font-size: 11px; color: ${C.textDim}; letter-spacing: 2px; margin-top: 2px;`;
  desigLine.textContent = `CLASS: ${(cls?.name ?? fighter.classId).toUpperCase()}  //  ROLE: ${(cls?.role ?? 'UNKNOWN').toUpperCase()}`;
  idInfo.appendChild(desigLine);

  const lvlRow = HTMLPanel.el('div');
  lvlRow.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-top: 8px;';

  const holoLvlBox = HTMLPanel.el('div');
  holoLvlBox.style.cssText = `display: flex; align-items: baseline; gap: 4px;`;
  const lvlNum = HTMLPanel.el('span');
  lvlNum.style.cssText = `font-size: 32px; font-weight: 900; color: ${C.gold}; text-shadow: 0 0 12px rgba(255,215,0,0.3); line-height: 1;`;
  lvlNum.textContent = String(fighter.level);
  holoLvlBox.appendChild(lvlNum);
  const lvlLabel = HTMLPanel.el('span');
  lvlLabel.style.cssText = `font-size: 10px; color: ${C.textDim}; letter-spacing: 2px;`;
  lvlLabel.textContent = 'LVL';
  holoLvlBox.appendChild(lvlLabel);
  lvlRow.appendChild(holoLvlBox);

  const vDiv = HTMLPanel.el('div');
  vDiv.style.cssText = `width: 1px; height: 24px; background: ${C.border};`;
  lvlRow.appendChild(vDiv);

  let holoStatusText = 'OPERATIONAL';
  let holoStatusCol  = '#00ff88';
  if (citizen?.status === 'INJURED_REST') {
    holoStatusText = 'DAMAGED'; holoStatusCol = C.accent;
  } else if (citizen?.status === 'ON_EXPEDITION') {
    holoStatusText = 'DEPLOYED'; holoStatusCol = C.gold;
  }
  const holoStatusEl = HTMLPanel.el('div');
  holoStatusEl.style.cssText = `font-size: 12px; font-weight: bold; color: ${holoStatusCol}; letter-spacing: 2px; animation: mc-holo-pulse 3s infinite;`;
  holoStatusEl.textContent = `◉ ${holoStatusText}`;
  lvlRow.appendChild(holoStatusEl);

  idInfo.appendChild(lvlRow);

  const xpSection = HTMLPanel.el('div');
  xpSection.style.cssText = 'margin-top: 10px;';
  const xpHeader = HTMLPanel.el('div');
  xpHeader.style.cssText = `display: flex; justify-content: space-between; font-size: 9px; color: ${C.textDim}; letter-spacing: 2px; margin-bottom: 4px;`;
  xpHeader.innerHTML = `<span>EXPERIENCE</span><span>${isMaxLvl ? 'MAXED' : `${Math.round(xpPct * 100)}% // ${fighter.xp} XP`}</span>`;
  xpSection.appendChild(xpHeader);

  const xpBar = HTMLPanel.el('div');
  xpBar.style.cssText = `height: 4px; background: rgba(0,240,255,0.1); border-radius: 0; overflow: hidden; position: relative;`;
  const xpBarFill = HTMLPanel.el('div');
  xpBarFill.style.cssText = `height: 100%; width: ${isMaxLvl ? 100 : xpPct * 100}%; background: linear-gradient(90deg, ${C.cyan}, #00ff88); transition: width 0.5s; position: relative; overflow: hidden;`;
  const shine = HTMLPanel.el('div');
  shine.style.cssText = `position: absolute; top: 0; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); animation: mc-holo-bar-shine 3s linear infinite;`;
  xpBarFill.appendChild(shine);
  xpBar.appendChild(xpBarFill);
  xpSection.appendChild(xpBar);
  idInfo.appendChild(xpSection);

  identBlock.appendChild(idInfo);
  content.appendChild(identBlock);

  const holoDivider = (): HTMLElement => {
    const d = HTMLPanel.el('div');
    d.style.cssText = `height: 1px; background: linear-gradient(90deg, transparent, ${C.border}, ${C.cyanDim}, ${C.border}, transparent); margin: 16px 0;`;
    return d;
  };
  content.appendChild(holoDivider());

  // ── Combat analysis ──
  const statsHeader = HTMLPanel.el('div');
  statsHeader.style.cssText = `font-size: 10px; color: ${C.textDim}; letter-spacing: 3px; margin-bottom: 12px;`;
  statsHeader.textContent = '▸ COMBAT ANALYSIS';
  content.appendChild(statsHeader);

  const holoStatDefs = [
    { key: 'HITPOINTS',  short: 'HP',   val: stats.maxHp,                        max: 300, color: '#00ff88', warn: 100 },
    { key: 'ATTACK PWR', short: 'ATK',  val: stats.atk,                          max: 60,  color: '#ff6b35', warn: 20 },
    { key: 'DEFENSE',    short: 'DEF',  val: stats.def,                          max: 40,  color: '#35aaff', warn: 15 },
    { key: 'SPEED',      short: 'SPD',  val: parseFloat(stats.spd.toFixed(1)),   max: 10,  color: '#ffd700', warn: 3 },
    { key: 'CRIT RATE',  short: 'CRT',  val: Math.round(stats.critChance * 100), max: 50,  color: '#ff3860', warn: 15 },
  ];

  for (const st of holoStatDefs) {
    const row = HTMLPanel.el('div');
    row.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';

    const lbl = HTMLPanel.el('div');
    lbl.style.cssText = `width: 100px; font-size: 10px; color: ${C.textDim}; letter-spacing: 1px;`;
    lbl.textContent = st.key;
    row.appendChild(lbl);

    const barTrack = HTMLPanel.el('div');
    barTrack.style.cssText = `flex: 1; height: 16px; background: rgba(0,240,255,0.04); border: 1px solid rgba(0,240,255,0.1); position: relative; overflow: hidden;`;

    const pct = Math.min(100, (st.val / st.max) * 100);
    const barFill = HTMLPanel.el('div');
    barFill.style.cssText = `height: 100%; width: ${pct}%; background: linear-gradient(90deg, ${st.color}40, ${st.color}); transition: width 0.5s; position: relative;`;

    const gridLines = HTMLPanel.el('div');
    gridLines.style.cssText = `position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent, transparent 19%, rgba(0,0,0,0.3) 19%, rgba(0,0,0,0.3) 20%);`;
    barFill.appendChild(gridLines);
    barTrack.appendChild(barFill);

    const barText = HTMLPanel.el('div');
    barText.style.cssText = `position: absolute; right: 6px; top: 0; bottom: 0; display: flex; align-items: center; font-size: 10px; color: rgba(255,255,255,0.6); font-weight: bold;`;
    barText.textContent = `${Math.round(pct)}%`;
    barTrack.appendChild(barText);

    row.appendChild(barTrack);

    const valBox = HTMLPanel.el('div');
    valBox.style.cssText = `min-width: 50px; text-align: right; font-size: 16px; font-weight: 900; color: ${st.color}; text-shadow: 0 0 8px ${st.color}40;`;
    valBox.textContent = st.short === 'CRT' ? `${st.val}%` : String(st.val);
    row.appendChild(valBox);

    content.appendChild(row);
  }

  content.appendChild(holoDivider());

  // ── Ability modules ──
  if (cls?.skills && cls.skills.length > 0) {
    const skillsHeader = HTMLPanel.el('div');
    skillsHeader.style.cssText = `font-size: 10px; color: ${C.textDim}; letter-spacing: 3px; margin-bottom: 12px;`;
    skillsHeader.textContent = '▸ ABILITY MODULES';
    content.appendChild(skillsHeader);

    const effectIcons: Record<string, string> = {
      damage: '⚔', heal: '✚', taunt: '◈', buff: '▲', aoe: '◉', summon: '◆',
    };
    const effectLabels: Record<string, string> = {
      damage: 'DMG', heal: 'HEAL', taunt: 'TAUNT', buff: 'BUFF', aoe: 'AOE', summon: 'SUMMON',
    };
    const targetLabels: Record<string, string> = {
      enemy: 'SINGLE', ally_lowest_hp: 'ALLY.MIN', self: 'SELF', all_enemies: 'ALL',
    };

    for (const skill of cls.skills) {
      const sc = HTMLPanel.el('div');
      sc.style.cssText = [
        'display: flex', 'gap: 14px', 'align-items: center',
        'padding: 10px 14px', 'margin-bottom: 8px',
        `background: ${C.bgCard}`,
        `border: 1px solid ${C.border}`,
        'border-radius: 2px',
        'transition: border-color 0.2s, box-shadow 0.2s',
      ].join('; ');
      sc.addEventListener('mouseenter', () => { sc.style.borderColor = C.cyan; sc.style.boxShadow = `0 0 12px rgba(0,240,255,0.1)`; });
      sc.addEventListener('mouseleave', () => { sc.style.borderColor = C.border; sc.style.boxShadow = 'none'; });

      const iconWrap = HTMLPanel.el('div');
      iconWrap.style.cssText = `width: 42px; height: 42px; border: 1px solid ${C.border}; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; background: rgba(0,240,255,0.03);`;
      iconWrap.textContent = effectIcons[skill.effectType] ?? '⚡';
      sc.appendChild(iconWrap);

      const sInfo = HTMLPanel.el('div');
      sInfo.style.cssText = 'flex: 1;';

      const sNameRow = HTMLPanel.el('div');
      sNameRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 3px;';
      const sName = HTMLPanel.el('span');
      sName.style.cssText = `font-size: 14px; font-weight: bold; color: ${C.cyan}; letter-spacing: 1px;`;
      sName.textContent = skill.name.toUpperCase();
      sNameRow.appendChild(sName);

      const typeTag = HTMLPanel.el('span');
      typeTag.style.cssText = `font-size: 9px; padding: 1px 6px; border: 1px solid ${C.border}; color: ${C.textDim}; letter-spacing: 1px;`;
      typeTag.textContent = effectLabels[skill.effectType] ?? skill.effectType;
      sNameRow.appendChild(typeTag);
      sInfo.appendChild(sNameRow);

      const sDetails = HTMLPanel.el('div');
      sDetails.style.cssText = `font-size: 10px; color: ${C.textDim}; letter-spacing: 1px;`;
      sDetails.textContent = `PWR: ${skill.power}x  //  TGT: ${targetLabels[skill.target] ?? skill.target}  //  CD: ${skill.cooldown} RND`;
      sInfo.appendChild(sDetails);

      sc.appendChild(sInfo);

      const cdWrap = HTMLPanel.el('div');
      cdWrap.style.cssText = 'text-align: center; flex-shrink: 0;';
      const cdVal = HTMLPanel.el('div');
      cdVal.style.cssText = `font-size: 22px; font-weight: 900; color: ${C.gold}; text-shadow: 0 0 8px rgba(255,215,0,0.3); line-height: 1;`;
      cdVal.textContent = String(skill.cooldown);
      cdWrap.appendChild(cdVal);
      const cdLabel = HTMLPanel.el('div');
      cdLabel.style.cssText = `font-size: 8px; color: ${C.textDim}; letter-spacing: 2px; margin-top: 2px;`;
      cdLabel.textContent = 'CYCLE';
      cdWrap.appendChild(cdLabel);
      sc.appendChild(cdWrap);

      content.appendChild(sc);
    }

    content.appendChild(holoDivider());
  }

  // ── Equipment loadout ──
  const gearHeader = HTMLPanel.el('div');
  gearHeader.style.cssText = `font-size: 10px; color: ${C.textDim}; letter-spacing: 3px; margin-bottom: 12px;`;
  gearHeader.textContent = '▸ EQUIPMENT LOADOUT';
  content.appendChild(gearHeader);

  const gearGrid = HTMLPanel.el('div');
  gearGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;';

  for (const [slot, lbl, slotCode] of [['mainHand', 'PRIMARY', 'WPN'], ['offHand', 'OFFHAND', 'OFF'], ['armor', 'ARMOR', 'ARM'], ['trinket', 'MODULE', 'MOD']] as [string, string, string][]) {
    const itemId = fighter.gear[slot as keyof typeof fighter.gear];
    const item   = itemId ? ITEM_DEFS[itemId] : null;

    const slotCard = HTMLPanel.el('div');
    slotCard.style.cssText = [
      'padding: 12px 8px', 'text-align: center',
      `background: ${C.bgCard}`,
      `border: 1px solid ${item ? C.border : 'rgba(0,240,255,0.08)'}`,
      'border-radius: 2px',
      'position: relative',
      'transition: border-color 0.2s',
    ].join('; ');
    if (item) {
      slotCard.addEventListener('mouseenter', () => { slotCard.style.borderColor = C.cyan; });
      slotCard.addEventListener('mouseleave', () => { slotCard.style.borderColor = C.border; });
    }

    const codeEl = HTMLPanel.el('div');
    codeEl.style.cssText = `font-size: 9px; color: ${C.textDim}; letter-spacing: 2px; margin-bottom: 8px;`;
    codeEl.textContent = `[${slotCode}] ${lbl}`;
    slotCard.appendChild(codeEl);

    if (item && itemId) {
      const icon = HTMLPanel.icon(`ITEM_${itemId.toUpperCase()}`, 48);
      icon.style.cssText = `margin: 0 auto 8px; display: block; filter: drop-shadow(0 0 6px ${C.cyanDim}); border-radius: 2px;`;
      slotCard.appendChild(icon);

      const nameEl = HTMLPanel.el('div');
      nameEl.style.cssText = `font-size: 11px; font-weight: bold; color: ${C.cyan}; letter-spacing: 1px; margin-bottom: 4px;`;
      nameEl.textContent = item.name.toUpperCase();
      slotCard.appendChild(nameEl);

      const sb = item.statBonuses ?? {};
      const parts: string[] = [];
      if (sb.atk)        parts.push(`+${sb.atk}ATK`);
      if (sb.def)        parts.push(`+${sb.def}DEF`);
      if (sb.hp)         parts.push(`+${sb.hp}HP`);
      if (sb.spd)        parts.push(`+${sb.spd.toFixed(2)}SPD`);
      if (sb.critChance) parts.push(`+${(sb.critChance * 100).toFixed(0)}%CRT`);
      if (parts.length > 0) {
        const bonusEl = HTMLPanel.el('div');
        bonusEl.style.cssText = `font-size: 9px; color: #00ff88; letter-spacing: 1px;`;
        bonusEl.textContent = parts.join(' ');
        slotCard.appendChild(bonusEl);
      }
    } else {
      const emptyEl = HTMLPanel.el('div');
      emptyEl.style.cssText = `font-size: 11px; color: rgba(0,240,255,0.2); padding: 14px 0; letter-spacing: 2px;`;
      emptyEl.textContent = '[ EMPTY ]';
      slotCard.appendChild(emptyEl);
    }

    gearGrid.appendChild(slotCard);
  }
  content.appendChild(gearGrid);

  // ── Footer ──
  const footer = HTMLPanel.el('div');
  footer.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid ${C.border};`;

  const footerLeft = HTMLPanel.el('div');
  footerLeft.style.cssText = `font-size: 9px; color: ${C.textDim}; letter-spacing: 1px; animation: mc-holo-pulse 4s infinite;`;
  footerLeft.textContent = `◈ MAGIC CITY GUILD SYSTEM v2.1`;
  footer.appendChild(footerLeft);

  const closeFullBtn = HTMLPanel.el('button');
  closeFullBtn.style.cssText = [
    'padding: 6px 32px',
    `background: transparent`,
    `border: 1px solid ${C.cyan}`,
    'border-radius: 2px',
    `color: ${C.cyan}`,
    'font-family: "Consolas", monospace',
    'font-size: 11px',
    'font-weight: bold',
    'letter-spacing: 2px',
    'cursor: pointer',
    'transition: all 0.15s',
  ].join('; ');
  closeFullBtn.textContent = 'CLOSE';
  closeFullBtn.addEventListener('mouseenter', () => { closeFullBtn.style.background = `rgba(0,240,255,0.15)`; closeFullBtn.style.boxShadow = `0 0 12px rgba(0,240,255,0.2)`; });
  closeFullBtn.addEventListener('mouseleave', () => { closeFullBtn.style.background = 'transparent'; closeFullBtn.style.boxShadow = 'none'; });
  closeFullBtn.addEventListener('click', () => closeDetailModal());
  footer.appendChild(closeFullBtn);

  content.appendChild(footer);

  wrap.appendChild(content);
  modal.appendChild(wrap);
  return modal;
}
