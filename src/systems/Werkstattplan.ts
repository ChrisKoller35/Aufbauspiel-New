// ─── Magic City – Was eine Werkstatt als Nächstes macht ─────────
// Werkstätten arbeiten nur, wenn etwas gebraucht wird (Wunsch Christoph
// 21.10.2026: «als wenn man einfach klickt wenn man was braucht?»).
// Rohstoffe (Holz, Stein, Getreide, Eisen) kommen weiter von selbst.
// Eine freie Werkstatt nimmt der Reihe nach:
//  1. ihren Vorrat: Die Bäckerei backt zuerst Brot, bis es für
//     BROT_VORRAT_TAGE Tage reicht. Ein Auftrag macht die Bewohner so nie
//     hungriger als ohne Auftrag (nachgemessen in tests/werkstattplan.test.ts;
//     eine knappere Grenze liess die Stadt hungern, sobald Aufträge warteten),
//  2. ihren nächsten Auftrag (Auftraege.ts),
//  3. die Vorstufe dazu: Fehlt dem Auftrag eine Zutat, die sie selbst
//     herstellt, macht sie diese zuerst (Kräuter für den Heiltrank),
//  4. eine Zulieferung: Fehlt einer anderen Werkstatt für das, was sie als
//     Nächstes macht, eine Zutat von hier, liefert sie zu (Mehl für die
//     Bäckerei, Magitech-Komponenten für die Kanone).
// Wartet der nächste Auftrag auf etwas, das gerade niemand machen kann
// (Beute aus den Dungeons), arbeitet die Werkstatt mit 4 weiter.
// Reine Funktionen; ProductionSystem startet, was planeZyklus sagt, und
// merkt sich in b.vonSelbst, dass es kein Auftrag ist.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { ITEM_DEFS } from '../data/items';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import { brotBedarfProTag } from './PeopleSystem';
import { hatAuftragsliste, rezeptFuer } from './Auftraege';

export const BROT_VORRAT_TAGE = 3;

export type VonSelbstArt = NonNullable<BuildingInstance['vonSelbst']>['art'];
export type ZyklusArt = 'auftrag' | VonSelbstArt;

export interface Zyklus {
  recipe: RecipeDef;
  art: ZyklusArt;
  /** Vorstufe: Rezept des Auftrags; Zulieferung: belieferte Werkstatt (typeId); Vorrat: die Ware. */
  fuer: string;
}

/** Was eine Werkstatt von selbst vorrätig hält, vor ihren Aufträgen. */
interface VorratDef {
  recipeId: string;
  item: string;
  /** Verbrauch pro Tag; vorrätig bleiben BROT_VORRAT_TAGE davon. */
  jeTag: (state: GameState) => number;
}

/**
 * Brot für die Bewohner: zuerst backen, bis es für 3 Tage reicht (essen und, solange das
 * Wohnviertel Platz hat, 1 für den nächsten Bewohner), dann die Aufträge.
 */
export const VORRAETE: Record<string, VorratDef> = {
  BAKERY: {
    recipeId: 'RCP_BREAD_1',
    item: 'bread',
    jeTag: state => Math.max(1, brotBedarfProTag(state)),
  },
};

/** So viel hält die Werkstatt vorrätig (Bäckerei: Brot für 3 Tage), 0 ohne Vorrat. */
export function vorratZiel(state: GameState, typeId: string): number {
  const v = VORRAETE[typeId];
  return v ? BROT_VORRAT_TAGE * v.jeTag(state) : 0;
}

// ── Helfer ──────────────────────────────────────────────────────

function lagerFuer(state: GameState, b: BuildingInstance, item: string): number {
  return b.connected ? (state.globalStock[item] ?? 0) : (b.localInputBuffer[item] ?? 0);
}

/** Gebaut, angeschlossen und mit Arbeiter (wie ProductionSystem); Wasser hängt am Rezept. */
export function kannArbeiten(b: BuildingInstance): boolean {
  const def = BUILDING_DEFS[b.typeId];
  return !!def && b.built && (!def.requiresConnectivity || b.connected)
    && (def.workerSlots === 0 || b.assignedWorkerIds.length > 0);
}

/** Kann die Werkstatt dieses Rezept jetzt beginnen (Arbeiter, Wasser, Zutaten, kein Unwetter)? */
export function kannBeginnen(state: GameState, b: BuildingInstance, recipe: RecipeDef): boolean {
  if (!kannArbeiten(b) || b.eventPaused) return false;
  if (recipe.requirements?.waterSupplied && !b.waterSupplied) return false;
  return Object.entries(recipe.inputs).every(([item, menge]) => lagerFuer(state, b, item) >= menge);
}

/** Zutaten, die für ein Rezept fehlen, mit der fehlenden Menge. */
export function fehlendeZutaten(state: GameState, b: BuildingInstance, recipe: RecipeDef): { item: string; fehlt: number }[] {
  return Object.entries(recipe.inputs)
    .map(([item, menge]) => ({ item, fehlt: menge - lagerFuer(state, b, item) }))
    .filter(z => z.fehlt > 0);
}

/** Ware, die gerade in der Werkstatt entsteht und noch nicht im Lager liegt. */
function inArbeit(b: BuildingInstance, item: string): number {
  const recipe = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  return recipe?.outputs[item] ?? 0;
}

/** Rezept des Vorrats, wenn er unter dem Ziel liegt (was gerade entsteht, zählt mit). */
function vorratRezept(state: GameState, b: BuildingInstance): RecipeDef | null {
  const v = VORRAETE[b.typeId];
  if (!v) return null;
  const da = (state.globalStock[v.item] ?? 0) + inArbeit(b, v.item);
  return da < vorratZiel(state, b.typeId) ? RECIPE_DEFS[v.recipeId] ?? null : null;
}

/** Was die Werkstatt für ihren Vorrat noch macht, bevor Aufträge drankommen (Bäckerei: 2× Brot), sonst null. */
export function vorratVorAuftraegen(state: GameState, b: BuildingInstance): { recipe: RecipeDef; zyklen: number } | null {
  const v = VORRAETE[b.typeId];
  const recipe = v ? RECIPE_DEFS[v.recipeId] : undefined;
  if (!v || !recipe) return null;
  const fehlt = vorratZiel(state, b.typeId) - (state.globalStock[v.item] ?? 0) - inArbeit(b, v.item);
  return fehlt > 0 ? { recipe, zyklen: Math.ceil(fehlt / (recipe.outputs[v.item] || 1)) } : null;
}

/** Wie viele Tage der Vorrat einer Werkstatt reicht (Bäckerei: Brot), sonst null. */
export function vorratTage(state: GameState, typeId: string): number | null {
  const v = VORRAETE[typeId];
  if (!v) return null;
  return Math.floor((state.globalStock[v.item] ?? 0) / v.jeTag(state));
}

/**
 * Was die Werkstatt als Nächstes beginnen will, egal ob die Zutaten schon da sind:
 * ihr Vorrat, sonst der nächste Auftrag. Daraus lesen die anderen Werkstätten,
 * was sie zuliefern sollen.
 */
export function naechsterBedarf(state: GameState, b: BuildingInstance): RecipeDef | null {
  const kopf = b.auftraege?.length ? RECIPE_DEFS[b.auftraege[0]] ?? null : null;
  return vorratRezept(state, b) ?? kopf;
}

// ── Planung ─────────────────────────────────────────────────────

function vorstufe(state: GameState, b: BuildingInstance, recipe: RecipeDef): RecipeDef | null {
  for (const { item } of fehlendeZutaten(state, b, recipe)) {
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
    const bedarf = naechsterBedarf(state, w);
    if (!bedarf) continue;
    for (const { item } of fehlendeZutaten(state, w, bedarf)) {
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

  const vorrat = vorratRezept(state, b);
  if (vorrat && kannBeginnen(state, b, vorrat)) return { recipe: vorrat, art: 'vorrat', fuer: VORRAETE[b.typeId].item };

  const kopf = b.auftraege?.length ? RECIPE_DEFS[b.auftraege[0]] : undefined;
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

/** Kurzer Text für einen Zyklus ohne Auftrag: «Grüne Kräuter für Heiltrank», «Mehl für Bäckerei», «Brot für die Bewohner». */
export function vonSelbstText(recipe: RecipeDef, art: VonSelbstArt, fuer: string): string {
  const ware = wareVon(recipe);
  switch (art) {
    case 'vorstufe': return `${ware} für ${wareVon(RECIPE_DEFS[fuer])}`;
    case 'zulieferung': return `${ware} für ${BUILDING_DEFS[fuer]?.name ?? fuer}`;
    case 'vorrat': return fuer === 'bread' ? 'Brot für die Bewohner' : `${ware} auf Vorrat`;
  }
}

/** Text des laufenden Zyklus ohne Auftrag, oder null. */
export function laufendVonSelbst(b: BuildingInstance): string | null {
  const recipe = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  return recipe && b.vonSelbst ? vonSelbstText(recipe, b.vonSelbst.art, b.vonSelbst.fuer) : null;
}

/** Was eine Werkstatt ohne Auftrag von selbst macht (Werkstatt-Fenster; tests/werkstattplan.test.ts prüft die Liste). */
export const VON_SELBST_SATZ: Record<string, string> = {
  HERB_GARDEN: 'Fehlen einem Auftrag Grüne Kräuter, zieht der Kräutergarten sie zuerst. '
    + 'Braucht die Bäckerei Kräuter für Kraft-Brot, zieht er sie von selbst.',
  MILL_WIND: 'Mahlt von selbst, wenn die Bäckerei Mehl braucht. Einen Auftrag brauchst du hier nicht.',
  ARCANE_SMITHY: 'Fehlen einem Auftrag Magitech-Komponenten, stellt die Arkanschmiede sie zuerst her, '
    + 'auch für die Kanonen der Kriegsmaschinen-Werkstatt.',
  WAR_MACHINE_WORKSHOP: 'Magitech-Komponenten für Kanonen stellt die Arkanschmiede von selbst her.',
};

/** Ein Satz, was die Werkstatt ohne Auftrag von selbst macht, oder null. */
export function vonSelbstSatz(state: GameState, typeId: string): string | null {
  if (VORRAETE[typeId]) {
    const tage = vorratTage(state, typeId) ?? 0;
    return `Brot für die Bewohner backt die Bäckerei von selbst, bis es für ${BROT_VORRAT_TAGE} Tage reicht `
      + `(jetzt ${tage === 1 ? '1 Tag' : `${tage} Tage`}). Dieses Brot geht deinen Aufträgen vor, damit niemand hungert. `
      + 'Mehl mahlt die Windmühle dafür von selbst, Kräuter für Kraft-Brot zieht der Kräutergarten.';
  }
  return VON_SELBST_SATZ[typeId] ?? null;
}
