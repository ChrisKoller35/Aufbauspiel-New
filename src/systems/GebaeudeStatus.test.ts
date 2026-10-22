import { describe, it, expect } from 'vitest';
import { getGebaeudeStatus, freischaltHinweise } from './GebaeudeStatus';
import { engpassFuerGebaeude, engpaesseDerStadt } from './EngpassSystem';
import { auftragGeben } from './Auftraege';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, BuildingInstance } from '../models/Building';
import { createCitizen } from '../models/Citizen';

function bauen(state: GameState, typeId: string, recipeId?: string): BuildingInstance {
  const b = createBuildingInstance(typeId, 0, 0, true);
  b.connected = true;
  if (recipeId) b.activeRecipeId = recipeId;
  state.buildings.push(b);
  return b;
}

function arbeiter(state: GameState, b: BuildingInstance): void {
  const c = createCitizen('WORKER');
  c.assignedBuildingId = b.id;
  b.assignedWorkerIds.push(c.id);
  state.citizens.push(c);
}

describe('GebaeudeStatus', () => {
  it('ohne Gebäude und ohne Voraussetzung: Bauplatz mit Kosten', () => {
    const state = createNewGameState();
    const s = getGebaeudeStatus(state, 'LUMBER_CAMP');
    expect(s.zustand).toBe('bauplatz');
    expect(s.anzahl).toBe(0);
    expect(s.stufe).toBe(0);
  });

  it('fehlende Voraussetzung: gesperrt mit Hinweis', () => {
    const state = createNewGameState();
    const s = getGebaeudeStatus(state, 'MILL_WIND');
    expect(s.zustand).toBe('gesperrt');
    expect(s.hinweise?.length).toBeGreaterThan(0);
  });

  it('Schmiede braucht die Eisenmine, die Eisenmine den Steinbruch', () => {
    const state = createNewGameState();
    expect(freischaltHinweise(state, 'IRON_MINE').join(' ')).toContain('Steinbruch');
    bauen(state, 'QUARRY');
    expect(freischaltHinweise(state, 'IRON_MINE')).toEqual([]);
    expect(freischaltHinweise(state, 'SMITHY').join(' ')).toContain('Eisenmine');
    bauen(state, 'IRON_MINE');
    expect(freischaltHinweise(state, 'SMITHY')).toEqual([]);
  });

  it('fehlender Bauplan zählt als Sperre', () => {
    const state = createNewGameState();
    state.guildStats.rank = 5;
    for (const id of ['IRON_MINE', 'GUILD_HALL', 'WAREHOUSE', 'MARKETPLACE']) bauen(state, id);
    expect(freischaltHinweise(state, 'BANK').some(h => h.includes('braucht'))).toBe(true);
    state.globalStock['bauplan_bank'] = 1;
    expect(freischaltHinweise(state, 'BANK')).toEqual([]);
  });

  it('Holzfäller mit Arbeiter läuft und zeigt Ertrag pro Tag', () => {
    const state = createNewGameState();
    arbeiter(state, bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1'));
    const s = getGebaeudeStatus(state, 'LUMBER_CAMP');
    expect(s.zustand).toBe('laeuft');
    // Wie die Zeile «Pro Tag»: 2 Holz alle 11 s (10 s Rezept, dazu der Takt bis zum nächsten Start)
    expect(s.text).toBe('+5,5 Holz / Tag');
    expect(s.stufe).toBe(1);
  });

  it('Holzfäller ohne Arbeiter wartet', () => {
    const state = createNewGameState();
    bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    const s = getGebaeudeStatus(state, 'LUMBER_CAMP');
    expect(s.zustand).toBe('wartet');
    expect(s.grund?.art).toBe('kein-arbeiter');
  });

  it('Stufe 2 mit nur einem Arbeiter: läuft, nennt aber die freien Plätze', () => {
    const state = createNewGameState();
    const huette = bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    huette.tier = 2;
    arbeiter(state, huette);
    const s = getGebaeudeStatus(state, 'LUMBER_CAMP');
    expect(s.zustand).toBe('laeuft');
    expect(s.stufe).toBe(2);
    expect(s.text).toContain('1/2 Arbeiter');
  });

  it('Wohnviertel: wächst mit Platz und Brot, sonst voll oder kein Brot', () => {
    const state = createNewGameState();
    const viertel = bauen(state, 'HOUSE_T1');
    state.globalStock.bread = 3;
    for (let i = 0; i < 4; i++) state.citizens.push(createCitizen('IDLE'));
    expect(getGebaeudeStatus(state, 'HOUSE_T1').zustand).toBe('laeuft');

    state.globalStock.bread = 0;
    const ohneBrot = getGebaeudeStatus(state, 'HOUSE_T1');
    expect(ohneBrot.zustand).toBe('wartet');
    expect(ohneBrot.grund?.art).toBe('kein-brot');

    state.globalStock.bread = 3;
    for (let i = 0; i < 2; i++) state.citizens.push(createCitizen('IDLE'));
    const voll = getGebaeudeStatus(state, 'HOUSE_T1');
    expect(voll.zustand).toBe('bereit');
    expect(voll.grund?.art).toBe('voll');

    viertel.tier = 2;
    expect(getGebaeudeStatus(state, 'HOUSE_T1').zustand).toBe('laeuft');
  });

  it('Marktplatz ohne Arbeiter wartet, mit Arbeiter zeigt er den Steuer-Bonus und den Handel', () => {
    const state = createNewGameState();
    const markt = bauen(state, 'MARKETPLACE');
    expect(getGebaeudeStatus(state, 'MARKETPLACE').zustand).toBe('wartet');
    arbeiter(state, markt);
    const s = getGebaeudeStatus(state, 'MARKETPLACE');
    expect(s.zustand).toBe('bereit');
    expect(s.text).toBe('+25 % Steuern · Handel: noch 3 Bündel');
  });
});

describe('EngpassSystem', () => {
  it('fehlende Zutat nennt Vorrat, Bedarf und das Liefergebäude', () => {
    const state = createNewGameState();
    const schmiede = bauen(state, 'SMITHY', 'RCP_IRON_SWORD');
    arbeiter(state, schmiede);
    state.globalStock['iron_scrap'] = 0;
    expect(engpassFuerGebaeude(state, 'SMITHY')).toBeNull(); // ohne Auftrag fehlt nichts
    auftragGeben(schmiede, 'RCP_IRON_SWORD');
    const satz = engpassFuerGebaeude(state, 'SMITHY');
    expect(satz).toContain('0 im Lager, 2 pro Auftrag');
    expect(satz).toContain('Baue Eisenmine');
  });

  it('steht das Liefergebäude schon, rät der Satz zum Ausbau', () => {
    const state = createNewGameState();
    const schmiede = bauen(state, 'SMITHY', 'RCP_IRON_SWORD');
    arbeiter(state, schmiede);
    auftragGeben(schmiede, 'RCP_IRON_SWORD');
    const mine = bauen(state, 'IRON_MINE', 'RCP_IRON_SCRAP_1');
    state.globalStock['iron_scrap'] = 0;
    // Ohne Arbeiter liefert die Mine nicht: das steht da statt des Ausbau-Rats
    expect(engpassFuerGebaeude(state, 'SMITHY')).toContain('Eisenmine kann gerade nicht liefern: kein Arbeiter.');
    arbeiter(state, mine);
    // Am Lagerfeuer erlaubt die Stadt noch keinen Ausbau: der Satz nennt die nötige Stadtstufe
    expect(engpassFuerGebaeude(state, 'SMITHY')).toContain('erst die Stadtstufe «Dorf»');
    state.stadtweg!.stufe = 3;
    expect(engpassFuerGebaeude(state, 'SMITHY')).toContain('baue Eisenmine aus');
  });

  it('Schmiede mit genug Zutaten wartet nur auf den Auftrag: kein Engpass', () => {
    const state = createNewGameState();
    arbeiter(state, bauen(state, 'SMITHY', 'RCP_IRON_SWORD'));
    state.globalStock['iron_scrap'] = 10;
    state.globalStock['wood'] = 10;
    expect(getGebaeudeStatus(state, 'SMITHY').zustand).toBe('bereit');
    expect(engpassFuerGebaeude(state, 'SMITHY')).toBeNull();
  });

  it('Engpässe der Stadt: wartende Gebäude zuerst, dann der nächste Bauplatz', () => {
    const state = createNewGameState();
    bauen(state, 'LUMBER_CAMP', 'RCP_WOOD_1');
    const liste = engpaesseDerStadt(state);
    expect(liste.length).toBeGreaterThan(0);
    expect(liste[0].typeId).toBe('LUMBER_CAMP');
    expect(liste[0].satz).toContain('Holzfällerhütte');
    expect(liste.some(e => getGebaeudeStatus(state, e.typeId).zustand === 'bauplatz')).toBe(true);
    expect(liste.length).toBeLessThanOrEqual(3);
  });

  it('volles Wohnviertel wird als Engpass genannt', () => {
    const state = createNewGameState();
    bauen(state, 'HOUSE_T1');
    state.globalStock.bread = 5;
    for (let i = 0; i < 6; i++) state.citizens.push(createCitizen('IDLE'));
    const satz = engpaesseDerStadt(state).find(e => e.typeId === 'HOUSE_T1')?.satz ?? '';
    expect(satz).toContain('voll');
    expect(satz).toContain('6/6');
  });
});
