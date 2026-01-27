import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import json from '@eslint/json';
import { defineConfig } from 'eslint/config';

import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';

//
// export default defineConfig([
//   { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
//   tseslint.configs.recommended,
//   { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
// ]);

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig([
    js.configs.recommended,
    ...ts.configs.recommended,
]);
