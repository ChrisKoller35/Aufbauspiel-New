// ─── Magic City – Aufbau-Reiter ─────────────────────────────────
// Die sechs Gebäude der Gildenstadt als Kacheln (Reihenfolge
// BUILD_MENU_ORDER): gebaut (mit Stufe), baubar, «Bauplan kaufen» beim
// Händler, oder gesperrt mit den Hinweisen aus freischaltHinweise
// (Bauplan beim Händler oder vom Boss, Gildenrang). Klick auf eine
// Kachel öffnet das Gebäude-Fenster, den Bau-Dialog oder, wenn nur der
// Bauplan fehlt, das Händler-Fenster.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BUILD_MENU_ORDER, bauplanHinweis } from '../../data/buildings';
import { bauplanPreis } from '../../data/haendler';
import { stadtStufeVon } from '../../data/stadtstufen';
import { GameState } from '../../models/GameState';
import { freischaltHinweise, getBuiltTypeIds, getGildenrang, dasGebaeude } from '../../systems/GebaeudeStatus';
import { maxStufe, stufeVon } from '../../systems/Ausbau';
import { naechsterBau } from '../../systems/Empfehlung';

type KachelStatus = 'gebaut' | 'baubar' | 'bauplan' | 'gesperrt';

/**
 * Fehlt dem Gebäude nur noch der Bauplan, den der Händler führt? Dann der Preis mit Rabatt
 * der Stadtstufe (Knopf «Bauplan kaufen (N Gold)»), sonst null.
 */
export function bauplanSchritt(state: GameState, typeId: string): { preis: number } | null {
  const bauplan = BUILDING_DEFS[typeId]?.freischaltung.bauplan;
  if (!bauplan || bauplanPreis(bauplan) <= 0 || dasGebaeude(state, typeId)) return null;
  const hinweise = freischaltHinweise(state, typeId);
  if (hinweise.length !== 1 || hinweise[0] !== bauplanHinweis(typeId)) return null;
  return { preis: bauplanPreis(bauplan, stadtStufeVon(state)) };
}

/** «Bauplan kaufen (50 Gold)» */
export function bauplanKaufenText(preis: number): string {
  return `Bauplan kaufen (${preis} Gold)`;
}

/** «✓ Stufe 2 von 3» bei ausbaubaren Gebäuden, sonst «✓ Gebaut». */
function gebautLabel(state: GameState, typeId: string): string {
  const b = dasGebaeude(state, typeId);
  const max = maxStufe(typeId);
  return b && max > 1 ? `✓ Stufe ${stufeVon(b)} von ${max}` : '✓ Gebaut';
}

function kachel(state: GameState, typeId: string, built: Set<string>, empfohlen: string | undefined, imageStyle: string): string {
  const def = BUILDING_DEFS[typeId];
  const hinweise = built.has(typeId) ? [] : freischaltHinweise(state, typeId);
  const bauplan = bauplanSchritt(state, typeId);
  const status: KachelStatus = built.has(typeId) ? 'gebaut' : hinweise.length === 0 ? 'baubar' : bauplan ? 'bauplan' : 'gesperrt';
  const naechstes = typeId === empfohlen ? ' · lohnt sich als Nächstes' : '';
  const label = status === 'gebaut' ? gebautLabel(state, typeId)
    : status === 'baubar' ? `Baubar${naechstes}`
    : status === 'bauplan' ? `${bauplanKaufenText(bauplan!.preis)}${naechstes}`
    : `🔒 ${hinweise.join(', ')}`;
  return `
      <div class="acard ${status}${typeId === empfohlen ? ' empfohlen' : ''}" data-btype="${typeId}" data-status="${status}"
           role="button" tabindex="0" title="${def.name}" style="${imageStyle}">
        <span class="acard-nm">${def.name}</span>
        <span class="acard-st">${label}</span>
      </div>`;
}

export function renderAufbauTab(state: GameState, imageStyle: (typeId: string) => string): string {
  const built = getBuiltTypeIds(state);
  const empfohlen = naechsterBau(state)?.typeId;
  const cards = BUILD_MENU_ORDER
    .filter(id => BUILDING_DEFS[id])
    .map(id => kachel(state, id, built, empfohlen, imageStyle(id)))
    .join('');

  return `
    <div class="aufbau">
      <div class="aufbau-legend">
        <span class="lg gebaut">Gebaut</span>
        <span class="lg baubar">Baubar</span>
        <span class="lg bauplan">Bauplan beim Händler</span>
        <span class="lg gesperrt">Gesperrt</span>
        <span class="aufbau-rang">Gildenrang ${getGildenrang(state)}</span>
      </div>
      <p class="craft-hint">Gildenhaus und Händler stehen von Anfang an. Die vier Werkstätten brauchen einen Bauplan
        (Händler oder Boss) und Gold und Beute aus den Dungeons; danach lassen sie sich bis Stufe 3 ausbauen.</p>
      <div class="aufbau-grid">${cards}</div>
    </div>`;
}

export interface AufbauCallbacks {
  /** Gebaut: Fenster; baubar oder gesperrt: Bau-Dialog (zeigt den Sperrgrund). */
  oeffne: (typeId: string) => void;
  /** Nur der Bauplan fehlt: Händler-Fenster, Abschnitt Baupläne. */
  bauplanKaufen: (typeId: string) => void;
}

export function bindAufbauTab(panel: HTMLElement, cb: AufbauCallbacks): void {
  const waehle = (card: HTMLElement) => {
    const typeId = card.dataset.btype;
    if (!typeId) return;
    if (card.dataset.status === 'bauplan') cb.bauplanKaufen(typeId);
    else cb.oeffne(typeId);
  };
  panel.querySelectorAll<HTMLElement>('.acard').forEach(card => {
    card.addEventListener('click', () => waehle(card));
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      waehle(card);
    });
  });
}
