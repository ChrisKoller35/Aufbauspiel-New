// ─── Magic City – Was eine Werkstatt als Nächstes macht ─────────
// Werkstätten arbeiten nur, wenn etwas gebraucht wird (Wunsch Christoph
// 21.10.2026: «als wenn man einfach klickt wenn man was braucht?»).
// Zutaten sind Gold und Beute aus den Dungeons; nur die Magitech-
// Komponente stellt eine Werkstatt (Arkanschmiede) selbst her.
// Eine freie Werkstatt nimmt der Reihe nach:
//  1. ihren nächsten Auftrag (Auftraege.ts),
//  2. die Vorstufe dazu: Fehlt dem Auftrag eine Zutat, die sie selbst
//     herstellt, macht sie diese zuerst (Magitech-Komponente für die
//     Arkanklinge),
//  3. eine Zulieferung: Fehlt einer anderen Werkstatt für das, was sie als
//     Nächstes macht, eine Zutat von hier, liefert sie zu (Magitech-
//     Komponenten für die Kanone).
// Wartet der nächste Auftrag auf etwas, das gerade niemand machen kann
// (Beute, Gold), arbeitet die Werkstatt mit 3 weiter.
// Reine Funktionen; ProductionSystem startet, was planeZyklus sagt, und
// merkt sich in b.vonSelbst, dass es kein Auftrag ist.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { ITEM_DEFS } from '../data/items';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { hatAuftragsliste, rezeptFuer } from './Auftraege';

export type VonSelbstArt = NonNullable<BuildingInstance['vonSelbst']>['art'];
export type ZyklusArt = 'auftrag' | VonSelbstArt;

export interface Zyklus {
  recipe: RecipeDef;
  art: ZyklusArt;
  /** Vorstufe: Rezept des Auftrags; Zulieferung: belieferte Werkstatt (typeId). */
  fuer: string;
}

// ── Helfer ──────────────────────────────────────────────────────

/** Eine Werkstatt, die steht, kann arbeiten (wie ProductionSystem). */
export function kannArbeiten(b: BuildingInstance): boolean {
  return !!BUILDING_DEFS[b.typeId] && b.built;
}

/** Kann die Werkstatt dieses Rezept jetzt beginnen (Zutaten im Lager)? */
export function kannBeginnen(state: GameState, b: BuildingInstance, recipe: RecipeDef): boolean {
  if (!kannArbeiten(b)) return false;
  return Object.entries(recipe.inputs).every(([item, menge]) => (state.globalStock[item] ?? 0) >= menge);
}

/** Zutaten, die für ein Rezept fehlen, mit der fehlenden Menge. */
export function fehlendeZutaten(state: GameState, recipe: RecipeDef): { item: string; fehlt: number }[] {
  return Object.entries(recipe.inputs)
    .map(([item, menge]) => ({ item, fehlt: menge - (state.globalStock[item] ?? 0) }))
    .filter(z => z.fehlt > 0);
}

/**
 * Was die Werkstatt als Nächstes beginnen will, egal ob die Zutaten schon da sind:
 * ihr nächster Auftrag. Daraus lesen die anderen Werkstätten, was sie zuliefern sollen.
 */
export function naechsterBedarf(b: BuildingInstance): RecipeDef | null {
  return b.auftraege?.length ? RECIPE_DEFS[b.auftraege[0]] ?? null : null;
}

// ── Planung ─────────────────────────────────────────────────────

function vorstufe(state: GameState, b: BuildingInstance, recipe: RecipeDef): RecipeDef | null {
  for (const { item } of fehlendeZutaten(state, recipe)) {
    const r = rezeptFuer(b, item);
    if (r && r.id !== recipe.id && kannBeginnen(state, b, r)) return r;
  }
  return null;
}

/** Was andere Werkstätten für ihren nächsten Bedarf von dieser hier brauchen (Rezept und Empfänger). */
export function zulieferBedarf(state: GameState, b: BuildingInstance): { recipe: RecipeDef; fuer: string }[] {
  const liste: { recipe: RecipeDef; fuer: string }[] = [];
  for (const w of state.buildings) {
    if (!w || w === b || !hatAuftragsliste(w) || !kannArbeiten(w)) continue;
    const bedarf = naechsterBedarf(w);
    if (!bedarf) continue;
    for (const { item } of fehlendeZutaten(state, bedarf)) {
      const r = rezeptFuer(b, item);
      if (r) liste.push({ recipe: r, fuer: w.typeId });
    }
  }
  return liste;
}

function zulieferung(state: GameState, b: BuildingInstance): Zyklus | null {
  const z = zulieferBedarf(state, b).find(x => kannBeginnen(state, b, x.recipe));
  return z ? { recipe: z.recipe, art: 'zulieferung', fuer: z.fuer } : null;
}

/** Der Zyklus, den eine freie Werkstatt jetzt beginnt, oder null (sie ruht oder wartet). */
export function planeZyklus(state: GameState, b: BuildingInstance): Zyklus | null {
  if (!hatAuftragsliste(b) || b.producing) return null;

  const kopf = naechsterBedarf(b);
  if (kopf) {
    if (kannBeginnen(state, b, kopf)) return { recipe: kopf, art: 'auftrag', fuer: kopf.id };
    const vor = vorstufe(state, b, kopf);
    if (vor) return { recipe: vor, art: 'vorstufe', fuer: kopf.id };
  }

  return zulieferung(state, b);
}

// ── Texte ───────────────────────────────────────────────────────

function name(item: string): string {
  return ITEM_DEFS[item]?.name ?? item;
}

/** Hauptware eines Rezepts als Name («Heiltrank»). */
export function wareVon(recipe: RecipeDef | undefined): string {
  const item = recipe ? Object.keys(recipe.outputs)[0] : undefined;
  return item ? name(item) : '';
}

/** Kurzer Text für einen Zyklus ohne Auftrag: «Magitech-Komponente für Arkanklinge», «Magitech-Komponente für Kriegsmaschinen-Werkstatt». */
export function vonSelbstText(recipe: RecipeDef, art: VonSelbstArt, fuer: string): string {
  const ware = wareVon(recipe);
  if (art === 'vorstufe') return `${ware} für ${wareVon(RECIPE_DEFS[fuer])}`;
  return `${ware} für ${BUILDING_DEFS[fuer]?.name ?? fuer}`;
}

/** Text des laufenden Zyklus ohne Auftrag, oder null. */
export function laufendVonSelbst(b: BuildingInstance): string | null {
  const recipe = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  return recipe && b.vonSelbst ? vonSelbstText(recipe, b.vonSelbst.art, b.vonSelbst.fuer) : null;
}

/**
 * Was eine Werkstatt ohne Auftrag von selbst macht (Werkstatt-Fenster). Nur Werkstätten, die
 * eine Zutat selbst herstellen oder geliefert bekommen; Schmiede und Kräuterküche brauchen
 * nur Gold und Beute und machen nichts von selbst.
 */
export const VON_SELBST_SATZ: Record<string, string> = {
  ARCANE_SMITHY: 'Fehlen einem Auftrag Magitech-Komponenten, stellt die Arkanschmiede sie zuerst her, '
    + 'auch für die Kanonen der Kriegsmaschinen-Werkstatt.',
  WAR_MACHINE_WORKSHOP: 'Magitech-Komponenten für Kanonen stellt die Arkanschmiede von selbst her.',
};

/** Ein Satz, was die Werkstatt ohne Auftrag von selbst macht, oder null. */
export function vonSelbstSatz(typeId: string): string | null {
  return VON_SELBST_SATZ[typeId] ?? null;
}
