# Werkstätten auf Klick (21.10.2026, Gildenstadt 22.10.2026)

Christophs Wunsch vom 21.10.2026 (Projekt-Chat): «ich bin auch nicht sicher ob ich es cool finde das es immer
durchlauft konstant. als wenn man einfach klickt wenn man was braucht?» Umgesetzt im Thread «Magic City:
Bestandsaufnahme und Bot-Aufgaben» (Variante 1 von 3); seit der Gildenstadt (22.10.2026, `docs/GILDENSTADT.md`)
gibt es nur noch vier Werkstätten und keine Rohstoff-Gebäude mehr. Code: `src/systems/Werkstattplan.ts` (was eine
Werkstatt als Nächstes macht), `src/systems/ProductionSystem.ts`, `src/systems/Auftraege.ts`, Zustand in
`src/systems/GebaeudeStatus.ts`, Anzeige in `src/ui/screens/WerkstattAnzeige.ts`, `CraftingTab.ts` und
`GebaeudeFenster.ts`. Tests: `tests/werkstattplan.test.ts`, `src/systems/ProductionSystem.test.ts`,
`src/systems/Auftraege.test.ts`, `tests/produktionsnetz.test.ts`.

## Wer arbeitet wann

- **Vier Werkstätten, alle auf Auftrag:** Schmiede, Kräuterküche, Arkanschmiede, Kriegsmaschinen-Werkstatt
  (`manualCraft` in `src/data/buildings.ts`). Nichts läuft von selbst durch; ohne Auftrag ruht die Werkstatt.
  Auftrag geben: im Reiter «Crafting» mit «+ Auftrag» direkt auf dem Rezept oder im Fenster der Werkstatt (bis 5
  nacheinander, ✕ bricht ab).
- **Zutaten sind Gold und Beute aus den Dungeons** (`src/data/recipes.ts`): Eisenschrott, Kristallsplitter, Grüne und
  seltene Kräuter, Talisman-Fragmente, dazu Brot vom Händler für Kraft-Brot. Gold ist eine normale Zutat
  (`globalStock.gold`), die Werkstatt kann es nicht selbst beschaffen. Nur die Magitech-Komponente stellt eine
  Werkstatt (Arkanschmiede) selbst her.
- **Fehlende Zutaten macht die Stadt von selbst,** wenn eine Werkstatt sie herstellen kann:
  - Arkanklinge, Magitech-Schild und Arkan-Amulett brauchen Magitech-Komponenten: die Arkanschmiede macht sie zuerst
    («Vorstufe»).
  - Kanonen brauchen zwei Komponenten: die Arkanschmiede liefert sie der Kriegsmaschinen-Werkstatt zu
    («Zulieferung»).
  - Beute und Gold kommen nie von selbst.
- **Gelb oder rot:** Gelb mit ↻ steht eine Zutat, die fehlt, aber von selbst kommt (eine andere Werkstatt stellt sie
  gerade her). Rot steht sie, wenn sie nicht kommt: Beute, Gold, oder das Gebäude dafür fehlt, auch eine Stufe tiefer
  (für die Magitech-Komponente fehlt Eisenschrott). Den Grund nennen der Auftrag in der Werkstatt, der Titel der
  Zutat und der Engpass («Eisenschrott: 0 im Lager, 2 pro Auftrag. Eisenschrott gibt es als Beute in den Dungeons:
  schick die Helden auf Expedition.»). Code: `nachschub` in `src/systems/GebaeudeStatus.ts`, Sätze in
  `src/systems/EngpassSystem.ts`.

**Ohne Leertakt (22.10.2026):** Ist ein Zyklus fertig, wird geliefert und der nächste beginnt im selben Stadt-Takt;
die Zeit über das Ende hinaus zählt für ihn mit (`ProductionSystem.update`). Eine Werkstatt, die durcharbeitet,
liefert darum im Mittel alle `zyklusSekunden` (Rezept geteilt durch die Stufe, `docs/AUSBAU.md`). Geliefert wird
weiter nur in Takten zu 1 s (`STADT_TAKT_SEKUNDEN` in `src/systems/Tag.ts`), die einzelnen Abstände schwanken also
um eine Sekunde.

Reihenfolge, sobald eine Werkstatt frei ist (`planeZyklus`):

1. der erste Auftrag, wenn alle Zutaten da sind
2. eine fehlende Zutat für diesen Auftrag, die die Werkstatt selbst macht («Magitech-Komponente für Arkanklinge»)
3. eine Zutat, die eine andere Werkstatt für ihren nächsten Auftrag braucht («Magitech-Komponente für
   Kriegsmaschinen-Werkstatt»)

Wartet der erste Auftrag auf etwas, das nicht von selbst kommt (Beute, Gold), arbeitet die Werkstatt trotzdem 3 ab.
Was von selbst läuft, steht gelb mit «von selbst» in der Werkstatt, hat kein ✕ und meldet sich nicht als
«Auftrag fertig». Im Werkstatt-Fenster steht dazu ein Satz (`vonSelbstSatz`) nur bei Arkanschmiede und
Kriegsmaschinen-Werkstatt; Schmiede und Kräuterküche brauchen nur Gold und Beute und machen nichts von selbst.

## Anzeige

- Die Restzeit der Aufträge («gesamt noch …») zählt die Vorstufen mit («Magitech-Komponente» vor der Arkanklinge).
- Der Reiter «Crafting» zeichnet eine Werkstatt nur neu, wenn sich ihr Aufbau ändert (Auftrag, Zyklus, Ausbau);
  Zutaten und Restzeiten wechseln an Ort und Stelle. Solange eine Maus oder ein Finger drückt, wird nichts neu
  gezeichnet, auch im Werkstatt- und im Händler-Fenster (`src/ui/components/DruckWaechter.ts`): sonst ginge ein
  Klick auf «+ Auftrag» verloren.
- Ein Gebäude ohne Auftragsliste kann nichts produzieren: Den alten Pfad «gewähltes Rezept, Produktion ohne Auftrag»
  gibt es nicht mehr.

## Spielstand

Am Gebäude stehen `auftraege` (Rezept-IDs), `pendingCraft`, `activeRecipeId`, `productionTimer`, `producing`,
`tier` und `vonSelbst` (`{ art: 'vorstufe' | 'zulieferung', fuer }`, nur während ein Zyklus ohne Auftrag läuft);
Form in `src/systems/SpielstandSchema.ts`.
