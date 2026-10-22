# Tagesbilanz der Stadt

Was entsteht und was wird pro Tag (30 Sekunden, `TAG_SEKUNDEN`) verbraucht, wenn alles so weiterläuft wie jetzt?
Rechnung: `src/systems/Tagesbilanz.ts` (`tagesBilanz(state)`), Anzeige: Reiter «Produktion»
(`src/ui/screens/ProduktionTab.ts`). Seit 22.10.2026 nach den Regeln der Werkstätten auf Auftrag
(docs/WERKSTAETTEN.md) und mit der Dauer, die ein Zyklus im Spiel wirklich hat.

## Echte Dauer eines Zyklus

Gerechnet wird mit `echteZyklusSekunden` (`src/systems/ProductionSystem.ts`), nicht mit der Dauer im Rezept. Der
Stadt-Takt zählt in ganzen Sekunden, und nach einem fertigen Zyklus beginnt der nächste erst im Takt danach
(Leertakt). Ein 10-s-Rezept liefert so alle 11 s, auf Stufe 3 (3,3 s) alle 5 s. Stufe, Besetzung und Synergie
stecken in `zyklusSekunden` und zählen mit (die Synergie bleibt heute bei 1: `updateSynergies` ruft niemand auf).

| Pro Tag | Stufe 1 | Stufe 2 | Stufe 3 |
|---|---|---|---|
| Holz, Getreide (Rezept 6 / 12 / 18) | 5,45 | 10 | 12 |
| Stein (Rezept 2,5 / 5 / 7,5) | 2,31 | 4,29 | 6 |
| Eisenschrott (Rezept 1 / 2 / 3) | 0,97 | 1,88 | 2,73 |
| Mehl, höchstens (Rezept 5 / 10 / 15) | 4,62 | 8,57 | 12 |
| Brot, höchstens (Rezept 2,14 / 4,29 / 6,43) | 2 | 3,75 | 5 |

Die Produktion selbst bleibt, wie sie ist. Wird der Leertakt einmal behoben, ändert sich nur `echteZyklusSekunden`;
`tests/tagesbilanzSimulation.test.ts` vergleicht die Funktion mit `ProductionSystem.update` und schlägt sonst an.

## Was gezählt wird

- **Rohstoff-Gebäude** (Holzfällerhütte, Steinbruch, Eisenmine, Getreidefarm) arbeiten ohne Pause: Ausgaben ×
  `TAG_SEKUNDEN` / `echteZyklusSekunden`.
- **Bewohner** essen `brotProTag`. Solange das Wohnviertel Platz hat, kostet der nächste Bewohner 1 Brot (Posten
  «Nächster Bewohner −1»). Zusammen ist das `brotBedarfProTag`, wie im Spiel (`PeopleSystem.dayTick`).
- **Brot für die Bewohner:** Die Bäckerei hält es von selbst für 3 Tage vorrätig (`VORRAETE` in
  `Werkstattplan.ts`). Gezählt wird das Gleichgewicht: so viel, wie verbraucht wird, höchstens was die Bäckerei
  und ihre Zutaten hergeben. Posten «Bäckerei (Brot für die Bewohner) +X» und «Windmühle (Mehl für die
  Bäckerei) +Y», die Zutaten als Verbrauch bei Bäckerei und Windmühle.
- **Gold:** Steuern und Bank aus `EconomySystem.steuerRechnung`, wie beim Tageswechsel.

### Werkstätten auf Auftrag

- Werkstätten mit Auftragsliste (`manualCraft`: Kräutergarten, Windmühle, Bäckerei, Schmiede, Arkanschmiede,
  Kriegsmaschinen) zählen nie über `activeRecipeId`: Dort steht der laufende Auftrag oder was sie gerade von
  selbst machen.
- Aufträge sind einmalig und zählen nicht, auch nicht ihre Vorstufen (Kräuter für den Heiltrank) und das Mehl
  dafür. Ein Kraft-Brot-Auftrag ändert die Bilanz nicht.

### Zutaten

- Macht eine Zulieferer-Werkstatt die Zutat (`lieferantFuer`, `hatAuftragsliste`, `rezeptFuer`), liefert sie genau
  so viel, wie gebraucht wird, höchstens was sie schafft. Eine Kette, die läuft, zählt also auch mit leerem Lager.
- Reicht das Lager heute für eine Zutat (mindestens ein Tagesbedarf und mehr als eine Ladung ihres Herstellers),
  kommt sie von dort, und die Zulieferer-Werkstatt ruht: Mehl aus alten Spielständen wird zuerst verbacken (Mehl
  rot mit «reicht»). Eine frisch gelieferte Ladung (2 Mehl) zählt nicht, sonst spränge die Anzeige.
- Sonst kommt nur, was Rohstoff-Gebäude pro Tag mehr machen, als sonst verbraucht wird. Ohne Getreidefarm und ohne
  Getreide im Lager mahlt die Windmühle nicht, und das Brot fehlt.

### Engpass

Reicht das Brot nicht, nennt die Erklärung, wer am wenigsten zulässt:

- «Engpass: Bäckerei fehlt.» / «Engpass: Getreidefarm fehlt.»
- «Engpass: Bäckerei steht (wartet auf Wasser).»
- «Engpass: Bäckerei (Stufe 1) schafft nur 2 Brot am Tag.», mit fehlenden Arbeitern «(Stufe 3, 1/3 Arbeiter)».
- «Engpass: Windmühle (Stufe 1) schafft nur Mehl für 2,3 Brot am Tag.»

### Beispiel

Getreidefarm, Windmühle und Bäckerei auf Stufe 1, je 1 Arbeiter, Brunnen, kein freier Platz (3 Bewohner):

| Ware | Posten | Bilanz |
|---|---|---|
| Getreide | Getreidefarm +5,45, Windmühle −2 | +3,45 (Rezept: +4) |
| Mehl | Windmühle (Mehl für die Bäckerei) +2, Bäckerei −2 | 0 |
| Brot | Bäckerei (Brot für die Bewohner) +1, Bewohner −1 | 0 |

Mit 24 Bewohnern essen sie 3 Brot, die Bäckerei schafft 2: Brot −1, «Engpass: Bäckerei (Stufe 1) schafft nur
2 Brot am Tag.»

## Was nicht gezählt wird

- Gebäude mit Hindernis (`produktionsHindernis`): im Bau, Unwetter, nicht verbunden, kein Arbeiter, kein Wasser.
- Aufträge (siehe oben), Handel und Expeditionen.
- Ertrags-Boni von Stadt-Ereignissen (`CityEventSystem.getProductionMultiplier`): Sie gelten nur kurz.
- Liegt mehr Brot im Lager als für 3 Tage, ruht die Bäckerei, bis es weniger ist. Die Bilanz zeigt trotzdem das
  Gleichgewicht; «reicht» rechnet die Pause ein.
- Wächst die Stadt, baut die Bäckerei ihren Vorrat für 3 Tage mit auf und backt dafür kurz mehr.

## «reicht»

- Nur bei minus: «reicht N Tage» heisst, an so vielen Tageswechseln liegt der ganze Bedarf im Lager. Weniger als
  1 im Lager: «leer». Reicht es nicht bis zum nächsten Tageswechsel: «reicht keinen Tag».
- Waren ohne Vorrat von selbst: Lager durch Minus, abgerundet.
- Brot (Vorrat der Bäckerei) Tag für Tag wie im Spiel: Ab dem Ziel (Brot für 3 Tage) ruht die Bäckerei, das Lager
  sinkt um den ganzen Verbrauch. Lag das Lager beim letzten Tageswechsel am Ziel, backt sie danach wieder an, wartet
  aber erst auf Mehl (`anlauf`, die Windmühle mahlt erst dann) und schafft an dem Tag weniger. Was sie heute schon
  gebacken hat, zählt nicht doppelt (`tagFortschritt`). Beispiel: 80 Brot, 24 Bewohner, Brotkette Stufe 1: 30 Tage,
  genau wie im Spiel (80 / 1 wären 80).
- Gegen die Spielschleife gemessen: genau oder 1 Tag vorsichtiger in über 95 % der Fälle, nie mehr als 1 Tag zu viel.
  Bei kleinem Minus (−0,25) bis 4 Tage zu vorsichtig, weil die Bäckerei ganze Brote backt. Am ersten Tag einer neuen
  Brotkette (noch kein Getreide, kein Mehl) zeigt es zu viel, weil die Kette erst anläuft. Wächst die Stadt, steigt
  der Verbrauch mit; «reicht» rechnet mit dem heutigen.

## Anzeige

- Zeile «Pro Tag:» bei der Engpass-Leiste: ein Chip je Ware, deren Bilanz gerundet nicht 0 ist. Eine
  Nachkommastelle, plus und minus gleich gerundet (`Math.sign(n) * Math.round(Math.abs(n) * 10) / 10`), Komma
  und echtes Minus. Feste Reihenfolge: Gold, die Waren des Lagers, der Rest.
- Zeichen: 🪙 Gold (wie in der Kopfzeile), 🪵 Holz, 🪨 Stein, 🌾 Getreide, 🫓 Mehl, 🍞 Brot, 🥖 Kraft-Brot,
  ⚙️ Eisenschrott, 💎 Kristallsplitter, 🌿 Grüne Kräuter, ⚗️ Heiltrank.
- Rot bei minus, dazu «reicht …». Maus darüber, Tastatur oder langes Drücken zeigt die Erklärung: die Posten (erst
  was entsteht), wer den Vorrat hält, der Engpass, dann «Im Lager N, reicht …» oder «Das Lager ist leer.».
- Screenreader hören die Zahl: `role="img"` und `aria-label`, z. B. «Brot pro Tag: −1, reicht 4 Tage».
- Die Chips werden an Ort und Stelle nachgeführt (jede halbe Sekunde mit der Mindmap, `aktualisiereProduktionTab`).
  Ein Chip bleibt dasselbe Element und behält den Tastatur-Fokus; fällt er weg, geht der Fokus zum Nachbarn. Eine
  offene Erklärung geht mit den Zahlen mit.
- Auf dem Handy wie die Karten: langes Drücken markiert nichts und öffnet kein Kopier-Menü (`touch-action`,
  `user-select`, `-webkit-touch-callout`).
- Lagerhaus-Karte: hinter jedem Vorrat klein die Tagesbilanz.

## Tests

- `tests/tagesbilanz.test.ts`: Regeln, Texte und Anzeige.
- `tests/tagesbilanzSimulation.test.ts`: gegen die Spielschleife wie in `main.ts`. `echteZyklusSekunden` gegen
  `ProductionSystem.update` (alle Rohstoff-Gebäude, Stufen 1 bis 3, mit Synergie, Bäckerei und Windmühle); jede
  Stadtstufe mit vollem Wohnviertel und die Engpässe über 90 Tage (Abweichung höchstens 0,012 pro Tag, nur weil
  das Lager ganze Stücke zählt; der Test erlaubt 0,05); «reicht» gegen die satten Tage.
