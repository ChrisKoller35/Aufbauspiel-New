import { GameState, createNewGameState } from '../models/GameState';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { resetBuildingIdCounter } from '../models/Building';
import { resetCitizenIdCounter } from '../models/Citizen';
import { resetFighterIdCounter } from '../models/GuildRoster';
import { BUILDING_DEFS } from '../data/buildings';
import { CLASS_DEFS } from '../data/classes';
import { entferneGebaeude, vereinigeDoppelte } from './Ausbau';
import { stadtStufeVon } from '../data/stadtstufen';

/** Speicherplatz aller SaveSystem-Instanzen; das Probespiel hat einen eigenen (nutzeProbespiel) */
let saveKey = 'magic_city_save';
let backupKey = 'magic_city_save_backup';
const CURRENT_VERSION = 23;
const SAVE_SIZE_WARNING_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Probespiel (localhost:5173/?probe): Ab jetzt laden und speichern alle
 * SaveSystem-Instanzen auf einem eigenen Platz, der richtige Spielstand bleibt
 * unberührt. Vor dem ersten Laden aufrufen (main.ts). false schaltet zurück (Tests).
 */
export function nutzeProbespiel(aktiv = true): void {
  saveKey = aktiv ? 'magic_city_probe' : 'magic_city_save';
  backupKey = aktiv ? 'magic_city_probe_backup' : 'magic_city_save_backup';
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

/** true, solange das Probespiel seinen eigenen Speicherplatz nutzt (nutzeProbespiel). */
export function probespielAktiv(): boolean {
  return saveKey === 'magic_city_probe';
}

export function fasseSpielstandZusammen(state: Pick<GameState, 'day' | 'fighters' | 'stadtweg'>): SpielstandZusammenfassung {
  const stufen = (state.fighters ?? []).map(f => Number(f.level) || 1);
  return {
    tag: Number(state.day) || 1,
    stadtstufe: stadtStufeVon(state),
    helden: stufen.length,
    hoechsteHeldenstufe: stufen.length > 0 ? Math.max(...stufen) : 0,
  };
}

/**
 * Prüft den Text einer Spielstand-Datei, ohne etwas zu schreiben. Abgelehnt werden
 * unlesbares JSON, Dateien ohne die Pflichtfelder und Stände einer neueren Version.
 * Ältere Versionen sind erlaubt, load() hebt sie an.
 */
export function pruefeSpielstandText(text: string): SpielstandPruefung {
  let daten: unknown;
  try {
    daten = JSON.parse(text);
  } catch {
    return { ok: false, grund: 'Die Datei lässt sich nicht lesen.' };
  }
  const s = daten as Partial<GameState> | null;
  if (!s || typeof s !== 'object' || Array.isArray(s) || !s.grid || !Array.isArray(s.buildings)
      || !s.globalStock || typeof s.globalStock !== 'object'
      || !Array.isArray(s.citizens) || !Array.isArray(s.fighters)) {
    return { ok: false, grund: 'Das ist keine Magic-City-Datei.' };
  }
  if (typeof s.saveVersion === 'number' && s.saveVersion > CURRENT_VERSION) {
    return { ok: false, grund: 'Diese Datei ist von einer neueren Version des Spiels.' };
  }
  return { ok: true, zusammenfassung: fasseSpielstandZusammen(s as GameState) };
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

      const state = JSON.parse(json) as GameState;

      // Version migration — also handles very old saves without a version field
      if (!state.saveVersion || state.saveVersion < CURRENT_VERSION) {
        this.migrate(state);
      }
      this.ensureNewFields(state);
      loeseAlteZustaende(state);

      // Always remove deprecated items
      delete state.globalStock['war_hammer'];

      // Reset ID counters to avoid collisions
      const maxBuildingId = state.buildings.reduce((max, b) => Math.max(max, b.id), 0);
      const maxCitizenId = state.citizens.reduce((max, c) => Math.max(max, c.id), 0);
      const maxFighterId = state.fighters.reduce((max, f) => Math.max(max, f.id), 0);
      resetBuildingIdCounter(maxBuildingId + 1);
      resetCitizenIdCounter(maxCitizenId + 1);
      resetFighterIdCounter(maxFighterId + 1);

      console.log('Game loaded. Day:', state.day, 'Buildings:', state.buildings.length);
      return state;
    } catch (e) {
      console.error('Load failed:', e);
      return null;
    }
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

      const state = JSON.parse(json) as GameState;

      if (!state.saveVersion || state.saveVersion < CURRENT_VERSION) {
        this.migrate(state);
      }
      this.ensureNewFields(state);
      loeseAlteZustaende(state);

      const maxBuildingId = state.buildings.reduce((max, b) => Math.max(max, b.id), 0);
      const maxCitizenId = state.citizens.reduce((max, c) => Math.max(max, c.id), 0);
      const maxFighterId = state.fighters.reduce((max, f) => Math.max(max, f.id), 0);
      resetBuildingIdCounter(maxBuildingId + 1);
      resetCitizenIdCounter(maxCitizenId + 1);
      resetFighterIdCounter(maxFighterId + 1);

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
   * besteht; der bisherige Stand bleibt als Sicherung. Danach muss das Spiel sofort neu
   * laden (location.reload), sonst überschreibt das laufende Spiel den geladenen Stand.
   */
  schreibeSpielstandText(text: string): SpielstandPruefung {
    const pruefung = pruefeSpielstandText(text);
    if (!pruefung.ok) return pruefung;
    try {
      const bisher = localStorage.getItem(saveKey);
      if (bisher) localStorage.setItem(backupKey, bisher);
      localStorage.setItem(saveKey, text);
    } catch (e) {
      console.error('Spielstand laden fehlgeschlagen:', e);
      return { ok: false, grund: 'Der Browser hat keinen Platz, um den Spielstand zu speichern.' };
    }
    return pruefung;
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
