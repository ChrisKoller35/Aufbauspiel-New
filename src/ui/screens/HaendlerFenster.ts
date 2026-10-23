// ─── Magic City – Das Händler-Fenster ───────────────────────────
// Zwei Abschnitte: «Kaufen» (Proviant und Grundausrüstung, 1× / 5×)
// und «Verkaufen» (was im Lager liegt und der Händler ankauft, 1× / alle). Preise mit dem Rabatt der
// Stadtstufe. Regeln und Sätze kommen aus systems/Haendler.ts; das
// Fenster zeigt nur deren Text und zeichnet sich danach neu. Nach jedem
// Kauf oder Verkauf wird gespeichert (mc:speichern, main.ts). Escape
// schliesst das Fenster (FensterHilfen.ts).
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../../data/buildings';
import { HAENDLER_WAREN, kaufpreis, rabattProzent } from '../../data/haendler';
import { ITEM_DEFS } from '../../data/items';
import { stadtStufeVon } from '../../data/stadtstufen';
import { GameState } from '../../models/GameState';
import { erfolgePruefen } from '../../systems/AchievementSystem';
import { getGildenrang, itemName } from '../../systems/GebaeudeStatus';
import { HaendlerErgebnis, kaufen, verkaeufliches, verkaufen } from '../../systems/Haendler';
import { bindeFensterTasten, hintergrundKlick, schluckeZweitenKlick } from '../components/FensterHilfen';
import { wirdGedrueckt } from '../components/DruckWaechter';

export type HaendlerAbschnitt = 'kaufen' | 'verkaufen';

export interface HaendlerFensterOptionen {
  /** Abschnitt, zu dem das Fenster beim Öffnen scrollt. */
  abschnitt?: HaendlerAbschnitt;
  /** Nach dem Schliessen (die Seite dahinter zeichnet sich neu). */
  beimSchliessen: () => void;
}

const KAUF_MENGEN = [1, 5];

function gold(state: GameState): number {
  return Math.floor(state.globalStock.gold ?? 0);
}

function knopf(cls: string, daten: string, text: string, geht: boolean): string {
  return `<button class="hf-btn ${cls}" ${daten}${geht ? '' : ' disabled'}>${text}</button>`;
}

// ── Abschnitte ──────────────────────────────────────────────────

function renderKopf(state: GameState): string {
  const stufe = stadtStufeVon(state);
  const rabatt = rabattProzent(stufe);
  return `
    <div class="hf-kopf">
      <span class="hf-gold">🪙 ${gold(state).toLocaleString('de')} Gold</span>
      ${rabatt > 0 ? `<span class="hf-rabatt">Stadtstufe ${stufe}: ${rabatt} % Rabatt</span>` : ''}
    </div>`;
}

/** Brot und Heiltrank zuerst, dann die Grundausrüstung (Reihenfolge von HAENDLER_WAREN). */
function renderKaufen(state: GameState): string {
  const stufe = stadtStufeVon(state);
  const zeilen = HAENDLER_WAREN.map(w => {
    const preis = kaufpreis(w.itemId, stufe);
    const wirkung = ITEM_DEFS[w.itemId]?.wirkungText;
    const lager = Math.floor(state.globalStock[w.itemId] ?? 0);
    const knoepfe = KAUF_MENGEN.map(n =>
      knopf('hf-kaufen', `data-kauf="${w.itemId}" data-menge="${n}"`, `${n}×`, gold(state) >= preis * n)).join('');
    return `
      <div class="hf-ware">
        <span class="hf-name">${itemName(w.itemId)}<small>${wirkung ? `${wirkung} · ` : ''}${lager} im Lager</small></span>
        <span class="hf-preis">${preis} Gold</span>
        ${knoepfe}
      </div>`;
  }).join('');
  return `<div class="hf-abschnitt" data-hf="kaufen"><span class="lbl">KAUFEN</span>${zeilen}</div>`;
}

/** Was im Lager liegt und der Händler ankauft, nach Namen sortiert. */
function renderVerkaufen(state: GameState): string {
  const liste = verkaeufliches(state).sort((a, b) => itemName(a.itemId).localeCompare(itemName(b.itemId), 'de'));
  const zeilen = liste.map(v => `
      <div class="hf-ware">
        <span class="hf-name">${itemName(v.itemId)}<small>${v.menge} im Lager</small></span>
        <span class="hf-preis">${v.preis} Gold je Stück</span>
        ${knopf('hf-verkaufen', `data-verkauf="${v.itemId}" data-menge="1"`, '1×', true)}
        ${knopf('hf-verkaufen', `data-verkauf="${v.itemId}" data-menge="alle"`, `alle (${v.preis * v.menge} Gold)`, true)}
      </div>`).join('');
  const inhalt = zeilen || '<p class="ws-msg">Nichts im Lager, was der Händler ankauft. Er nimmt Ausrüstung, Beute und Proviant zum halben Wert – Set-Teile und Dungeon-Material nicht (das gehört in die Set-Schmiede).</p>';
  return `<div class="hf-abschnitt" data-hf="verkaufen"><span class="lbl">VERKAUFEN</span>${inhalt}</div>`;
}

function renderBody(state: GameState, meldung: HaendlerErgebnis | null): string {
  const zeile = meldung ? `<p class="hf-meldung ${meldung.ok ? 'gut' : 'schlecht'}">${meldung.text}</p>` : '';
  return `${renderKopf(state)}${zeile}${renderKaufen(state)}${renderVerkaufen(state)}`;
}

/** Woran sich das Fenster von selbst nachzieht (Gold und Lager können sich durch Werkstätten ändern). */
function signatur(state: GameState): string {
  return JSON.stringify([gold(state), stadtStufeVon(state), getGildenrang(state), verkaeufliches(state),
    state.buildings.map(b => b?.typeId), HAENDLER_WAREN.map(w => state.globalStock[w.itemId] ?? 0)]);
}

// ── Das Fenster ─────────────────────────────────────────────────

export function showHaendlerFenster(root: HTMLElement, state: GameState, opt: HaendlerFensterOptionen): void {
  const def = BUILDING_DEFS.HAENDLER;
  root.querySelector('.ov')?.remove();
  let meldung: HaendlerErgebnis | null = null;

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal modal-ws hf">
      <div class="bm-bild"><img src="assets/sprites/final/${def.spriteKey}.png" alt="" onerror="this.style.display='none'"></div>
      <h3 class="bm-title">${def.name}</h3>
      <p class="bm-info">Stückpreise, kein Limit. Er nimmt Ausrüstung, Beute und Proviant zum halben Wert – Set-Teile und Dungeon-Material nicht (das gehört in die Set-Schmiede).</p>
      <div class="bm-body">${renderBody(state, meldung)}</div>
      <div class="bm-actions"><button class="fk-btn btn-close-modal">SCHLIESSEN</button></div>
    </div>`;
  root.appendChild(ov);

  const body = ov.querySelector('.bm-body') as HTMLElement;
  let lastSig = signatur(state);
  const refresh = () => {
    body.innerHTML = renderBody(state, meldung);
    lastSig = signatur(state);
  };
  if (opt.abschnitt) body.querySelector(`[data-hf="${opt.abschnitt}"]`)?.scrollIntoView({ block: 'start' });

  const timer = window.setInterval(() => {
    if (!ov.isConnected) {
      window.clearInterval(timer);
      return;
    }
    if (!wirdGedrueckt() && signatur(state) !== lastSig) refresh();
  }, 500);

  const close = () => {
    window.clearInterval(timer);
    tastenLoesen();
    ov.remove();
    opt.beimSchliessen();
  };
  const tastenLoesen = bindeFensterTasten(ov, ov.querySelector('.modal'), close);

  /** Ergebnis anzeigen; nach einem Kauf oder Verkauf Erfolge prüfen und speichern. */
  const fertig = (r: HaendlerErgebnis) => {
    meldung = r;
    if (r.ok) {
      erfolgePruefen(state);
      window.dispatchEvent(new Event('mc:speichern'));
    }
    refresh();
  };

  const hintergrund = hintergrundKlick(ov);
  ov.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === ov) {
      if (hintergrund(e)) {
        close();
        schluckeZweitenKlick();
      }
      return;
    }
    if (target.classList.contains('btn-close-modal')) {
      close();
      schluckeZweitenKlick();
      return;
    }
    const btn = target.closest('button[data-kauf], button[data-verkauf]') as HTMLElement | null;
    if (!btn || (btn as HTMLButtonElement).disabled) return;
    const { kauf, verkauf, menge } = btn.dataset;
    if (kauf) fertig(kaufen(state, kauf, Number(menge)));
    else if (verkauf) fertig(verkaufen(state, verkauf, menge === 'alle' ? 'alle' : Number(menge)));
  });
}
