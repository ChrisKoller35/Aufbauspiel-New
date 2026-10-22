# Dungeon-Sets

Christoph (20.10.2026): «Jeder Dungeon lässt eigene Ausrüstung fallen, die Helden sichtbar stärker macht.»
Jeder Dungeon hat darum ein eigenes Set aus drei Teilen. Diese Datei hält fest, wie die Sets wirken,
wie stark sie sind und wie ein neuer Dungeon sein Set bekommt.

## So wirkt es im Spiel

- **Beute.** Nach jedem Sieg kann ein Teil des Dungeon-Sets in der Truhe liegen. Das erste Teil
  eines Sets ist sicher, danach 50 % (Normal), 65 % (Schwer), 80 % (Albtraum) und 100 % (Infernal).
  Teile, die der Gilde fehlen, kommen zuerst. Sind alle drei da, kann jedes fallen, für einen zweiten Helden.
  Eine mutige Entscheidung der Dungeon-Geschichte kann ein Teil mehr versprechen («+1 Set-Teil, wenn ihr
  siegt»): Es kommt zum gewöhnlichen Wurf dazu, beim ersten Sieg sind es also zwei verschiedene
  (`docs/GESCHICHTEN.md`). Das Versprechen gilt nur, wenn der Boss besiegt ist; endet sein Kampf nach
  dem Rundenlimit, bleibt es beim gewöhnlichen Wurf (`dungeonBezwungen`).
- **Zwei Teile** geben Werte (z. B. +5 Angriff und +15 Leben), **drei Teile** die Set-Fähigkeit.
  Sie löst im Kampf sichtbar aus: grünes ✦-Banner und eine grüne Zeile im Kampfprotokoll.
  Zwei gleiche Teile zählen als eines.
- **Eigenschaften.** Ab Ebene 3 trägt jedes Teil eine Eigenschaft wie die übrigen Gegenstände
  dieser Ebenen (Doppelschlag, Reflexion …). Gleiche Eigenschaften zählen nicht doppelt, es gilt die stärkste.
- **Schmiede.** Mit Material aus den Dungeons werden die Teile bis +5 besser, jede Stufe um 10 %.
  Alle drei Teile auf +5 sind ein Meisterset: Der Zwei-Teile-Bonus zählt doppelt (`docs/SCHMIEDE.md`).
- **Sichtbar** auf der Heldenseite (Platz oder Gegenstand antippen: Werte, Eigenschaft, Vergleich mit
  dem getragenen Teil, Set-Boni; Anlegen und Ablegen per Knopf), im Tab «Sets» (Sammlung je Dungeon),
  als Abzeichen im Inventar, auf den Routenkarten («🐺 Rudel des Waldpfads · 0 von 3»), bei der
  Team-Auswahl («Set-Beute … 50 % pro Sieg»), im Fenster der Dungeon-Karte und in der Truhe.

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/dungeonSets.ts` | Die Sets (`DUNGEON_SETS`), Werte je Bauart und Ebene (`ART_WERTE`), Eigenschaften (`ART_EIGENSCHAFT`) |
| `src/systems/DungeonSets.ts` | Getragene Sets, Set-Boni, Beute nach dem Sieg (`setBeute`) |
| `src/systems/Kampfeffekte.ts` | Wirkung der Set-Fähigkeiten und Eigenschaften im Kampf |
| `src/data/specialEffects.ts` | Namen und Beschreibungen aller Effekte (`SPECIAL_EFFECT_DEFS`) |
| `src/ui/components/SetAnzeige.ts` | Set-Abzeichen und Set-Zeilen für alle Ansichten |
| `src/ui/screens/HeroesScreen.ts` | Heldenseite: Auswahl, Vergleich, Tab «Sets» |
| `tests/dungeonSets.test.ts` | Regeln der Sets, Beute, Kampfeffekte, Stärke im Musterlauf |
| `src/systems/Schmiede.ts` | Stufen +1 bis +5 der Teile (`docs/SCHMIEDE.md`) |

## Wie stark ein Teil ist

- **Werte:** so gut wie die besten gewöhnlichen Gegenstände derselben Ebene und Bauart (`ART_WERTE`,
  Ebene 4 etwa wie Seelenbrecher, Drachenfürstplatte und Aetherkristall-Herz). Ein Set-Teil ist
  damit nie ein Rückschritt. Den Unterschied machen die Set-Boni.
- **Eigenschaft ab Ebene 3:** je Bauart eine feste (`ART_EIGENSCHAFT`: Klinge Doppelschlag, Schild
  Reflexion, Platte Feuerresistenz …). Ein Teil weicht davon ab (`eigenschaft` im Teil), wenn sein Set
  die Eigenschaft schon hat. Regeln, die der Test prüft:
  - jede Eigenschaft höchstens einmal im Set,
  - keine Eigenschaft, die die Drei-Teile-Fähigkeit schon gibt,
  - nur Eigenschaften aus `SPECIAL_EFFECT_DEFS`: `lifesteal`, `dodge`, `reflect`, `revive`,
    `double_strike`, `anti_heal`, `regen`, `aoe_resist`, `spell_power`, `fire_resist`, `stun_strike`.
- **Set-Boni:** Zwei Teile geben je Ebene etwas mehr (Ebene 1: +1 Angriff, +5 Leben; Ebene 5: +5 Angriff,
  +15 Leben; Ebene 6: +6 Angriff, +20 Leben; Ebene 7: +7 Angriff, +24 Leben; Ebene 8: +8 Angriff, +8 %
  Krit-Chance; Ebene 9: +9 Verteidigung, +30 Leben; Ebene 10: +10 Angriff, +10 % Krit-Chance). Die
  Drei-Teile-Fähigkeit ist das Besondere des Sets und passt zum Dungeon (Drachenhort: Drachengier, Gold macht
  stark; Sternenschmiede: Schmiedetakt, alle 3 Runden +3 Angriff fürs ganze Team; Sternenschlund: Sternenfall,
  jeder dritte Treffer trifft als Stern alle Gegner mit dem halben Schaden; Mondhof: Mondwall, zu Beginn jedes
  Kampfes und alle 3 Runden ein Schild von 15 für jeden im Team, der sich mit anderen Schilden wie der Phalanx
  addiert; Morgentor: Sonnenstich, jeder Treffer auf einen Gegner über 60 % Leben brennt zusätzlich 5 % seiner
  vollen Leben weg, höchstens 60, also genau bis dorthin, wo die Meuchlerin 2,5-fach trifft).

## Ein Set für einen neuen Dungeon

1. **Eintrag** am Ende von `DUNGEON_SETS` in `src/data/dungeonSets.ts` (Reihenfolge der Dungeon-Karte):
   `id`, `routeId`, `name`, `zeichen` (ein Emoji), `tier` = Ebene der Route.
2. **Drei Teile** mit verschiedenen Plätzen, damit ein Held alle drei tragen kann: eine Waffe oder ein
   Schild, eine Rüstung und ein Schmuckstück. `bild` ist ein vorhandener Sprite-Key, `text` ein Satz
   mit Witz, der zum Dungeon passt. Die Gegenstände (`set_<set>_<bauart>`) entstehen von selbst.
3. **Ebene über 10:** `ART_WERTE` und `WERT_JE_EBENE` um eine Spalte verlängern (Typ `Reihe`) und
   `HOECHSTE_EBENE` erhöhen, sonst bekommt das Set die Werte von Ebene 10. Die neuen Werte an den besten
   gewöhnlichen Gegenständen der Ebene ausrichten; gibt es auf der Ebene keine, die Reihe im selben Schritt
   fortsetzen (so sind Ebene 7 bis 10 entstanden).
4. **Set-Boni:** `zweiTeile` etwas über der Ebene darunter. `dreiTeile` mit Name, Text und Effekten.
   Eine neue Fähigkeit braucht ihre Wirkung in `src/systems/Kampfeffekte.ts`, Name und Beschreibung in
   `SPECIAL_EFFECT_DEFS` und, falls ihre Kampfzeile eine eigene Farbe haben soll, `getLogLineColor` in
   `src/rendering/Colors.ts`. Ein Test für die Fähigkeit gehört in `tests/dungeonSets.test.ts`.
5. **Unterwasser:** `luftJeTeil` gibt Luft je getragenem Teil.
6. **Prüfen:** `npm test` (jede Route hat ein Set, Eigenschaften einmalig …), `npm run build`,
   `npm run validate-refs`, dann `npm run dungeon-eichung -- 200` und die Tabelle unten nachführen.
   Für einen Dungeon über dem Hort die Sets der Musterhelden (`MUSTER_SETS` in `src/data/musterteams.ts`)
   um eine Stufe mit dem neuen Set ergänzen, ab den Sternen mit Stufen aus der Schmiede (`schmiede`) und
   der Ebene, ab der die Eichung sie misst (`abEbene`). Stand: `mond5` (ab Ebene 9: dazu Lia im Schlund-Set,
   alles auf +5), `pfand5` (ab Ebene 10: dazu Brom im Pfand des Mondvogts mit dem Amtsstab, alles auf +5) und
   die Stufen dazwischen (`schlund2`, `pfand2`, `pfand3`, `morgen0`; einzelne Teile auf einer anderen Stufe
   über `MusterSet.stufen`), damit die Tabelle zeigt, was das neue Set einer Ebene ausmacht, bevor es ganz
   hochgeschmiedet ist.
7. **Eigene Bilder** für Set-Teile nur mit Christophs Okay (Kosten-Regel). Bis dahin tragen sie Bilder
   vorhandener Gegenstände mit dem Set-Zeichen darauf.

## Stärke (Eichung)

`npm run dungeon-eichung -- 200` misst die Musterteams zuerst in ihrer Ausrüstung
(Tabelle in `docs/NEUE-DUNGEONS.md`), dann in vollen Sets (`MUSTER_SETS`):

- **Sets aus Ebene 4:** Brom Festung (behält den Seelenbrecher), Grimm Magma-Wyrm, Lia Abyss, Sina Schatten.
- **Hort:** dasselbe, Grimm trägt das Set aus dem Drachenhort.
- **Sterne +3** (nur zwischen den Sternen gemessen): die Hort-Sets, alle Teile in der Schmiede auf +3.
- **Sterne +5:** dazu Grimm in Korrunds Meisterstücken, alle Teile auf +5.
- **Mond +5** (`mond5`, ab Ebene 9): dazu Lia im Set aus dem Sternenschlund, alle Teile auf +5; `schlund2`:
  dasselbe, Lias Schlund-Set erst auf +2.
- **Pfand** (`pfand2`, `pfand3` ab Ebene 9 und 10, `pfand5` ab Ebene 10): dazu Brom im Pfand des Mondvogts
  mit dem Amtsstab, das Pfand-Set auf +2, +3 oder +5, die übrigen auf +5.
- **Morgengabe** (`morgen0`, ab Ebene 10): dazu Sina in Sunnas Morgengabe ohne Stufen, die übrigen auf +5.

Stand 21.10.2026, mit den neu geeichten Wegen (`docs/SPEZIALISIERUNG.md`), Manager #43 und #44
eingerechnet, Siege von 200 Läufen (vorsichtig / klug / gierig):

| Dungeon | Team | eigene Ausrüstung | Sets aus Ebene 4 | dazu Grimm im Hort-Set |
|---|---|---|---|---|
| Der Drachenhort | frisch | 0 / 0 / 0 % | 75 / 44 / 0 % | 93 / 79 / 4 % |
| Der Drachenhort | gut | 86 / 53 / 0 % | 100 / 100 / 99 % | 100 / 100 / 100 % |
| Der Drachenhort | stark | 100 / 100 / 99 % | 100 / 100 / 100 % | 100 / 100 / 100 % |
| Das Himmelsarchiv | frisch | 0 / 0 / 0 % | 0 / 0 / 0 % | 0 / 0 / 0 % |
| Das Himmelsarchiv | gut | 0 / 0 / 0 % | 32 / 19 / 0 % | 48 / 33 / 0 % |
| Das Himmelsarchiv | stark | 48 / 30 / 1 % | 100 / 99 / 54 % | 100 / 100 / 78 % |

Zwischen den Sternen (Team «Frisch» schafft dort nichts):

| Dungeon | Team | Hort-Set, ohne Stufen | Sterne +3 | Sterne +5 |
|---|---|---|---|---|
| Die Sternenschmiede | gut | 0 / 0 / 0 % | 1 / 1 / 0 % | 98 / 99 / 78 % |
| Die Sternenschmiede | stark | 1 / 2 / 0 % | 83 / 82 / 10 % | 100 / 100 / 100 % |
| Der Sternenschlund | gut | 0 / 0 / 0 % | 0 / 0 / 0 % | 4 / 1 / 0 % |
| Der Sternenschlund | stark | 0 / 0 / 0 % | 0 / 0 / 0 % | 92 / 57 / 3 % |

Im Mondlicht (Stand 22.10.2026, Team «Stark», 1000 Läufe; Zeilen mit 300 Läufen sind gekennzeichnet). «Frisch»
und «Gut» schaffen dort mit den Sets der Ebene darunter nichts («Gut» mit `mond5` im Mondhof 1 %, mit `pfand5`
am Morgentor 2 %), mit dem Lohn-Set aber viel: «Frisch» (Stufe 10) mit Brom im Pfand-Set auf +2 den Mondhof
100 / 100 / 93 %, «Gut» mit Sina in der Morgengabe das Morgentor 100 / 92 / 41 % (200 Läufe). Die Sets des
Mondes sind also stärker als die Stufen der Helden:

| Dungeon | Sterne +5 (ohne Set der Ebene darunter) | Schlund-Set auf +2 | Mond +5 | Pfand-Set +2 / +3 / +5 | Morgengabe ohne Stufen |
|---|---|---|---|---|---|
| Der Mondhof | 0 / 0 / 0 % | 1 / 0 / 0 % | 74 / 28 / 2 % | ohne Stufen 100 / 100 / 100 % (300 Läufe), +2 100 / 100 / 100 % | – |
| Das Morgentor | 0 / 0 / 0 % | 0 / 0 / 0 % | 0 / 0 / 0 % | 61 / 31 / 0 %, 62 / 38 / 0 %, 69 / 50 / 1 % | 100 / 100 / 98 % |

Dazu die Läufe am Rundenlimit des Bosskampfs und die Siege vor der Wut-Runde: `docs/NEUE-DUNGEONS.md`,
«Im Mondlicht».

Vor der Eichung der Wege (21.10.2026) hatte das Team «Gut» im Himmelsarchiv mit Sets aus Ebene 4 54 / 37 / 0 %
und mit dem Hort-Set 72 / 51 / 0 % (1000 Läufe; jetzt 32 / 18 / 0 % und 47 / 30 / 0 %). Seine Wege auf Stufe 12
waren deutlich stärker als ihr Ziel; die Gegner sind auf die Teams in eigener Ausrüstung nachgezogen
(`docs/NEUE-DUNGEONS.md`, «Eichung»), nicht auf diese Mischung.

**So ist es gedacht:** Die Sets einer Ebene machen den nächsten Dungeon machbar. Mit Sets aus Ebene 4
wagt sich schon ein frisches Team in den Drachenhort, und mit dem Hort-Set rückt das Himmelsarchiv
für ein gutes Team in Reichweite (vorsichtig etwa jeder zweite Lauf). Ohne Sets bleibt es das ferne Ziel.
Sets aus einer tieferen Ebene sind für ein Team mit besserer Ausrüstung ein Rückschritt; das zeigt
der Vergleich auf der Heldenseite. Wege und Sets verstärken sich gegenseitig, darum sind die Gegner der
Dungeons über dem Vulkankern seit den Wegen stärker (`docs/SPEZIALISIERUNG.md`, «Eichung»).
Zwischen den Sternen reichen Sets allein nicht mehr: Erst die Schmiede macht die Sternenschmiede machbar
(+3), für den Sternenschlund braucht es +4 bis +5 und Korrunds Meisterstücke (Stufe für Stufe in
`docs/NEUE-DUNGEONS.md`, «Zwischen den Sternen»). Im Mondlicht ist das Set der Ebene darunter der Schlüssel,
und zwar auf +5: Ohne das Schlund-Set schafft «Stark» den Mondhof nie, mit dem Schlund-Set auf +2 fast nie
(1 %), auf +4 jeden dritten Lauf, auf +5 drei von vier; ohne das Pfand-Set schafft es das Morgentor nie, mit
dem Pfand-Set schon auf +2 in 61 % der Läufe (auf +5 69 %), weil dort das Set selbst zählt (Mondwall, Brom als
Träger der Letzten Bastion), nicht seine Stufe.

**Korrunds Meisterstücke** sind ein Set für einen Kämpfer (Klinge, Platte, Talisman). Als Schild-Set für
Brom war die erste Fassung deutlich schwächer als die Festung mit der Letzten Bastion; mit dem Schmiedetakt
hilft das Set jetzt dem ganzen Team, und Grimm in Korrunds Set auf +5 ist stärker als im Hort-Set auf +5.
**Was Nyxar nicht frass** (Bogen, Leder, Ring) macht den Sternenschlund leicht, wer es hat (Lia ohne
Stufen: 100 / 96 / 56 %); es ist der Lohn für Nyxar und der Schlüssel für den Mondhof.
**Pfand des Mondvogts** (Zollscheibe, Amtsharnisch, Pfandzettel in Silber; Ebene 9) ist ein Schild-Set für
Brom: Mondwall gibt dem ganzen Team zu Kampfbeginn und alle 3 Runden einen Schild von 15, zusammen mit dem
Amtsstab des Mondvogts (Letzte Bastion) also einen Träger, der alles auf sich zieht und das Team dabei schützt.
Gegen Argentis ist Brom damit unverwundbar (Mindestschaden gegen Verteidigung 79 auf +5), darum schafft das
Team mit dem Pfand-Set den Mondhof in jeder Spielweise (100 %), auch mit drei Pfandzetteln; am Morgentor war
genau das der Grund für den Patt am Rundenlimit, bis Sunna genug Angriff bekam, um Brom allein zu fällen
(`docs/NEUE-DUNGEONS.md`, «Im Mondlicht»).
**Sunnas Morgengabe** (Erster Strahl, Dämmerwams, Messing-Sonnenuhr; Ebene 10) ist das Dolch-Set für Sina:
Sonnenstich brennt Gegner über 60 % Leben herunter, genau bis dorthin, wo die Meuchlerin 2,5-fach trifft; oben
Sonnenstich, unten Meucheln, derselbe Dolch. Es ist das Set gegen dicke einzelne Gegner, also gegen Bosse, und
der Burst-Build, der am Morgentor die Sonnenuhr vorstellen darf (Eichung: 98 % gierig, Sunna wütet ab Runde 4;
Brom im Pfand-Set ohne die Morgengabe 1 %).
Der Morgenstern (Erstsieg-Beute) trägt den Sternenfall des Schlund-Sets auf einen Zweihänder, wie Korrunds Hammer
den Funkenflug: zwei Sets, drei Waffen, eine Hand zu wenig.
Mondhof und Morgentor sind seit dem 22.10.2026 geeicht (`docs/NEUE-DUNGEONS.md`, «Im Mondlicht», mit Zielen,
Messwerten und dem, was nicht erreicht wurde); die Tabelle «Im Mondlicht» oben ist der Stand danach.

**Letzte Bastion** (Set der Festung) zieht seit dem 20.10. genau 2 Runden lang alle Angriffe auf sich, wie ihr
Text sagt, auch in Belagerungen. Spott zählt seither ganze Runden (für die Bärengestalt der Druiden). Vorher
endete er nach dem zweiten eigenen Zug des Trägers und hielt in Belagerungen den ganzen Kampf. Die Tabelle oben
ist schon mit der neuen Regel gemessen; in den übrigen Dungeons ändern sich die Siege mit Sets kaum
(Festung «frisch» mit Sets aus Ebene 4: 1 von 40 Läufen vorher, 0 von 40 jetzt).

**Nach Manager #43 und #44 neu gemessen** (21.10.2026): Mindestschaden und stärkere Startklassen machten die
obersten Dungeons leichter, ihre Gegner sind darum etwas stärker (`docs/NEUE-DUNGEONS.md`, «Eichung»).
Die Tabelle oben ist der Stand danach.

## Offen

- **Eigenschaften ohne Wirkung:** Sechs gewöhnliche Gegenstände tragen Eigenschaften, die es in
  `SPECIAL_EFFECT_DEFS` nicht gibt und die darum nichts tun und nirgends angezeigt werden:
  `magic_resist` (T3-Platte), `piercing` (T4-Waffe), `evasion` (T4-Leder), `spell_amplify` (T4-Robe),
  `slow_on_hit` und `air_decay_resist` (Abyss-Gegenstände in `src/data/items.ts`).
- **Eigene Set-Bilder:** 81 Teile (27 Sets), etwa 0.06 USD je Bild, nur mit Christophs Okay.
