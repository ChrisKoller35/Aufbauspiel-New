# Auftragsbrett der Gilde und Trophäensaal

Wunsch vom 21.10.2026 (über den Manager, Variante 1): Aufträge, die jeden Tag wechseln und mit ihren
Belohnungen in die Dungeons führen (Ketten, Fortschritt, ein fernes Ziel), dazu ein Trophäensaal mit den
Boss-Trophäen, den Sets und der Rangliste. Diese Datei hält fest, wie beides wirkt, welche Zahlen gelten
und was bei neuen Dungeons zu tun ist.

## So wirkt es im Spiel

- **Gildenhaus.** Breite Kachel im Hauptmenü unter den vier anderen (Bild: das Gildenhaus aus den
  Gebäuden, kein neues Bild). Abzeichen «📜 Abgeben möglich», wenn eine Lieferung bereitliegt, sonst
  «📜 Neue Zettel», bis jemand das Brett an diesem Tag angeschaut hat. In der Routenübersicht führen
  «📜 Auftragsbrett» und «🏆 Trophäensaal» direkt hin, die Taste G auch (nicht während einer Expedition).
  «Zurück» führt dorthin, woher man kam.
- **Drei Zettel am Tag** (Ortszeit, ab Mitternacht neue; nicht erledigte fallen weg):
  - Zettel 1 für einen der drei höchsten Dungeons, die die Gilde spielen kann (auch einen, den sie noch
    nicht bezwungen hat).
  - Zettel 2 weiter unten auf der Karte (Platz 2 bis 8 der spielbaren Dungeons).
  - Zettel 3 aus der Stadt: meist (70 %) eine Ware aus den Werkstätten, sonst ein Dungeon weiter unten.
- **Arten.** Am selben Tag hängt jede Art möglichst nur einmal, jeder Dungeon und jede Gegnerart nur einmal.
  Texte mit Karawane oder Grabung hängen nie für Dungeons unter Wasser, in der Glut oder über den Wolken.

  | Art | verlangt | zählt |
  |---|---|---|
  | Sieg | den Dungeon bezwingen | gewonnen, mit besiegtem Boss (wie in der Rangliste) |
  | ohne Gefallene | bezwingen, ohne dass ein Held fällt | wie Sieg, und kein Held fiel, auch keiner, den «Wiedergeburt» wieder aufstehen liess |
  | Jagd | 4 bis 16 Gegner einer Art besiegen | jeder besiegte Gegner dieser Art, in jedem Dungeon, auch bei Rückzug |
  | Set | ein Teil aus dem Set des Dungeons erbeuten | gefundene Teile dieses Sets (auch das versprochene aus der Geschichte) |
  | Lieferung | 2 oder 3 Stück einer Ware abgeben | Knopf «Abgeben» am Brett, die Ware geht aus dem Lager |

  Waren am Brett: Heiltrank, Kraft-Brot, Eisenschwert, Eisenschild, Lederrüstung, nur solche, die die Stadt
  herstellen kann (die Werkstatt steht und ihre Zutaten kommen) oder die schon im Lager liegen.
- **Tagesbonus.** Sind alle drei Zettel erledigt, gibt es 3 Siegel dazu, einmal am Tag.
- **Tauschen.** Einmal am Tag hängt ein offener Zettel gegen einen anderen für denselben Platz.
- **Kette «Der Saal der Gilde».** Hinter dem Gildenhaus steht ein Saal mit einem leeren Sockel je Boss.
  Die Kette hat ein Kapitel je Boss-Dungeon, von unten nach oben wie auf der Karte; jedes bringt ein
  Prunkstück in den Saal. Es hängt immer nur das nächste Kapitel, sein Stand gilt nur für dieses Kapitel.
  Nach dem letzten liegt im Gildenhaus Ottokars Notiz zum Saal (mit dem «Schild in der Asche»). Hat die Gilde
  den Dungeon eines Kapitels noch nie bezwungen, steht ein Text da, der nichts aus dem Schluss seiner Geschichte
  vorwegnimmt (zum Beispiel den Namen des Ritters in der Krypta).
- **Siegel einlösen** am Brett: ein Set-Teil nach Wahl aus jedem bezwungenen Dungeon, Material für die
  Schmiede, Kristallsplitter.
- **Trophäensaal.** Ein Sockel je Boss mit dem Bild des Bosses; wer noch nicht bezwungen ist, steht als
  Schatten mit «???» da, das Messingschild ist schon lesbar. Jede Trophäe hat drei Sterne: Boss
  bezwungen, Set des Dungeons komplett, Prunkstück aus der Kette. Die Summe ist der «Glanz des Saals»
  (bei 14 Bossen 42 Sterne), der Rahmen wird mit den Sternen bronzen, silbern, golden. Darunter die Pokale
  der Rangliste, alle Sets der Dungeons (komplett grün) und das Gildenbuch (Expeditionen, Siege, Siege
  ohne Verlust, Gegner, Bosse, bezwungene Dungeons, erledigte Zettel, verdiente Siegel).
  Der Saal zeigt nur; Kampfwerte ändert er nicht.
- **Woanders zu sehen.** Routenübersicht: Zeile «📜 …» auf jeder Karte, in deren Dungeon ein Zettel oder
  das Kapitel zählt. Dungeon-Karte: Zeile «📜 Auftragsbrett: …» im Fenster des Dungeons. Ergebnis einer
  Expedition: Stand der Zettel, erledigte Zettel mit Belohnung, das Prunkstück, Tagesbonus, eine neue
  Trophäe.

## Zahlen

Alles in `src/data/auftragsbrett.ts`.

- **Siegel je Zettel:** Sieg, Jagd und Lieferung 2, ohne Gefallene und Set 3. Mit dem Tagesbonus bringt
  ein voller Tag etwa 10 Siegel.
- **Gold je Zettel:** 60 % des Golds, das ein ganzer Lauf im Dungeon ungefähr bringt (feste Gold-Beute
  aller Gegner und Funde, auf 5 gerundet). **Material:** die Menge eines Siegs dort (Schmiede).
- **Lieferung:** 15 Gold je Stück mal die Ebene des höchsten spielbaren Dungeons, kein Material.
- **Kapitel der Kette:** 3 + Ebene/2 (aufgerundet) Siegel, das Gold eines ganzen Laufs, das Material von
  zwei Siegen; das letzte Kapitel 15 Siegel dazu.
- **Einlösen:** Set-Teil 4 + 2 × Ebene/2 (aufgerundet) Siegel, also 6 (Ebene 1 und 2) bis 12 (Ebene 7
  und 8). Material 3 Siegel für die Menge eines Siegs im höchsten bezwungenen Dungeon seines Gebiets.
  Kristallsplitter 2 Siegel für 3 Stück.
- **Warum Material 3 Siegel kostet:** Mit 2 hätte ein voller Tag (10 Siegel) das Material von 5 Siegen gebracht,
  dazu das Material der Zettel selbst; wer am Tag 3 bis 5 Läufe macht, hätte in der Schmiede etwa dreimal so
  schnell aufgerüstet. Mit 3 sind es gut 3 Siege. Ausserdem ist ein Set-Teil zu kaufen und einzuschmelzen
  (zwei Siege Material) so nie billiger als Material direkt (der Test prüft das).

| Kapitel | Dungeon | Ebene | Ziel | Zettel: Gold | Kapitel: Siegel · Gold · Material | Set-Teil |
|---|---|---|---|---|---|---|
| 1 | Tiefwald (mittel) | 2 | 2× Sieg | 45 | 4 · 75 · 8 Waldharz | 6 |
| 2 | Tiefe Höhle | 2 | 1× ohne Gefallene | 55 | 4 · 95 · 8 Höhlenerz | 6 |
| 3 | Spinnenhöhle | 2 | 1 Set-Teil | 45 | 4 · 75 · 8 Höhlenerz | 6 |
| 4 | Abgrundtiefen | 3 | 2× Sieg | 140 | 5 · 235 · 10 Tiefseeperle | 8 |
| 5 | Giftsumpf | 3 | 1× ohne Gefallene | 85 | 5 · 145 · 10 Moorpilz | 8 |
| 6 | Alte Krypta | 3 | 2× Sieg | 110 | 5 · 180 · 10 Gruftsilber | 8 |
| 7 | Die Stadtmauern | 3 | 1 Set-Teil | 125 | 5 · 205 · 10 Festungseisen | 8 |
| 8 | Tiefe Ruinen | 4 | 1× ohne Gefallene | 130 | 5 · 220 · 12 Gruftsilber | 8 |
| 9 | Die Festung | 4 | 2× Sieg | 245 | 5 · 410 · 12 Festungseisen | 8 |
| 10 | Vulkankern | 4 | 1 Set-Teil | 180 | 5 · 305 · 12 Glutkern | 8 |
| 11 | Der Drachenhort | 5 | 2× Sieg | 305 | 6 · 505 · 14 Drachenschuppe | 10 |
| 12 | Das Himmelsarchiv | 6 | 1 Set-Teil | 370 | 6 · 615 · 16 Himmelstinte | 10 |
| 13 | Die Sternenschmiede | 7 | 2× Sieg | 435 | 7 · 725 · 18 Sternenstahl | 12 |
| 14 | Der Sternenschlund | 8 | 1× Sieg | 490 | 7 · 820 · 20 Sternenstahl | 12 |

«Zettel: Gold» ist das Gold eines Zettels für diesen Dungeon; dazu kommt immer das Material eines Siegs.

## Fester Zufall und Spielstand

- Die Zettel eines Tages würfelt der Spielstand fest aus (`state.rngSeed` und das Datum): Neu laden würfelt
  nichts neu, und zwei Spielstände mit demselben Samen sehen am selben Tag dasselbe Brett. Sie entstehen
  beim ersten Blick des Tages (Hauptmenü, Brett, Routenübersicht, Karte) aus den Dungeons und Waren, die die
  Gilde in dem Moment hat, und `main.ts` speichert sie gleich.
- Steht die Uhr vor dem gespeicherten Tag, bleiben die Zettel hängen. Eine Expedition zählt für die Zettel,
  die beim Aufbruch hingen: Läuft sie über Mitternacht, wechselt das Brett erst danach. Steht das Gildenhaus
  über Mitternacht offen, zeichnet ein Klick auf «Abgeben» oder «Tauschen» zuerst die neuen Zettel.
- `state.auftragsbrett` (Zettel, Siegel, Tausch, Tagesbonus, Kette, Zähler fürs Gildenbuch) und
  `state.trophaeen` (Siege je Boss-Dungeon) fehlen in älteren Spielständen; die Systeme legen sie beim
  ersten Aufruf an. Den Siegzähler übernimmt der Saal aus der Bestenliste und den bezwungenen Dungeons,
  bevor die laufende Expedition zählt; sie zählt so genau einmal.
- Regeln: `src/systems/Auftragsbrett.ts`, `src/systems/Trophaeensaal.ts`. Anzeige:
  `src/ui/screens/GildenhausScreen.ts`, `src/ui/html/gildenhaus.css`, Zeilen im Ergebnis
  `src/ui/components/AuftragsBilanzAnzeige.ts`.

## Erweitern

- **Neuer Dungeon mit Boss:** ein Eintrag in `SAAL_KAPITEL` mit Prunkstück, Messingschild und Text des
  Stadtschreibers. Die Reihenfolge der Kette kommt von der Karte, nicht aus der Liste. Ohne Eintrag hängt
  ein schlichtes Kapitel «Ein Andenken an …» (der Test verlangt den Eintrag). `art: 'set'` nur, wenn der
  Dungeon ein Set hat; Spielstände, die die Kette schon beendet haben, bekommen das neue Kapitel als nächstes.
- **Neuer Dungeon ohne Boss:** nichts zu tun; Zettel für ihn entstehen von selbst (Jagd, wenn eine
  Gegnerart mindestens zweimal pro Lauf kommt; Set, wenn er ein Set hat). Liegt er unter Wasser, in der Glut
  oder über den Wolken, gehört er in `FERNE_DUNGEONS`.
- **Neue Zettel-Vorlage:** in `AUFTRAGS_VORLAGEN` mit Auftraggeber aus `AUFTRAGGEBER`. Platzhalter:
  `{wo}` «im Vulkankern», `{wen}` «den Vulkankern», `{set}` Name des Sets. Was zu tun ist, steht darunter
  von selbst («Bezwingt den Vulkankern, ohne dass ein Held fällt»), der Text erzählt nur den Anlass. Passt
  der Text nicht überall (Karawane, Grabung), `nichtIn: FERNE_DUNGEONS`; jede Art braucht für jeden Dungeon
  mindestens eine passende Vorlage (der Test prüft das).
- **Kapiteltext und erster Sieg:** Erzählt `text` etwas aus dem Schluss der Geschichte des Dungeons (was die
  Gilde erst nach dem ersten Sieg weiss), braucht das Kapitel `vorSieg`, einen Text ohne dieses Wissen.
- **Neue Ware:** in `LIEFER_WAREN`; sie hängt nur am Brett, wenn eine Werkstatt sie herstellt
  (`nachschub` in `src/systems/GebaeudeStatus.ts`) oder sie im Lager liegt.
- **Texte:** Stimme des Stadtschreibers wie in `docs/GESCHICHTEN.md`: trocken, mit Einsatz, keine
  Zufalls-Witze, Schweizer «ss».

## Prüfen

`tests/auftragsbrett.test.ts`: Kapitel für jeden Boss in Kartenreihenfolge, Texte ganz ausgefüllt und
ohne «ß», Kapiteltexte vor dem ersten Sieg, 600 Spielstände mit gültigen und abwechslungsreichen Zetteln
(keine Karawane in die Tiefsee), Tageswechsel, zurückgestellte Uhr und eine Expedition über Mitternacht,
Tauschen, Fortschritt jeder Art (ohne Gefallene auch mit «Wiedergeburt»), Tagesbonus, Lieferung, die Kette bis
zum vollen Saal, Einlösen und Einschmelzen, Trophäen aus älteren Spielständen (ein echter Lauf durch
`finalizeExpeditionProgress`), Glanz und Gildenbuch.

## Entschieden

- Neue Zettel um Mitternacht Ortszeit, wie die Rangliste mit echten Wochen rechnet.
- Brett und Saal in einem Bildschirm «Gildenhaus» mit zwei Reitern; die Kachel ist aus einem vorhandenen
  Bild (`assets/buildings/bld_guild_hall.png`), Zettel, Siegel und Sockel sind aus CSS gezeichnet.
- Die Kette beginnt für jeden Spielstand unten im Tiefwald, auch für eine Gilde, die schon weit oben ist:
  Die unteren Kapitel sind für sie schnell erledigt, eine Ehrenrunde über die Karte.
- Der Saal ändert keine Kampfwerte.
- Eine Expedition zählt für die Zettel vom Aufbruch, nicht für die nach Mitternacht.
- «Ohne Gefallene» ist streng: «Wiedergeburt» hilft dabei nicht. Das Gildenbuch zählt dagegen wie der
  Erfolg «Perfektionist» die «Siege ohne Verlust» (alle Helden stehen am Ende).
