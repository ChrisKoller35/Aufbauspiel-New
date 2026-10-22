// ─── Magic City – Beim Händler kaufen und verkaufen ─────────────
// Zustandslogik auf dem Spielstand: Waren und Baupläne kaufen (Preis
// mit Rabatt der Stadtstufe, data/haendler.ts), Beute verkaufen (halber
// Grundwert). Jede Funktion gibt zurück, ob es geklappt hat, und einen
// Satz in Spielersprache, den das Händler-Fenster (ui/screens/
// HaendlerFenster.ts) nur noch anzeigt. Käufe zählen in
// statistics.total_haendler_kaeufe (Erfolg «Erster Kauf»). Regeln und Zahlen: docs/GILDENSTADT.md.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { ankaufpreis, bauplanPreis, istAnkaufbar, kaufpreis } from '../data/haendler';
import { ITEM_DEFS } from '../data/items';
import { stadtStufeVon } from '../data/stadtstufen';
import { GameState } from '../models/GameState';

export interface HaendlerErgebnis {
  ok: boolean;
  /** Ein Satz für das Fenster: was gekauft oder verkauft wurde, oder warum nicht. */
  text: string;
}

function name(itemId: string): string {
  return ITEM_DEFS[itemId]?.name ?? itemId;
}

function gold(state: GameState): number {
  return state.globalStock.gold ?? 0;
}

function bezahle(state: GameState, preis: number): void {
  state.globalStock.gold = gold(state) - preis;
}

function ganzeMenge(menge: number): boolean {
  return Number.isInteger(menge) && menge >= 1;
}

/** Jeder Kauf (Ware oder Bauplan) zählt für den Erfolg «Erster Kauf» (data/achievements.ts). */
function zaehleKauf(state: GameState): void {
  const stats = state.statistics ?? (state.statistics = {});
  stats.total_haendler_kaeufe = (stats.total_haendler_kaeufe ?? 0) + 1;
}

// ── Kaufen ──────────────────────────────────────────────────────

/** Kauft `menge` Stück einer Ware (HAENDLER_WAREN) zum Preis der Stadtstufe. */
export function kaufen(state: GameState, itemId: string, menge = 1): HaendlerErgebnis {
  if (!ganzeMenge(menge)) return { ok: false, text: 'Die Menge muss eine ganze Zahl ab 1 sein.' };
  const stueck = kaufpreis(itemId, stadtStufeVon(state));
  if (stueck <= 0) return { ok: false, text: `Der Händler führt ${name(itemId)} nicht.` };
  const preis = stueck * menge;
  if (gold(state) < preis) {
    return { ok: false, text: `Zu wenig Gold: ${menge}× ${name(itemId)} kostet ${preis} Gold, du hast ${gold(state)}.` };
  }
  bezahle(state, preis);
  state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + menge;
  zaehleKauf(state);
  return { ok: true, text: `${menge}× ${name(itemId)} gekauft für ${preis} Gold.` };
}

/** Bauplan-Item eines Gebäudes, das beim Händler zu haben ist, oder null. */
function bauplanVon(typeId: string): string | null {
  const bauplan = BUILDING_DEFS[typeId]?.freischaltung.bauplan;
  return bauplan && bauplanPreis(bauplan) > 0 ? bauplan : null;
}

/** Steht das Gebäude schon, oder liegt sein Bauplan schon im Lager? (Fenster: «gekauft») */
export function bauplanGekauft(state: GameState, typeId: string): boolean {
  const bauplan = BUILDING_DEFS[typeId]?.freischaltung.bauplan;
  const steht = state.buildings.some(b => b && b.typeId === typeId && b.built);
  return steht || (!!bauplan && (state.globalStock[bauplan] ?? 0) >= 1);
}

/** Kauft den Bauplan eines Gebäudes (einmal): nur, wenn er nicht im Lager liegt und das Gebäude nicht steht. */
export function bauplanKaufen(state: GameState, typeId: string): HaendlerErgebnis {
  const gebaeude = BUILDING_DEFS[typeId]?.name ?? typeId;
  const bauplan = bauplanVon(typeId);
  if (!bauplan) return { ok: false, text: `Für ${gebaeude} gibt es beim Händler keinen Bauplan.` };
  if (state.buildings.some(b => b && b.typeId === typeId && b.built)) {
    return { ok: false, text: `${gebaeude} steht schon.` };
  }
  if ((state.globalStock[bauplan] ?? 0) >= 1) return { ok: false, text: `Den ${name(bauplan)} hast du schon.` };
  const preis = bauplanPreis(bauplan, stadtStufeVon(state));
  if (gold(state) < preis) {
    return { ok: false, text: `Zu wenig Gold: ${name(bauplan)} kostet ${preis} Gold, du hast ${gold(state)}.` };
  }
  bezahle(state, preis);
  state.globalStock[bauplan] = 1;
  zaehleKauf(state);
  return { ok: true, text: `${name(bauplan)} gekauft für ${preis} Gold. Jetzt kannst du ${gebaeude} bauen.` };
}

// ── Verkaufen ───────────────────────────────────────────────────

/** Verkauft `menge` Stück (oder 'alle') aus dem Lager zum Ankaufpreis (halber Grundwert, mindestens 1). */
export function verkaufen(state: GameState, itemId: string, menge: number | 'alle' = 1): HaendlerErgebnis {
  if (!istAnkaufbar(itemId)) return { ok: false, text: `Der Händler kauft ${name(itemId)} nicht an.` };
  const vorrat = Math.floor(state.globalStock[itemId] ?? 0);
  if (vorrat < 1) return { ok: false, text: `Von ${name(itemId)} liegt nichts im Lager.` };
  if (menge !== 'alle' && !ganzeMenge(menge)) return { ok: false, text: 'Die Menge muss eine ganze Zahl ab 1 sein.' };
  const anzahl = menge === 'alle' ? vorrat : menge;
  if (anzahl > vorrat) {
    return { ok: false, text: `So viel ${name(itemId)} hast du nicht: ${vorrat} im Lager, ${anzahl} wolltest du verkaufen.` };
  }
  const erloes = ankaufpreis(itemId) * anzahl;
  state.globalStock[itemId] = vorrat - anzahl;
  state.globalStock.gold = gold(state) + erloes;
  return { ok: true, text: `${anzahl}× ${name(itemId)} verkauft für ${erloes} Gold.` };
}

/** Was im Lager liegt und der Händler ankauft, in Lager-Reihenfolge (Abschnitt «Verkaufen»). */
export function verkaeufliches(state: GameState): { itemId: string; menge: number; preis: number }[] {
  return Object.entries(state.globalStock)
    .filter(([itemId, menge]) => menge >= 1 && istAnkaufbar(itemId))
    .map(([itemId, menge]) => ({ itemId, menge: Math.floor(menge), preis: ankaufpreis(itemId) }));
}
