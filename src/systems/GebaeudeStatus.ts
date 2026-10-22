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
import { brotNachEssen } from './PeopleSystem';
import { hatAuftragsliste, rezeptFuer } from './Auftraege';
import {
  planeZyklus, naechsterBedarf, zulieferBedarf, fehlendeZutaten, laufendVonSelbst, vonSelbstText, vorratTage, VORRAETE,
} from './Werkstattplan';
import { handelHeute, marktGesperrt } from './Handel';

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
  /** Eine andere Werkstatt stellt die fehlende Zutat gerade her (Mehl von der Windmühle). */
  | { art: 'zulieferung'; item: string; von: string }
  /** Werkstatt ohne Auftrag; `liefert` = sie stellt nur Zutaten für andere her (Windmühle). */
  | { art: 'auftrag'; liefert?: boolean }
  /** Werkstatt ohne Auftrag, ihr Vorrat ist voll (Bäckerei: Brot für die Bewohner). */
  | { art: 'vorrat'; item: string; tage: number }
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
    case 'zulieferung': return `wartet auf ${itemName(grund.item)} (${gebaeudeName(grund.von)})`;
    case 'auftrag': return grund.liefert ? 'bereit · liefert bei Bedarf' : 'bereit · Auftrag geben';
    case 'vorrat': return `${itemName(grund.item)} reicht ${grund.tage === 1 ? '1 Tag' : `${grund.tage} Tage`}`;
    case 'kein-brot': return 'kein Brot für neue Bewohner';
    case 'voll': return 'voll · ausbauen';
  }
}

// ── Nachschub: kommt eine fehlende Zutat von selbst? ────────────

/** Gebäude-Typ, der eine Ware herstellt (erstes passendes Rezept), oder null: nur Beute aus den Dungeons. */
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
 * selbst oder, Stufen tiefer, eine Zutat ihres Herstellers (Eisenschrott für die
 * Magitech-Komponente). `von` stellt sie her (null: nur Beute aus den Dungeons);
 * `grund` sagt, warum es nicht weitergeht (null: das Gebäude fehlt).
 */
export type Nachschub =
  | { kommt: true; item: string; von: string }
  | { kommt: false; item: string; von: string | null; grund: WarteGrund | null };

/**
 * Kommt eine fehlende Zutat von selbst? Werkstätten stellen sie her, wenn sie gebraucht wird
 * (Vorstufe oder Zulieferung, systems/Werkstattplan.ts), Rohstoff-Gebäude laufen ohnehin. Sie
 * kommt, wenn ihr Hersteller arbeiten kann und dessen fehlende Zutaten auch kommen; dann ist
 * `item` die tiefste fehlende Ware, auf die alles wartet (Getreide für das Mehl).
 */
export function nachschub(state: GameState, item: string, tiefe = 0): Nachschub {
  const typeId = lieferantFuer(item);
  if (!typeId) return { kommt: false, item, von: null, grund: null };
  const w = dasGebaeude(state, typeId);
  if (!w) return { kommt: false, item, von: typeId, grund: null };
  // Werkstätten nehmen das passende Rezept von selbst, Rohstoff-Gebäude nur das gewählte
  const aktiv = w.activeRecipeId ? RECIPE_DEFS[w.activeRecipeId] : undefined;
  const recipe = hatAuftragsliste(w) ? rezeptFuer(w, item) : (aktiv?.outputs[item] ?? 0) > 0 ? aktiv : null;
  if (!recipe) return { kommt: false, item, von: typeId, grund: { art: 'kein-rezept' } };
  const hindernis = produktionsHindernis(w, BUILDING_DEFS[typeId], recipe);
  if (hindernis) return { kommt: false, item, von: typeId, grund: hindernis };
  let tiefste: Nachschub = { kommt: true, item, von: typeId };
  if (tiefe < 4) {
    for (const z of fehlendeZutaten(state, w, recipe)) {
      const tiefer = nachschub(state, z.item, tiefe + 1);
      if (!tiefer.kommt) return tiefer;
      if (tiefste.item === item) tiefste = tiefer;
    }
  }
  return tiefste;
}

/** Kurz, wie eine fehlende Zutat kommt oder woran es hängt («kommt von selbst (Windmühle)», «Eisenmine fehlt»). */
export function nachschubText(item: string, n: Nachschub): string {
  if (n.kommt) return `kommt von selbst (${gebaeudeName(lieferantFuer(item) ?? n.von)})`;
  const wo = n.von === null ? 'Beute aus den Dungeons'
    : n.grund === null ? `${gebaeudeName(n.von)} fehlt`
    : `${gebaeudeName(n.von)}: ${grundText(n.grund)}`;
  return n.item === item ? wo : `dafür fehlt ${itemName(n.item)} (${wo})`;
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
  /** Werkstatt: was gerade läuft oder gleich beginnt («Heiltrank brauen», «Mehl für Bäckerei»). */
  text?: string;
}

/** Stellt die Werkstatt nur Zutaten für andere Werkstätten her (Windmühle: Mehl für die Bäckerei)? */
export function istZulieferer(typeId: string): boolean {
  const def = BUILDING_DEFS[typeId];
  const andere = Object.values(BUILDING_DEFS).filter(d => d.manualCraft && d.id !== typeId);
  return !!def && def.recipes.length > 0 && def.recipes.every(rid =>
    Object.keys(RECIPE_DEFS[rid]?.outputs ?? {}).every(item =>
      andere.some(d => d.recipes.some(id => (RECIPE_DEFS[id]?.inputs[item] ?? 0) > 0))));
}

/** Stellt die Werkstatt die Ware gerade her oder beginnt gleich damit? */
function stelltHer(state: GameState, w: BuildingInstance, item: string): boolean {
  const laeuft = w.producing && (RECIPE_DEFS[w.activeRecipeId ?? '']?.outputs[item] ?? 0) > 0;
  return laeuft || (planeZyklus(state, w)?.recipe.outputs[item] ?? 0) > 0;
}

/**
 * Warum eine freie Werkstatt nicht beginnt: Hindernis, eine Zutat, die nicht von selbst kommt
 * (zuerst, da muss der Spieler etwas tun), eine Zulieferung, die gerade entsteht, sonst Ruhe.
 */
function werkstattGrund(state: GameState, b: BuildingInstance, def: BuildingDef): { grund: WarteGrund; recipe?: RecipeDef } {
  // Eigener Bedarf (Auftrag, Vorrat), sonst was andere Werkstätten von hier brauchen
  const bedarf = naechsterBedarf(state, b) ?? zulieferBedarf(state, b)[0]?.recipe ?? null;
  if (!bedarf) {
    const vorrat = VORRAETE[b.typeId];
    return vorrat
      ? { grund: { art: 'vorrat', item: vorrat.item, tage: vorratTage(state, b.typeId) ?? 0 } }
      : { grund: { art: 'auftrag', liefert: istZulieferer(b.typeId) } };
  }
  const hindernis = produktionsHindernis(b, def, bedarf);
  if (hindernis) return { grund: hindernis, recipe: bedarf };
  const fehlend = fehlendeZutaten(state, b, bedarf);
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
 * Werkstatt (Aufträge, Vorstufe, Zulieferung, Vorrat; systems/Werkstattplan.ts):
 * läuft, beginnt beim nächsten Takt, wartet (worauf) oder ruht.
 */
function werkstattStatus(state: GameState, b: BuildingInstance, def: BuildingDef): EinzelStatus {
  const laufend = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  if (laufend) {
    const text = laufendVonSelbst(b) ?? laufend.name;
    const hindernis = produktionsHindernis(b, def, laufend);
    return hindernis
      ? { laeuft: false, fortschritt: cycleProgress(b, laufend), grund: hindernis, recipe: laufend, text }
      : { laeuft: true, fortschritt: cycleProgress(b, laufend), recipe: laufend, text };
  }
  const plan = planeZyklus(state, b);
  if (plan) {
    // Beginnt beim nächsten Takt
    const text = plan.art === 'auftrag' ? plan.recipe.name : vonSelbstText(plan.recipe, plan.art, plan.fuer);
    return { laeuft: true, fortschritt: 0, recipe: plan.recipe, text };
  }
  const { grund, recipe } = werkstattGrund(state, b, def);
  return { laeuft: false, fortschritt: null, grund, recipe };
}

/** Zustand eines gebauten Gebäudes mit Rezepten. */
export function einzelStatus(state: GameState, b: BuildingInstance): EinzelStatus {
  const def = BUILDING_DEFS[b.typeId];
  if (!b.built) return { laeuft: false, fortschritt: buildProgress(b, def), grund: { art: 'im-bau' } };
  if (hatAuftragsliste(b)) return werkstattStatus(state, b, def);
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
  // Startet beim nächsten Takt
  return { laeuft: true, fortschritt: 0, recipe };
}

function buildProgress(b: BuildingInstance, def: BuildingDef | undefined): number | null {
  if (!def || def.buildTimeSec <= 0) return null;
  return Math.min(1, b.buildProgress / def.buildTimeSec);
}

/**
 * Ertrag pro Tag eines Rezepts ohne Zutaten, z. B. «+6 Holz / Tag»: mit zyklusSekunden (Stufe,
 * Besetzung, Synergie), wie die Zeile «Pro Tag» (systems/Tagesbilanz.ts), damit Karte und Zeile dasselbe sagen.
 */
function ertragText(b: BuildingInstance, recipe: RecipeDef): string {
  const [item, menge] = Object.entries(recipe.outputs)[0] ?? ['', 0];
  const proTag = (menge * TAG_SEKUNDEN) / zyklusSekunden(b, recipe);
  return `+${String(Math.round(proTag * 10) / 10).replace('.', ',')} ${itemName(item)} / Tag`;
}

// ── Gebäude ohne Rezepte ────────────────────────────────────────

/** Wächst die Stadt beim nächsten Tageswechsel? Sonst der Grund (wie PeopleSystem.dayTick). */
export function wachstum(state: GameState): { waechst: boolean; grund?: WarteGrund } {
  if (state.citizens.length >= wohnKapazitaet(state)) return { waechst: false, grund: { art: 'voll' } };
  if (brotNachEssen(state) < 1) return { waechst: false, grund: { art: 'kein-brot' } };
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
  else if (def.id === 'MARKETPLACE') {
    const handel = marktGesperrt(state) ? '' : ` · Handel: noch ${handelHeute(state)} Bündel`;
    text = `+${marktBonusProzent(wirkungsStufe(state, def.id))} % Steuern${handel}`;
  }
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
    let text = s.text ?? (Object.keys(recipe.inputs).length === 0 ? ertragText(b, recipe) : recipe.name);
    // Nicht alle Arbeitsplätze besetzt: läuft, aber langsamer
    if (besetzt(b) < arbeitsplaetze(b)) text += ` · ${besetzt(b)}/${arbeitsplaetze(b)} Arbeiter`;
    return { typeId, zustand: 'laeuft', text, fortschritt: s.fortschritt, anzahl: 1, stufe };
  }
  const grund = s.grund ?? { art: 'kein-rezept' as const };
  const zustand: Zustand = grund.art === 'auftrag' || grund.art === 'vorrat' ? 'bereit' : 'wartet';
  return { typeId, zustand, text: grundText(grund), fortschritt: s.fortschritt, anzahl: 1, stufe, grund };
}
