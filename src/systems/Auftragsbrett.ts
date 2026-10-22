// ─── Magic City – Auftragsbrett der Gilde ───────────────────────
// Am Brett im Gildenhaus hängen jeden Tag (Ortszeit, ab Mitternacht) drei Zettel:
// ganz oben einer für die höchsten Dungeons der Gilde, dann einer weiter unten auf
// der Karte, und einer aus der Stadt, meist eine Ware aus den Werkstätten. Wer
// einen Zettel erledigt, bekommt Gildensiegel, Gold und Material; sind alle drei
// erledigt, gibt es Siegel dazu. Siegel löst die Gilde am Brett gegen Set-Teile,
// Material und Kristallsplitter ein. Daneben hängt die Kette «Der Saal der Gilde»:
// ein Kapitel je Boss, von unten nach oben, jedes bringt ein Prunkstück in den
// Trophäensaal. Der Zufall ist fest: Neu laden würfelt nichts neu.
// Zahlen und Texte: data/auftragsbrett.ts, Anleitung: docs/AUFTRAGSBRETT.md.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { Auftrag, AuftragsArt, AuftragsBelohnung, AuftragsbrettStand } from '../models/AuftragsbrettStand';
import { ExpeditionRun, dungeonBezwungen } from '../models/ExpeditionRun';
import { DUNGEON_GRAPH, ROUTE_DEFS, isRouteAvailable, isRouteCompleted } from '../data/routes';
import { ENEMY_DEFS } from '../data/enemies';
import { LOOT_TABLE_DEFS } from '../data/lootTables';
import { ITEM_DEFS } from '../data/items';
import { DungeonSetDef, setFuerRoute, setVonItem } from '../data/dungeonSets';
import { SCHMIEDE_MATERIALIEN, SchmiedeMaterialDef } from '../data/schmiede';
import { dungeonWen, imDungeon } from '../data/dungeonNamen';
import {
  AUFTRAGGEBER, AUFTRAGS_VORLAGEN, GOLD_ANTEIL, LIEFER_AUFSCHLAG, LIEFER_WAREN, MATERIAL_PREIS, SAAL_EINLEITUNG,
  SAAL_KAPITEL, SAAL_SCHLUSS, SAAL_SCHLUSS_SIEGEL, SIEGEL_JE_ART, SPLITTER_MENGE, SPLITTER_PREIS, SaalKapitel,
  TAGESBONUS_SIEGEL, TAUSCH_JE_TAG, ZETTEL_JE_TAG, setTeilPreis,
} from '../data/auftragsbrett';
import { SeededRNG } from '../utils/RNG';
import { bezwungeneDungeons } from './Bezwungen';
import { dungeonHoehe } from './Rangliste';
import { materialJeSieg, SPLITTER } from './Schmiede';
import { nachschub } from './GebaeudeStatus';
import { marktKosten } from './Handel';

// ── Der Tag ──

export interface Tag {
  /** z. B. '2026-10-21' */
  id: string;
  /** Mitternacht (Ortszeit) */
  start: number;
  /** Mitternacht des nächsten Tags */
  ende: number;
}

/** Der Kalendertag eines Zeitpunkts in Ortszeit */
export function tagVon(zeit: number): Tag {
  const d = new Date(zeit);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const ende = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const zwei = (n: number): string => String(n).padStart(2, '0');
  return { id: `${start.getFullYear()}-${zwei(start.getMonth() + 1)}-${zwei(start.getDate())}`, start: start.getTime(), ende: ende.getTime() };
}

/** Fester Zufall aus Teilen (FNV-1a): gleicher Spielstand und Tag, gleiche Zettel */
function rngAus(...teile: (string | number)[]): SeededRNG {
  let h = 0x811c9dc5;
  for (const c of teile.join('|')) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return new SeededRNG(((h >>> 0) % 2147483646) + 1);
}

function mischen<T>(liste: T[], rng: SeededRNG): T[] {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

const rund5 = (n: number): number => Math.max(5, Math.round(n / 5) * 5);

// ── Dungeons ──

/** Kann die Gilde in diesen Dungeon aufbrechen (offen oder schon bezwungen)? */
export function istSpielbar(state: GameState, routeId: string): boolean {
  const route = ROUTE_DEFS[routeId];
  return !!route && (isRouteAvailable(route, state) || isRouteCompleted(routeId, state));
}

/** Dungeons, die die Gilde spielen kann, der höchste zuerst */
export function spielbareDungeons(state: GameState): string[] {
  const spielbar = DUNGEON_GRAPH.map(n => n.routeId).filter(id => istSpielbar(state, id));
  const liste = spielbar.length > 0 ? spielbar : ['forest_short'];
  return liste.sort((a, b) => dungeonHoehe(b) - dungeonHoehe(a));
}

/** Gold, das ein ganzer Lauf ungefähr bringt: Mitte der festen Gold-Beute aller Gegner, dazu Funde */
export function goldJeLauf(routeId: string): number {
  const route = ROUTE_DEFS[routeId];
  if (!route) return 0;
  let gold = 0;
  for (const enc of route.encounters) {
    for (const id of enc.enemies ?? []) {
      const tabelle = LOOT_TABLE_DEFS[ENEMY_DEFS[id]?.lootTableId ?? ''];
      if (tabelle) gold += (tabelle.guaranteedGold.min + tabelle.guaranteedGold.max) / 2;
    }
    gold += enc.findGold ?? 0;
  }
  return gold;
}

/** Gegnerarten eines Dungeons, die mindestens zweimal pro Lauf kommen (ohne Boss), mit ihrer Anzahl */
function jagdbareGegner(routeId: string): { id: string; jeLauf: number }[] {
  const anzahl: Record<string, number> = {};
  for (const enc of ROUTE_DEFS[routeId]?.encounters ?? []) {
    for (const id of enc.enemies ?? []) {
      if (!ENEMY_DEFS[id] || ENEMY_DEFS[id].isBoss) continue;
      anzahl[id] = (anzahl[id] ?? 0) + 1;
    }
  }
  return Object.entries(anzahl).filter(([, n]) => n >= 2).map(([id, jeLauf]) => ({ id, jeLauf }));
}

// ── Zettel ──

function belohnung(art: AuftragsArt, routeId: string): AuftragsBelohnung {
  const dinge: Record<string, number> = {};
  const material = materialJeSieg(routeId);
  if (material) dinge[material.material.id] = material.menge;
  return { siegel: SIEGEL_JE_ART[art], gold: rund5(goldJeLauf(routeId) * GOLD_ANTEIL), dinge };
}

/** Ein Zettel für einen Dungeon, oder null, wenn die Art dort nicht geht (Set ohne Set, Jagd ohne Rudel) */
function dungeonZettel(art: AuftragsArt, routeId: string, rng: SeededRNG, vergeben: Auftrag[]): Auftrag | null {
  if (vergeben.some(a => a.art === art && a.routeId === routeId)) return null;
  const vorlagen = AUFTRAGS_VORLAGEN.filter(v => v.art === art && !v.nichtIn?.includes(routeId) && !vergeben.some(a => a.vorlage === v.id));
  if (vorlagen.length === 0) return null;
  const vorlage = rng.pick(vorlagen).id;
  const route = ROUTE_DEFS[routeId];
  const basis = { art, vorlage, routeId, stand: 0, fertig: false, belohnung: belohnung(art, routeId) };
  switch (art) {
    case 'sieg':
    case 'makellos':
      return { ...basis, ziel: 1 };
    case 'set':
      return setFuerRoute(routeId) ? { ...basis, ziel: 1 } : null;
    case 'jagd': {
      // Jede Gegnerart nur auf einem Zettel: ein Kampf soll nicht zwei Zettel zugleich füllen
      const gegner = jagdbareGegner(routeId).filter(g => !vergeben.some(a => a.art === 'jagd' && a.gegnerId === g.id));
      if (gegner.length === 0 || !route) return null;
      const wahl = rng.pick(gegner);
      return { ...basis, gegnerId: wahl.id, ziel: Math.min(16, Math.max(4, wahl.jeLauf * 2)) };
    }
    default:
      return null;
  }
}

/**
 * Gold einer Lieferung: das Dreifache dessen, was ihre Zutaten auf dem billigsten Weg am Markt kosten,
 * auf jeder Ebene gleich. Mit Ebene × Stück bezahlt, brachten 9 Kräuter für 15 Gold bis 360 Gold.
 */
export function lieferGold(itemId: string, menge: number): number {
  return rund5(LIEFER_AUFSCHLAG * marktKosten(itemId) * menge);
}

/** Waren, die am Brett hängen dürfen: die Stadt stellt sie her, oder sie liegen schon im Lager (und sie haben einen Preis) */
export function lieferbareWaren(state: GameState): typeof LIEFER_WAREN {
  return LIEFER_WAREN.filter(w => Number.isFinite(marktKosten(w.itemId))
    && ((state.globalStock[w.itemId] ?? 0) >= w.menge || nachschub(state, w.itemId).kommt));
}

function lieferZettel(state: GameState, rng: SeededRNG, vergeben: Auftrag[]): Auftrag | null {
  const waren = lieferbareWaren(state).filter(w => !vergeben.some(a => a.itemId === w.itemId));
  if (waren.length === 0) return null;
  const ware = rng.pick(waren);
  return {
    art: 'lieferung', vorlage: `ware_${ware.itemId}`, routeId: '', itemId: ware.itemId, ziel: ware.menge, stand: 0, fertig: false,
    belohnung: { siegel: SIEGEL_JE_ART.lieferung, gold: lieferGold(ware.itemId, ware.menge), dinge: {} },
  };
}

/** Ein Zettel für Platz 0 (die höchsten Dungeons), 1 (weiter unten) oder 2 (die Stadt) */
function zettelFuerPlatz(state: GameState, platz: number, rng: SeededRNG, vergeben: Auftrag[]): Auftrag {
  const dungeons = spielbareDungeons(state);
  if (platz === 2 && rng.chance(0.7)) {
    const ware = lieferZettel(state, rng, vergeben);
    if (ware) return ware;
  }
  const genutzt = new Set(vergeben.map(a => a.routeId));
  const kandidaten = platz === 0 ? dungeons.slice(0, 3) : platz === 1 ? dungeons.slice(1, 8) : dungeons.slice(3);
  const frei = kandidaten.filter(id => !genutzt.has(id));
  const auswahl = frei.length > 0 ? frei : kandidaten.length > 0 ? kandidaten : dungeons;
  const arten: AuftragsArt[] = platz === 0 ? ['sieg', 'set', 'jagd'] : platz === 1 ? ['makellos', 'jagd', 'set', 'sieg'] : ['jagd', 'sieg', 'makellos'];
  // Abwechslung: Arten, die heute noch an keinem Zettel hängen, zuerst
  const haengt = (art: AuftragsArt): boolean => vergeben.some(a => a.art === art);
  const reihenfolge = [...mischen(arten.filter(a => !haengt(a)), rng), ...mischen(arten.filter(haengt), rng)];
  for (const routeId of [rng.pick(auswahl), ...mischen(dungeons, rng)]) {
    for (const art of reihenfolge) {
      const zettel = dungeonZettel(art, routeId, rng, vergeben);
      if (zettel) return zettel;
    }
  }
  // Jeder Dungeon kann einen Sieg verlangen; nur wenn auch das schon hängt, ein zweiter Sieg-Zettel
  return dungeonZettel('sieg', dungeons[0], rng, [])!;
}

/** Die Zettel eines Tages, fest aus Samen und Tag */
function zettelDesTages(state: GameState, samen: number, tagId: string): Auftrag[] {
  const rng = rngAus(samen, tagId);
  const zettel: Auftrag[] = [];
  for (let platz = 0; platz < ZETTEL_JE_TAG; platz++) zettel.push(zettelFuerPlatz(state, platz, rng, zettel));
  return zettel;
}

// ── Die Kette: Der Saal der Gilde ──

/** Alle Kapitel der Kette: je Boss-Dungeon eins, von unten nach oben wie auf der Karte */
export function saalKapitel(): SaalKapitel[] {
  return [...DUNGEON_GRAPH]
    .filter(n => ROUTE_DEFS[n.routeId]?.bossId)
    .sort((a, b) => b.y - a.y)
    .map(n => SAAL_KAPITEL.find(k => k.routeId === n.routeId) ?? {
      routeId: n.routeId, art: 'sieg', ziel: 1,
      prunkstueck: `Ein Andenken an ${ENEMY_DEFS[ROUTE_DEFS[n.routeId].bossId!]?.name ?? n.routeId}`,
      schild: ENEMY_DEFS[ROUTE_DEFS[n.routeId].bossId!]?.name ?? n.routeId,
      text: `Hinter dem Saal ist ein neuer Sockel aufgetaucht, das Schild ist noch warm vom Giessen. Bezwingt ${dungeonWen(n.routeId)}.`,
    });
}

/** Das Kapitel, das gerade am Brett hängt; null, wenn der Saal voll ist */
export function laufendesKapitel(stand: AuftragsbrettStand): SaalKapitel | null {
  return saalKapitel().find(k => !stand.kette.fertig.includes(k.routeId)) ?? null;
}

/** Einleitung der Kette mit der Zahl der Sockel */
export function saalEinleitung(): string {
  const zahl = ['Null', 'Ein', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwölf',
    'Dreizehn', 'Vierzehn', 'Fünfzehn', 'Sechzehn', 'Siebzehn', 'Achtzehn', 'Neunzehn', 'Zwanzig'][saalKapitel().length];
  return SAAL_EINLEITUNG.replace('{anzahl}', zahl ?? String(saalKapitel().length));
}

export { SAAL_SCHLUSS };

/** Belohnung eines Kapitels; das letzte bringt die Siegel für den vollen Saal dazu */
function kapitelBelohnung(kapitel: SaalKapitel, letztes: boolean): AuftragsBelohnung {
  const ebene = ROUTE_DEFS[kapitel.routeId]?.tier ?? 1;
  const material = materialJeSieg(kapitel.routeId);
  return {
    siegel: 3 + Math.ceil(ebene / 2) + (letztes ? SAAL_SCHLUSS_SIEGEL : 0),
    gold: rund5(goldJeLauf(kapitel.routeId)),
    dinge: material ? { [material.material.id]: material.menge * 2 } : {},
  };
}

/** Ist dieses Kapitel das letzte, das noch fehlt? */
function letztesKapitel(stand: AuftragsbrettStand, kapitel: SaalKapitel): boolean {
  return saalKapitel().every(k => k.routeId === kapitel.routeId || stand.kette.fertig.includes(k.routeId));
}

/** Name eines Kapitels in Listen: «Der Saal der Gilde (Ein Zweig des Uralten)» */
export function kettenTitel(kapitel: SaalKapitel): string {
  return `Der Saal der Gilde (${kapitel.prunkstueck})`;
}

/** Belohnung des laufenden Kapitels (für die Anzeige am Brett) */
export function kapitelBelohnungVon(stand: AuftragsbrettStand, kapitel: SaalKapitel): AuftragsBelohnung {
  return kapitelBelohnung(kapitel, letztesKapitel(stand, kapitel));
}

/** Der Text des Stadtschreibers zum Kapitel; vor dem ersten Sieg im Dungeon einer, der ihn noch nicht kennt */
export function kapitelText(state: GameState, kapitel: SaalKapitel): string {
  return kapitel.vorSieg && !(kapitel.routeId in bezwungeneDungeons(state)) ? kapitel.vorSieg : kapitel.text;
}

/** Stellt das laufende Kapitel ein; der Stand gilt nur für das Kapitel, zu dem er gehört */
function ketteNachziehen(stand: AuftragsbrettStand): void {
  const kapitel = laufendesKapitel(stand);
  const id = kapitel?.routeId ?? '';
  if (stand.kette.routeId !== id) stand.kette = { ...stand.kette, routeId: id, stand: 0 };
}

// ── Stand ──

/**
 * Der Stand des Bretts. Legt ihn beim ersten Aufruf an und hängt an einem neuen Tag neue Zettel auf
 * (alte, nicht erledigte fallen weg). Steht die Uhr vor dem gespeicherten Tag, bleiben die Zettel hängen.
 */
export function brettStand(state: GameState, jetzt: number): AuftragsbrettStand {
  const heute = tagVon(jetzt);
  if (!state.auftragsbrett) {
    const samen = state.rngSeed || 1;
    state.auftragsbrett = {
      samen, tag: { id: heute.id, start: heute.start }, auftraege: zettelDesTages(state, samen, heute.id),
      getauscht: 0, tagesbonus: false, siegel: 0, erledigt: 0, siegelGesamt: 0,
      kette: { routeId: '', stand: 0, fertig: [] },
    };
  } else if (state.auftragsbrett.tag.id !== heute.id && heute.start > state.auftragsbrett.tag.start) {
    const stand = state.auftragsbrett;
    stand.tag = { id: heute.id, start: heute.start };
    stand.auftraege = zettelDesTages(state, stand.samen, heute.id);
    stand.getauscht = 0;
    stand.tagesbonus = false;
  }
  ketteNachziehen(state.auftragsbrett);
  return state.auftragsbrett;
}

function gutschreiben(state: GameState, stand: AuftragsbrettStand, b: AuftragsBelohnung): void {
  stand.siegel += b.siegel;
  stand.siegelGesamt += b.siegel;
  state.globalStock.gold = (state.globalStock.gold ?? 0) + b.gold;
  for (const [id, n] of Object.entries(b.dinge)) state.globalStock[id] = (state.globalStock[id] ?? 0) + n;
}

/** Sind alle Zettel des Tages erledigt, gibt es den Tagesbonus (einmal am Tag); gibt die Siegel zurück */
function tagesbonusPruefen(stand: AuftragsbrettStand): number {
  if (stand.tagesbonus || stand.auftraege.length === 0 || !stand.auftraege.every(a => a.fertig)) return 0;
  stand.tagesbonus = true;
  stand.siegel += TAGESBONUS_SIEGEL;
  stand.siegelGesamt += TAGESBONUS_SIEGEL;
  return TAGESBONUS_SIEGEL;
}

// ── Fortschritt ──

/** Fiel ein Held? Auch einer, den «Wiedergeburt» wieder aufstehen liess (sie ist dann verbraucht) */
function einHeldGefallen(run: ExpeditionRun): boolean {
  return run.party.some(u => u.hp <= 0 || !!u.specialEffects?.some(e => e.id === 'revive' && e.usesLeft === 0));
}

/** Wie viel ein Lauf zu einem Ziel beiträgt */
function beitrag(art: AuftragsArt, routeId: string, gegnerId: string | undefined, run: ExpeditionRun): number {
  switch (art) {
    case 'sieg':
      return run.routeId === routeId && dungeonBezwungen(run) ? 1 : 0;
    case 'makellos':
      return run.routeId === routeId && dungeonBezwungen(run) && !einHeldGefallen(run) ? 1 : 0;
    case 'set':
      return run.routeId === routeId ? [run.setTeil, run.setTeilExtra].filter(id => !!id).length : 0;
    case 'jagd':
      return run.rooms.flatMap(r => r.enemies ?? []).filter(e => e.defId === gegnerId && e.hp <= 0).length;
    default:
      return 0;
  }
}

export interface AuftragsMeldung {
  titel: string;
  stand: number;
  ziel: number;
  fertig: boolean;
  /** Bei einem erledigten Zettel oder Kapitel */
  belohnung?: AuftragsBelohnung;
  /** Kapitel der Kette: das Prunkstück für den Saal */
  prunkstueck?: string;
}

export interface AuftragsBilanz {
  meldungen: AuftragsMeldung[];
  /** Siegel des Tagesbonus, 0 = keiner */
  tagesbonus: number;
  /** Das letzte Prunkstück steht im Saal */
  saalVoll: boolean;
}

/**
 * Nach einer Expedition: zählt Siege, Jagd und Set-Teile für die Zettel und das Kapitel der Kette
 * und schreibt die Belohnung erledigter gut. Einmal pro Expedition aufrufen, nach dem Set-Wurf.
 * Die Expedition zählt für die Zettel, die beim Aufbruch hingen: Lief sie über Mitternacht,
 * wechselt das Brett erst danach (beim nächsten Blick darauf).
 */
export function auftraegeNachExpedition(state: GameState, run: ExpeditionRun, jetzt: number): AuftragsBilanz {
  const stand = state.auftragsbrett ?? brettStand(state, jetzt);
  ketteNachziehen(stand);
  const bilanz: AuftragsBilanz = { meldungen: [], tagesbonus: 0, saalVoll: false };
  for (const a of stand.auftraege) {
    if (a.fertig) continue;
    const dazu = beitrag(a.art, a.routeId, a.gegnerId, run);
    if (dazu <= 0) continue;
    a.stand = Math.min(a.ziel, a.stand + dazu);
    a.fertig = a.stand >= a.ziel;
    if (a.fertig) {
      gutschreiben(state, stand, a.belohnung);
      stand.erledigt++;
    }
    bilanz.meldungen.push({ titel: zettelTitel(a), stand: a.stand, ziel: a.ziel, fertig: a.fertig, ...(a.fertig ? { belohnung: a.belohnung } : {}) });
  }
  bilanz.tagesbonus = tagesbonusPruefen(stand);

  const kapitel = laufendesKapitel(stand);
  if (kapitel) {
    const dazu = beitrag(kapitel.art, kapitel.routeId, undefined, run);
    if (dazu > 0) {
      stand.kette.stand = Math.min(kapitel.ziel, stand.kette.stand + dazu);
      const fertig = stand.kette.stand >= kapitel.ziel;
      const meldung: AuftragsMeldung = { titel: kettenTitel(kapitel), stand: stand.kette.stand, ziel: kapitel.ziel, fertig };
      if (fertig) {
        const b = kapitelBelohnungVon(stand, kapitel);
        stand.kette.fertig.push(kapitel.routeId);
        ketteNachziehen(stand);
        bilanz.saalVoll = laufendesKapitel(stand) === null;
        gutschreiben(state, stand, b);
        meldung.belohnung = b;
        meldung.prunkstueck = kapitel.prunkstueck;
      }
      bilanz.meldungen.push(meldung);
    }
  }
  return bilanz;
}

// ── Lieferung und Tauschen ──

export function kannLiefern(state: GameState, a: Auftrag): boolean {
  return a.art === 'lieferung' && !a.fertig && !!a.itemId && (state.globalStock[a.itemId] ?? 0) >= a.ziel;
}

/** Gibt die Ware eines Liefer-Zettels ab; null, wenn es (noch) nicht geht */
export function liefern(state: GameState, index: number, jetzt: number): { meldung: AuftragsMeldung; tagesbonus: number } | null {
  const stand = brettStand(state, jetzt);
  const a = stand.auftraege[index];
  if (!a || !kannLiefern(state, a)) return null;
  state.globalStock[a.itemId!] -= a.ziel;
  a.stand = a.ziel;
  a.fertig = true;
  stand.erledigt++;
  gutschreiben(state, stand, a.belohnung);
  return {
    meldung: { titel: zettelTitel(a), stand: a.stand, ziel: a.ziel, fertig: true, belohnung: a.belohnung },
    tagesbonus: tagesbonusPruefen(stand),
  };
}

export function tauschUebrig(stand: AuftragsbrettStand): number {
  return Math.max(0, TAUSCH_JE_TAG - stand.getauscht);
}

/** Ersetzt einen offenen Zettel durch einen anderen für denselben Platz; null, wenn heute kein Tausch mehr frei ist */
export function tauschen(state: GameState, index: number, jetzt: number): Auftrag | null {
  const stand = brettStand(state, jetzt);
  const alt = stand.auftraege[index];
  if (!alt || alt.fertig || tauschUebrig(stand) === 0) return null;
  const rng = rngAus(stand.samen, stand.tag.id, 'tausch', stand.getauscht, index);
  const andere = stand.auftraege.filter((_, i) => i !== index);
  // Der alte Zettel zählt als vergeben, damit nicht derselbe wiederkommt
  const neu = zettelFuerPlatz(state, index, rng, [...andere, alt]);
  stand.auftraege[index] = neu;
  stand.getauscht++;
  return neu;
}

// ── Siegel einlösen ──

/** Sets der bezwungenen Dungeons, von unten nach oben auf der Karte */
export function einloesbareSets(state: GameState): DungeonSetDef[] {
  const merker = bezwungeneDungeons(state);
  return [...DUNGEON_GRAPH]
    .sort((a, b) => b.y - a.y)
    .filter(n => n.routeId in merker)
    .map(n => setFuerRoute(n.routeId))
    .filter((s): s is DungeonSetDef => !!s);
}

/** Preis eines Set-Teils in Siegeln */
export function setTeilKosten(itemId: string): number {
  const set = setVonItem(itemId);
  return setTeilPreis(set?.tier ?? 1);
}

/** Löst Siegel gegen ein Set-Teil ein; false, wenn das Set nicht frei ist oder die Siegel fehlen */
export function setTeilEinloesen(state: GameState, itemId: string, jetzt: number): boolean {
  const stand = brettStand(state, jetzt);
  const set = setVonItem(itemId);
  if (!set || !einloesbareSets(state).includes(set) || !ITEM_DEFS[itemId]) return false;
  const preis = setTeilKosten(itemId);
  if (stand.siegel < preis) return false;
  stand.siegel -= preis;
  state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + 1;
  return true;
}

/** Materialien aus bezwungenen Gebieten, mit der Menge eines Siegs im höchsten bezwungenen Dungeon ihres Gebiets */
export function einloesbareMaterialien(state: GameState): { material: SchmiedeMaterialDef; menge: number }[] {
  const merker = bezwungeneDungeons(state);
  return SCHMIEDE_MATERIALIEN.flatMap(material => {
    const bezwungen = material.routen.filter(id => id in merker);
    if (bezwungen.length === 0) return [];
    const hoechster = bezwungen.reduce((a, b) => (dungeonHoehe(b) > dungeonHoehe(a) ? b : a));
    return [{ material, menge: materialJeSieg(hoechster)?.menge ?? 0 }];
  });
}

/** Löst Siegel gegen Material ein; gibt die Menge zurück oder null */
export function materialEinloesen(state: GameState, itemId: string, jetzt: number): number | null {
  const stand = brettStand(state, jetzt);
  const angebot = einloesbareMaterialien(state).find(m => m.material.id === itemId);
  if (!angebot || angebot.menge <= 0 || stand.siegel < MATERIAL_PREIS) return null;
  stand.siegel -= MATERIAL_PREIS;
  state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + angebot.menge;
  return angebot.menge;
}

export function splitterEinloesen(state: GameState, jetzt: number): boolean {
  const stand = brettStand(state, jetzt);
  if (stand.siegel < SPLITTER_PREIS) return false;
  stand.siegel -= SPLITTER_PREIS;
  state.globalStock[SPLITTER] = (state.globalStock[SPLITTER] ?? 0) + SPLITTER_MENGE;
  return true;
}

// ── Texte ──

/** Setzt die Platzhalter eines Zettel-Texts ein */
function fuellen(text: string, a: Pick<Auftrag, 'routeId'>): string {
  return text
    .replace(/\{wo\}/g, a.routeId ? imDungeon(a.routeId) : '')
    .replace(/\{wen\}/g, a.routeId ? dungeonWen(a.routeId) : '')
    .replace(/\{set\}/g, setFuerRoute(a.routeId)?.name ?? '');
}

export interface ZettelText {
  von: string;
  zeichen: string;
  titel: string;
  text: string;
  /** Was zu tun ist, mit Zahlen */
  ziel: string;
}

function zettelTitel(a: Auftrag): string {
  if (a.art === 'lieferung') return LIEFER_WAREN.find(w => w.itemId === a.itemId)?.titel ?? 'Lieferung';
  return AUFTRAGS_VORLAGEN.find(v => v.id === a.vorlage)?.titel ?? 'Auftrag';
}

/** Was ein Ziel verlangt, z. B. «Bezwingt den Vulkankern, ohne dass ein Held fällt» */
export function zielText(art: AuftragsArt, routeId: string, ziel: number, gegnerId?: string, itemId?: string): string {
  const mal = ziel > 1 ? ` ${ziel}-mal` : '';
  switch (art) {
    case 'sieg': return `Bezwingt ${dungeonWen(routeId)}${mal}`;
    case 'makellos': return `Bezwingt ${dungeonWen(routeId)}${mal}, ohne dass ein Held fällt`;
    case 'set': return `Erbeutet ${ziel > 1 ? `${ziel} Teile` : 'ein Teil'} aus dem Set «${setFuerRoute(routeId)?.name ?? ''}»`;
    case 'jagd': return `Besiegt ${ziel}× ${ENEMY_DEFS[gegnerId ?? '']?.name ?? gegnerId} (zu finden ${imDungeon(routeId)})`;
    case 'lieferung': return `Gebt ${ziel}× ${ITEM_DEFS[itemId ?? '']?.name ?? itemId} am Brett ab`;
  }
}

/** Alles, was auf einem Zettel steht */
export function zettelText(a: Auftrag): ZettelText {
  const ware = a.art === 'lieferung' ? LIEFER_WAREN.find(w => w.itemId === a.itemId) : undefined;
  const vorlage = ware ?? AUFTRAGS_VORLAGEN.find(v => v.id === a.vorlage);
  const von = AUFTRAGGEBER[vorlage?.von ?? 'ottokar'] ?? AUFTRAGGEBER.ottokar;
  return {
    von: von.name, zeichen: von.zeichen, titel: zettelTitel(a),
    text: fuellen(vorlage?.text ?? '', a),
    ziel: zielText(a.art, a.routeId, a.ziel, a.gegnerId, a.itemId),
  };
}

/** «+2 Siegel · +120 Gold · +6 Glutkern» */
export function belohnungText(b: AuftragsBelohnung): string {
  const teile = [`+${b.siegel} Siegel`];
  if (b.gold > 0) teile.push(`+${b.gold} Gold`);
  for (const [id, n] of Object.entries(b.dinge)) teile.push(`+${n} ${ITEM_DEFS[id]?.name ?? id}`);
  return teile.join(' · ');
}

/**
 * Für Karte und Expeditionsliste: offene Zettel und das Kapitel, die in diesem Dungeon zählen.
 * Eine Jagd steht nur bei Dungeons, in die die Gilde schon kann; das Kapitel auch bei gesperrten.
 */
export function auftraegeFuerDungeon(state: GameState, routeId: string, jetzt: number): string[] {
  const stand = brettStand(state, jetzt);
  const jagdHier = (a: Auftrag): boolean => a.art === 'jagd' && istSpielbar(state, routeId) && jagdbareGegner(routeId).some(g => g.id === a.gegnerId);
  const titel = stand.auftraege
    .filter(a => !a.fertig && (a.routeId === routeId || jagdHier(a)))
    .map(a => zettelTitel(a));
  const kapitel = laufendesKapitel(stand);
  if (kapitel?.routeId === routeId) titel.push(kettenTitel(kapitel));
  return titel;
}

/** Fürs Hauptmenü: offene Zettel, Siegel, ob etwas abgegeben werden kann und ob die Zettel von heute neu sind */
export function brettKurz(state: GameState, jetzt: number): { offen: number; siegel: number; abgeben: boolean; neu: boolean } {
  const stand = brettStand(state, jetzt);
  return {
    offen: stand.auftraege.filter(a => !a.fertig).length,
    siegel: stand.siegel,
    abgeben: stand.auftraege.some(a => kannLiefern(state, a)),
    neu: stand.gesehen !== stand.tag.id,
  };
}

/** Das Brett wurde angeschaut: die Zettel von heute sind nicht mehr neu */
export function brettGesehen(state: GameState, jetzt: number): void {
  const stand = brettStand(state, jetzt);
  stand.gesehen = stand.tag.id;
}
