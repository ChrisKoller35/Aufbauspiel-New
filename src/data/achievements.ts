/**
 * Erfolge für Magic City, in Gruppen.
 * Jede Bedingung liest nur state.statistics. Das Spiel zählt dort selbst Bauten, Ausbauten,
 * Expeditionen und Käufe beim Händler (systems/Haendler.ts: total_haendler_kaeufe); Werte, die
 * niemand von selbst zählt (Stadtstufe, Werkstätten, Helden, Sets, Monsterbuch,
 * Auftragsbrett, Trophäensaal …), schreibt kennzahlenAktualisieren() in
 * systems/AchievementSystem.ts dort hinein. Die IDs stehen in Spielständen (state.achievements) und bleiben fest.
 * Liste: docs/ERFOLGE.md. Jedes Ziel ist mit den echten Regeln erreichbar:
 * tests/erfolgeErreichbar.test.ts.
 */

import { ANBAU_AB_EBENE } from './auftragsbrett';
import { DUNGEON_GRAPH, ROUTE_DEFS } from './routes';
import { MAX_SCHMIEDE_STUFE } from './schmiede';
import { LEHRLINGE } from './lehrlinge';

export type ErfolgGruppe = 'Stadt' | 'Gilde' | 'Helden' | 'Dungeons' | 'Gipfel-Taten' | 'Sammeln' | 'Das System schaut zu';

export const ERFOLG_GRUPPEN: ErfolgGruppe[] = ['Stadt', 'Gilde', 'Helden', 'Dungeons', 'Gipfel-Taten', 'Sammeln', 'Das System schaut zu'];

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  gruppe: ErfolgGruppe;
  /** Zeichen (Emoji) für die Anzeige */
  icon: string;
  /** Schlüssel in statistics (mehrere werden addiert); daraus kommt der Fortschrittsbalken */
  zaehler: string | string[];
  /** Ab diesem Wert ist der Erfolg geschafft */
  ziel: number;
  /** Versteckt: Bis zum Freischalten zeigt der Bildschirm nur «???» und diesen Satz des Systems */
  versteckt?: string;
  condition: (stats: Record<string, number>) => boolean;
}

/** Stand des Zählers eines Erfolgs (Summe, falls mehrere Schlüssel) */
export function zaehlerWert(def: Pick<AchievementDef, 'zaehler'>, stats: Record<string, number>): number {
  const keys = Array.isArray(def.zaehler) ? def.zaehler : [def.zaehler];
  return keys.reduce((summe, key) => summe + (stats[key] ?? 0), 0);
}

function erfolg(
  id: string, gruppe: ErfolgGruppe, icon: string, name: string, description: string,
  zaehler: string | string[], ziel: number, versteckt?: string,
): AchievementDef {
  const def = { id, gruppe, icon, name, description, zaehler, ziel, versteckt };
  return { ...def, condition: (stats) => zaehlerWert(def, stats) >= ziel };
}

/** Beendete Expeditionen: Siege, Niederlagen und Rückzüge (total_expeditions zählt schon beim Start) */
export const BEENDETE_EXPEDITIONEN = ['total_victories', 'total_defeats', 'total_retreats'];

/** Sockel im Trophäensaal: einer je Boss-Dungeon der Karte, im Saal (bis Ebene 10) und im Anbau (ab Ebene 11) */
const BOSS_EBENEN = DUNGEON_GRAPH.filter(n => ROUTE_DEFS[n.routeId]?.bossId).map(n => ROUTE_DEFS[n.routeId].tier);
/** Sockel im Saal: so viele Kapitel hat die Kette «Der Saal der Gilde» (data/auftragsbrett.ts, ANBAU_AB_EBENE) */
export const SAAL_SOCKEL = BOSS_EBENEN.filter(t => t < ANBAU_AB_EBENE).length;
/** Sockel im Anbau des Saals */
export const ANBAU_SOCKEL = BOSS_EBENEN.length - SAAL_SOCKEL;
/** Drei Sterne je Sockel in Saal und Anbau (Boss, ganzes Set, Prunkstück); «Glanz des Saals» will die Hälfte davon */
const SAAL_STERNE = 3 * BOSS_EBENEN.length;
const SAAL_HALBER_GLANZ = Math.ceil(SAAL_STERNE / 2);

/** Die acht Gipfel-Taten (systems/GipfelTaten.ts): je Dungeon über dem Vulkankern dreimal das Risiko, Boss trotzdem tot */
export const GIPFEL_TATEN = ['tat_hort', 'tat_archiv', 'tat_esse', 'tat_schlund', 'tat_pfand', 'tat_uhr', 'tat_feuer', 'tat_pfeiler'];

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── Stadt (die Gildenstadt: Händler und vier Werkstätten, docs/GILDENSTADT.md) ──
  erfolg('haendler_1', 'Stadt', '🛒', 'Erster Kauf', 'Kaufe zum ersten Mal beim Händler in der Stadt ein: Proviant oder Ausrüstung.', 'total_haendler_kaeufe', 1),
  erfolg('first_building', 'Stadt', '🏗️', 'Grundsteinlegung', 'Errichte dein erstes Gebäude.', 'total_buildings_built', 1),
  erfolg('werkstaetten_4', 'Stadt', '🏘️', 'Gildenstadt', 'Alle vier Werkstätten stehen: Schmiede, Kräuterküche, Arkanschmiede und Kriegsmaschinen-Werkstatt.', 'werkstaetten', 4),
  erfolg('mass_builder', 'Stadt', '🏛️', 'Baumeister', 'Baue 10 Mal (Neubauten und Ausbauten zählen).', 'total_buildings_built', 10),
  erfolg('ausbau_5', 'Stadt', '🔨', 'Ausbauer', 'Baue 5 Mal aus (Werkstätten und Gildenhaus zählen).', 'total_upgrades', 5),
  erfolg('werkstatt_3', 'Stadt', '🏰', 'Meisterwerkstatt', 'Baue eine Werkstatt auf Stufe 3 aus.', 'werkstatt_hoechste_stufe', 3),
  erfolg('stadtstufe_3', 'Stadt', '🛖', 'Dorf', 'Erreiche die Stadtstufe «Dorf» (3).', 'stadtstufe', 3),
  erfolg('stadtstufe_5', 'Stadt', '🏙️', 'Stadtrecht', 'Erreiche die Stadtstufe «Stadt» (5).', 'stadtstufe', 5),
  erfolg('stadtstufe_7', 'Stadt', '✨', 'Magische Stadt', 'Erreiche die Stadtstufe «Magische Stadt» (7).', 'stadtstufe', 7),
  erfolg('survivor_100', 'Stadt', '⭐', 'Überlebenskünstler', 'Halte deine Stadt 100 Tage am Leben.', 'total_days_survived', 100),

  // ── Gilde ──
  erfolg('gildenrang_3', 'Gilde', '🎖️', 'Veteranengilde', 'Erreiche Gildenrang III.', 'gildenrang', 3),
  erfolg('gildenrang_5', 'Gilde', '👑', 'Gildenmeister', 'Erreiche Gildenrang V und trage den Titel Gildenmeister.', 'gildenrang', 5),
  erfolg('zettel_10', 'Gilde', '📌', 'Fleissige Gilde', 'Erledige 10 Zettel am Auftragsbrett.', 'zettel_erledigt', 10),
  erfolg('saal_kette', 'Gilde', '🏺', 'Alle Sockel voll', 'Stelle alle Prunkstücke der Kette «Der Saal der Gilde» in den Trophäensaal.', 'saal_prunkstuecke', SAAL_SOCKEL),
  erfolg('anbau_kette', 'Gilde', '🧱', 'Angebaut', 'Stelle auch die Prunkstücke im Anbau des Saals auf, die Kohle der Ersten und den Keil des Trägers.', 'anbau_prunkstuecke', ANBAU_SOCKEL),
  erfolg('saal_glanz', 'Gilde', '🌟', 'Glanz des Saals', `Sammle ${SAAL_HALBER_GLANZ} der ${SAAL_STERNE} Sterne im Trophäensaal.`, 'saal_sterne', SAAL_HALBER_GLANZ),
  erfolg('rangliste_pokal', 'Gilde', '🥉', 'Aufs Treppchen', 'Gewinne einen Pokal in der Wochenwertung der Rangliste (Platz 1 bis 3).', 'rangliste_pokale', 1),
  erfolg('gipfel_1', 'Gilde', '🏔️', 'Gipfelstürmer', 'Führe die Gipfel-Rangliste an, vor allen Rivalen-Gilden.', 'gipfel_spitze', 1),

  // ── Helden ──
  erfolg('army_builder', 'Helden', '🛡️', 'Armeeführer', 'Habe 10 Helden in der Gilde.', 'helden_anzahl', 10),
  erfolg('erster_weg', 'Helden', '🧭', 'Wegbereiter', 'Ein Held wählt seinen Weg (ab Stufe 10).', 'helden_mit_weg', 1),
  erfolg('erster_meister', 'Helden', '🥋', 'Meister seines Wegs', 'Ein Held wird Meister seines Wegs (Stufe 15).', 'helden_meister', 1),
  // Lehrlinge (systems/Lehrlinge.ts): je Klasse einer, sobald ihr Held Stufe 15 erreicht
  erfolg('erster_lehrling', 'Helden', '🎓', 'Lehrjahre', 'Nimm den ersten Lehrling auf. Er hat dreimal nach dem Weg zur Wachstube gefragt und ist trotzdem pünktlich.', 'lehrlinge', 1),
  erfolg('lehrling_ausgelernt', 'Helden', '📜', 'Ausgelernt', 'Ein Lehrling erreicht Stufe 15. Seither sagt er «wir Veteranen».', 'lehrlinge_ausgelernt', 1),
  erfolg('doppelt_besetzt', 'Helden', '👥', 'Doppelt besetzt', `Alle ${Object.keys(LEHRLINGE).length} Klassen haben ihren Lehrling. Alruna hat für die Wachstube neue Hocker bestellt, diesmal genug.`, 'lehrlinge', Object.keys(LEHRLINGE).length),

  // ── Dungeons ──
  erfolg('first_expedition', 'Dungeons', '🗺️', 'Abenteuerlust', 'Starte deine erste Expedition.', 'total_expeditions', 1),
  erfolg('first_victory', 'Dungeons', '🏆', 'Siegreich', 'Kehre siegreich von einer Expedition zurück.', 'total_victories', 1),
  erfolg('veteran_explorer', 'Dungeons', '⚔️', 'Veteran', 'Beende 10 Expeditionen (Sieg, Niederlage oder Rückzug).', BEENDETE_EXPEDITIONEN, 10),
  erfolg('perfectionist', 'Dungeons', '💎', 'Perfektionist', 'Gewinne eine Expedition, ohne dass ein Held fällt.', 'total_flawless_victories', 1),
  erfolg('first_boss', 'Dungeons', '💀', 'Bossbekämpfer', 'Besiege deinen ersten Boss.', 'total_bosses_killed', 1),
  erfolg('boss_slayer', 'Dungeons', '🔥', 'Bosskiller', 'Besiege 5 Bosse.', 'total_bosses_killed', 5),
  erfolg('bosse_10', 'Dungeons', '🐉', 'Bossjäger', 'Besiege 10 Bosse.', 'total_bosses_killed', 10),
  erfolg('bosse_25', 'Dungeons', '☠️', 'Schrecken der Tiefe', 'Besiege 25 Bosse.', 'total_bosses_killed', 25),
  erfolg('gold_hoarder', 'Dungeons', '💰', 'Goldhamster', 'Erbeute insgesamt 500 Gold auf Expeditionen.', 'total_gold_earned', 500),
  erfolg('kill_100', 'Dungeons', '💠', 'Hundertfacher Tod', 'Besiege 100 Gegner.', 'total_enemies_killed', 100),
  erfolg('kill_1000', 'Dungeons', '🗡️', 'Tausendfacher Tod', 'Besiege 1000 Gegner.', 'total_enemies_killed', 1000),
  // Der Raid «Über dem Tag» (systems/Raid.ts zählt nach jedem Ernstkampf, docs/RAID.md)
  erfolg('raid_versuch', 'Dungeons', '🪜', 'Zehn Sprossen', 'Den ersten Ernstkampf gegen Zenit gewagt. Die Leiter hat zehn Sprossen; Jorinde hat sie gezählt, auf dem Rückweg noch einmal.', 'raid_versuche', 1),
  erfolg('raid_sieg', 'Dungeons', '🕰️', 'Der Tag hängt gerade', 'Zenit besiegt. Orm hat zum ersten Mal nach oben geschaut.', 'raid_siege', 1),
  erfolg('raid_punkt_zwoelf', 'Dungeons', '🔔', 'Punkt zwölf', 'Zenit in der zwölften Runde oder früher besiegt. Er wollte gerade Mittag machen.', 'raid_punkt_zwoelf', 1),
  erfolg('raid_mehr_als_vier', 'Dungeons', '🪑', 'Mehr als vier', 'Zenit besiegt, und am Ende standen mindestens fünf. Für die Vorigen gab es vier Hocker. Alruna hat einen fünften dazugestellt.', 'raid_mehr_als_vier', 1),
  erfolg('raid_montage', 'Dungeons', '📅', 'Jeden Montag', 'Zenit in vier verschiedenen Wochen besiegt. Er zieht sich trotzdem jeden Montag wieder auf. Er nennt es Pflicht, Orm nennt es Sturheit.', 'raid_wochen', 4),
  // Stufe II «Die dreizehnte Stunde» zählt eigens (raid2_…); die Zähler oben zählen nur Stufe I
  erfolg('raid_dreizehn', 'Dungeons', '🕐', 'Es schlägt nicht dreizehn', 'Zenit auf Stufe II besiegt, mit beiden Zeigern. Jetzt hat die Gilde zwei Unruhen. Orm sagt, er wisse nicht, woher die zweite kam.', 'raid2_siege', 1),
  erfolg('raid_doppelschicht', 'Dungeons', '🗓️', 'Doppelschicht', 'Die dreizehnte Stunde in vier verschiedenen Wochen gewonnen. Zenit zieht sich jeden Montag wieder auf, jetzt zweimal: einmal für jeden Zeiger.', 'raid2_wochen', 4),

  // ── Gipfel-Taten (in allen drei Wahl-Räumen das Risiko, Boss trotzdem besiegt; docs/ERFOLGE.md) ──
  erfolg('gipfel_hort', 'Gipfel-Taten', '🪙', 'Ehrlicher Finder', 'Im Drachenhort Goldhaufen, Edelsteinschale und Drachenkrone eingesteckt und Ignarax trotzdem besiegt. Er hat bis zuletzt nachgezählt.', 'tat_hort', 1),
  erfolg('gipfel_archiv', 'Gipfel-Taten', '📕', 'Ohne Leseausweis', 'Alle drei verbotenen Bücher des Himmelsarchivs gelesen und den Oberarchivar trotzdem besiegt. Eure Namen sind jetzt doppelt rot unterstrichen.', 'tat_archiv', 1),
  erfolg('gipfel_esse', 'Gipfel-Taten', '☄️', 'Nicht anfassen', 'Dreimal ins Sternenfeuer gegriffen und Korrund trotzdem besiegt. Auf seinem Amboss steht «Nicht anfassen» jetzt doppelt so gross.', 'tat_esse', 1),
  erfolg('gipfel_schlund', 'Gipfel-Taten', '⛏️', 'Sternenmetzger', 'Aus allen drei gefangenen Sternen Sternenstahl geschlagen und Nyxar trotzdem besiegt. Die Bäckerin findet drei Sterne verdächtig blass.', 'tat_schlund', 1),
  erfolg('gipfel_pfand', 'Gipfel-Taten', '✍️', 'Pfandleiher des Jahres', 'Alle drei Pfandzettel unterschrieben und Argentis trotzdem besiegt. Der Mondvogt prüft noch, wie.', 'tat_pfand', 1),
  erfolg('gipfel_uhr', 'Gipfel-Taten', '🕛', 'Zeitumstellung', 'Die Sonnenuhr dreimal vorgestellt und Sunna trotzdem besiegt. Sie hatte schon gefrühstückt und war entsprechend gelaunt.', 'tat_uhr', 1),
  erfolg('gipfel_feuer', 'Gipfel-Taten', '🏮', 'Mit blossen Händen', 'Dreimal ins Wachfeuer gegriffen und Alruna trotzdem besiegt. Sie hat es auf ihrer Liste abgehakt, unter «Was wir auch gemacht haben».', 'tat_feuer', 1),
  erfolg('gipfel_pfeiler', 'Gipfel-Taten', '🏛️', 'Abrissunternehmen', 'Alle drei Pfeiler herausgebrochen und Orm trotzdem besiegt. Alruna hat es auf ihre Liste geschrieben, ganz oben, mit einem neuen Stift.', 'tat_pfeiler', 1),
  erfolg('gipfel_alle', 'Gipfel-Taten', '🐲', 'Hat alles', 'Alle acht Gipfel-Taten vollbracht. Ignarax hatte alles. Jetzt habt ihr es, und Alruna hat es aufgeschrieben.', GIPFEL_TATEN, GIPFEL_TATEN.length),
  erfolg('gipfel_kleingedrucktes', 'Gipfel-Taten', '🧾', 'Kleingedrucktes', 'Alle drei Pfandzettel unterschrieben und Argentis nicht besiegt. Das Pfand behält der Mondvogt, die Quittung dürft ihr behalten.', 'tat_kleingedrucktes', 1),
  erfolg('gipfel_einsturz', 'Gipfel-Taten', '🧱', 'Einsturzgefahr', 'Alle drei Pfeiler herausgebrochen und Orm nicht besiegt. Er trägt jetzt etwas mehr. Er hat es sich gemerkt.', 'tat_einsturz', 1),

  // ── Sammeln ──
  erfolg('ganzes_set', 'Sammeln', '🧩', 'Komplett', 'Ein Held trägt alle drei Teile eines Dungeon-Sets.', 'ganze_sets', 1),
  erfolg('ganze_sets_3', 'Sammeln', '🎒', 'Sammler', 'Deine Helden tragen 3 verschiedene ganze Dungeon-Sets.', 'ganze_sets', 3),
  erfolg('schmiede_1', 'Sammeln', '⚒️', 'Am Amboss', 'Verbessere ein Set-Teil in der Schmiede.', 'schmiede_hoechste_stufe', 1),
  erfolg('schmiede_5', 'Sammeln', '💫', 'Meisterstück', `Schmiede ein Set-Teil auf +${MAX_SCHMIEDE_STUFE}.`, 'schmiede_hoechste_stufe', MAX_SCHMIEDE_STUFE),
  erfolg('monsterbuch_25', 'Sammeln', '📖', 'Monsterkundler', 'Entdecke 25 Monster für das Monsterbuch.', 'monsterbuch_entdeckt', 25),
  erfolg('monsterbuch_50', 'Sammeln', '📚', 'Monstergelehrter', 'Entdecke 50 Monster für das Monsterbuch.', 'monsterbuch_entdeckt', 50),

  // ── Das System schaut zu (versteckt bis zum Freischalten; gezählt am Ende der Expedition, docs/ERFOLGE.md) ──
  erfolg('kalte_fuesse', 'Das System schaut zu', '🐔', 'Kalte Füsse', 'Umgekehrt, bevor ein einziger Gegner fiel. Das System nennt es Rückzug. Die Gegner nennen es anders.', 'kalte_fuesse', 1, 'Das System hat schon kürzere Expeditionen gesehen. Nicht viele.'),
  erfolg('unentschieden', 'Das System schaut zu', '🤝', 'Unentschieden', 'Zwanzig Runden gegen den Boss, und keine Seite fiel. Das System wertet das als Sieg. Der Boss auch.', 'unentschieden', 1, 'Das System zählt bis zwanzig. Manche Bosse auch.'),
  erfolg('woertlich_genommen', 'Das System schaut zu', '😱', 'Wörtlich genommen', 'Auf ☠ Albtraum verloren. Das System weist darauf hin, dass der Name eine Warnung war.', 'woertlich_genommen', 1, 'Manche Warnungen stehen schon im Namen. Das System liest sie gern laut vor.'),
  erfolg('schlafstoerung', 'Das System schaut zu', '🛌', 'Schlafstörung', 'Drei Dungeons auf ☠ Albtraum bezwungen. Das System hat dreimal vermerkt, dass diese Gilde nicht aufhört, wenn es reicht. Es führt dafür jetzt eine eigene Liste.', 'albtraum_dungeons', 3, 'Das System schläft nie. Manche Gilden offenbar auch nicht.'),
  erfolg('keine_zeugen', 'Das System schaut zu', '👤', 'Keine Zeugen', 'Mit einem einzigen Helden einen Boss besiegt. Keine Zeugen, ausser dem System. Das erzählt es jetzt allen.', 'keine_zeugen', 1, 'Das System sieht auch, was sonst niemand sieht. Gerade dann.'),
  erfolg('ohne_hose', 'Das System schaut zu', '🩲', 'Ohne Hose', 'Einen Boss besiegt, während ein Held keine Rüstung trug. Das System hat sich die Stelle mehrmals angesehen.', 'ohne_hose', 1, 'Das System achtet auf Kleidung. Vor allem auf fehlende.'),
  erfolg('raid_zu_viert', 'Das System schaut zu', '4️⃣', 'Zu viert', 'Einen Ernstkampf mit genau vier Helden gewagt. Alruna hat eine neue Seite angefangen und oben euren Namen hingeschrieben.', 'raid_zu_viert', 1, 'Das System kennt die Liste. Es weiss auch, wer sie nicht liest.'),
];

/** Erste Schritte: je 1 Kristallsplitter */
const LOHN_1 = new Set(['haendler_1', 'first_building', 'stadtstufe_3', 'first_expedition', 'first_victory',
  'veteran_explorer', 'perfectionist', 'first_boss', 'gold_hoarder', 'schmiede_1']);
/** Grosse Ziele: je 6 Kristallsplitter (dazu die Gipfel-Taten mit besiegtem Boss) */
const LOHN_6 = new Set(['stadtstufe_7', 'gildenrang_5', 'saal_kette', 'saal_glanz', 'gipfel_1', 'erster_meister',
  'bosse_25', 'kill_1000', 'ganze_sets_3', 'schmiede_5', 'monsterbuch_50']);
/** Gipfel-Taten ohne besiegten Boss: nur 3 */
const GIPFEL_OHNE_BOSS = new Set(['gipfel_kleingedrucktes', 'gipfel_einsturz']);

/**
 * Kristallsplitter, die ein Erfolg einmalig bringt (systems/AchievementSystem.ts, belohnungAuszahlen):
 * versteckt 2, «Hat alles» 12, erste Schritte 1, grosse Ziele und Gipfel-Taten mit Boss 6, sonst 3.
 */
export function erfolgBelohnung(def: Pick<AchievementDef, 'id' | 'gruppe' | 'versteckt'>): number {
  if (def.versteckt) return 2;
  if (def.id === 'gipfel_alle') return 12;
  if (LOHN_1.has(def.id)) return 1;
  if (LOHN_6.has(def.id)) return 6;
  if (def.gruppe === 'Gipfel-Taten' && !GIPFEL_OHNE_BOSS.has(def.id)) return 6;
  return 3;
}
