// ─── Magic City – Ausbau-Stufen ─────────────────────────────────
// Ein Gebäude je Art: statt ein zweites zu bauen, baut man aus. Eine
// Werkstatt auf Stufe N arbeitet N-mal so schnell; der Ausbau kostet
// das Ausbau-Gold × Zielstufe plus Beute je Stufe
// (BuildingDef.ausbauBeute) und ist sofort fertig. Das Gildenhaus Stufe 2
// ist der bestehende Ausbau GUILD_HALL_T2 (4 Helden je Expedition).
// Wie weit eine Werkstatt ausgebaut werden darf, gibt die Stadtstufe vor
// (data/stadtstufen.ts, wie das Rathaus bei Clash of Clans).
// Reine Funktionen; Anzeige: BuildingsScreen. Regeln: docs/GILDENSTADT.md.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { BUILDING_UPGRADE_DEFS } from '../data/buildingUpgrades';
import { GrenzArt, stadtStufeFuerAusbau, stadtStufeVon, stufeDef } from '../data/stadtstufen';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';

export const MAX_STUFE_WERKSTATT = 3;

const GILDE_T2 = BUILDING_UPGRADE_DEFS.GUILD_HALL_T2;

/** Werkstatt = Gebäude mit Rezepten (Schmiede, Kräuterküche, Arkanschmiede, Kriegsmaschinen). */
function istWerkstatt(typeId: string): boolean {
  return (BUILDING_DEFS[typeId]?.recipes.length ?? 0) > 0;
}

/** Höchste Stufe einer Gebäude-Art; 1 = nicht ausbaubar (Händler). */
export function maxStufe(typeId: string): number {
  if (!BUILDING_DEFS[typeId]) return 1;
  if (istWerkstatt(typeId)) return MAX_STUFE_WERKSTATT;
  if (typeId === 'GUILD_HALL') return GILDE_T2.toTier;
  return 1;
}

/** Stufe eines Gebäudes, immer zwischen 1 und maxStufe. */
export function stufeVon(b: BuildingInstance): number {
  const tier = Number.isFinite(b.tier) ? Math.floor(b.tier) : 1;
  return Math.min(maxStufe(b.typeId), Math.max(1, tier));
}

// ── Grenzen der Stadtstufe ──────────────────────────────────────

/** Welche Grenze der Stadtstufe für eine Gebäude-Art gilt (null = keine). */
export function grenzArt(typeId: string): GrenzArt | null {
  return istWerkstatt(typeId) ? 'werkstatt' : null;
}

/** Höchste Stufe, die die Stadtstufe gerade erlaubt (nie über maxStufe). */
export function erlaubteStufe(state: GameState, typeId: string): number {
  const art = grenzArt(typeId);
  const max = maxStufe(typeId);
  return art ? Math.min(max, stufeDef(stadtStufeVon(state)).grenzen[art]) : max;
}

/** Name der Stadtstufe, die für den nächsten Ausbau fehlt, oder null (kein Ausbau mehr oder nicht gesperrt). */
export function fehlendeStadtstufe(state: GameState, b: BuildingInstance): string | null {
  const naechste = stufeVon(b) + 1;
  const art = grenzArt(b.typeId);
  if (!art || naechste > maxStufe(b.typeId) || naechste <= erlaubteStufe(state, b.typeId)) return null;
  return stadtStufeFuerAusbau(art, naechste)?.name ?? null;
}

// ── Tempo ───────────────────────────────────────────────────────

/** Eine Werkstatt auf Stufe N arbeitet N-mal so schnell. */
export function tempoFaktor(b: BuildingInstance): number {
  return istWerkstatt(b.typeId) ? stufeVon(b) : 1;
}

/** Dauer eines Produktionszyklus in Sekunden auf der Stufe des Gebäudes. */
export function zyklusSekunden(b: BuildingInstance, recipe: RecipeDef): number {
  return recipe.cycleTimeSec / tempoFaktor(b);
}

/** Zyklusdauer des aktiven Rezepts, 0 wenn keines gewählt ist. */
export function aktiveZyklusSekunden(b: BuildingInstance): number {
  const recipe = b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  return recipe ? zyklusSekunden(b, recipe) : 0;
}

/** Helden je Expedition: 3, mit dem Gildenhaus auf Stufe 2 vier (GUILD_HALL_T2). */
export function heldenJeExpedition(state: GameState): number {
  const grund = BUILDING_DEFS.GUILD_HALL.expeditions?.partySlots ?? 3;
  const gilde = state.buildings.find(b => b && b.typeId === 'GUILD_HALL' && b.built);
  if (!gilde || stufeVon(gilde) < GILDE_T2.toTier) return grund;
  return GILDE_T2.changes.partySlots ?? grund;
}

// ── Ausbauen ────────────────────────────────────────────────────

/**
 * Kosten für eine Stufe: Ausbau-Gold (BuildingDef.ausbauGold) × Zielstufe plus die Beute je Stufe über der ersten
 * (BuildingDef.ausbauBeute: Stufe 2 einmal, Stufe 3 zweimal); Gildenhaus wie GUILD_HALL_T2.
 */
export function ausbauKosten(typeId: string, zielStufe: number): Record<string, number> {
  const def = BUILDING_DEFS[typeId];
  if (!def) return {};
  if (typeId === 'GUILD_HALL') return { ...GILDE_T2.cost };
  const kosten: Record<string, number> = { gold: (def.ausbauGold ?? def.buildCost.gold ?? 0) * zielStufe };
  for (const [res, qty] of Object.entries(def.ausbauBeute ?? {})) kosten[res] = qty * (zielStufe - 1);
  return kosten;
}

/** Was die Stufe bringt, in Spielersprache. */
export function ausbauWirkung(typeId: string, stufe: number): string {
  if (istWerkstatt(typeId)) return stufe === 1 ? 'arbeitet in gewohntem Tempo' : `arbeitet ${stufe}-mal so schnell`;
  if (typeId === 'GUILD_HALL') return GILDE_T2.description;
  return '';
}

export interface AusbauInfo {
  stufe: number;
  maxStufe: number;
  /** Nächste Stufe oder null, wenn die höchste erreicht ist. */
  naechste: number | null;
  kosten: Record<string, number>;
  wirkung: string;
  /** Grund, warum der Ausbau noch gesperrt ist (z. B. Gildenrang), sonst leer. */
  hinweis: string;
  bezahlbar: boolean;
}

export function ausbauInfo(state: GameState, b: BuildingInstance): AusbauInfo {
  const stufe = stufeVon(b);
  const max = maxStufe(b.typeId);
  if (stufe >= max) return { stufe, maxStufe: max, naechste: null, kosten: {}, wirkung: '', hinweis: '', bezahlbar: false };
  const naechste = stufe + 1;
  const kosten = ausbauKosten(b.typeId, naechste);
  let hinweis = '';
  const stadtstufe = fehlendeStadtstufe(state, b);
  if (stadtstufe) {
    hinweis = `braucht Stadtstufe «${stadtstufe}» (Hauptmenü)`;
  } else if (b.typeId === 'GUILD_HALL' && (state.guildStats?.rank ?? 1) < GILDE_T2.unlockCondition.minGuildRank) {
    hinweis = `braucht Gildenrang ${GILDE_T2.unlockCondition.minGuildRank}`;
  }
  const bezahlbar = !hinweis && Object.entries(kosten).every(([res, qty]) => (state.globalStock[res] ?? 0) >= qty);
  return { stufe, maxStufe: max, naechste, kosten, wirkung: ausbauWirkung(b.typeId, naechste), hinweis, bezahlbar };
}

export function kannAusbauen(state: GameState, b: BuildingInstance): boolean {
  if (!b.built) return false;
  const info = ausbauInfo(state, b);
  return info.naechste !== null && info.bezahlbar;
}

/** Bezahlt die nächste Stufe und hebt das Gebäude sofort an; ein laufender Zyklus wird anteilig kürzer. */
export function ausbauen(state: GameState, b: BuildingInstance): boolean {
  if (!kannAusbauen(state, b)) return false;
  const info = ausbauInfo(state, b);
  for (const [res, qty] of Object.entries(info.kosten)) {
    state.globalStock[res] = (state.globalStock[res] ?? 0) - qty;
  }
  const tempoVorher = tempoFaktor(b);
  b.tier = info.naechste!;
  // Der Rest des laufenden Zyklus (ProductionSystem zählt productionTimer herunter) im neuen Tempo
  if (b.producing) b.productionTimer *= tempoVorher / tempoFaktor(b);
  if (b.typeId === 'GUILD_HALL' && b.tier >= GILDE_T2.toTier) state.guildStats.guildHallT2 = true;
  // Ein Ausbau zählt wie ein Bau (Erfolg «Baumeister» bleibt erreichbar)
  state.statistics['total_buildings_built'] = (state.statistics['total_buildings_built'] ?? 0) + 1;
  state.statistics['total_upgrades'] = (state.statistics['total_upgrades'] ?? 0) + 1;
  return true;
}

// ── Laufenden Zyklus erstatten und Doppelte verschmelzen ─────────

/** Zutaten eines laufenden Zyklus ins Lager zurückgeben (sie werden beim Start abgezogen): Auftrag abbrechen. */
export function erstatteLaufendenZyklus(state: GameState, b: BuildingInstance): void {
  const recipe = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  if (!recipe) return;
  for (const [item, qty] of Object.entries(recipe.inputs)) {
    state.globalStock[item] = (state.globalStock[item] ?? 0) + qty;
  }
}

/**
 * Mehrere Gebäude derselben Art werden zu einem verschmolzen (ein Gebäude je Art, Schutz beim
 * Laden: SaveSystem.bereiteVor): Die Stufe entspricht der bisherigen Anzahl (bis maxStufe), ein
 * fertiges bleibt bevorzugt, die Zutaten laufender Zyklen der anderen gehen ins Lager zurück.
 * Gibt zurück, wie viele Gebäude wegfielen.
 */
export function vereinigeDoppelte(state: GameState): number {
  const nachTyp = new Map<string, BuildingInstance[]>();
  for (const b of state.buildings) {
    if (!b || !BUILDING_DEFS[b.typeId]) continue;
    const liste = nachTyp.get(b.typeId) ?? [];
    liste.push(b);
    nachTyp.set(b.typeId, liste);
  }
  const weg = new Set<number>();
  for (const [typeId, alle] of nachTyp) {
    if (alle.length < 2) continue;
    const behalten = alle.find(b => b.built) ?? alle[0];
    behalten.tier = Math.min(maxStufe(typeId), Math.max(stufeVon(behalten), alle.length));
    for (const b of alle) if (b !== behalten) weg.add(b.id);
  }
  if (weg.size === 0) return 0;
  for (const b of state.buildings) if (b && weg.has(b.id)) erstatteLaufendenZyklus(state, b);
  state.buildings = state.buildings.filter(b => b && !weg.has(b.id));
  return weg.size;
}
