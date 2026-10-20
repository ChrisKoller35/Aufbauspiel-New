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
- **Nach der Expedition** meldet die Bilanz «★ Weg wählen!», wenn ein Held Stufe 10 erreicht hat, und
  «★ Meister: Phalanx!» beim Aufstieg auf Stufe 15.
- **Warum passiv:** Helden kämpfen von selbst und nur mit Grundangriffen. Die Wege wirken darum als
  Kampfeffekte und feste Werte, wie die Fähigkeiten der Dungeon-Sets.
- **Probespiel:** `?probe=neu` startet mit Helden auf Stufe 12 ohne Weg, damit man die Wahl selbst sieht.

## Die Wege

«Meister» nennt nur, was sich ab Stufe 15 ändert. Die zwei letzten Spalten sagen, wie viel der Weg einem
Team bringt (Messung unten, Ziel etwa +2,5 % und +4 %).

| Klasse | Weg | Ab Stufe 10 | Meister (Stufe 15) | Stufe 12 | Stufe 15 |
|---|---|---|---|---|---|
| Wächter | 🧱 Phalanx | Zu Beginn jedes Kampfs erhält jeder im Team einen Schild von 5. Dazu +10 Leben. | Schild von 6, +15 Leben. | 2,3 % | 5,1 % |
| Wächter | ⚔️ Vergelter | Trifft ein Gegner jemanden aus dem Team, schlägt er mit 30 % Chance sofort zurück. Angriffe auf alle zählen nicht. Dazu +2 Angriff. | 45 % Chance, +3 Angriff. | 2,3 % | 4,7 % |
| Waldläuferin | 🎯 Scharfschützin | Zielt auf den Gegner mit den wenigsten Leben, ihr erster Schuss in jedem Kampf trifft kritisch. Angriffe auf sie treffen mit 25 % Chance einen anderen Helden. Dazu +10 % Krit-Chance. | 40 % Chance, +15 % Krit-Chance und Krit-Schaden +0,3. | 2,0 % | 1,2 % |
| Waldläuferin | 🐾 Fährtenleserin | Wen sie trifft, der ist markiert: Alle Helden treffen ihn 25 % härter. Fallen machen dem Team nur halben Schaden. | 35 % härter, Fallen machen gar keinen Schaden. | 0,0 % | 3,4 % |
| Kleriker | ✨ Lichtbringer | Alle 3 Runden heilt er den Verbündeten, dem es am schlechtesten geht, um 5 % von dessen vollem Leben. | 7 % des vollen Lebens. | 0,7 % | 4,4 % |
| Kleriker | ⚒️ Kriegspriester | Solange er steht, hat das ganze Team +1 Verteidigung. | +1 Angriff und +1 Verteidigung. | 1,6 % | 3,7 % |
| Berserker | 🔥 Zorn | Jeder eigene Treffer gibt +2 Angriff bis Kampfende, höchstens +8. | Höchstens +12. | 2,3 % | 5,1 % |
| Berserker | 🪓 Schlächter | Jeder Treffer trifft auch alle anderen Gegner mit 50 % des Schadens. | 75 % des Schadens. | 2,3 % | 1,6 % |
| Assassine | 🗡️ Meuchlerin | Gegner mit weniger als 50 % Leben erleiden von ihr 50 % mehr Schaden. | Doppelter Schaden. | 2,3 % | 1,2 % |
| Assassine | 🌒 Schattentänzerin | 25 % Chance, einem Angriff auszuweichen und sofort zurückzuschlagen. Angriffen auf alle weicht sie nicht aus. | 35 % Chance. | 3,4 % | 4,6 % |
| Paladin | ⛑️ Schutzherr | Wird ein Verbündeter mit weniger als 40 % Leben angegriffen, fängt er den Angriff ab, sofern es ihm selbst besser geht. Dazu +1 Verteidigung. | Schon unter 60 % Leben, +5 Verteidigung. | 2,0 % | 3,9 % |
| Paladin | ⚜️ Kreuzritter | Seine Treffer heilen den Verbündeten, dem es am schlechtesten geht, um 8 % des Schadens. | 12 % des Schadens. | 2,0 % | 4,6 % |
| Bardin | 🎵 Heldenlied | Zu Beginn jedes Kampfs: Das ganze Team ist schneller (Tempo +0,1) und hat +1 Angriff bis Kampfende. | Tempo +0,2 und +2 Angriff. | 2,1 % | 4,4 % |
| Bardin | 🎭 Schmählied | Wen sie trifft, der ist so gekränkt, dass er 2 Runden lang 8 % weniger Angriff hat. | 10 % weniger Angriff. | 2,1 % | 4,8 % |
| Hexe | ⚡ Sturmhexe | Alle 2 Runden trifft ein Blitz jeden Gegner mit 60 % eines normalen Treffers von ihr. | 90 % eines normalen Treffers. | 1,6 % | 3,6 % |
| Hexe | 🕸️ Fluchweberin | Jeder Treffer verflucht das Ziel: −1 Verteidigung bis Kampfende, höchstens −5. | −2 je Treffer. | 1,4 % | 4,8 % |
| Nekromant | 💀 Knochenherr | Gefallene Gegner stehen als Skelette wieder auf und kämpfen bis zum Ende der Expedition mit, höchstens 2. Am Ende jeder Runde trifft jedes Skelett einen Gegner mit 25 % des Angriffs des Nekromanten. | Höchstens 3 Skelette, dafür trifft jedes mit 20 %. | 1,6 % | 4,8 % |
| Nekromant | ☣️ Seuchenbringer | Am Ende jeder Runde verlieren alle Gegner 4 Leben durch Seuche. | 7 Leben. | 1,6 % | 3,6 % |
| Druidin | 🐻 Bärengestalt | +10 Leben und +2 Verteidigung. Zu Beginn jedes Kampfs zieht sie 2 Runden lang alle Angriffe auf sich. | +20 Leben, +4 Verteidigung, 3 Runden. | 2,0 % | 5,1 % |
| Druidin | 🌿 Hüterin des Hains | Zu Beginn jedes Kampfs heilt das ganze Team 6 % seines vollen Lebens. | 8 % des vollen Lebens. | 2,0 % | 3,4 % |

Vergelter und Schattentänzerin reagieren auf Grundangriffe und auf Fähigkeiten, die einen einzelnen Helden
treffen. Bosse greifen oft mit Fähigkeiten an; nur auf Grundangriffe wären beide als Meister zu schwach.

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/spezialisierungen.ts` | Die Wege (`SPEZIALISIERUNGEN`), `WEG_AB_STUFE`, `MEISTER_AB_STUFE`, Texte und Zahlen |
| `src/systems/Spezialisierung.ts` | Regeln: wählen, Meister, Werte und Kampfeffekte des Wegs |
| `src/systems/GearSystem.ts` | Bringt Werte und Effekte des Wegs mit der Ausrüstung in den Kampf (ohne Abzug durch Reparaturen) |
| `src/systems/Kampfeffekte.ts` | Wirkung im Kampf: Kampfbeginn, Treffer, getroffen werden, Zielwahl, Rundenende |
| `src/systems/CombatEngine.ts` | Ruft die Wirkung an diesen Stellen auf |
| `src/ui/components/WegAnzeige.ts` | Abzeichen, Bereich im Heldenfenster, Zeile in der Bilanz |
| `src/ui/screens/HeroesScreen.ts` | Wahl mit Nachfrage im Heldenfenster |
| `src/ui/screens/CombatScreen.ts` | Abzeichen, goldene Banner, 🐾-Marke |
| `src/rendering/Colors.ts` | Goldene Farbe der ★-Zeilen im Kampfprotokoll |
| `src/data/musterteams.ts` | Wege der Musterteams (Phalanx, Zorn, Scharfschützin, Meuchlerin) |
| `tests/spezialisierung.test.ts` | Regeln, Texte, je Weg ein Test der Wirkung, Anzeige |
| `tools/wegEichung.ts` | Misst, wie viel jeder Weg bringt (`npm run weg-eichung`) |

Der Spielstand speichert nur `spezialisierung` am Helden (Feld darf fehlen, keine neue Version nötig).
Ein Spielstand mit einem Weg einer anderen Klasse zählt als «kein Weg»; der Held darf neu wählen.

## Wie stark ein Weg ist (Eichung)

`npm run weg-eichung -- 200` fragt: Um wie viel dürfen die Gegner stärker sein (Leben und Angriff), bis das
Team nur noch die Hälfte der Läufe gewinnt? Verglichen wird das Team ohne Wege mit demselben Team, in dem
ein Held den gemessenen Weg geht (Spielweise vorsichtig):

- **Stufe 12:** Musterteam «gut» im Drachenhort.
- **Stufe 15:** Musterteam «stark» im Himmelsarchiv, der Held ist Meister.
- Fehlt die Klasse im Musterteam, tritt sie mit Sinas Werten an deren Stelle.

**Ziel** etwa +2,5 % auf Stufe 12 und +4 % auf Stufe 15, das Messrauschen liegt bei etwa ±1 %. Werte aus
der Tabelle oben, Stand 20.10.2026.

**Gegner angepasst.** Mit ihren Wegen sind die Musterteams stärker: «gut» im Drachenhort um 8,6 %,
«stark» im Himmelsarchiv um 12,4 % (gleiche Messung, ganzes Team). Damit die zwei obersten Dungeons das
Ziel bleiben, haben ihre Gegner mehr Leben und Angriff bekommen: Drachenhort etwa ×1,11, Himmelsarchiv
etwa ×1,15 (`src/data/enemies.ts`). Das ist etwas mehr als gemessen, weil Wege und Dungeon-Sets sich
gegenseitig verstärken. Ohne Wege sind beide Dungeons jetzt deutlich schwerer; die Wege gehören zum
Endspiel. Zahlen dazu in `docs/NEUE-DUNGEONS.md` («Eichung», dritte Tabelle).

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
5. **Messen:** `npm run weg-eichung -- 200 <id>` und die Tabelle oben nachführen. Bekommt ein Musterteam
   den Weg, auch `npm run dungeon-eichung -- 200` und die Tabellen in `docs/NEUE-DUNGEONS.md` und
   `docs/DUNGEON-SETS.md`.

## Offen

- **Unter dem Ziel:** Fährtenleserin (0,0 %) und Lichtbringer (0,7 %) auf Stufe 12, Scharfschützin (1,2 %),
  Meuchlerin (1,2 %) und Schlächter (1,6 %) auf Stufe 15. Vermutlich liegt es am Prüfstand, nicht am Weg:
  Lia fällt im Prüfstand auf Stufe 12 in jedem Lauf, Helden mit wenig Leben fallen oft vor dem Boss, und
  Schaden auf alle Gegner hilft gegen einen einzelnen Boss wenig. Stärker machen erst, wenn ein zweiter
  Prüfstand (anderes Team, anderer Dungeon) dasselbe zeigt.
- **Nach Manager #43 und #44 neu messen** (Mindestschaden und stärkere Startklassen ändern alle Werte, auch
  Brom und Lia der Musterteams): `npm run weg-eichung -- 200` und `npm run dungeon-eichung -- 200`, danach
  Gegner und Tabellen anpassen. Vorab-Messung in `docs/NEUE-DUNGEONS.md`.
