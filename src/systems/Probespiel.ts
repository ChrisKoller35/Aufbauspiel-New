// ─── Magic City – Probespiel ────────────────────────────────────
// localhost:5173/?probe öffnet ein eigenes Spiel, um das Endgame auszuprobieren:
// Magische Stadt (Stadtstufe 7) mit dem Musterteam «Gut» der Dungeon-Eichung
// (data/musterteams.ts), Gildenrang V und allen Bossen bis zum Vulkankern besiegt,
// also offenem Drachenhort. ?probe=sterne beginnt es zwischen den Sternen: Team
// «Stark» mit seinen Wegen in Dungeon-Sets auf +3, alle Bosse bis zum Oberarchivar
// besiegt, die Sternenschmiede offen. ?probe=mond beginnt vor dem Mondhof: dasselbe
// Team in den Sets der Sterne auf +5 (MUSTER_SETS.mond5), alle Bosse bis Nyxar besiegt.
// Das Gildenhaus ist ausgebaut, damit alle vier Helden mitgehen. Es hat einen eigenen
// Speicherplatz (SaveSystem.nutzeProbespiel), der richtige Spielstand bleibt unberührt.
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

/** Wo das Probespiel beginnt: vor dem Drachenhort, vor der Sternenschmiede oder vor dem Mondhof */
export type ProbeStufe = 'neu' | 'sterne' | 'mond';

/**
 * Die Stufen über dem Drachenhort: bis zu welcher Ebene die Bosse besiegt sind, welche Sets
 * der Eichung das Team trägt und welcher Dungeon das nächste Set bringt (sein Material liegt
 * zum Schmieden bis +5 im Lager).
 */
const STUFEN: Record<Exclude<ProbeStufe, 'neu'>, { bisEbene: number; sets: 'sterne3' | 'mond5'; naechstesSet: string }> = {
  sterne: { bisEbene: 6, sets: 'sterne3', naechstesSet: 'sternenschmiede' },
  mond: { bisEbene: 8, sets: 'mond5', naechstesSet: 'mondhof' },
};

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

/** ?probe=neu, ?probe=sterne oder ?probe=mond: das Probespiel von vorn beginnen */
export function probespielNeu(search: string): boolean {
  const wert = new URLSearchParams(search).get('probe');
  return wert === 'neu' || wert === 'sterne' || wert === 'mond';
}

/** Wo das Probespiel beginnt: ?probe=sterne vor der Sternenschmiede, ?probe=mond vor dem Mondhof, sonst vor dem Drachenhort */
export function probespielStufe(search: string): ProbeStufe {
  const wert = new URLSearchParams(search).get('probe');
  return wert === 'sterne' || wert === 'mond' ? wert : 'neu';
}

/**
 * Macht aus einem neuen Spiel (Startgebäude und Bewohner schon gesetzt) das
 * Probespiel: Stadtstufe 7 mit allen Herzsteinen und gelesenen Kapiteln, die
 * vier Helden des Musterteams «Gut» (Gildenhaus ausgebaut, damit alle vier mitgehen),
 * dazu Vorräte und ein Set für die Schmiede.
 * Die Gilde hat den höchsten Rang und alle Bosse bis Ebene 4 besiegt: Als Nächstes
 * warten die Dungeons über dem Vulkankern (Drachenhort, dann Himmelsarchiv).
 * Mit `stufe` 'sterne' oder 'mond' die Varianten weiter oben (richteStufeEin).
 */
export function richteProbespielEin(state: GameState, stufe: ProbeStufe = 'neu'): void {
  state.stadtweg = { stufe: 7, herzsteine: HERZSTEINE.map(h => h.id), gelesen: 7 };

  const oben = stufe === 'neu' ? undefined : STUFEN[stufe];
  const bisEbene = oben?.bisEbene ?? 4;
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
  const team = oben ? MUSTER_TEAMS.stark : MUSTER_TEAMS.gut;
  for (const muster of team.helden) {
    const fighter = createGuildFighter(0, muster.classId, muster.name, musterWerte(muster));
    fighter.level = muster.stufe;
    fighter.xp = totalXpForLevel(muster.stufe);
    fighter.gear = { ...((oben && MUSTER_SETS[oben.sets].gear[muster.name]) || muster.gear) };
    // Über dem Himmelsarchiv gehen sie ihren Weg schon: Ohne Wege ist dort fast nichts zu schaffen
    if (oben && muster.weg) fighter.spezialisierung = muster.weg;
    state.fighters.push(fighter);
  }
  // Klassen, die eine Gilde mit diesen Bossen und Helden längst hat: Sonst meldet der erste
  // Bericht sechsmal «Neue Klasse»
  new ClassUnlockSystem().checkUnlocks(state);

  for (const [itemId, qty] of Object.entries(PROBE_VORRAT)) {
    state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + qty;
  }
  if (oben) richteStufeEin(state, oben);
}

/**
 * Probespiel weiter oben: Die getragenen Set-Teile stehen in der Schmiede auf der Stufe der
 * Musterausrüstung (sterne3: +3, damit ist die Sternenschmiede meist zu schaffen; mond5: +5).
 * Dazu liegt alles im Lager, um sie und das Set des nächsten Dungeons (Korrunds Meisterstücke
 * bzw. das Pfand des Mondvogts, fallen erst dort) bis +5 zu schmieden: Erst damit hat der
 * Dungeon darüber eine Chance.
 */
function richteStufeEin(state: GameState, oben: (typeof STUFEN)[keyof typeof STUFEN]): void {
  const stufe = MUSTER_SETS[oben.sets].schmiede ?? 0;
  const getragen = [...new Set(state.fighters.flatMap(f => Object.values(f.gear)))].filter((id): id is string => !!id && istSchmiedbar(id));
  state.schmiede = { stufen: Object.fromEntries(getragen.map(id => [id, stufe])) };
  const naechstes = setTeilIds(setFuerRoute(oben.naechstesSet)!);
  const teile: [string, number][] = [...getragen.map((id): [string, number] => [id, stufe]), ...naechstes.map((id): [string, number] => [id, 0])];
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
