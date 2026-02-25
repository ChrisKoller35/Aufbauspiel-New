import { GameState } from '../models/GameState';
import { BUILDING_DEFS } from '../data/buildings';
import { SYNERGY_DEFS, SynergyDef } from '../data/synergies';
import { manhattanFootprintDist } from './ManhattanDist';
import { TILE_SIZE } from '../rendering/Colors';

export interface SynergyLine {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  synergyName: string;
  inRange: boolean;
}

/**
 * Calculate synergy lines between a ghost building placement and existing buildings.
 * Returns lines to draw (green = in range, red = out of range).
 */
export function getSynergyLines(
  state: GameState,
  typeId: string,
  gx: number,
  gy: number,
): SynergyLine[] {
  const lines: SynergyLine[] = [];
  const def = BUILDING_DEFS[typeId];
  if (!def) return lines;
  const [fw, fh] = def.footprint;

  // Ghost center in pixels
  const ghostCx = gx * TILE_SIZE + (fw * TILE_SIZE) / 2;
  const ghostCy = gy * TILE_SIZE + (fh * TILE_SIZE) / 2;

  for (const synergy of SYNERGY_DEFS) {
    // Check if ghost building is source or target of this synergy
    const isSource = synergy.sourceType === typeId;
    const isTarget = synergy.targetType === typeId;
    if (!isSource && !isTarget) continue;

    // Find matching partner buildings
    const partnerType = isSource ? synergy.targetType : synergy.sourceType;
    const partners = state.buildings.filter(
      b => b.typeId === partnerType && b.built,
    );

    for (const partner of partners) {
      const pDef = BUILDING_DEFS[partner.typeId];
      const [pw, ph] = pDef.footprint;
      const partnerCx = partner.x * TILE_SIZE + (pw * TILE_SIZE) / 2;
      const partnerCy = partner.y * TILE_SIZE + (ph * TILE_SIZE) / 2;

      const dist = manhattanFootprintDist(
        gx, gy, fw, fh,
        partner.x, partner.y, pw, ph,
      );

      lines.push({
        fromX: ghostCx,
        fromY: ghostCy,
        toX: partnerCx,
        toY: partnerCy,
        synergyName: synergy.name,
        inRange: dist <= synergy.maxDistance,
      });
    }
  }

  return lines;
}
