// ─── Magic City – GuildScoreboardTab ─────────────────────────────────────────
// Renders the Scoreboard (Ehrentafel) tab of the Guild UI.
// ─────────────────────────────────────────────────────────────────────────────

import { HTMLPanel } from '../HTMLPanel';
import { GameState } from '../../../models/GameState';
import { ROUTE_DEFS } from '../../../data/routes';
import { DIFFICULTY_DEFS } from '../../../data/difficulty';
import { MODIFIER_DEFS } from '../../../data/modifiers';
import {
  generateWeeklyChallenge,
  getMedalThresholds,
  getTimeUntilNextChallenge,
} from '../../../data/weeklyChallenges';
import { GuildTabContext } from './GuildTabContext';
import { makeInfoText, makeDivider } from './GuildTabHelpers';

export class GuildScoreboardTab {
  private ctx: GuildTabContext;

  constructor(ctx: GuildTabContext) {
    this.ctx = ctx;
  }

  render(container: HTMLElement, state: GameState): void {
    const c = container;

    this.renderWeeklyChallengeBanner(state, c);
    c.appendChild(makeDivider());

    c.appendChild(makeInfoText('Die besten Expeditionen deiner Gilde.'));

    // ── Route filter ──
    const filterRow = HTMLPanel.el('div');
    filterRow.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px;';

    const allFilterBtn = HTMLPanel.el('button', 'mc-btn ' + (this.ctx.scoreboardRouteFilter === null ? 'success' : ''));
    allFilterBtn.textContent = 'Alle';
    allFilterBtn.addEventListener('click', () => {
      this.ctx.scoreboardRouteFilter = null;
      this.ctx.refresh();
    });
    filterRow.appendChild(allFilterBtn);

    for (const route of Object.values(ROUTE_DEFS)) {
      const isActive = this.ctx.scoreboardRouteFilter === route.id;
      const btn = HTMLPanel.el('button', 'mc-btn ' + (isActive ? 'success' : ''));
      btn.style.fontSize = 'var(--mc-font-size-xs)';
      btn.style.padding  = '3px 8px';
      btn.textContent = route.name.length > 12 ? route.name.substring(0, 11) + '..' : route.name;
      btn.addEventListener('click', () => {
        this.ctx.scoreboardRouteFilter = route.id;
        this.ctx.refresh();
      });
      filterRow.appendChild(btn);
    }
    c.appendChild(filterRow);
    c.appendChild(makeDivider());

    const entries = state.scoreboard ?? [];
    const filtered = this.ctx.scoreboardRouteFilter
      ? entries.filter(e => e.routeId === this.ctx.scoreboardRouteFilter)
      : entries;

    if (filtered.length === 0) {
      c.appendChild(makeInfoText('Noch keine Eintraege. Schliesse Expeditionen ab!', 'mc-label-dim'));
      return;
    }

    // ── Top 5 entries ──
    const heading = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
    heading.style.marginBottom = '8px';
    heading.textContent = 'Top 5 Expeditionen';
    c.appendChild(heading);

    const top5 = [...filtered].sort((a, b) => b.score - a.score).slice(0, 5);

    const table = HTMLPanel.el('div');
    table.style.cssText = [
      'display: grid',
      'grid-template-columns: 28px 1fr 80px 100px 120px 80px',
      'gap: 0 8px',
      'font-size: var(--mc-font-size-sm)',
    ].join('; ');

    for (const label of ['#', 'Route', 'Score', 'Schwierigkeit', 'Modifikator', 'Ergebnis']) {
      const h = HTMLPanel.el('div', 'mc-label-dim mc-text-sm mc-bold');
      h.style.cssText = 'padding: 3px 0; border-bottom: 1px solid var(--mc-navy-separator); margin-bottom: 3px;';
      h.textContent = label;
      table.appendChild(h);
    }

    top5.forEach((entry, i) => {
      const rankColors = ['var(--mc-gold-bright)', 'var(--mc-light)', '#CD7F32', 'var(--mc-dim)', 'var(--mc-dim)'];
      const rankColor  = rankColors[i] ?? 'var(--mc-dim)';
      const rankPrefix = i === 0 ? '★ ' : '';

      const routeDef  = ROUTE_DEFS[entry.routeId];
      const diffDef   = DIFFICULTY_DEFS[entry.difficulty];
      const modDef    = entry.modifier ? MODIFIER_DEFS[entry.modifier] : null;
      const statusMap: Record<string, {text: string; color: string}> = {
        victory: { text: 'Sieg',       color: 'var(--mc-heal)' },
        defeat:  { text: 'Niederlage', color: 'var(--mc-damage)' },
        retreat: { text: 'Rueckzug',   color: 'var(--mc-gold)' },
      };
      const statusInfo = statusMap[entry.status] ?? { text: entry.status, color: 'var(--mc-light)' };

      const rowBg    = i % 2 === 0 ? 'var(--mc-navy-card)' : 'transparent';
      const cellStyle = `padding: 4px 0; background: ${rowBg};`;

      const makeCell = (text: string, color?: string, bold?: boolean): HTMLElement => {
        const el = HTMLPanel.el('div');
        el.style.cssText = cellStyle;
        el.style.color = color ?? 'var(--mc-light)';
        if (bold) el.style.fontWeight = 'bold';
        el.textContent = text;
        return el;
      };

      table.appendChild(makeCell(`${rankPrefix}${i + 1}`, rankColor, i === 0));
      table.appendChild(makeCell(routeDef?.name ?? entry.routeId));
      table.appendChild(makeCell(String(entry.score), 'var(--mc-gold-bright)', i === 0));
      table.appendChild(makeCell(diffDef?.name ?? entry.difficulty, 'var(--mc-info)'));
      table.appendChild(makeCell(modDef?.name ?? 'Keiner', modDef ? 'var(--mc-damage)' : 'var(--mc-dim)'));
      table.appendChild(makeCell(statusInfo.text, statusInfo.color));
    });
    c.appendChild(table);

    c.appendChild(makeDivider());

    // ── Records ──
    const recHeading = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
    recHeading.style.cssText = 'margin-top: 4px; margin-bottom: 8px;';
    recHeading.textContent = 'Rekorde';
    c.appendChild(recHeading);

    const allSorted    = [...filtered].sort((a, b) => b.score - a.score);
    const victories    = filtered.filter(e => e.status === 'victory');
    const totalEnemies = filtered.reduce((s, e) => s + e.enemiesKilled, 0);
    const totalBosses  = filtered.reduce((s, e) => s + e.bossesKilled, 0);

    const records = [
      { label: 'Hoechster Score',       value: allSorted[0]?.score.toString() ?? '-' },
      { label: 'Expeditionen gesamt',   value: `${filtered.length}` },
      { label: 'Siege',                 value: `${victories.length}` },
      { label: 'Siegquote',             value: filtered.length > 0 ? `${Math.round(victories.length / filtered.length * 100)}%` : '-' },
      { label: 'Gegner besiegt',        value: `${totalEnemies}` },
      { label: 'Bosse besiegt',         value: `${totalBosses}` },
    ];

    const recGrid = HTMLPanel.el('div');
    recGrid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;';

    for (const rec of records) {
      const recCard = HTMLPanel.el('div', 'mc-card');
      recCard.style.padding = '8px 10px';

      const lbl = HTMLPanel.el('div', 'mc-text-sm mc-label-dim');
      lbl.textContent = rec.label;
      const val = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
      val.textContent = rec.value;
      recCard.appendChild(lbl);
      recCard.appendChild(val);
      recGrid.appendChild(recCard);
    }
    c.appendChild(recGrid);
  }

  private renderWeeklyChallengeBanner(state: GameState, container: HTMLElement): void {
    const challenge  = generateWeeklyChallenge();
    const thresholds = getMedalThresholds(challenge);
    const routeDef   = ROUTE_DEFS[challenge.routeId];
    const diffDef    = DIFFICULTY_DEFS[challenge.difficulty];
    const modDef     = challenge.requiredModifier ? MODIFIER_DEFS[challenge.requiredModifier] : null;

    const wcState   = state.weeklyChallenge;
    const isActive  = wcState?.currentChallengeId === challenge.id;
    const bestScore = isActive ? (wcState?.bestScore ?? 0) : 0;
    const medal     = isActive ? (wcState?.medal ?? 'none') : 'none';
    const attempts  = isActive ? (wcState?.attempts ?? 0) : 0;

    const banner = HTMLPanel.el('div', 'mc-card');
    banner.style.cssText = [
      'border-color: var(--mc-gold)',
      'padding: 10px 14px',
      'margin-bottom: 10px',
      'background: rgba(212,165,74,0.06)',
    ].join('; ');

    const headerRow = HTMLPanel.el('div');
    headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;';

    const titleEl = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
    titleEl.textContent = `⚔ ${challenge.displayName}`;
    headerRow.appendChild(titleEl);

    const msLeft    = getTimeUntilNextChallenge();
    const hoursLeft = Math.floor(msLeft / 3600000);
    const daysLeft  = Math.floor(hoursLeft / 24);
    const timerStr  = daysLeft > 0 ? `${daysLeft}T ${hoursLeft % 24}h` : `${hoursLeft}h`;
    const timerEl   = HTMLPanel.el('div', 'mc-text-sm mc-label-dim');
    timerEl.textContent = `Endet in: ${timerStr}`;
    headerRow.appendChild(timerEl);
    banner.appendChild(headerRow);

    const descEl = HTMLPanel.el('div', 'mc-text-sm mc-label-light');
    descEl.style.marginBottom = '4px';
    descEl.textContent = challenge.description;
    banner.appendChild(descEl);

    const reqParts = [
      `Route: ${routeDef?.name ?? challenge.routeId}`,
      `Schwierigkeit: ${diffDef?.name ?? challenge.difficulty}`,
    ];
    if (modDef) reqParts.push(`Modifier: ${modDef.name}`);
    const reqEl = HTMLPanel.el('div', 'mc-text-sm mc-label-info');
    reqEl.style.marginBottom = '4px';
    reqEl.textContent = reqParts.join('  |  ');
    banner.appendChild(reqEl);

    if (challenge.restrictions?.length > 0) {
      const restEl = HTMLPanel.el('div', 'mc-text-sm mc-label-damage');
      restEl.style.marginBottom = '4px';
      restEl.textContent = `Regeln: ${challenge.restrictions.map((r: { label: string }) => r.label).join(', ')}`;
      banner.appendChild(restEl);
    }

    const medalEl = HTMLPanel.el('div', 'mc-text-sm mc-label-dim');
    medalEl.style.marginBottom = '4px';
    medalEl.textContent = `Bronze: ${thresholds.bronze}  |  Silber: ${thresholds.silver}  |  Gold: ${thresholds.gold}`;
    banner.appendChild(medalEl);

    const medalColors: Record<string, string> = {
      none: 'var(--mc-dim)', bronze: '#CD7F32', silver: '#C0C0C0', gold: 'var(--mc-gold-bright)',
    };
    const medalSymbols: Record<string, string> = {
      none: '-', bronze: '[Bronze]', silver: '[Silber]', gold: '[Gold]',
    };
    const statusStr = attempts > 0
      ? `Dein Bester: ${bestScore}  ${medalSymbols[medal]}  (${attempts} Versuche)`
      : 'Noch kein Versuch';
    const statusEl = HTMLPanel.el('div', 'mc-bold mc-text-sm');
    statusEl.style.color = medalColors[medal] ?? 'var(--mc-dim)';
    statusEl.textContent = statusStr;
    banner.appendChild(statusEl);

    container.appendChild(banner);
  }
}
