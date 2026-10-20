// ─── Magic City – Probespiel ────────────────────────────────────
// localhost:5173/?probe öffnet ein eigenes Spiel, um das Endgame auszuprobieren:
// Magische Stadt (Stadtstufe 7) mit dem Musterteam «Gut» der Dungeon-Eichung
// (data/musterteams.ts), Gildenrang V und allen Bossen bis zum Vulkankern besiegt,
// also offenem Drachenhort. Es hat einen eigenen Speicherplatz
// (SaveSystem.nutzeProbespiel), der richtige Spielstand bleibt unberührt.
// Hinweis im Hauptmenü: ui/components/ProbespielHinweis.ts.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { createGuildFighter } from '../models/GuildRoster';
import { HERZSTEINE } from '../data/stadtstufen';
import { GUILD_RANK_DEFS } from '../data/guildRanks';
import { ROUTE_DEFS } from '../data/routes';
import { MUSTER_TEAMS, musterWerte } from '../data/musterteams';
import { totalXpForLevel } from './HeroProgression';

/** Vorräte für ein paar Aufstiege und etwas zum Bauen */
const PROBE_VORRAT: Record<string, number> = {
  gold: 3000, wood: 400, stone: 250, bread: 30, healing_potion: 10, power_bread: 5,
};

/** Ist die Seite mit ?probe geöffnet? */
export function istProbespiel(search: string): boolean {
  return new URLSearchParams(search).has('probe');
}

/** ?probe=neu: das Probespiel von vorn beginnen */
export function probespielNeu(search: string): boolean {
  return new URLSearchParams(search).get('probe') === 'neu';
}

/**
 * Macht aus einem neuen Spiel (Startgebäude und Bewohner schon gesetzt) das
 * Probespiel: Stadtstufe 7 mit allen Herzsteinen und gelesenen Kapiteln, die
 * vier Helden des Musterteams «Gut», dazu Vorräte. Die Gilde hat den höchsten
 * Rang und alle Bosse bis Ebene 4 besiegt: Als Nächstes warten die Dungeons über
 * dem Vulkankern (Drachenhort, dann Himmelsarchiv).
 */
export function richteProbespielEin(state: GameState): void {
  state.stadtweg = { stufe: 7, herzsteine: HERZSTEINE.map(h => h.id), gelesen: 7 };

  const bosse = new Set(Object.values(ROUTE_DEFS).filter(r => r.tier <= 4 && r.bossId).map(r => r.bossId!));
  state.guildStats.rank = GUILD_RANK_DEFS.length;
  state.guildStats.bossesDefeatedIds = [...bosse];
  state.guildStats.totalBossesDefeated = bosse.size;

  // Wie beim Anheuern im Heldenhaus (HeroesScreen.handleHire): Helden sind keine
  // Bewohner (citizenId 0), alle Bewohner bleiben Arbeiter.
  for (const muster of MUSTER_TEAMS.gut.helden) {
    const fighter = createGuildFighter(0, muster.classId, muster.name, musterWerte(muster));
    fighter.level = muster.stufe;
    fighter.xp = totalXpForLevel(muster.stufe);
    fighter.gear = { ...muster.gear };
    state.fighters.push(fighter);
  }

  for (const [itemId, qty] of Object.entries(PROBE_VORRAT)) {
    state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + qty;
  }
}
