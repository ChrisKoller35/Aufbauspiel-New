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
  getGebaeudeStatus, gebaeudeName, itemName, getBuiltTypeIds, dasGebaeude, GebaeudeStatus, kostenText, grundText,
} from '../../systems/GebaeudeStatus';
import { naechsterBau } from '../../systems/Empfehlung';
import { BUILDING_DEFS } from '../../data/buildings';
import { engpaesseDerStadt } from '../../systems/EngpassSystem';
import { maxStufe, kannAusbauen, stufeVon, besetzt, arbeitsplaetze } from '../../systems/Ausbau';
import { BROT_VORRAT_TAGE } from '../../systems/Werkstattplan';
import {
  tagesBilanz, reichtTageFuer, TagesBilanz, BilanzPosten, VorratBilanz, VorratEngpass,
} from '../../systems/Tagesbilanz';
import '../html/tagesbilanz.css';

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

function chips(state: GameState, bilanz: TagesBilanz): string {
  return LAGER_CHIPS.map(item => {
    const zahl = bilanzZahl(bilanz.waren[item]?.bilanz ?? 0);
    const klein = zahl ? ` <small class="tb-klein${zahl.startsWith('−') ? ' minus' : ''}">${zahl}</small>` : '';
    return `<span class="pk-chip" data-item="${item}"><b>${Math.floor(state.globalStock[item] ?? 0)}</b> ${itemName(item)}${klein}</span>`;
  }).join('');
}

// ── Tagesbilanz (systems/Tagesbilanz.ts) ────────────────────────

/** Zeichen der Waren; Gold wie in der Kopfzeile (Münze), Kraft-Brot nicht wie Brot. */
export const WAREN_SYMBOL: Record<string, string> = {
  gold: '🪙', wood: '🪵', stone: '🪨', grain: '🌾', flour: '🫓', bread: '🍞', power_bread: '🥖',
  iron_scrap: '⚙️', crystal_shard: '💎', herb_green: '🌿', healing_potion: '⚗️',
};

/** «+12», «−1,4» (eine Nachkommastelle, plus und minus gleich gerundet), leer bei 0. */
export function bilanzZahl(n: number): string {
  const r = Math.sign(n) * Math.round(Math.abs(n) * 10) / 10;
  if (!r) return '';
  return `${r > 0 ? '+' : '−'}${String(Math.abs(r)).replace('.', ',')}`;
}

/** «reicht 3 Tage», «reicht 1 Tag», «reicht keinen Tag», bei leerem Lager «leer». */
export function reichtText(vorrat: number, tage: number): string {
  if (vorrat < 1) return 'leer';
  if (tage <= 0) return 'reicht keinen Tag';
  return `reicht ${tage} ${tage === 1 ? 'Tag' : 'Tage'}`;
}

/** Waren in fester Reihenfolge: Gold, die Vorräte des Lagers, dann der Rest. */
function bilanzWaren(bilanz: TagesBilanz): string[] {
  const rest = Object.keys(bilanz.waren).filter(i => !LAGER_CHIPS.includes(i)).sort();
  return ['gold', ...LAGER_CHIPS.filter(i => bilanz.waren[i]), ...rest];
}

function bilanzWert(bilanz: TagesBilanz, item: string): number {
  return item === 'gold' ? bilanz.gold.gesamt : bilanz.waren[item]?.bilanz ?? 0;
}

function warenName(item: string): string {
  return item === 'gold' ? 'Gold' : itemName(item);
}

/** «reicht …» einer Ware oder leer, wenn ihre Bilanz nicht negativ ist. */
function reichtFuer(state: GameState, bilanz: TagesBilanz, item: string): string {
  const tage = item === 'gold' ? null : reichtTageFuer(state, bilanz, item);
  return tage === null ? '' : reichtText(state.globalStock[item] ?? 0, tage);
}

/** Ein Chip der Zeile «Pro Tag:» (dieselben Daten zeichnen und nachführen ihn). */
export interface BilanzChip {
  item: string;
  minus: boolean;
  /** Inhalt als HTML: Zeichen, Zahl und klein «reicht …». */
  inhalt: string;
  /** Für Screenreader, mit Zahl: «Brot pro Tag: −1,9, reicht 3 Tage». */
  label: string;
}

/** Chips der Zeile «Pro Tag:»: je Ware, deren Bilanz gerundet nicht 0 ist, Gold zuerst. */
export function bilanzChips(state: GameState, bilanz: TagesBilanz): BilanzChip[] {
  const liste: BilanzChip[] = [];
  for (const item of bilanzWaren(bilanz)) {
    const wert = bilanzWert(bilanz, item);
    const zahl = bilanzZahl(wert);
    if (!zahl) continue;
    const reicht = reichtFuer(state, bilanz, item);
    liste.push({
      item, minus: wert < 0,
      inhalt: `${WAREN_SYMBOL[item] ?? itemName(item)} ${zahl}${reicht ? ` <small>· ${reicht}</small>` : ''}`,
      label: `${warenName(item)} pro Tag: ${zahl}${reicht ? `, ${reicht}` : ''}`,
    });
  }
  return liste;
}

function chipKlasse(c: BilanzChip): string {
  return `tb-chip${c.minus ? ' minus' : ''}`;
}

const LEER_HTML = '<span class="tb-leer">noch nichts</span>';

/** Zeile «Pro Tag:» mit einem Chip je Ware, deren Bilanz nicht 0 ist. */
export function bilanzZeileHTML(state: GameState, bilanz: TagesBilanz): string {
  const chipsHTML = bilanzChips(state, bilanz).map(c =>
    `<span class="${chipKlasse(c)}" data-bilanz="${c.item}" tabindex="0" role="img" aria-label="${c.label}">${c.inhalt}</span>`).join('');
  return `<b class="tb-titel">Pro Tag:</b>${chipsHTML || LEER_HTML}`;
}

/** «(Stufe 2)», bei fehlenden Arbeitern «(Stufe 3, 1/3 Arbeiter)». */
function stufeUndArbeiter(state: GameState, typeId: string): string {
  const b = dasGebaeude(state, typeId);
  if (!b) return '';
  const fehlen = besetzt(b) < arbeitsplaetze(b) ? `, ${besetzt(b)}/${arbeitsplaetze(b)} Arbeiter` : '';
  return ` (Stufe ${stufeVon(b)}${fehlen})`;
}

/** Woran es liegt, dass der Vorrat nicht reicht, in einem Satz. */
function engpassSatz(state: GameState, v: VorratBilanz, e: VorratEngpass): string {
  if (e.art === 'zutat') return `Engpass: ${itemName(e.item)} fehlt im Lager.`;
  const name = gebaeudeName(e.typeId);
  if (e.art === 'fehlt') return `Engpass: ${name} fehlt.`;
  if (e.art === 'steht') return `Engpass: ${name} steht (${grundText(e.grund)}).`;
  const zahl = bilanzZahl(v.hoechstens).replace('+', '') || '0';
  const was = e.zutat ? `${itemName(e.zutat)} für ${zahl} ${itemName(v.item)}` : `${zahl} ${itemName(v.item)}`;
  return `Engpass: ${name}${stufeUndArbeiter(state, e.typeId)} schafft nur ${was} am Tag.`;
}

/** Sätze zu einem Vorrat von selbst: wer ihn hält und, wenn er nicht reicht, der Engpass. */
function vorratSaetze(state: GameState, v: VorratBilanz): string[] {
  const satz = v.item === 'bread'
    ? `Brot für die Bewohner backt die ${gebaeudeName(v.typeId)} von selbst, bis es für ${BROT_VORRAT_TAGE} Tage reicht.`
    : `${gebaeudeName(v.typeId)} hält ${itemName(v.item)} von selbst für ${BROT_VORRAT_TAGE} Tage vorrätig.`;
  return v.engpass ? [satz, engpassSatz(state, v, v.engpass)] : [satz];
}

/** Erklärung zu einem Chip der Tagesbilanz: die Posten (erst was entsteht), Vorrat und Engpass, «reicht». */
export function bilanzTipp(state: GameState, item: string): { titel: string; zeilen: string[] } {
  const bilanz = tagesBilanz(state);
  const posten: BilanzPosten[] = item === 'gold'
    ? [{ quelle: 'Steuern', menge: bilanz.gold.steuern }, { quelle: 'Bank', menge: bilanz.gold.bank }]
    : bilanz.waren[item]?.posten ?? [];
  const sortiert = [...posten.filter(p => p.menge > 0), ...posten.filter(p => p.menge < 0)];
  const zeilen = sortiert.filter(p => bilanzZahl(p.menge)).map(p => `${p.quelle} ${bilanzZahl(p.menge)}`);
  const vorrat = bilanz.vorraete.find(v => v.item === item);
  if (vorrat) zeilen.push(...vorratSaetze(state, vorrat));
  const reicht = reichtFuer(state, bilanz, item);
  if (reicht) {
    const lager = Math.floor(state.globalStock[item] ?? 0);
    zeilen.push(lager < 1 ? 'Das Lager ist leer.' : `Im Lager ${lager}, ${reicht}.`);
  }
  return { titel: `${warenName(item)} pro Tag: ${bilanzZahl(bilanzWert(bilanz, item)) || '0'}`, zeilen };
}

function kartenKlasse(s: GebaeudeStatus, lager: boolean, empfohlen: boolean): string {
  return `pk-karte${lager ? ' pk-lager' : ''} z-${s.zustand}${empfohlen ? ' empfohlen' : ''}`;
}

function fluss(id: string): string {
  const text = flussText(id);
  return text ? `<div class="pk-fluss">${text}</div>` : '';
}

function gebaeudeKarte(
  state: GameState, typeId: string, bild: Bild, breit: boolean, empfohlen: string | null, bilanz: TagesBilanz,
): string {
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
        <div class="pk-chips">${chips(state, bilanz)}</div>
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

function knotenHTML(state: GameState, k: NetzKnoten, bild: Bild, empfohlen: string | null, bilanz: TagesBilanz): string {
  if (k.art === 'gebaeude') return gebaeudeKarte(state, k.typeId, bild, !!k.breit, empfohlen, bilanz);
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
  const bilanz = tagesBilanz(state);
  const reihen = NETZ_REIHEN.map(r => `
    <section class="pk-reihe" data-reihe="${r.id}">
      <div class="pk-kopf"><h3>${r.titel}</h3><small>${r.untertitel}</small></div>
      <div class="pk-row">${r.knoten.map(k => knotenHTML(state, k, bild, empfohlen, bilanz)).join('')}</div>
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
        <div class="tb-zeile">${bilanzZeileHTML(state, bilanz)}</div>
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
  // Nebeneinander in derselben Reihe, nach rechts oder nach links (Brunnen → Kräutergarten, Mühle → Bäckerei)
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

function aktualisiereKarte(
  karte: HTMLElement, s: GebaeudeStatus, state: GameState, empfohlen: string | null, bilanz: TagesBilanz,
): void {
  const lager = karte.classList.contains('pk-lager');
  const cls = kartenKlasse(s, lager, !lager && empfohlen === s.typeId);
  if (karte.className !== cls) karte.className = cls;
  setText(karte.querySelector('.pk-st'), s.text);
  if (lager) {
    const chipsEl = karte.querySelector('.pk-chips');
    const neu = chips(state, bilanz);
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
  const bilanz = tagesBilanz(state);
  panel.querySelectorAll<HTMLElement>('.pk-karte[data-type-id]').forEach(karte => {
    aktualisiereKarte(karte, getGebaeudeStatus(state, karte.dataset.typeId!), state, empfohlen, bilanz);
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
  const zeile = panel.querySelector('.tb-zeile') as HTMLElement | null;
  if (zeile) aktualisiereBilanzZeile(zeile, bilanzChips(state, bilanz));
  frischeTippAuf(panel, state);
  zeichneKanten(panel, state);
}

/** Hat das Element den Fokus von der Tastatur (nicht von einem Klick)? Alte Browser ohne :focus-visible: ja. */
function mitTastatur(el: HTMLElement): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

/**
 * Zeile «Pro Tag:» an Ort und Stelle nachführen: Ein Chip bleibt dasselbe Element, solange seine
 * Ware eine Bilanz hat, so behält er den Tastatur-Fokus. Neue Chips kommen an ihren festen Platz
 * (Reihenfolge wie bilanzWaren), darum muss kein bestehender Chip wandern.
 */
function aktualisiereBilanzZeile(zeile: HTMLElement, soll: BilanzChip[]): void {
  const da = new Map<string, HTMLElement>();
  zeile.querySelectorAll<HTMLElement>('.tb-chip[data-bilanz]').forEach(el => da.set(el.dataset.bilanz!, el));
  const bleibt = new Set(soll.map(c => c.item));

  // Fällt der Chip mit Tastatur-Fokus weg, geht der Fokus zum Nachbarn statt an den Seitenanfang
  const fokus = document.activeElement as HTMLElement | null;
  let fokusNach: HTMLElement | null = null;
  const weg = fokus?.dataset.bilanz;
  if (fokus && weg && da.get(weg) === fokus && !bleibt.has(weg) && mitTastatur(fokus)) {
    const reihe = [...da.values()];
    const i = reihe.indexOf(fokus);
    fokusNach = [...reihe.slice(i + 1), ...reihe.slice(0, i).reverse()].find(el => bleibt.has(el.dataset.bilanz!)) ?? null;
  }
  for (const [item, el] of da) {
    if (bleibt.has(item)) continue;
    el.remove();
    da.delete(item);
  }

  const leer = zeile.querySelector('.tb-leer');
  if (soll.length > 0) leer?.remove();
  else if (!leer) zeile.insertAdjacentHTML('beforeend', LEER_HTML);

  // Von hinten: ein neuer Chip kommt vor seinen Nachfolger
  let danach: HTMLElement | null = null;
  for (let i = soll.length - 1; i >= 0; i--) {
    const c = soll[i];
    let el = da.get(c.item);
    if (!el) {
      el = document.createElement('span');
      el.dataset.bilanz = c.item;
      el.tabIndex = 0;
      el.setAttribute('role', 'img');
      zeile.insertBefore(el, danach);
    }
    if (el.className !== chipKlasse(c)) el.className = chipKlasse(c);
    if (el.getAttribute('aria-label') !== c.label) el.setAttribute('aria-label', c.label);
    if (el.innerHTML !== c.inhalt) el.innerHTML = c.inhalt;
    danach = el;
  }
  if (fokusNach) fokusNach.focus();
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

/** Zu welchem Kasten die offene Erklärung gehört (je Reiter), damit sie mit den Zahlen mitgeht. */
const tippZiel = new WeakMap<HTMLElement, HTMLElement>();

function tippHTML(state: GameState, el: HTMLElement): string | null {
  const id = el.dataset.knoten;
  const ware = el.dataset.bilanz;
  if (!id && !ware) return null;
  const e = ware ? bilanzTipp(state, ware) : erklaerung(state, id!);
  return `<b>${escape(e.titel)}</b>${e.zeilen.map(z => `<span>${escape(z)}</span>`).join('')}`;
}

/** Unter den Kasten, sonst darüber; immer ganz im Fenster. */
function legeTipp(tip: HTMLElement, el: HTMLElement): void {
  const r = el.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const top = r.bottom + 8 + h <= window.innerHeight ? r.bottom + 8 : Math.max(8, r.top - h - 8);
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

function zeigeTipp(panel: HTMLElement, el: HTMLElement, state: GameState): void {
  const tip = panel.querySelector('.pk-tip') as HTMLElement | null;
  const html = tippHTML(state, el);
  if (!tip || html === null) return;
  tip.innerHTML = html;
  tip.hidden = false;
  tippZiel.set(panel, el);
  legeTipp(tip, el);
}

function versteckeTipp(panel: HTMLElement): void {
  const tip = panel.querySelector('.pk-tip') as HTMLElement | null;
  if (tip) tip.hidden = true;
  tippZiel.delete(panel);
}

/**
 * Offene Erklärung mit den neuen Zahlen auffrischen (Chips und Karten bleiben stehen, es kommt
 * also kein neues «Maus darüber»). Ist ihr Kasten verschwunden, verschwindet sie auch.
 */
function frischeTippAuf(panel: HTMLElement, state: GameState): void {
  const tip = panel.querySelector('.pk-tip') as HTMLElement | null;
  const el = tippZiel.get(panel);
  if (!tip || !el || tip.hidden) return;
  const html = el.isConnected && panel.contains(el) ? tippHTML(state, el) : null;
  if (html === null) {
    versteckeTipp(panel);
    return;
  }
  if (tip.innerHTML === html) return;
  tip.innerHTML = html;
  legeTipp(tip, el);
}

// ── Klicks ──────────────────────────────────────────────────────

/** Kästen mit Erklärung: Karten der Mindmap und Chips der Tagesbilanz. */
const TIPP_ZIEL = '[data-knoten], [data-bilanz]';

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
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
    if (el && !el.contains(e.relatedTarget as Node | null)) zeigeTipp(panel, el, state);
  });
  panel.addEventListener('pointerout', (e) => {
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
    if (el && !el.contains(e.relatedTarget as Node | null)) versteckeTipp(panel);
  });
  panel.addEventListener('focusin', (e) => {
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
    if (el) zeigeTipp(panel, el, state);
  });
  panel.addEventListener('focusout', () => versteckeTipp(panel));
  panel.addEventListener('scroll', () => versteckeTipp(panel), true);

  panel.addEventListener('pointerdown', (e) => {
    // Ein neuer Druck beginnt: ein altes «Klick schlucken» gilt nicht mehr (nicht jeder Browser klickt nach langem Drücken)
    klickSchlucken = false;
    versteckeTipp(panel);
    if (e.pointerType !== 'touch') return;
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
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
    if ((e.target as HTMLElement).closest(TIPP_ZIEL)) e.preventDefault();
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
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
