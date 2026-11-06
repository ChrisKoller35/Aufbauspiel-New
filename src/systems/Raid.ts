// ─── Magic City – Der Raid «Über dem Tag» im Spielstand ─────────
// Aufstellung, Woche, Ernstkämpfe mit Kosten, Truhen, XP und Erfolgszählern, dazu Alrunas Liste (was an der
// Aufstellung gefährlich ist) und der Kriegsrat (20 Proben, ändert nichts). Die Rechnung des Kampfs steht rein in
// RaidKampf.ts, die Zahlen in data/raids.ts, Regeln und Eichung in docs/RAID.md, der Bildschirm in
// ui/screens/RaidScreen.ts.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import type { GuildFighter } from '../models/GuildRoster';
import type { CombatUnit } from '../models/ExpeditionRun';
import type { Feld, RaidStand } from '../models/RaidStand';
import {
  RAID_TEXTE, RaidDef, TRUPP_WIRKUNGEN, TruhenDef, ZENIT, spaltenName, truppKlein, truppName,
} from '../data/raids';
import { DUNGEON_SETS, setTeilIds } from '../data/dungeonSets';
import { LOOT_TABLE_DEFS } from '../data/lootTables';
import { isRouteCompleted } from '../data/routes';
import { SeededRNG } from '../utils/RNG';
import { CombatEngine } from './CombatEngine';
import { GearSystem } from './GearSystem';
import { awardXP } from './HeroProgression';
import { ClassUnlockSystem } from './ClassUnlockSystem';
import { erfolgePruefen } from './AchievementSystem';
import { besitz, getrageneSets, setTeilHinweis } from './DungeonSets';
import { schmiedeStufen } from './Schmiede';
import { wocheVon } from './Rangliste';
import {
  RaidErgebnis, RaidGefallen, Regel, hauptursache, heilFaehigkeit, raidKampf, schlaege, sindNachbarn, spaltenZahl,
  truppVon, vollsteReihe, zeigerSpalte,
} from './RaidKampf';

/** So viele Ernstkämpfe behält der Verlauf */
export const VERLAUF_LAENGE = 10;
/** Proben des Kriegsrats und ihre Samen (gleiche Aufstellung, gleicher Rat) */
export const KRIEGSRAT_PROBEN = 20;
export const kriegsratSamen = (i: number): number => 1000 + i * 7919;

// ── Freischalten, Stand, Woche ──

/** Offen, sobald der Dungeon darunter einmal bezwungen ist (die Pfeiler des Tages) */
export function raidOffen(state: GameState, def: RaidDef = ZENIT): boolean {
  return isRouteCompleted(def.freiAb, state);
}

function neueWoche(jetzt: number): RaidStand['woche'] {
  const woche = wocheVon(jetzt);
  return { id: woche.id, start: woche.start, versuche: 0, halbeTruhe: false, truhe: false };
}

/** Im Raster des Raids? */
function gueltig(feld: Feld | undefined, def: RaidDef): feld is Feld {
  return !!feld && Number.isInteger(feld.reihe) && Number.isInteger(feld.spalte)
    && feld.reihe >= 0 && feld.reihe < def.reihen && feld.spalte >= 0 && feld.spalte < spaltenZahl(def);
}

/** Nur Helden der Gilde, jedes Feld höchstens einmal, höchstens maxHelden (in der Reihenfolge der Gilde) */
function bereinigt(state: GameState, aufstellung: Record<string, Feld>, def: RaidDef): Record<string, Feld> {
  const sauber: Record<string, Feld> = {};
  const belegt = new Set<string>();
  for (const held of state.fighters) {
    const feld = aufstellung[String(held.id)];
    if (!gueltig(feld, def)) continue;
    const k = `${feld.reihe}:${feld.spalte}`;
    if (belegt.has(k) || belegt.size >= def.maxHelden) continue;
    belegt.add(k);
    sauber[String(held.id)] = { reihe: feld.reihe, spalte: feld.spalte };
  }
  return sauber;
}

/**
 * Erster Besuch: alle Helden so, wie sie in der Gilde stehen, vorne voll, dann Mitte. Das ist absichtlich nicht
 * gut; Alrunas Liste hat dazu viel zu sagen.
 */
export function startAufstellung(state: GameState, def: RaidDef = ZENIT): Record<string, Feld> {
  const spalten = spaltenZahl(def);
  const aufstellung: Record<string, Feld> = {};
  state.fighters.slice(0, Math.min(def.maxHelden, def.reihen * spalten)).forEach((held, i) => {
    aufstellung[String(held.id)] = { reihe: Math.floor(i / spalten), spalte: i % spalten };
  });
  return aufstellung;
}

/**
 * Der Raid im Spielstand. Legt ihn beim ersten Aufruf an (mit der Startaufstellung), beginnt eine neue Woche, wenn
 * ihr Montag nach dem gespeicherten liegt (eine zurückgestellte Uhr ändert nichts, wie in der Rangliste), und
 * räumt die Aufstellung auf (entlassene Helden, doppelte Felder).
 */
export function raidStand(state: GameState, jetzt = Date.now(), def: RaidDef = ZENIT): RaidStand {
  if (!state.raid) {
    state.raid = {
      aufstellung: startAufstellung(state, def), woche: neueWoche(jetzt), bestRest: null, versucheGesamt: 0, siege: 0,
      verlauf: [], einleitungGelesen: false, schlussGelesen: false,
    };
  }
  const stand = state.raid;
  const woche = wocheVon(jetzt);
  if (woche.id !== stand.woche.id && woche.start > stand.woche.start) stand.woche = neueWoche(jetzt);
  stand.aufstellung = bereinigt(state, stand.aufstellung, def);
  return stand;
}

/** Montag-Satz fällig: Es gab Ernstkämpfe in früheren Wochen, und diese Woche wurde er noch nicht gezeigt */
export function montagSatz(stand: RaidStand): string | null {
  if (stand.montagGesehen === stand.woche.id || stand.versucheGesamt <= stand.woche.versuche) return null;
  return stand.siege > 0 ? RAID_TEXTE.montagNachSieg : RAID_TEXTE.montagVorSieg;
}

/** Was der Kartenknoten zeigt (ui/screens/DungeonMapScreen.ts) */
export interface RaidKartenZustand {
  offen: boolean;
  /** Zeile unter dem Namen: noch zu, noch kein Versuch, Bestversuch, diese Woche besiegt, wieder aufgezogen */
  zeile: string;
  /** Diese Woche besiegt: Die Uhr steht auf zwölf */
  zwoelf: boolean;
  /** Zenits Truhe wartet diese Woche noch (Goldpunkt am Knoten) */
  truheWartet: boolean;
}

/** Liest nur: legt keinen Stand an und dreht keine Woche weiter (das tut erst der Raid-Bildschirm) */
export function raidKartenZustand(state: GameState, jetzt = Date.now(), def: RaidDef = ZENIT): RaidKartenZustand {
  const k = RAID_TEXTE.karte;
  if (!raidOffen(state, def)) return { offen: false, zeile: k.zu, zwoelf: false, truheWartet: false };
  const stand = state.raid;
  const zwoelf = !!stand && stand.woche.id === wocheVon(jetzt).id && stand.woche.truhe;
  let zeile: string;
  if (zwoelf) zeile = k.besiegtDieseWoche;
  else if (!stand || stand.bestRest === null) zeile = k.keinVersuch;
  else if (stand.siege > 0) zeile = k.aufgezogen;
  else zeile = k.best(restProzent(stand.bestRest));
  return { offen: true, zeile, zwoelf, truheWartet: !zwoelf };
}

/** Die aufgestellten Helden in der Reihenfolge der Gilde */
export function raidTeilnehmer(state: GameState, stand: RaidStand): GuildFighter[] {
  return state.fighters.filter(f => stand.aufstellung[String(f.id)]);
}

/** Text-Schlüssel einer Aufstellung (der letzte Kriegsrat gilt, solange er gleich bleibt) */
export function aufstellungSchluessel(aufstellung: Record<string, Feld>): string {
  return Object.entries(aufstellung).map(([id, f]) => `${id}@${f.reihe}${f.spalte}`).sort().join(',');
}

// ── Aufstellen ──

/**
 * Stellt einen Helden auf ein Feld. Ist es besetzt, tauschen die beiden (kommt er von der Bank, geht der andere
 * auf die Bank). Mit `null` geht er zurück auf die Bank. False, wenn nichts geschah (schon voll, ungültig).
 */
export function setzeHeld(state: GameState, heldId: number, feld: Feld | null, def: RaidDef = ZENIT): boolean {
  if (!state.fighters.some(f => f.id === heldId)) return false;
  const stand = raidStand(state, Date.now(), def);
  const id = String(heldId);
  const alt = stand.aufstellung[id];
  if (feld === null) {
    if (!alt) return false;
    delete stand.aufstellung[id];
    return true;
  }
  if (!gueltig(feld, def) || (alt && alt.reihe === feld.reihe && alt.spalte === feld.spalte)) return false;
  const besetzer = Object.keys(stand.aufstellung)
    .find(k => k !== id && stand.aufstellung[k].reihe === feld.reihe && stand.aufstellung[k].spalte === feld.spalte);
  if (besetzer) {
    if (alt) stand.aufstellung[besetzer] = { ...alt };
    else delete stand.aufstellung[besetzer];
  } else if (!alt && Object.keys(stand.aufstellung).length >= def.maxHelden) {
    return false;
  }
  stand.aufstellung[id] = { reihe: feld.reihe, spalte: feld.spalte };
  stand.aufstellung = bereinigt(state, stand.aufstellung, def);
  return true;
}

/** Alle zurück auf die Bank */
export function aufstellungLeeren(state: GameState, def: RaidDef = ZENIT): void {
  raidStand(state, Date.now(), def).aufstellung = {};
}

// ── Ernstkampf ──

export interface VersuchsLage {
  moeglich: boolean;
  frei: boolean;
  /** Freie Ernstkämpfe, die diese Woche noch übrig sind */
  freiUebrig: number;
  /** Was dieser Ernstkampf kostet (leer, wenn frei) */
  kosten: Record<string, number>;
  /** Warum nicht (für den Knopf) */
  grund?: string;
}

/** Ob und zu welchem Preis jetzt ein Ernstkampf möglich ist */
export function versuchsLage(state: GameState, jetzt = Date.now(), def: RaidDef = ZENIT): VersuchsLage {
  const stand = raidStand(state, jetzt, def);
  const freiUebrig = Math.max(0, def.freieVersucheJeWoche - stand.woche.versuche);
  const frei = freiUebrig > 0;
  const lage: VersuchsLage = { moeglich: true, frei, freiUebrig, kosten: frei ? {} : { ...def.kostenJeVersuch } };
  const t = RAID_TEXTE.bildschirm;
  if (!raidOffen(state, def)) return { ...lage, moeglich: false, grund: t.nochZu };
  if (state.activeExpedition) return { ...lage, moeglich: false, grund: t.unterwegs };
  if (Object.keys(stand.aufstellung).length < def.minHelden) return { ...lage, moeglich: false, grund: t.mindestens(def.minHelden) };
  for (const [itemId, menge] of Object.entries(lage.kosten)) {
    const hat = state.globalStock[itemId] ?? 0;
    if (hat < menge) return { ...lage, moeglich: false, grund: t.zuWenigTagstein(hat, menge) };
  }
  return lage;
}

/** FNV-1a über die Teile (wie `zufall` in Rangliste.ts), als Samen für SeededRNG */
function hash(...teile: (string | number)[]): number {
  let h = 2166136261;
  for (const zeichen of teile.join('|')) {
    h ^= zeichen.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Samen des nächsten Ernstkampfs (und seiner Truhen): Spiel-Samen, Woche und Nummer des Versuchs. Neu laden ändert nichts. */
export function raidSamen(state: GameState, stand: RaidStand, wofuer: 'kampf' | 'truhe' = 'kampf'): number {
  return hash('raid', wofuer, state.rngSeed, stand.woche.id, stand.versucheGesamt);
}

export interface RaidTruhe {
  art: 'halb' | 'sieg' | 'erster';
  name: string;
  text: string;
  /** Was ins Lager kam (Gold als 'gold') */
  inhalt: Record<string, number>;
  /** «Teil 2 von 3» zum Set-Teil, gezählt, bevor es ins Lager kam (für die Truhe) */
  hinweise: Record<string, string>;
}

export interface ErnstkampfErgebnis {
  ergebnis: RaidErgebnis;
  frei: boolean;
  kosten: Record<string, number>;
  truhen: RaidTruhe[];
  xp: { heldId: number; xp: number; levelUps: number; stufe: number }[];
  neueKlassen: string[];
  neueErfolge: string[];
  ersterSieg: boolean;
  /** Bestversuch vor diesem Kampf (null: der erste) */
  bestVorher: number | null;
  neuerBest: boolean;
}

function gutschreiben(state: GameState, dinge: Record<string, number>): void {
  for (const [itemId, menge] of Object.entries(dinge)) {
    if (menge > 0) state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + menge;
  }
}

/**
 * Ein Set-Teil, das der Gilde fehlt (besitz 0), nach der Regel der Truhe: zuerst aus Sets, die ein Teilnehmer zum
 * Teil trägt (im Bereich, oder mit `getrageneAusJederStufe` aus jeder Stufe), dann aus dem Bereich, dann (mit
 * `sonstJedeStufe`) aus jeder Stufe. Null, wenn nichts mehr fehlt.
 */
export function fehlendesSetTeil(
  state: GameState, teilnehmer: GuildFighter[], regel: TruhenDef['setTeil'], rng: SeededRNG,
): string | null {
  const imBereich = (tier: number): boolean => tier >= regel.stufeVon && tier <= regel.stufeBis;
  const fehlt = (id: string): boolean => besitz(state, id) === 0;
  const angefangen = new Map<string, number>();
  for (const held of teilnehmer) {
    for (const { set, teile } of getrageneSets(held.gear)) {
      if (teile < set.teile.length) angefangen.set(set.id, set.tier);
    }
  }
  const getragene = (bereich: boolean): string[] => DUNGEON_SETS
    .filter(set => angefangen.has(set.id) && (!bereich || imBereich(set.tier)))
    .flatMap(set => setTeilIds(set).filter(fehlt));
  const alle = (bereich: boolean): string[] => DUNGEON_SETS
    .filter(set => !bereich || imBereich(set.tier))
    .flatMap(set => setTeilIds(set).filter(fehlt));
  const stufen: (() => string[])[] = [
    () => getragene(!regel.getrageneAusJederStufe),
    () => alle(true),
    ...(regel.sonstJedeStufe ? [() => getragene(false), () => alle(false)] : []),
  ];
  for (const kandidaten of stufen) {
    const liste = kandidaten();
    if (liste.length > 0) return rng.pick(liste);
  }
  return null;
}

/** Zieht eine Truhe und legt ihren Inhalt ins Lager */
export function truheZiehen(
  state: GameState, art: 'halb' | 'sieg', truhe: TruhenDef, teilnehmer: GuildFighter[], rng: SeededRNG,
): RaidTruhe {
  const inhalt: Record<string, number> = {};
  const dazu = (itemId: string, menge: number): void => { inhalt[itemId] = (inhalt[itemId] ?? 0) + menge; };
  if (truhe.gold) dazu('gold', truhe.gold);
  // Je Beutetabelle ihr garantiertes Gold und ein Eintrag, wie die Ruhmestruhe der Rangliste
  for (const id of truhe.wuerfeAus) {
    const tabelle = LOOT_TABLE_DEFS[id];
    if (!tabelle) continue;
    dazu('gold', rng.nextInt(tabelle.guaranteedGold.min, tabelle.guaranteedGold.max));
    if (tabelle.entries.length === 0) continue;
    const eintrag = tabelle.entries[rng.weightedPick(tabelle.entries.map(e => e.weight))];
    dazu(eintrag.itemId, rng.nextInt(eintrag.minQty, eintrag.maxQty));
  }
  const teil = fehlendesSetTeil(state, teilnehmer, truhe.setTeil, rng);
  if (teil) dazu(teil, 1);
  for (const [itemId, menge] of Object.entries(teil ? truhe.dinge : { ...truhe.dinge, ...truhe.ersatz })) dazu(itemId, menge);
  const hinweise = teil ? { [teil]: setTeilHinweis(state, teil) } : {};
  gutschreiben(state, inhalt);
  return { art, name: truhe.name, text: truhe.text, inhalt, hinweise };
}

/** Ein Zähler mehr (Erfolge: docs/ERFOLGE.md) */
const plus = (n: number | undefined): number => (n ?? 0) + 1;

/**
 * Ein Ernstkampf. Bucht zuerst Versuch und Kosten, rechnet dann den Kampf (Samen aus Spielstand, Woche und Versuch,
 * also gleich nach dem Neuladen) und bucht Bestversuch, Verlauf, XP, Zähler, Truhen, den ersten Sieg und Erfolge.
 * Null, wenn er gerade nicht möglich ist (versuchsLage). Speichern muss der Aufrufer.
 */
export function ernstkampf(state: GameState, jetzt = Date.now(), def: RaidDef = ZENIT): ErnstkampfErgebnis | null {
  const lage = versuchsLage(state, jetzt, def);
  if (!lage.moeglich) return null;
  const stand = raidStand(state, jetzt, def);
  const teilnehmer = raidTeilnehmer(state, stand);
  const samen = raidSamen(state, stand);
  const rng = new SeededRNG(raidSamen(state, stand, 'truhe'));
  for (const [itemId, menge] of Object.entries(lage.kosten)) state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) - menge;
  stand.woche.versuche++;
  stand.versucheGesamt++;

  const ergebnis = raidKampf(def, teilnehmer, schmiedeStufen(state), stand.aufstellung, samen);

  const bestVorher = stand.bestRest;
  const neuerBest = bestVorher !== null && ergebnis.zenitRest < bestVorher;
  if (bestVorher === null || ergebnis.zenitRest < bestVorher) stand.bestRest = ergebnis.zenitRest;
  stand.verlauf = [{
    zeit: jetzt, woche: stand.woche.id, sieg: ergebnis.sieg, rest: ergebnis.zenitRest, runden: ergebnis.runden,
    helden: ergebnis.helden, stehend: ergebnis.stehend,
  }, ...stand.verlauf].slice(0, VERLAUF_LAENGE);

  // Jeder Teilnehmer bekommt XP, auch wer gefallen ist; auf Stufe 15 landet es im Lehrbuch
  const xpJe = ergebnis.sieg ? def.xp.sieg : def.xp.niederlage;
  const xp = teilnehmer.map(held => ({ heldId: held.id, xp: xpJe, levelUps: awardXP(held, xpJe), stufe: held.level }));
  const neueKlassen = new ClassUnlockSystem().checkUnlocks(state);

  const stats = state.statistics;
  stats.raid_versuche = plus(stats.raid_versuche);
  if (ergebnis.helden === 4) stats.raid_zu_viert = plus(stats.raid_zu_viert);
  if (ergebnis.sieg) {
    stand.siege++;
    stats.raid_siege = plus(stats.raid_siege);
    if (ergebnis.runden <= def.regeln.mittagAb) stats.raid_punkt_zwoelf = plus(stats.raid_punkt_zwoelf);
    if (ergebnis.stehend >= 5) stats.raid_mehr_als_vier = plus(stats.raid_mehr_als_vier);
  }

  // Wochentruhen: «Was vom Pendel fiel» beim ersten Kampf unter der Hälfte, «Zenits Truhe» beim ersten Sieg
  const truhen: RaidTruhe[] = [];
  if (!stand.woche.halbeTruhe && ergebnis.zenitRest < def.halbUnter) {
    stand.woche.halbeTruhe = true;
    truhen.push(truheZiehen(state, 'halb', def.truhen.halb, teilnehmer, rng));
  }
  if (ergebnis.sieg && !stand.woche.truhe) {
    stand.woche.truhe = true;
    stats.raid_wochen = plus(stats.raid_wochen);
    truhen.push(truheZiehen(state, 'sieg', def.truhen.sieg, teilnehmer, rng));
  }
  const ersterSieg = ergebnis.sieg && stand.siege === 1;
  if (ersterSieg) {
    gutschreiben(state, { [def.ersterSiegBeute]: 1 });
    truhen.push({
      art: 'erster', name: RAID_TEXTE.unruh.name, text: RAID_TEXTE.unruh.text, inhalt: { [def.ersterSiegBeute]: 1 }, hinweise: {},
    });
    if ((state.statistics.tat_pfeiler ?? 0) >= 1) ergebnis.ansagen.push(RAID_TEXTE.ansage.abriss);
  }

  // Ohne Hinweis in der Kopfzeile: das Ergebnis zeigt sie wie die Bilanz einer Expedition (verrät nichts Verstecktes vorher)
  const neueErfolge = erfolgePruefen(state, { hinweis: false });
  return { ergebnis, frei: lage.frei, kosten: lage.kosten, truhen, xp, neueKlassen, neueErfolge, ersterSieg, bestVorher, neuerBest };
}

// ── Kriegsrat ──

export interface RaidRat {
  proben: number;
  siege: number;
  /** Zenits Rest im Schnitt, 0 bis 1 */
  schnittRest: number;
  ursache: { regel: Regel; ort: string; satz: string } | null;
  meistGefallen: { heldId: number; anzahl: number } | null;
  funken: { heldId: number; anzahl: number } | null;
  /** Die erste Probe mit Wiedergabe, für «Einen Probelauf ansehen» */
  probe: RaidErgebnis;
  /** Für welche Aufstellung der Rat gilt */
  schluessel: string;
}

function haeufigster(zaehler: Map<number, number>): { heldId: number; anzahl: number } | null {
  let best: { heldId: number; anzahl: number } | null = null;
  for (const [heldId, anzahl] of zaehler) if (!best || anzahl > best.anzahl) best = { heldId, anzahl };
  return best;
}

/**
 * Der Kriegsrat: 20 Proben mit festen Samen, je Schritt eine (für rechneHaeppchen). Ändert den Spielstand nicht und
 * gibt nichts. Gleiche Aufstellung, gleicher Rat.
 */
export function* raidKriegsrat(state: GameState, def: RaidDef = ZENIT, proben = KRIEGSRAT_PROBEN): Generator<number, RaidRat> {
  const stand = raidStand(state, Date.now(), def);
  const aufstellung = Object.fromEntries(Object.entries(stand.aufstellung).map(([id, f]) => [id, { ...f }]));
  const teilnehmer = raidTeilnehmer(state, stand);
  const stufen = { ...schmiedeStufen(state) };
  let siege = 0;
  let rest = 0;
  let probe: RaidErgebnis | null = null;
  const gefallen: RaidGefallen[] = [];
  const meist = new Map<number, number>();
  const funken = new Map<number, number>();
  let mitternacht = 0;
  for (let i = 0; i < proben; i++) {
    const r = raidKampf(def, teilnehmer, stufen, aufstellung, kriegsratSamen(i), { knapp: i > 0 });
    if (i === 0) probe = r;
    if (r.sieg) siege++;
    if (r.mitternacht) mitternacht++;
    rest += r.zenitRest;
    gefallen.push(...r.gefallen);
    for (const g of r.gefallen) meist.set(g.heldId, (meist.get(g.heldId) ?? 0) + 1);
    if (r.funkenZiel !== null) funken.set(r.funkenZiel, (funken.get(r.funkenZiel) ?? 0) + 1);
    yield i + 1;
  }
  const namen = Object.fromEntries(teilnehmer.map(h => [h.id, h.name]));
  return {
    proben, siege, schnittRest: proben > 0 ? rest / proben : 1,
    ursache: hauptursache(gefallen, namen, mitternacht > proben / 2),
    meistGefallen: haeufigster(meist), funken: haeufigster(funken), probe: probe!,
    schluessel: aufstellungSchluessel(aufstellung),
  };
}

/** Der ganze Kriegsrat in einem Zug (Tests, Werkzeug) */
export function kriegsratRechnen(state: GameState, def: RaidDef = ZENIT, proben = KRIEGSRAT_PROBEN): RaidRat {
  const schritte = raidKriegsrat(state, def, proben);
  let schritt = schritte.next();
  while (!schritt.done) schritt = schritte.next();
  return schritt.value;
}

// ── Alrunas Liste und die Markierungen auf dem Feld ──

export type RaidRolle = 'tank' | 'heil' | 'dps' | 'stuetze';

/** Rolle im Raid nach Klasse (Bank und Feld): Pendelfänger, Heiler, Schaden, Trupp-Stütze */
export function raidRolle(classId: string): RaidRolle {
  if (classId === 'guardian' || classId === 'berserker') return 'tank';
  if (heilFaehigkeit(classId)) return 'heil';
  if (classId === 'bard' || classId === 'necromancer') return 'stuetze';
  return 'dps';
}

export interface RaidHinweis {
  art: 'pendel' | 'zeiger' | 'glocke' | 'funken' | 'trupp' | 'zahl';
  ok: boolean;
  text: string;
  /** Felder, die beim Darüberfahren aufleuchten */
  felder: Feld[];
}

export interface RaidLage {
  /** Aufgestellte Helden mit ihren Kampfwerten (Ausrüstung, Sets, Schmiede, Weg) */
  helden: { held: GuildFighter; einheit: CombatUnit; feld: Feld }[];
  /** Held-Ids, die das Pendel trifft (vorderste besetzte Reihe je Trupp) */
  pendelZiele: number[];
  /** Reihe der Glocke (die vollste, Gleichstand hinten), null ohne Helden */
  glockenReihe: number | null;
  spalten: { spalte: number; anzahl: number; warnung: 'leer' | 'einzeln' | null; name?: string }[];
  /** Funken laut Probelauf bis Runde 3 (Samen des ersten Kriegsrats) */
  funkenZiel: number | null;
  funkenNachbarn: number[];
  trupps: { trupp: number; anzahl: number; heiler: string[] }[];
  hinweise: RaidHinweis[];
}

/** Teamwirkungen, von denen im selben Trupp nur die stärkere zählt (Kampfeffekte: staerksterTraeger) */
const NUR_DIE_STAERKERE = ['phalanx', 'heldenlied', 'kriegssegen', 'hain', 'mondwall', 'schmiedetakt', 'tragkraft', 'seuche', 'schildwall'];

/** Namen für Sätze: «Brom», «Brom und Lia», «Brom, Lia und Sina» */
export const namenListe = (namen: string[]): string =>
  namen.length <= 1 ? (namen[0] ?? '') : `${namen.slice(0, -1).join(', ')} und ${namen[namen.length - 1]}`;

/**
 * Was an der Aufstellung gefährlich ist: Pendel je Trupp, Zeiger je Spalte, Glocke, Funken (Probelauf bis Runde 3),
 * Trupps (Heiler, doppelte Teamwirkungen) und die Zahl. Warnungen zuerst. Ändert nichts.
 */
export function raidLage(state: GameState, def: RaidDef = ZENIT): RaidLage {
  const stand = raidStand(state, Date.now(), def);
  const stufen = schmiedeStufen(state);
  const engine = new CombatEngine(new GearSystem());
  const helden = raidTeilnehmer(state, stand).map(held => ({
    held, einheit: engine.fighterToCombatUnit(held, stufen), feld: stand.aufstellung[String(held.id)],
  }));
  const L = RAID_TEXTE.liste;
  const atk = def.werte.atk;
  const mittag = atk * def.regeln.mittagMal;
  const schutz = def.regeln.flaechenschutz;
  const spalten = spaltenZahl(def);
  const hinweise: RaidHinweis[] = [];
  const felder = (liste: typeof helden): Feld[] => liste.map(h => h.feld);

  // Pendel: je Trupp die vorderste besetzte Reihe
  const pendelZiele: number[] = [];
  for (let t = 0; t < def.truppZahl; t++) {
    const seite = truppKlein(t, def.truppZahl);
    const imTrupp = helden.filter(h => truppVon(h.feld) === t);
    if (imTrupp.length === 0) {
      if (helden.length > 0) {
        const andere = truppKlein((t + 1) % def.truppZahl, def.truppZahl);
        hinweise.push({ art: 'pendel', ok: false, text: L.pendelLeer(seite, andere), felder: [] });
      }
      continue;
    }
    const vorn = Math.min(...imTrupp.map(h => h.feld.reihe));
    const ziele = imTrupp.filter(h => h.feld.reihe === vorn);
    pendelZiele.push(...ziele.map(h => h.held.id));
    const schwach = ziele.reduce((a, b) => (schlaege(atk, b.einheit, false) < schlaege(atk, a.einheit, false) ? b : a));
    const vor = schlaege(atk, schwach.einheit, false);
    if (vor < 3) {
      hinweise.push({
        art: 'pendel', ok: false, felder: felder(ziele),
        text: ziele.length > 1 ? L.pendelViele(seite, ziele.length) : L.pendelZerbrechlich(seite, schwach.held.name, vor, schwach.held.classId),
      });
    } else {
      hinweise.push({
        art: 'pendel', ok: true, felder: felder(ziele),
        text: L.pendelOk(seite, ziele.map(h => h.held.name), schwach.held.name, vor, schlaege(mittag, schwach.einheit, false)),
      });
    }
  }

  // Zeiger: leere Spalten und zerbrechliche Einzelne
  const spaltenLage: RaidLage['spalten'] = [];
  for (let s = 0; s < spalten; s++) {
    const drin = helden.filter(h => h.feld.spalte === s);
    let warnung: 'leer' | 'einzeln' | null = null;
    if (drin.length === 0 && helden.length > 0) {
      warnung = 'leer';
      const runden = Array.from({ length: def.regeln.mitternacht }, (_, i) => i + 1).filter(r => zeigerSpalte(r, spalten) === s);
      hinweise.push({ art: 'zeiger', ok: false, text: L.zeigerLeer(spaltenName(s), runden), felder: [] });
    } else if (drin.length === 1 && schlaege(atk, drin[0].einheit, true, schutz) < 3) {
      warnung = 'einzeln';
      hinweise.push({ art: 'zeiger', ok: false, text: L.zeigerEinzeln(spaltenName(s), drin[0].held.name), felder: felder(drin) });
    }
    spaltenLage.push({ spalte: s, anzahl: drin.length, warnung, name: drin.length === 1 ? drin[0].held.name : undefined });
  }
  if (helden.length > 0 && spaltenLage.every(s => s.warnung === null)) {
    hinweise.push({ art: 'zeiger', ok: true, text: L.zeigerOk, felder: [] });
  }

  // Glocke: die vollste Reihe
  let glockenReihe: number | null = null;
  if (helden.length > 0) {
    glockenReihe = vollsteReihe(helden.map(h => h.feld), def.reihen);
    const dort = helden.filter(h => h.feld.reihe === glockenReihe);
    const namen = dort.map(h => h.held.name);
    const zerbrechlich = dort.find(h => schlaege(mittag, h.einheit, true, schutz) < 2);
    if (dort.length >= 4) hinweise.push({ art: 'glocke', ok: false, text: L.glockeVoll(glockenReihe + 1, namen), felder: felder(dort) });
    else if (zerbrechlich) hinweise.push({ art: 'glocke', ok: false, text: L.glockeZerbrechlich(glockenReihe + 1, zerbrechlich.held.name), felder: felder(dort) });
    else hinweise.push({ art: 'glocke', ok: true, text: L.glockeOk(glockenReihe + 1, namen), felder: felder(dort) });
  }

  // Funken: Probelauf bis Runde 3 mit dem Samen der ersten Kriegsrat-Probe
  let funkenZiel: number | null = null;
  let funkenNachbarn: number[] = [];
  if (helden.length > 0) {
    const probe = raidKampf(def, helden.map(h => h.held), stufen, stand.aufstellung, kriegsratSamen(0), {
      bisRunde: def.regeln.funkenAlle, knapp: true,
    });
    funkenZiel = probe.funkenZiel;
    const ziel = helden.find(h => h.held.id === funkenZiel);
    if (ziel) {
      // Nachbarn nach Feld (der Probelauf kennt nur die, die in Runde 3 noch standen)
      const nachbarn = helden.filter(h => h !== ziel && sindNachbarn(h.feld, ziel.feld));
      funkenNachbarn = nachbarn.map(h => h.held.id);
      hinweise.push(nachbarn.length === 0
        ? { art: 'funken', ok: true, text: L.funkenOk(ziel.held.name), felder: [ziel.feld] }
        : { art: 'funken', ok: false, text: L.funkenNachbarn(ziel.held.name, nachbarn.map(h => h.held.name)), felder: felder([ziel, ...nachbarn]) });
    }
  }

  // Trupps: Heiler und Teamwirkungen (nur im eigenen Trupp)
  const trupps: RaidLage['trupps'] = [];
  for (let t = 0; t < def.truppZahl; t++) {
    const imTrupp = helden.filter(h => truppVon(h.feld) === t);
    const heiler = imTrupp.filter(h => heilFaehigkeit(h.held.classId)).map(h => h.held.name);
    trupps.push({ trupp: t, anzahl: imTrupp.length, heiler });
    if (imTrupp.length === 0) continue;
    const seite = truppName(t, def.truppZahl);
    const traeger = new Map<string, number>();
    for (const h of imTrupp) {
      const ids = new Set((h.einheit.specialEffects ?? []).map(e => e.id).filter(id => id in TRUPP_WIRKUNGEN));
      for (const id of ids) traeger.set(id, (traeger.get(id) ?? 0) + 1);
    }
    const doppelt = [...traeger].filter(([id, n]) => n > 1 && NUR_DIE_STAERKERE.includes(id)).map(([id]) => id);
    if (heiler.length === 0) hinweise.push({ art: 'trupp', ok: false, text: L.truppOhneHeiler(seite), felder: felder(imTrupp) });
    for (const id of doppelt) {
      const mit = imTrupp.filter(h => (h.einheit.specialEffects ?? []).some(e => e.id === id));
      hinweise.push({ art: 'trupp', ok: false, text: L.truppDoppelt(seite, TRUPP_WIRKUNGEN[id]), felder: felder(mit) });
    }
    if (heiler.length > 0 && doppelt.length === 0) {
      hinweise.push({ art: 'trupp', ok: true, text: L.truppOk(seite, [...traeger.keys()].map(id => TRUPP_WIRKUNGEN[id]), heiler), felder: felder(imTrupp) });
    }
  }

  // Zahl: wie viele hinaufgehen (in Ordnung, wenn alle oben sind, die es gibt)
  const moeglich = Math.min(def.maxHelden, state.fighters.length);
  hinweise.push({
    art: 'zahl', ok: helden.length >= def.minHelden && helden.length >= moeglich,
    text: L.zahl(helden.length, def.maxHelden), felder: [],
  });

  return {
    helden, pendelZiele, glockenReihe, spalten: spaltenLage, funkenZiel, funkenNachbarn, trupps,
    hinweise: [...hinweise.filter(h => !h.ok), ...hinweise.filter(h => h.ok)],
  };
}

/** Nur Alrunas Liste */
export function hinweise(state: GameState, def: RaidDef = ZENIT): RaidHinweis[] {
  return raidLage(state, def).hinweise;
}

/** «Zenit bei 47 %»: Rest in ganzen Prozent, aufgerundet (ein Hauch Leben ist nicht null) */
export function restProzent(rest: number): number {
  return rest <= 0 ? 0 : Math.max(1, Math.ceil(rest * 100));
}
