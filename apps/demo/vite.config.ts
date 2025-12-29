import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@zengrid/core': resolve(__dirname, '../../packages/core/src'),
      '@zengrid/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
