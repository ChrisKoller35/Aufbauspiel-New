import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) { console.error("No API key"); process.exit(1); }

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;
const OUTPUT = path.join("public", "assets", "heroes", "hero_druid.png");

const PROMPT = `A dark fantasy digital painting of a female druid warrior standing in a sacred forest grove. She wears organic bark-and-vine armor with leaf shoulder pauldrons, holds a living tree-branch staff with glowing emerald crystals, and has an antler crown of branches on her head. Calm, powerful expression. Bioluminescent plants and green-gold magical particles surround her. Painterly art style like Hades 2 concept art. Dark moody atmosphere, deep navy and charcoal tones with teal and emerald accents. Dramatic lighting from behind. The background forest scene must extend fully to ALL edges of the image — top, bottom, left, right. Absolutely NO borders, NO margins, NO bars, NO empty space at any edge. The painted scene touches every pixel of the canvas edge. Output ONLY the image, no text.`;

async function main() {
  console.log("Regenerating hero_druid...");
  const body = {
    contents: [{ parts: [{ text: PROMPT }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"], temperature: 0.6 }
  };
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { console.error(`API Error ${res.status}`); process.exit(1); }
  const data = await res.json() as any;
  const parts = data.candidates?.[0]?.content?.parts;
  for (const part of (parts || [])) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      const buf = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(OUTPUT, buf);
      console.log(`✅ Saved: ${OUTPUT} (${(buf.length / 1024).toFixed(0)} KB)`);
      return;
    }
  }
  console.error("❌ No image in response");
}

main().catch(console.error);
