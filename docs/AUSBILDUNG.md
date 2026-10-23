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
- Auf Stufe 15 zeigt die Heldenkarte «Lv 15» und darunter «720 XP Überschuss», das Heldenfenster
  «Stufe 15 · 720 XP Überschuss», beide statt «MAX».
- Fehlen einem Helden in einer Spielstand-Datei Name, Stufe oder XP (das Schema verlangt sie nicht), ergänzt
  das Laden sie (`ergaenzeHelden` in `src/systems/SaveSystem.ts`): den Namen der Klasse, die Stufe aus den XP,
  die XP vom Beginn der Stufe. Ein Held auf Stufe 15 hat dann 0 XP Überschuss statt «NaN», und das Lehrbuch
  gibt nie NaN weiter.
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
ergibt genau dieselben Werte wie dieselbe XP aus Expeditionen. Spalten: Leben / Angriff / Verteidigung,
dazu Krit-Chance und Tempo, wo die Klasse sie steigert. Weg-Werte kommen bei beiden gleich dazu und
stehen nicht in der Tabelle.

| Klasse | Stufe 1 | Training vorher | Training nachher |
|---|---|---|---|
| Guardian | 70 / 4 / 3 | 98 / 18 / 17 | 126 / 8,2 / 10 |
| Ranger | 50 / 8 / 1, Krit 15 % | 78 / 22 / 15, Krit 15 % | 78 / 16,4 / 2,4, Krit 29 % |
| Cleric | 55 / 3 / 1,5, Tempo 0,9 | 83 / 17 / 15,5, Tempo 0,9 | 97 / 5,8 / 5,7, Tempo 1,18 |
| Berserker | 84 / 7 / 2 | 112 / 21 / 16 | 126 / 14 / 4,8 |
| Assassine | 54 / 8 / 0, Krit 20 % | 82 / 22 / 14, Krit 20 % | 82 / 16,4 / 1,4, Krit 34 % |
| Paladin | 40 / 4 / 2,5 | 68 / 18 / 16,5 | 96 / 8,2 / 8,1 |
| Barde | 60 / 3 / 1, Tempo 1,1 | 88 / 17 / 15, Tempo 1,1 | 88 / 5,8 / 3,8, Tempo 1,38 |
| Hexe | 57 / 5 / 0, Krit 8 % | 85 / 19 / 14, Krit 8 % | 85 / 10,6 / 1,4, Krit 22 % |
| Nekromant | 60 / 4 / 1 | 88 / 18 / 15 | 88 / 9,3 / 3,8 |
| Druide | 75 / 4 / 2, Tempo 1,0 | 103 / 18 / 16, Tempo 1,0 | 117 / 8,2 / 6,2, Tempo 1,14 |

Vorher kaufte Gold also bessere Helden als das Spielen: Jede Klasse hatte nach reinem Training mehr
Angriff (Ranger 22 statt 16,4, Cleric 17 statt 5,8) und mehr Verteidigung (Ranger 15 statt 2,4) als
über Expeditionen. Dafür fehlten Krit und Tempo, und fünf Klassen hatten weniger Leben. Jetzt spart
Training nur Zeit, die Werte sind dieselben.

## Lehrbuch

Im Reiter «Trainieren» erscheint das Lehrbuch, sobald ein Held auf Stufe 15 ist und ein anderer darunter.

- Man wählt einen **Lehrer** (Stufe 15) und einen **Schüler** (unter Stufe 15) und sieht vorher, was passiert.
- «Lernen» gibt den Überschuss des Lehrers 1 : 1 an den Schüler. Der Schüler bekommt die XP über `awardXP`,
  steigt also mit den Boni seiner Klasse auf.
- Weitergegeben wird der ganze Überschuss, aber nie mehr, als der Schüler bis Stufe 15 braucht. Der Rest
  bleibt beim Lehrer für den nächsten Schüler. Der Lehrer fällt nie unter Stufe 15.
- **Beispiel:** Ein Ranger auf Stufe 9 lernt von einem Guardian mit 800 XP Überschuss. Die Vorschau zeigt
  «+800 XP → Stufe 9 auf 12»: 190 XP bis Stufe 10, 210 bis 11, 230 bis 12, 170 bleiben in Stufe 12.
  Reichen die XP für keinen Aufstieg, steht dort zum Beispiel «+36 XP → bleibt auf Stufe 5 (noch 74 XP bis
  Stufe 6)»; die Meldung nach dem Lernen sagt es gleich.
- Ohne eigene Wahl nimmt das Lehrbuch den ersten Lehrer mit Überschuss und den Schüler mit den wenigsten XP.
  Hat der gewählte Schüler Stufe 15 erreicht, rückt kein anderer an seine Stelle: «Lernen» bleibt aus, bis
  man den nächsten wählt, und die Vorschau sagt «Wähle den nächsten Schüler.» (sofern der Lehrer noch
  Überschuss hat). Sonst gäbe ein zweiter Klick auf «Lernen» die XP einem Helden, den man nie gewählt hat.
- Doppelklick: Die Meldung erscheint unter «Lernen», und «Lernen» bleibt stehen, auch wenn die Vorschau
  länger wird. Der zweite Klick oder Tipp löst nichts aus: Der erste Klick sperrt den Knopf, danach nehmen
  Lehrer, Schüler und «Lernen» 0,6 s lang keinen Klick an, und den zweiten Klick eines Maus-Doppelklicks
  schluckt `schluckeZweitenKlick`. So lange nimmt auch kein Druck den Fokus weg oder markiert Text, wo er
  auch landet: Der Fokus bleibt auf «Lernen» bzw. auf der Meldung, auch wenn der letzte Schüler Stufe 15
  erreicht und das Lehrbuch zur Meldung schrumpft. `lehrbuchLernen` prüft selbst, ob noch Überschuss da
  ist. Danach wird gespeichert (`mc:speichern`).
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
  Held 50 Gold, jeder weitere 30 mehr). Startklassen tragen «von Anfang an». Angeheuert wird sofort
  gespeichert.
- **Gesperrte Klassen** mit Rolle, Grundwerten und jeder Bedingung samt Fortschritt.
- **Klassen, die schon in der Gilde sind**, am Ende mit «Schon in deiner Gilde», Startklassen mit
  «von Anfang an · ✓ Schon in deiner Gilde».
- Die Kopfzeile nennt den Preis nur, solange es etwas anzuheuern gibt. Sonst steht dort «Alle Klassen sind
  schon in deiner Gilde» oder, solange noch Klassen gesperrt sind, «Alle freien Klassen sind schon in
  deiner Gilde».

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
