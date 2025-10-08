import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte({ compilerOptions: { runes: true } })],
  resolve: {
    alias: {
      '$lib': resolve(__dirname, 'src/lib')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true, // Clean the output directory before building
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'src/sidebar/main.ts'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        app: resolve(__dirname, 'src/app.css')
      },
      output: {
        // Ensure the output filenames are predictable
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      }
    }
  }
});
