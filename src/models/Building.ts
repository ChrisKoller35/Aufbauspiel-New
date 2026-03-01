export interface BuildingInstance {
  id: number;
  typeId: string;       // key into BUILDING_DEFS
  x: number;            // grid x (top-left)
  y: number;            // grid y (top-left)
  built: boolean;       // false = under construction
  buildProgress: number; // seconds of build time completed
  assignedWorkerIds: number[];  // citizen IDs assigned as workers
  assignedBuilderId: number | null; // citizen ID assigned as builder
  activeRecipeId: string | null;
  productionTimer: number;  // seconds remaining in current cycle
  producing: boolean;       // currently producing?
  localInputBuffer: Record<string, number>;
  localOutputBuffer: Record<string, number>;
  connected: boolean;
  waterSupplied: boolean;
  tier: number;
  synergySpeedMult: number; // 1.0 = no synergy, 0.67 = x1.5 speed
  specialistId: string | null;   // assigned specialist ID
  upgrading: boolean;            // true = upgrade in progress
  upgradeProgress: number;       // seconds of upgrade time completed
  upgradeId: string | null;      // which upgrade is in progress
  eventPaused: boolean;          // true = paused by storm event
  pendingCraft: boolean;         // true = player triggered manual craft, start next cycle
}

let nextBuildingId = 1;

export function createBuildingInstance(
  typeId: string,
  x: number,
  y: number,
  preBuilt = false,
): BuildingInstance {
  return {
    id: nextBuildingId++,
    typeId,
    x,
    y,
    built: preBuilt,
    buildProgress: 0,
    assignedWorkerIds: [],
    assignedBuilderId: null,
    activeRecipeId: null,
    productionTimer: 0,
    producing: false,
    localInputBuffer: {},
    localOutputBuffer: {},
    connected: false,
    waterSupplied: false,
    tier: 1,
    synergySpeedMult: 1.0,
    specialistId: null,
    upgrading: false,
    upgradeProgress: 0,
    upgradeId: null,
    eventPaused: false,
    pendingCraft: false,
  };
}

export function resetBuildingIdCounter(startId: number): void {
  nextBuildingId = startId;
}
