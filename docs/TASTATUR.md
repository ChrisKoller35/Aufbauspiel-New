# Tastatur – das Spiel ohne Maus

Stand 6.11.2026. Grundlage ist «Reserve C» der Recherche vom 27.10. (`recherche/lesbarkeit.md`, Abschnitt 11):
Hauptmenü-Kacheln, Routenkarten und die Heldenwahl im Team gingen nur mit Maus oder Finger, ohne Maus gab es keine
Expedition. Jetzt geht der ganze Weg vom Hauptmenü bis zur Bilanz mit **Tab** und **Enter** (oder Leertaste), dazu
die Dungeonkarte und über sie der Raid. Maus und Finger bedienen alles wie vorher. Code: `src/ui/fokus.ts`,
`src/ui/html/tastatur.css` (Rahmen der Kartenknoten in `dungeonkarte.css`), Test `tests/tastatur.test.ts`.

## Was geht

| Bildschirm | Mit der Tastatur |
|---|---|
| Hauptmenü | Tab erreicht nach der Leiste und dem Stadtweg die fünf Kacheln, Enter öffnet sie. Ziffern 1/2/3/0 wechseln den Hintergrund wie bisher. |
| Expeditionen | Jede Routenkarte ist erreichbar, Enter öffnet das Team. Gesperrte Karten nennen den Sperrgrund, Enter tut dort nichts. |
| Dungeonkarte | Tab erreicht jeden Knoten (Name, Ebene, offen/geschafft/gesperrt) und zuletzt den Raid ganz oben; der Knoten leuchtet mit goldenem Rahmen. Enter öffnet sein Fenster mit dem Fokus auf «EXPEDITION STARTEN» oder «ERNEUT SPIELEN» (gesperrt: auf ✕), Tab bleibt darin und erreicht auch die Geschichte, Escape schliesst es, und der Fokus steht wieder auf dem Knoten. Enter auf dem Raid öffnet den Raid. |
| Raid | Seine Fenster (Geschichte, Regeln, Blatt, Ergebnis) nehmen den Fokus auf ihrem Hauptknopf, die Rückfrage vor einem Tagstein auf «Nein». Geht ein Fenster zu, steht der Fokus wieder, wo er vorher war. |
| Team | Jeder Held der Liste («Brom ins Team») und jeder besetzte Platz («Brom aus dem Team nehmen»). Der Fokus folgt dem Helden: Nach Enter steht er auf seinem Platz, nach dem Herausnehmen wieder in der Liste. Nach ± beim Proviant und nach dem Härtegrad bleibt er auf dem Knopf. |
| Helden | Nach einem Reiterwechsel, Training oder Anheuern bleibt der Fokus beim selben Knopf (auch wenn der Preis nach einem Aufstieg steigt), sonst auf dem aktiven Reiter. Steht er inzwischen im Heldenfenster oder auf einem anderen Bildschirm, bleibt er dort. |
| Fenster unterwegs | Einleitung, Wahl, Kontrollpunkt, Händler und Bilanz nehmen den Fokus (Hauptknopf, sonst der erste), Tab bleibt im Fenster. Escape drückt nur «ZURÜCK» vor dem Aufbruch (danach steht der Fokus wieder auf EXPEDITION STARTEN); in Entscheidungen tut es nichts und geht nie an das Spiel dahinter. Beim Händler bleibt der Fokus nach einem Kauf auf dem Kauf-Knopf. |
| Kampf | «Kampf starten!», «Nächste Runde →» und «Weiter» nehmen nacheinander den Fokus: Ein Kampf ist Enter, warten, Enter. Vor dem Kampf führt Umschalt+Tab zu Fähigkeiten, Vorräten und Gegnern: Enter wählt eine Fähigkeit, nutzt einen Vorrat oder wählt das Fokus-Ziel (wie der Klick auf den Gegner); der Fokus bleibt danach auf dem Knopf. Das Ziel trägt das Abzeichen «🎯 Ziel», der Tastatur-Rahmen ist gestrichelt. |
| Truhe | wie bisher: Enter oder Escape überspringt das Video, danach steht der Fokus auf «Einsammeln». |
| Bildschirmwechsel | Nach einem Wechsel mit der Tastatur (Enter, Escape, K, A, G) beginnt Tab oben im neuen Bildschirm, das Team für jede Route neu. Zurück auf einem Bildschirm steht der Fokus auf dem Knopf, mit dem man ihn verlassen hat, auch wenn man ihn mit der Maus verliess (dann auf der angeklickten Karte): nach der Expedition auf ihrer Routenkarte (auch wenn sie über die Karte kam), nach Escape auf der Kachel im Hauptmenü, nach dem Raid auf dem Raid-Knoten der Karte. K, A und G wirken nicht mit Strg, Cmd oder Alt (Strg+A markiert alles). |
| Gehaltene Taste | In einem Fenster löst eine gehaltene Enter- oder Leertaste nur einmal aus: Enter auf einem Knoten öffnet sein Fenster, startet aber nicht gleich die Expedition. |

Geprüft am 6.11. im Browser (Chromium, 1400 × 900): Waldpfad (kurz) mit vier Helden, nur Tab und Enter, vom
Hauptmenü über Einleitung, fünf Räume, Wahl, Kontrollpunkt, Truhe und Bilanz zurück; dazu Dungeonkarte, Raid hin
und zurück und die Befunde einer unabhängigen Prüfung (Fokus über Preisänderungen, Fenster mit Aufklappern,
gehaltene Tasten, Händler, Fähigkeiten und Vorräte im Kampf). Am Handy (390 und 360 px) und mit der Maus: Antippen
wie vorher, kein Springen der Seite, kein Fokusrahmen.

## Wie es gebaut ist

- **Deckknopf** (`deckknopf(label, schlüssel, gesperrt)`): ein unsichtbarer `<button>` über der ganzen Karte,
  `pointer-events: none`. Maus und Finger treffen weiter die Karte, Enter auf dem Knopf löst einen Klick aus, der
  zur Karte hochsteigt; die Klick-Hörer der Bildschirme bleiben unverändert. Mit dem Fokus zeigt die Karte innen
  einen goldenen Rahmen (2 px, nur `:focus-visible`). Vorbild ist `.hcard-oeffnen` der Heldenkarten.
- **Fokus über ein Neuzeichnen** (`fokusMerken` vor, `fokusZurueck` nach `innerHTML`): Wofür ein Knopf steht, sagt
  sein Schlüssel `data-fokus` (Deckknöpfe, etwa `held-3`), sonst seine id, sonst Tag und alle `data-`Attribute
  (`button[data-tab="train"]`). Gibt es den Knopf nicht mehr, gilt der erste Ersatz. Nach Maus oder Finger
  scrollt dabei nichts (`preventScroll`).
- **Womit zuletzt bedient wurde** (`eingabeBeobachten`, einmal in `main.ts`): Tasten setzen «Tastatur», jeder
  Zeigerdruck «Zeiger». Nur nach der Tastatur nimmt ein neuer Bildschirm oder der Hauptknopf im Kampf den Fokus.
- **Zurück auf einem Bildschirm** (`bildschirmVerlassen` im ScreenRouter vor jedem Wechsel, `bildschirmFokussieren`
  danach): Der Bildschirm, der geht, merkt sich seinen fokussierten Knopf wie beim Neuzeichnen, ohne Fokus den
  zuletzt angeklickten Knopf (oder den Deckknopf der angeklickten Karte), ohne beides nichts: Dann gilt auch die
  Marke eines früheren Besuchs nicht mehr. Kommt man mit der Tastatur zurück, bekommt dieser Knopf den Fokus, sonst
  der Bildschirm selbst. Ein neuer Einstieg setzt die Marke selbst (`bildschirmMarke`): Die Wahl einer Route löscht
  die des Teams und setzt die der Routenliste auf diese Route.
- **Schlüssel statt Preis:** Knöpfe, deren `data-`Attribute sich durch den Klick ändern, tragen ein festes
  `data-fokus` (TRAINIEREN, ANHEUERN, AUFNEHMEN, Fähigkeiten, Vorräte); `data-cost` zählt nie zum Selektor.
- **Fenster** (`FensterHilfen.ts`): Tab erreicht Knöpfe, Eingabefelder, Aufklapper (`<summary>`), Links und alles mit
  `tabindex` (`FENSTER_ZIELE`), nur sichtbare. Eine gehaltene Enter- oder Leertaste (`repeat`) wird im Fenster
  verworfen, ausser in einem Eingabefeld.
- **Knoten der Dungeonkarte** sind SVG-Gruppen mit `tabindex="0"`, `role="button"` und einem Namen; Enter und
  Leertaste lösen ihren Klick aus (`bindDungeonEvents`). Ihr Rahmen (`fokusRing`) ist ein eigenes Sechseck, denn
  `outline` zeichnet nicht jeder Browser um SVG.

## Neue Bildschirme

1. Eine Karte, die man irgendwo antippt, bekommt einen Deckknopf mit Namen, kein `tabindex` auf dem `div`.
2. Wer nach einem Klick neu zeichnet, ruft `fokusMerken` davor und `fokusZurueck` danach.
3. Ein Fenster über dem Spiel nimmt den Fokus und hält Tab mit `bindeFensterTasten` (`FensterHilfen.ts`).

## Noch nur mit Maus oder Finger

- Ziehen im Raid-Feld. Mit der Tastatur wählt man dort mit Tab und Enter erst den Helden, dann sein Feld (docs/RAID.md).
