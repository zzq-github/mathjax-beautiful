import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, '../../examples/playground/public'),
  plugins: [vue()],
  resolve: {
    alias: { '@vue-mathjax-beautiful/shared': resolve(__dirname, '../../packages/shared/src') },
  },
  server: { host: '127.0.0.1', port: 3107, strictPort: true },
});
