# Der Weg zur Magischen Stadt (18.10.2026)

Christophs Wunsch vom 18.10.2026 (Thread «Magic City: Bestandsaufnahme und Bot-Aufgaben»): eine Geschichte
einbauen, das Endgame bleibt aber der Dungeon, in dem man **endlos nach oben kämpft** und versucht, auf der
Rangliste oben zu bleiben. Dieses Paket baut den Weg dorthin: Die Stadt steigt in **7 Stadtstufen** auf, jede
Stufe erzählt ein Kapitel. Seit 20.10.2026 heisst «endlos nach oben»: Auf der Dungeon-Karte kommen immer wieder
neue Dungeons dazu (`docs/NEUE-DUNGEONS.md`). Die endlose Treppe, die Stufe 7 vom 19. bis 20.10. öffnete, ist
wieder entfernt.

Code: `src/data/stadtstufen.ts` (Stufen, Kapitel, Herzsteine), `src/systems/Stadtweg.ts` (Regeln),
`src/ui/screens/StadtwegFenster.ts` (Banner, Fenster, Hinweis), `src/ui/screens/StadtSilhouette.ts` (die Stadt
als Bild aus Code), `src/ui/html/stadtweg.css`. Tests: `src/systems/Stadtweg.test.ts`, `src/systems/Ausbau.test.ts`.

## Im Spiel

- **Hauptmenü:** Unter dem Titel steht ein Banner mit der Stadt als Nachtbild, Stufe, Name, einer Zeile zur Stadt
  und dem Fortschritt zur nächsten Stufe («2 von 4 erledigt»). Ist der Aufstieg möglich, leuchtet es golden;
  ein ungelesenes Kapitel zeigt «📜 Neues Kapitel».
- **Fenster** (Klick aufs Banner): grosses Bild, der Weg mit allen 7 Stufen, die Aufgaben der nächsten Stufe mit
  Häkchen, die Abgabe, die Belohnungen, der Knopf «Aufsteigen», die Stadtchronik und ab Stufe 6 das Arkane Herz.
- **Hinweis unten links:** Wird ein Aufstieg möglich, während man anderswo ist (z. B. Gebäude), erscheint einmal
  «Aufstieg bereit! … Ansehen». Nicht während einer Expedition.
- **Aufstieg:** zieht die Abgabe ab, gibt das Geschenk, zeigt die Feier («Aus dem Weiler wird ein Dorf!») mit dem
  neuen Kapitel. Das Bild wächst mit: Zelte → Hütten → Mühle und Bäckerei → Markt und Kirche → Mauer →
  Burg und Gerüst ums Herz → leuchtender Kristall und ein glühender Pfad über den Berg hinauf.

## Die Stufen

Aufgaben zählen live; die Abgabe zählt als ein Schritt («n von m erledigt»), bezahlt wird erst beim Aufstieg.

| Stufe | Name | Aufgaben für diese Stufe | Abgabe | Geschenk | Steuern |
|---|---|---|---|---|---|
| 1 | Lagerfeuer | – (Start) | – | – | – |
| 2 | Weiler | Steinbruch, Getreidefarm, 1 Expedition gewonnen | 40 Holz | 60 Gold | – |
| 3 | Dorf | Bäckerei, Eisenmine, 10 Bewohner, 3 Expeditionen gewonnen | 80 Holz, 30 Stein, 50 Gold | 120 Gold | – |
| 4 | Marktflecken | Schmiede, Marktplatz, 16 Bewohner | 120 Holz, 60 Stein, 150 Gold, 10 Eisen | – | +10 % |
| 5 | Stadt | Arkanschmiede, 3 verschiedene Bosse, 22 Bewohner | 200 Stein, 250 Gold, 20 Eisen, 5 Kristall | 200 Gold | +10 % |
| 6 | Grossstadt | Bank, Gildenrang IV, 5 verschiedene Bosse, 28 Bewohner | 300 Stein, 400 Gold, 40 Eisen, 10 Kristall | 300 Gold | +10 % |
| 7 | Magische Stadt | alle fünf Herzsteine eingesetzt | – | 500 Gold | +20 % |

«Steuern» ist das Stadtrecht: ein Aufschlag auf die Steuern der Bewohner, zusammen mit dem Marktplatz
(`bonus = 1 + (Markt-% + Stadt-%) / 100`, `src/systems/EconomySystem.ts`). Siege kommen aus
`statistics.total_victories`, Bosse aus `guildStats.bossesDefeatedIds` und dem Monsterbuch (nur Einträge mit
Rolle Boss), Bewohner aus `citizens` (Anzahl).

## Grenzen der Stadtstufe (wie das Rathaus bei Clash of Clans)

Die Stadtstufe bestimmt, wie weit ausgebaut werden darf. Im Gebäude-Fenster steht dann
«🔒 braucht Stadtstufe «Dorf» (Hauptmenü)», der Engpass-Satz in der Mindmap sagt dasselbe.
Bestehende Stufen aus alten Spielständen bleiben, gesperrt ist nur der nächste Ausbau.

| Stufe | Wohnviertel bis | Werkstätten bis | Marktplatz und Bank bis |
|---|---|---|---|
| 1 Lagerfeuer | 1 (6 Plätze) | 1 | 1 |
| 2 Weiler | 2 (12) | 1 | 1 |
| 3 Dorf | 3 (18) | 2 | 1 |
| 4 Marktflecken | 4 (24) | 2 | 2 |
| 5 Stadt | 5 (30) | 3 | 2 |
| 6 Grossstadt, 7 Magische Stadt | 6 (36) | 3 | 3 |

Die Bewohner-Aufgaben passen jeweils in das Wohnviertel, das die Stufe davor erlaubt (Test in
`Stadtweg.test.ts`). Gildenhaus, Brunnen und Lagerhaus haben keine Grenze.

## Das Arkane Herz (ab Stufe 6)

Fünf Herzsteine, je einer pro grossem Boss. Einsetzen geht, wenn der Boss besiegt ist und die Kosten da sind.

| Herzstein | Boss | Kosten |
|---|---|---|
| der Spinnenkönigin | `boss_spider_queen` | 150 Stein, 100 Gold |
| der Sumpfhydra | `boss_swamp_hydra` | 200 Holz, 150 Gold, 3 Kristall |
| des Leviathans | `boss_leviathan` | 30 Eisen, 200 Gold, 5 Kristall |
| des Magma-Wyrms | `boss_magma_wyrm` | 300 Gold, 8 Kristall |
| des Festungswächters | `boss_fortress_warden` | 50 Eisen, 400 Gold, 10 Kristall |

Im Bild wird das Gerüst um den Kristall mit jedem Stein heller; mit allen fünf erwacht das Herz (Stufe 7).

## Die Geschichte

Erzählt von **Ottokar, Stadtschreiber**, trocken und ein bisschen eitel. Kapitel: 1 Das Schild, 2 Die Steinplatte,
3 Das Brummen, 4 Die Karte, 5 Mehr, 6 Das Herz, 7 Die Karte wächst. Roter Faden: Unter dem Dorfplatz schläft
ein Herz, die Karte vom Händler ist oben leer («Hier geht es weiter. Wohin, wissen wir noch nicht.»), und am Ende
wird sie oben jedes Mal ein Stück länger, so wie die Dungeon-Karte mit jedem neuen Dungeon. Ein Kapitel gilt als gelesen, sobald das Fenster offen war (`stadtweg.gelesen`).

## Spielstand

Neues Feld `stadtweg: { stufe, herzsteine, gelesen }` im Spielstand. Es fehlt in älteren Spielständen und wird
beim ersten Zugriff mit Stufe 1 angelegt (`stadtweg()` in `Stadtweg.ts`); SaveVersion bleibt 21.
Wer schon weit ist, steigt schnell durch die ersten Stufen und bekommt dabei die Kapitel.

## Hängt an anderen Aufgaben

- Seit 19.10.2026 (Manager-Issue #21) geben Expeditionen wieder Fortschritt: besiegte Bosse und Gildenrang zählen
  für die Stadtstufen 5 und 6 (Test: `tests/stadtwegBosse.test.ts`).
- Die Steuer-Rechnung im Wohnviertel-Fenster nennt den Aufschlag als «+ N % Stadtrecht».
- Zahlen sind erste Werte; Balancing läuft über Manager-Issue #23.

## Nach Stufe 7

Das Banner zeigt «Endgame: Immer weiter nach oben» und «Ganz oben: n von m Dungeons besiegt». Das Fenster listet
die Dungeons über dem Vulkankern mit Häkchen (besiegt, offen oder was noch fehlt) und hat den Knopf «Zur
Dungeon-Karte». Neue Dungeons dort zählen von selbst mit (`gipfelDungeons()` in `src/data/routes.ts`).
