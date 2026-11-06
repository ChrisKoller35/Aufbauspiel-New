// ─── Magic City – Probespiel ────────────────────────────────────
// localhost:5173/?probe öffnet ein eigenes Spiel, um das Endgame auszuprobieren:
// Magische Stadt (Stadtstufe 7) mit dem Musterteam «Gut» der Dungeon-Eichung
// (data/musterteams.ts), Gildenrang V und allen Bossen bis zum Vulkankern besiegt,
// also offenem Drachenhort. ?probe=sterne beginnt es zwischen den Sternen: Team
// «Stark» mit seinen Wegen in Dungeon-Sets auf +3, alle Bosse bis zum Oberarchivar
// besiegt, die Sternenschmiede offen. ?probe=mond beginnt vor dem Mondhof: dasselbe
// Team in den Sets der Sterne auf +5 (MUSTER_SETS.mond5), alle Bosse bis Nyxar besiegt.
// ?probe=morgen beginnt vor dem Morgentor: dazu Brom im Pfand des Mondvogts mit dem
// Amtsstab (MUSTER_SETS.pfand5), alle Bosse bis Argentis besiegt. ?probe=stadt beginnt
// vor der Ersten Stadt: dazu Sina in Sunnas Morgengabe (morgen5), alle Bosse bis Sunna.
// ?probe=pfeiler beginnt vor den Pfeilern des Tages: dazu Grimm in Alrunas Wachfeuer
// (stadt5), alle Bosse bis Alruna, und Alrunas Kelle liegt im Lager, nicht angelegt,
// damit der Vergleich mit Broms Amtsstab zu sehen ist. ?probe=raid beginnt unter dem Raid
// «Über dem Tag»: alle Bosse bis Orm besiegt (die Leiter steht), dazu die zehn Helden der
// Muster-Gilde des Raids (data/raidMuster.ts, Variante «anker») und 40 Tagstein. ?probe=raid2 beginnt
// unter Stufe II, «Die dreizehnte Stunde»: dieselbe Gilde mit ihren fünf Lehrlingen (Variante «anker15»),
// Zenit auf Stufe I einmal besiegt (in der Woche davor, die Unruh liegt im Lager) und 60 Tagstein.
// ?probe=raid3 beginnt unter Stufe III: die Gilde mit allen zehn Lehrlingen (Variante «anker20»), Zenit auf
// Stufe I und II je einmal besiegt und 80 Tagstein.
// Das Gildenhaus ist ausgebaut, damit alle vier Helden mitgehen. Es hat einen eigenen
// Speicherplatz (SaveSystem.nutzeProbespiel), der richtige Spielstand bleibt unberührt.
// Hinweis im Hauptmenü: ui/components/ProbespielHinweis.ts.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { createGuildFighter, resetFighterIdCounter } from '../models/GuildRoster';
import { HERZSTEINE } from '../data/stadtstufen';
import { GUILD_RANK_DEFS } from '../data/guildRanks';
import { ROUTE_DEFS } from '../data/routes';
import { BUILDING_UPGRADE_DEFS } from '../data/buildingUpgrades';
import { MUSTER_SETS, MUSTER_TEAMS, musterWerte } from '../data/musterteams';
import { setFuerRoute, setTeilIds } from '../data/dungeonSets';
import { MAX_SCHMIEDE_STUFE } from '../data/schmiede';
import { RaidMusterName, baueRaidGilde } from '../data/raidMuster';
import { DREIZEHN, RaidDef, ZENIT } from '../data/raids';
import { raidStand } from './Raid';
import { wocheVon } from './Rangliste';
import { totalXpForLevel } from './HeroProgression';
import { ClassUnlockSystem } from './ClassUnlockSystem';
import { SPLITTER, istSchmiedbar, schmiedeKosten } from './Schmiede';
import { bezwungeneDungeons } from './Bezwungen';

/**
 * Wo das Probespiel beginnt: vor dem Drachenhort, der Sternenschmiede, dem Mondhof, dem Morgentor, der Ersten Stadt,
 * den Pfeilern, unter dem Raid oder unter seiner Stufe II
 */
export type ProbeStufe = 'neu' | 'sterne' | 'mond' | 'morgen' | 'stadt' | 'pfeiler' | 'raid' | 'raid2' | 'raid3';
const OBEN: ProbeStufe[] = ['sterne', 'mond', 'morgen', 'stadt', 'pfeiler', 'raid', 'raid2', 'raid3'];

/**
 * ?probe=raid: alle Bosse bis Ebene 12, zehn Helden aus der Muster-Gilde des Raids, Tagstein für bezahlte Ernstkämpfe.
 * ?probe=raid2: dieselbe Gilde mit fünf Lehrlingen, Stufe I einmal gewonnen (Stufe II offen), mehr Tagstein.
 * ?probe=raid3: dieselbe Gilde mit allen zehn Lehrlingen, Stufe I und II je einmal gewonnen (Stufe III offen).
 */
type RaidProbe = 'raid' | 'raid2' | 'raid3';
const RAID_PROBE: Record<RaidProbe, { bisEbene: number; gilde: RaidMusterName; tagstein: number }> = {
  raid: { bisEbene: 12, gilde: 'anker', tagstein: 40 },
  raid2: { bisEbene: 12, gilde: 'anker15', tagstein: 60 },
  raid3: { bisEbene: 12, gilde: 'anker20', tagstein: 80 },
};
const istRaid = (stufe: ProbeStufe): stufe is RaidProbe => stufe in RAID_PROBE;

/**
 * Die Stufen über dem Drachenhort: bis zu welcher Ebene die Bosse besiegt sind, welche Sets
 * der Eichung das Team trägt und welcher Dungeon das nächste Set bringt (sein Material liegt
 * zum Schmieden bis +5 im Lager).
 */
const STUFEN: Record<Exclude<ProbeStufe, 'neu' | RaidProbe>, {
  bisEbene: number; sets: 'sterne3' | 'mond5' | 'pfand5' | 'morgen5' | 'stadt5'; naechstesSet: string; lager?: Record<string, number>;
}> = {
  sterne: { bisEbene: 6, sets: 'sterne3', naechstesSet: 'sternenschmiede' },
  mond: { bisEbene: 8, sets: 'mond5', naechstesSet: 'mondhof' },
  morgen: { bisEbene: 9, sets: 'pfand5', naechstesSet: 'morgentor' },
  stadt: { bisEbene: 10, sets: 'morgen5', naechstesSet: 'erste_stadt' },
  pfeiler: { bisEbene: 11, sets: 'stadt5', naechstesSet: 'tagespfeiler', lager: { alrunas_kelle: 1 } },
};

/**
 * Vorräte für ein paar Aufstiege und etwas zum Bauen (Gold, Eisenschrott und Kristallsplitter
 * bezahlen die Werkstätten und ihren Ausbau), dazu zum Ausprobieren der Schmiede das Set des
 * Magma-Wyrms (eine Klinge doppelt, zum Einschmelzen) und Glutkern für drei Stufen.
 */
const PROBE_VORRAT: Record<string, number> = {
  gold: 3000, iron_scrap: 150, crystal_shard: 30, bread: 30, healing_potion: 10, power_bread: 5,
  set_wyrm_klinge: 2, set_wyrm_platte: 1, set_wyrm_amulett: 1, mat_glutkern: 60,
};

/** Ist die Seite mit ?probe geöffnet? */
export function istProbespiel(search: string): boolean {
  return new URLSearchParams(search).has('probe');
}

/** ?probe=neu oder eine Stufe weiter oben (?probe=sterne … ?probe=raid): das Probespiel von vorn beginnen */
export function probespielNeu(search: string): boolean {
  const wert = new URLSearchParams(search).get('probe');
  return wert === 'neu' || OBEN.includes(wert as ProbeStufe);
}

/**
 * Wo das Probespiel beginnt: ?probe=sterne vor der Sternenschmiede, ?probe=mond vor dem Mondhof,
 * ?probe=morgen vor dem Morgentor, ?probe=stadt vor der Ersten Stadt, ?probe=pfeiler vor den Pfeilern
 * des Tages, ?probe=raid unter dem Raid, ?probe=raid2 und raid3 unter seiner Stufe II und III, sonst vor dem
 * Drachenhort
 */
export function probespielStufe(search: string): ProbeStufe {
  const wert = new URLSearchParams(search).get('probe') as ProbeStufe;
  return OBEN.includes(wert) ? wert : 'neu';
}

/**
 * Macht aus einem neuen Spiel (Startgebäude schon gesetzt) das
 * Probespiel: Stadtstufe 7 mit allen Herzsteinen und gelesenen Kapiteln, die
 * vier Helden des Musterteams «Gut» (Gildenhaus ausgebaut, damit alle vier mitgehen),
 * dazu Vorräte und ein Set für die Schmiede.
 * Die Gilde hat den höchsten Rang und alle Bosse bis Ebene 4 besiegt: Als Nächstes
 * warten die Dungeons über dem Vulkankern (Drachenhort, dann Himmelsarchiv).
 * Mit `stufe` 'sterne', 'mond', 'morgen', 'stadt' oder 'pfeiler' die Varianten weiter oben (richteStufeEin),
 * mit 'raid' die Gilde unter dem Raid, mit 'raid2' und 'raid3' unter seiner Stufe II und III (richteRaidEin).
 */
export function richteProbespielEin(state: GameState, stufe: ProbeStufe = 'neu'): void {
  state.stadtweg = { stufe: 7, herzsteine: HERZSTEINE.map(h => h.id), gelesen: 7 };

  const oben = stufe === 'neu' || istRaid(stufe) ? undefined : STUFEN[stufe];
  const bisEbene = istRaid(stufe) ? RAID_PROBE[stufe].bisEbene : oben?.bisEbene ?? 4;
  const bosse = new Set(Object.values(ROUTE_DEFS).filter(r => r.tier <= bisEbene && r.bossId).map(r => r.bossId!));
  state.guildStats.rank = GUILD_RANK_DEFS.length;
  state.guildStats.bossesDefeatedIds = [...bosse];
  state.guildStats.totalBossesDefeated = bosse.size;

  // Wie nach dem Ausbau GUILD_HALL_T2: vier Helden je Expedition, so viele wie in den Musterteams
  const gildenhaus = state.buildings.find(b => b.typeId === 'GUILD_HALL' && b.built);
  if (gildenhaus) gildenhaus.tier = Math.max(gildenhaus.tier, BUILDING_UPGRADE_DEFS.GUILD_HALL_T2.toTier);
  state.guildStats.guildHallT2 = true;

  // Helden wie beim Anheuern im Heldenhaus (HeroesScreen.handleHire), schon auf Stufe und ausgerüstet;
  // der Guardian der neuen Stadt (CityStartingLayout) weicht dem Musterteam
  state.fighters = [];
  const team = oben ? MUSTER_TEAMS.stark : MUSTER_TEAMS.gut;
  for (const muster of team.helden) {
    const fighter = createGuildFighter(muster.classId, muster.name, musterWerte(muster));
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
  if (istRaid(stufe)) richteRaidEin(state, stufe);
}

/**
 * Probespiel unter dem Raid: Statt der vier aus dem Musterteam stehen die zehn Helden der Muster-Gilde da (Ids 1 bis
 * 10, die Set-Teile in der Schmiede auf ihrer Stufe), dazu Tagstein für bezahlte Ernstkämpfe. Der Merker der
 * bezwungenen Dungeons entsteht gleich aus den besiegten Bossen: Erst damit steht die Leiter auf den Pfeilern.
 */
function richteRaidEin(state: GameState, stufe: RaidProbe): void {
  const probe = RAID_PROBE[stufe];
  const gilde = baueRaidGilde(probe.gilde, { ersteId: 1 });
  state.fighters = gilde.helden;
  resetFighterIdCounter(gilde.helden.length + 1);
  state.schmiede = { stufen: { ...gilde.stufen } };
  new ClassUnlockSystem().checkUnlocks(state);
  state.globalStock.mat_tagstein = (state.globalStock.mat_tagstein ?? 0) + probe.tagstein;
  state.bezwungen = undefined;
  bezwungeneDungeons(state);
  if (stufe === 'raid2' || stufe === 'raid3') einmalBesiegt(state, ZENIT, 10, ['raid_versuche', 'raid_siege', 'raid_mehr_als_vier', 'raid_wochen']);
  if (stufe === 'raid3') einmalBesiegt(state, DREIZEHN, 15, ['raid2_siege', 'raid2_wochen']);
}

/**
 * ?probe=raid2 und raid3: Zenit auf der Stufe darunter einmal besiegt, in der Woche davor (diese Woche ist dort alles
 * frei, und der Montag-Satz erzählt vom Aufziehen). Die Beute vom ersten Sieg liegt im Lager, die Zähler stehen, wie
 * ein Ernstkampf sie gesetzt hätte. Damit ist die Stufe darüber offen (Raid.raidOffen).
 */
function einmalBesiegt(state: GameState, def: RaidDef, helden: number, zaehlerListe: string[], jetzt = Date.now()): void {
  const stand = raidStand(state, jetzt, def);
  const vorige = wocheVon(jetzt - 7 * 24 * 60 * 60 * 1000).id;
  stand.siege = 1;
  stand.versucheGesamt = 1;
  stand.bestRest = 0;
  stand.einleitungGelesen = true;
  stand.schlussGelesen = true;
  stand.verlauf = [{ zeit: jetzt - 7 * 24 * 60 * 60 * 1000, woche: vorige, sieg: true, rest: 0, runden: 15, helden, stehend: 6 }];
  state.globalStock[def.ersterSiegBeute] = (state.globalStock[def.ersterSiegBeute] ?? 0) + 1;
  for (const zaehler of zaehlerListe) {
    state.statistics[zaehler] = Math.max(state.statistics[zaehler] ?? 0, 1);
  }
}

/**
 * Probespiel weiter oben: Die getragenen Set-Teile stehen in der Schmiede auf der Stufe der
 * Musterausrüstung (sterne3: +3, damit ist die Sternenschmiede meist zu schaffen; die übrigen: +5).
 * Dazu liegt alles im Lager, um sie und das Set des nächsten Dungeons (Korrunds Meisterstücke,
 * das Pfand des Mondvogts, Sunnas Morgengabe, Alrunas Wachfeuer bzw. «Was den Tag trug», fallen
 * erst dort) bis +5 zu schmieden: Erst damit hat der Dungeon darüber eine Chance. Was die Stufe
 * sonst noch ins Lager legt (`lager`, Alrunas Kelle), kommt dazu.
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
  for (const [itemId, menge] of Object.entries(oben.lager ?? {})) {
    state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + menge;
  }
}
