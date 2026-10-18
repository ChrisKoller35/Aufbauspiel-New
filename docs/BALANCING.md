# Magic City – Balancing

## 1. Alle Zutaten erreichbar (18.10.2026)

Ausgangslage (`docs/BESTAND.md`): Wasser, Glutwurzel, Schimmerpilz, Sumpfblüte, Knochenstaub und Mondkraut
gab es nie, 5 von 7 Trank-Rezepten im Kräutergarten waren unmöglich. Kristallsplitter fielen fast nur bei Bossen.
Der Test `src/data/zutaten.test.ts` prüft jetzt, dass jede Zutat aus Beute (Gegner auf einer Route) oder aus einem
Rezept kommt, dessen Zutaten selbst erreichbar sind.

### Wasser

| Rezept | vorher | jetzt |
|---|---|---|
| Manatrank | Schimmerpilz 1 + Wasser 1, Brunnen nötig | Schimmerpilz 1, Brunnen nötig |
| Titan-Gebräu | Knochenstaub 1 + Wasser 1, Brunnen nötig | Knochenstaub 1, Brunnen nötig |
| Schnelligkeitstrank | Mondkraut 2 + Wasser 1, Brunnen nötig | Mondkraut 2, Brunnen nötig |

Begründung: Die Rezepte hatten schon `requirements.waterSupplied`, Wasser also doppelt verlangt. So funktionieren
auch Brot, Kräuter und Heiltrank. Ein Wasser-Rezept am Brunnen hätte den Brunnen zur Werkstatt mit Arbeiter und
Ausbaustufen gemacht und nur Klickarbeit gebracht. Das Item `water` bleibt in `items.ts`, es wird nur nicht mehr verlangt.

### Seltene Kräuter (Gewicht in der Tabelle, Menge je Treffer)

| Kraut | Tabelle | Gewicht | Menge | erwartet je Lauf |
|---|---|---|---|---|
| Glutwurzel | `loot_volcano_common` / `_rare` / Magma-Wyrm | 15 / 12 / 10 | 1-2 / 1-3 / 2-4 | Obsidiantunnel 2,4 · Vulkankern 4,3 |
| Schimmerpilz | `loot_cave_common` / `_rare` | 10 / 12 | 1 / 1-2 | Tiefe Höhle 0,9 · Kristallminen 0,8 |
| Sumpfblüte | `loot_swamp_common` / `_rare` / Sumpfhydra | 15 / 15 / 15 | 1-2 / 1-2 / 2-4 | Sumpfdorf 1,0 · Giftsumpf 2,9 |
| Knochenstaub | `loot_ruins_common` / `_rare` / Gefallener Ritter | 15 / 12 / 10 | 1-2 / 1-3 / 2-3 | Alte Krypta 2,6 · Gefrorener Pass 1,8 |
| Mondkraut | `loot_haunted_common` (neu) | 40 | 1-2 | Geisterwald 1,8 (+ Fund-Raum: 2) |

Begründung: Jedes Kraut kommt aus dem Gebiet, nach dem es klingt. Ein Lauf im passenden Gebiet reicht für etwa
einen Trank. Die Kräuter verdrängen dort nur wenig andere Beute (rund 10 bis 15 % Anteil). Der Geisterwald hatte
nur Gegner, die er sich mit dem Tiefwald teilt. Darum sind 3 der 4 Waldgeister dort jetzt Verfluchte Irrlichter
(gab es schon, wurden nirgends eingesetzt), nie zwei im selben Kampf, weil sie heilen. Ihre Tabelle
`loot_haunted_common` hat Mondkraut. Der Fund-Raum bietet Mondkraut statt Grünkraut an.

### Kristallsplitter

| Quelle | vorher | jetzt |
|---|---|---|
| Kristallkäfer (`loot_crystal_beetle`, neu) | `loot_cave_common`, kein Splitter | **garantiert 1** |
| `loot_cave_common` | – | Gewicht 6, Menge 1 |
| `loot_cave_rare` | Gewicht 5, Menge 1 | Gewicht 15, Menge 1-2 |
| `loot_forest_rare` (Bären, Moosgolem) | – | Gewicht 6, Menge 1 |
| Uralter Treant | Gewicht 8 | Gewicht 12 |
| Kristallgolem | Gewicht 15 | Gewicht 25 (2-4) |
| Tiefe Höhle | Goblin + Höhlenschleim | Goblin + **Kristallkäfer** |

Erwartete Splitter je Lauf (Wert aus den Tabellen; jeder besiegte Gegner würfelt einmal):

| Route | Stufe | vorher | jetzt |
|---|---|---|---|
| Waldpfad (kurz) | 1 | 0 | 0,06 |
| Tiefwald | 2 | 0,14 | 0,32 |
| Tiefe Höhle | 2 | 0,69 | 2,58 (davon 1 sicher) |
| Spinnenhöhle | 2 | 0,75 | 2,97 (davon 2 sicher) |
| Kristallminen | 3 | 0,14 | 6,72 (davon 6 sicher) |

Ziel: Stufe-2-Ausrüstung nach 3 bis 5 Expeditionen. Waldpfad, Tiefwald und zweimal Tiefe Höhle bringen jetzt etwa
5,5 Splitter (vorher etwa 1,5). Das reicht für 3 bis 4 Stufe-2-Teile (Stahlschwert, Langbogen, Stahlrüstung
brauchen je 1, Kristallstab und Kristallamulett je 2). Der Test prüft «≥ 5».

Kristallminen: Die Aufgabe nannte «garantiert 1-3». Die Route hat aber 6 Kristallkäfer, darum gibt es jetzt
6 sichere Splitter. Das ist Absicht: Die Minen sind erst nach Golem und Spinnenkönigin offen (Stufe 3), haben keinen
Boss und sonst kaum Beute. Sie sind die Quelle für die Arkanschmiede: Magitech-Komponente 2, Arkanklinge 4,
Arkan-Amulett 5, Kanone 7 Splitter.

### Nicht umgesetzt: Eisenmine ab Stufe 2

Geplant war ein langsames Kristall-Rezept an der Eisenmine ab Ausbau-Stufe 2. `requirements.minBuildingTier` gibt es
zwar, aber nichts prüft es. Für eine saubere Lösung müssten `ProductionSystem`, `GebaeudeStatus` (neuer Wartegrund),
`EngpassSystem` und `BuildingsScreen` (Hinweis «ab Stufe 2») angepasst werden. Das geht über diese Aufgabe hinaus,
die nur Daten ändern soll. Die Beute reicht für das Ziel auch ohne das Rezept. Gute eigene Aufgabe für später.
