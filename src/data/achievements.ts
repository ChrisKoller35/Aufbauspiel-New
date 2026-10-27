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

import { DUNGEON_GRAPH, ROUTE_DEFS } from './routes';
import { MAX_SCHMIEDE_STUFE } from './schmiede';

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

/** Sockel im Trophäensaal: einer je Boss-Dungeon der Karte, so viele Kapitel hat auch die Kette «Der Saal der Gilde» */
export const SAAL_SOCKEL = DUNGEON_GRAPH.filter(n => ROUTE_DEFS[n.routeId]?.bossId).length;
/** Drei Sterne je Sockel (Boss, ganzes Set, Prunkstück); «Glanz des Saals» will die Hälfte davon */
const SAAL_STERNE = 3 * SAAL_SOCKEL;
const SAAL_HALBER_GLANZ = Math.ceil(SAAL_STERNE / 2);

/** Die sechs Gipfel-Taten (systems/GipfelTaten.ts): je Dungeon über dem Vulkankern dreimal das Risiko, Boss trotzdem tot */
export const GIPFEL_TATEN = ['tat_hort', 'tat_archiv', 'tat_esse', 'tat_schlund', 'tat_pfand', 'tat_uhr'];

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── Stadt (die Gildenstadt: Händler und vier Werkstätten, docs/GILDENSTADT.md) ──
  erfolg('haendler_1', 'Stadt', '🛒', 'Erster Kauf', 'Kaufe zum ersten Mal beim Händler ein: Proviant oder Ausrüstung.', 'total_haendler_kaeufe', 1),
  erfolg('first_building', 'Stadt', '🏗️', 'Grundsteinlegung', 'Errichte dein erstes Gebäude.', 'total_buildings_built', 1),
  erfolg('werkstaetten_4', 'Stadt', '🏘️', 'Gildenstadt', 'Alle vier Werkstätten stehen: Schmiede, Kräuterküche, Arkanschmiede und Kriegsmaschinen-Werkstatt.', 'werkstaetten', 4),
  erfolg('mass_builder', 'Stadt', '🏛️', 'Baumeister', 'Baue 10 Mal (Neubauten und Ausbauten zählen).', 'total_buildings_built', 10),
  erfolg('ausbau_5', 'Stadt', '🔨', 'Ausbauer', 'Baue Werkstätten 5 Mal aus.', 'total_upgrades', 5),
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
  erfolg('saal_glanz', 'Gilde', '🌟', 'Glanz des Saals', `Sammle ${SAAL_HALBER_GLANZ} der ${SAAL_STERNE} Sterne im Trophäensaal.`, 'saal_sterne', SAAL_HALBER_GLANZ),
  erfolg('rangliste_pokal', 'Gilde', '🥉', 'Aufs Treppchen', 'Gewinne einen Pokal in der Wochenwertung der Rangliste (Platz 1 bis 3).', 'rangliste_pokale', 1),
  erfolg('gipfel_1', 'Gilde', '🏔️', 'Gipfelstürmer', 'Führe die Gipfel-Rangliste an, vor allen Rivalen-Gilden.', 'gipfel_spitze', 1),

  // ── Helden ──
  erfolg('army_builder', 'Helden', '🛡️', 'Armeeführer', 'Habe 10 Helden in der Gilde.', 'helden_anzahl', 10),
  erfolg('erster_weg', 'Helden', '🧭', 'Wegbereiter', 'Ein Held wählt seinen Weg (ab Stufe 10).', 'helden_mit_weg', 1),
  erfolg('erster_meister', 'Helden', '🥋', 'Meister seines Wegs', 'Ein Held wird Meister seines Wegs (Stufe 15).', 'helden_meister', 1),

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

  // ── Gipfel-Taten (in allen drei Wahl-Räumen das Risiko, Boss trotzdem besiegt; docs/ERFOLGE.md) ──
  erfolg('gipfel_hort', 'Gipfel-Taten', '🪙', 'Ehrlicher Finder', 'Im Drachenhort Goldhaufen, Edelsteinschale und Drachenkrone eingesteckt und Ignarax trotzdem besiegt. Er hat bis zuletzt nachgezählt.', 'tat_hort', 1),
  erfolg('gipfel_archiv', 'Gipfel-Taten', '📕', 'Ohne Leseausweis', 'Alle drei verbotenen Bücher des Himmelsarchivs gelesen und den Oberarchivar trotzdem besiegt. Eure Namen sind jetzt doppelt rot unterstrichen.', 'tat_archiv', 1),
  erfolg('gipfel_esse', 'Gipfel-Taten', '☄️', 'Nicht anfassen', 'Dreimal ins Sternenfeuer gegriffen und Korrund trotzdem besiegt. Auf seinem Amboss steht «Nicht anfassen» jetzt doppelt so gross.', 'tat_esse', 1),
  erfolg('gipfel_schlund', 'Gipfel-Taten', '⛏️', 'Sternenmetzger', 'Aus allen drei gefangenen Sternen Sternenstahl geschlagen und Nyxar trotzdem besiegt. Die Bäckerin findet drei Sterne verdächtig blass.', 'tat_schlund', 1),
  erfolg('gipfel_pfand', 'Gipfel-Taten', '✍️', 'Pfandleiher des Jahres', 'Alle drei Pfandzettel unterschrieben und Argentis trotzdem besiegt. Der Mondvogt prüft noch, wie.', 'tat_pfand', 1),
  erfolg('gipfel_uhr', 'Gipfel-Taten', '🕛', 'Zeitumstellung', 'Die Sonnenuhr dreimal vorgestellt und Sunna trotzdem besiegt. Sie hatte schon gefrühstückt und war entsprechend gelaunt.', 'tat_uhr', 1),
  erfolg('gipfel_alle', 'Gipfel-Taten', '🐲', 'Hat alles', 'Alle sechs Gipfel-Taten vollbracht. Ignarax hatte alles. Jetzt habt ihr es.', GIPFEL_TATEN, GIPFEL_TATEN.length),
  erfolg('gipfel_kleingedrucktes', 'Gipfel-Taten', '🧾', 'Kleingedrucktes', 'Alle drei Pfandzettel unterschrieben und Argentis nicht besiegt. Das Pfand behält der Mondvogt, die Quittung dürft ihr behalten.', 'tat_kleingedrucktes', 1),

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
];
