// ─── Magic City – Klang ────────────────────────────────────────
// Ein AudioContext (erst nach der ersten Geste), darunter Haupt-Gain (stumm),
// Musik-Gain und Effekt-Gain. Lautstärke nur über GainNodes, weil
// `audio.volume` auf dem iPhone nicht wirkt. Siehe docs/KLANG.md.
// ────────────────────────────────────────────────────────────────

export const KLANG_SPEICHER_KEY = 'magic_city_klang';
export interface KlangEinstellungen { stumm: boolean }
const VORGABE: KlangEinstellungen = { stumm: false };

type Lesbar = Pick<Storage, 'getItem'>;
type Schreibbar = Pick<Storage, 'setItem'>;

/** `localStorage` selbst kann werfen (gesperrter Speicher), deshalb auch der Zugriff im try. */
function speicher(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Liest `{ stumm }`; fehlend, kaputt oder werfend ergibt die Vorgabe (nicht stumm). */
export function ladeEinstellungen(s: Lesbar | null = speicher()): KlangEinstellungen {
  try {
    const roh = s?.getItem(KLANG_SPEICHER_KEY);
    if (!roh) return { ...VORGABE };
    const wert: unknown = JSON.parse(roh);
    if (wert && typeof wert === 'object' && typeof (wert as KlangEinstellungen).stumm === 'boolean') {
      return { stumm: (wert as KlangEinstellungen).stumm };
    }
  } catch { /* kaputter Wert: Vorgabe */ }
  return { ...VORGABE };
}

export function speichereEinstellungen(e: KlangEinstellungen, s: Schreibbar | null = speicher()): void {
  try { s?.setItem(KLANG_SPEICHER_KEY, JSON.stringify({ stumm: e.stumm })); } catch { /* ohne Speicher weiter */ }
}

const MUSIK_LAUTSTAERKE = 0.3;
const EFFEKT_LAUTSTAERKE = 0.5;
const AUSBLENDEN_S = 1;

let einstellungen = ladeEinstellungen();
let ctx: AudioContext | null = null;
let haupt: GainNode | null = null;
let musikGain: GainNode | null = null;
let effektGain: GainNode | null = null;
let aktuell: { name: string; audio: HTMLAudioElement; gain: GainNode } | null = null;
const puffer = new Map<string, Promise<AudioBuffer | null>>();

export function istStumm(): boolean { return einstellungen.stumm; }
export function istGestartet(): boolean { return ctx !== null; }

/** Legt den AudioContext an bzw. setzt ihn fort. Nur aus einer Geste aufrufen. */
export function starteKlang(): void {
  if (!ctx) {
    ctx = new AudioContext();
    haupt = ctx.createGain();
    haupt.gain.value = einstellungen.stumm ? 0 : 1;
    haupt.connect(ctx.destination);
    musikGain = ctx.createGain();
    musikGain.gain.value = MUSIK_LAUTSTAERKE;
    musikGain.connect(haupt);
    effektGain = ctx.createGain();
    effektGain.gain.value = EFFEKT_LAUTSTAERKE;
    effektGain.connect(haupt);
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

export function setzeStumm(stumm: boolean): void {
  einstellungen = { stumm };
  speichereEinstellungen(einstellungen);
  if (ctx && haupt) haupt.gain.setValueAtTime(stumm ? 0 : 1, ctx.currentTime);
}

/** Spielt `assets/audio/music/<name>.mp3` in Schleife; das alte Stück wird ausgeblendet und gestoppt. */
export function spieleMusik(name: string): void {
  if (!ctx || !musikGain || aktuell?.name === name) return;
  const alt = aktuell;
  if (alt) {
    const t = ctx.currentTime;
    alt.gain.gain.setValueAtTime(alt.gain.gain.value, t);
    alt.gain.gain.linearRampToValueAtTime(0, t + AUSBLENDEN_S);
    setTimeout(() => { alt.audio.pause(); alt.gain.disconnect(); }, AUSBLENDEN_S * 1000);
  }
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'none';
  audio.src = `assets/audio/music/${name}.mp3`;
  const gain = ctx.createGain();
  ctx.createMediaElementSource(audio).connect(gain);
  gain.connect(musikGain);
  aktuell = { name, audio, gain };
  void audio.play().catch(() => {});
}

/** Spielt `assets/audio/sfx/<name>.wav`; geladen beim ersten Gebrauch, danach gemerkt. */
export function spieleEffekt(name: string): void {
  const c = ctx;
  if (!c || !effektGain) return;
  let p = puffer.get(name);
  if (!p) {
    p = fetch(`assets/audio/sfx/${name}.wav`)
      .then(r => r.arrayBuffer())
      .then(b => c.decodeAudioData(b))
      .catch(() => null);
    puffer.set(name, p);
  }
  const ziel = effektGain;
  void p.then(buf => {
    if (!buf) return;
    const quelle = c.createBufferSource();
    quelle.buffer = buf;
    quelle.connect(ziel);
    quelle.start();
  });
}
