# Neue Dungeons über dem Vulkankern

Christoph (19.10.2026): «Endlos» heisst, dass es auf der Dungeon-Karte immer weiter nach oben geht,
mit immer neuen, verschiedenen Dungeons. Ab und zu kommen ein oder zwei dazu. Diese Datei hält fest,
was es schon gibt und wie der nächste Dungeon dazukommt.

## Was es gibt (Stand 22.10.2026)

| Ebene | Dungeon | Gebiet | Räume | Boss | Besonderheit | Erster Sieg bringt |
|---|---|---|---|---|---|---|
| 5 | Der Drachenhort | Drachengipfel | 15 | Ignarax, der Uralte | Hort-Gier: Gold aus dem Hort macht Ignarax stärker (+8 % Angriff und Leben je Schatz) | Schild des Uralten |
| 6 | Das Himmelsarchiv | Himmel | 16 | Der Oberarchivar | Verbotene Bücher: seltene Funde, kosten aber Leben | Klinge der tausend Schatten |
| 7 | Die Sternenschmiede | Sterne | 16 | Korrund, der Sternenschmied | Sternenfeuer: Wer die Waffen in die Essen hält, hat bis zum Ende +10 % Angriff (die ganze Gruppe), verliert aber 5 bis 10 % Leben | Korrunds Hammer |
| 8 | Der Sternenschlund | Sterne | 16 | Nyxar, der Sternenfresser | Gefangene Sterne: Jeder befreite Stern macht Nyxar 10 % schwächer (Angriff und Leben) und kostet 5 % Leben; wer ihn ausschlachtet, bekommt 3 bis 5 Sternenstahl, aber erst mit dem Sieg über Nyxar | Der letzte Stern |
| 9 | Der Mondhof | Mond | 16 | Argentis, der Mondvogt | Pfandzettel: Dreimal (Raum 2, 8, 14) kann die Gruppe einen Zettel unterschreiben; jeder kostet bis zum Ende 8 % Angriff und bringt erst mit dem Sieg über Argentis Mondsilber (5, dann 9) oder einen Set-Teil mehr. Wer am letzten Kontrollpunkt umkehrt, lässt alle Pfandzettel liegen | Amtsstab des Mondvogts |
| 10 | Das Morgentor | Mond | 16 | Sunna, die Tagwächterin | Die Sonnenuhr: Dreimal (Raum 2, 8, 14) kann die Gruppe sie vorstellen; jedes Mal kommt Sunnas Wut-Runde 2 Runden früher (ab Runde 10, dreimal gewählt ab Runde 4), und erst mit dem Sieg kommen Mondsilber (6, dann 10) oder ein Set-Teil mehr. Ihre Werte ändern sich nie, nur ihre Geduld; die Kampf-Vorschau zeigt «Wut ab Runde X». Wer am letzten Kontrollpunkt umkehrt, lässt die ganze Morgengabe liegen | Der Morgenstern |

- **Freischaltung:** Gildenrang V und der Boss des Dungeons darunter (Drachenhort: Magmawyrm,
  Himmelsarchiv: Ignarax, Sternenschmiede: der Oberarchivar, Sternenschlund: Korrund, Mondhof: Nyxar,
  Morgentor: Argentis). Ebenen über 5 verlangen den höchsten Rang, den es gibt (V).
- **Gegner:** je vier Gegner und ein Boss mit eigener Beute (`loot_<route>_*`). Eigene Bilder haben
  Glutwyrmling, Hortkobold und Drachenpriester, Funkenwichtel, Ambossgolem und Korrund, Lichtmotte,
  Leerenkriecher und Nyxar; die übrigen tragen Bilder anderer Gegner. Im Mondhof tragen alle fünf
  (Silberschreiber, Mondwache, Zollgeist, Mondkalb, Argentis) Bilder anderer Gegner, am Morgentor ebenso
  (Lichtküster, Torhüter aus Messing, Dämmerfalke, Morgenhahn, Sunna).
- **Routenbilder:** `exp_drachenhort`, `exp_himmelsarchiv`, `exp_sternenschmiede` und `exp_sternenschlund`
  (Karte, Routenliste, Kampf). Der Mondhof zeigt bis zu einem eigenen Bild `exp_sternenschlund`, das
  Morgentor `exp_sternenschmiede`.
- **Erster Sieg:** Der Boss gibt beim ersten Sieg der Gilde garantiert einen besonderen Gegenstand dazu.
  Drachenhort und Himmelsarchiv geben je ein T5-Stück; die drei T5-Stücke wurden dafür so verstärkt, dass
  sie je etwas besser sind als das beste T4-Stück für denselben Platz. Korrund gibt seinen Hammer (T7,
  zweihändig, Funkenflug: jeder Treffer springt mit 40 % auf einen zweiten Gegner über), Nyxar den letzten
  Stern (T8, Schmuck: wer ihn trägt, steht nach dem ersten tödlichen Treffer wieder auf), Argentis seinen
  Amtsstab (T9, einhändig, Letzte Bastion: der Träger zieht zu Beginn jedes Kampfes 2 Runden lang alle
  Angriffe auf sich; der Tooltip warnt davor), Sunna den Morgenstern (T10, zweihändig, Sternenfall: jeder
  dritte Treffer trifft als Stern alle Gegner mit halbem Schaden, wie das Schlund-Set, nur für den Kämpfer).
- **Gebiet «Sterne»** (Ebene 7 und 8): violetter Nebel und ein funkelndes Sternenfeld auf der Karte,
  Material für die Schmiede ist Sternenstahl (`docs/SCHMIEDE.md`).
- **Gebiet «Mond»** (Ebene 9 und 10): silbergrauer Dunst über dem Sternenfeld, Nebel und Sterne hören
  darunter auf. Material für die Schmiede ist Mondsilber (`MAT_MONDSILBER`, Bild aus Code).
- **Nicht dabei:** Wochen-Herausforderungen (nur bis Ebene 4).
- **Probespiel:** `?probe=neu` startet mit Gildenrang V und allen Bossen bis zum Vulkankern, der
  Drachenhort ist offen. `?probe=sterne` startet zwischen den Sternen: Team «Stark» (Stufe 15, mit
  seinen Wegen) in den Sets aus Ebene 4 und dem Hort-Set, alle Teile auf +3, alle Bosse bis zum
  Oberarchivar besiegt, die Sternenschmiede offen. Im Lager liegt alles, um die Sets und Korrunds
  Meisterstücke auf +5 zu schmieden. `?probe=mond` startet vor dem Mondhof: dasselbe Team in Korrunds
  Meisterstücken und dem Schlund-Set auf +5, alle Bosse bis Nyxar besiegt, im Lager Mondsilber für das
  Pfand des Mondvogts auf +5. `?probe=morgen` startet vor dem Morgentor: dazu Brom im Pfand des Mondvogts
  mit dem Amtsstab auf +5, alle Bosse bis Argentis besiegt, im Lager Mondsilber für Sunnas Morgengabe auf +5.
  In allen hat das Gildenhaus Stufe 2, es gehen also vier Helden mit,
  und die Klassen, die diese Bosse freischalten, sind schon frei (der erste Bericht meldet keine «Neue Klasse»).

## Einen Dungeon dazubauen

1. **Gegner** in `src/data/enemies.ts`: meist vier Gegner und ein Boss, dazu je ein Eintrag in
   `ENEMY_LORE` mit `route` = Routen-ID (sonst fehlt der Monsterbuch-Bonus der Route).
2. **Beute** in `src/data/lootTables.ts`: gewöhnlich, selten, Boss.
3. **Route** in `src/data/routes.ts`: `tier` = nächste Ebene, `gebiet`, `besonderheit` (ein Satz),
   `ersterSiegBeute`, `unlockCondition` mit dem Boss darunter. `rooms` = Anzahl `encounters`,
   der letzte Raum ist der Boss.
4. **Karte:** Knoten in `DUNGEON_GRAPH` mit negativem `y` (je etwa 500 höher als der darunter) und
   `leadsTo` vom Dungeon darunter. Die Karte wächst von selbst nach oben, das Feld «Noch unerforscht»
   und die Liste im Stadtweg-Fenster rücken mit. Ein neues Gebiet braucht
   einen Eintrag in `GEBIETE` (`src/ui/screens/DungeonMapScreen.ts`), in `getBiomeTag`
   (`src/ui/screens/ExpeditionsScreen.ts`) und eine Klasse `.tag-<gebiet>` in `src/ui/html/magic-city.css`.
5. **Set:** Jeder Dungeon lässt ein eigenes Set aus drei Teilen fallen. Anleitung in
   `docs/DUNGEON-SETS.md` («Ein Set für einen neuen Dungeon»); der Test verlangt für jede Route ein Set.
   Dazu braucht jeder Dungeon ein **Material für die Schmiede**: im bekannten Gebiet die Route beim
   passenden Material ergänzen, für ein neues Gebiet ein neues Material mit Bild aus Code
   (`docs/SCHMIEDE.md`, «Ein neuer Dungeon»); der Test verlangt für jede Route genau eins.
6. **Geschichte:** Jeder Dungeon erzählt eine kurze Geschichte des Stadtschreibers mit 2 bis 3 Entscheidungen
   (`src/data/dungeonGeschichten.ts`); feste Wahl-Räume erzählen mit (`raumWahlen`). Anleitung und
   Regeln in `docs/GESCHICHTEN.md`; der Test verlangt für jede Route eine Geschichte.
7. **Rangliste:** eine Zeile in `src/data/dungeonNamen.ts`, wie der Dungeon im Satz heisst («im Vulkankern»,
   «den Vulkankern»); der Test verlangt sie für jede Route. Rivalen, Ruhm und Wappen rechnen von selbst
   mit (`docs/RANGLISTE.md`). **Gildenhaus:** Ein Dungeon mit Boss braucht ein Kapitel der Kette
   «Der Saal der Gilde» in `SAAL_KAPITEL` (`src/data/auftragsbrett.ts`: Prunkstück, Messingschild, Text);
   der Test verlangt es. Zettel am Auftragsbrett entstehen von selbst (`docs/AUFTRAGSBRETT.md`).
8. **Bilder** nur mit Christophs Okay (Kosten-Regel): Gegner in `tools/spriteRegistry.ts`, das Routenbild
   in `tools/generateTileImages.ts` und `ROUTE_IMAGE_MAP`. Bis dahin passen vorhandene Bilder.
   Ein neues Gegnerbild (1024 px, Magenta-Hintergrund) als `public/assets/sprites/generated/KEY.png` ablegen
   und mit `npm run sprite-freistellen -- KEY` freistellen und verkleinern. Das entfernt auch Magenta, das
   ganz vom Motiv umschlossen ist (Feuerwirbel, zwischen den Beinen), und Schatten; `--boden 0.87` nimmt
   gezeichnete Bodenrisse unter den Füssen weg. `resize-sprites` und `remove-bg` lassen solche Stellen stehen.
   Routenbilder als PNG nach `public/assets/tiles/exp_<route>.png`.
9. **Eichung:** `npm run dungeon-eichung`, Ziele unten, Tabelle hier nachführen (die zweite Tabelle
   mit Sets gehört in `docs/DUNGEON-SETS.md`). Hat die Geschichte eigene Entscheidungen:
   `npm run geschichten-eichung -- 100 <route>` (Ziele in `docs/GESCHICHTEN.md`).
10. **Prüfen:** Liste in `tests/neueDungeons.test.ts` ergänzen, dann `npm test`, `npm run build`,
   `npm run validate-refs`.

### Bausteine für eigene Regeln

- **Feste Wahl** (`EncounterTemplate.wahl`): Fund- oder Rast-Raum mit vorgegebenen zwei Optionen
  statt der zufälligen.
- **Hort-Gier** (`RouteDef.hortGier`, `EncounterChoice.gier`): Jeder Punkt macht den Boss um feste
  Anteile seiner Startwerte stärker, sofort sichtbar in der Kampf-Vorschau.
- **Preis** (`EncounterChoice.kostetLeben`): Die Option kostet Prozent der Lebenspunkte, aber nie das letzte.
- **Angriff bis zum Ende** (`effect: 'angriff'`, `value` in Prozent): Die ganze Gruppe schlägt bis zum Ende
  des Dungeons härter zu, zweimal gewählt um 20 %. Boni aus Kämpfen, die bleiben (Drachengier, Tiefenrausch),
  wachsen nicht mit. Mit `kostetLeben` hat es einen Preis (Sternenschmiede).
- **Befreien** (`effect: 'kein'` mit negativem `gier`): Die Option wirkt nur über Preis und Gier; jeder Punkt
  unter null macht den Boss um die Anteile aus `hortGier` schwächer (Sternenschlund).
- **Beute erst mit dem Sieg** (`EncounterChoice.nachSieg` bei `effect: 'item'`): Die Beute wartet auf den
  Bosskampf und kommt nur, wenn der Boss fällt, wie «wenn ihr siegt» in den Geschichten. Wer vorher umkehrt
  oder fällt, lässt sie liegen; so lässt sie sich nicht mitnehmen und die Gefahr auslassen. Kontrollpunkte
  mit Rückzug kommen nach jedem Raum mit `index % 3 === 2`, also auch nach Raum 14, dem letzten vor dem Boss:
  Wer dort umkehrt, lässt alle Sterne oder Pfandzettel liegen.
- **Preis in Angriff** (`EncounterChoice.kostetAngriff`, Prozent): Die Option kostet die ganze Gruppe bis zum
  Ende des Dungeons Angriff, dreimal gewählt 30 %; das Gegenstück zu «Angriff bis zum Ende» über denselben
  Weg (`gruppenAngriffWaechst` mit negativem Wert), flache Boni aus Kämpfen bleiben. Das Logbuch meldet
  «schwächer», die Kampf-Vorschau zeigt es in den Werten der Helden (Mondhof).
- **Zusage eines Set-Teils** (`EncounterChoice.setTeil`): Die Option verspricht einen Set-Teil mehr, wenn der
  Boss fällt (`run.setTeilVersprochen`, bezahlt von `setBeute`); nur in einem Raum je Dungeon, sonst zählt die
  Zusage nur einmal. Mit `kostetAngriff` ist es ein Pfandzettel ohne Beute (Mondhof, Raum 8).
- **Frühere Wut** (`EncounterChoice.bossWutFrueher`, Runden): Die Option holt die Wut-Runde des Bosses
  (`EnemyDef.enrage.afterRound`) um so viele Runden näher, summiert in `run.bossWutFrueher`, nie vor Runde 1
  (`wutAbRunde` in `CombatEngine.ts`). Der Preis trifft nicht die Werte, sondern die Zeit: Wer den Boss schnell
  fällt, merkt ihn kaum, wer Kämpfe über 15 Runden gewinnt, zahlt voll. Das Logbuch meldet «Sunna wird ab
  Runde X wütend», die Kampf-Vorschau zeigt bei jedem Boss «Wut ab Runde X» (Morgentor: dreimal 2 Runden).
- **Erstsieg-Beute** (`RouteDef.ersterSiegBeute`).

## Eichung

`npm run dungeon-eichung` lässt die drei Musterteams (`src/data/musterteams.ts`) je 200 Mal durch
jeden Dungeon laufen (`src/systems/Musterlauf.ts`). Ihre Helden gehen Wege (Phalanx, Zorn, Scharfschützin,
Meuchlerin; `docs/SPEZIALISIERUNG.md`). An Rastplätzen rasten sie immer, bei den festen Wahl-Räumen spielen sie

- **vorsichtig:** immer die sichere Option (Heilung; im Sternenschlund die Sterne befreien),
- **klug:** das Risiko nur mit mindestens 85 % Leben,
- **gierig:** immer das Risiko (Hort-Gold, verbotene Bücher, Sternenfeuer, Sternenstahl).

Fähigkeiten vor dem Kampf nutzen sie nicht, echte Spieler gewinnen also etwas öfter. Zwischen den Sternen
tragen sie zusätzlich Sets mit Stufen aus der Schmiede (`MUSTER_SETS.sterne3` und `sterne5`; `abEbene` misst
diese Ausrüstung erst ab Ebene 7), im Mondlicht die Sets der Ebene darunter (`mond5`, `pfand5` und die Stufen
dazwischen). Die zweite Tabelle des Werkzeugs zählt seit dem Mond auch die Läufe, die am Rundenlimit des
Bosskampfs enden (20 Runden ohne Sieger: kein Sieg, keine Niederlage), und die Siege, bei denen der Boss seine
Wut-Runde nicht mehr erlebt. `npm run dungeon-eichung -- 1000 mondhof,morgentor stark` misst nur diese Dungeons
mit diesem Team.

Stand 21.10.2026, mit den neu geeichten Wegen (`docs/SPEZIALISIERUNG.md`), Manager #43 und #44
eingerechnet (20 % Mindestschaden, stärkere Startklassen), Siege von 200 Läufen:

| Dungeon | Team | vorsichtig | klug | gierig |
|---|---|---|---|---|
| Vulkankern | frisch, gut, stark | 100 % | 100 % | 100 % |
| Der Drachenhort | frisch | 0 % | 0 % | 0 % |
| Der Drachenhort | gut | 86 % | 53 % | 0 % |
| Der Drachenhort | stark | 100 % | 100 % | 99 % |
| Das Himmelsarchiv | frisch | 0 % | 0 % | 0 % |
| Das Himmelsarchiv | gut | 0 % | 0 % | 0 % |
| Das Himmelsarchiv | stark | 48 % | 30 % | 1 % |

Die ersten 200 Läufe schmeicheln dem Drachenhort: Mit 1000 Läufen sind es für «Gut» 81 / 49 / 1 % (vor der
Eichung der Wege 79 / 48 / 1 %), im Himmelsarchiv für «Stark» 47 / 31 / 1 % (vorher 48 / 32 / 0 %).

Die Sternen-Dungeons schafft in eigener Ausrüstung (T4) kein Musterteam, sie haben ihre eigene Tabelle unten.

**Ohne Wege** (dritte Tabelle des Werkzeugs): Drachenhort «Gut» 10 / 7 / 0 %, «Stark» 100 / 94 / 0 %,
Himmelsarchiv «Stark» 0 / 0 / 0 %. Seit den Wegen haben die Gegner beider Dungeons mehr Leben und Angriff
(Drachenhort etwa ×1,11, Himmelsarchiv etwa ×1,15), seit #43 und #44 noch einmal (×1,04 und ×1,05), seit der
Eichung der Wege wieder etwas weniger (Drachenhort ×0,976, Himmelsarchiv Angriff ×0,981 und Leben ×0,966).
Vorher, ohne Wege und mit den alten Gegnern: Drachenhort «Gut» 77 / 61 / 0 %, «Stark» 100 / 100 / 79 %,
Himmelsarchiv «Stark» 73 / 53 / 1 %.

**Ziele:** Der Drachenhort ist der nächste Schritt nach dem Vulkankern: «Gut» schafft ihn vorsichtig
meistens, Gier lohnt sich nur für starke Teams. Das Himmelsarchiv ist das ferne Ziel: erst mit Stufe 15,
T4-Ausrüstung und Wegen machbar, Lesen nur mit vollen Lebenspunkten.

**Nach Manager #43 und #44 neu geeicht (21.10.2026).** #43 bringt 20 % Mindestschaden, #44 stärkere
Startklassen (Wächter und Waldläufer, also auch Brom und Lia der Musterteams). Damit wurden beide Dungeons
leichter, wie die Vorab-Messung vom 20.10. sagte (200 Läufe: Drachenhort «Gut» 89 / 65 / 7 %, Himmelsarchiv
«Stark» 84 / 74 / 8 %). Die Gegner haben darum 4 % (Drachenhort) und 5 % (Himmelsarchiv) mehr Leben und
Angriff. Die Wege blieben dabei, wie sie waren.

**Nach der Eichung der Wege nachgezogen (21.10.2026).** Die Wege der Musterteams (Phalanx, Zorn,
Scharfschützin, Meuchlerin) sind jetzt alle auf ihrem Ziel; damit sind die Teams in den obersten Dungeons
1,4 bis 3,2 % schwächer als vorher (gemessen als Gegner-Faktor für 50 % Siege, alte gegen neue Wege). Die
Gegner haben darum weniger Leben und Angriff, bis die Siege mit 1000 Läufen wieder dieselben waren wie vorher
(Zahlen oben und unten). Folge für die Wege einer tieferen Stufe: Das Team «Gut» (Stufe 12) hatte vorher
viel stärkere Wege als das Ziel und verliert darum mehr, im Himmelsarchiv mit Sets aus Ebene 4 von 54 auf
32 % und mit dem Hort-Set von 72 auf 47 % (vorsichtig, 1000 Läufe; `docs/DUNGEON-SETS.md`). «Gut» kommt dort
also mit dem Hort-Set etwa jeden zweiten Lauf durch, wie es gedacht war, nicht mehr fast drei von vier.

### Zwischen den Sternen (Ebene 7 und 8)

**Ziele:** Die Schmiede ist der Schlüssel. Ohne Stufen schafft auch «Stark» die Sternenschmiede nie, mit allen
Set-Teilen auf +3 meistens; das ist der Eintritt. Der Sternenschlund ist das neue ferne Ziel: mit Korrunds
Meisterstücken (Grimm) und allen Teilen auf +4 klappt es ab und zu (vorsichtig etwa jeder sechste Lauf), auf +5
fast immer. Beim Sternenfeuer gewinnt, wer klug wählt (nur mit vollem Leben ins Feuer); im Sternenschlund lohnt
es sich beim ersten Mal, die Sterne zu befreien. Ihr Sternenstahl kommt erst mit dem Sieg, Gier lohnt sich also
erst für ein Team, das Nyxar sicher schlägt.

Team «Stark» mit Wegen, Brom Festung, Grimm Hort-Set (oder Korrunds Meisterstücke), Lia Abyss, Sina Schatten,
alle Teile auf derselben Stufe, Siege von 200 Läufen (vorsichtig / klug / gierig):

| Stufe der Teile | Sternenschmiede | Sternenschlund | Sternenschlund, Grimm in Korrunds Set |
|---|---|---|---|
| +0 | 1 / 2 / 0 % | 0 / 0 / 0 % | – |
| +1 | 2 / 19 / 0 % | – | – |
| +2 | 31 / 40 / 1 % | – | – |
| +3 | 83 / 82 / 10 % | 0 / 0 / 0 % | 1 / 0 / 0 % |
| +4 | 98 / 99 / 48 % | 4 / 1 / 0 % | 16 / 1 / 0 % |
| +5 | 100 / 100 / 100 % | 67 / 19 / 3 % | 92 / 58 / 3 % |

- **Team «Gut»** (Stufe 12): Sternenschmiede auf +3 1 / 1 / 0 %, mit Korrunds Set auf +5 98 / 99 / 78 %;
  Sternenschlund auch dann nur 4 / 1 / 0 %.
- **Ohne Wege** geht zwischen den Sternen fast nichts: Sternenschmiede auf +3 0 %, auf +5 42 %, Sternenschlund
  auf +5 0 % (klug, 100 Läufe; mit Wegen 81, 100 und 58 %).
- **Das Schlund-Set** macht den Schlund leicht: Trägt Lia es (die übrigen auf +5), sind es ohne Stufen schon
  100 / 96 / 56 %, auf +2 100 / 100 / 85 %. Wie das Hort-Set für den Drachenhort ist es der Lohn für den Sieg
  und der Schlüssel für die Dungeons, die einmal darüber kommen.
- **Nyxar** wird durch befreite Sterne bis zu 30 % schwächer (`hortGier` 0,1 je Stern, drei Sterne).
- **Nach der Gegenprüfung (21.10.2026):** Vorher hatte der Sternenschlund eine harte Kante an der
  Meisterset-Schwelle (Korrunds Set auf +4 3 / 0 / 0 %, auf +5 64 / 30 / 3 %), weil drei von vier Läufen auf
  +4 am Viererkampf direkt vor Nyxar scheiterten. Raum 14 hat darum drei Gegner statt vier (ohne
  Kometenkäfer), und Nyxar hat 5 % mehr Leben und Angriff (2176 und 47). Ausgeschlachteter Sternenstahl kam
  vorher sofort, und mit Rückzug am letzten Kontrollpunkt brachte er mehr als ein Sieg in der Sternenschmiede;
  jetzt kommt er erst mit dem Sieg (`nachSieg`).
- **Nach der Eichung der Wege (21.10.2026):** Die Gegner der Sternenschmiede haben 2,8 % weniger Leben und
  Angriff, die des Sternenschlunds 3,2 %. Die neuen Wege sind gegen Bosse stärker (die Meuchlerin trifft als
  Meisterin schon unter 60 % Leben 2,5-fach) und in langen Folgen von Kämpfen schwächer (kleinerer Schild der
  Phalanx). Gleichmässig angepasst wäre der Sternenschlund mit Korrunds Set auf +5 geblieben, wie er war, auf
  +4 aber von 13 auf 6 % gefallen (1000 Läufe): wieder die harte Kante. Darum haben die Wachen des Schlunds
  dazu 6 % weniger Leben und Nyxar 9 % mehr (jetzt 2318 Leben, 45 Angriff). Mit 1000 Läufen: auf +4 16 / 2 / 0 %
  (vorher 13 / 1 / 0 %), auf +5 91 / 62 / 4 % (vorher 86 / 66 / 10 %). Gier gegen Nyxar kostet damit
  etwas mehr als vorher; in der Sternenschmiede auch, weil die Risiken dort Leben kosten (gierig auf +4 48
  statt 68 %), vorsichtig und klug sind dort gleich geblieben.

### Im Mondlicht (Ebene 9 und 10)

**Ziele (Entwurf, 22.10.2026):** Team «Stark» in Korrunds Meisterstücken und dem Schlund-Set auf +5
(`MUSTER_SETS.mond5`) soll den Mondhof vorsichtig in 60 bis 70 % der Läufe schaffen, klug in 35 bis 50 %, mit
allen drei Pfandzetteln höchstens in 10 %; ohne Schlund-Set (Lia Abyss +5, `sterne5`) höchstens 20 %, so bleibt
das Schlund-Set der Schlüssel; mit dem Schlund-Set erst auf +2 etwa 40 / 20 / 0 %. Lohn: Brom im Pfand des
Mondvogts ohne Stufen mindestens 90 % vorsichtig, auf +2 100 / 100 / etwa 40 %. Das Morgentor soll dasselbe Team
mit dem Pfand des Mondvogts auf +5 (`pfand5`) vorsichtig in 60 bis 70 % schaffen, klug in 35 bis 50 %, gierig
(Sunna wütet ab Runde 4) höchstens in 5 %; Pfand-Set erst auf +3 (der Eintritt) 15 bis 25 % vorsichtig; ohne
Pfand-Set (`mond5`) höchstens 15 % vorsichtig und 0 % gierig. Lohn: Sina in Sunnas Morgengabe ohne Stufen
mindestens 90 % vorsichtig und, als Burst-Build, mindestens 40 % gierig, deutlich mehr als jedes andere Team.
Für beide: unter 5 % der Läufe am Rundenlimit des Bosskampfs; die Siege vor der Wut-Runde werden gezählt.
Bei Zielkonflikten gilt die Reihenfolge des Entwurfs: das Schlüssel-Set bleibt der Schlüssel, dann die
Siegquoten, zuletzt der Reiz der Gier.

**Geeicht am 22.10.2026**, Team «Stark» mit Wegen, 1000 Läufe je Zeile (`npm run dungeon-eichung -- 1000
mondhof,morgentor stark`; Zeilen mit 300 Läufen sind gekennzeichnet), Siege vorsichtig / klug / gierig:

| Mondhof, Ausrüstung | Ziel | gemessen | am Rundenlimit | Siege vor der Wut |
|---|---|---|---|---|
| `sterne5`: Lia Abyss +5, ohne Schlund-Set | höchstens 20 % vorsichtig | 0 / 0 / 0 % | 0 % | – |
| `schlund2`: Lias Schlund-Set erst auf +2 | etwa 40 / 20 / 0 % | 1 / 0 / 0 % | 0 % | 0 von 14 |
| Lias Schlund-Set auf +3 (300 Läufe) | – | 4 / 0 / 0 % | 0 % | 0 von 12 |
| Lias Schlund-Set auf +4 (300 Läufe) | – | 34 / 3 / 0 % | 0 % | 6 von 101 |
| `mond5`: alles auf +5 | 60–70 / 35–50 / höchstens 10 % | 74 / 28 / 2 % | 0 / 0 / 0 % | 295 von 741 / 20 von 279 / 0 von 19 |
| Brom im Pfand-Set ohne Stufen, übrige +5 (300 Läufe) | mindestens 90 % vorsichtig | 100 / 100 / 100 % | 0 % | 300 von 300 / 275 von 300 / 168 von 300 |
| `pfand2`: Broms Pfand-Set auf +2, übrige +5 | 100 / 100 / etwa 40 % | 100 / 100 / 100 % | 0 % | 1000 von 1000 / 903 von 1000 / 547 von 1000 |

| Morgentor, Ausrüstung | Ziel | gemessen | am Rundenlimit | Siege vor der Wut |
|---|---|---|---|---|
| `mond5`: ohne Pfand-Set | höchstens 15 % vorsichtig, 0 % gierig | 0 / 0 / 0 % | 0 % | – |
| `pfand2`: Broms Pfand-Set auf +2, übrige +5 | – | 61 / 31 / 0 % | 0 % | 315 von 605 / 0 von 310 / – |
| `pfand3`: Broms Pfand-Set auf +3, übrige +5 | 15–25 % vorsichtig | 62 / 38 / 0 % | 0 % | 314 von 623 / 0 von 380 / – |
| `pfand5`: alles auf +5 | 60–70 / 35–50 / höchstens 5 % | 69 / 50 / 1 % | 1 / 0 / 0 % | 315 von 694 / 0 von 500 / 0 von 13 |
| `morgen0`: Sina in Sunnas Morgengabe ohne Stufen, übrige +5 | mindestens 90 % vorsichtig, mindestens 40 % gierig | 100 / 100 / 98 % | 0 % | 998 von 1000 / 86 von 999 / 0 von 981 |

Was die Zahlen vorher waren (Startwerte des Entwurfs, 100 Läufe): Mondhof `mond5` 3 / 0 / 0 %, `sterne5` 0 %,
jeder Lauf kam bis zu Argentis und fiel dort; Morgentor `mond5` 0 %, `pfand5` 87 / 68 / 10 % mit 13 / 32 / 76 %
der Läufe am Rundenlimit, `pfand3` 94 / 71 / 5 %, Sina in der Morgengabe 100 / 100 / 100 %.

**Was geändert wurde und warum:**

- **Argentis** hat 44 statt 52 Angriff und 2500 statt 2665 Leben. Die Wachen des Mondhofs blieben, wie sie
  waren (das Team kommt mit etwa der Hälfte seiner Leben bei Argentis an, Niederlagen vor ihm gibt es keine);
  sie zuerst zu schwächen, wie der Entwurf es vorsah, hilft vor allem der Ausrüstung ohne Schlund-Set (Lia
  Abyss +5 kommt dann mit mehr Leben an) und macht das Schlund-Set weniger zum Schlüssel, ohne den Bosskampf zu
  lösen. Der Bosskampf ist ein Wettlauf gegen die Wut-Runde: Wer Argentis nicht bis etwa Runde 12 bis 13 fällt,
  stirbt, darum zählt jedes Prozent Angriff doppelt. Weniger Angriff (statt weniger Leben) macht die Kante
  flacher, weil das Team seine Wut ein paar Runden überlebt; mit weniger Leben allein (2300) blieb es bei
  34 / 0 / 0 %.
- **Pfandzettel kosten 8 statt 10 % Angriff** (`kostetAngriff`, Entscheid 9: «notfalls 8»). Mit 10 % wären es
  76 / 23 / 0 % (300 Läufe): Die klugen Läufe unterschreiben im Mittel 1,3 Zettel, und jeder Zettel kostet an
  dieser Kante etwa 20 Punkte Siege. Mit 8 % liegt klug bei 28 %, gierig (drei Zettel, −24 %) bei 2 %.
- **Das Morgentor:** Die Wachen haben 15 % weniger Leben (Lichtküster 285, Torhüter 599, Dämmerfalke 395,
  Morgenhahn 268; der Angriff blieb), Sunna hat 77 statt 59 Angriff und 2600 statt 3060 Leben, ihr Morgentau
  bleibt bei 260. Der Grund für den Angriff: Mit 59 konnte Sunna Brom im Pfand des Mondvogts nicht töten
  (Verteidigung 79 auf +5, dazu Mondwall und Reflexion, also nur der Mindestschaden von 20 %), und Brom allein
  konnte sie nicht töten (44 je Treffer gegen 260 Morgentau alle 6 Runden). Sobald Lia, Sina und Grimm nach der
  Wut fielen, stand der Kampf, bis das Rundenlimit kam: 76 % aller gierigen Läufe mit `pfand5`. Der Morgentau
  war nicht die Stellschraube: Mit 200 statt 260 blieben es 75 %, auch seltener (alle 8 Runden) 76 %. Mit
  Angriff 77 fällt Brom allein nach einigen Runden, das Rundenlimit ist aus den Zahlen verschwunden (1 %), und
  Sunnas Leben sind dafür gesenkt, bis `pfand5` vorsichtig im Ziel lag. Mit Morgentau 200 wären es 74 / 52 / 2 %
  statt 69 / 50 / 1 %; weil das keinen Unterschied macht, der den Eingriff rechtfertigt, blieb die Zahl des
  Entwurfs.
- **Nicht geändert:** die Set-Werte (Mondwall 15, Sonnenstich 0,6 / 0,05 / 60), `bossWutFrueher` (2 je Raum),
  die Wut-Runden (Argentis und Sunna ab Runde 10) und die Mahnung.

**Was nicht erreicht wurde, und warum:**

- **Mondhof klug 28 % statt 35 bis 50 %, vorsichtig 74 statt 60 bis 70 %.** Beide zusammen gehen mit diesem
  Boss nicht: Zwischen 0 und −13 % Angriff fällt die Siegquote um gut 45 Punkte, weil der Kampf ein Wettlauf
  gegen die Wut ist. Argentis stärker (vorsichtig 68 %) brächte klug auf etwa 22 %, Argentis schwächer
  (vorsichtig 85 %) klug auf 35 %. Gemessen wurde auch: Mahnung weg, Wut erst ab Runde 12, Wut nur ×1,3,
  Wachen stärker oder schwächer, Argentis mit sehr wenig Angriff und sehr viel Leben (36 / 2900: 98 / 65 / 8 %,
  aber 4 % am Rundenlimit). Nichts davon macht die Kante flach genug, ohne ein anderes Ziel zu reissen. Die
  Mitte (74 / 28) weicht von beiden Zielen am wenigsten ab.
- **Lias Schlund-Set auf +2: 1 % statt etwa 40 %.** Aus demselben Grund: Drei Stufen auf Lias drei Teilen
  sind etwa 10 % des Schadens der Gruppe, und das ist an dieser Kante der Unterschied zwischen 74 und 1 %
  (+3: 4 %, +4: 34 %). Das Schlund-Set ist damit noch mehr der Schlüssel, als der Entwurf wollte: Es muss auf +5.
- **Lohn im Mondhof gierig 100 % statt etwa 40 %.** Brom im Pfand des Mondvogts ist für Argentis unverwundbar
  (Mindestschaden gegen Verteidigung 79, dazu Mondwall für alle), und Argentis heilt sich nicht; das Team
  gewinnt auch mit drei Zetteln, nur später (gierig 547 von 1000 Siegen vor der Wut, vorsichtig alle). Gier
  lohnt sich im Mondhof also genau für das Team, das ihn mit dem Pfand-Set schon sicher hat, wie beim
  Sternenstahl im Schlund. Ein Argentis, der dieses Team bedroht, wäre für `mond5` unschaffbar; die Siegquoten
  gehen dem Gier-Reiz vor. Wie stark das Set ist, zeigt die volle Tabelle (`npm run dungeon-eichung -- 200
  mondhof,morgentor`): Sogar «Frisch» (Stufe 10) schafft den Mondhof mit Brom im Pfand-Set auf +2 in
  100 / 100 / 93 % der Läufe, und «Gut» (Stufe 12) das Morgentor mit Sina in der Morgengabe in 100 / 92 / 41 %,
  während «Gut» mit `mond5` im Mondhof bei 1 % und mit `pfand5` am Morgentor bei 2 % bleibt. Die beiden
  Lohn-Sets sind damit die stärksten Sprünge des Spiels; ob sie so stark bleiben sollen, ist eine Frage für die
  Gegenprüfung, nicht für die Eichung der Gegner.
- **Morgentor, Pfand-Set auf +3: 62 % statt 15 bis 25 %.** Zwei Stufen auf Broms drei Teilen ändern an Sunnas
  Treffern fast nichts (Mindestschaden); der Unterschied zu +5 ist das Meisterset (doppelter Zwei-Teile-Bonus)
  und 10 % Werte, zusammen 7 Punkte vorsichtig, 12 Punkte klug. Ein Eintritt bei 15 bis 25 % bräuchte eine
  Sunna, die gegen Brom auf +3 trifft und gegen Brom auf +5 nicht, das gibt die Schadensformel nicht her. Der
  Schlüssel ist das Pfand-Set selbst (ohne: 0 %), nicht seine Stufe; schon auf +2 sind es 61 %.
- **Morgentor gierig mit der Morgengabe 98 %, nicht «mindestens 40 %»:** erreicht, aber die Sonnenuhr kostet
  diesen Build gar nichts mehr (vorsichtig 100 %, gierig 98 %, Siege zwischen Runde 4 und 10). Der Beweis, dass
  die Sonnenuhr vom Build abhängt, steht: `pfand5` gierig 1 %, `morgen0` gierig 98 %.

**Geschichten-Eichung:** `npm run geschichten-eichung -- 100 mondhof` und `-- 100 morgentor` haben nichts zu
messen, weil beide Geschichten keine eigenen Entscheidungen haben (`wahlen: []`); sie erzählen über die festen
Wahl-Räume der Route (Pfandzettel, Sonnenuhr), und die misst die Dungeon-Eichung als Spielweise. Was die Wahl
kostet, steht oben: jeder Pfandzettel etwa 20 Punkte Siege, jedes Vorstellen der Sonnenuhr für `pfand5` etwa
20 bis 50 Punkte (vorsichtig 69, klug mit im Mittel zwei Stunden 50, gierig 1 %), für den Burst-Build nichts.

## Entschieden

- **Endlose Treppe** (20.10.2026, Christoph: «Ganz weg»): entfernt. Die Karte wächst nur mit neuen Dungeons;
  über dem obersten zeigt sie ein leeres Feld «Noch unerforscht».
- **Bilder** (20.10.2026, Christophs Okay für höchstens 8): drei Drachenhort-Gegner und zwei Routenbilder,
  5 Bilder für etwa 0.30 USD, alle beim ersten Versuch brauchbar und eingebaut.
- **Bilder Sterne** (20.10.2026, Christophs Okay für etwa 4 je Dungeon): Funkenwichtel, Ambossgolem, Korrund,
  Lichtmotte, Leerenkriecher, Nyxar und zwei Routenbilder, 8 Bilder für etwa 0.50 USD, alle beim ersten
  Versuch brauchbar und eingebaut (Befund: `/mnt/project-files/magic-city/bilder-sterne/BEFUND.md`).
- **Zwei Dungeons zwischen den Sternen** (20.10.2026, Christoph: Punkt 3 «gleich auch noch anhängen»):
  Sternenschmiede und Sternenschlund mit Gegnern, Bossen, Sets und Geschichte.
- **Der Mondhof** (22.10.2026, Entscheid der Richter zum Entwurf «Loot-Builds»): Ebene 9 im neuen Gebiet
  «Mond» mit Pfandzetteln (Preis in Angriff), Mondsilber, dem Set «Pfand des Mondvogts» (Mondwall: Schild
  für alle, der sich mit anderen Schilden addiert) und der Geschichte «Der Pfandzettel». Der Set-Teil aus
  Raum 8 läuft über `EncounterChoice.setTeil`, nicht über `effect: 'geschichte'`. Bilder: keine, alle fünf
  Gegner und das Routenbild sind Platzhalter, bis Christoph sie freigibt. Weggelassen: Mondschein,
  Himmelslast, ein zweites Material, Wecken Gefallener.
- **Das Morgentor** (22.10.2026, derselbe Entscheid): Ebene 10 im Gebiet «Mond» mit der Sonnenuhr (Preis in
  Geduld: Sunnas Wut-Runde kommt je Wahl 2 Runden früher, neuer Baustein `bossWutFrueher`, Vorschau «Wut ab
  Runde X»), dem Set «Sunnas Morgengabe» (Sonnenstich: Treffer auf Gegner über 60 % Leben brennen 5 % ihrer
  vollen Leben dazu, höchstens 60), dem Morgenstern (Sternenfall auf einem Zweihänder) und der Geschichte
  «Die Morgengabe». Der Saal der Gilde hat damit sechzehn Sockel, das Morgentor ist der letzte. Bilder: keine,
  alle fünf Gegner und das Routenbild sind Platzhalter. Eigene Probestufe `?probe=morgen`, damit `?probe=mond`
  weiter vor dem Mondhof beginnt.

## Später

Aus den Entwürfen für den Mond bleiben zwei Ideen als Kandidaten für Ebene 11 und 12 liegen, ohne dass die
Vorgeschichte dazu schon feststeht: **«Erste Stadt / Alruna»**, eine Stadt der Vorigen ohne Rastplatz, in der
Wachfeuer Gefallene wecken und am Ende Alruna wartet, die den Saal der Gilde gebaut hat; und **«Wut-Runde als
Preis / Pfeiler»**, ein Dungeon, in dem der Boss nicht stärker, sondern ungeduldiger wird (jeder herausgebrochene
Pfeiler bringt Material, wenn ihr siegt, und zieht seine Wut-Runde um zwei Runden vor; den Baustein dafür gibt
es seit dem Morgentor, `bossWutFrueher`, der Pfeiler-Dungeon müsste ihn also anders einsetzen als die Sonnenuhr).
