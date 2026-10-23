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
- **Fähigkeiten** auf Deutsch: Schaden, Flächenschaden, Heilung, Stärkung, Beschwörung, Luftraub;
  «Abklingzeit 3 Runden»; «Wut ab Runde 8: Angriff ×1,5, Tempo ×1,3».

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
