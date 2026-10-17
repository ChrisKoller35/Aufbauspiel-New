// ============================================================
// Magic City – Hero Card Illustrations (3:4 Portrait)
// Usage: npx tsx tools/generateHeroImages.ts
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error("Kein GOOGLE_AI_API_KEY in .env gefunden!");
  process.exit(1);
}

const OUTPUT_DIR = path.join("public", "assets", "heroes");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;
const DELAY_MS = 5000;

interface HeroDef {
  key: string;
  prompt: string;
}

const STYLE_SUFFIX = `Style: painterly digital illustration, modern fantasy RPG (Diablo IV / World of Warcraft quality),
rich colors, dramatic lighting, dark moody atmosphere.
Full body portrait, 3:4 vertical composition, the character fills the entire frame.
No text, no UI elements, no borders, no frames. Dark background that blends into a dark game UI.`;

const HEROES: HeroDef[] = [
  {
    key: "hero_guardian",
    prompt: `A powerful human Guardian knight standing in a heroic defensive pose for a fantasy RPG character card.
He wears heavy ornate plate armor with golden trim and a lion emblem on the chestplate, holding a large tower shield
in his left hand and a gleaming one-handed sword in his right. Strong build, weathered face with a determined expression,
short dark hair. Behind him, faint magical shield runes glow in protective blue light.
Warm torchlight from below, cool blue magical light from the shield creates dramatic dual-tone lighting.
${STYLE_SUFFIX}`,
  },
  {
    key: "hero_ranger",
    prompt: `A swift elven Ranger standing in a ready-to-shoot pose for a fantasy RPG character card.
She holds a finely crafted longbow drawn back with a glowing arrow, wearing light leather armor with green and brown forest tones,
a hooded cloak draped over one shoulder. Athletic build, sharp focused eyes, long braided auburn hair.
Behind her, a misty moonlit forest with fireflies and soft green ambient glow.
Cool moonlight from above, warm firefly glow creates atmospheric lighting.
${STYLE_SUFFIX}`,
  },
  {
    key: "hero_cleric",
    prompt: `A wise human Cleric standing in a divine casting pose for a fantasy RPG character card.
She raises a golden holy staff topped with a radiant crystal, wearing flowing white and gold ceremonial robes
with intricate divine symbols embroidered in gold thread. Warm complexion, serene expression, silver-white hair.
Holy golden light radiates from the staff and from her free hand, illuminating her from within.
Behind her, cathedral-like light beams pierce through darkness.
Warm golden divine light dominates, with deep shadow contrast.
${STYLE_SUFFIX}`,
  },
];

async function generateImage(prompt: string): Promise<Buffer | null> {
  const body = {
    contents: [{ parts: [{ text: prompt + "\n\nOutput ONLY the image, no text." }] }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 0.7,
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   API Error (${response.status}): ${errorText.substring(0, 300)}`);
      return null;
    }

    const data = (await response.json()) as any;
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts) {
      console.error("   Keine Parts in Response.");
      return null;
    }

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }

    console.error("   Kein Bild gefunden.");
    return null;
  } catch (err) {
    console.error(`   Netzwerk-Fehler:`, err);
    return null;
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\n  Generiere ${HEROES.length} Hero-Illustrationen (3:4 Portrait)...\n`);

  for (let i = 0; i < HEROES.length; i++) {
    const hero = HEROES[i];
    const outPath = path.join(OUTPUT_DIR, `${hero.key}.png`);

    if (fs.existsSync(outPath)) {
      console.log(`  [${i + 1}/${HEROES.length}] ${hero.key} — existiert bereits, uebersprungen`);
      continue;
    }

    console.log(`  [${i + 1}/${HEROES.length}] ${hero.key} — generiere...`);

    const buf = await generateImage(hero.prompt);
    if (buf) {
      fs.writeFileSync(outPath, buf);
      console.log(`    -> ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
    } else {
      console.error(`    -> FEHLER bei ${hero.key}`);
    }

    if (i < HEROES.length - 1) {
      console.log(`    Warte ${DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n  Fertig! Bilder in: ${OUTPUT_DIR}/\n`);
}

main().catch(console.error);
