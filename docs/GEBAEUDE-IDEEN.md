# Gebäude in 2D – drei Ideen

**Entscheidung (Christoph, 17.10.2026): B + C.** Freischalt-Baum mit Werkstätten, obere Gebäude brauchen einen Bauplan
aus einem Dungeon. Umgesetzt in Manager #25/#26 (PR #9), Werkstatt-Fenster folgt in #27.

**Darstellung der Seite (Christoph, 18.10.2026): Entwurf 2 «Produktionsketten»**, siehe `docs/entwuerfe/README.md`.
Das Raster «Stadtplan» mit leeren Kästchen und die Bauleiste werden durch Ketten-Zeilen ersetzt.

Was bleiben soll (Christoph): Gebäude werden nacheinander freigeschaltet und gebaut, Crafting hängt an den Gebäuden.
Problem heute: Gebäude sind nur Bildkarten in einem leeren Raster, Crafting ist ein eigener Reiter ohne Bezug zu ihnen.

## A) Bauplätze auf einem gemalten Stadtbild

Ein grosses Bild der Stadt (wie das Menübild «Gebäude & Crafting») mit festen, beschrifteten Bauplätzen:
Marktplatz in der Mitte, Mühle am Fluss, Mine am Berg. Leere Plätze zeigen eine Baustelle mit Schloss.
Ist ein Gebäude gebaut, erscheint sein Bild an dieser Stelle. Klick darauf öffnet seine Werkstatt.
- Plus: sieht nach Stadt aus, man sieht sie wachsen.
- Minus: braucht ein passendes Stadtbild und je Gebäude ein freigestelltes Bild; feste Plätze, kein freies Bauen.

## B) Freischalt-Baum mit Werkstätten (Empfehlung)

Gebäude stehen als Karten in einem Baum (wie ein Talentbaum): Holzfäller → Sägewerk/Schmiede → Arkanschmiede usw.
Eine Karte ist erst baubar, wenn die vorherige steht und eine Bedingung erfüllt ist (Gildenrang, Boss besiegt).
Jedes gebaute Gebäude ist eine **Werkstatt**: Klick öffnet ein Fenster mit seinen Rezepten, Arbeitern,
Auftragsliste mit Fortschrittsbalken und Ausbaustufe. Crafting gibt es nur noch dort, mit Wartezeit.
Der Reiter «Crafting» wird zur Übersicht «Was läuft gerade in welcher Werkstatt».
- Plus: passt genau zur Idee «nacheinander freischalten, Crafting am Gebäude», nutzt die vorhandenen Bilder,
  der meiste Code (Produktion, Rezepte, Ausbaustufen) ist schon da. Gut vom Bot in kleinen Schritten baubar.
- Minus: weniger «Stadt-Gefühl» als A.

## C) Baupläne aus den Dungeons

Neue Gebäude schaltet man frei, indem man auf Expeditionen **Baupläne** findet (z. B. Bauplan Arkanschmiede beim
Kristallgolem). Verbindet Stadt und Expeditionen: Man zieht los, um die Stadt auszubauen, und die Stadt macht die
Helden stärker. Lässt sich mit A oder B kombinieren.

## Empfehlung

**B mit C kombiniert**: Freischalt-Baum mit Werkstätten, und die oberen Gebäude brauchen einen Bauplan aus einem
Dungeon. A kann später als schönere Ansicht obendrauf kommen, weil die Spiel-Logik dieselbe bleibt.
