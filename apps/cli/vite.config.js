import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@pagesieve/core': resolve(import.meta.dirname, '../../packages/core/src'),
        },
    },
    plugins: [],
    build: {
        outDir: 'dist',
        sourcemap: true,
        emptyOutDir: true,
        target: 'node22',
        ssr: true,
        copyPublicDir: false,
        rolldownOptions: {
            input: {
                cli: resolve(import.meta.dirname, 'src/commands.ts'),
            },
            output: {
                entryFileNames: 'index.js',
                banner: '#!/usr/bin/env node',
            },
        },
    },
    ssr: {
        noExternal: [/^@pagesieve\/core(\/.*)?$/],
    },
});
