# Ausbau-Stufen, Mindmap und Wohnviertel (18.10.2026)

Christophs Wunsch vom 18.10.2026 (Projekt-Chat): alle Rohstoff-Gebäude führen zum Lagerhaus, die Werkstätten
kommen danach, die Ansicht wird eine Mindmap in Reihen, Gebäude werden nicht mehrfach gebaut, sondern
freigeschaltet und ausgebaut, und die Wohnhäuser brauchen in dieser Ansicht einen besseren Sinn.
Umgesetzt im Thread «Magic City: Bestandsaufnahme und Bot-Aufgaben». Code: `src/systems/Ausbau.ts`
(Regeln), `src/data/produktionsnetz.ts` (Knoten und Linien der Mindmap), `src/ui/screens/ProduktionTab.ts`
(Zeichnen), `src/systems/EconomySystem.ts` (Steuern).

## Ein Gebäude je Art

- Jedes Gebäude gibt es **genau einmal**. Bauen schaltet es frei (Kosten wie bisher), danach wird es im
  Gebäude-Fenster **ausgebaut** (Knopf «Ausbauen auf Stufe N»). Der Ausbau ist sofort fertig.
- Kosten einer Stufe = **Baukosten × Zielstufe** (Stufe 2 der Holzfällerhütte: 20 Holz, Stufe 3: 30 Holz).
  Wohnviertel ab Stufe 3 zusätzlich 5 Stein je Stufe über 2. Gildenhaus Stufe 2 kostet fest
  60 Holz, 20 Stein, 3 Kristallsplitter, 80 Gold und braucht Gildenrang 3 (bestehender Ausbau `GUILD_HALL_T2`).
- Abreissen gibt die Hälfte von allem zurück, was Bau und Ausbau gekostet haben. Startgebäude bleiben stehen.
- Ein Ausbau zählt für den Erfolg «Baumeister» wie ein Bau (`total_buildings_built`), zusätzlich `total_upgrades`.

| Gebäude | Stufen | Was eine Stufe bringt |
|---|---|---|
| Alle Werkstätten (Holzfällerhütte, Steinbruch, Farm, Eisenmine, Mühle, Bäckerei, Kräutergarten, Schmiede, Arkanschmiede, Kriegsmaschinen) | 1–3 | **Stufe N = N Arbeitsplätze.** Das Gebäude arbeitet so vielfach schnell, wie Plätze besetzt sind. Stufe 3 mit einem Arbeiter ist so schnell wie Stufe 1. |
| Wohnviertel (früher «Wohnhaus») | 1–6 | 6 Plätze für Bewohner je Stufe (6 … 36). |
| Gildenhaus | 1–2 | Stufe 2: 4 statt 3 Helden je Expedition. |
| Marktplatz | 1–3 | je besetztem Arbeitsplatz +25 / +40 / +50 % Steuern. |
| Bank | 1–3 | je besetztem Arbeitsplatz +10 Gold pro Tag. |
| Brunnen, Lagerhaus | 1 | keine Stufen. |

Warum Arbeitsplätze statt freiem Tempo: Bewohner bleiben die knappe Währung. Früher brauchten drei
Holzfällerhütten drei Arbeiter, jetzt braucht eine Hütte Stufe 3 ebenfalls drei. Sonst wäre Brot und damit
die halbe Produktionskette wertlos.

## Wohnviertel statt Wohnhäuser

- **Steuern zahlen die Bewohner, nicht die Häuser:** 2 Gold je Bewohner und Tag × Zufriedenheit (0–100 %)
  × Helden-Bonus (1.05 ab drei aktiven Helden) × (1 + Marktplatz-Prozent), plus das feste Gold der Bank.
  Brot → Bewohner → Arbeit und Gold ist damit eine echte Kette; die Mindmap zeigt sie (Bäckerei → Wohnviertel
  → Marktplatz → Bank).
- Das Wohnviertel zeigt im Fenster: Bewohner / Plätze, wer arbeitet und wer frei ist, Zufriedenheit, Brot,
  Steuern pro Tag mit Rechnung, und ob die Stadt wächst (Balken bis zum Tageswechsel).
- Überbelegung kostet 5 Zufriedenheit je Bewohner zu viel, höchstens 30 (vorher ohne Deckel).
- Start: 6 Bewohner, Wohnviertel Stufe 1 mit 6 Plätzen (vorher ein Haus für 4 → Start mit Überbelegung,
  Zufriedenheit 30 %, 2 Gold pro Tag; jetzt 50 % und ca. 6 Gold pro Tag).

## Mindmap (Reiter «Produktion»)

Vier Reihen von oben nach unten, Linien aus den echten Kartenpositionen (SVG, golden wenn beide Enden
stehen, gestrichelt = Wasser-Versorgung):

1. **Gewinnen:** Holzfällerhütte, Steinbruch, Getreidefarm, Eisenmine, Kristalle und Kräuter aus den Dungeons.
2. **Lager:** Lagerhaus als Balken über die ganze Breite mit den wichtigsten Vorräten, daneben «Bauen & Ausbauen» und der Brunnen.
3. **Werkstätten:** Schmiede, Arkanschmiede, Kriegsmaschinen-Werkstatt, Kräutergarten, Windmühle, Bäckerei.
4. **Stadt:** Gildenhaus, «Expeditionen», Wohnviertel, Marktplatz, Bank.

Über der Karte stehen bis zu drei **Engpässe** der Stadt als Knöpfe (klick öffnet das Gebäude). Jedes
Gebäude kommt genau einmal vor, auf der Karte steht die Stufe. Klick: gebaut → Fenster mit Werkstatt und
Ausbau; Bauplatz oder gesperrt → Bau-Dialog mit Grund; Dungeon-Zutaten → Expeditionen.
Der Reiter «Wohnen» ist weg (alles steht im Fenster des Wohnviertels), «Crafting» und «Aufbau» bleiben.

## Freischaltung geändert

Damit die Reihenfolge zum Warenfluss passt: **Eisenmine braucht den Steinbruch, Schmiede braucht die Eisenmine**
(vorher: Schmiede brauchte Holzfäller und Steinbruch, die Eisenmine brauchte die Schmiede).

## Alte Spielstände (SaveVersion 21)

Mehrere Gebäude derselben Art werden beim Laden zu **einem** verschmolzen: Stufe = bisherige Anzahl (höchstens
die Höchststufe), beim Wohnviertel mindestens so hoch, dass alle Bewohner Platz haben. Arbeiter ziehen mit,
so weit Plätze da sind, der Rest wird frei; Waren aus Puffern gehen ins Lager, Spezialisten und ein
Unwetter-Stopp hängen am behaltenen Gebäude. Test: `src/systems/SaveSystem.test.ts`, `src/systems/Ausbau.test.ts`.

## Vorläufig (Balancing, Manager-Issue #23)

- Markt (+25/40/50 %) und Bank (+10 Gold je Platz, Baukosten 50 Holz, 40 Stein, 150 Gold; vorher gratis) sind
  erste Werte. Idee für später: der Marktplatz bekommt ein Handelsfenster (Waren gegen Gold).
- Ausbau-Kosten «× Stufe» sind bewusst einfach; ob Stufe 3 zu billig ist, zeigt das Spielen.
