// ─── Magic City – Musterlauf ────────────────────────────────────
// Ein Musterteam (data/musterteams.ts) spielt eine Route über das echte
// ExpeditionSystem, mit fester Spielweise bei den Wahl-Räumen. Grundlage für
// die Dungeon-Eichung (tools/dungeonEichung.ts, docs/NEUE-DUNGEONS.md) und die
// Tests der Dungeons über dem Vulkankern. Fähigkeiten vor dem Kampf nutzt der
// Lauf nicht (echte Spieler gewinnen damit etwas öfter).
// ────────────────────────────────────────────────────────────────

import { createNewGameState, GameState } from '../models/GameState';
import { createGuildFighter } from '../models/GuildRoster';
import { ExpeditionRun, dungeonBezwungen } from '../models/ExpeditionRun';
import { MUSTER_SETS, MUSTER_TEAMS, musterWerte } from '../data/musterteams';
import { ExpeditionSystem } from './ExpeditionSystem';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { totalXpForLevel } from './HeroProgression';
import { istGeschichtsWahl } from './Geschichten';

export type MusterTeamName = keyof typeof MUSTER_TEAMS;
export type MusterSetName = keyof typeof MUSTER_SETS;

/**
 * Spielweise bei Wahl-Räumen (Rastplätze: immer rasten) und bei den Entscheidungen
 * der Geschichte (systems/Geschichten.ts, dort ist das Wagnis Option B):
 * - vorsichtig: feste Wahl immer Option B (Heilung statt Hort-Gold oder verbotenem Buch), Geschichte sicher
 * - gierig: feste Wahl immer Option A, Geschichte mutig
 * - klug: das Wagnis nur, solange die Gruppe mindestens 85 % ihrer Leben hat
 */
export type Spielweise = 'vorsichtig' | 'gierig' | 'klug';

/** Ab so viel Leben (Anteil der ganzen Gruppe) nimmt «klug» das Risiko. */
export const KLUG_AB_LEBEN = 0.85;

/**
 * Neuer Spielstand mit den Helden des Musterteams (startExpedition prüft keine Sperren).
 * Mit `sets` tragen die Helden statt ihrer Ausrüstung die Dungeon-Sets aus MUSTER_SETS.
 * Ihren Weg (ab Stufe 10) gehen sie, ausser `wege` ist false.
 */
export function musterStand(
  team: MusterTeamName, startwert: number, sets?: MusterSetName, wege = true,
): { state: GameState; ids: number[] } {
  const state = createNewGameState();
  state.rngSeed = startwert;
  const ids = MUSTER_TEAMS[team].helden.map((muster, i) => {
    const held = createGuildFighter(0, muster.classId, muster.name, musterWerte(muster));
    held.id = 100 + i;
    held.level = muster.stufe;
    held.xp = totalXpForLevel(muster.stufe);
    held.gear = { ...((sets && MUSTER_SETS[sets].gear[muster.name]) || muster.gear) };
    if (wege && muster.weg) held.spezialisierung = muster.weg;
    state.fighters.push(held);
    return held.id;
  });
  return { state, ids };
}

function gruppenLeben(run: ExpeditionRun): number {
  const max = run.party.reduce((summe, u) => summe + u.maxHp, 0);
  return max > 0 ? run.party.reduce((summe, u) => summe + Math.max(0, u.hp), 0) / max : 0;
}

/** Spielt die Route bis zum Ende (an jedem Kontrollpunkt weiter) und gibt den Lauf zurück. */
export function spieleRoute(state: GameState, ids: number[], routeId: string, spielweise: Spielweise): ExpeditionRun {
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  const run = system.startExpedition(state, routeId, ids);
  if (!run) throw new Error(`Route ${routeId} lässt sich nicht starten`);
  for (let schritt = 0; schritt < 500; schritt++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') {
      const raum = run.rooms[run.pendingChoice!.roomIndex];
      const risiko = spielweise === 'gierig' || (spielweise === 'klug' && gruppenLeben(run) >= KLUG_AB_LEBEN);
      if (istGeschichtsWahl(run.pendingChoice)) system.resolveChoice(run, risiko ? 1 : 0);
      else system.resolveChoice(run, raum.type === 'rest' || risiko ? 0 : 1);
    } else system.processCurrentRoom(state);
  }
  return run;
}

/** Gewonnen heisst: bis zum Ende und den Boss besiegt (Dungeons ohne Boss: bis zum Ende). */
export function gewonnen(run: ExpeditionRun): boolean {
  return dungeonBezwungen(run);
}

/** Siege in `laeufe` Läufen (Startwerte 1 × 7919, 2 × 7919 …), mit `sets` in Dungeon-Sets, mit oder ohne Wege. */
export function siegeVon(
  routeId: string, team: MusterTeamName, spielweise: Spielweise, laeufe: number, sets?: MusterSetName, wege = true,
): number {
  let siege = 0;
  for (let i = 1; i <= laeufe; i++) {
    const { state, ids } = musterStand(team, i * 7919, sets, wege);
    if (gewonnen(spieleRoute(state, ids, routeId, spielweise))) siege++;
  }
  return siege;
}
