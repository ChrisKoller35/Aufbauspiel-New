// ─── Magic City – Dialog einer Expedition ───────────────────────
// Das Fenster über dem Kampfbildschirm für jede Entscheidung unterwegs
// (Einleitung, Kontrollpunkt, reisender Händler, Wahl, Bilanz) und der
// Balken mit den Leben der Gruppe. Genutzt von ui/screens/ExpeditionFlow.ts.
// ────────────────────────────────────────────────────────────────

import { ExpeditionRun } from '../../models/ExpeditionRun';
import { optionsKnopfHtml } from './GeschichtsAnzeige';

export interface DialogButton {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  /** Entscheidung der Geschichte: die Folgen unter der Beschriftung (HTML aus GeschichtsAnzeige) */
  folgen?: string;
  onClick: () => void;
}

const DIALOG_BTN_BASE = "flex:1 1 140px;min-height:44px;padding:12px;border-radius:6px;font-family:'Cinzel',serif;font-size:.8rem;letter-spacing:1px;transition:.2s;";
const DIALOG_BTN_PRIMARY = 'background:linear-gradient(135deg,#c8a227,#7a5c08);border:1px solid #c8a227;color:#0f1420;font-weight:700;';
const DIALOG_BTN_SECONDARY = 'background:none;border:1px solid #6b7280;color:#9ca3af;';

/** Simple modal overlay used for all expedition decisions (checkpoint, merchant, choice). */
export function showExpeditionDialog(icon: string, title: string, bodyHtml: string, buttons: DialogButton[]): void {
  document.getElementById('expedition-dialog')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'expedition-dialog';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:center;justify-content:center;';

  const box = document.createElement('div');
  // Flex-Spalte: nur der Text scrollt, die Knopfreihe bleibt auf jedem Handy im Bild
  box.style.cssText = "background:#0f1420;border:1px solid #c8a227;border-radius:10px;padding:28px 32px;max-width:440px;width:90%;max-height:90vh;max-height:90dvh;display:flex;flex-direction:column;overflow:hidden;text-align:center;font-family:'Cinzel',serif;";
  box.innerHTML = `
    <div style="overflow-y:auto;flex:1 1 auto;min-height:0;">
      <div style="font-size:2rem;margin-bottom:8px;">${icon}</div>
      <div style="color:#c8a227;font-size:1.1rem;letter-spacing:2px;margin-bottom:16px;">${title}</div>
      ${bodyHtml}
    </div>
  `;

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;flex:0 0 auto;padding-top:12px;';
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.disabled = !!b.disabled;
    if (b.folgen !== undefined) {
      btn.className = 'gs-option';
      btn.innerHTML = optionsKnopfHtml(b.label, b.folgen);
    } else {
      btn.textContent = b.label;
      btn.style.cssText = DIALOG_BTN_BASE + (b.primary ? DIALOG_BTN_PRIMARY : DIALOG_BTN_SECONDARY)
        + (b.disabled ? 'opacity:.4;cursor:not-allowed;' : 'cursor:pointer;');
    }
    btn.addEventListener('click', () => {
      if (b.disabled) return;
      overlay.remove();
      b.onClick();
    });
    row.appendChild(btn);
  }
  box.appendChild(row);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function partyHpHtml(run: ExpeditionRun): string {
  const hpTotal = run.party.reduce((s, u) => s + u.hp, 0);
  const hpMax = run.party.reduce((s, u) => s + u.maxHp, 0);
  const hpPct = hpMax > 0 ? Math.round(hpTotal / hpMax * 100) : 0;
  const hpColor = hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#eab308' : '#ef4444';
  return `
    <div style="margin-bottom:20px;">
      <span style="color:${hpColor};font-size:.9rem;">Team HP: ${hpPct}%</span>
      <div style="background:#1a1a2e;border-radius:4px;height:8px;margin-top:6px;overflow:hidden;">
        <div style="background:${hpColor};height:100%;width:${hpPct}%;border-radius:4px;transition:.3s"></div>
      </div>
    </div>
  `;
}
