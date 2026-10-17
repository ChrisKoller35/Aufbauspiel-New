import { GameState } from '../models/GameState';

/**
 * Marks all built buildings as connected.
 * Road connectivity is no longer required for buildings to function.
 */
export class ConnectivitySystem {
  update(state: GameState): void {
    for (const building of state.buildings) {
      if (building.typeId === 'ROAD') continue;
      building.connected = building.built;
    }
  }
}
