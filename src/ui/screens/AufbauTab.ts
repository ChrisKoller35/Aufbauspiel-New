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
import { fundorte } from '../../systems/Fundbuch';

type KachelStatus = 'gebaut' | 'baubar' | 'gesperrt';

/**
 * Knopf «📜 Wo?» zum Bauplan im Fundbuch, solange das Gebäude fehlt und der Bauplan nicht im Lager
 * liegt. Bei einem Boss-Bauplan steht der Dungeon des Bosses drauf, der Boss (ENEMY_DEFS) im Titel.
 */
function woKnopf(state: GameState, typeId: string): string {
  const bauplan = BUILDING_DEFS[typeId]?.freischaltung.bauplan;
  if (!bauplan || (state.globalStock[bauplan] ?? 0) >= 1) return '';
  const quelle = fundorte(bauplan).bauplan;
  if (!quelle) return '';
  const wege = [
    quelle.haendlerPreis ? `beim Händler (${quelle.haendlerPreis} Gold)` : '',
    quelle.boss ? `vom Boss «${quelle.boss.name}» in «${quelle.boss.routeName}» (erster Sieg)` : '',
  ].filter(Boolean).join(' oder ');
  const text = quelle.boss ? `📜 Wo? · ${quelle.boss.routeName}` : '📜 Wo?';
  return `<button type="button" class="acard-wo" data-bauplan="${bauplan}" title="Im Fundbuch: Bauplan ${wege}"><span>${text}</span></button>`;
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
        ${status === 'gebaut' ? '' : woKnopf(state, typeId)}
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
  /** «Wo?» auf einer Karte: Fundbuch beim Bauplan. */
  fundbuch: (bauplanId: string) => void;
}

export function bindAufbauTab(panel: HTMLElement, cb: AufbauCallbacks): void {
  panel.querySelector('.aufbau-tipp')?.addEventListener('click', () => cb.zuDenHelden());
  const waehle = (card: HTMLElement) => {
    const typeId = card.dataset.btype;
    if (!typeId) return;
    cb.oeffne(typeId);
  };
  // «Wo?» liegt in der Karte: Klick und Tasten nicht an die Karte geben (sonst öffnet zugleich der Kauf-Dialog)
  panel.querySelectorAll<HTMLElement>('.acard-wo').forEach(knopf => {
    knopf.addEventListener('click', (e) => {
      e.stopPropagation();
      if (knopf.dataset.bauplan) cb.fundbuch(knopf.dataset.bauplan);
    });
    knopf.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); });
  });
  panel.querySelectorAll<HTMLElement>('.acard').forEach(card => {
    card.addEventListener('click', () => waehle(card));
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      waehle(card);
    });
  });
}
