// ─── Magic City – Bestiarium Screen ─────────────────────────────
// Monster encyclopedia showing discovered, defeated, and unknown enemies.
// ────────────────────────────────────────────────────────────────

import { EnemyDef, ENEMY_DEFS, ENEMY_LORE } from '../../data/enemies';
import { GameState } from '../../models/GameState';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';

// ─── State ──────────────────────────────────────────────────────
let gameState: GameState | null = null;

export function initBestiariumScreen(state: GameState): void {
  gameState = state;
}

// ─── Helpers ────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  melee: '\u2694\uFE0F Nahkampf',
  ranged: '\uD83C\uDFF9 Fernkampf',
  support: '\u2728 Support',
  boss: '\uD83D\uDC80 Boss',
};

function isDiscovered(enemyId: string): boolean {
  if (!gameState?.bestiarium) return false;
  return gameState.bestiarium.discovered.indexOf(enemyId) !== -1;
}

function isDefeated(enemyId: string): boolean {
  if (!gameState?.bestiarium) return false;
  return gameState.bestiarium.defeated.indexOf(enemyId) !== -1;
}

// ─── Monster Card ───────────────────────────────────────────────

function renderMonsterCard(enemy: EnemyDef): string {
  const discovered = isDiscovered(enemy.id);
  const defeated = isDefeated(enemy.id);

  if (!discovered) {
    return `
      <div class="monster-card monster-unknown">
        <div class="mc-ico" style="opacity:0.3">
          <img src="assets/sprites/final/${enemy.spriteKey}.png" class="mc-sprite"
               style="filter:brightness(0)"
               onerror="this.style.display='none'">
          <span class="mc-emoji">\u2753</span>
        </div>
        <div class="mc-nm">???</div>
        <div class="mc-role">Unbekannt</div>
        <div class="mc-stats" style="opacity:0.3">
          <span>HP ???</span>
          <span>ATK ???</span>
        </div>
      </div>`;
  }

  const borderStyle = defeated ? 'border-color:#d4a017;box-shadow:0 0 8px rgba(212,160,23,0.5)' : '';
  const defeatedBadge = defeated ? '<span class="mc-badge">\u2705</span>' : '';
  const roleLabel = ROLE_LABELS[enemy.role] ?? enemy.role;

  return `
    <div class="monster-card${defeated ? ' monster-defeated' : ''}"
         data-enemy-id="${enemy.id}"
         style="${borderStyle}">
      <div class="mc-ico">
        <img src="assets/sprites/final/${enemy.spriteKey}.png" class="mc-sprite"
             onerror="this.style.display='none'">
        ${defeatedBadge}
      </div>
      <div class="mc-nm">${enemy.name}</div>
      <div class="mc-role">${roleLabel}</div>
      <div class="mc-stats">
        <span>\u2764 ${enemy.hp}</span>
        <span>\u2694 ${enemy.atk}</span>
        <span>\uD83D\uDEE1 ${enemy.def}</span>
        <span>\u26A1 ${enemy.spd}</span>
      </div>
    </div>`;
}

// ─── Detail Modal ───────────────────────────────────────────────

function renderDetailModal(enemy: EnemyDef): string {
  const defeated = isDefeated(enemy.id);
  const roleLabel = ROLE_LABELS[enemy.role] ?? enemy.role;

  // Lore from ENEMY_LORE (separate table) or fallback to inline lore
  const loreEntry = ENEMY_LORE[enemy.id];
  const loreText = loreEntry?.lore ?? enemy.lore;
  const loreHtml = loreText
    ? `<div class="md-section"><div class="lbl">HINTERGRUND</div><p>${loreText}</p></div>`
    : '';

  // Merge skill descriptions from ENEMY_LORE into skill display
  const skillDescs = loreEntry?.skillDescriptions ?? {};
  const skillsHtml = enemy.skills.length > 0
    ? `<div class="md-section">
        <div class="lbl">F\u00C4HIGKEITEN</div>
        ${enemy.skills.map(sk => {
          const desc = sk.description ?? skillDescs[sk.id] ?? '';
          return `
          <div class="md-skill">
            <span class="md-skill-name">${sk.name}</span>
            <span class="md-skill-cd">CD: ${sk.cooldown}</span>
            <span class="md-skill-type">${sk.effectType}</span>
            ${desc ? `<div class="md-skill-desc">${desc}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`
    : '';

  const enrageHtml = enemy.enrage
    ? `<div class="md-section"><div class="lbl">Enrage</div>
        <p>Ab Runde ${enemy.enrage.afterRound}: ATK \u00D7${enemy.enrage.atkMult}, SPD \u00D7${enemy.enrage.spdMult}</p>
      </div>`
    : '';

  const dropHtml = `<div class="md-section"><div class="lbl">BEUTE</div>
    <div class="md-drop-row">
      ${enemy.goldReward ? `<span>\uD83D\uDCB0 ${enemy.goldReward} Gold</span>` : ''}
      <span>\u2B50 ${enemy.xpReward} XP</span>
    </div>
  </div>`;

  const biomeLabel = loreEntry?.route ?? enemy.route ?? '';

  return `
    <div class="ov" id="bestiarium-detail-ov">
      <div class="modal bst-detail">
        <button class="mcl" id="bestiarium-detail-close">\u2715</button>
        <div class="bst-header">
          <img src="assets/sprites/final/${enemy.spriteKey}.png" class="bst-sprite"
               onerror="this.style.display='none'">
          <div class="bst-header-info">
            <div class="mt">${enemy.name}${defeated ? ' \u2705' : ''}</div>
            <div class="ms">
              <span>${roleLabel}</span>
              ${enemy.isBoss ? ' &middot; <span style="color:#d4a017">BOSS</span>' : ''}
              ${biomeLabel ? ` &middot; <span style="text-transform:capitalize">${biomeLabel}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="md">
          <div class="md-section">
            <div class="lbl">STATS</div>
            <div class="md-stats">
              <span class="bst-stat">\u2764\uFE0F <b>${enemy.hp}</b> HP</span>
              <span class="bst-stat">\u2694\uFE0F <b>${enemy.atk}</b> ATK</span>
              <span class="bst-stat">\uD83D\uDEE1\uFE0F <b>${enemy.def}</b> DEF</span>
              <span class="bst-stat">\u26A1 <b>${enemy.spd}</b> SPD</span>
              <span class="bst-stat">\uD83C\uDFAF <b>${Math.round(enemy.critChance * 100)}%</b> CRIT</span>
            </div>
          </div>
          ${loreHtml}
          ${skillsHtml}
          ${enrageHtml}
          ${dropHtml}
        </div>
      </div>
    </div>`;
}

// ─── Main Render ────────────────────────────────────────────────

export function renderBestiariumScreen(container: HTMLElement): void {
  // Remove previous instance to avoid duplicates on re-render
  const prev = document.getElementById('s-bestiarium');
  if (prev) prev.remove();

  const state = gameState;
  const headerHtml = state ? renderHeader(state, 'main', 'BESTIARIUM') : '';

  const enemies = Object.values(ENEMY_DEFS);
  const discoveredCount = state?.bestiarium
    ? enemies.filter(e => state.bestiarium.discovered.indexOf(e.id) !== -1).length
    : 0;
  const defeatedCount = state?.bestiarium
    ? enemies.filter(e => state.bestiarium.defeated.indexOf(e.id) !== -1).length
    : 0;

  const cards = enemies.map(e => renderMonsterCard(e)).join('');

  const el = document.createElement('div');
  el.id = 's-bestiarium';
  el.className = 'screen';
  el.innerHTML = `
      ${headerHtml}
      <div class="scontent" style="padding:16px;">
        <div style="display:flex;gap:16px;margin-bottom:12px;font-size:13px;opacity:0.8;align-items:center;">
          <span>Entdeckt: ${discoveredCount}/${enemies.length}</span>
          <span>Besiegt: ${defeatedCount}/${enemies.length}</span>
          <button id="bestiarium-debug-all" style="margin-left:auto;background:var(--s3);border:1px solid var(--bdr);color:var(--gold);padding:4px 12px;border-radius:6px;font-size:0.72rem;cursor:pointer;">🔓 Alle anzeigen (Debug)</button>
        </div>
        <div class="hcards">
          ${cards}
        </div>
      </div>`;
  container.appendChild(el);

  // ─── Event Binding ──────────────────────────────────────────

  // Debug button: discover + defeat all enemies
  const debugBtn = el.querySelector('#bestiarium-debug-all') as HTMLElement | null;
  if (debugBtn && state) {
    debugBtn.addEventListener('click', () => {
      if (!state.bestiarium) {
        state.bestiarium = { discovered: [], defeated: [] };
      }
      for (const e of enemies) {
        if (state.bestiarium.discovered.indexOf(e.id) === -1) {
          state.bestiarium.discovered.push(e.id);
        }
        if (state.bestiarium.defeated.indexOf(e.id) === -1) {
          state.bestiarium.defeated.push(e.id);
        }
      }
      renderBestiariumScreen(container);
    });
  }

  // Back button
  const backBtn = el.querySelector('.hdr-back') as HTMLElement | null;
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const target = backBtn.getAttribute('data-nav');
      if (target) navigateTo(target as any);
    });
  }

  // Monster card click → detail modal (only discovered)
  const monsterCards = el.querySelectorAll('.monster-card:not(.monster-unknown)');
  for (let i = 0; i < monsterCards.length; i++) {
    monsterCards[i].addEventListener('click', () => {
      const enemyId = monsterCards[i].getAttribute('data-enemy-id');
      if (!enemyId) return;
      const enemy = ENEMY_DEFS[enemyId];
      if (!enemy) return;
      openDetailModal(enemy, container);
    });
  }
}

// ─── Modal ──────────────────────────────────────────────────────

function openDetailModal(enemy: EnemyDef, container: HTMLElement): void {
  // Remove any existing modal
  const existing = container.querySelector('#bestiarium-detail-ov');
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderDetailModal(enemy);
  const overlay = wrapper.firstElementChild as HTMLElement;
  container.appendChild(overlay);

  // Show overlay (needs .on class to become visible)
  requestAnimationFrame(() => overlay.classList.add('on'));

  // Close button
  const closeBtn = overlay.querySelector('#bestiarium-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.remove());
  }

  // Click overlay background to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
