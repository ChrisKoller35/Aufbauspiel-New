// ─── Magic City – Reiter «Produktion» (Mindmap) ─────────────────
// Vier Reihen von oben nach unten: Rohstoffe → Lager (Balken über die
// ganze Breite) → Werkstätten → Stadt. Verbindungslinien werden nach dem
// Zeichnen aus den echten Kartenpositionen als SVG gelegt (gold, wenn
// beide Seiten stehen). Jedes Gebäude kommt genau einmal vor; statt «×N»
// steht die Ausbau-Stufe. Daten: data/produktionsnetz.ts.
// Klicks werden über BuildingsScreen angebunden (Callbacks).
// Passt sich der Breite an: Platz genug → normal, etwas zu schmal →
// verkleinert (Linien bleiben), sehr schmal (Handy) → Raster ohne Linien,
// jede Karte nennt dann selbst, wohin sie liefert. Erklärung beim
// Darüberfahren (Maus) oder langen Drücken (Touch); das empfohlene
// nächste Gebäude ist golden markiert (systems/Empfehlung.ts).
// ────────────────────────────────────────────────────────────────

import { NETZ_REIHEN, NETZ_KANTEN, NetzKnoten, netzKnoten, netzGebaeudeIds } from '../../data/produktionsnetz';
import { ERKLAERUNG } from '../../data/gebaeudeErklaerungen';
import { GameState } from '../../models/GameState';
import {
  getGebaeudeStatus, gebaeudeName, itemName, getBuiltTypeIds, dasGebaeude, GebaeudeStatus, kostenText,
} from '../../systems/GebaeudeStatus';
import { naechsterBau } from '../../systems/Empfehlung';
import { BUILDING_DEFS } from '../../data/buildings';
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

/** Name eines Knotens für Sätze («Lagerhaus», «Expeditionen»). */
function knotenName(id: string): string {
  const k = netzKnoten(id);
  if (!k) return id;
  return k.art === 'gebaeude' ? gebaeudeName(k.typeId) : k.titel;
}

/**
 * Wohin ein Knoten liefert, als kurzer Text für das schmale Raster ohne Linien,
 * z. B. «→ Lagerhaus: Holz». Leer bei mehr als zwei Zielen (Lagerhaus).
 */
export function flussText(id: string): string {
  const raus = NETZ_KANTEN.filter(k => k.von === id);
  if (raus.length === 0 || raus.length > 2) return '';
  return raus.map(k => `→ ${knotenName(k.nach)}: ${k.ware}`).join(' · ');
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

function kartenKlasse(s: GebaeudeStatus, lager: boolean, empfohlen: boolean): string {
  return `pk-karte${lager ? ' pk-lager' : ''} z-${s.zustand}${empfohlen ? ' empfohlen' : ''}`;
}

function fluss(id: string): string {
  const text = flussText(id);
  return text ? `<div class="pk-fluss">${text}</div>` : '';
}

function gebaeudeKarte(state: GameState, typeId: string, bild: Bild, breit: boolean, empfohlen: string | null): string {
  const s = getGebaeudeStatus(state, typeId);
  const stufe = stufeText(s);
  const knopf = `tabindex="0" role="button" aria-label="${gebaeudeName(typeId)}"`;
  if (breit) {
    return `
      <div class="${kartenKlasse(s, true, false)}" data-knoten="${typeId}" data-type-id="${typeId}" ${knopf}>
        <div class="pk-img" style="${bild(typeId)}"></div>
        <div class="pk-lager-txt">
          <div class="pk-nm">${gebaeudeName(typeId)}</div>
          <div class="pk-st">${s.text}</div>
        </div>
        <div class="pk-chips">${chips(state)}</div>
      </div>`;
  }
  return `
    <div class="${kartenKlasse(s, false, empfohlen === typeId)}" data-knoten="${typeId}" data-type-id="${typeId}" ${knopf}>
      <div class="pk-img" style="${bild(typeId)}"></div>
      <span class="pk-lock">🔒</span>
      <span class="pk-tipp">Als Nächstes</span>
      <span class="pk-stufe"${stufe ? '' : ' hidden'}>${stufe}</span>
      <div class="pk-nm">${gebaeudeName(typeId)}</div>
      <div class="pk-st">${s.text}</div>
      ${fluss(typeId)}
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
    <div class="pk-karte pk-quelle z-${vorrat > 0 ? 'bereit' : 'wartet'}" data-knoten="${k.id}" data-quelle="${k.id}" tabindex="0" role="button" aria-label="${k.titel}">
      <div class="pk-img" style="background-image:url('assets/tiles/${k.bild}.png')"></div>
      <div class="pk-nm">${k.titel}</div>
      <div class="pk-st">${quellenText(state, k.items)}</div>
      ${fluss(k.id)}
    </div>`;
}

function zielKarte(state: GameState, k: Extract<NetzKnoten, { art: 'ziel' }>): string {
  return `
    <div class="pk-ziel link" data-knoten="${k.id}" data-ziel="${k.wert}" tabindex="0" role="button" aria-label="${k.titel}">
      <b>${k.titel}</b><span class="pk-ziel-w">${zielWert(state, k.wert)}</span>
    </div>`;
}

function knotenHTML(state: GameState, k: NetzKnoten, bild: Bild, empfohlen: string | null): string {
  if (k.art === 'gebaeude') return gebaeudeKarte(state, k.typeId, bild, !!k.breit, empfohlen);
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
  const empfohlen = naechsterBau(state)?.typeId ?? null;
  const reihen = NETZ_REIHEN.map(r => `
    <section class="pk-reihe" data-reihe="${r.id}">
      <div class="pk-kopf"><h3>${r.titel}</h3><small>${r.untertitel}</small></div>
      <div class="pk-row">${r.knoten.map(k => knotenHTML(state, k, bild, empfohlen)).join('')}</div>
    </section>`).join('');
  return `
    <div class="pk">
      <div class="pk-top">
        <p class="pk-hint">Oben wird gewonnen, in der Mitte liegt alles im Lager, unten wird daraus mehr.
          Klick auf ein Gebäude öffnet Werkstatt und Ausbau, auf einen Bauplatz den Bau-Dialog.
          <span class="nur-maus">Fahre mit der Maus über ein Gebäude, dann steht da kurz, wofür es gut ist.</span>
          <span class="nur-touch">Lange drücken zeigt kurz, wofür ein Gebäude gut ist.</span>
          Golden umrandet: das Gebäude, das sich als Nächstes lohnt.</p>
        <div class="pk-engpaesse">${engpaesseHTML(state)}</div>
      </div>
      <div class="pk-rahmen">
        <div class="pk-netz">
          <svg class="pk-kanten" aria-hidden="true">${SVG_DEFS}<g class="pk-kanten-g"></g></svg>
          ${reihen}
          <svg class="pk-kanten pk-kanten-txt" aria-hidden="true"><g class="pk-kanten-g"></g></svg>
        </div>
      </div>
      <div class="pk-tip" role="tooltip" hidden></div>
    </div>`;
}

// ── Grösse: normal, verkleinert oder Raster ─────────────────────

/** Unter diesem Faktor wäre die Schrift zu klein: dann Raster ohne Linien. */
const KLEINSTER_FAKTOR = 0.72;

export type Modus = 'voll' | 'zoom' | 'kompakt';

/** Welche Darstellung bei dieser Breite? (reine Rechnung, für Tests) */
export function modusFuer(verfuegbar: number, natuerlich: number): { modus: Modus; faktor: number } {
  if (natuerlich <= 0 || verfuegbar >= natuerlich) return { modus: 'voll', faktor: 1 };
  const faktor = verfuegbar / natuerlich;
  return faktor >= KLEINSTER_FAKTOR ? { modus: 'zoom', faktor } : { modus: 'kompakt', faktor: 1 };
}

/**
 * Misst nur neu, wenn sich die Breite geändert hat. Im Zoom-Modus wird das
 * Netz per transform verkleinert; der Rahmen bekommt die verkleinerte Höhe,
 * damit nichts seitlich übersteht.
 */
function passeGroesseAn(pk: HTMLElement, rahmen: HTMLElement, netz: HTMLElement): Modus {
  const verfuegbar = rahmen.clientWidth;
  let modus = (pk.dataset.modus as Modus | undefined) ?? 'voll';
  if (String(verfuegbar) !== pk.dataset.breite) {
    pk.dataset.breite = String(verfuegbar);
    pk.dataset.modus = 'voll';
    netz.style.transform = '';
    rahmen.style.height = '';
    const r = modusFuer(verfuegbar, netz.scrollWidth);
    modus = r.modus;
    pk.dataset.modus = modus;
    pk.dataset.faktor = String(r.faktor);
    if (modus === 'zoom') netz.style.transform = `scale(${r.faktor})`;
  }
  if (modus === 'zoom') {
    const hoehe = `${Math.ceil(netz.offsetHeight * Number(pk.dataset.faktor ?? 1))}px`;
    if (rahmen.style.height !== hoehe) rahmen.style.height = hoehe;
  }
  return modus;
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
  const pk = panel.querySelector('.pk') as HTMLElement | null;
  const rahmen = panel.querySelector('.pk-rahmen') as HTMLElement | null;
  if (pk && rahmen && passeGroesseAn(pk, rahmen, netz) === 'kompakt') return; // Raster: keine Linien

  // Positionen im (unverkleinerten) Netz: Bildschirm-Abstand geteilt durch den Zoom
  const base = netz.getBoundingClientRect();
  const faktor = netz.offsetWidth > 0 ? base.width / netz.offsetWidth : 1;
  const rects = new Map<string, Rect>();
  netz.querySelectorAll<HTMLElement>('[data-knoten]').forEach(el => {
    const r = el.getBoundingClientRect();
    rects.set(el.dataset.knoten!, {
      x: (r.left - base.left) / faktor, y: (r.top - base.top) / faktor, w: r.width / faktor, h: r.height / faktor,
    });
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

function aktualisiereKarte(karte: HTMLElement, s: GebaeudeStatus, state: GameState, empfohlen: string | null): void {
  const lager = karte.classList.contains('pk-lager');
  const cls = kartenKlasse(s, lager, !lager && empfohlen === s.typeId);
  if (karte.className !== cls) karte.className = cls;
  setText(karte.querySelector('.pk-st'), s.text);
  if (lager) {
    const chipsEl = karte.querySelector('.pk-chips');
    const neu = chips(state);
    if (chipsEl && chipsEl.innerHTML !== neu) chipsEl.innerHTML = neu;
    return;
  }
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
  const empfohlen = naechsterBau(state)?.typeId ?? null;
  panel.querySelectorAll<HTMLElement>('.pk-karte[data-type-id]').forEach(karte => {
    aktualisiereKarte(karte, getGebaeudeStatus(state, karte.dataset.typeId!), state, empfohlen);
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

// ── Erklärung (Tooltip) ─────────────────────────────────────────

/** Titel und Zeilen der Erklärung zu einem Kasten der Mindmap. */
export function erklaerung(state: GameState, knotenId: string): { titel: string; zeilen: string[] } {
  const k = netzKnoten(knotenId);
  const zeilen: string[] = [];
  const text = ERKLAERUNG[knotenId];
  if (text) zeilen.push(text);
  if (!k) return { titel: knotenId, zeilen };
  if (k.art === 'quelle') {
    zeilen.push(`Im Lager: ${quellenText(state, k.items)}.`, 'Klick: zu den Expeditionen.');
    return { titel: k.titel, zeilen };
  }
  if (k.art === 'ziel') {
    zeilen.push(k.wert === 'bauen' ? 'Klick: zum Freischalt-Baum.' : 'Klick: zu den Expeditionen.');
    return { titel: k.titel, zeilen };
  }
  const s = getGebaeudeStatus(state, k.typeId);
  if (s.anzahl > 0) {
    zeilen.push(`Jetzt: ${s.text}${stufeText(s) ? ` (${stufeText(s)})` : ''}.`, 'Klick: Werkstatt und Ausbau.');
  } else if (s.zustand === 'gesperrt') {
    zeilen.push(`Noch gesperrt: ${(s.hinweise ?? []).join(', ')}.`);
  } else {
    zeilen.push(`Klick: bauen für ${kostenText(BUILDING_DEFS[k.typeId]?.buildCost ?? {})}.`);
    const e = naechsterBau(state);
    if (e?.typeId === k.typeId && e.warum) zeilen.push(`Lohnt sich als Nächstes: ${e.warum}`);
  }
  return { titel: gebaeudeName(k.typeId), zeilen };
}

function escape(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function zeigeTipp(panel: HTMLElement, el: HTMLElement, state: GameState): void {
  const tip = panel.querySelector('.pk-tip') as HTMLElement | null;
  const id = el.dataset.knoten;
  if (!tip || !id) return;
  const e = erklaerung(state, id);
  tip.innerHTML = `<b>${escape(e.titel)}</b>${e.zeilen.map(z => `<span>${escape(z)}</span>`).join('')}`;
  tip.hidden = false;
  // Unter die Karte, sonst darüber; immer ganz im Fenster
  const r = el.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const top = r.bottom + 8 + h <= window.innerHeight ? r.bottom + 8 : Math.max(8, r.top - h - 8);
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

function versteckeTipp(panel: HTMLElement): void {
  const tip = panel.querySelector('.pk-tip') as HTMLElement | null;
  if (tip) tip.hidden = true;
}

// ── Klicks ──────────────────────────────────────────────────────

/** Langes Drücken (Touch) zeigt die Erklärung statt zu öffnen. */
const LANG_DRUECKEN_MS = 450;

export function bindProduktionTab(panel: HTMLElement, state: GameState, cb: ProduktionCallbacks): void {
  let druckTimer: number | null = null;
  let klickSchlucken = false;
  const stopDruck = () => {
    if (druckTimer !== null) window.clearTimeout(druckTimer);
    druckTimer = null;
  };

  panel.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const el = (e.target as HTMLElement).closest('[data-knoten]') as HTMLElement | null;
    if (el && !el.contains(e.relatedTarget as Node | null)) zeigeTipp(panel, el, state);
  });
  panel.addEventListener('pointerout', (e) => {
    const el = (e.target as HTMLElement).closest('[data-knoten]') as HTMLElement | null;
    if (el && !el.contains(e.relatedTarget as Node | null)) versteckeTipp(panel);
  });
  panel.addEventListener('focusin', (e) => {
    const el = (e.target as HTMLElement).closest('[data-knoten]') as HTMLElement | null;
    if (el) zeigeTipp(panel, el, state);
  });
  panel.addEventListener('focusout', () => versteckeTipp(panel));
  panel.addEventListener('scroll', () => versteckeTipp(panel), true);

  panel.addEventListener('pointerdown', (e) => {
    // Ein neuer Druck beginnt: ein altes «Klick schlucken» gilt nicht mehr (nicht jeder Browser klickt nach langem Drücken)
    klickSchlucken = false;
    versteckeTipp(panel);
    if (e.pointerType !== 'touch') return;
    const el = (e.target as HTMLElement).closest('[data-knoten]') as HTMLElement | null;
    if (!el) return;
    stopDruck();
    druckTimer = window.setTimeout(() => {
      druckTimer = null;
      klickSchlucken = true;
      zeigeTipp(panel, el, state);
    }, LANG_DRUECKEN_MS);
  });
  panel.addEventListener('pointerup', stopDruck);
  panel.addEventListener('pointercancel', stopDruck);
  panel.addEventListener('contextmenu', (e) => {
    if ((e.target as HTMLElement).closest('[data-knoten]')) e.preventDefault();
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = (e.target as HTMLElement).closest('[data-knoten]') as HTMLElement | null;
    if (!el) return;
    e.preventDefault();
    el.click();
  });

  panel.addEventListener('click', (e) => {
    if (klickSchlucken) {
      klickSchlucken = false;
      return;
    }
    versteckeTipp(panel);
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
