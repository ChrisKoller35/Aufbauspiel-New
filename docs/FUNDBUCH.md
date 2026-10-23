# Fundbuch

Das Fundbuch beantwortet zwei Fragen: **Woher bekomme ich einen Gegenstand, und wofür brauche ich ihn?**
Es öffnet sich im Hauptmenü über «📜 Fundbuch» (in der Leiste unter dem Titel neben «💾 Spielstand», am schmalen
Handy nur «📜»).

- Rechnung: `src/systems/Fundbuch.ts` (reine Funktionen, liest nur die Datendateien)
- Fenster: `src/ui/components/FundbuchFenster.ts`, Stile `src/ui/html/fundbuch.css`
- Tests: `tests/fundbuch.test.ts`

Das Fundbuch ändert den Spielstand nicht und speichert nichts. Alle Namen, Preise und Mengen kommen aus den
Datendateien (`ROUTE_DEFS`, `ENEMY_DEFS`, `LOOT_TABLE_DEFS`, `HAENDLER_WAREN`,
`MERCHANT_PRICES`, `RECIPE_DEFS`, `BUILDING_DEFS`, `STADTSTUFEN`, `HERZSTEINE`, `DUNGEON_SETS`,
`SCHMIEDE_MATERIALIEN`) und aus den Rechnungen der Schmiede (`Schmiede.ts`); nichts ist abgeschrieben.

## Was es zählt: ein Wurf je Sieg

Die Regel ist die von `CombatEngine.rollLoot`: **Jeder besiegte Gegner mit Beutetabelle gibt Gold und einen Wurf
aus seiner Tabelle, meist einen Gegenstand.** Gezogen wird gewichtet, die Menge gleich verteilt von `minQty` bis
`maxQty`. Hat die Tabelle einen Eintrag `gold`, bringt der Wurf manchmal stattdessen mehr Gold
(`loot_swamp_common`: 26 von 115 Gewichtsteilen, rund 23 % der Siege). So steht es auch im Fenster unter den Zahlen.

- **Chance je Sieg über einen Gegner** = Gewicht des Gegenstands / Summe aller Gewichte der Tabelle.
  Der Eintrag `gold` zählt in der Summe mit (rollLoot zieht ihn wie jeden anderen Eintrag), Gold selbst ist aber
  kein Eintrag im Fundbuch. `goldFaktor` betrifft nur Gold.
- **Ø je Sieg in einem Dungeon** = Summe über alle Gegner der Route von Chance × mittlere Menge
  ((min + max) / 2). «Alle Gegner» heisst jeder Eintrag in `encounters[].enemies` jedes Raums, auch in
  Befestigungs-Räumen; der Boss steht schon in seinem Boss-Raum und zählt nicht doppelt. Die Dungeons stehen
  nach diesem Wert sortiert, der grösste zuerst.
- Gegner, die in keiner Route stehen (z. B. `thorn_sprite`, `boss_bandit_chief`), erscheinen nicht.
- Der Modifikator ist im Spiel immer `null` (`ExpeditionFlow.ts`): «Elitegarde» und die Nemesis-Beute zählen nicht.

Die Zeile im Fenster hat die bestellte Form «‹Gegner› · P % je Sieg über ihn · Ø X je Sieg in ‹Dungeon›», dazu
die Anzahl im Dungeon und die Menge, z. B. «Armbrustschütze (5×) · 45 % je Sieg über ihn, 2–5 Stück · Ø 24,7 je
Sieg in Die Festung». Die Zeilen eines Dungeons stehen beisammen, ohne Strich dazwischen: Ø gilt für den ganzen
Dungeon und steht darum in jeder seiner Zeilen gleich.

Weitere Quellen:

| Quelle | Anzeige | Woher die Zahl kommt |
|---|---|---|
| Händler der Stadt | «Beim Händler der Stadt · N Gold» | `kaufpreis(id, 1)`, Stadtstufe 1 ohne Rabatt |
| Dungeon-Händler | «Beim Dungeon-Händler · N Gold (höchstens 2 Käufe)» | `MERCHANT_PRICES`, `MERCHANT_MAX_PURCHASES` |
| Fund-Raum ohne feste Wahl | «Versteck durchsuchen: N Stück, angeboten in etwa 33 % der Besuche» | erstes `findItems`; die Option kommt in einem von drei Fällen (`EncounterProcessor`, `nextInt(0, 2)`), nachgezählt im Test mit 30 000 Besuchen |
| Fund-Raum mit fester Wahl | «zur Wahl: N Stück» bzw. «…, wenn der Boss fällt» | `wahl.a` / `wahl.b` mit `effect: 'item'`, `nachSieg` |
| Erstsieg-Beute der Gipfel-Dungeons | «‹Boss› (Boss) in ‹Dungeon› · 1 Stück beim ersten Sieg» | `RouteDef.ersterSiegBeute` |
| Werkstatt | «‹Gebäude› · ‹Rezept› · N je Durchgang» | `RECIPE_DEFS[…].outputs` |
| Schmiede-Material jedes Dungeons | «Jeder Sieg in ‹Dungeon› · N Stück» | `materialJeSieg` auf Normal, so viel legt `schmiedeBeute` nach einem Sieg in die Truhe; ohne Sieg die Hälfte (`ANTEIL_OHNE_SIEG`) im Verhältnis der geschafften Räume, das sagt der Satz unter den Zahlen |
| Einschmelzen in der Schmiede | «Einschmelzen: doppeltes Set-Teil aus ‹Dungeon› · N Stück» | `einschmelzenErtrag` (2 × Grundmenge der Set-Ebene) |
| Rastplatz ohne feste Wahl | «Rastplatz in jedem Dungeon · Kräuter sammeln: 2 Stück, angeboten in etwa 33 % der Besuche» (nur Grüne Kräuter) | `RAST_KRAEUTER`: `zufallsWahlRast` bietet die Option in einem von drei Fällen an (`nextInt(0, 2)`), nachgezählt im Test mit 30 000 Besuchen; zurzeit 29 Rastplätze, einer je Dungeon |

**Wofür:** Rezepte (Gebäude, Menge je Durchgang), Baukosten (`buildCost`), Ausbau-Kosten
(`ausbauKosten` aus `Ausbau.ts`, Stufe 2 und 3), Abgaben für die Stadtstufen (`abgabe`), Herzsteine,
die Schmiede, Proviant (`PROVISION_ITEMS`) und der Ankauf beim Händler
(«Der Händler zahlt N Gold je Stück», `ankaufpreis`). Die Schmiede rechnet wie `schmiedeKosten`: Das Material
eines Dungeons verbessert die Set-Teile aus diesem Dungeon, je Stufe Grundmenge der Set-Ebene ×
`MATERIAL_JE_STUFE` («Schmiede: Set-Teile aus Die Sternenschmiede verbessern · 18 / 27 / 45 / 72 / 108 Stück für
+1 bis +5»); Kristallsplitter braucht jedes Set-Teil ab +3 (`SPLITTER_JE_STUFE`, «3 / 6 / 12 Stück für +3 bis +5»).
Das Gold der Schmiede steht dort, Gold ist kein Eintrag.

**Einträge:** jeder Gegenstand aus `ITEM_DEFS`, der als Beute eines Gegners in einer Route, als Schmiede-Material
einer Route, als Erstsieg-Beute, als Fund oder als Händlerware vorkommt: zurzeit 71 (23 Materialien, darunter alle
12 Schmiede-Materialien, 4 Tränke und Proviant, 43 Ausrüstung, 1 Sonstiges). Gruppen nach `ItemDef.type` und Tags;
Kristallsplitter und Talisman-Fragmente (Typ `special`) stehen bei den Materialien, weil Rezepte, Bau, Stadtstufen
oder die Schmiede sie verbrauchen.

Ein Klick auf einen Dungeon zeigt sein Schmiede-Material («Waldharz · 3 Stück je Sieg») und die Beute seiner
Gegner (Ø je Sieg je Gegenstand), ein Klick auf einen Gegenstand seinen Eintrag; Gebäude stehen als Text da.
Dungeons, die die Gilde noch nicht betreten darf (`isRouteAvailable`), stehen mit «🔒» und ihrem Namen da, damit
man ein Ziel hat.

**Bedienung:** Am PC schliessen Escape, ✕ und ein Klick neben das Fenster; Tab bleibt im Fenster, auch vom
Suchfeld aus. Nach einem Sprung über einen Link steht der Fokus auf «← zurück», nach «← zurück» wieder auf dem
Link, über den man gegangen war. F5 speichert wie überall im Spiel, auch im Suchfeld (`main.ts`). Der zweite Klick
eines Doppelklicks auf «📜 Fundbuch» geht ins Leere (`schluckeZweitenKlick`). Am Handy steht die Liste über dem
Eintrag, das Fenster scrollt als Ganzes, ✕ bleibt dabei oben rechts stehen, und jeder Link ist mindestens
44 × 44 px gross.

## Ohne Baupläne (23.10.2026)

Bis 22.10.2026 hatte das Fundbuch eine Gruppe «Baupläne» (4 Einträge, Quelle Händler und/oder Boss beim ersten
Sieg), «Wofür» nannte das Gebäude, das ein Bauplan freischaltet, ein Gebäude-Link sprang zu seinem Bauplan, und
im Reiter «Aufbau» führte «📜 Wo?» auf der Karte eines gesperrten Gebäudes dorthin. Seit dem Umbau auf Wunsch
Christophs (Werkstätten direkt freischalten, nur der Gildenrang sperrt, docs/GILDENSTADT.md) ist das weg; was
eine Werkstatt kostet, steht unter «Wofür» bei «Bau». Die Tests «Ohne Baupläne» prüfen, dass kein `bauplan_*`
mehr als Eintrag oder Gruppe auftaucht und der Reiter «Aufbau» keinen «Wo?»-Knopf mehr hat.

## Gegenprobe (tests/fundbuch.test.ts)

- **Chance:** je Beutetabelle 10 000 Ziehungen mit dem echten `rollLoot` und `SeededRNG`; jede Chance
  weicht höchstens 2 Prozentpunkte vom Fundbuch ab.
- **Ziehungen je Lauf (exakt):** echte Läufe über `musterStand`/`spieleRoute`, `rollLoot` mit `vi.spyOn`
  durchgereicht. In jedem gewonnenen Lauf, in dem alle Gegner tot sind, würfelt rollLoot je Tabelle genau so
  oft, wie das Fundbuch Gegner zählt:
  - Waldpfad (kurz), Ebene 1, Team «frisch»: 6 Ziehungen (5 × `loot_forest_common`, 1 × `loot_forest_rare`)
  - Giftsumpf, Ebene 3, Team «gut»: 15 (10 × `loot_swamp_common`, 3 × `loot_swamp_rare`, 1 × `loot_forest_common`, 1 × `loot_boss_hydra`)
  - Vulkankern, Ebene 4, Team «stark»: 21 (14 × `loot_volcano_common`, 6 × `loot_volcano_rare`, 1 × `loot_boss_wyrm`)
- **200 Siege je Dungeon (statistisch):** gezählt wird nur die Kampfbeute (Zuwachs von `run.loot` je
  rollLoot-Aufruf, ohne Funde, Geschichten, Set-Teile, Händler). Für jeden Gegenstand gilt
  |gezählt − 200 × Ø| ≤ 4 × √(200 × Ø × maxQty) + 2. Beispiele (Startwerte 7919, 2 × 7919, …, Spielweise «vorsichtig»):

  | Dungeon | Gegenstand | erwartet (200 × Ø) | gezählt |
  |---|---|---|---|
  | Waldpfad (kurz) | Eisenschrott | 610,1 | 570 |
  | Waldpfad (kurz) | Grüne Kräuter | 415,1 | 463 |
  | Giftsumpf | Sumpfblüte | 583,7 | 557 |
  | Giftsumpf | Talisman-Fragment | 279,0 | 267 |
  | Vulkankern | Eisenschrott | 3711,0 | 3643 |
  | Vulkankern | Glutwurzel | 857,1 | 809 |

- **Rastplätze:** 30 000 Besuche mit dem echten `processRest` und `SeededRNG(778)`: «Kräuter sammeln» kommt in
  1/3 der Besuche (± 2 Prozentpunkte), immer mit 2 Grünen Kräutern. Die Rastplätze im Fundbuch sind genau die
  Räume `type: 'rest'` ohne `wahl`, bei allen anderen Einträgen steht keiner.
- **Schmiede:** «Jeder Sieg» ist je Dungeon genau die Menge, die `schmiedeBeute` nach einem Sieg in die Truhe legt
  (Sternenstahl: Sternenschlund 10, Sternenschmiede 9; Mondsilber: Morgentor 12, Mondhof 11), und jedes solche
  Material ist ein Eintrag. «Einschmelzen» ist `einschmelzenErtrag` jedes Set-Teils. Die Mengen unter «Wofür» sind
  für jedes schmiedbare Set-Teil und jede Stufe +1 bis +5 genau die Material- und Splitter-Kosten von `schmiedeKosten`.

## Was nicht drinsteht, und warum

- **Set-Teile der Dungeon-Sets** (Tag `set`): Sie fallen nie über Beutetabellen, sondern über
  `DungeonSets.ts`; wo es sie gibt, zeigt schon `SetAnzeige`. Die Abyssal-Teile (Tag `abyssal_set`) stehen in
  Beutetabellen und sind gewöhnliche Beute: Sie haben einen Eintrag.
- **Beute aus Dungeon-Geschichten** (`data/dungeonGeschichten.ts`): kein Zufall, sondern eine Entscheidung
  unterwegs (vorsichtig oder mutig); was sie bringt und kostet, steht auf ihren beiden Knöpfen (docs/GESCHICHTEN.md).
  Die festen Wahl-Räume der Dungeons über dem Vulkankern stehen dagegen als Fund-Raum drin, soweit sie einen
  Gegenstand geben.
- **Gildenhaus:** die Belohnungen der Zettel am Auftragsbrett und der Kapitel «Der Saal der Gilde» (unter anderem
  das Schmiede-Material des Dungeons) und das Einlösen von Siegeln gegen Material, Kristallsplitter und Set-Teile.
  Was es dort gibt, hängt von den Zetteln des Tages und den bezwungenen Dungeons ab; es steht im Gildenhaus
  (docs/AUFTRAGSBRETT.md).
- **Werkstatt-Pläne und die Mindmap** der Stadt: Reiter «Stadt».
- Gold ist kein Eintrag.
