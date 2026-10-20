# Magic City – Projektanleitung für AI-Agenten

## Projektübersicht
Magic City ist ein Fantasy-Aufbauspiel (City Builder + RPG Expeditionen) mit Phaser 3, TypeScript und Vite.

## Tech Stack
- **Engine:** Phaser 3
- **Sprache:** TypeScript
- **Build:** Vite
- **Persistenz:** LocalStorage
- **Plattform:** Webbrowser

## Projektstruktur
```
public/assets/sprites/final/    ← Finale Sprites (spielbereit)
public/assets/sprites/generated/ ← Roh-Sprites (von API generiert)
public/assets/audio/sfx/        ← Sound-Effekte (auto-generiert)
public/assets/audio/music/      ← Hintergrundmusik (manuell via Suno.com)
tools/                          ← Build-Tools & Asset-Generierung
  spriteRegistry.ts             ← ZENTRALE Sprite-Registry (alle Definitionen)
  generateSprites.ts            ← Sprite-Generator (nutzt Registry)
  resizeSprites.ts              ← Sprite-Resizer (nutzt Registry)
  spriteCheck.ts                ← Check & Auto-Generate fehlender Sprites
  generateSounds.ts             ← SFX-Generator (jsfxr)
docs/                           ← Referenz-Dokumente
  sprite-prompt-referenz.md     ← Gemini Image API Prompt-Guide
```

## Sprite-System (WICHTIG!)

### Wenn du einen neuen Sprite brauchst:
1. Prüfe zuerst ob er schon in `tools/spriteRegistry.ts` definiert ist
2. Falls ja: `npm run sprite-check` zeigt ob er als Datei existiert
3. Falls die Datei fehlt: `npm run sprite-fix` generiert ihn automatisch via Google AI API
4. Danach: `npm run resize-sprites` skaliert auf Zielgröße (überspringt bestehende automatisch)
5. Falls der Sprite noch NICHT in der Registry ist:
   - Füge ihn in `tools/spriteRegistry.ts` ein (nutze die `sprite()` Hilfsfunktion)
   - Wähle den passenden Style aus `STYLES` (BUILDING, UNIT, ENEMY, BOSS, ITEM, ICON, etc.)
   - Setze `phase: "post-mvp"` für neue Features
   - Dann `npm run sprite-fix` zum Generieren

> ⚠️ **WICHTIG nach jedem Sprite-Generate/Resize:**
> `npm run remove-bg` ausführen! Sonst haben die neuen Sprites noch magenta/schwarze Hintergründe.
> `resize-sprites` überspringt zwar bestehende Sprites, aber neue werden immer mit Hintergrund generiert.
> **Reihenfolge:** `sprite-fix` → `resize-sprites` → `remove-bg`
> `remove-bg` erwischt nur Magenta, das vom Bildrand aus erreichbar ist. Bleibt Magenta zwischen Beinen oder in
> einem Feuerwirbel stehen: `npm run sprite-freistellen -- KEY` (stellt in voller Grösse frei, auch Schatten).
> Schon freigestellte Sprites lässt `remove-bg` unverändert.

> 🚫 **NIEMALS `remove-bg` auf handgezeichnete Icons anwenden!**
> `public/assets/sprites/final/Neue Icons/` enthält vom User erstellte Icons mit **gewolltem farbigem Slot-Hintergrund** (grün/blau/violett/orange).
> `remove-bg` würde diese Hintergründe zerstören — das ist der Fehler aus dem Incident vom 15.03.2026.
> `remove-bg` liest nur direkte Dateien in `final/`, keine Unterordner → Unterordner sind automatisch sicher.

> 📁 **`final/Neue Icons/` ist ein permanenter Ordner — NIEMALS löschen oder auflösen!**
> Hier landen alle neuen handgezeichneten Icons bevor sie verarbeitet werden.
> Der Ordner ist die Quelle für neue Item-Icons und muss dauerhaft erhalten bleiben.

### Verfügbare npm Scripts:
```bash
npm run sprite-check              # Zeigt alle fehlenden Sprites mit Prompts
npm run sprite-fix                # Generiert fehlende Sprites automatisch
npm run generate-sprites          # Generiert nur MVP-Sprites
npm run generate-sprites -- --all # Generiert ALLE Sprites (auch Post-MVP)
npm run generate-sprites -- KEY   # Generiert nur einen bestimmten Sprite
npm run resize-sprites            # Skaliert alle auf Zielgrößen
npm run sprite-freistellen -- KEY # Freistellen in voller Grösse + skalieren (neue Gegner, siehe docs/NEUE-DUNGEONS.md)
npm run generate-sounds           # Generiert alle SFX (jsfxr)
npm run generate-all              # Sprites + Resize + Sounds
```

### Sprite-Pfade im Code:
Sprites werden im Spiel geladen als:
```typescript
this.load.image("FARM_GRAIN", "assets/sprites/final/FARM_GRAIN.png");
```
Die Keys entsprechen den Dateinamen ohne Endung.

## Sound-System
- **SFX:** 31 WAV-Dateien, auto-generiert via `npm run generate-sounds`
- **Musik:** 5 MP3-Dateien müssen manuell erstellt werden (Suno.com/Udio.com)
  - Prompts stehen in `public/assets/audio/README.md`
  - Zielordner: `public/assets/audio/music/`

## API Key
- Google AI Studio Key liegt in `.env` als `GOOGLE_AI_API_KEY`
- Wird fuer Sprite-Generierung und Gemini Second Opinion genutzt
- NIEMALS committen oder teilen!

## Konventionen
- Sprite-Keys: UPPER_SNAKE_CASE (z.B. `HERO_GUARDIAN`, `ENEMY_FOREST_WOLF`)
- Kategorien: building, unit, enemy, boss, item, terrain, icon, specialist
- Art Style: Modern Fantasy RPG — KEIN Pixel Art. Buildings/Units: Isometric clean 2D. Items T3+/Epic/Legendary: Full-color painterly digital painting (Diablo IV / WoW Legendary Qualitaet), 256x256

## Sprite-Prompt-Referenz
Detaillierte Anleitung fuer optimale Bild-Prompts (Gemini Image API):
→ `docs/sprite-prompt-referenz.md`

---

## Arbeitsregeln

### Qualitaet vor Aufwand
- **Immer die beste Loesung anstreben, nicht die einfachste.**
- Wenn eine Loesung "okay, aber nicht gut" ist, nicht akzeptieren nur weil die bessere Variante mehr Aufwand bedeutet.
- **Proaktiv ehrlich sein:** Wenn eine Loesung Schwaechen hat, sofort sagen – nicht erst wenn der User kritisch nachfragt.
- Aufwand ist ein Planungsfaktor, kein Entscheidungsfaktor. Die richtige Frage ist "Was ist die beste Loesung?" – nicht "Was ist die schnellste?"
- Wenn der Agent eine Loesung vorschlaegt: zuerst nach Qualitaet beurteilen, dann nach Aufwand planen.

### Session-Start
1. **Scope klaeren** – Aufgabe lesen, alle Schritte identifizieren, kurzen Abarbeitungsplan (Checklist) ausgeben.
2. **Team-Setup bestimmen** – Pro Aufgabenblock entscheiden:

| Prioritaet | Aufgabentyp | Setup |
|---|---|---|
| **1 (Standard)** | Einfache bis mittlere Aufgaben, Reviews | Solo + Subagent |
| **2 (Bei Mehrwert)** | Parallele Features, Sprite-Pipelines, grosse Refactorings | Agent Team (User-OK noetig) |
| **3 (Minimal)** | Triviale Aufgaben | Solo |

3. **Bei Agent Teams** – Vorschlag mit Rollen/Modellen/Tools ausgeben, auf explizites OK warten:
```
Agent Team Vorschlag:
- Lead (Opus): [Rolle]
- Teammate 1 (Sonnet): [Rolle] – Tools: [...]
- Geschaetzter Aufwand: [klein/mittel/gross]
→ Soll ich das Team so starten?
```

### Allgemeine Regeln
- Aufgaben von oben nach unten abarbeiten.
- Bei Unklarheit: sinnvolle Default-Annahme treffen, als **"Annahme:"** notieren, weiterarbeiten.
- Nach jedem groesseren Abschnitt: Zwischenstand (erledigt / als Naechstes / Risiken).
- Terminal/Scripts ausfuehren und Zwischenentscheidungen selbst treffen.
- Niemals Secrets ausgeben oder in Dateien schreiben.

### Context Window Management
- **Delegieren:** Recherche an Subagents auslagern – die arbeiten in eigenen Context Windows.
- **Sichern:** Lange Analysen in Dateien schreiben, nicht im Chat halten.
- **Warnsignal:** Wenn Antworten kuerzer/ungenauer werden → Session-Ergebnisse sichern, neue Session.
- **Kein Ballast:** Grosse Dateien nicht komplett laden, nur relevante Ausschnitte lesen.

### Second Opinions bei Unsicherheit
1. **Subagent `reviewer`** – Gegenpruefung durch separaten Claude-Subagent
2. Entscheidung als **"Annahme:"** notieren.
3. Weiterarbeiten. Nur fragen wenn objektiv blockiert.

Besonders sinnvoll bei: Balancing-Werten, Architektur-Entscheidungen, Game-Design-Fragen.

### Agent Teams (nur mit User-OK)
- **Lead = Opus** – koordiniert, trifft Endentscheidungen.
- **Teammates = Sonnet** – fuehren aus, recherchieren, implementieren.
- **Haiku** fuer triviale Read-only Lookups.
- Jeder Teammate bekommt klare Rolle, definierte Tools, spezifisches Ziel.

### Session-Abschluss
- **Report:** Was wurde erledigt?
- **Annahmen:** Liste aller getroffenen Annahmen.
- **Offene Punkte:** Was steht noch aus?
- **Team-Bewertung** (falls Agent Team): Hat sich gelohnt? Empfehlung?

### Schnellreferenz Magic City

```
Standard (Subagent):
  Sprite pruefen/generieren       → Subagent
  Code-Review einzelne Datei      → Subagent
  Balancing-Check                  → Subagent
  UI/UX Gegenpruefung              → Subagent
Bei Mehrwert (Agent Team, User-OK):
  Sprite-Pipeline (mehrere Assets) → Agent Team
  Parallele Feature-Arbeit         → Agent Team
  Grosses Refactoring              → Agent Team
  Neue Spielmechanik komplett      → Agent Team
```
