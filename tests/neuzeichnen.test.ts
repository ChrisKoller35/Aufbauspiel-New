// Neuzeichnen beim Bildschirmwechsel (main.ts): navigateTo → mc:navigate → screenRerender, geprüft am Team-Bildschirm.
// main.ts startet dafür ganz, mit einem kleinen Ersatz für Fenster, Seite und Speicher (die Tests laufen ohne Browser).
// Bildschirme, die mehr vom DOM brauchen (Hauptmenü, Monsterbuch, Dungeon-Karte), scheitern dabei schon beim ersten
// Zeichnen; main.ts fängt das ab, für den Team-Bildschirm spielt es keine Rolle.
import { describe, test, expect, vi, beforeAll, afterAll, type MockInstance } from 'vitest';
import { ROUTE_DEFS } from '../src/data/routes';

/** style wie im Browser, soweit der Router es braucht: cssText setzt display */
class Stil {
  display = '';
  get cssText(): string { return this.display ? `display:${this.display};` : ''; }
  set cssText(text: string) { this.display = /display:\s*([a-z-]+)/.exec(text)?.[1] ?? ''; }
}

/** Ein Element, soweit main.ts, der Router und der Team-Bildschirm es brauchen */
class Knoten {
  id = '';
  className = '';
  innerHTML = '';
  scrollTop = 0;
  style = new Stil();
  children: Knoten[] = [];
  addEventListener(): void {}
  appendChild(k: Knoten): Knoten {
    this.children.push(k);
    if (k.id) knoten[k.id] = k;
    return k;
  }
  querySelector(): null { return null; }
  querySelectorAll(): Knoten[] { return []; }
}

const knoten: Record<string, Knoten> = {};
let start: (() => void) | null = null;
const seite = {
  addEventListener: (art: string, f: () => void) => { if (art === 'DOMContentLoaded') start = f; },
  createElement: () => new Knoten(),
  getElementById: (id: string) => knoten[id] ?? null,
  querySelector: () => null,
  querySelectorAll: () => [],
};
const fenster = Object.assign(new EventTarget(), {
  setTimeout: (f: () => void, ms: number) => globalThis.setTimeout(f, ms),
  clearTimeout: (t: number) => globalThis.clearTimeout(t),
});

let router: typeof import('../src/ui/ScreenRouter');
let fehler: MockInstance<typeof console.error>;

beforeAll(async () => {
  knoten.app = Object.assign(new Knoten(), { id: 'app' });
  vi.stubGlobal('window', fenster);
  vi.stubGlobal('document', seite);
  vi.stubGlobal('location', { search: '', pathname: '/' });
  vi.stubGlobal('history', { replaceState: () => {} });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  // Takt der Stadt und Speichern alle 60 s: hier ohne Uhr
  vi.stubGlobal('setInterval', () => 0);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
  router = await import('../src/ui/ScreenRouter');
  await import('../src/main');
  start?.();
});

afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Was main.ts beim Neuzeichnen eines Bildschirms als Fehler meldet («✗ team re-render failed») */
function neuzeichnenFehler(screen: string): unknown[][] {
  return fehler.mock.calls.filter(c => String(c[0]).startsWith(`✗ ${screen} re-render failed`));
}

/** Eine Route wählen wie die Dungeon-Karte und das Gildenhaus (mc:selectRoute; danach rufen sie navigateTo('team')) */
function waehleRoute(routeId: string): void {
  window.dispatchEvent(new CustomEvent('mc:selectRoute', { detail: { routeId } }));
}

describe('main.ts: Neuzeichnen beim Wechsel auf den Team-Bildschirm', () => {
  test('main.ts ist gestartet, der Team-Bildschirm ist da', () => {
    expect(start).not.toBeNull();
    expect(knoten['s-team']).toBeDefined();
  });

  test('navigateTo("team") zeichnet ihn neu (mc:navigate)', () => {
    const team = knoten['s-team'];
    waehleRoute('forest_short');
    team.innerHTML = 'veraltet';
    router.navigateTo('team');
    expect(team.style.display).toBe('flex');
    expect(team.innerHTML).toContain(ROUTE_DEFS.forest_short.name);
    expect(neuzeichnenFehler('team')).toEqual([]);
  });

  test('Route gewählt, während er versteckt und unten war: Beim Wechsel dorthin beginnt er oben', () => {
    const team = knoten['s-team'];
    router.navigateTo('expeditions');
    expect(team.style.display).toBe('none');
    team.scrollTop = 390;
    waehleRoute('cave_deep');
    // Versteckt wirkt scrollTop nicht (im Browser): zurückgesetzt wird erst beim Neuzeichnen im Bild
    expect(team.scrollTop).toBe(390);
    router.navigateTo('team');
    expect(team.scrollTop).toBe(0);
    expect(team.innerHTML).toContain(ROUTE_DEFS.cave_deep.name);
    expect(neuzeichnenFehler('team')).toEqual([]);
  });
});
