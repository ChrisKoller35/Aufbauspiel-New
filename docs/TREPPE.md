# Die endlose Treppe (19.10.2026)

Christophs Endgame (18.10.2026): im Dungeon **endlos nach oben kämpfen** und versuchen, auf der Rangliste oben zu
bleiben. Die letzte Stadtstufe (7, Magische Stadt, siehe `docs/STADTWEG.md`) öffnet die Treppe über dem Dungeon.
Dieses Paket ist **Teil 1**: die Treppe selbst. Die Rangliste mit Rivalen-Gilden folgt (Plan unten).

Code: `src/data/treppe.ts` (Abschnitte, Gegner, Stärke je Stockwerk, Belohnung), `src/systems/Treppe.ts`
(Spielstand, Bestmarke, Startpunkte, Gegner-Werte), Ablauf in `src/systems/ExpeditionSystem.ts` (`startTreppe`,
`treppeAbschliessen`, Rastplatz), Bild aus Code `src/ui/components/TreppenKunst.ts`, Stile `src/ui/html/treppe.css`.
Tests: `tests/treppe.test.ts`. Eichung: `npm run treppe-eichung` (`tools/treppeEichung.ts`).

## Im Spiel

- **Expeditionen:** Die Treppe ist eine eigene Karte mit leuchtendem Torbogen. Offen steht sie ganz oben, gesperrt
  ganz unten («Stadtstufe 7: Magische Stadt»). Die Karte zeigt die Bestmarke.
- **Dungeon-Karte:** Über dem Vulkankern führt ein goldener Pfad zum Eingang «Die endlose Treppe». Antippen öffnet ein
  Fenster mit den Regeln und dem Knopf «Zur Treppe».
- **Stadtweg:** Auf Stufe 7 zeigt das Banner im Hauptmenü «Endgame: Die endlose Treppe» mit der Bestmarke, das Fenster
  hat den Knopf «Zur Treppe».
- **Team-Bildschirm:** Bestmarke, Zahl der Aufstiege, die Regeln in drei Zeilen und die Wahl des **Startpunkts**
  (Stockwerk 1, 11, 21 … je nach besiegten Boss-Stockwerken, das höchste ist vorgewählt). Knopf «Aufstieg starten».
- **Kampf:** Oben steht «Stockwerk N · Abschnitt», der Hintergrund ist das Bild des Gebiets, aus dem die Gegner kommen.
  Fähigkeiten gelten «1× bis zum nächsten Rastplatz». Vor dem Kampf heisst der Rückzug-Knopf «Fliehen» (mit Hinweis,
  dass die Beute seit dem Rastplatz verloren geht). Während der Kampf abläuft, gibt es ihn auf der Treppe nicht: Der
  Kampf ist dann schon entschieden, Fliehen würde nur Beute kosten.
- **Rastplatz** (nach Stockwerk 5, 10, 15 …): Zustand des Teams, was sicher im Gepäck ist, eine Vorschau auf die
  nächsten 5 Stockwerke (mit Boss-Stockwerk) und die Wahl «Heimkehren» oder «Weiter nach oben».
- **Ende:** Die Zusammenfassung heisst «Heimgekehrt», «Niederlage», «Geflohen» oder «Unentschieden» und zeigt die
  geschafften Stockwerke, die neue oder alte Bestmarke und rot, was seit dem letzten Rastplatz verloren ging.

## Regeln

- Offen ab Stadtstufe 7, sonst keine Bedingung (auch nicht der Gildenrang). Der Zeitpunkt der Öffnung wird gespeichert
  (`treppe.geoeffnetAm`), ab dann klettern später die Rivalen.
- Jedes Stockwerk ist ein Kampf. Das erste Stockwerk eines Abschnitts hat 2 Gegner, die anderen 3, höchstens einer davon
  heilt. Jedes 10. Stockwerk ist ein Boss. Dasselbe Stockwerk hat immer dieselben Gegner.
- Zwischen den Stockwerken gibt es keine Heilung. Nach jedem 5. Stockwerk kommt ein Rastplatz: 40 % der vollen Leben
  zurück, Gefallene stehen mit 25 % wieder auf, Fähigkeiten sind wieder frei, die Beute bis hier ist sicher.
- Ein Lauf endet mit Heimkehren am Rastplatz (alles bleibt), Niederlage, Flucht (Knopf im Kampf) oder Unentschieden
  (nach 20 Runden stehen noch Gegner). Ausser beim Heimkehren fällt die Beute auf den Stand des letzten Rastplatzes
  zurück. Erfahrung und die Bestmarke bleiben immer.
- Die Bestmarke zählt sofort, wenn ein Stockwerk geschafft ist (auch wenn der Lauf danach verloren geht). Jede neue
  Bestmarke kommt mit Zeitpunkt in `treppe.verlauf`.
- Startpunkte: Stockwerk 1 oder direkt über einem schon geschafften Boss-Stockwerk (11, 21, 31 …).
- Wird das Spiel mitten im Lauf neu geladen, gilt das wie Fliehen: Erfahrung, Punkte, besiegte Bosse und Statistik
  werden verbucht (`treppeNachNeuladen()` in `ExpeditionFinalizer.ts`), die Beute vom letzten Rastplatz kommt ins Lager
  (`abortExpedition()`).
- Treppen-Bosse sind echte Bosse: Sie kommen ins Monsterbuch und zählen für Gildenrang, Statistik und die besiegten
  Bosse der Dungeon-Karte (auch für Routen, die man noch nicht geschafft hat). Das ist Absicht, das Endgame soll
  überall weiterbringen. Baupläne gibt es auf der Treppe keine.
- Die Treppe ist keine normale Route: Sie kommt nicht in der Wochen-Herausforderung vor, `startExpedition` lehnt sie ab
  (`startTreppe` startet sie).

## Zahlen

Ein normaler Gegner auf Stockwerk n hat im Mittel (`STAERKE` in `src/data/treppe.ts`):
Leben 90 × 1,05^(n−1), Angriff 10 + 0,55 × (n−1), Rüstung 2 + 0,25 × (n−1). Jeder Gegner behält sein Profil (der
Troll ist zäher als der Durchschnitt seines Abschnitts, die Fledermaus schwächer), auch seine Fähigkeiten werden
mitskaliert. Bosse: 3,5 × Leben, 1,25 × Angriff, 1,2 × Rüstung eines normalen Gegners ihres Stockwerks.

| Stockwerk | Leben | Angriff | Rüstung | Gold extra | Boss-Beute |
|---|---|---|---|---|---|
| 1 | 90 | 10 | 2 | 2 | |
| 10 (Boss) | 140 | 15 | 4 | 120 | 1 Kristallsplitter |
| 20 (Boss) | 227 | 20 | 7 | 240 | 1 Kristallsplitter |
| 30 (Boss) | 370 | 26 | 9 | 360 | 2 Kristallsplitter |
| 50 (Boss) | 983 | 37 | 14 | 600 | 2 Kristallsplitter |
| 100 (Boss) | 11272 | 64 | 27 | 1200 | 4 Kristallsplitter |

Gold extra: 2 × Stockwerk, auf Boss-Stockwerken 12 × Stockwerk, dazu die normale Beute der Gegner.
Kristallsplitter auf Boss-Stockwerken: 1 + Stockwerk/30 (abgerundet).

Elf Abschnitte zu je 10 Stockwerken. Nach Stockwerk 110 beginnt die Folge von vorn, nur stärker, der Boss heisst dann
z. B. «Uralter Treant II».

| Stockwerke | Abschnitt | Gegner | Boss (Leben/Angriff/Rüstung) |
|---|---|---|---|
| 1-10 | Wurzelgewölbe | Waldbär, Waldgeist, Waldschamane, Dornengeist, Pilzkriecher, Moosgolem, Dornenbär | Uralter Treant (489/19/5) |
| 11-20 | Spinnenschacht | Giftzahnspinne, Tiefenkriecher, Tropfsteinfledermaus, Kristallkäfer, Schattenfledermaus | Spinnenkönigin (796/26/8) |
| 21-30 | Kristallgrotte | Höhlengoblin, Höhlentroll, Kristallkäfer, Höhlenschleim, Golemfragment, Minengespenst | Kristallgolem (1297/32/11) |
| 31-40 | Räuberstiege | Waldbandit, Bandit, Goblin-Späher, Wildschwein, Hohlschatten | Banditenhauptmann (2112/39/14) |
| 41-50 | Moorstufen | Blutegelschwarm, Giftkröte, Fäulniswandler, Sumpftroll, Moorhexe, Sumpfphantom | Sumpfhydra (3440/46/17) |
| 51-60 | Gruftgalerie | Skelettkrieger, Knochenritter, Steinwächter, Verwunschener Priester, Geistermagier | Gefallener Ritter (5604/53/20) |
| 61-70 | Schattensaal | Grabschrecke, Geistermagier, Knochenritter, Verfluchtes Irrlicht, Schattenfledermaus | Schattenlich (9128/60/23) |
| 71-80 | Tiefseewendel | Tiefseeangler, Quallenschwarm, Druckkrabbe, Ertrunkener Ritter, Meeresschlange | Der Leviathan (14868/67/26) |
| 81-90 | Glutschlot | Lavaelementar, Feuerfledermaus, Obsidiankrabbe, Aschegolem, Flammengeist, Magmaschnecke | Magma-Wyrm (24219/74/29) |
| 91-100 | Mauerkranz | Mauerschütze, Torwächter, Armbrustschütze, Burgverteidiger | Eiserner Kommandant (39450/81/32) |
| 101-110 | Bollwerk | Armbrustschütze, Burgverteidiger, Mauerschütze, Kampfmagier | Festungswächter (64261/87/35) |

## Eichung (19.10.2026)

`npm run treppe-eichung` lässt drei Musterteams (`src/data/musterteams.ts`, Ausrüstung nach den Regeln des Spiels)
über das echte `ExpeditionSystem` klettern (je 8 Läufe, an jedem Rastplatz weiter) und kämpft einzelne Stockwerke mit
vollem Leben (je 20 Kämpfe). Fähigkeiten nutzt die Probe nicht, echte Spieler kommen damit etwas höher. Das Team «Gut»
ist auch das Team im Probespiel.

| Team | Einzelne Stockwerke | Aufstieg ab 1 | ab 11 | ab 21 | ab 31 |
|---|---|---|---|---|---|
| Frisch (Stufe 10, Ausrüstung Stufe 3, 3 Helden) | bis 15 immer, Boss 20 nie, 25 zu 30 % | 13-16 | 13-16 | 20-21 | 31 |
| Gut (Stufe 12, Ausrüstung 3/4, 4 Helden) | bis 25 immer, Boss 30 nie | 18-19 | 18-19 | 22-23 | 31 |
| Stark (Stufe 15, Ausrüstung 4, 4 Helden) | bis 35 fast immer, Boss 40 nie | 19-23 | 19-23 | 24-26 | 31-33 |

So gelesen: Einzelne Stockwerke sind lange machbar, ein Lauf endet, weil sich der Schaden zwischen den Rastplätzen
summiert, und bei starken Teams oft als Unentschieden (die Leben der Gegner wachsen schneller als der Schaden der
Helden). Die natürliche Grenze liegt heute bei etwa Stockwerk 15 (frisch) bis 25 (stark). «Ab 31» setzt einen
besiegten Boss auf Stockwerk 30 voraus, den diese Teams in einem Lauf ab 21 nicht erreichen. Damit es wirklich endlos
weitergeht, braucht es Teil 3 (dauerhafte Verstärkung, siehe Plan).

Neu eichen, wenn sich Kampf, Klassen oder Ausrüstung ändern, zuerst nach Manager-Issue #23 (Mindestschaden,
stärkere Startklassen): `npm run treppe-eichung`, dann die Tabelle hier und, falls nötig, `STAERKE` anpassen.

## Probespiel

`localhost:5173/?probe` öffnet ein eigenes Spiel, um die Treppe ohne Stadtstufe 7 im richtigen Spiel auszuprobieren:
Magische Stadt (Stufe 7, alle Herzsteine und Kapitel), vier Helden aus dem Musterteam «Gut» (Guardian, Berserker,
Ranger, Assassine auf Stufe 12 mit Ausrüstung Stufe 3/4, sie kommen etwa bis Stockwerk 18-23; angeheuert wie im
Heldenhaus, die sechs Bewohner bleiben Arbeiter), dazu Gold, Holz, Stein, Brot und Heiltränke. Es speichert unter
`magic_city_probe` (`nutzeProbespiel()` in `SaveSystem.ts` stellt alle SaveSystem-Instanzen um), der richtige
Spielstand `magic_city_save` bleibt unberührt. Im Hauptmenü steht unter dem Titel «Probespiel · zum richtigen Spiel».
Von vorn: `localhost:5173/?probe=neu` (löscht nur das Probespiel).
Code: `src/systems/Probespiel.ts`, `src/ui/components/ProbespielHinweis.ts`.

## Spielstand

- `state.treppe` (`TreppeStand` in `src/models/GameState.ts`): `geoeffnetAm` (ms), `besteEtage`, `laeufe`,
  `verlauf` (Liste `{ etage, zeit }`). Fehlt in älteren Spielständen und wird mit Stufe 7 angelegt (`treppeStand()`
  legt es auch für Spielstände an, die schon auf Stufe 7 sind). SaveVersion bleibt 22.
- `run.treppe` (`TreppenLauf` in `src/models/ExpeditionRun.ts`): `startEtage`, `besteVorher`, `geschafft` (höchstes
  Stockwerk dieses Laufs), `sicher` (Beute und Gold am letzten Rastplatz), `heimgekehrt`, `patt`. Raum i des Laufs ist
  Stockwerk `startEtage + i` (`treppenEtage()`), Räume werden erst angelegt, wenn man sie erreicht.

## Nebenbei behoben

- Die Fähigkeiten der Helden vor einem Kampf waren nie zu sehen: Die Gegenstands-Leiste hat den ganzen Vorschau-Streifen
  geleert, nachdem die Fähigkeiten hineingesetzt waren (`CombatScreen.ts`). Jetzt stehen sie über den Gegenständen.
- Ein Rückzug konnte eine schon verlorene oder gewonnene Expedition nachträglich zum Rückzug machen (`retreat()` ändert
  jetzt nur noch laufende Expeditionen).
- Gegnername «Aschegollem» → «Aschegolem».
- Pfeilhagel (Ranger) traf vor dem Kampf nur einen Gegner. Fähigkeiten mit Ziel «alle Gegner» treffen jetzt alle
  (`useAbilityInPreview`).
- Göttlicher Schutz (Paladin) lenkte die Angriffe auf einen Guardian in der Gruppe, ohne Guardian wirkte er gar nicht.
  Jetzt zieht jeder Spott die Angriffe auf den Helden, der ihn wirkt (`run.tauntUnitId`, ältere Spielstände: der
  Guardian). Die Beschreibungen von Spott und Göttlicher Schutz sagen jetzt, was passiert.
- Das Kampfprotokoll nennt auf der Treppe das Stockwerk statt der Raumnummer.
- Die Zusammenfassung zeigt keine «Bestmarke: Stockwerk 0» mehr, wenn noch kein Stockwerk geschafft ist.
- Tempo-Boni der Ausrüstung wurden abgerundet: +0,1 wurde 0, −0,05 wurde −1 (der Held war im Kampf immer zuletzt
  dran). `GearSystem.getEffectiveStats` rechnet jetzt mit Bruchteilen.
- Kampf am PC (ab 701 px Breite): Seit die Fähigkeiten zu sehen sind, wurden die oberen Heldenkarten abgeschnitten.
  Fähigkeiten und Vorräte stehen jetzt kompakt nebeneinander, und `CombatScreen.passeKartenAn()` wählt die Bildgrösse
  je Spalte so, dass alle Karten ganz zu sehen sind (höchstens 230 px wie bisher).

## Plan: wie es weitergeht

1. **Teil 1, die Treppe** (dieses Paket, fertig).
2. **Teil 2, Rivalen und lebende Rangliste** (Manager-Issue #39, KI-Bot): 9 Rivalen-Gilden klettern im Spiel berechnet
   mit, auch wenn das Spiel zu ist; wer überholt wird, legt einen Schub nach. Die Rangliste zeigt die Treppe mit
   Rang, Gilde und Stockwerk und den nächsten Rivalen. Die Rivalen-Ziele sind auf die Eichung oben abgestimmt: Am
   ersten Tag ist ein Spieler schnell weit vorne, die besten Rivalen ziehen aber in den Tagen danach davon.
3. **Teil 3, dauerhafte Verstärkung**: Runen der Treppe, gekauft mit Kristallsplittern (fallen auf Boss-Stockwerken),
   z. B. mehr Leben, mehr Schaden, bessere Rastplätze, mit wachsenden Kosten. So kommt man Woche für Woche höher und kann
   die Rivalen wieder einholen. Dafür muss die Eichung zeigen, wie viele Stockwerke eine Rune wert ist.
4. **Teil 4, Abwechslung**: Stockwerks-Eigenschaften (z. B. «Nebel: Gegner treffen schwerer»), Saisons mit neuem
   Start der Rangliste und Belohnungen für die Plätze.
5. Eine **echte Online-Rangliste** mit anderen Spielern braucht einen Server; das wäre ein eigenes Paket und eine
   Entscheidung von Christoph.
