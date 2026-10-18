# Gebäude-Seite: Entwürfe (18.10.2026)

Christoph hat die Gebäude-Seite nach dem Merge von PR #9 gespielt: Crafting läuft wieder, aber das
Gebäude-System und das Layout gefallen nicht («schaut nicht cool aus, macht nicht viel Sinn»).
Drei Entwürfe wurden als Vorschaubilder gebaut (HTML in diesem Ordner, öffnet sich im Browser,
Bilder liegen relativ unter `../../public/assets/`).

**Entscheidung (Christoph, 18.10.2026 07:20): Entwurf 2 «Produktionsketten».**
Begründung: Isometrisch gab es schon einmal und wurde bewusst vereinfacht; Entwurf 2 ist «recht cool».
B + C (Freischalt-Reihenfolge, Werkstätten mit Wartezeit, Baupläne aus Dungeons) bleiben inhaltlich bestehen.

| Datei | Entwurf | Stand |
|---|---|---|
| `entwurf1.html` | Isometrische Stadt mit festen Bauplätzen (nutzt die ungenutzten `ISO_*_MED`-Sprites) | verworfen |
| `entwurf2.html`, `entwurf2.png` | **Produktionsketten** | **gewählt** |
| `entwurf3.html` | Stadtviertel (heutige Karten, nach Vierteln geordnet) | verworfen |

## Entwurf 2: Was die Seite zeigt

Die Hauptansicht «Produktion» ersetzt das heutige Raster «Stadtplan» mit den leeren «+»-Kästchen und die
untere Bauleiste. Jede **Kette** ist eine Zeile, Pfeile zeigen den Weg der Waren, rechts steht das Ziel.
Ketten und Glieder kommen aus einer Datendatei (`src/data/produktionsketten.ts`), nicht aus dem Layout-Code:

1. **Holz & Stein** – Holzfällerhütte(n), Steinbruch → Lagerhaus → «Bauen & Ausbauen»
2. **Brot** – Getreidefarm → Windmühle → Bäckerei (+ Brunnen als Wasser) → Wohnhäuser → Steuern (Gold)
3. **Waffen & Rüstung** – Eisenmine → Schmiede (+ Kristallsplitter aus Dungeons) → Arkanschmiede / Kriegsmaschinen → Helden
4. **Tränke** – Kräutergarten (+ Brunnen) → Tränke → Expeditionen (Zutaten aus Dungeons, Manager #22)
5. **Stadt** – Gildenhaus → Marktplatz → Bank → Gold

Jedes Glied ist eine **Karte** (Bild aus `public/assets/buildings/bld_*.png`, Name, eine Statuszeile, kleiner Fortschrittsbalken):

| Zustand | Darstellung | Klick |
|---|---|---|
| gebaut, läuft | normale Karte, Status grün («+6 Holz / Tag», «mahlt Mehl», Balken) | Werkstatt-Fenster des Gebäudes |
| gebaut, wartet | Status gelb («kein Arbeiter», «wartet auf Wasser», «Zutaten fehlen», «im Bau») | Werkstatt-Fenster |
| mehrfach gebaut | eine Karte mit Zähler «×2» oben rechts | Werkstatt-Fenster des ersten, Liste darin |
| nicht gebaut, baubar | gestrichelte Karte «Bauplatz», Bild ausgegraut, Kosten als Status | Kauf-Dialog |
| gesperrt | dunkle Karte mit Schloss, Status rot mit Freischalt-Hinweis («braucht Bauplan», «Gildenrang 4») | Hinweis, kein Kauf |

Pfeile zwischen gebauten Gliedern sind golden mit Warenname darüber, zwischen fehlenden Gliedern grau.
Ein «+» statt Pfeil heisst «braucht zusätzlich» (Brunnen neben Bäckerei).
Rechts (oder als Fenster, solange das Werkstatt-Fenster aus Manager #27 noch ein Fenster ist) steht die Werkstatt
des angeklickten Gebäudes: Rezept, läuft gerade, Warteschlange, Herstellen, Ausbauen, **Engpass** («Eisenschrott: 5 im Lager,
3 pro Schwert. Baue die Eisenmine.»).

Weitere Reiter: **Wohnen** (Wohnhäuser, Bewohner, Zufriedenheit, Brot-Vorrat, Wohnhaus bauen) und **Aufbau** (bestehend).
Der Reiter «Crafting» kann bleiben als Liste «Was läuft wo», er stellt nichts mehr direkt her.

**Umgesetzt 18.10.2026** (statt in drei Bot-Nächten direkt im Thread): Reiter «Produktion» mit echten Zuständen
(läuft, wartet, bereit, Bauplatz, gesperrt), laufenden Balken und einem Engpass-Satz je Kette; Reiter «Wohnen»;
Werkstatt-Fenster mit Engpass-Zeile und «1 von N ›» für mehrere Gebäude gleicher Art. Stadtplan und Bauleiste sind weg.
Abweichung vom Entwurf: «Wohnen» heisst nur «Wohnen», der Reiter «Crafting» bleibt.

**Weiterentwickelt 18.10.2026 (abends), Christophs Wunsch nach dem ersten Spielen:** Die Ketten-Zeilen sind einer
**Mindmap in vier Reihen** gewichen (Gewinnen → Lager → Werkstätten → Stadt; Linien als SVG aus den echten
Kartenpositionen, Daten in `src/data/produktionsnetz.ts`). Jedes Gebäude gibt es nur einmal und wird ausgebaut
(«Stufe 2» statt «×2»), das Wohnhaus ist ein **Wohnviertel** mit Stufen, der Reiter «Wohnen» ist weg (alles im
Fenster des Wohnviertels). Regeln: `../AUSBAU.md`. Der Zustands-Katalog oben gilt weiter, nur «mehrfach gebaut» entfällt.
