// ─── Magic City – Rangliste mit Rivalen ─────────────────────────
// Neun Computer-Gilden (data/rivalen.ts) klettern auf der Dungeon-Karte mit.
// Die Uhr des Rennens sind die Expeditionen: Jede beendete Expedition ist eine
// Runde, in der auch jede Rivalen-Gilde ein Stück weiterkommt. Wer Pause macht,
// verliert nichts. Die Rivalen sind etwa so stark wie die eigene Gilde: Sie
// bezwingen Dungeons bis zu deren höchster Ebene (die Spitze eine mehr), wer
// weiterkommt, zieht sie also mit.
// Gipfel-Rangliste: Höhe des höchsten bezwungenen Dungeons, dann Sterne.
// Wochenwertung (Kalenderwoche): Ruhm aus den eigenen Expeditionen gegen den
// Wochenruhm der Rivalen, der ab Montag feststeht. Platz 1 bis 3 bekommen eine
// Ruhmestruhe. Der Zufall ist fest: Nach dem Neuladen steht jede Gilde am selben
// Ort, und keine fällt je zurück. Anleitung und Eichung: docs/RANGLISTE.md.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { ExpeditionRun, dungeonBezwungen } from '../models/ExpeditionRun';
import { RanglisteStand, WochenErgebnis } from '../models/RanglisteStand';
import { DUNGEON_GRAPH, ROUTE_DEFS, isRouteAvailable } from '../data/routes';
import { ENEMY_DEFS } from '../data/enemies';
import { LOOT_TABLE_DEFS } from '../data/lootTables';
import { setFuerRoute, setTeilIds } from '../data/dungeonSets';
import { RIVALEN, RivaleDef, EIGENE_GILDE } from '../data/rivalen';
import { SeededRNG } from '../utils/RNG';
import { bezwungeneDungeons, merkeBezwungen } from './Bezwungen';
import { besitz } from './DungeonSets';

export const TAG_MS = 86_400_000;
/** Unterer Rand der Dungeon-Karte: Höhe in Metern = KARTEN_BODEN − y */
const KARTEN_BODEN = 2600;
/** So viele Wochenergebnisse bleiben im Verlauf */
const VERLAUF_LAENGE = 10;
/** So weit schaut die Rangliste voraus, wer dich bald überholt */
const VORSCHAU_RUNDEN = 30;

// ── Karte ──

const KNOTEN = new Map(DUNGEON_GRAPH.map(n => [n.routeId, n]));

/** Vorgänger jedes Dungeons auf der Karte (wer zu ihm führt) */
const VORGAENGER = new Map<string, string[]>();
for (const n of DUNGEON_GRAPH) {
  for (const ziel of n.leadsTo) VORGAENGER.set(ziel, [...(VORGAENGER.get(ziel) ?? []), n.routeId]);
}

/** Der Startpunkt ganz unten */
const START_DUNGEON = DUNGEON_GRAPH.reduce((a, b) => (b.y > a.y ? b : a)).routeId;

/** Höhe eines Dungeons in Metern: je weiter oben auf der Karte, desto höher */
export function dungeonHoehe(routeId: string): number {
  const knoten = KNOTEN.get(routeId);
  return knoten ? KARTEN_BODEN - knoten.y : 0;
}

/** Sterne eines Dungeons = seine Ebene (so steht es unter jedem Dungeon auf der Karte) */
export function dungeonSterne(routeId: string): number {
  return ROUTE_DEFS[routeId]?.tier ?? 0;
}

/** Mühe, die eine Rivalen-Gilde für einen Dungeon braucht: höhere Ebenen dauern deutlich länger */
export function dungeonMuehe(routeId: string): number {
  return Math.pow(dungeonSterne(routeId), 1.5);
}

/** Darf eine Gilde mit diesen Siegen den Dungeon betreten? Weg auf der Karte und Boss-Bedingungen (ohne Gildenrang). */
function darfBetreten(routeId: string, besiegt: Set<string>): boolean {
  const weg = routeId === START_DUNGEON || (VORGAENGER.get(routeId) ?? []).some(v => besiegt.has(v));
  if (!weg) return false;
  const bosse = new Set([...besiegt].map(id => ROUTE_DEFS[id]?.bossId).filter((b): b is string => !!b));
  return (ROUTE_DEFS[routeId]?.unlockCondition?.bossesDefeated ?? []).every(b => bosse.has(b));
}

/** Ist a für diese Gilde die bessere Wahl als b? */
function lieber(rivale: RivaleDef, a: string, b: string): boolean {
  const ha = dungeonHoehe(a), hb = dungeonHoehe(b);
  const ea = dungeonSterne(a), eb = dungeonSterne(b);
  switch (rivale.stil) {
    case 'stuermer': if (ha !== hb) return ha > hb; break;
    case 'gruendlich': if (ha !== hb) return ha < hb; break;
    case 'ausgewogen':
      if (ea !== eb) return ea < eb;
      if (ha !== hb) return ha > hb;
      break;
  }
  return a < b;
}

/** Steht der Dungeon in dieser Runde schon auf der Karte? */
function aufDerKarte(stand: RanglisteStand, routeId: string, runde: number): boolean {
  return (stand.bekannt[routeId] ?? 0) <= runde;
}

/** Der nächste Dungeon der Gilde (höchstens auf Ebene `maxEbene`); null: keiner mehr frei */
function naechstesZiel(rivale: RivaleDef, besiegt: Set<string>, stand: RanglisteStand, runde: number, maxEbene = Infinity): string | null {
  const frei = DUNGEON_GRAPH
    .map(n => n.routeId)
    .filter(id => !besiegt.has(id) && aufDerKarte(stand, id, runde) && dungeonSterne(id) <= maxEbene && darfBetreten(id, besiegt));
  if (frei.length === 0) return null;
  const vorgezogen = frei.filter(id => rivale.vorliebe?.some(v => id.startsWith(v)));
  const auswahl = vorgezogen.length > 0 ? vorgezogen : frei;
  return auswahl.reduce((best, id) => (lieber(rivale, id, best) ? id : best));
}

// ── Zufall mit festem Samen ──

function zufall(...teile: (string | number)[]): number {
  let h = 2166136261;
  for (const zeichen of teile.join('|')) {
    h ^= zeichen.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return new SeededRNG(h).next();
}

// ── Das Rennen der Rivalen ──

export interface RivalenLauf {
  rivale: RivaleDef;
  /** Bezwungene Dungeons in ihrer Reihenfolge mit der Runde des Siegs (0: schon beim Start) */
  siege: { routeId: string; runde: number }[];
}

/** Höchste Ebene der eigenen Gilde im Lauf des Rennens: ab Runde `runde` gilt `ebene` (aufsteigend) */
export type EbenenVerlauf = { runde: number; ebene: number }[];

/** Wann die eigene Gilde welche Ebene erreicht hat (aus dem Merker der bezwungenen Dungeons) */
export function spielerEbenen(state: GameState, merker = bezwungeneDungeons(state)): EbenenVerlauf {
  const siege = Object.entries(merker)
    .filter(([id]) => KNOTEN.has(id))
    .sort((a, b) => a[1] - b[1]);
  const verlauf: EbenenVerlauf = [{ runde: 0, ebene: 0 }];
  for (const [id, runde] of siege) {
    const letzte = verlauf[verlauf.length - 1];
    if (dungeonSterne(id) <= letzte.ebene) continue;
    if (letzte.runde === runde) letzte.ebene = dungeonSterne(id);
    else verlauf.push({ runde, ebene: dungeonSterne(id) });
  }
  return verlauf;
}

/** Bis zu welcher Ebene die Gilde in dieser Runde Dungeons bezwingen kann */
function ebenenGrenze(rivale: RivaleDef, ebenen: EbenenVerlauf, runde: number): number {
  let ebene = 0;
  for (const e of ebenen) if (e.runde <= runde) ebene = e.ebene;
  return Math.max(2, ebene) + rivale.ebeneUeberDir;
}

/**
 * Womit die Gilde ins Rennen geht: so viele Dungeons ihrer Reihenfolge, wie in ihren Startvorsprung
 * passen, aber nur bis zu ihrer Ebenen-Grenze. So steht beim Start keine Gilde schon ganz oben, wo
 * die eigene Gilde noch gar nicht hindarf.
 */
function startSiege(rivale: RivaleDef, stand: RanglisteStand): string[] {
  const ziel = stand.startSterne + rivale.vorsprung;
  const maxEbene = ebenenGrenze(rivale, [{ runde: 0, ebene: stand.startEbene }], 0);
  const besiegt = new Set<string>();
  let sterne = 0;
  for (;;) {
    const naechster = naechstesZiel(rivale, besiegt, stand, 0, maxEbene);
    if (!naechster || sterne + dungeonSterne(naechster) > ziel) break;
    besiegt.add(naechster);
    sterne += dungeonSterne(naechster);
  }
  return [...besiegt];
}

/** Wie weit der Lauf einer Gilde schon gerechnet ist */
interface Zwischenstand {
  runde: number;
  besiegt: Set<string>;
  siege: { routeId: string; runde: number }[];
  muehe: number;
  ziel: string | null;
}

/**
 * Bereits gerechnete Läufe. Der Lauf hängt nur von der Gilde, dem Stand (Samen, Start, neue Dungeons)
 * und den Ebenen der eigenen Gilde ab, nicht vom Zeitpunkt der Frage: Jede Anzeige rechnet so nur die
 * neuen Runden.
 */
const ZWISCHENSTAENDE = new Map<string, Zwischenstand>();

function laufSchluessel(rivale: RivaleDef, stand: RanglisteStand, ebenen: EbenenVerlauf): string {
  const neu = Object.keys(stand.bekannt).filter(id => stand.bekannt[id] > 0).sort().map(id => `${id}:${stand.bekannt[id]}`);
  return [
    rivale.id, rivale.stil, rivale.tempo, rivale.ebeneUeberDir, rivale.laune, rivale.vorsprung, (rivale.vorliebe ?? []).join('+'),
    stand.samen, stand.startSterne, stand.startEbene, neu.join(','), ebenen.map(e => `${e.runde}:${e.ebene}`).join(','),
  ].join('|');
}

/**
 * Wo die Gilde nach Runde `bisRunde` steht. Jede Runde sammelt sie Mühe nach Tempo und Laune
 * (fester Zufall je Gilde und Runde); reicht die Mühe für ihren nächsten Dungeon, ist er bezwungen.
 * Sie nimmt nur Dungeons bis zu ihrer Ebenen-Grenze (die eigene Gilde zieht sie mit), und ein neuer
 * Dungeon zählt erst ab der Runde, in der er auf die Karte kam. Wer an der Grenze oder oben wartet,
 * spart keine Mühe an: Keine Gilde springt hinauf, wenn die Grenze steigt oder die Karte wächst.
 */
export function rivalenLauf(rivale: RivaleDef, stand: RanglisteStand, ebenen: EbenenVerlauf, bisRunde = stand.runde): RivalenLauf {
  const schluessel = laufSchluessel(rivale, stand, ebenen);
  let z = ZWISCHENSTAENDE.get(schluessel);
  if (!z) {
    const besiegt = new Set(startSiege(rivale, stand));
    z = { runde: 0, besiegt, siege: [...besiegt].map(routeId => ({ routeId, runde: 0 })), muehe: 0, ziel: null };
    if (ZWISCHENSTAENDE.size >= 200) ZWISCHENSTAENDE.clear();
    ZWISCHENSTAENDE.set(schluessel, z);
  }
  // Ohne Ziel (alles bis zur Grenze bezwungen) wird erst wieder gesucht, wenn ein neuer Dungeon auf die
  // Karte kommt oder die eigene Gilde eine neue Ebene erreicht
  const neuSuchen = new Set([1, ...Object.values(stand.bekannt), ...ebenen.map(e => e.runde)]);
  for (let runde = z.runde + 1; runde <= bisRunde; runde++) {
    const grenze = ebenenGrenze(rivale, ebenen, runde);
    if (!z.ziel && neuSuchen.has(runde)) z.ziel = naechstesZiel(rivale, z.besiegt, stand, runde, grenze);
    let neu = rivale.tempo * (1 + rivale.laune * (2 * zufall('form', rivale.id, stand.samen, runde) - 1));
    while (z.ziel) {
      const fehlt = dungeonMuehe(z.ziel) - z.muehe;
      if (neu < fehlt) {
        z.muehe += neu;
        break;
      }
      neu -= fehlt;
      z.muehe = 0;
      z.besiegt.add(z.ziel);
      z.siege.push({ routeId: z.ziel, runde });
      z.ziel = naechstesZiel(rivale, z.besiegt, stand, runde, grenze);
    }
    z.runde = runde;
  }
  return { rivale, siege: z.siege.filter(s => s.runde <= bisRunde) };
}

// ── Stand einer Gilde ──

export interface GildenStand {
  id: string;
  name: string;
  wappen: string;
  stadt: string;
  /** Name in der Mehrzahl («Die Sturmadler ziehen …») */
  mehrzahl: boolean;
  /** Nur bei Rivalen */
  motto?: string;
  farbe?: string;
  spieler: boolean;
  bezwungen: string[];
  /** Höchster bezwungener Dungeon (null: noch keiner) */
  hoechster: string | null;
  hoehe: number;
  sterne: number;
  /** Höchste Ebene unter den bezwungenen Dungeons (mindestens 1) */
  ebene: number;
}

function gildenStand(kopf: Omit<GildenStand, 'bezwungen' | 'hoechster' | 'hoehe' | 'sterne' | 'ebene'>, bezwungen: string[]): GildenStand {
  const hoechster = bezwungen.reduce<string | null>((a, b) => (a === null || dungeonHoehe(b) > dungeonHoehe(a) ? b : a), null);
  return {
    ...kopf,
    bezwungen,
    hoechster,
    hoehe: hoechster ? dungeonHoehe(hoechster) : 0,
    sterne: bezwungen.reduce((s, id) => s + dungeonSterne(id), 0),
    ebene: Math.max(1, ...bezwungen.map(dungeonSterne)),
  };
}

function rivaleStand(lauf: RivalenLauf, runde: number): GildenStand {
  const { rivale } = lauf;
  return gildenStand(
    {
      id: rivale.id, name: rivale.name, wappen: rivale.wappen, stadt: rivale.stadt, mehrzahl: rivale.mehrzahl,
      motto: rivale.motto, farbe: rivale.farbe, spieler: false,
    },
    lauf.siege.filter(s => s.runde <= runde).map(s => s.routeId),
  );
}

/** Die eigene Gilde nach Runde `runde` */
function spielerStand(state: GameState, runde = Infinity, merker = bezwungeneDungeons(state)): GildenStand {
  const bezwungen = Object.entries(merker)
    .filter(([id, r]) => r <= runde && KNOTEN.has(id))
    .map(([id]) => id);
  return gildenStand({ ...EIGENE_GILDE, spieler: true }, bezwungen);
}

/** Reihenfolge der Gipfel-Rangliste: höher zuerst, dann mehr Sterne, bei Gleichstand die eigene Gilde */
function vorGipfel(a: GildenStand, b: GildenStand): number {
  return b.hoehe - a.hoehe || b.sterne - a.sterne || Number(b.spieler) - Number(a.spieler) || a.name.localeCompare(b.name);
}

/** Steht a in der Gipfel-Rangliste vor b? */
function stehtVor(a: GildenStand, b: GildenStand): boolean {
  return vorGipfel(a, b) < 0;
}

// ── Stand anlegen und nachführen ──

/**
 * Der Stand der Rangliste; legt ihn beim ersten Aufruf an (Start des Rennens).
 * Merkt sich neue Dungeons auf der Karte und schliesst eine vergangene Woche ab.
 */
export function ranglisteStand(state: GameState, jetzt: number): RanglisteStand {
  if (!state.rangliste) {
    const eigene = spielerStand(state);
    const woche = wocheVon(jetzt);
    const stand: RanglisteStand = {
      runde: 0,
      samen: (state.rngSeed ?? 0) >>> 0,
      startSterne: eigene.sterne,
      startEbene: eigene.hoechster ? eigene.ebene : 0,
      bekannt: Object.fromEntries(DUNGEON_GRAPH.map(n => [n.routeId, 0])),
      woche: { id: woche.id, start: woche.start, ruhm: 0, ziele: {} },
      offen: [],
      verlauf: [],
      pokale: { gold: 0, silber: 0, bronze: 0 },
    };
    // Die erste Woche hat schon begonnen: Die Rivalen holen nur den Rest davon
    stand.woche.ziele = wochenZiele(state, stand, woche.id, (woche.ende - jetzt) / (woche.ende - woche.start));
    state.rangliste = stand;
  }
  const stand = state.rangliste;

  // Neuer Dungeon auf der Karte: Ab der nächsten Runde dürfen auch die Rivalen hinein
  for (const n of DUNGEON_GRAPH) {
    if (!(n.routeId in stand.bekannt)) stand.bekannt[n.routeId] = stand.runde + 1;
  }
  wocheAbschliessen(state, stand, jetzt);
  return stand;
}

function alleRivalen(state: GameState, stand: RanglisteStand, bisRunde = stand.runde): RivalenLauf[] {
  const ebenen = spielerEbenen(state);
  return RIVALEN.map(r => rivalenLauf(r, stand, ebenen, bisRunde));
}

// ── Gipfel-Rangliste ──

/** Alle zehn Gilden, sortiert: höher zuerst, dann mehr Sterne, bei Gleichstand die eigene Gilde */
export function gipfelRangliste(state: GameState, jetzt: number): GildenStand[] {
  const stand = ranglisteStand(state, jetzt);
  return [spielerStand(state), ...alleRivalen(state, stand).map(l => rivaleStand(l, stand.runde))].sort(vorGipfel);
}

/** Wer wo steht: Dungeon → Gilden, deren höchster bezwungener Dungeon er ist (die eigene zuerst, dann nach Platz) */
export function gildenAufKarte(state: GameState, jetzt: number): Map<string, GildenStand[]> {
  const karte = new Map<string, GildenStand[]>();
  const gilden = gipfelRangliste(state, jetzt).sort((a, b) => Number(b.spieler) - Number(a.spieler));
  for (const g of gilden) {
    if (g.hoechster) karte.set(g.hoechster, [...(karte.get(g.hoechster) ?? []), g]);
  }
  return karte;
}

/**
 * Der Dungeon, mit dem die eigene Gilde mit der nächsten Expedition an `gilde` vorbeizieht: noch nicht
 * bezwungen, jetzt spielbar, die niedrigste Ebene, darin der niedrigste. Die Rivalen ziehen in derselben
 * Runde weiter, und ein höherer Sieg hebt auch ihre Ebenen-Grenze: Es zählt ihr Stand nach dieser Runde.
 * null: Kein einzelner Sieg reicht.
 */
export function wegVorbei(state: GameState, gilde: GildenStand, jetzt: number): string | null {
  const stand = ranglisteStand(state, jetzt);
  const rivale = RIVALEN.find(r => r.id === gilde.id);
  const merker = bezwungeneDungeons(state);
  const runde = stand.runde + 1;
  const wege = DUNGEON_GRAPH
    .map(n => n.routeId)
    .filter(id => !(id in merker) && isRouteAvailable(ROUTE_DEFS[id], state))
    .filter(id => {
      const mitSieg = { ...merker, [id]: runde };
      const danach = rivale ? rivaleStand(rivalenLauf(rivale, stand, spielerEbenen(state, mitSieg), runde), runde) : gilde;
      return stehtVor(spielerStand(state, Infinity, mitSieg), danach);
    });
  if (wege.length === 0) return null;
  return wege.reduce((a, b) =>
    (dungeonSterne(b) < dungeonSterne(a) || (dungeonSterne(b) === dungeonSterne(a) && dungeonHoehe(b) < dungeonHoehe(a)) ? b : a));
}

export interface Bedrohung {
  gilde: GildenStand;
  /** In so vielen Expeditionen zieht sie vorbei */
  runden: number;
  /** Mit diesem Dungeon */
  routeId: string;
}

/**
 * Wer zieht als Nächstes an der eigenen Gilde vorbei, wenn sie nichts Neues bezwingt?
 * Die Rivalen klettern nach festem Zufall, die Vorschau stimmt also (solange keine Karte dazukommt).
 */
export function naechsteBedrohung(state: GameState, jetzt: number): Bedrohung | null {
  const stand = ranglisteStand(state, jetzt);
  const du = spielerStand(state);
  let beste: Bedrohung | null = null;
  for (const lauf of alleRivalen(state, stand, stand.runde + VORSCHAU_RUNDEN)) {
    if (stehtVor(rivaleStand(lauf, stand.runde), du)) continue;
    const sieg = lauf.siege.find(s => s.runde > stand.runde && stehtVor(rivaleStand(lauf, s.runde), du));
    if (sieg && (!beste || sieg.runde - stand.runde < beste.runden)) {
      beste = { gilde: rivaleStand(lauf, sieg.runde), runden: sieg.runde - stand.runde, routeId: sieg.routeId };
    }
  }
  return beste;
}

// ── Wochenwertung ──

export interface Woche {
  /** z. B. '2026-W43' */
  id: string;
  /** Montag 00:00 (Ortszeit) */
  start: number;
  /** Montag 00:00 der nächsten Woche */
  ende: number;
}

/** Kalenderwoche (ISO, Montag bis Sonntag in Ortszeit) eines Zeitpunkts */
export function wocheVon(zeit: number): Woche {
  const d = new Date(zeit);
  const seitMontag = (d.getDay() + 6) % 7;
  const montag = new Date(d.getFullYear(), d.getMonth(), d.getDate() - seitMontag);
  const naechsterMontag = new Date(d.getFullYear(), d.getMonth(), d.getDate() - seitMontag + 7);
  // Der Donnerstag der Woche bestimmt das Jahr (ISO 8601)
  const donnerstag = new Date(d.getFullYear(), d.getMonth(), d.getDate() - seitMontag + 3);
  const jahr = donnerstag.getFullYear();
  const tagImJahr = Math.round((donnerstag.getTime() - new Date(jahr, 0, 1).getTime()) / TAG_MS);
  const nummer = Math.floor(tagImJahr / 7) + 1;
  return { id: `${jahr}-W${String(nummer).padStart(2, '0')}`, start: montag.getTime(), ende: naechsterMontag.getTime() };
}

/**
 * Wochenruhm jeder Rivalen-Gilde, fest ab Wochenbeginn: so viel wie ihre Siege pro Woche im Dungeon,
 * der der eigenen Gilde am meisten Ruhm bringt, mal ihre Form der Woche (nach Laune: meist 85 % bis
 * 115 %, die Glückspilze schwanken mehr). So bleibt die Woche ein Wettlauf im Fleiss, egal wie weit
 * oben die eigene Gilde steht. `anteil`: so viel der Woche bleibt noch (die erste beginnt mitten drin).
 */
function wochenZiele(state: GameState, stand: RanglisteStand, wocheId: string, anteil = 1): Record<string, number> {
  const ruhm = ruhmJeSieg(besterRuhmDungeon(state));
  const ziele: Record<string, number> = {};
  for (const rivale of RIVALEN) {
    const form = 1 + rivale.laune * 0.375 * (2 * zufall('woche', rivale.id, stand.samen, wocheId) - 1);
    ziele[rivale.id] = Math.round((rivale.wochenSiege * ruhm * form * Math.min(1, Math.max(0, anteil))) / 10) * 10;
  }
  return ziele;
}

export interface WochenZeile {
  id: string;
  name: string;
  wappen: string;
  mehrzahl: boolean;
  spieler: boolean;
  ruhm: number;
}

function wochenZeilen(stand: RanglisteStand): WochenZeile[] {
  const zeilen: WochenZeile[] = [
    { ...EIGENE_GILDE, spieler: true, ruhm: stand.woche.ruhm },
    ...RIVALEN.map(r => ({ id: r.id, name: r.name, wappen: r.wappen, mehrzahl: r.mehrzahl, spieler: false, ruhm: stand.woche.ziele[r.id] ?? 0 })),
  ];
  return zeilen.sort((a, b) => b.ruhm - a.ruhm || Number(b.spieler) - Number(a.spieler) || a.name.localeCompare(b.name));
}

function wochenPlatz(stand: RanglisteStand): number {
  return wochenZeilen(stand).findIndex(z => z.spieler) + 1;
}

/** Die laufende Wochenwertung: alle zehn Gilden, meister Ruhm zuerst, bei Gleichstand die eigene Gilde */
export function wochenRangliste(state: GameState, jetzt: number): { woche: Woche; zeilen: WochenZeile[] } {
  const stand = ranglisteStand(state, jetzt);
  // Die gespeicherte Woche, auch wenn die Uhr zurückgestellt wurde
  return { woche: wocheVon(Math.max(jetzt, stand.woche.start)), zeilen: wochenZeilen(stand) };
}

/**
 * Ruhm einer Expedition: Ebene des Dungeons × geschaffte Räume, bei einem Sieg doppelt,
 * beim allerersten Sieg in diesem Dungeon noch einmal doppelt. So lohnt sich das Klettern
 * mehr als kurze Dungeons abzugrasen, und auch ein mutiger Versuch ganz oben bringt etwas.
 */
export function expeditionsRuhm(run: ExpeditionRun, erstbezwingung: boolean): number {
  if (!KNOTEN.has(run.routeId)) return 0;
  const raeume = run.status === 'victory'
    ? run.rooms.length
    : Math.max(0, run.rooms.filter(r => r.completed).length - (run.status === 'defeat' ? 1 : 0));
  const sieg = dungeonBezwungen(run) ? 2 : 1;
  return dungeonSterne(run.routeId) * raeume * sieg * (erstbezwingung ? 2 : 1);
}

/** Ruhm für einen Sieg in diesem Dungeon (ohne den doppelten Ruhm des ersten Siegs) */
export function ruhmJeSieg(routeId: string): number {
  return dungeonSterne(routeId) * (ROUTE_DEFS[routeId]?.rooms ?? 0) * 2;
}

/** Der bezwungene Dungeon mit dem meisten Ruhm je Sieg (der unterste, solange noch keiner bezwungen ist) */
export function besterRuhmDungeon(state: GameState): string {
  return Object.keys(bezwungeneDungeons(state))
    .filter(id => KNOTEN.has(id))
    .reduce((a, b) => (ruhmJeSieg(b) > ruhmJeSieg(a) ? b : a), START_DUNGEON);
}

/** Der Dungeon, aus dessen Boss-Beute die Ruhmestruhe würfelt: der höchste bezwungene mit Boss */
export function truhenDungeon(state: GameState): string {
  const mitBoss = spielerStand(state).bezwungen.filter(id => !!ROUTE_DEFS[id]?.bossId);
  if (mitBoss.length === 0) return DUNGEON_GRAPH.find(n => ROUTE_DEFS[n.routeId]?.bossId)!.routeId;
  return mitBoss.reduce((a, b) => (dungeonHoehe(b) > dungeonHoehe(a) ? b : a));
}

/** Inhalt der Ruhmestruhe je Platz: Würfe auf die Boss-Beute (Gold und ein Gegenstand je Wurf), Kristallsplitter, Set-Teil */
export const RUHMESTRUHEN = [
  { pokal: 'gold', wuerfe: 4, kristalle: 5, setTeil: true },
  { pokal: 'silber', wuerfe: 3, kristalle: 3, setTeil: false },
  { pokal: 'bronze', wuerfe: 2, kristalle: 2, setTeil: false },
] as const;

/**
 * Ruhmestruhe für Platz 1 bis 3 (RUHMESTRUHEN), gewürfelt aus der Boss-Beute des höchsten bezwungenen
 * Dungeons. Platz 1 bekommt dazu ein Teil aus dessen Set, eins, das der Gilde noch fehlt, falls es eins gibt.
 */
export function ruhmestruhe(state: GameState, platz: number, samen: string): Pick<WochenErgebnis, 'belohnung' | 'pokal'> {
  const art = RUHMESTRUHEN[platz - 1];
  if (!art) return { pokal: null, belohnung: {} };
  const dungeon = truhenDungeon(state);
  const tabelle = LOOT_TABLE_DEFS[ENEMY_DEFS[ROUTE_DEFS[dungeon].bossId ?? '']?.lootTableId ?? ''];
  const rng = new SeededRNG(Math.floor(zufall('truhe', samen) * 2147483646) + 1);
  const belohnung: Record<string, number> = { crystal_shard: art.kristalle };
  for (let i = 0; i < art.wuerfe && tabelle; i++) {
    belohnung.gold = (belohnung.gold ?? 0) + rng.nextInt(tabelle.guaranteedGold.min, tabelle.guaranteedGold.max);
    if (tabelle.entries.length === 0) continue;
    const eintrag = tabelle.entries[rng.weightedPick(tabelle.entries.map(e => e.weight))];
    belohnung[eintrag.itemId] = (belohnung[eintrag.itemId] ?? 0) + rng.nextInt(eintrag.minQty, eintrag.maxQty);
  }
  const set = art.setTeil ? setFuerRoute(dungeon) : undefined;
  if (set) {
    const teile = setTeilIds(set);
    const fehlend = teile.filter(id => besitz(state, id) === 0);
    const teil = rng.pick(fehlend.length > 0 ? fehlend : teile);
    belohnung[teil] = (belohnung[teil] ?? 0) + 1;
  }
  return { pokal: art.pokal, belohnung };
}

/**
 * Ist die gespeicherte Woche vorbei, kommt ihr Ergebnis in den Verlauf (und die Ruhmestruhe zum Abholen).
 * Steht die Uhr vor der gespeicherten Woche (Zeitzone gewechselt, Uhr zurückgestellt), läuft diese weiter.
 */
function wocheAbschliessen(state: GameState, stand: RanglisteStand, jetzt: number): void {
  const aktuell = wocheVon(jetzt);
  if (stand.woche.id === aktuell.id || aktuell.start < stand.woche.start) return;
  if (stand.woche.ruhm > 0) {
    const platz = wochenPlatz(stand);
    const ergebnis: WochenErgebnis = {
      wocheId: stand.woche.id, platz, ruhm: stand.woche.ruhm,
      ...ruhmestruhe(state, platz, `${stand.samen}|${stand.woche.id}`),
    };
    stand.verlauf = [ergebnis, ...stand.verlauf].slice(0, VERLAUF_LAENGE);
    if (ergebnis.pokal) stand.offen.push(ergebnis);
  }
  stand.woche = { id: aktuell.id, start: aktuell.start, ruhm: 0, ziele: wochenZiele(state, stand, aktuell.id) };
}

/** Holt alle offenen Ruhmestruhen ins Lager; gibt zurück, was abgeholt wurde */
export function belohnungenAbholen(state: GameState, jetzt: number): WochenErgebnis[] {
  const stand = ranglisteStand(state, jetzt);
  const abgeholt = stand.offen;
  for (const e of abgeholt) {
    for (const [itemId, menge] of Object.entries(e.belohnung)) {
      state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + menge;
    }
    if (e.pokal) stand.pokale[e.pokal]++;
  }
  stand.offen = [];
  return abgeholt;
}

// ── Nach einer Expedition ──

/** Ein Sieg einer Rivalen-Gilde in dieser Runde */
export interface RivalenSieg {
  wappen: string;
  name: string;
  mehrzahl: boolean;
  routeId: string;
  /** Damit ist sie an der eigenen Gilde vorbeigezogen */
  vorbei: boolean;
}

export interface RanglistenBilanz {
  /** Ruhm aus dieser Expedition */
  ruhm: number;
  /** Erster Sieg der Gilde in diesem Dungeon */
  erstbezwingung: boolean;
  wocheRuhm: number;
  wochePlatz: number;
  /** Platz in der Gipfel-Rangliste vor und nach der Expedition */
  platzVorher: number;
  platzNachher: number;
  /** Gilden, an denen die eigene Gilde gerade vorbeigezogen ist */
  ueberholt: string[];
  /** Was die Rivalen in dieser Runde bezwungen haben */
  rivalen: RivalenSieg[];
}

/**
 * Zählt eine beendete Expedition als Runde: Ein echter Sieg kommt in den Merker der bezwungenen
 * Dungeons, der Ruhm in die Woche, und alle Rivalen klettern eine Runde weiter.
 * Vor dem Eintrag in die Bestenliste aufrufen (erkennt den ersten Sieg).
 */
export function ranglisteNachExpedition(state: GameState, run: ExpeditionRun, jetzt: number): RanglistenBilanz {
  const stand = ranglisteStand(state, jetzt);
  const platzIn = (liste: GildenStand[]): number => liste.findIndex(g => g.spieler) + 1;
  const vorher = gipfelRangliste(state, jetzt);

  const runde = stand.runde + 1;
  const erstbezwingung = KNOTEN.has(run.routeId) && dungeonBezwungen(run) && merkeBezwungen(state, run.routeId, runde);
  const ruhm = expeditionsRuhm(run, erstbezwingung);
  stand.woche.ruhm += ruhm;

  // Erst die eigene Expedition, dann ziehen die Rivalen ihre Runde
  const du = spielerStand(state);
  const laeufe = alleRivalen(state, stand, runde);
  stand.runde = runde;
  const nachher = gipfelRangliste(state, jetzt);

  const rivalen: RivalenSieg[] = [];
  for (const lauf of laeufe) {
    const vorRunde = rivaleStand(lauf, runde - 1);
    for (const sieg of lauf.siege.filter(s => s.runde === runde)) {
      rivalen.push({
        wappen: lauf.rivale.wappen, name: lauf.rivale.name, mehrzahl: lauf.rivale.mehrzahl, routeId: sieg.routeId,
        vorbei: !stehtVor(vorRunde, du) && stehtVor(rivaleStand(lauf, runde), du),
      });
    }
  }

  const platzVorher = platzIn(vorher);
  const platzNachher = platzIn(nachher);
  const ueberholt = vorher.slice(0, platzVorher - 1)
    .filter(g => nachher.findIndex(n => n.id === g.id) > platzNachher - 1)
    .map(g => g.name);
  return {
    ruhm, erstbezwingung,
    wocheRuhm: stand.woche.ruhm,
    wochePlatz: wochenPlatz(stand),
    platzVorher, platzNachher, ueberholt, rivalen,
  };
}

// ── Neuigkeiten ──

export interface Neuigkeit {
  /** Vor so vielen Expeditionen (0: bei der letzten) */
  vor: number;
  wappen: string;
  /** Wer: Name der Gilde */
  wer: string;
  text: string;
  spieler: boolean;
}

/** Die Siege aller Gilden seit dem Start des Rennens, neueste zuerst */
export function neuigkeiten(state: GameState, jetzt: number, anzahl = 6): Neuigkeit[] {
  const stand = ranglisteStand(state, jetzt);
  const laeufe = alleRivalen(state, stand);
  const merker = bezwungeneDungeons(state);
  const du = (runde: number): GildenStand => spielerStand(state, runde, merker);

  // In einer Runde zählt zuerst die eigene Expedition, dann ziehen die Rivalen (neueste zuerst: Rivalen vorn)
  const siege: { routeId: string; runde: number; lauf: RivalenLauf | null }[] = [
    ...Object.entries(merker).filter(([id, runde]) => runde >= 1 && KNOTEN.has(id)).map(([routeId, runde]) => ({ routeId, runde, lauf: null })),
    ...laeufe.flatMap(lauf => lauf.siege.filter(s => s.runde >= 1).map(s => ({ ...s, lauf }))),
  ];
  siege.sort((a, b) => b.runde - a.runde || Number(!!b.lauf) - Number(!!a.lauf));

  return siege.slice(0, anzahl).map(({ routeId, runde, lauf }) => {
    const dungeon = ROUTE_DEFS[routeId]?.name ?? routeId;
    if (!lauf) {
      const vorher = du(runde - 1);
      const nachher = du(runde);
      const vorbei = laeufe
        .filter(l => stehtVor(rivaleStand(l, runde - 1), vorher) && !stehtVor(rivaleStand(l, runde - 1), nachher))
        .map(l => l.rivale.name);
      return {
        vor: stand.runde - runde, wappen: EIGENE_GILDE.wappen, wer: EIGENE_GILDE.name, spieler: true,
        text: `${dungeon} bezwungen${vorbei.length > 0 ? `, vorbei an: ${vorbei.join(', ')}` : ''}`,
      };
    }
    const vorbei = !stehtVor(rivaleStand(lauf, runde - 1), du(runde)) && stehtVor(rivaleStand(lauf, runde), du(runde));
    return {
      vor: stand.runde - runde, wappen: lauf.rivale.wappen, wer: lauf.rivale.name, spieler: false,
      text: `${dungeon} bezwungen${vorbei ? ', jetzt vor dir' : ''}`,
    };
  });
}

// ── Kurzfassung fürs Hauptmenü ──

export function ranglisteKurz(state: GameState, jetzt: number): { platz: number; gilden: number; wochePlatz: number; offen: number } {
  const gipfel = gipfelRangliste(state, jetzt);
  const stand = ranglisteStand(state, jetzt);
  return {
    platz: gipfel.findIndex(g => g.spieler) + 1,
    gilden: gipfel.length,
    wochePlatz: wochenPlatz(stand),
    offen: stand.offen.length,
  };
}
