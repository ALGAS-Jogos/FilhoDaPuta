import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:3000',
        ws: true,
      },
      '/healthz': 'http://127.0.0.1:3000',
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
