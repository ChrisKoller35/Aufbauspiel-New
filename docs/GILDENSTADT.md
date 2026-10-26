# Die Gildenstadt (22.10.2026)

Christophs Wunsch vom 22.10.2026 (Projekt-Chat): «der bereich mit den gebäuden passt mir immer noch nicht … braucht es
holz und brunnen und windmühlen und bank und solche sachen … ein gebäude das so wie ein shop hat wo man die nützlichen
start items kaufen kann. und dann schaltet man die nützlichen gebäude frei. und man braucht nur noch die materialien aus
dem dungeon und gold für das herstellen. weil das crafting das wir haben ist cool.» Alte Spielstände dürfen weg («ich bin
der einzige der das spielt»). Umsetzung: Variante 1 «Gildenstadt» (Thread «Magic City», Bestandsaufnahme im Scratchpad
`gebaeude/befund-*.md`).

**Nachtrag 23.10.2026 (Wunsch Christoph):** Keine Baupläne mehr. Jede Werkstatt wird direkt auf ihrem Feld gebaut
(Bauplatz-Karte → Bau-Dialog), nur der Gildenrang sperrt noch (Arkanschmiede 2, Kriegsmaschinen-Werkstatt 4). Der
frühere Bauplan-Preis steckt jetzt in den Baukosten, das Startgold ist 200. Die Mindmap im Reiter «Stadt» hat keine
Linien und Pfeile mehr. Die Tabellen unten zeigen den neuen Stand; der Abschnitt «Umsetzung (22.10.2026)» hält fest,
wie es damals war, mit Hinweis, wo es sich geändert hat, Einzelheiten unter «Ohne Baupläne (23.10.2026)».

## Was die Bestandsaufnahme ergab (Stand master b4e380a)

- Strasse, Dungeon-Lager, Schatztruhe, Lagerhaus-Kapazität: keine Wirkung. Farm → Mühle → Bäckerei (+ Brunnen) → Brot
  existierte nur, damit Bewohner essen; Bewohner existierten nur als Arbeiter und Steuerzahler (6-8 Gold/Tag).
  Markt und Bank: ein paar Gold. Stadt-Ereignisse, Synergien, Spezialisten, Talismane, Verschleiss: toter Code.
- Von sieben Tränken und Broten wirkten im Dungeon nur Brot (+8 HP) und Heiltrank (+15 HP); `buffEffect` und die
  Tags `cooldown_reset`/`cleanse` las niemand. Die seltenen Dungeon-Kräuter waren damit wertlos.
- Was zählt: Gildenhaus (Helden, Auftragsbrett, Saal, Set-Schmiede), Schmiede und Arkanschmiede (Ausrüstung aus
  Eisenschrott und Kristallen), Kriegsmaschinen (zwei Belagerungs-Dungeons), Dungeon-Material für die Sets. Gold kam
  schon vorher zu rund 90 % aus den Dungeons.

## Die Stadt danach: sechs Gebäude

| Gebäude (ID) | Steht | Freischaltung | Bau | Ausbau (Stufe 2 / 3) | Macht |
|---|---|---|---|---|---|
| Gildenhaus `GUILD_HALL` | von Anfang an | – | – | T2 wie bisher: 80 Gold, 3 Kristallsplitter, Gildenrang 3 → 4 Helden | Helden, Auftragsbrett, Trophäensaal, Set-Schmiede, Expeditionen |
| Händler `HAENDLER` | von Anfang an | – | – | kein Ausbau | verkauft Proviant und Grundausrüstung; kauft Beute |
| Schmiede `SMITHY` | zu bauen | auf dem Feld | 100 Gold | 100 / 150 Gold + 10 / 20 Eisenschrott | Ausrüstung T1/T2; Gold-Rabatt in der Set-Schmiede (wie bisher) |
| Kräuterküche `HERB_GARDEN` (Name neu, ID bleibt) | zu bauen | auf dem Feld | 90 Gold | 80 / 120 Gold + 5 / 10 Grüne Kräuter | Heiltrank, Kraft-Brot, die fünf Tränke mit echter Wirkung |
| Arkanschmiede `ARCANE_SMITHY` | zu bauen | auf dem Feld, Gildenrang 2 | 230 Gold, 5 Eisenschrott, 3 Kristallsplitter | 160 / 240 Gold + 5 / 10 Kristallsplitter | Magitech-Komponente, Arkanklinge, Magitech-Schild, Arkan-Amulett |
| Kriegsmaschinen-Werkstatt `WAR_MACHINE_WORKSHOP` | zu bauen | auf dem Feld, Gildenrang 4 | 350 Gold, 20 Eisenschrott, 5 Kristallsplitter | 200 / 300 Gold + 10 / 20 Eisenschrott | Katapult, Kanone |

Der Bau enthält seit 23.10.2026 den früheren Bauplan (Schmiede 50 + 50, Kräuterküche 40 + 50, Arkanschmiede
80 + 150, Kriegsmaschinen 100 + 250 Gold); der Ausbau blieb gleich. Ausbau-Kosten (`ausbauKosten` in
`systems/Ausbau.ts`) = Ausbau-Gold (`BuildingDef.ausbauGold`: 50 / 40 / 80 / 100) × Zielstufe plus die Beute je Stufe
über der ersten aus `BuildingDef.ausbauBeute` (`data/buildings.ts`: Schmiede 10 Eisenschrott, Kräuterküche 5 Grüne Kräuter,
Arkanschmiede 5 Kristallsplitter, Kriegsmaschinen 10 Eisenschrott; Stufe 2 einmal, Stufe 3 zweimal, also die Spalte
«Ausbau» oben). Die Stadtstufe begrenzt die Werkstatt-Stufe (`grenzen.werkstatt` 1/1/2/2/3/3/3). Eine Werkstatt auf Stufe N arbeitet N-mal so schnell (kein Arbeiter mehr nötig).

**Weg:** Farm, Brunnen, Windmühle, Bäckerei, Holzfällerhütte, Steinbruch, Lagerhaus, Wohnviertel, Eisenmine, Strasse,
Dungeon-Lager, Schatztruhe, Marktplatz, Bank. Rohstoffe Holz, Stein, Getreide, Mehl, Wasser. Bewohner, Zufriedenheit,
Steuern, Arbeiter, Verbindung, Raster, Stadt-Ereignisse, Synergien, Spezialisten, Talismane, Verschleiss, Tagesbilanz
(ohne laufende Rohstoff-Produktion gibt es keine Tagesbilanz mehr), Markt-Handel in Bündeln.

## Der Händler (`src/data/haendler.ts`, `src/systems/Haendler.ts`)

Stückpreise, kein Tageslimit. Die Stadtstufe gibt Rabatt (Stadtrecht): Stufe 4-6 10 %, Stufe 7 20 %.

| Ware | Preis | Bemerkung |
|---|---|---|
| Brot | 4 Gold | +8 HP vor einem Kampf |
| Heiltrank | 10 Gold | +15 HP |
| Eisenschwert, Eisenschild, Lederrüstung | je 25 Gold | Grundausrüstung T1, billiger aus der Schmiede |

Bis 22.10.2026 führte er auch die Baupläne der vier Werkstätten (50 / 50 / 150 / 250 Gold); seit 23.10.2026 gibt es
keine Baupläne mehr (siehe «Ohne Baupläne»).

**Ankauf:** Der Händler kauft Ausrüstung, Material und Proviant zum halben Grundwert (`baseValue / 2`, mindestens 1 Gold),
keine Set-Teile (die gehören in die Set-Schmiede zum Einschmelzen), keine Dungeon-Materialien `mat_*`.
Damit wird Beute, die niemand trägt (Jägerbogen, Eichenstab …), zu Gold.

Der Dungeon-Händler im Sumpfdorf (`MERCHANT_PRICES`: Heiltrank 15, Brot 8, Kraft-Brot 25 Beutegold) bleibt teurer als
der Stadt-Händler, damit er ein Notnagel bleibt. Lieferungen am Auftragsbrett (`LIEFER_WAREN`) zahlen feste Beträge
(Tränke 3 → 45 Gold, Kraft-Brot 3 → 40, Schwerter 2 → 60, Schilde 2 → 60, Lederrüstungen 2 → 50); `marktKosten`
entfällt.

## Rezepte (nur Gold und Dungeon-Material)

Weg: Getreide, Holz, Stein, Eisen schürfen, Mehl, Brot, Kräuter ziehen. Alle `waterSupplied`-Bedingungen weg.

| Werkstatt | Rezept | Zutaten (neu) |
|---|---|---|
| Schmiede | Eisenschwert, Eisenschild | 2 Eisenschrott, 10 Gold |
| Schmiede | Lederrüstung | 1 Eisenschrott, 15 Gold |
| Schmiede | Stahlschwert, Stahlrüstung | 3 Eisenschrott, 1 Kristallsplitter, 20 Gold |
| Schmiede | Langbogen | 2 Eisenschrott, 1 Kristallsplitter, 20 Gold |
| Schmiede | Kristallstab | 1 Eisenschrott, 2 Kristallsplitter, 20 Gold |
| Schmiede | Kristallamulett | 2 Kristallsplitter, 1 Talisman-Fragment, 30 Gold |
| Kräuterküche | Heiltrank | 3 Grüne Kräuter |
| Kräuterküche | Kraft-Brot | 1 Brot, 1 Grüne Kräuter |
| Kräuterküche | Krafttrank, Manatrank, Gegengift, Titan-Gebräu, Schnelligkeitstrank | wie bisher (seltene Kräuter, Gegengift 1 Sumpfblüte + 1 Grüne Kräuter) |
| Arkanschmiede | wie bisher | wie bisher |
| Kriegsmaschinen | Katapult | 6 Eisenschrott, 2 Kristallsplitter, 60 Gold |
| Kriegsmaschinen | Kanone | wie bisher (5 Eisenschrott, 3 Kristall, 2 Komponenten) |

Gold ist eine normale Zutat (`globalStock.gold`); die Werkstatt kann es nicht selbst beschaffen (rot, wie Beute).
Werkstattplan bleibt nur für Zutaten, die eine andere Werkstatt herstellt (Magitech-Komponente für die Kanone).

## Tränke mit Wirkung (`ExpeditionSystem.useProvision`, `ExpeditionRun.trankWirkungen`)

Alle Vorräte werden wie bisher vor einem Kampf genutzt und wirken auf die ganze lebende Gruppe.

| Vorrat | Wirkung | Dauer |
|---|---|---|
| Brot | +8 HP | sofort |
| Heiltrank | +15 HP | sofort |
| Kraft-Brot | +2 Angriff | die nächsten 3 Räume |
| Krafttrank | +3 Angriff | bis zum Ende des Dungeons |
| Titan-Gebräu | +10 maximale Leben (und +10 Leben) | bis zum Ende des Dungeons |
| Schnelligkeitstrank | +0,2 Tempo | die nächsten 2 Räume |
| Manatrank | alle Fähigkeiten sofort wieder bereit (`cooldown` 0) | sofort |
| Gegengift | Gift weg (`unit.gift`), dazu +5 HP | sofort |

Umsetzung: flache Boni über `effektBoni['trank:atk']` / `['trank:spd']` (wie Zorn, Schmiedetakt), damit `gruppenAngriff`
sie nicht mitskaliert; `run.trankWirkungen: { stat, wert, bisRaum }[]` für die Räume-Dauer, beim Betreten eines Raums
abgelaufene Wirkungen zurücknehmen. Protokollzeile je Trank in Spielersprache («Krafttrank: +3 Angriff bis zum Ende»).
Die Kampf-Vorschau zeigt die Werte sofort (Preis/Wirkung sofort sichtbar, wie bei der Hort-Gier).

## Der Stadtweg ohne Bewohner

`steuerProzent` wird `haendlerRabatt` (Prozent beim Händler). `grenzen` nur noch `{ werkstatt }`. Neue Aufgabenart
`{ art: 'helden', anzahl }` (Helden in der Gilde).

| Stufe | Aufgaben | Abgabe | Geschenk | Rabatt |
|---|---|---|---|---|
| 2 Weiler | Schmiede steht, 1 Sieg | 40 Gold | 100 Gold | – |
| 3 Dorf | Kräuterküche steht, 2 Helden, 3 Siege | 80 Gold, 10 Eisenschrott | 150 Gold | – |
| 4 Marktflecken | Gildenrang II, 2 Bosse, 3 Helden | 150 Gold, 20 Eisenschrott, 5 Kristallsplitter | 100 Gold | 10 % |
| 5 Stadt | Arkanschmiede steht, 3 Bosse, Gildenrang III | 250 Gold, 20 Eisenschrott, 5 Kristallsplitter | 200 Gold | 10 % |
| 6 Grossstadt | Kriegsmaschinen-Werkstatt steht, Gildenrang IV, 5 Bosse, 4 Helden | 400 Gold, 40 Eisenschrott, 10 Kristallsplitter | 300 Gold | 10 % |
| 7 Magische Stadt | alle fünf Herzsteine | – | 500 Gold | 20 % |

Herzsteine: Spinne 100 Gold + 10 Eisenschrott; Hydra 150 Gold + 3 Kristall + 20 Eisenschrott; Leviathan, Wyrm, Wächter
wie bisher (ohne Holz/Stein). Kapitel-Texte bleiben, nur «Beim Graben für den Steinbruch» wird «Beim Graben für die
Schmiede» und «Dorfbäckerei» bleibt (die Bäckerin ist eine Figur, kein Gebäude).

## Gold

Quellen: Dungeon-Beute, mutige Wahlen der Geschichten, Fund-Räume, Auftragsbrett (Zettel und Lieferungen),
Ruhmestruhe der Rangliste, Geschenke der Stadtstufen, Ankauf beim Händler. Keine Steuern, keine Bank. Jedes neue
Spiel beginnt mit einem Helden (Guardian, Stufe 1) und 200 Gold (`createNewGameState`): Der zweite Held kostet 50,
jeder weitere 30 mehr (`anheuerKosten` in `src/systems/Empfehlung.ts`: 50 + (n − 1) · 30), die Schmiede 100. Das reicht
für den zweiten Helden, die Schmiede und 50 Gold Proviant, oder für zwei weitere Helden (bis 22.10.2026: 100 Gold,
Schmiede 50 + Bauplan 50). Mit weniger als zwei Helden empfiehlt die Stadt zuerst «Held anheuern (50 Gold)»: Allein
verliert ein Held den Waldpfad, und ohne Expedition gibt es kein Gold (`HELDEN_VOR_DEM_BAU` bleibt 2).

## Spielstände

`CURRENT_VERSION` 24. Spielstände unter 24 werden nicht übernommen: beim Laden gilt das wie «kein Spielstand», das
Fenster «Spielstand» sagt es in einem Satz («Dein alter Stand stammt aus der Stadt mit Bauernhöfen und wird nicht
übernommen; Neues Spiel.»). Alte Felder (`citizens`, `grid`, `satisfaction`, `activeEvent`, `specialists`,
`talismanInventory`, `selectedTalisman`, `warMachineInventory`, `selectedWarMachine`, `tutorial`, `eventTickAccumulator`,
Terrain-Kacheln) verschwinden aus `GameState`. Probespiel-Vorrat ohne Holz/Stein.

Baupläne (23.10.2026): `SaveSystem.bereiteVor` ruft `tauscheBauplaeneInGold(state)` auf. Unverbaute `bauplan_*` im
Lager werden zum alten Händlerpreis Gold (Schmiede 50, Kräuterküche 50, Arkanschmiede 150, Kriegsmaschinen 250),
`erhalteneBauplaene` wird gelöscht. `SpielstandSchema.ts` kennt das Feld nicht mehr; die Version bleibt.

## Bildschirme

- **Gebäude:** Reiter PRODUKTION wird «STADT»: Mindmap mit drei Reihen: Beute aus den Dungeons (Eisenschrott,
  Kristallsplitter, Grüne Kräuter, Seltene Kräuter, Dungeon-Material), darunter Händler und Werkstätten (Schmiede,
  Arkanschmiede, Kriegsmaschinen, Kräuterküche), zuunterst Gildenhaus/Expeditionen; seit 23.10.2026 ohne Linien und
  Pfeile. Engpass-Sätze bleiben (fehlt Beute, fehlt Gold, fehlt ein Gildenrang: «Arkanschmiede braucht Gildenrang 2.»,
  baubar «Schmiede fehlt noch. Bauen kostet 100 Gold.»). Reiter CRAFTING bleibt. Reiter AUFBAU: Raster der sechs
  Gebäude; baubar steht «Bauen: 100 Gold», gesperrt «🔒 braucht Gildenrang 2».
- **Händler-Fenster:** Waren mit Preis und Knopf «Kaufen» (1× / 5×) und Abschnitt «Verkaufen» mit dem Lager (Preis
  je Stück, 1× / alle). Den Abschnitt «Baupläne» gibt es seit 23.10.2026 nicht mehr.
- **Kopfzeile:** Gold, Eisenschrott, Kristallsplitter, Brot, Heiltrank statt Gold/Holz/Stein/Brot.
- **Hauptmenü:** Stadtweg-Banner bleibt; Zeile zur Stadt ohne Bewohner.
- **Expeditionen:** Proviant-Auswahl bleibt, zeigt die Wirkung jedes Vorrats in einem Halbsatz.

## Prüfen

`npx tsc --noEmit`, `npm test`, `npm run validate-refs`, `npm run build`, Playwright-Rundgang am PC und Handy
(Hauptmenü → Gebäude: Händler kaufen, Schmiede bauen, Auftrag geben → Expedition mit Krafttrank →
Rückkehr, Stadtweg-Aufstieg), `npm run dungeon-eichung` unverändert (Dungeons nicht angefasst).

## Umsetzung (22.10.2026)

Code und Tests stehen (Branch `claude/magic-city-bestandsaufnahme-gmzay8`, `npx tsc --noEmit` 0 Fehler, `npx vitest
run` grün, `npm run validate-refs` sauber, `npm run build` grün; Playwright-Rundgang offen). Was abweichend von der
Spezifikation oben entschieden wurde, mit den Annahmen der Umbau-Agenten:

- **Ausbau-Beute:** Reines «Gold der Baukosten × Zielstufe» hätte die Tabelle verfehlt (Schmiede und Kräuterküche nur
  Gold, Arkanschmiede Stufe 2 wäre 10 Eisen + 6 Kristall statt 5 Kristall). Darum `BuildingDef.ausbauBeute` in
  `data/buildings.ts`, aus dem `ausbauKosten` liest (zuerst als Konstante `AUSBAU_BEUTE` in `Ausbau.ts`, dann in die
  Daten verschoben); der Absatz nach der Gebäude-Tabelle beschreibt den Stand.
- **Kräuterküche ohne Von-selbst-Satz:** `VON_SELBST_SATZ` (`Werkstattplan.ts`) hat nur noch Arkanschmiede und
  Kriegsmaschinen-Werkstatt. Die Kräuterküche stellt keine Zutat mehr selbst her (kein Kräuter-Rezept) und beliefert
  niemanden; ein Satz für sie hätte nichts zu sagen.
- **Händler-Rabatt:** `kaufpreis` rechnet den Rabatt der Stadtstufe mit, Rundung `Math.round`, mindestens 1 Gold.
  `haendlerRabatt` ist der Wert der Stufe (0/0/0/10/10/10/20), nicht zusammengezählt wie früher `steuerProzent`.
  Bis 22.10.2026 galt er auch für die Baupläne (`bauplanPreis`); seit 23.10.2026 gibt es keine Baupläne mehr, auf die
  Baukosten gibt es keinen Rabatt.
- **Ankauf:** erlaubt ist alles mit `baseValue > 0` ausser Gold, Set-Teilen (`setVonItem` oder Tag `set`)
  und Dungeon-Material (`mat_*` oder Tag `schmiede`), also auch Kristallsplitter (10 Gold) und Kriegsmaschinen
  (25 / 27 Gold).
- **Aufbau-Reiter als Raster statt Baum:** Alle `freischaltung.braucht`-Listen sind leer (nur der Gildenrang sperrt,
  wie in der Tabelle oben; bis 22.10.2026 auch der Bauplan); ein Baum wäre eine Spalte «Stufe 1». Wer eine Kette will, trägt sie in
  `buildings.ts` ein.
- **Gildenhaus-Kachel öffnet das Gebäude-Fenster** (Helden in der Gilde, Helden je Expedition, Ausbau Stufe 2, Knopf
  «ZUM GILDENHAUS»), nicht direkt den Gildenhaus-Bildschirm: Der Ausbau `GUILD_HALL_T2` wäre sonst nirgends
  erreichbar. `heldenJeExpedition(state)` in `Ausbau.ts` ersetzt `BuildingUpgradeSystem.getPartySlots`.
- **Hinweis bei altem Spielstand in der Kopfzeile:** Statt des Satzes im Fenster «Spielstand» zeigt `main.ts` nach dem
  Start einmal `VOR_GILDENSTADT` («Dieser Spielstand stammt aus der Zeit vor der Gildenstadt und kann nicht geladen
  werden.») über `zeigeKopfHinweis(text, 10_000)`: 10 Sekunden statt der üblichen 4, weil der Satz lang ist; trifft
  er mit einem Erfolgs-Hinweis zusammen, stehen beide nebeneinander, bis der längere abgelaufen ist. Das Fenster
  «Spielstand» zeigt denselben Satz für alte Dateien und bietet einen «Stand vor dem Laden» aus dieser Zeit nicht an.
- **Spielstand: keine Migration, Backup-Slot nur noch geschrieben.** `migrate()`, `loeseAlteZustaende`,
  `removeUnknownBuildings` und die Migrationen der alten Felder sind weg; `load()` liefert bei Version < 24 `null`
  und setzt ein Flag (`alterStandVerworfenBeimStart`). Der alte Stand bleibt im Speicher, bis das neue Spiel speichert
  (dann liegt er auf dem Backup-Platz). `loadBackup`, `hasBackup`, `hasSave`, `canSave`, `getSaveSize` hatten keine
  Aufrufer und sind gestrichen; die Sicherung wird weiter geschrieben, aber nur noch von Hand gelesen. Das Schema liegt
  in `SpielstandSchema.ts` (Pflichtfelder `buildings`, `globalStock`, `fighters`, `day`; `HELD` ohne `citizenId` und
  `gearNeedsRepair`). Stände mit Version > 24 lädt der Start weiterhin, nur Dateien werden abgewiesen.
- **Erfolge:** gestrichen `wohnviertel_6`, `bewohner_25`, `gebaeude_max`, `ausbau_10` und alle Bewohner/Holz/Markt/
  Bank/Zufriedenheit-Erfolge; neu `haendler_1` «Erster Kauf» (Zähler `total_haendler_kaeufe`, den `Haendler.kaufen` und
  bis 22.10.2026 `bauplanKaufen` hochzählen, Verkaufen nicht), `bauplan_1` (am 23.10.2026 mit den Bauplänen
  gestrichen), `werkstaetten_4`, `werkstatt_3`, `ausbau_5`; `mass_builder`
  auf 10 gesenkt (höchstens 4 Neubauten und 9 Ausbauten). Liste: `docs/ERFOLGE.md`.
- **Tränke:** `run.trankWirkungen` hat `{ itemId, stat: 'atk' | 'spd' | 'maxHp', wert, bisRaum?, helden }`; fehlt
  `bisRaum`, gilt die Wirkung bis zum Ende. Die Raum-Dauer zählt den aktuellen Raum mit (Kraft-Brot in Raum 0 wirkt in
  0, 1, 2). Ein Trank, der schon bis zum Ende wirkt, wird nicht noch einmal verbraucht («… wirkt schon bis zum Ende des
  Dungeons – der Vorrat bleibt.»); ein Raum-Trank nachgetrunken setzt die Dauer neu, stapelt nicht. Manatrank setzt
  `currentCooldown` aller Fähigkeiten auf 0 und gibt die Vorschau-Fähigkeit frei. Das Gratis-Kraft-Brot beim Aufbruch
  ist weg (1 Brot + 1 Heiltrank bleiben). Protokollzeilen beim Ablauf: Essen «… ist verdaut.», Tränke «… ist
  verflogen.». Tests: `tests/traenke.test.ts`.
- **Beutetabellen:** Die Einträge für Holz, Stein und Getreide wurden gewichtsneutral zu Eisenschrott (Wald, Höhle,
  Ruinen, Vulkan, Belagerung) bzw. Gold (Sumpf) umgewidmet; Eisenschrott fällt darum schon auf dem Waldpfad.
- **Spieltag:** `src/systems/Tag.ts` (`TAG_SEKUNDEN` 30, `STADT_TAKT_SEKUNDEN` 1, `neuerTag` zählt `day`, setzt
  `total_days_survived = day - 1` und prüft die Erfolge), weil `EconomySystem.dayTick` weg ist.
- **Start mit einem Helden (Probespiel-Befund, 22.10.2026):** `placeStartingLayout` stellt neben Gildenhaus und
  Händler einen Guardian (Stufe 1, ohne Ausrüstung) in die Gilde; `anheuerKosten(n)` = 50 + (n − 1) · 30, der zweite
  Held kostet also 50. Vorher begann ein Spiel ohne Helden, und wer die 100 Gold in Bauplan und Schmiede steckte,
  sass ohne Expedition und Gold fest (siehe «Gold»; seit 23.10.2026 200 Gold, Schmiede 100). `Empfehlung.naechsterBau` liefert mit weniger als zwei Helden
  den Schritt `held` («Held anheuern (N Gold)», `typeId` leer); Mindmap (Ziel «Bauen & Ausbauen», Engpass-Leiste)
  und Aufbau-Reiter zeigen den Text und führen per Klick zu den Helden. Seit 23.10.2026 zeigt das Ziel «Bauen &
  Ausbauen» den Helden-Schritt vor «N baubar»; den Schritt `bauplan` gibt es nicht mehr, nur `bauen` und `held`.
- **Lieferlohn unter dem Händlerpreis:** `LIEFER_WAREN.gold` 24 (3 Heiltränke) / 40 (3 Kraft-Brote) / 40 (2
  Eisenschwerter) / 40 (2 Eisenschilde) / 40 (2 Lederrüstungen), nie über dem Händlerpreis bei 20 % Rabatt; vorher
  (45/40/60/60/50) liess sich beim Händler kaufen und mit Gewinn abgeben. Die Siegel bleiben der eigentliche Lohn
  (`docs/AUFTRAGSBRETT.md`).
- **Kein Abreissen:** Der Knopf im Gebäude-Fenster ist weg (es gibt jedes Gebäude einmal, und die Baukosten kämen
  nicht zurück); `Ausbau.entferneGebaeude` bleibt für `vereinigeDoppelte`.
- **Fenster und Tasten:** Händler-Fenster, Gebäude-Fenster und Bau-Dialog schliessen mit Escape
  (`bindeFensterTasten` in `ui/components/FensterHilfen.ts`, Capture-Phase vor dem `keydown` in `main.ts`, das sonst
  zum Hauptmenü springt); Tab bleibt im Fenster. Ein Ausbau speichert sofort (`mc:speichern`) wie Bau und Händler.
- **Ausbau während eines Zyklus:** `ausbauen` kürzt den Rest des laufenden Zyklus im Verhältnis der Tempi
  (`productionTimer *= alt / neu`), die neue Stufe wirkt also sofort, nicht erst beim nächsten Auftrag.
- **Sonstiges:** `vereinigeDoppelte` wird beim Laden aufgerufen (`SaveSystem.bereiteVor`, damit auch im Probe-Laden
  des Fensters «Spielstand»): mehrere Gebäude derselben Art werden zu einem. `BuildingInstance.built` bleibt
  (immer true nach dem Bau), ebenso `BuildingDef.tier` und `expeditions`. `rescuedNpcs` und `LIEFER_AUFSCHLAG` sind
  weg (tot). Der Reiter heisst «STADT», die Bezeichner (`ProduktionTab.ts`, `produktion`) bleiben. Die Verkaufen-Liste
  im Händler-Fenster ist nach Namen sortiert. Die Silhouette
  zeigt das Gildenhaus ab dem Dorf als Halle (vorher Zelte), den Händler ab Stufe 1 als Stand, die Händlerhalle im
  Marktflecken. `tools/validateRefs.ts` hatte einen Check 4 für die Baupläne (Gebäude ↔ Beutetabellen,
  `ersterSiegBauplan`); er ist am 23.10.2026 mit den Bauplänen weggefallen. Seit dem 26.10.2026 prüft ein neuer
  Check 4, ob jeder Gegenstand ein Bild hat (fehlende als Leihbild über `tools/leihbilder.ts`, `npm run leihbilder`).

## Ohne Baupläne (23.10.2026)

Wunsch Christoph: Baupläne weg, Werkstätten direkt auf ihrem Feld freischalten, die Mindmap ohne Verbindungslinien.

- **Gestrichen:** die Items `bauplan_*`, der Abschnitt «Baupläne» im Händler-Fenster, die Erst-Sieg-Baupläne der Bosse
  (`LootTableDef.ersterSiegBauplan`, `GameState.erhalteneBauplaene`, `getRouteBauplan`), `BAUPLAN_PREISE`,
  `BAUPLAN_BOSS`, `bauplanPreis`, `bauplanKaufen`, `bauplanGekauft`, `bauplanHinweis`, `bauplaeneImLager`,
  `bauplanSchritt`, der Empfehlungs-Schritt `bauplan`, der Erfolg `bauplan_1` und die Kennzahl `bauplaene`.
- **Bauen:** Kachel im Reiter «Aufbau» oder Karte in der Mindmap → Bau-Dialog → BAUEN. `freischaltHinweise` nennt nur
  noch den fehlenden Gildenrang. Die Baukosten enthalten den früheren Bauplan-Preis (Tabelle oben); `ausbauGold` hält
  den Ausbau auf dem alten Stand.
- **Startgold 200** statt 100, damit der zweite Held und die Schmiede am ersten Tag gehen.
- **Stadtweg:** Die Gebäude-Aufgabe zeigt, solange das Gebäude fehlt, «auf dem Feld bauen: 100 Gold» bzw. gesperrt
  «noch gesperrt: braucht Gildenrang 2».
- **Mindmap:** SVG-Linien und Pfeile weg (`NETZ_KANTEN`, `NetzKante`, `flussText`, `vorhanden`, `zeichneKanten`).
  `MindmapLinien.ts` heisst jetzt `MindmapGroesse.ts` und passt nur noch die Breite an (`passeMindmapAn`: voll / zoom /
  kompakt). Der Händler steht als erster in der mittleren Reihe «Händler und Werkstätten».
  `tests/produktionsnetz.test.ts` prüft nur noch, dass jedes Gebäude einmal vorkommt und der Händler vorne steht.
- **Alte Spielstände:** `tauscheBauplaeneInGold` (siehe «Spielstände»).
