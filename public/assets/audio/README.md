# Magic City – Audio Assets

## SFX (automatisch generiert)
Alle Dateien in `sfx/` werden von `tools/generateSounds.ts` generiert.
Regenerieren: `npm run generate-sounds`

## Music (manuell)
Hintergrund-Musik muss manuell hinzugefügt werden:
1. Besuche https://suno.com oder https://udio.com
2. Prompt: "calm medieval lute and flute ambient, game background, seamless loop, 60 seconds"
3. Download als MP3 → `music/ambient_medieval.mp3`

## Sound-Parameter anpassen
Öffne `tools/generateSounds.ts` und ändere die `params` eines Sounds.
Lösche die entsprechende .wav Datei und führe `npm run generate-sounds` erneut aus.
