// ============================================================
// Magic City – Sprite Resize/Skalierung
// Skaliert die generierten Bilder auf die korrekten Zielgrößen
// ============================================================
// Anleitung: npm run resize-sprites
// (Erst nach npm run generate-sprites ausführen)
// ============================================================

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { getTargetSizes } from "./spriteRegistry.js";

const INPUT_DIR = path.join("public", "assets", "sprites", "generated");
const OUTPUT_DIR = path.join("public", "assets", "sprites", "final");

const TARGET_SIZES = getTargetSizes();

async function main() {
  const args = process.argv.slice(2);
  // --only KEY1 KEY2 ... → nur bestimmte Sprites resizen
  const onlyIdx = args.indexOf("--only");
  const onlyKeys: Set<string> | null = onlyIdx >= 0
    ? new Set(args.slice(onlyIdx + 1).map(k => k.toUpperCase()))
    : null;
  // --force → überschreibt auch bereits existierende final/ Sprites
  const force = args.includes("--force");

  console.log("📐 Magic City – Sprite Resizer");
  console.log("=".repeat(50));
  if (force) {
    console.log("⚡ Force-Modus: Alle Sprites werden neu skaliert");
  } else {
    console.log("🔄 Skip-Modus: Bereits vorhandene final/ Sprites werden übersprungen");
    console.log("   (--force zum Überschreiben aller Sprites)");
  }
  if (onlyKeys && onlyKeys.size > 0) {
    console.log(`🎯 Nur ausgewählte Sprites: ${[...onlyKeys].join(", ")}`);
  }

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ Input-Ordner nicht gefunden: ${INPUT_DIR}`);
    console.error("   Erst 'npm run generate-sprites' ausführen!");
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".png"));

  // Filter auf --only Keys falls angegeben
  if (onlyKeys && onlyKeys.size > 0) {
    files = files.filter(f => onlyKeys.has(f.replace(".png", "").toUpperCase()));
  }

  console.log(`📁 Gefundene Sprites: ${files.length}`);
  console.log("");

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const key = file.replace(".png", "");
    const size = TARGET_SIZES[key];

    if (!size) {
      console.log(`⚠️  ${key} – keine Zielgröße definiert, überspringe`);
      continue;
    }

    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    if (!force && fs.existsSync(outputPath)) {
      console.log(`   ⏭️  ${key}: bereits vorhanden, überspringe`);
      success++;
      continue;
    }

    try {
      await sharp(inputPath)
        .resize(size.w, size.h, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toFile(outputPath);

      console.log(`   ✅ ${key}: ${size.w}×${size.h} px → ${outputPath}`);
      success++;
    } catch (err) {
      console.error(`   ❌ ${key}: Fehler beim Skalieren:`, err);
      failed++;
    }
  }

  console.log("");
  console.log("=".repeat(50));
  console.log(`🏁 Fertig!  ✅ ${success} skaliert  ❌ ${failed} fehlgeschlagen`);
  console.log(`📁 Finale Sprites: ${OUTPUT_DIR}`);
  console.log("");
  console.log("📋 Die Sprites sind jetzt bereit für Phaser 3!");
  console.log('   Lade sie in der BootScene mit:');
  console.log('   this.load.image("FARM_GRAIN", "assets/sprites/final/FARM_GRAIN.png")');
}

main().catch(console.error);
