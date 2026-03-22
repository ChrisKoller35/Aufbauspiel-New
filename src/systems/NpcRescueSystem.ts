import { GameState } from '../models/GameState';
import { NPC_DEFS, NpcDef } from '../data/npcs';
import { SeededRNG } from '../utils/RNG';

export class NpcRescueSystem {
  /**
   * After a successful combat room: rolls whether an NPC is rescued.
   * Returns the NPC ID if rescued, otherwise null.
   */
  checkRescue(state: GameState, routeId: string, rng: SeededRNG): string | null {
    for (const [id, npc] of Object.entries(NPC_DEFS)) {
      // Already rescued → skip
      if (state.rescuedNpcs.includes(id)) continue;
      // Does this NPC appear on the current route?
      if (!npc.routes.includes(routeId)) continue;
      // Roll
      if (rng.chance(npc.rescueChance)) {
        return id;
      }
    }
    return null;
  }

  /**
   * Rescues an NPC and activates their unlock effects.
   * Returns true if successful (was not yet rescued).
   */
  rescueNpc(state: GameState, npcId: string): boolean {
    if (state.rescuedNpcs.includes(npcId)) return false;
    state.rescuedNpcs.push(npcId);
    this.applyUnlockEffect(state, npcId);
    return true;
  }

  /**
   * Returns all rescued NPCs as NpcDef objects.
   */
  getRescuedNpcs(state: GameState): NpcDef[] {
    return state.rescuedNpcs
      .map(id => NPC_DEFS[id])
      .filter(Boolean) as NpcDef[];
  }

  /**
   * Checks whether an NPC has already been rescued.
   */
  isRescued(state: GameState, npcId: string): boolean {
    return state.rescuedNpcs.includes(npcId);
  }

  private applyUnlockEffect(state: GameState, npcId: string): void {
    const npc = NPC_DEFS[npcId];
    if (!npc) return;

    // Log the unlock for debugging
    console.log(`[NpcRescue] NPC "${npc.name}" rescued! Effect: ${npc.unlockEffect.description}`);

    // Building unlock: the actual unlock effect is evaluated in BuildMenu/CityScene
    // (unlockEffect.buildingId is checked there against state.rescuedNpcs)
  }
}
