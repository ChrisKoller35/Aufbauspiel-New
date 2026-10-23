import { describe, it, expect } from 'vitest';
import { getGebaeudeStatus, freischaltHinweise, nachschub, nachschubText } from './GebaeudeStatus';
import { engpassFuerGebaeude, engpassFuerInstanz, engpaesseDerStadt } from './EngpassSystem';
import { auftragGeben } from './Auftraege';
import { ProductionSystem } from './ProductionSystem';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, BuildingInstance } from '../models/Building';
import { placeStartingLayout } from '../scenes/CityStartingLayout';
import { createGuildFighter } from '../models/GuildRoster';
import { CLASS_DEFS } from '../data/classes';

function bauen(state: GameState, typeId: string): BuildingInstance {
  const b = createBuildingInstance(typeId);
  state.buildings.push(b);
  return b;
}

/** Neues Spiel wie in main.ts (Gildenhaus, Händler, Guardian, 200 Gold), dazu ein zweiter Held, damit die Empfehlung Gebäude nennt. */
function startStadt(): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  state.fighters.push(createGuildFighter('ranger', CLASS_DEFS.ranger.name, CLASS_DEFS.ranger.baseStats));
  return state;
}

describe('GebaeudeStatus: Freischaltung', () => {
  it('Schmiede und Kräuterküche sind gleich Bauplätze mit Kosten', () => {
    const state = startStadt();
    expect(freischaltHinweise(state, 'SMITHY')).toEqual([]);
    expect(getGebaeudeStatus(state, 'SMITHY')).toMatchObject({ zustand: 'bauplatz', text: '100 Gold', anzahl: 0, stufe: 0 });
    expect(getGebaeudeStatus(state, 'HERB_GARDEN')).toMatchObject({ zustand: 'bauplatz', text: '90 Gold' });
    expect(engpassFuerGebaeude(state, 'SMITHY')).toBe('Schmiede fehlt noch. Bauen kostet 100 Gold.');
  });

  it('Arkanschmiede braucht nur Gildenrang 2', () => {
    const state = startStadt();
    expect(freischaltHinweise(state, 'ARCANE_SMITHY')).toEqual(['braucht Gildenrang 2']);
    expect(getGebaeudeStatus(state, 'ARCANE_SMITHY').zustand).toBe('gesperrt');
    expect(engpassFuerGebaeude(state, 'ARCANE_SMITHY')).toBe('Arkanschmiede braucht Gildenrang 2.');
    state.guildStats.rank = 2;
    expect(freischaltHinweise(state, 'ARCANE_SMITHY')).toEqual([]);
    expect(getGebaeudeStatus(state, 'ARCANE_SMITHY').text).toBe('230 Gold · 5 Eisenschrott · 3 Kristallsplitter');
  });

  it('Gildenhaus und Händler stehen von Anfang an: Helden in der Gilde, «Kauft und verkauft.»', () => {
    const state = startStadt();
    expect(getGebaeudeStatus(state, 'HAENDLER')).toMatchObject({ zustand: 'offen', text: 'Kauft und verkauft.', anzahl: 1, stufe: 1 });
    expect(getGebaeudeStatus(state, 'GUILD_HALL')).toMatchObject({ zustand: 'bereit', text: '2 Helden in der Gilde' });
    expect(engpassFuerGebaeude(state, 'HAENDLER')).toBeNull();
    expect(engpassFuerGebaeude(state, 'GUILD_HALL')).toBeNull();
  });
});

describe('GebaeudeStatus: Werkstätten', () => {
  it('ohne Auftrag ist die Schmiede bereit, kein Engpass', () => {
    const state = startStadt();
    bauen(state, 'SMITHY');
    expect(getGebaeudeStatus(state, 'SMITHY')).toMatchObject({ zustand: 'bereit', text: 'bereit · Auftrag geben', stufe: 1 });
    expect(engpassFuerGebaeude(state, 'SMITHY')).toBeNull();
  });

  it('mit Auftrag und Zutaten läuft sie und zeigt den Fortschritt auf ihrer Stufe', () => {
    const state = startStadt();
    const schmiede = bauen(state, 'SMITHY');
    schmiede.tier = 2;
    state.globalStock.iron_scrap = 4;
    auftragGeben(schmiede, 'RCP_IRON_SWORD');
    expect(getGebaeudeStatus(state, 'SMITHY')).toMatchObject({ zustand: 'laeuft', text: 'Eisenschwert schmieden', fortschritt: 0, stufe: 2 });
    const production = new ProductionSystem();
    for (let i = 0; i < 1 + 15; i++) production.update(state, 1);
    const s = getGebaeudeStatus(state, 'SMITHY');
    expect(s.zustand).toBe('laeuft');
    expect(s.fortschritt).toBeCloseTo(15 / 45);
  });

  it('fehlt Beute, nennt der Engpass Vorrat, Bedarf und die Expedition', () => {
    const state = startStadt();
    const schmiede = bauen(state, 'SMITHY');
    state.globalStock.iron_scrap = 1;
    auftragGeben(schmiede, 'RCP_IRON_SWORD');
    const s = getGebaeudeStatus(state, 'SMITHY');
    expect(s.zustand).toBe('wartet');
    expect(s.text).toBe('fehlt: Eisenschrott 1/2');
    expect(s.grund).toEqual({ art: 'zutaten', item: 'iron_scrap', vorrat: 1, bedarf: 2 });
    expect(engpassFuerGebaeude(state, 'SMITHY'))
      .toBe('Eisenschrott: 1 im Lager, 2 pro Auftrag. Eisenschrott gibt es als Beute in den Dungeons: schick die Helden auf Expedition.');
    expect(engpassFuerInstanz(state, schmiede)).toBe(engpassFuerGebaeude(state, 'SMITHY'));
  });

  it('fehlt Gold, sagt der Engpass, woher Gold kommt', () => {
    const state = startStadt();
    const schmiede = bauen(state, 'SMITHY');
    state.globalStock.iron_scrap = 10;
    state.globalStock.gold = 5;
    auftragGeben(schmiede, 'RCP_IRON_SWORD');
    expect(getGebaeudeStatus(state, 'SMITHY').text).toBe('fehlt: Gold 5/10');
    expect(engpassFuerGebaeude(state, 'SMITHY'))
      .toBe('Gold: 5 im Lager, 10 pro Auftrag. Gold bringen Expeditionen, das Auftragsbrett im Gildenhaus und der Händler, der Beute ankauft.');
  });

  it('fehlt der Kanone die Komponente, hängt es an der Arkanschmiede: Gildenrang fehlt', () => {
    const state = startStadt();
    const krieg = bauen(state, 'WAR_MACHINE_WORKSHOP');
    Object.assign(state.globalStock, { iron_scrap: 20, crystal_shard: 20, magitech_component: 0 });
    auftragGeben(krieg, 'RCP_WAR_CANNON');
    expect(nachschub(state, 'magitech_component')).toEqual({ kommt: false, item: 'magitech_component', von: 'ARCANE_SMITHY' });
    expect(nachschubText('magitech_component', nachschub(state, 'magitech_component'))).toBe('Arkanschmiede fehlt');
    expect(engpassFuerGebaeude(state, 'WAR_MACHINE_WORKSHOP')).toBe(
      'Magitech-Komponente: 0 im Lager, 2 pro Auftrag. '
      + 'Arkanschmiede braucht Gildenrang 2.',
    );
    // Mit dem Rang ist sie baubar
    state.guildStats.rank = 2;
    expect(engpassFuerGebaeude(state, 'WAR_MACHINE_WORKSHOP'))
      .toBe('Magitech-Komponente: 0 im Lager, 2 pro Auftrag. Arkanschmiede fehlt noch. Bauen kostet 230 Gold · 5 Eisenschrott · 3 Kristallsplitter.');
  });

  it('steht die Arkanschmiede, liefert sie zu: die Kanone wartet auf die Komponente, kein Engpass', () => {
    const state = startStadt();
    const krieg = bauen(state, 'WAR_MACHINE_WORKSHOP');
    bauen(state, 'ARCANE_SMITHY');
    Object.assign(state.globalStock, { iron_scrap: 20, crystal_shard: 20, magitech_component: 0 });
    auftragGeben(krieg, 'RCP_WAR_CANNON');
    expect(nachschub(state, 'magitech_component')).toEqual({ kommt: true, item: 'magitech_component', von: 'ARCANE_SMITHY' });
    expect(getGebaeudeStatus(state, 'ARCANE_SMITHY').text).toBe('Magitech-Komponente für Kriegsmaschinen-Werkstatt');
    const s = getGebaeudeStatus(state, 'WAR_MACHINE_WORKSHOP');
    expect(s.zustand).toBe('wartet');
    expect(s.text).toBe('wartet auf Magitech-Komponente (Arkanschmiede)');
    expect(engpassFuerGebaeude(state, 'WAR_MACHINE_WORKSHOP')).toBeNull();
    // Fehlt der Arkanschmiede dafür die Beute, hängt es daran; die Kanone selbst braucht noch mehr Eisen
    state.globalStock.iron_scrap = 0;
    expect(nachschubText('magitech_component', nachschub(state, 'magitech_component')))
      .toBe('dafür fehlt Eisenschrott (Beute aus den Dungeons)');
    expect(engpassFuerGebaeude(state, 'WAR_MACHINE_WORKSHOP'))
      .toBe('Eisenschrott: 0 im Lager, 5 pro Auftrag. Eisenschrott gibt es als Beute in den Dungeons: schick die Helden auf Expedition.');
  });

  it('ist die Arkanschmiede mit anderem beschäftigt, rät der Engpass zu ihrem Ausbau', () => {
    const state = startStadt();
    const krieg = bauen(state, 'WAR_MACHINE_WORKSHOP');
    const arkan = bauen(state, 'ARCANE_SMITHY');
    Object.assign(state.globalStock, { iron_scrap: 20, crystal_shard: 20, magitech_component: 1 });
    auftragGeben(arkan, 'RCP_ARCANE_BLADE'); // 300 s, verbraucht die eine Komponente
    new ProductionSystem().update(state, 1);
    expect(getGebaeudeStatus(state, 'ARCANE_SMITHY').text).toBe('Arkanklinge schmieden');
    auftragGeben(krieg, 'RCP_WAR_CANNON');
    expect(getGebaeudeStatus(state, 'WAR_MACHINE_WORKSHOP').text).toBe('fehlt: Magitech-Komponente 0/2');
    const satz = engpassFuerGebaeude(state, 'WAR_MACHINE_WORKSHOP');
    expect(satz).toContain('Arkanschmiede stellt sie her');
    expect(satz).toContain('Stadtstufe «Dorf»');
    state.stadtweg!.stufe = 3;
    expect(engpassFuerGebaeude(state, 'WAR_MACHINE_WORKSHOP')).toContain('baue Arkanschmiede aus');
  });
});

describe('Engpässe der Stadt', () => {
  it('neues Spiel: zuerst ein zweiter Held, dann die Schmiede', () => {
    const neu = createNewGameState();
    placeStartingLayout(neu);
    expect(engpaesseDerStadt(neu)[0].satz).toMatch(/^Held anheuern \(50 Gold\): /);
    expect(engpaesseDerStadt(neu)[1]).toEqual({ typeId: 'ARCANE_SMITHY', satz: 'Arkanschmiede braucht Gildenrang 2.' });
    const state = startStadt();
    const liste = engpaesseDerStadt(state);
    expect(liste[0]).toEqual({ typeId: 'SMITHY', satz: 'Schmiede fehlt noch. Bauen kostet 100 Gold.' });
    expect(liste.length).toBeLessThanOrEqual(3);
  });

  it('wartende Werkstätten zuerst, dann der nächste Bau', () => {
    const state = startStadt();
    const schmiede = bauen(state, 'SMITHY');
    state.globalStock.iron_scrap = 0;
    auftragGeben(schmiede, 'RCP_IRON_SWORD');
    const liste = engpaesseDerStadt(state, 10);
    expect(liste[0].typeId).toBe('SMITHY');
    expect(liste[0].satz).toContain('schick die Helden auf Expedition');
    expect(liste[1].typeId).toBe('HERB_GARDEN');
    expect(liste[1].satz).toBe('Kräuterküche fehlt noch. Bauen kostet 90 Gold.');
  });

  it('alles gebaut und nichts bestellt: keine Engpässe', () => {
    const state = startStadt();
    for (const id of ['SMITHY', 'HERB_GARDEN', 'ARCANE_SMITHY', 'WAR_MACHINE_WORKSHOP']) bauen(state, id);
    expect(engpaesseDerStadt(state)).toEqual([]);
  });
});
