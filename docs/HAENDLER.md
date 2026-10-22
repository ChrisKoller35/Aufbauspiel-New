# Der Händler (22.10.2026)

Der Händler steht von Anfang an in der Gildenstadt (`docs/GILDENSTADT.md`) und ersetzt Markt, Bank und die
ganze Rohstoff-Wirtschaft: Er verkauft, was die Helden zum Start brauchen, führt die Baupläne der Werkstätten
und kauft Beute an, die niemand trägt. Stückpreise, kein Tageslimit, kein Ausbau.

- Daten und Preisfunktionen: `src/data/haendler.ts` (`HAENDLER_WAREN`, `BAUPLAN_PREISE`, `BAUPLAN_BOSS`,
  `kaufpreis`, `bauplanPreis`, `rabattProzent`, `istAnkaufbar`, `ankaufpreis`)
- Kaufen und Verkaufen auf dem Spielstand: `src/systems/Haendler.ts` (`kaufen`, `bauplanKaufen`, `bauplanGekauft`,
  `verkaufen`, `verkaeufliches`; jede Funktion gibt `{ ok, text }` zurück, das Fenster zeigt nur den Text)
- Fenster: `src/ui/screens/HaendlerFenster.ts` (Stile `.hf-*` in `src/ui/html/magic-city.css`), erreichbar über die
  Händler-Karte im Reiter «Stadt», die Kachel im Reiter «Aufbau» und den Knopf «Bauplan kaufen» im Bau-Dialog.
  Escape, «Schliessen» oder ein Klick auf den Hintergrund schliessen es (`bindeFensterTasten` in
  `src/ui/components/FensterHilfen.ts`); solange es offen ist, bekommt das Spiel dahinter keine Taste.
- Tests: `src/systems/Haendler.test.ts`

## Waren

| Ware | Preis | Bemerkung |
|---|---:|---|
| Brot | 4 Gold | +8 Leben vor einem Kampf |
| Heiltrank | 10 Gold | +15 Leben |
| Eisenschwert, Eisenschild, Lederrüstung | je 25 Gold | Grundausrüstung T1; aus der Schmiede billiger (2 Eisenschrott + 10 Gold bzw. 1 + 15) |

Kaufen geht 1× oder 5× je Knopf; das Fenster zeigt zu jeder Ware ihren `wirkungText` und den Lagerstand.

## Baupläne

Einmal kaufbar; danach steht «✓ gekauft» bzw. «✓ gebaut» (`bauplanGekauft`). Der Gildenrang sperrt nur das Bauen,
nicht den Kauf (das Fenster sagt «braucht zum Bauen Gildenrang N»).

| Bauplan | Preis | auch beim Boss |
|---|---:|---|
| Schmiede | 50 Gold | – |
| Kräuterküche | 50 Gold | – |
| Arkanschmiede | 150 Gold | Kristallgolem, erster Sieg |
| Kriegsmaschinen-Werkstatt | 250 Gold | Gefallener Ritter, erster Sieg |

Freischalt-Hinweise in der Stadt lauten «Bauplan beim Händler (50 Gold)» bzw. «… (150 Gold) oder vom Kristallgolem»
(`bauplanHinweis` in `src/data/buildings.ts`); der Engpass-Satz und die Empfehlung «Als Nächstes» rechnen den
Rabatt der Stadtstufe mit ein, der Hinweis im Aufbau-Reiter nennt den Grundpreis.

## Rabatt (Stadtrecht)

Die Stadtstufe (`haendlerRabatt` in `src/data/stadtstufen.ts`) gibt Rabatt auf Waren **und** Baupläne:
Stufe 1 bis 3 keinen, Stufe 4 bis 6 (Marktflecken bis Grossstadt) 10 %, Stufe 7 (Magische Stadt) 20 %.
Der Wert gilt je Stufe, er wird nicht zusammengezählt. Gerundet auf ganze Gold, nie unter 1 (Brot bleibt bei
10 % auf 4 Gold, ein Heiltrank kostet 9, in der Magischen Stadt 8).

## Ankauf

Der Händler kauft alles aus dem Lager zum **halben Grundwert** (`ITEM_DEFS[…].baseValue / 2`, abgerundet,
mindestens 1 Gold), 1× oder alle auf einmal. Nicht an: Gold, Baupläne, Set-Teile (die gehören in die Set-Schmiede
im Gildenhaus zum Einschmelzen), Dungeon-Material (`mat_*`) und alles mit Grundwert 0. Das Fenster sagt es so: «Er
nimmt Ausrüstung, Beute und Proviant zum halben Wert – Baupläne, Set-Teile und Dungeon-Material nicht (das gehört in
die Set-Schmiede).» Damit wird Beute, die niemand
trägt (Jägerbogen 7, Eichenstab 5, Wolfszahnkette 9 Gold), zu Gold. Auch Eisenschrott (2), Kristallsplitter (10),
Grüne Kräuter (1) und Kriegsmaschinen (25 / 27) nimmt er.

## Zum Vergleich

- Der Dungeon-Händler im Sumpfdorf (`MERCHANT_PRICES` in `src/systems/ExpeditionSystem.ts`: Heiltrank 15, Brot 8,
  Kraft-Brot 25 Beutegold) bleibt teurer, er ist ein Notnagel unterwegs.
- Lieferungen am Auftragsbrett zahlen feste Beträge (`LIEFER_WAREN.gold`, `docs/AUFTRAGSBRETT.md`: 3 Heiltränke 24,
  2 Eisenschwerter 40, 2 Eisenschilde 40, 2 Lederrüstungen 40 Gold), nie mehr, als die Ware beim Händler mit 20 %
  Rabatt kostet (Heiltrank 8, Grundausrüstung 20): Beim Händler kaufen und am Brett abgeben bringt kein Gold, nur die
  Siegel; der Test in `tests/auftragsbrett.test.ts` prüft das.
- Jedes neue Spiel beginnt mit einem Guardian und 100 Gold; der zweite Held kostet 50, der Bauplan der Schmiede 50
  (`docs/GILDENSTADT.md`, «Gold»).
- Gold kommt sonst aus Dungeon-Beute, mutigen Wahlen der Geschichten, Fund-Räumen, dem Auftragsbrett (Zettel und
  Lieferungen), der Ruhmestruhe der Rangliste und den Geschenken der Stadtstufen. Keine Steuern, keine Bank.

## Erfolg

Jeder Kauf (Ware oder Bauplan, nicht Verkauf) zählt `statistics.total_haendler_kaeufe` hoch; der erste bringt
«Erster Kauf» (`haendler_1`, `docs/ERFOLGE.md`).
