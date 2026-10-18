// ─── Magic City – Aufbau-Reiter ─────────────────────────────────
// Freischalt-Baum der Gebäude: Stufen von links nach rechts,
// Karten (gebaut / baubar / gesperrt) mit Verbindungslinien.
// Nur Anzeige; Klick auf eine Karte öffnet den Kauf-Dialog oder, wenn
// das Gebäude steht, sein Fenster mit dem Ausbau (Stufe auf der Karte).
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BUILD_MENU_ORDER, getFreischaltStufe } from '../../data/buildings';
import { GameState } from '../../models/GameState';
import { freischaltHinweise, getBuiltTypeIds, getGildenrang, dasGebaeude } from '../../systems/GebaeudeStatus';
import { maxStufe, stufeVon } from '../../systems/Ausbau';

export { getBuiltTypeIds, getGildenrang };

const CARD_W = 150;
const CARD_H = 92;
const GAP_X = 64;
const GAP_Y = 16;

/** «✓ Stufe 2 von 3» bei ausbaubaren Gebäuden, sonst «✓ Gebaut». */
function gebautLabel(state: GameState, typeId: string): string {
  const b = dasGebaeude(state, typeId);
  const max = maxStufe(typeId);
  return b && max > 1 ? `✓ Stufe ${stufeVon(b)} von ${max}` : '✓ Gebaut';
}

export function renderAufbauTab(state: GameState, imageStyle: (typeId: string) => string): string {
  const built = getBuiltTypeIds(state);
  const rang = getGildenrang(state);

  // Spalten nach Stufe aufbauen
  const columns: string[][] = [];
  for (const id of BUILD_MENU_ORDER) {
    if (!BUILDING_DEFS[id]) continue;
    const stufe = getFreischaltStufe(id);
    (columns[stufe] ??= []).push(id);
  }

  // Reihenfolge je Spalte: nach mittlerer Zeile der Voraussetzungen (weniger Kreuzungen)
  const row: Record<string, number> = {};
  columns.forEach((ids, stufe) => {
    if (stufe > 0) {
      const center = (id: string): number => {
        const parents = BUILDING_DEFS[id].freischaltung.braucht.filter(p => p in row);
        return parents.length ? parents.reduce((sum, p) => sum + row[p], 0) / parents.length : 0;
      };
      ids.sort((a, b) => center(a) - center(b));
    }
    ids.forEach((id, i) => { row[id] = i; });
  });

  const maxRows = Math.max(...columns.map(c => c?.length ?? 0));
  const treeH = maxRows * (CARD_H + GAP_Y) - GAP_Y;
  const treeW = columns.length * (CARD_W + GAP_X) - GAP_X;

  const pos: Record<string, { x: number; y: number }> = {};
  columns.forEach((ids, stufe) => {
    const offsetY = ((maxRows - ids.length) * (CARD_H + GAP_Y)) / 2;
    ids.forEach((id, i) => {
      pos[id] = { x: stufe * (CARD_W + GAP_X), y: offsetY + i * (CARD_H + GAP_Y) };
    });
  });

  // Verbindungslinien: rechte Kante der Voraussetzung → linke Kante des Gebäudes
  let links = '';
  for (const id of Object.keys(pos)) {
    for (const parent of BUILDING_DEFS[id].freischaltung.braucht) {
      const from = pos[parent];
      const to = pos[id];
      if (!from) continue;
      const x1 = from.x + CARD_W;
      const y1 = from.y + CARD_H / 2;
      const dx = to.x - x1;
      const dy = to.y + CARD_H / 2 - y1;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const done = built.has(parent) ? ' done' : '';
      links += `<div class="alink${done}" style="left:${x1}px;top:${y1}px;width:${len.toFixed(1)}px;transform:rotate(${angle.toFixed(4)}rad)"></div>`;
    }
  }

  let cards = '';
  for (const [id, p] of Object.entries(pos)) {
    const def = BUILDING_DEFS[id];
    // Hinweise inkl. fehlendem Bauplan, damit «Baubar» nur steht, wenn BAUEN auch geht
    const hinweise = built.has(id) ? [] : freischaltHinweise(state, id);
    const status = built.has(id) ? 'gebaut' : hinweise.length ? 'gesperrt' : 'baubar';
    const label = status === 'gebaut' ? gebautLabel(state, id)
      : status === 'baubar' ? 'Baubar'
      : '🔒 ' + hinweise.join(', ');
    cards += `
      <div class="acard ${status}" data-btype="${id}" title="${def.name}"
           style="left:${p.x}px;top:${p.y}px;width:${CARD_W}px;height:${CARD_H}px;${imageStyle(id)}">
        <span class="acard-nm">${def.name}</span>
        <span class="acard-st">${label}</span>
      </div>`;
  }

  const heads = columns.map((_, stufe) =>
    `<span class="aufbau-head" style="left:${stufe * (CARD_W + GAP_X)}px;width:${CARD_W}px">STUFE ${stufe + 1}</span>`
  ).join('');

  return `
    <div class="aufbau">
      <div class="aufbau-legend">
        <span class="lg gebaut">Gebaut</span>
        <span class="lg baubar">Baubar</span>
        <span class="lg gesperrt">Gesperrt</span>
        <span class="aufbau-rang">Gildenrang ${rang}</span>
      </div>
      <div class="aufbau-scroll">
        <div class="aufbau-heads" style="width:${treeW}px">${heads}</div>
        <div class="aufbau-tree" style="width:${treeW}px;height:${treeH}px">${links}${cards}</div>
      </div>
    </div>`;
}

export function bindAufbauTab(root: HTMLElement, onSelect: (typeId: string) => void): void {
  const cards = root.querySelectorAll('.acard');
  for (let i = 0; i < cards.length; i++) {
    cards[i].addEventListener('click', () => {
      const typeId = (cards[i] as HTMLElement).dataset.btype;
      if (typeId) onSelect(typeId);
    });
  }
}
