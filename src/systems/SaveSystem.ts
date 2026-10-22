import { GameState } from '../models/GameState';
import { resetBuildingIdCounter } from '../models/Building';
import { resetFighterIdCounter } from '../models/GuildRoster';
import { BUILDING_DEFS } from '../data/buildings';
import { stadtStufeVon } from '../data/stadtstufen';
import { ExpeditionSystem } from './ExpeditionSystem';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { ranglisteKurz } from './Rangliste';
import { brettKurz } from './Auftragsbrett';
import { vereinigeDoppelte } from './Ausbau';
import { SPIELSTAND, istMagicCityStand, nurSichereTexte } from './SpielstandSchema';

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
/**
 * Version 24 ist die Gildenstadt (docs/GILDENSTADT.md). Ältere Stände (Bauernhöfe, Bewohner,
 * Raster) werden nicht übernommen: Laden gilt wie «kein Spielstand», es gibt keine Migration.
 */
export const CURRENT_VERSION = 24;
const SAVE_SIZE_WARNING_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Ein Stand aus einer Datei (oder der Stand vor dem Laden) ist geschrieben, die Seite lädt
 * gleich neu. Bis dahin schreibt nichts mehr: sonst überschreibt das laufende Spiel den neuen
 * Stand (Speichern alle 60 s, F5, mc:speichern) oder ein zweiter Klick schreibt nochmals.
 */
let neuLadenAusstehend = false;

/** load() hat einen Stand aus der Zeit vor der Gildenstadt vorgefunden und nicht übernommen. */
let alterStandVerworfen = false;

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
  alterStandVerworfen = false;
}

/**
 * true, wenn load() beim Start einen Stand aus der Zeit vor der Gildenstadt gefunden und
 * verworfen hat (main.ts beginnt dann ein neues Spiel und kann VOR_GILDENSTADT zeigen).
 */
export function alterStandVerworfenBeimStart(): boolean {
  return alterStandVerworfen;
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
/** Stand mit Version unter CURRENT_VERSION (Fenster «Spielstand», Hinweis beim Start). */
export const VOR_GILDENSTADT = 'Dieser Spielstand stammt aus der Zeit vor der Gildenstadt und kann nicht geladen werden.';

/** true, solange das Probespiel seinen eigenen Speicherplatz nutzt (nutzeProbespiel). */
export function probespielAktiv(): boolean {
  return saveKey === 'magic_city_probe';
}

/** Stand aus der Zeit vor der Gildenstadt: Version fehlt, ist keine ganze Zahl oder liegt unter 24. */
function versionZuAlt(version: unknown): boolean {
  return !(Number.isInteger(version) && Number(version) >= CURRENT_VERSION);
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

/**
 * Prüft den Text einer Spielstand-Datei, ohne etwas zu schreiben (docs/SPIELSTAND.md):
 * lesbares JSON mit den Pflichtfeldern, die Version der Gildenstadt (ältere: VOR_GILDENSTADT),
 * die Form aller Felder (SPIELSTAND), ein Probe-Laden wie beim Start (SaveSystem.probeLaden)
 * und keine Texte, die zu HTML würden. Die Zusammenfassung zeigt den Stand, wie ihn das Spiel
 * nach dem Laden hat.
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
    const version: unknown = daten.saveVersion;
    if (version != null && !(Number.isInteger(version) && Number(version) >= 0)) return { ok: false, grund: KEINE_DATEI };
    if (Number(version) > CURRENT_VERSION) return { ok: false, grund: 'Diese Datei ist von einer neueren Version des Spiels.' };
    if (versionZuAlt(version)) return { ok: false, grund: VOR_GILDENSTADT };
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

/** Check whether an error is a localStorage QuotaExceededError. */
function isQuotaExceeded(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.message.toLowerCase().includes('quota')
  );
}

export class SaveSystem {
  save(state: GameState): boolean {
    // Ein geladener Stand wartet auf das Neuladen der Seite: nicht überschreiben
    if (neuLadenAusstehend) return false;
    try {
      state.saveVersion = CURRENT_VERSION;
      const json = JSON.stringify(state);
      if (json.length > SAVE_SIZE_WARNING_BYTES) {
        console.warn(`Save size (${json.length} bytes) exceeds 4 MB warning threshold!`);
      }
      console.log('Game saved. Size:', json.length, 'bytes');

      // Sicherung: der bisherige Stand kommt auf den Backup-Platz, bevor er überschrieben wird
      try {
        const previous = localStorage.getItem(saveKey);
        if (previous) localStorage.setItem(backupKey, previous);
      } catch (backupErr) {
        console.warn('Could not write backup save:', backupErr);
      }

      try {
        localStorage.setItem(saveKey, json);
        return true;
      } catch (e: unknown) {
        if (!isQuotaExceeded(e)) throw e;
        return this.saveTrotzVollemSpeicher(state, json);
      }
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  /** Der Speicher ist voll: erst die Sicherung opfern, dann die Bestenliste kürzen. */
  private saveTrotzVollemSpeicher(state: GameState, json: string): boolean {
    console.warn('QuotaExceededError: removing backup to free space...');
    try { localStorage.removeItem(backupKey); } catch (_) { /* ignore */ }
    try {
      localStorage.setItem(saveKey, json);
      return true;
    } catch (e2: unknown) {
      if (!isQuotaExceeded(e2)) throw e2;
    }

    console.warn('QuotaExceededError: trimming scoreboard entries...');
    if (state.scoreboard && state.scoreboard.length > 10) {
      state.scoreboard = state.scoreboard.slice(-10);
      try {
        localStorage.setItem(saveKey, JSON.stringify(state));
        return true;
      } catch (e3: unknown) {
        if (!isQuotaExceeded(e3)) throw e3;
      }
    }

    console.error('Save failed: storage quota exceeded even after cleanup.');
    return false;
  }

  /**
   * Liest den Spielstand. Ein Stand aus der Zeit vor der Gildenstadt gilt wie keiner: main.ts
   * beginnt dann ein neues Spiel (alterStandVerworfenBeimStart sagt dem Spiel, warum). Die
   * Sicherung (Backup-Platz) liest nur, wer sie von Hand zurückkopiert (docs/SPIELSTAND.md).
   */
  load(): GameState | null {
    try {
      const json = localStorage.getItem(saveKey);
      if (!json) return null;
      const roh = JSON.parse(json) as GameState;
      if (versionZuAlt(roh.saveVersion)) {
        alterStandVerworfen = true;
        console.log(`Spielstand (Version ${roh.saveVersion ?? 'ohne'}) aus der Zeit vor der Gildenstadt wird nicht übernommen.`);
        return null;
      }
      const state = this.bereiteVor(roh);
      this.setzeIdZaehler(state);
      console.log('Game loaded. Day:', state.day, 'Buildings:', state.buildings.length);
      return state;
    } catch (e) {
      console.error('Load failed:', e);
      return null;
    }
  }

  /**
   * Was bei jedem Laden mit dem gelesenen Stand geschieht (load, probeLaden): fehlende Felder
   * anlegen, doppelte Gebäude einer Art zu einem verschmelzen (ein Gebäude je Art, systems/Ausbau.ts).
   */
  private bereiteVor(state: GameState): GameState {
    if (!Array.isArray(state.erhalteneBauplaene)) state.erhalteneBauplaene = [];
    vereinigeDoppelte(state);
    return state;
  }

  /** Neue Gebäude und Helden bekommen IDs nach den höchsten im Stand. */
  private setzeIdZaehler(state: GameState): void {
    resetBuildingIdCounter(state.buildings.reduce((max, b) => Math.max(max, b.id), 0) + 1);
    resetFighterIdCounter(state.fighters.reduce((max, f) => Math.max(max, f.id), 0) + 1);
  }

  /**
   * Probe-Laden für eine Datei (pruefeSpielstandText): dieselbe Lade-Logik wie beim Start.
   * Erst wie load() (ohne Speicher und ohne ID-Zähler), dann die Schritte aus main.ts vor dem
   * ersten Bild: eine unterbrochene Expedition abbrechen, alle Helden mit vollen Leben. Dazu,
   * was das Hauptmenü vom Stand liest (Rangliste, Auftragsbrett), denn ohne Hauptmenü kommt
   * niemand mehr an dieses Fenster. Ändert nur `state` und wirft, wenn das Spiel mit diesem
   * Stand nicht starten würde. Kommt in main.ts ein Schritt dazu, gehört er auch hierher.
   */
  probeLaden(state: GameState): GameState {
    this.bereiteVor(state);
    // Städtische Systeme lesen BUILDING_DEFS[typeId] ungeprüft
    const unbekannt = state.buildings.find(b => !BUILDING_DEFS[b.typeId]);
    if (unbekannt) throw new Error(`Unbekannte Gebäude-Art: ${unbekannt.typeId}`);
    new ExpeditionSystem(new GearSystem(), new ProvisionSystem()).abortExpedition(state);
    for (const fighter of state.fighters) fighter.baseStats.hp = fighter.baseStats.maxHp;
    const jetzt = Date.now();
    ranglisteKurz(state, jetzt);
    brettKurz(state, jetzt);
    return state;
  }

  deleteSave(): void {
    localStorage.removeItem(saveKey);
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

  /**
   * Der Stand vor dem letzten Laden einer Datei, null wenn keiner da ist, er sich nicht lesen
   * lässt oder aus der Zeit vor der Gildenstadt stammt (zurückgeholt würde er nicht geladen).
   */
  standVorLaden(): StandVorLaden | null {
    const text = localStorage.getItem(vorLadenKey);
    if (!text) return null;
    try {
      const s: unknown = JSON.parse(text);
      if (!istMagicCityStand(s) || versionZuAlt(s.saveVersion)) return null;
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
    if (!this.standVorLaden()) return { ok: false, grund: 'Es gibt keinen Stand vor dem Laden.' };
    const vorLaden = localStorage.getItem(vorLadenKey)!;
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
}
