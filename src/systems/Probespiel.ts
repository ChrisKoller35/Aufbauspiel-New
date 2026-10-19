// ─── Magic City – Probespiel ────────────────────────────────────
// localhost:5173/?probe öffnet ein eigenes Spiel, um das Endgame auszuprobieren:
// Magische Stadt (Stadtstufe 7, die Treppe ist offen) mit dem Musterteam «Gut»
// der Treppen-Eichung (data/musterteams.ts). Es hat einen eigenen Speicherplatz
// (SaveSystem.nutzeProbespiel), der richtige Spielstand bleibt unberührt.
// Hinweis im Hauptmenü: ui/components/ProbespielHinweis.ts.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { createGuildFighter } from '../models/GuildRoster';
import { HERZSTEINE } from '../data/stadtstufen';
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
 * Probespiel: Stadtstufe 7 mit allen Herzsteinen und gelesenen Kapiteln, vier
 * Bewohner werden die Helden des Musterteams «Gut», dazu Vorräte.
 */
export function richteProbespielEin(state: GameState): void {
  state.stadtweg = { stufe: 7, herzsteine: HERZSTEINE.map(h => h.id), gelesen: 7 };

  const freie = state.citizens.filter(c => c.status === 'IDLE' && c.fighterId == null);
  MUSTER_TEAMS.gut.helden.forEach((muster, i) => {
    const citizen = freie[i];
    if (!citizen) return;
    const fighter = createGuildFighter(citizen.id, muster.classId, muster.name, musterWerte(muster));
    fighter.level = muster.stufe;
    fighter.xp = totalXpForLevel(muster.stufe);
    fighter.gear = { ...muster.gear };
    state.fighters.push(fighter);
    citizen.status = 'GUILD_FIGHTER';
    citizen.fighterId = fighter.id;
  });

  for (const [itemId, qty] of Object.entries(PROBE_VORRAT)) {
    state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + qty;
  }
}
