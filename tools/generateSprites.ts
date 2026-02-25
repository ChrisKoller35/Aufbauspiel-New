// ============================================================
// Magic City – Automatische Sprite-Generierung
// Nutzt Google AI Studio (Gemini / Imagen) API
// ============================================================
// Anleitung:
// 1. In .env die Variable GOOGLE_AI_API_KEY setzen
// 2. npm install
// 3. npm run generate-sprites          (nur MVP-Sprites)
// 4. npm run generate-sprites -- --all (ALLE Sprites inkl. Post-MVP)
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { SPRITE_REGISTRY, getSpritesByPhase } from "./spriteRegistry.js";
import type { SpriteDefinition } from "./spriteRegistry.js";

// ─── Konfiguration ───────────────────────────────────────────

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY || API_KEY === "DEIN_KEY_HIER") {
  console.error("❌ Kein API Key gefunden!");
  console.error("   Öffne die Datei .env und ersetze DEIN_KEY_HIER mit deinem Google AI Studio Key.");
  console.error("   Key holen: https://aistudio.google.com → Get API Key");
  process.exit(1);
}

const OUTPUT_DIR = path.join("public", "assets", "sprites", "generated");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;

// Pause zwischen API-Calls (Rate-Limit respektieren)
const DELAY_MS = 4000;

// ─── CLI-Argumente ───────────────────────────────────────────

const args = process.argv.slice(2);
const generateAll = args.includes("--all");
const onlyKeys = args.filter(a => !a.startsWith("--"));

// ─── Sprites filtern ─────────────────────────────────────────

function getSpritesToGenerate(): SpriteDefinition[] {
  // Wenn bestimmte Keys angegeben: nur diese generieren
  if (onlyKeys.length > 0) {
    return SPRITE_REGISTRY.filter(s => onlyKeys.includes(s.key));
  }
  // --all: alle Sprites
  if (generateAll) {
    return [...SPRITE_REGISTRY];
  }
  // Standard: nur MVP
  return getSpritesByPhase("mvp");
}

// ─── API-Aufruf ──────────────────────────────────────────────

async function generateImage(prompt: string): Promise<Buffer | null> {
  const body = {
    contents: [
      {
        parts: [
          {
            text: `Generate a 2D cartoon game sprite image. ${prompt}.
            The background must be solid bright magenta (#FF00FF) for chroma key removal.
            Output ONLY the image, no text.`
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 0.4,
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   API Error (${response.status}): ${errorText.substring(0, 200)}`);
      return null;
    }

    const data = await response.json() as any;

    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts) {
      console.error("   Keine Parts in Response gefunden.");
      return null;
    }

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }

    console.error("   Kein Bild in Response gefunden. Text-Antwort:",
      parts.map((p: any) => p.text).filter(Boolean).join(" ").substring(0, 100));
    return null;

  } catch (err) {
    console.error(`   Netzwerk-Fehler:`, err);
    return null;
  }
}

// ─── Hauptroutine ────────────────────────────────────────────

async function main() {
  const sprites = getSpritesToGenerate();

  console.log("🎮 Magic City – Sprite-Generator");
  console.log("=".repeat(50));
  console.log(`📁 Ausgabe-Ordner: ${OUTPUT_DIR}`);
  console.log(`🖼️  Modus: ${generateAll ? "ALLE Sprites" : onlyKeys.length > 0 ? `Nur: ${onlyKeys.join(", ")}` : "Nur MVP-Sprites"}`);
  console.log(`📊 Registry: ${SPRITE_REGISTRY.length} total (${getSpritesByPhase("mvp").length} MVP, ${getSpritesByPhase("post-mvp").length} Post-MVP)`);
  console.log(`🎯 Zu generieren: ${sprites.length}`);
  console.log("");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const filePath = path.join(OUTPUT_DIR, `${sprite.key}.png`);

    if (fs.existsSync(filePath)) {
      console.log(`⏭️  [${i + 1}/${sprites.length}] ${sprite.key} – existiert bereits, überspringe`);
      skipped++;
      continue;
    }

    console.log(`🎨 [${i + 1}/${sprites.length}] Generiere: ${sprite.key} (${sprite.category}) – ${sprite.description}...`);

    const imageBuffer = await generateImage(sprite.prompt);

    if (imageBuffer) {
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`   ✅ Gespeichert: ${filePath} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
      success++;
    } else {
      console.log(`   ❌ Fehlgeschlagen: ${sprite.key}`);
      failed++;
    }

    if (i < sprites.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log("");
  console.log("=".repeat(50));
  console.log(`🏁 Fertig!`);
  console.log(`   ✅ Erfolgreich: ${success}`);
  console.log(`   ⏭️  Übersprungen: ${skipped}`);
  console.log(`   ❌ Fehlgeschlagen: ${failed}`);
  console.log("");

  if (success > 0) {
    console.log(`📋 Nächster Schritt: npm run resize-sprites`);
  }
  if (failed > 0) {
    console.log(`\n💡 Tipp: Script erneut laufen lassen – bereits vorhandene Sprites werden übersprungen.`);
  }
}

main().catch(console.error);
