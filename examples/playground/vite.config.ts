import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  // GitHub Pages部署配置
  base: process.env.VITE_BASE_URL || '/',

  plugins: [vue(), react()],

  resolve: {
    // 使用数组形式，保证更具体的规则先匹配（样式入口必须排在包名规则之前）
    alias: [
      {
        find: 'vue-mathjax-beautiful/dist/style.css',
        replacement: resolve(__dirname, '../../packages/core/src/styles/index.scss'),
      },
      {
        find: '@vue-mathjax-beautiful/shared',
        replacement: resolve(__dirname, '../../packages/shared/src'),
      },
      {
        find: 'react-mathjax-beautiful',
        replacement: resolve(__dirname, '../../packages/react/src'),
      },
      // 开发模式直接指向包源码，避免依赖未构建的 dist 产物并支持 HMR
      {
        find: 'vue-mathjax-beautiful',
        replacement: resolve(__dirname, '../../packages/core/src/index.ts'),
      },
      { find: '@', replacement: resolve(__dirname, 'src') },
    ],
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // 使用现代编译器API
      },
    },
  },

  server: {
    port: 3000,
    open: false,
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          react: ['react', 'react-dom'],
          ui: ['lucide-vue-next', 'vue-i18n'],
        },
      },
    },
  },
});
