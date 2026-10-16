import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'node:fs'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: './tsconfig.build.json',
      aliasesExclude: [/^vue$/],
      afterDiagnostic(diagnostics) {
        if (diagnostics.some(diagnostic => diagnostic.category === 1)) {
          throw new Error('Declaration generation failed with TypeScript errors');
        }
      },
      afterBuild() {
        // Generate against the peer dependency floor, then expose the public Vue module name.
        const typesPath = resolve(__dirname, 'dist/index.d.ts');
        writeFileSync(typesPath, readFileSync(typesPath, 'utf8').replaceAll("'vue-declarations'", "'vue'"));
      },
      insertTypesEntry: true,
      outDir: 'dist',
      include: ['src/**/*', '../shared/src/**/*'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*'],
      entryRoot: '..',
      rollupTypes: true,
      bundledPackages: ['@vue-mathjax-beautiful/shared'],
      copyDtsFiles: true
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueMathjaxBeautiful',
      fileName: (format) => `vue-mathjax-beautiful.${format === 'es' ? 'js' : format === 'cjs' ? 'cjs' : 'umd'}`
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@vue-mathjax-beautiful/shared': resolve(__dirname, '../shared/src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler' // 使用现代编译器API
      }
    }
  }
}) 
