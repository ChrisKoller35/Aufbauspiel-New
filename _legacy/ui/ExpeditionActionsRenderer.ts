// ============================================================
// Magic City – ExpeditionActionsRenderer
// Verwaltet alle Aktions-Buttons der ExpeditionUI:
// Choice, Checkpoint, Händler, Erkunden, handleNextRoom.
// Extrahiert aus HTMLExpeditionUI für bessere Trennung.
// ============================================================

import { HTMLPanel } from './HTMLPanel';
import { GameState } from '../../models/GameState';
import { ExpeditionRun, EncounterRoom } from '../../models/ExpeditionRun';
import { ExpeditionSystem } from '../../systems/ExpeditionSystem';
import { makeButton, makeSmallButton } from './ExpeditionUIHelpers';
import type { HTMLCombatOverlay } from './HTMLCombatOverlay';
import type { CombatViewRenderer } from './CombatViewRenderer';

export class ExpeditionActionsRenderer {
  constructor(
    private readonly expSys: ExpeditionSystem,
    private readonly combatRenderer: CombatViewRenderer,
    private readonly getCombatOverlay: () => HTMLCombatOverlay | null,
    private readonly getExpeditionEl: () => HTMLElement,
    private readonly onHide: () => void,
    private readonly onRefresh: (state: GameState) => void,
  ) {}

  // ─── Dispatcher ───────────────────────────────────────────

  buildActions(
    actionsEl: HTMLElement,
    run: ExpeditionRun,
    state: GameState,
    mainColsEl: HTMLElement,
    roomStripEl: HTMLElement,
    logEl: HTMLElement,
  ): void {
    actionsEl.innerHTML = '';

    if (run.status === 'exploring' && run.pendingChoice) {
      // ── Feature #11: Encounter-Choice ──
      this.buildChoiceActions(actionsEl, run, state);

    } else if (run.status === 'exploring' && run.pendingCheckpoint) {
      // ── Feature #15: Checkpoint-Dialog ──
      this.buildCheckpointActions(actionsEl, run, state);

    } else if (run.status === 'exploring' && run.pendingMerchant) {
      // ── Feature #16: Händler-Dialog ──
      this.buildMerchantActions(actionsEl, run, state);

    } else if (run.status === 'exploring') {
      // ── Standard: Erkunden-Buttons ──
      this.buildExploreActions(actionsEl, run, state, mainColsEl, roomStripEl, logEl);

    } else {
      // ── Expedition beendet ──
      const collectBtn = makeButton('Einsammeln & Schließen', 'success', () => {
        this.onHide();
      });
      actionsEl.appendChild(collectBtn);
    }
  }

  // ─── Encounter-Choice (Feature #11) ──────────────────────

  private buildChoiceActions(actionsEl: HTMLElement, run: ExpeditionRun, state: GameState): void {
    const choice = run.pendingChoice!;

    // Überschrift
    const label = HTMLPanel.el('div', 'mc-label-gold mc-text-sm mc-bold');
    label.style.cssText = 'width: 100%; margin-bottom: 4px;';
    label.textContent = 'Wähle eine Option:';
    actionsEl.appendChild(label);

    // Flavour-Texte in einer Zeile nebeneinander
    const flavourRow = HTMLPanel.el('div');
    flavourRow.style.cssText = 'display: flex; gap: 16px; width: 100%; margin-bottom: 6px;';

    const flavourA = HTMLPanel.el('div', 'mc-label-dim mc-text-sm');
    flavourA.style.cssText = 'flex: 1; line-height: 1.4;';
    flavourA.textContent = choice.optionA.flavorText;
    flavourRow.appendChild(flavourA);

    const flavourB = HTMLPanel.el('div', 'mc-label-dim mc-text-sm');
    flavourB.style.cssText = 'flex: 1; line-height: 1.4;';
    flavourB.textContent = choice.optionB.flavorText;
    flavourRow.appendChild(flavourB);

    actionsEl.appendChild(flavourRow);

    // Buttons
    const btnA = makeButton(choice.optionA.label, 'normal', () => {
      this.expSys.resolveChoice(run, 0);
      this.onRefresh(state);
    });
    actionsEl.appendChild(btnA);

    const btnB = makeButton(choice.optionB.label, 'normal', () => {
      this.expSys.resolveChoice(run, 1);
      this.onRefresh(state);
    });
    actionsEl.appendChild(btnB);
  }

  // ─── Checkpoint (Feature #15) ────────────────────────────

  private buildCheckpointActions(actionsEl: HTMLElement, run: ExpeditionRun, state: GameState): void {
    const info = HTMLPanel.el('div', 'mc-label-info mc-text-sm');
    info.style.cssText = 'width: 100%; margin-bottom: 4px;';
    info.textContent = 'Checkpoint erreicht! Fortschritt gespeichert.';
    actionsEl.appendChild(info);

    const continueBtn = makeButton('Weiter erkunden', 'normal', () => {
      this.expSys.resolveCheckpoint(run, false);
      this.onRefresh(state);
    });
    actionsEl.appendChild(continueBtn);

    const retreatBtn = makeButton('Rückzug', 'danger', () => {
      this.expSys.resolveCheckpoint(run, true);
      this.onRefresh(state);
    });
    actionsEl.appendChild(retreatBtn);
  }

  // ─── Händler (Feature #16) ───────────────────────────────

  private buildMerchantActions(actionsEl: HTMLElement, run: ExpeditionRun, state: GameState): void {
    const purchases = run.merchantPurchases ?? 0;

    const label = HTMLPanel.el('div', 'mc-label-gold mc-text-sm mc-bold');
    label.style.cssText = 'width: 100%; margin-bottom: 4px;';
    label.textContent = `Händler (${purchases}/2 Käufe)`;
    actionsEl.appendChild(label);

    if (purchases < 2) {
      const items = [
        { id: 'healing_potion', label: 'Heiltrank (15G)', cost: 15 },
        { id: 'bread',          label: 'Brot (8G)',       cost: 8  },
        { id: 'power_bread',    label: 'Kraftbrot (25G)', cost: 25 },
      ];

      for (const item of items) {
        const canAfford = run.goldEarned >= item.cost;
        const btn = makeButton(item.label, canAfford ? 'normal' : 'dark', () => {
          if (!canAfford) return;
          this.expSys.merchantBuy(run, item.id);
          this.onRefresh(state);
        });
        if (!canAfford) {
          (btn as HTMLButtonElement).disabled = true;
        }
        actionsEl.appendChild(btn);
      }
    }

    // Trennlinie
    const sep = HTMLPanel.el('div');
    sep.style.cssText = 'width: 100%; height: 1px; background: #2a1a20; margin: 4px 0;';
    actionsEl.appendChild(sep);

    const skipBtn = makeButton('Überspringen (+15% HP)', 'normal', () => {
      this.expSys.merchantSkip(run);
      this.onRefresh(state);
    });
    actionsEl.appendChild(skipBtn);

    const doneBtn = makeButton('Fertig', 'success', () => {
      this.expSys.merchantClose(run);
      this.onRefresh(state);
    });
    actionsEl.appendChild(doneBtn);
  }

  // ─── Standard-Erkunden-Buttons ───────────────────────────

  private buildExploreActions(
    actionsEl: HTMLElement,
    run: ExpeditionRun,
    state: GameState,
    mainColsEl: HTMLElement,
    roomStripEl: HTMLElement,
    logEl: HTMLElement,
  ): void {
    // "Nächster Raum" – mit CombatOverlay-Handshake
    const nextBtn = makeButton('Nächster Raum', 'expedition', () => {
      this.handleNextRoom(state, mainColsEl, roomStripEl, logEl, actionsEl);
    });
    actionsEl.appendChild(nextBtn);

    // "Verzweifelter Wille" (nur einmal nutzbar)
    if (!run.desperateResolveUsed) {
      const desperateBtn = makeButton('Verzweifelter Wille', 'danger', () => {
        this.expSys.desperateResolve(run);
        this.onRefresh(state);
      });
      actionsEl.appendChild(desperateBtn);
    }

    // "Rückzug"
    const retreatBtn = makeButton('Rückzug', 'dark', () => {
      this.expSys.retreat(run);
      this.onRefresh(state);
    });
    actionsEl.appendChild(retreatBtn);
  }

  // ─── handleNextRoom: Combat Routing ──────────────────────

  /**
   * Leitet "Nächster Raum" weiter:
   * - Nicht-Kampf-Räume: direkt verarbeiten + refresh.
   * - Kampf/Boss-Räume: CombatOverlay (Phaser) für animierten Runden-Kampf.
   * - Fallback: Inline-HTML-Preview falls kein CombatOverlay verfügbar.
   */
  private handleNextRoom(
    state: GameState,
    mainColsEl: HTMLElement,
    roomStripEl: HTMLElement,
    logEl: HTMLElement,
    actionsEl: HTMLElement,
  ): void {
    const run = state.activeExpedition;
    if (!run || run.status !== 'exploring') return;

    const roomIndex = run.currentRoom;
    if (roomIndex >= run.rooms.length) return;

    const room: EncounterRoom = run.rooms[roomIndex];

    // Nicht-Kampf-Räume: sofort verarbeiten
    if (room.type !== 'combat' && room.type !== 'boss') {
      this.expSys.processCurrentRoom(state);
      this.onRefresh(state);
      return;
    }

    const combatOverlay = this.getCombatOverlay();

    // ── Kampf/Boss-Räume: Phaser CombatOverlay (Runden-Animation) ──
    if (combatOverlay) {
      // HTML-Panel ausblenden damit Phaser-Canvas (CombatOverlay) sichtbar ist
      const expEl = this.getExpeditionEl();
      expEl.setAttribute('hidden', '');

      // "Kampf starten!" im Overlay → Kampf berechnen + Runden-Animation starten
      combatOverlay.onFightClicked = () => {
        this.expSys.processCurrentRoom(state);
        combatOverlay.startCombatAnimation(run, room);
      };

      // Runden-Animation fertig → HTML-Panel wieder anzeigen + Status aktualisieren
      combatOverlay.onComplete = () => {
        expEl.removeAttribute('hidden');
        this.combatRenderer.combatPhase = 'none';
        this.onRefresh(state);
      };

      combatOverlay.show(run, roomIndex);
      return;
    }

    // ── Fallback: Inline-HTML-Preview (kein CombatOverlay verfügbar) ──
    this.combatRenderer.combatPhase = 'preview';
    this.combatRenderer.combatRoomIndex = roomIndex;
    this.combatRenderer.selectedAbilities.clear();

    // HP-Snapshot für Schadensanzeige nach Kampf
    this.combatRenderer.preHpSnapshot.clear();
    for (const u of run.party) this.combatRenderer.preHpSnapshot.set(u.id, u.hp);
    for (const e of room.enemies) this.combatRenderer.preHpSnapshot.set(e.id, e.hp);

    // UI im Combat-Preview-Modus aufbauen
    this.combatRenderer.buildCombatView(mainColsEl, roomStripEl, logEl, actionsEl, run, state, room, roomIndex);
  }
}
