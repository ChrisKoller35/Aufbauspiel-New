// ─── Magic City – Geschichten der Dungeons in der Anzeige ───────
// Einleitung beim ersten Aufbruch, die Entscheidungen unterwegs (Knöpfe mit
// ihren Folgen), die Chronik im Bericht nach der Expedition und der Block im
// Routen-Fenster der Dungeon-Karte. Regeln: systems/Geschichten.ts.
// ────────────────────────────────────────────────────────────────

import '../html/geschichten.css';
import { GameState } from '../../models/GameState';
import { DungeonGeschichte, Wirkung } from '../../data/dungeonGeschichten';
import { GeschichtsBilanz, geschichteVon, istErlebt, istGefahr, wirkungZeile } from '../../systems/Geschichten';

const UNTERSCHRIFT = '<div class="gs-sig">Ottokar, Stadtschreiber</div>';

function escape(text: string): string {
  return text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

/** Ein Absatz der Geschichte, in der Schrift des Stadtschreibers */
export function geschichtsText(text: string): string {
  return `<div class="gs-text">${escape(text)}</div>`;
}

function anzahlEntscheidungen(geschichte: DungeonGeschichte): number {
  return geschichte.wahlen.length + Object.keys(geschichte.raumWahlen ?? {}).length;
}

/** Einleitung vor dem ersten Aufbruch in den Dungeon */
export function einleitungHtml(geschichte: DungeonGeschichte): string {
  return geschichtsText(geschichte.einleitung) + UNTERSCHRIFT
    + `<div class="gs-hinweis">Unterwegs stehen ${anzahlEntscheidungen(geschichte)} Entscheidungen an. Sie verändern Beute und Gefahr.</div>`;
}

/** Folgen einer Option, je eine Zeile: rot die Gefahr, grün der Gewinn */
export function folgenHtml(routeId: string, wirkung: Wirkung[]): string {
  return wirkung
    .map(w => `<span class="gs-folge ${istGefahr(w) ? 'gefahr' : 'gewinn'}">${escape(wirkungZeile(routeId, w))}</span>`)
    .join('');
}

/** Knopf einer Entscheidung: die Beschriftung, darunter die Folgen */
export function optionsKnopfHtml(label: string, folgen: string): string {
  return `<span class="gs-option-label">${escape(label)}</span>${folgen}`;
}

/** Chronik im Bericht nach der Expedition: die Sätze zu den Entscheidungen, nach dem ersten Sieg der Schluss */
export function chronikHtml(bilanz: GeschichtsBilanz): string {
  const saetze = bilanz.chronik.map(geschichtsText).join('');
  const ende = bilanz.ende ? `<div class="gs-text gs-ende">${escape(bilanz.ende)}</div>` : '';
  return `
    <div class="gs-chronik">
      <div class="gs-kopf">📜 ${escape(bilanz.titel)}${bilanz.zumErstenMal ? ' · Geschichte erlebt' : ''}</div>
      ${saetze}${ende}${UNTERSCHRIFT}
    </div>`;
}

/** Block im Routen-Fenster der Dungeon-Karte: zum Aufklappen, nach dem ersten Sieg mit dem Schluss */
export function kartenGeschichteHtml(state: GameState, routeId: string): string {
  const geschichte = geschichteVon(routeId);
  if (!geschichte) return '';
  const erlebt = istErlebt(state, routeId);
  return `
    <details class="gs-karte">
      <summary>📜 Geschichte: ${escape(geschichte.titel)}${erlebt ? ' <span class="gs-erlebt">✓ erlebt</span>' : ''}</summary>
      ${geschichtsText(geschichte.einleitung)}
      ${erlebt ? `<div class="gs-kopf-klein">Wie es ausging</div>${geschichtsText(geschichte.ende)}` : ''}
      ${UNTERSCHRIFT}
    </details>`;
}

/** Zeile im Band über dem Team (Expeditionsfenster) */
export function routenGeschichteHtml(state: GameState, routeId: string): string {
  const geschichte = geschichteVon(routeId);
  if (!geschichte) return '';
  const erlebt = istErlebt(state, routeId) ? ' ✓' : '';
  return `<span class="exp-geschichte">📜 Geschichte: ${escape(geschichte.titel)}${erlebt} · ${anzahlEntscheidungen(geschichte)} Entscheidungen unterwegs</span>`;
}
