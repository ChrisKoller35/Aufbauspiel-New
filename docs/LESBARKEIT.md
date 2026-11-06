# Lesbarkeit – Regeln für Schrift und Knöpfe

Grundlage: Recherche des Magic-City-Threads vom 27.10.2026 (`recherche/lesbarkeit.md`). Kontrast nach WCAG 2.x,
geprüft von `tests/lesbarkeit.test.ts` (liest das CSS und rechnet selbst).

## Tokens (`src/ui/html/magic-city.css`, `:root`)

| Token | Wert | Wofür | Kontrast |
|---|---|---|---|
| `--txt` | #ddd0b8 | Fliesstext | unverändert |
| `--mut` | **#a69882** (vorher #6b6050) | Beschreibungen, Reiter, Sperrgründe, Rangliste | --bg 7,08 · --s1 6,62 · --s2 6,27 · --s3 5,72 · Ranglisten-Zeile #343122 4,62 (vorher 2,1–3,3) |
| `--gl` | #e6c060 | Titel, Zahlen, Kachel-Namen | unverändert |
| `--gl-knopf` | **#ffe9a8** (neu) | Schrift auf dem Goldverlauf `--gd → #7a5c08` | #6e5710 5,76 · #7a5c08 5,20; Hover 5,14 / 4,58 (mit --gl: 3,98 / 3,59) |

Die Rangfolge bleibt: Titel `--gl`/`--txt` sind heller als `--mut`, Beschreibungen treten weiter zurück.

## Regeln

1. **Text ≥ 4,5 : 1** gegen seinen Hintergrund.
2. **Goldverlauf → `--gl-knopf`:** Jede Regel mit `linear-gradient(135deg, var(--gd), #7a5c08)` (oder hart
   `#6e5710, #7a5c08`) setzt `color: var(--gl-knopf)`. Der Test wacht über alle `src/ui/html/*.css`.
3. **Gedimmt wird das Bild, nie die Schrift:** kein `opacity`/`filter` auf Karten mit Text. Bild über ein
   `::before { position:absolute; inset:0; background:inherit; filter:… }` zurücknehmen (Routenkarte, Klassen-Tafel)
   oder nur das `<img>` dimmen (Material-Chip, Gildenhaus-Ware); der Text wird `--mut`. Das Kind mit dem Text muss
   positioniert sein, sonst deckt das `::before` es zu.
4. **Schrift auf Bildern nur mit Schild** `rgba(6,8,16,a)`, a ≥ .70: --txt hat dann auch vor reinem Weiss
   ≥ 5,1 : 1 (.72 → 5,53; .78 → 6,99). Alternativ ein dichter Verlauf unten (Kacheln).
5. **Finger ≥ 44 px** Tippfläche bei `(max-width: 700px)` bzw. `(pointer: coarse)`.
6. **Tastatur:** Was man antippt, erreicht auch Tab (Deckknopf über Karten, Fokus bleibt beim Neuzeichnen);
   siehe `docs/TASTATUR.md`.

## Ausnahmen

- **Inaktive Knöpfe** (`.btn-train:disabled`, `.lb-lernen:disabled`, Kriegsrat): dürfen gedimmt sein – WCAG nimmt
  inaktive Bedienelemente aus.
- **Dungeonkarte** (`DungeonMapScreen.ts`, `dungeonkarte.css`): eigene Gestaltung, hier nicht angefasst.

## Messwerte vorher / nachher

| Stelle | vorher | nachher |
|---|---|---|
| EXPEDITION STARTEN (`.btn-go`) | 3,6–4,0 gerechnet | 5,40 gemessen, Hover 4,58 gerechnet |
| TRAINIEREN (`.btn-train`) | 3,6–4,0 gerechnet | 5,34 |
| übrige Goldknöpfe (`.hdm2-aktion`, `.weg-knopf`, `.dmap-btn-go`, `.mc-btn`, Gildenhaus, `.lb-lernen`) | 3,6–4,0 | 5,2–5,8 |
| aktiver Hintergrund-Knopf (`.bg-btn.active`) | 2,85 | 5,76 |
| ANHEUERN (dunkel auf Verlaufsanfang) | 2,89 | 5,80 (Verlauf ab #a8861c) |
| `--mut` auf --s3 / Ranglisten-Zeile | 2,63 / 2,12 | 5,72 / 4,62 |
| Sperrgrund auf gesperrter Routenkarte | < 4,5 (opacity .55) | 5,26 |
| Kachel-Namen (p10, PC und Handy) | < 4,5 | ≥ 4,5 (Schatten unten .92/.72, Name --gl) |
| Heldenname auf dem Bild (Schild .72) | ohne Schild auf hellem Bild < 4,5 | ≥ 5,5 auch auf Weiss |
| Rang 3 der Rangliste (#e8954a) | 4,10 | 5,49 (auf --s2 7,45) |
| Rangliste-Erklärung (`.rl-regel summary`), Set-Auswahl | ~26 px / 40 px | ≥ 44 px |

Die Messwerte «gemessen» stammen aus der Recherche (Bildschirmfoto), die übrigen sind aus den CSS-Farben gerechnet.
Nachmessen im Browser (PC, Handy 390 und 320 px) macht der prüfende Thread.
