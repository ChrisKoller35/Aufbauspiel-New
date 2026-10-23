// ─── Magic City – Monsterkunde ──────────────────────────────────
// Was das Monsterbuch über die Jagd der Gilde weiss (docs/MONSTERBUCH.md):
// die Jagdstrecke (wie oft jeder Gegner besiegt wurde), die Seiten je Dungeon,
// die Kenntnisstufen, die Beute, die Fähigkeiten nach der Kampfregel und die
// Seitenprämien. Einziger Ort, der die Zusatzfelder `strecke` und `praemien`
// von `state.bestiarium` liest und schreibt; GameState.ts nennt nur
// `discovered` und `defeated`. Gespeichert werden sie mit dem Rest des
// Spielstands (SaveSystem.save, das Schema lässt Zusatzfelder durch). Ohne DOM,
// die Tests rufen alles direkt auf.
// ────────────────────────────────────────────────────────────────

import type { GameState } from '../models/GameState';
import { ENEMY_DEFS, EnemySkillDef } from '../data/enemies';
import { LOOT_TABLE_DEFS } from '../data/lootTables';
import { DUNGEON_GRAPH, ROUTE_DEFS } from '../data/routes';

/** state.bestiarium mit den Feldern, die nur das Monsterbuch kennt */
interface MonsterbuchDaten {
  discovered: string[];
  defeated: string[];
  /** Jagdstrecke: Gegner-ID → wie oft besiegt */
  strecke?: unknown;
  /** Abgeholte Seitenprämien wie `forest_short:erforscht` */
  praemien?: unknown;
}

function daten(state: GameState): MonsterbuchDaten {
  if (!state.bestiarium) state.bestiarium = { discovered: [], defeated: [] };
  return state.bestiarium as MonsterbuchDaten;
}

function istGegner(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ENEMY_DEFS, id);
}

/** Ganze Zahl ≥ 0; Text, NaN und negative Zahlen werden 0, Kommazahlen abgerundet. */
function ganzeZahl(wert: unknown): number {
  return typeof wert === 'number' && Number.isFinite(wert) && wert > 0 ? Math.floor(wert) : 0;
}

/**
 * Die Jagdstrecke, bereinigt: nur Gegner aus ENEMY_DEFS, nur ganze Zahlen ≥ 0. Ein Gegner,
 * der in `defeated` steht, zählt mindestens 1 (Spielstände aus der Zeit vor der Strecke).
 */
export function strecke(state: GameState): Record<string, number> {
  const d = daten(state);
  const roh = typeof d.strecke === 'object' && d.strecke !== null && !Array.isArray(d.strecke)
    ? d.strecke as Record<string, unknown>
    : {};
  const sauber: Record<string, number> = {};
  for (const id of Object.keys(roh)) {
    if (!istGegner(id)) continue;
    const anzahl = ganzeZahl(roh[id]);
    if (anzahl > 0) sauber[id] = anzahl;
  }
  for (const id of d.defeated ?? []) {
    if (typeof id === 'string' && istGegner(id) && !sauber[id]) sauber[id] = 1;
  }
  return sauber;
}

/** Wie oft die Gilde diesen Gegner besiegt hat. */
export function anzahlBesiegt(state: GameState, id: string): number {
  return strecke(state)[id] ?? 0;
}

/** Zählt `anzahl` Siege über diesen Gegner zur Strecke (schreibt die bereinigte Strecke zurück). */
export function zaehleSieg(state: GameState, id: string, anzahl = 1): void {
  if (!istGegner(id) || anzahl <= 0) return;
  const neu = strecke(state);
  neu[id] = (neu[id] ?? 0) + Math.floor(anzahl);
  daten(state).strecke = neu;
}

/** Im Kampf gesehen (oder schon besiegt). */
export function gesichtet(state: GameState, id: string): boolean {
  return (daten(state).discovered ?? []).includes(id) || anzahlBesiegt(state, id) > 0;
}

// ─── Seiten: ein Dungeon je Seite ───────────────────────────────

export interface Seite {
  routeId: string;
  name: string;
  /** Gegner-IDs in der Reihenfolge ihres ersten Auftritts in der Route */
  gegner: string[];
}

/** Wie oft jeder Gegner in einem ganzen Lauf dieser Route vorkommt (aus ROUTE_DEFS). */
export function begegnungenJeLauf(routeId: string): Record<string, number> {
  const zahl: Record<string, number> = {};
  for (const enc of ROUTE_DEFS[routeId]?.encounters ?? []) {
    for (const id of enc.enemies ?? []) {
      if (istGegner(id)) zahl[id] = (zahl[id] ?? 0) + 1;
    }
  }
  return zahl;
}

/** Eine Seite je Dungeon in der Reihenfolge der Karte (DUNGEON_GRAPH, unten nach oben). */
export function seiten(): Seite[] {
  return DUNGEON_GRAPH
    .map(n => ROUTE_DEFS[n.routeId])
    .filter(route => route !== undefined)
    .map(route => ({ routeId: route.id, name: route.name, gegner: Object.keys(begegnungenJeLauf(route.id)) }))
    .filter(seite => seite.gegner.length > 0);
}

/** Alle Gegner, die in mindestens einer Route vorkommen (ohne Doppelte). Nur sie zählt das Monsterbuch. */
export function erreichbareGegner(): string[] {
  return [...new Set(seiten().flatMap(s => s.gegner))];
}

/** Die Seiten, auf denen dieser Gegner lebt (Fundorte). */
export function fundorte(id: string): Seite[] {
  return seiten().filter(s => s.gegner.includes(id));
}

// ─── Kenntnisstufen ─────────────────────────────────────────────

export type Stufe = 'unbekannt' | 'gesichtet' | 'bekannt' | 'erforscht' | 'gemeistert';
const STUFEN: Stufe[] = ['unbekannt', 'gesichtet', 'bekannt', 'erforscht', 'gemeistert'];

/** Siege bis zur Stufe (docs/MONSTERBUCH.md). Dürfen sinken, nicht steigen (Test «erreichbar»). */
export const SCHWELLEN = {
  normal: { bekannt: 1, erforscht: 10, gemeistert: 30 },
  boss: { bekannt: 1, erforscht: 3, gemeistert: 10 },
} as const;

export function schwellenFuer(id: string): { bekannt: number; erforscht: number; gemeistert: number } {
  return ENEMY_DEFS[id]?.isBoss ? SCHWELLEN.boss : SCHWELLEN.normal;
}

export function stufe(state: GameState, id: string): Stufe {
  const besiegt = anzahlBesiegt(state, id);
  const s = schwellenFuer(id);
  if (besiegt >= s.gemeistert) return 'gemeistert';
  if (besiegt >= s.erforscht) return 'erforscht';
  if (besiegt >= s.bekannt) return 'bekannt';
  return gesichtet(state, id) ? 'gesichtet' : 'unbekannt';
}

/** Hat der Gegner mindestens diese Stufe? */
export function mindestens(state: GameState, id: string, ziel: Stufe): boolean {
  return STUFEN.indexOf(stufe(state, id)) >= STUFEN.indexOf(ziel);
}

/** Für den Balken: Siege und die nächste Schwelle (gemeistert: die letzte). */
export function balken(state: GameState, id: string): { besiegt: number; ziel: number } {
  const besiegt = anzahlBesiegt(state, id);
  const s = schwellenFuer(id);
  const ziel = [s.bekannt, s.erforscht, s.gemeistert].find(z => besiegt < z) ?? s.gemeistert;
  return { besiegt: Math.min(besiegt, ziel), ziel };
}

/** Wie viele Gegner der Seite mindestens erforscht bzw. gemeistert sind. */
export function seitenStand(state: GameState, seite: Seite): { gesamt: number; erforscht: number; gemeistert: number } {
  return {
    gesamt: seite.gegner.length,
    erforscht: seite.gegner.filter(id => mindestens(state, id, 'erforscht')).length,
    gemeistert: seite.gegner.filter(id => mindestens(state, id, 'gemeistert')).length,
  };
}

/** Gewonnene Läufe, nach denen jeder Gegner der Route die Stufe hat (alle Gegner besiegt, von null an). */
export function siegeBis(routeId: string, ziel: 'erforscht' | 'gemeistert'): number {
  const begegnungen = begegnungenJeLauf(routeId);
  return Math.max(0, ...Object.entries(begegnungen).map(([id, zahl]) => Math.ceil(schwellenFuer(id)[ziel] / zahl)));
}

// ─── Beute, wie CombatEngine.rollLoot sie zieht ─────────────────

/** Gold je Sieg aus der Beutetabelle (ohne Klebrige Finger, goldFaktor). */
export function goldSpanne(id: string): { min: number; max: number } {
  const tabelle = LOOT_TABLE_DEFS[ENEMY_DEFS[id]?.lootTableId ?? ''];
  return tabelle ? { ...tabelle.guaranteedGold } : { min: 0, max: 0 };
}

/** Der eine Fund je Sieg: Chance = Gewicht / Summe der Gewichte. */
export function beuteChancen(id: string): { itemId: string; chance: number; minQty: number; maxQty: number }[] {
  const eintraege = LOOT_TABLE_DEFS[ENEMY_DEFS[id]?.lootTableId ?? '']?.entries ?? [];
  const summe = eintraege.reduce((s, e) => s + e.weight, 0);
  return eintraege.map(e => ({ itemId: e.itemId, chance: summe > 0 ? e.weight / summe : 0, minQty: e.minQty, maxQty: e.maxQty }));
}

// ─── Fähigkeiten und Wut, wie CombatEngine sie einsetzt ─────────

/** Deutsche Namen der Fähigkeitsarten (Record: jede Art aus EnemySkillDef braucht einen). */
export const FAEHIGKEIT_ART: Record<EnemySkillDef['effectType'], string> = {
  damage: 'Schaden',
  aoe: 'Flächenschaden',
  heal: 'Heilung',
  buff: 'Stärkung',
  summon: 'Beschwörung',
  drain_air: 'Luftraub',
};

/** Runden, die ein Kampf höchstens dauert (ohne Eilmarsch): processCombat 20, processFortificationCombat 30 */
const KAMPF_RUNDEN = 20;
const BELAGERUNG_RUNDEN = 30;

/** So lange kann ein Kampf mit dem Gegner dauern: in einem Belagerungsraum 30 Runden, sonst 20 */
export function kampfRunden(id: string): number {
  const belagert = Object.values(ROUTE_DEFS).some(route =>
    route.encounters.some(enc => enc.type === 'fortification' && enc.enemies?.includes(id)));
  return belagert ? BELAGERUNG_RUNDEN : KAMPF_RUNDEN;
}

/** Kämpft der Gegner auch ausserhalb von Belagerungsräumen (dort endet der Kampf nach 20 Runden)? */
function kaempftAuchOhneBelagerung(id: string): boolean {
  return Object.values(ROUTE_DEFS).some(route =>
    route.encounters.some(enc => enc.type !== 'fortification' && enc.enemies?.includes(id)));
}

/**
 * In welchen Runden ein Gegner jede seiner Fähigkeiten einsetzt, solange er keinen Zug aussetzt.
 * Regel aus processCombat: In jedem Zug geht er seine Fähigkeiten der Reihe nach durch. Eine mit
 * Abklingzeit zählt eins herunter und wird übersprungen, auch in dem Zug, in dem sie auf 0 fällt;
 * die erste bereite setzt er ein, die Fähigkeiten danach zählen in diesem Zug nicht. Mit
 * Abklingzeit N kommt eine Fähigkeit also frühestens N + 1 Runden später wieder, die zweite und
 * dritte oft noch später. processFortificationCombat zählt gleich für Schaden, Fläche, Heilung und
 * Stärkung, andere Fähigkeiten haben die Gegner der Belagerungsräume nicht. Der Test vergleicht jeden
 * erreichbaren Gegner mit processCombat, die aus Belagerungsräumen auch mit processFortificationCombat.
 */
export function einsatzRunden(skills: EnemySkillDef[], runden = KAMPF_RUNDEN): number[][] {
  const abklingen = skills.map(() => 0);
  const einsaetze: number[][] = skills.map(() => []);
  for (let runde = 1; runde <= runden; runde++) {
    for (let i = 0; i < skills.length; i++) {
      if (abklingen[i] > 0) {
        abklingen[i]--;
        continue;
      }
      einsaetze[i].push(runde);
      abklingen[i] = skills[i].cooldown;
      break;
    }
  }
  return einsaetze;
}

/**
 * Die Einsätze fürs Detailfenster. `runden` erlebt jeder Kampf des Gegners. Kämpft er in Belagerungsräumen
 * (bis Runde `bis` = 30) und auch in gewöhnlichen (bis Runde 20), stehen die Einsätze nach Runde 20 getrennt
 * in `belagerung`, sonst ist `belagerung` leer. Ohne ausgesetzten Zug gerechnet wie `einsatzRunden`.
 */
export function einsatzPlan(id: string, skills: EnemySkillDef[]): { runden: number[][]; belagerung: number[][]; bis: number } {
  const bis = kampfRunden(id);
  const alle = einsatzRunden(skills, bis);
  if (bis === KAMPF_RUNDEN || !kaempftAuchOhneBelagerung(id)) return { runden: alle, belagerung: skills.map(() => []), bis };
  return {
    runden: alle.map(r => r.filter(runde => runde <= KAMPF_RUNDEN)),
    belagerung: alle.map(r => r.filter(runde => runde > KAMPF_RUNDEN)),
    bis,
  };
}

/** Luft, die eine Luftraub-Fähigkeit nimmt: die Tabelle in processCombat, sonst ihre Stärke */
const LUFTRAUB: Record<string, number> = { luftsauger: 10, blasenstoss: 8 };

/** Kämpft der Gegner immer allein (jeder Raum mit ihm hat nur ihn)? Dann heilt seine Heilung nur ihn. */
function kaempftAllein(id: string): boolean {
  return Object.values(ROUTE_DEFS).every(route =>
    route.encounters.every(enc => !enc.enemies?.includes(id) || enc.enemies.length === 1));
}

/**
 * Was eine Fähigkeit im Kampf tut, nach der Regel in processCombat und nicht nach ihrer Beschreibung
 * in enemies.ts: Die verspricht bei Heilung zu kleine Zahlen, bei Stärkung Abwehr und bei
 * Beschwörung Verstärkung. Heilung heilt den Gegner mit den wenigsten Leben, Stärkung und
 * Beschwörung geben immer dem Anwender Angriff (3 bzw. 4 Runden). Schaden trifft auch im
 * Belagerungsraum Helden und nie die Kriegsmaschine: enemyToCombatUnit übernimmt
 * prefersWarMachineTarget nicht. Der Test prüft das am Kampfprotokoll, mit und ohne Katapult.
 */
export function faehigkeitText(id: string, sk: EnemySkillDef): string {
  const zahl = (n: number) => n.toLocaleString('de');
  // Stärke 1 ist genau der Schaden eines normalen Angriffs, sonst ein Vielfaches davon
  const wucht = sk.power === 1
    ? 'mit dem Schaden eines normalen Angriffs'
    : `mit dem ${zahl(sk.power)}-fachen Schaden eines normalen Angriffs`;
  switch (sk.effectType) {
    case 'damage':
      return `Trifft ${sk.target === 'all_players' ? 'alle Helden' : 'einen Helden'} ${wucht}.`;
    case 'aoe':
      // Kein Wort zu drainAirAmount (Druckwelle des Leviathans): enemyToCombatUnit übernimmt das Feld
      // nicht, im Kampf nimmt die Fähigkeit darum keine Luft. Der Test prüft Luft in beide Richtungen.
      return `Trifft alle Helden ${wucht}.`;
    case 'heal':
      return kaempftAllein(id)
        ? `Heilt sich um ${zahl(sk.power)} Leben.`
        : `Heilt den Verbündeten mit den wenigsten Leben um ${zahl(sk.power)}, auch sich selbst.`;
    case 'buff':
      return `Gibt sich selbst ${zahl(sk.power)} Angriff mehr, 3 Runden lang.`;
    case 'summon':
      return `Ruft niemanden herbei, sondern gibt sich selbst ${zahl(sk.power)} Angriff mehr, 4 Runden lang.`;
    case 'drain_air':
      return `Zieht ${zahl(LUFTRAUB[sk.id] ?? sk.power)} Luft aus dem Luftschild, ohne Schaden.`;
  }
}

/**
 * Wahlen unterwegs, welche die Wut des Bosses vorziehen (EncounterChoice.bossWutFrueher, die
 * Sonnenuhr im Morgentor): je Dungeon, in dem der Gegner der Boss ist, die früheste Wut-Runde,
 * wenn jede solche Wahl genommen wird (wie CombatEngine.wutAbRunde, nie vor Runde 1).
 */
export function wutVorziehbar(id: string): { routeId: string; name: string; abRunde: number }[] {
  const wut = ENEMY_DEFS[id]?.enrage;
  if (!wut) return [];
  return Object.values(ROUTE_DEFS).flatMap(route => {
    if (route.bossId !== id) return [];
    const frueher = route.encounters.reduce((summe, enc) =>
      summe + (enc.wahl ? Math.max(enc.wahl.a.bossWutFrueher ?? 0, enc.wahl.b.bossWutFrueher ?? 0) : 0), 0);
    return frueher > 0 ? [{ routeId: route.id, name: route.name, abRunde: Math.max(1, wut.afterRound - frueher) }] : [];
  });
}

// ─── Seitenprämien ──────────────────────────────────────────────

export type PraemienArt = 'erforscht' | 'gemeistert';

/**
 * N: Gold, das ein Sieg in diesem Dungeon im Mittel bringt – Summe über alle Gegner der Route von
 * (min + max) / 2 aus guaranteedGold, ohne goldFaktor, auf 10 gerundet, mindestens 10.
 */
export function praemieGrundbetrag(routeId: string): number {
  let summe = 0;
  for (const [id, zahl] of Object.entries(begegnungenJeLauf(routeId))) {
    const { min, max } = goldSpanne(id);
    summe += zahl * (min + max) / 2;
  }
  return Math.max(10, Math.round(summe / 10) * 10);
}

/** Erforscht: N, gemeistert: 3 × N. */
export function praemieBetrag(routeId: string, art: PraemienArt): number {
  return art === 'gemeistert' ? 3 * praemieGrundbetrag(routeId) : praemieGrundbetrag(routeId);
}

const PRAEMIE_TEXT = /^[A-Za-z0-9_:]+$/;

/** Abgeholte Prämien wie `forest_short:erforscht`, bereinigt (nur Buchstaben, Ziffern, `_` und `:`). */
export function praemien(state: GameState): string[] {
  const roh = daten(state).praemien;
  if (!Array.isArray(roh)) return [];
  return [...new Set(roh.filter((t): t is string => typeof t === 'string' && PRAEMIE_TEXT.test(t)))];
}

export function praemieAbgeholt(state: GameState, routeId: string, art: PraemienArt): boolean {
  return praemien(state).includes(`${routeId}:${art}`);
}

/** Alle Gegner der Seite haben die Stufe, und die Prämie ist noch nicht abgeholt. */
export function praemieFaellig(state: GameState, routeId: string, art: PraemienArt): boolean {
  const seite = seiten().find(s => s.routeId === routeId);
  if (!seite || praemieAbgeholt(state, routeId, art)) return false;
  return seite.gegner.every(id => mindestens(state, id, art));
}

/** Holt die Prämie ab: Gold gutschreiben, einmalig eintragen. Gibt das Gold zurück (0: kein Anspruch). */
export function praemieAbholen(state: GameState, routeId: string, art: PraemienArt): number {
  if (!praemieFaellig(state, routeId, art)) return 0;
  const gold = praemieBetrag(routeId, art);
  state.globalStock.gold = (state.globalStock.gold ?? 0) + gold;
  daten(state).praemien = [...praemien(state), `${routeId}:${art}`];
  return gold;
}
