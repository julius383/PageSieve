import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import handlebars from '@yoichiro/vite-plugin-handlebars';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svelte({ compilerOptions: { runes: true } }),
        handlebars({
            // This allows you to import .hbs files in your TypeScript code
            runtime: 'handlebars/dist/handlebars.runtime.js',
        }),
    ],
    resolve: {
        alias: {
            $lib: resolve(__dirname, 'src/lib'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        emptyOutDir: true,
        rollupOptions: {
            input: {
                sidebar: resolve(__dirname, 'src/sidebar/main.ts'),
                fullpage: resolve(__dirname, 'src/fullpage/main.ts'),
                background: resolve(__dirname, 'src/background.ts'),
                content: resolve(__dirname, 'src/content.ts'),
                app: resolve(__dirname, 'src/app.css'),
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('jszip')) {
                            return 'vendor-jszip';
                        }
                        if (id.includes('zod')) {
                            return 'vendor-zod';
                        }
                        if (id.includes('handlebars')) {
                            return 'vendor-handlebars';
                        }
                        if (id.includes('@tanstack')) {
                            return 'vendor-tanstack';
                        }
                        if (id.includes('localforage')) {
                            return 'vendor-localforage';
                        }
                        if (id.includes('bits-ui')) {
                            return 'vendor-bits-ui';
                        }
                        return 'vendor';
                    }
                },
            },
        },
    },
});
