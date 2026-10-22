# Spielstand sichern und laden

## Wo der Spielstand liegt

Der Spielstand lebt nur im Browser, im `localStorage`:

| Platz | Richtiges Spiel | Probespiel (`?probe`) |
|---|---|---|
| Spielstand | `magic_city_save` | `magic_city_probe` |
| Sicherung: der Stand vor dem letzten Speichern | `magic_city_save_backup` | `magic_city_probe_backup` |
| Stand vor dem Laden einer Datei | `magic_city_save_vor_laden` | `magic_city_probe_vor_laden` |
| Wann er dorthin kam (ms seit 1970) | `magic_city_save_vor_laden_zeit` | `magic_city_probe_vor_laden_zeit` |

Das Probespiel fasst die Plätze des richtigen Spiels nie an (`nutzeProbespiel` in `src/systems/SaveSystem.ts`).

Der Spielstand gehört zu genau einer Adresse in genau einem Browser. Mit einer anderen Adresse
(`127.0.0.1` statt `localhost`), in einem anderen Browser oder nach dem Löschen der Browserdaten
ist er nicht da. Deshalb gibt es das Fenster «Spielstand».

Das Spiel speichert alle 60 Sekunden, mit F5, nach Expeditionen, beim Start (z. B. wenn das
Auftragsbrett neue Zettel hat) und bei dem Ereignis `mc:speichern` (`src/main.ts`). Jedes Speichern
legt den vorigen Stand auf den Platz «Sicherung». Diese Sicherung ist also höchstens etwa eine
Minute alt und schützt nicht vor dem Laden einer falschen Datei. Dafür gibt es den Platz
«vor dem Laden»: Ihn schreibt nur das Fenster, `save()` fasst ihn nie an.

## Fenster «Spielstand»

Knopf **💾 Spielstand** im Hauptmenü unten rechts, neben der Hintergrund-Wahl. Auf Touch-Geräten
und schmalen Bildschirmen ist seine Tippfläche 44 px hoch, ohne dass Knopf oder Leiste wachsen.
Code: `src/ui/components/SpielstandFenster.ts`, Stile: `src/ui/html/spielstand.css`.

- **Oben:** was gespeichert ist: Tag, Stadtstufe, Anzahl Helden, höchste Heldenstufe.
  Beim Öffnen speichert das Spiel zuerst, die Angaben stimmen also mit dem Speicher überein.
  Im Probespiel steht zusätzlich, dass es einen eigenen Speicherplatz hat.
- **Herunterladen:** speichert zuerst (`mc:speichern`) und lädt den Spielstand als Datei herunter:
  `magic-city-tag-<Tag>-<JJJJ-MM-TT>.json`, im Probespiel `magic-city-probespiel-<Tag>-<JJJJ-MM-TT>.json`.
- **Datei laden:** Datei wählen. Das Spiel prüft sie (siehe unten) und zeigt, was drin ist
  (Tag, Stadtstufe, Helden), dazu: «Ersetzt deinen jetzigen Spielstand. Lade ihn vorher herunter,
  wenn du ihn behalten willst.» und «Bis du wieder eine Datei lädst, kannst du ihn hier zurückholen.»
  Erst **Laden und neu starten** schreibt:
  1. Das Spiel speichert den laufenden Stand (`mc:speichern`).
  2. Dieser Stand kommt auf den Platz «vor dem Laden», mit der Zeit dazu, der Stand aus der Datei auf
     den Spielstand. Hat der Browser keinen Platz, bleibt alles, wie es war.
  3. Die Seite lädt sofort neu.

  Vom Schreiben bis zum Neuladen speichert das Spiel nichts mehr: `save()` gibt `false` zurück, ein
  zweites Schreiben meldet «Das Spiel startet gerade neu.», alle Knöpfe im Fenster sind gesperrt.
  Sonst überschriebe das laufende Spiel den geladenen Stand (alle 60 s, F5) oder ein zweiter Klick
  schriebe nochmals. Im Probespiel wird nur der Probespiel-Speicherplatz ersetzt.
- **Neues Spiel:** fragt nach («Fängt von vorn an: Tag 1, die Startstadt, keine Helden.» und dass
  der jetzige Stand gesichert bleibt). Erst **Neu anfangen** schreibt: Das Spiel speichert den
  laufenden Stand, legt ihn auf den Platz «vor dem Laden» (mit Grund «neu»), leert Spielstand und
  Sicherung und lädt die Seite neu; `main.ts` findet keinen Stand und legt die Startstadt an. Gleiche
  Sperre wie beim Laden. Im Probespiel entspricht das `?probe=neu`, nur mit Rückweg.
- **Stand vor dem Laden** (nach «Neues Spiel»: **Stand vor dem Neustart**): steht unten im Fenster,
  sobald es ihn gibt: Tag, Stadtstufe, Helden und wann er gesichert wurde. **Zurückholen** fragt nach und tauscht ihn dann mit dem jetzigen Stand,
  danach lädt die Seite neu (gleiche Sperre wie oben). Der jetzige liegt danach auf dem Platz
  «vor dem Laden», das Zurückholen lässt sich also selbst wieder zurückholen. Erst das nächste Laden
  einer Datei oder das nächste «Neues Spiel» ersetzt ihn.
- **Fehler** stehen in einem Satz im Fenster:
  - «Die Datei lässt sich nicht lesen.» (kein JSON)
  - «Das ist keine Magic-City-Datei.» (Pflichtfeld fehlt oder hat die falsche Art, `saveVersion` keine ganze Zahl ab 0)
  - «Diese Datei ist von einer neueren Version des Spiels.» (`saveVersion` grösser als die aktuelle)
  - «Die Datei ist beschädigt.» (Form, Probe-Laden oder HTML-Zeichen, siehe unten)
  - «Die Datei ist zu gross für einen Spielstand.» (über 10 MB, wird gar nicht erst gelesen)
  - «Der Browser hat keinen Platz, um den Spielstand zu speichern.»
  - «Das Spiel startet gerade neu.», «Es gibt keinen Stand vor dem Laden.», «Es gibt noch keinen gespeicherten Spielstand.»
- **Bedienung:** Escape schliesst das Fenster, Tab bleibt im Fenster. Solange es offen ist, bekommen
  die Tastenkürzel des Spiels keine Taste (K, A, G und Escape in `main.ts`, 1/2/3/0 im Hauptmenü);
  F5 speichert wie immer. Der dunkle Hintergrund schliesst das Fenster nur mit einem einfachen Klick,
  der auch dort beginnt: Ein Doppelklick auf «💾 Spielstand» schliesst es nicht gleich wieder, und
  Text markieren und ausserhalb loslassen auch nicht. Der zweite Klick eines Doppelklicks auf ✕ öffnet
  keine Kachel dahinter. Texte im Fenster werden nie als HTML gesetzt (`textContent`).

## Was eine Datei bestehen muss

`pruefeSpielstandText(text)` in `src/systems/SaveSystem.ts` ist eine reine Funktion: Sie schreibt
nichts, ändert keinen ID-Zähler und wirft nie. Ergebnis `{ ok: true, zusammenfassung }` oder
`{ ok: false, grund }`. Die Schritte:

1. **Lesbares JSON.**
2. **Pflichtfelder:** `grid`, `buildings`, `citizens` und `fighters` sind Listen, `globalStock` ein
   Objekt. Eine `saveVersion` ist, wenn vorhanden, eine ganze Zahl ab 0 und nicht grösser als die
   aktuelle. Ältere Versionen und Stände ohne Version werden angenommen, `load()` hebt sie an.
3. **Form aller bekannten Felder** (`SPIELSTAND` in `SaveSystem.ts`, nach `src/models/`): Ein Feld
   darf fehlen (alte Stände, `load()` und die Systeme legen es an), aber was da ist, hat die Form, mit
   der das Spiel rechnet. Pflicht sind ausserdem `day` (endliche Zahl), bei jedem Gebäude `id` und
   `typeId`, bei jedem Bewohner `id`, bei jedem Helden `id`, `baseStats.maxHp` und `gear`. Die Felder
   aus PR #29 (`geschichten`, `bezwungen`, `rangliste`, `schmiede`, `auftragsbrett`, `trophaeen`, am
   Gebäude `vonSelbst`, am Helden `wegBilanz`) haben ihre innere Form.
4. **Probe-Laden** auf dem gelesenen Stand (`SaveSystem.probeLaden`), mit derselben Logik wie beim
   Start: alte Version anheben, neue Felder anlegen, hängende Zustände lösen (siehe unten), unbekannte
   Gebäude-Arten ablehnen, Helden-Bindungen lösen, eine unterbrochene Expedition abbrechen, Leben
   auffüllen, dazu was das Hauptmenü liest (Rangliste, Auftragsbrett). Wirft ein Schritt, startet das
   Spiel mit diesem Stand nicht. **Kommt in `main.ts` beim Start ein Schritt dazu, gehört er auch in
   `probeLaden`.**
5. **Nach dem Probe-Laden** nochmals die Form, und kein Text und kein Schlüssel enthält `<`, `>` oder
   `"`. Viele Bildschirme setzen Texte aus dem Spielstand ungeschützt ins HTML, z. B. `day` in der
   Kopfzeile, Name und Klasse der Helden, IDs von Gegenständen, Gebäuden und Rezepten (auch in
   `data-…="…"`), die Schlüssel von Lager und Beute, Rangliste und Auftragsbrett. Spielstände aus dem
   Spiel enthalten keines dieser Zeichen. Der Kampfbericht einer unterbrochenen Expedition enthält `>>`;
   der Start bricht sie ab, deshalb kommt diese Prüfung erst nach dem Probe-Laden.

Schlägt Schritt 3 bis 5 fehl: «Die Datei ist beschädigt.»

`tests/spielstandDatei.test.ts` prüft echte Spielstände: ein neues Spiel, das Probespiel «Gut»
(`?probe`) und «Stark» (`?probe=sterne`), 40 Tage mit angeheuerten Helden und Expeditionen, drei
Wochen mit Rangliste, Gildenhaus, Schmiede, Geschichten, Wegen und Werkstatt-Aufträgen, und einen
Stand mitten in einer Expedition. **Wer die Form eines gespeicherten Felds ändert, passt `SPIELSTAND`
an**, sonst schlägt dieser Test an.

Logik in `src/systems/SaveSystem.ts`: `pruefeSpielstandText(text)`, `spielstandDateiname(tag)`,
`SaveSystem.spielstandText()`, `.schreibeSpielstandText(text)`, `.standVorLaden()`,
`.holeStandVorLadenZurueck()`, `.probeLaden(state)`.

## Was beim Laden alter Stände gelöst wird

`loeseAlteZustaende(state)` läuft bei jedem Laden nach der Migration, auch beim Laden der Sicherung
und beim Probe-Laden einer Datei. Sie braucht keine neue SaveVersion, weil das heutige Spiel diese
Zustände nie setzt:

| Zustand | Warum er hängt | Was passiert |
|---|---|---|
| `eventPaused` (Unwetter) | Stadt-Ereignisse laufen nicht mehr, niemand hebt die Pause auf | `false` |
| `activeEvent` (laufendes Stadt-Ereignis) | läuft nie mehr ab | `null` |
| `gearNeedsRepair` | halbiert die Werte der Ausrüstung, Reparieren gibt es nicht mehr | `false`, volle Werte |
| `built === false` (im Bau) | Bauen ist sofort fertig, nichts zählt `buildProgress` hoch | `built = true` |

**Wer Stadt-Ereignisse (`CityEventSystem.dayTick`), die Reparatur (`GearMaintenanceSystem`) oder eine
Bauzeit wieder anschliesst, muss die passende Zeile aus `loeseAlteZustaende` entfernen**, sonst löst
jedes Laden diese Zustände wieder auf.
