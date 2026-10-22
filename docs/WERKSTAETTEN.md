# Werkstätten auf Klick (21.10.2026)

Christophs Wunsch vom 21.10.2026 (Projekt-Chat): «ich bin auch nicht sicher ob ich es cool finde das es immer
durchlauft konstant. als wenn man einfach klickt wenn man was braucht?» und «der brunnen ist so weit rechts und die
materialien in der mitte. und dann sind sie so verbunden». Umgesetzt im Thread «Magic City: Bestandsaufnahme und
Bot-Aufgaben» (Variante 1 von 3). Code: `src/systems/Werkstattplan.ts` (was eine Werkstatt als Nächstes macht),
`src/systems/ProductionSystem.ts`, `src/systems/Auftraege.ts`, Anzeige in `src/ui/screens/BuildingsScreen.ts`.
Tests: `tests/werkstattplan.test.ts`, `tests/startwirtschaft.test.ts`, `tests/produktionsnetz.test.ts`.

## Wer arbeitet wann

- **Rohstoffe laufen weiter von selbst:** Holzfällerhütte, Steinbruch, Getreidefarm, Eisenmine.
- **Alle Werkstätten arbeiten auf Auftrag:** Schmiede, Arkanschmiede, Kriegsmaschinen-Werkstatt, Kräutergarten,
  Windmühle, Bäckerei. Auftrag geben: im Reiter «Crafting» mit «+ Auftrag» direkt auf dem Rezept oder im Fenster
  der Werkstatt (bis 5 nacheinander, ✕ bricht ab).
- **Fehlende Zutaten macht die Stadt von selbst,** wenn eine Werkstatt sie herstellen kann:
  - 1× Heiltrank braucht 3 Grüne Kräuter: der Kräutergarten zieht zuerst 3× Kräuter, dann braut er (65 s statt 20 s).
  - Kraft-Brot braucht Mehl und Kräuter: Windmühle und Kräutergarten liefern der Bäckerei zu.
  - Kanonen brauchen Bauteile: die Arkanschmiede macht sie für die Kriegsmaschinen-Werkstatt.
  - Rohstoffe (Getreide, Eisenschrott) kommen, solange ihr Gebäude arbeitet. Beute aus den Dungeons (Kristalle,
    seltene Kräuter) kommt nie von selbst.
- **Gelb oder rot:** Gelb mit ↻ steht eine Zutat, die fehlt, aber von selbst kommt. Rot steht sie, wenn sie nicht
  kommt: Beute, oder ein Gebäude dafür fehlt oder kann nicht arbeiten, auch eine Stufe tiefer (für die
  Magitech-Komponente fehlt Eisenschrott, weil keine Eisenmine steht). Den Grund nennen der Auftrag in der
  Werkstatt, der Titel der Zutat und der Engpass («Dafür fehlt Eisenschrott. Baue Eisenmine.»).
  Code: `nachschub` in `src/systems/GebaeudeStatus.ts`.
- **Brot für die Bewohner:** Die Bäckerei backt zuerst Brot, bis es für 3 Tage reicht (was die Bewohner essen, plus 1
  für den nächsten Bewohner, solange Platz ist), erst dann ihre Aufträge. Das Mehl dafür mahlt die Mühle. Mehr Brot,
  etwa für Expeditionen, gibt es per Auftrag.

**Ohne Leertakt (22.10.2026):** Ist ein Zyklus fertig, wird geliefert und der nächste beginnt im selben Stadt-Takt;
die Zeit über das Ende hinaus zählt für ihn mit (`ProductionSystem.update`). Eine Werkstatt, die durcharbeitet,
liefert darum im Mittel alle `zyklusSekunden` (Rezept geteilt durch die besetzten Arbeitsplätze) statt eine Sekunde
später. Vorher ging je Zyklus ein Takt verloren: Holz auf Stufe 3 brachte 12 statt 18 am Tag, ein 10-s-Rezept lieferte
alle 11 s. Geliefert wird weiter nur in Takten zu 1 s, die einzelnen Abstände schwanken also um eine Sekunde.
Zahlen und Anzeigen dazu: [TAGESBILANZ.md](TAGESBILANZ.md).

Reihenfolge, sobald eine Werkstatt frei ist (`planeZyklus`):

1. Vorrat (nur Bäckerei: Brot, bis es für 3 Tage reicht)
2. der erste Auftrag, wenn alle Zutaten da sind
3. eine fehlende Zutat für diesen Auftrag, die die Werkstatt selbst macht («zuerst Grüne Kräuter»)
4. eine Zutat, die eine andere Werkstatt gerade braucht («Mehl für Bäckerei»)

Wartet der erste Auftrag auf etwas, das nicht von selbst kommt, arbeitet die Werkstatt trotzdem 4 ab.
Was von selbst läuft, steht gelb mit «von selbst» in der Werkstatt, hat kein ✕ und meldet sich nicht als
«Auftrag fertig». Gelbe Zutaten mit ↻ fehlen noch, kommen aber von selbst; rote fehlen und kommen nicht von selbst.

## Gemessen

Alle Stadtstufen 12 Tage lang simuliert, Brotkette auf der erlaubten Stufe:

- Mit 10 Startbrot fehlt auf keiner Stufe Brot, genau wie vorher.
- Ohne Startbrot fehlt es gleich viele Sekunden wie vorher.
- Im Lager liegen jetzt 2 bis 8 Brot und höchstens 2 Mehl statt 30 bis 80 Brot und bis 80 Mehl. Getreide sammelt
  sich dafür an.

Gemessen vor dem 22.10.2026, also noch mit dem Leertakt. Ohne ihn arbeitet die ganze Kette ein Stück schneller
(Bäckerei Stufe 1: 2,14 statt 2 Brot am Tag); die Tests laufen mit den neuen Zahlen weiter durch.

Brot gegen Aufträge (Gegenprüfung 21.10.2026, `tests/werkstattplan.test.ts`): Ging Brot den Aufträgen erst vor, wenn
es keinen Tag mehr reichte, fehlte mit dauernd bestelltem Kraft-Brot in 30 Tagen 562 von 900 Sekunden Brot und die
Stadt wuchs nicht mehr (auch Brot für 2 Tage liess noch Lücken). Mit «zuerst 3 Tage Brot»:

- Kraft-Brot dauernd bestellt: genau so viele Sekunden ohne Brot und so viel Wachstum wie ganz ohne Auftrag.
- Auf jeder Stadtstufe mit erlaubt ausgebauter Brotkette fehlt nie Brot; in 40 Tagen entstehen 26 bis 65 Kraft-Brot,
  5 bestellte sind nach 1 bis 4½ Minuten fertig.
- Ist die Bäckerei kleiner als die Stadt (Stufe 1 ab dem Dorf), reicht ihr Brot ohnehin nicht. Aufträge warten dann
  fast immer; in einer Messung fehlten 34 Sekunden mehr Brot als ohne Auftrag (40 Tage). Abhilfe: Bäckerei ausbauen.

## Mindmap

Der Brunnen steht in der Werkstatt-Reihe zwischen Kräutergarten und Bäckerei, die Windmühle rechts neben der
Bäckerei. Wasser und Mehl gehen als kurze Linien zur Seite, keine Linie kreuzt eine andere. Die Regel «eine Reihe
tiefer oder zur Karte direkt daneben» prüft `tests/produktionsnetz.test.ts`.

## Anzeige

- Die Restzeit der Aufträge («gesamt noch …») zählt das Brot mit, das die Bäckerei vorher noch backt, und die
  Vorstufen («3× Kräuter ziehen» vor dem Heiltrank). Brot, das die Bewohner in dieser Zeit essen und die Bäckerei
  nachbacken muss, ist nicht eingerechnet: Es kann etwas länger dauern.
- Der Reiter «Crafting» zeichnet eine Werkstatt nur neu, wenn sich ihr Aufbau ändert (Auftrag, Zyklus, Ausbau);
  Zutaten und Restzeiten wechseln an Ort und Stelle. Solange eine Maus oder ein Finger drückt, wird nichts neu
  gezeichnet, auch im Werkstatt-Fenster: sonst ginge ein Klick auf «+ Auftrag» verloren.

## Alte Spielstände

- Läuft beim Laden in Kräutergarten, Mühle oder Bäckerei noch ein Zyklus aus der alten Dauer-Produktion, wird er
  fertig und meldet sich einmal als «Auftrag fertig».
- Alte Stände haben oft viel Brot: Die Bäckerei ruht dann, bis es unter 3 Tage fällt.
- Neu am Gebäude ist nur `vonSelbst` (was gerade von selbst läuft); fehlt es, ist der laufende Zyklus ein Auftrag.
