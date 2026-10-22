import { ACHIEVEMENT_DEFS } from '../data/achievements';
import { BUILDING_DEFS } from '../data/buildings';
import { stadtStufeVon } from '../data/stadtstufen';
import { GameState } from '../models/GameState';
import { maxStufe, stufeVon } from './Ausbau';
import { getrageneSets } from './DungeonSets';
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
 * Schreibt die Kennzahlen, die niemand von selbst zählt, in state.statistics:
 * Stadtstufe, Helden, Wege und Meister, ganze Sets, Monsterbuch, Gildenrang
 * und Ausbaustufen. Es zählt jeweils der höchste je erreichte Wert, damit
 * kein Fortschrittsbalken zurückfällt (z. B. wenn ein Held die Gilde verlässt).
 */
export function kennzahlenAktualisieren(state: GameState): void {
  const stats = state.statistics ?? (state.statistics = {});
  const hoechstens = (key: string, wert: number): void => {
    stats[key] = Math.max(stats[key] ?? 0, wert);
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
  const wohnstufen = gebaeude.filter(b => BUILDING_DEFS[b.typeId]?.housing).map(stufeVon);
  const ganzAusgebaut = gebaeude.filter(b => maxStufe(b.typeId) > 1 && stufeVon(b) >= maxStufe(b.typeId));

  hoechstens('stadtstufe', stadtStufeVon(state));
  hoechstens('helden_anzahl', helden.length);
  hoechstens('helden_mit_weg', helden.filter(h => wegVon(h)).length);
  hoechstens('helden_meister', helden.filter(h => istMeister(h)).length);
  hoechstens('ganze_sets', ganzeSets.size);
  hoechstens('monsterbuch_entdeckt', new Set(state.bestiarium?.discovered ?? []).size);
  hoechstens('gildenrang', getGildenrang(state));
  hoechstens('hoechste_wohnstufe', Math.max(0, ...wohnstufen));
  hoechstens('gebaeude_auf_hoechststufe', ganzAusgebaut.length);
}

type NeueErfolgeHoerer = (namen: string[], state: GameState) => void;
const hoerer = new Set<NeueErfolgeHoerer>();

/** Anmelden für «neue Erfolge» (z. B. Hinweis und Zahl in der Kopfzeile). Gibt die Abmeldung zurück. */
export function beiNeuenErfolgen(fn: NeueErfolgeHoerer): () => void {
  hoerer.add(fn);
  return () => hoerer.delete(fn);
}

/**
 * Kennzahlen aktualisieren, neue Erfolge in state.achievements eintragen
 * (genau einmal) und melden. Gibt die neuen IDs zurück.
 */
export function erfolgePruefen(state: GameState): string[] {
  kennzahlenAktualisieren(state);
  if (!Array.isArray(state.achievements)) state.achievements = [];
  const neu = new AchievementSystem().checkAchievements(state.statistics, state.achievements);
  if (neu.length === 0) return neu;
  state.achievements.push(...neu);
  const namen = neu.map(id => ACHIEVEMENT_DEFS.find(d => d.id === id)?.name ?? id);
  for (const fn of hoerer) fn(namen, state);
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

/** Der Spieler öffnet den Erfolge-Bildschirm: alles Freigeschaltete gilt als angeschaut. */
export function erfolgeAngeschaut(state: GameState): void {
  if (!state.statistics) state.statistics = {};
  state.statistics[ERFOLGE_GESEHEN] = freigeschalteteErfolge(state);
}
