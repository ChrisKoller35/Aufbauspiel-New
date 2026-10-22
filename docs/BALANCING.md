# Magic City – Balancing

## 1. Alle Zutaten erreichbar (18.10.2026, Gildenstadt 22.10.2026)

Ausgangslage (`docs/BESTAND.md`): Glutwurzel, Schimmerpilz, Sumpfblüte, Knochenstaub und Mondkraut gab es nie,
5 von 7 Trank-Rezepten waren unmöglich. Kristallsplitter fielen fast nur bei Bossen. Der Test
`src/data/zutaten.test.ts` prüft, dass jede Zutat aus Beute (Gegner auf einer Route), beim Händler oder aus einem
Rezept kommt, dessen Zutaten selbst erreichbar sind.

Seit der Gildenstadt (`docs/GILDENSTADT.md`) sind alle Zutaten Gold und Beute aus den Dungeons (Eisenschrott,
Kristallsplitter, Grüne und seltene Kräuter, Talisman-Fragmente), dazu Brot vom Händler für Kraft-Brot. Die
frühere Wasser-Versorgung, Rohstoffe aus Gebäuden und die Rezepte, die sie herstellten, gibt es nicht mehr; der
Abschnitt «Wasser» von damals ist damit gegenstandslos.

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
`loot_haunted_common` hat Mondkraut. Der Fund-Raum bietet Mondkraut statt Grünkraut an. Seit der Gildenstadt haben
die Tränke daraus eine echte Wirkung im Dungeon (`docs/GILDENSTADT.md`, Abschnitt «Tränke mit Wirkung»).

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
Arkan-Amulett 5, Kanone 7 Splitter. Dazu kommen seit der Gildenstadt die Abgaben der Stadtstufen (5 bis 10), der
Ausbau der Arkanschmiede (5 / 10) und das Gildenhaus Stufe 2 (3); am Auftragsbrett gibt es 3 Splitter für 2 Siegel.

### Eisenschrott

Seit der Gildenstadt gibt es keine Eisenmine mehr: Eisenschrott kommt nur als Beute. Die Beutetabellen-Einträge für
Holz, Stein und Getreide wurden gewichtsneutral zu Eisenschrott (Wald 1-2 bzw. 1-3; Höhle, Ruinen, Vulkan und
Belagerung mit dem bestehenden Eisen-Eintrag zusammengelegt) bzw. Gold (Sumpf) umgewidmet; alle anderen Drops
fallen gleich oft. Eisenschrott fällt damit schon auf dem Waldpfad (mindestens 2 je Lauf). Was ihn braucht:
Schmiede-Rezepte 1 bis 3 je Stück, Bau und Ausbau von Arkanschmiede und Kriegsmaschinen-Werkstatt, Ausbau der
Schmiede (10 / 20), Abgaben der Stadtstufen (10 bis 40), Herzsteine (10 bis 50).

## 2. Gold (Gildenstadt 22.10.2026)

Gold kam schon vor der Gildenstadt zu rund 90 % aus den Dungeons; jetzt ganz: Beute, mutige Wahlen der Geschichten,
Fund-Räume, Auftragsbrett (Zettel und Lieferungen), Ruhmestruhe der Rangliste, Geschenke der Stadtstufen (100 bis
500) und der Ankauf beim Händler (halber Grundwert, `docs/HAENDLER.md`). Gold ist zugleich Zutat der
Schmiede-Rezepte (10 bis 30) und des Katapults (60), Preis der Baupläne (50 bis 250) und der Ausbauten
(Baukosten × Stufe). Startgold 100: ein zweiter Held (50) und der Bauplan der Schmiede (50), oder Heiltränke.
Erste Werte, noch nicht am Spiel gemessen; Balancing läuft über Manager-Issue #23.
