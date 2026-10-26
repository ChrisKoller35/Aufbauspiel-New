import { ACHIEVEMENT_DEFS } from '../data/achievements';
import { BUILDING_DEFS } from '../data/buildings';
import { setFuerRoute, setTeilIds } from '../data/dungeonSets';
import { isRouteCompleted } from '../data/routes';
import { MAX_SCHMIEDE_STUFE } from '../data/schmiede';
import { stadtStufeVon } from '../data/stadtstufen';
import { GameState } from '../models/GameState';
import { stufeVon } from './Ausbau';
import { saalKapitel } from './Auftragsbrett';
import { gesammelteTeile, getrageneSets } from './DungeonSets';
import { getGildenrang } from './GebaeudeStatus';
import { istMeister, wegVon } from './Spezialisierung';

/** Anzahl der Erfolge, die der Spieler beim letzten Öffnen des Erfolge-Bildschirms gesehen hat */
export const ERFOLGE_GESEHEN = 'erfolge_gesehen';

/**
 * Achievement-System: Prüft, ob neue Erfolge freigeschaltet wurden.
 */
export class AchievementSystem {
  /**
   * Prüft alle Erfolge gegen die aktuellen Statistiken.
   * Gibt die IDs aller NEU freigeschalteten Erfolge zurück.
   *
   * @param stats - state.statistics (Record<string, number>)
   * @param unlockedIds - state.achievements (bereits freigeschaltete IDs)
   * @returns Array der neu freigeschalteten Erfolg-IDs
   */
  checkAchievements(
    stats: Record<string, number>,
    unlockedIds: string[],
  ): string[] {
    const newlyUnlocked: string[] = [];

    for (const def of ACHIEVEMENT_DEFS) {
      // Schon freigeschaltet? Überspringen.
      if (unlockedIds.includes(def.id)) continue;

      // Bedingung erfüllt?
      if (def.condition(stats)) {
        newlyUnlocked.push(def.id);
      }
    }

    return newlyUnlocked;
  }
}

/**
 * Sterne im Trophäensaal (Glanz des Saals), wie systems/Trophaeensaal.ts sie zählt: je Sockel einer für den
 * bezwungenen Boss, einer für das ganze Set des Dungeons, einer für das Prunkstück aus der Kette. Liest nur:
 * bossTrophaeen() würde nebenbei das Auftragsbrett auf den heutigen Tag stellen.
 */
export function saalSterne(state: GameState): number {
  const fertig = state.auftragsbrett?.kette?.fertig ?? [];
  const siege = state.trophaeen?.siege ?? {};
  let sterne = 0;
  for (const { routeId } of saalKapitel()) {
    const set = setFuerRoute(routeId);
    if (isRouteCompleted(routeId, state) || (siege[routeId] ?? 0) > 0) sterne++;
    if (set && gesammelteTeile(state, set).length >= setTeilIds(set).length) sterne++;
    if (fertig.includes(routeId)) sterne++;
  }
  return sterne;
}

/**
 * Schreibt die Kennzahlen, die niemand von selbst zählt, in state.statistics:
 * Stadtstufe, Helden, Wege und Meister, ganze Sets, Monsterbuch, Gildenrang,
 * Werkstätten und ihre Stufen, Auftragsbrett, Trophäensaal, Pokale und
 * Schmiede. Es zählt jeweils der höchste je erreichte Wert, damit kein Fortschrittsbalken
 * zurückfällt (z. B. wenn ein Held die Gilde verlässt). Tage, Siege, Bosse und Gegner
 * kommen aus dem Spielstand selbst (Tag, Gildenstatistik und Bestenliste). Käufe beim Händler
 * (total_haendler_kaeufe) zählt systems/Haendler.ts bei jedem Kauf; hier wird nur gelesen.
 */
export function kennzahlenAktualisieren(state: GameState): void {
  const stats = state.statistics ?? (state.statistics = {});
  // Nur gültige Zahlen: Ein NaN aus einem kaputten Spielstand bliebe sonst für immer stehen
  const zahl = (wert: number | undefined): number => (Number.isFinite(wert) ? wert! : 0);
  const hoechstens = (key: string, wert: number): void => {
    stats[key] = Math.max(zahl(stats[key]), zahl(wert));
  };

  const helden = state.fighters ?? [];
  const ganzeSets = new Set<string>();
  for (const held of helden) {
    if (!held?.gear) continue;
    for (const { set, teile } of getrageneSets(held.gear)) {
      if (teile >= 3) ganzeSets.add(set.id);
    }
  }

  const gebaeude = (state.buildings ?? []).filter(b => b && b.built);
  const werkstaetten = gebaeude.filter(b => BUILDING_DEFS[b.typeId]?.manualCraft);

  hoechstens('stadtstufe', stadtStufeVon(state));
  hoechstens('helden_anzahl', helden.length);
  hoechstens('helden_mit_weg', helden.filter(h => wegVon(h)).length);
  hoechstens('helden_meister', helden.filter(h => istMeister(h)).length);
  hoechstens('ganze_sets', ganzeSets.size);
  hoechstens('monsterbuch_entdeckt', new Set(state.bestiarium?.discovered ?? []).size);
  hoechstens('gildenrang', getGildenrang(state));
  hoechstens('werkstaetten', werkstaetten.length);
  hoechstens('werkstatt_hoechste_stufe', Math.max(0, ...werkstaetten.map(stufeVon)));

  // Gildenhaus: Auftragsbrett, Kette «Der Saal der Gilde» und Trophäensaal; Pokale der Rangliste
  // (abgeholte und solche, deren Ruhmestruhe noch wartet); die beste Stufe aus der Schmiede
  const brett = state.auftragsbrett;
  const kapitel = new Set(saalKapitel().map(k => k.routeId));
  const pokale = state.rangliste?.pokale;
  const stufen = Object.values(state.schmiede?.stufen ?? {}).filter(n => Number.isFinite(n));
  hoechstens('zettel_erledigt', brett?.erledigt ?? 0);
  hoechstens('saal_prunkstuecke', (brett?.kette?.fertig ?? []).filter(id => kapitel.has(id)).length);
  hoechstens('saal_sterne', saalSterne(state));
  hoechstens('rangliste_pokale', zahl(pokale?.gold) + zahl(pokale?.silber) + zahl(pokale?.bronze)
    + (state.rangliste?.offen ?? []).filter(w => w.pokal).length);
  hoechstens('schmiede_hoechste_stufe', Math.min(MAX_SCHMIEDE_STUFE, Math.max(0, ...stufen)));

  // Tag 1 = 0 Tage überstanden; Siege und Bosse kennt die Gildenstatistik vollständig,
  // die Bestenliste nur ihre 100 besten Läufe
  const bestenliste = state.scoreboard ?? [];
  const mitStatus = (status: string): number => bestenliste.filter(e => e.status === status).length;
  const summe = (feld: 'enemiesKilled' | 'bossesKilled'): number => bestenliste.reduce((s, e) => s + (e[feld] ?? 0), 0);
  hoechstens('total_days_survived', (state.day ?? 1) - 1);
  hoechstens('total_victories', Math.max(state.guildStats?.totalExpeditionsCompleted ?? 0, mitStatus('victory')));
  hoechstens('total_defeats', mitStatus('defeat'));
  hoechstens('total_retreats', mitStatus('retreat'));
  hoechstens('total_bosses_killed', Math.max(state.guildStats?.totalBossesDefeated ?? 0, summe('bossesKilled')));
  hoechstens('total_enemies_killed', summe('enemiesKilled'));
  // Jede beendete Expedition wurde auch gestartet; jede Ausbaustufe über 1 war ein Ausbau,
  // und ein Ausbau zählt für «Baumeister» wie ein Bau
  hoechstens('total_expeditions', (stats.total_victories ?? 0) + (stats.total_defeats ?? 0) + (stats.total_retreats ?? 0));
  hoechstens('total_upgrades', gebaeude.reduce((s, b) => s + Math.max(0, stufeVon(b) - 1), 0));
  hoechstens('total_buildings_built', stats.total_upgrades ?? 0);
}

/**
 * Hörer für neue Erfolge (Kopfzeile, Erfolge-Bildschirm). `hinweis`: false, wenn der Aufrufer
 * die Erfolge selbst nennt (Bilanz nach einer Expedition), dann ohne Hinweis in der Kopfzeile.
 */
type NeueErfolgeHoerer = (ids: string[], state: GameState, hinweis: boolean) => void;
const hoerer = new Set<NeueErfolgeHoerer>();

/** Anmelden für «neue Erfolge» (z. B. Hinweis und Zahl in der Kopfzeile). Gibt die Abmeldung zurück. */
export function beiNeuenErfolgen(fn: NeueErfolgeHoerer): () => void {
  hoerer.add(fn);
  return () => hoerer.delete(fn);
}

/** Name eines Erfolgs (unbekannte IDs bleiben, wie sie sind) */
export function erfolgName(id: string): string {
  return ACHIEVEMENT_DEFS.find(d => d.id === id)?.name ?? id;
}

/** Zeile für die Bilanz nach der Expedition: Gipfel-Taten mit ihrem Satz («Name – Beschreibung»), sonst der Name */
export function erfolgBilanzZeile(id: string): string {
  const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
  return def?.gruppe === 'Gipfel-Taten' ? `${def.name} – ${def.description}` : erfolgName(id);
}

/**
 * Kennzahlen aktualisieren, neue Erfolge in state.achievements eintragen
 * (genau einmal) und melden. Gibt die neuen IDs zurück.
 * hinweis: false, wenn der Aufrufer die neuen Erfolge selbst zeigt (Bilanz nach der Expedition).
 */
export function erfolgePruefen(state: GameState, { hinweis = true }: { hinweis?: boolean } = {}): string[] {
  kennzahlenAktualisieren(state);
  if (!Array.isArray(state.achievements)) state.achievements = [];
  const neu = new AchievementSystem().checkAchievements(state.statistics, state.achievements);
  if (neu.length === 0) return neu;
  state.achievements.push(...neu);
  for (const fn of hoerer) fn(neu, state, hinweis);
  return neu;
}

/** Wie viele der bekannten Erfolge freigeschaltet sind (unbekannte IDs aus alten Spielständen zählen nicht) */
export function freigeschalteteErfolge(state: GameState): number {
  const ids = new Set(state.achievements ?? []);
  return ACHIEVEMENT_DEFS.filter(d => ids.has(d.id)).length;
}

/** Erfolge, die seit dem letzten Öffnen des Erfolge-Bildschirms dazugekommen sind */
export function ungeseheneErfolge(state: GameState): number {
  return Math.max(0, freigeschalteteErfolge(state) - (state.statistics?.[ERFOLGE_GESEHEN] ?? 0));
}

/** Die noch nicht angeschauten Erfolge (die zuletzt freigeschalteten bekannten IDs) */
export function ungeseheneErfolgIds(state: GameState): string[] {
  const neu = ungeseheneErfolge(state);
  if (neu === 0) return [];
  const bekannt = new Set(ACHIEVEMENT_DEFS.map(d => d.id));
  return (state.achievements ?? []).filter(id => bekannt.has(id)).slice(-neu);
}

/**
 * Der Spieler sieht den Erfolge-Bildschirm: alles Freigeschaltete gilt als angeschaut.
 * Gibt true zurück, wenn sich dadurch etwas geändert hat (dann lohnt sich Speichern).
 */
export function erfolgeAngeschaut(state: GameState): boolean {
  if (!state.statistics) state.statistics = {};
  const vorher = state.statistics[ERFOLGE_GESEHEN] ?? 0;
  state.statistics[ERFOLGE_GESEHEN] = freigeschalteteErfolge(state);
  return state.statistics[ERFOLGE_GESEHEN] !== vorher;
}
