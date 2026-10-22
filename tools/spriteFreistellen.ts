// ============================================================
// Magic City – Sprites in voller Grösse freistellen
// ============================================================
// Nimmt das Rohbild aus generated/ (Magenta-Hintergrund), stellt es in
// voller Auflösung frei und verkleinert es erst danach auf die Zielgrösse
// aus der Registry (nach final/).
//
// Anders als resize-sprites + remove-bg:
// - Auch eingeschlossenes Magenta verschwindet (zwischen den Beinen, in
//   einem Feuerwirbel), nicht nur das vom Bildrand aus erreichbare.
// - Ein Schatten auf dem Magenta (dunkleres Magenta) gilt als Hintergrund.
// - Leuchten und Kanten, die ins Magenta übergehen, werden entmischt:
//   Sie werden halb durchsichtig statt rosa. Grauer Rauch auf dem Magenta
//   bleibt grau und halb durchsichtig statt violett.
//
// Anleitung: npm run sprite-freistellen -- ENEMY_A ENEMY_B
//   --boden 0.87       entfernt dünne Bodenlinien (Risse) ab 87 % der Bildhöhe
//   --vorschau ORDNER  legt das freigestellte Bild zusätzlich in voller Grösse ab
// remove-bg lässt die fertigen Bilder danach in Ruhe (Rand schon durchsichtig).
// ============================================================

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { getTargetSizes } from "./spriteRegistry.js";

const GENERATED_DIR = path.join("public", "assets", "sprites", "generated");
const FINAL_DIR = path.join("public", "assets", "sprites", "final");

/** Bis zu diesem Farbabstand zur Hintergrundfarbe ist ein Pixel Hintergrund (JPEG-Rauschen). */
const KEY_ABSTAND = 70;
/** Ab diesem möglichen Magenta-Anteil (siehe magentaAnteil) kann ein Randpixel ins Magenta gemischt sein. */
const ANTEIL_MIN = 0.25;
/** So weit (Pixel bei 1024) reicht ein Leuchten oder eine weiche Kante ins Magenta. */
const SAUM_BREITE = 48;
/** Weicht ein Saum-Pixel mehr als das von der Mischung «Motiv + Magenta» ab, ist es keine solche Mischung. */
const MISCH_REST = 20;
/** Ab diesem Anteil Motiv ist ein Saum-Pixel ganz deckend. */
const DECKEND_AB = 0.85;
/** So weit dürfen Rot, Grün und Blau des Graus hinter halb durchsichtigem Rauch auseinander liegen. */
const RAUCH_REST = 30;
/** Bodenlinien bis zu dieser halben Dicke (Pixel bei 1024) verschwinden mit --boden. */
const BODEN_RADIUS = 5;

type Farbe = [number, number, number];

/** Hintergrundfarbe: Median der Randpixel. */
function randFarbe(px: Buffer, w: number, h: number): Farbe {
  const kanaele: number[][] = [[], [], []];
  const nimm = (x: number, y: number) => {
    const i = (y * w + x) * 3;
    for (let c = 0; c < 3; c++) kanaele[c].push(px[i + c]);
  };
  for (let x = 0; x < w; x++) { nimm(x, 0); nimm(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { nimm(0, y); nimm(w - 1, y); }
  const median = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  return [median(kanaele[0]), median(kanaele[1]), median(kanaele[2])];
}

/**
 * Höchstens so viel Magenta K steckt in der Farbe C (0..1), wie beim «Farbe zu Alpha»
 * in Malprogrammen: Rot und Blau müssen den Anteil tragen, Grün darf nicht zu hell sein.
 * Dunkles Rot (80/8/32) hat höchstens 13 %, ein rosa Leuchten (251/76/171) bis 68 %.
 */
function magentaAnteil(C: Farbe, K: Farbe): number {
  return Math.min(1, C[0] / K[0], C[2] / K[2], (255 - C[1]) / (255 - K[1]));
}

/**
 * Grauer Rauch oder Nebel, halb durchsichtig auf dem Magenta: Passt C zu t·(s,s,s) + (1−t)·K?
 * Dann ist t der Anteil Rauch (sonst null). Rot und Blau müssen gleich viel Magenta tragen,
 * und das Grau dahinter muss in Rot, Grün und Blau gleich hell sein.
 */
function rauchAnteil(C: Farbe, K: Farbe): number | null {
  const mRot = (C[0] - C[1]) / (K[0] - K[1]);
  const mBlau = (C[2] - C[1]) / (K[2] - K[1]);
  if (mRot < 0 || mBlau < 0 || mRot > 1 || mBlau > 1 || Math.abs(mRot - mBlau) > 0.15) return null;
  const m = (mRot + mBlau) / 2, t = 1 - m;
  if (t < 0.05) return null;
  const grau = C.map((c, k) => (c - m * K[k]) / t);
  if (Math.max(...grau) - Math.min(...grau) > RAUCH_REST || Math.min(...grau) < -RAUCH_REST || Math.max(...grau) > 255 + RAUCH_REST) return null;
  return t;
}

/** Abgedunkeltes Magenta (Schatten auf dem Hintergrund): Rot und Blau gleich stark, kaum Grün. */
function istSchatten(r: number, g: number, b: number): boolean {
  const lo = Math.min(r, b), hi = Math.max(r, b);
  return lo > 60 && hi - lo < 0.15 * hi && g < 0.25 * lo;
}

/** Nachbarn eines Pixels (4er-Nachbarschaft). */
function* nachbarn(i: number, w: number, h: number): Generator<number> {
  const x = i % w, y = (i - x) / w;
  if (x > 0) yield i - 1;
  if (x < w - 1) yield i + 1;
  if (y > 0) yield i - w;
  if (y < h - 1) yield i + w;
}

/**
 * Öffnung (erst schrumpfen, dann wachsen) mit einem Quadrat: Was dünner als
 * das Quadrat ist, fällt weg, grosse Formen bleiben. Nur für Zeilen ab abY.
 */
function duenneLinienWeg(maske: Uint8Array, w: number, h: number, abY: number, r: number): Uint8Array {
  const fenster = (quelle: Uint8Array, alle: boolean): Uint8Array => {
    // Zeilenweise, dann spaltenweise: alle (bzw. irgendein) Pixel im Fenster gesetzt?
    const zeile = new Uint8Array(w * h), aus = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      let summe = 0;
      for (let x = -r; x < w + r; x++) {
        const rein = x + r, raus = x - r - 1;
        if (rein < w && rein >= 0) summe += quelle[y * w + rein];
        if (raus >= 0 && raus < w) summe -= quelle[y * w + raus];
        if (x >= 0 && x < w) zeile[y * w + x] = (alle ? summe === Math.min(x + r, w - 1) - Math.max(x - r, 0) + 1 : summe > 0) ? 1 : 0;
      }
    }
    for (let x = 0; x < w; x++) {
      let summe = 0;
      for (let y = -r; y < h + r; y++) {
        const rein = y + r, raus = y - r - 1;
        if (rein < h && rein >= 0) summe += zeile[rein * w + x];
        if (raus >= 0 && raus < h) summe -= zeile[raus * w + x];
        if (y >= 0 && y < h) aus[y * w + x] = (alle ? summe === Math.min(y + r, h - 1) - Math.max(y - r, 0) + 1 : summe > 0) ? 1 : 0;
      }
    }
    return aus;
  };
  const geoeffnet = fenster(fenster(maske, true), false);
  const weg = new Uint8Array(w * h);
  for (let i = abY * w; i < w * h; i++) if (maske[i] && !geoeffnet[i]) weg[i] = 1;
  return weg;
}

/** Stellt ein Rohbild frei: RGBA in voller Grösse. */
function freistellen(px: Buffer, w: number, h: number, bodenAnteil: number | null): Buffer {
  const total = w * h;
  const K = randFarbe(px, w, h);
  if (!(K[0] > 180 && K[2] > 180 && K[1] < 80)) {
    throw new Error(`Hintergrund ist kein Magenta (Randfarbe ${K.join("/")})`);
  }
  const farbe = (i: number): Farbe => [px[i * 3], px[i * 3 + 1], px[i * 3 + 2]];

  // 1. Hintergrund: alles nahe an der Randfarbe, auch eingeschlossen, dazu
  //    Schatten, die an solchen Hintergrund grenzen.
  const HG = 1, SAUM = 2;
  const art = new Uint8Array(total);
  const schlange: number[] = [];
  for (let i = 0; i < total; i++) {
    const [r, g, b] = farbe(i);
    if ((r - K[0]) ** 2 + (g - K[1]) ** 2 + (b - K[2]) ** 2 < KEY_ABSTAND ** 2) { art[i] = HG; schlange.push(i); }
  }
  for (let k = 0; k < schlange.length; k++) {
    for (const n of nachbarn(schlange[k], w, h)) {
      if (art[n]) continue;
      const [r, g, b] = farbe(n);
      if (istSchatten(r, g, b)) { art[n] = HG; schlange.push(n); }
    }
  }

  // 2. Saum: ins Magenta gemischte Pixel, die vom Hintergrund aus erreichbar sind.
  //    Rosa Edelsteine mitten im Motiv bleiben so unberührt (Umriss dazwischen).
  const abstand = new Uint16Array(total);
  const front: number[] = [];
  for (let i = 0; i < total; i++) if (art[i] === HG) front.push(i);
  for (let k = 0; k < front.length; k++) {
    const i = front[k];
    if (abstand[i] >= SAUM_BREITE) continue;
    for (const n of nachbarn(i, w, h)) {
      if (art[n]) continue;
      if (magentaAnteil(farbe(n), K) > ANTEIL_MIN) { art[n] = SAUM; abstand[n] = abstand[i] + 1; front.push(n); }
    }
  }

  // 3. Für jeden Saum-Pixel die Farbe des nächsten sicheren Motiv-Pixels.
  const quelle = new Int32Array(total).fill(-1);
  const welle: number[] = [];
  for (let i = 0; i < total; i++) {
    if (art[i] !== SAUM) continue;
    for (const n of nachbarn(i, w, h)) {
      if (art[n] === 0 && quelle[n] < 0) { quelle[n] = n; welle.push(n); }
    }
  }
  for (let k = 0; k < welle.length; k++) {
    const i = welle[k];
    for (const n of nachbarn(i, w, h)) {
      if (art[n] === SAUM && quelle[n] < 0) { quelle[n] = quelle[i]; welle.push(n); }
    }
  }

  // 4. Ergebnis: Hintergrund durchsichtig, Saum entmischt.
  const aus = Buffer.alloc(total * 4);
  for (let i = 0; i < total; i++) {
    const C = farbe(i);
    let alpha = 255;
    let [r, g, b] = C;
    if (art[i] === HG) {
      alpha = 0;
    } else if (art[i] === SAUM) {
      // C = a·F + (1−a)·K: Anteil a des nächsten Motiv-Pixels F, der Rest ist Magenta
      const F = quelle[i] >= 0 ? farbe(quelle[i]) : null;
      let a = 0, rest = 0;
      if (F) {
        const v = [F[0] - K[0], F[1] - K[1], F[2] - K[2]];
        const u = [C[0] - K[0], C[1] - K[1], C[2] - K[2]];
        const vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
        if (vv > 40 * 40) a = Math.max(0, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / vv));
        rest = Math.hypot(u[0] - a * v[0], u[1] - a * v[1], u[2] - a * v[2]);
      }
      if (rest > MISCH_REST) {
        // Keine Mischung aus F und Magenta. Grauer Rauch (Russwolke, Nebel): so durchsichtig, wie er
        // auf dem Magenta war. Hell: ein Leuchten in eigener Farbe (z. B. um einen Kristall), so
        // durchsichtig wie möglich. Sonst Motiv (rosa Lichtkante auf dem Mantel).
        a = rauchAnteil(C, K) ?? (C[0] >= 200 ? 1 - magentaAnteil(C, K) : 1);
      }
      // Farbe ohne den Magenta-Anteil; fast deckende Pixel ganz deckend, sonst schimmert das Motiv durch
      if (a > 0.02 && a < 1) [r, g, b] = C.map((c, k) => Math.max(0, Math.min(255, Math.round((c - (1 - a) * K[k]) / a)))) as Farbe;
      if (a >= DECKEND_AB) a = 1;
      alpha = Math.round(a * 255);
    }
    if (alpha === 0) r = g = b = 0;
    aus[i * 4] = r; aus[i * 4 + 1] = g; aus[i * 4 + 2] = b; aus[i * 4 + 3] = alpha;
  }

  // 5. Auf Wunsch: dünne Linien unter den Füssen (gezeichneter Boden) entfernen.
  if (bodenAnteil !== null) {
    const motiv = new Uint8Array(total);
    for (let i = 0; i < total; i++) motiv[i] = aus[i * 4 + 3] > 0 ? 1 : 0;
    const weg = duenneLinienWeg(motiv, w, h, Math.round(bodenAnteil * h), BODEN_RADIUS);
    for (let i = 0; i < total; i++) if (weg[i]) aus.fill(0, i * 4, i * 4 + 4);
  }
  return aus;
}

async function main() {
  const args = process.argv.slice(2);
  const wert = (name: string): string | null => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] ?? null : null;
  };
  const boden = wert("--boden");
  const vorschau = wert("--vorschau");
  const keys = args.filter((a, i) => !a.startsWith("--") && !["--boden", "--vorschau"].includes(args[i - 1]));
  const sizes = getTargetSizes();

  if (keys.length === 0) {
    console.error("Aufruf: npm run sprite-freistellen -- KEY [KEY ...] [--boden 0.87] [--vorschau ORDNER]");
    process.exit(1);
  }

  let fehler = 0;
  for (const key of keys) {
    const size = sizes[key];
    const input = path.join(GENERATED_DIR, `${key}.png`);
    if (!size) { console.error(`❌ ${key}: nicht in der Registry`); fehler++; continue; }
    if (!fs.existsSync(input)) { console.error(`❌ ${key}: ${input} fehlt`); fehler++; continue; }

    const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgba = freistellen(data, info.width, info.height, boden ? Number(boden) : null);
    const roh = { raw: { width: info.width, height: info.height, channels: 4 as const } };

    if (vorschau) {
      fs.mkdirSync(vorschau, { recursive: true });
      await sharp(rgba, roh).png().toFile(path.join(vorschau, `${key}.png`));
    }
    const output = path.join(FINAL_DIR, `${key}.png`);
    await sharp(rgba, roh)
      .resize(size.w, size.h, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toFile(output);
    console.log(`✅ ${key}: freigestellt, ${size.w}×${size.h} px → ${output}`);
  }
  if (fehler) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
