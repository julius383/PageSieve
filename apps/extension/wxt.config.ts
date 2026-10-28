import { defineConfig } from 'wxt';
import { resolve } from 'path';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  svelte: {
    compilerOptions: { runes: true },
  },
  alias: {
    '$lib': resolve(__dirname, './src/lib'),
    '@pagesieve/core': resolve(__dirname, '../../packages/core/src'),
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '$lib': resolve(__dirname, './src/lib'),
        '@pagesieve/core': resolve(__dirname, '../../packages/core/src'),
      },
    },
  }),
  manifest: ({ browser }) => ({

    name: 'PageSieve',
    version: '2.8.0',
    description:
    'PageSieve is a browser extension that assists with the extraction of structured data from any webpage you visit. Define field names, CSS selectors and pagination strategy through a sidebar and extract and export data in a variety of formats.',
    permissions: [
      'activeTab',
      'tabs',
      'storage',
      ...(browser === 'firefox' ? ['<all_urls>'] : [] ),
      ...(browser === 'chrome' ? ['sidePanel', 'scripting'] : []),
    ],
    optional_permissions: ['nativeMessaging'],
    ...(browser === 'chrome' ? { host_permissions: ['<all_urls>'] } : {}) ,
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'"
    },
    ...(browser === 'firefox'
      ? {
        browser_specific_settings: {
          gecko: {
            id: '{b9136a04-6556-40a5-bfa9-eb3ceb22e20d}',
            data_collection_permissions: {
              required: ['websiteContent', 'websiteActivity'],
              optional: ['technicalAndInteraction'],
            },
          },
        },

        browser_action: {
          default_icon: {
            "32": "icons/icon32.png",
            "64": "icons/icon64.png",
            "128": "icons/icon128.png"
          },
          default_title: "PageSieve"
        },
        sidebar_action: {
          default_panel: 'sidebar.html',
          default_icon: {
            '32': 'icons/icon32.png',
            '64': 'icons/icon64.png',
            '128': 'icons/icon128.png',
          },
        },
      }
      : {
        side_panel: {
          default_path: 'sidebar.html',
        },
      }),
  }),
});
