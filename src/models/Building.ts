// ─── Magic City – Ein Gebäude im Spielstand ─────────────────────
// Ein Gebäude je Art; es steht sofort nach dem Bau (keine Bauzeit,
// kein Bauplatz). Werkstätten arbeiten ihre Auftragsliste ab
// (systems/Auftraege.ts, systems/Werkstattplan.ts, systems/ProductionSystem.ts);
// die Stufe (tier) macht sie schneller (systems/Ausbau.ts).
// ────────────────────────────────────────────────────────────────

export interface BuildingInstance {
  id: number;
  typeId: string;       // Schlüssel in BUILDING_DEFS
  built: boolean;       // steht; nach dem Bau immer true (alle Systeme erkennen fertige Gebäude daran)
  activeRecipeId: string | null;
  productionTimer: number;  // Sekunden bis zum Ende des laufenden Zyklus
  producing: boolean;       // läuft gerade ein Zyklus?
  /** Laufender Zyklus ohne Auftrag: Vorstufe oder Zulieferung (systems/Werkstattplan.ts). */
  vonSelbst?: { art: 'vorstufe' | 'zulieferung'; fuer: string } | null;
  /** Ausbau-Stufe 1 bis maxStufe (systems/Ausbau.ts). */
  tier: number;
  pendingCraft: boolean;         // ein Auftrag wartet (systems/Auftraege.ts)
  auftraege: string[];           // wartende Aufträge (Rezept-IDs), siehe systems/Auftraege.ts
}

let nextBuildingId = 1;

export function createBuildingInstance(typeId: string): BuildingInstance {
  return {
    id: nextBuildingId++,
    typeId,
    built: true,
    activeRecipeId: null,
    productionTimer: 0,
    producing: false,
    tier: 1,
    pendingCraft: false,
    auftraege: [],
  };
}

export function resetBuildingIdCounter(startId: number): void {
  nextBuildingId = startId;
}
