// ─── Magic City – Probespiel ────────────────────────────────────
// localhost:5173/?probe öffnet ein eigenes Spiel, um das Endgame auszuprobieren:
// Magische Stadt (Stadtstufe 7) mit dem Musterteam «Gut» der Dungeon-Eichung
// (data/musterteams.ts), Gildenrang V und allen Bossen bis zum Vulkankern besiegt,
// also offenem Drachenhort. ?probe=sterne beginnt es zwischen den Sternen: Team
// «Stark» mit seinen Wegen in Dungeon-Sets auf +3, alle Bosse bis zum Oberarchivar
// besiegt, die Sternenschmiede offen. Das Gildenhaus ist ausgebaut, damit alle vier
// Helden mitgehen. Es hat einen eigenen Speicherplatz
// (SaveSystem.nutzeProbespiel), der richtige Spielstand bleibt unberührt.
// Hinweis im Hauptmenü: ui/components/ProbespielHinweis.ts.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { createGuildFighter } from '../models/GuildRoster';
import { HERZSTEINE } from '../data/stadtstufen';
import { GUILD_RANK_DEFS } from '../data/guildRanks';
import { ROUTE_DEFS } from '../data/routes';
import { BUILDING_UPGRADE_DEFS } from '../data/buildingUpgrades';
import { MUSTER_SETS, MUSTER_TEAMS, musterWerte } from '../data/musterteams';
import { setFuerRoute, setTeilIds } from '../data/dungeonSets';
import { MAX_SCHMIEDE_STUFE } from '../data/schmiede';
import { totalXpForLevel } from './HeroProgression';
import { ClassUnlockSystem } from './ClassUnlockSystem';
import { SPLITTER, istSchmiedbar, schmiedeKosten } from './Schmiede';

/**
 * Vorräte für ein paar Aufstiege und etwas zum Bauen, dazu zum Ausprobieren der Schmiede
 * das Set des Magma-Wyrms (eine Klinge doppelt, zum Einschmelzen) und Glutkern für drei Stufen.
 */
const PROBE_VORRAT: Record<string, number> = {
  gold: 3000, wood: 400, stone: 250, bread: 30, healing_potion: 10, power_bread: 5,
  set_wyrm_klinge: 2, set_wyrm_platte: 1, set_wyrm_amulett: 1, mat_glutkern: 60, crystal_shard: 10,
};

/** Ist die Seite mit ?probe geöffnet? */
export function istProbespiel(search: string): boolean {
  return new URLSearchParams(search).has('probe');
}

/** ?probe=neu oder ?probe=sterne: das Probespiel von vorn beginnen */
export function probespielNeu(search: string): boolean {
  const wert = new URLSearchParams(search).get('probe');
  return wert === 'neu' || wert === 'sterne';
}

/** ?probe=sterne: das Probespiel beginnt vor der Sternenschmiede */
export function probespielSterne(search: string): boolean {
  return new URLSearchParams(search).get('probe') === 'sterne';
}

/**
 * Macht aus einem neuen Spiel (Startgebäude und Bewohner schon gesetzt) das
 * Probespiel: Stadtstufe 7 mit allen Herzsteinen und gelesenen Kapiteln, die
 * vier Helden des Musterteams «Gut» (Gildenhaus ausgebaut, damit alle vier mitgehen),
 * dazu Vorräte und ein Set für die Schmiede.
 * Die Gilde hat den höchsten Rang und alle Bosse bis Ebene 4 besiegt: Als Nächstes
 * warten die Dungeons über dem Vulkankern (Drachenhort, dann Himmelsarchiv).
 * Mit `sterne` (?probe=sterne) die Variante vor der Sternenschmiede (richteSterneEin).
 */
export function richteProbespielEin(state: GameState, sterne = false): void {
  state.stadtweg = { stufe: 7, herzsteine: HERZSTEINE.map(h => h.id), gelesen: 7 };

  const bisEbene = sterne ? 6 : 4;
  const bosse = new Set(Object.values(ROUTE_DEFS).filter(r => r.tier <= bisEbene && r.bossId).map(r => r.bossId!));
  state.guildStats.rank = GUILD_RANK_DEFS.length;
  state.guildStats.bossesDefeatedIds = [...bosse];
  state.guildStats.totalBossesDefeated = bosse.size;

  // Wie nach dem Ausbau GUILD_HALL_T2: vier Helden je Expedition, so viele wie in den Musterteams
  const gildenhaus = state.buildings.find(b => b.typeId === 'GUILD_HALL' && b.built);
  if (gildenhaus) gildenhaus.tier = Math.max(gildenhaus.tier, BUILDING_UPGRADE_DEFS.GUILD_HALL_T2.toTier);
  state.guildStats.guildHallT2 = true;

  // Wie beim Anheuern im Heldenhaus (HeroesScreen.handleHire): Helden sind keine
  // Bewohner (citizenId 0), alle Bewohner bleiben Arbeiter.
  const team = sterne ? MUSTER_TEAMS.stark : MUSTER_TEAMS.gut;
  for (const muster of team.helden) {
    const fighter = createGuildFighter(0, muster.classId, muster.name, musterWerte(muster));
    fighter.level = muster.stufe;
    fighter.xp = totalXpForLevel(muster.stufe);
    fighter.gear = { ...((sterne && MUSTER_SETS.sterne3.gear[muster.name]) || muster.gear) };
    // Zwischen den Sternen gehen sie ihren Weg schon: Ohne Wege ist dort fast nichts zu schaffen
    if (sterne && muster.weg) fighter.spezialisierung = muster.weg;
    state.fighters.push(fighter);
  }
  // Klassen, die eine Gilde mit diesen Bossen und Helden längst hat: Sonst meldet der erste
  // Bericht sechsmal «Neue Klasse»
  new ClassUnlockSystem().checkUnlocks(state);

  for (const [itemId, qty] of Object.entries(PROBE_VORRAT)) {
    state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + qty;
  }
  if (sterne) richteSterneEin(state);
}

/**
 * Probespiel zwischen den Sternen: Die getragenen Set-Teile stehen in der Schmiede auf +3
 * (wie das Musterset «sterne3» der Eichung, damit ist die Sternenschmiede meist zu schaffen).
 * Dazu liegt alles im Lager, um sie und Korrunds Meisterstücke (fallen in der Sternenschmiede)
 * bis +5 zu schmieden: Erst damit hat der Sternenschlund eine Chance.
 */
function richteSterneEin(state: GameState): void {
  const stufe = MUSTER_SETS.sterne3.schmiede ?? 0;
  const getragen = [...new Set(state.fighters.flatMap(f => Object.values(f.gear)))].filter((id): id is string => !!id && istSchmiedbar(id));
  state.schmiede = { stufen: Object.fromEntries(getragen.map(id => [id, stufe])) };
  const korrund = setTeilIds(setFuerRoute('sternenschmiede')!);
  const teile: [string, number][] = [...getragen.map((id): [string, number] => [id, stufe]), ...korrund.map((id): [string, number] => [id, 0])];
  for (const [itemId, ab] of teile) {
    for (let s = ab; s < MAX_SCHMIEDE_STUFE; s++) {
      const kosten = schmiedeKosten({ ...state, schmiede: { stufen: { [itemId]: s } } }, itemId);
      if (!kosten) break;
      state.globalStock[kosten.material.id] = (state.globalStock[kosten.material.id] ?? 0) + kosten.menge;
      state.globalStock.gold = (state.globalStock.gold ?? 0) + kosten.gold;
      state.globalStock[SPLITTER] = (state.globalStock[SPLITTER] ?? 0) + kosten.splitter;
    }
  }
}
