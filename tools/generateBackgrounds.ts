// ============================================================
// Magic City – Background Image Generator
// Generates 3 main menu background variants via Gemini API
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error("❌ Kein API Key in .env gefunden!");
  process.exit(1);
}

const OUTPUT_DIR = path.join("public", "assets", "tiles");
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;

const DELAY_MS = 5000;

interface BgDef {
  key: string;
  prompt: string;
}

const BACKGROUNDS: BgDef[] = [
  {
    key: "bg_main_1",
    prompt: `A wide panoramic fantasy cityscape at night, artistic illustration style similar to Hades 2 or Slay the Spire concept art. A dark medieval-fantasy city with glowing magical towers silhouetted against a deep indigo and dark blue sky. Subtle golden magical particles and faint aurora in the sky. Warm candlelight glows from distant windows. The overall palette is very dark — deep navy (#060810), midnight blue, with sparse gold (#c8a227) and amber accent lights. The image should be atmospheric and painterly, NOT photorealistic. Soft edges, suggested details, impressionistic brushwork. The image must work as a subtle background behind UI cards — keep it dark and understated with most detail in the edges/corners. Wide 16:9 landscape composition. No text, no UI elements, no characters in foreground.`
  },
  {
    key: "bg_main_2",
    prompt: `A wide panoramic enchanted dark forest with a distant magical portal, artistic illustration style similar to Hades 2 or Slay the Spire concept art. Ancient trees frame the edges, with bioluminescent mushrooms and floating magical motes creating soft teal and gold highlights. A faint purple-blue portal glows in the far distance between the trees. Misty atmosphere with light rays filtering through the canopy. The overall palette is very dark — deep navy (#060810), forest blacks and dark greens, with sparse gold (#c8a227) and ethereal teal accents. Painterly, atmospheric, impressionistic brushwork — NOT photorealistic. The image must work as a subtle background behind UI cards — keep it very dark overall with luminous details mostly at the edges. Wide 16:9 landscape composition. No text, no UI elements, no characters.`
  },
  {
    key: "bg_main_3",
    prompt: `A wide panoramic interior of an epic dark fantasy throne hall, artistic illustration style similar to Hades 2 or Slay the Spire concept art. Grand stone columns and arches recede into shadow. Magical runes glow faintly on the walls in gold and amber. Tattered banners hang from the ceiling. A few candles and braziers provide warm orange light pools. The overall palette is very dark — deep navy (#060810), charcoal, dark stone grey, with sparse gold (#c8a227) and warm amber accents. Painterly, atmospheric, impressionistic brushwork — NOT photorealistic. The image must work as a subtle background behind UI cards — keep it extremely dark overall with subtle architectural details fading into darkness. Wide 16:9 landscape composition. No text, no UI elements, no characters.`
  }
];

async function generateImage(prompt: string): Promise<Buffer | null> {
  const fullPrompt = `${prompt}. Output ONLY the image, no text.`;
  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"], temperature: 0.6 }
  };
  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   API Error (${response.status}): ${errorText.substring(0, 300)}`);
      return null;
    }
    const data = await response.json() as any;
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts) { console.error("   Keine Parts in Response."); return null; }
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/"))
        return Buffer.from(part.inlineData.data, "base64");
    }
    console.error("   Kein Bild in Response.");
    return null;
  } catch (err) {
    console.error(`   Netzwerk-Fehler:`, err);
    return null;
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("🎨 Generiere 3 Main Menu Backgrounds...\n");

  for (let i = 0; i < BACKGROUNDS.length; i++) {
    const bg = BACKGROUNDS[i];
    const filePath = path.join(OUTPUT_DIR, `${bg.key}.png`);

    console.log(`[${i + 1}/3] ${bg.key}...`);
    const imageBuffer = await generateImage(bg.prompt);

    if (imageBuffer) {
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`   ✅ Gespeichert: ${filePath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
    } else {
      console.error(`   ❌ Fehlgeschlagen: ${bg.key}`);
    }

    if (i < BACKGROUNDS.length - 1) {
      console.log(`   ⏳ Warte ${DELAY_MS / 1000}s...`);
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log("\n✨ Fertig! Backgrounds in public/assets/tiles/");
}

main().catch(console.error);
