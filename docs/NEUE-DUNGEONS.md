# Neue Dungeons über dem Vulkankern

Christoph (19.10.2026): «Endlos» heisst, dass es auf der Dungeon-Karte immer weiter nach oben geht,
mit immer neuen, verschiedenen Dungeons. Ab und zu kommen ein oder zwei dazu. Diese Datei hält fest,
was es schon gibt und wie der nächste Dungeon dazukommt.

## Was es gibt (Stand 20.10.2026)

| Ebene | Dungeon | Gebiet | Räume | Boss | Besonderheit | Erster Sieg bringt |
|---|---|---|---|---|---|---|
| 5 | Der Drachenhort | Drachengipfel | 15 | Ignarax, der Uralte | Hort-Gier: Gold aus dem Hort macht Ignarax stärker (+8 % Angriff und Leben je Schatz) | Schild des Uralten |
| 6 | Das Himmelsarchiv | Himmel | 16 | Der Oberarchivar | Verbotene Bücher: seltene Funde, kosten aber Leben | Klinge der tausend Schatten |

- **Freischaltung:** Gildenrang V und der Boss des Dungeons darunter (Drachenhort: Magmawyrm,
  Himmelsarchiv: Ignarax). Ebenen über 5 verlangen den höchsten Rang, den es gibt (V).
- **Gegner:** je vier Gegner und ein Boss mit eigener Beute (`loot_drachenhort_*`, `loot_himmelsarchiv_*`).
  Glutwyrmling, Hortkobold und Drachenpriester tragen vorerst Bilder anderer Gegner.
- **Erster Sieg:** Der Boss gibt beim ersten Sieg der Gilde garantiert einen T5-Gegenstand dazu.
  Die drei T5-Stücke wurden dafür so verstärkt, dass sie je etwas besser sind als das beste T4-Stück
  für denselben Platz.
- **Nicht dabei:** Wochen-Herausforderungen (nur bis Ebene 4).
- **Probespiel:** `?probe=neu` startet mit Gildenrang V und allen Bossen bis zum Vulkankern, der
  Drachenhort ist offen.

## Einen Dungeon dazubauen

1. **Gegner** in `src/data/enemies.ts`: meist vier Gegner und ein Boss, dazu je ein Eintrag in
   `ENEMY_LORE` mit `route` = Routen-ID (sonst fehlt der Monsterbuch-Bonus der Route).
2. **Beute** in `src/data/lootTables.ts`: gewöhnlich, selten, Boss.
3. **Route** in `src/data/routes.ts`: `tier` = nächste Ebene, `gebiet`, `besonderheit` (ein Satz),
   `ersterSiegBeute`, `unlockCondition` mit dem Boss darunter. `rooms` = Anzahl `encounters`,
   der letzte Raum ist der Boss.
4. **Karte:** Knoten in `DUNGEON_GRAPH` mit negativem `y` (je etwa 500 höher als der darunter) und
   `leadsTo` vom Dungeon darunter. Die Karte wächst von selbst nach oben. Ein neues Gebiet braucht
   einen Eintrag in `GEBIETE` (`src/ui/screens/DungeonMapScreen.ts`), in `getBiomeTag`
   (`src/ui/screens/ExpeditionsScreen.ts`) und eine Klasse `.tag-<gebiet>` in `src/ui/html/magic-city.css`.
5. **Bilder** nur mit Christophs Okay (Kosten-Regel): Gegner in `tools/spriteRegistry.ts`, das Routenbild
   in `tools/generateTileImages.ts` und `ROUTE_IMAGE_MAP`. Bis dahin passen vorhandene Bilder.
6. **Eichung:** `npm run dungeon-eichung`, Ziele unten, Tabelle hier nachführen.
7. **Prüfen:** Liste in `tests/neueDungeons.test.ts` ergänzen, dann `npm test`, `npm run build`,
   `npm run validate-refs`.

### Bausteine für eigene Regeln

- **Feste Wahl** (`EncounterTemplate.wahl`): Fund- oder Rast-Raum mit vorgegebenen zwei Optionen
  statt der zufälligen.
- **Hort-Gier** (`RouteDef.hortGier`, `EncounterChoice.gier`): Jeder Punkt macht den Boss um feste
  Anteile seiner Startwerte stärker, sofort sichtbar in der Kampf-Vorschau.
- **Preis** (`EncounterChoice.kostetLeben`): Die Option kostet Prozent der Lebenspunkte, aber nie das letzte.
- **Erstsieg-Beute** (`RouteDef.ersterSiegBeute`).

## Eichung

`npm run dungeon-eichung` lässt die drei Musterteams (`src/data/musterteams.ts`) je 200 Mal durch
jeden Dungeon laufen (`src/systems/Musterlauf.ts`). An Rastplätzen rasten sie immer, bei den festen
Wahl-Räumen spielen sie

- **vorsichtig:** immer die sichere Option (Heilung),
- **klug:** das Risiko nur mit mindestens 85 % Leben,
- **gierig:** immer das Risiko (Hort-Gold, verbotene Bücher).

Fähigkeiten vor dem Kampf nutzen sie nicht, echte Spieler gewinnen also etwas öfter.

Stand 20.10.2026 (Schaden ohne Mindestschaden), Siege von 200 Läufen:

| Dungeon | Team | vorsichtig | klug | gierig |
|---|---|---|---|---|
| Vulkankern | frisch, gut, stark | 100 % | 100 % | 100 % |
| Der Drachenhort | frisch | 0 % | 0 % | 0 % |
| Der Drachenhort | gut | 77 % | 61 % | 0 % |
| Der Drachenhort | stark | 100 % | 100 % | 79 % |
| Das Himmelsarchiv | frisch | 0 % | 0 % | 0 % |
| Das Himmelsarchiv | gut | 0 % | 0 % | 0 % |
| Das Himmelsarchiv | stark | 73 % | 53 % | 1 % |

**Ziele:** Der Drachenhort ist der nächste Schritt nach dem Vulkankern: «Gut» schafft ihn vorsichtig
meistens, Gier lohnt sich nur für starke Teams. Das Himmelsarchiv ist das ferne Ziel: erst mit Stufe 15
und T4-Ausrüstung machbar, Lesen nur mit vollen Lebenspunkten.

**Nach Manager #43 neu eichen.** Der Bot-Auftrag bringt 20 % Mindestschaden. Damit gemessen (60 Läufe):
Drachenhort «Gut» vorsichtig 33 %, Himmelsarchiv «Stark» vorsichtig 2 %. Die groben Erwartungen in
`tests/neueDungeons.test.ts` halten beides aus, die Werte hier nicht.

## Offen

- **Bilder** (warten auf Christophs Okay): drei Drachenhort-Gegner und zwei Routenbilder, 5 Bilder,
  etwa 0.30 USD.
- **Endlose Treppe:** steht vorerst weiter ganz oben auf der Karte; Christoph entscheidet, ob sie wegfällt,
  als Extra bleibt oder etwas anderes wird.
