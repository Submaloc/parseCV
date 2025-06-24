import { defineConfig } from 'vite';

export default defineConfig({
  base: '/static/',
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
});
