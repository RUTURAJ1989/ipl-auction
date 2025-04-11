import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/ipl-auction/', // Set base path for GitHub Pages
  build: {
    outDir: 'dist',
  },
  server: {
    open: true,
  },
});