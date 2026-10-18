// ─── Magic City – Zustand der Gebäude ───────────────────────────
// Reine Funktionen über den Spielstand: Läuft ein Gebäude-Typ, wartet
// er (und worauf), ist er baubar oder gesperrt? Grundlage für den
// Reiter «Produktion», die Werkstatt und die Engpass-Suche.
// Die Prüfungen spiegeln ProductionSystem.update. Es gibt höchstens
// ein Gebäude je Art (systems/Ausbau.ts), daher steht «Stufe» statt «×N».
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BuildingDef, getFreischaltHinweise } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { ITEM_DEFS } from '../data/items';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import {
  zyklusSekunden, wohnKapazitaet, stufeVon, arbeitsplaetze, besetzt, wirkungsStufe, marktBonusProzent, bankGoldProTag,
} from './Ausbau';

export { wohnKapazitaet };

/** Länge eines Spieltags in Sekunden (DAY_TICK_INTERVAL in main.ts). */
export const TAG_SEKUNDEN = 30;

export type Zustand = 'laeuft' | 'wartet' | 'bereit' | 'bauplatz' | 'gesperrt';

export type WarteGrund =
  | { art: 'im-bau' }
  | { art: 'unwetter' }
  | { art: 'nicht-verbunden' }
  | { art: 'kein-arbeiter' }
  | { art: 'kein-wasser' }
  | { art: 'kein-rezept' }
  | { art: 'zutaten'; item: string; vorrat: number; bedarf: number }
  | { art: 'auftrag' }
  | { art: 'kein-brot' }
  | { art: 'voll' };

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

/** Typ-IDs aller fertig gebauten Gebäude. */
export function getBuiltTypeIds(state: GameState): Set<string> {
  return new Set(state.buildings.filter(b => b && b.built).map(b => b.typeId));
}

export function getGildenrang(state: GameState): number {
  return state.guildStats?.rank ?? 1;
}

/** Freischalt-Hinweise inkl. fehlendem Bauplan (Bauplan muss im Lager liegen). */
export function freischaltHinweise(state: GameState, typeId: string): string[] {
  const hinweise = getFreischaltHinweise(typeId, getBuiltTypeIds(state), getGildenrang(state));
  const bauplan = BUILDING_DEFS[typeId]?.freischaltung?.bauplan;
  if (bauplan && (state.globalStock[bauplan] ?? 0) < 1) {
    hinweise.push(`braucht ${itemName(bauplan)}`);
  }
  return hinweise;
}

/** «20 Holz · 5 Stein» */
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

/** Vorrat, den ein Gebäude für ein Rezept nutzen kann. */
export function stockFor(state: GameState, b: BuildingInstance, item: string): number {
  return b.connected ? (state.globalStock[item] ?? 0) : (b.localInputBuffer[item] ?? 0);
}

export function canAffordRecipe(state: GameState, b: BuildingInstance, recipe: RecipeDef): boolean {
  return Object.entries(recipe.inputs).every(([item, qty]) => stockFor(state, b, item) >= qty);
}

export function cycleProgress(b: BuildingInstance, recipe: RecipeDef): number {
  const total = zyklusSekunden(b, recipe);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (total - b.productionTimer) / total));
}

/** Grund, warum die Produktion gerade nicht laufen kann (wie ProductionSystem). */
export function produktionsHindernis(b: BuildingInstance, def: BuildingDef, recipe: RecipeDef): WarteGrund | null {
  if (!b.built) return { art: 'im-bau' };
  if (b.eventPaused) return { art: 'unwetter' };
  if (def.requiresConnectivity && !b.connected) return { art: 'nicht-verbunden' };
  if (def.workerSlots > 0 && b.assignedWorkerIds.length === 0) return { art: 'kein-arbeiter' };
  if (recipe.requirements?.waterSupplied && !b.waterSupplied) return { art: 'kein-wasser' };
  return null;
}

/** Text für einen Wartegrund, wie er auf Karte und in der Werkstatt steht. */
export function grundText(grund: WarteGrund): string {
  switch (grund.art) {
    case 'im-bau': return 'im Bau';
    case 'unwetter': return 'pausiert: Unwetter';
    case 'nicht-verbunden': return 'nicht verbunden';
    case 'kein-arbeiter': return 'kein Arbeiter';
    case 'kein-wasser': return 'wartet auf Wasser';
    case 'kein-rezept': return 'kein Rezept gewählt';
    case 'zutaten': return `fehlt: ${itemName(grund.item)} ${grund.vorrat}/${grund.bedarf}`;
    case 'auftrag': return 'bereit · Auftrag geben';
    case 'kein-brot': return 'kein Brot für neue Bewohner';
    case 'voll': return 'voll · ausbauen';
  }
}

/** Erste fehlende Zutat eines Rezepts. */
function fehlendeZutat(state: GameState, b: BuildingInstance, recipe: RecipeDef): WarteGrund | null {
  for (const [item, bedarf] of Object.entries(recipe.inputs)) {
    const vorrat = stockFor(state, b, item);
    if (vorrat < bedarf) return { art: 'zutaten', item, vorrat, bedarf };
  }
  return null;
}

// ── Zustand eines einzelnen Gebäudes ────────────────────────────

export interface EinzelStatus {
  laeuft: boolean;
  fortschritt: number | null;
  grund?: WarteGrund;
  recipe?: RecipeDef;
}

/** Zustand eines gebauten Gebäudes mit Rezepten. */
export function einzelStatus(state: GameState, b: BuildingInstance): EinzelStatus {
  const def = BUILDING_DEFS[b.typeId];
  if (!b.built) return { laeuft: false, fortschritt: buildProgress(b, def), grund: { art: 'im-bau' } };
  const recipe = b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  if (!recipe) return { laeuft: false, fortschritt: null, grund: { art: 'kein-rezept' } };

  const hindernis = produktionsHindernis(b, def, recipe);
  if (b.producing) {
    return hindernis
      ? { laeuft: false, fortschritt: cycleProgress(b, recipe), grund: hindernis, recipe }
      : { laeuft: true, fortschritt: cycleProgress(b, recipe), recipe };
  }
  if (hindernis) return { laeuft: false, fortschritt: null, grund: hindernis, recipe };
  const fehlt = fehlendeZutat(state, b, recipe);
  if (fehlt) return { laeuft: false, fortschritt: null, grund: fehlt, recipe };
  if (def.manualCraft && !b.pendingCraft) return { laeuft: false, fortschritt: null, grund: { art: 'auftrag' }, recipe };
  // Startet beim nächsten Takt
  return { laeuft: true, fortschritt: 0, recipe };
}

function buildProgress(b: BuildingInstance, def: BuildingDef | undefined): number | null {
  if (!def || def.buildTimeSec <= 0) return null;
  return Math.min(1, b.buildProgress / def.buildTimeSec);
}

/** Ertrag pro Tag eines Rezepts ohne Zutaten, z. B. «+6 Holz / Tag». */
function ertragText(b: BuildingInstance, recipe: RecipeDef): string {
  const [item, menge] = Object.entries(recipe.outputs)[0] ?? ['', 0];
  const proTag = (menge * TAG_SEKUNDEN) / Math.max(1, zyklusSekunden(b, recipe));
  return `+${Math.round(proTag * 10) / 10} ${itemName(item)} / Tag`;
}

// ── Gebäude ohne Rezepte ────────────────────────────────────────

/** Wächst die Stadt beim nächsten Tageswechsel? Sonst der Grund (wie PeopleSystem.dayTick). */
export function wachstum(state: GameState): { waechst: boolean; grund?: WarteGrund } {
  if (state.citizens.length >= wohnKapazitaet(state)) return { waechst: false, grund: { art: 'voll' } };
  if ((state.globalStock.bread ?? 0) < 1) return { waechst: false, grund: { art: 'kein-brot' } };
  return { waechst: true };
}

/** Fortschritt bis zum nächsten Tageswechsel (0-1). */
export function tagFortschritt(state: GameState): number {
  return Math.min(1, Math.max(0, (state.dayTickAccumulator ?? 0) / TAG_SEKUNDEN));
}

function statusOhneRezept(state: GameState, def: BuildingDef, b: BuildingInstance): GebaeudeStatus {
  const basis = { typeId: def.id, anzahl: 1, stufe: stufeVon(b) };
  const s = state.globalStock;

  if (def.housing) {
    const w = wachstum(state);
    const bewohner = `${state.citizens.length} / ${wohnKapazitaet(state)} Bewohner`;
    if (w.waechst) return { ...basis, zustand: 'laeuft', text: `${bewohner} · wächst`, fortschritt: tagFortschritt(state) };
    const grund = w.grund!;
    return {
      ...basis, zustand: grund.art === 'voll' ? 'bereit' : 'wartet',
      text: `${bewohner} · ${grund.art === 'voll' ? 'voll' : 'kein Brot'}`, fortschritt: null, grund,
    };
  }
  // Marktplatz und Bank wirken nur mit Arbeiter
  if (def.workerSlots > 0 && b.assignedWorkerIds.length === 0) {
    return { ...basis, zustand: 'wartet', text: 'kein Arbeiter', fortschritt: null, grund: { art: 'kein-arbeiter' } };
  }
  let text = 'gebaut';
  if (def.radiusEffect?.type === 'water') text = 'Wasser für die Stadt';
  else if (def.expeditions) text = `${state.fighters.length} Helden in der Gilde`;
  else if (def.id === 'WAREHOUSE') text = `${Math.floor(s.wood ?? 0)} Holz · ${Math.floor(s.stone ?? 0)} Stein`;
  else if (def.id === 'MARKETPLACE') text = `+${marktBonusProzent(wirkungsStufe(state, def.id))} % Steuern`;
  else if (def.id === 'BANK') text = `+${bankGoldProTag(wirkungsStufe(state, def.id))} Gold / Tag`;
  return { ...basis, zustand: 'bereit', text, fortschritt: null };
}

// ── Zustand eines Gebäude-Typs ──────────────────────────────────

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

  const stufe = stufeVon(b);
  if (!b.built) {
    const s = einzelStatus(state, b);
    return { typeId, zustand: 'wartet', text: 'im Bau', fortschritt: s.fortschritt, anzahl: 1, stufe, grund: { art: 'im-bau' } };
  }

  if (!def || def.recipes.length === 0) return statusOhneRezept(state, def, b);

  const s = einzelStatus(state, b);
  if (s.laeuft) {
    const recipe = s.recipe!;
    let text = Object.keys(recipe.inputs).length === 0 ? ertragText(b, recipe) : recipe.name;
    // Nicht alle Arbeitsplätze besetzt: läuft, aber langsamer
    if (besetzt(b) < arbeitsplaetze(b)) text += ` · ${besetzt(b)}/${arbeitsplaetze(b)} Arbeiter`;
    return { typeId, zustand: 'laeuft', text, fortschritt: s.fortschritt, anzahl: 1, stufe };
  }
  const grund = s.grund ?? { art: 'kein-rezept' as const };
  const zustand: Zustand = grund.art === 'auftrag' ? 'bereit' : 'wartet';
  return { typeId, zustand, text: grundText(grund), fortschritt: s.fortschritt, anzahl: 1, stufe, grund };
}
