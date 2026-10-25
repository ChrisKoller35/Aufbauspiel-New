import { describe, test, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { ROUTE_DEFS, biomFuerRoute } from '../src/data/routes';
import { BOSS_MUSIK, musikFuerBildschirm, musikFuerRoute } from '../src/data/klangZuordnung';
import { KLANG_SPEICHER_KEY, ladeEinstellungen, speichereEinstellungen } from '../src/systems/Klang';
import { istStummTaste, klangKnopfHtml } from '../src/ui/components/KlangSchalter';

// Für «Ereignisse → Ton»: Was klang.ts im Klang-System auslöst, wird nur aufgezeichnet (Einstellungen bleiben echt)
const klang = vi.hoisted(() => ({
  gestartet: false,
  starteKlang: vi.fn(),
  spieleMusik: vi.fn(),
  spieleEffekt: vi.fn(),
}));
vi.mock('../src/systems/Klang', async (original) => ({
  ...(await original<typeof import('../src/systems/Klang')>()),
  istGestartet: () => klang.gestartet,
  starteKlang: () => { klang.starteKlang(); klang.gestartet = true; },
  spieleMusik: klang.spieleMusik,
  spieleEffekt: klang.spieleEffekt,
}));

const musikDatei = (name: string) => existsSync(`public/assets/audio/music/${name}.mp3`);

describe('Klang-Zuordnung', () => {
  test('jede Route bekommt ein Musikstück, das es als Datei gibt', () => {
    for (const route of Object.values(ROUTE_DEFS)) expect(musikDatei(musikFuerRoute(route)), route.id).toBe(true);
    expect(musikDatei(BOSS_MUSIK)).toBe(true);
  });

  test('Musik je Biom wie in docs/KLANG.md', () => {
    const tabelle = Object.fromEntries(Object.values(ROUTE_DEFS).map(r => [biomFuerRoute(r), musikFuerRoute(r)]));
    expect(tabelle).toEqual({
      Wald: 'ambient_forest', Himmel: 'ambient_forest', Sterne: 'ambient_forest', Mond: 'ambient_forest', Belagerung: 'ambient_forest',
      Sumpf: 'ambient_swamp', Unterwasser: 'ambient_swamp', Ruinen: 'ambient_swamp',
      Höhle: 'Ecambient_cave', Vulkan: 'Ecambient_cave', Frost: 'Ecambient_cave', Drachengipfel: 'Ecambient_cave',
    });
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

  test('schon der Zugriff auf localStorage wirft (Safari, gesperrter Speicher): Vorgabe, keine Ausnahme', () => {
    const vorher = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
    try {
      expect(ladeEinstellungen()).toEqual({ stumm: false });
      expect(() => speichereEinstellungen({ stumm: true })).not.toThrow();
    } finally {
      if (vorher) Object.defineProperty(globalThis, 'localStorage', vorher);
      else delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });
});

describe('Schalter und Taste M', () => {
  const taste = (key: string, tagName = 'BODY', mod = {}, isContentEditable = false) =>
    istStummTaste({ key, target: { tagName, isContentEditable }, ctrlKey: false, altKey: false, metaKey: false, ...mod });

  test('M und m auf der Stadt, andere Tasten nicht', () => {
    expect(taste('m') && taste('M')).toBe(true);
    expect(taste('k')).toBe(false);
  });

  test('nicht in Eingabefeldern, nicht mit Strg/Alt/Cmd, nicht beim Halten', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) expect(taste('m', tag)).toBe(false);
    expect(taste('m', 'DIV', {}, true)).toBe(false);
    for (const mod of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) expect(taste('m', 'BODY', mod)).toBe(false);
    expect(taste('m', 'BODY', { repeat: true })).toBe(false);
  });

  test('der Knopf nennt, was ein Klick tut, und die Taste M', () => {
    const html = klangKnopfHtml('hdr-klang');
    expect(html).toContain('class="hdr-klang klang-knopf"');
    expect(html).toContain('aria-label="Ton aus"');
    expect(html).toContain('title="Ton aus (M)"');
    expect(html).toContain('🔊');
  });
});

// Die Ereignisse des Spiels (klang.ts) mit einem kleinen Ersatz für Fenster und Seite (die Tests laufen ohne
// Browser). Ob die Ereignisse im Spiel kommen und der Ton erklingt, prüft der Playwright-Lauf (docs/KLANG.md).
describe('Ereignisse → Ton (klang.ts)', () => {
  const fenster = new EventTarget();
  const aktivierung = { isActive: false };
  const melde = (typ: string, detail?: unknown) => fenster.dispatchEvent(new CustomEvent(typ, { detail }));

  beforeAll(async () => {
    vi.stubGlobal('window', fenster);
    vi.stubGlobal('document', new EventTarget());
    vi.stubGlobal('navigator', { userActivation: aktivierung });
    await import('../src/klang');
  });
  afterAll(() => { vi.unstubAllGlobals(); });
  beforeEach(() => { vi.clearAllMocks(); });

  test('ohne Nutzer-Aktivierung (Tippen beginnt, Escape) startet nichts, mit ihr die Stadtmusik', () => {
    melde('pointerdown');
    expect(klang.starteKlang).not.toHaveBeenCalled();
    aktivierung.isActive = true;
    melde('pointerup');
    expect(klang.starteKlang).toHaveBeenCalledTimes(1);
    expect(klang.spieleMusik).toHaveBeenCalledWith('ambient_city');
    melde('click');
    expect(klang.starteKlang).toHaveBeenCalledTimes(2);
    expect(klang.spieleMusik).toHaveBeenCalledTimes(1);
  });

  test('Bildschirmwechsel: Stadtmusik, der Kampf ändert nichts', () => {
    melde('mc:navigate', { screen: 'heroes', prev: 'main' });
    melde('mc:navigate', { screen: 'combat', prev: 'heroes' });
    expect(klang.spieleMusik.mock.calls).toEqual([['ambient_city'], [null]]);
  });

  test('Aufbruch: Start-Ton und Musik des Bioms', () => {
    melde('mc:aufbruch', { routeId: 'cave_deep' });
    expect(klang.spieleEffekt).toHaveBeenCalledWith('expedition_start');
    expect(klang.spieleMusik).toHaveBeenCalledWith('Ecambient_cave');
  });

  test('Bosskampf, Sieg, Niederlage und Rückzug', () => {
    melde('mc:bosskampf');
    expect(klang.spieleMusik).toHaveBeenCalledWith(BOSS_MUSIK);
    melde('mc:kampfausgang', { status: 'victory' });
    melde('mc:kampfausgang', { status: 'defeat' });
    melde('mc:rueckzug');
    expect(klang.spieleEffekt.mock.calls).toEqual([['boss_intro'], ['boss_victory'], ['party_wipe'], ['retreat_horn']]);
  });
});
