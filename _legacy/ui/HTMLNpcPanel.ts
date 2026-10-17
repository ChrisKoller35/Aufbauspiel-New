// ============================================================
// Magic City – HTMLNpcPanel
// Übersicht aller geretteten NPCs mit Freischalt-Effekten.
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { NPC_DEFS } from '../../data/npcs';

export class HTMLNpcPanel extends HTMLPanel {
  public onClose?: () => void;

  private scrollEl!: HTMLElement;

  constructor() {
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    root.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'transform: translate(-50%, -50%)',
      'width: 580px',
      'max-height: 520px',
      'display: flex',
      'flex-direction: column',
      'pointer-events: auto',
    ].join('; ');
    root.setAttribute('hidden', '');
    super(root);
    this.buildShell();
  }

  // ─── Public API ──────────────────────────────────────────

  open(state: GameState): void {
    this.render(state);
    this.el.removeAttribute('hidden');
  }

  // ─── Build (once) ────────────────────────────────────────

  private buildShell(): void {
    const header = HTMLPanel.el('div', 'mc-panel-header', 'Gerettete Gefährten');
    this.el.appendChild(header);
    this.el.appendChild(HTMLPanel.closeBtn(() => {
      this.hide();
      this.onClose?.();
    }));

    this.scrollEl = HTMLPanel.el('div', 'mc-scroll');
    this.scrollEl.style.cssText = 'flex: 1; padding: 12px; overflow-y: auto;';
    this.el.appendChild(this.scrollEl);
  }

  // ─── Render ──────────────────────────────────────────────

  private render(state: GameState): void {
    this.scrollEl.innerHTML = '';

    // Counter
    const counter = document.createElement('div');
    counter.style.cssText = 'font-size:12px; color:var(--mc-dim); text-align:center; margin-bottom:12px;';
    counter.textContent = `${state.rescuedNpcs.length} / ${Object.keys(NPC_DEFS).length} Gefährten gerettet`;
    this.scrollEl.appendChild(counter);

    if (state.rescuedNpcs.length === 0) {
      const empty = HTMLPanel.el('p', undefined, 'Noch keine Gefährten gerettet. Erkunde Dungeons um NPCs zu befreien!');
      empty.style.cssText = 'color:var(--mc-dim); text-align:center; padding:20px; font-style:italic;';
      this.scrollEl.appendChild(empty);
    } else {
      const rescuedHeader = HTMLPanel.el('div', undefined, 'In der Stadt');
      rescuedHeader.style.cssText = 'font-size:12px; color:var(--mc-gold); font-weight:bold; margin-bottom:8px;';
      this.scrollEl.appendChild(rescuedHeader);

      for (const id of state.rescuedNpcs) {
        const npc = NPC_DEFS[id];
        if (!npc) continue;
        this.scrollEl.appendChild(this.buildRescuedCard(npc));
      }
    }

    // Locked NPCs
    const lockedIds = Object.keys(NPC_DEFS).filter(id => !state.rescuedNpcs.includes(id));
    if (lockedIds.length > 0) {
      const sep = document.createElement('div');
      sep.style.cssText = 'font-size:12px; color:var(--mc-dim); font-weight:bold; margin:12px 0 8px; border-top:1px solid var(--mc-navy-separator); padding-top:10px;';
      sep.textContent = 'Noch nicht gefunden';
      this.scrollEl.appendChild(sep);

      for (const id of lockedIds) {
        const npc = NPC_DEFS[id];
        if (!npc) continue;
        this.scrollEl.appendChild(this.buildLockedCard(npc));
      }
    }
  }

  private buildRescuedCard(npc: typeof NPC_DEFS[string]): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex; gap:10px; padding:10px; margin-bottom:6px; border-radius:6px; background:var(--mc-navy-card); border:1px solid var(--mc-gold-dim);';

    // Icon
    const icon = document.createElement('div');
    icon.style.cssText = 'width:40px; height:40px; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:rgba(212,165,74,0.15); border-radius:50%; border:1px solid var(--mc-gold-dim); font-size:16px; font-weight:bold; color:var(--mc-gold);';
    icon.textContent = npc.name[0];
    card.appendChild(icon);

    const info = document.createElement('div');
    info.style.cssText = 'flex:1; min-width:0;';
    card.appendChild(info);

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:14px; font-weight:bold; color:var(--mc-light); margin-bottom:2px;';
    nameEl.textContent = npc.name;
    info.appendChild(nameEl);

    const effect = document.createElement('div');
    effect.style.cssText = 'font-size:12px; color:var(--mc-heal); margin-bottom:4px;';
    effect.textContent = '\u2713 ' + npc.unlockEffect.description;
    info.appendChild(effect);

    const bio = document.createElement('p');
    bio.style.cssText = 'font-size:11px; color:var(--mc-dim); margin:0 0 4px; line-height:1.4; font-style:italic;';
    bio.textContent = npc.background;
    info.appendChild(bio);

    const dialogue = document.createElement('p');
    dialogue.style.cssText = 'font-size:11px; color:var(--mc-gold-dim); margin:0;';
    dialogue.textContent = '\u201e' + npc.dialogue + '\u201c';
    info.appendChild(dialogue);

    return card;
  }

  private buildLockedCard(npc: typeof NPC_DEFS[string]): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex; gap:10px; padding:8px 10px; margin-bottom:4px; border-radius:6px; background:var(--mc-navy-deep); border:1px solid var(--mc-navy-separator); opacity:0.7;';

    const icon = document.createElement('div');
    icon.style.cssText = 'width:34px; height:34px; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:var(--mc-navy-card); border-radius:50%; font-size:14px; color:var(--mc-dim);';
    icon.textContent = '?';
    card.appendChild(icon);

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;';
    card.appendChild(info);

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:13px; font-weight:bold; color:var(--mc-muted); margin-bottom:2px;';
    nameEl.textContent = npc.name;
    info.appendChild(nameEl);

    const routes = document.createElement('div');
    routes.style.cssText = 'font-size:11px; color:var(--mc-dim);';
    routes.textContent = `Fundort: ${npc.routes.join(', ')} · Chance: ${Math.round(npc.rescueChance * 100)}%`;
    info.appendChild(routes);

    const effect = document.createElement('div');
    effect.style.cssText = 'font-size:11px; color:var(--mc-dim); font-style:italic;';
    effect.textContent = npc.unlockEffect.description;
    info.appendChild(effect);

    return card;
  }
}
