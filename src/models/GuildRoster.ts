import type { WegWirkung } from './ExpeditionRun';

export interface FighterStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critChance: number;
  critMult: number;
}

export interface GuildFighter {
  id: number;
  classId: string;
  name: string;
  baseStats: FighterStats;
  gear: {
    mainHand: string | null;
    offHand: string | null;
    armor: string | null;
    trinket: string | null;
  };
  xp: number;
  level: number;
  /** Gewählter Weg ab Stufe 10 (data/spezialisierungen.ts), fehlt bis zur Wahl */
  spezialisierung?: string;
  /** Was sein Weg in allen Expeditionen zusammen bewirkt hat (Heldenfenster) */
  wegBilanz?: WegWirkung;
  /**
   * Zweitbesetzung: der Lehrling seiner Klasse (data/lehrlinge.ts, systems/Lehrlinge.ts). Je Klasse gibt es
   * höchstens einen; Name und Hintergrund kommen aus LEHRLINGE, das Bild ist das der Klasse, gespiegelt.
   */
  lehrling?: boolean;
}

let nextFighterId = 1;

export function createGuildFighter(classId: string, name: string, baseStats: FighterStats): GuildFighter {
  return {
    id: nextFighterId++,
    classId,
    name,
    baseStats: { ...baseStats },
    gear: { mainHand: null, offHand: null, armor: null, trinket: null },
    xp: 0,
    level: 1,
  };
}

export function resetFighterIdCounter(startId: number): void {
  nextFighterId = startId;
}
