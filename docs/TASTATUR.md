# Tastatur – das Spiel ohne Maus

Stand 6.11.2026. Grundlage ist «Reserve C» der Recherche vom 27.10. (`recherche/lesbarkeit.md`, Abschnitt 11):
Hauptmenü-Kacheln, Routenkarten und die Heldenwahl im Team gingen nur mit Maus oder Finger, ohne Maus gab es keine
Expedition. Jetzt geht der ganze Weg vom Hauptmenü bis zur Bilanz mit **Tab** und **Enter** (oder Leertaste).
Maus und Finger bedienen alles wie vorher. Code: `src/ui/fokus.ts`, `src/ui/html/tastatur.css`,
Test `tests/tastatur.test.ts`.

## Was geht

| Bildschirm | Mit der Tastatur |
|---|---|
| Hauptmenü | Tab erreicht nach der Leiste und dem Stadtweg die fünf Kacheln, Enter öffnet sie. Ziffern 1/2/3/0 wechseln den Hintergrund wie bisher. |
| Expeditionen | Jede Routenkarte ist erreichbar, Enter öffnet das Team. Gesperrte Karten nennen den Sperrgrund, Enter tut dort nichts. |
| Team | Jeder Held der Liste («Brom ins Team») und jeder besetzte Platz («Brom aus dem Team nehmen»). Der Fokus folgt dem Helden: Nach Enter steht er auf seinem Platz, nach dem Herausnehmen wieder in der Liste. Nach ± beim Proviant und nach dem Härtegrad bleibt er auf dem Knopf. |
| Helden | Nach einem Reiterwechsel, Training oder Anheuern bleibt der Fokus beim selben Knopf, sonst auf dem aktiven Reiter. |
| Fenster unterwegs | Einleitung, Wahl, Kontrollpunkt, Händler und Bilanz nehmen den Fokus (Hauptknopf, sonst der erste), Tab bleibt im Fenster. Escape drückt nur «ZURÜCK» vor dem Aufbruch; in Entscheidungen tut es nichts und geht nie an das Spiel dahinter. |
| Kampf | «Kampf starten!», «Nächste Runde →» und «Weiter» nehmen nacheinander den Fokus: Ein Kampf ist Enter, warten, Enter. |
| Truhe | wie bisher: Enter oder Escape überspringt das Video, danach steht der Fokus auf «Einsammeln». |
| Bildschirmwechsel | Nach einem Wechsel mit der Tastatur (Enter, Escape, K, A, G) beginnt Tab oben im neuen Bildschirm. |

Geprüft am 6.11. im Browser (Chromium, 1400 × 900): Waldpfad (kurz) mit vier Helden, nur Tab und Enter, vom
Hauptmenü über Einleitung, fünf Räume, Wahl, Kontrollpunkt, Truhe und Bilanz zurück. Am Handy (390 px) und mit der
Maus: Antippen wie vorher, kein Springen der Seite, kein Fokusrahmen.

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

## Neue Bildschirme

1. Eine Karte, die man irgendwo antippt, bekommt einen Deckknopf mit Namen, kein `tabindex` auf dem `div`.
2. Wer nach einem Klick neu zeichnet, ruft `fokusMerken` davor und `fokusZurueck` danach.
3. Ein Fenster über dem Spiel nimmt den Fokus und hält Tab mit `bindeFensterTasten` (`FensterHilfen.ts`).

## Noch nur mit Maus oder Finger

- Im Kampf «Klick auf Gegner = Fokus» (ein Ziel vorwählen). Ohne Wahl kämpft das Team wie immer.
- Ziehen im Raid-Feld. Mit der Tastatur wählt man dort mit Tab und Enter erst den Helden, dann sein Feld (docs/RAID.md).
