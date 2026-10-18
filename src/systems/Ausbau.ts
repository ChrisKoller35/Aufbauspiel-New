// ─── Magic City – Ausbau-Stufen ─────────────────────────────────
// Ein Gebäude je Art: statt ein zweites zu bauen, baut man aus.
// Stufe N einer Werkstatt hat N Arbeitsplätze und arbeitet so schnell,
// wie Plätze besetzt sind (genau wie früher N Gebäude mit N Arbeitern,
// darum bleiben Bewohner die knappe Währung). Das Wohnviertel bekommt
// je Stufe PLAETZE_PRO_STUFE Plätze, Marktplatz und Bank wirken je
// besetztem Arbeitsplatz, das Gildenhaus Stufe 2 ist der bestehende
// Ausbau GUILD_HALL_T2 (4 Helden je Expedition). Der Ausbau ist sofort
// fertig. Reine Funktionen; Anzeige: BuildingsScreen. Regeln: docs/AUSBAU.md.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../data/recipes';
import { BUILDING_UPGRADE_DEFS } from '../data/buildingUpgrades';
import { GameState } from '../models/GameState';
import { BuildingInstance } from '../models/Building';

export const MAX_STUFE_WERKSTATT = 3;
export const MAX_STUFE_WOHNEN = 6;
export const MAX_STUFE_HANDEL = 3;
export const PLAETZE_PRO_STUFE = 6;

const GILDE_T2 = BUILDING_UPGRADE_DEFS.GUILD_HALL_T2;

/** Höchste Stufe einer Gebäude-Art; 1 = nicht ausbaubar (keine Wirkung vorhanden). */
export function maxStufe(typeId: string): number {
  const def = BUILDING_DEFS[typeId];
  if (!def) return 1;
  if (def.housing) return MAX_STUFE_WOHNEN;
  if (def.recipes.length > 0) return MAX_STUFE_WERKSTATT;
  if (typeId === 'GUILD_HALL') return GILDE_T2.toTier;
  if (typeId === 'MARKETPLACE' || typeId === 'BANK') return MAX_STUFE_HANDEL;
  return 1;
}

/** Stufe eines Gebäudes, immer zwischen 1 und maxStufe (alte Spielstände können abweichen). */
export function stufeVon(b: BuildingInstance): number {
  const tier = Number.isFinite(b.tier) ? Math.floor(b.tier) : 1;
  return Math.min(maxStufe(b.typeId), Math.max(1, tier));
}

// ── Arbeitsplätze und Tempo ─────────────────────────────────────

/** Arbeitsplätze eines Gebäudes: Grundwert × Stufe. */
export function arbeitsplaetze(b: BuildingInstance): number {
  const slots = BUILDING_DEFS[b.typeId]?.workerSlots ?? 0;
  return slots > 0 ? slots * stufeVon(b) : 0;
}

/** Besetzte Arbeitsplätze (nie mehr als vorhanden). */
export function besetzt(b: BuildingInstance): number {
  return Math.min(arbeitsplaetze(b), b.assignedWorkerIds?.length ?? 0);
}

/** Werkstätten arbeiten so vielfach schnell, wie Plätze besetzt sind. */
export function tempoFaktor(b: BuildingInstance): number {
  const def = BUILDING_DEFS[b.typeId];
  if (!def || def.recipes.length === 0) return 1;
  return def.workerSlots > 0 ? Math.max(1, besetzt(b)) : stufeVon(b);
}

/** Dauer eines Produktionszyklus in Sekunden, mit Besetzung und Synergie. */
export function zyklusSekunden(b: BuildingInstance, recipe: RecipeDef): number {
  const synergie = b.synergySpeedMult > 0 ? b.synergySpeedMult : 1;
  return (recipe.cycleTimeSec * synergie) / tempoFaktor(b);
}

/** Zyklusdauer des aktiven Rezepts, 0 wenn keines gewählt ist. */
export function aktiveZyklusSekunden(b: BuildingInstance): number {
  const recipe = b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  return recipe ? zyklusSekunden(b, recipe) : 0;
}

/** Wirkung eines Gebäudes ohne Rezepte (Marktplatz, Bank) = besetzte Plätze, 0 wenn es nicht wirkt. */
export function wirkungsStufe(state: GameState, typeId: string): number {
  const def = BUILDING_DEFS[typeId];
  if (!def) return 0;
  let summe = 0;
  for (const b of state.buildings) {
    if (!b || b.typeId !== typeId || !b.built) continue;
    if (def.requiresConnectivity && !b.connected) continue;
    summe += def.workerSlots > 0 ? besetzt(b) : stufeVon(b);
  }
  return summe;
}

// ── Wohnen ──────────────────────────────────────────────────────

export function kapazitaetAufStufe(typeId: string, stufe: number): number {
  const housing = BUILDING_DEFS[typeId]?.housing;
  if (!housing) return 0;
  return housing.capacity + PLAETZE_PRO_STUFE * (stufe - 1);
}

export function hausKapazitaet(b: BuildingInstance): number {
  return kapazitaetAufStufe(b.typeId, stufeVon(b));
}

/** Plätze für Bewohner in der ganzen Stadt (fertige, angebundene Wohngebäude). */
export function wohnKapazitaet(state: GameState): number {
  let capacity = 0;
  for (const b of state.buildings) {
    if (!b || !b.built) continue;
    const def = BUILDING_DEFS[b.typeId];
    if (!def?.housing) continue;
    if (def.requiresConnectivity && !b.connected) continue;
    capacity += hausKapazitaet(b);
  }
  return capacity;
}

// ── Ausbauen ────────────────────────────────────────────────────

/** Kosten für eine Stufe: Baukosten × Stufe; Wohnviertel ab Stufe 3 zusätzlich Stein; Gildenhaus wie GUILD_HALL_T2. */
export function ausbauKosten(typeId: string, zielStufe: number): Record<string, number> {
  const def = BUILDING_DEFS[typeId];
  if (!def) return {};
  if (typeId === 'GUILD_HALL') return { ...GILDE_T2.cost };
  const kosten: Record<string, number> = {};
  for (const [res, qty] of Object.entries(def.buildCost)) kosten[res] = qty * zielStufe;
  if (def.housing && zielStufe >= 3) kosten.stone = (kosten.stone ?? 0) + 5 * (zielStufe - 2);
  return kosten;
}

/** Was die Stufe bringt, in Spielersprache. */
export function ausbauWirkung(typeId: string, stufe: number): string {
  const def = BUILDING_DEFS[typeId];
  if (!def) return '';
  if (def.housing) return `${kapazitaetAufStufe(typeId, stufe)} Plätze für Bewohner`;
  if (def.recipes.length > 0) {
    return stufe === 1 ? '1 Arbeitsplatz' : `${stufe} Arbeitsplätze: mit ${stufe} Arbeitern ${stufe}-mal so schnell`;
  }
  if (typeId === 'GUILD_HALL') return GILDE_T2.description;
  const plaetze = stufe === 1 ? '1 Arbeitsplatz' : `${stufe} Arbeitsplätze`;
  if (typeId === 'MARKETPLACE') return `bis +${marktBonusProzent(stufe)} % Steuern (${plaetze})`;
  if (typeId === 'BANK') return `bis +${bankGoldProTag(stufe)} Gold / Tag (${plaetze})`;
  return '';
}

/** Alles, was bis zu dieser Stufe bezahlt wurde (Bau plus Ausbauten), z. B. für die Rückerstattung. */
export function investiert(typeId: string, stufe: number): Record<string, number> {
  const def = BUILDING_DEFS[typeId];
  if (!def) return {};
  const summe: Record<string, number> = { ...def.buildCost };
  for (let s = 2; s <= stufe; s++) {
    for (const [res, qty] of Object.entries(ausbauKosten(typeId, s))) summe[res] = (summe[res] ?? 0) + qty;
  }
  return summe;
}

/** Steuer-Bonus des Marktplatzes nach besetzten Plätzen: 25 / 40 / 50 %. */
export function marktBonusProzent(besetztePlaetze: number): number {
  return [0, 25, 40, 50][Math.max(0, Math.min(3, besetztePlaetze))];
}

/** Gold der Bank pro Tag nach besetzten Plätzen. */
export function bankGoldProTag(besetztePlaetze: number): number {
  return 10 * Math.max(0, Math.min(MAX_STUFE_HANDEL, besetztePlaetze));
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
  if (b.typeId === 'GUILD_HALL' && (state.guildStats?.rank ?? 1) < GILDE_T2.unlockCondition.minGuildRank) {
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

/** Bezahlt die nächste Stufe und hebt das Gebäude sofort an. */
export function ausbauen(state: GameState, b: BuildingInstance): boolean {
  if (!kannAusbauen(state, b)) return false;
  const info = ausbauInfo(state, b);
  for (const [res, qty] of Object.entries(info.kosten)) {
    state.globalStock[res] = (state.globalStock[res] ?? 0) - qty;
  }
  b.tier = info.naechste!;
  if (b.typeId === 'GUILD_HALL' && b.tier >= GILDE_T2.toTier) state.guildStats.guildHallT2 = true;
  // Ein Ausbau zählt wie ein Bau (Erfolg «Baumeister» bleibt erreichbar)
  state.statistics['total_buildings_built'] = (state.statistics['total_buildings_built'] ?? 0) + 1;
  state.statistics['total_upgrades'] = (state.statistics['total_upgrades'] ?? 0) + 1;
  return true;
}

// ── Gebäude entfernen und verschmelzen ──────────────────────────

/** Zutaten eines laufenden Zyklus zurückgeben (sie werden beim Start abgezogen). */
export function erstatteLaufendenZyklus(state: GameState, b: BuildingInstance): void {
  const recipe = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  if (!recipe) return;
  for (const [item, qty] of Object.entries(recipe.inputs)) {
    if (b.connected) state.globalStock[item] = (state.globalStock[item] ?? 0) + qty;
    else b.localInputBuffer[item] = (b.localInputBuffer[item] ?? 0) + qty;
  }
}

/** Entfernt Gebäude sauber: Waren ins Lager, Arbeiter frei, Kartenfelder und Spezialisten gelöst. */
export function entferneGebaeude(state: GameState, ids: Set<number>): void {
  if (ids.size === 0) return;
  for (const b of state.buildings) {
    if (!b || !ids.has(b.id)) continue;
    erstatteLaufendenZyklus(state, b);
    for (const buffer of [b.localInputBuffer, b.localOutputBuffer]) {
      for (const [item, qty] of Object.entries(buffer ?? {})) {
        if (qty > 0) state.globalStock[item] = (state.globalStock[item] ?? 0) + qty;
      }
    }
  }
  state.buildings = state.buildings.filter(b => b && !ids.has(b.id));

  for (const row of state.grid ?? []) {
    for (let x = 0; x < row.length; x++) {
      const tile = row[x];
      if (tile?.buildingId != null && ids.has(tile.buildingId)) row[x] = null;
    }
  }
  for (const citizen of state.citizens ?? []) {
    if (citizen.assignedBuildingId != null && ids.has(citizen.assignedBuildingId)
        && (citizen.status === 'WORKER' || citizen.status === 'BUILDER')) {
      citizen.status = 'IDLE';
      citizen.assignedBuildingId = null;
    }
  }
  for (const spec of state.specialists ?? []) {
    if (spec.assignedBuildingId != null && ids.has(spec.assignedBuildingId)) spec.assignedBuildingId = null;
  }
  if (state.activeEvent?.pausedBuildingId != null && ids.has(state.activeEvent.pausedBuildingId)) {
    state.activeEvent.pausedBuildingId = undefined;
  }
}

/** Wohnviertel-Stufe, die mindestens `bewohner` Plätze bietet (gedeckelt). */
function stufeFuerBewohner(typeId: string, bewohner: number): number {
  let stufe = 1;
  while (stufe < maxStufe(typeId) && kapazitaetAufStufe(typeId, stufe) < bewohner) stufe++;
  return stufe;
}

/**
 * Alte Spielstände: mehrere Gebäude derselben Art werden zu einem verschmolzen.
 * Die Stufe entspricht der bisherigen Anzahl (bis maxStufe), beim Wohnviertel mindestens
 * so hoch, dass alle Bewohner Platz haben. Arbeiter ziehen mit, so weit Plätze da sind.
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
    const def = BUILDING_DEFS[typeId];
    const behalten = alle.find(b => b.built && b.assignedWorkerIds.length > 0) ?? alle.find(b => b.built) ?? alle[0];
    let stufe = Math.max(stufeVon(behalten), alle.length);
    if (def.housing) stufe = Math.max(stufe, stufeFuerBewohner(typeId, state.citizens.length));
    behalten.tier = Math.min(maxStufe(typeId), stufe);

    for (const b of alle) {
      if (b === behalten) continue;
      weg.add(b.id);
      // Arbeiter ziehen in das behaltene Gebäude um, so lange dort Platz ist
      for (const citizenId of b.assignedWorkerIds) {
        if (behalten.assignedWorkerIds.length >= arbeitsplaetze(behalten)) break;
        const citizen = state.citizens.find(c => c.id === citizenId);
        if (!citizen) continue;
        citizen.assignedBuildingId = behalten.id;
        behalten.assignedWorkerIds.push(citizenId);
      }
      b.assignedWorkerIds = b.assignedWorkerIds.filter(id => !behalten.assignedWorkerIds.includes(id));
      for (const spec of state.specialists ?? []) {
        if (spec.assignedBuildingId === b.id) spec.assignedBuildingId = behalten.id;
      }
      if (state.activeEvent?.pausedBuildingId === b.id) state.activeEvent.pausedBuildingId = behalten.id;
    }
  }
  entferneGebaeude(state, weg);
  return weg.size;
}
