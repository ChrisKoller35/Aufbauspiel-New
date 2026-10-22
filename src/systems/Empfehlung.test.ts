import { describe, it, expect } from 'vitest';
import { HELDEN_VOR_DEM_BAU, anheuerKosten, naechsterBau } from './Empfehlung';
import { engpaesseDerStadt } from './EngpassSystem';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance } from '../models/Building';
import { createGuildFighter } from '../models/GuildRoster';
import { CLASS_DEFS } from '../data/classes';
import { BAU_REIHENFOLGE, ERKLAERUNG } from '../data/gebaeudeErklaerungen';
import { BEUTE_GRUPPEN, netzGebaeudeIds, NETZ_REIHEN } from '../data/produktionsnetz';
import { BUILDING_DEFS } from '../data/buildings';
import { placeStartingLayout } from '../scenes/CityStartingLayout';

function bauen(state: GameState, typeId: string): void {
  state.buildings.push(createBuildingInstance(typeId));
}

/** Neues Spiel mit den Startgebäuden (Gildenhaus, Händler), dem Start-Guardian und 100 Gold. */
function neuesSpiel(): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  return state;
}

/** So viele Helden, dass die Empfehlung Gebäude nennt (ein Ranger zum Start-Guardian). */
function zweiHelden(state: GameState): GameState {
  while (state.fighters.length < HELDEN_VOR_DEM_BAU) {
    state.fighters.push(createGuildFighter('ranger', CLASS_DEFS.ranger.name, CLASS_DEFS.ranger.baseStats));
  }
  return state;
}

/** Neues Spiel mit zwei Helden, bereit für den ersten Bau. */
function startStadt(): GameState {
  return zweiHelden(neuesSpiel());
}

describe('Empfehlung: nächster Schritt', () => {
  it('neues Spiel mit einem Helden: zuerst einen Helden anheuern (50 Gold), das Startgold reicht', () => {
    const state = neuesSpiel();
    expect(state.fighters).toHaveLength(1);
    const e = naechsterBau(state);
    expect(e).toMatchObject({ typeId: '', schritt: 'held', text: 'Held anheuern (50 Gold)', bezahlbar: true });
    expect(e?.warum).toContain('Waldpfad');
    state.globalStock.gold = 49;
    expect(naechsterBau(state)?.bezahlbar).toBe(false);
    // Die Engpass-Leiste nennt den Helden zuerst, ohne Gebäude-Art
    expect(engpaesseDerStadt(state)[0]).toMatchObject({ typeId: '' });
    expect(engpaesseDerStadt(state)[0].satz).toMatch(/^Held anheuern \(50 Gold\): /);
  });

  it('Anheuern: der erste Held kommt mit der Stadt, der zweite kostet 50, der dritte 80', () => {
    expect(anheuerKosten(0)).toBe(50);
    expect(anheuerKosten(1)).toBe(50);
    expect(anheuerKosten(2)).toBe(80);
    expect(anheuerKosten(3)).toBe(110);
  });

  it('mit zwei Helden: zuerst den Bauplan der Schmiede kaufen, das Startgold reicht', () => {
    const e = naechsterBau(startStadt());
    expect(e).toMatchObject({ typeId: 'SMITHY', schritt: 'bauplan', text: 'Bauplan Schmiede kaufen (50 Gold)', bezahlbar: true });
    expect(e?.warum).toContain('Ausrüstung');
  });

  it('Gildenhaus und Händler werden nie empfohlen, auch ohne Startgebäude', () => {
    expect(naechsterBau(zweiHelden(createNewGameState()))?.typeId).toBe('SMITHY');
  });

  it('liegt der Bauplan im Lager, heisst der Schritt bauen', () => {
    const state = startStadt();
    state.globalStock.bauplan_schmiede = 1;
    expect(naechsterBau(state)).toMatchObject({ typeId: 'SMITHY', schritt: 'bauen', text: 'Schmiede bauen (50 Gold)', bezahlbar: true });
    state.globalStock.gold = 49;
    expect(naechsterBau(state)?.bezahlbar).toBe(false);
  });

  it('gebaute Gebäude werden übersprungen, gesperrte mit Gildenrang warten', () => {
    const state = startStadt();
    bauen(state, 'SMITHY');
    expect(naechsterBau(state)).toMatchObject({ typeId: 'HERB_GARDEN', schritt: 'bauplan' });
    bauen(state, 'HERB_GARDEN');
    // Arkanschmiede braucht Gildenrang 2: noch keine Empfehlung
    expect(naechsterBau(state)).toBeNull();
    state.guildStats.rank = 2;
    expect(naechsterBau(state)).toMatchObject({ typeId: 'ARCANE_SMITHY', schritt: 'bauplan', bezahlbar: false });
    state.globalStock.gold = 150;
    expect(naechsterBau(state)?.bezahlbar).toBe(true);
  });

  it('der Bauplan-Preis gilt mit dem Rabatt der Stadtstufe', () => {
    const state = startStadt();
    state.guildStats.rank = 4;
    bauen(state, 'SMITHY');
    bauen(state, 'HERB_GARDEN');
    bauen(state, 'ARCANE_SMITHY');
    state.globalStock.gold = 225;
    expect(naechsterBau(state)).toMatchObject({ typeId: 'WAR_MACHINE_WORKSHOP', schritt: 'bauplan', bezahlbar: false });
    state.stadtweg!.stufe = 4; // 10 % Rabatt: 225 Gold
    expect(naechsterBau(state)?.bezahlbar).toBe(true);
  });

  it('alles gebaut: keine Empfehlung', () => {
    const state = startStadt();
    for (const id of netzGebaeudeIds()) if (!state.buildings.some(b => b.typeId === id)) bauen(state, id);
    expect(naechsterBau(state)).toBeNull();
  });

  it('die Engpass-Leiste nennt denselben Schritt', () => {
    const state = startStadt();
    bauen(state, 'SMITHY');
    expect(engpaesseDerStadt(state, 10).some(e => e.typeId === 'HERB_GARDEN' && e.satz.includes('Bauplan fehlt'))).toBe(true);
  });

  it('jede Empfehlung ist ein echtes Gebäude, und jeder Kasten der Mindmap hat eine Erklärung', () => {
    for (const { typeId } of BAU_REIHENFOLGE) expect(BUILDING_DEFS[typeId], typeId).toBeTruthy();
    for (const reihe of NETZ_REIHEN) {
      for (const k of reihe.knoten) expect(ERKLAERUNG[k.id], k.id).toBeTruthy();
    }
    for (const g of BEUTE_GRUPPEN) expect(ERKLAERUNG[g.id], g.id).toBeTruthy();
  });
});
