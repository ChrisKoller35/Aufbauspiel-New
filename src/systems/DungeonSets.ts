// ─── Magic City – Dungeon-Sets im Spiel ─────────────────────────
// Zählt die Set-Teile, die ein Held trägt, liefert Set-Boni und
// Set-Fähigkeiten (GearSystem) und würfelt das Set-Teil, das ein Sieg
// im Dungeon einbringt (main.ts, finishExpedition).
// Daten der Sets: data/dungeonSets.ts. Wirkung im Kampf: systems/Kampfeffekte.ts.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { GuildFighter } from '../models/GuildRoster';
import { ExpeditionRun, SpecialEffect } from '../models/ExpeditionRun';
import { DungeonSetDef, SetWerte, getSet, setFuerRoute, setTeilIds, setVonItem } from '../data/dungeonSets';
import { ITEM_DEFS } from '../data/items';
import { SeededRNG } from '../utils/RNG';

type Ausruestung = GuildFighter['gear'];

const PLAETZE = ['mainHand', 'offHand', 'armor', 'trinket'] as const;

/** Chance auf ein Set-Teil pro Sieg, je Schwierigkeit. Fehlt der Gilde noch jedes Teil, ist es sicher. */
export const SET_CHANCE: Record<string, number> = {
  normal: 0.5,
  hard: 0.65,
  nightmare: 0.8,
  infernal: 1,
};

export interface GetragenesSet {
  set: DungeonSetDef;
  /** Verschiedene getragene Teile (1 bis 3). Zwei gleiche Klingen zählen als ein Teil. */
  teile: number;
}

/** Sets, von denen ein Held Teile trägt */
export function getrageneSets(gear: Ausruestung): GetragenesSet[] {
  const teile = new Map<string, Set<string>>();
  for (const platz of PLAETZE) {
    const itemId = gear[platz];
    const set = setVonItem(itemId);
    if (!set || !itemId) continue;
    const ids = teile.get(set.id) ?? new Set<string>();
    ids.add(itemId);
    teile.set(set.id, ids);
  }
  return [...teile].flatMap(([id, ids]) => {
    const set = getSet(id);
    return set ? [{ set, teile: ids.size }] : [];
  });
}

/** Werte aus Set-Boni: ab zwei Teilen der Zwei-Teile-Bonus, mit drei Teilen dazu die Werte der Fähigkeit */
export function setBonusWerte(gear: Ausruestung): SetWerte {
  const summe: SetWerte = {};
  for (const { set, teile } of getrageneSets(gear)) {
    if (teile >= 2) addiere(summe, set.zweiTeile);
    if (teile >= 3 && set.dreiTeile.werte) addiere(summe, set.dreiTeile.werte);
  }
  return summe;
}

/** Set-Fähigkeiten (ab drei Teilen) als Kampfeffekte des Trägers */
export function setFaehigkeiten(gear: Ausruestung): SpecialEffect[] {
  const effekte: SpecialEffect[] = [];
  for (const { set, teile } of getrageneSets(gear)) {
    if (teile < 3) continue;
    for (const e of set.dreiTeile.effekte) {
      effekte.push({ ...e, set: set.id, usesLeft: e.id === 'revive' ? 1 : -1 });
    }
  }
  return effekte;
}

function addiere(summe: SetWerte, werte: SetWerte): void {
  for (const [stat, wert] of Object.entries(werte) as [keyof SetWerte, number][]) {
    summe[stat] = Math.round(((summe[stat] ?? 0) + wert) * 100) / 100;
  }
}

// ── Besitz und Sammlung ──

/** Wie oft die Gilde einen Gegenstand hat: im Lager und an den Helden */
export function besitz(state: GameState, itemId: string): number {
  let anzahl = state.globalStock[itemId] ?? 0;
  for (const f of state.fighters) {
    for (const platz of PLAETZE) if (f.gear[platz] === itemId) anzahl++;
  }
  return anzahl;
}

/** Die Teile eines Sets, die die Gilde besitzt */
export function gesammelteTeile(state: GameState, set: DungeonSetDef): string[] {
  return setTeilIds(set).filter(id => besitz(state, id) > 0);
}

/** Chance auf ein Set-Teil beim nächsten Sieg in diesem Dungeon */
export function setChance(state: GameState, set: DungeonSetDef, difficulty: string): number {
  if (gesammelteTeile(state, set).length === 0) return 1;
  return SET_CHANCE[difficulty] ?? SET_CHANCE.normal;
}

/** Zieht ein Teil des Sets: Teile, die der Gilde fehlen (und nicht in `schonGezogen` sind), kommen zuerst */
function teilZiehen(state: GameState, set: DungeonSetDef, rng: SeededRNG, schonGezogen: string[] = []): string {
  const ids = setTeilIds(set);
  const fehlend = ids.filter(id => besitz(state, id) === 0 && !schonGezogen.includes(id));
  return rng.pick(fehlend.length > 0 ? fehlend : ids);
}

/**
 * Würfelt das Set-Teil für einen Sieg. Teile, die der Gilde fehlen, kommen zuerst;
 * sind alle drei da, kann jedes fallen (für einen zweiten Helden).
 */
export function setTeilWuerfeln(state: GameState, routeId: string, difficulty: string, rng: SeededRNG): string | null {
  const set = setFuerRoute(routeId);
  if (!set) return null;
  if (!rng.chance(setChance(state, set, difficulty))) return null;
  return teilZiehen(state, set, rng);
}

/**
 * «🐺 Rudel des Waldpfads · Teil 2 von 3» für ein gefundenes Teil, bevor es ins Lager kommt.
 * `davor`: Teile, die derselbe Sieg schon gebracht hat (zählen mit).
 */
export function setTeilHinweis(state: GameState, itemId: string, davor: string[] = []): string {
  const set = setVonItem(itemId);
  if (!set) return '';
  const neu = (id: string): boolean => besitz(state, id) === 0 && !davor.includes(id);
  const davorNeu = new Set(davor.filter(id => setVonItem(id) === set && besitz(state, id) === 0)).size;
  const n = gesammelteTeile(state, set).length + davorNeu + (neu(itemId) ? 1 : 0);
  return neu(itemId)
    ? `${set.zeichen} ${set.name} · Teil ${n} von 3${n === 3 ? ' – komplett!' : ''}`
    : `${set.zeichen} ${set.name} · schon da, passt für einen zweiten Helden`;
}

/** Hinweise zu allen Set-Teilen eines Siegs (für die Truhe), der Reihe nach gezählt */
export function setTeilHinweise(state: GameState, itemIds: string[]): Record<string, string> {
  const hinweise: Record<string, string> = {};
  itemIds.forEach((id, i) => { hinweise[id] ??= setTeilHinweis(state, id, itemIds.slice(0, i)); });
  return hinweise;
}

/**
 * Nach einem Sieg: legt das Set-Teil des Dungeons in die Beute der Expedition, dazu ein Teil
 * mehr, wenn eine Entscheidung der Geschichte es versprochen hat (systems/Geschichten.ts).
 * Einmal pro Expedition aufrufen, bevor die Beute gezeigt wird. Gibt die Gegenstands-IDs zurück.
 */
export function setBeute(state: GameState, run: ExpeditionRun): string[] {
  if (run.status !== 'victory') return [];
  if (run.setTeil === undefined) {
    const rng = new SeededRNG((run.rngSeed ^ 0x5e75e7) >>> 0);
    run.setTeil = setTeilWuerfeln(state, run.routeId, run.difficulty ?? 'normal', rng);
    const set = setFuerRoute(run.routeId);
    run.setTeilExtra = run.setTeilVersprochen && set ? teilZiehen(state, set, rng, run.setTeil ? [run.setTeil] : []) : null;
    const davor: string[] = [];
    for (const [itemId, art] of [[run.setTeil, 'Set-Teil gefunden'], [run.setTeilExtra, 'Versprochenes Set-Teil']] as const) {
      if (!itemId) continue;
      run.loot[itemId] = (run.loot[itemId] ?? 0) + 1;
      run.combatLog.push(`✦ ${art}: ${ITEM_DEFS[itemId]?.name ?? itemId} (${setTeilHinweis(state, itemId, davor)})`);
      davor.push(itemId);
    }
  }
  return [run.setTeil, run.setTeilExtra].filter((id): id is string => !!id);
}
