// ─── Magic City – Tagesbilanz der Stadt ─────────────────────────
// Reine Rechnung: Was entsteht und was wird pro Tag (TAG_SEKUNDEN)
// verbraucht, wenn die Stadt so weiterläuft wie jetzt? Je Ware erzeugt,
// verbraucht, Bilanz und die Posten, aus denen die Zahlen stammen.
// Gerechnet wird mit zyklusSekunden (Ausbau.ts): Stufe, Besetzung und
// Synergie zählen; Zyklen laufen im Spiel ohne Lücke (ProductionSystem).
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
import { VORRAETE, kannBeginnen, vorratZiel, vonSelbstText, wareVon } from './Werkstattplan';
import { EconomySystem } from './EconomySystem';
import { zyklusSekunden } from './Ausbau';

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
  /** Stück je Zyklus (Bäckerei: 1 Brot). */
  ladung: number;
  /** Sekunden, die sie selbst an einem Zyklus arbeitet (zyklusSekunden), 0 ohne Gebäude. */
  zyklus: number;
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
 * Plant eine Werkstatt, die von selbst arbeitet: ihre eigenen Zyklen (zyklusSekunden, 0 bei Hindernis),
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
  const eigene = TAG_SEKUNDEN / zyklusSekunden(b, recipe);
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
    sekunden = Math.max(sekunden, zyklen * zyklusSekunden(z.b, z.recipe) + anlaufSekunden(z));
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
    return {
      typeId, item, bedarf, menge: 0, hoechstens: 0, ziel, anlauf: 0, ladung: stueck, zyklus: 0,
      engpass: bedarf > 0 ? { art: 'fehlt', typeId } : null,
    };
  }
  const plan = plane(state, waren, b, recipe, bedarf / stueck, undefined, 0);
  const zyklen = Math.min(bedarf / stueck, plan.zyklen);
  buchePlan(waren, plan, zyklen, `${gebaeudeName(typeId)} (${vonSelbstText(recipe, 'vorrat', item)})`);
  const menge = zyklen * stueck;
  return {
    typeId, item, bedarf, menge, hoechstens: plan.zyklen * stueck, ziel, anlauf: anlaufSekunden(plan),
    ladung: stueck, zyklus: zyklusSekunden(b, recipe),
    engpass: menge < bedarf - 1e-9 ? plan.engpass : null,
  };
}

// ── Tagesbilanz ─────────────────────────────────────────────────

/** Erzeugung und Verbrauch pro Tag je Ware, dazu Gold und die Vorräte von selbst. */
export function tagesBilanz(state: GameState): TagesBilanz {
  const waren: Record<string, WarenBilanz> = {};

  // Rohstoff-Gebäude: ihr Rezept, so oft es am Tag fertig wird. Werkstätten nie über
  // activeRecipeId: dort steht der laufende Auftrag oder was sie gerade von selbst macht.
  for (const b of state.buildings) {
    if (!b || !b.activeRecipeId || hatAuftragsliste(b)) continue;
    const def = BUILDING_DEFS[b.typeId];
    const recipe = RECIPE_DEFS[b.activeRecipeId];
    if (!def || !recipe || produktionsHindernis(b, def, recipe)) continue;
    const zyklen = TAG_SEKUNDEN / zyklusSekunden(b, recipe);
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

/** Takt, in dem eine ruhende Werkstatt nur beginnt (ProductionSystem zählt erst ab dem nächsten). */
const KALTSTART_SEKUNDEN = 1;

/** Mehr Tage rechnet «reicht» nicht voraus. */
const MAX_REICHT_TAGE = 10_000;

/** Das Stück, das die Werkstatt des Vorrats gerade macht oder als Nächstes beginnt, in Sekunden ab jetzt. */
interface Backstand {
  start: number;
  fertig: number;
}

/**
 * Was die Werkstatt des Vorrats gerade tut: Backt sie das Brot, den Rest ihres Zyklus; ist sie frei, beginnt
 * sie im nächsten Takt (KALTSTART_SEKUNDEN) und holt erst Zutaten (`anlauf`), falls ihr welche fehlen; ist sie
 * beschäftigt (Auftrag), danach (die Windmühle mahlt derweil). Ruht sie am Ziel, null: Sie backt erst nach
 * dem nächsten Tageswechsel wieder.
 */
function backstand(state: GameState, v: VorratBilanz): Backstand | null {
  const b = dasGebaeude(state, v.typeId);
  if (!b) return null;
  const laufend = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  const rest = laufend ? Math.max(0, b.productionTimer) : 0;
  if (laufend && (laufend.outputs[v.item] ?? 0) > 0) return { start: rest - v.zyklus, fertig: rest };
  if ((state.globalStock[v.item] ?? 0) >= v.ziel) return null;
  const rezept = rezeptFuer(b, v.item);
  const start = laufend ? Math.max(rest, v.anlauf)
    : KALTSTART_SEKUNDEN + (rezept && kannBeginnen(state, b, rezept) ? 0 : v.anlauf);
  return { start, fertig: start + v.zyklus };
}

/**
 * «reicht» für einen Vorrat von selbst (Brot), Brot für Brot wie im Spiel (Werkstattplan): Die Bäckerei
 * liefert ganze Brote und beginnt das nächste, sobald das letzte fertig ist und die Zutaten da sind. Die
 * Windmühle mahlt nur auf Bedarf: Sie beginnt mit dem Brot und braucht `anlauf` Sekunden, aber nur, wenn
 * das Lager mit dem laufenden Brot noch unter dem Ziel bleibt; sonst erst wieder nach dem Tageswechsel.
 * Mehr als `hoechstens` am Tag (Getreide der Farm) gibt es nicht. Erreicht das Lager das Ziel, ruht die
 * Bäckerei bis zum nächsten Tageswechsel und beginnt danach im nächsten Takt neu. Gegessen wird beim
 * Tageswechsel; satt ist ein Tag, wenn dann der ganze Bedarf im Lager liegt. `tagesAnteil`: so viel vom
 * heutigen Tag ist vorbei; `stand`: woran die Bäckerei gerade ist (null: sie ruht).
 */
function vorratReicht(vorrat: number, v: VorratBilanz, stand: Backstand | null, tagesAnteil: number): number {
  const periode = (v.ladung * TAG_SEKUNDEN) / v.hoechstens;
  // Uhr in Sekunden seit dem letzten Tageswechsel, läuft über die Tage weiter
  const jetzt = tagesAnteil * TAG_SEKUNDEN;
  let lager = vorrat;
  let tage = 0;
  let backt = stand !== null;
  let start = stand ? jetzt + stand.start : 0;
  let fertig = stand ? jetzt + stand.fertig : Infinity;
  // Wann die Zutaten für das Brot danach bereit sind (Infinity: die Mühle mahlt noch nicht)
  let bereit = backt && lager + v.ladung < v.ziel ? start + v.anlauf : Infinity;
  while (tage < MAX_REICHT_TAGE) {
    if (!backt && lager >= v.ziel) {
      // Ruht, bis das Lager unter das Ziel fällt (das Ziel, Brot für 3 Tage, ist nie kleiner als der Bedarf)
      const ruhetage = Math.floor((lager - v.ziel) / v.bedarf) + 1;
      lager -= ruhetage * v.bedarf;
      tage += ruhetage;
    }
    if (!backt) {
      // Beginnt nach dem Tageswechsel neu: nächster Takt, erst die Zutaten, dann das Brot
      start = tage * TAG_SEKUNDEN + KALTSTART_SEKUNDEN + v.anlauf;
      fertig = start + v.zyklus;
      bereit = lager + v.ladung < v.ziel ? start + v.anlauf : Infinity;
      backt = true;
    }
    const tagEnde = (tage + 1) * TAG_SEKUNDEN;
    while (backt && fertig <= tagEnde + 1e-9) {
      lager += v.ladung;
      if (lager >= v.ziel) {
        backt = false;
        break;
      }
      start = Math.max(fertig, bereit, start + periode);
      fertig = start + v.zyklus;
      bereit = lager + v.ladung < v.ziel ? start + v.anlauf : Infinity;
    }
    if (lager < v.bedarf) return tage;
    lager -= v.bedarf;
    tage++;
    // Nach dem Essen braucht es wieder Brot: Die Mühle mahlt ab dem nächsten Takt
    if (backt && bereit === Infinity && lager + v.ladung < v.ziel) bereit = tagEnde + KALTSTART_SEKUNDEN + v.anlauf;
  }
  return tage;
}

/**
 * «reicht N Tage» für eine Ware der Tagesbilanz, null ohne Minus. Hält eine Werkstatt die Ware von
 * selbst vorrätig (Brot), zählt vorratReicht ganze Brote und ihre Pausen (alte Spielstände mit viel Brot).
 */
export function reichtTageFuer(state: GameState, bilanz: TagesBilanz, item: string): number | null {
  const wert = bilanz.waren[item]?.bilanz ?? 0;
  const vorrat = Math.max(0, state.globalStock[item] ?? 0);
  const v = bilanz.vorraete.find(x => x.item === item);
  if (wert >= 0 || !v || v.menge <= 0 || v.hoechstens <= 0) return reichtTage(vorrat, wert);
  return vorratReicht(vorrat, v, backstand(state, v), tagFortschritt(state));
}
