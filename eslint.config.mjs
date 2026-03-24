// eslint.config.js
import js from '@eslint/js';
import typescript from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...typescript.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: {
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-types cript-errors
      'no-undef': 'off'
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: typescript.parser,
        extraFileExtensions: ['.svelte'],
        projectService: true,
      },
    },
  },
  {
    ignores: ['dist/', 'src/lib/**', 'src/selectorgadget.ts', 'tailwind.config.js', 'vite.config.js'],
  },
];
