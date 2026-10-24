# Klang

Ton startet erst nach der ersten Berührung oder Taste (ein `AudioContext`, `src/systems/Klang.ts`). Musik 30 %, Effekte 50 %; 🔊/🔇 links unten oder Taste M schaltet stumm, gemerkt in `localStorage` unter `magic_city_klang` (nicht im Spielstand). Eingehängt in `src/klang.ts`, Zuordnung in `src/data/klangZuordnung.ts`.

| Ereignis | Ton | Stelle im Code |
|---|---|---|
| Erste Geste, Bildschirmwechsel (ausser Kampf) | `ambient_city` | `ScreenRouter.ts` `getCurrentScreen`, `mc:navigate` aus `navigateTo`/`goBack` |
| Expedition startet | `expedition_start` + Musik je Biom | `ExpeditionsScreen.ts` `mc:startExpedition`; Biom wie `getBiomeTag` |
| Bosskampf | `ambient_boss` + `boss_intro` | `CombatScreen.ts` `show()`: `.mc-co-title` «BOSS KAMPF!» |
| Kampfausgang SIEG! / NIEDERLAGE... / RÜCKZUG | `boss_victory` / `party_wipe` / `retreat_horn` | `CombatScreen.ts`: `.mc-co-outcome` |
| Truhe bei «stumm» | Video `muted` | `ChestRevealOverlay.ts` |

**Musik je Biom:** Wald, Himmel, Sterne, Mond, Belagerung → `ambient_forest` (offen, unter freiem Himmel; Belagerung liegt vor der Stadt). Sumpf, Unterwasser, Ruinen → `ambient_swamp` (nass bzw. düster-verfallen). Höhle, Vulkan, Frost, Drachengipfel → `Ecambient_cave` (Gestein, Glut, Eis, Drachenhort im Berg).

**Gleiche Stücke (md5):**
- `ambient_city.mp3` = `ambient_forest.mp3` (`bb074cd0e440d86e672bc84397e1b3f8`)
- `ambient_swamp.mp3` = `Ecambient_cave.mp3` (`0a2708b289acfc7705b6adeb4e6ad0b2`)
- `ambient_boss.mp3` ist eigen (`ac46ef892d14946f67a14da0ba763a01`)

Christoph macht neue Musik selbst und ersetzt die Datei in `public/assets/audio/music/` unter demselben Namen; die Höhle heisst `Ecambient_cave.mp3` (mit «Ec»), `ambient_cave.mp3` gibt es nicht.

**Nicht vertont:** Klicks (`ui_click`, `ui_coin`), Bau und Produktion (`build_place`, `production_*`), Kampftreffer (`combat_*`), Dungeon-, Biom-Eintritts- und Fallengeräusche, Erfolge, Rangaufstieg, Truhe öffnen (`chest_open`; das Video hat eigenen Ton), Rückzug über den Kontrollpunkt-Dialog ohne Kampfausgang. Keine Regler für Musik und Effekte, keine Pause im Hintergrund-Tab.
