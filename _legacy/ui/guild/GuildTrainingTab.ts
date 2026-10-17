// ─── Magic City – GuildTrainingTab ───────────────────────────────────────────
// Renders the Training tab of the Guild UI.
// ─────────────────────────────────────────────────────────────────────────────

import { HTMLPanel } from '../HTMLPanel';
import { GameState } from '../../../models/GameState';
import { CLASS_DEFS } from '../../../data/classes';
import { BUILDING_DEFS } from '../../../data/buildings';
import { STARTING_CLASSES } from '../../../data/classUnlocks';
import { GuildTabContext } from './GuildTabContext';
import {
  makeInfoText,
  makeDangerText,
  makeDivider,
  translateRole,
} from './GuildTabHelpers';

export class GuildTrainingTab {
  private ctx: GuildTabContext;

  constructor(ctx: GuildTabContext) {
    this.ctx = ctx;
  }

  render(container: HTMLElement, state: GameState): void {
    const c = container;

    c.appendChild(makeInfoText('Trainiere Buerger zu Kaempfern fuer Expeditionen.'));

    const guildHall = state.buildings.find(b => b.typeId === 'GUILD_HALL' && b.built);
    const trainingDef = guildHall ? BUILDING_DEFS['GUILD_HALL'].training : null;

    if (!trainingDef) {
      c.appendChild(makeDangerText('Kein Gildenhaus gebaut! Baue eins um zu trainieren.'));
      return;
    }

    const idleCitizens     = state.citizens.filter(cit => cit.status === 'IDLE');
    const trainingCitizens = state.citizens.filter(cit => cit.status === 'GUILD_TRAINING');

    const statBar = HTMLPanel.el('div', 'mc-card mc-text-center mc-text-md');
    statBar.style.cssText = 'margin-bottom: 12px; padding: 6px 12px; color: var(--mc-gold);';
    statBar.textContent =
      `Freie Buerger: ${idleCitizens.length}   |   In Training: ${trainingCitizens.length}   |   Kaempfer: ${state.fighters.length}`;
    c.appendChild(statBar);

    // ── Currently training ──
    if (trainingCitizens.length > 0) {
      c.appendChild(makeDivider());
      const heading = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
      heading.style.marginBottom = '8px';
      heading.textContent = 'Aktuell in Training:';
      c.appendChild(heading);

      for (const cit of trainingCitizens) {
        const cls       = CLASS_DEFS[cit.trainingClassId ?? ''];
        const remaining = Math.ceil(cit.trainingTimer);
        const totalTime = trainingDef.trainingTimeSec;
        const pct       = totalTime > 0 ? Math.max(0, Math.min(1, (totalTime - cit.trainingTimer) / totalTime)) : 0;

        const row = HTMLPanel.el('div');
        row.style.cssText = 'margin-bottom: 8px;';

        const label = HTMLPanel.el('div', 'mc-text-sm mc-label-dim');
        label.style.marginBottom = '3px';
        label.textContent = `${cls?.name ?? cit.trainingClassId} – noch ${remaining}s`;
        row.appendChild(label);

        const track = HTMLPanel.el('div', 'mc-bar-track');
        track.style.height = '8px';
        const fill = HTMLPanel.el('div', 'mc-bar-fill');
        fill.style.cssText = `width: ${Math.round(pct * 100)}%; background: var(--mc-heal);`;
        track.appendChild(fill);
        row.appendChild(track);

        c.appendChild(row);
      }
    }

    // ── Class selection ──
    c.appendChild(makeDivider());
    const heading2 = HTMLPanel.el('div', 'mc-bold mc-text-md mc-label-gold');
    heading2.style.marginBottom = '8px';
    heading2.textContent = 'Klasse waehlen:';
    c.appendChild(heading2);

    if (idleCitizens.length === 0) {
      c.appendChild(makeInfoText(
        trainingCitizens.length > 0
          ? 'Alle Buerger im Einsatz – Karten zeigen laufendes Training.'
          : 'Keine freien Buerger. Baue mehr Wohnhaeuser!',
        trainingCitizens.length > 0 ? 'mc-label-gold' : 'mc-label-damage',
      ));
    }

    const unlockedIds: string[] = state.classesUnlocked ?? STARTING_CLASSES;
    const allClasses = Object.values(CLASS_DEFS);
    const unlocked   = allClasses.filter(cls => unlockedIds.includes(cls.id));
    const locked     = allClasses.filter(cls => !unlockedIds.includes(cls.id));
    const canTrain   = idleCitizens.length > 0;

    const traineesByClass: Record<string, Array<{remaining: number; pct: number}>> = {};
    for (const cit of trainingCitizens) {
      const key = cit.trainingClassId ?? '';
      if (!traineesByClass[key]) traineesByClass[key] = [];
      const remaining = Math.ceil(cit.trainingTimer);
      const pct = trainingDef.trainingTimeSec > 0
        ? Math.max(0, Math.min(1, (trainingDef.trainingTimeSec - cit.trainingTimer) / trainingDef.trainingTimeSec))
        : 0;
      traineesByClass[key].push({ remaining, pct });
    }

    const classGrid = HTMLPanel.el('div');
    classGrid.style.cssText = [
      'display: grid',
      'grid-template-columns: repeat(3, 1fr)',
      'gap: 12px',
      'margin-bottom: 16px',
    ].join('; ');

    for (const cls of unlocked) {
      const trainees   = traineesByClass[cls.id] ?? [];
      const costEntries = Object.entries(trainingDef.trainingCost);
      const canAfford   = canTrain && costEntries.every(
        ([res, amt]) => (state.globalStock[res] ?? 0) >= amt,
      );
      const costStr = costEntries.map(([r, a]) => `${a} ${r}`).join(', ');
      classGrid.appendChild(this.makeClassCard(cls, costStr, canAfford, canTrain, trainees, state, trainingDef));
    }
    c.appendChild(classGrid);

    // Locked classes
    if (locked.length > 0) {
      c.appendChild(makeDivider());
      const lockHeading = HTMLPanel.el('div', 'mc-bold mc-text-sm mc-label-dim');
      lockHeading.style.marginBottom = '8px';
      lockHeading.textContent = 'Gesperrte Klassen:';
      c.appendChild(lockHeading);

      const lockedGrid = HTMLPanel.el('div');
      lockedGrid.style.cssText = [
        'display: grid',
        'grid-template-columns: repeat(3, 1fr)',
        'gap: 8px',
      ].join('; ');

      for (const cls of locked) {
        const chip = HTMLPanel.el('div', 'mc-card mc-text-center');
        chip.style.cssText = 'padding: 8px; opacity: 0.5;';
        chip.innerHTML = `<div style="font-size:18px">🔒</div>
          <div class="mc-label-dim mc-text-md mc-bold">${cls.name}</div>
          <div class="mc-label-muted mc-text-sm mc-italic">Gesperrt</div>`;
        lockedGrid.appendChild(chip);
      }
      c.appendChild(lockedGrid);
    }
  }

  private makeClassCard(
    cls: typeof CLASS_DEFS[string],
    costStr: string,
    canAfford: boolean,
    canTrain: boolean,
    trainees: Array<{remaining: number; pct: number}>,
    state: GameState,
    trainingDef: NonNullable<typeof BUILDING_DEFS[string]['training']>,
  ): HTMLElement {
    const card = HTMLPanel.el('div', 'mc-card mc-hero-card');
    card.setAttribute('data-role', cls.role);
    card.style.cssText = [
      'display: flex',
      'flex-direction: column',
      'gap: 6px',
      'cursor: ' + (canAfford ? 'pointer' : 'default'),
    ].join('; ');

    const portrait = HTMLPanel.el('div');
    portrait.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    const iconFrame = HTMLPanel.el('div', 'mc-hero-portrait');
    iconFrame.setAttribute('data-role', cls.role);
    const icon = HTMLPanel.icon(cls.spriteKey, 56);
    icon.style.cssText = 'border-radius: 4px;';
    iconFrame.appendChild(icon);
    portrait.appendChild(iconFrame);

    const nameBlock = HTMLPanel.el('div');
    nameBlock.style.flex = '1';
    const nameEl = HTMLPanel.el('div', 'mc-bold mc-text-lg');
    nameEl.style.color = `var(--mc-role-${cls.role})`;
    nameEl.textContent = cls.name;
    const roleBadge = HTMLPanel.el('span', 'mc-role-badge');
    roleBadge.setAttribute('data-role', cls.role);
    roleBadge.textContent = translateRole(cls.role);
    nameBlock.appendChild(nameEl);
    nameBlock.appendChild(roleBadge);
    portrait.appendChild(nameBlock);
    card.appendChild(portrait);

    const stats = cls.baseStats;
    const maxStatVal = 200;
    const statDefs = [
      { label: 'HP',  val: stats.maxHp * 5,  cls: 'mc-bar-hp' },
      { label: 'ATK', val: stats.atk * 20,   cls: 'mc-bar-atk' },
      { label: 'DEF', val: stats.def * 25,   cls: 'mc-bar-def' },
    ];
    for (const s of statDefs) {
      const row = HTMLPanel.el('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 6px;';
      const lbl = HTMLPanel.el('span', 'mc-label-muted mc-text-sm');
      lbl.style.width = '28px';
      lbl.textContent = s.label;
      const track = HTMLPanel.statBar(s.val, maxStatVal, s.cls as 'mc-bar-hp' | 'mc-bar-atk' | 'mc-bar-def');
      track.style.flex = '1';
      row.appendChild(lbl);
      row.appendChild(track);
      card.appendChild(row);
    }

    const skillRow = HTMLPanel.el('div');
    skillRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';
    const skillIcons: Record<string, string> = { damage: '⚔', heal: '💚', taunt: '🛡', buff: '✨', aoe: '💥', summon: '👻' };
    for (const sk of cls.skills) {
      const chip = HTMLPanel.el('span', 'mc-skill-chip');
      const iconSpan = HTMLPanel.el('span', 'mc-skill-icon');
      iconSpan.textContent = skillIcons[sk.effectType] ?? '⚡';
      chip.appendChild(iconSpan);
      const nameSpan = HTMLPanel.el('span');
      nameSpan.textContent = sk.name;
      chip.appendChild(nameSpan);
      skillRow.appendChild(chip);
    }
    card.appendChild(skillRow);

    const costEl = HTMLPanel.el('div', 'mc-text-sm mc-bold ' + (canAfford ? 'mc-label-gold' : 'mc-label-damage'));
    costEl.textContent = `Kosten: ${costStr}`;
    card.appendChild(costEl);

    if (trainees.length > 0) {
      const t = trainees[0];
      const traineeRow = HTMLPanel.el('div');
      traineeRow.style.cssText = 'border-top: 1px solid var(--mc-navy-separator); padding-top: 6px;';

      const tLabel = HTMLPanel.el('div', 'mc-text-sm mc-label-gold');
      tLabel.textContent = trainees.length > 1
        ? `${trainees.length}x In Ausbildung – ${t.remaining}s`
        : `In Ausbildung – ${t.remaining}s`;
      traineeRow.appendChild(tLabel);

      const tTrack = HTMLPanel.el('div', 'mc-bar-track');
      tTrack.style.cssText = 'margin-top: 3px; height: 5px;';
      const tFill = HTMLPanel.el('div', 'mc-bar-fill');
      tFill.style.cssText = `width: ${Math.round(t.pct * 100)}%; background: var(--mc-heal);`;
      tTrack.appendChild(tFill);
      traineeRow.appendChild(tTrack);
      card.appendChild(traineeRow);
    }

    const btnRow = HTMLPanel.el('div');
    btnRow.style.cssText = 'display: flex; gap: 6px; margin-top: 4px;';

    const btn = HTMLPanel.el('button', 'mc-btn' + (canAfford ? ' success' : ''));
    btn.disabled = !canAfford;
    btn.textContent = canAfford ? '⚒ Trainieren' : !canTrain ? 'Kein freier Buerger' : 'Zu teuer';
    btn.style.flex = '1';
    if (canAfford) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ctx.startTraining(state, cls.id, trainingDef);
        this.ctx.refresh();
      });
    }
    btnRow.appendChild(btn);

    const detailBtn = HTMLPanel.el('button', 'mc-btn-details');
    detailBtn.textContent = '📋 Details';
    detailBtn.title = 'Klassen-Details anzeigen';
    detailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ctx.showClassDetailModal(cls);
    });
    btnRow.appendChild(detailBtn);

    card.appendChild(btnRow);
    return card;
  }
}
