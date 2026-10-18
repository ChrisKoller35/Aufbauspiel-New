import { GameState, createNewGameState } from '../models/GameState';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { resetBuildingIdCounter } from '../models/Building';
import { resetCitizenIdCounter } from '../models/Citizen';
import { resetFighterIdCounter } from '../models/GuildRoster';

const SAVE_KEY = 'magic_city_save';
const BACKUP_KEY = 'magic_city_save_backup';
const CURRENT_VERSION = 19;
const SAVE_SIZE_WARNING_BYTES = 4 * 1024 * 1024; // 4 MB

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
        const previous = localStorage.getItem(SAVE_KEY);
        if (previous) {
          localStorage.setItem(BACKUP_KEY, previous);
        }
      } catch (backupErr) {
        // Backup failure is non-critical – continue with main save
        console.warn('Could not write backup save:', backupErr);
      }

      // --- Main save with QuotaExceeded fallback cascade ---
      try {
        localStorage.setItem(SAVE_KEY, json);
        return true;
      } catch (e: unknown) {
        if (!this.isQuotaExceeded(e)) throw e;

        // Step 1: Remove backup to free space, then retry
        console.warn('QuotaExceededError: removing backup to free space...');
        try { localStorage.removeItem(BACKUP_KEY); } catch (_) { /* ignore */ }
        try {
          localStorage.setItem(SAVE_KEY, json);
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
            localStorage.setItem(SAVE_KEY, trimmedJson);
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
    const json = localStorage.getItem(SAVE_KEY);
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
      const json = localStorage.getItem(SAVE_KEY);
      if (!json) return null;

      const state = JSON.parse(json) as GameState;

      // Version migration — also handles very old saves without a version field
      if (!state.saveVersion || state.saveVersion < CURRENT_VERSION) {
        this.migrate(state);
      }
      this.ensureNewFields(state);

      // Always remove deprecated items
      delete state.globalStock['war_hammer'];
      delete state.globalStock['arcane_amulet'];

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

  hasBackup(): boolean {
    return localStorage.getItem(BACKUP_KEY) !== null;
  }

  /** Load the backup save slot. Returns null if no backup exists. */
  loadBackup(): GameState | null {
    try {
      const json = localStorage.getItem(BACKUP_KEY);
      if (!json) return null;

      const state = JSON.parse(json) as GameState;

      if (!state.saveVersion || state.saveVersion < CURRENT_VERSION) {
        this.migrate(state);
      }
      this.ensureNewFields(state);

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
    localStorage.removeItem(SAVE_KEY);
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

  /**
   * Neue Felder mit Standardwert, ohne SaveVersion-Erhöhung.
   * Läuft bei jedem Laden (migrate() nur bei älteren Versionen).
   */
  private ensureNewFields(state: GameState): void {
    if (!Array.isArray(state.erhalteneBauplaene)) state.erhalteneBauplaene = [];
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



    // SaveVersion 12: Add novizenrobe to globalStock for preview
    if (!state.globalStock['novizenrobe']) {
      state.globalStock['novizenrobe'] = 1;
    }

    // SaveVersion 13: Add all T1/T2 armor items for preview
    const previewItems = [
      'chain_armor', 'leather_armor', 'novizenrobe', 'wolf_fang_necklace',
      'heavy_leather_armor', 'battle_robe', 'steel_armor', 'steel_shield', 'crystal_pendant',
    ];
    for (const id of previewItems) {
      if (!state.globalStock[id]) state.globalStock[id] = 1;
    }

    // SaveVersion 15: Add T3/T4 weapons + armor for preview
    const t3t4Items = [
      'hydra_venomfang', 'fallen_hunters_bow', 'wyrm_scale_shield', 'crystal_golem_staff',
      'mystic_plate_armor', 'bandit_king_armor', 'spider_silk_robe', 'lich_phylactery',
      'eternal_hunter_bow', 'worldend_staff', 'soulbreaker', 'aether_guardian_shield',
      'arcane_blade', 'magitech_shield',
      'dragonlord_plate', 'shadowhunter_armor', 'magiarch_robe', 'aether_heart',
    ];
    for (const id of t3t4Items) {
      if (!state.globalStock[id]) state.globalStock[id] = 1;
    }

    // SaveVersion 16: Remove unwanted items from inventory
    delete state.globalStock['war_hammer'];
    delete state.globalStock['arcane_amulet'];

    // SaveVersion 17: Restore BANK_V2 if all loot buildings were accidentally demolished
    const lootTypes = new Set(['BANK_V2', 'BANK', 'BANK_WITH_CHEST', 'VAULT']);
    const hasLootBuilding = state.buildings.some(b => lootTypes.has(b.typeId));
    if (!hasLootBuilding) {
      const maxId = state.buildings.reduce((m, b) => Math.max(m, b.id), 0);
      state.buildings.push({
        id: maxId + 1,
        typeId: 'BANK_V2',
        x: 12, y: 4,
        built: true,
        buildProgress: 0,
        assignedWorkerIds: [],
        assignedBuilderId: null,
        activeRecipeId: null,
        productionTimer: 0,
        producing: false,
        localInputBuffer: {},
        localOutputBuffer: {},
        connected: false,
        waterSupplied: false,
        tier: 1,
        synergySpeedMult: 1.0,
        specialistId: null,
        upgrading: false,
        upgradeProgress: 0,
        upgradeId: null,
        eventPaused: false,
        pendingCraft: false,
      });
    }

    // SaveVersion 18: Remove the migration-injected BANK_V2 at (12,4) if a real one exists
    const lootTypes2 = new Set(['BANK_V2', 'BANK', 'BANK_WITH_CHEST', 'VAULT']);
    const realLootBuildings = state.buildings.filter(b => lootTypes2.has(b.typeId));
    if (realLootBuildings.length > 1) {
      state.buildings = state.buildings.filter(b => !(b.typeId === 'BANK_V2' && b.x === 12 && b.y === 4));
    }

    // SaveVersion 19: Always remove the migration-injected BANK_V2 at (12,4)
    state.buildings = state.buildings.filter(b => !(b.typeId === 'BANK_V2' && b.x === 12 && b.y === 4));

    state.saveVersion = CURRENT_VERSION;
  }
}
