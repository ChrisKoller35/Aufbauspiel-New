// ─── Magic City – Zenit, das Uhrwerk (aus Code gezeichnet) ──────
// Die Uhr im Kopf des Raid-Bildschirms, auf der Dungeon-Karte und in der Wiedergabe: Zifferblatt mit zwölf
// Strichen, zwei Zeiger, oben die Glocke, unten das Pendel, dahinter Zahnräder und Strahlen. Kein Bild, keine
// Kosten. Sie steht kurz vor zwölf, bis Zenit in dieser Woche besiegt ist, dann auf zwölf (am Montag zieht er
// sich wieder auf). In der Wiedergabe zeigt der grosse Zeiger nach unten auf die Spalte, die er drückt (A links
// bis F rechts, auf Stufe II bis I), der kleine auf die Stunde, und das Pendel schwingt zum Trupp, den es trifft;
// Glocke und Funken leuchten über die Klassen .zu-glocke und .zu-funken. Auf Stufe II («Zenit, aufgezogen») läuft
// ein dritter, dünner Zeiger mit: der Gegenzeiger (.zu-gegen), rückwärts; kurz vor dreizehn stehen beide
// spiegelbildlich vor der Zwölf. Regeln: docs/RAID.md.
// ────────────────────────────────────────────────────────────────

import type { RaidDef } from '../../data/raids';

export interface UhrStellung {
  /** Grosser Zeiger in Grad, 0 = zwölf, im Uhrzeigersinn */
  minute: number;
  /** Kleiner Zeiger in Grad */
  stunde: number;
  /** Pendel in Grad: positiv schwingt es nach links, negativ nach rechts */
  pendel: number;
  /** Die Glocke leuchtet (sie schlägt in dieser Runde) */
  glocke?: boolean;
  /** Funken springen (diese Runde) */
  funken?: boolean;
  /** Stufe II: der Gegenzeiger in Grad (ohne: kein Gegenzeiger) */
  gegen?: number;
}

/** Solange Zenit steht: kurz vor zwölf, das Pendel links */
export const KURZ_VOR_ZWOELF: UhrStellung = { minute: -32, stunde: -4, pendel: 16, funken: true };
/** Diese Woche besiegt: beide Zeiger auf zwölf, das Pendel steht */
export const AUF_ZWOELF: UhrStellung = { minute: 0, stunde: 0, pendel: 0 };
/** Stufe II, solange Zenit steht: Zeiger und Gegenzeiger spiegelbildlich kurz vor zwölf, der kleine kurz vor eins */
export const KURZ_VOR_DREIZEHN: UhrStellung = { minute: -32, gegen: 32, stunde: 24, pendel: -16, funken: true };
/** Stufe II, diese Woche angehalten: beide langen Zeiger auf zwölf, der kleine zwischen zwölf und eins */
export const ANGEHALTEN: UhrStellung = { minute: 0, gegen: 0, stunde: 15, pendel: 0 };

/**
 * Die Uhr einer Stufe im Kopf des Raid-Bildschirms und am Knoten der Karte: kurz vor zwölf, diese Woche besiegt auf
 * zwölf; mit Gegenzeiger kurz vor dreizehn und angehalten
 */
export function uhrStellungFuer(def: RaidDef, besiegt: boolean): UhrStellung {
  if (def.regeln.gegenzeiger !== undefined) return besiegt ? ANGEHALTEN : KURZ_VOR_DREIZEHN;
  return besiegt ? AUF_ZWOELF : KURZ_VOR_ZWOELF;
}

/** Grosser Zeiger auf eine Spalte: nach unten, Spalte 0 links unten bis zur letzten rechts unten */
export function zeigerAufSpalte(spalte: number, spalten = 6): number {
  const breite = 100;
  return 180 + breite / 2 - (spalten <= 1 ? breite / 2 : (spalte * breite) / (spalten - 1));
}

/** Pendel auf einen Trupp: ganz links 18 Grad, ganz rechts −18, dazwischen gleichmässig (bei drei Trupps die Mitte gerade) */
export function pendelAufTrupp(trupp: number, truppZahl: number): number {
  return truppZahl <= 1 ? 0 : 18 - (36 * trupp) / (truppZahl - 1);
}

/** Kleiner Zeiger auf die Stunde (Runde 12 = zwölf) */
export function stundeAufRunde(runde: number): number {
  return (runde % 12) * 30;
}

const f = (n: number): string => n.toFixed(1);

function zahnrad(cx: number, cy: number, r: number, zaehne: number, dreh: number): string {
  const punkte: string[] = [];
  for (let i = 0; i < zaehne; i++) {
    const a = (i / zaehne) * Math.PI * 2 + dreh;
    const b = Math.PI / zaehne;
    for (const [w, rr] of [[a - b * 0.55, r], [a - b * 0.3, r + 5], [a + b * 0.3, r + 5], [a + b * 0.55, r]]) {
      punkte.push(`${f(cx + Math.cos(w) * rr)},${f(cy + Math.sin(w) * rr)}`);
    }
  }
  return `<polygon points="${punkte.join(' ')}"/><circle cx="${cx}" cy="${cy}" r="${f(r * 0.42)}" fill="#0a0f22"/>`;
}

/** Ein Funkel-Stern */
export function stern(x: number, y: number, s: number, farbe: string, deckkraft = 1): string {
  return `<path d="M${x} ${y - s}L${f(x + s * 0.28)} ${f(y - s * 0.28)}L${x + s} ${y}L${f(x + s * 0.28)} ${f(y + s * 0.28)}`
    + `L${x} ${y + s}L${f(x - s * 0.28)} ${f(y + s * 0.28)}L${x - s} ${y}L${f(x - s * 0.28)} ${f(y - s * 0.28)}Z" fill="${farbe}" opacity="${deckkraft}"/>`;
}

/**
 * Die Uhr als SVG. `id` macht die Verläufe eindeutig (mehrere Uhren auf einer Seite: Kopf und Wiedergabe),
 * `label` liest eine Vorlesehilfe vor, `attribute` kommen ins svg-Tag (Lage und Grösse in der Karte).
 */
export function zenitUhrSvg(stellung: UhrStellung, id: string, label: string, attribute = ''): string {
  let strahlen = '';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r2 = i % 2 ? 88 : 98;
    strahlen += `<path d="M${f(100 + Math.cos(a) * 74)} ${f(100 + Math.sin(a) * 74)}L${f(100 + Math.cos(a) * r2)} ${f(100 + Math.sin(a) * r2)}"/>`;
  }
  let striche = '';
  for (let i = 1; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const gross = i % 3 === 0;
    const r1 = gross ? 43 : 47;
    striche += `<path d="M${f(100 + Math.cos(a) * r1)} ${f(100 + Math.sin(a) * r1)}L${f(100 + Math.cos(a) * 53)} ${f(100 + Math.sin(a) * 53)}" stroke-width="${gross ? 3 : 1.6}"/>`;
  }
  const g = (name: string): string => `${id}-${name}`;
  const glocke = stellung.glocke
    ? `<g class="zu-glocke"><circle cx="100" cy="17" r="26" fill="url(#${g('glockenschein')})"/></g>` : '';
  const funken = stellung.funken
    ? `<g class="zu-funken">${stern(166, 30, 8, '#f08a24')}${stern(181, 52, 4.5, '#fdba74', 0.9)}`
      + `${stern(28, 132, 5.5, '#f08a24', 0.9)}${stern(18, 110, 3, '#fdba74', 0.8)}</g>`
    : '';
  return `<svg viewBox="0 -6 200 246" role="img" aria-label="${label}"${attribute ? ` ${attribute}` : ''}>
  <defs>
    <radialGradient id="${g('schein')}" cx="50%" cy="42%" r="56%"><stop offset="0" stop-color="#fde68a" stop-opacity=".42"/><stop offset=".45" stop-color="#fbbf24" stop-opacity=".13"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient>
    <radialGradient id="${g('glockenschein')}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fde68a" stop-opacity=".9"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>
    <radialGradient id="${g('blatt')}" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="#2a3a70"/><stop offset=".65" stop-color="#121a42"/><stop offset="1" stop-color="#070a18"/></radialGradient>
    <linearGradient id="${g('gold')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8e3a0"/><stop offset=".45" stop-color="#d4ae35"/><stop offset="1" stop-color="#7a5c08"/></linearGradient>
    <linearGradient id="${g('gold2')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe9b0"/><stop offset="1" stop-color="#b38b18"/></linearGradient>
    <radialGradient id="${g('bob')}" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#fff1c2"/><stop offset=".5" stop-color="#d4ae35"/><stop offset="1" stop-color="#5c4710"/></radialGradient>
  </defs>
  <circle cx="100" cy="104" r="104" fill="url(#${g('schein')})"/>
  <g stroke="#f3d27a" stroke-opacity=".16" stroke-width="2.2" stroke-linecap="round">${strahlen}</g>
  <g fill="#3a2c12" stroke="#8a6d16" stroke-width="1.4">${zahnrad(44, 66, 24, 10, 0.2)}${zahnrad(160, 140, 19, 9, 0.5)}${zahnrad(152, 58, 12, 7, 0.1)}</g>
  <path d="M42 214 Q100 252 158 214" fill="none" stroke="#dc2626" stroke-opacity=".5" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/>
  <g class="zu-pendel" transform="rotate(${stellung.pendel} 100 100)">
    <path d="M97.6 140 L97.6 205 L102.4 205 L102.4 140Z" fill="url(#${g('gold2')})" stroke="#5c4710" stroke-width=".8"/>
    <circle cx="100" cy="214" r="15" fill="url(#${g('bob')})" stroke="#dc2626" stroke-width="2.4"/>
    <circle cx="100" cy="214" r="6.5" fill="none" stroke="#7a5c08" stroke-width="1.4"/>
  </g>
  ${glocke}
  <path d="M100 37 L100 27" stroke="#c8a227" stroke-width="3"/>
  <path d="M100 2c-8.5 0-13 6.5-13 14.5v6.5l-4 5.5h34l-4-5.5v-6.5C113 8.5 108.5 2 100 2z" fill="url(#${g('gold')})" stroke="#5c4710" stroke-width="1.2"/>
  <circle cx="100" cy="31.5" r="3.3" fill="#e6c060" stroke="#5c4710" stroke-width="1"/>
  <circle cx="100" cy="100" r="63" fill="url(#${g('blatt')})" stroke="url(#${g('gold')})" stroke-width="7"/>
  <circle cx="100" cy="100" r="56" fill="none" stroke="#6e5710" stroke-width="1.3"/>
  <circle cx="100" cy="100" r="31" fill="none" stroke="#c8a227" stroke-opacity=".18" stroke-width="1"/>
  <g stroke="#e6c060" stroke-linecap="round">${striche}</g>
  <text x="100" y="64" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="17" fill="#f3d27a">XII</text>
  <g class="zu-minute" transform="rotate(${stellung.minute} 100 100)"><path d="M100 105 L100 53" stroke="#f3d27a" stroke-width="3" stroke-linecap="round"/><path d="M100 47 L104 55 L100 60 L96 55Z" fill="#f3d27a"/></g>
  ${stellung.gegen === undefined ? '' : `<g class="zu-gegen" transform="rotate(${stellung.gegen} 100 100)"><path d="M100 112 L100 50" stroke="#5eead4" stroke-width="1.8" stroke-linecap="round"/><path d="M100 44 L103 51 L97 51Z" fill="#5eead4"/><circle cx="100" cy="114" r="3" fill="#5eead4"/></g>`}
  <g class="zu-stunde" transform="rotate(${stellung.stunde} 100 100)"><path d="M100 107 L100 79" stroke="#c8a227" stroke-width="5.5" stroke-linecap="round"/><path d="M100 70 L106 79 L100 84 L94 79Z" fill="#c8a227"/></g>
  <circle cx="100" cy="100" r="6.5" fill="url(#${g('gold')})" stroke="#3a2c12" stroke-width="1.2"/>
  ${funken}
</svg>`;
}
