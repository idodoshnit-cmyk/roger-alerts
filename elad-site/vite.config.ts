import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds one self-contained index.html (JS, CSS and fonts inlined) that works offline.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    target: 'es2019',
  },
});
