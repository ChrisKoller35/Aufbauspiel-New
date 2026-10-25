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
  merkeMusik: vi.fn(),
  spieleEffekt: vi.fn(),
}));
vi.mock('../src/systems/Klang', async (original) => ({
  ...(await original<typeof import('../src/systems/Klang')>()),
  istGestartet: () => klang.gestartet,
  starteKlang: (nachholen = true) => { klang.starteKlang(nachholen); klang.gestartet = true; },
  spieleMusik: klang.spieleMusik,
  merkeMusik: klang.merkeMusik,
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
  /** Ein Ereignis mit Ziel und Feldern (ein Knopf, eine Taste): Ohne Browser gibt es kein Element dafür */
  const meldeMit = (typ: string, felder: Record<string, unknown>) => {
    const e = new Event(typ);
    for (const [feld, wert] of Object.entries(felder)) Object.defineProperty(e, feld, { value: wert });
    fenster.dispatchEvent(e);
  };
  const aufKlangKnopf = { closest: (sel: string) => (sel === '.klang-knopf' ? {} : null) };
  const effekte = () => klang.spieleEffekt.mock.calls.map(([name]) => name);

  beforeAll(async () => {
    vi.stubGlobal('window', fenster);
    // querySelectorAll für schalteKlang (Taste M): keine Knöpfe, kein Video
    vi.stubGlobal('document', Object.assign(new EventTarget(), { querySelectorAll: () => [] }));
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
    expect(klang.starteKlang).toHaveBeenCalledWith(true);
    expect(klang.spieleMusik).toHaveBeenCalledWith('ambient_city');
    melde('click');
    expect(klang.starteKlang).toHaveBeenCalledTimes(2);
    expect(klang.spieleMusik).toHaveBeenCalledTimes(1);
  });

  test('erste Geste auf 🔊 oder mit M: Musik nur gemerkt, erst der Klick bzw. die Taste entscheidet', () => {
    klang.gestartet = false;
    meldeMit('pointerdown', { target: aufKlangKnopf });
    expect(klang.starteKlang).toHaveBeenCalledWith(false);
    expect(klang.merkeMusik).toHaveBeenCalledWith('ambient_city');
    expect(klang.spieleMusik).not.toHaveBeenCalled();

    klang.gestartet = false;
    vi.clearAllMocks();
    // M zweimal: stumm und wieder laut (schalteKlang), danach ist alles wie vorher
    for (let i = 0; i < 2; i++) meldeMit('keydown', { key: 'm', target: { tagName: 'BODY' } });
    expect(klang.starteKlang.mock.calls).toEqual([[false], [false]]);
    expect(klang.merkeMusik).toHaveBeenCalledTimes(1);
    expect(klang.spieleMusik).not.toHaveBeenCalled();

    // Eine andere Taste ist eine gewöhnliche Geste: holt Abgelehntes nach
    meldeMit('keydown', { key: 'k', target: { tagName: 'BODY' } });
    expect(klang.starteKlang).toHaveBeenLastCalledWith(true);
  });

  test('erste Geste mit Tab (auch rückwärts): Musik nur gemerkt, die nächste andere Taste startet sie', () => {
    klang.gestartet = false;
    meldeMit('keydown', { key: 'Tab', target: { tagName: 'BODY' } });
    // Shift+Tab wie im Browser: erst Shift allein, dann Tab mit shiftKey. Zusatztasten allein zählen nicht
    meldeMit('keydown', { key: 'Shift', target: { tagName: 'BUTTON' } });
    meldeMit('keydown', { key: 'Tab', shiftKey: true, target: { tagName: 'BUTTON' } });
    for (const key of ['Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock']) meldeMit('keydown', { key, target: { tagName: 'BUTTON' } });
    expect(klang.starteKlang.mock.calls).toEqual([[false], [false]]);
    expect(klang.merkeMusik).toHaveBeenCalledTimes(1);
    expect(klang.spieleMusik).not.toHaveBeenCalled();
    meldeMit('keydown', { key: 'Enter', target: { tagName: 'BUTTON' } });
    expect(klang.starteKlang).toHaveBeenLastCalledWith(true);
  });

  test('🔊 mit dem Fokus: Enter und Leertaste lösen nur 🔊 aus, jede andere Taste startet die Musik', () => {
    klang.gestartet = false;
    meldeMit('keydown', { key: 'Tab', target: { tagName: 'BODY' } }); // der erste Halt ist 🔊
    meldeMit('keydown', { key: 'Enter', target: aufKlangKnopf });
    meldeMit('keydown', { key: ' ', target: aufKlangKnopf });
    expect(klang.starteKlang.mock.calls).toEqual([[false], [false], [false]]);
    meldeMit('keydown', { key: 'x', target: aufKlangKnopf });
    expect(klang.starteKlang).toHaveBeenLastCalledWith(true);
    expect(klang.merkeMusik).toHaveBeenCalledTimes(1);
  });

  test('Escape, Num- und Rollen-Taste zählen auch kurz nach Tab nicht, auch nicht auf 🔊: Sie geben keine Aktivierung', () => {
    klang.gestartet = false;
    meldeMit('keydown', { key: 'Tab', target: { tagName: 'BODY' } }); // die Aktivierung des Tabs gilt noch
    for (const key of ['Escape', 'NumLock', 'ScrollLock']) meldeMit('keydown', { key, target: aufKlangKnopf });
    expect(klang.starteKlang.mock.calls).toEqual([[false]]);
    expect(klang.spieleMusik).not.toHaveBeenCalled();
  });

  test('Enter auf 🔊 gehalten: Die Wiederholungen klicken nicht (sonst schaltete es hin und her), anderswo schon', () => {
    const verhindert = vi.fn();
    meldeMit('keydown', { key: 'Enter', repeat: true, target: aufKlangKnopf, preventDefault: verhindert });
    expect(verhindert).toHaveBeenCalledTimes(1);
    const ungehindert = vi.fn();
    meldeMit('keydown', { key: 'Enter', target: aufKlangKnopf, preventDefault: ungehindert });
    meldeMit('keydown', { key: 'Enter', repeat: true, target: { tagName: 'BUTTON' }, preventDefault: ungehindert });
    expect(ungehindert).not.toHaveBeenCalled();
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

  test('Bosskampf und Sieg im Kampf: ein Ausgangston, die Bilanz danach bleibt still', () => {
    melde('mc:aufbruch', { routeId: 'drachenhort' });
    melde('mc:bosskampf');
    expect(klang.spieleMusik).toHaveBeenCalledWith(BOSS_MUSIK);
    melde('mc:kampfausgang', { status: 'victory' });
    melde('mc:expeditionsende', { status: 'victory' });
    expect(effekte()).toEqual(['expedition_start', 'boss_intro', 'boss_victory']);
  });

  test('Niederlage im Kampf, dann eine neue Expedition mit eigenem Ausgang', () => {
    melde('mc:aufbruch', { routeId: 'cave_deep' });
    melde('mc:kampfausgang', { status: 'defeat' });
    melde('mc:expeditionsende', { status: 'defeat' });
    melde('mc:aufbruch', { routeId: 'cave_deep' });
    melde('mc:kampfausgang', { status: 'defeat' });
    expect(effekte()).toEqual(['expedition_start', 'party_wipe', 'expedition_start', 'party_wipe']);
  });

  test('Ausgang ohne Anzeige im Kampf: Rückzug aus einem verlorenen Kampf, letzter Raum ohne Kampf', () => {
    // «Rückzug» während der Runden eines Kampfs, der schon verloren ist: Der Kampf zeigt den Ausgang nie
    melde('mc:aufbruch', { routeId: 'drachenhort' });
    melde('mc:expeditionsende', { status: 'defeat' });
    // ocean_shallows endet mit einer Rast: Der Sieg entsteht erst zur Bilanz
    melde('mc:aufbruch', { routeId: 'ocean_shallows' });
    melde('mc:expeditionsende', { status: 'victory' });
    expect(effekte()).toEqual(['expedition_start', 'party_wipe', 'expedition_start', 'boss_victory']);
  });

  test('Rückzug per Knopf im Kampf oder am Kontrollpunkt: Horn', () => {
    melde('mc:aufbruch', { routeId: 'cave_deep' });
    melde('mc:expeditionsende', { status: 'retreat' });
    expect(effekte()).toEqual(['expedition_start', 'retreat_horn']);
  });
});
