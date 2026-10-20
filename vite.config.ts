import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Die Texte der Dungeon-Geschichten als eigene Datei (lädt beim Start mit),
        // so zeigt die Warnung ab 500 kB weiter das Wachstum des Spielcodes an
        manualChunks: (id: string) => (id.includes('/src/data/dungeonGeschichten') ? 'geschichten' : undefined),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
