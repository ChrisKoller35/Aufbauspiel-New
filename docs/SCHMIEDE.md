# Schmiede

Auftrag vom 20.10.2026: Set-Teile mit Material aus den Dungeons verbessern, damit die Beute lange wertvoll
bleibt. Material fällt in den Dungeons, die Stufen sind im Kampf spürbar und der Fortschritt ist überall
zu sehen, am PC und am Handy. Diese Datei hält fest, wie die Schmiede wirkt, was sie kostet und was ein
neuer Dungeon für sie braucht.

## So wirkt es im Spiel

- **Wo:** Heldenseite, Tab «⚒️ Schmiede». Oben steht das Material der Gilde, darunter jedes Set, von dem
  die Gilde Teile hat (getragene zuerst). Jedes Teil zeigt Stufe, den Sprung der Werte zur nächsten Stufe
  («ATK 10 → 11»), die Kosten und einen Knopf «⚒️ AUF +1». Fehlt etwas, steht dort, was fehlt
  («Es fehlen 48 Glutkern.»), und der Knopf ist aus.
- **Material:** Jedes Gebiet hat sein eigenes (Tabelle unten). Ein Set-Teil braucht das Material aus dem
  Gebiet seines Dungeons. Ein Sieg bringt die **Grundmenge** der Ebene (2 + Ebene: Ebene 1 bringt 3,
  Ebene 4 bringt 6, Ebene 6 bringt 8). Niederlage oder Rückzug bringen die Hälfte, anteilig zu den
  geschafften Räumen. Das Material liegt in der Truhe mit dem Hinweis, wofür es ist
  («⚒️ Für die Schmiede: Set-Teile aus dem Feuer»).
- **Stufen +1 bis +5:** Jede Stufe macht alle Werte eines Teils um 10 % stärker, gerundet. Der Hauptwert
  der Bauart steigt jede Stufe mindestens um 1 (Waffen Angriff, Schild und Rüstung Verteidigung,
  Robe und Schmuck Leben, Ring Krit-Chance um 1 %). Ein Malus wie −0.05 Tempo am Schild bleibt, wie er ist.
  +5 macht ein Teil also um gut die Hälfte stärker, etwa so stark wie ein Teil zwei Ebenen höher.
  Beispiel Wyrmzahnklinge (Ebene 4): ATK 10, DEF 2, Krit 8 % → auf +3: 13 / 3 / 10 % → auf +5: 15 / 3 / 12 %.
- **Für alle Exemplare:** Die Stufe gehört zum Teil, nicht zum einzelnen Stück. Findet die Gilde dieselbe
  Klinge ein zweites Mal, ist auch die zweite schon +3.
- **Einschmelzen:** Ein doppeltes Teil aus dem Lager wird zu zwei Grundmengen seines Materials
  (Wyrmzahnklinge: 12 Glutkern). Das letzte Exemplar der Gilde bleibt immer, getragene zählen mit.
  Vorher fragt die Schmiede nach («JA, EINSCHMELZEN» / «NEIN»). Die Stufe bleibt.
- **Meisterset:** Alle drei Teile eines Sets auf +5. Wer sie zusammen trägt, bekommt den Zwei-Teile-Bonus
  doppelt (zu sehen auf der Heldenseite: «★ Meisterset», und im Vergleich beim Anlegen).
- **Schmiede in der Stadt:** Jede Ausbaustufe des fertigen Gebäudes spart 10 % Gold (Stufe 2: 20 %).
- **Sichtbar:**
  - «+3» als Abzeichen an jedem Bild eines verbesserten Teils (Heldenfenster, Inventar, Sets, Truhe,
    Karte); Bronze bei +1 und +2, Silber bei +3 und +4, Gold bei +5. Dazu fünf Rauten neben dem Namen.
  - Der Name trägt die Stufe («Wyrmzahnklinge +3»), die Werte überall die verbesserten, auch in der Truhe.
  - Im Heldenfenster führt «⚒️ In der Schmiede auf +4 verbessern» direkt zum Teil in der Schmiede.
  - Routenkarten, das Band bei der Team-Auswahl und das Fenster der Dungeon-Karte nennen das Material
    («⚒️ Glutkern · 6 je Sieg»).
  - Nach der Expedition: «⚒️ Jetzt in der Schmiede möglich: Herz der Glut auf +1», wenn die Beute ein
    Teil bezahlbar gemacht hat.
  - Nach dem Schmieden fliegen Funken, ein Hammer schlägt zweimal, und der Schmied sagt etwas
    («Zweimal gefaltet, zweimal geflucht. Passt.»). Bei «Bewegung reduzieren» bleibt alles ruhig.

## Kosten

Je Stufe, für ein Teil der Ebene *E* (Grundmenge *G* = 2 + *E*):

| Auf | Material | Gold | Kristallsplitter |
|---|---|---|---|
| +1 | 2 × *G* | 20 × *E* | – |
| +2 | 3 × *G* | 40 × *E* | – |
| +3 | 5 × *G* | 80 × *E* | 3 |
| +4 | 8 × *G* | 160 × *E* | 6 |
| +5 | 12 × *G* | 320 × *E* | 12 |

Beispiele: Ebene 1 (Rudel des Waldpfads) +1 kostet 6 Waldharz und 20 Gold. Ebene 4 (Glut des Magma-Wyrms)
+1 kostet 12 Glutkern und 80 Gold, +5 kostet 72 Glutkern, 1280 Gold und 12 Kristallsplitter.

**So ist es gedacht:**
- **+1 nach etwa zwei Siegen** im Dungeon des Sets: Die Schmiede lohnt sich sofort.
- **Ein ganzes Set auf +5** braucht 90 Grundmengen. Mit Einschmelzen (sind alle drei Teile da, fällt
  jedes weitere als Doppel) sind das etwa 45 Siege. Das ist das lange Ziel, das die Beute wertvoll hält.
- **Gold und Kristallsplitter** bremsen erst ab +3, und dann nur kurz: Eine Expedition auf Ebene 4
  bringt etwa 380 bis 620 Gold und 4 bis 14 Splitter.
- Material aus einem tiefen Gebiet hilft oben nicht: Hohe Sets brauchen Material aus hohen Gebieten.
  Innerhalb eines Gebiets zählt jeder Dungeon: Glutkern fällt in allen vier Feuer-Dungeons, die leichteren
  bringen je Sieg etwas weniger und sind kürzer. Nur im Dungeon des Sets fallen aber Teile zum Einschmelzen.
- **Spürbar:** Die Stufen machen viel aus. Gemessen in der Gegenprüfung (20.10.2026, 40 Läufe): Das
  Musterteam «Gut» in den Sets aus Ebene 4 schafft das Himmelsarchiv ohne Stufen nie, mit allen Teilen auf
  +1 in 25 %, auf +2 in 48 % und auf +3 in 93 % der Läufe. Dafür braucht es aber 120 Grundmengen, je nach
  Einschmelzen 60 bis 120 Siege in vier verschiedenen Dungeons.

## Material je Gebiet

| Material | Gebiet | Dungeons |
|---|---|---|
| Waldharz | Wald | Waldpfad, Verfallene Lichtung, Tiefwald, Geisterwald |
| Moorpilz | Sumpf | Sumpfdorf, Giftsumpf |
| Höhlenerz | Höhlen | Tiefe Höhle, Spinnenhöhle, Verschlungene Tunnel, Kristallminen |
| Tiefseeperle | Meer | Versunkene Küste, Abgrundtiefen, Abyssale Tiefe |
| Festungseisen | Belagerung | Die Stadtmauern, Die Festung |
| Eisblüte | Frostpass | Gefrorener Pass |
| Gruftsilber | Gruften | Alte Krypta, Tiefe Ruinen, Schattenkatakomben |
| Glutkern | Feuer | Obsidiantunnel, Aschewüste, Magmahöhlen, Vulkankern |
| Drachenschuppe | Drachenhort | Der Drachenhort |
| Himmelstinte | Himmelsarchiv | Das Himmelsarchiv |

Die Dungeon-IDs stehen in `SCHMIEDE_MATERIALIEN` (`src/data/schmiede.ts`).

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/schmiede.ts` | Materialien je Gebiet, Hauptwert je Bauart, Kosten, Grundmenge |
| `src/systems/Schmiede.ts` | Werte je Stufe, Kosten, Schmieden, Einschmelzen, Material nach der Expedition (`schmiedeBeute`) |
| `src/systems/DungeonSets.ts` | Meisterset (`istMeisterset`) und Set-Boni mit Stufen |
| `src/systems/GearSystem.ts` | Werte eines Helden mit Stufen (`getEffectiveStats`) |
| `src/ui/screens/SchmiedeTab.ts` | Tab «Schmiede» mit Knöpfen, Nachfrage und Sätzen des Schmieds |
| `src/ui/components/SchmiedeAnzeige.ts` | Abzeichen, Rauten, Material-Zeilen, Truhen-Hinweise |
| `src/ui/html/schmiede.css` | Aussehen, Funken und Handy-Ansicht |
| `tools/materialBilder.ts` | Zeichnet die Material-Bilder aus Code (`npm run material-bilder`, kostet nichts) |
| `tests/schmiede.test.ts` | Regeln, Kosten, Beute, Spielstand und Anzeige |

Der Spielstand speichert nur die Stufen (`state.schmiede.stufen`, Teil → Stufe). Ältere Spielstände
haben das Feld nicht und laufen ohne Änderung weiter; die Speicher-Version bleibt.

Schwierigkeitsgrade gibt es im Spiel noch nicht zur Wahl (Expeditionen starten auf «Normal»). Kommen sie
dazu, bringt ein Sieg schon mehr Material, wie bei den Punkten: Schwer ×1,5, Albtraum ×2, Infernal ×3
(`materialJeSieg`).

## Ein neuer Dungeon

- **Neues Gebiet:** einen Eintrag in `SCHMIEDE_MATERIALIEN` mit `id` (`mat_…`), Name, `ausGebiet`,
  den Routen und einem Satz mit Witz. Das Bild zeichnet `tools/materialBilder.ts`: eine Zeichnung dazu
  schreiben und `npm run material-bilder` laufen lassen (128 × 128 nach `public/assets/sprites/final/`).
- **Bekanntes Gebiet:** die Route bei `routen` des passenden Materials ergänzen.
- Der Test verlangt für jede Route genau ein Material und für jedes Material ein Bild.

## Offen

- **Ruhmestruhe** der Rangliste mit Material: wäre ein schöner Preis, noch nicht eingebaut.
- **Gewöhnliche Ausrüstung einschmelzen:** Bisher nur Set-Teile. Alte T1- bis T3-Stücke stapeln sich.
- **Eichung mit Stufen:** Die Musterteams der Dungeon-Eichung tragen ihre Sets ohne Stufen. Für die
  nächsten Dungeons über dem Himmelsarchiv lohnt eine Messung mit Sets auf +3 und +5.
