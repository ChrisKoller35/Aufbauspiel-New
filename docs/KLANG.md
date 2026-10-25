# Klang

Ton startet erst mit der ersten Nutzer-Aktivierung: Klick, Tippen oder eine Taste ausser Escape (`src/klang.ts`,
ein `AudioContext` in `src/systems/Klang.ts`). Musik 30 %, Effekte 50 %. 🔊/🔇 steht in jeder Kopfzeile vor 🏅 und
im Kampf neben x1/x1.5/x2 (`src/ui/components/KlangSchalter.ts`); auch die Taste M schaltet stumm, aber nicht beim
Halten, nicht in Eingabefeldern und nicht, solange ein Fenster offen ist (`FensterHilfen.ts` `fensterTaste`).
Gemerkt in `localStorage` unter `magic_city_klang` (nicht im Spielstand). Bei «stumm» lädt keine Musik, und das
Truhen-Video läuft ohne Ton.

| Ereignis | Ton | Stelle im Code |
|---|---|---|
| Erste Geste, Bildschirmwechsel (ausser Kampf) | `ambient_city` | `ScreenRouter.ts` `getCurrentScreen`, `mc:navigate` aus `navigateTo`/`goBack` |
| Expedition geht los (nach der Einleitung) | `expedition_start` + Musik je Biom | `ExpeditionFlow.ts` `aufbrechen` → `mc:aufbruch`; Biom `biomFuerRoute` (`routes.ts`) |
| Bosskampf | `ambient_boss` + `boss_intro` | `CombatScreen.ts` `show()` im Bossraum → `mc:bosskampf` |
| Expedition endet im Kampf: SIEG! / NIEDERLAGE... | `boss_victory` / `party_wipe` | `CombatScreen.ts` `showResult` → `mc:kampfausgang` |
| Rückzug per Knopf im Kampf oder am Kontrollpunkt | `retreat_horn` | `ExpeditionFlow.ts` `finishExpedition` → `mc:rueckzug` |
| Truhe bei «stumm» | Video `muted` | `ChestRevealOverlay.ts`; Umschalten in `KlangSchalter.ts` |

**Musik:** zwei feste `<audio>`-Spuren, beide in der ersten Geste angelegt (auf dem iPhone braucht jedes Element
eine Freigabe in einer Geste, sonst bliebe die Bossmusik stumm). Ein Wechsel blendet in 1 s über, die alte Spur
gibt danach Download und Decoder frei. Was der Browser abgelehnt hat, holt die nächste Geste nach.

**Musik je Biom:** Wald, Himmel, Sterne, Mond, Belagerung → `ambient_forest` (offen, unter freiem Himmel; Belagerung liegt vor der Stadt). Sumpf, Unterwasser, Ruinen → `ambient_swamp` (nass bzw. düster-verfallen). Höhle, Vulkan, Frost, Drachengipfel → `Ecambient_cave` (Gestein, Glut, Eis, Drachenhort im Berg).

**Gleiche Stücke (md5):**
- `ambient_city.mp3` = `ambient_forest.mp3` (`bb074cd0e440d86e672bc84397e1b3f8`)
- `ambient_swamp.mp3` = `Ecambient_cave.mp3` (`0a2708b289acfc7705b6adeb4e6ad0b2`)
- `ambient_boss.mp3` ist eigen (`ac46ef892d14946f67a14da0ba763a01`)

Christoph macht neue Musik selbst und ersetzt die Datei in `public/assets/audio/music/` unter demselben Namen; die Höhle heisst `Ecambient_cave.mp3` (mit «Ec»), `ambient_cave.mp3` gibt es nicht.

**Zu leise Effekte (gemessen, RMS):** `boss_intro` −73 dBFS (kaum hörbar), `party_wipe` −59, `retreat_horn` −52,
dagegen `expedition_start` und `boss_victory` −27. Ursache ist `tools/generateSounds.ts`: Tonhöhe drei Oktaven zu
tief (441 statt 3528 · f²), Gleiten und Arpeggio auf der Frequenz statt der Periode, Hochpass immer an. Die Töne neu
zu erzeugen ändert alle 31 Effekte und braucht Christophs Okay.

**Nicht vertont:** Klicks (`ui_click`, `ui_coin`), Bau und Produktion (`build_place`, `production_*`), Kampftreffer (`combat_*`), Dungeon-, Biom-Eintritts- und Fallengeräusche, Erfolge, Rangaufstieg, Truhe öffnen (`chest_open`; das Video hat eigenen Ton). Keine Regler für Musik und Effekte, keine Pause im Hintergrund-Tab.
