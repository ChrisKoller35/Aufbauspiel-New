# Ausbau-Stufen, Mindmap und Wohnviertel (18.10.2026)

Christophs Wunsch vom 18.10.2026 (Projekt-Chat): alle Rohstoff-Gebäude führen zum Lagerhaus, die Werkstätten
kommen danach, die Ansicht wird eine Mindmap in Reihen, Gebäude werden nicht mehrfach gebaut, sondern
freigeschaltet und ausgebaut, und die Wohnhäuser brauchen in dieser Ansicht einen besseren Sinn.
Umgesetzt im Thread «Magic City: Bestandsaufnahme und Bot-Aufgaben». Code: `src/systems/Ausbau.ts`
(Regeln), `src/data/produktionsnetz.ts` (Knoten und Linien der Mindmap), `src/ui/screens/ProduktionTab.ts`
(Zeichnen), `src/systems/EconomySystem.ts` (Steuern).

**Nachtrag (spät am 18.10.2026):** Wie weit Wohnviertel, Werkstätten, Marktplatz und Bank ausgebaut werden
dürfen, bestimmt jetzt die Stadtstufe (Tabelle in `docs/STADTWEG.md`). Die Höchststufen unten gelten weiter,
man erreicht sie nur nach und nach.

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
| Marktplatz | 1–3 | je besetztem Arbeitsplatz +25 / +40 / +50 % Steuern und 3 / 6 / 10 Bündel Handel pro Tag (Waren gegen Gold, [HANDEL.md](HANDEL.md)). |
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
- **Brot ist täglicher Verbrauch** (seit 21.10.2026, PR #32): Beim Tageswechsel essen die Bewohner 1 Brot je
  volle 8 Bewohner, mindestens 1 (6 = 1, 16 = 2, 36 = 4), erst danach wächst die Stadt (ein neuer Bewohner kostet
  1 Brot, das nach dem Essen übrig sein muss). Ohne Brot gibt es −20 statt +10 Zufriedenheit, niemand zieht aus.
  Das Startbrot (10) reicht ohne Brotkette 10 Tage. Die Brotkette backt auf Stufe 1 knapp 2, auf Stufe 2 knapp 3,7
  und auf Stufe 3 etwa 5 Brot pro Tag; der Verbrauch ist so gewählt, dass sie auf der Stufe, die eine Stadtstufe
  erlaubt, das volle Wohnviertel satt macht (`tests/startwirtschaft.test.ts`). Seit 21.10.2026 backt die Bäckerei
  nicht mehr ohne Pause, sondern hält von selbst Brot für 3 Tage bereit, vor ihren Aufträgen (`docs/WERKSTAETTEN.md`). Mit 1 Brot je angefangene
  6 Bewohner fehlte im Weiler, im Marktflecken und in der Grossstadt jeden Tag Brot, ohne dass man etwas
  ausbauen konnte.
- Überbelegung kostet 5 Zufriedenheit je Bewohner zu viel, höchstens 30 (vorher ohne Deckel).
- Start: 6 Bewohner, Wohnviertel Stufe 1 mit 6 Plätzen (vorher ein Haus für 4 → Start mit Überbelegung,
  Zufriedenheit 30 %, 2 Gold pro Tag; jetzt 50 % und ca. 6 Gold pro Tag).

## Mindmap (Reiter «Produktion»)

Vier Reihen von oben nach unten, Linien aus den echten Kartenpositionen (SVG, golden wenn beide Enden
stehen, gestrichelt = Wasser-Versorgung):

1. **Gewinnen:** Holzfällerhütte, Steinbruch, Getreidefarm, Eisenmine, Kristalle und Kräuter aus den Dungeons.
2. **Lager:** Lagerhaus als Balken über die ganze Breite mit den wichtigsten Vorräten, daneben «Bauen & Ausbauen».
3. **Werkstätten:** Schmiede, Arkanschmiede, Kriegsmaschinen-Werkstatt, Kräutergarten, Brunnen, Bäckerei, Windmühle.
   Seit 21.10.2026 steht der Brunnen zwischen den beiden Gebäuden, die er mit Wasser versorgt, und die Mühle liefert
   von rechts in die Bäckerei: nur kurze Linien, keine kreuzt eine andere (`docs/WERKSTAETTEN.md`).
4. **Stadt:** Gildenhaus, «Expeditionen», Wohnviertel, Marktplatz, Bank.

Über der Karte stehen bis zu drei **Engpässe** der Stadt als Knöpfe (klick öffnet das Gebäude). Jedes
Gebäude kommt genau einmal vor, auf der Karte steht die Stufe. Klick: gebaut → Fenster mit Werkstatt und
Ausbau; Bauplatz oder gesperrt → Bau-Dialog mit Grund; Dungeon-Zutaten → Expeditionen.
Der Reiter «Wohnen» ist weg (alles steht im Fenster des Wohnviertels), «Crafting» und «Aufbau» bleiben.

**Nachtrag 18.10. abends (Bonus-Aufgabe):** Die Mindmap passt sich der Breite an: genug Platz → normal,
etwas zu schmal (ab ca. 72 % der vollen Breite, z. B. 1024 px) → als Ganzes verkleinert mit Linien, noch schmaler
(Handy) → Raster ohne Linien, jede Karte sagt dann selbst, wohin sie liefert («→ Lagerhaus: Holz»).
Beim Darüberfahren mit der Maus (am Handy: lange drücken) erklärt ein Kasten in einem Satz, wofür das Gebäude gut
ist, wie es gerade steht und was ein Klick macht (Texte: `src/data/gebaeudeErklaerungen.ts`). Das Gebäude, das sich
als Nächstes lohnt, ist golden umrandet («Als Nächstes», auch im Aufbau-Reiter und in der Engpass-Leiste);
Reihenfolge mit Begründung in derselben Datei, Auswahl in `src/systems/Empfehlung.ts` (erstes baubares in der
Reihenfolge: Steinbruch, Getreidefarm, Eisenmine, Brunnen, Mühle, Schmiede, Bäckerei, Kräutergarten, Marktplatz,
Arkanschmiede, Bank, Kriegsmaschinen). Karten sind mit Tastatur bedienbar (Tab, Enter).

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
  erste Werte. Das Handelsfenster am Marktplatz (Waren gegen Gold) gibt es inzwischen; Preise, Tagesmengen
  und warum keine Kette Gewinn bringt: [HANDEL.md](HANDEL.md).
- Ausbau-Kosten «× Stufe» sind bewusst einfach; ob Stufe 3 zu billig ist, zeigt das Spielen.
