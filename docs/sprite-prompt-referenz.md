# Sprite-Prompt-Referenz (Nano Banana Pro)

> Kondensierte Referenz der Google Gemini Image-Generation API.
> Zweck: Optimale Prompts fuer Sprite-Generierung erstellen.

---

## 1 - Modell-Auswahl

| Modell | API-Name | Staerke | Wann nutzen |
|---|---|---|---|
| **Flash** | `gemini-2.5-flash-image` | Schnell, guenstig, max 1K | Schnelle Entwuerfe, Massenproduktion |
| **Pro** | `gemini-3-pro-image-preview` | Qualitaet, Reasoning, Text, bis 4K | Finale Assets, komplexe Szenen |

Pro ist ein "Thinking"-Modell: Beschreibende Szenen-Anweisungen statt Keyword-Listen.

---

## 2 - Grundprinzip

> **Beschreibe die Szene - liste keine Keywords auf.**

**FALSCH:** `dog, park, 4k, realistic, sunny`
**RICHTIG:** `A golden retriever running through a sun-dappled park on a warm afternoon, captured with a telephoto lens creating a soft bokeh background.`

---

## 3 - Die 6 Prompt-Komponenten

| # | Komponente | Beschreibung | Beispiel |
|---|---|---|---|
| 1 | **Subject** | Wer/Was ist im Bild? Sei spezifisch. | "A sophisticated elderly woman in a vintage suit" |
| 2 | **Composition** | Kamerawinkel, Bildausschnitt | "Close-up portrait", "45 degree top-down isometric" |
| 3 | **Action** | Was passiert? | "Carefully inspecting a tea bowl" |
| 4 | **Setting** | Wo und wann? Umgebung, Tageszeit | "Rustic sun-drenched workshop" |
| 5 | **Style** | Kunststil, Look & Feel | "Pixel art", "Kawaii sticker", "Watercolor" |
| 6 | **Technical** | Kamera, Licht, Farben, Textur | "Soft bokeh", "Three-point softbox lighting" |

---

## 4 - Prompt-Templates

### 4.1 Pixel-Art Sprites (Magic City Standard)
```
A [style] pixel art sprite of a [subject], [action or pose], rendered in
SNES/GBA-inspired style with a limited color palette. [Key visual details].
Black background, clean edges, [size hint e.g. 64x64 or 128x128].
```

### 4.2 Stilisierte Illustrationen / Icons
```
A [style] sticker of a [subject], featuring [key characteristics] and a
[color palette]. The design should have [line style] and [shading style].
The background must be [transparent/black].
```

### 4.3 Text im Bild (Logos, UI-Elemente)
```
Create a [image type] for [concept] with the text "[text]" in a [font style].
The design should be [style description], with a [color scheme].
```
> **Nutze Pro** (`gemini-3-pro-image-preview`) fuer Text im Bild.

### 4.4 Charakter-Konsistenz (verschiedene Ansichten)
```
A studio portrait of [character] against [background],
[looking forward / in profile looking right / etc.]
```
> Vorherige Bilder als Referenz mitgeben fuer Konsistenz.

---

## 5 - Best Practices

1. **Hyper-spezifisch sein** - Statt "fantasy armor" -> "ornate elven plate armor, etched with silver leaf patterns, with pauldrons shaped like falcon wings"
2. **Kontext angeben** - "A building sprite for a fantasy city builder game" ist besser als "a building"
3. **Iterativ arbeiten** - Follow-ups: "Keep everything, but make the lighting warmer"
4. **Positiv formulieren** - Statt "no cars" -> "an empty, deserted street"
5. **Kamera-Sprache nutzen** - `wide-angle shot`, `macro shot`, `low-angle perspective`
6. **Bearbeiten statt neu generieren** - Wenn 80% passt: gezielt aendern

---

## 6 - API-Parameter

### Aspect Ratios
`1:1` | `2:3` | `3:2` | `3:4` | `4:3` | `4:5` | `5:4` | `9:16` | `16:9` | `21:9`

### Aufloesungen (nur Pro)
`1K` (Standard) | `2K` | `4K`
> Uppercase K verwenden, lowercase wird abgelehnt.

### Referenzbilder
- **Flash:** max 3 Input-Bilder
- **Pro:** bis zu 6 Objekt-Bilder + 5 Personen-Bilder

### API-Aufruf (TypeScript / Node.js)
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
  }
});
```

### API-Aufruf (curl)
```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GOOGLE_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "PROMPT"}]}],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"}
    }
  }'
```

---

## 7 - Limitierungen

- Beste Sprachunterstuetzung: EN, DE, FR, ES, IT, JA, KO, PT, RU, ZH
- Kein Audio/Video als Input
- Text zuerst generieren, dann Bild mit Text anfordern (bessere Ergebnisse)
- Alle generierten Bilder enthalten SynthID-Wasserzeichen
