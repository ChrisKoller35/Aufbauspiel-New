// ─── Magic City – Reiter «Wohnen» ───────────────────────────────
// Wohnhäuser mit Bewohnern, nächster Bewohner, Zufriedenheit,
// Brot-Vorrat, Arbeit und Steuern. Nur Anzeige, keine neuen Regeln:
// Zahlen aus PeopleSystem (Wachstum je Tag mit Brot und freiem Platz),
// SatisfactionSystem und EconomySystem.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../../data/buildings';
import { GameState } from '../../models/GameState';
import { EconomySystem } from '../../systems/EconomySystem';
import { TAG_SEKUNDEN, kostenText, wohnKapazitaet, freischaltHinweise } from '../../systems/GebaeudeStatus';

const economy = new EconomySystem();
const HOUSE = 'HOUSE_T1';

export interface WohnenCallbacks {
  oeffneHaus: (buildingId: number) => void;
  kaufen: (typeId: string) => void;
}

function zaehle(state: GameState, status: string): number {
  return state.citizens.filter(c => c.status === status).length;
}

/** Wächst die Stadt beim nächsten Tageswechsel? Sonst der Grund. */
function wachstum(state: GameState): { waechst: boolean; text: string } {
  if (state.citizens.length >= wohnKapazitaet(state)) return { waechst: false, text: 'Alle Häuser voll: baue ein Wohnhaus' };
  if ((state.globalStock.bread ?? 0) < 1) return { waechst: false, text: 'Kein Brot: neue Bewohner brauchen 1 Brot' };
  return { waechst: true, text: 'Nächster Bewohner kommt' };
}

/** Bauplätze für Wohnhäuser (wie hasEmptySlot in BuildingsScreen). */
export const WOHN_BAUPLAETZE = 12;

function hausKarten(state: GameState, bild: string): string {
  const houses = state.buildings.filter(b => b && BUILDING_DEFS[b.typeId]?.housing);
  let rest = state.citizens.length;
  const { waechst } = wachstum(state);
  let wachsendGesetzt = false;

  const karten = houses.map(b => {
    const cap = BUILDING_DEFS[b.typeId].housing!.capacity;
    const drin = b.built ? Math.max(0, Math.min(cap, rest)) : 0;
    rest -= drin;
    const wird = b.built && waechst && !wachsendGesetzt && drin < cap;
    if (wird) wachsendGesetzt = true;
    const text = !b.built ? 'im Bau' : wird ? `${drin} / ${cap} · wächst` : `${drin} / ${cap} Bewohner`;
    const cls = !b.built ? 'z-wartet' : drin >= cap ? 'z-laeuft' : 'z-bereit';
    return `
      <div class="pk-karte ${cls}" data-house-id="${b.id}">
        <div class="pk-img" style="${bild}"></div>
        <div class="pk-nm">Wohnhaus</div>
        <div class="pk-st">${text}</div>
        <div class="pk-bar wohn-wachs"${wird ? '' : ' hidden'}><i style="width:${Math.round((state.dayTickAccumulator / TAG_SEKUNDEN) * 100)}%"></i></div>
      </div>`;
  }).join('');

  const def = BUILDING_DEFS[HOUSE];
  const hinweise = freischaltHinweise(state, HOUSE);
  const frei = houses.length < WOHN_BAUPLAETZE;
  const neu = !frei
    ? `<div class="pk-karte z-gesperrt"><div class="pk-img" style="${bild}"></div><div class="pk-nm">Wohnhaus</div><div class="pk-st">keine Bauplätze mehr</div></div>`
    : `<div class="pk-karte z-${hinweise.length ? 'gesperrt' : 'bauplatz'}" data-buy="${HOUSE}">
        <div class="pk-img" style="${bild}"></div><span class="pk-lock">🔒</span>
        <div class="pk-nm">Wohnhaus bauen</div>
        <div class="pk-st">${hinweise.length ? hinweise.join(' · ') : kostenText(def.buildCost)}</div>
      </div>`;
  return karten + neu;
}

function infoBox(state: GameState): string {
  const cap = wohnKapazitaet(state);
  const w = wachstum(state);
  const pct = Math.round((state.dayTickAccumulator / TAG_SEKUNDEN) * 100);
  const houses = state.buildings.filter(b => b && BUILDING_DEFS[b.typeId]?.housing).length;
  const zufr = Math.round(state.satisfaction ?? 0);
  return `
    <div class="wohn-info">
      <div class="wohn-zeile"><span>Bewohner</span><b>${state.citizens.length} / ${cap}</b></div>
      <div class="wohn-zeile"><span>Zufriedenheit</span><b class="${zufr >= 50 ? 'gut' : 'schlecht'}">${zufr} %</b></div>
      <div class="wohn-zeile"><span>Brot im Lager</span><b>${Math.floor(state.globalStock.bread ?? 0)}</b></div>
      <div class="wohn-zeile"><span>Steuern</span><b>+${economy.steuernProTag(state)} Gold / Tag</b></div>
      <div class="wohn-zeile"><span>Arbeiten</span><b>${zaehle(state, 'WORKER') + zaehle(state, 'BUILDER')}</b></div>
      <div class="wohn-zeile"><span>Frei</span><b>${zaehle(state, 'IDLE')}</b></div>
      <div class="wohn-zeile"><span>Helden & Training</span><b>${zaehle(state, 'GUILD_FIGHTER') + zaehle(state, 'GUILD_TRAINING') + zaehle(state, 'ON_EXPEDITION') + zaehle(state, 'INJURED_REST')}</b></div>
      <div class="wohn-zeile"><span>Bauplätze Wohnhäuser</span><b>${houses} / ${WOHN_BAUPLAETZE}</b></div>
      <div class="wohn-wachstum ${w.waechst ? 'gut' : 'schlecht'}">
        <span>${w.text}</span>
        <div class="pk-bar"${w.waechst ? '' : ' hidden'}><i style="width:${pct}%"></i></div>
      </div>
      <p class="wohn-tipp">Neue Bewohner kommen einmal pro Tag, wenn ein Haus Platz hat und Brot im Lager liegt.
        Freie Bewohner arbeiten automatisch in Gebäuden. Zufriedenheit steigt mit Brot und Brunnen und erhöht die Steuern.</p>
    </div>`;
}

export function renderWohnenTab(state: GameState, bild: string): string {
  return `
    <div class="wohn">
      <div class="wohn-haeuser">${hausKarten(state, bild)}</div>
      ${infoBox(state)}
    </div>`;
}

/** Teile, die sich laufend ändern; ändert sich die Signatur, wird neu gezeichnet. */
export function wohnenSignatur(state: GameState): string {
  const houses = state.buildings.filter(b => b && BUILDING_DEFS[b.typeId]?.housing);
  return JSON.stringify([
    houses.map(b => [b.id, b.built]), state.citizens.map(c => c.status).join(''),
    Math.floor(state.globalStock.bread ?? 0), Math.round(state.satisfaction ?? 0),
    economy.steuernProTag(state),
  ]);
}

/** Nur die Wachstums-Balken nachführen. */
export function aktualisiereWohnenBalken(panel: HTMLElement, state: GameState): void {
  const width = `${Math.round((state.dayTickAccumulator / TAG_SEKUNDEN) * 100)}%`;
  panel.querySelectorAll<HTMLElement>('.wohn-wachs > i, .wohn-wachstum .pk-bar > i').forEach(fill => {
    fill.style.width = width;
  });
}

export function bindWohnenTab(panel: HTMLElement, cb: WohnenCallbacks): void {
  panel.addEventListener('click', (e) => {
    const karte = (e.target as HTMLElement).closest('.pk-karte') as HTMLElement | null;
    if (!karte) return;
    if (karte.dataset.houseId) cb.oeffneHaus(Number(karte.dataset.houseId));
    else if (karte.dataset.buy) cb.kaufen(karte.dataset.buy);
  });
}
