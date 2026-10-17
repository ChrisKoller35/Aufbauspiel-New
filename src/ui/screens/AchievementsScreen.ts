// ─── Magic City – Achievements Screen ───────────────────────────
// Shows all achievements with unlock status and progress.
// ────────────────────────────────────────────────────────────────

import { AchievementDef, ACHIEVEMENT_DEFS } from '../../data/achievements';
import { GameState } from '../../models/GameState';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';

// ─── State ──────────────────────────────────────────────────────
let gameState: GameState | null = null;

export function initAchievementsScreen(state: GameState): void {
  gameState = state;
}

// ─── Helpers ────────────────────────────────────────────────────

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_building: '\uD83C\uDFD7\uFE0F',
  first_expedition: '\uD83E\uDDED',
  first_victory: '\uD83C\uDFC6',
  first_boss: '\uD83D\uDC80',
  gold_hoarder: '\uD83D\uDCB0',
  mass_builder: '\uD83C\uDFDB\uFE0F',
  veteran_explorer: '\u2694\uFE0F',
  boss_slayer: '\uD83D\uDD25',
  survivor_100: '\u2B50',
  army_builder: '\uD83D\uDEE1\uFE0F',
  kill_100: '\uD83D\uDCA0',
  perfectionist: '\uD83D\uDC8E',
};

/** Try to extract a progress value from the achievement condition. */
function getProgress(def: AchievementDef, stats: Record<string, number>): { current: number; target: number } | null {
  // We infer targets from known achievement IDs
  const TARGETS: Record<string, { key: string; target: number }> = {
    first_building: { key: 'total_buildings_built', target: 1 },
    first_expedition: { key: 'total_expeditions', target: 1 },
    first_victory: { key: 'total_victories', target: 1 },
    first_boss: { key: 'total_bosses_killed', target: 1 },
    gold_hoarder: { key: 'total_gold_earned', target: 500 },
    mass_builder: { key: 'total_buildings_built', target: 20 },
    veteran_explorer: { key: 'total_expeditions', target: 10 },
    boss_slayer: { key: 'total_bosses_killed', target: 5 },
    survivor_100: { key: 'total_days_survived', target: 100 },
    army_builder: { key: 'total_fighters_trained', target: 10 },
    kill_100: { key: 'total_enemies_killed', target: 100 },
    perfectionist: { key: 'total_flawless_victories', target: 1 },
  };

  const info = TARGETS[def.id];
  if (!info) return null;
  const current = stats[info.key] ?? 0;
  return { current: Math.min(current, info.target), target: info.target };
}

// ─── Achievement Card ───────────────────────────────────────────

function renderAchievementCard(def: AchievementDef, stats: Record<string, number>): string {
  const unlocked = def.condition(stats);
  const icon = ACHIEVEMENT_ICONS[def.id] ?? '\uD83C\uDFC5';
  const progress = getProgress(def, stats);

  const progressHtml = progress && !unlocked
    ? `<div class="ach-progress">
        <div class="lvbar"><div class="lvfill" style="width:${Math.round((progress.current / progress.target) * 100)}%"></div></div>
        <span class="ach-prog-text">${progress.current}/${progress.target}</span>
      </div>`
    : '';

  const cardClass = unlocked ? 'ach-card ach-unlocked' : 'ach-card ach-locked';

  return `
    <div class="${cardClass}">
      <div class="ach-ico">${icon}</div>
      <div class="ach-info">
        <div class="ach-title">${def.name}</div>
        <div class="ach-desc">${def.description}</div>
        ${progressHtml}
      </div>
      ${unlocked ? '<div class="ach-check">\u2705</div>' : ''}
    </div>`;
}

// ─── Main Render ────────────────────────────────────────────────

export function renderAchievementsScreen(container: HTMLElement): void {
  const state = gameState;
  const headerHtml = state ? renderHeader(state, 'main', 'ERFOLGE') : '';
  const stats = state?.statistics ?? {};

  const unlockedCount = ACHIEVEMENT_DEFS.filter(d => d.condition(stats)).length;
  const totalCount = ACHIEVEMENT_DEFS.length;

  // Render unlocked first, then locked
  const sorted = [...ACHIEVEMENT_DEFS].sort((a, b) => {
    const aU = a.condition(stats) ? 0 : 1;
    const bU = b.condition(stats) ? 0 : 1;
    return aU - bU;
  });

  const cards = sorted.map(d => renderAchievementCard(d, stats)).join('');

  const el = document.createElement('div');
  el.id = 's-achievements';
  el.className = 'screen';
  el.innerHTML = `
      ${headerHtml}
      <div class="scontent" style="padding:16px;">
        <div style="display:flex;gap:16px;margin-bottom:12px;font-size:13px;opacity:0.8;">
          <span>Freigeschaltet: ${unlockedCount}/${totalCount}</span>
        </div>
        <div class="hcards">
          ${cards}
        </div>
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
}
