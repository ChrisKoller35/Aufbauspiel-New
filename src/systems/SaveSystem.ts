import { GameState, createNewGameState } from '../models/GameState';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { resetBuildingIdCounter } from '../models/Building';
import { resetCitizenIdCounter } from '../models/Citizen';
import { resetFighterIdCounter } from '../models/GuildRoster';

const SAVE_KEY = 'magic_city_save';
const CURRENT_VERSION = 5;

export class SaveSystem {
  save(state: GameState): boolean {
    try {
      state.saveVersion = CURRENT_VERSION;
      const json = JSON.stringify(state);
      localStorage.setItem(SAVE_KEY, json);
      console.log('Game saved. Size:', json.length, 'bytes');
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  load(): GameState | null {
    try {
      const json = localStorage.getItem(SAVE_KEY);
      if (!json) return null;

      const state = JSON.parse(json) as GameState;

      // Version migration (future-proof)
      if (state.saveVersion < CURRENT_VERSION) {
        this.migrate(state);
      }

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
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  /** Download save as JSON file */
  exportSave(): void {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) {
      console.warn('No save to export');
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `magic_city_save_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('Save exported.');
  }

  /** Import save from JSON file, returns true on success */
  importSave(): Promise<boolean> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { resolve(false); return; }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = reader.result as string;
            const parsed = JSON.parse(json) as GameState;
            // Sanity check
            if (!parsed.grid || !Array.isArray(parsed.buildings) || !parsed.globalStock
                || !Array.isArray(parsed.citizens) || !Array.isArray(parsed.fighters)) {
              console.error('Invalid save file');
              resolve(false);
              return;
            }
            localStorage.setItem(SAVE_KEY, json);
            console.log('Save imported. Day:', parsed.day);
            resolve(true);
          } catch (e) {
            console.error('Import failed:', e);
            resolve(false);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
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

    state.saveVersion = CURRENT_VERSION;
  }
}
