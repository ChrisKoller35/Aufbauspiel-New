// ─── Magic City – Reiter «Produktion» (Mindmap) ─────────────────
// Vier Reihen von oben nach unten: Rohstoffe → Lager (Balken über die
// ganze Breite) → Werkstätten → Stadt. Verbindungslinien werden nach dem
// Zeichnen aus den echten Kartenpositionen als SVG gelegt (gold, wenn
// beide Seiten stehen). Jedes Gebäude kommt genau einmal vor; statt «×N»
// steht die Ausbau-Stufe. Daten: data/produktionsnetz.ts.
// Klicks werden über BuildingsScreen angebunden (Callbacks).
// ────────────────────────────────────────────────────────────────

import { NETZ_REIHEN, NETZ_KANTEN, NetzKnoten, netzKnoten, netzGebaeudeIds } from '../../data/produktionsnetz';
import { GameState } from '../../models/GameState';
import {
  getGebaeudeStatus, gebaeudeName, itemName, getBuiltTypeIds, dasGebaeude, GebaeudeStatus,
} from '../../systems/GebaeudeStatus';
import { engpaesseDerStadt } from '../../systems/EngpassSystem';
import { maxStufe, kannAusbauen } from '../../systems/Ausbau';

export type ProduktionZiel = 'expeditions' | 'heroes' | 'aufbau';

export interface ProduktionCallbacks {
  /** Gebautes Gebäude: Fenster mit Werkstatt und Ausbau öffnen. */
  oeffneGebaeude: (typeId: string) => void;
  /** Bauplatz oder gesperrt: Kauf-Dialog (zeigt Sperrgrund). */
  kaufen: (typeId: string) => void;
  /** Zutat aus den Dungeons oder Ziel-Kasten: anderer Bildschirm oder Reiter. */
  wechseln: (ziel: ProduktionZiel) => void;
}

/** Vorräte, die der Lager-Balken zeigt. */
const LAGER_CHIPS = ['wood', 'stone', 'grain', 'flour', 'bread', 'iron_scrap', 'crystal_shard', 'herb_green'];

type Bild = (typeId: string) => string;

// ── Werte ───────────────────────────────────────────────────────

function quellenVorrat(state: GameState, items: string[]): number {
  return items.reduce((sum, item) => sum + Math.floor(state.globalStock[item] ?? 0), 0);
}

function traenkeImLager(state: GameState): number {
  return Object.entries(state.globalStock)
    .filter(([key]) => key === 'healing_potion' || key.startsWith('potion_'))
    .reduce((sum, [, qty]) => sum + Math.floor(qty ?? 0), 0);
}

function zielWert(state: GameState, wert: 'bauen' | 'expeditionen'): string {
  if (wert === 'expeditionen') return `${state.fighters.length} Helden · ${traenkeImLager(state)} Tränke`;
  let baubar = 0;
  let ausbaubar = 0;
  for (const typeId of netzGebaeudeIds()) {
    const s = getGebaeudeStatus(state, typeId);
    if (s.zustand === 'bauplatz') baubar++;
    else if (s.anzahl > 0) {
      const b = dasGebaeude(state, typeId);
      if (b && kannAusbauen(state, b)) ausbaubar++;
    }
  }
  const teile: string[] = [];
  if (baubar) teile.push(`${baubar} baubar`);
  if (ausbaubar) teile.push(`${ausbaubar} ausbaubar`);
  return teile.length ? teile.join(' · ') : 'sammle Holz & Stein';
}

/** Steht der Knoten (gebaut, Vorrat da, Ziel immer)? Grundlage für goldene Linien. */
function vorhanden(state: GameState, built: Set<string>, id: string): boolean {
  const k = netzKnoten(id);
  if (!k) return false;
  if (k.art === 'gebaeude') return built.has(k.typeId);
  if (k.art === 'quelle') return quellenVorrat(state, k.items) > 0;
  return true;
}

// ── HTML ────────────────────────────────────────────────────────

function balken(fortschritt: number | null): string {
  const pct = fortschritt === null ? 0 : Math.round(fortschritt * 100);
  return `<div class="pk-bar"${fortschritt === null ? ' hidden' : ''}><i style="width:${pct}%"></i></div>`;
}

function stufeText(s: GebaeudeStatus): string {
  return s.anzahl > 0 && maxStufe(s.typeId) > 1 ? `Stufe ${s.stufe}` : '';
}

function chips(state: GameState): string {
  return LAGER_CHIPS.map(item =>
    `<span class="pk-chip" data-item="${item}"><b>${Math.floor(state.globalStock[item] ?? 0)}</b> ${itemName(item)}</span>`,
  ).join('');
}

function gebaeudeKarte(state: GameState, typeId: string, bild: Bild, breit: boolean): string {
  const s = getGebaeudeStatus(state, typeId);
  const stufe = stufeText(s);
  if (breit) {
    return `
      <div class="pk-karte pk-lager z-${s.zustand}" data-knoten="${typeId}" data-type-id="${typeId}" title="${gebaeudeName(typeId)}: alles, was die Stadt gewinnt, liegt hier">
        <div class="pk-img" style="${bild(typeId)}"></div>
        <div class="pk-lager-txt">
          <div class="pk-nm">${gebaeudeName(typeId)}</div>
          <div class="pk-st">${s.text}</div>
        </div>
        <div class="pk-chips">${chips(state)}</div>
      </div>`;
  }
  return `
    <div class="pk-karte z-${s.zustand}" data-knoten="${typeId}" data-type-id="${typeId}" title="${gebaeudeName(typeId)}: ${s.text}">
      <div class="pk-img" style="${bild(typeId)}"></div>
      <span class="pk-lock">🔒</span>
      <span class="pk-stufe"${stufe ? '' : ' hidden'}>${stufe}</span>
      <div class="pk-nm">${gebaeudeName(typeId)}</div>
      <div class="pk-st">${s.text}</div>
      ${balken(s.fortschritt)}
    </div>`;
}

function quellenText(state: GameState, items: string[]): string {
  const vorrat = quellenVorrat(state, items);
  return vorrat > 0 ? `${vorrat} im Lager` : 'Beute aus den Dungeons';
}

function quellenKarte(state: GameState, k: Extract<NetzKnoten, { art: 'quelle' }>): string {
  const vorrat = quellenVorrat(state, k.items);
  return `
    <div class="pk-karte pk-quelle z-${vorrat > 0 ? 'bereit' : 'wartet'}" data-knoten="${k.id}" data-quelle="${k.id}" title="${k.items.map(itemName).join(', ')}: Beute aus den Dungeons">
      <div class="pk-img" style="background-image:url('assets/tiles/${k.bild}.png')"></div>
      <div class="pk-nm">${k.titel}</div>
      <div class="pk-st">${quellenText(state, k.items)}</div>
    </div>`;
}

function zielKarte(state: GameState, k: Extract<NetzKnoten, { art: 'ziel' }>): string {
  return `
    <div class="pk-ziel link" data-knoten="${k.id}" data-ziel="${k.wert}">
      <b>${k.titel}</b><span class="pk-ziel-w">${zielWert(state, k.wert)}</span>
    </div>`;
}

function knotenHTML(state: GameState, k: NetzKnoten, bild: Bild): string {
  if (k.art === 'gebaeude') return gebaeudeKarte(state, k.typeId, bild, !!k.breit);
  if (k.art === 'quelle') return quellenKarte(state, k);
  return zielKarte(state, k);
}

function engpaesseHTML(state: GameState): string {
  const liste = engpaesseDerStadt(state, 3);
  if (liste.length === 0) return '<span class="pk-eng-ok">✓ Alles läuft rund.</span>';
  return liste.map(e => `<button class="pk-eng-item" data-type-id="${e.typeId}">⚠ ${e.satz}</button>`).join('');
}

const SVG_DEFS = `
  <defs>
    <marker id="pk-pfeil-an" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#c8a227"></path>
    </marker>
    <marker id="pk-pfeil-aus" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3a3a4a"></path>
    </marker>
  </defs>`;

export function renderProduktionTab(state: GameState, bild: Bild): string {
  const reihen = NETZ_REIHEN.map(r => `
    <section class="pk-reihe" data-reihe="${r.id}">
      <div class="pk-kopf"><h3>${r.titel}</h3><small>${r.untertitel}</small></div>
      <div class="pk-row">${r.knoten.map(k => knotenHTML(state, k, bild)).join('')}</div>
    </section>`).join('');
  return `
    <div class="pk">
      <div class="pk-top">
        <p class="pk-hint">Oben wird gewonnen, in der Mitte liegt alles im Lager, unten wird daraus mehr.
          Klick auf ein Gebäude öffnet Werkstatt und Ausbau, auf einen Bauplatz den Bau-Dialog.</p>
        <div class="pk-engpaesse">${engpaesseHTML(state)}</div>
      </div>
      <div class="pk-netz">
        <svg class="pk-kanten" aria-hidden="true">${SVG_DEFS}<g class="pk-kanten-g"></g></svg>
        ${reihen}
        <svg class="pk-kanten pk-kanten-txt" aria-hidden="true"><g class="pk-kanten-g"></g></svg>
      </div>
    </div>`;
}

// ── Verbindungslinien ───────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function f(n: number): string {
  return n.toFixed(1);
}

/** Pfad und Beschriftungsposition einer Linie zwischen zwei Kästen. */
function kantenPfad(von: Rect, nach: Rect, vonBreit: boolean, nachBreit: boolean):
  { d: string; lx: number; ly: number; anchor: 'start' | 'middle' } {
  // Von oben nach unten (Regelfall)
  if (nach.y >= von.y + von.h - 2) {
    const sx = vonBreit ? clamp(nach.x + nach.w / 2, von.x + 24, von.x + von.w - 24) : von.x + von.w / 2;
    const ex = nachBreit ? clamp(von.x + von.w / 2, nach.x + 24, nach.x + nach.w - 24) : nach.x + nach.w / 2;
    const sy = von.y + von.h;
    const ey = nach.y - 1;
    const my = (sy + ey) / 2;
    if (Math.abs(sx - ex) < 1) {
      return { d: `M ${f(sx)} ${f(sy)} L ${f(ex)} ${f(ey)}`, lx: sx + 6, ly: my + 4, anchor: 'start' };
    }
    return {
      d: `M ${f(sx)} ${f(sy)} C ${f(sx)} ${f(my)} ${f(ex)} ${f(my)} ${f(ex)} ${f(ey)}`,
      lx: (sx + ex) / 2, ly: my - 4, anchor: 'middle',
    };
  }
  // Nebeneinander in derselben Reihe
  if (nach.x >= von.x + von.w - 2) {
    const sx = von.x + von.w;
    const ex = nach.x - 1;
    const sy = von.y + Math.min(von.h, nach.h) / 2;
    const ey = nach.y + Math.min(von.h, nach.h) / 2;
    const mx = (sx + ex) / 2;
    const d = Math.abs(sy - ey) < 1
      ? `M ${f(sx)} ${f(sy)} L ${f(ex)} ${f(ey)}`
      : `M ${f(sx)} ${f(sy)} C ${f(mx)} ${f(sy)} ${f(mx)} ${f(ey)} ${f(ex)} ${f(ey)}`;
    return { d, lx: mx, ly: Math.min(sy, ey) - 7, anchor: 'middle' };
  }
  // Sonst (sollte im Netz nicht vorkommen): Mitte zu Mitte
  const sx = von.x + von.w / 2, sy = von.y + von.h / 2, ex = nach.x + nach.w / 2, ey = nach.y + nach.h / 2;
  return { d: `M ${f(sx)} ${f(sy)} L ${f(ex)} ${f(ey)}`, lx: (sx + ex) / 2, ly: (sy + ey) / 2 - 4, anchor: 'middle' };
}

/** Linien aus den echten Kartenpositionen neu legen (nur, wenn sich etwas geändert hat). */
export function zeichneKanten(panel: HTMLElement, state: GameState): void {
  const netz = panel.querySelector('.pk-netz') as HTMLElement | null;
  // Linien liegen unter den Karten, die Beschriftungen darüber (sonst verdecken Karten kurze Querverbindungen)
  const svgs = netz ? Array.from(netz.querySelectorAll<SVGSVGElement>('svg.pk-kanten')) : [];
  const gruppen = svgs.map(svg => svg.querySelector('.pk-kanten-g'));
  if (!netz || svgs.length < 2 || gruppen.some(g => !g) || netz.clientWidth === 0) return;

  const base = netz.getBoundingClientRect();
  const rects = new Map<string, Rect>();
  netz.querySelectorAll<HTMLElement>('[data-knoten]').forEach(el => {
    const r = el.getBoundingClientRect();
    rects.set(el.dataset.knoten!, { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
  });

  const built = getBuiltTypeIds(state);
  let pfade = '';
  let texte = '';
  for (const kante of NETZ_KANTEN) {
    const von = rects.get(kante.von);
    const nach = rects.get(kante.nach);
    if (!von || !nach) continue;
    const vonK = netzKnoten(kante.von);
    const nachK = netzKnoten(kante.nach);
    const breit = (k: NetzKnoten | undefined) => !!(k && k.art === 'gebaeude' && k.breit);
    const an = vorhanden(state, built, kante.von) && vorhanden(state, built, kante.nach);
    const p = kantenPfad(von, nach, breit(vonK), breit(nachK));
    const cls = `pk-k ${an ? 'an' : 'aus'}${kante.art === 'versorgung' ? ' versorgung' : ''}`;
    pfade += `<path class="${cls}" d="${p.d}" marker-end="url(#pk-pfeil-${an ? 'an' : 'aus'})"></path>`;
    texte += `<text class="pk-kl ${an ? 'an' : 'aus'}" x="${f(p.lx)}" y="${f(p.ly)}" text-anchor="${p.anchor}">${kante.ware}</text>`;
  }

  const w = String(Math.ceil(netz.scrollWidth));
  const h = String(Math.ceil(netz.scrollHeight));
  svgs.forEach((svg, i) => {
    if (svg.getAttribute('width') !== w) svg.setAttribute('width', w);
    if (svg.getAttribute('height') !== h) svg.setAttribute('height', h);
    const g = gruppen[i]!;
    const inhalt = i === 0 ? pfade : texte;
    if (g.innerHTML !== inhalt) g.innerHTML = inhalt;
  });
}

// ── Laufende Aktualisierung (ohne Neuzeichnen) ──────────────────

function setText(el: Element | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

function aktualisiereKarte(karte: HTMLElement, s: GebaeudeStatus, state: GameState): void {
  const lager = karte.classList.contains('pk-lager');
  const cls = `pk-karte${lager ? ' pk-lager' : ''} z-${s.zustand}`;
  if (karte.className !== cls) karte.className = cls;
  setText(karte.querySelector('.pk-st'), s.text);
  if (lager) {
    const chipsEl = karte.querySelector('.pk-chips');
    const neu = chips(state);
    if (chipsEl && chipsEl.innerHTML !== neu) chipsEl.innerHTML = neu;
    return;
  }
  karte.title = `${gebaeudeName(s.typeId)}: ${s.text}`;
  const stufe = karte.querySelector('.pk-stufe') as HTMLElement | null;
  if (stufe) {
    const text = stufeText(s);
    stufe.hidden = !text;
    setText(stufe, text);
  }
  const bar = karte.querySelector('.pk-bar') as HTMLElement | null;
  if (bar) {
    bar.hidden = s.fortschritt === null;
    const fill = bar.firstElementChild as HTMLElement;
    const width = `${Math.round((s.fortschritt ?? 0) * 100)}%`;
    if (fill.style.width !== width) fill.style.width = width;
  }
}

export function aktualisiereProduktionTab(panel: HTMLElement, state: GameState): void {
  panel.querySelectorAll<HTMLElement>('.pk-karte[data-type-id]').forEach(karte => {
    aktualisiereKarte(karte, getGebaeudeStatus(state, karte.dataset.typeId!), state);
  });
  panel.querySelectorAll<HTMLElement>('.pk-quelle[data-quelle]').forEach(karte => {
    const k = netzKnoten(karte.dataset.quelle!);
    if (!k || k.art !== 'quelle') return;
    const cls = `pk-karte pk-quelle z-${quellenVorrat(state, k.items) > 0 ? 'bereit' : 'wartet'}`;
    if (karte.className !== cls) karte.className = cls;
    setText(karte.querySelector('.pk-st'), quellenText(state, k.items));
  });
  panel.querySelectorAll<HTMLElement>('.pk-ziel[data-ziel]').forEach(ziel => {
    setText(ziel.querySelector('.pk-ziel-w'), zielWert(state, ziel.dataset.ziel as 'bauen' | 'expeditionen'));
  });
  const eng = panel.querySelector('.pk-engpaesse');
  if (eng) {
    const neu = engpaesseHTML(state);
    if (eng.innerHTML !== neu) eng.innerHTML = neu;
  }
  zeichneKanten(panel, state);
}

// ── Klicks ──────────────────────────────────────────────────────

export function bindProduktionTab(panel: HTMLElement, state: GameState, cb: ProduktionCallbacks): void {
  panel.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const mitTyp = target.closest('[data-type-id]') as HTMLElement | null;
    if (mitTyp?.dataset.typeId) {
      const typeId = mitTyp.dataset.typeId;
      if (getGebaeudeStatus(state, typeId).anzahl > 0) cb.oeffneGebaeude(typeId);
      else cb.kaufen(typeId);
      return;
    }
    if (target.closest('.pk-quelle')) {
      cb.wechseln('expeditions');
      return;
    }
    const ziel = target.closest('.pk-ziel[data-ziel]') as HTMLElement | null;
    if (ziel) cb.wechseln(ziel.dataset.ziel === 'bauen' ? 'aufbau' : 'expeditions');
  });
}
