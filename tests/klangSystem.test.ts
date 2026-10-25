import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Das Klang-System (src/systems/Klang.ts) ohne Browser: AudioContext, GainNode und <audio> als kleine Ersatz-Objekte.
// Was klingt, rechnet der Ersatz aus den geplanten Werten wie der Browser (klingt()). value liefert wie in Chromium
// nur, was der Audio-Thread zuletzt gerechnet hat (bei zeit(), solange der Kontext läuft) oder was der Setzer schrieb.
// Zeitgeber laufen mit vi.useFakeTimers, getrennt von der Zeit des Kontexts (zeit()). Ein Stück lädt sofort und meldet
// 'playing' gleich bei play(), ausser ein Test lädt es selbst (sofortGeladen = false, dann geladen()) oder lässt play()
// ablehnen (ablehnen = true).

type Punkt = { t: number; v: number; rampe: boolean };
const params: Param[] = [];

class Param {
  private punkte: Punkt[] = [];
  private gerechnet: number;
  constructor(private uhr: { currentTime: number }, private start: number) {
    this.gerechnet = start;
    params.push(this);
  }
  /** Die Lautstärke laut Plan jetzt: Was man hört */
  klingt(): number {
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
  /** Der Audio-Thread rechnet: Erst danach liefert value den Wert von jetzt */
  rechne(): void { this.gerechnet = this.klingt(); }
  get value(): number { return this.gerechnet; }
  set value(v: number) { this.gerechnet = v; this.setValueAtTime(v, this.uhr.currentTime); }
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
let sofortGeladen = true;
let ablehnen = false;

class Spieler extends EventTarget {
  loop = false;
  preload = '';
  paused = true;
  /** 0: nichts geladen, 4: genug geladen, es spielt, sobald es nicht angehalten ist */
  readyState = 0;
  gain?: Gain;
  /** Jede Zuweisung an src lädt neu und beginnt das Stück von vorn */
  zuweisungen: string[] = [];
  private quelle = '';
  constructor() { super(); spieler.push(this); }
  get src(): string { return this.quelle; }
  set src(wert: string) { this.quelle = wert; this.zuweisungen.push(wert); this.paused = true; this.readyState = 0; }
  removeAttribute(name: string): void { if (name === 'src') { this.quelle = ''; this.readyState = 0; } }
  load(): void {}
  play(): Promise<void> {
    if (ablehnen) return Promise.reject(new Error('NotAllowedError'));
    if (this.paused) {
      this.paused = false;
      if (sofortGeladen) this.readyState = 4;
      if (this.readyState >= 3) this.dispatchEvent(new Event('playing'));
    }
    return Promise.resolve();
  }
  pause(): void { this.paused = true; }
}

/** Das Stück ist fertig geladen und setzt ein (wie der Browser: 'playing', wenn es nicht angehalten ist) */
function geladen(s: Spieler): void {
  s.readyState = 4;
  if (!s.paused) s.dispatchEvent(new Event('playing'));
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
  .map(s => ({ stueck: stueck(s), laut: Math.round((s.gain?.gain.klingt() ?? 0) * 100) / 100 }))
  .sort((a, b) => a.stueck.localeCompare(b.stueck));
/** Die Spur, die `name` je bekommen hat */
const spurVon = (name: string) => spieler.find(s => s.zuweisungen.includes(datei(name)))!;
/** Die Zeit vergeht; läuft der Kontext, rechnet der Audio-Thread */
const zeit = (s: number) => {
  kontext.currentTime = s;
  if (kontext.state === 'running') params.forEach(p => p.rechne());
};
/** Lässt die Versprechen von fetch und decodeAudioData durchlaufen */
const leere = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

beforeEach(() => {
  spieler.length = 0;
  quellen.length = 0;
  params.length = 0;
  sofortGeladen = true;
  ablehnen = false;
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
    k.merkeMusik('ambient_city'); // gewünscht, bevor es Klang gibt
    k.starteKlang(false); // Geste auf 🔊 oder M: anlegen, aber nicht nachholen
    expect(laufend()).toEqual([]);
    k.merkeMusik('ambient_forest'); // gemerkt bei laufendem Klang: startet auch nichts
    expect(laufend()).toEqual([]);
    k.starteKlang();
    expect(laufend()).toEqual([{ stueck: 'ambient_forest', laut: 0 }]);
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
    spurVon('ambient_city').readyState = 3; // spielt, nur knapp geladen (HAVE_FUTURE_DATA)
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

  test('langsames Laden: Ein neues Stück blendet erst ein, wenn es wirklich spielt', async () => {
    const k = await ladeKlang();
    sofortGeladen = false;
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(1.5); // lädt noch: still, und keine Rampe, die schon vorbei wäre, wenn es einsetzt
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0 }]);
    geladen(spurVon('ambient_city'));
    zeit(1.65);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0.5 }]);
    zeit(1.8);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 1 }]);
  });

  test('Wechsel, während das alte Stück noch lädt: Es setzt nicht mehr ein, das neue blendet ein', async () => {
    const k = await ladeKlang();
    sofortGeladen = false;
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(0.5);
    k.spieleMusik('ambient_forest');
    zeit(0.7);
    geladen(spurVon('ambient_city')); // kommt erst während des Ausblendens an
    geladen(spurVon('ambient_forest'));
    zeit(1.2);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0 }, { stueck: 'ambient_forest', laut: 1 }]);
    zeit(1.5);
    vi.advanceTimersByTime(1000);
    expect(laufend()).toEqual([{ stueck: 'ambient_forest', laut: 1 }]);
  });

  test('A → B → A, A lädt noch: A blendet ein, sobald es spielt, B kommt nicht mehr', async () => {
    const k = await ladeKlang();
    sofortGeladen = false;
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(0.2);
    k.spieleMusik('ambient_forest');
    zeit(0.4);
    k.spieleMusik('ambient_city');
    expect(spurVon('ambient_city').zuweisungen).toEqual([datei('ambient_city')]);
    zeit(0.9);
    geladen(spurVon('ambient_city'));
    geladen(spurVon('ambient_forest'));
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0 }, { stueck: 'ambient_forest', laut: 0 }]);
    zeit(1.05);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0.5 }, { stueck: 'ambient_forest', laut: 0 }]);
    zeit(1.4);
    vi.advanceTimersByTime(1000);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 1 }]);
  });

  test('A → B → A, A wurde angehalten (iPhone unterbrochen): A spielt sofort weiter und blendet ein', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(5);
    spurVon('ambient_city').pause(); // geladen, aber angehalten
    k.spieleMusik('ambient_forest');
    zeit(5.4);
    k.spieleMusik('ambient_city');
    zeit(5.55);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0.8 }, { stueck: 'ambient_forest', laut: 0.85 }]);
  });

  test('A → B → A, A angehalten und play() abgelehnt: A blendet weiter aus, bis eine Geste es startet', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(5);
    const stadt = spurVon('ambient_city');
    stadt.pause();
    k.spieleMusik('ambient_forest');
    zeit(5.4);
    ablehnen = true;
    k.spieleMusik('ambient_city');
    zeit(5.6);
    // Still und weiter leiser, nicht im Stillen schon auf volle Lautstärke (es begänne sonst laut)
    expect(stadt.paused).toBe(true);
    expect(stadt.gain!.gain.klingt()).toBeCloseTo(0.4);
    ablehnen = false;
    k.starteKlang(); // die nächste Geste holt es nach und blendet von dort ein
    zeit(5.75);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0.7 }, { stueck: 'ambient_forest', laut: 0.65 }]);
  });

  test('zwei Wechsel, ohne dass der Audio-Thread dazwischen rechnet: Das verlassene Stück bleibt still', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(5);
    k.spieleMusik('ambient_forest');
    zeit(5.05); // die Stadt blendet aus, ihre Spur steht bei 0,95
    sofortGeladen = false;
    k.spieleMusik('ambient_boss'); // auf der Spur der Stadt: still, bis es spielt
    k.spieleMusik('ambient_forest'); // gleich zurück, value liefert dort noch 0,95
    zeit(5.1);
    geladen(spurVon('ambient_boss'));
    zeit(5.2);
    expect(laufend()).toEqual([{ stueck: 'ambient_boss', laut: 0 }, { stueck: 'ambient_forest', laut: 0.58 }]);
  });

  test('neues Stück auf der Spur, die noch ausblendet: Es beginnt still, nicht beim Pegel des alten', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(5);
    k.spieleMusik('ambient_forest');
    zeit(5.05); // die Stadt blendet aus, ihre Spur steht bei 0,95
    sofortGeladen = false;
    k.spieleMusik('ambient_boss'); // auf der Spur der Stadt, lädt noch
    zeit(5.1);
    expect(laufend()).toEqual([{ stueck: 'ambient_boss', laut: 0 }, { stueck: 'ambient_forest', laut: 0.16 }]);
    geladen(spurVon('ambient_boss'));
    zeit(5.25);
    expect(laufend()).toEqual([{ stueck: 'ambient_boss', laut: 0.5 }, { stueck: 'ambient_forest', laut: 0.13 }]);
  });

  test('angehaltener Kontext (iPhone «interrupted»): Ein neues Stück blendet nach dem Fortsetzen ein', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(1);
    k.setzeStumm(true);
    k.setzeStumm(false); // die Stadt kommt auf die andere Spur, die alte behält die volle Lautstärke
    zeit(2);
    kontext.state = 'suspended'; // der Audio-Thread rechnet nicht, die Zeit steht
    k.spieleMusik('ambient_forest'); // auf die alte Spur, ohne Geste (etwa ein Bildschirmwechsel)
    k.starteKlang(); // die nächste Geste setzt fort
    zeit(2.15);
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0.85 }, { stueck: 'ambient_forest', laut: 0.5 }]);
  });

  test('Kontext stand beim Wechsel: Die alte Spur blendet nach dem Fortsetzen ganz aus, statt nach 1 s abzubrechen', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(2);
    kontext.state = 'suspended'; // die Zeit des Kontexts steht, die Uhr läuft weiter
    k.spieleMusik('ambient_forest');
    vi.advanceTimersByTime(300);
    k.starteKlang(); // eine Geste setzt fort: Erst jetzt blendet die Stadt aus
    zeit(2.7);
    vi.advanceTimersByTime(700); // 1 s nach dem Wechsel: noch nicht ausgeblendet
    expect(laufend()).toEqual([{ stueck: 'ambient_city', laut: 0.3 }, { stueck: 'ambient_forest', laut: 1 }]);
    zeit(3);
    vi.advanceTimersByTime(300);
    expect(laufend()).toEqual([{ stueck: 'ambient_forest', laut: 1 }]);
    expect(spurVon('ambient_city').src).toBe('');
  });

  test('Kontext steht noch, wenn die Sekunde um ist: Die alte Spur hält gleich an, man hört sie ohnehin nicht', async () => {
    const k = await ladeKlang();
    k.starteKlang();
    k.spieleMusik('ambient_city');
    zeit(2);
    kontext.state = 'suspended';
    k.spieleMusik('ambient_forest');
    vi.advanceTimersByTime(1000);
    expect(spurVon('ambient_city').src).toBe('');
    k.starteKlang();
    zeit(2.3);
    expect(laufend()).toEqual([{ stueck: 'ambient_forest', laut: 1 }]);
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
