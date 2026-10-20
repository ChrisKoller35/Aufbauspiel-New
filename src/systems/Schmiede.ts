// ─── Magic City – Schmiede im Spiel ─────────────────────────────
// Verbessert Set-Teile bis +5 mit Material aus den Dungeons, Gold und ab +3
// Kristallsplittern; doppelte Teile lassen sich zu Material einschmelzen. Jede
// Stufe gilt für alle Exemplare eines Teils (die Gilde zählt Gegenstände, sie
// unterscheidet keine Exemplare). Die Werte rechnet GearSystem.getEffectiveStats
// mit den Stufen; das Material legt schmiedeBeute nach jeder Expedition in die Truhe.
// Daten: data/schmiede.ts. Anzeige: ui/screens/SchmiedeTab.ts. Regeln: docs/SCHMIEDE.md.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { ITEM_DEFS, ItemDef } from '../data/items';
import { ROUTE_DEFS } from '../data/routes';
import { DIFFICULTY_DEFS } from '../data/difficulty';
import { setVonItem, teilArtVonItem } from '../data/dungeonSets';
import {
  ANTEIL_OHNE_SIEG, EINSCHMELZEN_GRUNDMENGEN, GOLD_JE_STUFE, HAUPTWERT, MATERIAL_JE_STUFE,
  MAX_SCHMIEDE_STUFE, PROZENT_JE_STUFE, RABATT_JE_SCHMIEDE_STUFE, SPLITTER_JE_STUFE,
  SchmiedeMaterialDef, grundMenge, materialFuerRoute,
} from '../data/schmiede';
import { besitz } from './DungeonSets';
import { stufeVon } from './Ausbau';

type Werte = NonNullable<ItemDef['statBonuses']>;

/** Set-Teil → Stufe (fehlt = 0) */
export type SchmiedeStufen = Record<string, number>;

export const SPLITTER = 'crystal_shard';

// ── Stufen und Werte ──

/** Die Stufen der Gilde (leer, solange noch nichts verbessert ist) */
export function schmiedeStufen(state: GameState): SchmiedeStufen {
  return state.schmiede?.stufen ?? {};
}

/** Stufe eines Teils, 0 bis 5 */
export function schmiedeStufe(state: GameState, itemId: string): number {
  return Math.min(MAX_SCHMIEDE_STUFE, Math.max(0, Math.floor(schmiedeStufen(state)[itemId] ?? 0)));
}

/** Kann dieses Teil in die Schmiede? (nur Set-Teile mit Werten) */
export function istSchmiedbar(itemId: string): boolean {
  return !!teilArtVonItem(itemId) && !!ITEM_DEFS[itemId]?.statBonuses;
}

/**
 * Werte eines Set-Teils auf einer Stufe: Jede Stufe macht jeden Wert um PROZENT_JE_STUFE stärker
 * (gerundet), den Hauptwert der Bauart mindestens um 1 (Krit-Chance um 1 %). Negatives Tempo
 * (Schild, schwere Platte) bleibt, wie es ist. Andere Gegenstände und Stufe 0: die Grundwerte.
 */
export function verbesserteWerte(itemId: string, stufe: number): Werte | undefined {
  const basis = ITEM_DEFS[itemId]?.statBonuses;
  const art = teilArtVonItem(itemId);
  const n = Math.min(MAX_SCHMIEDE_STUFE, Math.max(0, Math.floor(stufe)));
  if (!basis || !art || n === 0) return basis;
  const haupt = HAUPTWERT[art];
  const werte: Werte = {};
  for (const [stat, wert] of Object.entries(basis) as [keyof Werte, number][]) {
    if (!wert) continue;
    if (wert < 0) { werte[stat] = wert; continue; }
    // Tempo und Krit-Chance in Hundertsteln, damit 0.05 nicht zu 0.050000001 wird
    const bruch = stat === 'spd' || stat === 'critChance';
    const grund = bruch ? Math.round(wert * 100) : wert;
    const plus = Math.max(Math.round((grund * n * PROZENT_JE_STUFE) / 100), stat === haupt ? n : 0);
    werte[stat] = bruch ? (grund + plus) / 100 : grund + plus;
  }
  return werte;
}

/** Werte eines Gegenstands mit seiner Stufe in der Schmiede (Kampf und Anzeige) */
export function werteMitStufe(itemId: string, stufen?: SchmiedeStufen): Werte | undefined {
  return verbesserteWerte(itemId, stufen?.[itemId] ?? 0);
}

// ── Material ──

/** Das Material, mit dem ein Set-Teil verbessert wird: das aus dem Gebiet seines Dungeons */
export function materialFuerTeil(itemId: string): SchmiedeMaterialDef | undefined {
  const set = setVonItem(itemId);
  return set ? materialFuerRoute(set.routeId) : undefined;
}

/** So viel Material bringt ein Sieg in diesem Dungeon (mehr auf schwereren Stufen, wie die Punkte) */
export function materialJeSieg(routeId: string, difficulty = 'normal'): { material: SchmiedeMaterialDef; menge: number } | null {
  const route = ROUTE_DEFS[routeId];
  const material = materialFuerRoute(routeId);
  if (!route || !material) return null;
  const faktor = DIFFICULTY_DEFS[difficulty]?.scoreMult ?? 1;
  return { material, menge: Math.round(grundMenge(route.tier) * faktor) };
}

/**
 * Nach einer Expedition: legt das Material des Dungeons in die Beute. Ein Sieg bringt die volle
 * Menge (materialJeSieg), Niederlage und Rückzug die Hälfte davon nach dem Anteil geschaffter Räume.
 * Einmal pro Expedition aufrufen, bevor die Beute gezeigt wird; ein zweiter Aufruf gibt nichts mehr.
 */
export function schmiedeBeute(run: ExpeditionRun): { itemId: string; menge: number } | null {
  if (run.schmiedeMaterial !== undefined) return null;
  const jeSieg = materialJeSieg(run.routeId, run.difficulty ?? 'normal');
  let menge = 0;
  if (jeSieg && run.status === 'victory') menge = jeSieg.menge;
  else if (jeSieg && run.rooms.length > 0) {
    const geschafft = run.rooms.filter(r => r.completed).length;
    menge = Math.floor((jeSieg.menge * geschafft * ANTEIL_OHNE_SIEG) / run.rooms.length);
  }
  if (!jeSieg || menge <= 0) {
    run.schmiedeMaterial = null;
    return null;
  }
  const itemId = jeSieg.material.id;
  run.schmiedeMaterial = { itemId, menge };
  run.loot[itemId] = (run.loot[itemId] ?? 0) + menge;
  return run.schmiedeMaterial;
}

// ── Kosten ──

export interface SchmiedeKosten {
  /** Die Stufe, auf die das Teil kommt */
  aufStufe: number;
  material: SchmiedeMaterialDef;
  menge: number;
  gold: number;
  splitter: number;
  /** Gespartes Gold durch die Schmiede in der Stadt (0 bis 0.3) */
  rabatt: number;
}

/** Rabatt auf das Gold: 10 % je Ausbaustufe der fertig gebauten Schmiede in der Stadt */
export function schmiedeRabatt(state: GameState): number {
  const stufe = state.buildings
    .filter(b => b.typeId === 'SMITHY' && b.built)
    .reduce((max, b) => Math.max(max, stufeVon(b)), 0);
  return Math.round(stufe * RABATT_JE_SCHMIEDE_STUFE * 100) / 100;
}

/** Was die nächste Stufe kostet (null: kein Set-Teil oder schon auf +5) */
export function schmiedeKosten(state: GameState, itemId: string): SchmiedeKosten | null {
  const set = setVonItem(itemId);
  const material = materialFuerTeil(itemId);
  if (!set || !material || !istSchmiedbar(itemId)) return null;
  const jetzt = schmiedeStufe(state, itemId);
  if (jetzt >= MAX_SCHMIEDE_STUFE) return null;
  const rabatt = schmiedeRabatt(state);
  return {
    aufStufe: jetzt + 1,
    material,
    menge: grundMenge(set.tier) * MATERIAL_JE_STUFE[jetzt],
    gold: Math.round(set.tier * GOLD_JE_STUFE[jetzt] * (1 - rabatt)),
    splitter: SPLITTER_JE_STUFE[jetzt],
    rabatt,
  };
}

export type SchmiedeFehlt = { was: 'material' | 'gold' | 'splitter'; name: string; fehlt: number };

/** Was für die nächste Stufe noch fehlt (leer: es reicht). Wer das Teil nicht besitzt, kann nicht schmieden. */
export function schmiedeFehlt(state: GameState, itemId: string): SchmiedeFehlt[] | null {
  const kosten = schmiedeKosten(state, itemId);
  if (!kosten || besitz(state, itemId) === 0) return null;
  const fehlt: SchmiedeFehlt[] = [];
  const hat = (id: string): number => state.globalStock[id] ?? 0;
  if (hat(kosten.material.id) < kosten.menge) fehlt.push({ was: 'material', name: kosten.material.name, fehlt: kosten.menge - hat(kosten.material.id) });
  if (hat('gold') < kosten.gold) fehlt.push({ was: 'gold', name: 'Gold', fehlt: kosten.gold - hat('gold') });
  if (hat(SPLITTER) < kosten.splitter) fehlt.push({ was: 'splitter', name: 'Kristallsplitter', fehlt: kosten.splitter - hat(SPLITTER) });
  return fehlt;
}

/** Bringt ein Teil eine Stufe höher und bezahlt dafür. Gibt die neue Stufe zurück (null: geht nicht). */
export function schmieden(state: GameState, itemId: string): number | null {
  const kosten = schmiedeKosten(state, itemId);
  const fehlt = schmiedeFehlt(state, itemId);
  if (!kosten || !fehlt || fehlt.length > 0) return null;
  const zahle = (id: string, menge: number): void => { if (menge > 0) state.globalStock[id] = (state.globalStock[id] ?? 0) - menge; };
  zahle(kosten.material.id, kosten.menge);
  zahle('gold', kosten.gold);
  zahle(SPLITTER, kosten.splitter);
  state.schmiede ??= { stufen: {} };
  state.schmiede.stufen[itemId] = kosten.aufStufe;
  return kosten.aufStufe;
}

// ── Einschmelzen ──

/** Was ein doppeltes Teil beim Einschmelzen bringt */
export function einschmelzenErtrag(itemId: string): { material: SchmiedeMaterialDef; menge: number } | null {
  const set = setVonItem(itemId);
  const material = materialFuerTeil(itemId);
  return set && material ? { material, menge: EINSCHMELZEN_GRUNDMENGEN * grundMenge(set.tier) } : null;
}

/** Einschmelzen geht nur mit einem Exemplar im Lager, das nicht das letzte der Gilde ist */
export function kannEinschmelzen(state: GameState, itemId: string): boolean {
  return !!einschmelzenErtrag(itemId) && (state.globalStock[itemId] ?? 0) >= 1 && besitz(state, itemId) >= 2;
}

/** Schmilzt ein doppeltes Exemplar aus dem Lager ein. Die Stufe des Teils bleibt. */
export function einschmelzen(state: GameState, itemId: string): { material: SchmiedeMaterialDef; menge: number } | null {
  const ertrag = einschmelzenErtrag(itemId);
  if (!ertrag || !kannEinschmelzen(state, itemId)) return null;
  state.globalStock[itemId] -= 1;
  state.globalStock[ertrag.material.id] = (state.globalStock[ertrag.material.id] ?? 0) + ertrag.menge;
  return ertrag;
}

// ── Nach der Expedition ──

/** Teile der Gilde, die gerade eine Stufe höher können (getragene zuerst) */
export function bereiteTeile(state: GameState): string[] {
  const getragen = new Set(state.fighters.flatMap(f => Object.values(f.gear)).filter((id): id is string => !!id));
  return Object.keys(ITEM_DEFS)
    .filter(id => istSchmiedbar(id) && schmiedeFehlt(state, id)?.length === 0)
    .sort((a, b) => Number(getragen.has(b)) - Number(getragen.has(a)));
}

/** «Rudelreisser auf +2» für Teile, die erst mit der neuen Beute bereit sind (höchstens drei) */
export function neuBereit(state: GameState, vorher: string[]): string[] {
  return bereiteTeile(state)
    .filter(id => !vorher.includes(id))
    .slice(0, 3)
    .map(id => `${ITEM_DEFS[id].name} auf +${schmiedeStufe(state, id) + 1}`);
}
