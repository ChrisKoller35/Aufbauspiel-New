// ============================================================
// Magic City – Gemini Second Opinion
// Holt eine unabhaengige Zweitmeinung von Gemini
// ============================================================
// Nutzung:
//   npm run second-opinion -- "Deine Frage hier"
//   npm run second-opinion -- "Frage" --context src/data/buildings.ts
//   npm run second-opinion -- "Frage" --pro          (fuer wichtige Entscheidungen)
//   npm run second-opinion -- "Frage" --lite          (fuer schnelle Checks)
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

// ─── Konfiguration ───────────────────────────────────────────

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY || API_KEY === "DEIN_KEY_HIER") {
  console.error("Kein API Key gefunden!");
  console.error("Oeffne .env und setze GOOGLE_AI_API_KEY.");
  process.exit(1);
}

const MODELS: Record<string, { id: string; label: string; tokens: number }> = {
  lite:  { id: "gemini-2.5-flash-lite", label: "Flash-Lite (schnell & guenstig)", tokens: 1000 },
  flash: { id: "gemini-2.5-flash",      label: "Flash (Standard)",               tokens: 1500 },
  pro:   { id: "gemini-2.5-pro",        label: "Pro (beste Qualitaet)",          tokens: 2500 },
};

// ─── CLI-Argumente parsen ────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
Gemini Second Opinion – Holt eine Zweitmeinung von Gemini

Nutzung:
  npm run second-opinion -- "Deine Frage"
  npm run second-opinion -- "Frage" --context datei.ts
  npm run second-opinion -- "Frage" --context datei1.ts --context datei2.ts

Modell-Auswahl (Default: Flash):
  --lite               Flash-Lite – schnellste, guenstigste Option (1000 Req/Tag frei)
  --flash              Flash – guter Mittelweg (Standard, 250 Req/Tag frei)
  --pro                Pro – beste Qualitaet, Deep Think (100 Req/Tag frei)

Optionen:
  --context <pfad>     Datei(en) als Kontext mitgeben (mehrfach moeglich)
  --help               Diese Hilfe anzeigen
`);
  process.exit(0);
}

// Modell bestimmen
let modelKey = "flash";
if (args.includes("--pro"))  modelKey = "pro";
if (args.includes("--lite")) modelKey = "lite";

const selectedModel = MODELS[modelKey];
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.id}:generateContent?key=${API_KEY}`;

// Frage ist das erste Argument (kein Flag)
let question = "";
const contextFiles: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--context" && i + 1 < args.length) {
    contextFiles.push(args[i + 1]);
    i++; // skip next
  } else if (!args[i].startsWith("--")) {
    question = args[i];
  }
}

if (!question) {
  console.error("Keine Frage angegeben. Nutzung: npm run second-opinion -- \"Deine Frage\"");
  process.exit(1);
}

// ─── Kontext-Dateien laden ───────────────────────────────────

let contextBlock = "";

for (const filePath of contextFiles) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Datei nicht gefunden: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(resolved, "utf-8");
  const truncated = content.length > 8000
    ? content.slice(0, 8000) + "\n[... gekuerzt auf 8000 Zeichen]"
    : content;
  contextBlock += `\n\n--- Datei: ${filePath} ---\n${truncated}`;
}

// ─── Prompt bauen ────────────────────────────────────────────

const systemPrompt = `Du bist ein erfahrener Game-Developer und gibst eine Second Opinion zu einer Entscheidung.
Projekt: Magic City – Fantasy City Builder + RPG Expeditionen (Phaser 3, TypeScript).
Antworte auf Deutsch. Sei direkt und konkret.

Format:
- **Einschaetzung:** Deine Meinung in 1-2 Saetzen
- **Pro:** Was dafuer spricht (Bulletpoints)
- **Contra:** Was dagegen spricht (Bulletpoints)
- **Alternative:** Falls du einen besseren Ansatz siehst
- **Empfehlung:** Klare Empfehlung in einem Satz`;

const userPrompt = contextBlock
  ? `${question}\n\nKontext:${contextBlock}`
  : question;

// ─── API-Aufruf ─────────────────────────────────────────────

async function askGemini(): Promise<void> {
  console.log(`\nGemini Second Opinion (${selectedModel.label})`);
  console.log(`Modell: ${selectedModel.id}`);
  console.log(`Frage: ${question}`);
  if (contextFiles.length > 0) {
    console.log(`Kontext: ${contextFiles.join(", ")}`);
  }
  console.log("─".repeat(60));
  console.log("Warte auf Antwort...\n");

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: selectedModel.tokens
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API-Fehler (${response.status}): ${errorText}`);
      process.exit(1);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Keine Antwort von Gemini erhalten.");
      console.error("Response:", JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log(text);
    console.log("\n" + "─".repeat(60));
    console.log("(Gemini Second Opinion – Endentscheidung trifft Claude)");
  } catch (err) {
    console.error("Netzwerk-Fehler:", err);
    process.exit(1);
  }
}

askGemini();
