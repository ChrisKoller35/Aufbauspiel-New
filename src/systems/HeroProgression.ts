import { FighterStats, GuildFighter } from '../models/GuildRoster';

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
// Seit dem 23.10.2026 tragen Leben, Angriff und Verteidigung den Mittelwert, mit dem die Dungeons
// geeicht sind: früherer Klassen-Bonus plus 90 % des Wegs zum Mittel aus Klassen-Bonus und altem
// Training (+2 / +1 / +1), auf ganze Leben und Zehntel gerundet (docs/AUSBILDUNG.md, «Eichung nach
// dem Umbau»). Auf dem Raster driftet das Runden in applyLevelBonus nicht (Test). Krit und Tempo
// blieben. Helden aus älteren Spielständen behalten ihre Werte, neue Aufstiege bringen diese Boni.

export interface LevelBonus {
  hp?: number;
  atk?: number;
  def?: number;
  critChance?: number;
  spd?: number;
}

/** Stat-Bonus pro Level-Up, nach Klasse */
export const LEVEL_BONUSES: Record<string, LevelBonus> = {
  // Basis-Klassen (bis 22.10.2026 in Klammern: Leben / Angriff / Verteidigung)
  guardian:    { hp: 3, atk: 0.6, def: 0.7 },                       // (4 / 0,3 / 0,5)
  ranger:      { hp: 2, atk: 0.8, def: 0.5, critChance: 0.01 },     // (2 / 0,6 / 0,1)
  cleric:      { hp: 3, atk: 0.6, def: 0.6, spd: 0.02 },            // (3 / 0,2 / 0,3)
  // Unlock-Klassen
  berserker:   { hp: 3, atk: 0.7, def: 0.6 },                       // aggressiver DPS (3 / 0,5 / 0,2)
  assassin:    { hp: 2, atk: 0.8, def: 0.5, critChance: 0.01 },     // burst/crit DPS (2 / 0,6 / 0,1)
  paladin:     { hp: 3, atk: 0.6, def: 0.7 },                       // defensiver Tank/Heiler (4 / 0,25 / 0,4)
  bard:        { hp: 2, atk: 0.6, def: 0.6, spd: 0.02 },            // Support, Speed-Fokus (2 / 0,2 / 0,2)
  witch:       { hp: 2, atk: 0.7, def: 0.5, critChance: 0.01 },     // AoE DPS (2 / 0,4 / 0,1)
  necromancer: { hp: 2, atk: 0.6, def: 0.6 },                       // Beschwörer-DPS (2 / 0,35 / 0,2)
  druid:       { hp: 3, atk: 0.6, def: 0.6, spd: 0.01 },            // Heiler/Hybrid (3 / 0,25 / 0,25)
};

/** Default Bonus wenn Klasse nicht in der Tabelle (nach derselben Regel; bis 22.10.2026 3 / 0,3 / 0,3) */
export const DEFAULT_BONUS: LevelBonus = { hp: 3, atk: 0.6, def: 0.6 };

function applyLevelBonus(fighter: GuildFighter): void {
  const bonus = LEVEL_BONUSES[fighter.classId] ?? DEFAULT_BONUS;
  const s = fighter.baseStats;

  if (bonus.hp) { s.hp += bonus.hp; s.maxHp += bonus.hp; }
  if (bonus.atk) s.atk = Math.round((s.atk + bonus.atk) * 10) / 10;
  if (bonus.def) s.def = Math.round((s.def + bonus.def) * 10) / 10;
  if (bonus.critChance) s.critChance = Math.round((s.critChance + bonus.critChance) * 100) / 100;
  if (bonus.spd) s.spd = Math.round((s.spd + bonus.spd) * 100) / 100;
}

/**
 * Werte einer Klasse auf `stufe`, genau wie bei einem echten Helden: die Grundwerte und jeder Aufstieg
 * über awardXP, also applyLevelBonus mit den Boni der Klasse samt Runden. Die Musterteams der Eichung
 * und das Probespiel rechnen damit (musterWerte in data/musterteams.ts), ihre Werte erreicht also
 * jeder Held dieser Klasse auf dieser Stufe.
 */
export function werteAufStufe(classId: string, grundwerte: FighterStats, stufe: number): FighterStats {
  const held: GuildFighter = {
    id: 0, classId, name: '', baseStats: { ...grundwerte },
    gear: { mainHand: null, offHand: null, armor: null, trinket: null }, xp: 0, level: 1,
  };
  awardXP(held, totalXpForLevel(stufe));
  return held.baseStats;
}

