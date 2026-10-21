# Neue Dungeons über dem Vulkankern

Christoph (19.10.2026): «Endlos» heisst, dass es auf der Dungeon-Karte immer weiter nach oben geht,
mit immer neuen, verschiedenen Dungeons. Ab und zu kommen ein oder zwei dazu. Diese Datei hält fest,
was es schon gibt und wie der nächste Dungeon dazukommt.

## Was es gibt (Stand 21.10.2026)

| Ebene | Dungeon | Gebiet | Räume | Boss | Besonderheit | Erster Sieg bringt |
|---|---|---|---|---|---|---|
| 5 | Der Drachenhort | Drachengipfel | 15 | Ignarax, der Uralte | Hort-Gier: Gold aus dem Hort macht Ignarax stärker (+8 % Angriff und Leben je Schatz) | Schild des Uralten |
| 6 | Das Himmelsarchiv | Himmel | 16 | Der Oberarchivar | Verbotene Bücher: seltene Funde, kosten aber Leben | Klinge der tausend Schatten |
| 7 | Die Sternenschmiede | Sterne | 16 | Korrund, der Sternenschmied | Sternenfeuer: Wer die Waffen in die Essen hält, hat bis zum Ende +10 % Angriff (die ganze Gruppe), verliert aber 5 bis 10 % Leben | Korrunds Hammer |
| 8 | Der Sternenschlund | Sterne | 16 | Nyxar, der Sternenfresser | Gefangene Sterne: Jeder befreite Stern macht Nyxar 10 % schwächer (Angriff und Leben) und kostet 5 % Leben; wer ihn ausschlachtet, bekommt 3 bis 5 Sternenstahl, aber erst mit dem Sieg über Nyxar | Der letzte Stern |

- **Freischaltung:** Gildenrang V und der Boss des Dungeons darunter (Drachenhort: Magmawyrm,
  Himmelsarchiv: Ignarax, Sternenschmiede: der Oberarchivar, Sternenschlund: Korrund). Ebenen über 5
  verlangen den höchsten Rang, den es gibt (V).
- **Gegner:** je vier Gegner und ein Boss mit eigener Beute (`loot_<route>_*`). Eigene Bilder haben
  Glutwyrmling, Hortkobold und Drachenpriester, Funkenwichtel, Ambossgolem und Korrund, Lichtmotte,
  Leerenkriecher und Nyxar; die übrigen tragen Bilder anderer Gegner.
- **Routenbilder:** `exp_drachenhort`, `exp_himmelsarchiv`, `exp_sternenschmiede` und `exp_sternenschlund`
  (Karte, Routenliste, Kampf).
- **Erster Sieg:** Der Boss gibt beim ersten Sieg der Gilde garantiert einen besonderen Gegenstand dazu.
  Drachenhort und Himmelsarchiv geben je ein T5-Stück; die drei T5-Stücke wurden dafür so verstärkt, dass
  sie je etwas besser sind als das beste T4-Stück für denselben Platz. Korrund gibt seinen Hammer (T7,
  zweihändig, Funkenflug: jeder Treffer springt mit 40 % auf einen zweiten Gegner über), Nyxar den letzten
  Stern (T8, Schmuck: wer ihn trägt, steht nach dem ersten tödlichen Treffer wieder auf).
- **Gebiet «Sterne»** (Ebene 7 und 8): violetter Nebel und ein funkelndes Sternenfeld auf der Karte,
  Material für die Schmiede ist Sternenstahl (`docs/SCHMIEDE.md`).
- **Nicht dabei:** Wochen-Herausforderungen (nur bis Ebene 4).
- **Probespiel:** `?probe=neu` startet mit Gildenrang V und allen Bossen bis zum Vulkankern, der
  Drachenhort ist offen. `?probe=sterne` startet zwischen den Sternen: Team «Stark» (Stufe 15, mit
  seinen Wegen) in den Sets aus Ebene 4 und dem Hort-Set, alle Teile auf +3, alle Bosse bis zum
  Oberarchivar besiegt, die Sternenschmiede offen. Im Lager liegt alles, um die Sets und Korrunds
  Meisterstücke auf +5 zu schmieden. In beiden hat das Gildenhaus Stufe 2, es gehen also vier Helden mit,
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
   mit (`docs/RANGLISTE.md`).
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
  oder fällt, lässt sie liegen; so lässt sie sich nicht mitnehmen und die Gefahr auslassen (Sternenschlund:
  nach dem letzten Stern kommt noch ein Kontrollpunkt mit Rückzug).
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
diese Ausrüstung erst ab Ebene 7).

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
