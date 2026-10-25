import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Das Klang-System (src/systems/Klang.ts) ohne Browser: AudioContext, GainNode und <audio> als kleine Ersatz-Objekte.
// Die Lautstärke rechnet der Ersatz aus den geplanten Werten wie der Browser: Wer eine laufende Rampe löscht und
// danach liest, bekommt den Wert vor der Rampe. Zeitgeber laufen mit vi.useFakeTimers.

type Punkt = { t: number; v: number; rampe: boolean };

class Param {
  private punkte: Punkt[] = [];
  constructor(private uhr: { currentTime: number }, private start: number) {}
  get value(): number {
    const jetzt = this.uhr.currentTime;
    let t = 0;
    let v = this.start;
    for (const p of this.punkte) {
      if (p.t <= jetzt) { t = p.t; v = p.v; continue; }
      if (p.rampe) v += (p.v - v) * ((jetzt - t) / (p.t - t));
      break;
    }
    return v;
  }
  set value(v: number) { this.start = v; this.punkte = []; }
  setValueAtTime(v: number, t: number): void { this.punkte.push({ t, v, rampe: false }); }
  linearRampToValueAtTime(v: number, t: number): void { this.punkte.push({ t, v, rampe: true }); }
  cancelScheduledValues(t: number): void { this.punkte = this.punkte.filter(p => p.t < t); }
  setTargetAtTime(v: number, t: number): void { this.punkte.push({ t, v, rampe: false }); }
}

class Gain {
  gain: Param;
  constructor(uhr: { currentTime: number }) { this.gain = new Param(uhr, 1); }
  connect(): void {}
}

const quellen: { start: ReturnType<typeof vi.fn> }[] = [];

class Kontext {
  currentTime = 0;
  state = 'running';
  destination = {};
  createGain(): Gain { return new Gain(this); }
  createMediaElementSource(audio: Spieler) { return { connect: (g: Gain) => { audio.gain = g; } }; }
  resume(): Promise<void> { this.state = 'running'; return Promise.resolve(); }
  decodeAudioData(b: ArrayBuffer): Promise<object> { return Promise.resolve({ laenge: b.byteLength }); }
  createBufferSource() {
    const quelle = { buffer: null as unknown, connect() {}, start: vi.fn() };
    quellen.push(quelle);
    return quelle;
  }
}

const spieler: Spieler[] = [];

class Spieler {
  loop = false;
  preload = '';
  paused = true;
  gain?: Gain;
  /** Jede Zuweisung an src lädt neu und beginnt das Stück von vorn */
  zuweisungen: string[] = [];
  private quelle = '';
  constructor() { spieler.push(this); }
  get src(): string { return this.quelle; }
  set src(wert: string) { this.quelle = wert; this.zuweisungen.push(wert); this.paused = true; }
  removeAttribute(name: string): void { if (name === 'src') this.quelle = ''; }
  load(): void {}
  play(): Promise<void> { this.paused = false; return Promise.resolve(); }
  pause(): void { this.paused = true; }
}

let kontext: Kontext;
type KlangModul = typeof import('../src/systems/Klang');

/** Ein frisches Klang-System, wie nach dem Laden der Seite (ohne Geste, nicht stumm). */
async function ladeKlang(): Promise<KlangModul> {
  vi.resetModules();
  return import('../src/systems/Klang');
}

const datei = (name: string) => `assets/audio/music/${name}.mp3`;
const stueck = (s: Spieler) => s.src.replace('assets/audio/music/', '').replace('.mp3', '');
/** Die Spuren, die gerade spielen: Stück und Lautstärke jetzt (gerundet), nach Stück geordnet */
const laufend = () => spieler.filter(s => !s.paused)
  .map(s => ({ stueck: stueck(s), laut: Math.round((s.gain?.gain.value ?? 0) * 100) / 100 }))
  .sort((a, b) => a.stueck.localeCompare(b.stueck));
/** Die Spur, die `name` je bekommen hat */
const spurVon = (name: string) => spieler.find(s => s.zuweisungen.includes(datei(name)))!;
const zeit = (s: number) => { kontext.currentTime = s; };
/** Lässt die Versprechen von fetch und decodeAudioData durchlaufen */
const leere = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

beforeEach(() => {
  spieler.length = 0;
  quellen.length = 0;
  vi.useFakeTimers();
  const daten = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => daten.get(k) ?? null, setItem: (k: string, v: string) => { daten.set(k, v); } });
  vi.stubGlobal('AudioContext', class extends Kontext { constructor() { super(); kontext = this; } });
  vi.stubGlobal('Audio', Spieler);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Klang-System: Musik', () => {
  test('vor der ersten Geste spielt nichts, das gewünschte Stück kommt mit ihr', async () => {
    const k = await ladeKlang();
    k.spieleMusik('ambient_city');
    expect(spieler).toHaveLength(0);
    k.starteKlang();
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0 }]);
  });

  test('merkeMusik und starteKlang(false): nichts spielt, bis eine Geste nachholt', async () => {
    const k = await ladeKlang();
    k.starteKlang(false);
    k.merkeMusik('ambient_city');
    expect(laufend()).toEqual([]);
    k.starteKlang();
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0 }]);
  });

  test('Wechsel: das alte Stück blendet in 1 s aus, das neue in 0,3 s ein, danach gibt die alte Spur frei', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(0.3);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 1 }]);
    zeit(5);
    k.spieleMusik('ambient_forest');
    zeit(5.15);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0.85 }, { stueck: 'ambient_forest', laut: 0.5 }]);
    zeit(6);
    vi.advanceTimersByTime(1000);
    expect(laufend()).toEqual([{ stueck: 'ambient_forest', laut: 1 }]);
    expect(spurVon('ambient_city').src).toBe('');
  });

  test('A → B → A: Das Stück, das gerade ausblendet, läuft weiter und blendet von seiner Lautstärke wieder ein', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(5);
    k.spieleMusik('ambient_forest');
    vi.advanceTimersByTime(400);
    zeit(5.4);
    k.spieleMusik('ambient_city');
    // nicht neu geladen, also nicht von vorn: Die Stadt-Spur bekam ihr src nur einmal
    expect(spurVon('ambient_city').zuweisungen).toEqual([datei('ambient_city')]);
    zeit(5.55);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0.8 }, { stueck: 'ambient_forest', laut: 0.85 }]);
    // Der Zeitgeber, der die Stadt-Spur nach dem Ausblenden angehalten hätte, ist gelöscht; der Wald hört auf
    zeit(6.4);
    vi.advanceTimersByTime(2000);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 1 }]);
  });

  test('A → B → C → A in kurzer Folge: am Ende läuft nur A', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(5);
    k.spieleMusik('ambient_forest');
    zeit(5.2);
    k.spieleMusik('ambient_boss');
    zeit(5.4);
    k.spieleMusik('ambient_city');
    zeit(7);
    vi.advanceTimersByTime(3000);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 1 }]);
  });

  test('stumm mitten im Ausblenden, dann Ton an: Das zuletzt gewünschte Stück beginnt, nichts hängt nach', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(5);
    k.spieleMusik('ambient_forest');
    zeit(5.2);
    k.setzeStumm(true);
    expect(laufend()).toEqual([]);
    k.spieleMusik('ambient_boss'); // während «stumm» nur gemerkt
    expect(laufend()).toEqual([]);
    vi.advanceTimersByTime(2000);
    zeit(8);
    k.setzeStumm(false);
    zeit(8.3);
    expect(laufend()).toEqual([{ stueck: 'ambient_boss', laut: 1 }]);
  });

  test('dasselbe Stück noch einmal: läuft weiter, wird nicht neu geladen', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    k.spieleMusik('ambient_city');
    k.starteKlang();
    expect(spieler.map(s => s.zuweisungen.length).sort()).toEqual([0, 1]);
  });
});

describe('Klang-System: Effekte', () => {
  const antwort = (ok: boolean) => ({ ok, status: ok ? 200 : 404, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });

  test('bei «stumm» lädt kein Effekt', async () => {
    const holen = vi.fn(() => Promise.resolve(antwort(true)));
    vi.stubGlobal('fetch', holen);
    const k = await ladeKlang();
    k.starteKlang();
    k.setzeStumm(true);
    k.spieleEffekt('boss_victory');
    await leere();
    expect(holen).not.toHaveBeenCalled();
    expect(quellen).toHaveLength(0);
  });

  test('ein Fehler beim Laden (404) wird nicht gemerkt: Der nächste Versuch lädt neu, danach aus dem Speicher', async () => {
    const holen = vi.fn()
      .mockReturnValueOnce(Promise.resolve(antwort(false)))
      .mockReturnValue(Promise.resolve(antwort(true)));
    vi.stubGlobal('fetch', holen);
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleEffekt('party_wipe');
    await leere();
    expect(quellen).toHaveLength(0);
    k.spieleEffekt('party_wipe');
    await leere();
    k.spieleEffekt('party_wipe');
    await leere();
    expect(holen).toHaveBeenCalledTimes(2);
    expect(quellen).toHaveLength(2);
    expect(quellen.every(q => q.start.mock.calls.length === 1)).toBe(true);
  });
});
