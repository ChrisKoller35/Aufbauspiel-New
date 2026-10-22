# Gebäude-Seite: Entwürfe (18.10.2026, überholt)

Christoph hat die Gebäude-Seite nach dem Merge von PR #9 gespielt: Crafting lief wieder, aber das
Gebäude-System und das Layout gefielen nicht («schaut nicht cool aus, macht nicht viel Sinn»).
Drei Entwürfe wurden als Vorschaubilder gebaut (HTML in diesem Ordner, öffnet sich im Browser,
Bilder liegen relativ unter `../../public/assets/`). Sie zeigen die Stadt von damals mit ihrer Rohstoff-Wirtschaft;
seit der Gildenstadt (22.10.2026, `../GILDENSTADT.md`) gibt es sie so nicht mehr. Die Dateien bleiben als Rückblick.

**Entscheidung (Christoph, 18.10.2026 07:20): Entwurf 2 «Produktionsketten».**
Begründung: Isometrisch gab es schon einmal und wurde bewusst vereinfacht; Entwurf 2 ist «recht cool».
B + C aus `../GEBAEUDE-IDEEN.md` (Freischalt-Reihenfolge, Werkstätten mit Wartezeit, Baupläne aus Dungeons) blieben
inhaltlich bestehen.

| Datei | Entwurf | Stand |
|---|---|---|
| `entwurf1.html` | Isometrische Stadt mit festen Bauplätzen (nutzt die ungenutzten `ISO_*_MED`-Sprites) | verworfen |
| `entwurf2.html`, `entwurf2.png` | **Produktionsketten** | **gewählt**, am Abend zur Mindmap weiterentwickelt |
| `entwurf3.html` | Stadtviertel (damalige Karten, nach Vierteln geordnet) | verworfen |

## Entwurf 2: Was die Seite zeigte

Jede **Kette** war eine Zeile, Pfeile zeigten den Weg der Waren, rechts stand das Ziel; die Ketten kamen aus einer
Datendatei, nicht aus dem Layout-Code. Jedes Glied war eine **Karte** (Bild, Name, Statuszeile, kleiner
Fortschrittsbalken) mit einem Zustand: gebaut und läuft (grün), gebaut und wartet (gelb), nicht gebaut und baubar
(gestrichelt «Bauplatz»), gesperrt (dunkel mit Schloss und Freischalt-Hinweis). Pfeile zwischen gebauten Gliedern
golden, sonst grau. Rechts die Werkstatt des angeklickten Gebäudes mit Rezept, Warteschlange, Ausbauen und
**Engpass** in einem Satz.

**Umgesetzt 18.10.2026** (statt in drei Bot-Nächten direkt im Thread): Reiter «Produktion» mit echten Zuständen,
laufenden Balken und einem Engpass-Satz je Kette; Werkstatt-Fenster mit Engpass-Zeile. Stadtplan und Bauleiste
waren weg.

**Weiterentwickelt 18.10.2026 (abends):** Die Ketten-Zeilen wichen einer **Mindmap in Reihen** (Linien als SVG aus den
echten Kartenpositionen, Daten in `src/data/produktionsnetz.ts`), jedes Gebäude gibt es nur einmal und wird
ausgebaut («Stufe 2» statt «×2»).

**Gildenstadt 22.10.2026:** Der Reiter heisst «Stadt» und zeigt drei Reihen (Beute aus den Dungeons → Werkstätten und
Händler → Gilde), siehe `../AUSBAU.md`. Der Zustands-Katalog gilt weiter, dazu «offen» für den Händler.
