# The Guild Hard - Nächste Änderungen (Expeditionssystem / Dungeon)

## Kurzkontext (wie besprochen)
- **Startseite:** Titel **"The Guild Hard"**
- **UI-Problem oben beim Symbol:** Das Symbol mit **weißem Rand auf schwarzem Hintergrund** schaut nicht gut aus und sollte optisch überarbeitet werden.
- **Klassen-Überarbeitung:** Das, was wir bei den Klassen überarbeitet haben, ist schon ziemlich cool / schon recht gut.

---

## Expeditionssystem - Überarbeitung (Gameplay / Flow)

### Aktueller Ablauf (vereinfacht)
Wenn man einen Dungeon startet, muss man kurz warten, bis es losgeht. Dann ist das Team fertig, man wählt **Mission Start**, kommt in den ersten Raum und danach geht es weiter.

### Ziel der Überarbeitung
Das Grundprinzip mit den verschiedenen Phasen ist cool. Es soll aber **spannender**, **klarer** und **mehr mit dem Dungeon verknüpft** sein.

---

## 1) Vorbereitungsphase im Raum (vor dem Kampf)

Wenn man in den ersten Raum kommt und die Party angezeigt wird:

- Es wäre schön, wenn es **ein Bild von jedem Kämpfer** gäbe.
- Es wäre cool, wenn man auch sieht, **wer der Gegner ist** - also ebenfalls **ein Bild vom Gegner**.

### Unten ist viel Platz -> Item-/Trankbereich nutzen
Unten ist aktuell viel Platz. Dort wäre eine Liste sinnvoll, z. B.:
- **Heiltrank**
- **Stärkungstrank**
- **Rüstungstrank**

Zum Testen können direkt mal drei Items eingefügt werden:
- 1x Heiltrank
- 1x Rüstungstrank
- 1x Stärkungstrank

Diese sollen in der **Vorbereitungsphase** nutzbar sein (wenn nötig), bevor man in den nächsten Raum / Kampf geht.

---

## 2) Kampfstart / Kampfauswahl (kein Zeitlimit)

Aktuell kommt man in den Kampf und hat ca. **5 Sekunden Zeit**, dann geht es automatisch los.

### Wunsch
- **Zeitlimit entfernen**
- **Kein Auto-Start des Kampfes**
- Der Spieler soll zuerst auswählen können, **was er machen möchte**

Ja, dann ist es nicht mehr wirklich ein klassischer Autobattler - aber ich glaube, so wird es cooler.

---

## 3) Kampf-UI (Fähigkeiten sichtbar und planbar machen)

Auch im Kampf ist unten viel Platz. Diesen Bereich sollte man nutzen.

### Heldenfähigkeiten (anklickbar)
- Unten sollen die **Fähigkeiten der Helden** aufgelistet werden.
- Man kann auswählen / anklicken, **wer welche Fähigkeit anwendet**.

### Gegnerfähigkeiten (nur Info)
- Auf der Gegenseite sollte man die **Fähigkeiten der Gegner sehen**, damit man weiß, was die können.
- Diese sind **nicht anwählbar** (nur Information).

### Kampf starten
Wenn man seine Fähigkeiten ausgewählt hat, klickt man auf **Weiter / Kampf starten** - und dann beginnt der Kampf.

---

## 4) Nach dem Kampf -> zurück in die Vorbereitungsphase

Nach dem Kampf kommt man wieder in die Vorbereitungsphase.

Wenn man brutal angeschlagen ist, könnte man dort theoretisch einen Trank oder ein Kraut und alles, was man auf die Mission mitgenommen hat, einnehmen.

### Inventarplätze / Mitnahme-System (Vorschlag)
- **6 Plätze insgesamt**
- **Jeder Held kann 2 Sachen mitnehmen**

Ziel: Man kann länger auf einer Mission überstehen.

---

## 5) Gegner-Spirits prüfen (Content-Korrektur)

Ich habe gesehen, dass die Gegner **nicht alle Spirits** haben.

Das muss man mal durchschauen - aber **nicht bei jeder Mission**.

### Fokus zuerst
Es reicht vorerst bei der **ersten Mission "Waldpfad"**, damit dort sicher alle Spirits der Gegner stimmen.

---

## 6) Dungeon sichtbar auf der Welt / Map integrieren (Orientierung + Spannung)

### Problem aktuell
Das Ganze ist im Moment nicht ganz so spannend, weil:
- man nicht wirklich sieht, **wo der Dungeon ist**
- man nicht wirklich weiß, **wo man sich befindet**

Das ist schade, weil dadurch der Zusammenhang zwischen Welt, Expedition und Kämpfen fehlt.

### Ziel
Einen **sichtbaren Dungeon-Ort auf der Map** einbauen, damit der Spieler ein klares Ziel / einen echten Ort hat.

---

## 7) Neuer sichtbarer Dungeon-Bereich auf der Map

### Grundidee
Links vom Spielfeld (vorerst als Platzhalter-Position gedacht) soll ein **Dungeon-Bereich** entstehen:
- **Berg**
- **Dungeon-Eingang**
- **Dungeon-Lager** (neues Gebäude)

Hinweis: Die Position "links" ist erst mal als Richtung gemeint - das kann im Layout später noch angepasst werden.

---

## 8) Offene Frage: Wie baut man einen großen Berg auf einer isometrischen 3D-Map?

**Fragezeichen / Designentscheidung:**
Wie fügt man auf einer **3D-Map mit isometrischer Perspektive (Top-Down / schräge 3D-Einsicht)** einen großen Berg sinnvoll ein?

### Mein Ergänzungsvorschlag (klar definiert)
Ich würde das **hybrid** lösen:

1. **Berg als großes statisches Map-Objekt** (3D-Objekt oder Tile-Cluster)
   - damit Perspektive, Größe und Tiefe sauber wirken
   - damit es als echter Landmark auf der Map funktioniert

2. **Dungeon-Eingang als separates Objekt / Sprite (Spirit)**
   - einfacher austauschbar (später verschiedene Dungeon-Typen)
   - visuell klar erkennbar (Tor, Höhlenportal, Runen-Eingang etc.)

3. **Optional: Effekte / Deko als zusätzliche Spirits**
   - Nebel, Fackeln, Rauch, magische Runen, Lichtschein
   - macht den Ort direkt spannender

### Warum nicht nur ein riesiger Sprite?
Ein einzelner riesiger Sprite kann auf einer isometrischen Map schnell falsch wirken (Skalierung / Perspektive / Tiefenwirkung). Deshalb ist ein echtes Map-Objekt für den Berg meistens sauberer.

### Schneller Umsetzungsstart (pragmatisch)
- **Phase 1 (schneller Test):**
  - einfacher Berg-Block mit Textur (Platzhalter)
  - Eingang als Sprite/Spirit
  - Dungeon-Lager als separates Gebäude
- **Phase 2 (Polish):**
  - schönere Bergform
  - Umgebung (Felsen, Weg, Bäume, Fackeln)
  - bessere visuelle Verbindung zwischen Straße, Lager und Eingang

---

## 9) Dungeon-Eingang (sichtbar / modular)

Der **Dungeon-Eingang** kann man sich gut über einen **Sprite/Spirit** lösen (optisches Element), evtl. kombiniert mit einem kleinen 3D-Rahmen / Portalobjekt.

Ziel: Sofort erkennbar machen, dass das **der Einstieg in die Expedition** ist.

---

## 10) Neues Gebäude: Dungeon-Lager

Es braucht ein zusätzliches Gebäude auf der Map: **Dungeon-Lager**.

### Anforderungen
- Größe: mindestens so groß wie die **Gilde**, eher etwas größer
- Platzierung: nur **vor dem Dungeon** platzierbar
- Verbindung: Man muss die **Straße dorthin bauen**

### Expeditionsfenster dorthin verschieben
Das bisherige **Expeditionsfenster / Expeditions-Teilfenster** soll in dieses **Dungeon-Lager** verschoben werden.

---

## 11) Dungeon-Map als eigene Übersicht (Wo bin ich im Dungeon?)

Danach muss man irgendwie wissen, **wo man in diesem Dungeon ist**.

### Wunsch
Wenn man auf die Expedition klickt, bekommt man eine **eigene Dungeon-Map** (eine einzelne Übersicht).

Man sieht:
- den **Eingang**
- einen größeren Ausschnitt vom Dungeon
- den Verlauf / Weg zur Mission
- wichtige Punkte / Räume
- z. B. auch den Punkt, wo der Boss des ersten Dungeon-Abschnitts ist

### Bildidee / Darstellung
So wie eine Karte bzw. ein Ausschnitt von einem Gebäude - aber als **größerer seitlicher Ausschnitt** vom Dungeon.

Man sieht dann z. B.:
- "Ich bin jetzt beim Eingang"
- die erste Mission / der Weg führt zu diesem Punkt
- dort ist der Boss vom ersten Dungeon

Dann weiß man sofort besser, wo man ist und wie man sich durch den Dungeon bewegt.

---

## 12) Struktur der Dungeon-Map (visuelles Konzept)

Die Map sollte so ein bisschen:
- **raufgehen**
- **nach hinten gehen**
- **auch runtergehen**

Also nicht nur flach sein, sondern wie eine **aufgeschnittene Berginnenwelt / Höhle / Dungeon-Struktur** mit verschiedenen Ebenen und Räumen.

### Ergänzungsvorschlag (klarer definiert)
Die Dungeon-Map kann aus mehreren visuellen Bauteilen bestehen (verschiedene Spirits / Tiles / Layer):

- **Hintergrund-Layer:** Felswand / Berginnenfläche
- **Pfad-/Routen-Layer:** begehbare Wege / Verbindungen zwischen Punkten
- **Raum-/Knoten-Layer:** Räume, Events, Kämpfe, Bossräume
- **Marker-Layer:** aktueller Standort des Spielers, erreichbare Ziele, abgeschlossene Punkte
- **Deko-/Atmosphäre-Layer:** Fackeln, Kristalle, Nebel, Risse, Runen, Wasser, Holzstege usw.

So sieht die Dungeon-Map nicht nur funktional aus, sondern auch "cool" und klar lesbar.

---

## 13) Navigation auf der Dungeon-Map (nur Missionen auf der Map anzeigen)

Wichtig: Auf der Dungeon-Map sollen **nicht die einzelnen Abschnitte/Räume einer Mission** dargestellt werden, sondern **nur die Missionen** selbst (als Wegpunkte auf der Map).

Der Grund ist:
- Eine **Mission hat bereits intern verschiedene Abschnitte/Räume**
- Diese sind schon im bestehenden Missionssystem definiert
- Am Schluss kommt innerhalb der Mission immer ein **Boss**
- Das sollte **nicht doppelt** auf der Dungeon-Map nachgebaut werden

### Ziel
Die Dungeon-Map zeigt nur die **grobe Orientierung im Dungeon**:
- **Von Punkt A nach Punkt B**
- Also: **welche Mission als Nächstes**
- Nicht: alle Räume/Abschnitte innerhalb dieser Mission

Dadurch bleibt alles konsistent mit dem bestehenden System und man muss im Missionsablauf selbst nichts neu umbauen.

### Beispielhafte Anzeige auf der Dungeon-Map
- Eingang
- [Missionsname 1]
- [Missionsname 2]
- [Missionsname 3]
- ...

### Boss-Hinweis auf der Map
Da jede Mission intern am Ende einen Boss hat, könnte man auf dem jeweiligen Missionspunkt auf der Dungeon-Map **optional markieren**, welcher Boss dort wartet (z. B. kleines Symbol/Portrait/Marker).

Wichtig dabei:
- Die Map zeigt weiterhin **nur die Mission**
- Der Boss-Hinweis ist nur zur Orientierung / Vorschau
- Der eigentliche Bosskampf bleibt wie bisher **innerhalb der Mission** am Ende

---

## 14) Ablauf im Dungeon (Fortschritt sichtbar und logisch)

Der Spieler soll auf der Dungeon-Map auswählen können, **welche Mission als Nächstes** gemacht wird.

### Gewünschter Ablauf
- Man sieht auf der Dungeon-Map den aktuellen Standort
- Man wählt die nächste Mission (z. B. von hier zu Punkt B)
- Dann startet diese Mission
- Die Mission läuft intern so ab, wie sie bereits definiert ist (inkl. Räume/Abschnitte/Boss)
- Nach Abschluss kommt wieder die Frage:
  - **Möchtest du weiter?**
  - **Möchtest du nicht weiter?**
- Wenn man weiter möchte:
  - Dungeon-Map wieder anzeigen
  - nächste Mission auswählen
- So kämpft man sich Schritt für Schritt durch den Dungeon

---

## 15) Wichtig: Grundprinzip der Kämpfe beibehalten

Das Grundprinzip von den Kämpfen finde ich gut - vor allem, dass es **verschiedene Phasen** hat. So wie die Kämpfe jetzt aufgebaut sind, ist es cool.

### Was sich ändern soll
Nicht das Grundprinzip kaputtmachen, sondern:
- mehr Auswahl vor dem Kampf
- mehr Übersicht im Kampf
- mehr Zusammenhang zum Dungeon / Ort / Fortschritt

Genau das ist der Kern der Änderungen.

---

## Zusammenfassung der Änderungen (kurz für Agent)

1. **Startseiten-Icon optisch fixen** (weißer Rand auf schwarz entfernen / verbessern)
2. **Expeditions-Vorbereitungsphase erweitern** (Bilder für Party + Gegner, Itembereich unten)
3. **Kampf-Autostart entfernen** (kein 5-Sekunden-Timer)
4. **Fähigkeiten-Auswahl vor Kampfbeginn** (Helden aktiv wählbar, Gegnerfähigkeiten nur sichtbar)
5. **Nach Kampf zurück in Vorbereitungsphase** mit nutzbaren mitgebrachten Items
6. **Inventarsystem für Expeditionen** (6 Slots, je Held 2 Items)
7. **Spirits der Gegner prüfen** (zuerst Mission "Waldpfad")
8. **Dungeon als sichtbarer Ort auf Welt-Map** (Berg + Eingang + Dungeon-Lager)
9. **Dungeon-Lager als neues Gebäude** und Expeditionsfenster dorthin verschieben
10. **Dungeon-Map als eigene Fortschrittsübersicht** (Standort + Wege + Missionen sichtbar)
11. **Dungeon-Navigation auf Missionsebene** (Mission wählen, nach Abschluss weiter / nicht weiter)
12. **Boss-Hinweis optional auf Missionspunkten** (nur Vorschau/Marker auf der Map)
13. **Kampf-Phasen-Grundprinzip beibehalten**, aber stärker mit Dungeon-Kontext verbinden

---
