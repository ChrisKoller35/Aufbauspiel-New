// ─── Magic City – Klang ────────────────────────────────────────
// Ein AudioContext (erst nach der ersten Geste), darunter Haupt-Gain (stumm), Musik- und
// Effekt-Gain. Lautstärke nur über GainNodes: `audio.volume` wirkt auf dem iPhone nicht.
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
let einstellungen = ladeEinstellungen();
let ctx: AudioContext | null = null;
let haupt: GainNode, musikGain: GainNode, effektGain: GainNode;
let aktuell: { name: string; audio: HTMLAudioElement; gain: GainNode } | null = null;
const puffer = new Map<string, Promise<AudioBuffer | null>>();

export function istStumm(): boolean { return einstellungen.stumm; }
export function istGestartet(): boolean { return ctx !== null; }

function gain(c: AudioContext, wert: number, ziel: AudioNode): GainNode {
  const g = c.createGain();
  g.gain.value = wert;
  g.connect(ziel);
  return g;
}

/** Legt den AudioContext an bzw. setzt ihn fort. Nur aus einer Geste aufrufen. */
export function starteKlang(): void {
  if (!ctx) {
    ctx = new AudioContext();
    haupt = gain(ctx, einstellungen.stumm ? 0 : 1, ctx.destination);
    musikGain = gain(ctx, 0.3, haupt);
    effektGain = gain(ctx, 0.5, haupt);
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

export function setzeStumm(stumm: boolean): void {
  einstellungen = { stumm };
  speichereEinstellungen(einstellungen);
  if (ctx) haupt.gain.setValueAtTime(stumm ? 0 : 1, ctx.currentTime);
}

/** Spielt `assets/audio/music/<name>.mp3` in Schleife; das alte Stück wird ausgeblendet und gestoppt. `null`: nichts ändern. */
export function spieleMusik(name: string | null): void {
  if (!ctx || !name || aktuell?.name === name) return;
  const alt = aktuell;
  if (alt) {
    alt.gain.gain.setValueAtTime(alt.gain.gain.value, ctx.currentTime);
    alt.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + AUSBLENDEN_S);
    setTimeout(() => { alt.audio.pause(); alt.gain.disconnect(); }, AUSBLENDEN_S * 1000);
  }
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'none';
  audio.src = `assets/audio/music/${name}.mp3`;
  aktuell = { name, audio, gain: gain(ctx, 1, musikGain) };
  ctx.createMediaElementSource(audio).connect(aktuell.gain);
  void audio.play().catch(() => {});
}

/** Spielt `assets/audio/sfx/<name>.wav`; geladen beim ersten Gebrauch, danach gemerkt. */
export function spieleEffekt(name: string): void {
  const c = ctx;
  if (!c) return;
  if (!puffer.has(name)) {
    puffer.set(name, fetch(`assets/audio/sfx/${name}.wav`)
      .then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).catch(() => null));
  }
  void puffer.get(name)!.then(buf => {
    if (!buf) return;
    const quelle = c.createBufferSource();
    quelle.buffer = buf;
    quelle.connect(effektGain);
    quelle.start();
  });
}
