# Spielstand sichern und laden

## Wo der Spielstand liegt

Der Spielstand lebt nur im Browser, im `localStorage`:

| Platz | Richtiges Spiel | Probespiel (`?probe`) |
|---|---|---|
| Spielstand | `magic_city_save` | `magic_city_probe` |
| Sicherung: der Stand vor dem letzten Speichern | `magic_city_save_backup` | `magic_city_probe_backup` |
| Stand vor dem Laden einer Datei | `magic_city_save_vor_laden` | `magic_city_probe_vor_laden` |
| Wann er dorthin kam (ms seit 1970) | `magic_city_save_vor_laden_zeit` | `magic_city_probe_vor_laden_zeit` |
| Warum («neu» nach «Neues Spiel», sonst fehlt der Platz) | `magic_city_save_vor_laden_grund` | `magic_city_probe_vor_laden_grund` |

Das Probespiel fasst die Plätze des richtigen Spiels nie an (`nutzeProbespiel` in `src/systems/SaveSystem.ts`).

Der Spielstand gehört zu genau einer Adresse in genau einem Browser. Mit einer anderen Adresse
(`127.0.0.1` statt `localhost`), in einem anderen Browser oder nach dem Löschen der Browserdaten
ist er nicht da. Deshalb gibt es das Fenster «Spielstand».

Das Spiel speichert alle 60 Sekunden, mit F5, nach Expeditionen, beim Start (z. B. wenn das
Auftragsbrett neue Zettel hat) und bei dem Ereignis `mc:speichern` (`src/main.ts`; das lösen unter anderem
Händler-Fenster, Bau, Ausbau und der Weg eines Helden aus). Jedes Speichern legt den vorigen Stand auf den Platz
«Sicherung». Diese Sicherung ist also höchstens etwa eine Minute alt und schützt nicht vor dem Laden einer
falschen Datei. **Das Spiel liest sie nie selbst** (ein `loadBackup` gibt es nicht mehr): Wer sie braucht, kopiert
sie von Hand auf den Platz «Spielstand» (Browser-Entwicklerwerkzeuge, Speicher). Ist der Speicher voll, opfert
`save()` zuerst die Sicherung, dann kürzt es die Bestenliste auf 10 Einträge. Dafür gibt es den Platz
«vor dem Laden»: Ihn schreibt nur das Fenster, `save()` fasst ihn nie an.

## Version und Spielstände vor der Gildenstadt

`CURRENT_VERSION` ist **24**, die Gildenstadt (`docs/GILDENSTADT.md`). Es gibt **keine Migration** mehr: Ein Stand
mit kleinerer Version, ohne Version oder mit einer Version, die keine ganze Zahl ist, gilt beim Start wie «kein
Spielstand». `load()` liefert dann `null`, `main.ts` legt eine neue Stadt an und zeigt einmal in der Kopfzeile
«Dieser Spielstand stammt aus der Zeit vor der Gildenstadt und kann nicht geladen werden.»
(`VOR_GILDENSTADT`, `alterStandVerworfenBeimStart()`; 10 Sekunden lang, `zeigeKopfHinweis(text, 10_000)` in
`src/ui/screens/HeaderRenderer.ts`). Der alte Stand bleibt im Speicher, bis das neue Spiel zum
ersten Mal speichert; dann liegt er auf dem Platz «Sicherung». Ein Stand mit grösserer Version wird beim Start
weiterhin geladen; nur Dateien werden als «neuer als das Spiel» abgewiesen.

Im Fenster «Spielstand» erscheint derselbe Satz für alte Dateien, und ein «Stand vor dem Laden» aus dieser Zeit
wird nicht angeboten (zurückgeholt würde er nicht geladen).

## Fenster «Spielstand»

Knopf **💾 Spielstand** im Hauptmenü in der Leiste unter dem Titel, neben der Hintergrund-Wahl. Auf Touch-Geräten
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
- **Neues Spiel:** fragt nach («Fängt von vorn an: Tag 1, die Startstadt, ein Held.» und dass
  der jetzige Stand gesichert bleibt). Erst **Neu anfangen** schreibt: Das Spiel speichert den
  laufenden Stand, legt ihn auf den Platz «vor dem Laden» (mit Grund «neu»), leert Spielstand und
  Sicherung und lädt die Seite neu; `main.ts` findet keinen Stand und legt die Startstadt an (Gildenhaus und
  Händler, ein Guardian, 200 Gold, 5 Brot, 2 Heiltränke, eine Novizenrobe). Gleiche Sperre wie beim Laden. Im Probespiel
  entspricht das `?probe=neu`, nur mit Rückweg.
- **Stand vor dem Laden** (nach «Neues Spiel»: **Stand vor dem Neustart**): steht unten im Fenster,
  sobald es ihn gibt: Tag, Stadtstufe, Helden und wann er gesichert wurde. **Zurückholen** fragt nach und tauscht ihn
  dann mit dem jetzigen Stand, danach lädt die Seite neu (gleiche Sperre wie oben). Der jetzige liegt danach auf
  dem Platz «vor dem Laden», das Zurückholen lässt sich also selbst wieder zurückholen. Erst das nächste Laden
  einer Datei oder das nächste «Neues Spiel» ersetzt ihn.
- **Fehler** stehen in einem Satz im Fenster:
  - «Die Datei lässt sich nicht lesen.» (kein JSON)
  - «Das ist keine Magic-City-Datei.» (Pflichtfeld fehlt oder hat die falsche Art, `saveVersion` keine ganze Zahl ab 0)
  - «Diese Datei ist von einer neueren Version des Spiels.» (`saveVersion` grösser als die aktuelle)
  - «Dieser Spielstand stammt aus der Zeit vor der Gildenstadt und kann nicht geladen werden.» (`saveVersion` unter 24)
  - «Die Datei ist beschädigt.» (Form, Probe-Laden oder HTML-Zeichen, siehe unten)
  - «Die Datei ist zu gross für einen Spielstand.» (über 10 MB, wird gar nicht erst gelesen)
  - «Der Browser hat keinen Platz, um den Spielstand zu speichern.»
  - «Das Spiel startet gerade neu.», «Es gibt keinen Stand vor dem Laden.», «Es gibt noch keinen gespeicherten Spielstand.»
- **Bedienung:** Escape schliesst das Fenster, Tab bleibt im Fenster (so auch Stadtweg-, Händler- und
  Gebäude-Fenster und der Bau-Dialog, `src/ui/components/FensterHilfen.ts`). Solange es offen ist, bekommen
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
2. **Pflichtfelder:** `buildings` und `fighters` sind Listen, `globalStock` ein Objekt (`istMagicCityStand`).
   Eine `saveVersion` ist, wenn vorhanden, eine ganze Zahl ab 0 und nicht grösser als die aktuelle; unter 24
   (oder ohne Version) heisst «vor der Gildenstadt» und wird abgelehnt.
3. **Form aller bekannten Felder** (`SPIELSTAND` in `src/systems/SpielstandSchema.ts`, nach `src/models/`):
   Ein Feld darf fehlen (`load()` und die Systeme legen es an), aber was da ist, hat die Form, mit der das Spiel
   rechnet. Pflicht sind `buildings`, `globalStock`, `fighters` und `day`, bei jedem Gebäude `id` und `typeId`, bei
   jedem Helden `id`, `baseStats.maxHp` und `gear`. Auftragsbrett, Rangliste, Stadtweg, Geschichten, Schmiede,
   Trophäen und am Gebäude `vonSelbst`, `tier`, `pendingCraft`, `auftraege` haben ihre innere
   Form. Alte Felder (Bewohner, Raster, Zufriedenheit, Ereignisse, Spezialisten, Talismane, Kriegsmaschinen-Auswahl,
   Tutorial, Kacheln) kennt das Schema nicht; stehen sie in einer Datei, werden sie weder geprüft noch gelesen.
4. **Probe-Laden** auf dem gelesenen Stand (`SaveSystem.probeLaden`), mit derselben Logik wie beim
   Start: fehlende Felder anlegen, unverbaute Baupläne alter Stände zum alten Händlerpreis in Gold tauschen
   (`tauscheBauplaeneInGold`, seit 23.10.2026), unbekannte Gebäude-Arten ablehnen, doppelte
   Gebäude derselben Art zu einem verschmelzen (`vereinigeDoppelte`), eine
   unterbrochene Expedition abbrechen, Leben auffüllen, dazu was das Hauptmenü liest (Rangliste,
   Auftragsbrett). Wirft ein Schritt, startet das Spiel mit diesem Stand nicht. **Kommt in `main.ts` beim
   Start ein Schritt dazu, gehört er auch in `probeLaden`.**
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
in `SpielstandSchema.ts` an**, sonst schlägt dieser Test an. `src/systems/SaveSystem.test.ts` prüft Version,
Sicherung, Sperre und die Plätze.

Logik in `src/systems/SaveSystem.ts`: `pruefeSpielstandText(text)`, `spielstandDateiname(tag)`,
`SaveSystem.spielstandText()`, `.schreibeSpielstandText(text)`, `.neuesSpiel()`, `.standVorLaden()`,
`.holeStandVorLadenZurueck()`, `.probeLaden(state)`; Form der Felder in `src/systems/SpielstandSchema.ts`.

## Der Spieltag

Ein Spieltag dauert 30 Sekunden (`TAG_SEKUNDEN` in `src/systems/Tag.ts`); `neuerTag(state)` zählt `day` hoch,
setzt `statistics.total_days_survived = day - 1` und prüft die Erfolge. Der Tag steht in der Kopfzeile, in der
Bestenliste (Tag der Expedition) und im Fenster «Spielstand».
