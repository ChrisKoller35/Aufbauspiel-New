// ─── Magic City – Aufbau-Reiter ─────────────────────────────────
// Die sechs Gebäude der Gildenstadt als Kacheln (Reihenfolge
// BUILD_MENU_ORDER): gebaut (mit Stufe), baubar (mit Baukosten), oder
// gesperrt mit den Hinweisen aus freischaltHinweise (Gildenrang). Klick
// auf eine Kachel öffnet das Gebäude-Fenster oder den Bau-Dialog, der
// das Gebäude direkt freischaltet. Empfiehlt systems/Empfehlung.ts
// keinen Bau, sondern einen Helden (typeId leer), steht der Schritt als
// Knopf über dem Raster und führt zu den Helden.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BUILD_MENU_ORDER } from '../../data/buildings';
import { GameState } from '../../models/GameState';
import { freischaltHinweise, getBuiltTypeIds, getGildenrang, dasGebaeude, kostenText } from '../../systems/GebaeudeStatus';
import { maxStufe, stufeVon } from '../../systems/Ausbau';
import { naechsterBau } from '../../systems/Empfehlung';

type KachelStatus = 'gebaut' | 'baubar' | 'gesperrt';

/** «✓ Stufe 2 von 3» bei ausbaubaren Gebäuden, sonst «✓ Gebaut». */
function gebautLabel(state: GameState, typeId: string): string {
  const b = dasGebaeude(state, typeId);
  const max = maxStufe(typeId);
  return b && max > 1 ? `✓ Stufe ${stufeVon(b)} von ${max}` : '✓ Gebaut';
}

function kachel(state: GameState, typeId: string, built: Set<string>, empfohlen: string | undefined, imageStyle: string): string {
  const def = BUILDING_DEFS[typeId];
  const hinweise = built.has(typeId) ? [] : freischaltHinweise(state, typeId);
  const status: KachelStatus = built.has(typeId) ? 'gebaut' : hinweise.length === 0 ? 'baubar' : 'gesperrt';
  const naechstes = typeId === empfohlen ? ' · lohnt sich als Nächstes' : '';
  const label = status === 'gebaut' ? gebautLabel(state, typeId)
    : status === 'baubar' ? `Bauen: ${kostenText(def.buildCost)}${naechstes}`
    : `🔒 ${hinweise.join(', ')}`;
  return `
      <div class="acard ${status}${typeId === empfohlen ? ' empfohlen' : ''}" data-btype="${typeId}" data-status="${status}"
           role="button" tabindex="0" title="${def.name}" style="${imageStyle}">
        <span class="acard-nm">${def.name}</span>
        <span class="acard-st">${label}</span>
      </div>`;
}

/** Empfiehlt die Stadt keinen Bau, sondern einen Schritt ohne Gebäude (Held anheuern): Knopf mit Grund. */
function naechsterSchrittHTML(state: GameState): string {
  const e = naechsterBau(state);
  if (!e || e.typeId) return '';
  return `<button type="button" class="aufbau-tipp" data-ziel="heroes"><b>Als Nächstes: ${e.text}</b> ${e.warum}</button>`;
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
        <span class="lg gesperrt">Gesperrt</span>
        <span class="aufbau-rang">Gildenrang ${getGildenrang(state)}</span>
      </div>
      <p class="craft-hint">Gildenhaus und Händler stehen von Anfang an. Die vier Werkstätten schaltest du direkt hier
        frei, mit Gold und Beute aus den Dungeons (die späteren ab einem Gildenrang); danach lassen sie sich bis Stufe 3 ausbauen.</p>
      ${naechsterSchrittHTML(state)}
      <div class="aufbau-grid">${cards}</div>
    </div>`;
}

export interface AufbauCallbacks {
  /** Gebaut: Fenster; baubar oder gesperrt: Bau-Dialog (zeigt den Sperrgrund). */
  oeffne: (typeId: string) => void;
  /** Empfohlener Schritt ohne Gebäude (Held anheuern): Helden-Bildschirm. */
  zuDenHelden: () => void;
}

export function bindAufbauTab(panel: HTMLElement, cb: AufbauCallbacks): void {
  panel.querySelector('.aufbau-tipp')?.addEventListener('click', () => cb.zuDenHelden());
  const waehle = (card: HTMLElement) => {
    const typeId = card.dataset.btype;
    if (!typeId) return;
    cb.oeffne(typeId);
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
