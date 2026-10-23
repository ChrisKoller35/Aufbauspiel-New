// ─── Magic City – Der Weg zur Magischen Stadt ───────────────────
// Stadtstufen aufsteigen, Aufgaben prüfen, Abgabe bezahlen, Belohnung
// geben, Herzsteine einsetzen. Reine Funktionen auf dem Spielstand;
// Anzeige: ui/screens/StadtwegFenster.ts. Daten: data/stadtstufen.ts.
// ────────────────────────────────────────────────────────────────

import {
  HERZSTEINE, HOECHSTE_STADTSTUFE, HERZ_AB_STUFE,
  StadtAufgabe, StadtStufeDef, HerzsteinDef, stufeDef, stadtStufeVon,
} from '../data/stadtstufen';
import { ENEMY_DEFS } from '../data/enemies';
import { ROUTE_DEFS } from '../data/routes';
import { GameState, StadtwegStand } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { dasGebaeude, gebaeudeName, itemName, freischaltHinweise, kostenText } from './GebaeudeStatus';
import { anzahlText } from '../utils/Anzahl';

const ROEMISCH = ['', 'I', 'II', 'III', 'IV', 'V'];

/** Stand des Stadtwegs; ältere Spielstände bekommen ihn hier (Stufe 1, nichts gelesen). */
export function stadtweg(state: GameState): StadtwegStand {
  const s = state.stadtweg;
  if (!s || typeof s !== 'object') {
    state.stadtweg = { stufe: 1, herzsteine: [], gelesen: 0 };
    return state.stadtweg;
  }
  s.stufe = stadtStufeVon(state);
  if (!Array.isArray(s.herzsteine)) s.herzsteine = [];
  if (!Number.isFinite(s.gelesen)) s.gelesen = 0;
  return s;
}

export function aktuelleStufe(state: GameState): StadtStufeDef {
  return stufeDef(stadtStufeVon(state));
}

/** Nächste Stadtstufe oder null, wenn die Magische Stadt erreicht ist. */
export function naechsteStufe(state: GameState): StadtStufeDef | null {
  const stufe = stadtStufeVon(state);
  return stufe >= HOECHSTE_STADTSTUFE ? null : stufeDef(stufe + 1);
}

// ── Aufgaben ────────────────────────────────────────────────────

/** Bosse, die mindestens einmal besiegt wurden (Gildenstatistik und Monsterbuch). */
export function besiegteBosse(state: GameState): Set<string> {
  const ids = new Set<string>(state.guildStats?.bossesDefeatedIds ?? []);
  for (const id of state.bestiarium?.defeated ?? []) {
    if (ENEMY_DEFS[id]?.role === 'boss') ids.add(id);
  }
  return ids;
}

export interface AufgabenZeile {
  text: string;
  erledigt: boolean;
  /** Fortschritt bei Zählaufgaben (z. B. 2 von 3 Helden). */
  ist?: number;
  soll?: number;
  /** Kleiner Hinweis, wie man hinkommt (z. B. was ein Gebäude noch sperrt). */
  hinweis?: string;
}

function zaehl(text: string, ist: number, soll: number): AufgabenZeile {
  return { text, erledigt: ist >= soll, ist: Math.min(ist, soll), soll };
}

function aufgabenZeile(state: GameState, a: StadtAufgabe): AufgabenZeile {
  switch (a.art) {
    case 'gebaeude': {
      const steht = !!dasGebaeude(state, a.typeId)?.built;
      const gesperrt = steht ? [] : freischaltHinweise(state, a.typeId);
      return {
        text: `${gebaeudeName(a.typeId)} steht`,
        erledigt: steht,
        hinweis: steht ? undefined
          : gesperrt.length ? `noch gesperrt: ${gesperrt.join(', ')}`
          : `auf dem Feld bauen: ${kostenText(BUILDING_DEFS[a.typeId]?.buildCost ?? {})}`,
      };
    }
    case 'helden':
      return zaehl(`${anzahlText(a.anzahl, 'Held', 'Helden')} in der Gilde`, state.fighters.length, a.anzahl);
    case 'siege':
      return zaehl(a.anzahl === 1 ? 'Eine Expedition gewonnen' : `${a.anzahl} Expeditionen gewonnen`,
        state.statistics?.total_victories ?? 0, a.anzahl);
    case 'bosse':
      return zaehl(`${a.anzahl} verschiedene Bosse besiegt`, besiegteBosse(state).size, a.anzahl);
    case 'gildenrang': {
      const rang = state.guildStats?.rank ?? 1;
      return { text: `Gilden-Rang ${ROEMISCH[a.rang] ?? a.rang}`, erledigt: rang >= a.rang, ist: Math.min(rang, a.rang), soll: a.rang };
    }
    case 'herz':
      return zaehl('Alle fünf Herzsteine eingesetzt', stadtweg(state).herzsteine.length, HERZSTEINE.length);
  }
}

/** Aufgaben für eine Stadtstufe, mit Haken und Fortschritt. */
export function aufgabenZeilen(state: GameState, def: StadtStufeDef): AufgabenZeile[] {
  return def.aufgaben.map(a => aufgabenZeile(state, a));
}

export function hatGenug(state: GameState, kosten: Record<string, number>): boolean {
  return Object.entries(kosten).every(([res, qty]) => (state.globalStock[res] ?? 0) >= qty);
}

/** «80 Gold · 10 Eisenschrott» mit dem, was im Lager liegt. */
export function abgabeZeilen(state: GameState, kosten: Record<string, number>): { text: string; genug: boolean }[] {
  return Object.entries(kosten).map(([res, qty]) => {
    const da = Math.floor(state.globalStock[res] ?? 0);
    return { text: `${qty} ${itemName(res)} (${Math.min(da, qty)}/${qty})`, genug: da >= qty };
  });
}

export interface AufstiegStand {
  ziel: StadtStufeDef;
  aufgaben: AufgabenZeile[];
  erledigt: number;
  /** Aufgaben plus Abgabe: so viele Schritte zeigt der Balken. */
  gesamt: number;
  abgabeBezahlbar: boolean;
  bereit: boolean;
}

/** Wie weit der nächste Aufstieg ist, oder null in der Magischen Stadt. */
export function aufstiegStand(state: GameState): AufstiegStand | null {
  const ziel = naechsteStufe(state);
  if (!ziel) return null;
  const aufgaben = aufgabenZeilen(state, ziel);
  const hatAbgabe = Object.keys(ziel.abgabe).length > 0;
  const abgabeBezahlbar = hatGenug(state, ziel.abgabe);
  const erledigt = aufgaben.filter(a => a.erledigt).length + (hatAbgabe && abgabeBezahlbar ? 1 : 0);
  const gesamt = aufgaben.length + (hatAbgabe ? 1 : 0);
  return { ziel, aufgaben, erledigt, gesamt, abgabeBezahlbar, bereit: aufgaben.every(a => a.erledigt) && abgabeBezahlbar };
}

export function aufstiegBereit(state: GameState): boolean {
  return aufstiegStand(state)?.bereit ?? false;
}

/** Belohnungen einer Stufe in Spielersprache. */
export function belohnungsZeilen(def: StadtStufeDef): string[] {
  const zeilen: string[] = [];
  const vorher = stufeDef(def.stufe - 1);
  for (const [res, qty] of Object.entries(def.geschenk)) zeilen.push(`${qty} ${itemName(res)}`);
  if (def.haendlerRabatt > vorher.haendlerRabatt) zeilen.push(`${def.haendlerRabatt} % Rabatt beim Händler`);
  if (def.grenzen.werkstatt > vorher.grenzen.werkstatt) zeilen.push(`Werkstätten bis Stufe ${def.grenzen.werkstatt}`);
  zeilen.push(...(def.extra ?? []));
  zeilen.push(`Kapitel ${def.stufe} der Stadtchronik`);
  return zeilen;
}

/** Bezahlt die Abgabe, gibt die Belohnung und hebt die Stadt an. Gibt die neue Stufe zurück, sonst null. */
export function steigeAuf(state: GameState): StadtStufeDef | null {
  const stand = aufstiegStand(state);
  if (!stand?.bereit) return null;
  for (const [res, qty] of Object.entries(stand.ziel.abgabe)) {
    state.globalStock[res] = (state.globalStock[res] ?? 0) - qty;
  }
  for (const [res, qty] of Object.entries(stand.ziel.geschenk)) {
    state.globalStock[res] = (state.globalStock[res] ?? 0) + qty;
  }
  stadtweg(state).stufe = stand.ziel.stufe;
  return stand.ziel;
}

// ── Stadtchronik ────────────────────────────────────────────────

/** Gibt es ein Kapitel, das noch nicht gelesen wurde? */
export function neuesKapitel(state: GameState): boolean {
  return stadtweg(state).gelesen < stadtStufeVon(state);
}

export function kapitelGelesen(state: GameState, kapitel: number): void {
  const s = stadtweg(state);
  s.gelesen = Math.max(s.gelesen, Math.min(kapitel, s.stufe));
}

// ── Das Arkane Herz ─────────────────────────────────────────────

export interface HerzsteinZeile {
  def: HerzsteinDef;
  bossName: string;
  /** Route, auf der der Boss wartet. */
  ort: string;
  eingesetzt: boolean;
  bossBesiegt: boolean;
  bezahlbar: boolean;
}

export function herzOffen(state: GameState): boolean {
  return stadtStufeVon(state) >= HERZ_AB_STUFE;
}

export function herzsteinZeilen(state: GameState): HerzsteinZeile[] {
  const eingesetzt = new Set(stadtweg(state).herzsteine);
  const besiegt = besiegteBosse(state);
  return HERZSTEINE.map(def => ({
    def,
    bossName: ENEMY_DEFS[def.bossId]?.name ?? def.bossId,
    ort: Object.values(ROUTE_DEFS).find(r => r.bossId === def.bossId)?.name ?? 'im Dungeon',
    eingesetzt: eingesetzt.has(def.id),
    bossBesiegt: besiegt.has(def.bossId),
    bezahlbar: hatGenug(state, def.kosten),
  }));
}

/** Setzt einen Herzstein ein: braucht Stadtstufe 6, den besiegten Boss und die Kosten. */
export function setzeHerzsteinEin(state: GameState, id: string): boolean {
  if (!herzOffen(state)) return false;
  const zeile = herzsteinZeilen(state).find(z => z.def.id === id);
  if (!zeile || zeile.eingesetzt || !zeile.bossBesiegt || !zeile.bezahlbar) return false;
  for (const [res, qty] of Object.entries(zeile.def.kosten)) {
    state.globalStock[res] = (state.globalStock[res] ?? 0) - qty;
  }
  stadtweg(state).herzsteine.push(id);
  return true;
}
