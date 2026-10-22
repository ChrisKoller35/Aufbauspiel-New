// Erfolge im Bildschirm und in der Kopfzeile, mit einem kleinen Ersatz für Fenster und Seite
// (die Tests laufen ohne Browser). Im echten Browser prüft das zusätzlich der Playwright-Lauf.
import { describe, test, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { createNewGameState } from '../src/models/GameState';

/** Kopfzeile: sichtbar oder nicht (offsetParent), mit Platz für den Hinweis */
class Kopfzeile {
  note: { textContent: string; remove: () => void; setAttribute: () => void } | null = null;
  klassen = new Set<string>();
  classList = { add: (k: string) => this.klassen.add(k), remove: (k: string) => this.klassen.delete(k) };
  constructor(public offsetParent: object | null) {}
  querySelector(sel: string) { return sel === '.hdr-note' ? this.note : null; }
  insertBefore(n: Kopfzeile['note']) { this.note = n; if (n) n.remove = () => { this.note = null; }; }
}

const fenster = Object.assign(new EventTarget(), {
  setTimeout: (f: () => void, ms: number) => globalThis.setTimeout(f, ms),
  clearTimeout: (t: number) => globalThis.clearTimeout(t),
});
const inhalt = { innerHTML: '', offsetParent: {} as object | null };
let kopfzeilen: Kopfzeile[] = [];
const knopf = { innerHTML: '', label: '', setAttribute(_: string, v: string) { this.label = v; } };
const seite = {
  getElementById: () => ({ children: [] }),
  addEventListener: () => {},
  createElement: () => ({ className: '', textContent: '', setAttribute: () => {}, remove: () => {} }),
  querySelector: (sel: string) => (sel === '#s-achievements .erf-inhalt' ? inhalt : null),
  querySelectorAll: (sel: string) => {
    if (sel === '.hdr') return kopfzeilen;
    if (sel === '.hdr-erfolge') return [knopf];
    if (sel === '.hdr-note') return kopfzeilen.map(k => k.note).filter(Boolean);
    if (sel === '.hdr-mit-hinweis') return kopfzeilen.filter(k => k.klassen.has('hdr-mit-hinweis'));
    return [];
  },
};

let router: typeof import('../src/ui/ScreenRouter');
let bildschirm: typeof import('../src/ui/screens/AchievementsScreen');
let erfolge: typeof import('../src/systems/AchievementSystem');
let neuerTag: typeof import('../src/systems/Tag').neuerTag;

beforeAll(async () => {
  vi.stubGlobal('window', fenster);
  vi.stubGlobal('document', seite);
  vi.useFakeTimers();
  // Erst jetzt laden: Kopfzeile und Bildschirm melden sich beim Laden am Fenster an
  router = await import('../src/ui/ScreenRouter');
  bildschirm = await import('../src/ui/screens/AchievementsScreen');
  erfolge = await import('../src/systems/AchievementSystem');
  ({ neuerTag } = await import('../src/systems/Tag'));
});

// Jeder Test beginnt im Hauptmenü, ohne alten Hinweis (auch wenn einer davor scheitert)
afterEach(() => {
  for (let i = 0; i < 20 && router.getCurrentScreen() !== 'main'; i++) router.goBack();
  vi.runAllTimers();
});

afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function gespeichertZaehlen(): () => number {
  let n = 0;
  fenster.addEventListener('mc:speichern', () => { n++; });
  return () => n;
}

describe('Erfolge-Bildschirm offen, wenn am Tageswechsel ein Erfolg kommt', () => {
  test('die Karte erscheint gleich freigeschaltet, leuchtet auf und gilt als angeschaut', () => {
    const state = createNewGameState();
    state.day = 100; // der neue Tag zählt 100 überstandene Tage
    bildschirm.initAchievementsScreen(state);
    kopfzeilen = [new Kopfzeile({})];
    const gespeichert = gespeichertZaehlen();

    router.navigateTo('achievements');
    expect(router.getCurrentScreen()).toBe('achievements');
    const vorher = gespeichert();

    neuerTag(state);
    expect(state.achievements).toContain('survivor_100');
    // Neu gezeichnet: Karte mit Haken und Leuchten, Zahl oben stimmt
    expect(inhalt.innerHTML).toMatch(/ach-card ach-unlocked ach-neu">\s*<div class="ach-ico">⭐<\/div>/);
    expect(inhalt.innerHTML).toContain(`🏅 Freigeschaltet: 1/`);
    // Angeschaut: keine Zahl am Knopf, gleich gespeichert
    expect(erfolge.ungeseheneErfolge(state)).toBe(0);
    expect(knopf.innerHTML).toBe('🏅');
    expect(knopf.label).toBe('Erfolge');
    expect(gespeichert()).toBe(vorher + 1);
    // Der Hinweis oben nennt ihn trotzdem
    expect(kopfzeilen[0].note?.textContent).toBe('🏅 Erfolg: Überlebenskünstler');

    router.goBack();
    expect(router.getCurrentScreen()).toBe('main');
  });

  test('auf einem anderen Bildschirm bleibt der Erfolg neu (Zahl am Knopf)', () => {
    const state = createNewGameState();
    state.day = 100; // der neue Tag zählt 100 überstandene Tage
    bildschirm.initAchievementsScreen(state);
    inhalt.innerHTML = '';
    kopfzeilen = [new Kopfzeile({})];

    neuerTag(state);
    expect(state.achievements).toContain('survivor_100');
    expect(inhalt.innerHTML).toBe('');
    expect(erfolge.ungeseheneErfolge(state)).toBe(1);
    expect(knopf.innerHTML).toBe('🏅<span class="hdr-erfolge-neu">1</span>');
    expect(knopf.label).toBe('Erfolge, 1 neu');
    vi.runAllTimers();
  });
});

describe('Hinweis in der Kopfzeile, wenn gerade keine zu sehen ist (Kampf)', () => {
  test('wartet bis zum nächsten Bildschirm und kommt dort genau einmal', () => {
    const state = createNewGameState();
    bildschirm.initAchievementsScreen(state);
    const kampf = new Kopfzeile(null);
    kopfzeilen = [kampf];

    state.statistics.total_victories = 1;
    state.statistics.total_bosses_killed = 1;
    state.statistics.total_enemies_killed = 100;
    erfolge.erfolgePruefen(state);
    vi.runAllTimers();
    expect(kampf.note).toBeNull();

    // Der nächste Bildschirm hat eine sichtbare Kopfzeile
    const danach = new Kopfzeile({});
    kopfzeilen = [kampf, danach];
    router.navigateTo('bestiarium');
    expect(danach.note).toBeNull();
    vi.advanceTimersByTime(0);
    // Sieg, Boss, 100 Gegner und damit auch die erste Expedition
    expect(state.achievements).toHaveLength(4);
    expect(danach.note?.textContent).toBe('🏅 4 neue Erfolge');
    expect(danach.klassen.has('hdr-mit-hinweis')).toBe(true);

    // Nach ein paar Sekunden weg, und beim nächsten Wechsel nicht noch einmal
    vi.advanceTimersByTime(4000);
    expect(danach.note).toBeNull();
    expect(danach.klassen.has('hdr-mit-hinweis')).toBe(false);
    router.navigateTo('main');
    vi.runAllTimers();
    expect(danach.note).toBeNull();
  });

  test('wer gleich die Erfolge öffnet, sieht sie dort statt im Hinweis', () => {
    const state = createNewGameState();
    bildschirm.initAchievementsScreen(state);
    const kampf = new Kopfzeile(null);
    kopfzeilen = [kampf];

    state.statistics.total_victories = 1;
    erfolge.erfolgePruefen(state);
    const danach = new Kopfzeile({});
    kopfzeilen = [kampf, danach];
    router.navigateTo('achievements');
    vi.runAllTimers();
    expect(danach.note).toBeNull();
    expect(erfolge.ungeseheneErfolge(state)).toBe(0);
  });
});
