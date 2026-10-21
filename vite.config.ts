import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Die Texte der Dungeon-Geschichten und die übrigen Spieldaten (Gegner, Gegenstände, Routen …)
        // als eigene Dateien (laden beim Start mit), so zeigt die Warnung ab 500 kB weiter das Wachstum
        // des Spielcodes an, nicht das der neuen Dungeons
        manualChunks: (id: string) => {
          if (id.includes('/src/data/dungeonGeschichten')) return 'geschichten';
          if (id.includes('/src/data/')) return 'daten';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
