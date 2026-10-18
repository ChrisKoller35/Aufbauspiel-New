// ─── Magic City – Reiter «Produktion» ───────────────────────────
// Gebäude als Produktionsketten: jede Kette eine Zeile, Pfeile zeigen
// den Weg der Waren, fehlende Glieder stehen als Bauplatz oder mit
// Schloss genau dort, wo sie hingehören. Unter jedem Ketten-Titel steht
// der Engpass. Vorlage: docs/entwuerfe/README.md (Entwurf 2).
// Klicks werden über BuildingsScreen angebunden (Callbacks).
// ────────────────────────────────────────────────────────────────

import { PRODUKTIONSKETTEN, Produktionskette, KettenGlied, KettenZiel, Verbindung, gliedTypeIds } from '../../data/produktionsketten';
import { GameState } from '../../models/GameState';
import { getGebaeudeStatus, gebaeudeName, itemName, GebaeudeStatus } from '../../systems/GebaeudeStatus';
import { engpassFuerKette } from '../../systems/EngpassSystem';
import { EconomySystem } from '../../systems/EconomySystem';

const economy = new EconomySystem();

/** Hintergrundbild für Zutaten aus den Dungeons. */
const QUELLEN_BILD: Record<string, string> = {
  crystal_shard: 'exp_crystal_mines',
  herb_fire_root: 'exp_haunted_woods',
};

export interface ProduktionCallbacks {
  /** Gebautes Gebäude: Werkstatt öffnen. */
  oeffneGebaeude: (typeId: string) => void;
  /** Bauplatz oder gesperrt: Kauf-Dialog (zeigt Sperrgrund). */
  kaufen: (typeId: string) => void;
  /** Zutat aus den Dungeons oder Ziel-Kasten: anderer Bildschirm. */
  wechseln: (screen: 'expeditions' | 'heroes') => void;
}

// ── Werte ───────────────────────────────────────────────────────

function quellenVorrat(state: GameState, items: string[]): number {
  return items.reduce((sum, item) => sum + Math.floor(state.globalStock[item] ?? 0), 0);
}

function zielWert(state: GameState, art: KettenZiel): string {
  switch (art) {
    case 'bauen': return 'alle Gebäude';
    case 'gold-steuern': return `+${economy.steuernProTag(state)} / Tag`;
    case 'gold-handel': return `${Math.floor(state.globalStock.gold ?? 0)} im Lager`;
    case 'helden': return `${state.fighters.length} in der Gilde`;
    case 'expeditionen': return `${Math.floor(state.globalStock.healing_potion ?? 0)} Heiltränke`;
  }
}

function zielScreen(art: KettenZiel): 'expeditions' | 'heroes' | '' {
  if (art === 'helden') return 'heroes';
  if (art === 'expeditionen') return 'expeditions';
  return '';
}

/** Ein Glied gilt als vorhanden, wenn mindestens ein Gebäude steht bzw. die Zutat im Lager liegt. */
function gliedVorhanden(state: GameState, glied: KettenGlied): boolean {
  if (glied.art === 'quelle') return quellenVorrat(state, glied.items) > 0;
  return gliedTypeIds(glied).some(id => getGebaeudeStatus(state, id).anzahl > 0);
}

// ── HTML ────────────────────────────────────────────────────────

function balken(fortschritt: number | null): string {
  const pct = fortschritt === null ? 0 : Math.round(fortschritt * 100);
  return `<div class="pk-bar"${fortschritt === null ? ' hidden' : ''}><i style="width:${pct}%"></i></div>`;
}

function kartenKlasse(s: GebaeudeStatus): string {
  return `pk-karte z-${s.zustand}`;
}

function gebaeudeKarte(state: GameState, typeId: string, bild: (typeId: string) => string, klein: boolean): string {
  const s = getGebaeudeStatus(state, typeId);
  return `
    <div class="${kartenKlasse(s)}${klein ? ' klein' : ''}" data-type-id="${typeId}" title="${gebaeudeName(typeId)}: ${s.text}">
      <div class="pk-img" style="${bild(typeId)}"></div>
      <span class="pk-cnt"${s.anzahl > 1 ? '' : ' hidden'}>×${s.anzahl}</span>
      <span class="pk-lock">🔒</span>
      <div class="pk-nm">${gebaeudeName(typeId)}</div>
      <div class="pk-st">${s.text}</div>
      ${balken(s.fortschritt)}
    </div>`;
}

function quellenText(state: GameState, items: string[]): string {
  const vorrat = quellenVorrat(state, items);
  return vorrat > 0 ? `${vorrat} im Lager` : 'aus den Dungeons';
}

function quellenKarte(state: GameState, glied: Extract<KettenGlied, { art: 'quelle' }>, index: number): string {
  const vorrat = quellenVorrat(state, glied.items);
  const bild = QUELLEN_BILD[glied.items[0]] ?? 'exp_cave_deep';
  const was = glied.items.map(itemName).join(', ');
  return `
    <div class="pk-karte pk-quelle z-${vorrat > 0 ? 'bereit' : 'wartet'}" data-quelle="${index}" title="${was}: Beute aus den Dungeons">
      <div class="pk-img" style="background-image:url('assets/tiles/${bild}.png')"></div>
      <div class="pk-nm">${glied.titel}</div>
      <div class="pk-st">${quellenText(state, glied.items)}</div>
    </div>`;
}

function verbindung(v: Verbindung | undefined, an: boolean): string {
  if (!v) return '';
  if (v.art === 'plus') return '<div class="pk-plus">+</div>';
  return `<div class="pk-pfeil${an ? ' an' : ''}"><span>${v.ware}</span></div>`;
}

function gliedHTML(state: GameState, glied: KettenGlied, index: number, bild: (typeId: string) => string): string {
  if (glied.art === 'quelle') return quellenKarte(state, glied, index);
  if (glied.art === 'gebaeude') return gebaeudeKarte(state, glied.typeId, bild, false);
  return `<div class="pk-stapel">${glied.typeIds.map(id => gebaeudeKarte(state, id, bild, true)).join('')}</div>`;
}

function ketteHTML(state: GameState, kette: Produktionskette, bild: (typeId: string) => string): string {
  let row = '';
  let vorherDa = true;
  kette.glieder.forEach((glied, i) => {
    const da = gliedVorhanden(state, glied);
    row += `<span class="pk-v" data-v="${i}">${verbindung(glied.vorher, vorherDa && da)}</span>`;
    row += gliedHTML(state, glied, i, bild);
    // Ein «+»-Glied (Brunnen, Zutat) unterbricht den Warenfluss nicht
    if (glied.vorher?.art !== 'plus') vorherDa = da;
    else vorherDa = vorherDa && da;
  });
  const zielAn = kette.glieder.every(g => gliedVorhanden(state, g) || g.art === 'quelle' || g.art === 'stapel');
  row += `<span class="pk-v" data-v="ziel">${verbindung(kette.ziel.vorher, zielAn)}</span>`;
  const screen = zielScreen(kette.ziel.art);
  row += `
    <div class="pk-ziel${screen ? ' link' : ''}"${screen ? ` data-screen="${screen}"` : ''}>
      <b>${kette.ziel.titel}</b><span class="pk-ziel-w">${zielWert(state, kette.ziel.art)}</span>
    </div>`;

  const eng = engpassFuerKette(state, kette);
  return `
    <section class="pk-kette" data-kette="${kette.id}">
      <div class="pk-kopf">
        <h3>${kette.titel}</h3>
        <small>${kette.untertitel}</small>
        <p class="pk-eng${eng ? '' : ' ok'}">${eng ?? '✓ läuft rund'}</p>
      </div>
      <div class="pk-row">${row}</div>
    </section>`;
}

export function renderProduktionTab(state: GameState, bild: (typeId: string) => string): string {
  return `
    <div class="pk">
      <p class="pk-hint">Was wird aus was? Jede Zeile ist eine Kette. Klick auf ein Gebäude öffnet seine Werkstatt,
        auf einen Bauplatz den Bau-Dialog.</p>
      ${PRODUKTIONSKETTEN.map(k => ketteHTML(state, k, bild)).join('')}
    </div>`;
}

// ── Laufende Aktualisierung (ohne Neuzeichnen) ──────────────────

function setText(el: Element | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

function aktualisiereKarte(karte: HTMLElement, s: GebaeudeStatus): void {
  const klein = karte.classList.contains('klein');
  const cls = kartenKlasse(s) + (klein ? ' klein' : '');
  if (karte.className !== cls) karte.className = cls;
  setText(karte.querySelector('.pk-st'), s.text);
  karte.title = `${gebaeudeName(s.typeId)}: ${s.text}`;
  const cnt = karte.querySelector('.pk-cnt') as HTMLElement | null;
  if (cnt) { cnt.hidden = s.anzahl < 2; setText(cnt, `×${s.anzahl}`); }
  const bar = karte.querySelector('.pk-bar') as HTMLElement | null;
  if (bar) {
    bar.hidden = s.fortschritt === null;
    const fill = bar.firstElementChild as HTMLElement;
    const width = `${Math.round((s.fortschritt ?? 0) * 100)}%`;
    if (fill.style.width !== width) fill.style.width = width;
  }
}

export function aktualisiereProduktionTab(panel: HTMLElement, state: GameState): void {
  for (const kette of PRODUKTIONSKETTEN) {
    const el = panel.querySelector(`.pk-kette[data-kette="${kette.id}"]`) as HTMLElement | null;
    if (!el) continue;

    el.querySelectorAll<HTMLElement>('.pk-karte[data-type-id]').forEach(karte => {
      aktualisiereKarte(karte, getGebaeudeStatus(state, karte.dataset.typeId!));
    });

    let vorherDa = true;
    kette.glieder.forEach((glied, i) => {
      const da = gliedVorhanden(state, glied);
      el.querySelector(`.pk-v[data-v="${i}"] .pk-pfeil`)?.classList.toggle('an', vorherDa && da);
      if (glied.art === 'quelle') {
        const karte = el.querySelector(`.pk-quelle[data-quelle="${i}"]`) as HTMLElement | null;
        if (karte) {
          karte.className = `pk-karte pk-quelle z-${da ? 'bereit' : 'wartet'}`;
          setText(karte.querySelector('.pk-st'), quellenText(state, glied.items));
        }
      }
      if (glied.vorher?.art !== 'plus') vorherDa = da;
      else vorherDa = vorherDa && da;
    });
    const zielAn = kette.glieder.every(g => gliedVorhanden(state, g) || g.art === 'quelle' || g.art === 'stapel');
    el.querySelector('.pk-v[data-v="ziel"] .pk-pfeil')?.classList.toggle('an', zielAn);
    setText(el.querySelector('.pk-ziel-w'), zielWert(state, kette.ziel.art));

    const eng = engpassFuerKette(state, kette);
    const engEl = el.querySelector('.pk-eng');
    setText(engEl, eng ?? '✓ läuft rund');
    engEl?.classList.toggle('ok', !eng);
  }
}

// ── Klicks ──────────────────────────────────────────────────────

export function bindProduktionTab(panel: HTMLElement, state: GameState, cb: ProduktionCallbacks): void {
  panel.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const karte = target.closest('.pk-karte') as HTMLElement | null;
    if (karte?.dataset.typeId) {
      const typeId = karte.dataset.typeId;
      if (getGebaeudeStatus(state, typeId).anzahl > 0) cb.oeffneGebaeude(typeId);
      else cb.kaufen(typeId);
      return;
    }
    if (karte?.dataset.quelle) {
      cb.wechseln('expeditions');
      return;
    }
    const ziel = target.closest('.pk-ziel.link') as HTMLElement | null;
    if (ziel?.dataset.screen) cb.wechseln(ziel.dataset.screen as 'expeditions' | 'heroes');
  });
}
