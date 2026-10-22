import { GameState, createNewGameState } from '../models/GameState';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { resetBuildingIdCounter } from '../models/Building';
import { resetCitizenIdCounter } from '../models/Citizen';
import { resetFighterIdCounter } from '../models/GuildRoster';
import { BUILDING_DEFS } from '../data/buildings';
import { CLASS_DEFS } from '../data/classes';
import { entferneGebaeude, vereinigeDoppelte } from './Ausbau';
import { stadtStufeVon } from '../data/stadtstufen';
import { loeseHeldenBindungen } from './HeldenBindung';
import { ExpeditionSystem } from './ExpeditionSystem';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { ranglisteKurz } from './Rangliste';
import { brettKurz } from './Auftragsbrett';

/** Speicherplatz aller SaveSystem-Instanzen; das Probespiel hat einen eigenen (nutzeProbespiel) */
let saveKey = 'magic_city_save';
let backupKey = 'magic_city_save_backup';
/**
 * Stand vor dem Laden einer Datei (Fenster «Spielstand») und wann er dorthin kam (ms).
 * save() fasst diese Plätze nie an, nur schreibeSpielstandText und holeStandVorLadenZurueck.
 */
let vorLadenKey = 'magic_city_save_vor_laden';
let vorLadenZeitKey = 'magic_city_save_vor_laden_zeit';
/** «neu», wenn der Stand dort liegt, weil ein neues Spiel begonnen hat (sonst fehlt der Platz) */
let vorLadenGrundKey = 'magic_city_save_vor_laden_grund';
const CURRENT_VERSION = 23;
const SAVE_SIZE_WARNING_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Ein Stand aus einer Datei (oder der Stand vor dem Laden) ist geschrieben, die Seite lädt
 * gleich neu. Bis dahin schreibt nichts mehr: sonst überschreibt das laufende Spiel den neuen
 * Stand (Speichern alle 60 s, F5, mc:speichern) oder ein zweiter Klick schreibt nochmals.
 */
let neuLadenAusstehend = false;

/**
 * Probespiel (localhost:5173/?probe): Ab jetzt laden und speichern alle
 * SaveSystem-Instanzen auf einem eigenen Platz, der richtige Spielstand bleibt
 * unberührt. Vor dem ersten Laden aufrufen (main.ts). false schaltet zurück (Tests).
 */
export function nutzeProbespiel(aktiv = true): void {
  const platz = aktiv ? 'magic_city_probe' : 'magic_city_save';
  saveKey = platz;
  backupKey = `${platz}_backup`;
  vorLadenKey = `${platz}_vor_laden`;
  vorLadenZeitKey = `${platz}_vor_laden_zeit`;
  vorLadenGrundKey = `${platz}_vor_laden_grund`;
}

/** Nur für Tests: hebt die Sperre nach dem Schreiben auf, wie es im Spiel das Neuladen der Seite tut. */
export function hebeSperreNachLadenAuf(): void {
  neuLadenAusstehend = false;
}

/** Stand eines Laufs auf der endlosen Treppe, wie ihn alte Spielstände noch enthalten können. */
interface AlterTreppenLauf {
  sicher?: { loot?: Record<string, number>; gold?: number };
}

/**
 * Die endlose Treppe gibt es seit dem 20.10.2026 nicht mehr (docs/NEUE-DUNGEONS.md).
 * Alte Spielstände verlieren ihren Treppen-Stand und die Treppe in der Rangliste. Wer
 * mitten in einem Aufstieg gespeichert hat, bekommt die Beute vom letzten Rastplatz;
 * den Lauf selbst bricht main.ts wie jede unterbrochene Expedition ab.
 */
function entferneTreppe(state: GameState): void {
  const alt = state as GameState & { treppe?: unknown };
  const lauf = state.activeExpedition as (ExpeditionRun & { treppe?: AlterTreppenLauf }) | null;
  const inRangliste = state.scoreboard?.some(e => e.routeId === 'endlose_treppe') ?? false;
  if (alt.treppe === undefined && !lauf?.treppe && !inRangliste) return;

  delete alt.treppe;
  if (inRangliste) state.scoreboard = state.scoreboard.filter(e => e.routeId !== 'endlose_treppe');
  if (lauf?.treppe) {
    for (const [itemId, qty] of Object.entries(lauf.treppe.sicher?.loot ?? {})) {
      state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + qty;
    }
    state.globalStock['gold'] = (state.globalStock['gold'] ?? 0) + (lauf.treppe.sicher?.gold ?? 0);
    delete lauf.treppe;
  }
  console.log('Endlose Treppe aus dem Spielstand entfernt.');
}

/** Was ein Spielstand enthält, wie es das Fenster «Spielstand» zeigt. */
export interface SpielstandZusammenfassung {
  tag: number;
  stadtstufe: number;
  helden: number;
  hoechsteHeldenstufe: number;
}

export type SpielstandPruefung =
  | { ok: true; zusammenfassung: SpielstandZusammenfassung }
  | { ok: false; grund: string };

/** Ergebnis von Schreibvorgängen ohne Zusammenfassung (holeStandVorLadenZurueck). */
export type SchreibErgebnis = { ok: true } | { ok: false; grund: string };

const KEINE_DATEI = 'Das ist keine Magic-City-Datei.';
const BESCHAEDIGT = 'Die Datei ist beschädigt.';
const KEIN_PLATZ = 'Der Browser hat keinen Platz, um den Spielstand zu speichern.';
const STARTET_NEU = 'Das Spiel startet gerade neu.';

/** true, solange das Probespiel seinen eigenen Speicherplatz nutzt (nutzeProbespiel). */
export function probespielAktiv(): boolean {
  return saveKey === 'magic_city_probe';
}

export function fasseSpielstandZusammen(state: Pick<GameState, 'day' | 'fighters' | 'stadtweg'>): SpielstandZusammenfassung {
  const stufen = (state.fighters ?? []).map(f => Number(f?.level) || 1);
  return {
    tag: Number(state.day) || 1,
    stadtstufe: stadtStufeVon(state),
    helden: stufen.length,
    hoechsteHeldenstufe: stufen.reduce((hoechste, stufe) => Math.max(hoechste, stufe), 0),
  };
}

// ── Form eines Spielstands aus einer Datei ──
// Wie in models/*.ts. Ein Feld darf fehlen (alte Stände, load() und die Systeme legen es an),
// aber was da ist, hat die Form, mit der das Spiel rechnet. Pflichtfelder stehen in der Liste
// hinter den Feldern. Wer die Form eines gespeicherten Felds ändert, passt sie hier an; der
// Test «echte Spielstände» (tests/spielstandDatei.test.ts) schlägt sonst an.

type Form = (wert: unknown) => boolean;

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert);
}

const ZAHL: Form = w => typeof w === 'number' && Number.isFinite(w);
const TEXT: Form = w => typeof w === 'string';
const JA_NEIN: Form = w => typeof w === 'boolean';
const OBJEKT: Form = istObjekt;
const oderNull = (form: Form): Form => w => w === null || form(w);
const einerVon = (...werte: string[]): Form => w => typeof w === 'string' && werte.includes(w);
const liste = (form: Form): Form => w => Array.isArray(w) && w.every(e => form(e));
const tabelle = (form: Form): Form => w => istObjekt(w) && Object.values(w).every(e => form(e));
const objekt = (felder: Record<string, Form>, pflicht: string[] = []): Form => w =>
  istObjekt(w)
  && pflicht.every(name => w[name] !== undefined)
  && Object.entries(felder).every(([name, form]) => w[name] === undefined || form(w[name]));

const ZAEHLER = tabelle(ZAHL);
const TEXTE = liste(TEXT);

const GEBAEUDE = objekt({
  id: ZAHL, typeId: TEXT, x: ZAHL, y: ZAHL, built: JA_NEIN, buildProgress: ZAHL,
  assignedWorkerIds: liste(ZAHL), assignedBuilderId: oderNull(ZAHL), activeRecipeId: oderNull(TEXT),
  productionTimer: ZAHL, producing: JA_NEIN,
  vonSelbst: oderNull(objekt({ art: einerVon('vorstufe', 'zulieferung', 'vorrat'), fuer: TEXT }, ['art', 'fuer'])),
  localInputBuffer: ZAEHLER, localOutputBuffer: ZAEHLER, connected: JA_NEIN, waterSupplied: JA_NEIN,
  tier: ZAHL, synergySpeedMult: ZAHL, specialistId: oderNull(TEXT), upgrading: JA_NEIN, upgradeProgress: ZAHL,
  upgradeId: oderNull(TEXT), eventPaused: JA_NEIN, pendingCraft: JA_NEIN, auftraege: TEXTE,
  handelTag: ZAHL, handelBuendel: ZAHL,
}, ['id', 'typeId']);

const BUERGER = objekt({
  id: ZAHL, status: TEXT, assignedBuildingId: oderNull(ZAHL), trainingClassId: oderNull(TEXT),
  trainingTimer: ZAHL, injuryTimer: ZAHL, fighterId: oderNull(ZAHL),
}, ['id']);

const HELD = objekt({
  id: ZAHL, citizenId: ZAHL, classId: TEXT, name: TEXT,
  baseStats: objekt({ hp: ZAHL, maxHp: ZAHL, atk: ZAHL, def: ZAHL, spd: ZAHL, critChance: ZAHL, critMult: ZAHL }, ['maxHp']),
  gear: tabelle(oderNull(TEXT)), // mainHand, offHand, armor, trinket (alte Stände: weapon)
  gearNeedsRepair: JA_NEIN, xp: ZAHL, level: ZAHL, spezialisierung: TEXT, wegBilanz: ZAEHLER,
}, ['id', 'baseStats', 'gear']);

const BESTENLISTE_EINTRAG = objekt({
  routeId: TEXT, score: ZAHL, difficulty: TEXT, modifier: oderNull(TEXT), status: TEXT, partyClasses: TEXTE,
  timestamp: ZAHL, day: ZAHL, enemiesKilled: ZAHL, bossesKilled: ZAHL,
});

const WOCHEN_ERGEBNIS = objekt({
  wocheId: TEXT, platz: ZAHL, ruhm: ZAHL, belohnung: ZAEHLER, pokal: oderNull(einerVon('gold', 'silber', 'bronze')),
}, ['wocheId', 'platz', 'ruhm', 'belohnung']);

const RANGLISTE = objekt({
  runde: ZAHL, samen: ZAHL, startSterne: ZAHL, startEbene: ZAHL, bekannt: ZAEHLER,
  woche: objekt({ id: TEXT, start: ZAHL, ruhm: ZAHL, ziele: ZAEHLER }, ['id', 'start', 'ruhm', 'ziele']),
  offen: liste(WOCHEN_ERGEBNIS), verlauf: liste(WOCHEN_ERGEBNIS),
  pokale: objekt({ gold: ZAHL, silber: ZAHL, bronze: ZAHL }, ['gold', 'silber', 'bronze']),
}, ['runde', 'samen', 'startSterne', 'startEbene', 'bekannt', 'woche', 'offen', 'verlauf', 'pokale']);

const AUFTRAG = objekt({
  art: einerVon('sieg', 'makellos', 'jagd', 'set', 'lieferung'), vorlage: TEXT, routeId: TEXT,
  gegnerId: TEXT, itemId: TEXT, ziel: ZAHL, stand: ZAHL, fertig: JA_NEIN,
  belohnung: objekt({ siegel: ZAHL, gold: ZAHL, dinge: ZAEHLER }, ['siegel', 'gold', 'dinge']),
}, ['art', 'vorlage', 'routeId', 'ziel', 'stand', 'fertig', 'belohnung']);

const AUFTRAGSBRETT = objekt({
  samen: ZAHL, tag: objekt({ id: TEXT, start: ZAHL }, ['id', 'start']), auftraege: liste(AUFTRAG),
  getauscht: ZAHL, tagesbonus: JA_NEIN, gesehen: TEXT, siegel: ZAHL, erledigt: ZAHL, siegelGesamt: ZAHL,
  kette: objekt({ routeId: TEXT, stand: ZAHL, fertig: TEXTE }, ['routeId', 'stand', 'fertig']),
}, ['samen', 'tag', 'auftraege', 'getauscht', 'tagesbonus', 'siegel', 'erledigt', 'siegelGesamt', 'kette']);

const SPIELSTAND = objekt({
  grid: liste(liste(oderNull(objekt({ buildingId: oderNull(ZAHL), isRoad: JA_NEIN })))),
  buildings: liste(GEBAEUDE),
  globalStock: ZAEHLER,
  citizens: liste(BUERGER),
  fighters: liste(HELD),
  activeExpedition: oderNull(OBJEKT), // bricht der Start ab (main.ts), das Probe-Laden prüft den Rest
  day: ZAHL,
  cityTickAccumulator: ZAHL, dayTickAccumulator: ZAHL, eventTickAccumulator: ZAHL,
  tutorial: OBJEKT,
  rngSeed: ZAHL,
  scoreboard: liste(BESTENLISTE_EINTRAG),
  weeklyChallenge: objekt({ currentChallengeId: TEXT, bestScore: ZAHL, medal: TEXT, attempts: ZAHL, completedAt: oderNull(ZAHL) }),
  statistics: ZAEHLER,
  bestiarium: objekt({ discovered: TEXTE, defeated: TEXTE }),
  rescuedNpcs: TEXTE, warMachineInventory: TEXTE, selectedWarMachine: oderNull(TEXT),
  achievements: TEXTE,
  guildStats: objekt({
    rank: ZAHL, forestShortCompleted: ZAHL, forestMediumBossDefeated: JA_NEIN, totalBossesDefeated: ZAHL,
    totalExpeditionsCompleted: ZAHL, bossesDefeatedIds: TEXTE, guildHallT2: JA_NEIN,
  }),
  specialists: liste(objekt({ specialistId: TEXT, assignedBuildingId: oderNull(ZAHL) })),
  talismanInventory: TEXTE, selectedTalisman: oderNull(TEXT),
  classesUnlocked: TEXTE,
  satisfaction: ZAHL,
  uiTheme: TEXT,
  pendingChestLoot: objekt({ items: ZAEHLER, expeditionCount: ZAHL }),
  stadtweg: objekt({ stufe: ZAHL, herzsteine: TEXTE, gelesen: ZAHL }),
  geschichten: objekt({ gelesen: TEXTE, erlebt: TEXTE }, ['gelesen', 'erlebt']),
  bezwungen: ZAEHLER,
  rangliste: RANGLISTE,
  schmiede: objekt({ stufen: ZAEHLER }, ['stufen']),
  auftragsbrett: AUFTRAGSBRETT,
  trophaeen: objekt({ siege: ZAEHLER }, ['siege']),
  erhalteneBauplaene: TEXTE,
  swampTiles: ZAEHLER, grayTiles: ZAEHLER, dirtTiles: ZAEHLER,
}, ['grid', 'buildings', 'globalStock', 'citizens', 'fighters', 'day']);

/**
 * Zeichen, mit denen ein Text aus der Datei zu HTML würde: < und > öffnen Tags, " beendet ein
 * Attribut (z. B. data-item-id="…" im Heldenhaus). Viele Bildschirme setzen Namen und IDs aus dem
 * Spielstand ungeschützt ins HTML; Spielstände aus dem Spiel enthalten keines dieser Zeichen.
 */
const HTML_ZEICHEN = /[<>"]/;

/** true, wenn kein Text und kein Schlüssel im Stand eines der HTML_ZEICHEN enthält. */
function nurSichereTexte(wert: unknown): boolean {
  if (typeof wert === 'string') return !HTML_ZEICHEN.test(wert);
  if (Array.isArray(wert)) return wert.every(nurSichereTexte);
  if (istObjekt(wert)) return Object.entries(wert).every(([name, w]) => !HTML_ZEICHEN.test(name) && nurSichereTexte(w));
  return true;
}

/** Hat der gelesene Inhalt die Pflichtfelder eines Spielstands? */
function istMagicCityStand(s: unknown): s is GameState {
  return istObjekt(s) && Array.isArray(s.grid) && Array.isArray(s.buildings) && istObjekt(s.globalStock)
    && Array.isArray(s.citizens) && Array.isArray(s.fighters);
}

/**
 * Prüft den Text einer Spielstand-Datei, ohne etwas zu schreiben (docs/SPIELSTAND.md):
 * lesbares JSON mit den Pflichtfeldern, gültige Version (ältere hebt load() an), die Form aller
 * Felder (SPIELSTAND), ein Probe-Laden wie beim Start (SaveSystem.probeLaden) und keine Texte,
 * die zu HTML würden. Die Zusammenfassung zeigt den Stand, wie ihn das Spiel nach dem Laden hat.
 */
export function pruefeSpielstandText(text: string): SpielstandPruefung {
  let daten: unknown;
  try {
    daten = JSON.parse(text);
  } catch {
    return { ok: false, grund: 'Die Datei lässt sich nicht lesen.' };
  }
  try {
    if (!istMagicCityStand(daten)) return { ok: false, grund: KEINE_DATEI };
    // Ohne Version ist der Stand sehr alt (load() hebt ihn an), sonst ist sie eine ganze Zahl
    const version: unknown = daten.saveVersion;
    if (version != null && !(Number.isInteger(version) && Number(version) >= 0)) return { ok: false, grund: KEINE_DATEI };
    if (Number(version) > CURRENT_VERSION) return { ok: false, grund: 'Diese Datei ist von einer neueren Version des Spiels.' };
    if (!SPIELSTAND(daten)) return { ok: false, grund: BESCHAEDIGT };

    // Probe-Laden auf dem eben gelesenen Stand (eine Kopie, die sonst niemand hat). Was danach im
    // Spiel steht, muss wieder die richtige Form haben und darf keine HTML-Zeichen enthalten.
    const geladen = new SaveSystem().probeLaden(daten);
    if (!SPIELSTAND(geladen) || !nurSichereTexte(geladen)) return { ok: false, grund: BESCHAEDIGT };
    return { ok: true, zusammenfassung: fasseSpielstandZusammen(geladen) };
  } catch (e) {
    console.warn('Spielstand-Datei lässt sich nicht laden:', e);
    return { ok: false, grund: BESCHAEDIGT };
  }
}

/** Datum des Stands vor dem Laden und was er enthält (Fenster «Spielstand»). */
export interface StandVorLaden {
  zusammenfassung: SpielstandZusammenfassung;
  /** Wann er weggelegt wurde (ms), null wenn unbekannt */
  gesichertAm: number | null;
  /** Warum: eine Datei wurde geladen oder ein neues Spiel begonnen */
  grund: 'laden' | 'neu';
}

/**
 * Schreibt mehrere Plätze zusammen (null löscht einen). Scheitert einer, weil der Speicher voll
 * ist, kommen alle wieder auf den alten Stand: Es geht nie ein Spielstand verloren.
 */
function schreibeZusammen(werte: Record<string, string | null>): boolean {
  const vorher = Object.fromEntries(Object.keys(werte).map(k => [k, localStorage.getItem(k)]));
  const setze = (k: string, v: string | null) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v));
  try {
    for (const [k, v] of Object.entries(werte)) setze(k, v);
    return true;
  } catch (e) {
    console.error('Spielstand schreiben fehlgeschlagen:', e);
    for (const [k, v] of Object.entries(vorher)) {
      try { setze(k, v); } catch { /* vorher hatte alles Platz, also auch jetzt */ }
    }
    return false;
  }
}

/** Dateiname zum Herunterladen, z. B. magic-city-tag-12-2026-10-22.json. */
export function spielstandDateiname(tag: number, datum = new Date()): string {
  const zwei = (n: number) => String(n).padStart(2, '0');
  const jjjjmmtt = `${datum.getFullYear()}-${zwei(datum.getMonth() + 1)}-${zwei(datum.getDate())}`;
  return `magic-city-${probespielAktiv() ? 'probespiel' : 'tag'}-${tag}-${jjjjmmtt}.json`;
}

/**
 * Zustände alter Spielstände, die das heutige Spiel nie mehr setzt und nie mehr löst
 * (docs/SPIELSTAND.md): Unwetter-Pause (Stadt-Ereignisse laufen nicht mehr), Reparatur-
 * Merker der Ausrüstung (Reparieren gibt es nicht mehr) und Gebäude im Bau (Bauen ist
 * sofort fertig). Läuft bei jedem Laden, braucht deshalb keine neue SaveVersion.
 */
export function loeseAlteZustaende(state: GameState): void {
  state.activeEvent = null;
  for (const b of state.buildings ?? []) {
    b.eventPaused = false;
    if (b.built === false) {
      b.built = true;
      b.buildProgress = 0;
      b.assignedBuilderId = null;
    }
  }
  for (const f of state.fighters ?? []) f.gearNeedsRepair = false;
}

export class SaveSystem {
  save(state: GameState): boolean {
    // Ein geladener Stand wartet auf das Neuladen der Seite: nicht überschreiben
    if (neuLadenAusstehend) return false;
    try {
      state.saveVersion = CURRENT_VERSION;
      const json = JSON.stringify(state);
      const sizeBytes = json.length;

      if (sizeBytes > SAVE_SIZE_WARNING_BYTES) {
        console.warn(`Save size (${sizeBytes} bytes) exceeds 4 MB warning threshold!`);
      }
      console.log('Game saved. Size:', sizeBytes, 'bytes');

      // --- Backup slot: copy previous save before overwriting ---
      try {
        const previous = localStorage.getItem(saveKey);
        if (previous) {
          localStorage.setItem(backupKey, previous);
        }
      } catch (backupErr) {
        // Backup failure is non-critical – continue with main save
        console.warn('Could not write backup save:', backupErr);
      }

      // --- Main save with QuotaExceeded fallback cascade ---
      try {
        localStorage.setItem(saveKey, json);
        return true;
      } catch (e: unknown) {
        if (!this.isQuotaExceeded(e)) throw e;

        // Step 1: Remove backup to free space, then retry
        console.warn('QuotaExceededError: removing backup to free space...');
        try { localStorage.removeItem(backupKey); } catch (_) { /* ignore */ }
        try {
          localStorage.setItem(saveKey, json);
          return true;
        } catch (e2: unknown) {
          if (!this.isQuotaExceeded(e2)) throw e2;
        }

        // Step 2: Trim oldest scoreboard entries, then retry
        console.warn('QuotaExceededError: trimming scoreboard entries...');
        if (state.scoreboard && state.scoreboard.length > 10) {
          state.scoreboard = state.scoreboard.slice(-10);
          const trimmedJson = JSON.stringify(state);
          try {
            localStorage.setItem(saveKey, trimmedJson);
            return true;
          } catch (e3: unknown) {
            if (!this.isQuotaExceeded(e3)) throw e3;
          }
        }

        // Step 3: All fallbacks exhausted
        console.error('Save failed: storage quota exceeded even after cleanup.');
        return false;
      }
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  /** Returns the size in bytes of the current main save slot, or 0 if none. */
  getSaveSize(): number {
    const json = localStorage.getItem(saveKey);
    return json ? json.length : 0;
  }

  /**
   * Estimates whether there is likely enough free localStorage space to save.
   * Uses a conservative 5 KB probe to detect if storage is near full.
   */
  canSave(): boolean {
    const probe = '__mc_probe__';
    try {
      // Write a ~5 KB probe to see if storage accepts new data
      localStorage.setItem(probe, 'x'.repeat(5 * 1024));
      localStorage.removeItem(probe);
      return true;
    } catch (_) {
      return false;
    }
  }

  load(): GameState | null {
    try {
      const json = localStorage.getItem(saveKey);
      if (!json) return null;

      const state = this.bereiteVor(JSON.parse(json) as GameState);
      this.setzeIdZaehler(state);

      console.log('Game loaded. Day:', state.day, 'Buildings:', state.buildings.length);
      return state;
    } catch (e) {
      console.error('Load failed:', e);
      return null;
    }
  }

  /**
   * Was bei jedem Laden mit dem gelesenen Stand geschieht (load, loadBackup, probeLaden):
   * alte Versionen anheben (auch sehr alte ohne Versionsfeld), neue Felder anlegen, hängende
   * Zustände lösen und ausgemusterte Gegenstände entfernen.
   */
  private bereiteVor(state: GameState): GameState {
    if (!state.saveVersion || state.saveVersion < CURRENT_VERSION) {
      this.migrate(state);
    }
    this.ensureNewFields(state);
    loeseAlteZustaende(state);
    delete state.globalStock['war_hammer'];
    return state;
  }

  /** Neue Gebäude, Bewohner und Helden bekommen IDs nach den höchsten im Stand. */
  private setzeIdZaehler(state: GameState): void {
    resetBuildingIdCounter(state.buildings.reduce((max, b) => Math.max(max, b.id), 0) + 1);
    resetCitizenIdCounter(state.citizens.reduce((max, c) => Math.max(max, c.id), 0) + 1);
    resetFighterIdCounter(state.fighters.reduce((max, f) => Math.max(max, f.id), 0) + 1);
  }

  /**
   * Probe-Laden für eine Datei (pruefeSpielstandText): dieselbe Lade-Logik wie beim Start.
   * Erst wie load() (ohne Speicher und ohne ID-Zähler), dann die Schritte aus main.ts vor dem
   * ersten Bild: Helden-Bindungen lösen, eine unterbrochene Expedition abbrechen, alle Helden mit
   * vollen Leben. Dazu, was das Hauptmenü vom Stand liest (Rangliste, Auftragsbrett), denn ohne
   * Hauptmenü kommt niemand mehr an dieses Fenster. Ändert nur `state` und wirft, wenn das Spiel
   * mit diesem Stand nicht starten würde. Kommt in main.ts ein Schritt dazu, gehört er auch hierher.
   */
  probeLaden(state: GameState): GameState {
    this.bereiteVor(state);
    // Städtische Systeme lesen BUILDING_DEFS[typeId] ungeprüft (alte Versionen bereinigt migrate)
    const unbekannt = state.buildings.find(b => !BUILDING_DEFS[b.typeId]);
    if (unbekannt) throw new Error(`Unbekannte Gebäude-Art: ${unbekannt.typeId}`);
    loeseHeldenBindungen(state);
    new ExpeditionSystem(new GearSystem(), new ProvisionSystem()).abortExpedition(state);
    for (const fighter of state.fighters) fighter.baseStats.hp = fighter.baseStats.maxHp;
    const jetzt = Date.now();
    ranglisteKurz(state, jetzt);
    brettKurz(state, jetzt);
    return state;
  }

  hasSave(): boolean {
    return localStorage.getItem(saveKey) !== null;
  }

  hasBackup(): boolean {
    return localStorage.getItem(backupKey) !== null;
  }

  /** Load the backup save slot. Returns null if no backup exists. */
  loadBackup(): GameState | null {
    try {
      const json = localStorage.getItem(backupKey);
      if (!json) return null;

      const state = this.bereiteVor(JSON.parse(json) as GameState);
      this.setzeIdZaehler(state);

      console.log('Backup save loaded. Day:', state.day, 'Buildings:', state.buildings.length);
      return state;
    } catch (e) {
      console.error('Backup load failed:', e);
      return null;
    }
  }

  deleteSave(): void {
    localStorage.removeItem(saveKey);
  }

  /** Check whether an error is a localStorage QuotaExceededError. */
  private isQuotaExceeded(e: unknown): boolean {
    if (!(e instanceof Error)) return false;
    return (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.message.toLowerCase().includes('quota')
    );
  }

  /** Der gespeicherte Spielstand als Text (zum Herunterladen), null wenn keiner da ist. */
  spielstandText(): string | null {
    return localStorage.getItem(saveKey);
  }

  /**
   * Schreibt den Text einer Spielstand-Datei auf den Speicherplatz, wenn er die Prüfung
   * besteht. Der bisherige Stand kommt auf den Platz «vor dem Laden», den save() nie anfasst
   * (holeStandVorLadenZurueck). Danach speichert nichts mehr, bis die Seite neu lädt: Das Spiel
   * muss sofort location.reload() aufrufen.
   */
  schreibeSpielstandText(text: string): SpielstandPruefung {
    if (neuLadenAusstehend) return { ok: false, grund: STARTET_NEU };
    const pruefung = pruefeSpielstandText(text);
    if (!pruefung.ok) return pruefung;
    const bisher = localStorage.getItem(saveKey);
    const geschrieben = schreibeZusammen({
      // Ohne bisherigen Stand bleibt ein älterer Stand vor dem Laden liegen
      ...(bisher ? { [vorLadenKey]: bisher, [vorLadenZeitKey]: String(Date.now()), [vorLadenGrundKey]: null } : {}),
      [saveKey]: text,
    });
    if (!geschrieben) return { ok: false, grund: KEIN_PLATZ };
    neuLadenAusstehend = true;
    return pruefung;
  }

  /**
   * Neues Spiel: Der jetzige Stand kommt auf den Platz «vor dem Laden» (Grund «neu»), Spielstand
   * und Sicherung werden leer, und main.ts legt beim Neuladen eine neue Stadt an. Danach speichert
   * nichts mehr, bis die Seite neu lädt: Das Spiel muss sofort location.reload() aufrufen.
   */
  neuesSpiel(): SchreibErgebnis {
    if (neuLadenAusstehend) return { ok: false, grund: STARTET_NEU };
    const bisher = localStorage.getItem(saveKey);
    const geschrieben = schreibeZusammen({
      ...(bisher ? { [vorLadenKey]: bisher, [vorLadenZeitKey]: String(Date.now()), [vorLadenGrundKey]: 'neu' } : {}),
      [saveKey]: null,
      [backupKey]: null,
    });
    if (!geschrieben) return { ok: false, grund: KEIN_PLATZ };
    neuLadenAusstehend = true;
    return { ok: true };
  }

  /** Der Stand vor dem letzten Laden einer Datei, null wenn keiner da ist (oder er sich nicht lesen lässt). */
  standVorLaden(): StandVorLaden | null {
    const text = localStorage.getItem(vorLadenKey);
    if (!text) return null;
    try {
      const s: unknown = JSON.parse(text);
      if (!istMagicCityStand(s)) return null;
      const zeit = Number(localStorage.getItem(vorLadenZeitKey));
      const grund = localStorage.getItem(vorLadenGrundKey) === 'neu' ? 'neu' : 'laden';
      return { zusammenfassung: fasseSpielstandZusammen(s), gesichertAm: zeit > 0 ? zeit : null, grund };
    } catch {
      return null;
    }
  }

  /**
   * Holt den Stand vor dem Laden zurück, indem er mit dem jetzigen Stand tauscht: Der jetzige
   * liegt danach dort, das Zurückholen lässt sich also selbst wieder zurückholen. Wie nach dem
   * Laden einer Datei speichert danach nichts mehr, bis die Seite neu lädt.
   */
  holeStandVorLadenZurueck(): SchreibErgebnis {
    if (neuLadenAusstehend) return { ok: false, grund: STARTET_NEU };
    const vorLaden = localStorage.getItem(vorLadenKey);
    if (!vorLaden) return { ok: false, grund: 'Es gibt keinen Stand vor dem Laden.' };
    const jetzt = localStorage.getItem(saveKey);
    const geschrieben = schreibeZusammen({
      [saveKey]: vorLaden,
      [vorLadenKey]: jetzt,
      [vorLadenZeitKey]: jetzt ? String(Date.now()) : null,
      [vorLadenGrundKey]: null,
    });
    if (!geschrieben) return { ok: false, grund: KEIN_PLATZ };
    neuLadenAusstehend = true;
    return { ok: true };
  }

  /**
   * Neue Felder mit Standardwert, ohne SaveVersion-Erhöhung.
   * Läuft bei jedem Laden (migrate() nur bei älteren Versionen).
   */
  private ensureNewFields(state: GameState): void {
    if (!Array.isArray(state.erhalteneBauplaene)) state.erhalteneBauplaene = [];
    entferneTreppe(state);
  }

  private migrate(state: GameState): void {
    // Ensure tutorial field exists (added in UX rework)
    if (!state.tutorial) {
      (state as GameState).tutorial = { phase: 1, currentStep: 0, done: true };
    }

    // Ensure fighters have xp/level (added in GDD Teil 2)
    for (const fighter of state.fighters ?? []) {
      if (fighter.xp == null) fighter.xp = 0;
      if (fighter.level == null) fighter.level = 1;
    }

    // Batch 2 migration: Schwierigkeit, Modifikator und Score-Felder
    if (state.activeExpedition) {
      const exp = state.activeExpedition as ExpeditionRun;
      if (exp.difficulty == null) exp.difficulty = 'normal';
      if (exp.activeModifier === undefined) exp.activeModifier = null;
      if (exp.score == null) exp.score = 0;
      if (exp.totalCombatRounds == null) exp.totalCombatRounds = 0;
      if (exp.enemiesKilled == null) exp.enemiesKilled = 0;
      if (exp.bossesKilled == null) exp.bossesKilled = 0;
      // Batch 2 Encounter-Erweiterungen: focusTarget-System
      if (exp.focusTarget === undefined) exp.focusTarget = null;
      if (exp.focusTargetCooldown == null) exp.focusTargetCooldown = 0;
      // abilitiesUsed sicherstellen (neu)
      if (!exp.abilitiesUsed) exp.abilitiesUsed = {};
      // Buff-Arrays sicherstellen (vor Batch 2 evtl. nicht vorhanden)
      for (const unit of exp.party ?? []) {
        if (!unit.buffs) unit.buffs = [];
      }
      for (const room of exp.rooms ?? []) {
        for (const enemy of room.enemies ?? []) {
          if (!enemy.buffs) enemy.buffs = [];
        }
      }
    }

    // Batch 3: Scoreboard + Weekly Challenge + Statistics
    if (!state.scoreboard) (state as GameState).scoreboard = [];
    if (!state.statistics) (state as GameState).statistics = {};

    // SaveVersion 4: Guild Stats, Events, Specialists, Talismans, Class Unlocks
    if (!state.guildStats) {
      (state as GameState).guildStats = {
        rank: 1,
        forestShortCompleted: 0,
        forestMediumBossDefeated: false,
        totalBossesDefeated: 0,
        totalExpeditionsCompleted: 0,
        bossesDefeatedIds: [],
        guildHallT2: false,
      };
    }
    if (state.activeEvent === undefined) (state as GameState).activeEvent = null;
    if (!state.specialists) (state as GameState).specialists = [];
    if (!state.talismanInventory) (state as GameState).talismanInventory = [];
    if (state.selectedTalisman === undefined) (state as GameState).selectedTalisman = null;
    if (!state.classesUnlocked) (state as GameState).classesUnlocked = ['guardian', 'ranger', 'cleric'];
    if (state.satisfaction == null) (state as GameState).satisfaction = 50;
    if (state.eventTickAccumulator == null) (state as GameState).eventTickAccumulator = 0;

    // Ensure buildings have new fields
    for (const b of state.buildings ?? []) {
      if (b.specialistId === undefined) b.specialistId = null;
      if (b.upgrading === undefined) b.upgrading = false;
      if (b.upgradeProgress === undefined) b.upgradeProgress = 0;
      if (b.upgradeId === undefined) b.upgradeId = null;
      if (b.eventPaused === undefined) b.eventPaused = false;
    }

    // SaveVersion 5: Achievements
    if (!state.achievements) (state as GameState).achievements = [];

    // terrain editor fields – always ensure defined
    if (!state.swampTiles) state.swampTiles = {};
    if (!state.grayTiles)  state.grayTiles  = {};
    if (!state.dirtTiles)  state.dirtTiles   = {};

    // SaveVersion 6: UI Theme + Bestiarium + RescuedNpcs + WarMachine + gear schema
    if (!state.uiTheme) (state as GameState).uiTheme = 'classic';

    // SaveVersion 6: New GameState fields
    if (!(state as GameState).bestiarium) {
      (state as GameState).bestiarium = { discovered: [], defeated: [] };
    }
    if (!(state as GameState).rescuedNpcs) (state as GameState).rescuedNpcs = [];
    if (!(state as GameState).warMachineInventory) (state as GameState).warMachineInventory = [];
    if ((state as GameState).selectedWarMachine === undefined) (state as GameState).selectedWarMachine = null;

    // SaveVersion 6: gear schema migration (weapon → mainHand + offHand)
    for (const fighter of state.fighters ?? []) {
      const gear = fighter.gear as Record<string, string | null>;
      if ('weapon' in gear) {
        gear['mainHand'] = gear['weapon'] ?? null;
        delete gear['weapon'];
      }
      if (!('offHand' in gear)) {
        gear['offHand'] = null;
      }
    }

    // Stat patch: Paladin DEF reduced from 4 → 3
    for (const fighter of state.fighters ?? []) {
      if (fighter.classId === 'paladin' && fighter.baseStats?.def === 4) {
        fighter.baseStats.def = 3;
      }
    }

    // SaveVersion 9: Treasure Chest loot
    if (!(state as GameState).pendingChestLoot) {
      (state as GameState).pendingChestLoot = { items: {}, expeditionCount: 0 };
    }

    // SaveVersion 10: Remove old TREASURE_CHEST buildings (replaced by BANK/VAULT)
    if ((state as GameState).buildings) {
      (state as GameState).buildings = (state as GameState).buildings.filter(
        b => b.typeId !== 'TREASURE_CHEST'
      );
    }



    // SaveVersion 20: Remove buildings whose type no longer exists (e.g. BANK_V2, VAULT,
    // BANK_WITH_CHEST). City systems read BUILDING_DEFS[typeId] unchecked and would crash.
    this.removeUnknownBuildings(state);

    // SaveVersion 21: ein Gebäude je Art. Mehrere gleiche Gebäude werden zu einem
    // mit entsprechender Stufe verschmolzen (Arbeiter frei, Waren ins Lager).
    const verschmolzen = vereinigeDoppelte(state);
    if (verschmolzen > 0) console.log('Doppelte Gebäude zu Stufen verschmolzen:', verschmolzen);

    // SaveVersion 22: Auftragsliste der Werkstätten. Ein erteilter, noch nicht
    // gestarteter Auftrag (pendingCraft) wird zum ersten Eintrag der Liste.
    for (const b of state.buildings ?? []) {
      if (!Array.isArray(b.auftraege)) b.auftraege = [];
      if (BUILDING_DEFS[b.typeId]?.manualCraft && b.pendingCraft && !b.producing && b.activeRecipeId
          && b.auftraege.length === 0) {
        b.auftraege.push(b.activeRecipeId);
      }
    }

    // SaveVersion 23: Startklassen gestärkt. Vorhandene Helden bekommen den Unterschied
    // zwischen neuen und alten Grundwerten dazu (nur nach oben). Eine laufende
    // Expedition rechnet mit eigenen Kampfwerten und bleibt unverändert.
    const alteStartwerte: Record<string, { maxHp: number; atk: number; def: number }> = {
      guardian: { maxHp: 25, atk: 3, def: 2 },
      ranger:   { maxHp: 21, atk: 7, def: 1 },
      cleric:   { maxHp: 19, atk: 2, def: 1.5 },
    };
    for (const fighter of state.fighters ?? []) {
      const alt = alteStartwerte[fighter.classId];
      const neu = CLASS_DEFS[fighter.classId]?.baseStats;
      if (!alt || !neu || !fighter.baseStats) continue;
      const plusHp = Math.max(0, neu.maxHp - alt.maxHp);
      fighter.baseStats.maxHp += plusHp;
      fighter.baseStats.hp += plusHp;
      fighter.baseStats.atk += Math.max(0, neu.atk - alt.atk);
      fighter.baseStats.def += Math.max(0, neu.def - alt.def);
    }

    state.saveVersion = CURRENT_VERSION;
  }

  private removeUnknownBuildings(state: GameState): void {
    const removedIds = new Set(
      state.buildings.filter(b => !BUILDING_DEFS[b.typeId]).map(b => b.id),
    );
    if (removedIds.size === 0) return;
    entferneGebaeude(state, removedIds);
    console.log('Removed buildings with unknown types:', removedIds.size);
  }
}
