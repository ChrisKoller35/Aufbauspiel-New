// ─── Magic City – Auftragsliste der Werkstätten ─────────────────
// Werkstätten (def.manualCraft: Schmiede, Kräuterküche, Arkanschmiede,
// Kriegsmaschinen-Werkstatt) arbeiten eine Warteschlange ab: bis
// MAX_AUFTRAEGE Aufträge (laufender plus wartende). Zutaten (Gold und
// Beute aus dem Lager, globalStock) werden erst beim Start eines Auftrags
// abgezogen (ProductionSystem), Abbrechen des laufenden gibt sie zurück.
// Wartende Aufträge stehen in
// b.auftraege; b.activeRecipeId zeigt den laufenden bzw. nächsten und
// b.pendingCraft ist gesetzt, solange einer wartet. Was eine Werkstatt
// ohne Auftrag von selbst macht (b.vonSelbst), plant systems/Werkstattplan.ts.
// Reine Funktionen; Anzeige: BuildingsScreen.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { BuildingInstance } from '../models/Building';
import { GameState } from '../models/GameState';
import { erstatteLaufendenZyklus, zyklusSekunden } from './Ausbau';

export const MAX_AUFTRAEGE = 5;

export function hatAuftragsliste(b: BuildingInstance): boolean {
  return BUILDING_DEFS[b.typeId]?.manualCraft === true;
}

/** Läuft gerade ein Auftrag (und nicht etwas, das die Werkstatt von selbst macht)? */
export function laeuftAuftrag(b: BuildingInstance): boolean {
  return b.producing && !!b.activeRecipeId && !b.vonSelbst;
}

/** Alle Aufträge in Reihenfolge: zuerst der laufende, dann die wartenden. */
export function auftragsListe(b: BuildingInstance): string[] {
  const wartend = b.auftraege ?? [];
  return laeuftAuftrag(b) ? [b.activeRecipeId!, ...wartend] : [...wartend];
}

/** Rezept dieser Werkstatt, das die Ware herstellt (Magitech-Komponente in der Arkanschmiede), oder null. */
export function rezeptFuer(b: BuildingInstance, item: string): RecipeDef | null {
  for (const id of BUILDING_DEFS[b.typeId]?.recipes ?? []) {
    const recipe = RECIPE_DEFS[id];
    if ((recipe?.outputs[item] ?? 0) > 0) return recipe;
  }
  return null;
}

export function kannAuftragGeben(b: BuildingInstance, recipeId: string): boolean {
  return b.built && hatAuftragsliste(b)
    && BUILDING_DEFS[b.typeId].recipes.includes(recipeId)
    && auftragsListe(b).length < MAX_AUFTRAEGE;
}

/** Hängt einen Auftrag hinten an. */
export function auftragGeben(b: BuildingInstance, recipeId: string): boolean {
  if (!kannAuftragGeben(b, recipeId)) return false;
  b.auftraege = [...(b.auftraege ?? []), recipeId];
  naechsterAuftrag(b);
  return true;
}

/**
 * Bricht den Auftrag an Position `index` (wie auftragsListe) ab.
 * Der laufende gibt seine Zutaten zurück, wartende haben noch nichts gekostet.
 */
export function auftragAbbrechen(state: GameState, b: BuildingInstance, index: number): boolean {
  const liste = auftragsListe(b);
  if (index < 0 || index >= liste.length) return false;
  const laeuft = laeuftAuftrag(b);
  if (laeuft && index === 0) {
    erstatteLaufendenZyklus(state, b);
    b.producing = false;
    b.productionTimer = 0;
  } else {
    b.auftraege.splice(laeuft ? index - 1 : index, 1);
  }
  naechsterAuftrag(b);
  return true;
}

/** Ruhende Werkstatt auf den nächsten wartenden Auftrag einstellen. */
export function naechsterAuftrag(b: BuildingInstance): void {
  if (!hatAuftragsliste(b)) return;
  if (!Array.isArray(b.auftraege)) b.auftraege = [];
  if (!b.producing && b.auftraege.length > 0) b.activeRecipeId = b.auftraege[0];
  b.pendingCraft = b.auftraege.length > 0;
}

/** Vom ProductionSystem beim Start eines Zyklus aufgerufen: der erste wartende läuft jetzt. */
export function auftragGestartet(b: BuildingInstance): void {
  if (!hatAuftragsliste(b) || !Array.isArray(b.auftraege)) return;
  if (b.auftraege[0] === b.activeRecipeId) b.auftraege.shift();
  b.pendingCraft = b.auftraege.length > 0;
}

/**
 * Restzeit aller Aufträge in Sekunden (wartende auf der heutigen Stufe geschätzt).
 * Mit `state` zählen auch die Vorstufen mit, die die Werkstatt dafür noch machen muss
 * (fehlt für die Arkanklinge die Magitech-Komponente, kommt einmal «Komponente herstellen» dazu).
 */
export function restzeitSekunden(b: BuildingInstance, state?: GameState): number {
  let summe = b.producing ? Math.max(0, b.productionTimer) : 0;
  const lager: Record<string, number> = {};
  const vorrat = (item: string): number => {
    if (!(item in lager)) lager[item] = state ? (state.globalStock[item] ?? 0) : Infinity;
    return lager[item];
  };
  // Was gerade entsteht, liegt danach im Lager (z. B. das Kraut der laufenden Vorstufe)
  const laufend = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  for (const [item, menge] of Object.entries(laufend?.outputs ?? {})) lager[item] = vorrat(item) + menge;

  for (const id of b.auftraege ?? []) {
    const recipe: RecipeDef | undefined = RECIPE_DEFS[id];
    if (!recipe) continue;
    for (const [item, menge] of Object.entries(recipe.inputs)) {
      const fehlt = menge - vorrat(item);
      const vorstufe = fehlt > 0 ? rezeptFuer(b, item) : null;
      if (vorstufe) {
        const zyklen = Math.ceil(fehlt / vorstufe.outputs[item]);
        summe += zyklen * zyklusSekunden(b, vorstufe);
        lager[item] += zyklen * vorstufe.outputs[item];
      }
      lager[item] = vorrat(item) - menge;
    }
    summe += zyklusSekunden(b, recipe);
  }
  return summe;
}

// ── Rückmeldung, wenn ein Auftrag fertig ist ────────────────────

export type AuftragFertigHoerer = (b: BuildingInstance, recipe: RecipeDef) => void;
const hoerer = new Set<AuftragFertigHoerer>();

/** Anmelden für «Auftrag fertig» (z. B. Hinweis in der Kopfzeile). Gibt die Abmeldung zurück. */
export function beiAuftragFertig(fn: AuftragFertigHoerer): () => void {
  hoerer.add(fn);
  return () => hoerer.delete(fn);
}

export function meldeAuftragFertig(b: BuildingInstance, recipe: RecipeDef): void {
  for (const fn of hoerer) fn(b, recipe);
}
