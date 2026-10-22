/**
 * Erfolge für Magic City, in Gruppen.
 * Jede Bedingung liest nur state.statistics. Werte, die niemand von selbst
 * zählt (Stadtstufe, Helden, Sets, Monsterbuch …), schreibt
 * kennzahlenAktualisieren() in systems/AchievementSystem.ts dort hinein.
 * Die IDs der ersten zwölf Erfolge stehen in alten Spielständen
 * (state.achievements) und dürfen sich nicht ändern. Liste: docs/ERFOLGE.md.
 */

export type ErfolgGruppe = 'Stadt' | 'Gilde' | 'Helden' | 'Dungeons' | 'Sammeln';

export const ERFOLG_GRUPPEN: ErfolgGruppe[] = ['Stadt', 'Gilde', 'Helden', 'Dungeons', 'Sammeln'];

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
  condition: (stats: Record<string, number>) => boolean;
}

/** Stand des Zählers eines Erfolgs (Summe, falls mehrere Schlüssel) */
export function zaehlerWert(def: Pick<AchievementDef, 'zaehler'>, stats: Record<string, number>): number {
  const keys = Array.isArray(def.zaehler) ? def.zaehler : [def.zaehler];
  return keys.reduce((summe, key) => summe + (stats[key] ?? 0), 0);
}

function erfolg(
  id: string, gruppe: ErfolgGruppe, icon: string, name: string, description: string,
  zaehler: string | string[], ziel: number,
): AchievementDef {
  const def = { id, gruppe, icon, name, description, zaehler, ziel };
  return { ...def, condition: (stats) => zaehlerWert(def, stats) >= ziel };
}

/** Beendete Expeditionen: Siege, Niederlagen und Rückzüge (total_expeditions zählt schon beim Start) */
export const BEENDETE_EXPEDITIONEN = ['total_victories', 'total_defeats', 'total_retreats'];

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── Stadt ──
  erfolg('first_building', 'Stadt', '🏗️', 'Grundsteinlegung', 'Errichte dein erstes Gebäude.', 'total_buildings_built', 1),
  erfolg('mass_builder', 'Stadt', '🏛️', 'Baumeister', 'Baue 20 Mal (Neubauten und Ausbauten zählen).', 'total_buildings_built', 20),
  erfolg('ausbau_10', 'Stadt', '🔨', 'Ausbauer', 'Baue Gebäude 10 Mal aus.', 'total_upgrades', 10),
  erfolg('gebaeude_max', 'Stadt', '🏰', 'Ganz oben', 'Baue ein Gebäude bis zu seiner Höchststufe aus.', 'gebaeude_auf_hoechststufe', 1),
  erfolg('wohnviertel_6', 'Stadt', '🏘️', 'Volles Viertel', 'Baue das Wohnviertel auf Stufe 6 aus.', 'hoechste_wohnstufe', 6),
  erfolg('bewohner_50', 'Stadt', '👶', 'Wachsende Stadt', '50 neue Bewohner ziehen ein.', 'total_citizens_born', 50),
  erfolg('stadtstufe_3', 'Stadt', '🛖', 'Dorf', 'Erreiche die Stadtstufe «Dorf» (3).', 'stadtstufe', 3),
  erfolg('stadtstufe_5', 'Stadt', '🏙️', 'Stadtrecht', 'Erreiche die Stadtstufe «Stadt» (5).', 'stadtstufe', 5),
  erfolg('stadtstufe_7', 'Stadt', '✨', 'Magische Stadt', 'Erreiche die Stadtstufe «Magische Stadt» (7).', 'stadtstufe', 7),
  erfolg('survivor_100', 'Stadt', '⭐', 'Überlebenskünstler', 'Halte deine Stadt 100 Tage am Leben.', 'total_days_survived', 100),

  // ── Gilde ──
  erfolg('gildenrang_3', 'Gilde', '🎖️', 'Veteranengilde', 'Erreiche Gildenrang III.', 'gildenrang', 3),
  erfolg('gildenrang_5', 'Gilde', '👑', 'Gildenmeister', 'Erreiche Gildenrang V und trage den Titel Gildenmeister.', 'gildenrang', 5),

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

  // ── Sammeln ──
  erfolg('ganzes_set', 'Sammeln', '🧩', 'Komplett', 'Ein Held trägt alle drei Teile eines Dungeon-Sets.', 'ganze_sets', 1),
  erfolg('ganze_sets_3', 'Sammeln', '🎒', 'Sammler', 'Deine Helden tragen 3 verschiedene ganze Dungeon-Sets.', 'ganze_sets', 3),
  erfolg('monsterbuch_25', 'Sammeln', '📖', 'Monsterkundler', 'Entdecke 25 Monster für das Monsterbuch.', 'monsterbuch_entdeckt', 25),
  erfolg('monsterbuch_50', 'Sammeln', '📚', 'Monstergelehrter', 'Entdecke 50 Monster für das Monsterbuch.', 'monsterbuch_entdeckt', 50),
];
