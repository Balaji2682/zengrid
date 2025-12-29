import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@zengrid/core': path.resolve(__dirname, '../../packages/core/src'),
      '@zengrid/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3001,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
