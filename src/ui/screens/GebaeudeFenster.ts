// ─── Magic City – Fenster eines gebauten Gebäudes ───────────────
// Werkstätten: Status, Engpass, Auftragsliste und Rezepte
// (WerkstattAnzeige.ts), Ausbau (systems/Ausbau.ts: Gold und Beute).
// Gildenhaus: Helden in der Gilde, Helden je Expedition, Ausbau auf
// Stufe 2 und der Weg zum Gildenhaus-Bildschirm. Der Händler hat sein
// eigenes Fenster (HaendlerFenster.ts). Das Fenster führt sich laufend
// nach: ganz neu, wenn sich etwas ändert, sonst nur die Balken. Escape
// schliesst es (FensterHilfen.ts). Abreissen gibt es nicht: Jedes
// Gebäude steht genau einmal, und die Baukosten kämen nicht zurück.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BuildingDef } from '../../data/buildings';
import { RECIPE_DEFS } from '../../data/recipes';
import { GameState } from '../../models/GameState';
import { BuildingInstance } from '../../models/Building';
import { navigateTo } from '../ScreenRouter';
import { erfolgePruefen } from '../../systems/AchievementSystem';
import { itemName, cycleProgress, einzelStatus, grundText } from '../../systems/GebaeudeStatus';
import { engpassFuerInstanz } from '../../systems/EngpassSystem';
import { ausbauInfo, ausbauen, maxStufe, stufeVon, heldenJeExpedition } from '../../systems/Ausbau';
import { auftragGeben, auftragAbbrechen, hatAuftragsliste } from '../../systems/Auftraege';
import { laufendVonSelbst, vonSelbstSatz } from '../../systems/Werkstattplan';
import { bindeFensterTasten, hintergrundKlick, schluckeZweitenKlick } from '../components/FensterHilfen';
import { wirdGedrueckt } from '../components/DruckWaechter';
import { renderWorkshop, restzeitText, ruheText, auftragWartetText } from './WerkstattAnzeige';

/** Kosten-Chips «Gold 40/50», grün wenn das Lager reicht (Bau-Dialog und Ausbau). */
export function renderCostDetail(cost: Record<string, number>, state: GameState): string {
  const entries = Object.entries(cost);
  if (entries.length === 0) return '<span class="cost-ok">Gratis</span>';
  return entries.map(([res, qty]) => {
    const have = Math.floor(state.globalStock[res] ?? 0);
    const cls = have >= qty ? 'cost-ok' : 'cost-miss';
    return `<span class="ingr ${cls}">${itemName(res)} ${have}/${qty}</span>`;
  }).join('');
}

function stufenText(b: BuildingInstance): string {
  const max = maxStufe(b.typeId);
  return max > 1 ? `Stufe ${stufeVon(b)} von ${max}` : '';
}

// ── Angaben oben im Fenster ─────────────────────────────────────

interface InfoZeile {
  label: string;
  wert: string;
  cls?: string;
}

/** Werkstatt: ihr Status; Gildenhaus: die Helden. */
function infoZeilen(state: GameState, b: BuildingInstance, def: BuildingDef): InfoZeile[] {
  if (def.recipes.length > 0) {
    const selbst = laufendVonSelbst(b);
    // Steht sie, sagt der Status warum (wie die Karte in der Mindmap): fehlt Eisenschrott, wartet auf Bauteile …
    const st = b.producing ? undefined : einzelStatus(state, b);
    const grund = st?.grund ? grundText(st.grund) : '';
    const status = selbst ? `✅ Von selbst: ${selbst}`
      : b.producing ? '✅ Produziert'
      : st?.laeuft ? '✅ Startet gleich'
      : grund ? `⏸️ ${grund.charAt(0).toUpperCase()}${grund.slice(1)}`
      : '⏸️ Leerlauf';
    return [{ label: 'Status', wert: status }];
  }
  if (def.expeditions) {
    return [
      { label: 'Helden in der Gilde', wert: `${state.fighters.length}` },
      { label: 'Helden je Expedition', wert: `${heldenJeExpedition(state)}` },
    ];
  }
  return [];
}

function renderZeilen(zeilen: InfoZeile[]): string {
  if (zeilen.length === 0) return '';
  return `<div class="bm-zeilen">${zeilen.map(z => `
    <div class="bm-zeile"><span>${z.label}</span><b class="${z.cls ?? ''}">${z.wert}</b></div>`).join('')}</div>`;
}

function renderAusbau(state: GameState, b: BuildingInstance): string {
  if (maxStufe(b.typeId) <= 1) return '';
  const info = ausbauInfo(state, b);
  if (info.naechste === null) {
    return '<div class="bm-ausbau"><span class="lbl">AUSBAU</span><p class="ws-msg">Höchste Stufe erreicht.</p></div>';
  }
  return `
    <div class="bm-ausbau">
      <span class="lbl">AUSBAU</span>
      <p class="bm-ausbau-w"><strong>Stufe ${info.naechste}:</strong> ${info.wirkung}</p>
      <div class="cingr">${renderCostDetail(info.kosten, state)}</div>
      ${info.hinweis ? `<p class="ws-msg ws-warn">🔒 ${info.hinweis}</p>` : ''}
      <button class="btn-craft btn-ausbau"${info.bezahlbar ? '' : ' disabled'}>⬆ AUSBAUEN AUF STUFE ${info.naechste}</button>
    </div>`;
}

/** Alles, wovon der Inhalt abhängt, ausser den laufenden Balken. */
function modalSignature(b: BuildingInstance, def: BuildingDef, state: GameState): string {
  const items = new Set<string>();
  for (const id of def.recipes) {
    for (const item of Object.keys(RECIPE_DEFS[id]?.inputs ?? {})) items.add(item);
  }
  const info = ausbauInfo(state, b);
  const werkstatt = hatAuftragsliste(b);
  const kopf = werkstatt && !b.producing && b.auftraege.length > 0
    ? auftragWartetText(state, b, RECIPE_DEFS[b.auftraege[0]]).text : null;
  return JSON.stringify([
    b.activeRecipeId, b.producing, b.pendingCraft, b.auftraege, b.vonSelbst ?? null, kopf,
    werkstatt ? [ruheText(state, b), vonSelbstSatz(b.typeId)] : null,
    b.tier, info.bezahlbar, info.hinweis, info.kosten,
    [...items].map(item => state.globalStock[item] ?? 0),
    infoZeilen(state, b, def),
    engpassFuerInstanz(state, b),
  ]);
}

// ── Das Fenster ─────────────────────────────────────────────────

export interface GebaeudeFensterOptionen {
  /** Rezept, das in der Werkstatt hervorgehoben wird (vom Reiter «Crafting»). */
  highlightRecipeId?: string | null;
  /** Nach dem Schliessen (die Seite dahinter zeichnet sich neu). */
  beimSchliessen: () => void;
}

export function showBuildingModal(root: HTMLElement, bInst: BuildingInstance, state: GameState, opt: GebaeudeFensterOptionen): void {
  const def = BUILDING_DEFS[bInst.typeId];
  if (!def) return;
  root.querySelector('.ov')?.remove();

  const renderBody = (): string => {
    const eng = engpassFuerInstanz(state, bInst);
    return `
      ${renderZeilen(infoZeilen(state, bInst, def))}
      ${eng ? `<p class="ws-msg ws-warn bm-eng"><strong>Engpass:</strong> ${eng}</p>` : ''}
      ${renderWorkshop(bInst, state, opt.highlightRecipeId ?? null)}
      ${renderAusbau(state, bInst)}`;
  };
  const renderTitle = (): string => {
    const stufen = stufenText(bInst);
    return `${def.name}${stufen ? ` <span class="bm-stufe">${stufen}</span>` : ''}`;
  };

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal${def.recipes.length > 0 ? ' modal-ws' : ''}">
      <div class="bm-bild"><img src="assets/sprites/final/${def.spriteKey}.png" alt="" onerror="this.style.display='none'"></div>
      <h3 class="bm-title">${renderTitle()}</h3>
      <div class="bm-body">${renderBody()}</div>
      <div class="bm-actions">
        ${def.expeditions ? '<button class="fk-btn gold btn-gildenhaus">ZUM GILDENHAUS</button>' : ''}
        <button class="fk-btn btn-close-modal">SCHLIESSEN</button>
      </div>
    </div>`;
  root.appendChild(ov);

  const body = ov.querySelector('.bm-body') as HTMLElement;
  const title = ov.querySelector('.bm-title') as HTMLElement;
  const refreshBody = () => {
    body.innerHTML = renderBody();
    title.innerHTML = renderTitle();
    live.merke();
  };
  if (opt.highlightRecipeId) body.querySelector('.ws-rcp.hl')?.scrollIntoView({ block: 'nearest' });
  const live = nachfuehren(ov, body, bInst, def, state, refreshBody);

  const close = () => {
    live.stop();
    tastenLoesen();
    ov.remove();
    opt.beimSchliessen();
  };
  const tastenLoesen = bindeFensterTasten(ov, ov.querySelector('.modal'), close);

  bindKlicks(ov, state, bInst, { close, refreshBody });
}

/**
 * Laufend nachführen: ganz neu, wenn sich etwas ändert (modalSignature), sonst nur die Balken
 * und die Restzeit. Endet von selbst, wenn das Fenster weg ist.
 * `merke` hält nach einem Neuzeichnen von Hand den Stand fest, `stop` beendet das Nachführen.
 */
function nachfuehren(
  ov: HTMLElement, body: HTMLElement, bInst: BuildingInstance, def: BuildingDef, state: GameState, refreshBody: () => void,
): { stop: () => void; merke: () => void } {
  let lastSig = modalSignature(bInst, def, state);
  const timer = window.setInterval(() => {
    if (!ov.isConnected) {
      window.clearInterval(timer);
      return;
    }
    if (wirdGedrueckt()) return;
    if (modalSignature(bInst, def, state) !== lastSig) {
      refreshBody();
      return;
    }
    const recipe = bInst.activeRecipeId ? RECIPE_DEFS[bInst.activeRecipeId] : undefined;
    const fill = body.querySelector('.ws-bar-fill') as HTMLElement | null;
    const txt = body.querySelector('.ws-bar-txt') as HTMLElement | null;
    if (recipe && bInst.producing && fill && txt) {
      fill.style.width = `${Math.round(cycleProgress(bInst, recipe) * 100)}%`;
      txt.textContent = `noch ${Math.ceil(bInst.productionTimer)}s`;
    }
    const rest = body.querySelector('.ws-rest') as HTMLElement | null;
    if (rest) rest.textContent = restzeitText(bInst, state);
  }, 500);
  return { stop: () => window.clearInterval(timer), merke: () => { lastSig = modalSignature(bInst, def, state); } };
}

interface FensterAktionen {
  close: () => void;
  refreshBody: () => void;
}

function bindKlicks(ov: HTMLElement, state: GameState, bInst: BuildingInstance, a: FensterAktionen): void {
  // Der Hintergrund schliesst nur bei einem einfachen Klick, der dort begann (siehe hintergrundKlick)
  const hintergrund = hintergrundKlick(ov);
  ov.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === ov) {
      if (hintergrund(e)) {
        a.close();
        schluckeZweitenKlick();
      }
      return;
    }
    if (target.classList.contains('btn-close-modal')) {
      a.close();
      schluckeZweitenKlick();
    } else if (target.classList.contains('btn-gildenhaus')) {
      a.close();
      navigateTo('gildenhaus');
    } else if (target.classList.contains('btn-ausbau')) {
      if (ausbauen(state, bInst)) {
        erfolgePruefen(state); // Ausbau-Erfolge gleich zählen
        window.dispatchEvent(new Event('mc:speichern')); // wie Bau und Händler: sofort sichern
        a.refreshBody();
      }
    } else if (target.closest('[data-ws-add]')) {
      const add = target.closest('[data-ws-add]') as HTMLElement;
      if (auftragGeben(bInst, add.dataset.wsAdd!)) a.refreshBody();
    } else if (target.closest('[data-ws-cancel]')) {
      const cancel = target.closest('[data-ws-cancel]') as HTMLElement;
      if (auftragAbbrechen(state, bInst, Number(cancel.dataset.wsCancel))) a.refreshBody();
    }
  });
}
