// import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import handlebars from '@yoichiro/vite-plugin-handlebars';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        svelte({ configFile: false, compilerOptions: { runes: true } }),
        handlebars({ runtime: 'handlebars/dist/handlebars.runtime.js' }),
        /*
        visualizer({
            filename: 'stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
        }),
        */
    ],
    resolve: {
        alias: { $lib: resolve(__dirname, 'src/lib') },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        emptyOutDir: true,
        modulePreload: false,
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            input: {
                sidebar:    resolve(__dirname, 'src/sidebar/main.ts'),
                fullpage:   resolve(__dirname, 'src/fullpage/main.ts'),
                background: resolve(__dirname, 'src/background.ts'),
                content:    resolve(__dirname, 'src/content.ts'),
                app:        resolve(__dirname, 'src/app.css'),
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
            },
        },
    },
});
