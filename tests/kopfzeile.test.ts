// Kopfzeile: Platz für den Hinweis hinter dem Namen (.hdr-platz), Klasse für lange Hinweise und für «← Zurück»,
// mit einem kleinen Ersatz für Fenster und Seite (die Tests laufen ohne Browser). Wie die Kopfzeile aussieht und dass
// ein Hinweis nichts verschiebt, prüft der Playwright-Lauf (docs/ERFOLGE.md).
import { describe, test, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { createNewGameState } from '../src/models/GameState';

type Hinweis = { className: string; textContent: string; setAttribute: () => void; remove: () => void };

/** Kopfzeile mit .hdr-platz: Dort hinein legt zeigeKopfHinweis den Hinweis */
class Kopfzeile {
  hinweis: Hinweis | null = null;
  klassen = new Set<string>();
  classList = { add: (k: string) => this.klassen.add(k), remove: (k: string) => this.klassen.delete(k) };
  platz = {
    insertBefore: (n: Hinweis) => { this.hinweis = n; n.remove = () => { this.hinweis = null; }; },
  };
  querySelector(sel: string) {
    if (sel === '.hdr-note') return this.hinweis;
    if (sel === '.hdr-platz') return this.platz;
    return null;
  }
  insertBefore() { throw new Error('Der Hinweis gehört in .hdr-platz, nicht direkt in die Kopfzeile'); }
}

let kopfzeilen: Kopfzeile[] = [];
const fenster = Object.assign(new EventTarget(), {
  setTimeout: (f: () => void, ms: number) => globalThis.setTimeout(f, ms),
  clearTimeout: (t: number) => globalThis.clearTimeout(t),
});
const seite = {
  addEventListener: () => {},
  createElement: (): Hinweis => ({ className: '', textContent: '', setAttribute: () => {}, remove: () => {} }),
  querySelectorAll: (sel: string) => {
    if (sel === '.hdr') return kopfzeilen;
    if (sel === '.hdr-note') return kopfzeilen.map(k => k.hinweis).filter(Boolean);
    if (sel === '.hdr-mit-hinweis') return kopfzeilen.filter(k => k.klassen.has('hdr-mit-hinweis'));
    return [];
  },
};

let kopf: typeof import('../src/ui/screens/HeaderRenderer');

beforeAll(async () => {
  vi.stubGlobal('window', fenster);
  vi.stubGlobal('document', seite);
  vi.useFakeTimers();
  // Erst jetzt laden: Die Kopfzeile meldet sich beim Laden an Fenster und Seite an
  kopf = await import('../src/ui/screens/HeaderRenderer');
});

// Jeder Test beginnt ohne Hinweis
afterEach(() => { vi.runAllTimers(); });

afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Inhalt von .hdr-mitte: alles zwischen <div class="hdr-mitte"> und dem Ende dieses div */
function mitte(html: string): string {
  return html.match(/<div class="hdr-mitte">([\s\S]*?)<\/div>/)?.[1].replace(/\s+/g, ' ').trim() ?? '';
}

describe('Platz für den Hinweis', () => {
  test('.hdr-platz steht leer hinter Logo und Namen, «← Zurück» bekommt .hdr-zurueck', () => {
    const state = createNewGameState();
    const haupt = kopf.renderHeader(state);
    expect(haupt).toContain('<div class="hdr">');
    expect(mitte(haupt)).toBe('<span class="hdr-logo">⚔ MAGIC CITY</span> <span class="hdr-platz"></span>');

    const helden = kopf.renderHeader(state, 'main', 'HELDEN');
    expect(helden).toContain('<div class="hdr hdr-zurueck">');
    expect(mitte(helden)).toBe('<span class="hdr-logo">⚔ MAGIC CITY</span> <span class="hdr-sep">/</span> '
      + '<span class="hdr-cur">HELDEN</span> <span class="hdr-platz"></span>');
  });

  test('der Hinweis liegt in .hdr-platz, auch wenn sich der Bildschirm neu zeichnet', () => {
    const state = createNewGameState();
    const k = new Kopfzeile();
    kopfzeilen = [k];
    kopf.zeigeKopfHinweis('✔ Kraft-Brot backen fertig (Kräuterküche)');
    expect(k.hinweis?.textContent).toBe('✔ Kraft-Brot backen fertig (Kräuterküche)');
    expect(k.klassen.has('hdr-mit-hinweis')).toBe(true);
    expect(mitte(kopf.renderHeader(state, 'main', 'HELDEN'))).toContain('<span class="hdr-cur">HELDEN</span> '
      + '<span class="hdr-platz"><span class="hdr-note" role="status">✔ Kraft-Brot backen fertig (Kräuterküche)</span></span>');

    vi.runAllTimers();
    expect(k.hinweis).toBeNull();
    expect(k.klassen.has('hdr-mit-hinweis')).toBe(false);
    expect(mitte(kopf.renderHeader(state, 'main', 'HELDEN'))).toContain('<span class="hdr-platz"></span>');
  });
});

describe('lange Hinweise und zwei nebeneinander liegen früher über Logo und Name', () => {
  test('bis 60 Zeichen .hdr-note, bis 90 dazu .hdr-note-lang, länger .hdr-note-sehr-lang, auch beim Neuzeichnen', () => {
    const state = createNewGameState();
    const k = new Kopfzeile();
    kopfzeilen = [k];
    // Der längste fertige Auftrag einer Werkstatt: 55 Zeichen, zwei Zeilen ab 158 px
    const kurz = '✔ Magitech-Komponente herstellen fertig (Arkanschmiede)';
    kopf.zeigeKopfHinweis(kurz);
    expect(k.hinweis?.className).toBe('hdr-note');
    vi.runAllTimers();
    const klasse = (laenge: number) => {
      kopf.zeigeKopfHinweis('x'.repeat(laenge));
      const c = k.hinweis?.className;
      vi.runAllTimers();
      return c;
    };
    expect(klasse(60)).toBe('hdr-note');
    expect(klasse(61)).toBe('hdr-note hdr-note-lang');
    expect(klasse(90)).toBe('hdr-note hdr-note-lang');
    expect(klasse(91)).toBe('hdr-note hdr-note-sehr-lang');

    // Der breiteste Zettel in der Kopfzeile (dorthin kommen nur Lieferungen): 83 Zeichen, zwei Zeilen ab 203 px
    const zettel = '📜 Schwerter für die Rekruten erledigt: +2 Siegel · +40 Gold · Tagesbonus +3 Siegel';
    kopf.zeigeKopfHinweis(zettel);
    expect(k.hinweis?.className).toBe('hdr-note hdr-note-lang');
    expect(kopf.renderHeader(state, 'gildenhaus', 'GILDENHAUS')).toContain(`<span class="hdr-note hdr-note-lang" role="status">${zettel}</span>`);
  });

  test('zwei Hinweise kurz nacheinander: .hdr-note-sehr-lang, auch wenn sie zusammen kurz sind', () => {
    const state = createNewGameState();
    const k = new Kopfzeile();
    kopfzeilen = [k];
    kopf.zeigeKopfHinweis('📜 Kuchen für alle erledigt: +2 Siegel · +45 Gold');
    expect(k.hinweis?.className).toBe('hdr-note');
    kopf.zeigeKopfHinweis('🏅 Erfolg: Dorf');
    expect(k.hinweis?.textContent).toBe('📜 Kuchen für alle erledigt: +2 Siegel · +45 Gold · 🏅 Erfolg: Dorf');
    expect(k.hinweis?.className).toBe('hdr-note hdr-note-sehr-lang');
    vi.runAllTimers();

    // 60 Zeichen, aber mit dem langen Wort in der zweiten Hälfte brauchen sie 185 px für zwei Zeilen
    kopf.zeigeKopfHinweis('⚒️ +12 Festungseisen');
    kopf.zeigeKopfHinweis('✦ Kommandantenharnisch liegt im Lager');
    expect(k.hinweis?.textContent).toHaveLength(60);
    expect(k.hinweis?.className).toBe('hdr-note hdr-note-sehr-lang');
    expect(kopf.renderHeader(state, 'gildenhaus', 'GILDENHAUS'))
      .toContain('<span class="hdr-note hdr-note-sehr-lang" role="status">⚒️ +12 Festungseisen · ✦ Kommandantenharnisch liegt im Lager</span>');
  });
});
