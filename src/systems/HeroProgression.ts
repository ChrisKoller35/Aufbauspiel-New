import { GuildFighter } from '../models/GuildRoster';

// ─── XP / Level Berechnung ──────────────────────────────────────
// Level N requires: 30 + (N-1) * 20 XP (cumulative from previous level)
// Level 2: 30 XP, Level 5: 90 XP, Level 10: 190 XP, Max: 15
// Auf Stufe 15 sammelt ein Held weiter: Was über totalXpForLevel(15) liegt, ist
// Überschuss, den er im Lehrbuch weitergeben kann (systems/Ausbildung.ts).

export const MAX_HERO_LEVEL = 15;

/** XP benötigt um von level → level+1 aufzusteigen */
export function xpForNextLevel(level: number): number {
  if (level >= MAX_HERO_LEVEL) return Infinity;
  return 30 + (level - 1) * 20;
}

/** Gesamte XP bis zu einem Level (kumulativ) */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += 30 + (l - 1) * 20;
  }
  return total;
}

/** XP-Fortschritt im aktuellen Level (0..1) */
export function xpProgress(fighter: GuildFighter): number {
  if (fighter.level >= MAX_HERO_LEVEL) return 1;
  const needed = xpForNextLevel(fighter.level);
  const xpInLevel = fighter.xp - totalXpForLevel(fighter.level);
  return Math.max(0, Math.min(1, xpInLevel / needed));
}

/** XP über Stufe 15 hinaus (fighter.xp ist die Gesamt-XP); unter Stufe 15 immer 0 */
export function ueberschuss(fighter: GuildFighter): number {
  if (fighter.level < MAX_HERO_LEVEL) return 0;
  return Math.max(0, fighter.xp - totalXpForLevel(MAX_HERO_LEVEL));
}

/** XP vergeben und Level-Up prüfen. Returns Anzahl Level-Ups. Auf Stufe 15 bleibt alles als Überschuss. */
export function awardXP(fighter: GuildFighter, amount: number): number {
  if (amount <= 0) return 0;
  fighter.xp += amount;

  let levelUps = 0;
  while (fighter.level < MAX_HERO_LEVEL) {
    const needed = totalXpForLevel(fighter.level + 1);
    if (fighter.xp >= needed) {
      fighter.level++;
      levelUps++;
      applyLevelBonus(fighter);
    } else {
      break;
    }
  }
  return levelUps;
}

// ─── Level-Up Stat-Boni (pro Klasse) ────────────────────────────
// Jedes Level gibt kleine Stat-Boosts auf baseStats.
// Ab Stufe 10 wählt jeder Held einen Weg, ab Stufe 15 ist er Meister darin
// (data/spezialisierungen.ts, systems/Spezialisierung.ts).

export interface LevelBonus {
  hp?: number;
  atk?: number;
  def?: number;
  critChance?: number;
  spd?: number;
}

/** Stat-Bonus pro Level-Up, nach Klasse */
export const LEVEL_BONUSES: Record<string, LevelBonus> = {
  // Basis-Klassen
  guardian:    { hp: 4, atk: 0.3, def: 0.5 },
  ranger:      { hp: 2, atk: 0.6, def: 0.1, critChance: 0.01 },
  cleric:      { hp: 3, atk: 0.2, def: 0.3, spd: 0.02 },
  // Unlock-Klassen
  berserker:   { hp: 3, atk: 0.5, def: 0.2 },                       // aggressiver DPS
  assassin:    { hp: 2, atk: 0.6, def: 0.1, critChance: 0.01 },     // burst/crit DPS
  paladin:     { hp: 4, atk: 0.25, def: 0.4 },                      // defensiver Tank/Heiler
  bard:        { hp: 2, atk: 0.2, def: 0.2, spd: 0.02 },            // Support, Speed-Fokus
  witch:       { hp: 2, atk: 0.4, def: 0.1, critChance: 0.01 },     // AoE DPS
  necromancer: { hp: 2, atk: 0.35, def: 0.2 },                      // Beschwörer-DPS
  druid:       { hp: 3, atk: 0.25, def: 0.25, spd: 0.01 },          // Heiler/Hybrid
};

/** Default Bonus wenn Klasse nicht in der Tabelle */
export const DEFAULT_BONUS: LevelBonus = { hp: 3, atk: 0.3, def: 0.3 };

function applyLevelBonus(fighter: GuildFighter): void {
  const bonus = LEVEL_BONUSES[fighter.classId] ?? DEFAULT_BONUS;
  const s = fighter.baseStats;

  if (bonus.hp) { s.hp += bonus.hp; s.maxHp += bonus.hp; }
  if (bonus.atk) s.atk = Math.round((s.atk + bonus.atk) * 10) / 10;
  if (bonus.def) s.def = Math.round((s.def + bonus.def) * 10) / 10;
  if (bonus.critChance) s.critChance = Math.round((s.critChance + bonus.critChance) * 100) / 100;
  if (bonus.spd) s.spd = Math.round((s.spd + bonus.spd) * 100) / 100;
}

