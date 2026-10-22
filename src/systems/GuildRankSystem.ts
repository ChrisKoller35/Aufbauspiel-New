import { GameState } from '../models/GameState';
import { GUILD_RANK_DEFS, rangFuerEbene } from '../data/guildRanks';
import { DUNGEON_GRAPH, ROUTE_DEFS, RouteDef, isRouteAvailable } from '../data/routes';
import { BUILDING_DEFS } from '../data/buildings';
import { BUILDING_UPGRADE_DEFS } from '../data/buildingUpgrades';

/**
 * Was ein Rang freischaltet, in Worten (Bilanz nach dem Aufstieg): die Dungeons seiner Ebene
 * (route.tier, dieselbe Regel wie die Sperre auf der Karte), die Gebäude mit diesem Mindestrang,
 * der Ausbau des Gildenhauses und was GUILD_RANK_DEFS sonst nennt. Neue Dungeons zählen so von
 * selbst mit. Mit Spielstand: welche Dungeons gleich offen sind und welche erst nach Bosssiegen.
 */
export function rangFreischaltungen(rank: number, state?: GameState): string[] {
  const def = GUILD_RANK_DEFS.find(r => r.rank === rank);
  if (!def) return [];
  const zeilen: string[] = [];
  const namen = (routen: RouteDef[]): string => routen.map(r => r.name).join(', ');

  // Dungeons von unten nach oben wie auf der Karte
  const dungeons = [...DUNGEON_GRAPH]
    .sort((a, b) => b.y - a.y)
    .map(n => ROUTE_DEFS[n.routeId])
    .filter(r => r && rangFuerEbene(r.tier) === rank);
  if (dungeons.length > 0) {
    const titel = dungeons.length === 1 ? 'Neuer Dungeon' : `Neue Dungeons (${dungeons.length})`;
    const offen = state ? dungeons.filter(r => isRouteAvailable(r, state)) : dungeons;
    const spaeter = dungeons.filter(r => !offen.includes(r));
    if (spaeter.length === 0) zeilen.push(`${titel}: ${namen(offen)}`);
    else if (offen.length === 0) zeilen.push(`${titel}, nach Bosssiegen: ${namen(spaeter)}`);
    else zeilen.push(`${titel}, gleich offen: ${namen(offen)}`, `Nach Bosssiegen: ${namen(spaeter)}`);
  }

  const gebaeude = Object.values(BUILDING_DEFS).filter(b => b.freischaltung?.gildenrang === rank);
  if (gebaeude.length > 0) {
    const alleMitPlan = gebaeude.every(b => b.freischaltung.bauplan);
    const liste = gebaeude.map(b => (!alleMitPlan && b.freischaltung.bauplan ? `${b.name} (mit Bauplan)` : b.name)).join(', ');
    const plan = alleMitPlan ? (gebaeude.length > 1 ? ' (je mit Bauplan)' : ' (mit Bauplan)') : '';
    zeilen.push(`${gebaeude.length > 1 ? 'Neue Gebäude' : 'Neues Gebäude'}: ${liste}${plan}`);
  }

  // Das Gildenhaus wächst nur über diesen Ausbau (systems/Ausbau.ts)
  const gilde = BUILDING_UPGRADE_DEFS.GUILD_HALL_T2;
  if (gilde?.unlockCondition.minGuildRank === rank) {
    const helden = gilde.changes.partySlots ? ` (${gilde.changes.partySlots} Helden je Expedition)` : '';
    zeilen.push(`Ausbau frei: ${BUILDING_DEFS[gilde.buildingTypeId]?.name ?? gilde.buildingTypeId} Stufe ${gilde.toTier}${helden}`);
  }
  return [...zeilen, ...def.unlocks];
}

/**
 * Checks and advances guild rank.
 * Called at expedition end (after loot distribution).
 * Returns rank-up info if rank increased, null otherwise.
 */
export class GuildRankSystem {
  /**
   * Update guildStats after a completed expedition.
   * Call BEFORE checkRankUp.
   * `completed` = run won; retreats/defeats only record defeated bosses.
   */
  updateStats(state: GameState, routeId: string, bossesKilled: number, bossIds: string[], completed = true): void {
    const stats = state.guildStats;
    if (completed) {
      stats.totalExpeditionsCompleted++;
      if (routeId === 'forest_short') {
        stats.forestShortCompleted++;
      }
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

    // All conditions met → rank up (the text sees the new rank: what is open right now)
    stats.rank = nextRankDef.rank;
    return {
      newRank: nextRankDef.rank,
      name: nextRankDef.name,
      title: nextRankDef.title,
      unlocks: rangFreischaltungen(nextRankDef.rank, state),
    };
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
