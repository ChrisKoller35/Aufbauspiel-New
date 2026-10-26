import { describe, test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { ROUTE_DEFS } from '../src/data/routes';
import { RIVALEN } from '../src/data/rivalen';
import { RIVALEN_STIMMEN, drohungSatz } from '../src/data/rivalenStimmen';
import { RanglistenBilanz, gipfelRangliste, naechsteBedrohung, ranglisteNachExpedition, wegVorbei } from '../src/systems/Rangliste';
import { ranglistenZeilen, stimmeZeile } from '../src/ui/components/RanglistenBilanzAnzeige';

/** Montag, 2. November 2026, 10:00 (Ortszeit) */
const MONTAG = new Date(2026, 10, 2, 10, 0).getTime();

/** Neues Spiel mit festem Samen, Platz 5 und diesen bezwungenen Dungeons */
function spielstand(bezwungen: string[]): GameState {
  const state = createNewGameState();
  state.rngSeed = 12345;
  state.guildStats.rank = 5;
  state.bezwungen = Object.fromEntries(bezwungen.map(id => [id, 0]));
  return state;
}

/** Eine beendete Expedition, so weit die Rangliste sie liest */
function lauf(routeId: string, status: ExpeditionRun['status'], geschafft = ROUTE_DEFS[routeId].rooms): ExpeditionRun {
  const anzahl = ROUTE_DEFS[routeId].rooms;
  const mitBoss = !!ROUTE_DEFS[routeId].bossId;
  const rooms = Array.from({ length: anzahl }, (_, i) => ({
    index: i, type: mitBoss && i === anzahl - 1 ? 'boss' : 'combat', completed: i < geschafft,
  }));
  return { routeId, status, rooms, bossesKilled: mitBoss && status === 'victory' ? 1 : 0 } as unknown as ExpeditionRun;
}

const name = (id: string): string => RIVALEN.find(r => r.id === id)!.name;
const stimmen = (zeilen: { text: string }[]): string[] => zeilen.map(z => z.text).filter(t => t.includes(' ausrichten: «'));

describe('Stimmen der Rivalen: Sätze', () => {
  test('drohungSatz nur bei der nächsten Expedition', () => {
    expect(drohungSatz('glueckspilze', 1)).toBe('Wir haben ein gutes Gefühl. Wir haben immer ein gutes Gefühl.');
    expect(drohungSatz('glueckspilze', 2)).toBeNull();
    expect(drohungSatz('glueckspilze', 3)).toBeNull();
    expect(drohungSatz('unbekannt', 1)).toBeNull();
  });

  test('jede Gilde hat drei eigene, kurze Sätze', () => {
    expect(Object.keys(RIVALEN_STIMMEN).sort()).toEqual(RIVALEN.map(r => r.id).sort());
    const saetze = Object.values(RIVALEN_STIMMEN).flatMap(s => [s.ueberholt, s.vorbei, s.drohung]);
    expect(new Set(saetze).size).toBe(27);
    for (const satz of saetze) {
      expect(satz.length, satz).toBeGreaterThan(0);
      expect(satz.length, satz).toBeLessThanOrEqual(80);
      expect(satz, satz).not.toMatch(/[«»<>&ß]/);
    }
    expect(new Set(RIVALEN.map(r => r.name)).size).toBe(RIVALEN.length);
  });
});

describe('Stimmen der Rivalen: Bericht nach echten Runden', () => {
  test('du ziehst vorbei: die überholte Gilde spricht unter der grünen Zeile', () => {
    const state = spielstand(['forest_short']);
    const gipfel = gipfelRangliste(state, MONTAG);
    const vor = gipfel[gipfel.findIndex(g => g.spieler) - 1];
    const weg = wegVorbei(state, vor, MONTAG);
    expect(weg).not.toBeNull();

    const b = ranglisteNachExpedition(state, lauf(weg!, 'victory'), MONTAG);
    expect(b.ueberholt).toContain(vor.name);
    const zeilen = ranglistenZeilen(b, new Set());
    const i = zeilen.findIndex(z => z.text.startsWith('Gipfel-Rangliste: vorbei an '));
    expect(zeilen[i + 1]).toEqual(stimmeZeile(b.ueberholt[0], 'ueberholt', new Set()));
    expect(stimmen(zeilen)).toHaveLength(1);
  });

  test('sie zieht vorbei: ihre Stimme steht unter ihrer roten Zeile', () => {
    const state = spielstand(['forest_short', 'forest_ruins']);
    const bedrohung = naechsteBedrohung(state, MONTAG);
    expect(bedrohung).not.toBeNull();
    expect(RIVALEN_STIMMEN[bedrohung!.gilde.id]?.drohung).toBeTruthy();

    let b: RanglistenBilanz | null = null;
    for (let i = 0; i < bedrohung!.runden; i++) b = ranglisteNachExpedition(state, lauf('forest_short', 'retreat', 1), MONTAG);
    expect(b!.rivalen.find(r => r.name === bedrohung!.gilde.name)?.vorbei).toBe(true);
    const zeilen = ranglistenZeilen(b!, new Set());
    const i = zeilen.findIndex(z => z.text.startsWith(`${bedrohung!.gilde.wappen} ${bedrohung!.gilde.name} `) && z.text.endsWith(' an dir vorbei'));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(zeilen[i + 1]).toEqual(stimmeZeile(bedrohung!.gilde.name, 'vorbei', new Set()));
  });
});

describe('Stimmen der Rivalen: Regeln', () => {
  const bilanz = (ueberholt: string[], vorbei: string[]): RanglistenBilanz => ({
    ruhm: 0, erstbezwingung: false, wocheRuhm: 0, wochePlatz: 1, platzVorher: 5, platzNachher: 5 - ueberholt.length + vorbei.length,
    ueberholt,
    rivalen: vorbei.map(n => {
      const r = RIVALEN.find(g => g.name === n)!;
      return { wappen: r.wappen, name: r.name, mehrzahl: r.mehrzahl, routeId: 'forest_short', vorbei: true };
    }),
  });

  test('höchstens eine Stimme je Bericht, jeder Satz nur einmal', () => {
    const gesagt = new Set<string>();
    const alles = bilanz([name('sturmadler'), name('dunstrudel')], [name('glueckspilze')]);
    expect(stimmen(ranglistenZeilen(alles, gesagt))).toEqual([stimmeZeile(name('sturmadler'), 'ueberholt', new Set())!.text]);
    expect(stimmen(ranglistenZeilen(alles, gesagt))).toEqual([stimmeZeile(name('dunstrudel'), 'ueberholt', new Set())!.text]);
    expect(stimmen(ranglistenZeilen(bilanz([], [name('glueckspilze')]), gesagt)))
      .toEqual([stimmeZeile(name('glueckspilze'), 'vorbei', new Set())!.text]);
    expect(stimmen(ranglistenZeilen(alles, gesagt))).toEqual([]);
  });

  test('ohne Überholen keine Stimme', () => {
    const b = bilanz([], []);
    b.rivalen = [{ wappen: '🦅', name: name('sturmadler'), mehrzahl: true, routeId: 'forest_short', vorbei: false }];
    expect(stimmen(ranglistenZeilen(b, new Set()))).toEqual([]);
  });

  test('Einzahl, Mehrzahl und Farbe der Gilde', () => {
    expect(stimmeZeile(name('dunstrudel'), 'ueberholt', new Set())).toEqual({
      text: '🐺 Das Rudel von Dunstmoor lässt ausrichten: «Wir haben kurz nachgedacht. Das passiert uns nicht wieder.»',
      farbe: '#a3a3a3',
    });
    const adler = stimmeZeile(name('sturmadler'), 'vorbei', new Set())!;
    expect(adler.text).toBe('🦅 Die Sturmadler lassen ausrichten: «Von hier oben sieht man dich kaum. Wir winken trotzdem.»');
    expect(adler.farbe).toBe('#7dd3fc');
    expect(stimmeZeile('Unbekannte Gilde', 'vorbei', new Set())).toBeNull();
  });
});
