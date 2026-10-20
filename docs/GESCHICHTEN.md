# Geschichten der Dungeons

Wunsch (20.10.2026, über den Manager): Jeder Dungeon bekommt eine kurze Geschichte mit 2 bis 3 Entscheidungen
auf dem Weg, die Beute oder Gefahr verändern. Keine Zufalls-Witz-Ereignisse, Christoph will echte Story.
Erzählt wird sie von Ottokar, dem Stadtschreiber, der auch die Stadtchronik führt (`docs/STADTWEG.md`).

## Im Spiel

- **Erster Aufbruch** in einen Dungeon: die Einleitung des Stadtschreibers, Knopf «AUFBRECHEN». Danach steht
  sie im Fenster der Dungeon-Karte («📜 Geschichte: …», zum Aufklappen).
- **Unterwegs**, nach bestimmten Räumen: eine Entscheidung mit zwei Knöpfen, unter jedem die Folgen
  (grün der Gewinn, rot die Gefahr). Der erste Knopf ist die vorsichtige Option, der zweite die mutige.
  Darüber steht das Leben der Gruppe, weil es für die Wahl zählt.
- **Drachenhort und Himmelsarchiv** haben schon feste Wahl-Räume (Hort-Gold, verbotene Bücher). Dort erzählt
  die Geschichte über diese Räume, ohne zusätzliche Entscheidungen.
- **Nach der Expedition** steht im Bericht die Chronik: ein Satz zu jeder Entscheidung dieses Laufs. Nach dem
  ersten Sieg kommt der Schluss dazu, danach steht er auf der Karte («✓ erlebt»).
- **Expeditionsfenster:** Im Band über dem Team steht «📜 Geschichte: Titel · 3 Entscheidungen unterwegs».

Ein Bosskampf kann nach dem Rundenlimit ohne Sieger enden (`CombatEngine`, 20 Runden). Der Dungeon zählt dann
als geschafft, die Geschichte aber nicht als erlebt, weil der Boss noch lebt (`dungeonBezwungen`).

## Wirkungen

| Wirkung | Im Spiel | Was passiert |
|---|---|---|
| `gold(60)` | +60 Gold | Kommt zur Beute des Laufs |
| `ding('healing_potion', 2)` | +2× Heiltrank | Kommt zur Beute des Laufs |
| `heilen(15)` | Alle +15 % Leben | Jeder lebende Held, höchstens bis zum vollen Leben |
| `leben(10)` | Alle −10 % Leben | Jeder lebende Held, nie das letzte Leben |
| `gegner(25)`, `gegner(20, 2)` | Gegner im nächsten Kampf 25 % stärker | Leben und Angriff der nächsten Kämpfe (ohne Boss); negativ = schwächer |
| `boss(15)` | Uralter Treant 15 % stärker | Leben und Angriff des Bosses; negativ = schwächer |
| `setTeil` | 🌳 +1 Set-Teil, wenn ihr siegt | Ein Teil des Dungeon-Sets mehr, zum gewöhnlichen Wurf dazu. Beim ersten Sieg (da ist ein Teil ohnehin sicher) also zwei verschiedene |
| `xp(30)` | +30 XP für alle | Für jeden lebenden Helden |

Alle Wirkungen kommen ohne Zufall aus, die übrigen Würfe einer Expedition bleiben gleich.

## Eine Geschichte schreiben

- **Stimme:** Ottokar schreibt trocken und mit Witz, aber es muss etwas passieren: ein Ziel, ein Einsatz, ein Ende.
  Keine Zufalls-Witz-Ereignisse. Figuren aus der Stadt (Jorinde, die Bäckerin, der Glaser …) dürfen wiederkommen.
- **Schweizer Schreibweise:** «ss» statt «ß» (der Test prüft das).
- **Länge:** Einleitung etwa drei Sätze, Lage ein bis drei Sätze, Knopf wenige Worte, Nachklang ein Satz
  (in der Wir-Form, er steht in der Chronik), Schluss zwei bis drei Sätze.
- **Platz:** `nachRaum` ist der Index des Raums (0 = erster). Danach kommt ein Kampf, eine Befestigung, eine
  Gefahr oder ein Kontrollpunkt, nie der letzte Raum. Nach Raum 2, 5, 8 … folgt gleich der Kontrollpunkt-Dialog;
  das geht (Sumpfdorf), ist aber seltener schön.
- **Jede Gefahr trifft:** Nach der Entscheidung kommt noch ein Kampf (`gegner`, `leben`), für `boss` der Boss.
  `boss` nur in Dungeons mit Boss, `setTeil` nur mit Set (der Test prüft alles drei).
- **Vorsichtig** (`sicher`): etwas Gutes ohne Gefahr (Heilung, XP, ein paar Gegenstände). Höchstens eine
  Schwächung von Boss oder Gegnern pro Geschichte, und nur um 10 %: Der Boss ist am Rundenlimit oft der
  Engpass, jedes Prozent weniger zählt dort fast eins zu eins. Eine echte Abwägung ist erlaubt
  (Magmahöhlen: «Um den See herum» kostet keine Hitze, aber Kämpfe).
- **Mutig** (`mutig`): Beute (Gold, Gegenstände, +1 Set-Teil) und eine Gefahr: nächster Kampf +20 bis 30 %,
  zwei Kämpfe +20 bis 25 %, Boss +10 bis 20 % oder Leben −10 bis 15 %. Leben allein ist eine schwache Gefahr,
  wenn gleich eine Rast folgt.

## Eichung

`npm run geschichten-eichung -- 100` sucht für jeden Dungeon den Gegner-Faktor, bei dem das Musterteam «frisch»
die Hälfte der Läufe gewinnt: ohne Entscheidungen, immer vorsichtig, immer mutig (Spielweise «gierig»).
Ziel: **vorsichtig 0 bis +12 %** (etwas leichter), **gierig −12 bis −25 %** (spürbar schwerer).
Messrauschen etwa ±2 %.

Stand 20.10.2026, 100 Läufe je Messpunkt. Drachenhort und Himmelsarchiv fehlen, sie haben keine eigenen Entscheidungen.

| Dungeon | Faktor ohne Entscheidungen | vorsichtig | gierig |
|---|---|---|---|
| Waldpfad (kurz) | 7.00 | +0.0 % | −15.7 % |
| Verfallene Lichtung | 5.67 | +0.0 % | −18.8 % |
| Tiefwald (mittel) | 3.23 | +10.0 % | −21.5 % |
| Tiefe Höhle | 2.71 | +9.3 % | −21.5 % |
| Spinnenhoehle | 3.25 | +3.9 % | −19.6 % |
| Versunkene Küste | 3.89 | +2.9 % | −19.2 % |
| Geisterwald | 4.33 | +0.0 % | −15.4 % |
| Verschlungene Tunnel | 4.37 | +0.7 % | −23.9 % |
| Sumpfdorf | 4.60 | +0.0 % | −17.4 % |
| Giftsumpf | 2.25 | +10.9 % | −14.3 % |
| Alte Krypta | 2.32 | +9.9 % | −23.5 % |
| Die Stadtmauern | 0.94 | +10.6 % | −12.6 % |
| Abgrundtiefen | 1.46 | +10.3 % | −14.6 % |
| Kristallminen | 3.40 | +0.0 % | −17.6 % |
| Gefrorener Pass | 3.80 | +0.9 % | −21.1 % |
| Obsidiantunnel | 3.50 | +0.0 % | −20.0 % |
| Tiefe Ruinen | 3.00 | +0.0 % | −12.5 % |
| Vulkankern | 1.92 | +11.2 % | −23.4 % |
| Die Festung | 0.62 | +9.6 % | −14.3 % |
| Abyssale Tiefe | 2.62 | +5.0 % | −18.8 % |
| Schattenkatakomben | 3.17 | +8.3 % | −21.0 % |
| Aschewüste | 3.00 | +4.2 % | −16.9 % |
| Magmahöhlen | 3.00 | +1.4 % | −20.8 % |

Am 20.10. zuerst zu stark und darum geändert: zwei Schwächungen des Bosses in einer Geschichte oder eine um 15 %
(Vulkankern +29 %, Abgrundtiefen +31 %, Tiefwald +18 %, Giftsumpf +18 %), Gegner −20 % für zwei Kämpfe
(Stadtmauern, Festung, Schattenkatakomben), zwei Kämpfe +30 % (Tunnel −31 %). Zu schwach waren das Set-Teil
in der Aschewüste für nur −10 % Leben vor einer Rast und die Obsidiantunnel (−9 %, jetzt zwei Kämpfe +25 %).
Ändern sich Gegner eines Dungeons (z. B. die Belagerung), die Zeile nachmessen.

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/dungeonGeschichten.ts` | Die Geschichten (`DUNGEON_GESCHICHTEN`), eine je Route |
| `src/systems/Geschichten.ts` | Wann eine Entscheidung ansteht, was sie bewirkt, Chronik und Spielstand |
| `src/ui/components/GeschichtsAnzeige.ts`, `src/ui/html/geschichten.css` | Einleitung, Knöpfe mit Folgen, Chronik, Block auf der Karte |
| `src/systems/ExpeditionSystem.ts` | Entscheidung nach dem Raum (`processCurrentRoom`), Wirkung (`applyEncounterChoice`), Chronik (`resolveChoice`) |
| `src/main.ts` | Einleitung beim ersten Aufbruch, Entscheidungs-Fenster, Chronik im Bericht |
| `src/systems/DungeonSets.ts` | Das versprochene Set-Teil (`setBeute`) |
| `src/systems/Musterlauf.ts` | vorsichtig = sichere Option, gierig = mutige, klug = mutig ab 85 % Leben |
| `tools/geschichtenEichung.ts` | Die Eichung oben |
| `tests/geschichten.test.ts` | Daten und Regeln |

Eine Entscheidung ist eine Begegnungs-Wahl (`ExpeditionRun.pendingChoice`) mit `effect: 'geschichte'`, Option A
ist die vorsichtige. Der Spielstand merkt sich `geschichten = { gelesen, erlebt }` (fehlt bei alten Spielständen,
keine neue SaveVersion), der Lauf `chronik`, `setTeilVersprochen` und `setTeilExtra`. Die Texte liegen im Build
als eigene Datei (`vite.config.ts`), damit die Warnung ab 500 kB weiter nur das Wachstum des Spielcodes zeigt.
