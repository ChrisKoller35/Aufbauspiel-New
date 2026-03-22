export type EncounterType = 'combat' | 'rest' | 'hazard' | 'boss' | 'checkpoint' | 'find' | 'merchant' | 'survivor' | 'fortification';

/** Eine wählbare Option in einem Begegnungs-Dialog */
export interface EncounterChoice {
  label: string;
  flavorText: string;
  effect: 'heal' | 'gold' | 'item' | 'xp' | 'risky_heal';
  /** Stärke des Effekts (Prozent, Goldmenge oder XP-Betrag, je nach effect) */
  value: number;
  /** Optionaler Item-Key für effect='item' */
  itemId?: string;
}

/** Zustand einer Befestigungsanlage (Mauer, Tor, Turm, Bergfried) */
export interface FortificationState {
  name: string;
  hp: number;
  maxHp: number;
  armor: number;
  spriteKey: string;
}

export interface EncounterRoom {
  index: number;
  type: EncounterType;
  enemies: CombatUnit[];
  healPercent: number;
  hazardDamage: number;
  completed: boolean;
  findGold?: number;
  findItems?: { itemId: string; qty: number }[];
  /** Wählbare Optionen (für find/rest Räume – Feature #11) */
  encounterChoices?: { optionA: EncounterChoice; optionB: EncounterChoice };
  /** Belagerungsraum: die zu zerstörende Befestigung */
  fortification?: FortificationState;
}

export interface SpecialEffect {
  id: string;           // z.B. 'lifesteal', 'dodge', 'reflect'
  usesLeft: number;     // -1 = unbegrenzt, 0 = verbraucht
}

export interface CombatUnit {
  id: number;
  name: string;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critChance: number;
  critMult: number;
  threat: number;
  tauntRounds: number;
  skills: CombatSkill[];
  buffs: CombatBuff[];
  lootTableId: string | null;
  spriteKey?: string;
  /** Class ID for player units (e.g. 'guardian', 'ranger') */
  classId?: string;
  /** Key into ENEMY_DEFS – only set for enemy units */
  defId?: string;
  /** Active special effects from gear (only player units) */
  specialEffects?: SpecialEffect[];
  /** Whether anti_heal debuff is active on this unit */
  antiHealDebuff?: boolean;
  /** Siege: diese Einheit ist eine Kriegsmaschine (Kanone/Katapult) */
  isWarMachine?: boolean;
  /** Siege: dieser Gegner bevorzugt die Kriegsmaschine als Angriffsziel */
  prefersWarMachineTarget?: boolean;
}

export interface CombatBuff {
  stat: string;
  value: number;
  remainingRounds: number;
}

export interface CombatSkill {
  id: string;
  name: string;
  cooldown: number;
  currentCooldown: number;
  effectType: 'damage' | 'heal' | 'taunt' | 'buff' | 'aoe' | 'summon' | 'drain_air';
  power: number;
  target: string;
  /** Optional: Luftentzug zusätzlich zum normalen Schaden (z.B. Leviathan-Druckwelle) */
  drainAirAmount?: number;
}

export interface ExpeditionRun {
  routeId: string;
  party: CombatUnit[];
  rooms: EncounterRoom[];
  currentRoom: number;
  combatLog: string[];
  loot: Record<string, number>;
  goldEarned: number;
  provisions: { itemId: string; qty: number }[];
  status: 'exploring' | 'victory' | 'defeat' | 'retreat';
  lastCheckpoint: number;
  desperateResolveUsed: boolean;
  rngSeed: number;
  xpEarned?: Record<number, number>;  // fighterId → accumulated XP
  focusTarget: { enemyId: number; roundsLeft: number } | null;
  focusTargetCooldown: number;
  difficulty: string;               // Schwierigkeitsgrad-ID ('normal' | 'hard' | 'nightmare' | 'infernal')
  activeModifier: string | null;    // Aktiver Modifikator-ID oder null
  score: number;                    // Berechneter Score am Ende des Runs
  totalCombatRounds: number;        // Summe aller Kampfrunden (für Score-Berechnung)
  enemiesKilled: number;            // Anzahl besiegter normaler Gegner
  bossesKilled: number;             // Anzahl besiegter Bosse
  /** Feature #11: Ausstehende Begegnungs-Wahl (find/rest Raum) */
  pendingChoice?: { roomIndex: number; optionA: EncounterChoice; optionB: EncounterChoice };
  /** Feature #15: Checkpoint-Dialog ausstehend */
  pendingCheckpoint?: boolean;
  /** Feature #16: Händler-Interaktion ausstehend */
  pendingMerchant?: boolean;
  /** Feature #16: Anzahl der Käufe beim aktuellen Händler */
  merchantPurchases?: number;
  /** Feature #17: Im Survivor-Raum gefundener Spezialist */
  specialistFound?: string;
  /** Feature #18: Großmeister-Prüfung aktiv */
  isGrandmasterTrial?: boolean;
  /** Tracks which party units have used their one ability this expedition (unit.id → used) */
  abilitiesUsed: Record<number, boolean>;
  // Air Shield System (Unterwasser-Routen)
  /** Aktuelle Luft (0-100+) */
  airShield?: number;
  /** Maximum Luft (Standard 100 + airBonus von Items) */
  airShieldMax?: number;
  /** Guardian's Spott ability: when true, all enemy attacks are redirected to the Guardian */
  guardianTauntActive?: boolean;
  /** Per-round HP snapshots for animated combat playback (transient, not saved) */
  combatRoundSnapshots?: CombatRoundSnapshot[];
  /** Siege: die Kriegsmaschine dieser Expedition (nicht in party, separater Slot) */
  warMachineUnit?: CombatUnit;
  /** ID des eingesetzten War Machine Items (z.B. 'war_cannon') */
  warMachineItemId?: string;
}

/** Snapshot of HP values after a combat round – used by CombatOverlay for round-by-round animation */
export interface CombatRoundSnapshot {
  round: number;
  /** partyHp[unitId] = hp after this round */
  partyHp: Record<number, number>;
  /** enemyHp[unitId] = hp after this round */
  enemyHp: Record<number, number>;
  /** Combat log entries generated DURING this round */
  logLines: string[];
  /** Whether any critical hit occurred this round */
  hadCrit: boolean;
  /** Whether a unit died this round */
  hadDeath: boolean;
  /** Siege: HP der Befestigung nach dieser Runde */
  fortificationHp?: number;
}
