# Handel am Marktplatz

Am Marktplatz kann man Stadtwaren gegen Gold tauschen. Er handelt in **Bündeln zu 10 Stück**, für ganze Goldbeträge.

- Preise: `src/data/handel.ts`
- Regeln (reine Funktionen): `src/systems/Handel.ts`
- Anzeige: Fenster des Marktplatzes, Abschnitt «Handel» (`src/ui/screens/BuildingsScreen.ts`, Stile `src/ui/html/handel.css`)
- Tests: `tests/handel.test.ts`

## Preise je 10 Stück

| Ware | Verkauf | Kauf | Ein Arbeiter macht pro Tag | Gold pro Arbeiter und Tag (verkauft) |
|---|---:|---:|---|---:|
| Holz | 2 | 6 | 6 | 1,2 |
| Getreide | 2 | 6 | 6 | 1,2 |
| Grüne Kräuter | 5 | 15 | 2 | 1,0 |
| Stein | 5 | 15 | 2,5 | 1,25 |
| Eisenschrott | 15 | 45 | 1 | 1,5 |
| Mehl | 5 | 15 | 5 aus 5 Getreide | 2,5 (+1,5 mehr als das Getreide) |
| Brot | 12 | 36 | gut 2 aus gut 4 Mehl | 2,6 (+0,4 mehr als das Mehl) |

Ein Tag dauert 30 Sekunden.

### Warum diese Preise

- **Kauf = 3 × Verkauf.** Wer ein Bündel kauft und gleich wieder verkauft, verliert zwei Drittel des Preises. Gefordert ist mindestens das Doppelte.
- **Ein Arbeiter bringt 1 bis 2 Gold pro Tag**, wenn man alles verkauft, was er macht. Das ist ungefähr so viel wie seine Steuern (2 Gold × Zufriedenheit). Waren zu verkaufen ist also eine Alternative zu Steuern und kein Goldesel. Der Test prüft das für jede Rohstoff-Werkstatt.
- **Knappes ist teuer:** Eisenschrott (1 pro Tag) ist am meisten wert, Holz und Getreide (je 6 pro Tag) am wenigsten.
- **Verarbeiten lohnt sich:** 10 Mehl (5 Gold) sind mehr wert als 10 Getreide (2), 10 Brot (12) mehr als die 20 Mehl (10), die man dafür braucht.
- **Zukaufen lohnt sich nur, wenn man die Ware braucht.** Getreide kaufen und als Mehl verkaufen ist ein Verlust (6 gegen 5 Gold), ebenso Mehl kaufen und als Brot verkaufen (30 gegen 12).

## Tagesmenge

Kauf und Verkauf zusammen, je besetztem Arbeitsplatz am Marktplatz (Ausbau-Stufe 1 bis 3):

| Besetzte Plätze | Bündel pro Tag |
|---:|---:|
| 0 | kein Handel («Handel erst mit einem Arbeiter.») |
| 1 | 3 |
| 2 | 6 |
| 3 | 10 |

Der Marktplatz merkt sich, an welchem Tag (`handelTag`) wie viele Bündel (`handelBuendel`) gehandelt wurden. Ist `state.day` später als `handelTag`, beginnt der Zähler wieder bei 0. Darum braucht der Tageswechsel nichts zu tun, und alte Spielstände (ohne die Felder) funktionieren ohne neue SaveVersion.

## Regeln

- Handelbar sind nur die Stadtwaren der Tabelle. Kristallsplitter, Dungeon-Zutaten, Ausrüstung und Tränke kommen weiter nur aus Dungeons und Werkstätten.
- Handel braucht einen fertig gebauten, verbundenen Marktplatz mit mindestens einem Arbeiter.
- Verkaufen braucht 10 Stück im Lager, kaufen den vollen Preis in Gold. Weder Vorrat noch Gold werden je negativ.
- Geht ein Knopf nicht, ist er ausgegraut, und sein Titel (Tooltip) sagt warum: kein Marktplatz, kein Arbeiter, keine Bündel mehr heute, zu wenig im Lager, zu wenig Gold.
- Der Steuer-Bonus des Marktplatzes (+25 / 40 / 50 %) bleibt unverändert.
