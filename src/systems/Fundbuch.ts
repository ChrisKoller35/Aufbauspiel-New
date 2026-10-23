// ─── Magic City – Fundbuch ──────────────────────────────────────
// Woher kommt ein Gegenstand, und wofür braucht man ihn? Reine Rechnung
// über die echten Daten (Beutetabellen, Routen, Händler, Rezepte,
// Gebäude, Stadtstufen, Schmiede); nichts ist abgeschrieben.
// Beute-Regel wie CombatEngine.rollLoot: Jeder besiegte Gegner mit
// Beutetabelle gibt Gold und einen Wurf aus seiner Tabelle, meist einen
// Gegenstand, bei einem Eintrag «gold» manchmal stattdessen mehr Gold.
// Gezogen wird gewichtet (Chance = Gewicht / Summe aller Gewichte, auch
// des Eintrags «gold»), die Menge gleich verteilt von minQty bis maxQty.
// Anzeige: ui/components/FundbuchFenster.ts. Doku: docs/FUNDBUCH.md.
// ────────────────────────────────────────────────────────────────

import { ENEMY_DEFS } from '../data/enemies';
import { LOOT_TABLE_DEFS, LootTableDef } from '../data/lootTables';
import { ROUTE_DEFS, RouteDef } from '../data/routes';
import { ITEM_DEFS, PROVISION_ITEMS } from '../data/items';
import { HAENDLER_WAREN, ankaufpreis, kaufpreis } from '../data/haendler';
import { BUILDING_DEFS, BUILD_MENU_ORDER } from '../data/buildings';
import { RECIPE_DEFS } from '../data/recipes';
import { HERZSTEINE, STADTSTUFEN } from '../data/stadtstufen';
import { DUNGEON_SETS, setTeilIds } from '../data/dungeonSets';
import { MATERIAL_JE_STUFE, SPLITTER_JE_STUFE, grundMenge, materialFuerRoute } from '../data/schmiede';
import { MERCHANT_MAX_PURCHASES, MERCHANT_PRICES } from './ExpeditionSystem';
import { ausbauKosten, maxStufe } from './Ausbau';
import { SPLITTER, einschmelzenErtrag, istSchmiedbar, materialJeSieg } from './Schmiede';

/**
 * Ein Fund-Raum ohne feste Wahl bietet neben der Truhe eine von drei zufälligen Optionen an,
 * eine davon ist «Versteck durchsuchen» mit dem ersten findItem (EncounterProcessor, nextInt(0, 2)).
 * Nachgerechnet in tests/fundbuch.test.ts.
 */
export const VERSTECK_CHANCE = 1 / 3;

/**
 * Ein Rastplatz ohne feste Wahl bietet neben «Rasten» eine von drei zufälligen Optionen an, eine davon
 * ist «Kräuter sammeln» mit 2 Grünen Kräutern (EncounterProcessor.zufallsWahlRast, nextInt(0, 2)).
 * Nachgerechnet in tests/fundbuch.test.ts.
 */
export const RAST_KRAEUTER = { itemId: 'herb_green', menge: 2, chance: 1 / 3 };

// ── Beute der Gegner ────────────────────────────────────────────

/** Chance, dass ein Sieg über einen Gegner mit dieser Tabelle den Gegenstand gibt (0 bis 1). */
export function chanceInTabelle(tabelle: LootTableDef, itemId: string): number {
  const summe = tabelle.entries.reduce((s, e) => s + e.weight, 0);
  if (summe <= 0) return 0;
  return tabelle.entries.filter(e => e.itemId === itemId).reduce((s, e) => s + e.weight, 0) / summe;
}

/** Erwartete Stückzahl je Sieg über einen Gegner mit dieser Tabelle (Chance × mittlere Menge). */
export function mittelInTabelle(tabelle: LootTableDef, itemId: string): number {
  const summe = tabelle.entries.reduce((s, e) => s + e.weight, 0);
  if (summe <= 0) return 0;
  return tabelle.entries
    .filter(e => e.itemId === itemId)
    .reduce((s, e) => s + (e.weight / summe) * (e.minQty + e.maxQty) / 2, 0);
}

function tabelleVon(enemyId: string): LootTableDef | undefined {
  const id = ENEMY_DEFS[enemyId]?.lootTableId;
  return id ? LOOT_TABLE_DEFS[id] : undefined;
}

/** Alle Gegner einer Route, je Auftritt einmal (alle Räume, auch Befestigungen; der Boss steht in seinem Raum). */
export function gegnerDerRoute(route: RouteDef): string[] {
  return route.encounters.flatMap(enc => enc.enemies ?? []);
}

/** Wie viele Gegner der Route welche Beutetabelle haben (so oft würfelt rollLoot bei einem Sieg über alle). */
export function beuteZiehungen(routeId: string): Record<string, number> {
  const zaehler: Record<string, number> = {};
  const route = ROUTE_DEFS[routeId];
  if (!route) return zaehler;
  for (const id of gegnerDerRoute(route)) {
    const tabelle = ENEMY_DEFS[id]?.lootTableId;
    if (tabelle && LOOT_TABLE_DEFS[tabelle]) zaehler[tabelle] = (zaehler[tabelle] ?? 0) + 1;
  }
  return zaehler;
}

/** Erwartete Stückzahl eines Gegenstands aus der Kampfbeute eines Siegs über alle Gegner der Route. */
export function jeSiegInRoute(routeId: string, itemId: string): number {
  const route = ROUTE_DEFS[routeId];
  if (!route) return 0;
  return gegnerDerRoute(route).reduce((s, id) => {
    const tabelle = tabelleVon(id);
    return s + (tabelle ? mittelInTabelle(tabelle, itemId) : 0);
  }, 0);
}

/** Gegner, die in mindestens einer Route stehen. */
function gegnerInRouten(): Set<string> {
  return new Set(Object.values(ROUTE_DEFS).flatMap(gegnerDerRoute));
}

// ── Woher ───────────────────────────────────────────────────────

export interface GegnerFund {
  enemyId: string;
  name: string;
  /** Chance je Sieg über diesen Gegner (0 bis 1). */
  chance: number;
  minQty: number;
  maxQty: number;
  /** So oft steht der Gegner in der Route (nur in DungeonFund.gegner). */
  anzahl: number;
}

export interface DungeonFund {
  routeId: string;
  name: string;
  /** Ø Stück je Sieg (Kampfbeute aller Gegner der Route). */
  jeSieg: number;
  gegner: GegnerFund[];
}

export interface FundRaum {
  routeId: string;
  name: string;
  /** Raum, ab 1 gezählt. */
  raum: number;
  menge: number;
  /** zufall: «Versteck durchsuchen» wird nur manchmal angeboten (VERSTECK_CHANCE); fest: immer zur Wahl. */
  art: 'zufall' | 'fest';
  /** Kommt erst, wenn der Boss fällt (EncounterChoice.nachSieg). */
  nachSieg: boolean;
}

export interface Fundorte {
  /** Je Dungeon, sortiert nach Ø je Sieg (grösster zuerst), mit den Gegnern dort. */
  dungeons: DungeonFund[];
  /** Alle Gegner in Routen, die den Gegenstand fallen lassen (ohne Wiederholung). */
  gegner: GegnerFund[];
  /** Händler der Stadt, Gold je Stück auf Stadtstufe 1. */
  haendler: number | null;
  /** Reisender Händler im Dungeon (MERCHANT_PRICES), höchstens `max` Käufe je Händler. */
  dungeonHaendler: { preis: number; max: number } | null;
  fundRaeume: FundRaum[];
  /** Rastplätze ohne feste Wahl, an denen «Kräuter sammeln» angeboten werden kann (RAST_KRAEUTER). */
  rastplaetze: { routeId: string; name: string; raum: number }[];
  /** Beim ersten Sieg der Gilde über den Boss (RouteDef.ersterSiegBeute). */
  ersterSieg: { routeId: string; name: string; bossName: string }[];
  /** Rezepte einer Werkstatt, die den Gegenstand herstellen (Menge je Durchgang). */
  hergestellt: { recipeId: string; name: string; buildingId: string; gebaeude: string; menge: number }[];
  /** Schmiede-Material: so viel legt schmiedeBeute nach jedem Sieg in die Truhe, grösste Menge zuerst. */
  jedenSieg: { routeId: string; name: string; menge: number }[];
  /** Schmiede-Material: so viel bringt ein doppeltes Set-Teil aus diesem Dungeon beim Einschmelzen. */
  einschmelzen: { routeId: string; name: string; menge: number }[];
}

function gegnerFund(enemyId: string, tabelle: LootTableDef, itemId: string, anzahl: number): GegnerFund {
  const eintraege = tabelle.entries.filter(e => e.itemId === itemId);
  return {
    enemyId,
    name: ENEMY_DEFS[enemyId]?.name ?? enemyId,
    chance: chanceInTabelle(tabelle, itemId),
    minQty: Math.min(...eintraege.map(e => e.minQty)),
    maxQty: Math.max(...eintraege.map(e => e.maxQty)),
    anzahl,
  };
}

function fundRaeume(itemId: string): FundRaum[] {
  const raeume: FundRaum[] = [];
  for (const route of Object.values(ROUTE_DEFS)) {
    route.encounters.forEach((enc, i) => {
      const basis = { routeId: route.id, name: route.name, raum: i + 1 };
      if (enc.wahl) {
        for (const option of [enc.wahl.a, enc.wahl.b]) {
          if (option.effect === 'item' && option.itemId === itemId) {
            raeume.push({ ...basis, menge: option.value, art: 'fest', nachSieg: !!option.nachSieg });
          }
        }
      } else if (enc.type === 'find' && enc.findItems?.[0]?.itemId === itemId) {
        raeume.push({ ...basis, menge: enc.findItems[0].qty, art: 'zufall', nachSieg: false });
      }
    });
  }
  return raeume;
}

function rastplaetze(itemId: string): Fundorte['rastplaetze'] {
  if (itemId !== RAST_KRAEUTER.itemId) return [];
  return Object.values(ROUTE_DEFS).flatMap(route => route.encounters
    .map((enc, i) => ({ enc, raum: i + 1 }))
    .filter(({ enc }) => enc.type === 'rest' && !enc.wahl)
    .map(({ raum }) => ({ routeId: route.id, name: route.name, raum })));
}

/** Schmiede-Material aus schmiedeBeute (Schwierigkeit Normal, wie im Spiel). */
function jedenSieg(itemId: string): Fundorte['jedenSieg'] {
  return Object.values(ROUTE_DEFS)
    .flatMap(route => {
      const material = materialJeSieg(route.id);
      return material?.material.id === itemId ? [{ routeId: route.id, name: route.name, menge: material.menge }] : [];
    })
    .sort((a, b) => b.menge - a.menge);
}

/** Einschmelzen: Jedes Teil eines Sets bringt gleich viel (Schmiede.einschmelzenErtrag), grösste Menge zuerst. */
function einschmelzen(itemId: string): Fundorte['einschmelzen'] {
  return DUNGEON_SETS
    .flatMap(set => {
      const ertrag = einschmelzenErtrag(setTeilIds(set)[0]);
      const route = ROUTE_DEFS[set.routeId];
      return ertrag?.material.id === itemId && route ? [{ routeId: route.id, name: route.name, menge: ertrag.menge }] : [];
    })
    .sort((a, b) => b.menge - a.menge);
}

/** Alle Quellen eines Gegenstands mit Zahlen. */
export function fundorte(itemId: string): Fundorte {
  const inRouten = gegnerInRouten();
  const gegner: GegnerFund[] = [];
  for (const enemyId of inRouten) {
    const tabelle = tabelleVon(enemyId);
    if (tabelle && chanceInTabelle(tabelle, itemId) > 0) gegner.push(gegnerFund(enemyId, tabelle, itemId, 1));
  }
  gegner.sort((a, b) => b.chance - a.chance || a.name.localeCompare(b.name, 'de'));

  const dungeons: DungeonFund[] = [];
  for (const route of Object.values(ROUTE_DEFS)) {
    const jeSieg = jeSiegInRoute(route.id, itemId);
    if (jeSieg <= 0) continue;
    const anzahl = new Map<string, number>();
    for (const id of gegnerDerRoute(route)) anzahl.set(id, (anzahl.get(id) ?? 0) + 1);
    const hier = [...anzahl]
      .map(([id, n]) => ({ id, n, tabelle: tabelleVon(id) }))
      .filter(g => g.tabelle && chanceInTabelle(g.tabelle, itemId) > 0)
      .map(g => gegnerFund(g.id, g.tabelle!, itemId, g.n))
      .sort((a, b) => b.chance * b.anzahl - a.chance * a.anzahl);
    dungeons.push({ routeId: route.id, name: route.name, jeSieg, gegner: hier });
  }
  dungeons.sort((a, b) => b.jeSieg - a.jeSieg);

  const ersterSieg = Object.values(ROUTE_DEFS)
    .filter(r => r.ersterSiegBeute === itemId && r.bossId)
    .map(r => ({ routeId: r.id, name: r.name, bossName: ENEMY_DEFS[r.bossId!]?.name ?? r.bossId! }));

  const stadt = kaufpreis(itemId, 1);
  const dungeonPreis = MERCHANT_PRICES[itemId];
  return {
    dungeons,
    gegner,
    haendler: stadt > 0 ? stadt : null,
    dungeonHaendler: dungeonPreis ? { preis: dungeonPreis, max: MERCHANT_MAX_PURCHASES } : null,
    fundRaeume: fundRaeume(itemId),
    rastplaetze: rastplaetze(itemId),
    ersterSieg,
    hergestellt: Object.values(RECIPE_DEFS)
      .filter(r => r.outputs[itemId])
      .map(r => {
        const buildingId = gebaeudeMitRezept(r.id) ?? '';
        return { recipeId: r.id, name: r.name, buildingId, gebaeude: BUILDING_DEFS[buildingId]?.name ?? '', menge: r.outputs[itemId] };
      }),
    jedenSieg: jedenSieg(itemId),
    einschmelzen: einschmelzen(itemId),
  };
}

/** Was die Kampfbeute einer Route bringt: Gegenstände mit Ø je Sieg, grösster zuerst (ohne Gold). */
export function dungeonBeute(routeId: string): { itemId: string; jeSieg: number }[] {
  const route = ROUTE_DEFS[routeId];
  if (!route) return [];
  const ids = new Set<string>();
  for (const id of gegnerDerRoute(route)) {
    for (const e of tabelleVon(id)?.entries ?? []) if (zaehltAlsEintrag(e.itemId)) ids.add(e.itemId);
  }
  return [...ids]
    .map(itemId => ({ itemId, jeSieg: jeSiegInRoute(routeId, itemId) }))
    .sort((a, b) => b.jeSieg - a.jeSieg);
}

// ── Wofür ───────────────────────────────────────────────────────

export interface Verwendung {
  /** Rezepte, die den Gegenstand verbrauchen: Menge je Durchgang. */
  rezepte: { recipeId: string; name: string; buildingId: string; gebaeude: string; menge: number; ergebnis: string }[];
  bau: { buildingId: string; gebaeude: string; menge: number }[];
  ausbau: { buildingId: string; gebaeude: string; stufe: number; menge: number }[];
  /** Abgabe beim Aufstieg auf diese Stadtstufe. */
  abgaben: { stufe: number; name: string; menge: number }[];
  herzsteine: { name: string; menge: number }[];
  /**
   * Schmiede: so viel braucht ein Set-Teil für jede Stufe (Index 0 = auf +1, 0 = auf dieser Stufe nichts).
   * routeId: Set-Teile aus diesem Dungeon; null: jedes Set-Teil (Kristallsplitter).
   */
  schmiede: { routeId: string | null; mengen: number[] }[];
  proviant: boolean;
  /** Gold je Stück beim Händler der Stadt (Ankauf), 0 = nimmt er nicht. */
  ankauf: number;
}

function gebaeudeMitRezept(recipeId: string): string | null {
  return BUILD_MENU_ORDER.find(id => BUILDING_DEFS[id]?.recipes.includes(recipeId)) ?? null;
}

/** Wie Schmiede.schmiedeKosten: Material = Grundmenge der Set-Ebene × MATERIAL_JE_STUFE, ab +3 Kristallsplitter. */
function schmiedeBedarf(itemId: string): Verwendung['schmiede'] {
  if (itemId === SPLITTER) return SPLITTER_JE_STUFE.some(n => n > 0) ? [{ routeId: null, mengen: [...SPLITTER_JE_STUFE] }] : [];
  return DUNGEON_SETS
    .filter(set => materialFuerRoute(set.routeId)?.id === itemId && setTeilIds(set).some(istSchmiedbar))
    .map(set => ({ routeId: set.routeId, mengen: MATERIAL_JE_STUFE.map(n => n * grundMenge(set.tier)) }));
}

export function verwendung(itemId: string): Verwendung {
  const rezepte: Verwendung['rezepte'] = [];
  for (const rezept of Object.values(RECIPE_DEFS)) {
    const menge = rezept.inputs[itemId];
    if (!menge) continue;
    const buildingId = gebaeudeMitRezept(rezept.id) ?? '';
    rezepte.push({
      recipeId: rezept.id, name: rezept.name, buildingId, gebaeude: BUILDING_DEFS[buildingId]?.name ?? '',
      menge, ergebnis: Object.keys(rezept.outputs)[0] ?? '',
    });
  }
  const bau: Verwendung['bau'] = [];
  const ausbau: Verwendung['ausbau'] = [];
  for (const id of BUILD_MENU_ORDER) {
    const def = BUILDING_DEFS[id];
    if (!def) continue;
    if (def.buildCost[itemId]) bau.push({ buildingId: id, gebaeude: def.name, menge: def.buildCost[itemId] });
    for (let stufe = 2; stufe <= maxStufe(id); stufe++) {
      const menge = ausbauKosten(id, stufe)[itemId];
      if (menge) ausbau.push({ buildingId: id, gebaeude: def.name, stufe, menge });
    }
  }
  const abgaben = STADTSTUFEN
    .filter(s => s.abgabe[itemId])
    .map(s => ({ stufe: s.stufe, name: s.name, menge: s.abgabe[itemId] }));
  const herzsteine = HERZSTEINE.filter(h => h.kosten[itemId]).map(h => ({ name: h.name, menge: h.kosten[itemId] }));
  return {
    rezepte, bau, ausbau, abgaben, herzsteine,
    schmiede: schmiedeBedarf(itemId),
    proviant: PROVISION_ITEMS.includes(itemId),
    ankauf: ankaufpreis(itemId),
  };
}

// ── Einträge ────────────────────────────────────────────────────

/** Gold und Set-Teile der Dungeon-Sets (Tag `set`, fallen über DungeonSets.ts) sind keine Einträge. */
function zaehltAlsEintrag(itemId: string): boolean {
  const def = ITEM_DEFS[itemId];
  return !!def && itemId !== 'gold' && !def.tags.includes('currency') && !def.tags.includes('set');
}

export type FundbuchGruppe = 'material' | 'verbrauch' | 'ausruestung' | 'sonstiges';

export const GRUPPEN_NAMEN: Record<FundbuchGruppe, string> = {
  material: 'Materialien',
  verbrauch: 'Tränke und Proviant',
  ausruestung: 'Ausrüstung',
  sonstiges: 'Sonstiges',
};

/**
 * Gruppe nach ItemDef.type und Tags. Materialien: `resource` und `material`, dazu Besonderes
 * (`special`), das Rezepte, Bau oder Stadtstufen verbrauchen (Kristallsplitter, Talisman-Fragmente).
 */
export function gruppeVon(itemId: string): FundbuchGruppe {
  const def = ITEM_DEFS[itemId];
  if (!def) return 'sonstiges';
  if (def.type === 'resource' || def.type === 'material') return 'material';
  if (def.type === 'consumable') return 'verbrauch';
  if (def.type === 'gear') return 'ausruestung';
  const v = verwendung(itemId);
  if (v.rezepte.length || v.bau.length || v.ausbau.length || v.abgaben.length) return 'material';
  return 'sonstiges';
}

/**
 * Alle Einträge des Fundbuchs: Beute (Gegner in Routen), Schmiede-Material der Routen, Fund, Händlerware;
 * ohne Gold und Dungeon-Set-Teile.
 */
export function fundbuchEintraege(): string[] {
  const ids = new Set<string>();
  for (const enemyId of gegnerInRouten()) {
    for (const e of tabelleVon(enemyId)?.entries ?? []) ids.add(e.itemId);
  }
  for (const route of Object.values(ROUTE_DEFS)) {
    if (route.ersterSiegBeute) ids.add(route.ersterSiegBeute);
    const material = materialJeSieg(route.id);
    if (material) ids.add(material.material.id);
    for (const enc of route.encounters) {
      if (enc.wahl) {
        for (const o of [enc.wahl.a, enc.wahl.b]) if (o.effect === 'item' && o.itemId) ids.add(o.itemId);
      } else if (enc.type === 'find' && enc.findItems?.[0]) ids.add(enc.findItems[0].itemId);
    }
  }
  HAENDLER_WAREN.forEach(w => ids.add(w.itemId));
  Object.keys(MERCHANT_PRICES).forEach(id => ids.add(id));
  return [...ids].filter(zaehltAlsEintrag).sort((a, b) => ITEM_DEFS[a].name.localeCompare(ITEM_DEFS[b].name, 'de'));
}

// ── Zahlen in Spielersprache ────────────────────────────────────

/** 0,35 → «35 %», 0,004 → «0,4 %» (unter 1 % mit einer Nachkommastelle). */
export function prozentText(anteil: number): string {
  const p = anteil * 100;
  const text = p > 0 && p < 1 ? p.toFixed(1) : String(Math.round(p));
  return `${text.replace('.', ',')} %`;
}

/** 1.4 → «1,4», 0.05 → «0,05» (unter 0,1 mit zwei Nachkommastellen), 2 → «2». */
export function zahlText(wert: number): string {
  const text = wert > 0 && wert < 0.1 ? wert.toFixed(2) : wert.toFixed(1);
  return text.replace(/\.0$/, '').replace('.', ',');
}

/** «1» oder «1–3» */
export function mengeText(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}
