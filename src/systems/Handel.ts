// ─── Magic City – Handel am Marktplatz ──────────────────────────
// Waren gegen Gold in Bündeln (data/handel.ts). Der Marktplatz handelt
// pro Tag höchstens buendelProTag(besetzte Plätze) Bündel, Kauf und
// Verkauf zusammen. Den Zähler trägt das Gebäude selbst (handelTag,
// handelBuendel); ist state.day weiter, beginnt er wieder bei 0, darum
// braucht der Tageswechsel nichts zu tun. Brot für die Bewohner
// (3 Tage, Werkstattplan.ts) verkauft der Markt nicht.
// Reine Funktionen; Anzeige: BuildingsScreen. Regeln: docs/HANDEL.md.
// ────────────────────────────────────────────────────────────────

import { BUENDEL, HANDELSWAREN, VERKAUFSPREIS, buendelProTag, kaufpreis } from '../data/handel';
import { RECIPE_DEFS } from '../data/recipes';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { wirkungsStufe } from './Ausbau';
import { vorratZiel } from './Werkstattplan';

export type HandelsArt = 'kaufen' | 'verkaufen';

export interface HandelsPruefung {
  ok: boolean;
  /** Warum es nicht geht (leer, wenn ok). */
  grund: string;
}

/**
 * Was die Stadt selbst verbraucht und der Markt darum nicht verkauft, mit Grund.
 * Nur Brot: Verkauftes Bewohner-Brot backt die Bäckerei erst nach, und bis dahin hungert
 * die Stadt (36 Bewohner, 30 Tage: 5 Hungertage statt 0 bis 1). Getreide und Mehl brauchen keinen
 * Schutz: Die Farm macht mehr, als die Brotkette braucht, und Mehl mahlt die Mühle erst auf
 * Bedarf (so viele Hungertage wie ohne Verkauf; Simulation in docs/HANDEL.md).
 */
const VORBEHALT: Record<string, { menge: (state: GameState) => number; grund: string }> = {
  bread: { menge: state => vorratZiel(state, 'BAKERY'), grund: 'Das Brot brauchen die Bewohner.' },
};

/** Der fertig gebaute Marktplatz der Stadt oder null. */
export function marktplatz(state: GameState): BuildingInstance | null {
  return state.buildings.find(b => b && b.typeId === 'MARKETPLACE' && b.built) ?? null;
}

/** Bündel, die heute schon gehandelt wurden. */
export function gehandeltHeute(state: GameState): number {
  const markt = marktplatz(state);
  if (!markt || markt.handelTag !== state.day) return 0;
  return Math.max(0, markt.handelBuendel ?? 0);
}

/** Bündel pro Tag nach besetzten Plätzen (0 ohne Arbeiter oder Marktplatz). */
export function tagesmenge(state: GameState): number {
  return buendelProTag(wirkungsStufe(state, 'MARKETPLACE'));
}

/** Bündel, die heute noch gehandelt werden dürfen. */
export function handelHeute(state: GameState): number {
  return Math.max(0, tagesmenge(state) - gehandeltHeute(state));
}

/** Grund, warum der Marktplatz gar nicht handelt, oder leer. */
export function marktGesperrt(state: GameState): string {
  const markt = marktplatz(state);
  if (!markt) return 'Erst einen Marktplatz bauen.';
  if (!markt.connected) return 'Marktplatz ist nicht verbunden.';
  if (tagesmenge(state) <= 0) return 'Handel erst mit einem Arbeiter.';
  return '';
}

/** Grund, warum heute keine Ware mehr geht (gesperrt oder Tagesmenge aufgebraucht), oder leer. */
export function handelZu(state: GameState): string {
  const gesperrt = marktGesperrt(state);
  if (gesperrt) return gesperrt;
  return handelHeute(state) <= 0 ? 'Heute keine Bündel mehr, morgen wieder.' : '';
}

/** So viel einer Ware braucht die Stadt selbst; der Markt verkauft nur, was darüber liegt (Brot: 3 Tage). */
export function vorbehalten(state: GameState, ware: string): number {
  return VORBEHALT[ware]?.menge(state) ?? 0;
}

export function kannHandeln(state: GameState, ware: string, art: HandelsArt): HandelsPruefung {
  const nein = (grund: string): HandelsPruefung => ({ ok: false, grund });
  // includes statt «ware in VERKAUFSPREIS»: «toString» oder «constructor» sind keine Waren
  if (!HANDELSWAREN.includes(ware)) return nein('Diese Ware handelt der Markt nicht.');
  const zu = handelZu(state);
  if (zu) return nein(zu);
  // «!(x >= n)» statt «x < n»: Ein kaputter Vorrat (NaN) sperrt, statt Gold oder Ware zu verschenken
  if (art === 'verkaufen') {
    const lager = state.globalStock[ware] ?? 0;
    if (!(lager >= BUENDEL)) return nein(`Zu wenig im Lager (braucht ${BUENDEL}).`);
    if (!(lager - BUENDEL >= vorbehalten(state, ware))) return nein(VORBEHALT[ware].grund);
  } else if (!((state.globalStock.gold ?? 0) >= kaufpreis(ware))) {
    return nein(`Zu wenig Gold (braucht ${kaufpreis(ware)}).`);
  }
  return { ok: true, grund: '' };
}

/** Kauft oder verkauft ein Bündel. Bucht Ware, Gold und Tageszähler; nichts wird negativ. */
export function handle(state: GameState, ware: string, art: HandelsArt): HandelsPruefung {
  const pruefung = kannHandeln(state, ware, art);
  if (!pruefung.ok) return pruefung;
  const markt = marktplatz(state)!;
  const stock = state.globalStock;
  if (art === 'verkaufen') {
    stock[ware] = (stock[ware] ?? 0) - BUENDEL;
    stock.gold = (stock.gold ?? 0) + VERKAUFSPREIS[ware];
  } else {
    stock.gold = (stock.gold ?? 0) - kaufpreis(ware);
    stock[ware] = (stock[ware] ?? 0) + BUENDEL;
  }
  markt.handelBuendel = gehandeltHeute(state) + 1;
  markt.handelTag = state.day;
  return pruefung;
}

/**
 * Gold je Stück, das eine Ware über den Markt mindestens kostet: selbst kaufen, oder ihre Zutaten
 * kaufen und verarbeiten (Rezepte mit Zutaten, über alle Stufen; Brot aus gekauftem Getreide).
 * Infinity, wenn eine Zutat nur aus Dungeons kommt. Jedes Rezept macht genau eine Ware, sonst müsste
 * hier ein Nebenprodukt mitzählen (tests/handel.test.ts prüft das). Daran hängen zwei Regeln:
 * Keine Ware lässt sich so billiger beschaffen, als der Markt für sie zahlt (keine Kette bringt
 * Gewinn, tests/handel.test.ts), und das Gold einer Lieferung am Auftragsbrett (Auftragsbrett.ts).
 */
export function marktKosten(ware: string, unterwegs: ReadonlySet<string> = new Set()): number {
  let billigste = HANDELSWAREN.includes(ware) ? kaufpreis(ware) / BUENDEL : Infinity;
  if (unterwegs.has(ware)) return billigste;
  const weiter = new Set(unterwegs).add(ware);
  for (const r of Object.values(RECIPE_DEFS)) {
    const stueck = r.outputs[ware] ?? 0;
    if (stueck <= 0 || Object.keys(r.inputs).length === 0) continue;
    const zutaten = Object.entries(r.inputs).reduce((s, [z, n]) => s + n * marktKosten(z, weiter), 0);
    billigste = Math.min(billigste, zutaten / stueck);
  }
  return billigste;
}
