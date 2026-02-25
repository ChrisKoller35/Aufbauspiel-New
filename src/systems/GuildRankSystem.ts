import { GameState } from '../models/GameState';
import { GUILD_RANK_DEFS } from '../data/guildRanks';

/**
 * Checks and advances guild rank.
 * Called at expedition end (after loot distribution).
 * Returns rank-up info if rank increased, null otherwise.
 */
export class GuildRankSystem {
  /**
   * Update guildStats after a completed expedition.
   * Call BEFORE checkRankUp.
   */
  updateStats(state: GameState, routeId: string, bossesKilled: number, bossIds: string[]): void {
    const stats = state.guildStats;
    stats.totalExpeditionsCompleted++;

    if (routeId === 'forest_short') {
      stats.forestShortCompleted++;
    }

    if (bossesKilled > 0) {
      stats.totalBossesDefeated += bossesKilled;
      for (const bossId of bossIds) {
        if (!stats.bossesDefeatedIds.includes(bossId)) {
          stats.bossesDefeatedIds.push(bossId);
        }
        if (bossId === 'boss_elder_treant' && routeId === 'forest_medium') {
          stats.forestMediumBossDefeated = true;
        }
      }
    }

    // Check Guild Hall T2
    const guildHall = state.buildings.find(b => b.typeId === 'GUILD_HALL' && b.built);
    if (guildHall && guildHall.tier >= 2) {
      stats.guildHallT2 = true;
    }
  }

  /**
   * Check if conditions for next rank are met.
   * Returns the new GuildRankDef if ranked up, null otherwise.
   */
  checkRankUp(state: GameState): { newRank: number; name: string; title: string; unlocks: string[] } | null {
    const stats = state.guildStats;
    const currentRank = stats.rank;

    if (currentRank >= 5) return null; // max rank

    const nextRankDef = GUILD_RANK_DEFS.find(r => r.rank === currentRank + 1);
    if (!nextRankDef) return null;

    const cond = nextRankDef.conditions;

    // Check all conditions
    if (cond.forestShortCompleted != null && stats.forestShortCompleted < cond.forestShortCompleted) return null;
    if (cond.forestMediumBossDefeated && !stats.forestMediumBossDefeated) return null;
    if (cond.totalBossesDefeated != null && stats.totalBossesDefeated < cond.totalBossesDefeated) return null;
    if (cond.guildHallT2 && !stats.guildHallT2) return null;

    // All conditions met → rank up
    stats.rank = nextRankDef.rank;
    return {
      newRank: nextRankDef.rank,
      name: nextRankDef.name,
      title: nextRankDef.title,
      unlocks: nextRankDef.unlocks,
    };
  }

  /** Check if a route is unlocked based on current guild rank. */
  isRouteUnlocked(state: GameState, routeId: string): boolean {
    const rank = state.guildStats.rank;
    for (const rankDef of GUILD_RANK_DEFS) {
      if (rankDef.rank > rank) break;
      if (rankDef.routeUnlocks?.includes(routeId)) return true;
    }
    return false;
  }

  /** Check if a modifier is unlocked based on current guild rank. */
  isModifierUnlocked(state: GameState, modifierId: string): boolean {
    const rank = state.guildStats.rank;
    for (const rankDef of GUILD_RANK_DEFS) {
      if (rankDef.rank > rank) break;
      if (rankDef.modifierUnlocks?.includes(modifierId)) return true;
    }
    return false;
  }
}
