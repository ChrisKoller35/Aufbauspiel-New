# Magic City – Visual Rework Plan (Teil 1) – FINAL

## Dein Feedback zusammengefasst

### A. Startscreen (MainMenuScene)
- Sieht altmodisch aus, muss moderner und peppiger werden
- Hintergrundbild einfügen (leicht transparent)
- Buttons müssen cooler/moderner aussehen

### B. Map/Grid (CityScene)
- Grünes gerastertes Feld sieht nicht gut aus
- Recherche: Wie machen es Clash of Clans & Co.? → Grid nur im Baumodus sichtbar, reichere Gras-Texturen
- Frage ob 2D/3D/Isometrisch → Unsere Sprites sind bereits "2D cartoon isometric" Style. Das Hauptproblem ist die Rendering-Config

### C. Gebäude zu pixelig
- In den Quelldateien sehen sie gut aus, im Spiel verpixelt
- **Ursache:** `pixelArt: true` in main.ts deaktiviert Anti-Aliasing. Unsere Sprites sind Cartoon-Illustrations, keine Pixel-Art → Config-Mismatch!

### D. Sidebar (Bauen/Strasse/Gilde/Expedition/Lager/Hilfe)
- Mehr mit Symbolen/Icons arbeiten statt nur Buchstaben (B, R, G, E, L, ?)
- Muss cooler aussehen mit Bildern + Schrift

### E. Obere Leiste (HUD)
- Braun/Gelb-Farbschema nicht cool
- Trainings-Indikator fehlt (wenn Kämpfer ausgebildet werden, live oben sehen)
- Ressourcen-Icons fehlen

### F. Untere Leiste (StatusBar/BuildMenu)
- Leicht verzogen, Bau-Bild überlappt mit Sidebar-Rand
- Braun nicht cool, braucht bessere Farben
- Gebäude-Symbole im Bau-Menü nicht schön

### G. GuildUI – Training Tab
- Bilder von Guardian, Ranger, Cleric fehlen (Sprites existieren bereits!)
- Unklar wann man ausbilden kann → Bessere Erklärung (Häuser bauen, X freie Bürger nötig)

### H. GuildUI – Roster
- Nach Mission: Kämpfer zeigen "Retire", können nicht erneut starten → Bug/UX-Problem

### I. ExpeditionUI – Kampf (HÖCHSTE PRIO)
- Aktuell nur Text ("Meine Gruppe" / "Gegner")
- MUSS Bilder haben: Party links, Feinde rechts
- Kleine Kampf-Animation (aufeinander zugehen, HP-Balken verändern sich)
- Nächsten Gegner sehen vor dem Kampf
- Drücken → Kampf → Ergebnis visuell → Weiter

### J. BuildingPanel
- Produktionsbalken schon okay, aber modernisieren

### K. Farbschema
- Braun/Gelb durchgängig nicht attraktiv
- Modernere Farben nötig

---

## Recherche-Ergebnis: Moderne City Builder Visuals

**Perspektive:** Clash of Clans etc. nutzen 3D-modellierte Gebäude, die als 2D-Sprites gerendert werden. Unsere Sprite-Prompts machen das bereits richtig ("2D cartoon illustration, isometric 3/4 perspective, inspired by Clash of Clans").

**Grid/Terrain:** Moderne Games zeigen Grid NUR im Baumodus. Terrain hat subtile Farbvariationen + Deko-Elemente.

**UI:** Moderne City Builder nutzen **gezeichnete UI-Texturen** statt programmatischer Farbflächen. Panels haben Stein/Holz/Pergament-Texturen, Buttons sehen 3D-erhaben aus, Leisten haben ornamentale Verzierungen. Das ist der grösste visuelle Unterschied zwischen "Prototyp" und "fertiges Spiel".

## Kern-Strategie: UI-Texturen via Gemini generieren

**Aktuell:** Alle UI-Elemente sind `Graphics.fillRect()` mit Hex-Farben → sieht nach Prototyp aus.
**Neu:** Gemini generiert gezeichnete UI-Texturen (Panels, Buttons, Bars, Frames) → sieht nach fertigem Spiel aus.

**Technische Umsetzung in Phaser 3:**
- **NineSlice** (Phaser 3.60+): Textur wird in 9 Bereiche geteilt (Ecken bleiben fix, Ränder stretchen, Mitte füllt). Perfekt für Panels und Buttons jeder Grösse.
- **Einfache Sprites**: Für fixe Grössen (HUD-Bar, Progress-Bars)
- **Tiled Sprites**: Für wiederholende Muster (Hintergründe)

**Neuer Style-Prompt für spriteRegistry.ts:**
```
STYLES.UI_ELEMENT = `
2D cartoon illustration style, fantasy medieval game UI element,
hand-painted look, warm rich colors, ornamental details,
clean edges suitable for 9-slice scaling,
solid bright magenta background (#FF00FF),
no text, no labels, inspired by Clash of Clans and mobile RPG UI design`
```

---

## Umsetzungsplan (6 Phasen)

### Phase 0: Technische Vorbereitung (Reviewer-Empfehlung)
> Ohne diese Vorbereitung greifen Farbänderungen nicht überall.

#### 0.1 Hardcoded Farben zentralisieren
- **Problem:** Sidebar.ts, BootScene.ts, MainMenuScene.ts und andere nutzen hardcoded Hex-Werte statt `UI_COLORS`
- **Lösung:** Grep nach allen `0x3E2723`, `0x1B0F0A`, `0x5D4037`, `0xFFD54F` etc. und auf `UI_COLORS.*` umstellen
- **Betroffene Dateien:** Sidebar.ts, BootScene.ts, MainMenuScene.ts, GuildUI.ts, ExpeditionUI.ts, BuildMenu.ts, StorageUI.ts, RunSummary.ts

#### 0.2 Font-Referenzen zentralisieren
- **Problem:** Jede UI-Datei hat hardcoded `fontFamily: 'monospace'`, `UI_TEXT_STYLES` wird nicht überall genutzt
- **Lösung:** Alle Text-Styles auf `UI_TEXT_STYLES` aus Colors.ts umstellen
- **Vorteil:** Späterer Font-Wechsel wird 1-Zeilen-Änderung statt 10-Dateien-Änderung

#### 0.3 Grid-Graphics aufsplitten
- **Problem:** Gras-Tiles UND Grid-Linien sind im selben Graphics-Objekt. `setAlpha(0)` würde beides ausblenden!
- **Lösung:** In CityScene.ts `drawGrid()` zwei separate Graphics erstellen: `grassGraphics` (Depth 0) + `gridLinesGraphics` (Depth 1)

### Phase 1: Quick Wins (sofortige Verbesserung)

#### 1.1 Rendering-Config fixen
**Datei:** `src/main.ts`
- `pixelArt: false` setzen
- `antialias: true` setzen
- `roundPixels: false` setzen
- **Impact:** Sprites werden sofort schärfer und glatter. Das allein löst das "verpixelt"-Problem!
- **Reviewer-Check:** ✅ Kein Risiko. Grid/Roads sind Graphics-basiert (kein Effekt). BootScene-Transparenzentfernung profitiert sogar (weichere Kanten).

#### 1.2 Neues Farbschema definieren (Fallback-Farben für Texturen)
**Datei:** `src/rendering/Colors.ts`
- Weg von Braun (`0x3E2723`) + Gelb (`0xFFD54F`)
- Diese Farben dienen als **Fallback** und **Tint-Basis** für die UI-Texturen
- **Zwei Varianten zum Vergleich:**

**Variante A – Blaugrau (modern/clean):**
| Rolle | Hex | Beschreibung |
|-------|-----|-------------|
| Panel BG | `0x1A2332` | Dunkles Blaugrau |
| Panel Border | `0x5B9BD5` | Stahlblau |
| Accent | `0xF0C040` | Warmes Gold |
| Text Primary | `0xF0F0F0` | Helles Weiss |
| Text Secondary | `0xA0B0C0` | Blaugrau |

**Variante B – Warm-Anthrazit (fantasy-nah, Reviewer-Empfehlung):**
| Rolle | Hex | Beschreibung |
|-------|-----|-------------|
| Panel BG | `0x1E1E2A` | Dunkler Anthrazit mit Blauschimmer |
| Panel Border | `0x4A7B5B` | Gedämpftes Waldgrün |
| Accent | `0xF0C040` | Warmes Gold |
| Text Primary | `0xF0F0F0` | Helles Weiss |
| Text Secondary | `0xB0A890` | Warmes Beige-Grau |

→ Beide implementieren, Screenshot-Vergleich, dann entscheiden.

#### 1.4 UI-Texturen generieren (via Gemini)
**Neuer Style `UI_ELEMENT` in spriteRegistry.ts eintragen + Sprites generieren:**

Die folgenden Texturen ersetzen die programmatischen `fillRect()`-Aufrufe durch gezeichnete Grafiken:

| Textur | Verwendung | Technik |
|--------|-----------|---------|
| UI_PANEL_BG | Alle Panels (GuildUI, StorageUI, BuildingPanel etc.) | NineSlice – Ecken/Ränder fix, Mitte stretcht |
| UI_PANEL_HEADER | Header-Leiste in Panels (Titel-Bereich) | NineSlice horizontal |
| UI_BUTTON_NORMAL | Alle Buttons (Sidebar, Menüs, Aktionen) | NineSlice |
| UI_BUTTON_HOVER | Button Hover-State (leuchtet/hervorgehoben) | NineSlice |
| UI_BUTTON_ACTIVE | Button aktiv/gedrückt | NineSlice |
| UI_HUD_BAR | Obere Ressourcen-Leiste (ganze Breite) | Tiled horizontal |
| UI_SIDEBAR_BG | Sidebar-Hintergrund | NineSlice vertikal |
| UI_BUILDMENU_BG | Build-Menü Hintergrund (untere Leiste) | NineSlice horizontal |
| UI_TAB_ACTIVE | Aktiver Tab (GuildUI Tabs) | NineSlice |
| UI_TAB_INACTIVE | Inaktiver Tab | NineSlice |
| UI_TOOLTIP_BG | Tooltip-Hintergrund | NineSlice |
| UI_FRAME_GOLD | Goldener Zierrahmen (um Sprites, Karten) | NineSlice |
| UI_PROGRESS_BAR_BG | Produktions-/HP-Balken Hintergrund | NineSlice horizontal |
| UI_PROGRESS_BAR_FILL | Produktions-Balken Füllung (grün) | Stretch horizontal |
| UI_HP_BAR_FILL | HP-Balken Füllung (Gradient grün→rot) | Stretch horizontal |
| UI_RESOURCE_SLOT | Einzelner Ressourcen-Slot in HUD | NineSlice |
| UI_CARD_BG | Karten-Hintergrund (Training-Karten, Expedition-Routen) | NineSlice |
| UI_DIVIDER | Horizontale Trennlinie mit Ornament | Stretch horizontal |

**Prompt-Strategie für UI-Texturen:**
- Alle mit Magenta-Hintergrund (#FF00FF) für Transparenz
- Konsistenter Stil: Fantasy-mittelalterlich, handgemalt, Stein/Holz/Gold-Optik
- NineSlice-tauglich: Klare Ecken, gleichmässige Ränder, tileable Mitte
- Grösse: 128x128 für quadratische, 256x64 für Balken, 256x128 für Panels

#### 1.3 Grid nur im Baumodus
**Datei:** `src/scenes/CityScene.ts`
- Grid-Linien standardmässig ausblenden (`gridLinesGraphics.setAlpha(0)`)
- Build-Modus aktiv → Grid einblenden mit Fade-Tween (0 → 0.15)
- Build-Modus verlassen → Grid ausblenden mit Fade-Tween (0.15 → 0)

### Phase 2: UI Overhaul (mit Gemini-Texturen)

#### 2.0 UI-Textur Helper erstellen
**Neue Datei:** `src/rendering/UIHelper.ts`
- Helper-Klasse die NineSlice-Panels, texturierte Buttons etc. erstellt
- Zentrale Stelle: `UIHelper.createPanel(scene, x, y, w, h)` → gibt NineSlice zurück
- `UIHelper.createButton(scene, x, y, w, h, label)` → texturierter Button mit Text
- `UIHelper.createProgressBar(scene, x, y, w)` → texturierter Fortschrittsbalken
- Fallback: Wenn Textur noch nicht geladen → Flat-Color aus UI_COLORS (graceful degradation)

#### 2.1 Font-System modernisieren
- System-Font als schneller Fix: `"Segoe UI", "Arial", sans-serif` statt `monospace`
- Optional: Google Font "Nunito" via CSS `@font-face` in index.html vorladen
- **Reviewer-Hinweis:** Einige Layouts könnten von fester Zeichenbreite abhängen → prüfen vor dem Wechsel
- Dank Phase 0.2 nur noch 1 Stelle ändern (`UI_TEXT_STYLES`)

#### 2.2 Sidebar modernisieren
**Datei:** `src/ui/Sidebar.ts`
- **Hintergrund:** `UI_SIDEBAR_BG` Textur statt `fillRect(0x1B0F0A)`
- Icon-Sprites für jeden Button (ICON_BUILD, ICON_ROAD, ICON_GUILD, ICON_EXPEDITION, ICON_STORAGE, ICON_HELP)
- **Buttons:** `UI_BUTTON_NORMAL` / `UI_BUTTON_HOVER` Texturen statt `fillRoundedRect()`
- Button-Design: Texturierter Container mit Icon (24x24) oben, Label (8px) unten
- Hover-Effekt: Textur-Swap + sanftes Scale-Tween

#### 2.3 HUD (obere Leiste) modernisieren
**Datei:** `src/ui/HUD.ts`
- **Hintergrund:** `UI_HUD_BAR` Textur statt `fillRect(0x3E2723)` – volle Breite, ornamental
- **Ressourcen-Slots:** `UI_RESOURCE_SLOT` Textur pro Ressource mit Icon (16x16) + Zahl
- Trainings-Indikator: Schwert-Icon + "Training: Guardian 45s" wenn aktiv
- **Border:** `UI_DIVIDER` Textur statt `fillRect` Linie unten

#### 2.4 BuildMenu (untere Leiste) modernisieren
**Datei:** `src/ui/BuildMenu.ts`
- **Hintergrund:** `UI_BUILDMENU_BG` Textur statt `fillRect(0x3E2723)`
- Fix: Overlap mit Sidebar beheben (startX = sidebar.width + padding)
- **Gebäude-Karten:** `UI_CARD_BG` Textur mit Gebäude-Sprite (48x48) + Name + Kosten
- **Mode-Buttons:** `UI_BUTTON_NORMAL` Texturen
- **Tabs:** `UI_TAB_ACTIVE` / `UI_TAB_INACTIVE` für Kategorien

#### 2.5 StatusBar + BuildingPanel
- **StatusBar:** `UI_HUD_BAR` Textur (gleich wie HUD, konsistent)
- **BuildingPanel:** `UI_PANEL_BG` NineSlice als Hintergrund
  - `UI_PANEL_HEADER` für Titel-Bereich mit Gebäude-Sprite
  - `UI_PROGRESS_BAR_BG` + `UI_PROGRESS_BAR_FILL` für Produktionsbalken
  - `UI_FRAME_GOLD` um den Gebäude-Sprite im Header
  - `UI_DIVIDER` als Trennlinien zwischen Sektionen

### Phase 3: Startscreen

#### 3.1 MainMenuScene überarbeiten
**Datei:** `src/scenes/MainMenuScene.ts`
- **Hintergrundbild:** `BG_MAIN_MENU` via Gemini generieren (Fantasy-Stadt Panorama, 1280x720)
- Bild leicht abgedunkelt als Hintergrund (Overlay mit 0.4 Alpha)
- **Logo/Titel:** `UI_LOGO` Textur via Gemini generieren – "Magic City" als gezeichneter Schriftzug mit Fantasy-Ornament
- Titel mit Glow/Shadow-Effekt
- **Buttons:** `UI_BUTTON_NORMAL` / `UI_BUTTON_HOVER` NineSlice-Texturen (dieselben wie Sidebar/BuildMenu = konsistent!)
- **Rahmen:** `UI_FRAME_GOLD` um den gesamten Menü-Bereich
- Optional: Partikel-Effekte (Glühpartikel/Sterne)

### Phase 4: GuildUI + Kampf-Visuals

#### 4.1 GuildUI Training Tab
**Datei:** `src/ui/GuildUI.ts`
- **Panel:** `UI_PANEL_BG` NineSlice als Hintergrund (statt `fillRoundedRect`)
- **Tabs:** `UI_TAB_ACTIVE` / `UI_TAB_INACTIVE` Texturen
- **Klassen-Karten:** `UI_CARD_BG` NineSlice mit `UI_FRAME_GOLD` um Hero-Sprite
- Hero-Sprites einbinden (HERO_GUARDIAN, HERO_RANGER, HERO_CLERIC existieren!)
- Sprite-Vorschau (48x48) in jeder Klassen-Karte
- Anforderungs-Text: "Benötigt: X freie Bürger" deutlich anzeigen
- **Train-Button:** `UI_BUTTON_NORMAL` Textur, grün getönter Tint wenn leistbar
- Kosten farblich: grün = leistbar, rot = zu teuer

#### 4.2 GuildUI Roster Fix
- Bug untersuchen: Warum zeigen zurückgekehrte Kämpfer "Retire" statt "Bereit"?
- Fix implementieren

#### 4.3 Kampf-Visuals (Grösstes Feature)
**Reviewer-Empfehlung:** Neues `CombatOverlay.ts` als eigene Klasse erstellen, statt ExpeditionUI umzubauen. Die ExpeditionUI ruft das CombatOverlay auf, wenn ein Kampf startet.

**Neue Datei:** `src/ui/CombatOverlay.ts`
- **Hintergrund:** `UI_PANEL_BG` NineSlice fullscreen-modal
- **Layout:** Links = Party-Sprites (48x48) in `UI_FRAME_GOLD`, Rechts = Gegner-Sprite (64x64) in `UI_FRAME_GOLD`
- **HP-Balken:** `UI_HP_BAR_BG` + `UI_HP_BAR_FILL` Texturen, farbcodiert (grün→gelb→rot via Tint)
- **Kampf-Ablauf:**
  1. Nächster Gegner wird rechts angezeigt (Sprite + Name + HP)
  2. Button "Kampf!" (`UI_BUTTON_NORMAL`) drücken
  3. Tween-Animation: Angreifer-Sprite bewegt sich kurz vor (50px), Schadenszahl fliegt hoch
  4. HP-Balken des Getroffenen schrumpft (ScaleX-Tween)
  5. Sprite bewegt sich zurück
  6. Ergebnis anzeigen, Button für "Nächster Raum"
- **Architektur:** Persistente Sprite-Referenzen (KEIN `removeAll(true)` bei Updates)
- **Kampf-State-Machine:** IDLE → ANIMATING → RESULT → NEXT_ROOM (Input-Lock während Animationen)
- **Kampflog:** `UI_TOOLTIP_BG` NineSlice als Hintergrund für Kampfprotokoll

#### 4.4 Provision/Beute visuell
- Item-Sprites (ITEM_HEALING_POTION etc. existieren!) neben Mengen-Text
- Use-Buttons mit Item-Icon

### Phase 5: Polish

#### 5.1 Terrain-Verbesserungen
- Deko-Sprites: DECO_FLOWER_1, DECO_ROCK_1, DECO_BUSH_1
- Zufällig auf leere Tiles streuen (ca. 10% der leeren Tiles)
- Subtilere Gras-Farbvariationen (3-4 Grüntöne statt 2)

#### 5.2 Strassen-Sprite nutzen
- Aktuell: Road = `fillRect` mit brauner Farbe
- Neu: ROAD.png als Sprite rendern
- **Reviewer-Hinweis:** Volle Tile-Varianten (Kurven, Kreuzungen) = zu aufwändig für jetzt. Nur geraden Sprite als ersten Schritt.

#### 5.3 RunSummary + StorageUI
- Neues Farbschema anwenden (wird in Phase 0.1 automatisch mit abgedeckt wenn korrekt zentralisiert)
- Optional: Icons für Loot-Items

---

## Neue Sprites benötigt

### UI-Texturen (via Gemini, höchste Prio – werden überall gebraucht)

| Key | Grösse | NineSlice | Beschreibung |
|-----|--------|-----------|-------------|
| UI_PANEL_BG | 256x256 | Ja (32px Rand) | Panel-Hintergrund: dunkler Stein mit feinen Rissen, abgerundete Ecken, dezenter Schimmer |
| UI_PANEL_HEADER | 256x64 | Ja (24px Rand) | Panel-Titelleiste: Holzbalken mit metallenen Beschlägen, etwas heller als Panel |
| UI_BUTTON_NORMAL | 128x48 | Ja (16px Rand) | Button normal: erhabener Stein/Holz-Look, leichter 3D-Effekt, abgerundet |
| UI_BUTTON_HOVER | 128x48 | Ja (16px Rand) | Button hover: heller leuchtend, goldener Schimmer, gleiche Form |
| UI_BUTTON_ACTIVE | 128x48 | Ja (16px Rand) | Button gedrückt: eingedrückt, dunkler, invertierter 3D-Effekt |
| UI_HUD_BAR | 256x48 | Ja (8px Rand) | HUD-Leiste: breiter ornamentaler Holz/Metall-Balken, horizontal tileable |
| UI_SIDEBAR_BG | 64x256 | Ja (16px Rand) | Sidebar-Hintergrund: vertikaler Stein-Pfeiler mit Ornament-Rändern |
| UI_BUILDMENU_BG | 256x80 | Ja (16px Rand) | Build-Menü: breite Holz/Stein-Leiste, horizontal stretchbar |
| UI_TAB_ACTIVE | 128x40 | Ja (12px Rand) | Aktiver Tab: helles Holz, oben abgerundet, nahtlos mit Panel verbunden |
| UI_TAB_INACTIVE | 128x40 | Ja (12px Rand) | Inaktiver Tab: dunkler, leicht zurückgesetzt |
| UI_TOOLTIP_BG | 128x128 | Ja (12px Rand) | Tooltip: Pergament-Look, leicht vergilbt, dünner Rand |
| UI_FRAME_GOLD | 128x128 | Ja (20px Rand) | Goldener Zierrahmen: ornamental, für Sprites/Portraits/Karten |
| UI_PROGRESS_BAR_BG | 256x24 | Ja (6px Rand) | Fortschrittsbalken Hintergrund: dunkle ausgehöhlte Rinne |
| UI_PROGRESS_BAR_FILL | 256x24 | Nein (stretch) | Fortschrittsbalken Füllung: leuchtend grüner Energiebalken |
| UI_HP_BAR_FILL | 256x24 | Nein (stretch) | HP-Balken Füllung: Gradient von grün nach rot |
| UI_RESOURCE_SLOT | 96x40 | Ja (8px Rand) | Ressourcen-Slot: kleines Fach mit abgedunkeltem Inneren |
| UI_CARD_BG | 256x128 | Ja (16px Rand) | Karten-Hintergrund: Pergament/Leder-Look für Training/Expedition-Karten |
| UI_DIVIDER | 256x8 | Nein (stretch) | Horizontale Trennlinie: feines Ornament mit kleinem Diamant in der Mitte |
| UI_LOGO | 512x128 | Nein | "Magic City" Schriftzug: Fantasy-Stil, goldene Lettern mit Magie-Effekt |

### Icons (via Gemini)

| Key | Grösse | Beschreibung |
|-----|--------|-------------|
| ICON_BUILD | 48x48 | Hammer-Icon für Sidebar |
| ICON_ROAD | 48x48 | Strassen/Weg-Icon für Sidebar |
| ICON_GUILD | 48x48 | Schwert+Schild-Icon für Sidebar |
| ICON_EXPEDITION | 48x48 | Kompass/Karte-Icon für Sidebar |
| ICON_STORAGE | 48x48 | Truhe/Kiste-Icon für Sidebar |
| ICON_HELP | 48x48 | Fragezeichen auf Schriftrolle für Sidebar |
| ICON_WOOD | 32x32 | Holzstapel für HUD |
| ICON_STONE | 32x32 | Steinblock für HUD |
| ICON_BREAD | 32x32 | Brotlaib für HUD |
| ICON_GOLD | 32x32 | Goldmünzen für HUD |
| ICON_POP | 32x32 | Personen-Silhouette für HUD |
| ICON_TRAINING | 32x32 | Schwert mit Funken für HUD-Trainingsanzeige |

### Hintergründe & Deko (via Gemini)

| Key | Grösse | Beschreibung |
|-----|--------|-------------|
| BG_MAIN_MENU | 1280x720 | Fantasy-Stadt Panorama bei Sonnenuntergang |
| DECO_FLOWER_1 | 32x32 | Kleine bunte Wiesenblumen |
| DECO_ROCK_1 | 32x32 | Kleiner Feldstein |
| DECO_BUSH_1 | 32x32 | Kleiner Laubbusch |
| TERRAIN_GRASS | 64x64 | Gras-Tile mit subtiler Textur (tileable) |

**Gesamt: 19 UI-Texturen + 12 Icons + 5 Hintergründe/Deko = 36 neue Sprites**
Alle generierbar via `npm run sprite-fix` nach Eintrag in spriteRegistry.ts.

---

## Prioritäten-Reihenfolge

| Prio | Phase | Was | Warum |
|------|-------|-----|-------|
| 1 | Phase 0 | Technische Vorbereitung | Grundlage für alles Weitere |
| 2 | Phase 1 | Quick Wins (Config + Farben + Grid) | Riesiger visueller Unterschied, wenig Aufwand |
| 3 | Phase 2 | UI Overhaul (Sidebar, HUD, BuildMenu) | Zweitgrösster visueller Impact |
| 4 | Phase 4.1-4.2 | GuildUI (Bilder + Roster-Fix) | Schnell umsetzbar, verbessert Spielverständnis |
| 5 | Phase 3 | Startscreen | Erster Eindruck zählt |
| 6 | Phase 4.3-4.4 | Kampf-Visuals | Höchste User-Prio, aber grösster Aufwand |
| 7 | Phase 5 | Polish (Terrain, Strassen) | Nice to have |

**Anmerkung zur Reihenfolge:** Kampf-Visuals (User-Prio 1) steht auf Prio 6, weil es technisch das komplexeste Feature ist und ein gut aussehender Rest des Spiels die Wartezeit rechtfertigt. Die UI-Änderungen (Phasen 0-3) machen 80% des visuellen Unterschieds mit 30% des Aufwands.

---

## Geschätzter Aufwand (korrigiert nach Review)

| Phase | Aufwand | Sessions |
|-------|---------|----------|
| Phase 0 | Klein-Mittel | 1-2 |
| Phase 1 | Klein | 1 |
| Phase 2 | Mittel | 2-3 |
| Phase 3 | Klein | 1 |
| Phase 4.1-4.2 | Klein | 1 |
| Phase 4.3-4.4 | Gross | 3-4 |
| Phase 5 | Klein | 1 |
| **Gesamt** | | **10-13 Sessions** |

---

## Reviewer-Warnungen

| Risiko | Schwere | Massnahme |
|--------|---------|-----------|
| Farbwechsel inkonsistent (hardcoded Werte) | Hoch | Phase 0.1 löst das |
| Grid-Ausblendung blendet auch Gras aus | Hoch | Phase 0.3 löst das |
| Font-Layout bricht bei Proportionalschrift | Mittel | Vor Font-Wechsel testen ob Spalten per Leerzeichen ausgerichtet sind |
| Kampf-Animation blockiert Input | Mittel | State-Machine mit Input-Lock |
| ExpeditionUI removeAll(true) zerstört Animationen | Hoch | Neues CombatOverlay als separate Klasse |
| Strassen-Tile-Varianten zu komplex | Niedrig | Nur geraden Sprite in Phase 5 |

---

## Team-Vorschlag für die Umsetzung

### Phase 0+1 (Session 1-2): Agent Team
```
Agent Team Vorschlag:
- Lead (Opus): Farben/Fonts zentralisieren, Config fixen, Grid splitten, Farbschema implementieren
- Teammate 1 (Sonnet): ALLE 36 Sprites in spriteRegistry.ts eintragen + npm run sprite-fix
  → UI-Texturen, Icons, Deko parallel generieren während Lead Code refactored
- Sonnet Reviewer: Gegenprüfung am Ende
- Geschätzter Aufwand: mittel
→ Sprite-Generierung läuft parallel zum Code-Refactoring = grosse Zeitersparnis
```

### Phase 2 (Session 3-5): Agent Team
```
Agent Team Vorschlag:
- Lead (Opus): UIHelper.ts erstellen, HUD + BuildMenu auf Texturen umstellen
- Teammate 1 (Sonnet): Sidebar auf Texturen + Icons umstellen
- Teammate 2 (Sonnet): BuildingPanel + StatusBar auf Texturen umstellen
- Geschätzter Aufwand: mittel-gross
→ 3 UI-Bereiche parallel = spart ca. 1-2 Sessions
```

### Phase 3 (Session 6): Solo + Subagent
- **Opus Lead:** MainMenuScene Redesign (UI_LOGO, BG_MAIN_MENU, Buttons mit Texturen)
- **Sonnet Reviewer:** Gegenprüfung

### Phase 4 (Session 7-10): Agent Team
```
Agent Team Vorschlag:
- Lead (Opus): CombatOverlay Architektur + State-Machine + Animationen (mit UI-Texturen)
- Teammate 1 (Sonnet): GuildUI Training Tab (Hero-Sprites + UI-Texturen) + Roster Fix
- Teammate 2 (Sonnet): CombatOverlay HP-Balken + Schadenszahlen-Tweens
- Geschätzter Aufwand: gross
→ GuildUI kann parallel zum CombatOverlay bearbeitet werden
```

### Phase 5 (Session 11-12): Solo
- **Opus Lead:** Terrain-Deko, Strassen-Sprite, RunSummary/StorageUI Polish mit Texturen
