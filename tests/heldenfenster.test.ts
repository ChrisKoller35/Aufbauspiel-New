import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { ITEM_DEFS } from '../src/data/items';
import { CLASS_DEFS } from '../src/data/classes';
import { wegeDerKlasse } from '../src/data/spezialisierungen';
import { materialFuerTeil, schmiedeStufe } from '../src/systems/Schmiede';
import { totalXpForLevel } from '../src/systems/HeroProgression';
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
// .klasse, [attr], [attr="wert"], :not(…), :disabled, Nachfahren, Listen mit Komma) und Hörer. Ein Klick kommt wie
// im Browser erst bei window an (Capture: Dort schluckt schluckeZweitenKlick den zweiten eines Doppelklicks), dann
// von oben bis zum Ziel bei den Hörern der Capture-Phase (pruefeZweitenDruck), dann am Ziel und seinen Eltern.

/** Elemente ohne End-Tag */
const OHNE_ENDE = new Set(['img', 'br', 'input', 'hr', 'meta', 'link', 'source', 'wbr']);

interface Ereignis {
  type: string; detail: number; timeStamp: number; clientX: number; clientY: number; pointerType: string;
  target: Knoten; currentTarget: Knoten | null; defaultPrevented: boolean;
  /** stopPropagation: keine weiteren Elemente; stopImmediatePropagation: auch keine weiteren Hörer hier */
  gestoppt: boolean; ganzGestoppt: boolean;
  preventDefault: () => void; stopPropagation: () => void; stopImmediatePropagation: () => void;
}

/** Wo gedrückt wird (wie clientX und clientY) und womit (pointerType; ohne Angabe ein Finger) */
interface Ort { x: number; y: number; art?: 'mouse' | 'touch' }

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
  /** Womit scrollIntoView aufgerufen wurde */
  gescrollt: unknown[] = [];
  private hoerer = new Map<string, ((e: Ereignis) => void)[]>();
  /** Hörer der Capture-Phase (addEventListener mit true) */
  private fangHoerer = new Map<string, ((e: Ereignis) => void)[]>();
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
  get attributes(): { name: string; value: string }[] {
    return [...this.attrs].map(([name, value]) => ({ name, value }));
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
  scrollIntoView(o?: unknown): void { this.gescrollt.push(o); }

  addEventListener(typ: string, f: (e: Ereignis) => void, capture?: boolean): void {
    const liste = capture ? this.fangHoerer : this.hoerer;
    liste.set(typ, [...(liste.get(typ) ?? []), f]);
  }
  /** Ruft die eigenen Hörer für ein Ereignis auf, das hier vorbeikommt (fangen: die der Capture-Phase) */
  rufe(e: Ereignis, fangen = false): void {
    e.currentTarget = this;
    for (const f of (fangen ? this.fangHoerer : this.hoerer).get(e.type) ?? []) {
      if (e.ganzGestoppt) return;
      f(e);
    }
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

/** Ein Teil eines Selektors ohne Leerzeichen: Tag, #id, .klasse, [attr], [attr="wert"], :not(…), :disabled */
function passtTeil(k: Knoten, teil: string): boolean {
  const tag = /^[a-z][\w-]*/i.exec(teil);
  if (tag && k.tagName !== tag[0].toLowerCase()) return false;
  for (const m of teil.matchAll(/#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]|:not\(([^)]*)\)|(:disabled)/g)) {
    if (m[1] !== undefined && k.id !== m[1]) return false;
    if (m[2] !== undefined && !k.klassen.includes(m[2])) return false;
    if (m[3] !== undefined && (!k.attrs.has(m[3]) || (m[4] !== undefined && k.attrs.get(m[3]) !== m[4]))) return false;
    if (m[5] !== undefined && passtTeil(k, m[5])) return false;
    if (m[6] !== undefined && !k.disabled) return false;
  }
  return true;
}

/**
 * Selektor mit Nachfahren («#s-heroes .hcard .hcard-oeffnen»): der letzte Teil am Element, die anderen darüber.
 * Eine Liste mit Komma («button, .hcard») passt, wenn einer ihrer Selektoren passt
 */
function passt(k: Knoten, sel: string): boolean {
  if (sel.includes(',')) return sel.split(',').some(s => passt(k, s));
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
    // Klassischer Scrollbalken: 15 px schmaler als das Fenster. Solange das Heldenfenster offen ist, scrollt die Seite
    // nicht und hat keinen (magic-city.css)
    vi.stubGlobal('document', {
      createElement: (tag: string) => new Knoten(tag),
      getElementById: (id: string) => seite.querySelector(`#${id}`),
      querySelectorAll: () => [],
      addEventListener: () => {},
      documentElement: {
        get clientWidth() { return seite.querySelector('#hero-detail-ov') ? fenster.innerWidth : fenster.innerWidth - 15; },
        style: { setProperty: (n: string, v: string) => { htmlStil.set(n, v); } },
      },
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

  /** Wie im Browser: erst die Capture-Hörer von oben bis zum Ziel (dort zuerst), dann vom Ziel nach oben */
  function sende(ziel: Knoten, type: string, detail: number, zeit: number, ort: Ort): void {
    const e: Ereignis = {
      type, detail, timeStamp: zeit, clientX: ort.x, clientY: ort.y, pointerType: ort.art ?? 'touch',
      target: ziel, currentTarget: null, defaultPrevented: false, gestoppt: false, ganzGestoppt: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.gestoppt = true; },
      stopImmediatePropagation() { this.gestoppt = this.ganzGestoppt = true; },
    };
    const pfad: Knoten[] = [];
    for (let k: Knoten | null = ziel; k; k = k.eltern) pfad.push(k);
    for (const k of [...pfad].reverse()) {
      if (e.gestoppt) return;
      k.rufe(e, true);
    }
    for (const k of pfad) {
      if (e.gestoppt) return;
      k.rufe(e);
    }
  }

  /** Jeder Klick ohne Ort landet weit weg vom letzten: So prüft pruefeZweitenDruck nur, wo ein Test es will */
  let naechsterOrt = 0;
  function woanders(): Ort {
    naechsterOrt += 1000;
    return { x: naechsterOrt, y: 0 };
  }

  /**
   * Ein Klick (detail 2: der zweite eines Doppelklicks; 0: Enter oder Leertaste), gedrückt zur Zeit gedrueckt
   * (e.timeStamp; sonst jetzt) am Ort `ort`. Gesperrte Knöpfe nehmen keinen an
   */
  function klick(sel: string | Knoten, detail = 1, gedrueckt = performance.now(), ort: Ort = woanders()): void {
    const ziel = typeof sel === 'string' ? el(sel) : sel;
    if (ziel.disabled) return;
    sende(ziel, 'pointerdown', detail, gedrueckt, ort);
    fenster.dispatchEvent(new CustomEvent('mousedown', { detail, cancelable: true }));
    const e = new CustomEvent('click', { detail, cancelable: true });
    fenster.dispatchEvent(e);
    if (!e.defaultPrevented) sende(ziel, 'click', detail, gedrueckt, ort);
  }

  /** Ein Druck mit Finger oder Maus an einem Ort, jetzt */
  function druck(sel: string, ort: Ort): void {
    klick(sel, 1, performance.now(), ort);
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

  test('Enter oder Leertaste auf dem Knopf der Karte öffnet das Fenster, TRAINIEREN nicht', async () => {
    const { state, held: f } = stand();
    f.level = 12;
    await heldenseite(state);
    const knopf = `#s-heroes .hcard[data-fighter-id="${f.id}"] .hcard-oeffnen`;
    // Die Tastatur klickt den Knopf selbst (detail 0); Maus und Finger gehen durch ihn hindurch auf die Karte
    klick(knopf, 0);
    expect(seite.querySelector('#hero-detail-ov')).not.toBeNull();
    expect(fokus).toBe(el('#hdm2-name'));
    taste('Escape');
    expect(seite.querySelector('#hero-detail-ov')).toBeNull();
    expect(fokus).toBe(el(knopf));

    klick('#s-heroes .tab[data-tab="train"]');
    const gold = state.globalStock.gold;
    klick(`#s-heroes .btn-train[data-fighter-id="${f.id}"]`);
    expect(state.globalStock.gold).toBeLessThan(gold);
    expect(seite.querySelector('#hero-detail-ov')).toBeNull();
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
    // Beim Neuzeichnen misst das Fenster nicht neu: Jetzt hat die Seite keinen Scrollbalken, der Rand fiele weg
    expect(htmlStil.get('--hdm2-balken')).toBe('15px');

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

  test('nach ANLEGEN hat der Platz den Fokus; ein langsamer zweiter Druck auf dieselbe Stelle legt nicht gleich wieder ab', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    klick('#hdm2-inv-toggle');
    // Auch nach 🎒 Inventar schluckt das Fenster den zweiten Klick (am PC rückt der Held dabei zur Seite)
    expect(schlucktZweitenKlick()).toBe(true);
    klick(`#hero-detail-ov .hdm2-inv-slot[data-item-id="${SCHWERT}"]`);
    expect(el('#hero-detail-ov .hdm2-aktion').dataset.aktion).toBe('anlegen');

    const hier: Ort = { x: 480, y: 200 };
    const angelegt = performance.now();
    druck('#hero-detail-ov .hdm2-aktion', hier);
    expect(f.gear.mainHand).toBe(SCHWERT);
    const platz = el('#hero-detail-ov .hdm-gear-icon[data-slot="mainHand"]');
    expect(fokus).toBe(platz);
    expect(schlucktZweitenKlick()).toBe(true);
    // Dort steht jetzt ABLEGEN. Ein langsamer zweiter Druck auf dieselbe Stelle (der Finger verrutscht etwas) legt das
    // Teil nicht gleich wieder ab, auch nicht, wenn das Spiel erst nach 0,8 s dazu kommt
    expect(el('#hero-detail-ov .hdm2-aktion').dataset.aktion).toBe('ablegen');
    vi.advanceTimersByTime(500);
    druck('#hero-detail-ov .hdm2-aktion', { x: 470, y: 225 });
    expect(f.gear.mainHand).toBe(SCHWERT);
    vi.advanceTimersByTime(300);
    klick('#hero-detail-ov .hdm2-aktion', 1, angelegt + 700, hier);
    expect(f.gear.mainHand).toBe(SCHWERT);
    // Nach 0,8 s zählt der Druck auch dort
    druck('#hero-detail-ov .hdm2-aktion', hier);
    expect(f.gear.mainHand).toBeNull();
    expect(fokus).toBe(el('#hero-detail-ov .hdm-gear-icon[data-slot="mainHand"]'));
  });

  test('gibt der Browser die Zeit des Drucks nicht passend mit (ab 1970 oder 0), zählt jetzt', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    klick('#hdm2-inv-toggle');
    klick(`#hero-detail-ov .hdm2-inv-slot[data-item-id="${SCHWERT}"]`);
    const hier: Ort = { x: 480, y: 200 };
    druck('#hero-detail-ov .hdm2-aktion', hier);
    expect(f.gear.mainHand).toBe(SCHWERT);
    vi.advanceTimersByTime(500);
    klick('#hero-detail-ov .hdm2-aktion', 1, Date.now(), hier);
    klick('#hero-detail-ov .hdm2-aktion', 1, 0, hier);
    expect(f.gear.mainHand).toBe(SCHWERT);
    vi.advanceTimersByTime(300);
    klick('#hero-detail-ov .hdm2-aktion', 1, 0, hier);
    expect(f.gear.mainHand).toBeNull();
  });

  test('Platz angetippt, das Fenster scrollt zur Auswahl: Ein langsamer zweiter Druck dorthin springt nicht in die Schmiede', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    // Am Handy quer liegt danach der Link unter dem Finger; der Browser schiebt den Tipp knapp daneben auf ihn (9 px)
    const platz: Ort = { x: 153, y: 215 };
    const daneben: Ort = { x: 153, y: 224 };
    druck('#hero-detail-ov .hdm-gear-icon[data-slot="armor"]', platz);
    vi.advanceTimersByTime(400);
    druck(`#hero-detail-ov [data-schmiede-teil="${RUESTUNG}"]`, daneben);
    expect(seite.querySelector('#hero-detail-ov')).not.toBeNull();
    expect(el('#s-heroes .tab.active').dataset.tab).toBe('my');
    // 0,8 s nach dem Platz zählt der Druck: Fenster zu, Reiter «Schmiede»
    vi.advanceTimersByTime(400);
    druck(`#hero-detail-ov [data-schmiede-teil="${RUESTUNG}"]`, daneben);
    expect(seite.querySelector('#hero-detail-ov')).toBeNull();
    expect(el('#s-heroes .tab.active').dataset.tab).toBe('schmiede');
  });

  test('Platz angetippt: ABLEGEN, das unter den Finger gescrollt ist, wirkt nicht; ein Druck auf ABLEGEN anderswo sofort', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    const platz: Ort = { x: 453, y: 117 };
    druck('#hero-detail-ov .hdm-gear-icon[data-slot="armor"]', platz);
    vi.advanceTimersByTime(400);
    druck('#hero-detail-ov .hdm2-aktion', platz);
    expect(f.gear.armor).toBe(RUESTUNG);
    // Eine Maus steht still: 20 px daneben ist schon eine andere Stelle, mit dem Finger nicht
    druck('#hero-detail-ov .hdm2-aktion', { x: 453, y: 137 });
    expect(f.gear.armor).toBe(RUESTUNG);
    druck('#hero-detail-ov .hdm2-aktion', { x: 453, y: 137, art: 'mouse' });
    expect(f.gear.armor).toBeNull();
  });

  test('denselben Platz zweimal antippen schliesst die Auswahl, auch kurz nacheinander an derselben Stelle', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    const platz: Ort = { x: 100, y: 150 };
    druck('#hero-detail-ov .hdm-gear-icon[data-slot="armor"]', platz);
    expect(seite.querySelector('#hdm2-auswahl')).not.toBeNull();
    vi.advanceTimersByTime(400);
    druck('#hero-detail-ov .hdm-gear-icon[data-slot="armor"]', platz);
    expect(seite.querySelector('#hdm2-auswahl')).toBeNull();
    expect(f.gear.armor).toBe(RUESTUNG);
  });

  test('zwei Teile schnell nacheinander anlegen: ANLEGEN wirkt sofort, wenn dazwischen woanders gedrückt wurde', async () => {
    const { state, held: f } = stand();
    const talisman = Object.keys(ITEM_DEFS).find(id => ITEM_DEFS[id].type === 'gear' && ITEM_DEFS[id].gearSlot === 'trinket')!;
    state.globalStock[talisman] = 1;
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    klick('#hdm2-inv-toggle');
    const knopf: Ort = { x: 480, y: 200 };
    klick(`#hero-detail-ov .hdm2-inv-slot[data-item-id="${SCHWERT}"]`);
    druck('#hero-detail-ov .hdm2-aktion', knopf);
    expect(f.gear.mainHand).toBe(SCHWERT);
    vi.advanceTimersByTime(250);
    druck(`#hero-detail-ov .hdm2-inv-slot[data-item-id="${talisman}"]`, { x: 120, y: 520 });
    vi.advanceTimersByTime(250);
    druck('#hero-detail-ov .hdm2-aktion', knopf);
    expect(f.gear.trinket).toBe(talisman);
    expect(f.gear.mainHand).toBe(SCHWERT);
  });

  test('Tastatur (detail 0, im Browser immer bei 0/0): Knöpfe kurz nacheinander wirken alle', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    const taste0: Ort = { x: 0, y: 0 };
    klick('#hdm2-inv-toggle', 0, performance.now(), taste0);
    expect(el('#hdm2-inv-toggle').getAttribute('aria-expanded')).toBe('true');
    klick(`#hero-detail-ov .hdm2-inv-slot[data-item-id="${SCHWERT}"]`, 0, performance.now(), taste0);
    expect(el('#hero-detail-ov .hdm2-aktion').dataset.aktion).toBe('anlegen');
    klick('#hero-detail-ov .hdm2-aktion', 0, performance.now(), taste0);
    expect(f.gear.mainHand).toBe(SCHWERT);
  });

  test('ein Druck auf Text zählt nicht als letzter Druck: Ein Knopf gleich danach an derselben Stelle wirkt', async () => {
    const { state, held: f } = stand();
    await heldenseite(state);
    oeffne(f);
    vi.advanceTimersByTime(800);
    const hier: Ort = { x: 300, y: 40 };
    druck('#hdm2-name', hier);
    vi.advanceTimersByTime(300);
    druck('#hdm2-inv-toggle', hier);
    expect(el('#hdm2-inv-toggle').getAttribute('aria-expanded')).toBe('true');
  });

  test('TRAINIEREN immer an derselben Stelle: Auch der Druck gleich nach einem Aufstieg trainiert (der Preis zählt nicht)', async () => {
    const state = createNewGameState();
    const f = held('guardian', 'Brom', 1);
    f.xp = totalXpForLevel(1);
    state.fighters.push(f);
    state.globalStock.gold = 100000;
    await heldenseite(state);
    klick('#s-heroes .tab[data-tab="train"]');
    vi.advanceTimersByTime(800);
    const hier: Ort = { x: 300, y: 400 };
    let trainiert = 0;
    for (let i = 0; i < 12; i++) {
      const gold = state.globalStock.gold;
      // Gesperrt ist der Knopf nur, solange er den Erfolg zeigt (600 ms); danach steht er neu da, nach einem
      // Aufstieg mit höherem Preis
      druck(`#s-heroes .btn-train[data-fighter-id="${f.id}"]`, hier);
      if (state.globalStock.gold < gold) trainiert++;
      vi.advanceTimersByTime(700);
    }
    expect(f.level).toBeGreaterThanOrEqual(3);
    expect(trainiert).toBe(12);
  });

  test('Fenster über den dunklen Rand geschlossen: Ein langsamer zweiter Druck dorthin trifft nicht «Lernen», TRAINIEREN oder eine Karte dahinter', async () => {
    const state = createNewGameState();
    const lehrer = held('guardian', 'Brom', 15);
    lehrer.xp = totalXpForLevel(15) + 600;
    const schueler = held('ranger', 'Lia', 5);
    schueler.xp = totalXpForLevel(5);
    state.fighters.push(lehrer, schueler);
    state.globalStock.gold = 100000;
    await heldenseite(state);
    klick('#s-heroes .tab[data-tab="train"]');
    vi.advanceTimersByTime(800);
    klick(`#s-heroes .hcard[data-fighter-id="${schueler.id}"]`);
    vi.advanceTimersByTime(800);

    const rand: Ort = { x: 1159, y: 296 };
    druck('#hero-detail-ov', rand);
    expect(seite.querySelector('#hero-detail-ov')).toBeNull();
    vi.advanceTimersByTime(400);
    const gold = state.globalStock.gold;
    druck('#s-heroes [data-lb-lernen]', rand);
    druck(`#s-heroes .btn-train[data-fighter-id="${schueler.id}"]`, rand);
    druck(`#s-heroes .hcard[data-fighter-id="${schueler.id}"]`, rand);
    expect(schueler.xp).toBe(totalXpForLevel(5));
    expect(state.globalStock.gold).toBe(gold);
    expect(seite.querySelector('#hero-detail-ov')).toBeNull();
    // Bewusst, 0,8 s nach dem Rand: Lernen wirkt, und gleich danach TRAINIEREN anderswo
    vi.advanceTimersByTime(400);
    druck('#s-heroes [data-lb-lernen]', rand);
    expect(schueler.xp).toBe(totalXpForLevel(5) + 600);
    druck(`#s-heroes .btn-train[data-fighter-id="${schueler.id}"]`, { x: 300, y: 600 });
    expect(state.globalStock.gold).toBeLessThan(gold);
    expect(gespeichert).toBe(2);
  });

  test('Lehrbuch: Die Meldung nach «Lernen» wird ins Bild geholt (am Handy quer läge sie unter dem Rand)', async () => {
    const state = createNewGameState();
    const lehrer = held('guardian', 'Brom', 15);
    lehrer.xp = totalXpForLevel(15) + 600;
    const schueler = held('ranger', 'Lia', 5);
    schueler.xp = totalXpForLevel(5);
    state.fighters.push(lehrer, schueler);
    await heldenseite(state);
    klick('#s-heroes .tab[data-tab="train"]');
    expect(seite.querySelector('#s-heroes .lb-meldung')).toBeNull();
    klick('#s-heroes [data-lb-lernen]');
    expect(schueler.xp).toBe(totalXpForLevel(5) + 600);
    // Der Lehrer hat keinen Überschuss mehr, «Lernen» ist aus: Fokus und Blick gehen auf die Meldung
    const meldung = el('#s-heroes .lb-meldung');
    expect(meldung.gescrollt).toEqual([{ block: 'nearest' }]);
    expect(fokus).toBe(meldung);
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
