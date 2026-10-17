// ─── Magic City – Ranking Screen ────────────────────────────────
// Shows the expedition scoreboard / leaderboard.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { ScoreboardEntry } from '../../models/ScoreboardEntry';
import { ROUTE_DEFS } from '../../data/routes';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';

// ─── State ──────────────────────────────────────────────────────
let gameState: GameState | null = null;

export function initRankingScreen(state: GameState): void {
  gameState = state;
}

// ─── Dummy Data ─────────────────────────────────────────────────

const DUMMY_LEADERBOARD: {
  name: string; city: string; heroes: number; expeditions: number; gold: number;
}[] = [
  { name: 'Archmage Thorn', city: 'Sturmspitze', heroes: 8, expeditions: 42, gold: 12400 },
  { name: 'Lady Ironheart', city: 'Eisenfeste', heroes: 7, expeditions: 38, gold: 10850 },
  { name: 'Dunkelzahn', city: 'Nachthafen', heroes: 6, expeditions: 35, gold: 9300 },
  { name: 'Grimbold', city: 'Felsenheim', heroes: 6, expeditions: 30, gold: 7600 },
  { name: 'Silberwind', city: 'Mondlicht', heroes: 5, expeditions: 25, gold: 5200 },
  { name: 'Feuerzunge', city: 'Glutstadt', heroes: 5, expeditions: 22, gold: 4800 },
  { name: 'Nebelkrähe', city: 'Dunstmoor', heroes: 4, expeditions: 18, gold: 3500 },
  { name: 'Steinbrecher', city: 'Granitburg', heroes: 4, expeditions: 15, gold: 2900 },
  { name: 'Lichthüter', city: 'Sonnenwall', heroes: 3, expeditions: 12, gold: 2100 },
  { name: 'Kräuterling', city: 'Grünweide', heroes: 3, expeditions: 8, gold: 1400 },
];

// ─── Helpers ────────────────────────────────────────────────────

function routeName(routeId: string): string {
  const def = ROUTE_DEFS[routeId];
  return def ? def.name : routeId;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function rankClass(rank: number): string {
  if (rank === 1) return 'r1';
  if (rank === 2) return 'r2';
  if (rank === 3) return 'r3';
  return '';
}

// ─── Table Rows from Scoreboard ─────────────────────────────────

function renderScoreboardRows(entries: ScoreboardEntry[]): string {
  // Sort by score descending
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 20);

  return top.map((entry, i) => {
    const rank = i + 1;
    const rc = rankClass(rank);
    const statusIcon = entry.status === 'victory' ? '\u2705'
      : entry.status === 'defeat' ? '\u274C' : '\u{1F3F3}\uFE0F';

    return `
      <tr class="${rc}">
        <td class="rn">${rank}</td>
        <td class="rnm">Tag ${entry.day}</td>
        <td>${routeName(entry.routeId)}</td>
        <td>${entry.partyClasses.length}</td>
        <td>${statusIcon} ${entry.score}</td>
        <td class="rgold">${entry.enemiesKilled} \u2694</td>
      </tr>`;
  }).join('');
}

function renderDummyRows(): string {
  return DUMMY_LEADERBOARD.map((row, i) => {
    const rank = i + 1;
    const rc = rankClass(rank);
    return `
      <tr class="${rc}">
        <td class="rn">${rank}</td>
        <td class="rnm">${row.name}</td>
        <td>${row.city}</td>
        <td>${row.heroes}</td>
        <td>${row.expeditions}</td>
        <td class="rgold">\uD83D\uDCB0 ${row.gold}</td>
      </tr>`;
  }).join('');
}

// ─── Main Render ────────────────────────────────────────────────

export function renderRankingScreen(container: HTMLElement): void {
  const state = gameState;
  const headerHtml = state ? renderHeader(state, 'main', 'WELTRANGLISTE') : '';

  const hasScoreboard = state && state.scoreboard && state.scoreboard.length > 0;

  const myScoreSection = hasScoreboard ? `
    <p class="empty-msg" style="opacity:0.6;margin:0 0 8px">Deine besten Expeditionen</p>
    <table class="rtable" style="margin-bottom:28px">
      <thead><tr><th>#</th><th>Tag</th><th>Route</th><th>Helden</th><th>Score</th><th>Kills</th></tr></thead>
      <tbody>${renderScoreboardRows(state!.scoreboard)}</tbody>
    </table>
  ` : '';

  const worldLabel = hasScoreboard
    ? `<p class="empty-msg" style="opacity:0.6;margin:0 0 8px">Welt-Rangliste (Beispiel)</p>`
    : `<p class="empty-msg" style="opacity:0.6;margin:0 0 8px">Noch keine Eintr\u00E4ge \u2014 Beispiel-Rangliste</p>`;

  const worldSection = `
    ${worldLabel}
    <table class="rtable">
      <thead><tr><th>#</th><th>Spieler</th><th>Stadt</th><th>Helden</th><th>Exped.</th><th>Gold</th></tr></thead>
      <tbody>${renderDummyRows()}</tbody>
    </table>
  `;

  const el = document.createElement('div');
  el.id = 's-ranking';
  el.className = 'screen';
  el.innerHTML = `
      ${headerHtml}
      <div class="scontent" style="padding:16px;">
        ${myScoreSection}
        ${worldSection}
      </div>`;
  container.appendChild(el);

  // ─── Event Binding ──────────────────────────────────────────
  const backBtn = el.querySelector('.hdr-back') as HTMLElement | null;
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const target = backBtn.getAttribute('data-nav');
      if (target) navigateTo(target as any);
    });
  }
}
