// ============================================================
// Magic City – Intelligente Hintergrund-Entfernung
// ============================================================
// Entfernt Magenta-Hintergruende aus Sprite-PNGs via Flood-Fill
// vom Bildrand. Schwarz wird NICHT entfernt (ist Teil der Sprites).
//
// Vorgehensweise:
// 1. Flood-Fill von allen Randpixeln: markiert zusammenhaengende
//    Magenta-Regionen als "Hintergrund"
// 2. Edge-Antialiasing: Pixel an der Grenze zum Motiv bekommen
//    reduziertes Alpha fuer saubere Kanten
// 3. Originale werden in generated/ gesichert (falls vorhanden)
//
// Anleitung: npm run remove-bg
// ============================================================

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const SPRITES_DIR = path.join("public", "assets", "sprites", "final");
const GENERATED_DIR = path.join("public", "assets", "sprites", "generated");

// --- Hintergrund-Farberkennung ---

/** Ist das Pixel klar Magenta/Hot-Pink? (R hoch, G niedrig, B mittel-hoch) */
function isMagenta(r: number, g: number, b: number): boolean {
  // Hot Pink (Gemini-typisch): R>180, G<80, B>120, R dominiert
  if (r > 180 && g < 80 && b > 120 && r > b) return true;
  // Klassisches Magenta: R>150, G<100, B>150
  if (r > 150 && g < 100 && b > 150) return true;
  // Helles Pink: R>160, G<100, B>130, R+B deutlich groesser als G
  if (r > 160 && g < 100 && b > 130 && (r + b) > (g * 3)) return true;
  return false;
}

/** Ist das Pixel near-black? (alle Kanaele sehr niedrig) */
function isBlack(r: number, g: number, b: number): boolean {
  return Math.max(r, g, b) < 20;
}

/** Ist das Pixel ein Hintergrund-Kandidat? (Magenta ODER Schwarz) */
function isBackground(r: number, g: number, b: number): boolean {
  return isMagenta(r, g, b) || isBlack(r, g, b);
}

/** Koennte das Pixel eine Mischung aus Magenta + Motiv sein? (Anti-Aliasing-Kante) */
function isSemiMagenta(r: number, g: number, b: number): boolean {
  // Weniger streng als isMagenta, fuer Uebergangspixel an der Kante
  if (g >= r && g >= b) return false;
  if (r < 100 || b < 80) return false;
  // Hot-Pink-artig: R dominant, G niedrig
  const rFactor = Math.min(1, r / 160);
  const bFactor = Math.min(1, b / 130);
  const gInverse = 1 - (g / Math.max(r, b, 1));
  const mag = rFactor * bFactor * gInverse;
  return mag > 0.35;
}

/** Magenta-Anteil eines Pixels (0-1) fuer Alpha-Berechnung */
function magentaAmount(r: number, g: number, b: number): number {
  if (g >= r && g >= b) return 0;
  if (r < 80 || b < 60) return 0;
  const rFactor = Math.min(1, r / 180);
  const bFactor = Math.min(1, b / 140);
  const gInverse = 1 - (g / Math.max(r, b, 1));
  return Math.min(1, rFactor * bFactor * gInverse);
}

// --- Flood-Fill Background Detection ---

async function processSprite(filePath: string): Promise<boolean> {
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;
  if (!width || !height) return false;

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const w = info.width;
  const h = info.height;
  const total = w * h;

  // --- Pass 1: Flood-fill von Raendern ---
  // Markiere zusammenhaengende Magenta-Regionen die den Bildrand beruehren
  const isBg = new Uint8Array(total); // 0=unbekannt, 1=hintergrund, 2=besucht-kein-bg

  const idx = (x: number, y: number) => y * w + x;
  const pixelAt = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
  };

  // Seed-Pixel: alle Randpixel die Hintergrund (Magenta/Schwarz) oder transparent sind
  const queue: number[] = [];
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const [r, g, b, a] = pixelAt(x, y);
      if (a === 0 || isBackground(r, g, b)) {
        const i = idx(x, y);
        if (isBg[i] === 0) { isBg[i] = 1; queue.push(i); }
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const [r, g, b, a] = pixelAt(x, y);
      if (a === 0 || isBackground(r, g, b)) {
        const i = idx(x, y);
        if (isBg[i] === 0) { isBg[i] = 1; queue.push(i); }
      }
    }
  }

  // BFS: Hintergrund-Region vom Rand aus (Magenta + Schwarz)
  let head = 0;
  while (head < queue.length) {
    const ci = queue[head++];
    const cx = ci % w;
    const cy = Math.floor(ci / w);

    const neighbors = [
      [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const ni = idx(nx, ny);
      if (isBg[ni] !== 0) continue; // bereits besucht

      const [r, g, b, a] = pixelAt(nx, ny);
      if (a === 0 || isBackground(r, g, b)) {
        isBg[ni] = 1; // Hintergrund
        queue.push(ni);
      } else {
        isBg[ni] = 2; // Kein Hintergrund (besucht)
      }
    }
  }

  // --- Pass 2: Hintergrund-Pixel transparent machen ---
  let changed = false;
  for (let i = 0; i < total; i++) {
    if (isBg[i] === 1) {
      pixels[i * 4 + 3] = 0; // Alpha = 0
      changed = true;
    }
  }

  // --- Pass 3: Edge-Antialiasing ---
  // Pixel die neben einem entfernten Hintergrund-Pixel liegen
  // und teilweise Magenta sind → Alpha reduzieren fuer saubere Kanten
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      if (isBg[i] === 1) continue; // Schon entfernt

      const pi = i * 4;
      const a = pixels[pi + 3];
      if (a === 0) continue;

      // Pruefen ob Nachbar ein entfernter Hintergrund-Pixel ist
      let adjacentToBg = false;
      for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && isBg[idx(nx, ny)] === 1) {
          adjacentToBg = true;
          break;
        }
      }

      if (!adjacentToBg) continue;

      const r = pixels[pi], g = pixels[pi + 1], b = pixels[pi + 2];

      // Ist dieses Rand-Pixel eine Anti-Aliasing-Mischung mit dem Hintergrund?
      const maxCh = Math.max(r, g, b);
      if (isSemiMagenta(r, g, b)) {
        // Magenta-Kante
        const mag = magentaAmount(r, g, b);
        const newAlpha = Math.round((1 - mag * 0.8) * a);
        pixels[pi + 3] = Math.max(0, newAlpha);
        changed = true;
      } else if (maxCh < 40) {
        // Near-black Kante (Anti-Aliasing mit schwarzem Hintergrund)
        // Je dunkler, desto transparenter
        const darkness = 1 - (maxCh / 40);
        const newAlpha = Math.round((1 - darkness * 0.7) * a);
        pixels[pi + 3] = Math.max(0, newAlpha);
        changed = true;
      }
    }
  }

  if (changed) {
    await sharp(pixels, {
      raw: { width: w, height: h, channels: 4 },
    })
      .png()
      .toFile(filePath + ".tmp");

    fs.renameSync(filePath + ".tmp", filePath);
  }

  return changed;
}

// --- Backup originale Sprites aus generated/ falls vorhanden ---

function restoreFromGenerated(file: string): boolean {
  const genPath = path.join(GENERATED_DIR, file);
  const finalPath = path.join(SPRITES_DIR, file);

  if (fs.existsSync(genPath)) {
    fs.copyFileSync(genPath, finalPath);
    return true;
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const restoreFirst = args.includes("--restore");

  console.log("Magic City - Intelligente Hintergrund-Entfernung");
  console.log("=".repeat(50));
  console.log(`Ordner: ${SPRITES_DIR}`);
  if (restoreFirst) console.log("Modus: Restore aus generated/ + BG-Entfernung");
  console.log("");

  if (!fs.existsSync(SPRITES_DIR)) {
    console.error(`Ordner nicht gefunden: ${SPRITES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SPRITES_DIR).filter(f => f.endsWith(".png"));
  console.log(`${files.length} Sprites gefunden`);
  console.log("");

  // Skip-Liste: UI-Sprites die programmatisch generiert werden
  const skipPrefixes = ["UI_", "BG_MAIN_MENU"];
  const shouldSkip = (name: string) => skipPrefixes.some(p => name.startsWith(p));

  let processed = 0;
  let skipped = 0;
  let unchanged = 0;
  let restored = 0;

  for (const file of files) {
    const key = file.replace(".png", "");

    if (shouldSkip(key)) {
      console.log(`   SKIP ${key} (UI-Sprite)`);
      skipped++;
      continue;
    }

    // Optional: Originale aus generated/ wiederherstellen
    if (restoreFirst && restoreFromGenerated(file)) {
      console.log(`   RESTORE ${key} (aus generated/)`);
      restored++;
    }

    const filePath = path.join(SPRITES_DIR, file);
    try {
      const wasChanged = await processSprite(filePath);
      if (wasChanged) {
        console.log(`   OK ${key} - Hintergrund entfernt`);
        processed++;
      } else {
        console.log(`   -- ${key} - kein Hintergrund erkannt`);
        unchanged++;
      }
    } catch (err) {
      console.error(`   FEHLER ${key}:`, err);
    }
  }

  console.log("");
  console.log("=".repeat(50));
  console.log(`Fertig! ${processed} bearbeitet, ${unchanged} unveraendert, ${skipped} uebersprungen`);
  if (restored > 0) console.log(`${restored} aus generated/ wiederhergestellt`);
}

main().catch(console.error);
