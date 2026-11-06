// ─── Magic City – Aus dem Lager ausrüsten ────────────────────────
// Ein Tipp im Heldenfenster legt an, was im Lager liegt und passt. Gedacht für den neuen Lehrling, der ohne
// Ausrüstung kommt, wirkt aber bei jedem Helden (docs/AUSBILDUNG.md, «Aus dem Lager ausrüsten»):
// 1. Leere Plätze bekommen das beste passende Teil: bei Waffen zuerst die Haltung der Klasse
//    (preferredWeaponSetup: Einhand mit Schild, Zweihand, zwei Einhandwaffen), dann die höchste Stufe (tier),
//    dann der höhere Wert. Die Nebenhand nur neben einer Einhandwaffe, eine Zweihandwaffe nur bei freier Nebenhand.
// 2. Getragenes tauscht es nur gegen ein Teil, mit dem nichts schlechter wird (der grüne Pfeil,
//    systems/Beutevergleich.ts), das mit dem grössten Zugewinn zuerst, bis keines mehr besser ist.
// Wird dabei ein Platz frei (eine Einhandwaffe ersetzt eine Zweihandwaffe), kommt Schritt 1 noch einmal: Ein Tipp
// tut alles, ein zweiter fände nichts mehr. Es nimmt nur, was im Lager liegt, nie einem anderen Helden etwas weg;
// Abgelegtes geht ins Lager zurück (GearSystem).
// ────────────────────────────────────────────────────────────────

import { CLASS_DEFS } from '../data/classes';
import { ITEM_DEFS, ItemDef } from '../data/items';
import { GameState } from '../models/GameState';
import { GuildFighter } from '../models/GuildRoster';
import { vergleicher } from './Beutevergleich';
import { EquipSlot, GearSystem } from './GearSystem';
import { SchmiedeStufen, schmiedeStufen } from './Schmiede';

const gearSystem = new GearSystem();

/** Reihenfolge der Plätze: erst die Haupthand, sie entscheidet, ob die Nebenhand frei ist */
const PLAETZE: EquipSlot[] = ['mainHand', 'offHand', 'armor', 'trinket'];

/**
 * Höchstens so viele Tausche je Tipp. Jeder Tausch macht den Helden in einem Wert stärker und in keinem schwächer,
 * im Kreis geht es also nie; die Grenze ist nur ein Riegel.
 */
const MAX_TAUSCHE = 12;
/** Höchstens so oft Schritt 1 und 2 nacheinander (meist reicht einmal, nach einem frei gewordenen Platz zweimal) */
const MAX_RUNDEN = 4;

/** Ein Platz, an dem sich etwas geändert hat */
export interface Wechsel {
  platz: EquipSlot;
  /** Was jetzt dort liegt (null: der Platz ist frei geworden, weil eine Zweihandwaffe beide Hände braucht) */
  neu: string | null;
  /** Was vorher dort lag und jetzt im Lager liegt (null: der Platz war leer) */
  alt: string | null;
}

/** Ausrüstung im Lager (mit Bestand), fest sortiert, damit derselbe Stand immer gleich ausgerüstet wird */
function imLager(state: GameState): string[] {
  return Object.entries(state.globalStock ?? {})
    .filter(([id, n]) => n >= 1 && ITEM_DEFS[id]?.type === 'gear' && !!ITEM_DEFS[id]?.gearSlot)
    .map(([id]) => id)
    .sort();
}

/** Passt das Teil in genau diesen leeren Platz (wie ANLEGEN ihn wählt), ohne etwas anderes abzulegen? */
function passtIn(held: GuildFighter, itemId: string, platz: EquipSlot): boolean {
  if (!ITEM_DEFS[itemId]?.gearSlot) return false;
  // Eine Zweihandwaffe legte die Nebenhand ab: nur, wenn dort nichts liegt
  if (ITEM_DEFS[itemId].weaponSlotType === '2h' && held.gear.offHand) return false;
  return gearSystem.resolveEquipSlot(held, itemId, platz) === platz;
}

/** Rang für einen leeren Platz: Haltung der Klasse, Stufe, Wert (grösser ist besser, der Reihe nach) */
function rang(def: ItemDef, haltung: string | null | undefined): number[] {
  return [haltung && def.weaponSlotType === haltung ? 1 : 0, def.tier ?? 0, def.baseValue ?? 0];
}

function hoeher(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/** Schritt 1: leere Plätze füllen (die Haupthand zuerst, eine Einhandwaffe dort öffnet die Nebenhand) */
function leerePlaetze(state: GameState, held: GuildFighter): void {
  const haltung = CLASS_DEFS[held.classId]?.preferredWeaponSetup;
  for (const platz of PLAETZE) {
    if (held.gear[platz]) continue;
    const wunsch = platz === 'mainHand' ? haltung?.mainHand : platz === 'offHand' ? haltung?.offHand : null;
    let beste: { id: string; rang: number[] } | null = null;
    for (const id of imLager(state)) {
      if (!passtIn(held, id, platz)) continue;
      const r = rang(ITEM_DEFS[id], wunsch);
      if (!beste || hoeher(r, beste.rang)) beste = { id, rang: r };
    }
    if (beste) gearSystem.equip(state, held, beste.id, platz);
  }
}

/** Schritt 2: Getragenes nur gegen Besseres tauschen (nichts wird schlechter), das Beste zuerst. true bei einem Tausch */
function besseresAnlegen(state: GameState, held: GuildFighter, stufen: SchmiedeStufen): boolean {
  let getauscht = false;
  for (let n = 0; n < MAX_TAUSCHE; n++) {
    const vergleiche = vergleicher(held, stufen);
    let beste: { id: string; platz: EquipSlot | null; zugewinn: number } | null = null;
    for (const id of imLager(state)) {
      const v = vergleiche(id);
      if (v && (!beste || v.zugewinn > beste.zugewinn)) beste = { id, platz: v.platz, zugewinn: v.zugewinn };
    }
    if (!beste || !gearSystem.equip(state, held, beste.id, beste.platz ?? undefined)) break;
    getauscht = true;
  }
  return getauscht;
}

/**
 * Rüstet den Helden aus dem Lager aus (Schritt 1 und 2 oben) und gibt die Plätze zurück, an denen sich etwas
 * geändert hat, in der Reihenfolge Haupthand, Nebenhand, Rüstung, Talisman. Ändert Held und Lager; ohne passendes
 * Teil passiert nichts (leere Liste).
 */
export function ausLagerAusruesten(state: GameState, held: GuildFighter): Wechsel[] {
  const vorher = { ...held.gear };
  const stufen = schmiedeStufen(state);
  for (let runde = 0; runde < MAX_RUNDEN; runde++) {
    leerePlaetze(state, held);
    // Ohne Tausch bleibt alles, wie Schritt 1 es liess: Kein Platz wurde frei, kein Teil kam ins Lager zurück
    if (!besseresAnlegen(state, held, stufen)) break;
  }
  return PLAETZE
    .filter(p => (vorher[p] ?? null) !== (held.gear[p] ?? null))
    .map(p => ({ platz: p, neu: held.gear[p] ?? null, alt: vorher[p] ?? null }));
}

/** Was ausLagerAusruesten ändern würde, ohne etwas zu ändern (auf einer Kopie von Lager und Ausrüstung) */
export function ausruestPlan(state: GameState, held: GuildFighter): Wechsel[] {
  const kopie: GameState = { ...state, globalStock: { ...state.globalStock } };
  return ausLagerAusruesten(kopie, { ...held, gear: { ...held.gear } });
}
