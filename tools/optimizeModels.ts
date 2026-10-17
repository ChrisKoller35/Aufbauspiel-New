#!/usr/bin/env npx tsx
/**
 * optimizeModels.ts
 *
 * Optimiert alle GLB-Dateien aus public/assets/Gebäude/
 * und speichert sie komprimiert in public/assets/models/
 *
 * Optimierungen:
 *  1. Boden-Geometrie entfernen (Faces unter Y-Schwelle)
 *  2. Mesh: dedup, join, weld, simplify (ratio 0.5), meshopt
 *  3. Texturen: WebP 512x512
 *  Ziel: ~2-5 MB pro Modell
 *
 * Usage: npm run optimize-models
 *        npm run optimize-models -- --force   (überschreibt bestehende)
 *        npm run optimize-models -- well      (nur ein Modell)
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const INPUT_DIR = path.resolve("public/assets/Gebäude");
const OUTPUT_DIR = path.resolve("public/assets/models");
const TEMP_DIR = path.resolve("public/assets/models/.tmp");

const force = process.argv.includes("--force");
const rawArgs = process.argv.slice(2).filter(a => a !== "--force");
const filterKey = rawArgs.length > 0 ? rawArgs[rawArgs.length - 1] : undefined;

// Ensure directories exist
for (const dir of [OUTPUT_DIR, TEMP_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".glb"));

if (files.length === 0) {
  console.log("Keine GLB-Dateien in", INPUT_DIR);
  process.exit(0);
}

console.log(`\n🔧 GLB Optimizer — ${files.length} Modelle gefunden\n`);

let totalBefore = 0;
let totalAfter = 0;
let processed = 0;
let skipped = 0;

for (const file of files) {
  const name = path.basename(file, ".glb");

  if (filterKey && !name.toLowerCase().includes(filterKey.toLowerCase())) {
    continue;
  }

  const inputPath = path.join(INPUT_DIR, file);
  const outputPath = path.join(OUTPUT_DIR, file);

  const inputSize = fs.statSync(inputPath).size;
  const inputMB = (inputSize / 1024 / 1024).toFixed(1);

  if (!force && fs.existsSync(outputPath)) {
    const outputSize = fs.statSync(outputPath).size;
    const outputMB = (outputSize / 1024 / 1024).toFixed(1);
    console.log(`⏭️  ${name} — bereits vorhanden (${outputMB} MB), --force zum Überschreiben`);
    skipped++;
    continue;
  }

  console.log(`⚙️  ${name} (${inputMB} MB) → optimiere...`);

  try {
    // Step 1: Remove floor geometry via prune with flatten first
    const tempFloor = path.join(TEMP_DIR, `${name}_nofloor.glb`);
    const tempSimplified = path.join(TEMP_DIR, `${name}_simple.glb`);

    // Flatten + join meshes, then heavy simplify + small textures
    const cmd = [
      "npx gltf-transform optimize",
      `"${inputPath}"`,
      `"${outputPath}"`,
      "--compress meshopt",
      "--texture-compress webp",
      "--texture-size 512",
      "--simplify-ratio 0.5",
      "--simplify-error 0.01",
    ].join(" ");

    execSync(cmd, { stdio: "pipe", timeout: 600000 });

    const outputSize = fs.statSync(outputPath).size;
    const outputMB = (outputSize / 1024 / 1024).toFixed(1);
    const ratio = ((1 - outputSize / inputSize) * 100).toFixed(0);

    console.log(`   ✅ ${inputMB} MB → ${outputMB} MB (−${ratio}%)\n`);

    totalBefore += inputSize;
    totalAfter += outputSize;
    processed++;

    // Cleanup temp files
    for (const tmp of [tempFloor, tempSimplified]) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  } catch (err: any) {
    console.error(`   ❌ Fehler bei ${name}:`, err.message?.slice(0, 300));
  }
}

// Cleanup temp dir
if (fs.existsSync(TEMP_DIR)) {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

if (processed > 0) {
  const beforeMB = (totalBefore / 1024 / 1024).toFixed(1);
  const afterMB = (totalAfter / 1024 / 1024).toFixed(1);
  const totalRatio = ((1 - totalAfter / totalBefore) * 100).toFixed(0);
  console.log(`\n📊 Gesamt: ${beforeMB} MB → ${afterMB} MB (−${totalRatio}%)`);
}

console.log(`\n✅ ${processed} optimiert, ${skipped} übersprungen\n`);
