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
import { istSchmiedbar } from './Schmiede';

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
 * `schmiede` hebt jedes getragene Set-Teil in der Schmiede auf diese Stufe (docs/SCHMIEDE.md);
 * ohne die Angabe gilt die Stufe der Sets (MusterSet.schmiede, einzelne Teile nach MusterSet.stufen).
 */
export function musterStand(
  team: MusterTeamName, startwert: number, sets?: MusterSetName, wege = true, schmiede?: number,
): { state: GameState; ids: number[] } {
  const state = createNewGameState();
  state.rngSeed = startwert;
  const ids = MUSTER_TEAMS[team].helden.map((muster, i) => {
    const held = createGuildFighter(muster.classId, muster.name, musterWerte(muster));
    held.id = 100 + i;
    held.level = muster.stufe;
    held.xp = totalXpForLevel(muster.stufe);
    held.gear = { ...((sets && MUSTER_SETS[sets].gear[muster.name]) || muster.gear) };
    if (wege && muster.weg) held.spezialisierung = muster.weg;
    state.fighters.push(held);
    return held.id;
  });
  const stufe = schmiede ?? (sets ? MUSTER_SETS[sets].schmiede ?? 0 : 0);
  const einzeln = (schmiede === undefined && sets && MUSTER_SETS[sets].stufen) || {};
  if (stufe > 0 || Object.keys(einzeln).length > 0) {
    const stufen: Record<string, number> = {};
    for (const held of state.fighters) {
      for (const itemId of Object.values(held.gear)) {
        if (!itemId || !istSchmiedbar(itemId)) continue;
        const eigene = einzeln[itemId] ?? stufe;
        if (eigene > 0) stufen[itemId] = eigene;
      }
    }
    state.schmiede = { stufen };
  }
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

/**
 * Der Bosskampf endete nach dem Rundenlimit ohne Sieger (CombatEngine, 20 Runden): Der Boss steht noch,
 * der Lauf gilt als beendet, aber nicht als bezwungen (`dungeonBezwungen`). Für Dungeons ohne Boss nie.
 */
export function amRundenlimit(run: ExpeditionRun): boolean {
  const bossRaum = run.rooms.find(r => r.type === 'boss');
  return !!bossRaum && bossRaum.completed && run.status !== 'defeat' && bossRaum.enemies.some(e => e.hp > 0);
}

/** Der Boss hat im Bosskampf gewütet (Wut-Runde erreicht, CombatEngine schreibt «ENRAGE» ins Protokoll). */
export function bossWutete(run: ExpeditionRun): boolean {
  const bossRaum = run.rooms.find(r => r.type === 'boss');
  return !!bossRaum && bossRaum.enemies.some(e => run.combatLog.includes(`!! ${e.name} ENRAGE !!`));
}

/** Ergebnis von `messeLaeufe`: Zahlen der Läufe (nicht Prozent) */
export interface Messung {
  laeufe: number;
  siege: number;
  /** Läufe, die am Rundenlimit des Bosskampfs endeten (kein Sieg, keine Niederlage) */
  rundenlimit: number;
  /** Siege, bei denen der Boss seine Wut-Runde nicht mehr erlebt hat (Dungeons ohne Boss: alle Siege) */
  siegeVorWut: number;
}

/**
 * `laeufe` Läufe (Startwerte 1 × 7919, 2 × 7919 …), mit `sets` in Dungeon-Sets, mit oder ohne Wege,
 * mit `schmiede` die Set-Teile auf dieser Stufe (sonst auf der Stufe der Sets): Siege, Läufe am
 * Rundenlimit und Siege vor der Wut-Runde (docs/NEUE-DUNGEONS.md, «Eichung»).
 */
export function messeLaeufe(
  routeId: string, team: MusterTeamName, spielweise: Spielweise, laeufe: number, sets?: MusterSetName, wege = true,
  schmiede?: number,
): Messung {
  const messung: Messung = { laeufe, siege: 0, rundenlimit: 0, siegeVorWut: 0 };
  for (let i = 1; i <= laeufe; i++) {
    const { state, ids } = musterStand(team, i * 7919, sets, wege, schmiede);
    const run = spieleRoute(state, ids, routeId, spielweise);
    if (gewonnen(run)) {
      messung.siege++;
      if (!bossWutete(run)) messung.siegeVorWut++;
    } else if (amRundenlimit(run)) messung.rundenlimit++;
  }
  return messung;
}

/**
 * Siege in `laeufe` Läufen (Startwerte 1 × 7919, 2 × 7919 …), mit `sets` in Dungeon-Sets, mit oder ohne Wege,
 * mit `schmiede` die Set-Teile auf dieser Stufe (sonst auf der Stufe der Sets).
 */
export function siegeVon(
  routeId: string, team: MusterTeamName, spielweise: Spielweise, laeufe: number, sets?: MusterSetName, wege = true,
  schmiede?: number,
): number {
  return messeLaeufe(routeId, team, spielweise, laeufe, sets, wege, schmiede).siege;
}
