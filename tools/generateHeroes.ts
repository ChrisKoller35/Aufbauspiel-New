// ============================================================
// Magic City – Hero Illustration Generator
// Generates hero card illustrations for all 7 missing classes
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error("❌ Kein API Key in .env gefunden!");
  process.exit(1);
}

const OUTPUT_DIR = path.join("public", "assets", "heroes");
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;
const DELAY_MS = 5000;

const BASE_STYLE = `Dark fantasy digital painting, full body character portrait, dramatic lighting from below and behind, painterly brushwork like Hades 2 or Diablo IV character art. Dark moody background with subtle magical effects. The character stands in a powerful pose facing the viewer. Rich detail on armor/clothing/weapons. Color palette: deep navy and charcoal background with warm gold, amber, and teal accent lighting. Square composition, centered character. No text, no UI, no frame.`;

interface HeroDef {
  key: string;
  prompt: string;
}

const HEROES: HeroDef[] = [
  {
    key: "hero_berserker",
    prompt: `${BASE_STYLE} A massive, scarred berserker warrior in a battle rage. Muscular build, wild unkempt hair, tribal war paint on face and arms. Wears torn leather armor and fur pelts, dual-wielding brutal hand axes. Eyes glow with feral red-orange intensity. Background: smoldering battlefield embers and dark smoke. Warm orange and red accent lighting from burning ground.`
  },
  {
    key: "hero_assassin",
    prompt: `${BASE_STYLE} A lithe, deadly female assassin emerging from shadows. Sleek dark leather armor with hood partially covering face, only sharp eyes visible. Dual daggers with poison-green gleaming edges. Athletic, agile build. Background: dark alleyway shadows with faint moonlight and floating dust motes. Cool teal and purple accent lighting, mysterious atmosphere.`
  },
  {
    key: "hero_paladin",
    prompt: `${BASE_STYLE} A noble paladin in gleaming silver-gold plate armor with holy symbols engraved. Tall, broad-shouldered, stern but righteous expression. Holds a radiant longsword in one hand and a large kite shield with a glowing sun emblem in the other. A faint golden holy aura surrounds him. Background: cathedral ruins with shafts of divine golden light piercing through darkness.`
  },
  {
    key: "hero_bard",
    prompt: `${BASE_STYLE} A charismatic female bard with an enchanted lute. Elegant but practical traveling clothes in deep burgundy and gold trim. Confident smile, expressive eyes. Musical notes manifest as visible golden magical energy swirling around her instrument. Medium build, theatrical pose. Background: campfire light in a dark forest, warm amber glow.`
  },
  {
    key: "hero_witch",
    prompt: `${BASE_STYLE} A powerful witch channeling wild arcane magic. Dark robes with crackling purple and electric-blue energy arcing between her outstretched hands. Wild dark hair floating with static energy. Intense, fierce expression. Arcane runes glow on her forearms. Background: dark stormy sky with lightning, swirling magical vortex. Purple and electric blue accent lighting.`
  },
  {
    key: "hero_necromancer",
    prompt: `${BASE_STYLE} A gaunt, scholarly necromancer in tattered dark robes with skull motifs. Pale skin, hollow cheeks, glowing green eyes. Holds a twisted bone staff topped with a floating green soul orb. Skeletal hand partially visible reaching from the ground beside him. Background: dark graveyard mist with eerie green necromantic energy rising from the earth.`
  },
  {
    key: "hero_druid",
    prompt: `${BASE_STYLE} A wise female druid connected to nature. Wears organic armor made of living bark and woven vines, with leaves growing from shoulder pauldrons. Staff made from a living tree branch with glowing emerald crystals. Calm, knowing expression. Antler-like crown of branches on her head. Background: ancient sacred grove with bioluminescent plants, soft green and gold nature magic particles floating around.`
  }
];

async function generateImage(prompt: string): Promise<Buffer | null> {
  const fullPrompt = `${prompt} Output ONLY the image, no text.`;
  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"], temperature: 0.5 }
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

  console.log("🎨 Generiere 7 Hero Illustrationen...\n");

  for (let i = 0; i < HEROES.length; i++) {
    const hero = HEROES[i];
    const filePath = path.join(OUTPUT_DIR, `${hero.key}.png`);

    console.log(`[${i + 1}/7] ${hero.key}...`);
    const imageBuffer = await generateImage(hero.prompt);

    if (imageBuffer) {
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`   ✅ Gespeichert: ${filePath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
    } else {
      console.error(`   ❌ Fehlgeschlagen: ${hero.key}`);
    }

    if (i < HEROES.length - 1) {
      console.log(`   ⏳ Warte ${DELAY_MS / 1000}s...`);
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log("\n✨ Fertig! Hero-Bilder in public/assets/heroes/");
}

main().catch(console.error);
