// ─── Magic City – Auftragsliste der Werkstätten ─────────────────
// Werkstätten mit Aufträgen per Hand (def.manualCraft: Schmiede,
// Arkanschmiede, Kriegsmaschinen-Werkstatt) arbeiten eine Warteschlange
// ab: bis MAX_AUFTRAEGE Aufträge (laufender plus wartende). Zutaten
// werden erst beim Start eines Auftrags abgezogen (ProductionSystem),
// Abbrechen des laufenden gibt sie zurück. Wartende Aufträge stehen in
// b.auftraege; b.activeRecipeId zeigt den laufenden bzw. nächsten und
// b.pendingCraft ist gesetzt, solange einer wartet.
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

/** Alle Aufträge in Reihenfolge: zuerst der laufende, dann die wartenden. */
export function auftragsListe(b: BuildingInstance): string[] {
  const wartend = b.auftraege ?? [];
  return b.producing && b.activeRecipeId ? [b.activeRecipeId, ...wartend] : [...wartend];
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
  if (b.producing && index === 0) {
    erstatteLaufendenZyklus(state, b);
    b.producing = false;
    b.productionTimer = 0;
  } else {
    b.auftraege.splice(b.producing ? index - 1 : index, 1);
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

/** Restzeit aller Aufträge in Sekunden (wartende mit heutiger Besetzung geschätzt). */
export function restzeitSekunden(b: BuildingInstance): number {
  let summe = b.producing ? Math.max(0, b.productionTimer) : 0;
  for (const id of b.auftraege ?? []) {
    const recipe: RecipeDef | undefined = RECIPE_DEFS[id];
    if (recipe) summe += zyklusSekunden(b, recipe);
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
