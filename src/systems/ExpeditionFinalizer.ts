// ─── ExpeditionFinalizer ────────────────────────────────────────
// Progress awarded when an expedition ends (victory/defeat/retreat):
// hero XP, score + scoreboard, rangliste (fame of the week, summit ranking),
// statistics, guild rank, defeated bosses, class unlocks, bestiarium,
// Auftragsbrett (Zettel und Kette), the trophy count of the Trophäensaal and
// last the achievements (erfolgePruefen: rank, Monsterbuch, Kette count at once).
// Loot, provisions and fighter release stay in main.ts (UI flow).
// ──────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { ExpeditionRun, WegWirkung } from '../models/ExpeditionRun';
import { ScoreboardEntry } from '../models/ScoreboardEntry';
import { ENEMY_DEFS } from '../data/enemies';
import { CLASS_DEFS } from '../data/classes';
import { ExpeditionSystem } from './ExpeditionSystem';
import { GuildRankSystem } from './GuildRankSystem';
import { ClassUnlockSystem } from './ClassUnlockSystem';
import { BestiariumSystem } from './BestiariumSystem';
import { erfolgBilanzZeile, erfolgePruefen } from './AchievementSystem';
import { gipfelTatenZaehlen } from './GipfelTaten';
import { awardXP } from './HeroProgression';
import { wegBilanzDazu } from './Spezialisierung';
import { RanglistenBilanz, ranglisteNachExpedition } from './Rangliste';
import { AuftragsBilanz, auftraegeNachExpedition } from './Auftragsbrett';
import { trophaeeNachExpedition } from './Trophaeensaal';

/** Bonus XP per hero for winning the run */
export const VICTORY_XP_BONUS = 10;
const SCOREBOARD_LIMIT = 100;

export interface ExpeditionProgress {
  entry: ScoreboardEntry;
  /** wegWirkung: was der Weg des Helden in dieser Expedition bewirkt hat */
  xp: { id: number; name: string; xp: number; level: number; levelUps: number; wegWirkung?: WegWirkung }[];
  rankUp: { newRank: number; title: string; unlocks: string[] } | null;
  newClasses: string[];
  newAchievements: string[];
  /** Ruhm der Woche und Platz in der Rangliste mit Rivalen */
  rangliste: RanglistenBilanz;
  /** Zettel und Kette am Auftragsbrett: Fortschritt und Belohnungen */
  auftraege: AuftragsBilanz;
  /** Erster Sieg über diesen Boss: ein neuer Sockel im Trophäensaal */
  neueTrophaee: boolean;
}

const guildRankSystem = new GuildRankSystem();
const classUnlockSystem = new ClassUnlockSystem();
const bestiariumSystem = new BestiariumSystem();

/**
 * Apply all progress of a finished run to the game state.
 * Call once, before provisions are returned (score counts leftover provisions).
 */
export function finalizeExpeditionProgress(
  state: GameState,
  run: ExpeditionRun,
  expeditionSystem: ExpeditionSystem,
): ExpeditionProgress {
  const victory = run.status === 'victory';

  // Trophäensaal vor der Rangliste: ein älterer Spielstand legt den Zähler so ohne diesen Sieg an
  const neueTrophaee = trophaeeNachExpedition(state, run);

  // ── XP to heroes (CombatUnit.id === GuildFighter.id) ──
  const xpMap = run.xpEarned ?? {};
  const xp: ExpeditionProgress['xp'] = [];
  for (const unit of run.party) {
    const fighter = state.fighters.find(f => f.id === unit.id);
    if (!fighter) continue;
    const earned = (xpMap[unit.id] ?? 0) + (victory ? VICTORY_XP_BONUS : 0);
    const levelUps = awardXP(fighter, earned);
    wegBilanzDazu(fighter, unit.wegWirkung);
    xp.push({
      id: fighter.id, name: fighter.name, xp: earned, level: fighter.level, levelUps,
      ...(unit.wegWirkung ? { wegWirkung: unit.wegWirkung } : {}),
    });
  }

  // ── Score + scoreboard ──
  expeditionSystem.calculateScore(run);
  const entry: ScoreboardEntry = {
    routeId: run.routeId,
    score: run.score,
    difficulty: run.difficulty ?? 'normal',
    modifier: run.activeModifier ?? null,
    status: victory ? 'victory' : run.status === 'defeat' ? 'defeat' : 'retreat',
    partyClasses: run.party.map(u => u.classId ?? ''),
    timestamp: Date.now(),
    day: state.day,
    enemiesKilled: run.enemiesKilled ?? 0,
    bossesKilled: run.bossesKilled ?? 0,
  };
  // Rangliste vor dem Eintrag in die Bestenliste: erkennt den ersten Sieg in diesem Dungeon
  const rangliste = ranglisteNachExpedition(state, run, entry.timestamp);
  if (!state.scoreboard) state.scoreboard = [];
  state.scoreboard.push(entry);
  if (state.scoreboard.length > SCOREBOARD_LIMIT) {
    state.scoreboard.sort((a, b) => b.score - a.score);
    state.scoreboard.length = SCOREBOARD_LIMIT;
  }

  // ── Statistics (total_expeditions is counted at start) ──
  const stats = state.statistics;
  const add = (key: string, n: number): void => { stats[key] = (stats[key] ?? 0) + n; };
  add('total_enemies_killed', entry.enemiesKilled);
  add('total_bosses_killed', entry.bossesKilled);
  add('total_gold_earned', run.goldEarned ?? 0);
  if (victory) {
    add('total_victories', 1);
    if (run.party.every(u => u.hp > 0)) add('total_flawless_victories', 1);
  } else if (run.status === 'defeat') {
    add('total_defeats', 1);
  } else {
    add('total_retreats', 1);
  }

  // ── Guild rank + defeated bosses (unlock routes on the dungeon map) ──
  const bossIds = run.rooms
    .filter(r => r.type === 'boss')
    .flatMap(r => r.enemies)
    .filter(e => e.hp <= 0 && e.defId != null && ENEMY_DEFS[e.defId]?.isBoss === true)
    .map(e => e.defId!);
  guildRankSystem.updateStats(state, run.routeId, entry.bossesKilled, bossIds, victory);
  const rankUp = guildRankSystem.checkRankUp(state);

  const newClasses = classUnlockSystem.checkUnlocks(state).map(id => CLASS_DEFS[id]?.name ?? id);

  // ── Bestiarium ──
  bestiariumSystem.processExpeditionEnd(state, run);

  // ── Auftragsbrett: zählt Siege, Jagd und Set-Teile (der Set-Wurf ist schon gefallen) ──
  const auftraege = auftraegeNachExpedition(state, run, entry.timestamp);

  // ── Erfolge zuletzt, damit Rang, Monsterbuch, Kette und Trophäen schon mitzählen. Ohne Hinweis in
  //    der Kopfzeile: Die Bilanz nennt sie (main.ts), und der Tageswechsel findet sie nicht noch einmal ──
  if (rangliste.platzNachher === 1) stats.gipfel_spitze = 1;
  gipfelTatenZaehlen(stats, run);
  const newAchievements = erfolgePruefen(state, { hinweis: false }).map(erfolgBilanzZeile);

  return { entry, xp, rankUp, newClasses, newAchievements, rangliste, auftraege, neueTrophaee };
}
