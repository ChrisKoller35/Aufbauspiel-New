import { describe, test, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { ROUTE_DEFS } from '../src/data/routes';
import { biomFuerRoute, musikFuerBildschirm, musikFuerRoute } from '../src/data/klangZuordnung';
import { KLANG_SPEICHER_KEY, ladeEinstellungen, speichereEinstellungen } from '../src/systems/Klang';
import { istStummTaste } from '../src/ui/components/KlangSchalter';

const musikDatei = (name: string) => existsSync(`public/assets/audio/music/${name}.mp3`);

describe('Klang-Zuordnung', () => {
  test('jede Route bekommt ein Musikstück, das es als Datei gibt', () => {
    for (const route of Object.values(ROUTE_DEFS)) expect(musikDatei(musikFuerRoute(route)), route.id).toBe(true);
  });

  test('Biome wie auf der Routenübersicht', () => {
    expect(biomFuerRoute(ROUTE_DEFS.forest_short)).toBe('Wald');
    expect(biomFuerRoute(ROUTE_DEFS.swamp_long)).toBe('Sumpf');
    expect(biomFuerRoute(ROUTE_DEFS.cave_deep)).toBe('Höhle');
    expect(biomFuerRoute(ROUTE_DEFS.ocean_depths)).toBe('Unterwasser');
    expect(biomFuerRoute(ROUTE_DEFS.drachenhort)).toBe('Drachengipfel');
  });

  test('Bildschirme: Stadtmusik, Kampf ändert nichts', () => {
    expect(musikDatei(musikFuerBildschirm('main')!)).toBe(true);
    expect(musikFuerBildschirm('combat')).toBeNull();
  });
});

describe('Klang-Einstellungen', () => {
  const speicher = () => {
    const daten = new Map<string, string>();
    return { getItem: (k: string) => daten.get(k) ?? null, setItem: (k: string, v: string) => { daten.set(k, v); } };
  };

  test('Vorgabe, Speichern und Laden', () => {
    const s = speicher();
    expect(ladeEinstellungen(s)).toEqual({ stumm: false });
    speichereEinstellungen({ stumm: true }, s);
    expect(ladeEinstellungen(s)).toEqual({ stumm: true });
  });

  test('kaputter Wert ergibt die Vorgabe', () => {
    for (const roh of ['{kaputt', '"ja"', '{"stumm":"ja"}', 'null']) {
      const s = speicher();
      s.setItem(KLANG_SPEICHER_KEY, roh);
      expect(ladeEinstellungen(s)).toEqual({ stumm: false });
    }
  });

  test('werfendes localStorage: keine Ausnahme, Vorgabe', () => {
    const wirft = () => { throw new Error('gesperrt'); };
    expect(() => speichereEinstellungen({ stumm: true }, { setItem: wirft })).not.toThrow();
    expect(ladeEinstellungen({ getItem: wirft })).toEqual({ stumm: false });
  });
});

describe('Taste M', () => {
  const taste = (key: string, tagName = 'BODY', mod = {}, isContentEditable = false) =>
    istStummTaste({ key, target: { tagName, isContentEditable }, ctrlKey: false, altKey: false, metaKey: false, ...mod });

  test('M und m auf der Stadt, andere Tasten nicht', () => {
    expect(taste('m') && taste('M')).toBe(true);
    expect(taste('k')).toBe(false);
  });

  test('nicht in Eingabefeldern, nicht mit Strg/Alt/Cmd', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) expect(taste('m', tag)).toBe(false);
    expect(taste('m', 'DIV', {}, true)).toBe(false);
    for (const mod of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) expect(taste('m', 'BODY', mod)).toBe(false);
  });
});
