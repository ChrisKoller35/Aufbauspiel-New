# Handel am Marktplatz

Am Marktplatz kann man Stadtwaren gegen Gold tauschen. Er handelt in **Bündeln zu 10 Stück**, für ganze Goldbeträge.

- Preise: `src/data/handel.ts`
- Regeln (reine Funktionen): `src/systems/Handel.ts`
- Anzeige: Fenster des Marktplatzes, Abschnitt «Handel» (`src/ui/screens/BuildingsScreen.ts`, Stile `src/ui/html/handel.css`)
- Tests: `tests/handel.test.ts`
- Die Preise bestimmen auch das Gold für Lieferungen am Auftragsbrett ([AUFTRAGSBRETT.md](AUFTRAGSBRETT.md#lieferung)).

## Preise je 10 Stück

| Ware | Verkauf | Kauf |
|---|---:|---:|
| Holz | 2 | 6 |
| Getreide | 2 | 6 |
| Grüne Kräuter | 5 | 15 |
| Stein | 5 | 15 |
| Eisenschrott | 15 | 45 |
| Mehl | 5 | 15 |
| Brot | 12 | 36 |

## Was ein Arbeiter bringt

Gold pro Arbeiter und Tag, wenn man alles verkauft, was er macht. Ein Tag dauert 30 Sekunden.

| Ware (Werkstatt) | Stück pro Arbeiter und Tag | Gold pro Arbeiter und Tag |
|---|---:|---:|
| Holz (Holzfällerhütte) | 6 | 1,2 |
| Getreide (Farm) | 6 | 1,2 |
| Stein (Steinbruch) | 2,5 | 1,25 |
| Eisenschrott (Eisenmine) | 1 | 1,5 |
| Grüne Kräuter (Kräutergarten, **auf Auftrag**) | 2 | 1,0 |
| Mehl (Mühle, **auf Auftrag**) | 5 aus 5 Getreide | 2,5, also +1,3 mehr als das Getreide |
| Brot (Bäckerei, **auf Auftrag**) | 2,14 aus 4,29 Mehl | 2,6, also +0,4 mehr als das Mehl |

**Die Werte gelten auf jeder Stufe gleich, je Arbeiter.** Seit dem 22.10.2026 laufen die Zyklen ohne Leertakt:
Ist einer fertig, beginnt der nächste im selben Stadt-Takt, und die Zeit über das Ende hinaus zählt für ihn mit
(`ProductionSystem`, [TAGESBILANZ.md](TAGESBILANZ.md)). Im Spiel kommt darum heraus, was im Rezept steht. Vorher
dauerte jeder Zyklus eine Sekunde länger, und höhere Stufen brachten je Arbeiter weniger (Holz auf Stufe 3 nur
4 statt 6 pro Arbeiter und Tag). Die Zahlen hier sind mit der echten Spielschleife gemessen (60 Tage im
1-Sekunden-Takt, Stufen 1 bis 3; der erste Takt startet nur, darum fehlen über 60 Tage 0,03 Stück pro Tag),
`tests/handel.test.ts` prüft Stufe 1.

**Auf Auftrag** ([WERKSTAETTEN.md](WERKSTAETTEN.md)): Von selbst laufen nur Holzfällerhütte, Farm, Steinbruch
und Eisenmine. Der Kräutergarten zieht grüne Kräuter sonst nur als Zutat für einen bestellten Trank, die Mühle
mahlt nur, was die Bäckerei gerade braucht, und die Bäckerei backt von selbst nur das Brot der Bewohner, das der
Markt nicht verkauft. Kräuter, Mehl oder Brot zum Verkaufen gibt es also nur, wenn man sie eigens bestellt.

### Warum diese Preise

- **Kauf = 3 × Verkauf.** Wer ein Bündel kauft und gleich wieder verkauft, verliert zwei Drittel des Preises. Gefordert ist mindestens das Doppelte.
- **Ein Arbeiter bringt etwa 1 bis 1,5 Gold pro Tag**, wenn man alles verkauft, was er macht (auf jeder Stufe gleich). Steuern zahlt jeder Bewohner, ob er arbeitet oder nicht: 2 Gold × Zufriedenheit pro Tag. Waren zu verkaufen ist also ein Zubrot und kein Goldesel. Der Test prüft das für jede Werkstatt, die von selbst läuft, im Rezept und im Spieltakt.
- **Knappes ist teuer:** Eisenschrott (1 pro Tag) ist am meisten wert, Holz und Getreide (6 pro Tag) am wenigsten.
- **Verarbeitet ist mehr wert:** 10 Mehl (5 Gold) bringen mehr als 10 Getreide (2), 10 Brot (12) mehr als die 20 Mehl (10), die man dafür braucht.

### Die Bäckerei verdient am Markt wenig, und das bleibt so

Ein Arbeiter in der Bäckerei macht pro Tag nur 0,4 Gold mehr aus seinem Mehl. Die ganze Kette Farm, Mühle,
Bäckerei bringt etwa 1 Gold pro Arbeiter und Tag, etwas weniger als rohes Getreide. Mehr geht nicht, ohne
eine Goldquelle zu öffnen: 10 Brot brauchen 20 Getreide, und 20 Getreide kosten am Markt 12 Gold, genau so viel,
wie 10 Brot bringen. Jedes Gold mehr für Brot (oder weniger für gekauftes Getreide) liesse sich mit Gold aus
dem Nichts verdienen: Getreide kaufen, backen lassen, verkaufen, jeden Tag. Die Bäckerei ist für das Brot der
Bewohner da, nicht für den Markt. Wer Gold aus der Kette will, verkauft besser Mehl (+1,4 pro Arbeiter in der
Mühle), oder Getreide.

## Keine Kette bringt Gewinn

Zutaten kaufen, verarbeiten lassen und verkaufen bringt nie mehr Gold, als es kostet:

| Kette (für 1 Bündel der fertigen Ware) | Zutaten kaufen | verkaufen | Ergebnis |
|---|---:|---:|---:|
| Getreide → Mehl | 10 Getreide: 6 | 10 Mehl: 5 | −1 |
| Mehl → Brot | 20 Mehl: 30 | 10 Brot: 12 | −18 |
| Getreide → Mehl → Brot | 20 Getreide: 12 | 10 Brot: 12 | ±0 |

**Getreide kaufen, mahlen, backen und als Brot verkaufen geht genau auf (12 gegen 12 Gold).** Man gewinnt
nichts und verliert nur die Arbeit von Mühle und Bäckerei. Der Test geht alle Ketten aus den Rezepten von selbst
durch (jedes Rezept, dessen Zutaten man kaufen kann, über alle Stufen) und schlägt fehl, sobald eine Gewinn bringt.
`marktKosten(ware)` in `Handel.ts` rechnet den billigsten Weg über den Markt: kaufen, oder die Zutaten kaufen und
verarbeiten (Mehl aus gekauftem Getreide kostet 0,6 Gold je Stück, gekauftes Mehl 1,5). Daran hängt auch das
Gold der Lieferungen am Auftragsbrett.

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

- Handelbar sind nur die Stadtwaren der Tabelle (`HANDELSWAREN.includes(ware)`; mit `ware in VERKAUFSPREIS` wären auch «toString» oder «constructor» Waren). Kristallsplitter, Dungeon-Zutaten, Ausrüstung und Tränke kommen weiter nur aus Dungeons und Werkstätten.
- Handel braucht einen fertig gebauten, verbundenen Marktplatz mit mindestens einem Arbeiter.
- Verkaufen braucht 10 Stück im Lager, kaufen den vollen Preis in Gold. Weder Vorrat noch Gold werden je negativ. Ein kaputter Wert (NaN, etwa aus einem beschädigten Spielstand) sperrt, statt Gold oder Ware zu verschenken (`!(lager >= 10)` statt `lager < 10`).
- **Brot der Bewohner:** Brot verkauft der Markt nur, soweit es über dem Vorrat für 3 Tage liegt (`vorratZiel(state, 'BAKERY')`, derselbe Vorrat, den die Bäckerei von selbst hält, mit 1 Brot für den nächsten Bewohner, solange das Wohnviertel Platz hat). Darunter heisst es «Das Brot brauchen die Bewohner.», und beim Brot steht «…, 12 für die Bewohner». Brot kaufen geht immer.
- Der Steuer-Bonus des Marktplatzes (+25 / 40 / 50 %) bleibt unverändert.

### Warum nur Brot geschützt ist

Gemessen mit der Spielschleife (Produktion und Arbeiter jede Sekunde, Essen und Wachstum jeden Tag), der
Spieler verkauft jede Sekunde, was der Markt nimmt. Hungertage = Tage, an denen das Brot nicht für alle reicht:

| Stadt | nichts verkaufen | Brot verkaufen, ohne Schutz | Brot verkaufen, mit Schutz | Getreide verkaufen |
|---|---:|---:|---:|---:|
| 36 Bewohner, Farm, Mühle, Bäckerei Stufe 3, 30 Tage | 0 | 5 | 0 | 0 |
| dieselbe ohne Brot zu Beginn | 1 | 5 | 1 | 1 |
| dieselbe mit 80 Brot (alter Spielstand) | 0 | 5 | 0 (60 Brot verkauft) | 0 |
| dieselbe, Bäckerei hat immer 5 Brot-Aufträge | 0 | 5 | 0 (30 Brot verkauft) | 0 |
| 8 Bewohner, Kette Stufe 1, wächst auf 12, 40 Tage | 0 | 1 | 0 | 0 |
| 12 Bewohner, Kette Stufe 2, wächst auf 24, 40 Tage | 0 | 0 | 0 | 0 |

Ohne Schutz verkauft man das Brot, das die Bäckerei für die nächsten Tage gebacken hat, und bis sie
nachgebacken hat, hungert die Stadt. Mit Schutz geht nur Brot über dem Vorrat weg (aus Aufträgen oder
alten Spielständen), und die Stadt hungert nie mehr als ohne Verkauf.

- **Getreide** braucht keinen Schutz: Die Farm macht mehr, als die Brotkette braucht, und reicht es knapp,
  nimmt die Mühle das Getreide, bevor 10 im Lager liegen. Mehl mahlt die Mühle erst, wenn die Bäckerei es
  braucht, es liegt also kaum Mehl herum. Beides: so viele Hungertage wie ohne Verkauf.
- **Holz, Stein, Eisenschrott, grüne Kräuter** verbraucht die Stadt nie von selbst, nur für Bauten, Ausbauten
  und Aufträge, die der Spieler selbst anstösst. Wer sie verkauft, entscheidet selbst.

## Anzeige

- Im Kopf des Handels steht das Gold der Stadt; am Handy deckt das Fenster die Kopfzeile mit dem Gold zu.
- Geht ein Knopf nicht, ist er ausgegraut, und der Grund steht klein darunter (Handys zeigen keine Titel):
  «Zu wenig im Lager (braucht 10).», «Zu wenig Gold (braucht 36).», «Das Brot brauchen die Bewohner.».
- Was den ganzen Markt sperrt, steht einmal über den Waren statt unter jedem Knopf: «Erst einen Marktplatz
  bauen.», «Marktplatz ist nicht verbunden.», «Handel erst mit einem Arbeiter.», «Heute keine Bündel mehr,
  morgen wieder.»
- Das Fenster zeichnet sich neu, sobald sich Gold, Vorrat oder Tagesmenge ändern. Wird gerade gedrückt (und
  300 ms nach dem Loslassen), wartet es damit (`wirdGedrueckt()` in `BuildingsScreen.ts`, gilt für das ganze
  Fenster und damit für die Handelsknöpfe). So geht kein Klick verloren, auch wenn die Werkstätten gerade
  liefern. Im Browser geprüft: Maus 1,75 s auf «Holz verkaufen» gehalten, während Holz ins Lager kam; der
  Knopf bleibt stehen, der Verkauf wird gebucht. Ohne das Warten wird der Knopf ersetzt, und der Klick geht
  verloren.
