export type EncounterType = 'combat' | 'rest' | 'hazard' | 'boss' | 'checkpoint' | 'find' | 'merchant' | 'survivor';

export interface EncounterRoom {
  index: number;
  type: EncounterType;
  enemies: CombatUnit[];
  healPercent: number;
  hazardDamage: number;
  completed: boolean;
  findGold?: number;
  findItems?: { itemId: string; qty: number }[];
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
  /** Key into ENEMY_DEFS – only set for enemy units */
  defId?: string;
  /** Active special effects from gear (only player units) */
  specialEffects?: SpecialEffect[];
  /** Whether anti_heal debuff is active on this unit */
  antiHealDebuff?: boolean;
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
  effectType: 'damage' | 'heal' | 'taunt' | 'buff' | 'aoe' | 'summon';
  power: number;
  target: string;
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
}
