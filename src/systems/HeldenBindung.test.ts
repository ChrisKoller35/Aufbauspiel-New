import { describe, it, expect } from 'vitest';
import { loeseHeldenBindungen } from './HeldenBindung';
import { FighterSynergySystem } from './FighterSynergySystem';
import { SatisfactionSystem } from './SatisfactionSystem';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, BuildingInstance } from '../models/Building';
import { createCitizen, Citizen } from '../models/Citizen';
import { createGuildFighter, GuildFighter } from '../models/GuildRoster';
import { ExpeditionRun } from '../models/ExpeditionRun';

const WERTE = { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 5, critChance: 0.05, critMult: 1.5 };

function bauen(state: GameState, typeId: string): BuildingInstance {
  const b = createBuildingInstance(typeId, 0, 0, true);
  b.connected = true;
  state.buildings.push(b);
  return b;
}

/** Alter Spielstand: Held aus einem Bewohner ausgebildet. */
function gebundenerHeld(state: GameState, status: Citizen['status']): { citizen: Citizen; fighter: GuildFighter } {
  const citizen = createCitizen(status);
  const fighter = createGuildFighter(citizen.id, 'guardian', 'Alter Held', WERTE);
  fighter.level = 7;
  fighter.xp = 420;
  fighter.gear.mainHand = 'iron_sword';
  fighter.spezialisierung = 'bollwerk';
  citizen.fighterId = fighter.id;
  state.citizens.push(citizen);
  state.fighters.push(fighter);
  return { citizen, fighter };
}

function heldAusHeldenhaus(state: GameState): GuildFighter {
  const fighter = createGuildFighter(0, 'guardian', 'Neuer Held', WERTE);
  state.fighters.push(fighter);
  return fighter;
}

function expeditionMit(state: GameState, fighters: GuildFighter[]): void {
  state.activeExpedition = {
    party: fighters.map(f => ({ id: f.id })),
  } as unknown as ExpeditionRun;
}

describe('loeseHeldenBindungen', () => {
  it('löst einen gebundenen Helden, der Bewohner wird IDLE, der Held behält alles', () => {
    const state = createNewGameState();
    const { citizen, fighter } = gebundenerHeld(state, 'GUILD_FIGHTER');

    expect(loeseHeldenBindungen(state)).toBe(1);

    expect(citizen.fighterId).toBeNull();
    expect(citizen.status).toBe('IDLE');
    expect(fighter.citizenId).toBe(0);
    expect(fighter.level).toBe(7);
    expect(fighter.xp).toBe(420);
    expect(fighter.gear.mainHand).toBe('iron_sword');
    expect(fighter.spezialisierung).toBe('bollwerk');
    expect(fighter.baseStats).toEqual(WERTE);
  });

  it('lässt andere Status stehen, Bewohner in Ausbildung bleiben unberührt', () => {
    const state = createNewGameState();
    const verletzt = gebundenerHeld(state, 'INJURED_REST');
    const lernt = gebundenerHeld(state, 'GUILD_TRAINING');

    expect(loeseHeldenBindungen(state)).toBe(1);

    expect(verletzt.citizen.status).toBe('INJURED_REST');
    expect(verletzt.citizen.fighterId).toBeNull();
    expect(lernt.citizen.status).toBe('GUILD_TRAINING');
    expect(lernt.citizen.fighterId).toBe(lernt.fighter.id);
  });

  it('ein Bewohner in zwei Arbeiterlisten steht danach nur noch in der seines Gebäudes', () => {
    const state = createNewGameState();
    const farm = bauen(state, 'FARM_GRAIN');
    const muehle = bauen(state, 'MILL_WIND');
    const c = createCitizen('WORKER');
    c.assignedBuildingId = muehle.id;
    state.citizens.push(c);
    farm.assignedWorkerIds.push(c.id, 9999);
    muehle.assignedWorkerIds.push(c.id, c.id);

    loeseHeldenBindungen(state);

    expect(farm.assignedWorkerIds).toEqual([]);
    expect(muehle.assignedWorkerIds).toEqual([c.id]);
  });

  it('ein gelöster Bewohner verliert seine alte Arbeitsstelle', () => {
    const state = createNewGameState();
    const farm = bauen(state, 'FARM_GRAIN');
    const { citizen } = gebundenerHeld(state, 'ON_EXPEDITION');
    citizen.assignedBuildingId = farm.id;
    farm.assignedWorkerIds.push(citizen.id);

    loeseHeldenBindungen(state);

    expect(citizen.status).toBe('IDLE');
    expect(citizen.assignedBuildingId).toBeNull();
    expect(farm.assignedWorkerIds).toEqual([]);
  });

  it('ein Held auf einer laufenden Expedition bleibt in der Gruppe', () => {
    const state = createNewGameState();
    const { citizen, fighter } = gebundenerHeld(state, 'ON_EXPEDITION');
    expeditionMit(state, [fighter]);

    expect(loeseHeldenBindungen(state)).toBe(1);

    expect(state.activeExpedition!.party.map(u => u.id)).toEqual([fighter.id]);
    expect(state.fighters).toContain(fighter);
    expect(citizen.status).toBe('IDLE');
  });

  it('ein zweiter Aufruf ändert nichts und gibt 0 zurück', () => {
    const state = createNewGameState();
    const farm = bauen(state, 'FARM_GRAIN');
    gebundenerHeld(state, 'GUILD_FIGHTER');
    const arbeiter = createCitizen('WORKER');
    arbeiter.assignedBuildingId = farm.id;
    farm.assignedWorkerIds.push(arbeiter.id);
    state.citizens.push(arbeiter);

    loeseHeldenBindungen(state);
    const vorher = JSON.stringify(state);

    expect(loeseHeldenBindungen(state)).toBe(0);
    expect(JSON.stringify(state)).toBe(vorher);
  });
});

describe('Helden-Boni', () => {
  function zufriedenheit(state: GameState): number {
    new SatisfactionSystem().update(state);
    return state.satisfaction;
  }

  it('3 Helden aus dem Heldenhaus zu Hause: Steuer-Faktor 1,05 und +3 Zufriedenheit', () => {
    const state = createNewGameState();
    const ohne = zufriedenheit(state);
    for (let i = 0; i < 3; i++) heldAusHeldenhaus(state);

    const synergie = new FighterSynergySystem();
    expect(synergie.getActiveFighterCount(state)).toBe(3);
    expect(synergie.getTaxMultiplier(state)).toBe(1.05);
    expect(synergie.getSatisfactionBonus(state)).toBe(3);
    expect(zufriedenheit(state)).toBe(ohne + 3);
  });

  it('sind alle Helden auf Expedition, gibt es keinen Bonus', () => {
    const state = createNewGameState();
    const ohne = zufriedenheit(state);
    const helden = [heldAusHeldenhaus(state), heldAusHeldenhaus(state), heldAusHeldenhaus(state)];
    expeditionMit(state, helden);

    const synergie = new FighterSynergySystem();
    expect(synergie.getActiveFighterCount(state)).toBe(0);
    expect(synergie.getTaxMultiplier(state)).toBe(1);
    expect(synergie.getSatisfactionBonus(state)).toBe(0);
    expect(zufriedenheit(state)).toBe(ohne);
  });
});
