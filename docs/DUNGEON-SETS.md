# Dungeon-Sets

Christoph (20.10.2026): «Jeder Dungeon lässt eigene Ausrüstung fallen, die Helden sichtbar stärker macht.»
Jeder Dungeon hat darum ein eigenes Set aus drei Teilen. Diese Datei hält fest, wie die Sets wirken,
wie stark sie sind und wie ein neuer Dungeon sein Set bekommt.

## So wirkt es im Spiel

- **Beute.** Nach jedem Sieg kann ein Teil des Dungeon-Sets in der Truhe liegen. Das erste Teil
  eines Sets ist sicher, danach 50 % (Normal), 65 % (Schwer), 80 % (Albtraum) und 100 % (Infernal).
  Teile, die der Gilde fehlen, kommen zuerst. Sind alle drei da, kann jedes fallen, für einen zweiten Helden.
  Eine mutige Entscheidung der Dungeon-Geschichte kann ein Teil mehr versprechen («+1 Set-Teil, wenn ihr
  siegt»): Es kommt zum gewöhnlichen Wurf dazu, beim ersten Sieg sind es also zwei verschiedene
  (`docs/GESCHICHTEN.md`). Das Versprechen gilt nur, wenn der Boss besiegt ist; endet sein Kampf nach
  dem Rundenlimit, bleibt es beim gewöhnlichen Wurf (`dungeonBezwungen`).
- **Zwei Teile** geben Werte (z. B. +5 Angriff und +15 Leben), **drei Teile** die Set-Fähigkeit.
  Sie löst im Kampf sichtbar aus: grünes ✦-Banner und eine grüne Zeile im Kampfprotokoll.
  Zwei gleiche Teile zählen als eines.
- **Eigenschaften.** Ab Ebene 3 trägt jedes Teil eine Eigenschaft wie die übrigen Gegenstände
  dieser Ebenen (Doppelschlag, Reflexion …). Gleiche Eigenschaften zählen nicht doppelt, es gilt die stärkste.
- **Sichtbar** auf der Heldenseite (Platz oder Gegenstand antippen: Werte, Eigenschaft, Vergleich mit
  dem getragenen Teil, Set-Boni; Anlegen und Ablegen per Knopf), im Tab «Sets» (Sammlung je Dungeon),
  als Abzeichen im Inventar, auf den Routenkarten («🐺 Rudel des Waldpfads · 0 von 3»), bei der
  Team-Auswahl («Set-Beute … 50 % pro Sieg»), im Fenster der Dungeon-Karte und in der Truhe.

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/dungeonSets.ts` | Die Sets (`DUNGEON_SETS`), Werte je Bauart und Ebene (`ART_WERTE`), Eigenschaften (`ART_EIGENSCHAFT`) |
| `src/systems/DungeonSets.ts` | Getragene Sets, Set-Boni, Beute nach dem Sieg (`setBeute`) |
| `src/systems/Kampfeffekte.ts` | Wirkung der Set-Fähigkeiten und Eigenschaften im Kampf |
| `src/data/specialEffects.ts` | Namen und Beschreibungen aller Effekte (`SPECIAL_EFFECT_DEFS`) |
| `src/ui/components/SetAnzeige.ts` | Set-Abzeichen und Set-Zeilen für alle Ansichten |
| `src/ui/screens/HeroesScreen.ts` | Heldenseite: Auswahl, Vergleich, Tab «Sets» |
| `tests/dungeonSets.test.ts` | Regeln der Sets, Beute, Kampfeffekte, Stärke im Musterlauf |

## Wie stark ein Teil ist

- **Werte:** so gut wie die besten gewöhnlichen Gegenstände derselben Ebene und Bauart (`ART_WERTE`,
  Ebene 4 etwa wie Seelenbrecher, Drachenfürstplatte und Aetherkristall-Herz). Ein Set-Teil ist
  damit nie ein Rückschritt. Den Unterschied machen die Set-Boni.
- **Eigenschaft ab Ebene 3:** je Bauart eine feste (`ART_EIGENSCHAFT`: Klinge Doppelschlag, Schild
  Reflexion, Platte Feuerresistenz …). Ein Teil weicht davon ab (`eigenschaft` im Teil), wenn sein Set
  die Eigenschaft schon hat. Regeln, die der Test prüft:
  - jede Eigenschaft höchstens einmal im Set,
  - keine Eigenschaft, die die Drei-Teile-Fähigkeit schon gibt,
  - nur Eigenschaften aus `SPECIAL_EFFECT_DEFS`: `lifesteal`, `dodge`, `reflect`, `revive`,
    `double_strike`, `anti_heal`, `regen`, `aoe_resist`, `spell_power`, `fire_resist`, `stun_strike`.
- **Set-Boni:** Zwei Teile geben je Ebene etwas mehr (Ebene 1: +1 Angriff, +5 Leben; Ebene 5: +5 Angriff,
  +15 Leben; Ebene 6: +6 Angriff, +20 Leben). Die Drei-Teile-Fähigkeit ist das Besondere des Sets
  und passt zum Dungeon (Drachenhort: Drachengier, Gold macht stark).

## Ein Set für einen neuen Dungeon

1. **Eintrag** am Ende von `DUNGEON_SETS` in `src/data/dungeonSets.ts` (Reihenfolge der Dungeon-Karte):
   `id`, `routeId`, `name`, `zeichen` (ein Emoji), `tier` = Ebene der Route.
2. **Drei Teile** mit verschiedenen Plätzen, damit ein Held alle drei tragen kann: eine Waffe oder ein
   Schild, eine Rüstung und ein Schmuckstück. `bild` ist ein vorhandener Sprite-Key, `text` ein Satz
   mit Witz, der zum Dungeon passt. Die Gegenstände (`set_<set>_<bauart>`) entstehen von selbst.
3. **Ebene über 6:** `ART_WERTE` und `WERT_JE_EBENE` um eine Spalte verlängern (Typ `Reihe`), sonst
   bekommt das Set die Werte von Ebene 6. Die neuen Werte an den besten gewöhnlichen Gegenständen
   der Ebene ausrichten.
4. **Set-Boni:** `zweiTeile` etwas über der Ebene darunter. `dreiTeile` mit Name, Text und Effekten.
   Eine neue Fähigkeit braucht ihre Wirkung in `src/systems/Kampfeffekte.ts`, Name und Beschreibung in
   `SPECIAL_EFFECT_DEFS` und, falls ihre Kampfzeile eine eigene Farbe haben soll, `getLogLineColor` in
   `src/rendering/Colors.ts`. Ein Test für die Fähigkeit gehört in `tests/dungeonSets.test.ts`.
5. **Unterwasser:** `luftJeTeil` gibt Luft je getragenem Teil.
6. **Prüfen:** `npm test` (jede Route hat ein Set, Eigenschaften einmalig …), `npm run build`,
   `npm run validate-refs`, dann `npm run dungeon-eichung -- 200` und die Tabelle unten nachführen.
   Für einen Dungeon über dem Hort die Sets der Musterhelden (`MUSTER_SETS` in `src/data/musterteams.ts`)
   um eine Stufe mit dem neuen Set ergänzen.
7. **Eigene Bilder** für Set-Teile nur mit Christophs Okay (Kosten-Regel). Bis dahin tragen sie Bilder
   vorhandener Gegenstände mit dem Set-Zeichen darauf.

## Stärke (Eichung)

`npm run dungeon-eichung -- 200` misst die Musterteams zuerst in ihrer Ausrüstung
(Tabelle in `docs/NEUE-DUNGEONS.md`), dann in vollen Sets (`MUSTER_SETS`):

- **Sets aus Ebene 4:** Brom Festung (behält den Seelenbrecher), Grimm Magma-Wyrm, Lia Abyss, Sina Schatten.
- **Hort:** dasselbe, Grimm trägt das Set aus dem Drachenhort.

Stand 20.10.2026, mit Wegen (`docs/SPEZIALISIERUNG.md`), Siege von 200 Läufen (vorsichtig / klug / gierig):

| Dungeon | Team | eigene Ausrüstung | Sets aus Ebene 4 | dazu Grimm im Hort-Set |
|---|---|---|---|---|
| Der Drachenhort | frisch | 0 / 0 / 0 % | 50 / 3 / 0 % | 100 / 80 / 14 % |
| Der Drachenhort | gut | 80 / 58 / 3 % | 100 / 100 / 95 % | 100 / 100 / 100 % |
| Der Drachenhort | stark | 100 / 100 / 97 % | 100 / 100 / 100 % | 100 / 100 / 100 % |
| Das Himmelsarchiv | frisch | 0 / 0 / 0 % | 0 / 0 / 0 % | 0 / 0 / 0 % |
| Das Himmelsarchiv | gut | 0 / 0 / 0 % | 26 / 4 / 0 % | 62 / 32 / 7 % |
| Das Himmelsarchiv | stark | 53 / 32 / 3 % | 100 / 90 / 50 % | 100 / 100 / 89 % |

**So ist es gedacht:** Die Sets einer Ebene machen den nächsten Dungeon machbar. Mit Sets aus Ebene 4
wagt sich schon ein frisches Team in den Drachenhort, und mit dem Hort-Set rückt das Himmelsarchiv
für ein gutes Team in Reichweite (vorsichtig gut jeder zweite Lauf). Ohne Sets bleibt es das ferne Ziel.
Sets aus einer tieferen Ebene sind für ein Team mit besserer Ausrüstung ein Rückschritt; das zeigt
der Vergleich auf der Heldenseite. Wege und Sets verstärken sich gegenseitig, darum sind die Gegner der
zwei obersten Dungeons seit den Wegen stärker (`docs/SPEZIALISIERUNG.md`, «Eichung»).

**Letzte Bastion** (Set der Festung) zieht seit dem 20.10. genau 2 Runden lang alle Angriffe auf sich, wie ihr
Text sagt, auch in Belagerungen. Spott zählt seither ganze Runden (für die Bärengestalt der Druiden). Vorher
endete er nach dem zweiten eigenen Zug des Trägers und hielt in Belagerungen den ganzen Kampf. Die Tabelle oben
ist schon mit der neuen Regel gemessen; in den übrigen Dungeons ändern sich die Siege mit Sets kaum
(Festung «frisch» mit Sets aus Ebene 4: 1 von 40 Läufen vorher, 0 von 40 jetzt).

**Nach Manager #43 und #44 neu messen.** Mindestschaden und stärkere Startklassen verschieben alle Werte
(Vorab-Messung in `docs/NEUE-DUNGEONS.md`, «Eichung»).

## Offen

- **Eigenschaften ohne Wirkung:** Sechs gewöhnliche Gegenstände tragen Eigenschaften, die es in
  `SPECIAL_EFFECT_DEFS` nicht gibt und die darum nichts tun und nirgends angezeigt werden:
  `magic_resist` (T3-Platte), `piercing` (T4-Waffe), `evasion` (T4-Leder), `spell_amplify` (T4-Robe),
  `slow_on_hit` und `air_decay_resist` (Abyss-Gegenstände in `src/data/items.ts`).
- **Eigene Set-Bilder:** 75 Teile, etwa 0.06 USD je Bild, nur mit Christophs Okay.
