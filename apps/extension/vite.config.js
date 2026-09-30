import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

const BUILD_TARGET = process.env.BUILD_TARGET ?? 'main'; // 'main' | 'content'

const sharedResolve = {
    alias: {
        '@': resolve(import.meta.dirname, './src'),
        $lib: resolve(import.meta.dirname, './src/lib'),
        '@pagesieve/core': resolve(import.meta.dirname, '../../packages/core/src'),
    },
};

const mainConfig = defineConfig({
    plugins: [svelte({ configFile: false, compilerOptions: { runes: true } })],
    resolve: sharedResolve,
    build: {
        outDir: 'dist',
        sourcemap: true,
        emptyOutDir: true,
        modulePreload: false,
        rollupOptions: {
            input: {
                sidebar: resolve(import.meta.dirname, 'src/ui/sidebar/main.ts'),
                fullpage: resolve(import.meta.dirname, 'src/ui/fullpage/main.ts'),
                background: resolve(import.meta.dirname, 'src/background.ts'),
                app: resolve(import.meta.dirname, 'src/ui/app.css'),
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
        emptyOutDir: false,
        lib: {
            entry: resolve(import.meta.dirname, 'src/content.ts'),
            formats: ['iife'],
            name: 'content',
            fileName: () => 'content.js',
        },
    },
});

const configs = {
    main: mainConfig,
    content: contentConfig,
};

if (!(BUILD_TARGET in configs)) {
    throw new Error(
        `Unknown BUILD_TARGET "${BUILD_TARGET}". Expected: ${Object.keys(configs).join(' | ')}`,
    );
}

export default configs[BUILD_TARGET];
