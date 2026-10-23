// ─── Magic City – Zustand der Gebäude ───────────────────────────
// Reine Funktionen über den Spielstand: Läuft eine Werkstatt, wartet
// sie (und worauf), ist ein Gebäude baubar oder gesperrt? Grundlage für
// den Reiter «Stadt», das Werkstatt-Fenster und die Engpass-Suche.
// Die Prüfungen spiegeln ProductionSystem.update. Es gibt höchstens
// ein Gebäude je Art (systems/Ausbau.ts).
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, getFreischaltHinweise } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { ITEM_DEFS } from '../data/items';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { zyklusSekunden, stufeVon } from './Ausbau';
import { anzahlText } from '../utils/Anzahl';
import { hatAuftragsliste, rezeptFuer } from './Auftraege';
import { planeZyklus, naechsterBedarf, zulieferBedarf, fehlendeZutaten, laufendVonSelbst, vonSelbstText } from './Werkstattplan';

export type Zustand = 'laeuft' | 'wartet' | 'bereit' | 'offen' | 'bauplatz' | 'gesperrt';

export type WarteGrund =
  | { art: 'zutaten'; item: string; vorrat: number; bedarf: number }
  /** Eine andere Werkstatt stellt die fehlende Zutat gerade her (Magitech-Komponente aus der Arkanschmiede). */
  | { art: 'zulieferung'; item: string; von: string }
  /** Werkstatt ohne Auftrag. */
  | { art: 'auftrag' };

export interface GebaeudeStatus {
  typeId: string;
  zustand: Zustand;
  /** Eine kurze Zeile für die Karte. */
  text: string;
  /** 0-1 für den Fortschrittsbalken, null = kein Balken. */
  fortschritt: number | null;
  /** 0 oder 1 (ein Gebäude je Art). */
  anzahl: number;
  /** Ausbau-Stufe des Gebäudes, 0 wenn keines steht. */
  stufe: number;
  grund?: WarteGrund;
  /** Freischalt-Hinweise bei «gesperrt». */
  hinweise?: string[];
}

// ── Kleine Helfer ───────────────────────────────────────────────

export function itemName(key: string): string {
  return ITEM_DEFS[key]?.name ?? key;
}

export function gebaeudeName(typeId: string): string {
  return BUILDING_DEFS[typeId]?.name ?? typeId;
}

/** Typ-IDs aller gebauten Gebäude. */
export function getBuiltTypeIds(state: GameState): Set<string> {
  return new Set(state.buildings.filter(b => b && b.built).map(b => b.typeId));
}

export function getGildenrang(state: GameState): number {
  return state.guildStats?.rank ?? 1;
}

/** Was noch fehlt, bevor das Gebäude auf seinem Feld gebaut werden darf (Gildenrang); leer = baubar. */
export function freischaltHinweise(state: GameState, typeId: string): string[] {
  return getFreischaltHinweise(typeId, getBuiltTypeIds(state), getGildenrang(state));
}

/** «50 Gold · 5 Eisenschrott» */
export function kostenText(cost: Record<string, number>): string {
  const entries = Object.entries(cost);
  if (entries.length === 0) return 'gratis';
  return entries.map(([res, qty]) => `${qty} ${itemName(res)}`).join(' · ');
}

export function gebaeudeVomTyp(state: GameState, typeId: string): BuildingInstance[] {
  return state.buildings.filter(b => b && b.typeId === typeId);
}

/** Das eine Gebäude einer Art (möglichst ein fertiges), oder undefined. */
export function dasGebaeude(state: GameState, typeId: string): BuildingInstance | undefined {
  const alle = gebaeudeVomTyp(state, typeId);
  return alle.find(b => b.built) ?? alle[0];
}

export function cycleProgress(b: BuildingInstance, recipe: RecipeDef): number {
  const total = zyklusSekunden(b, recipe);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (total - b.productionTimer) / total));
}

/** Text für einen Wartegrund, wie er auf Karte und in der Werkstatt steht. */
export function grundText(grund: WarteGrund): string {
  switch (grund.art) {
    case 'zutaten': return `fehlt: ${itemName(grund.item)} ${grund.vorrat}/${grund.bedarf}`;
    case 'zulieferung': return `wartet auf ${itemName(grund.item)} (${gebaeudeName(grund.von)})`;
    case 'auftrag': return 'bereit · Auftrag geben';
  }
}

// ── Nachschub: kommt eine fehlende Zutat von selbst? ────────────

/** Gebäude-Typ, der eine Ware herstellt (erstes passendes Rezept), oder null: nur Gold und Beute aus den Dungeons. */
export function lieferantFuer(item: string): string | null {
  for (const def of Object.values(BUILDING_DEFS)) {
    for (const id of def.recipes) {
      if ((RECIPE_DEFS[id]?.outputs[item] ?? 0) > 0) return def.id;
    }
  }
  return null;
}

/**
 * Wie eine fehlende Zutat kommt. `item` ist die Ware, an der es am Ende hängt: die Zutat
 * selbst oder, eine Stufe tiefer, eine Zutat ihres Herstellers (Eisenschrott für die
 * Magitech-Komponente). `von` stellt sie her (null: nur Gold und Beute aus den Dungeons);
 * kommt sie nicht und `von` ist gesetzt, fehlt dieses Gebäude.
 */
export type Nachschub =
  | { kommt: true; item: string; von: string }
  | { kommt: false; item: string; von: string | null };

/**
 * Kommt eine fehlende Zutat von selbst? Werkstätten stellen sie her, wenn sie gebraucht wird
 * (Vorstufe oder Zulieferung, systems/Werkstattplan.ts). Sie kommt, wenn ihr Hersteller steht
 * und dessen fehlende Zutaten auch kommen; dann ist `item` die tiefste fehlende Ware, auf die
 * alles wartet (Eisenschrott für die Komponente).
 */
export function nachschub(state: GameState, item: string, tiefe = 0): Nachschub {
  const typeId = lieferantFuer(item);
  if (!typeId) return { kommt: false, item, von: null };
  const w = dasGebaeude(state, typeId);
  const recipe = w ? rezeptFuer(w, item) : null;
  if (!w || !recipe) return { kommt: false, item, von: typeId };
  let tiefste: Nachschub = { kommt: true, item, von: typeId };
  if (tiefe < 4) {
    for (const z of fehlendeZutaten(state, recipe)) {
      const tiefer = nachschub(state, z.item, tiefe + 1);
      if (!tiefer.kommt) return tiefer;
      if (tiefste.item === item) tiefste = tiefer;
    }
  }
  return tiefste;
}

/** Kurz, wie eine fehlende Zutat kommt oder woran es hängt («kommt von selbst (Arkanschmiede)», «Arkanschmiede fehlt»). */
export function nachschubText(item: string, n: Nachschub): string {
  if (n.kommt) return `kommt von selbst (${gebaeudeName(lieferantFuer(item) ?? n.von)})`;
  const wo = n.von === null
    ? (n.item === 'gold' ? 'Gold aus Beute, Aufträgen und Verkauf' : 'Beute aus den Dungeons')
    : `${gebaeudeName(n.von)} fehlt`;
  return n.item === item ? wo : `dafür fehlt ${itemName(n.item)} (${wo})`;
}

// ── Zustand einer Werkstatt ─────────────────────────────────────

export interface EinzelStatus {
  laeuft: boolean;
  fortschritt: number | null;
  grund?: WarteGrund;
  recipe?: RecipeDef;
  /** Was gerade läuft oder gleich beginnt («Heiltrank brauen», «Magitech-Komponente für Kriegsmaschinen-Werkstatt»). */
  text?: string;
}

/** Stellt die Werkstatt die Ware gerade her oder beginnt gleich damit? */
function stelltHer(state: GameState, w: BuildingInstance, item: string): boolean {
  const laeuft = w.producing && (RECIPE_DEFS[w.activeRecipeId ?? '']?.outputs[item] ?? 0) > 0;
  return laeuft || (planeZyklus(state, w)?.recipe.outputs[item] ?? 0) > 0;
}

/**
 * Warum eine freie Werkstatt nicht beginnt: eine Zutat, die nicht von selbst kommt
 * (zuerst, da muss der Spieler etwas tun), eine Zulieferung, die gerade entsteht, sonst Ruhe.
 */
function werkstattGrund(state: GameState, b: BuildingInstance): { grund: WarteGrund; recipe?: RecipeDef } {
  // Eigener Bedarf (Auftrag), sonst was andere Werkstätten von hier brauchen
  const bedarf = naechsterBedarf(b) ?? zulieferBedarf(state, b)[0]?.recipe ?? null;
  if (!bedarf) return { grund: { art: 'auftrag' } };
  const fehlend = fehlendeZutaten(state, bedarf);
  if (fehlend.length === 0) return { grund: { art: 'auftrag' }, recipe: bedarf };
  const zutaten = ({ item, fehlt }: { item: string; fehlt: number }): WarteGrund =>
    ({ art: 'zutaten', item, vorrat: bedarf.inputs[item] - fehlt, bedarf: bedarf.inputs[item] });
  const fest = fehlend.find(z => !nachschub(state, z.item).kommt);
  if (fest) return { grund: zutaten(fest), recipe: bedarf };
  const erste = fehlend[0];
  const lieferant = lieferantFuer(erste.item);
  const w = lieferant ? dasGebaeude(state, lieferant) : undefined;
  if (w && w !== b && hatAuftragsliste(w) && stelltHer(state, w, erste.item)) {
    return { grund: { art: 'zulieferung', item: erste.item, von: w.typeId }, recipe: bedarf };
  }
  return { grund: zutaten(erste), recipe: bedarf };
}

/**
 * Zustand einer Werkstatt (Aufträge, Vorstufe, Zulieferung; systems/Werkstattplan.ts):
 * läuft, beginnt beim nächsten Takt, wartet (worauf) oder ruht.
 */
export function einzelStatus(state: GameState, b: BuildingInstance): EinzelStatus {
  const laufend = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  if (laufend) {
    const text = laufendVonSelbst(b) ?? laufend.name;
    return { laeuft: true, fortschritt: cycleProgress(b, laufend), recipe: laufend, text };
  }
  const plan = planeZyklus(state, b);
  if (plan) {
    // Beginnt beim nächsten Takt
    const text = plan.art === 'auftrag' ? plan.recipe.name : vonSelbstText(plan.recipe, plan.art, plan.fuer);
    return { laeuft: true, fortschritt: 0, recipe: plan.recipe, text };
  }
  const { grund, recipe } = werkstattGrund(state, b);
  return { laeuft: false, fortschritt: null, grund, recipe };
}

// ── Zustand eines Gebäude-Typs ──────────────────────────────────

/** Gildenhaus und Händler haben keine Rezepte: Helden in der Gilde bzw. «Kauft und verkauft.». */
function statusOhneRezept(state: GameState, typeId: string, b: BuildingInstance): GebaeudeStatus {
  const basis = { typeId, anzahl: 1, stufe: stufeVon(b), fortschritt: null };
  if (typeId === 'HAENDLER') return { ...basis, zustand: 'offen', text: 'Kauft und verkauft.' };
  if (BUILDING_DEFS[typeId]?.expeditions) {
    return { ...basis, zustand: 'bereit', text: `${anzahlText(state.fighters.length, 'Held', 'Helden')} in der Gilde` };
  }
  return { ...basis, zustand: 'bereit', text: 'gebaut' };
}

export function getGebaeudeStatus(state: GameState, typeId: string): GebaeudeStatus {
  const def = BUILDING_DEFS[typeId];
  const b = dasGebaeude(state, typeId);

  if (!b) {
    const hinweise = freischaltHinweise(state, typeId);
    if (hinweise.length > 0) {
      return { typeId, zustand: 'gesperrt', text: hinweise.join(' · '), fortschritt: null, anzahl: 0, stufe: 0, hinweise };
    }
    return { typeId, zustand: 'bauplatz', text: def ? kostenText(def.buildCost) : '', fortschritt: null, anzahl: 0, stufe: 0 };
  }

  if (!hatAuftragsliste(b)) return statusOhneRezept(state, typeId, b);

  const stufe = stufeVon(b);
  const s = einzelStatus(state, b);
  if (s.laeuft) {
    return { typeId, zustand: 'laeuft', text: s.text ?? s.recipe!.name, fortschritt: s.fortschritt, anzahl: 1, stufe };
  }
  const grund = s.grund ?? { art: 'auftrag' as const };
  const zustand: Zustand = grund.art === 'auftrag' ? 'bereit' : 'wartet';
  return { typeId, zustand, text: grundText(grund), fortschritt: s.fortschritt, anzahl: 1, stufe, grund };
}
