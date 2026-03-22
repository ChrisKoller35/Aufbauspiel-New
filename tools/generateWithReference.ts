// ============================================================
// Magic City – Sprite-Generator mit Referenzbild
// Schickt ein Referenzbild + Prompt an Gemini und erzeugt
// eine isometrische Version davon.
//
// Nutzung:
//   npx tsx tools/generateWithReference.ts <bildpfad> <ausgabename>
//
// Beispiel:
//   npx tsx tools/generateWithReference.ts reference.png ISO_TEST_REF
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error("Kein GOOGLE_AI_API_KEY in .env gefunden.");
  process.exit(1);
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;
const OUTPUT_DIR = path.join("public", "assets", "sprites", "generated");

const [, , refImagePath, outputName] = process.argv;

if (!refImagePath || !outputName) {
  console.error("Nutzung: npx tsx tools/generateWithReference.ts <bildpfad> <ausgabename>");
  console.error("Beispiel: npx tsx tools/generateWithReference.ts reference.png ISO_TEST_REF");
  process.exit(1);
}

if (!fs.existsSync(refImagePath)) {
  console.error(`Datei nicht gefunden: ${refImagePath}`);
  process.exit(1);
}

async function main() {
  console.log(`Referenzbild:  ${refImagePath}`);
  console.log(`Ausgabe-Key:   ${outputName}`);
  console.log("");

  // Bild einlesen und als Base64 kodieren
  const imageBuffer = fs.readFileSync(refImagePath);
  const base64Image = imageBuffer.toString("base64");
  const ext = path.extname(refImagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

  const prompt = `
Redraw this building as an isometric game sprite.
viewed from directly above-left at a steep 45-degree downward angle,
the ROOF/TOP of the building is clearly visible and takes up the TOP 30% of the image,
you can see THREE surfaces simultaneously: the flat top, the left wall, and the front-right wall,
like a game asset sprite from Clash of Clans or Anno 1800,
the building appears as if seen from a bird flying above and to the left.
Solid bright magenta (#FF00FF) background, no text, no labels.
`.trim();

  const body = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 0.3,
    },
  };

  console.log("Sende Anfrage an Gemini...");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error (${response.status}): ${errorText.substring(0, 400)}`);
    process.exit(1);
  }

  const data = await response.json() as any;
  const parts = data.candidates?.[0]?.content?.parts;

  if (!parts) {
    console.error("Keine Parts in der API-Antwort.");
    console.error(JSON.stringify(data).substring(0, 300));
    process.exit(1);
  }

  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      const outPath = path.join(OUTPUT_DIR, `${outputName}.png`);
      fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, "base64"));
      console.log(`Gespeichert: ${outPath}`);
      console.log("");
      console.log("Naechster Schritt:");
      console.log(`  npm run resize-sprites`);
      console.log(`  npm run remove-bg`);
      return;
    }
  }

  const textParts = parts.map((p: any) => p.text).filter(Boolean).join(" ");
  console.error("Kein Bild in der Antwort gefunden.");
  console.error("Text-Antwort:", textParts.substring(0, 200));
  process.exit(1);
}

main().catch(console.error);
