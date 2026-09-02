import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: '../reconstructed-build',
    emptyOutDir: true,
    target: 'esnext'
  }
});
