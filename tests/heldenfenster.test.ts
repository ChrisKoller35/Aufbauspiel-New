import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { ITEM_DEFS } from '../src/data/items';
import { CLASS_DEFS } from '../src/data/classes';
import { wegeDerKlasse } from '../src/data/spezialisierungen';
import { materialFuerTeil, schmiedeStufe } from '../src/systems/Schmiede';
import { buildInventoryHtml, initHeroesScreen, renderHeroCard } from '../src/ui/screens/HeroesScreen';

// Heldenseite und Heldenfenster ohne Browser: das HTML der Karten und des Inventars (Tastatur, Vorleseprogramme),
// dazu unten das Fenster in einem kleinen DOM (Tastenhörer, Doppelklick, Sperren, Fokus). Tab im Fenster,
// Scrollen und die Anordnung brauchen einen Browser.

const GRUND = { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 1, critChance: 0.05, critMult: 1.5 };

function held(classId: string, name: string, stufe = 5): GuildFighter {
  const f = createGuildFighter(classId, name, { ...GRUND });
  f.level = stufe;
  return f;
}

/** Ein Tag; ein > in Anführungszeichen (Wert eines Attributs) beendet ihn nicht */
const TAG = String.raw`(?:[^>"]|"[^"]*")*>`;

/** Öffnende Tags aller Knöpfe */
function knoepfe(html: string): string[] {
  return [...html.matchAll(new RegExp(String.raw`<button\b` + TAG, 'g'))].map(m => m[0]);
}

/** Wie tief Knöpfe ineinander stecken (1: keiner in einem anderen) */
function knopfTiefe(html: string): number {
  let tiefe = 0;
  let max = 0;
  for (const [tag] of html.matchAll(new RegExp(String.raw`<\/?button\b` + TAG, 'g'))) {
    tiefe += tag.startsWith('</') ? -1 : 1;
    max = Math.max(max, tiefe);
  }
  return max;
}

describe('Heldenkarte: Knopf für die Tastatur', () => {
  // guardian: Karte mit Bild; eine Klasse ohne Bild bekommt die Karte mit Sprite
  for (const classId of ['guardian', 'ohne_bild']) {
    test(`${classId}: leerer Knopf vorne in der Karte, TRAINIEREN daneben und nicht darin`, () => {
      const html = renderHeroCard(held(classId, 'Brom'), 'train');
      const k = knoepfe(html);
      expect(k).toHaveLength(2);
      expect(k[0]).toContain('class="hcard-oeffnen"');
      expect(k[0]).toContain('type="button"');
      expect(k[1]).toContain('btn-train');
      // Der Knopf ist leer und das erste Kind der Karte; kein Knopf steckt in einem anderen
      expect(html).toMatch(new RegExp(String.raw`<div class="hcard[^"]*" data-fighter-id="\d+"` + TAG + String.raw`\s*<button type="button" class="hcard-oeffnen"` + TAG + '</button>'));
      expect(knopfTiefe(html)).toBe(1);
    });
  }

  test('ohne TRAINIEREN (Reiter «Meine Helden») nur der Knopf zum Öffnen', () => {
    const k = knoepfe(renderHeroCard(held('ranger', 'Lia'), 'my'));
    expect(k).toHaveLength(1);
    expect(k[0]).toContain('hcard-oeffnen');
  });

  test('Name: Held, Klasse und Stufe, mit maskiertem Namen', () => {
    const html = renderHeroCard(held('guardian', 'Mia "die <Flinke>" & Co', 12), 'my');
    expect(knoepfe(html)[0]).toContain(`aria-label="Heldenfenster: Mia &quot;die &lt;Flinke>&quot; &amp; Co, ${CLASS_DEFS.guardian.name}, Stufe 12"`);
  });
});

describe('Heldenfenster: Inventar als Knöpfe', () => {
  // Zwei Gegenstände für verschiedene Plätze, einer doppelt
  const ausruestung = Object.entries(ITEM_DEFS).filter(([, d]) => d.type === 'gear' && d.gearSlot);
  const [a, b] = [ausruestung[0][0], ausruestung.find(([, d]) => d.gearSlot !== ausruestung[0][1].gearSlot)![0]];

  function stand(): GuildFighter {
    const state = createNewGameState();
    const f = held('guardian', 'Brom');
    state.fighters.push(f);
    // Nur diese zwei (ein neues Spiel hat schon eine Robe im Lager)
    for (const id of Object.keys(state.globalStock)) if (ITEM_DEFS[id]?.type === 'gear') delete state.globalStock[id];
    state.globalStock[a] = 2;
    state.globalStock[b] = 1;
    initHeroesScreen(state);
    return f;
  }

  test('offen: jeder Gegenstand ist ein Knopf mit Namen (und Anzahl), ohne Text im Bild', () => {
    const html = buildInventoryHtml(stand(), true);
    const k = knoepfe(html);
    expect(k).toHaveLength(2);
    expect(html).not.toContain('<div class="hdm2-inv-slot');
    for (const tag of k) {
      expect(tag).toContain('type="button"');
      expect(tag).toContain('class="hdm2-inv-slot');
      expect(tag).toContain('aria-pressed="false"');
      expect(tag).not.toContain('disabled');
    }
    expect(html).toContain(`aria-label="${ITEM_DEFS[a].name}, 2 Stück"`);
    expect(html).toContain(`aria-label="${ITEM_DEFS[b].name}"`);
    expect(html.match(/<img [^>]*alt=""/g)).toHaveLength(2);
  });

  test('zu: alle Knöpfe gesperrt, damit Tab im Fenster sie überspringt', () => {
    const k = knoepfe(buildInventoryHtml(stand(), false));
    expect(k).toHaveLength(2);
    for (const tag of k) expect(tag).toMatch(/ disabled>$/);
  });
});

// ─── Das Heldenfenster in einem kleinen DOM ─────────────────────
// Elemente aus dem HTML (Tags, Attribute, Verschachtelung; Text fällt weg), einfache Selektoren (Tag, #id,
// .klasse, [attr], [attr="wert"], :not(…), Nachfahren) und Hörer. Ein Klick kommt wie im Browser erst bei window
// an (Capture: Dort schluckt schluckeZweitenKlick den zweiten eines Doppelklicks), dann am Ziel und seinen Eltern.

/** Elemente ohne End-Tag */
const OHNE_ENDE = new Set(['img', 'br', 'input', 'hr', 'meta', 'link', 'source', 'wbr']);

interface Ereignis {
  type: string; detail: number; timeStamp: number; target: Knoten; currentTarget: Knoten | null;
  defaultPrevented: boolean; preventDefault: () => void; stopPropagation: () => void;
}

/** Die Seite (#app), in die HeroesScreen zeichnet; was nicht darin hängt, ist nicht mehr in der Seite */
let seite: Knoten;
/** Das Element mit dem Fokus */
let fokus: Knoten | null = null;

class Knoten {
  kinder: Knoten[] = [];
  eltern: Knoten | null = null;
  attrs = new Map<string, string>();
  style: Record<string, string> = {};
  scrollTop = 0;
  /** Das HTML, aus dem die Kinder gebaut sind */
  html = '';
  private hoerer = new Map<string, ((e: Ereignis) => void)[]>();
  constructor(readonly tagName: string) {}

  get id(): string { return this.attrs.get('id') ?? ''; }
  set id(v: string) { this.attrs.set('id', v); }
  set className(v: string) { this.attrs.set('class', v); }
  get klassen(): string[] { return (this.attrs.get('class') ?? '').split(/\s+/).filter(Boolean); }
  readonly classList = {
    add: (k: string): void => { this.classList.toggle(k, true); },
    contains: (k: string): boolean => this.klassen.includes(k),
    toggle: (k: string, an = !this.klassen.includes(k)): void => {
      this.attrs.set('class', [...this.klassen.filter(x => x !== k), ...(an ? [k] : [])].join(' '));
    },
  };
  get dataset(): Record<string, string> {
    const d: Record<string, string> = {};
    for (const [n, v] of this.attrs) if (n.startsWith('data-')) d[kamel(n.slice(5))] = v;
    return d;
  }
  getAttribute(n: string): string | null { return this.attrs.get(n) ?? null; }
  setAttribute(n: string, v: string): void { this.attrs.set(n, String(v)); }
  hasAttribute(n: string): boolean { return this.attrs.has(n); }
  get disabled(): boolean { return this.attrs.has('disabled'); }
  set disabled(v: boolean) { if (v) this.attrs.set('disabled', ''); else this.attrs.delete('disabled'); }
  set tabIndex(v: number) { this.attrs.set('tabindex', String(v)); }
  get firstElementChild(): Knoten | null { return this.kinder[0] ?? null; }
  get isConnected(): boolean {
    let k: Knoten = this;
    while (k.eltern) k = k.eltern;
    return k === seite;
  }
  getClientRects(): object[] { return [{}]; }
  focus(): void { fokus = this; }
  scrollIntoView(): void {}

  addEventListener(typ: string, f: (e: Ereignis) => void): void {
    this.hoerer.set(typ, [...(this.hoerer.get(typ) ?? []), f]);
  }
  /** Ruft die eigenen Hörer für ein Ereignis auf, das hier vorbeikommt */
  rufe(e: Ereignis): void {
    e.currentTarget = this;
    for (const f of this.hoerer.get(e.type) ?? []) f(e);
  }

  appendChild(k: Knoten): Knoten {
    k.remove();
    k.eltern = this;
    this.kinder.push(k);
    return k;
  }
  remove(): void {
    if (!this.eltern) return;
    this.eltern.kinder = this.eltern.kinder.filter(k => k !== this);
    this.eltern = null;
  }
  set innerHTML(html: string) {
    this.html = html;
    this.kinder = [];
    baue(this, html);
  }
  *nachfahren(): Generator<Knoten> {
    for (const k of this.kinder) {
      yield k;
      yield* k.nachfahren();
    }
  }
  querySelectorAll(sel: string): Knoten[] { return [...this.nachfahren()].filter(k => passt(k, sel)); }
  querySelector(sel: string): Knoten | null { return this.querySelectorAll(sel)[0] ?? null; }
  closest(sel: string): Knoten | null {
    for (let k: Knoten | null = this; k; k = k.eltern) if (passt(k, sel)) return k;
    return null;
  }
}
/** Knöpfe: fokussiere (HeroesScreen) fragt nach HTMLButtonElement */
class Knopf extends Knoten {}

/** «data-weg-ja» → «wegJa» (dataset), «background-image» → «backgroundImage» (style) */
function kamel(s: string): string {
  return s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
}

function entschluesseln(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Baut die Elemente aus dem HTML unter `wurzel` */
function baue(wurzel: Knoten, html: string): void {
  const stapel = [wurzel];
  for (const [, zu, name, rest] of html.matchAll(/<(\/?)([a-z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const tag = name.toLowerCase();
    if (zu) {
      const i = stapel.map(k => k.tagName).lastIndexOf(tag);
      if (i > 0) stapel.length = i;
      continue;
    }
    const k = tag === 'button' ? new Knopf(tag) : new Knoten(tag);
    for (const [, n, w] of rest.matchAll(/([^\s=/]+)(?:\s*=\s*"([^"]*)")?/g)) {
      k.attrs.set(n.toLowerCase(), entschluesseln(w ?? ''));
    }
    for (const [, n, w] of (k.attrs.get('style') ?? '').matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) k.style[kamel(n)] = w.trim();
    stapel[stapel.length - 1].appendChild(k);
    if (!OHNE_ENDE.has(tag)) stapel.push(k);
  }
}

/** Ein Teil eines Selektors ohne Leerzeichen: Tag, #id, .klasse, [attr], [attr="wert"], :not(…) */
function passtTeil(k: Knoten, teil: string): boolean {
  const tag = /^[a-z][\w-]*/i.exec(teil);
  if (tag && k.tagName !== tag[0].toLowerCase()) return false;
  for (const m of teil.matchAll(/#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]|:not\(([^)]*)\)/g)) {
    if (m[1] !== undefined && k.id !== m[1]) return false;
    if (m[2] !== undefined && !k.klassen.includes(m[2])) return false;
    if (m[3] !== undefined && (!k.attrs.has(m[3]) || (m[4] !== undefined && k.attrs.get(m[3]) !== m[4]))) return false;
    if (m[5] !== undefined && passtTeil(k, m[5])) return false;
  }
  return true;
}

/** Selektor mit Nachfahren («#s-heroes .hcard .hcard-oeffnen»): der letzte Teil am Element, die anderen darüber */
function passt(k: Knoten, sel: string): boolean {
  const teile = sel.trim().split(/\s+/);
  if (!passtTeil(k, teile[teile.length - 1])) return false;
  let i = teile.length - 2;
  for (let e = k.eltern; e && i >= 0; e = e.eltern) if (passtTeil(e, teile[i])) i--;
  return i < 0;
}

/** window wie im Browser: Node meldet einen Hörer mit «true» (Capture) sonst nicht ab. Zählt die Tastenhörer */
class Fenster extends EventTarget {
  innerWidth = 1280;
  tastenHoerer = new Set<unknown>();
  setTimeout = (f: () => void, ms: number): unknown => globalThis.setTimeout(f, ms);
  clearTimeout = (t: ReturnType<typeof globalThis.setTimeout>): void => globalThis.clearTimeout(t);
  addEventListener(typ: string, f: EventListenerOrEventListenerObject | null, o?: boolean | AddEventListenerOptions): void {
    if (typ === 'keydown') this.tastenHoerer.add(f);
    super.addEventListener(typ, f, typeof o === 'boolean' ? { capture: o } : o);
  }
  removeEventListener(typ: string, f: EventListenerOrEventListenerObject | null, o?: boolean | EventListenerOptions): void {
    if (typ === 'keydown') this.tastenHoerer.delete(f);
    super.removeEventListener(typ, f, typeof o === 'boolean' ? { capture: o } : o);
  }
}

describe('Heldenfenster im kleinen DOM: Tastenhörer, Doppelklick und Sperren', () => {
  let fenster: Fenster;
  /** Eigenschaften, die das Fenster auf <html> setzt (Rand für den Scrollbalken) */
  let htmlStil: Map<string, string>;
  let gespeichert = 0;
  const RUESTUNG = 'set_lichtung_platte';
  const SCHWERT = 'iron_sword';

  beforeEach(() => {
    vi.useFakeTimers();
    fenster = new Fenster();
    htmlStil = new Map();
    gespeichert = 0;
    fokus = null;
    fenster.addEventListener('mc:speichern', () => { gespeichert++; });
    vi.stubGlobal('window', fenster);
    // Klassischer Scrollbalken: 15 px schmaler als das Fenster
    vi.stubGlobal('document', {
      createElement: (tag: string) => new Knoten(tag),
      getElementById: (id: string) => seite.querySelector(`#${id}`),
      querySelectorAll: () => [],
      addEventListener: () => {},
      documentElement: { clientWidth: 1265, style: { setProperty: (n: string, v: string) => { htmlStil.set(n, v); } } },
    });
    vi.stubGlobal('HTMLButtonElement', Knopf);
  });
  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Ein Guardian auf Stufe 12 ohne Weg, mit Set-Rüstung; im Lager ein Schwert, die Rüstung doppelt, Material genug */
  function stand(): { state: GameState; held: GuildFighter } {
    const state = createNewGameState();
    const f = held('guardian', 'Brom', 12);
    f.gear.armor = RUESTUNG;
    state.fighters.push(f);
    state.globalStock[SCHWERT] = 1;
    state.globalStock[RUESTUNG] = 1;
    state.globalStock[materialFuerTeil(RUESTUNG)!.id] = 1000;
    state.globalStock.gold = 100000;
    state.globalStock.crystal_shard = 1000;
    return { state, held: f };
  }

  /** Die Heldenseite frisch geladen (Auswahl, Sperren und Reiter stehen im Modul), Reiter «Meine Helden» */
  async function heldenseite(state: GameState) {
    vi.resetModules();
    const hs = await import('../src/ui/screens/HeroesScreen');
    hs.initHeroesScreen(state);
    seite = new Knoten('div');
    hs.renderHeroesScreen(seite as unknown as HTMLElement);
    return hs;
  }

  /** Ein Element in der Seite (es muss da sein) */
  function el(sel: string): Knoten {
    const k = seite.querySelector(sel);
    if (!k) throw new Error(`Nicht in der Seite: ${sel}`);
    return k;
  }

  function sende(ziel: Knoten, type: string, detail: number, zeit: number): void {
    const e: Ereignis = {
      type, detail, timeStamp: zeit, target: ziel, currentTarget: null, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() {},
    };
    for (let k: Knoten | null = ziel; k; k = k.eltern) k.rufe(e);
  }

  /**
   * Ein Klick (detail 2: der zweite eines Doppelklicks), gedrückt zur Zeit gedrueckt (e.timeStamp; sonst jetzt).
   * Gesperrte Knöpfe nehmen keinen an
   */
  function klick(sel: string | Knoten, detail = 1, gedrueckt = performance.now()): void {
    const ziel = typeof sel === 'string' ? el(sel) : sel;
    if (ziel.disabled) return;
    sende(ziel, 'pointerdown', detail, gedrueckt);
    fenster.dispatchEvent(new CustomEvent('mousedown', { detail, cancelable: true }));
    const e = new CustomEvent('click', { detail, cancelable: true });
    fenster.dispatchEvent(e);
    if (!e.defaultPrevented) sende(ziel, 'click', detail, gedrueckt);
  }

  /** Würde window den zweiten Klick eines Doppelklicks jetzt schlucken? */
  function schlucktZweitenKlick(): boolean {
    const e = new CustomEvent('click', { detail: 2, cancelable: true });
    fenster.dispatchEvent(e);
    return e.defaultPrevented;
  }

  function taste(key: string): void {
    fenster.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key }));
  }

  /** Klick auf die Karte des Helden, wie Maus und Finger */
  function oeffne(f: GuildFighter): Knoten {
    klick(`#s-heroes .hcard[data-fighter-id="${f.id}"]`);
    return el('#hero-detail-ov');
  }

  test('Plätze, ✕ und Inventar sind Knöpfe mit Namen; beim Öffnen hat der Name des Helden den Fokus', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    const plaetze = seite.querySelectorAll('#hero-detail-ov .hdm-gear-icon[data-slot]');
    expect(plaetze.map(k => k.dataset.slot)).toEqual(['mainHand', 'armor', 'offHand', 'trinket']);
    for (const k of plaetze) {
      expect(k).toBeInstanceOf(Knopf);
      expect(k.getAttribute('type')).toBe('button');
      expect(k.getAttribute('aria-pressed')).toBe('false');
    }
    expect(plaetze.map(k => k.getAttribute('aria-label'))).toEqual([
      'Haupthand: leer', `Rüstung: ${ITEM_DEFS[RUESTUNG].name}`, 'Nebenhand: leer', 'Talisman: leer',
    ]);
    expect(el('#hero-detail-close').getAttribute('aria-label')).toBe('Schliessen');
    expect(el('#hero-detail-ov .hdm2-outer').getAttribute('role')).toBe('dialog');
    expect(fokus).toBe(el('#hdm2-name'));
    // Kein Knopf steckt in einem anderen; Platz antippen: gedrückt
    expect(seite.querySelectorAll('button button')).toHaveLength(0);
    klick('#hero-detail-ov .hdm-gear-icon[data-slot="armor"]');
    expect(el('#hero-detail-ov .hdm-gear-icon[data-slot="armor"]').getAttribute('aria-pressed')).toBe('true');
    expect(fokus).toBe(el('#hero-detail-ov .hdm-gear-icon[data-slot="armor"]'));
  });

  test('ein Tastenhörer, solange das Fenster offen ist (auch nach 20× Neuzeichnen), danach keiner, wie es auch zugeht', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    const karte = `#s-heroes .hcard[data-fighter-id="${f.id}"] .hcard-oeffnen`;

    oeffne(f);
    expect(fenster.tastenHoerer.size).toBe(1);
    // Der Scrollbalken der Seite verschwindet, solange das Fenster offen ist: so breit bleibt ein Rand
    expect(htmlStil.get('--hdm2-balken')).toBe('15px');
    for (let i = 0; i < 20; i++) {
      klick('#hero-detail-ov .hdm-gear-icon[data-slot="mainHand"]');
      vi.advanceTimersByTime(800);
    }
    expect(seite.querySelectorAll('#hero-detail-ov')).toHaveLength(1);
    expect(fenster.tastenHoerer.size).toBe(1);

    taste('Escape');
    expect(seite.querySelector('#hero-detail-ov')).toBeNull();
    expect(fenster.tastenHoerer.size).toBe(0);
    expect(fokus).toBe(el(karte));

    vi.advanceTimersByTime(800);
    oeffne(f);
    klick('#hero-detail-close');
    expect(seite.querySelector('#hero-detail-ov')).toBeNull();
    expect(fenster.tastenHoerer.size).toBe(0);
    expect(fokus).toBe(el(karte));

    vi.advanceTimersByTime(800);
    klick(oeffne(f));
    expect(seite.querySelector('#hero-detail-ov')).toBeNull();
    expect(fenster.tastenHoerer.size).toBe(0);

    vi.advanceTimersByTime(800);
    oeffne(f);
    klick('#hero-detail-ov .hdm-gear-icon[data-slot="armor"]');
    klick(`#hero-detail-ov [data-schmiede-teil="${RUESTUNG}"]`);
    expect(seite.querySelector('#hero-detail-ov')).toBeNull();
    expect(fenster.tastenHoerer.size).toBe(0);
    expect(fokus).toBe(el(`#s-heroes [data-teil="${RUESTUNG}"]`));
  });

  test('«‹Weg› wählen» stellt nur die Frage; «Ja, für immer» nimmt nur einen eigenen Klick nach der Sperre an', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    const [phalanx] = wegeDerKlasse('guardian');
    oeffne(f);
    vi.advanceTimersByTime(800);

    const gefragt = performance.now();
    klick(`#hero-detail-ov [data-weg-waehlen="${phalanx.id}"]`);
    expect(el('#hero-detail-ov [data-weg-ja]').dataset.wegJa).toBe(phalanx.id);
    expect(fokus).toBe(el('#hero-detail-ov .hdm2-weg-frage'));
    // Der zweite Klick eines Doppelklicks (Doppeltipp) trifft nichts, ein langsamer zweiter Druck nicht «Ja»
    expect(schlucktZweitenKlick()).toBe(true);
    klick('#hero-detail-ov [data-weg-ja]', 2);
    vi.advanceTimersByTime(400);
    klick('#hero-detail-ov [data-weg-ja]');
    expect(f.spezialisierung).toBeUndefined();
    // Es zählt, wann gedrückt wurde: nach 700 ms, auch wenn das Spiel erst nach der Sperre dazu kommt
    vi.advanceTimersByTime(400);
    klick('#hero-detail-ov [data-weg-ja]', 1, gefragt + 700);
    expect(f.spezialisierung).toBeUndefined();
    // Nach der Sperre: der zweite Klick eines Doppelklicks wählt nie, ein eigener schon
    klick('#hero-detail-ov [data-weg-ja]', 2);
    expect(f.spezialisierung).toBeUndefined();
    expect(gespeichert).toBe(0);
    klick('#hero-detail-ov [data-weg-ja]');
    expect(f.spezialisierung).toBe(phalanx.id);
    expect(gespeichert).toBe(1);
    expect(seite.querySelector('#hero-detail-ov [data-weg-waehlen]')).toBeNull();
    expect(fokus).toBe(el('#hero-detail-ov .hdm2-weg-karte.gewaehlt'));
  });

  test('«Abbrechen» wählt nichts und gibt den Fokus an den Knopf des Wegs zurück', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    const [, vergelter] = wegeDerKlasse('guardian');
    oeffne(f);
    vi.advanceTimersByTime(800);
    klick(`#hero-detail-ov [data-weg-waehlen="${vergelter.id}"]`);
    klick('#hero-detail-ov [data-weg-nein]');
    expect(seite.querySelector('#hero-detail-ov [data-weg-ja]')).toBeNull();
    expect(fokus).toBe(el(`#hero-detail-ov [data-weg-waehlen="${vergelter.id}"]`));
    expect(schlucktZweitenKlick()).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(f.spezialisierung).toBeUndefined();
  });

  test('nach ANLEGEN hat der Platz den Fokus, und ABLEGEN nimmt kurz keinen Klick an', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    klick('#hdm2-inv-toggle');
    klick(`#hero-detail-ov .hdm2-inv-slot[data-item-id="${SCHWERT}"]`);
    expect(el('#hero-detail-ov .hdm2-aktion').dataset.aktion).toBe('anlegen');

    const angelegt = performance.now();
    klick('#hero-detail-ov .hdm2-aktion');
    expect(f.gear.mainHand).toBe(SCHWERT);
    const platz = el('#hero-detail-ov .hdm-gear-icon[data-slot="mainHand"]');
    expect(fokus).toBe(platz);
    expect(schlucktZweitenKlick()).toBe(true);
    // Ein langsamer zweiter Druck auf dieselbe Stelle trifft ABLEGEN: Er legt das Teil nicht gleich wieder ab, auch
    // nicht, wenn das Spiel erst nach der Sperre dazu kommt
    expect(el('#hero-detail-ov .hdm2-aktion').dataset.aktion).toBe('ablegen');
    vi.advanceTimersByTime(500);
    klick('#hero-detail-ov .hdm2-aktion');
    expect(f.gear.mainHand).toBe(SCHWERT);
    vi.advanceTimersByTime(300);
    klick('#hero-detail-ov .hdm2-aktion', 1, angelegt + 700);
    expect(f.gear.mainHand).toBe(SCHWERT);
    klick('#hero-detail-ov .hdm2-aktion');
    expect(f.gear.mainHand).toBeNull();
    expect(fokus).toBe(el('#hero-detail-ov .hdm-gear-icon[data-slot="mainHand"]'));
  });

  test('gibt der Browser die Zeit des Drucks nicht passend mit (ab 1970 oder 0), zählt die Sperre ab jetzt', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    klick('#hdm2-inv-toggle');
    klick(`#hero-detail-ov .hdm2-inv-slot[data-item-id="${SCHWERT}"]`);
    klick('#hero-detail-ov .hdm2-aktion');
    expect(f.gear.mainHand).toBe(SCHWERT);
    vi.advanceTimersByTime(500);
    klick('#hero-detail-ov .hdm2-aktion', 1, Date.now());
    klick('#hero-detail-ov .hdm2-aktion', 1, 0);
    expect(f.gear.mainHand).toBe(SCHWERT);
    vi.advanceTimersByTime(300);
    klick('#hero-detail-ov .hdm2-aktion', 1, 0);
    expect(f.gear.mainHand).toBeNull();
  });

  test('Sprung in die Schmiede: «AUF +N» nimmt kurz keinen Klick an, dann schon', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    klick('#hero-detail-ov .hdm-gear-icon[data-slot="armor"]');
    const gesprungen = performance.now();
    klick(`#hero-detail-ov [data-schmiede-teil="${RUESTUNG}"]`);
    expect(schlucktZweitenKlick()).toBe(true);
    vi.advanceTimersByTime(400);
    klick(`#s-heroes [data-schmieden="${RUESTUNG}"]`);
    expect(schmiedeStufe(state, RUESTUNG)).toBe(0);
    vi.advanceTimersByTime(400);
    klick(`#s-heroes [data-schmieden="${RUESTUNG}"]`, 1, gesprungen + 700);
    expect(schmiedeStufe(state, RUESTUNG)).toBe(0);
    klick(`#s-heroes [data-schmieden="${RUESTUNG}"]`);
    expect(schmiedeStufe(state, RUESTUNG)).toBe(1);
    expect(gespeichert).toBe(1);
    // Nach dem Schmieden: wieder kurz keine Stufe, auch nicht mit spät gesehenem Druck
    const geschmiedet = performance.now();
    vi.advanceTimersByTime(500);
    klick(`#s-heroes [data-schmieden="${RUESTUNG}"]`);
    vi.advanceTimersByTime(300);
    klick(`#s-heroes [data-schmieden="${RUESTUNG}"]`, 1, geschmiedet + 700);
    expect(schmiedeStufe(state, RUESTUNG)).toBe(1);
    klick(`#s-heroes [data-schmieden="${RUESTUNG}"]`);
    expect(schmiedeStufe(state, RUESTUNG)).toBe(2);
    expect(gespeichert).toBe(2);
  });

  test('Einschmelzen: Die Frage kommt, «JA, EINSCHMELZEN» zählt erst nach der Sperre und nie als zweiter Klick', async () => {
    const { state } = stand();
    await heldenseite(state);
    klick('#s-heroes .tab[data-tab="schmiede"]');
    vi.advanceTimersByTime(800);

    const gefragt = performance.now();
    klick(`#s-heroes [data-einschmelzen="${RUESTUNG}"]`);
    expect(seite.querySelector(`#s-heroes [data-einschmelzen-ja="${RUESTUNG}"]`)).not.toBeNull();
    expect(schlucktZweitenKlick()).toBe(true);
    vi.advanceTimersByTime(400);
    klick(`#s-heroes [data-einschmelzen-ja="${RUESTUNG}"]`);
    expect(state.globalStock[RUESTUNG]).toBe(1);
    vi.advanceTimersByTime(400);
    klick(`#s-heroes [data-einschmelzen-ja="${RUESTUNG}"]`, 1, gefragt + 700);
    expect(state.globalStock[RUESTUNG]).toBe(1);
    klick(`#s-heroes [data-einschmelzen-ja="${RUESTUNG}"]`, 2);
    expect(state.globalStock[RUESTUNG]).toBe(1);
    klick(`#s-heroes [data-einschmelzen-ja="${RUESTUNG}"]`);
    expect(state.globalStock[RUESTUNG]).toBe(0);
    expect(gespeichert).toBe(1);
  });
});
