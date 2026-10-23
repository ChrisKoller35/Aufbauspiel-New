# Monsterbuch

Das Monsterbuch (Taste K oder Knopf «📖 Monsterbuch» im Expeditionen-Bildschirm) führt eine
**Jagdstrecke**: wie oft die Gilde jeden Gegner besiegt hat. Daraus folgen Kenntnisstufen je
Gegner, eine Seite je Dungeon und einmalige Seitenprämien in Gold.

- Logik: `src/systems/Monsterkunde.ts` (ohne DOM), Eintragen nach jeder Expedition:
  `BestiariumSystem.processExpeditionEnd`
- Bildschirm: `src/ui/screens/BestiariumScreen.ts`, Stile `src/ui/html/monsterbuch.css`
- Randnotizen: `src/data/monsterbuchNotizen.ts`
- Tests: `tests/monsterbuch.test.ts`

## Was gezählt wird

Nach jeder Expedition (Sieg, Niederlage, Rückzug) zählen nur Räume, die gespielt wurden
(`room.completed`). Dazu gehört der Raum, in dem das Team fällt; Räume danach nicht.

- **Gesichtet**: jeder Gegner in einem gespielten Raum.
- **Strecke**: jeder Gegner, der dort mit `hp <= 0` endet, zählt +1. Zwei Waldwölfe im selben Raum zählen +2.
  Test «zwei Wölfe im Raum zählen 2»: Das Musterteam «stark» mit festem Startwert schafft den Waldpfad
  jedes Mal, auch den vierten Raum mit den zwei Wölfen; nach dem Lauf stehen 3 Wölfe in der Strecke.

Beispiel Rückzug nach Raum 2 im Tiefwald (Boss: Uralter Treant): Gesichtet sind die Gegner
der Räume 1 und 2 (Waldwolf, Waldspinne, Waldbandit), der Treant nicht. Bisher stand nach so
einem Lauf jeder Gegner der ganzen Route im Buch, auch der Boss. Test: «Rückzug nach Raum 2».

Nicht gezählt werden:

- Gegner aus Räumen, die nach einem Rückzug oder einer Niederlage nicht mehr gespielt wurden.
- Gegner, die einen Kampf überleben (Rundenlimit, Belagerungsraum mit zerstörter Befestigung).
- Beschwörungen: Sie erzeugen keine Gegner, sie geben dem Beschwörer nur Angriff (`CombatEngine.ts`).

Von den 97 Gegnern in `ENEMY_DEFS` kommen **85** in einer Route von `ROUTE_DEFS` vor. Nur sie
zählen, auf den Seiten und in der Kopfzeile «Gesichtet x/85 · Besiegt y/85» (`getProgress`).
Die 12 anderen erscheinen nirgends. Die Zahl rechnet der Test aus `ROUTE_DEFS`; er prüft auch,
dass es mindestens 50 sind (Erfolg `monsterbuch_50`).

### Alte Spielstände

- Eine ID in `defeated` ohne Zahl in der Strecke zählt als 1 Sieg.
- Was schon in `discovered` steht, bleibt stehen, auch wenn es nach der alten Regel (ganze
  Route) hineinkam. Die Erfolge `monsterbuch_25` und `monsterbuch_50` zählen `discovered`; ein
  Spieler soll keinen Erfolgsfortschritt verlieren. Im Buch zeigen solche Gegner «Gesichtet»
  ohne Siege.

### Speichern

`state.bestiarium` bekommt zwei Zusatzfelder, gelesen und geschrieben nur in `Monsterkunde.ts`:

- `strecke`: Objekt Gegner-ID → Anzahl. Beim Lesen bereinigt: nur Schlüssel aus `ENEMY_DEFS`,
  nur ganze Zahlen ≥ 0 (Text, NaN und negative Zahlen zählen 0, Kommazahlen werden abgerundet).
- `praemien`: Liste wie `forest_short:erforscht`, nur Buchstaben, Ziffern, `_` und `:`.

`GameState.ts`, das Schema und die SaveVersion (24) bleiben unverändert; `SaveSystem.save`
speichert die Felder mit, das Schema lässt sie durch (Tests «Speichern»).

## Kenntnisstufen

| Stufe | normaler Gegner | Boss | was man sieht |
|---|---|---|---|
| Gesichtet | im Kampf gesehen | im Kampf gesehen | Name, Bild, Rolle, Fundorte |
| Bekannt | 1 besiegt | 1 besiegt | Hintergrund, Werte, Fähigkeiten, Wut, Gold-Spanne, XP |
| Erforscht | 10 besiegt | 3 besiegt | Beutetabelle mit Chance und Menge; Randnotiz, wenn die ganze Seite erforscht ist |
| Gemeistert | 30 besiegt | 10 besiegt | goldener Rand, Stern |

Jede Karte hat einen Balken bis zur nächsten Schwelle («12/30»).

Angaben im Detailfenster, wie das Spiel rechnet (`CombatEngine.rollLoot`):

- **Gold**: «8–14 Gold je Sieg» aus `guaranteedGold` der Beutetabelle. Klebrige Finger
  (`goldFaktor`) bringt mehr. `goldReward` aus `enemies.ts` benutzt das Spiel nicht, das Buch zeigt es nicht mehr.
- **Fund**: genau ein Gegenstand je Sieg; Chance = Gewicht / Summe der Gewichte, Menge von `minQty`
  bis `maxQty`. Der Test zieht 10 000-mal mit `rollLoot` und vergleicht (höchstens 2 Prozentpunkte daneben).
- **XP**: geteilt unter den Helden, die den Kampf überleben.
- **Rolle** unter dem Namen, ohne Doppel: «💀 Boss» (früher «💀 Boss · BOSS»).

### Fähigkeiten und Wut, wie der Kampf sie einsetzt

Die Texte im Fenster kommen aus `faehigkeitText` (`Monsterkunde.ts`) und folgen der Regel in
`CombatEngine.processCombat`, nicht den Beschreibungen in `enemies.ts`. Die versprachen bei
Heilung zu kleine Zahlen, bei Stärkung Abwehr und bei Beschwörung Verstärkung.

| Art | Text im Fenster | was der Kampf tut |
|---|---|---|
| Schaden | «Trifft einen Helden mit dem 1,5-fachen Schaden eines normalen Angriffs.» | ein Ziel, bei `all_players` alle; im Belagerungsraum nie die Kriegsmaschine |
| Flächenschaden | «Trifft alle Helden mit dem 0,5-fachen Schaden …» | jeder lebende Held, nie die Kriegsmaschine |
| Heilung | «Heilt den Verbündeten mit den wenigsten Leben um 24, auch sich selbst.» | Gegner mit den wenigsten Leben, um die Stärke der Fähigkeit (trifft ihn ein Held mit Wundfluch, nur halb) |
| Heilung (kämpft immer allein, z. B. jeder Boss) | «Heilt sich um 36 Leben.» | wie oben, er ist der einzige |
| Stärkung | «Gibt sich selbst 5 Angriff mehr, 3 Runden lang.» | Angriff, nie Abwehr |
| Beschwörung | «Ruft niemanden herbei, sondern gibt sich selbst 3 Angriff mehr, 4 Runden lang.» | keine neuen Gegner |
| Luftraub | «Zieht 10 Luft aus dem Luftschild, ohne Schaden.» | `luftsauger` 10, `blasenstoss` 8 (Tabelle in `processCombat`) |

Bei Stärke 1 heisst es «mit dem Schaden eines normalen Angriffs» statt «mit dem 1-fachen …»
(Säure, Dreifachbiss, Steinschlag, Magmawelle und Torschlag, alle fünf Flächenschaden).

Die Art steht vor der Abklingzeit, ausser sie ist schon der Name (die «Heilung» des Waldschamanen
zeigt nur «Abklingzeit 4 Runden»). Dahinter die Runden des Einsatzes aus `einsatzRunden`:
«Einsatz in Runde 1, 5, 9 …». In jedem Zug geht ein Gegner seine Fähigkeiten der Reihe nach durch;
eine mit Abklingzeit zählt eins herunter und wird übersprungen, auch im Zug, in dem sie auf 0
fällt; die erste bereite setzt er ein, die danach zählen in diesem Zug nicht. Abklingzeit N heisst
also: frühestens N + 1 Runden später wieder. Eine zweite Fähigkeit wartet, solange die erste vorgeht
(Rindenwall des Treants: Runde 2, 10, 18; Neuauflage des Oberarchivars: Runde 3 und 14).
Gerechnet ohne ausgesetzten Zug (Betäubung verschiebt alles) bis Runde 20, für Gegner aus
Belagerungsräumen bis Runde 30 (`kampfRunden`, wie `processFortificationCombat`): Die
Schutzbarriere des Kampfmagiers zeigt darum «Einsatz in Runde 2, 9, 17 …».

**Wut**: «Wut ab Runde 8: Angriff ×1,5, Tempo ×1,3». Ziehen Wahlen unterwegs die Wut vor
(`bossWutFrueher`, die Sonnenuhr im Morgentor: dreimal 2 Runden), steht darunter, bis auf welche
Runde (`wutVorziehbar`, gerechnet wie `CombatEngine.wutAbRunde`): Sunna ab Runde 4 statt 10.
Bei keinem anderen Boss rückt die Wut.

**Felder, die im Kampf nicht ankommen**: `CombatEngine.enemyToCombatUnit` übernimmt zwei Felder
aus `enemies.ts` nicht, und das Buch beschreibt, was der Kampf tut:

- Die Druckwelle des Leviathans hat `drainAirAmount: 18`, nimmt im Kampf aber keine Luft. Das Buch
  nennt bei ihr keine Luft.
- Mauerschütze, Armbrustschütze und Kampfmagier haben `prefersWarMachineTarget`, greifen im
  Belagerungsraum aber wie alle anderen die Helden an, nie die Kriegsmaschine. So steht es bei den
  Fähigkeiten im Fenster («Trifft einen Helden …») und in der Notiz zu den Stadtmauern. Ihr
  Hintergrund (`ENEMY_LORE`, unverändert) sagt noch, sie zielten auf Kriegsmaschinen; die Notiz
  nennt das ihren Ruf.

Wird eins davon im Kampf behoben, scheitert der Test «faehigkeitText sagt, was der Kampf tut», bei
der Kriegsmaschine auch der Test der Notiz; beide zeigen, wo Fenster und Notiz nachziehen.

Tests «Fähigkeiten im Fenster = Fähigkeiten im Kampf»: Für jeden erreichbaren Gegner kämpft ein
unverwundbares Team gegen ihn (`processCombat`, für die fünf Gegner aus Belagerungsräumen auch
`processFortificationCombat` neben einem Katapult), verglichen werden die Runden jedes Einsatzes
und das Kampfprotokoll (Zahl der Treffer, keiner auf das Katapult, Heilmenge, Angriff und Dauer,
Luft in beide Richtungen).

## Seiten und Prämien

Eine Seite je Dungeon in der Reihenfolge von `DUNGEON_GRAPH`. Ein Gegner, der in mehreren
Dungeons lebt, steht auf jeder dieser Seiten, mit derselben Strecke.

- **Erforscht-Prämie**: alle Gegner der Seite erforscht → Knopf «Prämie abholen: +N Gold».
  N = Gold, das ein Sieg dort im Mittel bringt: Summe über alle Gegner der Route von
  (min + max) / 2 aus `guaranteedGold`, ohne `goldFaktor`, auf 10 gerundet, mindestens 10.
- **Gemeistert-Prämie**: alle gemeistert → 3 × N, und die Seite zeigt «⭐ Gemeistert».
- Jede Prämie geht einmal. `praemieAbholen` prüft das selbst; der Knopf sperrt sich beim ersten Klick.
- Ottokars Randnotiz erscheint, wenn alle Gegner der Seite erforscht sind.

«Siege bis» = gewonnene Läufe ab null, nach denen jeder Gegner der Seite die Stufe hat:
das Grösste über alle Gegner von ⌈Schwelle / Begegnungen je Lauf⌉ (aus `ROUTE_DEFS`; Test
«jede Seite ist mit höchstens 10 Siegen erforscht und mit höchstens 30 gemeistert»).

| Ebene | Dungeon | Gegnerarten | Siege bis erforscht | Siege bis gemeistert | Prämie N | Prämie 3 × N |
|---|---|---|---|---|---|---|
| 1 | Waldpfad (kurz) | 4 | 10 | 30 | 30 | 90 |
| 1 | Verfallene Lichtung | 4 | 10 | 30 | 30 | 90 |
| 2 | Tiefwald (mittel) | 7 | 10 | 30 | 70 | 210 |
| 2 | Geisterwald | 6 | 10 | 30 | 50 | 150 |
| 2 | Versunkene Küste | 4 | 10 | 30 | 70 | 210 |
| 3 | Abgrundtiefen | 6 | 5 | 15 | 210 | 630 |
| 4 | Abyssale Tiefe | 5 | 10 | 30 | 130 | 390 |
| 2 | Tiefe Höhle | 6 | 10 | 30 | 90 | 270 |
| 2 | Spinnenhöhle | 5 | 10 | 30 | 70 | 210 |
| 2 | Verschlungene Tunnel | 4 | 10 | 30 | 50 | 150 |
| 3 | Kristallminen | 4 | 10 | 30 | 70 | 210 |
| 3 | Giftsumpf | 8 | 10 | 30 | 130 | 390 |
| 2 | Sumpfdorf | 4 | 10 | 30 | 30 | 90 |
| 3 | Die Stadtmauern | 5 | 10 | 30 | 210 | 630 |
| 3 | Gefrorener Pass | 4 | 10 | 30 | 80 | 240 |
| 4 | Die Festung | 5 | 3 | 10 | 410 | 1230 |
| 3 | Alte Krypta | 7 | 10 | 30 | 160 | 480 |
| 4 | Tiefe Ruinen | 7 | 5 | 15 | 220 | 660 |
| 4 | Schattenkatakomben | 6 | 5 | 15 | 160 | 480 |
| 3 | Obsidiantunnel | 5 | 10 | 30 | 140 | 420 |
| 4 | Aschewüste | 6 | 10 | 30 | 170 | 510 |
| 4 | Magmahöhlen | 6 | 5 | 15 | 200 | 600 |
| 4 | Vulkankern | 7 | 10 | 30 | 300 | 900 |
| 5 | Der Drachenhort | 5 | 4 | 10 | 510 | 1530 |
| 6 | Das Himmelsarchiv | 5 | 4 | 10 | 620 | 1860 |
| 7 | Die Sternenschmiede | 5 | 3 | 10 | 720 | 2160 |
| 8 | Der Sternenschlund | 5 | 3 | 10 | 820 | 2460 |
| 9 | Der Mondhof | 5 | 3 | 10 | 920 | 2760 |
| 10 | Das Morgentor | 5 | 3 | 10 | 1010 | 3030 |

Die Seiten mit 30 Siegen hängen an einem Gegner, der nur einmal je Lauf vorkommt (zum Beispiel
die Waldspinne auf dem Waldpfad). Im Test spielt das Musterteam «stark» den Waldpfad bis zum
30. Sieg: Danach ist die Seite gemeistert, und beide Prämien (30 und 90 Gold) gehen genau einmal.

### Versuche laut Musterlauf (Ebene 1 und 2)

Gerechnet mit `siegeVon(route, team, 'klug', 100)` aus `src/systems/Musterlauf.ts`, Versuche =
⌈Siege bis × 100 / Siege in 100 Läufen⌉:

| Dungeon | Team «frisch» (Stufe 10): Siege in 100 | Versuche bis erforscht / gemeistert | Team «gut» (Stufe 12): Siege in 100 | Versuche bis erforscht / gemeistert |
|---|---|---|---|---|
| Waldpfad (kurz) | 100 | 10 / 30 | 100 | 10 / 30 |
| Verfallene Lichtung | 100 | 10 / 30 | 100 | 10 / 30 |
| Tiefwald (mittel) | 100 | 10 / 30 | 100 | 10 / 30 |
| Geisterwald | 100 | 10 / 30 | 100 | 10 / 30 |
| Versunkene Küste | 100 | 10 / 30 | 100 | 10 / 30 |
| Tiefe Höhle | 100 | 10 / 30 | 100 | 10 / 30 |
| Spinnenhöhle | 100 | 10 / 30 | 100 | 10 / 30 |
| Verschlungene Tunnel | 100 | 10 / 30 | 100 | 10 / 30 |
| Sumpfdorf | 100 | 10 / 30 | 100 | 10 / 30 |

Die Musterteams sind stärker als ein Spieler am Anfang (ein Guardian auf Stufe 1); sie verlieren
auf Ebene 1 und 2 keinen Lauf. Wer früher hingeht, braucht mehr Versuche. Verlorene Läufe zählen
aber mit: Was vor der Niederlage fällt, steht in der Strecke.

## Randnotizen

Je Dungeon eine, 2 bis 3 Sätze, mit einem Gegner der Seite beim Namen. Was sie über den Kampf sagen,
stimmt mit dem Spiel, und der Test rechnet es nach: Jede Stelle mit «Runde» oder «Runden», mit
«jede» oder «alle» und einer Zahl (Wort oder Ziffer), mit «Luft» (auch «Luftsauger») oder mit
«Kriegsmaschine» muss in einem Eintrag einer dieser Tabellen in `tests/monsterbuch.test.ts` stehen,
sonst scheitert er («alle 2 Runden», «jede Runde» oder «nach zwei Runden wieder bereit» ohne
Eintrag fallen durch):

| Tabelle | Beispiel aus einer Notiz | nachgerechnet |
|---|---|---|
| `TAKT` | «jede vierte Runde», «nur in Runde 3 und 14» | Runden jedes Einsatzes im echten Kampf; Abstand und genannte Runden passen dazu |
| `WUT` | «ab Runde 8 wütend, Angriff mal 1,5, Tempo mal 1,3»; Sonnenuhr «dreimal vorgestellt … ab Runde 4» | `bossWut` und `wutAbRunde` mit den Sonnenuhren der Route |
| `WIRKUNG` | «3 Angriff mehr für drei Runden», «10 Luft» | dieselben Zahlen in der Zeile des Kampfprotokolls beim ersten Einsatz |
| `KRIEGSMASCHINE` | «sollen es auf die Kriegsmaschine abgesehen haben, schiessen aber auf die Helden» | `processFortificationCombat` mit Katapult: Treffer auf Helden, keiner auf das Katapult |

Die Morgentor-Notiz nennt die Sonnenuhr (Sunnas Wut bis Runde 4). Die Stadtmauern-Notiz stellt
den Ruf von Mauerschütze und Armbrustschütze richtig: Ihr Hintergrund im Fenster sagt, sie zielten
auf Kriegsmaschinen, im Kampf schiessen sie auf die Helden (siehe «Felder, die im Kampf nicht
ankommen»).

## Bildschirm

- **Seitenwahl am PC**: eine Knopfleiste; die gewählte Seite ist gedrückt (`aria-pressed`, goldener Rand).
- **Seitenwahl am Handy** (Breite bis 700 px oder Höhe bis 500 px): statt 29 Knöpfen eine Zeile mit
  Auswahlliste und ‹ › zum Blättern (je 44 × 44 px), damit Seitentitel und erste Karten ohne
  Scrollen im Bild stehen. `monsterbuch.css` zeigt je nach Grösse die eine oder die andere.
- Beim Seitenwechsel wird nur das Blatt darunter neu gezeichnet: Knopf, Liste oder Pfeil behalten
  den Fokus. Sperrt sich der Pfeil am Buchende, geht der Fokus auf die Liste.
- **Detailfenster**: scrollt selbst, das ✕ (44 × 44) klebt oben rechts und bleibt beim Scrollen im
  Bild. Ein langer Name («Tropfsteinfledermaus») bricht um und läuft nicht unter das ✕; bis
  480 px Breite werden Bild und Rand kleiner.
- Doppelklick oder Doppeltipp auf eine Karte: Der zweite Klick trifft das eben geöffnete ✕ und
  schliesst nicht (`e.detail > 1`, wie im Spielstand-Fenster). Ein Doppelklick markiert keinen Text.
