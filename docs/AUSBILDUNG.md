# Helden-Ausbildung: Training, Lehrbuch, Klassen-Tafel

Ein Held lernt auf drei Wegen: in Expeditionen, im Training (Heldenhaus, Reiter «Trainieren») und im
Lehrbuch (gleicher Reiter). Alle drei geben XP über `awardXP` (`src/systems/HeroProgression.ts`).
Jeder Aufstieg bringt deshalb dieselben Boni der Klasse (`LEVEL_BONUSES`), egal woher die XP kommen.

Code: `src/systems/Ausbildung.ts` (Training, Lehrbuch), `src/systems/ClassUnlockSystem.ts`
(`fortschritt`), `src/ui/components/Lehrbuch.ts`, `src/ui/components/KlassenTafel.ts`,
Stile in `src/ui/html/ausbildung.css`. Tests: `tests/heldenAusbildung.test.ts`.

## Stufen und XP

- Höchststufe 15. Von Stufe N auf N+1 braucht ein Held `30 + (N − 1) · 20` XP, bis Stufe 15 zusammen 2240 XP.
- `fighter.xp` ist die Gesamt-XP. **Auf Stufe 15 gehen keine XP mehr verloren:** Alles über 2240 ist
  «Überschuss» (`ueberschuss(fighter) = fighter.xp − 2240`). Der Spielstand braucht dafür kein neues Feld.
- Heldenkarte und Heldenfenster zeigen auf Stufe 15 «Stufe 15 · 720 XP Überschuss» statt «MAX».
- Der Überschuss ändert keine Werte und nicht die Stufe, also auch nicht den Meister-Stand des Wegs
  (`docs/SPEZIALISIERUNG.md`).

## Training

- Kosten und XP sind gleich geblieben: ein Training kostet `20 + Stufe · 10` Gold und gibt `10 + Stufe · 5` XP.
  Von Stufe 1 bis 15 sind das 46 Trainings für 4600 Gold und 2300 XP; die 60 XP aus dem letzten Training
  bleiben als Überschuss.
- Ohne genug Gold passiert nichts, das Gold wird nie negativ. Auf Stufe 15 gibt es kein Training mehr.
- **Neu:** Die XP laufen über `awardXP`. Ein Aufstieg im Training bringt die Boni der Klasse wie nach einer
  Expedition. Früher gab jeder Aufstieg im Training pauschal +2 Leben, +1 Angriff und +1 Verteidigung,
  egal welche Klasse.
- Früher füllte ein Aufstieg im Training die Leben ganz auf, `applyLevelBonus` tut das nicht. Es erhöht
  Leben und Höchstleben um denselben Wert; beim Laden des Spiels stehen die Leben ohnehin wieder voll
  (`main.ts`). Spürbar ist der Unterschied also nicht.
- Erreicht ein Guardian im Training Stufe 5 und ist der Uralte Treant schon besiegt, ist der Paladin sofort
  frei, nicht erst nach der nächsten Expedition.
- **Schon trainierte Helden behalten ihre Werte.** Wer mit dem alten Training aufgestiegen ist, hat die
  pauschalen Werte; sie werden nicht nachträglich umgerechnet.

### Werte auf Stufe 15, vorher / nachher

Ein Held von Stufe 1 bis 15 nur mit Training. «Vorher» ist das alte Training, «nachher» das neue; das neue
ergibt genau dieselben Werte wie dieselbe XP aus Expeditionen. «Nachher» gilt mit den Klassen-Boni seit dem
23.10.2026; die Werte mit den Boni bis zum 22.10. stehen unten in «Eichung nach dem Umbau». Spalten: Leben /
Angriff / Verteidigung, dazu Krit-Chance und Tempo, wo die Klasse sie steigert. Weg-Werte kommen bei beiden
gleich dazu und stehen nicht in der Tabelle.

| Klasse | Stufe 1 | Training vorher | Training nachher |
|---|---|---|---|
| Guardian | 70 / 4 / 3 | 98 / 18 / 17 | 112 / 12,4 / 12,8 |
| Ranger | 50 / 8 / 1, Krit 15 % | 78 / 22 / 15, Krit 15 % | 78 / 19,2 / 8, Krit 29 % |
| Cleric | 55 / 3 / 1,5, Tempo 0,9 | 83 / 17 / 15,5, Tempo 0,9 | 97 / 11,4 / 9,9, Tempo 1,18 |
| Berserker | 84 / 7 / 2 | 112 / 21 / 16 | 126 / 16,8 / 10,4 |
| Assassine | 54 / 8 / 0, Krit 20 % | 82 / 22 / 14, Krit 20 % | 82 / 19,2 / 7, Krit 34 % |
| Paladin | 40 / 4 / 2,5 | 68 / 18 / 16,5 | 82 / 12,4 / 12,3 |
| Barde | 60 / 3 / 1, Tempo 1,1 | 88 / 17 / 15, Tempo 1,1 | 88 / 11,4 / 9,4, Tempo 1,38 |
| Hexe | 57 / 5 / 0, Krit 8 % | 85 / 19 / 14, Krit 8 % | 85 / 14,8 / 7, Krit 22 % |
| Nekromant | 60 / 4 / 1 | 88 / 18 / 15 | 88 / 12,4 / 9,4 |
| Druide | 75 / 4 / 2, Tempo 1,0 | 103 / 18 / 16, Tempo 1,0 | 117 / 12,4 / 10,4, Tempo 1,14 |

Vorher kaufte Gold also bessere Helden als das Spielen: Jede Klasse hatte nach dem alten Training mehr Angriff
und Verteidigung, als sie heute über Expeditionen bekommt (Ranger 22 / 15 statt 19,2 / 8, Cleric 17 Angriff
statt 11,4); mit den Boni bis zum 22.10. war der Abstand noch grösser (Ranger 16,4 / 2,4, Cleric 5,8). Dafür
fehlten Krit und Tempo, und fünf Klassen hatten weniger Leben. Jetzt spart Training nur Zeit, die Werte sind
dieselben.

## Lehrbuch

Im Reiter «Trainieren» erscheint das Lehrbuch, sobald ein Held auf Stufe 15 ist und ein anderer darunter.

- Man wählt einen **Lehrer** (Stufe 15) und einen **Schüler** (unter Stufe 15) und sieht vorher, was passiert.
- «Lernen» gibt den Überschuss des Lehrers 1 : 1 an den Schüler. Der Schüler bekommt die XP über `awardXP`,
  steigt also mit den Boni seiner Klasse auf.
- Weitergegeben wird der ganze Überschuss, aber nie mehr, als der Schüler bis Stufe 15 braucht. Der Rest
  bleibt beim Lehrer für den nächsten Schüler. Der Lehrer fällt nie unter Stufe 15.
- **Beispiel:** Ein Ranger auf Stufe 9 lernt von einem Guardian mit 800 XP Überschuss. Die Vorschau zeigt
  «+800 XP → Stufe 9 auf 12»: 190 XP bis Stufe 10, 210 bis 11, 230 bis 12, 170 bleiben in Stufe 12.
- Doppelklick: Der erste Klick sperrt den Knopf, danach nimmt das Lehrbuch 0,6 s lang keinen Klick an, und
  `lehrbuchLernen` prüft selbst, ob noch Überschuss da ist. Danach wird gespeichert (`mc:speichern`).
- Erreicht ein Guardian über das Lehrbuch Stufe 5, wird der Paladin frei wie beim Training.

### Was das Lehrbuch bringt (20 echte Expeditionen)

Test «Lehrbuch in echten Expeditionen»: ein Guardian auf Stufe 15 mit einem Cleric und einem Ranger auf
Stufe 1, 20 Läufe im Waldpfad, jeder gewonnen. Jeder Held bekommt 36 XP je Lauf.

| | Cleric / Ranger nach 20 Läufen | Überschuss des Guardians | Schwächerer Neuling auf Stufe 10 |
|---|---|---|---|
| ohne Lehrbuch | Stufe 8 / Stufe 8 (je 720 XP) | 720 XP (früher verloren) | nach 28 Läufen |
| Lehrbuch an den Schwächeren | Stufe 10 / Stufe 10 (je 1080 XP) | 0 (720 XP weitergegeben) | nach 19 Läufen |
| Lehrbuch immer an den Cleric | Cleric Stufe 10 schon nach 14 Läufen, Ranger Stufe 8 | 0 | – |

Mit dem Lehrbuch braucht der schwächere Neuling also **9 Läufe weniger** bis Stufe 10. Das Lehrbuch gibt
dabei nur XP weiter, die der Meister selbst nicht mehr nutzen kann.

## Klassen-Tafel

Der Reiter «Anheuern» zeigt alle zehn Klassen:

- **Freie Klassen** mit «Anheuern» zum Preis aus `anheuerKosten` (`src/systems/Empfehlung.ts`: der zweite
  Held 50 Gold, jeder weitere 30 mehr). Startklassen tragen «von Anfang an».
- **Gesperrte Klassen** mit Rolle, Grundwerten und jeder Bedingung samt Fortschritt.
- **Klassen, die schon in der Gilde sind**, am Ende mit «Schon in deiner Gilde».

Den Fortschritt rechnet `fortschritt(state, classId)` in `ClassUnlockSystem.ts`. `checkUnlocks` schaltet mit
genau dieser Rechnung frei, Anzeige und Freischaltung können also nicht auseinanderlaufen.
`checkUnlocks` läuft am Ende jeder Expedition, nach einem Aufstieg im Training und nach dem Lernen.

| Klasse | Rolle | Bedingung (`src/data/classUnlocks.ts`) |
|---|---|---|
| Guardian | Tank | von Anfang an |
| Ranger | Schaden | von Anfang an |
| Cleric | Heiler | von Anfang an |
| Berserker | Schaden | Besiege «Uralter Treant» im Tiefwald |
| Assassine | Schaden | Besiege «Kristallgolem» in der Tiefen Höhle |
| Paladin | Tank | Besiege «Uralter Treant» im Tiefwald, und ein Guardian auf Stufe 5 |
| Barde | Unterstützer | 10 gewonnene Expeditionen (Rückzüge und Niederlagen zählen nicht) |
| Hexe | Schaden | Besiege «Kristallgolem» in der Tiefen Höhle |
| Nekromant | Schaden | Besiege «Schattenlich» in den Tiefen Ruinen |
| Druide | Heiler | Besiege «Uralter Treant» im Tiefwald und «Sumpfhydra» im Giftsumpf |

So sieht der Fortschritt aus: «Besiege «Uralter Treant» im Tiefwald: 0/1», «10 gewonnene Expeditionen: 4/10»,
«Guardian auf Stufe 5: Stufe 3». Sind alle Bedingungen erfüllt, die Klasse aber noch nicht frei (älterer
Spielstand), steht dort: «Die Klasse wird nach der nächsten Expedition frei.»

## Eichung nach dem Umbau (23.10.2026)

Die Dungeons über dem Vulkankern sind mit drei Musterteams geeicht (`src/data/musterteams.ts`,
`docs/NEUE-DUNGEONS.md`, «Eichung»). Bis zum 22.10. hatten deren Helden eigene Werte: je Stufe die Hälfte von
Klassen-Bonus und altem Training (+2 Leben, +1 Angriff, +1 Verteidigung), einmal gerundet, ohne Krit und Tempo,
also der Durchschnitt aus Expeditionen und Training. Seit dem Umbau oben (alle XP über `awardXP`) erreichte das
kein Held mehr: Ein Ranger auf Stufe 15 hatte 16,4 Angriff und 2,4 Verteidigung, die Eichung rechnete mit 19
und 9. Mit echten Helden gemessen waren die obersten Dungeons kaum zu schaffen (Siegquoten unten).

**Was sich änderte:**

- **Klassen-Boni** (`LEVEL_BONUSES` in `src/systems/HeroProgression.ts`): Leben, Angriff und Verteidigung je
  Aufstieg tragen jetzt den Mittelwert, mit dem die Dungeons geeicht sind, leicht abgeschwächt. Eine Regel für
  alle Klassen: alter Klassen-Bonus plus 90 % des Wegs zum Mittel aus Klassen-Bonus und altem Training,
  gerundet auf ganze Leben und auf Zehntel bei Angriff und Verteidigung (nächster Wert). Auf diesem Raster
  rundet `applyLevelBonus` nichts weg und nichts dazu: 14 Aufstiege ergeben genau 14 × den Bonus. Krit und
  Tempo blieben, wie sie waren.
- **Musterteams und Probespiel** (`musterWerte`) rechnen nicht mehr selbst, sondern über `werteAufStufe`:
  Grundwerte der Klasse und `awardXP` bis zur Stufe, genau wie bei einem echten Helden. Tests halten das für
  jede Klasse auf Stufe 1 bis 15 gleich, dazu für den Musterlauf und jedes Probespiel (`?probe`, `?probe=sterne`,
  `=mond`, `=morgen`; `tests/heldenAusbildung.test.ts`).
- **Die Gegner blieben, wie sie waren.**
- **Der Kriegspriester** gibt dem Team zur Verteidigung jetzt auch +1 Angriff, als Meister ebenso
  (`src/data/spezialisierungen.ts`). Mit Verteidigung allein fiel er mit den Werten echter Helden aus dem Band
  der Wege (`docs/SPEZIALISIERUNG.md`).
- **Alte Spielstände werden nicht umgerechnet.** Wer schon aufgestiegen ist, behält seine Werte, jeder neue
  Aufstieg bringt die neuen Boni. Ein Guardian, der mit den Boni bis zum 22.10. Stufe 15 erreicht hat, hat also
  126 / 8,2 / 10 statt 112 / 12,4 / 12,8, ein Ranger 78 / 16,4 / 2,4 statt 78 / 19,2 / 8. Wer mit dem alten
  Training aufgestiegen ist, behält dessen pauschale Werte (siehe «Training»).
- Die Tabelle «Werte auf Stufe 15, vorher / nachher» weiter oben zeigt in der Spalte «Training nachher» die
  Werte mit den neuen Boni (Test «Tabelle «Training vorher / nachher»»); die Werte bis zum 22.10. stehen in der
  Tabelle hier.
- Im Heldenfenster rundet der Anteil der Ausrüstung an Angriff und Verteidigung auf Zehntel. Mit Zehnteln in
  den Grundwerten zeigte er sonst Rundungsrauschen (ATK 24.6 +14.000000000000002).

**Klassen-Boni je Aufstieg** (Leben / Angriff / Verteidigung) **und die Werte auf Stufe 15** (Leben / Angriff /
Verteidigung, dazu Krit-Chance und Tempo, wo die Klasse sie steigert):

| Klasse | Bonus bis 22.10. | Bonus seit 23.10. | dazu, unverändert | Stufe 15 bis 22.10. | Stufe 15 seit 23.10. |
|---|---|---|---|---|---|
| Guardian | 4 / 0,3 / 0,5 | 3 / 0,6 / 0,7 | – | 126 / 8,2 / 10 | 112 / 12,4 / 12,8 |
| Ranger | 2 / 0,6 / 0,1 | 2 / 0,8 / 0,5 | Krit +1 % | 78 / 16,4 / 2,4, Krit 29 % | 78 / 19,2 / 8, Krit 29 % |
| Cleric | 3 / 0,2 / 0,3 | 3 / 0,6 / 0,6 | Tempo +0,02 | 97 / 5,8 / 5,7, Tempo 1,18 | 97 / 11,4 / 9,9, Tempo 1,18 |
| Berserker | 3 / 0,5 / 0,2 | 3 / 0,7 / 0,6 | – | 126 / 14 / 4,8 | 126 / 16,8 / 10,4 |
| Assassine | 2 / 0,6 / 0,1 | 2 / 0,8 / 0,5 | Krit +1 % | 82 / 16,4 / 1,4, Krit 34 % | 82 / 19,2 / 7, Krit 34 % |
| Paladin | 4 / 0,25 / 0,4 | 3 / 0,6 / 0,7 | – | 96 / 8,2 / 8,1 | 82 / 12,4 / 12,3 |
| Barde | 2 / 0,2 / 0,2 | 2 / 0,6 / 0,6 | Tempo +0,02 | 88 / 5,8 / 3,8, Tempo 1,38 | 88 / 11,4 / 9,4, Tempo 1,38 |
| Hexe | 2 / 0,4 / 0,1 | 2 / 0,7 / 0,5 | Krit +1 % | 85 / 10,6 / 1,4, Krit 22 % | 85 / 14,8 / 7, Krit 22 % |
| Nekromant | 2 / 0,35 / 0,2 | 2 / 0,6 / 0,6 | – | 88 / 9,3 / 3,8 | 88 / 12,4 / 9,4 |
| Druide | 3 / 0,25 / 0,25 | 3 / 0,6 / 0,6 | Tempo +0,01 | 117 / 8,2 / 6,2, Tempo 1,14 | 117 / 12,4 / 10,4, Tempo 1,14 |
| andere Klassen (`DEFAULT_BONUS`) | 3 / 0,3 / 0,3 | 3 / 0,6 / 0,6 | – | – | – |

Guardian und Paladin verlieren auf Stufe 15 je 14 Leben und gewinnen Angriff und Verteidigung, die übrigen
behalten ihre Leben. Jede Klasse hat jetzt deutlich mehr Verteidigung als bis zum 22.10. (Ranger 8 statt 2,4).

**Das Profil der Tanks wird flacher.** Die eine Regel rückt die Boni aller Klassen ein Stück zum pauschalen
alten Training hin (+1 Angriff, +1 Verteidigung je Stufe), die Klassen werden sich ähnlicher. Auf Stufe 15 hat
der Guardian (112 / 12,4 / 12,8) nur noch 2,4 Verteidigung mehr als der Berserker (126 / 16,8 / 10,4), und der
Berserker hat 14 Leben mehr. Bis zum 22.10. waren es bei echten Helden 5,2 Verteidigung (10 gegen 4,8) bei
gleichen Leben, in der alten Eichung 4 (14 gegen 10). Für diese Eichung bleibt das so, weil eine Regel für alle
Klassen gelten sollte. **Offen:** die Tank-Rolle bei der nächsten Abstimmung der Klassen prüfen, etwa
Guardian-Verteidigung 0,8 statt 0,7 je Stufe, und danach neu eichen.

**Guardian und Ranger auf Stufe 1, 5, 10 und 15** (Leben / Angriff / Verteidigung):

| Held | Stufe | echter Held bis 22.10. | Eichung bis 22.10. | seit 23.10. (echter Held = Eichung) |
|---|---|---|---|---|
| Guardian | 1 | 70 / 4 / 3 | 70 / 4 / 3 | 70 / 4 / 3 |
| Guardian | 5 | 86 / 5,2 / 5 | 82 / 7 / 6 | 82 / 6,4 / 5,8 |
| Guardian | 10 | 106 / 6,7 / 7,5 | 97 / 10 / 10 | 97 / 9,4 / 9,3 |
| Guardian | 15 | 126 / 8,2 / 10 | 112 / 13 / 14 | 112 / 12,4 / 12,8 |
| Ranger | 1 | 50 / 8 / 1, Krit 15 % | 50 / 8 / 1, Krit 15 % | 50 / 8 / 1, Krit 15 % |
| Ranger | 5 | 58 / 10,4 / 1,4, Krit 19 % | 58 / 11 / 3, Krit 15 % | 58 / 11,2 / 3, Krit 19 % |
| Ranger | 10 | 68 / 13,4 / 1,9, Krit 24 % | 68 / 15 / 6, Krit 15 % | 68 / 15,2 / 5,5, Krit 24 % |
| Ranger | 15 | 78 / 16,4 / 2,4, Krit 29 % | 78 / 19 / 9, Krit 15 % | 78 / 19,2 / 8, Krit 29 % |

**Gemessene Siegquoten** (vorsichtig / klug / gierig, `npm run dungeon-eichung`, 1000 Läufe, wo nicht anders
vermerkt; die Gegner sind in allen drei Spalten dieselben):

| Dungeon, Team, Ausrüstung | Eichung bis 22.10. | echte Helden mit den Boni bis 22.10. | seit 23.10. |
|---|---|---|---|
| Drachenhort, «Gut» | 81 / 49 / 1 % | 4 / 1 / 0 % | 82 / 53 / 1 % |
| Himmelsarchiv, «Stark» | 47 / 31 / 1 % | 0 / 0 / 0 % | 47 / 31 / 0 % |
| Himmelsarchiv, «Gut» in Sets aus Ebene 4 | 32 / 18 / 0 % | 2 / 1 / 0 % | 38 / 25 / 0 % |
| Sternenschmiede, «Stark», alle Teile auf +3 (200 Läufe) | 83 / 82 / 10 % | 5 / 12 / 0 % | 82 / 93 / 13 % |
| Sternenschlund, «Stark», Korrunds Set auf +5 | 91 / 62 / 4 % | 9 / 3 / 0 % | 89 / 61 / 5 % |
| Mondhof, «Stark», `mond5` | 74 / 28 / 2 % | 0 / 0 / 0 % | 66 / 20 / 1 % |
| Morgentor, «Stark», `pfand5` | 69 / 50 / 1 % | 4 / 0 / 0 % | 69 / 52 / 0 % |
| Morgentor, «Stark», `morgen0` | 100 / 100 / 98 % (nachgemessen 99 %) | 100 / 99 / 91 % | 100 / 100 / 99 % |

Insgesamt: Von 227 Messwerten aus den Eichungs-Dokus (alle Zeilen der Dungeon-, Set-, Schmiede- und
Monsterbuch-Tabellen, nachgezählt am 23.10.) lagen mit echten Helden und den Boni bis zum 22.10. 85 mehr als
5 Punkte neben den Doku-Werten, seit dem 23.10. sind es 19; der alte Stand, mit denselben Läufen nachgemessen,
verfehlt einen. Welche das sind und in welche Richtung sie abweichen, steht in `docs/NEUE-DUNGEONS.md`, «Nach dem
Umbau des Trainings neu gemessen»; die übrigen Dokus (Sets, Schmiede, Fundbuch, Wege, Geschichten, Rangliste)
sind mit Datum nachgeführt. Bei den Wegen fielen der Kriegspriester (darunter) und Zorn auf Stufe 12 (knapp
darüber) aus dem Band; mit +1 Angriff zum Segen des Kriegspriesters (oben) liegen 39 von 40 Werten im Band,
Zorn ist offen (`docs/SPEZIALISIERUNG.md`). Die Geschichten blieben alle im Ziel.

**Annahme:** Die Regel (90 % des Wegs zum Mittelwert, nächster Wert auf dem Raster) ist eine Annahme. Gemessen
wurden Anteile von 80 bis 105 % mit verschiedenen Rundungen, gegen die Eichung bis zum 22.10. (nachgemessen auf
dem alten Stand). Mit 90 % und dem nächsten Wert lagen am wenigsten Werte mehr als 5 Punkte daneben (14 von 176,
zusammen 251 Punkte; 100 % abgerundet 17 und 300, 80 % aufgerundet 20 und 301). Der volle Mittelwert (100 %,
nächster Wert) machte die Teams deutlich zu stark (Drachenhort «Gut» 95 / 77 / 3 %, Himmelsarchiv «Stark»
74 / 56 / 2 %, 1000 Läufe): Auf dem Zehntel-Raster rundet er bei mehreren Klassen auf (Guardian Angriff 0,65 auf
0,7), und Lias und Sinas Krit wächst jetzt mit (auf Stufe 15 14 Punkte mehr), was die alte Rechnung nicht
kannte. Die übrigen Abweichungen gehen in beide Richtungen; eine einzelne Regel für die Helden kann sie nicht
alle schliessen, und die Gegner einzelner Dungeons blieben bewusst, wie sie waren.
