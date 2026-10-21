// ─── Magic City – Main Menu Screen ──────────────────────────────
// Default landing screen with hero section, 4 navigation tiles and the wide Gildenhaus tile.
// ────────────────────────────────────────────────────────────────

import { navigateTo, ScreenId } from '../ScreenRouter';
import { GameState } from '../../models/GameState';
import { renderHeader } from './HeaderRenderer';
import { stadtBannerHtml, bindeStadtBanner } from './StadtwegFenster';
import { probespielHinweisHtml } from '../components/ProbespielHinweis';
import { ranglisteKurz } from '../../systems/Rangliste';
import { brettKurz } from '../../systems/Auftragsbrett';
import { zeigeGildenhaus } from './GildenhausScreen';

/** Chosen background; survives re-renders of the main menu on navigation. */
let chosenBg = 1;

/**
 * Renders the main menu screen into the given app container.
 * Expects a GameState reference so resource values are real.
 */
export function renderMainMenu(app: HTMLElement, state: GameState): void {
  // Rangliste mit Rivalen: Platz auf der Karte und in der Woche, Abzeichen für eine offene Belohnung
  const rang = ranglisteKurz(state, Date.now());
  const rangAbzeichen = rang.offen > 0 ? '<span class="tile-abzeichen">🏆 Truhe bereit</span>' : '';
  // Gildenhaus: Zettel am Auftragsbrett; Abzeichen, wenn etwas abgegeben werden kann oder die Zettel von heute neu sind
  const brett = brettKurz(state, Date.now());
  const brettAbzeichen = brett.abgeben ? '<span class="tile-abzeichen">📜 Abgeben möglich</span>'
    : brett.neu && brett.offen > 0 ? '<span class="tile-abzeichen">📜 Neue Zettel</span>' : '';
  const brettText = brett.offen > 0 ? `${brett.offen} Zettel offen` : 'alle Zettel erledigt';

  const el = document.createElement('div');
  el.id = 's-main';
  el.className = 'screen active';

  el.innerHTML = `
    ${renderHeader(state)}

    <div class="main-bg" id="main-bg"></div>

    <section class="main-hero">
      <h1 class="main-title glow">MAGIC CITY</h1>
      <p class="main-tagline">Baue deine Stadt. Forme deine Helden. Erobere das Unbekannte.</p>
      ${probespielHinweisHtml()}
    </section>

    ${stadtBannerHtml()}

    <div class="main-grid">
      <div class="tile" data-nav="expeditions" style="background-image:url('assets/tiles/tile_expeditions.png')">
        <span class="tile-name">Expeditionen</span>
        <span class="tile-desc">Erkunde gef\u00e4hrliche Routen und finde Beute</span>
      </div>
      <div class="tile" data-nav="heroes" style="background-image:url('assets/tiles/tile_heroes.png')">
        <span class="tile-name">Helden</span>
        <span class="tile-desc">Rekrutiere, r\u00fcste aus und level deine K\u00e4mpfer</span>
      </div>
      <div class="tile" data-nav="buildings" style="background-image:url('assets/tiles/tile_buildings.png')">
        <span class="tile-name">Geb\u00e4ude &amp; Crafting</span>
        <span class="tile-desc">Errichte Geb\u00e4ude und stelle m\u00e4chtige Items her</span>
      </div>
      <div class="tile" data-nav="ranking" style="background-image:url('assets/tiles/tile_ranking.png')">
        ${rangAbzeichen}
        <span class="tile-name">Rangliste</span>
        <span class="tile-desc">Gipfel: Platz ${rang.platz} von ${rang.gilden} \u00b7 Woche: Platz ${rang.wochePlatz}</span>
      </div>
      <div class="tile tile-gildenhaus" data-gildenhaus="brett" style="background-image:url('assets/buildings/bld_guild_hall.png')">
        ${brettAbzeichen}
        <span class="tile-name">Gildenhaus</span>
        <span class="tile-desc">Auftragsbrett: ${brettText} \u00b7 ${brett.siegel} Siegel \u00b7 Troph\u00e4ensaal</span>
      </div>
    </div>

    <div class="bg-switcher" id="bg-switcher">
      <span class="bg-switcher-label">BG:</span>
      <button class="bg-btn active" data-bg="1">1</button>
      <button class="bg-btn" data-bg="2">2</button>
      <button class="bg-btn" data-bg="3">3</button>
      <button class="bg-btn" data-bg="0">Aus</button>
    </div>
  `;

  // Delegate click events for all [data-nav] elements
  el.addEventListener('click', (e: MouseEvent) => {
    // Gildenhaus: immer mit dem Auftragsbrett öffnen
    if ((e.target as HTMLElement).closest('[data-gildenhaus]')) {
      zeigeGildenhaus('brett');
      return;
    }
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
    if (!target) return;
    const screen = target.dataset.nav as ScreenId;
    if (screen) {
      navigateTo(screen);
    }
  });

  // Der Weg zur Magischen Stadt: Stadtstufe, Fortschritt, wachsende Stadt
  bindeStadtBanner(el, state);

  // Background switcher
  const bgEl = el.querySelector('#main-bg') as HTMLElement;
  const switcherEl = el.querySelector('#bg-switcher') as HTMLElement;

  function setBg(num: number): void {
    chosenBg = num;
    const buttons = Array.from(switcherEl.querySelectorAll('.bg-btn'));
    for (const btn of buttons) {
      btn.classList.toggle('active', btn.getAttribute('data-bg') === String(num));
    }
    if (num === 0) {
      bgEl.style.backgroundImage = 'none';
    } else {
      bgEl.style.backgroundImage = `url('assets/tiles/bg_main_${num}.png')`;
    }
  }

  // Default: BG 1, afterwards the last choice
  setBg(chosenBg);

  switcherEl.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.bg-btn');
    if (!btn) return;
    const num = parseInt(btn.dataset.bg || '0', 10);
    setBg(num);
  });

  // Keyboard shortcuts 1/2/3 for quick switching (only when main menu is visible)
  const keyHandler = (e: KeyboardEvent) => {
    if (!el.isConnected) {
      document.removeEventListener('keydown', keyHandler);
      return;
    }
    if (e.key === '1') setBg(1);
    else if (e.key === '2') setBg(2);
    else if (e.key === '3') setBg(3);
    else if (e.key === '0') setBg(0);
  };
  document.addEventListener('keydown', keyHandler);

  app.appendChild(el);
}
