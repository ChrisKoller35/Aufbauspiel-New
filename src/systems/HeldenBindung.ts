import { GameState } from '../models/GameState';

/**
 * Löst alte Bindungen zwischen Bewohnern und Helden.
 *
 * Früher wurden Helden aus Bewohnern ausgebildet (fighterId am Bewohner,
 * citizenId am Helden). Heute kommen Helden aus dem Heldenhaus ohne Bewohner
 * (citizenId 0). Gebundene Bewohner aus alten Spielständen werden hier wieder
 * zu normalen Bewohnern, die Helden behalten Werte, Stufe, Ausrüstung und Weg.
 *
 * Danach steht jeder Bewohner in höchstens einer Arbeiterliste, nämlich der
 * seines assignedBuildingId.
 *
 * @returns Zahl der gelösten Bindungen (0, wenn nichts zu tun war)
 */
export function loeseHeldenBindungen(state: GameState): number {
  let geloest = 0;

  for (const citizen of state.citizens) {
    if (citizen.fighterId == null) continue;
    // Noch in Ausbildung: der nächste Aufruf erfasst den fertigen Helden
    if (citizen.status === 'GUILD_TRAINING') continue;

    const fighter = state.fighters.find(f => f.id === citizen.fighterId);
    if (fighter) fighter.citizenId = 0;
    citizen.fighterId = null;

    if (citizen.status === 'GUILD_FIGHTER' || citizen.status === 'ON_EXPEDITION') {
      citizen.status = 'IDLE';
      // Freier Bewohner: alte Stelle aufgeben, PeopleSystem vergibt neu
      citizen.assignedBuildingId = null;
    }
    geloest++;
  }

  bereinigeArbeiterlisten(state);
  return geloest;
}

/**
 * Behält in jeder Arbeiterliste nur Bewohner, die es gibt, die arbeiten und
 * deren assignedBuildingId auf dieses Gebäude zeigt (jeden höchstens einmal).
 */
function bereinigeArbeiterlisten(state: GameState): void {
  const bewohner = new Map(state.citizens.map(c => [c.id, c]));
  const vergeben = new Set<number>();

  for (const building of state.buildings) {
    building.assignedWorkerIds = building.assignedWorkerIds.filter(id => {
      const citizen = bewohner.get(id);
      if (!citizen || citizen.status === 'IDLE') return false;
      if (citizen.assignedBuildingId !== building.id) return false;
      if (vergeben.has(id)) return false;
      vergeben.add(id);
      return true;
    });
  }
}
