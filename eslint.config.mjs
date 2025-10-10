import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";

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

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: { // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      "no-undef": 'off'
    }
  },
  {
    files: [
      '**/*.svelte',
      '**/*.svelte.ts',
      '**/*.svelte.js'
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
      }
    }
  }
);
