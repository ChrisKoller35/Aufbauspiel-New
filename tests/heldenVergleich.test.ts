import { describe, test, expect, vi } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { GearSystem } from '../src/systems/GearSystem';
import { besserFuer, besserFuerAlle, besserText, nebenhandFrei } from '../src/systems/Beutevergleich';
import { buildInventoryHtml, initHeroesScreen, nebenhandHinweisHtml, renderInventarTab } from '../src/ui/screens/HeroesScreen';

// Grüner Pfeil im Heldenfenster und im Lager, Hinweis «Nebenhand frei» (docs/BEUTEVERGLEICH.md), ohne Browser

const PFEIL = '<span class="besser-pfeil" aria-hidden="true"></span>';

function stand(probe?: 'neu' | 'sterne'): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  if (probe) richteProbespielEin(state, probe);
  initHeroesScreen(state);
  return state;
}
const held = (state: GameState, name: string) => state.fighters.find(f => f.name === name)!;

/** Knöpfe des Inventars mit Pfeil: Kennung und letzte Zeile des title */
function pfeile(html: string): [string, string][] {
  return html.split('<button').filter(k => k.includes(PFEIL))
    .map(k => [k.match(/data-item-id="([^"]+)"/)![1], k.match(/title="([^"]*)"/)![1].split('\n').pop()!]);
}
const gruen = (html: string) => [...html.matchAll(/<span class="truhe-besser">([^<]*)<\/span>/g)].map(m => m[1]);

describe('Grüner Pfeil im Heldenfenster und Lager', () => {
  test('a. sterne: nur die Wyrmzahnklinge, für Grimm und Sina', () => {
    const state = stand('sterne');
    const html = buildInventoryHtml(held(state, 'Grimm'), true);
    expect(pfeile(html)).toEqual([['set_wyrm_klinge', '⬆ Besser für Grimm (Nebenhand): ATK +10 · CRIT +8 % · DEF +2']]);
    expect(html).toContain('aria-label="Wyrmzahnklinge, 2 Stück"');
    expect(pfeile(buildInventoryHtml(held(state, 'Sina'), true)))
      .toEqual([['set_wyrm_klinge', '⬆ Besser für Sina (Nebenhand): ATK +10 · DEF +2 · CRIT +8 %']]);
    expect(buildInventoryHtml(held(state, 'Brom'), true)).not.toContain(PFEIL);
    expect(buildInventoryHtml(held(state, 'Lia'), true)).not.toContain(PFEIL);
  });

  test('b. der angetippte Platz zählt allein', () => {
    const sterne = stand('sterne');
    const grimm = held(sterne, 'Grimm');
    expect(pfeile(buildInventoryHtml(grimm, true, 'offHand')).map(p => p[0])).toEqual(['set_wyrm_klinge']);
    expect(buildInventoryHtml(grimm, true, 'mainHand')).not.toContain(PFEIL);
    const neu = stand('neu');
    expect(pfeile(buildInventoryHtml(held(neu, 'Grimm'), true))).toEqual([
      ['set_wyrm_klinge', '⬆ Besser für Grimm (Nebenhand): ✦ Doppelschlag · ATK +10 · CRIT +8 %'],
      ['set_wyrm_platte', '⬆ Besser für Grimm: ✦ Feuerresistenz · DEF +4 · HP +6'],
    ]);
    expect(pfeile(buildInventoryHtml(held(neu, 'Grimm'), true, 'armor')).map(p => p[0])).toEqual(['set_wyrm_platte']);
  });

  test('c. sterne: Hinweis für Grimm und Sina, nicht für Brom und Lia', () => {
    const state = stand('sterne');
    expect(nebenhandHinweisHtml(held(state, 'Grimm'))).toBe('<button type="button" class="nebenhand-frei" data-slot="offHand">✋ <b>Nebenhand frei:</b>'
      + ' Sie winkt dem Gegner nur zu. Eine zweite Einhandwaffe oder ein Schild zählt dort voll.<span class="truhe-besser">⬆ Wyrmzahnklinge aus dem Lager:'
      + ' ATK +10 · CRIT +8 % · DEF +2</span></button>');
    expect(nebenhandFrei(state, held(state, 'Sina'))?.itemId).toBe('set_wyrm_klinge');
    expect(nebenhandHinweisHtml(held(state, 'Brom'))).toBe('');
    expect(nebenhandHinweisHtml(held(state, 'Lia'))).toBe('');
  });

  test('d. wann nicht: Abwägung, keine Einhandwaffe in der Haupthand', () => {
    const state = stand('sterne');
    const grimm = held(state, 'Grimm');
    state.globalStock.set_wyrm_klinge = 0;
    state.globalStock.iron_shield = 1;
    expect(nebenhandFrei(state, grimm)).toBeNull();
    state.globalStock.neptune_shield = 1;
    expect(nebenhandFrei(state, grimm)?.besser.teile).toEqual(['DEF +5', 'HP +8']);
    const neu = stand();
    neu.globalStock.iron_sword = 1;
    expect(nebenhandFrei(neu, neu.fighters[0])).toBeNull();
    neu.fighters[0].gear.mainHand = 'iron_sword';
    expect(nebenhandFrei(neu, neu.fighters[0])?.besser.teile).toEqual(['ATK +3']);
  });

  test('e. neu: drei Karten in dieser Reihenfolge; Namen escapt', () => {
    stand('neu');
    const html = renderInventarTab();
    expect(html.split('inv-cell-besser').length - 1).toBe(3);
    expect(gruen(html)).toEqual([
      '⬆ Besser für Grimm (Nebenhand): ✦ Doppelschlag · ATK +10 · CRIT +8 % · auch für 1 weiteren',
      '⬆ Besser für Sina: ✦ Feuerresistenz · DEF +4 · HP +6 · auch für 1 weiteren',
      '⬆ Besser für Lia: ✦ Zaubermacht · CRIT +5 % · HP +7',
    ]);
    const state = stand();
    state.fighters[0].name = '<b>Gu</b>';
    state.globalStock.iron_sword = 1;
    const lager = renderInventarTab();
    const fenster = buildInventoryHtml(state.fighters[0], true);
    expect(lager).toContain('⬆ Besser für &lt;b>Gu&lt;/b> (Haupthand): ATK +3');
    expect(fenster).toContain('⬆ Besser für &lt;b>Gu&lt;/b> (Haupthand): ATK +3"');
    expect(lager + fenster).not.toContain('<b>Gu');
  });

  test('f. sterne: die Karte nennt den Helden der besten Wahl, die Truhe weiter Grimm', () => {
    const state = stand('sterne');
    for (const id of ['amtsstab_des_mondvogts', 'set_hort_klinge', 'korrunds_hammer']) state.globalStock[id] = 1;
    const html = renderInventarTab();
    expect(gruen(html)).toEqual([
      '⬆ Besser für Sina (Nebenhand): ✦ Letzte Bastion · ATK +21 · DEF +6 · auch für 1 weiteren',
      '⬆ Besser für Brom (Haupthand): CRIT +5 % · ATK +6 · DEF +1 · auch für 2 weitere',
    ]);
    expect(besserText(besserFuer(state, 'set_hort_klinge')!)).toBe('⬆ Besser für Grimm (Nebenhand): ATK +16 · CRIT +13 % · DEF +3 · auch für 2 weitere');
    const klinge = html.split('<div class="inv-cell ').find(k => k.includes('inv-cell-nm">Wyrmzahnklinge'))!;
    expect(klinge).toContain(PFEIL);
    expect(klinge.match(/title="([^"]*)"/)![1].split('\n').pop()).toBe('⬆ Besser für Grimm (Nebenhand): ATK +10 · CRIT +8 % · DEF +2 · auch für 1 weiteren');
    expect(html.split(PFEIL).length - 1).toBe(1);
    expect(html.indexOf('Wyrmzahnklinge')).toBeLessThan(html.indexOf('Korrunds Hammer'));
  });

  test('f2. sterne: eine doppelte Kennung ändert die beste Wahl nicht', () => {
    const state = stand('sterne');
    const einmal = besserFuerAlle(state, ['set_wyrm_klinge']).get('set_wyrm_klinge');
    expect(einmal?.besteWahl).toBe(true);
    expect(besserFuerAlle(state, ['set_wyrm_klinge', 'set_wyrm_klinge']).get('set_wyrm_klinge')).toEqual(einmal);
  });

  test('g. Werte eines Helden einmal je Zeichnen, nicht je Teil', () => {
    const state = stand('neu');
    const spy = vi.spyOn(GearSystem.prototype, 'getEffectiveStats');
    buildInventoryHtml(held(state, 'Grimm'), true);
    renderInventarTab();
    const aufrufe = state.fighters.map(f => spy.mock.calls.filter(c => c[0] === f).length);
    spy.mockRestore();
    expect(aufrufe).toEqual(state.fighters.map(f => (f.name === 'Grimm' ? 2 : 1)));
  });
});
