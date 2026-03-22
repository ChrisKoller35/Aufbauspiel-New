// ============================================================
// Magic City – HTMLAchievementUI
// Zeigt alle 12 Achievements. Freigeschaltete: goldener Rahmen.
// Gesperrte: ausgegraut.
// Tastenkuerzel: A toggelt Sichtbarkeit (Oeffnen via Caller).
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { ACHIEVEMENT_DEFS } from '../../data/achievements';

export class HTMLAchievementUI extends HTMLPanel {
  public onClose?: () => void;

  private readonly headerCountEl: HTMLElement;
  private readonly listEl: HTMLElement;

  constructor() {
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    root.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'transform: translate(-50%, -50%)',
      'width: 560px',
      'max-height: 500px',
      'display: flex',
      'flex-direction: column',
      'pointer-events: auto',
    ].join('; ');
    root.setAttribute('hidden', '');

    super(root);

    // ── Header ──────────────────────────────────────────────
    const header = HTMLPanel.el('div', 'mc-panel-header');
    // Title + counter will be filled in show()
    const titleSpan = HTMLPanel.el('span');
    titleSpan.textContent = '\u2605 Erfolge';
    this.headerCountEl = HTMLPanel.el('span', 'mc-label-dim mc-text-md');
    this.headerCountEl.style.cssText = 'font-size: 14px; font-weight: normal; margin-left: 10px;';
    header.appendChild(titleSpan);
    header.appendChild(this.headerCountEl);
    root.appendChild(header);
    root.appendChild(HTMLPanel.closeBtn(() => this.hide()));

    // ── Scrollable list ──────────────────────────────────────
    const scroll = HTMLPanel.el('div', 'mc-scroll');
    scroll.style.cssText = 'padding: 12px 16px; flex: 1; overflow-y: auto;';
    root.appendChild(scroll);

    this.listEl = HTMLPanel.el('div');
    this.listEl.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
    scroll.appendChild(this.listEl);
  }

  /** Befuellt die Achievement-Liste und zeigt das Modal. */
  show(state?: GameState): void {
    if (state) this.rebuildList(state);
    super.show();
  }

  hide(): void {
    super.hide();
    this.onClose?.();
  }

  // ─── Privat ─────────────────────────────────────────────

  private rebuildList(state: GameState): void {
    const unlockedIds = state.achievements ?? [];
    const totalAchievements = ACHIEVEMENT_DEFS.length;
    const unlockedCount = ACHIEVEMENT_DEFS.filter(a => unlockedIds.includes(a.id)).length;

    // Counter in header
    this.headerCountEl.textContent = `${unlockedCount} / ${totalAchievements}`;

    this.listEl.innerHTML = '';

    for (const def of ACHIEVEMENT_DEFS) {
      const isUnlocked = unlockedIds.includes(def.id);
      this.listEl.appendChild(this.buildCard(def.name, def.description, isUnlocked));
    }
  }

  private buildCard(name: string, description: string, isUnlocked: boolean): HTMLElement {
    const card = HTMLPanel.el('div', 'mc-card');
    card.style.cssText = [
      'display: flex',
      'align-items: flex-start',
      'gap: 8px',
      'padding: 8px 10px',
      'border-radius: 6px',
      'min-height: 58px',
      isUnlocked
        ? 'border-color: var(--mc-panel-border); background: var(--mc-navy-card-light);'
        : 'opacity: 0.55; background: var(--mc-navy-card);',
    ].join('; ');

    // Icon (star)
    const icon = HTMLPanel.el('span');
    icon.textContent = '\u2605';
    icon.style.cssText = [
      'font-size: 18px',
      'flex-shrink: 0',
      'margin-top: 1px',
      isUnlocked ? 'color: var(--mc-gold)' : 'color: var(--mc-disabled)',
    ].join('; ');

    // Text block
    const textBlock = HTMLPanel.el('div');
    textBlock.style.cssText = 'flex: 1; min-width: 0;';

    const titleEl = HTMLPanel.el('div', isUnlocked ? 'mc-bold mc-text-md' : 'mc-label-dim mc-text-md');
    titleEl.textContent = name;
    titleEl.style.color = isUnlocked ? 'var(--mc-light)' : 'var(--mc-dim)';

    const descEl = HTMLPanel.el('div', 'mc-text-sm');
    descEl.textContent = isUnlocked ? description : '???';
    descEl.style.cssText = 'color: ' + (isUnlocked ? 'var(--mc-dim)' : 'var(--mc-disabled)') +
      '; margin-top: 2px; line-height: 1.3;';

    textBlock.appendChild(titleEl);
    textBlock.appendChild(descEl);

    // "Erhalten!" badge for unlocked
    if (isUnlocked) {
      const badge = HTMLPanel.el('span', 'mc-label-gold mc-text-sm mc-bold');
      badge.textContent = 'Erhalten!';
      badge.style.cssText = 'flex-shrink: 0; margin-top: 1px; white-space: nowrap;';
      card.appendChild(icon);
      card.appendChild(textBlock);
      card.appendChild(badge);
    } else {
      card.appendChild(icon);
      card.appendChild(textBlock);
    }

    return card;
  }
}
