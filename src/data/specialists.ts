/**
 * Specialist definitions.
 * Spawn: Survivor Room (20% chance → random specialist).
 * Max 1 specialist per building, only assignable to matching building.
 */

export interface SpecialistDef {
  id: string;
  name: string;
  assignableTo: string;          // building typeId
  productionSpeedMult: number;   // applied to cycleTimeSec (0.85 = 15% faster)
  flavorText: string;
}

export const SPECIALIST_DEFS: Record<string, SpecialistDef> = {
  SPEC_BAKER_MASTER: {
    id: 'SPEC_BAKER_MASTER',
    name: 'Meisterbäcker',
    assignableTo: 'BAKERY',
    productionSpeedMult: 0.85,
    flavorText: 'Mit ihr wird jedes Brot zum Kunstwerk.',
  },
  SPEC_HERB_SAGE: {
    id: 'SPEC_HERB_SAGE',
    name: 'Kräuter-Weise',
    assignableTo: 'HERB_GARDEN',
    productionSpeedMult: 0.85,
    flavorText: 'Ihre Kräuter heilen nicht nur den Körper.',
  },
  SPEC_FORGE_SMITH: {
    id: 'SPEC_FORGE_SMITH',
    name: 'Schmiedemeister',
    assignableTo: 'SMITHY',
    productionSpeedMult: 0.85,
    flavorText: 'Sein Hammer hat einen eigenen Namen.',
  },
};

/** Pick a random unowned specialist (returns null if all owned). */
export function pickRandomSpecialist(
  ownedIds: string[],
  rng: () => number,
): SpecialistDef | null {
  const available = Object.values(SPECIALIST_DEFS)
    .filter(s => !ownedIds.includes(s.id));
  if (available.length === 0) return null;
  return available[Math.floor(rng() * available.length)];
}
