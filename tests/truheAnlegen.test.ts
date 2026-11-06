import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { ProbeStufe, richteProbespielEin } from '../src/systems/Probespiel';
import { GearSystem } from '../src/systems/GearSystem';
import { ANLEGEN_SPERRE_MS, TruheAnlegen, truheAnlegenHtml, truhenWahl } from '../src/ui/components/TruheAnlegen';
import { beuteEinlagern } from '../src/ui/screens/ExpeditionFlow';

function spiel(probe?: ProbeStufe): GameState {
  const state = createNewGameState();
  placeStartingLayout(state);
  if (probe) richteProbespielEin(state, probe);
  return state;
}

/** Lager plus alles Getragene */
function besitz(state: GameState, itemId: string): number {
  const getragen = state.fighters.reduce((n, f) => n + Object.values(f.gear).filter(id => id === itemId).length, 0);
  return (state.globalStock[itemId] ?? 0) + getragen;
}

const held = (state: GameState, name: string) => state.fighters.find(f => f.name === name)!;

/** Uhr, die nach jedem Anlegen weit genug vorrückt */
function uhr(): () => number {
  let t = 0;
  return () => (t += ANLEGEN_SPERRE_MS);
}

describe('Truhe: gleich anlegen', () => {
  afterEach(() => vi.useRealTimers());

  it('a: neues Spiel: «Guardian: anlegen», danach ✓, kein zweites Mal, Besitz wächst um 1', () => {
    const state = spiel();
    const loot: Record<string, number> = { iron_sword: 1, bread: 2 };
    const vorher = besitz(state, 'iron_sword');
    const truhe = new TruheAnlegen(state, loot, 'expedition', uhr());
    const karte = truhe.karten().get('iron_sword')!;
    expect(karte.anlegen).toBe('Guardian');
    expect(truheAnlegenHtml('iron_sword', karte)).toContain('>Guardian: anlegen</button>');
    expect(truhe.anlegen('iron_sword')).toBe(true);
    expect(held(state, 'Guardian').gear.mainHand).toBe('iron_sword');
    const html = truheAnlegenHtml('iron_sword', truhe.karten().get('iron_sword'));
    expect(html).toContain('✓ Guardian trägt es jetzt');
    expect(html).not.toContain('truhe-besser');
    expect(html).not.toContain('anlegen</button>');
    expect(truhe.anlegen('iron_sword')).toBe(false);
    beuteEinlagern(state.globalStock, loot, 0);
    expect(besitz(state, 'iron_sword')).toBe(vorher + 1);
  });

  it('b: ?probe=sterne: Eisenschwert ohne Knopf, die Wyrmzahnklinge im Lager ist besser', () => {
    const state = spiel('sterne');
    const karte = truhenWahl(state, { iron_sword: 1 }, 'expedition').get('iron_sword')!;
    expect(karte.besser).not.toBeNull();
    expect(karte.anlegen).toBeNull();
    expect(karte.nochBesser).toBe('Noch besser für Sina: Wyrmzahnklinge (im Lager)');
    const html = truheAnlegenHtml('iron_sword', karte);
    expect(html.indexOf('truhe-besser')).toBeLessThan(html.indexOf('truhe-noch-besser'));
  });

  it('c: zwei Klingen der tausend Schatten: erst Grimm, dann Sina, dann kein Knopf', () => {
    const state = spiel('sterne');
    const loot: Record<string, number> = { blade_of_thousand_shadows: 2 };
    const truhe = new TruheAnlegen(state, loot, 'expedition', uhr());
    expect(truhe.karten().get('blade_of_thousand_shadows')!.anlegen).toBe('Grimm');
    expect(truhe.anlegen('blade_of_thousand_shadows')).toBe(true);
    expect(truhe.karten().get('blade_of_thousand_shadows')!.anlegen).toBe('Sina');
    expect(truhe.anlegen('blade_of_thousand_shadows')).toBe(true);
    const karte = truhe.karten().get('blade_of_thousand_shadows')!;
    expect(karte.anlegen).toBeNull();
    expect(karte.traegt).toEqual(['Grimm', 'Sina']);
    expect(loot.blade_of_thousand_shadows ?? 0).toBe(0);
    expect(truhe.anlegen('blade_of_thousand_shadows')).toBe(false);
  });

  it('d: Ruhmestruhe ?probe=neu Platz 1: «Lia: anlegen» auf Herz der Glut, Stahlschwert ohne Knopf', () => {
    const state = spiel('neu');
    const beute: Record<string, number> = { set_wyrm_amulett: 1, steel_sword: 1, crystal_shard: 5 };
    // wie belohnungenAbholen: schon im Lager
    for (const [id, n] of Object.entries(beute)) state.globalStock[id] = (state.globalStock[id] ?? 0) + n;
    const vorher = { amulett: besitz(state, 'set_wyrm_amulett'), schwert: besitz(state, 'steel_sword') };
    expect(held(state, 'Lia').gear.trinket).toBe('abyss_amulet');
    const truhe = new TruheAnlegen(state, beute, 'ruhm', uhr());
    const karten = truhe.karten();
    expect(karten.get('set_wyrm_amulett')!.anlegen).toBe('Lia');
    expect(karten.get('steel_sword')!.anlegen).toBeNull();
    expect(karten.get('steel_sword')!.nochBesser).toBe('Noch besser für Grimm: Wyrmzahnklinge (im Lager)');
    const lagerAlt = state.globalStock.abyss_amulet ?? 0;
    expect(truhe.anlegen('set_wyrm_amulett')).toBe(true);
    expect(held(state, 'Lia').gear.trinket).toBe('set_wyrm_amulett');
    expect(state.globalStock.abyss_amulet).toBe(lagerAlt + 1);
    // nur bis zur Menge der Truhe, auch wenn im Lager noch ein Herz der Glut liegt
    expect(truhe.rest('set_wyrm_amulett')).toBe(0);
    expect(truhe.anlegen('set_wyrm_amulett')).toBe(false);
    expect(beute.set_wyrm_amulett).toBe(1);
    expect(besitz(state, 'set_wyrm_amulett')).toBe(vorher.amulett);
    expect(besitz(state, 'steel_sword')).toBe(vorher.schwert);
  });

  it('e: Name maskiert, ohne Ausrüstung leer', () => {
    const state = spiel();
    state.fighters[0].name = '<b>Lia</b>';
    const karte = truhenWahl(state, { iron_sword: 1 }, 'expedition').get('iron_sword');
    const html = truheAnlegenHtml('iron_sword', karte);
    expect(html).toContain('&lt;b>Lia&lt;/b>: anlegen');
    expect(html).not.toContain('<b>');
    expect(truhenWahl(state, { bread: 3, gold: 50, crystal_shard: 2 }, 'expedition').size).toBe(0);
  });

  it('f: Sperre gegen Doppeltipp im Modul', () => {
    vi.useFakeTimers();
    const state = spiel('sterne');
    const truhe = new TruheAnlegen(state, { blade_of_thousand_shadows: 2 }, 'expedition');
    expect(truhe.anlegen('blade_of_thousand_shadows')).toBe(true);
    vi.advanceTimersByTime(ANLEGEN_SPERRE_MS - 1);
    expect(truhe.anlegen('blade_of_thousand_shadows')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(truhe.anlegen('blade_of_thousand_shadows')).toBe(true);
  });

  it('g: misslingt equip, geht alles zurück (Lager und Beute)', () => {
    const state = spiel();
    const loot: Record<string, number> = { iron_sword: 1 };
    const truhe = new TruheAnlegen(state, loot, 'expedition', uhr());
    const stock = { ...state.globalStock };
    const equip = vi.spyOn(GearSystem.prototype, 'equip').mockReturnValue(false);
    expect(truhe.anlegen('iron_sword')).toBe(false);
    expect(equip).toHaveBeenCalledOnce();
    equip.mockRestore();
    expect(loot).toEqual({ iron_sword: 1 });
    expect(state.globalStock).toEqual(stock);
  });
});
