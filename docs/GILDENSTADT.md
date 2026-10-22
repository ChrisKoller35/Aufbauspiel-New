# Die Gildenstadt (22.10.2026)

Christophs Wunsch vom 22.10.2026 (Projekt-Chat): «der bereich mit den gebäuden passt mir immer noch nicht … braucht es
holz und brunnen und windmühlen und bank und solche sachen … ein gebäude das so wie ein shop hat wo man die nützlichen
start items kaufen kann. und dann schaltet man die nützlichen gebäude frei. und man braucht nur noch die materialien aus
dem dungeon und gold für das herstellen. weil das crafting das wir haben ist cool.» Alte Spielstände dürfen weg («ich bin
der einzige der das spielt»). Umsetzung: Variante 1 «Gildenstadt» (Thread «Magic City», Bestandsaufnahme im Scratchpad
`gebaeude/befund-*.md`).

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
| Händler `HAENDLER` | von Anfang an | – | – | kein Ausbau | verkauft Proviant, Grundausrüstung und Baupläne; kauft Beute |
| Schmiede `SMITHY` | zu bauen | Bauplan (Händler 50 Gold) | 50 Gold | 100 / 150 Gold + 10 / 20 Eisenschrott | Ausrüstung T1/T2; Gold-Rabatt in der Set-Schmiede (wie bisher) |
| Kräuterküche `HERB_GARDEN` (Name neu, ID bleibt) | zu bauen | Bauplan (Händler 50 Gold) | 40 Gold | 80 / 120 Gold + 5 / 10 Grüne Kräuter | Heiltrank, Kraft-Brot, die fünf Tränke mit echter Wirkung |
| Arkanschmiede `ARCANE_SMITHY` | zu bauen | Bauplan (Kristallgolem, erster Sieg, oder Händler 150 Gold), Gildenrang 2 | 80 Gold, 5 Eisenschrott, 3 Kristallsplitter | 160 / 240 Gold + 5 / 10 Kristallsplitter | Magitech-Komponente, Arkanklinge, Magitech-Schild, Arkan-Amulett |
| Kriegsmaschinen-Werkstatt `WAR_MACHINE_WORKSHOP` | zu bauen | Bauplan (Gefallener Ritter oder Händler 250 Gold), Gildenrang 4 | 100 Gold, 20 Eisenschrott, 5 Kristallsplitter | 200 / 300 Gold + 10 / 20 Eisenschrott | Katapult, Kanone |

Ausbau-Kosten (`ausbauKosten` in `systems/Ausbau.ts`) = Gold der Baukosten × Zielstufe plus die Beute je Stufe über
der ersten aus `BuildingDef.ausbauBeute` (`data/buildings.ts`: Schmiede 10 Eisenschrott, Kräuterküche 5 Grüne Kräuter,
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
| Bauplan: Schmiede | 50 Gold | |
| Bauplan: Kräuterküche | 50 Gold | |
| Bauplan: Arkanschmiede | 150 Gold | oder vom Kristallgolem |
| Bauplan: Kriegsmaschinen-Werkstatt | 250 Gold | oder vom Gefallenen Ritter |

**Ankauf:** Der Händler kauft Ausrüstung, Material und Proviant zum halben Grundwert (`baseValue / 2`, mindestens 1 Gold),
keine Baupläne, keine Set-Teile (die gehören in die Set-Schmiede zum Einschmelzen), keine Dungeon-Materialien `mat_*`.
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
Ruhmestruhe der Rangliste, Geschenke der Stadtstufen, Ankauf beim Händler. Keine Steuern, keine Bank. Startgold 100
bleibt (Held 50, Bauplan Schmiede 50, oder Heiltränke).

## Spielstände

`CURRENT_VERSION` 24. Spielstände unter 24 werden nicht übernommen: beim Laden gilt das wie «kein Spielstand», das
Fenster «Spielstand» sagt es in einem Satz («Dein alter Stand stammt aus der Stadt mit Bauernhöfen und wird nicht
übernommen; Neues Spiel.»). Alte Felder (`citizens`, `grid`, `satisfaction`, `activeEvent`, `specialists`,
`talismanInventory`, `selectedTalisman`, `warMachineInventory`, `selectedWarMachine`, `tutorial`, `eventTickAccumulator`,
Terrain-Kacheln) verschwinden aus `GameState`. Probespiel-Vorrat ohne Holz/Stein.

## Bildschirme

- **Gebäude:** Reiter PRODUKTION wird «STADT»: Mindmap mit drei Reihen: Beute aus den Dungeons (Eisenschrott,
  Kristallsplitter, Grüne Kräuter, Seltene Kräuter, Dungeon-Material) → Werkstätten (Schmiede, Kräuterküche,
  Arkanschmiede, Kriegsmaschinen) und Händler → Gildenhaus/Expeditionen. Engpass-Sätze bleiben (fehlt Beute, fehlt
  Gold, Bauplan fehlt). Reiter CRAFTING bleibt. Reiter AUFBAU: Freischalt-Baum der sechs Gebäude; gesperrt steht
  «Bauplan beim Händler (50 Gold)» bzw. «… oder vom Kristallgolem».
- **Händler-Fenster:** Waren mit Preis und Knopf «Kaufen» (1× / 5×), Baupläne (einmal kaufbar, danach «gekauft»),
  Abschnitt «Verkaufen» mit dem Lager (Preis je Stück, 1× / alle).
- **Kopfzeile:** Gold, Eisenschrott, Kristallsplitter, Brot, Heiltrank statt Gold/Holz/Stein/Brot.
- **Hauptmenü:** Stadtweg-Banner bleibt; Zeile zur Stadt ohne Bewohner.
- **Expeditionen:** Proviant-Auswahl bleibt, zeigt die Wirkung jedes Vorrats in einem Halbsatz.

## Prüfen

`npx tsc --noEmit`, `npm test`, `npm run validate-refs`, `npm run build`, Playwright-Rundgang am PC und Handy
(Hauptmenü → Gebäude: Händler kaufen, Bauplan kaufen, Schmiede bauen, Auftrag geben → Expedition mit Krafttrank →
Rückkehr, Stadtweg-Aufstieg), `npm run dungeon-eichung` unverändert (Dungeons nicht angefasst).
