import { defineConfig } from 'vite';
import handlebars from '@yoichiro/vite-plugin-handlebars';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@pagesieve/core': resolve(__dirname, '../core/src'),
        },
    },
    plugins: [handlebars({ runtime: 'handlebars/dist/handlebars.runtime.js' })],
    build: {
        outDir: 'dist',
        sourcemap: true,
        emptyOutDir: true,
        target: 'node22',
        ssr: true,
        copyPublicDir: false,
        rollupOptions: {
            input: {
                cli: resolve(__dirname, 'src/main.ts'),
            },
            external: [
                /^node:/,
                (id) =>
                    !id.startsWith('.') &&
                    !id.startsWith('/') &&
                    !id.startsWith('@/') &&
                    !id.startsWith('@pagesieve/core'),
            ],
            output: {
                entryFileNames: 'pagesieve.js',
                format: 'esm',
                banner: '#!/usr/bin/env node',
            },
        },
    },
});
