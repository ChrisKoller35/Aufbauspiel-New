// Kopfzeile: Platz für den Hinweis hinter dem Namen (.hdr-platz), Klasse für lange Hinweise und für «← Zurück»,
// mit einem kleinen Ersatz für Fenster und Seite (die Tests laufen ohne Browser). Wie die Kopfzeile aussieht und dass
// ein Hinweis nichts verschiebt, prüft der Playwright-Lauf (docs/ERFOLGE.md).
import { describe, test, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { createNewGameState } from '../src/models/GameState';
import type { GameState } from '../src/models/GameState';

// Den Hörer für neue Erfolge abfangen, den die Kopfzeile beim Laden anmeldet
const erfolge = vi.hoisted(() => ({ hoerer: null as null | ((ids: string[], s: GameState, h: boolean) => void) }));
vi.mock('../src/systems/AchievementSystem', async (original) => ({
  ...(await original<typeof import('../src/systems/AchievementSystem')>()),
  beiNeuenErfolgen: (fn: (ids: string[], s: GameState, h: boolean) => void) => { erfolge.hoerer = fn; return () => {}; },
}));

type Hinweis = {
  className: string; textContent: string; attribute: Record<string, string>;
  setAttribute: (n: string, w: string) => void; getAttribute: (n: string) => string | undefined; remove: () => void;
  getBoundingClientRect?: () => { bottom: number };
};

/** Kopfzeile mit .hdr-platz: Dort hinein legt zeigeKopfHinweis den Hinweis */
class Kopfzeile {
  hinweis: Hinweis | null = null;
  /** null: nicht zu sehen (Kampf, Truhe, Bilanz) */
  offsetParent: object | null = {};
  unterkante = 53;
  /** Unterkante des Hinweises in dieser Kopfzeile (er steht in ihrer ersten Zeile, darum höher als ihre Unterkante) */
  hinweisUnterkante = 40;
  getBoundingClientRect() { return { bottom: this.unterkante }; }
  klassen = new Set<string>();
  classList = { add: (k: string) => this.klassen.add(k), remove: (k: string) => this.klassen.delete(k) };
  platz = {
    insertBefore: (n: Hinweis) => {
      this.hinweis = n;
      n.remove = () => { this.hinweis = null; };
      n.getBoundingClientRect = () => ({ bottom: this.hinweisUnterkante });
    },
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
/** Was zeigeKopfHinweis in document.body legt (der schwebende Hinweis) */
let schwebende: Hinweis[] = [];
/** Liegt ein Fenster über der Kopfzeile (.ov.on oder aria-modal)? */
let fensterOffen = false;
type Fenster = { getClientRects: () => object[]; matches: (sel: string) => boolean };
const offenesFenster = (): Fenster => ({ getClientRects: () => [{}], matches: () => false });
/** Versteckt (display: none), etwa das Routenfenster der Dungeonkarte mit aria-modal */
const verstecktesFenster = (): Fenster => ({ getClientRects: () => [], matches: () => false });
/** Truhe nach «Einsammeln»: ohne .on, aber 300 ms lang noch sichtbar und aria-modal */
const ausblendendeTruhe = (): Fenster => ({ getClientRects: () => [{}], matches: sel => sel === '.chest-ov:not(.on)' });
/** Weitere Fenster in DOM-Reihenfolge (fensterOffen legt ein offenes davor) */
let fensterListe: Fenster[] = [];
/** Wie im Browser: alle Treffer in DOM-Reihenfolge, querySelector gibt den ersten */
const alleFenster = (): Fenster[] => (fensterOffen ? [offenesFenster(), ...fensterListe] : fensterListe);
const alleHinweise = () => kopfzeilen.map(k => k.hinweis).filter(Boolean);
const seite = {
  addEventListener: () => {},
  body: { appendChild: (n: Hinweis) => { schwebende.push(n); } },
  querySelector: (sel: string) => {
    if (sel === '.ov.on, [aria-modal="true"]') return alleFenster()[0] ?? null;
    if (sel === '.hdr-note') return alleHinweise()[0] ?? null;
    return null;
  },
  createElement: (): Hinweis => {
    const n: Hinweis = {
      className: '', textContent: '', attribute: {},
      setAttribute: (name, wert) => { n.attribute[name] = wert; },
      getAttribute: name => n.attribute[name],
      remove: () => { schwebende = schwebende.filter(s => s !== n); },
    };
    return n;
  },
  querySelectorAll: (sel: string) => {
    if (sel === '.ov.on, [aria-modal="true"]') return alleFenster();
    if (sel === '.hdr') return kopfzeilen;
    if (sel === '.hdr-note') return alleHinweise();
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

// Jeder Test beginnt ohne Hinweis, ohne Fenster
afterEach(() => { vi.runAllTimers(); fensterOffen = false; fensterListe = []; });

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
    // Der Erfolg steht vorne, sein Name bleibt so auch in den drei Handy-Zeilen
    expect(k.hinweis?.textContent).toBe('🏅 Erfolg: Dorf · 📜 Kuchen für alle erledigt: +2 Siegel · +45 Gold');
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

describe('schwebender Hinweis, wenn die Kopfzeile verdeckt ist', () => {
  const zettel = '📜 Kuchen für alle erledigt: +2 Siegel · +45 Gold';

  test('Kopfzeile sichtbar, kein Fenster: kein schwebender Hinweis, die Kopfzeile wie bisher', () => {
    const k = new Kopfzeile();
    kopfzeilen = [k];
    kopf.zeigeKopfHinweis(zettel);
    expect(schwebende).toEqual([]);
    expect(k.hinweis?.textContent).toBe(zettel);
    expect(k.hinweis?.className).toBe('hdr-note');
  });

  test('Fenster offen: genau ein schwebender Hinweis mit demselben Text, stumm für Vorleser, nach Ablauf weg', () => {
    const k = new Kopfzeile();
    kopfzeilen = [k];
    fensterOffen = true;
    kopf.zeigeKopfHinweis(zettel);
    expect(schwebende).toHaveLength(1);
    expect(schwebende[0].className).toBe('hdr-note-schwebend');
    expect(schwebende[0].textContent).toBe(zettel);
    expect(schwebende[0].getAttribute('aria-hidden')).toBe('true');
    expect(k.hinweis?.textContent).toBe(zettel);
    vi.runAllTimers();
    expect(schwebende).toEqual([]);
    expect(k.hinweis).toBeNull();
  });

  test('Kopfzeile weggescrollt: schwebender Hinweis', () => {
    const k = new Kopfzeile();
    k.unterkante = -10;
    k.hinweisUnterkante = -23;
    kopfzeilen = [k];
    kopf.zeigeKopfHinweis(zettel);
    expect(schwebende.map(s => s.textContent)).toEqual([zettel]);
  });

  test('keine sichtbare Kopfzeile (Kampf): kein Hinweis, nichts im body, der Erfolg wartet', () => {
    const k = new Kopfzeile();
    k.offsetParent = null;
    kopfzeilen = [k];
    fensterOffen = true;
    expect(erfolge.hoerer).not.toBeNull();
    erfolge.hoerer?.(['dorf'], createNewGameState(), true);
    expect(k.hinweis).toBeNull();
    expect(schwebende).toEqual([]);
    // Den wartenden Erfolg nicht in die nächsten Tests mitnehmen (auf dem Erfolge-Bildschirm kommt kein Hinweis)
    fenster.dispatchEvent(Object.assign(new Event('mc:navigate'), { detail: { screen: 'achievements' } }));
    vi.runAllTimers();
    expect(k.hinweis).toBeNull();
  });

  test('zwei Hinweise kurz nacheinander bei offenem Fenster: weiterhin einer, der Erfolg vorne', () => {
    const k = new Kopfzeile();
    kopfzeilen = [k];
    fensterOffen = true;
    kopf.zeigeKopfHinweis(zettel);
    const erster = schwebende[0];
    // Fenster inzwischen zu: Der schwebende Hinweis bleibt bis zum Ablauf stehen (kein Flackern)
    fensterOffen = false;
    vi.advanceTimersByTime(300);
    kopf.zeigeKopfHinweis('🏅 Erfolg: Dorf');
    const text = '🏅 Erfolg: Dorf · 📜 Kuchen für alle erledigt: +2 Siegel · +45 Gold';
    expect(schwebende).toHaveLength(1);
    expect(schwebende[0]).toBe(erster);
    expect(schwebende[0].textContent).toBe(text);
    expect(k.hinweis?.textContent).toBe(text);
    expect(k.hinweis?.className).toBe('hdr-note hdr-note-sehr-lang');
    vi.runAllTimers();
    expect(schwebende).toEqual([]);
  });

  test('verstecktes Fenster vor dem offenen (Routenfenster der Dungeonkarte): schwebender Hinweis', () => {
    kopfzeilen = [new Kopfzeile()];
    fensterListe = [verstecktesFenster(), offenesFenster()];
    kopf.zeigeKopfHinweis(zettel);
    expect(schwebende.map(s => s.textContent)).toEqual([zettel]);
  });

  test('Truhe blendet nach «Einsammeln» aus: kein schwebender Hinweis', () => {
    kopfzeilen = [new Kopfzeile()];
    fensterListe = [verstecktesFenster(), ausblendendeTruhe()];
    kopf.zeigeKopfHinweis(zettel);
    expect(schwebende).toEqual([]);
  });

  test('Kopfzeile halb weggescrollt, ihr Hinweis schon weg: schwebender Hinweis', () => {
    const k = new Kopfzeile();
    k.unterkante = 20;
    k.hinweisUnterkante = -2;
    kopfzeilen = [k];
    kopf.zeigeKopfHinweis(zettel);
    expect(schwebende.map(s => s.textContent)).toEqual([zettel]);
  });

  test('versteckte Kopfzeile mit Hinweis (Lage 0) vor der sichtbaren, nichts gescrollt: kein schwebender Hinweis', () => {
    const versteckt = new Kopfzeile();
    versteckt.offsetParent = null;
    versteckt.unterkante = 0;
    versteckt.hinweisUnterkante = 0;
    kopfzeilen = [versteckt, new Kopfzeile()];
    kopf.zeigeKopfHinweis(zettel);
    expect(schwebende).toEqual([]);
  });

  test.each([
    ['Kopfzeile wieder frei', false],
    ['keine sichtbare Kopfzeile mehr (Kampf)', true],
  ])('Fenster zu, später ein neuer Hinweis, %s: der schwebende ist gleich weg', (_, kampf) => {
    const k = new Kopfzeile();
    kopfzeilen = [k];
    fensterOffen = true;
    kopf.zeigeKopfHinweis(zettel);
    expect(schwebende).toHaveLength(1);
    fensterOffen = false;
    if (kampf) k.offsetParent = null;
    vi.advanceTimersByTime(700);
    const zweiter = '✔ Kraft-Brot fertig (Kräuterküche)';
    kopf.zeigeKopfHinweis(zweiter);
    expect(schwebende).toEqual([]);
    expect(k.hinweis?.textContent).toBe(zweiter);
  });
});
