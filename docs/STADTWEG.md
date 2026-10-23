# Der Weg zur Magischen Stadt (18.10.2026, Gildenstadt 22.10.2026)

Christophs Wunsch vom 18.10.2026 (Thread «Magic City: Bestandsaufnahme und Bot-Aufgaben»): eine Geschichte
einbauen, das Endgame bleibt aber der Dungeon, in dem man **endlos nach oben kämpft** und versucht, auf der
Rangliste oben zu bleiben. Dieses Paket baut den Weg dorthin: Die Stadt steigt in **7 Stadtstufen** auf, jede
Stufe erzählt ein Kapitel. Seit 20.10.2026 heisst «endlos nach oben»: Auf der Dungeon-Karte kommen immer wieder
neue Dungeons dazu (`docs/NEUE-DUNGEONS.md`). Seit der Gildenstadt (22.10.2026, `docs/GILDENSTADT.md`) verlangen die
Stufen keine Rohstoffe und keine Einwohnerzahl mehr, sondern Werkstätten, Helden, Siege, Bosse und Gildenrang; das
Stadtrecht gibt Rabatt beim Händler statt Steuern.

Code: `src/data/stadtstufen.ts` (Stufen, Kapitel, Herzsteine), `src/systems/Stadtweg.ts` (Regeln),
`src/ui/screens/StadtwegFenster.ts` (Banner, Fenster, Hinweis), `src/ui/screens/StadtSilhouette.ts` (die Stadt
als Bild aus Code), `src/ui/html/stadtweg.css`. Tests: `src/systems/Stadtweg.test.ts`, `src/systems/Ausbau.test.ts`,
`tests/stadtwegBosse.test.ts`.

## Im Spiel

- **Hauptmenü:** Unter dem Titel steht ein Banner mit der Stadt als Nachtbild, Stufe, Name, einer Zeile zur Stadt
  («Ein Weiler. Die Ziege ist beeindruckt.») und dem Fortschritt zur nächsten Stufe («2 von 4 erledigt»). Ist der
  Aufstieg möglich, leuchtet es golden; ein ungelesenes Kapitel zeigt «📜 Neues Kapitel».
- **Fenster** (Klick aufs Banner): grosses Bild, der Weg mit allen 7 Stufen, die Aufgaben der nächsten Stufe mit
  Häkchen (fehlt ein Gebäude, dazu «auf dem Feld bauen: 100 Gold» bzw., gesperrt, «noch gesperrt: braucht
  Gildenrang 2»; bis 22.10.2026 stand hier der Bauplan), die Abgabe, die
  Belohnungen, der Knopf «Aufsteigen», die Stadtchronik und ab Stufe 6 das Arkane Herz.
- **Hinweis unten links:** Wird ein Aufstieg möglich, während man anderswo ist (z. B. Gebäude), erscheint einmal
  «Aufstieg bereit! … Ansehen». Nicht während einer Expedition.
- **Aufstieg:** zieht die Abgabe ab, gibt das Geschenk, zeigt die Feier («Aus dem Weiler wird ein Dorf!») mit dem
  neuen Kapitel. Das Bild wächst mit den Gebäuden, die es im Spiel gibt: Zelte, Lagerfeuer und der Stand des
  Händlers → Schmiede (Weiler) → Gildenhaus und Kräuterküche (Dorf) → zweiter Stand und Händlerhalle (Marktflecken)
  → Arkanschmiede und Stadtmauer (Stadt) → Kriegsmaschinen-Werkstatt, Burg und Gerüst ums Herz (Grossstadt) →
  leuchtender Kristall und ein glühender Pfad über den Berg hinauf (Magische Stadt).

## Die Stufen

Aufgaben zählen live; die Abgabe zählt als ein Schritt («n von m erledigt»), bezahlt wird erst beim Aufstieg.

| Stufe | Name | Aufgaben für diese Stufe | Abgabe | Geschenk | Rabatt |
|---|---|---|---|---|---|
| 1 | Lagerfeuer | – (Start) | – | – | – |
| 2 | Weiler | Schmiede steht, 1 Expedition gewonnen | 40 Gold | 100 Gold | – |
| 3 | Dorf | Kräuterküche steht, 2 Helden in der Gilde, 3 Expeditionen gewonnen | 80 Gold, 10 Eisenschrott | 150 Gold | – |
| 4 | Marktflecken | Gildenrang II, 2 verschiedene Bosse, 3 Helden | 150 Gold, 20 Eisenschrott, 5 Kristallsplitter | 100 Gold | 10 % |
| 5 | Stadt | Arkanschmiede steht, 3 verschiedene Bosse, Gildenrang III | 250 Gold, 20 Eisenschrott, 5 Kristallsplitter | 200 Gold | 10 % |
| 6 | Grossstadt | Kriegsmaschinen-Werkstatt steht, Gildenrang IV, 5 verschiedene Bosse, 4 Helden | 400 Gold, 40 Eisenschrott, 10 Kristallsplitter | 300 Gold | 10 % |
| 7 | Magische Stadt | alle fünf Herzsteine eingesetzt | – | 500 Gold | 20 % |

«Rabatt» ist das Stadtrecht: der Rabatt beim Händler auf seine Waren (`haendlerRabatt`, gilt je Stufe und
wird nicht zusammengezählt; `docs/HAENDLER.md`). Die Belohnungsliste nennt ihn nur, wenn er gegenüber der Vorstufe
steigt. Siege kommen aus `statistics.total_victories`, Bosse aus `guildStats.bossesDefeatedIds` und dem Monsterbuch
(nur Einträge mit Rolle Boss), Helden aus `fighters` (Anzahl), der Gildenrang aus `guildStats.rank`.

## Grenzen der Stadtstufe (wie das Rathaus bei Clash of Clans)

Die Stadtstufe bestimmt, wie weit die Werkstätten ausgebaut werden dürfen (`grenzen.werkstatt`). Im Gebäude-Fenster
steht dann «🔒 braucht Stadtstufe «Dorf» (Hauptmenü)», der Engpass-Satz in der Mindmap sagt dasselbe. Die
Belohnungsliste nennt «Werkstätten bis Stufe N», wenn die Grenze steigt.

| Stufe | Werkstätten bis |
|---|---|
| 1 Lagerfeuer, 2 Weiler | 1 |
| 3 Dorf, 4 Marktflecken | 2 |
| 5 Stadt, 6 Grossstadt, 7 Magische Stadt | 3 |

Gildenhaus (Stufe 2 über `GUILD_HALL_T2`, Gildenrang 3) und Händler (kein Ausbau) haben keine Grenze.

## Das Arkane Herz (ab Stufe 6)

Fünf Herzsteine, je einer pro grossem Boss. Einsetzen geht, wenn der Boss besiegt ist und die Kosten da sind.

| Herzstein | Boss | Kosten |
|---|---|---|
| der Spinnenkönigin | `boss_spider_queen` | 100 Gold, 10 Eisenschrott |
| der Sumpfhydra | `boss_swamp_hydra` | 150 Gold, 20 Eisenschrott, 3 Kristallsplitter |
| des Leviathans | `boss_leviathan` | 200 Gold, 30 Eisenschrott, 5 Kristallsplitter |
| des Magma-Wyrms | `boss_magma_wyrm` | 300 Gold, 8 Kristallsplitter |
| des Festungswächters | `boss_fortress_warden` | 400 Gold, 50 Eisenschrott, 10 Kristallsplitter |

Im Bild wird das Gerüst um den Kristall mit jedem Stein heller; mit allen fünf erwacht das Herz (Stufe 7).

## Die Geschichte

Erzählt von **Ottokar, Stadtschreiber**, trocken und ein bisschen eitel. Kapitel: 1 Das Schild, 2 Die Steinplatte,
3 Das Brummen, 4 Die Karte, 5 Mehr, 6 Das Herz, 7 Die Karte wächst. Roter Faden: Unter dem Dorfplatz schläft
ein Herz, die Karte vom Händler ist oben leer («Hier geht es weiter. Wohin, wissen wir noch nicht.»), und am Ende
wird sie oben jedes Mal ein Stück länger, so wie die Dungeon-Karte mit jedem neuen Dungeon. Die Kapitel sind
Lore und nennen Dinge, die es als Gebäude nicht gibt (die Dorfbäckerei und ihre Bäckerin, singende Brunnen, die
Steuerprüfer der Hauptstadt); nur «Beim Graben für die Schmiede» (Kapitel 2) wurde an die Gildenstadt angepasst.
Ein Kapitel gilt als gelesen, sobald das Fenster offen war (`stadtweg.gelesen`).

## Spielstand

Feld `stadtweg: { stufe, herzsteine, gelesen }` im Spielstand; fehlt es, legt `stadtweg()` in `Stadtweg.ts` es
mit Stufe 1 an. Form in `src/systems/SpielstandSchema.ts`.

## Hängt an anderen Aufgaben

- Seit 19.10.2026 (Manager-Issue #21) geben Expeditionen wieder Fortschritt: besiegte Bosse und Gildenrang zählen
  für die Stadtstufen 4 bis 6 (Test: `tests/stadtwegBosse.test.ts`).
- Zahlen sind erste Werte; Balancing läuft über Manager-Issue #23.

## Nach Stufe 7

Das Banner zeigt «Endgame: Immer weiter nach oben» und «Ganz oben: n von m Dungeons besiegt». Das Fenster listet
die Dungeons über dem Vulkankern mit Häkchen (besiegt, offen oder was noch fehlt) und hat den Knopf «Zur
Dungeon-Karte». Neue Dungeons dort zählen von selbst mit (`gipfelDungeons()` in `src/data/routes.ts`).
