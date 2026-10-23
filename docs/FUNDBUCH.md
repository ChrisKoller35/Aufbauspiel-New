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

Im Fenster steht je Dungeon eine Kopfzeile mit Link und Ø, darunter seine Gegner mit Anzahl, Chance und Menge,
z. B. «Die Festung · Ø 24,7 je Sieg» und darunter «Armbrustschütze (5×) · 45 % je Sieg über ihn · 2–5 Stück».
Der Auftrag (Issue #63) wollte je Gegner eine Zeile «‹Gegner› · P % je Sieg über ihn · Ø X je Sieg in ‹Dungeon›».
So gebaut (23.10.2026) stand der Dungeon-Link in jeder Zeile, und Links sind am Handy 44 px hoch. Eisenschrott bei
390 × 844 px (Handy, Schriften geladen, nachgemessen am 23.10.2026): Der Eintrag selbst (`article.fb-eintrag`) ist
in der Zeilenform 8620 px hoch, mit der Kopfzeile je Dungeon 5230 px. Das ganze Fenster, das am Handy als Ganzes
scrollt (`scrollHeight` von `.fb-fenster`, mit Titel, Suchfeld und Liste über dem Eintrag), misst 9087 statt
5697 px. Links im Eintrag: 113 statt 35 (unter «Woher» 100 statt 22, einer je Gegnerzeile bzw. je Dungeon; dazu
13 unter «Wofür»). Darum bleibt es bei der Kopfzeile je Dungeon.

Zahlen haben ein Komma. Eine Zahl bleibt am Handy mit ihrem Zeichen oder ihrer Einheit auf einer Zeile: Nach «Ø»,
vor «%», «Stück» und «Gold», in «Raum 3», «Stufe 2», «Ebene 4», «2 je Durchgang» und «höchstens 2 Käufe»
steht ein geschütztes Leerzeichen, nach dem Strich eines Bereichs («2–5 Stück») ein unsichtbarer Wortverbinder
(U+2060), denn auch nach «–» bräche die Zeile sonst um. In «3 / 6 / 12 Stück» hängt «/» an der Zahl davor. Bis
23.10.2026 brach bei 360 px an 71 von 1278 Stellen «Zahl Stück/Gold» die Zeile zwischen Zahl und Einheit um (bei
390 px an 47); jetzt an keiner, geprüft in allen 71 Einträgen und 29 Dungeon-Seiten bei 360 × 780, 390 × 844
und quer bei 844 × 390 px.

Weitere Quellen:

| Quelle | Anzeige | Woher die Zahl kommt |
|---|---|---|
| Händler der Stadt | «Beim Händler der Stadt · N Gold» | `kaufpreis(id, stadtStufeVon(state))`: der Preis der eigenen Stadtstufe, ab Stufe 4 mit Rabatt (`fundorte` selbst rechnet mit Stufe 1) |
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

**Bedienung:** Ohne Wunsch (so öffnet es das Hauptmenü) beginnt das Fundbuch beim ersten Eintrag der Liste, den
die Gilde jetzt schon bekommen kann (`startEintrag`); mit Wunsch bei genau diesem Eintrag. Die Reihe ist die der
Liste: die Gruppen wie oben (Materialien, Tränke und Proviant, Ausrüstung, Sonstiges), darin alphabetisch. Bekommen
kann die Gilde, was der Händler der Stadt verkauft oder was in einem Dungeon liegt, den sie schon betreten darf
(`isRouteAvailable`: Gildenrang und verlangte Bosse): Beute der Gegner, ein Fund-Raum, die Erstsieg-Beute, das
Schmiede-Material je Sieg, Kräuter am Rastplatz. Nicht mit zählen Werkstätten (sie brauchen Gebäude und Zutaten),
der Dungeon-Händler (nur im Sumpfdorf) und das Einschmelzen (es braucht ein doppeltes Set-Teil, und sein Dungeon
bringt dasselbe Material ohnehin je Sieg), ebenso alles aus gesperrten Dungeons. Ein neues Spiel beginnt so bei
Eisenschrott, denn Drachenschuppe und Eisblüte davor gibt es nur in gesperrten Dungeons; im Probespiel, in dem der
Drachenhort schon offen ist, bei Drachenschuppe. Wäre nichts erreichbar, käme der erste Eintrag der Liste; im Spiel
kommt das nicht vor, der Händler verkauft immer Brot. Die Tests dazu stehen unter «Gegenprobe».

Am PC schliessen Escape, ✕ und ein Klick neben das Fenster; Tab bleibt im Fenster, auch vom Suchfeld aus.
Nach einem Sprung über einen Link steht der Fokus auf «← zurück», nach «← zurück» wieder auf dem
Link, über den man gegangen war. F5 speichert wie überall im Spiel, auch im Suchfeld (`main.ts`). Der zweite Klick
eines Doppelklicks (am Handy eines Doppeltipps) geht ins Leere (`schluckeZweitenKlick`): auf «📜 Fundbuch», weil
er sonst schon das offene Fenster träfe, und auf einem Link, «← zurück» oder einem Listeneintrag, weil er sonst
auf der neuen Seite einen anderen Link träfe und gleich weiterspränge. Schon sein Druck verschiebt weder den
Fokus noch markiert er Text: Am PC bleibt der Fokus nach einem Doppelklick auf «📜 Fundbuch» im Suchfeld. Am Handy steht die Liste über dem
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

- **Rastplätze:** 30 000 Besuche mit dem echten `processRest` und `SeededRNG(778)`: «Kräuter sammeln» kommt in
  1/3 der Besuche (± 2 Prozentpunkte), immer mit 2 Grünen Kräutern. Dazu jeder Rastplatz jedes Dungeons in den
  Räumen, die `startExpedition` baut, 60-mal mit `processRest` besucht: Kommt ein Gegenstand dort mal und mal
  nicht, ist es die Zufallswahl. Genau diese Rastplätze nennt das Fundbuch, bei jedem Eintrag; zurzeit bietet ein
  Rastplatz nur Grüne Kräuter an.
- **Fenster (HTML ohne Browser):** Unter «Woher» hat jeder Dungeon genau eine Kopfzeile mit seinem Link und genau
  einem «Ø»; die Gegnerzeilen darunter haben weder Link noch «Ø». In allen Einträgen steht zwischen Zahl und
  «Stück» bzw. «Gold» ein geschütztes Leerzeichen und in Bereichen nach «–» der Wortverbinder. Der Händler der
  Stadt nennt den Preis der eigenen Stadtstufe.
- **Start beim Öffnen:** neues Spiel Eisenschrott; alle Dungeons offen Drachenschuppe (der erste Eintrag); alle
  Dungeons zu (künstlich, Gildenrang 0) Brot, die erste Ware des Händlers, obwohl davor Magitech-Komponente
  (Werkstatt) und Drachenschuppe (Einschmelzen) stehen; ein Angebot des Dungeon-Händlers ändert nichts. Jedes Mal
  ist alles davor in der Liste nicht erreichbar. Mutationsproben in einer Kopie (letzter statt erster
  erreichbarer, alphabetisch statt Listenreihe, Händler zählt nicht, Werkstätten oder Dungeon-Händler zählen, «Ø»
  wieder in jeder Gegnerzeile, Händlerpreis immer Stufe 1, normales Leerzeichen vor «Stück»/«Gold», kein
  Wortverbinder) machen je mindestens einen Test rot. «Einschmelzen zählt» bliebe grün: Mit den heutigen Daten
  ändert es nichts, weil jeder Dungeon sein Material ohnehin je Sieg bringt.
- **Schmiede:** «Jeder Sieg» ist je Dungeon genau die Menge, die `schmiedeBeute` nach einem Sieg in die Truhe legt
  (Sternenstahl: Sternenschlund 10, Sternenschmiede 9; Mondsilber: Morgentor 12, Mondhof 11), und jedes solche
  Material ist ein Eintrag. «Einschmelzen» nennt bei jedem Eintrag genau die Sets, deren Teile beim Einschmelzen
  dieses Material bringen, mit der Menge von `einschmelzenErtrag` (jedes Teil eines Sets bringt gleich viel). Die
  Mengen unter «Wofür» sind für jedes schmiedbare Set-Teil und jede Stufe +1 bis +5 genau die Material- und
  Splitter-Kosten von `schmiedeKosten`.

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
