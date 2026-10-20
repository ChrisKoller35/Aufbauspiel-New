# Rangliste mit Rivalen

Wunsch vom 20.10.2026 (über den Manager): Computer-Gilden klettern auf der Dungeon-Karte mit, man sieht,
wer am höchsten steht (Höhe plus Sterne), und es gibt eine Wochenwertung mit Belohnung für die Spitze.
Die alte Rangliste (nur die eigenen besten Expeditionen) ist in dieses System eingebaut: Sie steht
zugeklappt ganz unten. Diese Datei hält fest, wie das Rennen funktioniert, wie stark die Rivalen sind
und was bei neuen Dungeons oder Gilden zu tun ist.

## So wirkt es im Spiel

- **Zehn Gilden.** Neun Rivalen-Gilden und die eigene klettern auf derselben Dungeon-Karte.
- **Gipfel-Rangliste.** Zuerst zählt die Höhe des höchsten bezwungenen Dungeons (Meter auf der Karte),
  bei gleicher Höhe die Sterne (die Ebenen aller bezwungenen Dungeons zusammengezählt). Bei Gleichstand
  steht die eigene Gilde vorn. Bezwungen heisst: Boss besiegt (oder ein Dungeon ohne Boss gewonnen).
  Ein Sieg nach dem Rundenlimit zählt nicht.
- **Runden statt Uhr.** Jede beendete Expedition ist eine Runde, Sieg oder Niederlage. Nur dann kommen
  auch die Rivalen weiter. Wer eine Woche nicht spielt, verliert im Rennen nichts.
- **Keine rennt davon.** Die Rivalen schaffen höchstens eine Ebene mehr als die eigene Gilde (die zwei
  Spitzengilden und das Rudel) oder höchstens so viel wie sie (alle anderen). Wer weiterkommt, zieht sie mit.
  Neue Dungeons dürfen sie erst eine Runde nach dem Erscheinen auf der Karte betreten.
- **Zufall mit festem Samen.** Wie weit eine Gilde in einer Runde kommt, würfelt der Spielstand fest aus.
  Neuladen ändert nichts, und die Vorschau («zieht in 17 Expeditionen an dir vorbei») trifft ein.
- **Zu sehen**
  - Seite «Rangliste»: Gipfel-Rangliste mit dem nächsten Ziel («Ein Sieg im Drachenhort bringt dich
    vorbei») und einer Warnung, wer bald vorbeizieht; Wochenwertung; «Neues von der Karte» (die letzten
    sechs Siege); Pokale; unten zugeklappt die eigenen besten Expeditionen.
  - Dungeon-Karte: Das Wappen jeder Gilde steht an ihrem höchsten Dungeon (höchstens drei, dann «+n»).
    Das Fenster eines Dungeons sagt, wie viele Rivalen ihn bezwungen haben.
  - Expeditions-Bericht: Ruhm und Wochenplatz, an wem man vorbeigezogen ist, was die Rivalen in dieser
    Runde bezwungen haben.
  - Hauptmenü: Kachel «Gipfel: Platz 3 von 10 · Woche: Platz 2», Abzeichen «🏆 Truhe bereit».

## Wochenwertung

- **Ruhm je Expedition:** Ebene des Dungeons mal geschaffte Räume. Ein Sieg zählt doppelt (nur mit
  besiegtem Boss, nicht nach dem Rundenlimit), der allererste Sieg in einem Dungeon noch einmal doppelt.
  Bei einer Niederlage zählt der letzte Raum nicht.
- **Ruhm der Rivalen:** steht ab Montag fest. Jede Gilde hat eine Zahl «Siege pro Woche» und rechnet sie
  mit dem Ruhm je Sieg im besten eigenen Dungeon. Dazu kommt ihre Form der Woche (Laune): ±11 bis 19 %
  bei den meisten Gilden, ±34 % bei den Glückspilzen. In der ersten Woche zählt nur der Rest der Woche.
- **Woche** Montag 00:00 bis Sonntag 24:00 (Kalenderwoche, Uhrzeit des Geräts).
- **Ruhmestruhe** für Platz 1 bis 3. Sie würfelt aus der Beute des höchsten Bosses, den die Gilde
  besiegt hat (jeder Wurf: Gold und ein Gegenstand), und wartet in der Rangliste, bis man sie öffnet.
  Mehrere Wochen sammeln sich.

| Platz | Würfe | Dazu | Kristallsplitter | Pokal |
|---|---|---|---|---|
| 1 | 4 | ein Teil aus dem Set dieses Dungeons, eins, das noch fehlt | 5 | 🥇 |
| 2 | 3 | | 3 | 🥈 |
| 3 | 2 | | 2 | 🥉 |

## Die Rivalen

Stil: **Stürmer** nehmen immer den höchsten Dungeon, den sie betreten dürfen, **Gründliche** den
niedrigsten, **Ausgewogene** die niedrigste Ebene und darin den höchsten. Tempo: so viel schafft die Gilde
pro Runde; ein Dungeon kostet Ebene hoch 1,5 (Ebene 1: 1, Ebene 4: 8, Ebene 6: 15).

| Gilde | Stil | Tempo | Ebene über dir | Vorsprung (Sterne) | Siege pro Woche |
|---|---|---|---|---|---|
| 🦅 Die Sturmadler | Stürmer | 1,0 | +1 | 10 | 30 |
| 🐉 Orden der Glutschwinge | ausgewogen | 0,85 | +1 | 12 | 24 |
| 🦉 Die Silbereulen | gründlich | 0,8 | 0 | 4 | 15 |
| 🐺 Das Rudel von Dunstmoor | Stürmer | 0,75 | +1 | 2 | 12 |
| 🍄 Die Glückspilze | ausgewogen, sehr launisch | 0,7 | 0 | 0 | 10 |
| ⚓ Bund der Tiefseetaucher | gründlich, mag Küste und Tiefen | 0,6 | 0 | −2 | 8 |
| 🔨 Die Hammerbrüder | gründlich | 0,4 | 0 | −4 | 5 |
| 🛡️ Die Wacht von Eisenfeste | ausgewogen, mag die Belagerung | 0,3 | 0 | −6 | 4 |
| 🐌 Die Schnecken von Granitburg | gründlich | 0,2 | 0 | −10 | 2 |

Beim Start bekommt jede Gilde so viele Sterne wie die eigene Gilde plus ihren Vorsprung (nie über die
erlaubte Ebene). Ein frisches Spiel beginnt darum auf Platz 5, das Probespiel auf Platz 3.

## Eichung

`npm run rangliste-eichung` (nur ein Spielstand: `npm run rangliste-eichung -- probe`) spielt das Rennen
mit einer Muster-Gilde durch: Sie braucht je neuen Dungeon 2 (Ebene 1) bis 20 Expeditionen (Ebene 6),
schnell 0,6-mal so viele, gemütlich 1,6-mal. Stand 20.10.2026:

**Gipfel** (frisches Spiel, Platz nach Expeditionen)

| Spielweise | Verlauf | Ganze Karte |
|---|---|---|
| normal, räumt jede Ebene ab | bis Expedition 28 Platz 3 bis 6, dann lange Platz 4 oder 3, ab 151 kurz Platz 1 | 171, dann Platz 1 |
| normal, klettert zuerst | ab 45 Platz 2, mit dem Himmelsarchiv (97) kurz Platz 1; die Rivalen haben mehr Sterne und ziehen wieder vorbei | 171, dann Platz 1 |
| schnell | mit dem Vulkankern (49) Platz 1, danach Kopf an Kopf mit Sturmadlern und Rudel, ab 87 vorn | 99 |
| gemütlich | lange Platz 4 bis 7, mit 238 kurz vorn | 270, dann Platz 1 |

Die Spitzengilden bleiben bis zum Schluss knapp vorn oder gleichauf. Endgültig Platz 1 wird man erst mit
der ganzen Karte: Das ist das ferne Ziel. Kommen neue Dungeons dazu, geht das Rennen weiter.

**Woche** (Platz in der Mitte von 50 Spielständen, in Klammern die Spanne und wie oft es eine Truhe gibt;
85 % Siege im besten Dungeon)

| Expeditionen pro Woche | Frisches Spiel | Mitte (Ebene 3) | Probespiel (Ebene 4) |
|---|---|---|---|
| 80 (schnell) | 1 (immer) | 1 (immer) | 1 (immer) |
| 40 (normal) | 1 (immer) | 1 (immer) | 1 (1–2, immer) |
| 15 (gemütlich) | 2 bis 3 (Truhe fast immer, in Woche 8 in 58 %) | 4 (3–5, Truhe in 4 bis 36 %) | 4 bis 5 (3–6, Truhe in 0 bis 12 %) |

Als Faustregel reichen im Mittel etwa 17 Expeditionen pro Woche für Bronze, 27 für Silber und 34 für Gold
(mit 85 % Siegen im besten Dungeon). Wer gerade neue Dungeons bezwingt, kommt mit weniger aus, weil der
erste Sieg doppelt zählt und der neue Dungeon mehr Ruhm bringt, als die Rivalen am Montag eingerechnet haben.

**Ziele:** Wer normal spielt, holt meistens Gold. Wer gemütlich spielt, steht auf Platz 3 bis 5 und
bekommt ab und zu eine Truhe. Im Gipfel-Rennen ist man nie lange allein: Die Rivalen ziehen mit, und
erst die ganze Karte bringt Platz 1 für immer.

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/rivalen.ts` | Die neun Rivalen-Gilden und die eigene Gilde |
| `src/systems/Rangliste.ts` | Rennen, Gipfel-Rangliste, Wochenwertung, Ruhm, Ruhmestruhe, Neuigkeiten |
| `src/data/dungeonNamen.ts` | Wie jeder Dungeon im Satz heisst («im Vulkankern», «den Vulkankern») |
| `src/systems/Bezwungen.ts` | Merker der bezwungenen Dungeons (die Bestenliste behält nur die 100 besten Läufe) |
| `src/models/RanglisteStand.ts` | Was der Spielstand von der Rangliste speichert |
| `src/systems/ExpeditionFinalizer.ts` | Ruft nach jeder Expedition `ranglisteNachExpedition` auf |
| `src/ui/screens/RankingScreen.ts` | Seite «Rangliste» |
| `src/ui/components/RanglistenBilanzAnzeige.ts` | Zeilen im Expeditions-Bericht |
| `src/ui/screens/DungeonMapScreen.ts` | Wappen auf der Karte, Rivalen im Fenster |
| `tools/ranglisteEichung.ts` | Eichung |
| `tests/rangliste.test.ts` | Regeln, Vorschau, Speicherstand, Woche, Truhe |

## Neue Dungeons und neue Gilden

- **Neuer Dungeon** auf der Karte: nur eine Zeile in `src/data/dungeonNamen.ts`, wie er im Satz heisst
  («Ein Sieg im Drachenhort», «bezwingen den Drachenhort»; der Test verlangt sie). Ruhm und Mühe ergeben
  sich aus Ebene und Räumen, die Rivalen dürfen eine Runde später hinein, die Wappen wandern von selbst.
- **Neue Gilde:** Eintrag in `RIVALEN` (`src/data/rivalen.ts`, Felder dort erklärt), dann
  `npm run rangliste-eichung` laufen lassen und diese Datei nachführen.

## Spielstand

Zwei neue Felder, beide freiwillig: `rangliste` (Runde, Samen, Woche, Truhen, Pokale) und `bezwungen`
(jeder bezwungene Dungeon mit der Runde des ersten Siegs). Fehlen sie, legt das Spiel sie beim ersten
Aufruf an; ältere Spielstände übernehmen ihre Siege aus Bestenliste, Bossen und Geschichten. Keine neue
SaveVersion. Das Rennen beginnt beim ersten Öffnen nach dem Update.
