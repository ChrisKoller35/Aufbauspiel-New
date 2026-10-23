# Fundbuch

Das Fundbuch beantwortet zwei Fragen: **Woher bekomme ich einen Gegenstand, und wofür brauche ich ihn?**
Es öffnet sich im Hauptmenü über «📜 Fundbuch» (unten rechts neben «💾 Spielstand», am schmalen Handy nur «📜»).

- Rechnung: `src/systems/Fundbuch.ts` (reine Funktionen, liest nur die Datendateien)
- Fenster: `src/ui/components/FundbuchFenster.ts`, Stile `src/ui/html/fundbuch.css`
- Tests: `tests/fundbuch.test.ts`

Das Fundbuch ändert den Spielstand nicht und speichert nichts. Alle Namen, Preise und Mengen kommen aus den
Datendateien (`ROUTE_DEFS`, `ENEMY_DEFS`, `LOOT_TABLE_DEFS`, `HAENDLER_WAREN`,
`MERCHANT_PRICES`, `RECIPE_DEFS`, `BUILDING_DEFS`, `STADTSTUFEN`, `HERZSTEINE`); nichts ist abgeschrieben.

## Was es zählt: ein Fund je Sieg

Die Regel ist die von `CombatEngine.rollLoot`: **Jeder besiegte Gegner mit Beutetabelle gibt Gold und genau
einen Gegenstand.** Gezogen wird gewichtet, die Menge gleich verteilt von `minQty` bis `maxQty`.

- **Chance je Sieg über einen Gegner** = Gewicht des Gegenstands / Summe aller Gewichte der Tabelle.
  Steht `gold` als Eintrag in einer Tabelle, zählt sein Gewicht in der Summe mit (rollLoot zieht es wie jeden
  anderen Eintrag), Gold selbst ist aber kein Eintrag im Fundbuch. `goldFaktor` betrifft nur Gold.
- **Ø je Sieg in einem Dungeon** = Summe über alle Gegner der Route von Chance × mittlere Menge
  ((min + max) / 2). «Alle Gegner» heisst jeder Eintrag in `encounters[].enemies` jedes Raums, auch in
  Befestigungs-Räumen; der Boss steht schon in seinem Boss-Raum und zählt nicht doppelt. Die Dungeons stehen
  nach diesem Wert sortiert, der grösste zuerst.
- Gegner, die in keiner Route stehen (z. B. `thorn_sprite`, `boss_bandit_chief`), erscheinen nicht.
- Der Modifikator ist im Spiel immer `null` (`ExpeditionFlow.ts`): «Elitegarde» und die Nemesis-Beute zählen nicht.

Weitere Quellen:

| Quelle | Anzeige | Woher die Zahl kommt |
|---|---|---|
| Händler der Stadt | «Beim Händler der Stadt · N Gold» | `kaufpreis(id, 1)`, Stadtstufe 1 ohne Rabatt |
| Dungeon-Händler | «Beim Dungeon-Händler · N Gold (höchstens 2 Käufe)» | `MERCHANT_PRICES`, `MERCHANT_MAX_PURCHASES` |
| Fund-Raum ohne feste Wahl | «Versteck durchsuchen: N Stück, angeboten in etwa 33 % der Besuche» | erstes `findItems`; die Option kommt in einem von drei Fällen (`EncounterProcessor`, `nextInt(0, 2)`), nachgezählt im Test mit 30 000 Besuchen |
| Fund-Raum mit fester Wahl | «zur Wahl: N Stück» bzw. «…, wenn der Boss fällt» | `wahl.a` / `wahl.b` mit `effect: 'item'`, `nachSieg` |
| Erstsieg-Beute der Gipfel-Dungeons | «‹Boss› (Boss) in ‹Dungeon› · 1 Stück beim ersten Sieg» | `RouteDef.ersterSiegBeute` |
| Werkstatt | «‹Gebäude› · ‹Rezept› · N je Durchgang» | `RECIPE_DEFS[…].outputs` |

**Wofür:** Rezepte (Gebäude, Menge je Durchgang), Baukosten (`buildCost`), Ausbau-Kosten
(`ausbauKosten` aus `Ausbau.ts`, Stufe 2 und 3), Abgaben für die Stadtstufen (`abgabe`), Herzsteine,
Proviant (`PROVISION_ITEMS`) und der Ankauf beim Händler
(«Der Händler zahlt N Gold je Stück», `ankaufpreis`).

**Einträge:** jeder Gegenstand aus `ITEM_DEFS`, der als Beute eines Gegners in einer Route, als Fund oder als
Händlerware vorkommt: zurzeit 61 (13 Materialien, 4 Tränke und Proviant, 43 Ausrüstung, 1 Sonstiges). Gruppen nach `ItemDef.type` und Tags; Kristallsplitter und Talisman-Fragmente
(Typ `special`) stehen bei den Materialien, weil Rezepte, Bau oder Stadtstufen sie verbrauchen.

Ein Klick auf einen Dungeon zeigt die Beute seiner Gegner (Ø je Sieg je Gegenstand), ein Klick auf einen
Gegenstand seinen Eintrag; Gebäude stehen als Text da. Dungeons, die die Gilde noch nicht betreten darf
(`isRouteAvailable`), stehen mit «🔒» und ihrem Namen da, damit man ein Ziel hat.

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
  |gezählt − 200 × Ø| ≤ 4 × √(200 × Ø × maxQty) + 2. Beispiele (Startwerte 7919, 2 × 7919, …, Spielweise «vorsichtig»;
  nachgezählt am 23.10.2026, seit die Musterteams die Werte echter Helden haben, in Klammern die Zahl davor):

  | Dungeon | Gegenstand | erwartet (200 × Ø) | gezählt |
  |---|---|---|---|
  | Waldpfad (kurz) | Eisenschrott | 610,1 | 570 |
  | Waldpfad (kurz) | Grüne Kräuter | 415,1 | 463 |
  | Giftsumpf | Sumpfblüte | 583,7 | 553 (557) |
  | Giftsumpf | Talisman-Fragment | 279,0 | 271 (267) |
  | Vulkankern | Eisenschrott | 3711,0 | 3510 (3643) |
  | Vulkankern | Glutwurzel | 857,1 | 861 (809) |

## Was nicht drinsteht, und warum

- **Set-Teile der Dungeon-Sets** (Tag `set`): Sie fallen nie über Beutetabellen, sondern über
  `DungeonSets.ts`; wo es sie gibt, zeigt schon `SetAnzeige`. Die Abyssal-Teile (Tag `abyssal_set`) stehen in
  Beutetabellen und sind gewöhnliche Beute: Sie haben einen Eintrag.
- **Schmiede-Material und Schmiede-Rezepte** (`mat_*` aus `schmiedeBeute`, Set-Schmiede): stehen in der
  Schmiede. Mondsilber und Sternenstahl erscheinen nur mit ihren Fund-Räumen (feste Wahl).
- **Beute aus Dungeon-Geschichten** und die Kräuter-Option der Rastplätze: zufällige Ereignisse, keine Tabelle
  zum Nachrechnen.
- **Werkstatt-Pläne und die Mindmap** der Stadt: Reiter «Stadt».
- Gold ist kein Eintrag.
