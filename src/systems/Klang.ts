// ─── Magic City – Klang ────────────────────────────────────────
// Ein AudioContext (erst in der ersten Geste), darunter Haupt-Gain (stumm), Musik- und
// Effekt-Gain. Lautstärke nur über GainNodes: `audio.volume` wirkt auf dem iPhone nicht.
// Musik auf zwei festen Spuren (<audio>), beide in der ersten Geste angelegt und freigegeben:
// Ein Wechsel blendet das alte Stück in 1 s aus und das neue in 0,3 s ein. So startet auch Musik
// ohne Geste (Bosskampf), und es entstehen keine neuen Medien-Player. Bei «stumm» lädt nichts.
// ────────────────────────────────────────────────────────────────

export const KLANG_SPEICHER_KEY = 'magic_city_klang';
export interface KlangEinstellungen { stumm: boolean }

/** `localStorage` selbst kann werfen (gesperrter Speicher), deshalb auch der Zugriff im try. */
function speicher(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Liest `{ stumm }`; fehlend, kaputt oder werfend ergibt die Vorgabe (nicht stumm). */
export function ladeEinstellungen(s: Pick<Storage, 'getItem'> | null = speicher()): KlangEinstellungen {
  try {
    const wert: unknown = JSON.parse(s?.getItem(KLANG_SPEICHER_KEY) ?? 'null');
    if (typeof (wert as KlangEinstellungen | null)?.stumm === 'boolean') return { stumm: (wert as KlangEinstellungen).stumm };
  } catch { /* kaputter Wert: Vorgabe */ }
  return { stumm: false };
}

export function speichereEinstellungen(e: KlangEinstellungen, s: Pick<Storage, 'setItem'> | null = speicher()): void {
  try { s?.setItem(KLANG_SPEICHER_KEY, JSON.stringify({ stumm: e.stumm })); } catch { /* ohne Speicher weiter */ }
}

const AUSBLENDEN_S = 1;
/** Kurz statt hart: Boss- und Höhlenmusik beginnen laut */
const EINBLENDEN_S = 0.3;

interface Spur { audio: HTMLAudioElement; gain: GainNode; name: string | null; stopp?: ReturnType<typeof setTimeout> }

let einstellungen = ladeEinstellungen();
let ctx: AudioContext | null = null;
let haupt: GainNode, effektGain: GainNode;
let spuren: Spur[] = [];
let aktiv = 0;
/** Was laufen soll, auch wenn es gerade nicht kann (noch keine Geste, «stumm», play() abgelehnt) */
let gewuenscht: string | null = null;
const puffer = new Map<string, Promise<AudioBuffer | null>>();

export function istStumm(): boolean { return einstellungen.stumm; }
export function istGestartet(): boolean { return ctx !== null; }

function gain(c: AudioContext, wert: number, ziel: AudioNode): GainNode {
  const g = c.createGain();
  g.gain.value = wert;
  g.connect(ziel);
  return g;
}

function neueSpur(c: AudioContext, musik: GainNode): Spur {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'none';
  const g = gain(c, 0, musik);
  c.createMediaElementSource(audio).connect(g);
  audio.load(); // in der Geste: gibt das Element auf dem iPhone für spätere play() frei
  return { audio, gain: g, name: null };
}

/** Hält die Spur an und gibt Download und Decoder frei. */
function stoppe(s: Spur): void {
  clearTimeout(s.stopp);
  s.audio.pause();
  s.audio.removeAttribute('src');
  s.audio.load();
  s.name = null;
}

/** Abgelehnt (keine Geste, iPhone unterbrochen): Die nächste Geste holt es nach (starteKlang). */
function spiele(s: Spur): void {
  void s.audio.play().catch(() => {});
}

/** Von der Lautstärke, die gerade klingt, in `dauer` s auf `ziel`. Den Wert vor dem Löschen der Rampe lesen. */
function rampe(p: AudioParam, ziel: number, dauer: number, jetzt: number): void {
  const wert = p.value;
  p.cancelScheduledValues(jetzt);
  p.setValueAtTime(wert, jetzt);
  p.linearRampToValueAtTime(ziel, jetzt + dauer);
}

/**
 * Legt den AudioContext an bzw. setzt ihn fort und holt abgelehnte Musik nach. Nur aus einer Geste aufrufen.
 * `nachholen` false: nur anlegen und fortsetzen (Geste auf 🔊 oder Taste M: Erst sie entscheidet über «stumm»).
 */
export function starteKlang(nachholen = true): void {
  if (!ctx) {
    ctx = new AudioContext();
    haupt = gain(ctx, einstellungen.stumm ? 0 : 1, ctx.destination);
    const musik = gain(ctx, 0.3, haupt);
    effektGain = gain(ctx, 0.5, haupt);
    spuren = [neueSpur(ctx, musik), neueSpur(ctx, musik)];
  }
  if (ctx.state !== 'running') void ctx.resume().catch(() => {}); // auch «interrupted» auf dem iPhone
  if (nachholen) spieleMusik(gewuenscht);
}

export function setzeStumm(stumm: boolean): void {
  einstellungen = { stumm };
  speichereEinstellungen(einstellungen);
  if (!ctx) return;
  haupt.gain.setTargetAtTime(stumm ? 0 : 1, ctx.currentTime, 0.02);
  if (stumm) spuren.forEach(stoppe);
  else spieleMusik(gewuenscht);
}

/** Merkt sich das Stück nur, ohne es zu starten: Es läuft, sobald Ton und Geste es erlauben. `null`: nichts ändern. */
export function merkeMusik(name: string | null): void {
  if (name) gewuenscht = name;
}

/** Spielt `assets/audio/music/<name>.mp3` in Schleife und blendet das alte Stück aus. `null`: nichts ändern. */
export function spieleMusik(name: string | null): void {
  if (!name) return;
  gewuenscht = name;
  if (!ctx || einstellungen.stumm) return;
  const alt = spuren[aktiv];
  if (alt.name === name) {
    if (alt.audio.paused) spiele(alt);
    return;
  }
  const jetzt = ctx.currentTime;
  if (alt.name) {
    rampe(alt.gain.gain, 0, AUSBLENDEN_S, jetzt);
    clearTimeout(alt.stopp);
    alt.stopp = setTimeout(() => stoppe(alt), AUSBLENDEN_S * 1000);
  }
  aktiv = 1 - aktiv;
  const neu = spuren[aktiv];
  clearTimeout(neu.stopp);
  // Kommt das Stück zurück, das gerade ausblendet (A → B → A): Es läuft weiter und blendet wieder ein
  if (neu.name === name) {
    rampe(neu.gain.gain, 1, EINBLENDEN_S, jetzt);
    if (neu.audio.paused) spiele(neu);
    return;
  }
  neu.gain.gain.cancelScheduledValues(jetzt);
  neu.gain.gain.setValueAtTime(0, jetzt);
  neu.gain.gain.linearRampToValueAtTime(1, jetzt + EINBLENDEN_S);
  neu.name = name;
  neu.audio.src = `assets/audio/music/${name}.mp3`;
  spiele(neu);
}

/** Spielt `assets/audio/sfx/<name>.wav`; geladen beim ersten Gebrauch, danach gemerkt (nach einem Fehler: nächstes Mal neu). */
export function spieleEffekt(name: string): void {
  const c = ctx;
  // Läuft der Klang gerade nicht (noch keine Geste, iPhone unterbrochen), käme der Effekt sonst verspätet
  if (!c || einstellungen.stumm || c.state !== 'running') return;
  let p = puffer.get(name);
  if (!p) {
    p = fetch(`assets/audio/sfx/${name}.wav`)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${name}.wav: ${r.status}`))))
      .then(b => c.decodeAudioData(b))
      .catch(() => { puffer.delete(name); return null; });
    puffer.set(name, p);
  }
  void p.then(buf => {
    if (!buf || einstellungen.stumm) return;
    const quelle = c.createBufferSource();
    quelle.buffer = buf;
    quelle.connect(effektGain);
    quelle.start();
  });
}
