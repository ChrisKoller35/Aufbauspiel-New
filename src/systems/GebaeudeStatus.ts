// ─── Magic City – Zustand der Gebäude ───────────────────────────
// Reine Funktionen über den Spielstand: Läuft ein Gebäude-Typ, wartet
// er (und worauf), ist er baubar oder gesperrt? Grundlage für die
// Reiter «Produktion» und «Wohnen», die Werkstatt und die Engpass-Suche.
// Die Prüfungen spiegeln ProductionSystem.update.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BuildingDef, getFreischaltHinweise } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { ITEM_DEFS } from '../data/items';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';

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
  | { art: 'auftrag' };

export interface GebaeudeStatus {
  typeId: string;
  zustand: Zustand;
  /** Eine kurze Zeile für die Karte. */
  text: string;
  /** 0-1 für den Fortschrittsbalken, null = kein Balken. */
  fortschritt: number | null;
  anzahl: number;
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

/** Vorrat, den ein Gebäude für ein Rezept nutzen kann. */
export function stockFor(state: GameState, b: BuildingInstance, item: string): number {
  return b.connected ? (state.globalStock[item] ?? 0) : (b.localInputBuffer[item] ?? 0);
}

export function canAffordRecipe(state: GameState, b: BuildingInstance, recipe: RecipeDef): boolean {
  return Object.entries(recipe.inputs).every(([item, qty]) => stockFor(state, b, item) >= qty);
}

export function cycleProgress(b: BuildingInstance, recipe: RecipeDef): number {
  const total = recipe.cycleTimeSec * b.synergySpeedMult;
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
function ertragText(laufende: BuildingInstance[], recipe: RecipeDef): string {
  const [item, menge] = Object.entries(recipe.outputs)[0] ?? ['', 0];
  const proTag = laufende.reduce(
    (sum, b) => sum + (menge * TAG_SEKUNDEN) / Math.max(1, recipe.cycleTimeSec * b.synergySpeedMult), 0,
  );
  return `+${Math.round(proTag * 10) / 10} ${itemName(item)} / Tag`;
}

// ── Gebäude ohne Rezepte ────────────────────────────────────────

export function wohnKapazitaet(state: GameState): number {
  let capacity = 0;
  for (const b of state.buildings) {
    if (!b || !b.built) continue;
    const def = BUILDING_DEFS[b.typeId];
    if (!def?.housing) continue;
    if (def.requiresConnectivity && !b.connected) continue;
    capacity += def.housing.capacity;
  }
  return capacity;
}

function bereitText(state: GameState, typeId: string, anzahl: number): string {
  const def = BUILDING_DEFS[typeId];
  if (def.housing) return `${state.citizens.length} / ${wohnKapazitaet(state)} Bewohner`;
  if (def.radiusEffect?.type === 'water') return 'Wasser für die Stadt';
  if (def.expeditions) return `${def.expeditions.partySlots} Helden-Plätze`;
  if (typeId === 'WAREHOUSE') {
    const s = state.globalStock;
    return `Lager: ${Math.floor(s.wood ?? 0)} Holz · ${Math.floor(s.stone ?? 0)} Stein`;
  }
  // Marktplatz und Bank haben noch keine Wirkung im Spiel
  return anzahl > 1 ? `${anzahl} gebaut` : 'gebaut';
}

// ── Zustand eines Gebäude-Typs ──────────────────────────────────

export function getGebaeudeStatus(state: GameState, typeId: string): GebaeudeStatus {
  const def = BUILDING_DEFS[typeId];
  const alle = gebaeudeVomTyp(state, typeId);
  const anzahl = alle.length;

  if (anzahl === 0) {
    const hinweise = freischaltHinweise(state, typeId);
    if (hinweise.length > 0) {
      return { typeId, zustand: 'gesperrt', text: hinweise.join(' · '), fortschritt: null, anzahl, hinweise };
    }
    return { typeId, zustand: 'bauplatz', text: def ? kostenText(def.buildCost) : '', fortschritt: null, anzahl };
  }

  const fertige = alle.filter(b => b.built);
  if (fertige.length === 0) {
    const s = einzelStatus(state, alle[0]);
    return { typeId, zustand: 'wartet', text: 'im Bau', fortschritt: s.fortschritt, anzahl, grund: { art: 'im-bau' } };
  }

  if (!def || def.recipes.length === 0) {
    return { typeId, zustand: 'bereit', text: bereitText(state, typeId, anzahl), fortschritt: null, anzahl };
  }

  const status = alle.map(b => ({ b, s: einzelStatus(state, b) }));
  const laufende = status.filter(x => x.s.laeuft);
  if (laufende.length > 0) {
    const erste = laufende[0];
    const recipe = erste.s.recipe!;
    const text = Object.keys(recipe.inputs).length === 0
      ? ertragText(laufende.filter(x => x.s.recipe === recipe).map(x => x.b), recipe)
      : recipe.name;
    return { typeId, zustand: 'laeuft', text, fortschritt: erste.s.fortschritt, anzahl };
  }

  const erste = status[0].s;
  const grund = erste.grund ?? { art: 'kein-rezept' as const };
  const zustand: Zustand = grund.art === 'auftrag' ? 'bereit' : 'wartet';
  return { typeId, zustand, text: grundText(grund), fortschritt: erste.fortschritt, anzahl, grund };
}
