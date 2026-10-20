// ─── Magic City – Bezwungene Dungeons ───────────────────────────
// Ein Merker, der nichts vergisst: welche Dungeons die Gilde je wirklich
// bezwungen hat (Boss besiegt oder ein Dungeon ohne Boss gewonnen). Die
// Bestenliste behält nur die 100 besten Läufe, frühe Siege fallen dort mit
// der Zeit heraus. Karte, Routenliste und Stadtweg lesen den Merker über
// isRouteCompleted (data/routes.ts), die Rangliste zählt damit Höhe und Sterne.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { DUNGEON_GRAPH, ROUTE_DEFS } from '../data/routes';

/**
 * Was die Spielstände bisher hergeben: echte Siege in der Bestenliste, Dungeons mit besiegtem
 * Boss, der Waldpfad nach einem gezählten Sieg und Dungeons, deren Geschichte bis zum Sieg lief.
 */
function bisherBezwungen(state: GameState): string[] {
  const bosse = state.guildStats?.bossesDefeatedIds ?? [];
  const erlebt = state.geschichten?.erlebt ?? [];
  return DUNGEON_GRAPH.map(n => n.routeId).filter(id => {
    const boss = ROUTE_DEFS[id]?.bossId;
    return (!!boss && bosse.includes(boss))
      || erlebt.includes(id)
      || (id === 'forest_short' && (state.guildStats?.forestShortCompleted ?? 0) > 0)
      || (state.scoreboard ?? []).some(e => e.routeId === id && e.status === 'victory' && (!boss || e.bossesKilled > 0));
  });
}

/**
 * Die bezwungenen Dungeons (Dungeon → Runde der Rangliste beim ersten Sieg, 0 = davor).
 * Legt den Merker beim ersten Aufruf an und nimmt Siege auf, die an ihm vorbei dazukamen.
 */
export function bezwungeneDungeons(state: GameState): Record<string, number> {
  const merker = (state.bezwungen ??= {});
  for (const id of bisherBezwungen(state)) {
    if (!(id in merker)) merker[id] = state.rangliste?.runde ?? 0;
  }
  return merker;
}

/** Merkt sich einen Sieg; true beim allerersten Sieg in diesem Dungeon */
export function merkeBezwungen(state: GameState, routeId: string, runde: number): boolean {
  const merker = bezwungeneDungeons(state);
  if (routeId in merker) return false;
  merker[routeId] = runde;
  return true;
}
