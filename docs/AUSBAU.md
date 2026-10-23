# Ausbau-Stufen und Mindmap (18.10.2026, Gildenstadt 22.10.2026)

Christophs Wunsch vom 18.10.2026 (Projekt-Chat): Gebäude werden nicht mehrfach gebaut, sondern freigeschaltet und
ausgebaut, und die Ansicht wird eine Mindmap in Reihen. Seit der Gildenstadt (22.10.2026, `docs/GILDENSTADT.md`)
gibt es nur noch sechs Gebäude; Rohstoff-Gebäude, Wohnviertel, Markt und Bank sind weg. Code: `src/systems/Ausbau.ts`
(Regeln), `src/data/produktionsnetz.ts` (Reihen und Knoten der Mindmap), `src/ui/screens/ProduktionTab.ts` mit
`MindmapGroesse.ts` (Breite), `MindmapTexte.ts`, `MindmapTipp.ts` (Zeichnen), `src/ui/screens/AufbauTab.ts` (Reiter «Aufbau»),
`src/ui/screens/GebaeudeFenster.ts` (Fenster mit Ausbau). Tests: `src/systems/Ausbau.test.ts`,
`src/data/buildings.test.ts`, `tests/produktionsnetz.test.ts`.

Wie weit eine Werkstatt ausgebaut werden darf, bestimmt die Stadtstufe (Tabelle in `docs/STADTWEG.md`).

**23.10.2026 (Wunsch Christoph):** Keine Baupläne mehr, die Werkstätten werden direkt auf ihrem Feld gebaut (nur der
Gildenrang sperrt), der Bau kostet dafür den früheren Bauplan-Preis mit; die Mindmap hat keine Linien mehr
(`docs/GILDENSTADT.md`, «Ohne Baupläne»).

## Ein Gebäude je Art

- Jedes Gebäude gibt es **genau einmal**. Gildenhaus und Händler stehen von Anfang an; die vier Werkstätten baut man
  direkt auf ihrem Feld für Gold und Beute (Arkanschmiede ab Gildenrang 2, Kriegsmaschinen-Werkstatt ab 4), der Bau
  steht sofort (keine Bauzeit).
  Danach wird im Gebäude-Fenster **ausgebaut** (Knopf «Ausbauen auf Stufe N»), auch das ist sofort fertig.
- **Kosten einer Stufe** (`ausbauKosten`): Ausbau-Gold (`BuildingDef.ausbauGold`) × Zielstufe, plus die Beute aus
  `BuildingDef.ausbauBeute` je Stufe über der ersten (Stufe 2 einmal, Stufe 3 zweimal).
- Gildenhaus Stufe 2 ist der bestehende Ausbau `GUILD_HALL_T2` (`src/data/buildingUpgrades.ts`): 80 Gold,
  3 Kristallsplitter, braucht Gildenrang 3, bringt 4 statt 3 Helden je Expedition (`heldenJeExpedition`).
- Abreissen gibt es nicht: Es gibt jedes Gebäude einmal, und die Baukosten kämen nicht zurück. `entferneGebaeude` in `Ausbau.ts` dient nur noch `vereinigeDoppelte`.
- Ein Ausbau zählt für den Erfolg «Baumeister» wie ein Bau (`total_buildings_built`), zusätzlich `total_upgrades`.

| Gebäude | Bau | Stufe 2 | Stufe 3 | Was eine Stufe bringt |
|---|---|---|---|---|
| Schmiede | 100 Gold | 100 Gold + 10 Eisenschrott | 150 Gold + 20 Eisenschrott | arbeitet N-mal so schnell |
| Kräuterküche | 90 Gold | 80 Gold + 5 Grüne Kräuter | 120 Gold + 10 Grüne Kräuter | arbeitet N-mal so schnell |
| Arkanschmiede | 230 Gold, 5 Eisenschrott, 3 Kristallsplitter (Gildenrang 2) | 160 Gold + 5 Kristallsplitter | 240 Gold + 10 Kristallsplitter | arbeitet N-mal so schnell |
| Kriegsmaschinen-Werkstatt | 350 Gold, 20 Eisenschrott, 5 Kristallsplitter (Gildenrang 4) | 200 Gold + 10 Eisenschrott | 300 Gold + 20 Eisenschrott | arbeitet N-mal so schnell |
| Gildenhaus | steht | 80 Gold, 3 Kristallsplitter (Gildenrang 3) | – | 4 Helden je Expedition |
| Händler | steht | – | – | kein Ausbau |

Ausbau-Gold je Stufe: Schmiede 50, Kräuterküche 40, Arkanschmiede 80, Kriegsmaschinen 100 (so viel kostete bis
22.10.2026 der Bau ohne Bauplan; seit dem 23.10. ist der Bau teurer, der Ausbau blieb gleich).

**Tempo** (`tempoFaktor`, `zyklusSekunden`): Eine Werkstatt auf Stufe N arbeitet N-mal so schnell, ohne Arbeiter
(Eisenschwert 90 s, auf Stufe 2 45 s, auf Stufe 3 30 s). Zyklen laufen ohne Leertakt: Ist einer fertig, beginnt der
nächste im selben Stadt-Takt, und die Zeit über das Ende hinaus zählt für ihn mit (`ProductionSystem.update`). Ein
Ausbau während eines Zyklus kürzt dessen Rest im Verhältnis der Tempi (`ausbauen`: 60 s Rest auf Stufe 1 sind nach
dem Ausbau auf Stufe 2 noch 30 s); gespeichert wird sofort (`mc:speichern`).

## Mindmap (Reiter «Stadt»)

Drei Reihen von oben nach unten, ohne Verbindungslinien (bis 22.10.2026 SVG-Linien mit Pfeilen; seit 23.10.2026
weg, was ein Gebäude liefert, sagt die Erklärung):

1. **Beute:** ein breiter Balken «Beute aus den Dungeons» mit fünf Gruppen und ihrem Vorrat (`BEUTE_GRUPPEN`):
   Eisenschrott, Kristallsplitter, Grüne Kräuter, Seltene Kräuter, Dungeon-Material. Klick auf eine Gruppe erklärt,
   wofür sie ist («für die fünf Tränke mit Wirkung»); Klick auf den Balken führt zu den Expeditionen.
2. **Händler und Werkstätten:** Händler (zuerst), Schmiede, Arkanschmiede, Kriegsmaschinen-Werkstatt,
   Kräuterküche. Die Arkanschmiede liefert Bauteile zur Kriegsmaschinen-Werkstatt direkt daneben.
3. **Gilde:** Gildenhaus, «Expeditionen» (Helden, Tränke, Proviant, Kriegsmaschinen) und «Bauen & Ausbauen»
   (mit weniger als zwei Helden zuerst der Helden-Schritt, sonst «N baubar» usw.). Das Dungeon-Material geht in die
   Set-Schmiede im Gildenhaus.

`tests/produktionsnetz.test.ts` prüft, dass jedes Gebäude genau einmal vorkommt und der Händler vorne steht.

Über der Karte stehen bis zu drei **Engpässe** der Stadt als Knöpfe (`src/systems/EngpassSystem.ts`): zuerst
Werkstätten, die auf Beute oder Gold warten («Eisenschrott gibt es als Beute in den Dungeons: schick die Helden auf
Expedition.», «Gold bringen Expeditionen, das Auftragsbrett im Gildenhaus und der Händler, der Beute ankauft.»), dann
der nächste Bau («Schmiede fehlt noch. Bauen kostet 100 Gold.»), dann das erste gesperrte Gebäude («Arkanschmiede
braucht Gildenrang 2.»). Jedes Gebäude kommt genau einmal vor, auf der
Karte steht die Stufe. Klick: gebaut → Fenster mit Werkstatt und Ausbau; Händler → Händler-Fenster; baubar →
Bau-Dialog (Knopf «BAUEN»); gesperrt → Bau-Dialog mit Grund.

Die Mindmap passt sich der Breite an (`passeMindmapAn` in `MindmapGroesse.ts`): genug Platz → normal (`voll`),
etwas zu schmal → als Ganzes verkleinert (`zoom`), Handy → Raster (`kompakt`). Beim Darüberfahren mit der Maus (am
Handy: lange drücken) erklärt ein Kasten in einem Satz, wofür das Gebäude gut ist, wie es gerade steht und was ein
Klick macht (Texte: `src/data/gebaeudeErklaerungen.ts`). Das Gebäude, das sich als Nächstes lohnt, ist golden
umrandet («Als Nächstes», auch im Aufbau-Reiter und in der Engpass-Leiste): das erste in der Reihenfolge Schmiede,
Kräuterküche, Arkanschmiede, Kriegsmaschinen-Werkstatt, das baubar ist (`src/systems/Empfehlung.ts`, Schritt
`bauen`). Mit weniger als zwei Helden empfiehlt die Stadt zuerst «Held anheuern
(50 Gold)» (Schritt `held`, `typeId` leer): Das Ziel «Bauen & Ausbauen», die Engpass-Leiste und ein Knopf im
Aufbau-Reiter zeigen den Satz und führen per Klick zu den Helden; in einem neuen Spiel mit zwei Helden ist es die
Schmiede (100 Gold). Gebäude, denen der Gildenrang fehlt, werden übersprungen. Karten sind mit
Tastatur bedienbar (Tab, Enter). Händler-Fenster, Gebäude-Fenster und Bau-Dialog schliessen mit Escape
(`bindeFensterTasten`, `src/ui/components/FensterHilfen.ts`); der Beute-Balken sagt bei leerem Lager «noch nichts im
Lager».

## Reiter «Aufbau»

Ein Raster der sechs Gebäude in der Reihenfolge `BUILD_MENU_ORDER`, je Kachel: gebaut (mit Stufe), baubar mit
den Baukosten («Bauen: 100 Gold», Klick öffnet den Bau-Dialog) oder gesperrt mit den Hinweisen aus
`freischaltHinweise` («braucht Gildenrang 2»). Kein Baum:
keine Werkstatt setzt eine andere voraus (`freischaltung.braucht` ist überall leer), nur der Gildenrang
sperrt. Wer eine Kette will, trägt sie in `src/data/buildings.ts` ein; `getFreischaltStufe` rechnet sie aus.

## Alte Spielstände

Spielstände aus der Zeit vor der Gildenstadt (SaveVersion unter 24) werden nicht geladen (`docs/SPIELSTAND.md`).
`vereinigeDoppelte` in `Ausbau.ts` läuft beim Laden (`SaveSystem.bereiteVor`, also auch im Probe-Laden des
Fensters «Spielstand») als Schutz «ein Gebäude je Art»: Mehrere Gebäude derselben Art werden zu einem verschmolzen,
Stufe = bisherige Anzahl (höchstens die Höchststufe), Zutaten eines laufenden Zyklus gehen zurück ins Lager.
