// ─── Magic City – Linien und Grösse der Mindmap ─────────────────
// Verbindungslinien des Reiters «Stadt» als SVG aus den echten
// Kartenpositionen (gold, wenn beide Seiten stehen), und die Anpassung
// an die Breite: normal, verkleinert (Linien bleiben) oder Raster ohne
// Linien (Handy). Daten: data/produktionsnetz.ts; Aufruf: ProduktionTab.ts.
// ────────────────────────────────────────────────────────────────

import { NETZ_KANTEN, NetzKnoten, netzKnoten } from '../../data/produktionsnetz';
import { GameState } from '../../models/GameState';
import { getBuiltTypeIds } from '../../systems/GebaeudeStatus';
import { vorhanden } from './MindmapTexte';

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
  // Nebeneinander in derselben Reihe, nach rechts oder nach links (Arkanschmiede → Kriegsmaschinen)
  const nachRechts = nach.x >= von.x + von.w - 2;
  if (nachRechts || von.x >= nach.x + nach.w - 2) {
    const sx = nachRechts ? von.x + von.w : von.x;
    const ex = nachRechts ? nach.x - 1 : nach.x + nach.w + 1;
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
    const breit = (k: NetzKnoten | undefined) => !!(k && k.art !== 'ziel' && k.breit);
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
