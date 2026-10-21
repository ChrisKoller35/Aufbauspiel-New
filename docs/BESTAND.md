# Magic City – Bestandsaufnahme (17.10.2026)

Geprüft: Stand vom PC (Ordner `Documents\Aufbauspiel`, Branch `ui-rebuild` plus Arbeit bis 10.04.2026),
seit PR #1 auch auf GitHub. Spiel im Browser gestartet (Playwright), Code durchgesehen.

## Nachtrag 21.10.2026: Zwei Dungeons zwischen den Sternen

Über dem Himmelsarchiv geht die Karte in einem violetten Sternenfeld weiter: die Sternenschmiede (Ebene 7,
Korrund, der Sternenschmied) und der Sternenschlund (Ebene 8, Nyxar, der Sternenfresser). Je vier Gegner und ein
Boss mit eigenen Bildern (6 Gegner, 2 Routenbilder), eigene Sets (Korrunds Meisterstücke mit Schmiedetakt, Was Nyxar
nicht frass mit Sternenfall), Material Sternenstahl, Erstsieg-Beute und die Geschichte des Stadtschreibers über die
Wahl-Räume: Sternenfeuer gibt der Gruppe Angriff bis zum Ende und kostet Leben, befreite Sterne schwächen Nyxar.
Ohne Schmiede kein Durchkommen: Die Sternenschmiede verlangt Sets auf etwa +3, der Sternenschlund +4 bis +5. Dazu Drachenhort
und Himmelsarchiv nach den Bot-Aufträgen (Mindestschaden, stärkere Startklassen) neu geeicht, das Probespiel
`?probe=sterne`, ein ausgebautes Gildenhaus im Probespiel (vorher gingen nur drei der vier Helden mit) und dort
schon freie Klassen (vorher meldete der erste Bericht sechsmal «Neue Klasse»).
Regeln und Eichung: `docs/NEUE-DUNGEONS.md`.

## Nachtrag 20.10.2026 (spät): Schmiede für die Dungeon-Sets

Neuer Tab «⚒️ Schmiede» auf der Heldenseite: Set-Teile werden mit Material aus den Dungeons bis +5 besser,
jede Stufe um 10 % (der Hauptwert mindestens um 1). Jedes Gebiet hat sein eigenes Material (Waldharz bis
Himmelstinte, Bilder aus Code gezeichnet), ein Sieg bringt am meisten. Doppelte Teile lassen sich einschmelzen,
alle drei Teile eines Sets auf +5 sind ein Meisterset (Zwei-Teile-Bonus doppelt). Die Stufe steht als «+3» an
jedem Bild, im Namen und in den Werten; Truhe, Routen, Karte und Ergebnis nennen das Material.
Regeln, Kosten und Material je Gebiet: `docs/SCHMIEDE.md`.

## Nachtrag 20.10.2026 (abends): Rangliste mit Rivalen

Neun Computer-Gilden klettern auf der Dungeon-Karte mit, eine Runde pro beendeter Expedition. Die Rangliste
zeigt, wer am höchsten steht (Höhe, dann Sterne), wer bald vorbeizieht und welcher Sieg einen selbst
vorbeibringt; ihre Wappen stehen auf der Karte. Dazu eine Wochenwertung um Ruhm mit Ruhmestruhe und Pokal für
Platz 1 bis 3. Ein dauerhafter Merker hält fest, welche Dungeons wirklich bezwungen sind (Boss besiegt);
Karte und Stadtweg lesen ihn. Regeln, Rivalen und Eichung: `docs/RANGLISTE.md`.

## Nachtrag 20.10.2026 (Nachmittag): Geschichten der Dungeons

Jeder der 25 Dungeons erzählt eine kurze Geschichte des Stadtschreibers Ottokar: die Einleitung beim ersten Aufbruch,
2 bis 3 Entscheidungen unterwegs, die Beute oder Gefahr verändern (die mutige Option bringt Gold, Gegenstände oder
ein Set-Teil mehr, macht aber Gegner oder Boss stärker), eine Chronik im Bericht und nach dem ersten Sieg den Schluss.
Drachenhort und Himmelsarchiv erzählen über ihre festen Wahl-Räume. Regeln und Eichung: `docs/GESCHICHTEN.md`.

## Nachtrag 20.10.2026 (Mittag): Dungeon-Sets und Wege der Helden

Jeder Dungeon lässt ein eigenes Set aus drei Teilen fallen, zwei Teile geben Werte, drei eine Fähigkeit, die im Kampf
sichtbar auslöst (`docs/DUNGEON-SETS.md`). Ab Stufe 10 wählt jeder Held einen von zwei Wegen seiner Klasse, für immer,
ab Stufe 15 ist er Meister (20 Wege, `docs/SPEZIALISIERUNG.md`). Die Gegner von Drachenhort und Himmelsarchiv sind
dafür stärker geworden; ohne Wege sind die zwei obersten Dungeons kaum zu schaffen.

## Nachtrag 20.10.2026: Neue Dungeons statt Treppe

Christoph: Endlos heisst, dass es auf der Dungeon-Karte mit immer neuen, verschiedenen Dungeons weiter nach oben
geht, ab und zu ein oder zwei mehr. Über dem Vulkankern stehen jetzt der Drachenhort und das Himmelsarchiv
(`docs/NEUE-DUNGEONS.md`). Die endlose Treppe ist wieder ganz weg (seine Wahl am 20.10.): keine Routenkarte, kein
Eingang auf der Karte, kein Startpunkt im Team-Bildschirm. Über dem obersten Dungeon zeigt die Karte ein leeres Feld
«Noch unerforscht», nach Stufe 7 zeigt das Stadtweg-Fenster die Dungeons ganz oben mit Häkchen. Alte Spielstände
verlieren beim Laden den Treppen-Stand; wer mitten im Aufstieg gespeichert hat, bekommt die Beute vom letzten
Rastplatz ins Lager (`SaveSystem.ts`, ohne neue SaveVersion).

## Nachtrag 19.10.2026: Die endlose Treppe (am 20.10. wieder entfernt)

Stadtstufe 7 öffnet jetzt das Endgame: eine Treppe über dem Dungeon, Stockwerk für Stockwerk ein Kampf, jedes 10. ein
Boss, nach jedem 5. ein Rastplatz, an dem die Beute sicher ist. Die Bestmarke ist das höchste Stockwerk, gestartet
wird unten oder über einem besiegten Boss-Stockwerk. Eingänge: Routenliste (ganz oben), Dungeon-Karte (über dem
Vulkankern), Stadtweg-Fenster. Regeln, Zahlen und Eichung: `docs/TREPPE.md`. Rivalen-Gilden und lebende Rangliste
folgen (Manager-Issue #39). Nebenbei: Die Fähigkeiten der Helden sind vor dem Kampf jetzt zu sehen (waren seit dem
Import nie sichtbar).

## Nachtrag 18.10.2026 (spät): Der Weg zur Magischen Stadt

Christoph wollte eine Geschichte, das Endgame bleibt der endlose Aufstieg im Dungeon mit Rangliste. Neu: 7
Stadtstufen (Lagerfeuer bis Magische Stadt) mit Aufgaben, Abgabe und Belohnung, je ein Kapitel der Stadtchronik,
ein Banner im Hauptmenü mit der wachsenden Stadt als Bild aus Code, und die Stadtstufe begrenzt den Ausbau
(Wohnviertel, Werkstätten, Marktplatz und Bank). Stufe 7 öffnet die endlose Treppe (nächstes Paket).
Regeln und Zahlen: `docs/STADTWEG.md`. Bosse und Gildenrang zählen erst nach Manager-Issue #21.

## Nachtrag 18.10.2026 (abends): Mindmap, ein Gebäude je Art, Wohnviertel

Zweiter Umbau nach Christophs Wunsch: Der Reiter **Produktion** ist eine Mindmap in vier Reihen (Gewinnen →
Lager → Werkstätten → Stadt, Linien als SVG), jedes Gebäude gibt es **genau einmal** und wird **ausgebaut**
(Stufen statt Mehrfachbau), das Wohnhaus heisst **Wohnviertel** (6 Plätze je Stufe), Steuern zahlen die
Bewohner, Marktplatz und Bank wirken jetzt (je besetztem Arbeitsplatz). Reiter «Wohnen» weg. Regeln und
Zahlen: `docs/AUSBAU.md`. Code: `src/systems/Ausbau.ts`, `src/data/produktionsnetz.ts`,
`src/ui/screens/ProduktionTab.ts`. Alte Spielstände werden beim Laden verschmolzen (SaveVersion 21).
Offen: Lager-Grenzen werden weiterhin nicht geprüft; Markt- und Bank-Werte sind vorläufig (Manager #23).

## Nachtrag 18.10.2026 (morgens): Gebäude-Seite

Die Gebäude-Seite hatte ab PR #11 die Reiter **Produktion** (Produktionsketten, Entwurf 2), **Wohnen**, **Crafting**
und **Aufbau**. Das Raster «Stadtplan» und die untere Bauleiste sind entfernt. Zustand je Gebäude:
`src/systems/GebaeudeStatus.ts`, Engpass-Sätze: `src/systems/EngpassSystem.ts`.
Wasser liefert jetzt jeder gebaute Brunnen für die ganze Stadt (es gibt keine Karte mehr für einen Umkreis).

## Kurz

- Das Spiel startet ohne Fehler, `npm run build` ist grün. Aussehen: Hauptmenü mit vier grossen Bildkacheln
  (Expeditionen, Helden, Gebäude & Crafting, Ranking), dunkles Fantasy-Design.
- «2D» heisst hier: Seit 31.03.2026 gibt es keine Spielkarte mehr (Phaser und Three.js entfernt), nur noch
  HTML-Bildschirme. Gebäude sind Bildkarten in einem Raster.
- Grösste Baustellen: Crafting hängt nicht mehr an Gebäuden, Expeditionen geben keinen Fortschritt
  (keine Erfahrung, kein Gildenrang), mehrere Sackgassen im Expeditionsablauf, viele Systeme sind nicht mehr angeschlossen.

## Was läuft

- Hauptmenü, Kopfzeile mit Rohstoffen, Tageszähler.
- Gebäude kaufen: Kosten werden abgezogen, Gebäude erscheint im Raster. Abreissen gibt 50 % zurück.
- Produktion im Hintergrund: Holzfäller, Farm, Steinbruch, Mühle, Mine produzieren, sobald ein Bewohner zugeteilt ist
  (automatisch). Bäckerei und Kräutergarten brauchen zusätzlich einen Brunnen.
- Steuern alle 30 Sekunden (ein «Tag»), Bevölkerung wächst mit Brot.
- Helden anheuern, trainieren, ausrüsten; Expedition starten, Kampfbildschirm, Beute-Truhe.
- Automatisches Speichern alle 60 Sekunden im Browser.

## Was kaputt ist

### Crafting (Christophs Hinweis bestätigt)
1. Der Reiter «Crafting» zeigt alle 28 Rezepte für sich allein: Klick auf «Herstellen» erzeugt die Ware sofort,
   egal ob man das Gebäude hat, ohne Wartezeit, ohne Arbeiter. Rezepte ohne Zutaten (Holz, Stein, Getreide, Eisen,
   Kräuter) geben unendlich Rohstoffe pro Klick. Das Spiel lässt sich damit leer klicken.
2. Schmiede, Arkanschmiede und Kriegsmaschinen-Werkstatt stellen nie etwas her: Sie warten auf einen Auftrag
   (`pendingCraft`, `ProductionSystem.ts:54`), den nur das alte Gebäude-Fenster setzen konnte (`_legacy/ui/HTMLBuildingPanel.ts:446`).
3. Rezept wählen geht nicht mehr: Jedes Gebäude bleibt beim ersten Rezept (`BuildingsScreen.ts:408`).
   Der Kräutergarten macht nur Kräuter, die Bäckerei nie Kraft-Brot.
4. Das Gebäude-Fenster zeigt nur Stufe, Arbeiter, Status und «Abreissen». Kein Rezept, kein Fortschritt, kein Ausbau.

### Expeditionen
5. Sackgasse nach einem Kampf in Raum 3, 6, 9 …: Der Kontrollpunkt danach wird nicht angezeigt, «Kämpfen» tut nichts
   (`ExpeditionSystem.ts:291`, `main.ts:225-233`). Betrifft u. a. Höhle, Waldruinen, Sumpf.
6. Neu laden während einer Expedition sperrt alle Expeditionen für immer (`main.ts:106`).
7. Kein Fortschritt: Erfahrung wird nie gutgeschrieben, Punkte immer 0, Gildenrang und besiegte Bosse ändern sich nie.
   Darum bleiben auf der Dungeon-Karte alle Routen ab Stufe 2 gesperrt (`DungeonMapScreen.ts:116-123`).
   Der alte Abschluss-Code (`_legacy/systems/ExpeditionFinalizer.ts`) wurde beim Umbau nicht übernommen.
8. Die Expeditionsliste ignoriert die Sperren (alle Routen spielbar), die Karte nicht. Widerspruch.
9. Gratis-Proviant: Jede Expedition bekommt Trank und Brot geschenkt, nicht Verbrauchtes wandert ins Lager. Vermehrt sich.
10. Händler- und Auswahl-Räume werden stumm übersprungen.

### Speichern und Sonstiges
11. Selbst hergestellte Arkan-Amulette werden beim Laden gelöscht (`SaveSystem.ts:111`).
12. Alte Spielstände mit Gebäuden BANK_V2/VAULT lassen den Spieltakt jede Sekunde abstürzen.
13. Alte Spielstände bekommen beim Laden ca. 27 Test-Gegenstände geschenkt (`SaveSystem.ts:359-381`).
14. Abreissen lässt die Arbeiter verschwinden; Startgebäude abreissen gibt Gratis-Rohstoffe.
15. Rezept `RCP_RANGER_CLOAK` ist bei der Schmiede eingetragen, existiert aber nicht.
16. Bauleiste zeigt nur Gold/Holz/Stein-Kosten, Eisen und Kristalle fehlen. Kauf-Fenster zeigt englische Namen («wood: 80/10»).
17. Test-Knöpfe für Spieler sichtbar («Alle Items einfügen», «Alle entdecken»).
18. Teamauswahl erlaubt 4 Helden, die Gildenhalle gibt aber nur 3 Plätze.
19. Bildschirme werden nur beim Start gezeichnet und beim Wechseln nicht aufgefrischt (Zahlen veralten).
20. Anheuern zeigt alle 10 Klassen, Freischaltung wird ignoriert.

### Nicht mehr angeschlossene Systeme
Erfolge, Monsterbuch-Fortschritt, Gebäude-Ausbau, Klassen-Freischaltung, Gildenrang, Ausrüstungs-Verschleiss,
NPC-Rettung, Talismane, Stadt-Ereignisse, Synergien, Wochen-Herausforderungen: Code ist da, wird aber nirgends aufgerufen.

## Balancing

- Start: 80 Holz, 15 Stein, 75 Gold, 5 Brot, 6 Bewohner, aber nur 1 Haus für 4. Zufriedenheit startet bei 30 %,
  Steuer nur 2 Gold pro Tag. Gold ist am Anfang viel zu knapp, Holz praktisch unendlich (Holzfäller kostet 10 Holz).
- Stein ist der Engpass: Die Eisenmine braucht den ganzen Startstein.
- Brot wird kaum gebraucht (nur für Wachstum), die Brot-Kette (Farm, Mühle, Bäckerei, Brunnen) lohnt sich kaum.
  → Behoben 21.10.2026 (PR #32): Die Bewohner essen jeden Tag Brot, siehe `docs/AUSBAU.md`.
- Nie erhältlich: Wasser, Glutwurzel, Schimmerpilz, Sumpfblüte, Knochenstaub, Mondkraut. Dadurch sind 5 von 7
  Trank-Rezepten unmöglich. Kristallsplitter fallen nur selten (ca. 5 % in seltener Beute), werden aber für fast
  alle besseren Rezepte und die Arkanschmiede gebraucht. → Behoben 18.10.2026, siehe `docs/BALANCING.md`.
- Helden: Die drei Startklassen sind viel schwächer als freischaltbare Klassen zum gleichen Preis
  (Wächter 25 Leben / 3 Angriff gegen Berserker 84 / 7). Der erste Wolf hat 35 Leben, mehr als ein Wächter.
- Belagerungs-Gegner springen auf Angriff 13-34 und Verteidigung 18-26. Mit der Schadensformel machen Helden dort fast
  nur noch 1 Schaden pro Treffer.
- Belohnung: eine kurze Waldexpedition bringt ca. 25 Gold, ein Held kostet 50 + 30 pro vorhandenem Held.

## Godot-Datei

`project.godot` (23.03.2026) ist ein leeres Godot-Projekt: keine Szenen, keine Skripte. Godot hat beim Öffnen nur
seinen Zwischenspeicher `.godot/` (ca. 830 MB) und die `*.import`-Dateien neben den Bildern angelegt. Es war ein kurzer
Versuch, der nie benutzt wurde. Kann gelöscht werden (`project.godot`, `icon.svg`, Ordner `.godot`, alle `*.import`).
Nicht auf GitHub übernommen.

## Repos

- `ChrisKoller35/Aufbauspiel-New` = der richtige Stand (PC-Ordner ist damit verbunden).
- `ChrisKoller35/Aufbauspiel` = älterer Stand vom 01.03.2026. Vorschlag: auf GitHub archivieren (nicht löschen).
- Auf dem PC liegen noch 3D-Modelle (über 1 GB, `public/assets/Gebäude`, `public/assets/models`, Meshy-Dateien).
  Das jetzige Spiel braucht sie nicht; sie sind im PC-Tag `backup-before-rebuild-2026-03-31` gesichert.
