// ============================================================
// Magic City – Sprite Check & Auto-Generate
// ============================================================
// Prüft welche Sprites in der Registry definiert aber noch
// nicht als Datei vorhanden sind.
//
// Nutzung:
//   npm run sprite-check              → Zeigt fehlende Sprites
//   npm run sprite-check -- --fix     → Generiert fehlende automatisch
//   npm run sprite-check -- --phase post-mvp → Nur Post-MVP prüfen
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { SPRITE_REGISTRY, getSpritesByPhase, getSpritesByCategory } from "./spriteRegistry.js";
import type { SpriteDefinition, SpritePhase, SpriteCategory } from "./spriteRegistry.js";

const GENERATED_DIR = path.join("public", "assets", "sprites", "generated");
const FINAL_DIR = path.join("public", "assets", "sprites", "final");

// ─── CLI-Argumente ───────────────────────────────────────────

const args = process.argv.slice(2);
const autoFix = args.includes("--fix");
const phaseFilter = args.includes("--phase")
  ? args[args.indexOf("--phase") + 1] as SpritePhase
  : undefined;

// ─── Prüfung ─────────────────────────────────────────────────

interface CheckResult {
  sprite: SpriteDefinition;
  hasGenerated: boolean;
  hasFinal: boolean;
}

function checkSprites(): CheckResult[] {
  const results: CheckResult[] = [];

  let sprites = [...SPRITE_REGISTRY];
  if (phaseFilter) {
    sprites = sprites.filter(s => s.phase === phaseFilter);
  }

  for (const sprite of sprites) {
    const generatedPath = path.join(GENERATED_DIR, `${sprite.key}.png`);
    const finalPath = path.join(FINAL_DIR, `${sprite.key}.png`);

    results.push({
      sprite,
      hasGenerated: fs.existsSync(generatedPath),
      hasFinal: fs.existsSync(finalPath),
    });
  }

  return results;
}

// ─── Ausgabe ─────────────────────────────────────────────────

function printReport(results: CheckResult[]) {
  console.log("🔍 Magic City – Sprite Check");
  console.log("=".repeat(60));
  console.log(`📊 Registry: ${SPRITE_REGISTRY.length} Sprites total`);
  if (phaseFilter) console.log(`🔎 Filter: Nur ${phaseFilter}`);
  console.log("");

  // Nach Kategorie gruppieren
  const categories = [...new Set(results.map(r => r.sprite.category))];

  let totalMissing = 0;
  let totalPresent = 0;
  const missingSprites: SpriteDefinition[] = [];

  for (const cat of categories) {
    const catResults = results.filter(r => r.sprite.category === cat);
    const missing = catResults.filter(r => !r.hasFinal);
    const present = catResults.filter(r => r.hasFinal);

    const catLabel = {
      building: "🏠 Gebäude",
      unit: "⚔️  Helden",
      enemy: "👹 Gegner",
      boss: "💀 Bosse",
      item: "🎒 Items",
      terrain: "🌿 Terrain",
      icon: "🔲 Icons",
      specialist: "👤 Spezialisten",
    }[cat] || cat;

    console.log(`${catLabel} (${present.length}/${catResults.length})`);

    for (const r of catResults) {
      const status = r.hasFinal ? "✅" : r.hasGenerated ? "⚠️  (nicht skaliert)" : "❌ FEHLT";
      const phaseTag = r.sprite.phase === "post-mvp" ? " [Post-MVP]" : "";
      console.log(`   ${status} ${r.sprite.key} – ${r.sprite.description}${phaseTag}`);
    }
    console.log("");

    totalMissing += missing.length;
    totalPresent += present.length;
    missingSprites.push(...missing.map(r => r.sprite));
  }

  console.log("=".repeat(60));
  console.log(`📊 Ergebnis: ${totalPresent} vorhanden, ${totalMissing} fehlend`);

  if (totalMissing > 0) {
    console.log("");
    console.log("─".repeat(60));
    console.log("📋 FEHLENDE SPRITES – Generierungs-Prompts:");
    console.log("─".repeat(60));

    for (const s of missingSprites) {
      console.log("");
      console.log(`  🔑 Key: ${s.key}`);
      console.log(`  📐 Größe: ${s.targetWidth}×${s.targetHeight} px`);
      console.log(`  📁 Kategorie: ${s.category} (${s.phase})`);
      console.log(`  📝 Beschreibung: ${s.description}`);
      console.log(`  🎨 Prompt:`);
      console.log(`     ${s.prompt}`);
    }

    console.log("");
    console.log("─".repeat(60));
    console.log(`💡 Fehlende Sprites generieren:`);
    console.log(`   npm run sprite-check -- --fix`);
    console.log(`   oder einzeln:`);
    for (const s of missingSprites.slice(0, 3)) {
      console.log(`   npm run generate-sprites -- ${s.key}`);
    }
    if (missingSprites.length > 3) {
      console.log(`   ... und ${missingSprites.length - 3} weitere`);
    }
  } else {
    console.log("🎉 Alle Sprites sind vorhanden!");
  }

  return missingSprites;
}

// ─── Auto-Fix: Fehlende generieren ──────────────────────────

async function autoGenerate(missing: SpriteDefinition[]) {
  if (missing.length === 0) return;

  const API_KEY = process.env.GOOGLE_AI_API_KEY;
  if (!API_KEY || API_KEY === "DEIN_KEY_HIER") {
    console.error("\n❌ Kein API Key! Kann nicht automatisch generieren.");
    console.error("   Setze GOOGLE_AI_API_KEY in .env");
    process.exit(1);
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;
  const DELAY_MS = 4000;

  console.log("");
  console.log("🚀 Auto-Fix: Generiere fehlende Sprites...");
  console.log("=".repeat(60));

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.mkdirSync(FINAL_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const sprite = missing[i];
    const filePath = path.join(GENERATED_DIR, `${sprite.key}.png`);

    console.log(`🎨 [${i + 1}/${missing.length}] Generiere: ${sprite.key} – ${sprite.description}...`);

    try {
      const body = {
        contents: [{
          parts: [{
            text: `Generate a pixel art game sprite image. ${sprite.prompt}.
            The image must have a solid black background.
            Output ONLY the image, no text.`
          }]
        }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          temperature: 0.4,
        }
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.log(`   ❌ API Error (${response.status})`);
        failed++;
        continue;
      }

      const data = await response.json() as any;
      const parts = data.candidates?.[0]?.content?.parts;

      let imageBuffer: Buffer | null = null;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith("image/")) {
            imageBuffer = Buffer.from(part.inlineData.data, "base64");
            break;
          }
        }
      }

      if (imageBuffer) {
        fs.writeFileSync(filePath, imageBuffer);
        console.log(`   ✅ Gespeichert: ${filePath} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
        success++;
      } else {
        console.log(`   ❌ Kein Bild in Response`);
        failed++;
      }
    } catch (err) {
      console.log(`   ❌ Fehler: ${err}`);
      failed++;
    }

    if (i < missing.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log("");
  console.log(`🏁 Auto-Fix fertig! ✅ ${success} generiert, ❌ ${failed} fehlgeschlagen`);

  if (success > 0) {
    console.log(`\n📋 Nächster Schritt: npm run resize-sprites`);
  }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const results = checkSprites();
  const missing = printReport(results);

  if (autoFix && missing.length > 0) {
    await autoGenerate(missing);
  }
}

main().catch(console.error);
