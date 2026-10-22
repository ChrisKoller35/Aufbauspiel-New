import { describe, it, expect } from 'vitest';
import { modusFuer } from './MindmapLinien';
import { flussText, erklaerung, zielWert, quellenText } from './MindmapTexte';
import { bauplanSchritt, bauplanKaufenText } from './AufbauTab';
import { createNewGameState } from '../../models/GameState';
import { createBuildingInstance } from '../../models/Building';
import { createGuildFighter } from '../../models/GuildRoster';
import { CLASS_DEFS } from '../../data/classes';
import { placeStartingLayout } from '../../scenes/CityStartingLayout';

/** Neues Spiel: Gildenhaus und Händler stehen, ein Guardian, 100 Gold. */
function stadt() {
  const state = createNewGameState();
  placeStartingLayout(state);
  return state;
}

/** Ein zweiter Held, damit die Empfehlung ein Gebäude nennt (Empfehlung.ts: HELDEN_VOR_DEM_BAU). */
function mitZweitemHelden(state: ReturnType<typeof stadt>) {
  const ranger = CLASS_DEFS.ranger;
  state.fighters.push(createGuildFighter(ranger.id, ranger.name, ranger.baseStats));
  return state;
}

describe('Mindmap: Darstellung je Breite', () => {
  it('genug Platz: normal', () => {
    expect(modusFuer(1400, 1150).modus).toBe('voll');
  });
  it('etwas zu schmal: verkleinert, Faktor passt genau', () => {
    const r = modusFuer(980, 1150);
    expect(r.modus).toBe('zoom');
    expect(r.faktor).toBeCloseTo(980 / 1150);
  });
  it('viel zu schmal (Handy): Raster', () => {
    expect(modusFuer(370, 1150).modus).toBe('kompakt');
  });
});

describe('Mindmap: Texte', () => {
  it('Karten nennen im Raster, wohin sie liefern', () => {
    expect(flussText('SMITHY')).toBe('→ Gildenhaus: Ausrüstung');
    expect(flussText('HAENDLER')).toContain('Baupläne');
    // Der Beute-Balken beliefert zu viele Ziele für eine Zeile
    expect(flussText('q:beute')).toBe('');
  });

  it('Erklärung: Bauplatz nennt Kosten und, wenn empfohlen, den Grund', () => {
    const state = mitZweitemHelden(stadt());
    state.globalStock.bauplan_schmiede = 1;
    const e = erklaerung(state, 'SMITHY');
    expect(e.titel).toBe('Schmiede');
    expect(e.zeilen.join(' ')).toContain('Klick: bauen für 50 Gold');
    expect(e.zeilen.join(' ')).toContain('Lohnt sich als Nächstes');
  });

  it('Erklärung: fehlt nur der Bauplan des Händlers, steht «Bauplan kaufen (N Gold)»', () => {
    const state = stadt();
    expect(bauplanSchritt(state, 'SMITHY')).toEqual({ preis: 50 });
    expect(bauplanKaufenText(50)).toBe('Bauplan kaufen (50 Gold)');
    expect(erklaerung(state, 'SMITHY').zeilen.join(' ')).toContain('Klick: Bauplan kaufen (50 Gold) beim Händler.');
    // Mit Rabatt der Stadtstufe
    state.stadtweg!.stufe = 7;
    expect(bauplanSchritt(state, 'HERB_GARDEN')).toEqual({ preis: 40 });
    // Liegt der Bauplan im Lager oder steht das Gebäude, gibt es den Schritt nicht mehr
    state.globalStock.bauplan_kraeuterkueche = 1;
    expect(bauplanSchritt(state, 'HERB_GARDEN')).toBeNull();
    state.buildings.push(createBuildingInstance('SMITHY'));
    expect(bauplanSchritt(state, 'SMITHY')).toBeNull();
  });

  it('Erklärung: gesperrtes Gebäude (Gildenrang) nennt den Grund, kein Kauf-Knopf', () => {
    const state = stadt();
    expect(bauplanSchritt(state, 'ARCANE_SMITHY')).toBeNull();
    const text = erklaerung(state, 'ARCANE_SMITHY').zeilen.join(' ');
    expect(text).toContain('Noch gesperrt');
    expect(text).toContain('Gildenrang 2');
  });

  it('Erklärung: Beute-Gruppe nennt den Vorrat, Händler den Laden', () => {
    const state = stadt();
    state.globalStock.iron_scrap = 7;
    const e = erklaerung(state, 'beute:eisen');
    expect(e.titel).toBe('Eisenschrott');
    expect(e.zeilen.join(' ')).toContain('Im Lager: 7.');
    // Der Beute-Balken: Vorrat als Zahl, bei leerem Lager «noch nichts im Lager»
    expect(quellenText(state, ['iron_scrap'])).toBe('7 im Lager');
    expect(quellenText(state, ['crystal_shard'])).toBe('noch nichts im Lager');
    expect(erklaerung(state, 'q:beute').zeilen.join(' ')).toContain('Im Lager: 7.');
    expect(erklaerung(state, 'HAENDLER').zeilen.join(' ')).toContain('kaufen und verkaufen');
  });

  it('Ziel «Bauen»: mit einem Helden «Held anheuern», dann der nächste Bauplan, sonst «sammle Gold und Eisenschrott»', () => {
    const state = stadt();
    expect(zielWert(state, 'bauen')).toBe('Held anheuern (50 Gold)');
    expect(erklaerung(state, 'z:bauen').zeilen.join(' ')).toContain('Klick: zu den Helden.');
    mitZweitemHelden(state);
    expect(zielWert(state, 'bauen')).toBe('Bauplan kaufen (50 Gold)');
    expect(erklaerung(state, 'z:bauen').zeilen.join(' ')).toContain('Klick: zum Reiter «Aufbau».');
    state.globalStock.bauplan_schmiede = 1;
    expect(zielWert(state, 'bauen')).toBe('1 baubar');
    state.globalStock.gold = 0;
    for (const id of ['SMITHY', 'HERB_GARDEN', 'ARCANE_SMITHY', 'WAR_MACHINE_WORKSHOP']) state.buildings.push(createBuildingInstance(id));
    expect(zielWert(state, 'bauen')).toBe('sammle Gold und Eisenschrott');
  });
});
