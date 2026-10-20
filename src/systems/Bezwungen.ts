// ─── Magic City – Bezwungene Dungeons ───────────────────────────
// Ein Merker, der nichts vergisst: welche Dungeons die Gilde je wirklich
// bezwungen hat (gewonnen, und wo es einen Boss gibt, mit besiegtem Boss). Die
// Bestenliste behält nur die 100 besten Läufe, frühe Siege fallen dort mit
// der Zeit heraus. Karte, Routenliste und Stadtweg lesen den Merker über
// isRouteCompleted (data/routes.ts), die Rangliste zählt damit Höhe und Sterne.
// Neue Siege trägt nur die Rangliste nach jeder Expedition ein (merkeBezwungen).
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { DUNGEON_GRAPH, ROUTE_DEFS } from '../data/routes';

/**
 * Was ein Spielstand ohne Merker hergibt: echte Siege in der Bestenliste, Dungeons mit besiegtem
 * Boss, der Waldpfad nach einem gezählten Sieg und Dungeons, deren Geschichte bis zum Sieg lief.
 * Nur beim Anlegen: Die Liste der besiegten Bosse kennt auch Bosse, die in einer Niederlage fielen
 * (GuildRankSystem), und die zählen ab jetzt nicht mehr als bezwungen.
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
 * Legt den Merker beim ersten Aufruf an, aus allem, was der Spielstand bis dahin hergibt.
 */
export function bezwungeneDungeons(state: GameState): Record<string, number> {
  if (!state.bezwungen) {
    const runde = state.rangliste?.runde ?? 0;
    state.bezwungen = Object.fromEntries(bisherBezwungen(state).map(id => [id, runde]));
  }
  return state.bezwungen;
}

/** Merkt sich einen Sieg; true beim allerersten Sieg in diesem Dungeon */
export function merkeBezwungen(state: GameState, routeId: string, runde: number): boolean {
  const merker = bezwungeneDungeons(state);
  if (routeId in merker) return false;
  merker[routeId] = runde;
  return true;
}
