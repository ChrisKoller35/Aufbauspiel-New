export type CitizenStatus =
  | 'IDLE'
  | 'BUILDER'
  | 'WORKER'
  | 'GUILD_TRAINING'
  | 'GUILD_FIGHTER'
  | 'INJURED_REST'
  | 'ON_EXPEDITION';

export interface Citizen {
  id: number;
  status: CitizenStatus;
  assignedBuildingId: number | null; // for WORKER and BUILDER
  trainingClassId: string | null;    // for GUILD_TRAINING
  trainingTimer: number;             // seconds remaining
  injuryTimer: number;               // seconds remaining for INJURED_REST
  fighterId: number | null;          // links to GuildFighter
}

let nextCitizenId = 1;

export function createCitizen(status: CitizenStatus = 'IDLE'): Citizen {
  return {
    id: nextCitizenId++,
    status,
    assignedBuildingId: null,
    trainingClassId: null,
    trainingTimer: 0,
    injuryTimer: 0,
    fighterId: null,
  };
}

export function resetCitizenIdCounter(startId: number): void {
  nextCitizenId = startId;
}
