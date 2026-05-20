// import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import handlebars from '@yoichiro/vite-plugin-handlebars';
import { resolve } from 'path';

const BUILD_TARGET = process.env.BUILD_TARGET ?? 'main'; // 'main' | 'content' | 'cli'

const sharedResolve = {
    alias: {
        '@': resolve(__dirname, './src'),
        $lib: resolve(__dirname, 'src/lib'),
    },
};

const mainConfig = defineConfig({
    plugins: [
        svelte({ configFile: false, compilerOptions: { runes: true } }),
        handlebars({ runtime: 'handlebars/dist/handlebars.runtime.js' }),
    ],
    resolve: sharedResolve,
    build: {
        outDir: 'dist',
        sourcemap: true,
        emptyOutDir: true,
        modulePreload: false,
        rollupOptions: {
            input: {
                sidebar:    resolve(__dirname, 'src/sidebar/main.ts'),
                fullpage:   resolve(__dirname, 'src/fullpage/main.ts'),
                background: resolve(__dirname, 'src/background.ts'),
                app:        resolve(__dirname, 'src/app.css'),
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
                format: 'esm',
            },
        },
    },
});


const contentConfig = defineConfig({
    resolve: sharedResolve,
    build: {
        outDir: 'dist',
        sourcemap: true,
        emptyOutDir: false, // Don't clear dist, as the main build already did
        lib: {
            entry: resolve(__dirname, 'src/content.ts'),
            formats: ['iife'],
            name: 'content',
            fileName: () => 'content.js',
        },
    },
});

const configs = {
    main:    mainConfig,
    content: contentConfig,
};


if (!(BUILD_TARGET in configs)) {
    throw new Error(`Unknown BUILD_TARGET "${BUILD_TARGET}". Expected: ${Object.keys(configs).join(' | ')}`);
}

export default configs[BUILD_TARGET];
