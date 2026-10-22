# Spielstand sichern und laden

## Wo der Spielstand liegt

Der Spielstand lebt nur im Browser, im `localStorage`:

| Spiel | Spielstand | Sicherung (Stand davor) |
|---|---|---|
| Richtiges Spiel | `magic_city_save` | `magic_city_save_backup` |
| Probespiel (`?probe`) | `magic_city_probe` | `magic_city_probe_backup` |

Der Spielstand gehört zu genau einer Adresse in genau einem Browser. Mit einer anderen Adresse
(`127.0.0.1` statt `localhost`), in einem anderen Browser oder nach dem Löschen der Browserdaten
ist er nicht da. Deshalb gibt es das Fenster «Spielstand».

Das Spiel speichert alle 60 Sekunden, mit F5, nach Expeditionen und bei dem Ereignis
`mc:speichern` (`src/main.ts`). Beim Speichern wird der vorige Stand zur Sicherung.

## Fenster «Spielstand»

Knopf **💾 Spielstand** im Hauptmenü unten rechts, neben der Hintergrund-Wahl.
Code: `src/ui/components/SpielstandFenster.ts`, Stile: `src/ui/html/spielstand.css`.

- **Oben:** was gespeichert ist: Tag, Stadtstufe, Anzahl Helden, höchste Heldenstufe.
  Beim Öffnen speichert das Spiel zuerst, die Angaben stimmen also mit dem Speicher überein.
  Im Probespiel steht zusätzlich, dass es einen eigenen Speicherplatz hat.
- **Herunterladen:** speichert zuerst (`mc:speichern`) und lädt den Spielstand als Datei herunter:
  `magic-city-tag-<Tag>-<JJJJ-MM-TT>.json`, im Probespiel `magic-city-probespiel-<Tag>-<JJJJ-MM-TT>.json`.
- **Datei laden:** Datei wählen. Das Spiel prüft sie und zeigt, was drin ist (Tag, Stadtstufe, Helden),
  dazu: «Ersetzt deinen jetzigen Spielstand. Lade ihn vorher herunter, wenn du ihn behalten willst.»
  Erst **Laden und neu starten** schreibt den Stand. Der bisherige Stand bleibt als Sicherung, und die Seite
  lädt sofort neu, damit das laufende Spiel den geladenen Stand nicht wieder überschreibt.
  Im Probespiel wird nur der Probespiel-Speicherplatz ersetzt.
- **Fehler** stehen in einem Satz im Fenster:
  - «Die Datei lässt sich nicht lesen.» (kein JSON)
  - «Das ist keine Magic-City-Datei.» (es fehlt `grid`, `buildings`, `globalStock`, `citizens` oder `fighters`)
  - «Diese Datei ist von einer neueren Version des Spiels.» (`saveVersion` grösser als die aktuelle)
  - «Der Browser hat keinen Platz, um den Spielstand zu speichern.»

Ältere Versionen werden angenommen. `load()` hebt sie wie jeden alten Spielstand an.

Logik in `src/systems/SaveSystem.ts`:
`pruefeSpielstandText(text)` (reine Funktion, `{ ok: true, zusammenfassung }` oder `{ ok: false, grund }`),
`SaveSystem.spielstandText()`, `SaveSystem.schreibeSpielstandText(text)`, `spielstandDateiname(tag)`.

## Was beim Laden alter Stände gelöst wird

`loeseAlteZustaende(state)` läuft bei jedem Laden nach der Migration, auch beim Laden der Sicherung.
Sie braucht keine neue SaveVersion, weil das heutige Spiel diese Zustände nie setzt:

| Zustand | Warum er hängt | Was passiert |
|---|---|---|
| `eventPaused` (Unwetter) | Stadt-Ereignisse laufen nicht mehr, niemand hebt die Pause auf | `false` |
| `activeEvent` (laufendes Stadt-Ereignis) | läuft nie mehr ab | `null` |
| `gearNeedsRepair` | halbiert die Werte der Ausrüstung, Reparieren gibt es nicht mehr | `false`, volle Werte |
| `built === false` (im Bau) | Bauen ist sofort fertig, nichts zählt `buildProgress` hoch | `built = true` |
