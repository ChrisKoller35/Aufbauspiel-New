// ─── Magic City – Tagesbilanz der Stadt ─────────────────────────
// Reine Rechnung: Was entsteht und was wird pro Tag (TAG_SEKUNDEN)
// verbraucht, wenn die Stadt so weiterläuft wie jetzt? Je Ware erzeugt,
// verbraucht, Bilanz und die Posten, aus denen die Zahlen stammen.
// Gerechnet wird mit der Dauer, die ein Zyklus im Spiel wirklich hat
// (echteZyklusSekunden in ProductionSystem), nicht mit der im Rezept.
//  - Rohstoff-Gebäude (Holz, Stein, Getreide, Eisen) arbeiten dauernd.
//  - Werkstätten arbeiten auf Auftrag (docs/WERKSTAETTEN.md): Aufträge
//    sind einmalig und zählen nicht, auch nicht ihre Vorstufen.
//  - Bewohner essen brotProTag, dazu kostet der nächste Bewohner 1 Brot,
//    solange Platz ist (zusammen brotBedarfProTag).
//  - Was eine Werkstatt von selbst vorrätig hält (Bäckerei: Brot für die
//    Bewohner), zählt im Gleichgewicht: so viel, wie verbraucht wird,
//    höchstens was sie selbst und ihre Zutaten hergeben (Mehl der
//    Windmühle, Getreide der Farm). Wer am wenigsten zulässt, ist der
//    Engpass. Reicht das Lager heute für eine Zutat, kommt sie von dort.
// Eine Kette, die läuft, zählt auch mit leerem Lager. Handel und
// Expeditionen zählen nicht. Ungerundet; gerundet wird erst in der
// Anzeige (ProduktionTab). Regeln: docs/TAGESBILANZ.md.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';
import {
  TAG_SEKUNDEN, gebaeudeName, produktionsHindernis, dasGebaeude, lieferantFuer, wohnKapazitaet, tagFortschritt,
  WarteGrund,
} from './GebaeudeStatus';
import { brotProTag } from './PeopleSystem';
import { hatAuftragsliste, rezeptFuer } from './Auftraege';
import { VORRAETE, vorratZiel, vonSelbstText, wareVon } from './Werkstattplan';
import { echteZyklusSekunden } from './ProductionSystem';
import { EconomySystem } from './EconomySystem';

export interface BilanzPosten {
  /** Woher die Menge kommt, z. B. «Bäckerei (Brot für die Bewohner)» oder «Bewohner». */
  quelle: string;
  /** Pro Tag, positiv = erzeugt, negativ = verbraucht. */
  menge: number;
}

export interface WarenBilanz {
  erzeugt: number;
  verbraucht: number;
  bilanz: number;
  posten: BilanzPosten[];
}

/** Was einen Vorrat bremst: ein Gebäude fehlt, steht still oder schafft nicht mehr, oder eine Zutat fehlt. */
export type VorratEngpass =
  | { art: 'fehlt'; typeId: string }
  | { art: 'steht'; typeId: string; grund: WarteGrund }
  /** `zutat`: die Ware, die ein Zulieferer macht (Mehl); fehlt sie, bremst die Werkstatt des Vorrats selbst. */
  | { art: 'schafft'; typeId: string; zutat?: string }
  /** Eine Zutat, die kein Gebäude macht (nur Beute), ist nicht im Lager. */
  | { art: 'zutat'; item: string };

/** Ein Vorrat, den eine Werkstatt von selbst hält (Bäckerei: Brot für die Bewohner). */
export interface VorratBilanz {
  typeId: string;
  item: string;
  /** Verbrauch pro Tag, den der Vorrat decken soll (Bewohner und nächster Bewohner). */
  bedarf: number;
  /** Was die Werkstatt dafür pro Tag wirklich macht, höchstens der Bedarf. */
  menge: number;
  /** So viel lassen sie und ihre Zulieferer pro Tag höchstens zu. */
  hoechstens: number;
  /** Ab so viel im Lager ruht sie (Werkstattplan.vorratZiel: Brot für 3 Tage). */
  ziel: number;
  /** Sekunden, die sie nach einer Pause auf ihre Zutaten wartet (die Windmühle mahlt erst dann). */
  anlauf: number;
  /** Wer weniger als den Bedarf zulässt, sonst null. */
  engpass: VorratEngpass | null;
}

export interface TagesBilanz {
  waren: Record<string, WarenBilanz>;
  gold: { steuern: number; bank: number; gesamt: number };
  /** Vorräte von selbst (heute nur das Brot der Bäckerei), für «reicht» und die Erklärung. */
  vorraete: VorratBilanz[];
}

const economy = new EconomySystem();

/** So tief folgt die Rechnung den Zulieferern, wie GebaeudeStatus.nachschub sucht. */
const MAX_TIEFE = 4;

function buche(waren: Record<string, WarenBilanz>, item: string, quelle: string, menge: number): void {
  if (menge === 0) return;
  const w = waren[item] ??= { erzeugt: 0, verbraucht: 0, bilanz: 0, posten: [] };
  if (menge > 0) w.erzeugt += menge;
  else w.verbraucht -= menge;
  w.bilanz += menge;
  const p = w.posten.find(x => x.quelle === quelle);
  if (p) p.menge += menge;
  else w.posten.push({ quelle, menge });
}

// ── Werkstätten, die von selbst arbeiten ────────────────────────

/** Werkstatt, die eine Zutat von selbst zuliefert (Windmühle: Mehl), mit ihrem Rezept; sonst null. */
function zulieferer(state: GameState, item: string): { b: BuildingInstance; recipe: RecipeDef } | null {
  const typeId = lieferantFuer(item);
  const b = typeId ? dasGebaeude(state, typeId) : undefined;
  const recipe = b && hatAuftragsliste(b) ? rezeptFuer(b, item) : null;
  return b && recipe ? { b, recipe } : null;
}

/** Was eine Ladung des Herstellers bringt (Windmühle: 2 Mehl, Getreidefarm: 2 Getreide), 0 ohne Hersteller. */
function ladung(item: string): number {
  const typeId = lieferantFuer(item);
  const recipeId = typeId ? BUILDING_DEFS[typeId]?.recipes.find(id => (RECIPE_DEFS[id]?.outputs[item] ?? 0) > 0) : undefined;
  return recipeId ? RECIPE_DEFS[recipeId].outputs[item] : 0;
}

/**
 * Reicht das Lager heute für diese Zutat? Dann kommt sie von dort, und ihr Hersteller ruht (Werkstätten
 * liefern nur auf Bedarf; altes Mehl wird zuerst verbacken). Eine einzelne Ladung zählt nicht: Die
 * Windmühle liefert 2 Mehl, die gleich verbacken werden, sonst spränge die Anzeige bei jeder Lieferung.
 */
function lagerReicht(state: GameState, item: string, proTag: number): boolean {
  const lager = state.globalStock[item] ?? 0;
  return proTag > 0 && lager >= proTag && lager > ladung(item);
}

/** Wer eine Zutat nachliefern müsste, die keine Zulieferer-Werkstatt macht (Getreidefarm, fehlende Windmühle). */
function rohEngpass(state: GameState, item: string): VorratEngpass {
  const typeId = lieferantFuer(item);
  if (!typeId) return { art: 'zutat', item };
  const b = dasGebaeude(state, typeId);
  const def = BUILDING_DEFS[typeId];
  if (!b || !def) return { art: 'fehlt', typeId };
  const recipe = b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  const grund: WarteGrund | null = recipe ? produktionsHindernis(b, def, recipe) : { art: 'kein-rezept' };
  return grund ? { art: 'steht', typeId, grund } : { art: 'schafft', typeId, zutat: item };
}

/** Wie eine Werkstatt von selbst arbeitet: was sie schafft, wer sie bremst und wer ihr zuliefert. */
interface Plan {
  b: BuildingInstance;
  recipe: RecipeDef;
  /** Zyklen pro Tag, die sie mit ihren Zutaten höchstens schafft. */
  zyklen: number;
  /** Wer die Zyklen begrenzt. */
  engpass: VorratEngpass;
  /** Werkstätten, die ihr Zutaten machen (nicht, wenn das Lager reicht). */
  zulieferer: { item: string; plan: Plan }[];
}

/**
 * Plant eine Werkstatt, die von selbst arbeitet: ihre eigenen Zyklen (echte Dauer, 0 bei Hindernis),
 * aber nicht mehr, als ihre Zutaten hergeben. Reicht das Lager heute, kommt die Zutat von dort.
 * Sonst macht sie eine Zulieferer-Werkstatt (Windmühle: so viel sie schafft), oder es kommt nur, was
 * Rohstoff-Gebäude pro Tag mehr machen, als sonst verbraucht wird (Getreidefarm). Eine Kette, die
 * läuft, zählt also auch mit leerem Lager. `wunsch`: so viele Zyklen pro Tag sind gefragt;
 * `zutat`: die Ware, die sie selbst zuliefert (undefined für den Vorrat).
 */
function plane(
  state: GameState, waren: Record<string, WarenBilanz>, b: BuildingInstance, recipe: RecipeDef,
  wunsch: number, zutat: string | undefined, tiefe: number,
): Plan {
  const def = BUILDING_DEFS[b.typeId];
  const grund: WarteGrund | null = def ? produktionsHindernis(b, def, recipe) : { art: 'im-bau' };
  if (grund) return { b, recipe, zyklen: 0, engpass: { art: 'steht', typeId: b.typeId, grund }, zulieferer: [] };
  const eigene = TAG_SEKUNDEN / echteZyklusSekunden(b, recipe);
  const plan: Plan = { b, recipe, zyklen: eigene, engpass: { art: 'schafft', typeId: b.typeId, zutat }, zulieferer: [] };
  if (tiefe >= MAX_TIEFE) return plan;
  const gefragt = Math.min(eigene, wunsch);
  for (const [item, menge] of Object.entries(recipe.inputs)) {
    if (lagerReicht(state, item, menge * gefragt)) continue;
    const z = zulieferer(state, item);
    let moeglich: number;
    let engpass: VorratEngpass;
    if (z) {
      if (z.b === b) continue;
      const stueck = z.recipe.outputs[item];
      const zPlan = plane(state, waren, z.b, z.recipe, (gefragt * menge) / stueck, item, tiefe + 1);
      plan.zulieferer.push({ item, plan: zPlan });
      moeglich = (zPlan.zyklen * stueck) / menge;
      engpass = zPlan.engpass;
    } else {
      moeglich = Math.max(0, waren[item]?.bilanz ?? 0) / menge;
      engpass = rohEngpass(state, item);
    }
    if (moeglich < plan.zyklen) {
      plan.zyklen = moeglich;
      plan.engpass = engpass;
    }
  }
  return plan;
}

/**
 * Wie lange die Werkstatt nach einer Pause auf Zutaten ihrer Zulieferer wartet: Die liefern nur auf
 * Bedarf (Werkstattplan), die Windmühle mahlt also erst, wenn die Bäckerei wieder backen will.
 */
function anlaufSekunden(plan: Plan): number {
  let sekunden = 0;
  for (const { item, plan: z } of plan.zulieferer) {
    const zyklen = Math.ceil(plan.recipe.inputs[item] / z.recipe.outputs[item]);
    sekunden = Math.max(sekunden, zyklen * echteZyklusSekunden(z.b, z.recipe) + anlaufSekunden(z));
  }
  return sekunden;
}

/** «Mehl für die Bäckerei» (beliefert werden nur Werkstätten wie Bäckerei und Kriegsmaschinen-Werkstatt). */
function zulieferText(recipe: RecipeDef, fuer: string): string {
  return `${wareVon(recipe)} für die ${gebaeudeName(fuer)}`;
}

/**
 * Bucht `zyklen` pro Tag eines Plans: Ausgaben unter `quelle`, Zutaten als Verbrauch der Werkstatt.
 * Ihre Zulieferer machen genau so viel, wie sie braucht.
 */
function buchePlan(waren: Record<string, WarenBilanz>, plan: Plan, zyklen: number, quelle: string): void {
  if (zyklen <= 0) return;
  const name = gebaeudeName(plan.b.typeId);
  for (const [item, menge] of Object.entries(plan.recipe.outputs)) buche(waren, item, quelle, menge * zyklen);
  for (const [item, menge] of Object.entries(plan.recipe.inputs)) buche(waren, item, name, -menge * zyklen);
  for (const { item, plan: z } of plan.zulieferer) {
    const zZyklen = (plan.recipe.inputs[item] * zyklen) / z.recipe.outputs[item];
    buchePlan(waren, z, zZyklen, `${gebaeudeName(z.b.typeId)} (${zulieferText(z.recipe, plan.b.typeId)})`);
  }
}

/**
 * Vorrat von selbst (Bäckerei: Brot für die Bewohner) im Gleichgewicht: Die Werkstatt macht so viel
 * nach, wie verbraucht wird, höchstens was sie und ihre Zutaten hergeben.
 */
function vorratBilanz(
  state: GameState, waren: Record<string, WarenBilanz>, typeId: string, recipeId: string, item: string,
): VorratBilanz | null {
  const recipe = RECIPE_DEFS[recipeId];
  const stueck = recipe?.outputs[item] ?? 0;
  if (!recipe || stueck <= 0) return null;
  // Bisher gebuchter Verbrauch der Ware: die Bewohner (brotBedarfProTag)
  const bedarf = waren[item]?.verbraucht ?? 0;
  const ziel = vorratZiel(state, typeId);
  const b = dasGebaeude(state, typeId);
  if (!b) {
    return { typeId, item, bedarf, menge: 0, hoechstens: 0, ziel, anlauf: 0, engpass: bedarf > 0 ? { art: 'fehlt', typeId } : null };
  }
  const plan = plane(state, waren, b, recipe, bedarf / stueck, undefined, 0);
  const zyklen = Math.min(bedarf / stueck, plan.zyklen);
  buchePlan(waren, plan, zyklen, `${gebaeudeName(typeId)} (${vonSelbstText(recipe, 'vorrat', item)})`);
  const menge = zyklen * stueck;
  return {
    typeId, item, bedarf, menge, hoechstens: plan.zyklen * stueck, ziel, anlauf: anlaufSekunden(plan),
    engpass: menge < bedarf - 1e-9 ? plan.engpass : null,
  };
}

// ── Tagesbilanz ─────────────────────────────────────────────────

/** Erzeugung und Verbrauch pro Tag je Ware, dazu Gold und die Vorräte von selbst. */
export function tagesBilanz(state: GameState): TagesBilanz {
  const waren: Record<string, WarenBilanz> = {};

  // Rohstoff-Gebäude: ihr Rezept, so oft es im Spiel wirklich fertig wird. Werkstätten nie über
  // activeRecipeId: dort steht der laufende Auftrag oder was sie gerade von selbst macht.
  for (const b of state.buildings) {
    if (!b || !b.activeRecipeId || hatAuftragsliste(b)) continue;
    const def = BUILDING_DEFS[b.typeId];
    const recipe = RECIPE_DEFS[b.activeRecipeId];
    if (!def || !recipe || produktionsHindernis(b, def, recipe)) continue;
    const zyklen = TAG_SEKUNDEN / echteZyklusSekunden(b, recipe);
    const name = gebaeudeName(b.typeId);
    for (const [item, menge] of Object.entries(recipe.outputs)) buche(waren, item, name, menge * zyklen);
    for (const [item, menge] of Object.entries(recipe.inputs)) buche(waren, item, name, -menge * zyklen);
  }

  // Bewohner essen; solange Platz ist, kostet der nächste Bewohner 1 Brot (PeopleSystem.dayTick)
  const bewohner = state.citizens.length;
  buche(waren, 'bread', 'Bewohner', -brotProTag(bewohner));
  if (bewohner < wohnKapazitaet(state)) buche(waren, 'bread', 'Nächster Bewohner', -1);

  const vorraete: VorratBilanz[] = [];
  for (const [typeId, v] of Object.entries(VORRAETE)) {
    const vb = vorratBilanz(state, waren, typeId, v.recipeId, v.item);
    if (vb) vorraete.push(vb);
  }

  const r = economy.steuerRechnung(state);
  return { waren, gold: { steuern: r.steuern, bank: r.bank, gesamt: r.gesamt }, vorraete };
}

/** Wie viele Tage der Vorrat bei negativer Bilanz noch reicht, sonst null. */
export function reichtTage(vorrat: number, bilanz: number): number | null {
  if (bilanz >= 0) return null;
  return Math.max(0, Math.floor(Math.max(0, vorrat) / -bilanz));
}

/**
 * «reicht» für einen Vorrat von selbst (Brot), Tag für Tag wie im Spiel. Gegessen wird beim
 * Tageswechsel; satt ist ein Tag, wenn dann der ganze Verbrauch im Lager liegt. Ab dem Ziel ruht die
 * Werkstatt bis zum nächsten Tageswechsel. Lag der Vorrat dort am Ziel, backt sie danach wieder an,
 * wartet aber erst auf ihre Zutaten (`anlauf`) und schafft an dem Tag weniger. Sonst backt sie durch,
 * und es fehlt jeden Tag nur, was sie nicht schafft. `tagesAnteil`: so viel vom heutigen Tag ist
 * vorbei (was sie heute schon gebacken hat, liegt im Lager und zählt nicht doppelt).
 */
function vorratReicht(vorrat: number, v: VorratBilanz, wert: number, tagesAnteil: number): number {
  const verbrauch = v.menge - wert;
  const anlauf = Math.min(1, v.anlauf / TAG_SEKUNDEN);
  let lager = vorrat;
  let vorbei = tagesAnteil;
  // Backt sie heute wieder an? Dann lag beim letzten Tageswechsel der Vorrat am Ziel
  let anbacken = lager - v.menge * Math.max(0, vorbei - anlauf) + verbrauch >= v.ziel;
  let tage = 0;
  // Ruhetage, dann höchstens zwei Tage Anbacken (das Ziel erreicht sie nur am ersten), dann durch
  for (let schritt = 0; schritt < 4; schritt++) {
    if (lager >= v.ziel) {
      // Ruht bis unter das Ziel; das Ziel (Brot für 3 Tage) ist nie kleiner als der Verbrauch
      const ruhetage = Math.floor((lager - v.ziel) / verbrauch) + 1;
      lager -= ruhetage * verbrauch;
      tage += ruhetage;
      vorbei = 0;
      anbacken = true;
    }
    const bisZiel = v.ziel - lager;
    const kann = v.menge * Math.max(0, 1 - (anbacken ? Math.max(vorbei, anlauf) : vorbei));
    if (!anbacken && kann < bisZiel) break;
    anbacken = kann >= bisZiel;
    lager += Math.min(kann, bisZiel);
    if (lager < verbrauch) return tage;
    lager -= verbrauch;
    tage++;
    vorbei = 0;
  }
  // Backt durch: Jeden Tag fehlt, was sie nicht schafft
  return tage + Math.floor(Math.max(0, lager - v.menge * vorbei) / -wert + 1e-9);
}

/**
 * «reicht N Tage» für eine Ware der Tagesbilanz, null ohne Minus. Hält eine Werkstatt die Ware von
 * selbst vorrätig (Brot), rechnet vorratReicht mit ihren Pausen (alte Spielstände mit viel Brot).
 */
export function reichtTageFuer(state: GameState, bilanz: TagesBilanz, item: string): number | null {
  const wert = bilanz.waren[item]?.bilanz ?? 0;
  const vorrat = Math.max(0, state.globalStock[item] ?? 0);
  const v = bilanz.vorraete.find(x => x.item === item);
  if (wert >= 0 || !v || v.menge <= 0) return reichtTage(vorrat, wert);
  return vorratReicht(vorrat, v, wert, tagFortschritt(state));
}
