# Wege der Helden (Spezialisierung)

Christoph (20.10.2026) wollte für Magic City neben der Story einen Punkt, der nichts mit Story zu tun hat.
Das sind die Wege: Ab Stufe 10 wählt jeder Held einen von zwei Wegen seiner Klasse, für immer. Ab Stufe 15
ist er Meister seines Wegs, und die Wirkung wird stärker. Diese Datei hält fest, wie die Wege wirken, wie
stark sie sind und wie ein neuer Weg dazukommt.

## So wirkt es im Spiel

- **Wählen.** Ein Held ab Stufe 10 ohne Weg trägt auf seiner Karte ein pulsierendes «★ Weg wählen».
  Im Heldenfenster stehen beide Wege seiner Klasse mit Wirkung und Meister-Stufe. Der Knopf fragt nach
  («Für immer Phalanx?»), erst «Ja, für immer» legt den Weg fest. Der Spielstand wird sofort gespeichert.
- **Vorschau.** Helden unter Stufe 10 sehen beide Wege im Heldenfenster schon, ohne Knopf.
- **Meister ab Stufe 15:** stärkere Zahlen (Tabelle unten), das Abzeichen auf der Karte wird golden.
- **Im Kampf** trägt die Heldenkarte das Zeichen ihres Wegs. Löst der Weg aus, erscheint ein goldenes
  ★-Banner an der Karte und eine goldene Zeile im Kampfprotokoll («★ Brom setzt Phalanx ein → …»).
  Die Fährtenleserin markiert ihr Ziel zusätzlich mit 🐾 auf dessen Karte.
- **Zustände mit Zahl, jede Runde neu:** Was ein Weg gerade aufgebaut hat, leuchtet im Weg-Abzeichen des
  Helden: 🔥+6 (Zorn, so viel Angriff mehr), 🐻 (die Bärin zieht gerade alle Angriffe auf sich), 💀2
  (so viele Skelette kämpfen mit). Gegner tragen eigene Abzeichen: 🕸️−2 (Fluch, so viel Verteidigung
  weniger) und 🎭−2 (gekränkt, so viel Angriff weniger). Was nicht mehr gilt, verschwindet. Die Zahlen
  kommen aus dem Kampf selbst (`wegZustand` in jeder Runde), nicht aus einer Schätzung.
- **Nach der Expedition** steht unter jedem Helden mit Weg, was der Weg bewirkt hat, zum Beispiel
  «🧱 Phalanx: 112 Schild verteilt» oder «🗡️ Meuchlerin: 834 Schaden». Dazu meldet die Bilanz «★ Weg
  wählen!», wenn ein Held Stufe 10 erreicht hat, und «★ Meister: Phalanx!» beim Aufstieg auf Stufe 15.
- **Im Heldenfenster** zählt der gewählte Weg alles zusammen: «Bisher bewirkt: 1.240 Schaden, 380 Leben
  geheilt». Vor der ersten Expedition steht dort, dass die Zahlen danach kommen.
- **Auf der Heldenkarte** zeigt das Abzeichen beim Darüberfahren den Weg mit allen Zahlen, als Meister
  auch, was die Meisterschaft ändert.
- **Was gezählt wird:** Schaden ist der Teil, den es ohne den Weg nicht gäbe (Zorn: der Schaden aus dem
  zusätzlichen Angriff, Meuchlerin: der Aufschlag auf angeschlagene Gegner, Fluchweberin: was die
  fehlende Verteidigung mehr durchlässt). Dazu Heilung, verteilter Schild, verhinderter Schaden
  (Kriegspriester, Schmählied), sichere Krits (Scharfschützin), umgelenkte Angriffe (Deckung der
  Scharfschützin), abgefangene (Schutzherr), auf sich gezogene (Bärin) und ausgewichene (Schattentänzerin).
  Geteilte Wirkungen (Heldenlied, Kriegspriester, Fluch, Fährte) zählen beim Helden, der sie bringt.
- **Warum passiv:** Helden kämpfen von selbst und nur mit Grundangriffen. Die Wege wirken darum als
  Kampfeffekte und feste Werte, wie die Fähigkeiten der Dungeon-Sets.
- **Probespiel:** `?probe=neu` startet mit Helden auf Stufe 12 ohne Weg, damit man die Wahl selbst sieht.
  `?probe=sterne` (Stufe 15, zwischen den Sternen) startet mit den Wegen der Musterteams, weil die Sternen-Dungeons
  ohne Wege fast nicht zu schaffen sind (`docs/NEUE-DUNGEONS.md`).

## Die Wege

«Meister» nennt nur, was sich ab Stufe 15 ändert. Die zwei letzten Spalten sagen, wie viel der Weg einem
Team bringt (Messung unten, Ziel +2,5 % auf Stufe 12 und +4 % auf Stufe 15, Stand 21.10.2026, neu geeicht).

| Klasse | Weg | Ab Stufe 10 | Meister (Stufe 15) | Stufe 12 | Stufe 15 |
|---|---|---|---|---|---|
| Wächter | 🧱 Phalanx | Zu Beginn jedes Kampfs erhält jeder im Team einen Schild von 3. Dazu +10 Leben. | Schild von 4, +15 Leben. | 2,5 % | 4,7 % |
| Wächter | ⚔️ Vergelter | Trifft ein Gegner jemanden aus dem Team, schlägt er mit 20 % Chance sofort zurück. Angriffe auf alle zählen nicht. Dazu +2 Angriff. | 35 % Chance, +3 Angriff. | 2,7 % | 4,3 % |
| Waldläuferin | 🎯 Scharfschützin | Zielt auf den Gegner mit den wenigsten Leben, ihr erster Schuss in jedem Kampf trifft kritisch. Angriffe auf sie treffen mit 35 % Chance einen anderen Helden. Dazu +10 % Krit-Chance. | +15 % Krit-Chance. | 1,7 % | 4,4 % |
| Waldläuferin | 🐾 Fährtenleserin | Wen sie trifft, der ist markiert: Alle Helden treffen ihn 50 % härter. Fallen machen dem Team nur halben Schaden. | 55 % härter. | 1,7 % | 5,0 % |
| Kleriker | ✨ Lichtbringer | Alle 4 Runden heilt er den Verbündeten, dem es am schlechtesten geht, um 4 % von dessen vollem Leben. | Alle 3 Runden, 6 % des vollen Lebens. | 2,6 % | 4,4 % |
| Kleriker | ⚒️ Kriegspriester | Solange er steht, hat das ganze Team +1 Verteidigung. | +2 Verteidigung. | 2,3 % | 3,3 % |
| Berserker | 🔥 Zorn | Jeder eigene Treffer gibt +1 Angriff bis Kampfende, höchstens +6. | +3 Angriff je Treffer, höchstens +12. | 2,8 % | 3,8 % |
| Berserker | 🪓 Schlächter | Jeder Treffer trifft auch alle anderen Gegner mit 50 % des Schadens. | 75 % des Schadens. | 2,2 % | 4,0 % |
| Assassine | 🗡️ Meuchlerin | Gegner mit weniger als 50 % Leben erleiden von ihr 30 % mehr Schaden. | Schon unter 60 % Leben, 2,5-facher Schaden. | 2,5 % | 3,9 % |
| Assassine | 🌒 Schattentänzerin | 15 % Chance, einem Angriff auszuweichen und sofort zurückzuschlagen. Angriffen auf alle weicht sie nicht aus. | 35 % Chance. | 2,2 % | 4,1 % |
| Paladin | ⛑️ Schutzherr | Wird ein Verbündeter mit weniger als 50 % Leben angegriffen, fängt er den Angriff ab, sofern es ihm selbst besser geht. Dazu +1 Verteidigung. | Schon unter 60 % Leben, +5 Verteidigung. | 2,0 % | 4,2 % |
| Paladin | ⚜️ Kreuzritter | Seine Treffer heilen den Verbündeten, dem es am schlechtesten geht, um 6 % des Schadens. | 7 % des Schadens. | 2,5 % | 3,9 % |
| Bardin | 🎵 Heldenlied | Zu Beginn jedes Kampfs: Das ganze Team ist schneller (Tempo +0,1) und hat +1 Angriff bis Kampfende. | +2 Angriff. | 3,0 % | 3,8 % |
| Bardin | 🎭 Schmählied | Wen sie trifft, der ist so gekränkt, dass er 2 Runden lang 8 % weniger Angriff hat. | 10 % weniger Angriff. | 3,0 % | 4,1 % |
| Hexe | ⚡ Sturmhexe | Alle 2 Runden trifft ein Blitz jeden Gegner mit 60 % eines normalen Treffers von ihr. | 90 % eines normalen Treffers. | 2,4 % | 3,7 % |
| Hexe | 🕸️ Fluchweberin | Jeder Treffer verflucht das Ziel: −1 Verteidigung bis Kampfende, höchstens −2. | −2 je Treffer, höchstens −5. | 2,7 % | 3,9 % |
| Nekromant | 💀 Knochenherr | Gefallene Gegner stehen als Skelette wieder auf und kämpfen bis zum Ende der Expedition mit, höchstens 2. Am Ende jeder Runde trifft jedes Skelett einen Gegner mit 25 % des Angriffs des Nekromanten. | Höchstens 3 Skelette, dafür trifft jedes mit 20 %. | 3,0 % | 3,6 % |
| Nekromant | ☣️ Seuchenbringer | Am Ende jeder Runde verlieren alle Gegner 5 Leben durch Seuche. | 9 Leben. | 2,4 % | 4,0 % |
| Druidin | 🐻 Bärengestalt | +20 Leben und +1 Verteidigung. Zu Beginn jedes Kampfs zieht sie 2 Runden lang alle Angriffe auf sich, bis sie unter die Hälfte ihrer Leben fällt. | +25 Leben, +5 Verteidigung, 3 Runden. | 2,7 % | 4,0 % |
| Druidin | 🌿 Hüterin des Hains | Zu Beginn jedes Kampfs heilt das ganze Team 4 % seines vollen Lebens. | 5 % des vollen Lebens. | 2,6 % | 4,8 % |

Vorher (nach Manager #43 und #44, vor dieser Eichung) reichten die Wege auf Stufe 12 von 1,0 % (Fährtenleserin)
bis 5,7 % (Meuchlerin, Schattentänzerin) und auf Stufe 15 von −0,7 % (Bärengestalt) bis 9,3 % (Kreuzritter).
Jetzt liegen alle 40 Werte im Band Ziel ±1: Stufe 12 von 1,7 bis 3,0 %, Stufe 15 von 3,3 bis 5,0 %.

**Die Bärin bleibt Druidin, wenn es eng wird.** Fällt sie unter die Hälfte ihrer Leben, endet die
Bärengestalt sofort (Kampfprotokoll «★ … wird wieder Druidin»), und mit weniger als der Hälfte nimmt sie
sie gar nicht erst an. Vorher zog sie als Meisterin drei Runden lang alles auf sich, auch wenn sie dabei
fiel, und die Meisterschaft brachte nichts (−0,7 %). Mit «Letzte Bastion» (Set-Fähigkeit) hält sie durch.

Vergelter und Schattentänzerin reagieren auf Grundangriffe und auf Fähigkeiten, die einen einzelnen Helden
treffen. Bosse greifen oft mit Fähigkeiten an; nur auf Grundangriffe wären beide als Meister zu schwach.

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/spezialisierungen.ts` | Die Wege (`SPEZIALISIERUNGEN`), `WEG_AB_STUFE`, `MEISTER_AB_STUFE`, Texte und Zahlen |
| `src/systems/Spezialisierung.ts` | Regeln: wählen, Meister, Werte und Kampfeffekte des Wegs |
| `src/systems/GearSystem.ts` | Bringt Werte und Effekte des Wegs mit der Ausrüstung in den Kampf (ohne Abzug durch Reparaturen) |
| `src/systems/Kampfeffekte.ts` | Wirkung im Kampf: Kampfbeginn, Treffer, getroffen werden, Zielwahl, Rundenende. Zählt, was jeder Weg bewirkt (`wegZaehlen`, `wegAnteileZaehlen` für Schaden aus Angriff und Verteidigung), und hält die Zustände jeder Runde fest (`wegZustandDerRunde`) |
| `src/systems/CombatEngine.ts` | Ruft die Wirkung an diesen Stellen auf, legt die Zustände in jede Runde (`CombatRoundSnapshot.wegZustand`) |
| `src/systems/ExpeditionFinalizer.ts` | Gibt die Bilanz der Expedition an den Bericht und zählt sie am Helden zusammen (`wegBilanzDazu`) |
| `src/models/GuildRoster.ts` | `wegBilanz` am Helden (gespeichert, darf fehlen) |
| `src/ui/components/WegAnzeige.ts` | Abzeichen, Bereich im Heldenfenster mit «Bisher bewirkt», Zeilen in der Bilanz (`wirkungText`, `wegWirkungZeile`) |
| `src/ui/screens/HeroesScreen.ts` | Wahl mit Nachfrage im Heldenfenster |
| `src/ui/screens/CombatScreen.ts` | Abzeichen, goldene Banner, 🐾-Marke, Zustände mit Zahl (`wegZustaendeZeigen`) |
| `src/main.ts` | Zeilen «🧱 Phalanx: …» im Bericht nach der Expedition |
| `src/rendering/Colors.ts` | Goldene Farbe der ★-Zeilen im Kampfprotokoll |
| `src/data/musterteams.ts` | Wege der Musterteams (Phalanx, Zorn, Scharfschützin, Meuchlerin) |
| `tests/spezialisierung.test.ts` | Regeln, Texte, je Weg ein Test der Wirkung, Anzeige |
| `tools/wegEichung.ts` | Misst, wie viel jeder Weg bringt (`npm run weg-eichung`) |

Der Spielstand speichert `spezialisierung` und `wegBilanz` am Helden (beide Felder dürfen fehlen, keine neue
Version nötig). Ein Spielstand mit einem Weg einer anderen Klasse zählt als «kein Weg»; der Held darf neu wählen.

## Wie stark ein Weg ist (Eichung)

`npm run weg-eichung -- 400` fragt: Um wie viel dürfen die Gegner stärker sein (Leben und Angriff), bis das
Team nur noch die Hälfte der Läufe gewinnt? Verglichen wird das Team ohne Wege mit demselben Team, in dem
ein Held den gemessenen Weg geht (Spielweise vorsichtig). Zwei Prüfstände je Stufe, gezählt wird das Mittel,
damit kein Weg an einem einzelnen Dungeon hängt:

- **Stufe 12:** Musterteam «gut» im Drachenhort und im Himmelsarchiv.
- **Stufe 15:** Musterteam «stark» im Drachenhort und im Himmelsarchiv, der Held ist Meister.
- Fehlt die Klasse im Musterteam, tritt sie mit Sinas Werten an deren Stelle.
- **Zufallsrundung:** Das Spiel rundet Leben und Angriff der Gegner ab, und ein Angriffspunkt sind hier 3 bis
  6 %. Ohne Gegenmittel springen die Siege stufenweise, und viele Wege landen auf demselben Wert (vorher oft
  genau 3,7 %). Darum rundet jeder Lauf mit einem eigenen festen Rest, mit und ohne Weg derselbe.

**Ziel** +2,5 % auf Stufe 12 und +4 % auf Stufe 15. Das Messrauschen liegt mit 400 Läufen bei etwa ±1 %, und
alle 40 Werte liegen in diesem Band (Tabelle oben). Knapp am Rand: Scharfschützin und Fährtenleserin auf
Stufe 12 (1,7 %), Fährtenleserin auf Stufe 15 (5,0 %).

**So wurde geeicht (21.10.2026).** Zuerst jeder Weg einzeln mit Varianten seiner Zahlen (drei Runden, bis 400
Läufe je Messpunkt), dann die ganze Tabelle mit `npm run weg-eichung -- 400`. Regeln dabei: Der Meister ist nie
schwächer als der Weg ab Stufe 10 und ändert immer etwas (Test «Meister-Regeln»), und im Text stehen keine
halben Prozente. Wo das Team «gut» weniger von einem Weg hat als «stark» (Waldläuferin, Heilung, Fallen),
liegt Stufe 12 am unteren und Stufe 15 am oberen Rand des Bands.

**Musterteams mit ihren Wegen** (`npm run weg-eichung -- 400 teams`): «gut» ist im Drachenhort 8,2 % und im
Himmelsarchiv 10,5 % stärker als ohne Wege, «stark» 16,0 % und 17,2 %. Mit den alten Wegen waren sie je nach
Dungeon noch 1,4 bis 3,2 % stärker als jetzt (darum «Gegner nachgezogen» unten). Phalanx, Scharfschützin und
die Meuchlerin unter Stufe 15 sind schwächer geworden; als Meister baut Zorn schneller auf, und die Meuchlerin
trifft früher und härter (2,5-fach schon unter 60 % Leben), was vor allem gegen Bosse zählt.

**Gegner nachgezogen.** Damit die obersten Dungeons so schwer bleiben wie vorher, haben ihre Gegner weniger
Leben und Angriff (`src/data/enemies.ts`): Drachenhort ×0,976, Himmelsarchiv ×0,981 (Leben noch einmal
×0,985, weil der Angriff ganzzahlig kaum sinkt), Sternenschmiede ×0,972, Sternenschlund ×0,968. Im
Sternenschlund haben die Wachen dazu 6 % weniger Leben und Nyxar 9 % mehr: Die neuen Wege sind stärker
gegen Bosse und schwächer in langen Folgen von Kämpfen, sonst wäre die Stufe +4 der Schmiede kaum mehr
schaffbar gewesen. Gemessen mit 1000 Läufen gegen den alten Stand (alte Wege, alte Gegner, gleiche
Startwerte); Zahlen in `docs/NEUE-DUNGEONS.md` («Eichung»).

## Einen Weg dazubauen oder ändern

1. **Eintrag** in `SPEZIALISIERUNGEN`, zwei je Klasse: `id` = `<klasse>_<weg>`, Name, Zeichen (Emoji,
   einmalig), `kurz` (Rolle in wenigen Worten), `text` und `meisterText` mit allen Zahlen,
   `effekte` und `meisterEffekte`, feste Werte in `werte` und `meisterWerte`.
2. **Neue Wirkung** in `src/systems/Kampfeffekte.ts` an der passenden Stelle (Kampfbeginn, Treffer,
   getroffen werden, Rundenende). Die Kampfzeile «★ Name setzt Weg ein → …» bringt das goldene Banner,
   eine Zeile mit «  ★» davor nur die goldene Zeile. Nur würfeln, wenn ein Held den Effekt hat;
   sonst ändern sich alle übrigen Kämpfe.
3. **Texte:** In `tests/spezialisierung.test.ts` unter `TEILE` eintragen, welche Zahlen im Text stehen
   müssen. Ändert jemand eine Zahl, schlägt der Test an, bis der Text passt.
4. **Test** der Wirkung unter «Wege im Kampf».
5. **Messen:** `npm run weg-eichung -- 400 <id>` und die Tabelle oben nachführen. Bekommt ein Musterteam
   den Weg, auch `npm run weg-eichung -- 400 teams`, `npm run dungeon-eichung -- 200` und die Tabellen in
   `docs/NEUE-DUNGEONS.md` und `docs/DUNGEON-SETS.md`.
6. **Bilanz:** Was der Weg bewirkt, mit `wegZaehlen(held, art, menge)` zählen (Arten in
   `WegWirkungArt`, Worte in `WegAnzeige.ts`). Baut der Weg im Kampf etwas auf, das man sehen soll, kommt
   es in `wegZustaende` (Kampfeffekte.ts) als Zeichen mit Zahl.

## Offen

- **Waldläuferin auf Stufe 12 am unteren Rand.** Beide Wege bringen dem Team «gut» 1,7 %. Stärker machen
  hebt Stufe 15 über das Band (dort 4,4 und 5,0 %). Eine Idee für später: Die Fährtenleserin markiert zuerst
  den Gegner, den das Team gerade angreift, dann trifft ihr Bonus öfter.
- **Bilanz der Phalanx** zählt den verteilten Schild, nicht, wie viel davon wirklich Schaden abgehalten hat.
  Genauer ginge es mit einem Zähler dort, wo ein Treffer den Schild aufbraucht (`schild` an `CombatUnit`).
- **Echte Spieler** nutzen Fähigkeiten vor dem Kampf und andere Wege als die Musterteams. Wenn Christoph
  spielt: schauen, ob die Zahlen im Bericht zu den Prozenten der Tabelle passen (ein Weg, der kaum etwas
  zählt, ist verdächtig).
