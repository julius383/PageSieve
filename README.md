<div align="center">
  <img align="center" src="/apps/extension/public/icons/icon128.png" >
  <h1><a href="https://julius383.github.io/PageSieve/">PageSieve</a></h1>
</div>

PageSieve is a browser extension that assists with the extraction of structured data from any webpage you visit.

Define field names, CSS selectors and (optionally) pagination strategy then extract
and export data in your desired format (JSON, YAML, CSV etc).

When you need to crawl a large number of pages, use the [CLI](#command-line-interface) to run the same scraping
workflow through a Headless Browser or Plain HTTP using the reusable recipes.

## Demo

<https://github.com/user-attachments/assets/b31d383c-58f5-4f95-aef2-48064b71dcb9>

## Installation

Install through the [Mozilla Addon Store](https://addons.mozilla.org/en-US/firefox/addon/pagesieve/). Get the CLI tool on [npm](https://www.npmjs.com/package/pagesieve-cli).

### Browser Compatibility

The PageSieve extension is currently available for **Mozilla Firefox** (Manifest v2). Chromium-based browser support is planned on the [roadmap](https://julius383.github.io/PageSieve/roadmap.html).

## Goals

The extension is designed around a few core principles:

- Ergonomic CSS selection - discovering CSS selectors should be a simple point-and-click operation.
- Minimal UI - in-browser sidebar that does not take you to a different application.
- Local first - scraping can be done entirely on device.
- Reusable recipes - once you define fields and selectors, you can save your
  configuration for use at a later date or share it online.

## Key Features

- **Point-and-click selection**: Easily discover CSS selectors for any element.
- **Minimal Sidebar UI**: No need to leave your current tab. Define how and what to extract data in one UI.
- **Reusable Recipes**: Import / export configurations as reusable recipes (plain JSON files)
- **Local-first**: All extraction is performed entirely on your device.
- **Run in Headless Browser**: Use CLI to run the same configuration using Playwright or Plain HTTP.

## Tech

- Typescript
- Svelte with Shadcn
- Zod
- Selector algorithm adapted from [SelectorGadget](https://github.com/cantino/selectorgadget/)
- Playwright and Cheerio

## Developing

This project uses bun for dependency management and vite for building. To
develop the project use:

```text
bun install
just build-extension
```

Open Firefox and navigate to `about:debugging` -> "This Firefox" loading the
built extension from `apps/extension/dist/` as a temporary extension.

## Command Line Interface

In addition to the browser extension you can now run saved recipes through a
CLI which uses either fetch + cheerio or playwright to extract data.

The Playwright crawler supports all the same features as the extension while
the Cheerio crawler runs faster and less resources due to not running a full
browser like playwright

### Installation

The cli can be installed from npmjs or directly from the repo by running `just
install-cli` which builds and installs the app globally with bun.

```text
npm install -g pagesieve-cli
```

In order to use the cli you need to install Chromium from Playwright

```text
npx playwright install chromium
```

### Usage

See command help with `pagesieve help` and [CLI README](apps/cli/README.md)
for more details.

## Repository Overview

Generated with `broot --cmd ":pt" --height 150 --sort-by-type-dirs-first > tree.txt`

```text
/PageSieve
 ├──docs …                                        # Quarto based documentation
 ├──apps
 │  ├──cli 
 │  │  ├──src
 │  │  │  ├──cheerio.ts                           # fetches html and passes to cheerio extraction engine
 │  │  │  ├──cheerioEngine.ts                     # implements cheerio extraction engine 
 │  │  │  ├──commands.ts                          # main entrypoint. defines cli commands
 │  │  │  ├──playwright.ts                        # launches chromium browser and runs playwright based extraction
 │  │  │  ├──playwrightDriver.ts                  # functions for navigation driven by scrapeMachine.ts
 │  │  │  ├──playwrightEngine.ts                  # playwright based extraction engine
 │  │  │  └──util.ts                              # helpers for saving output in different formats
 │  │  ├──package.json
 │  │  └──vite.config.js
 │  └──extension
 │     ├──public 
 │     │  ├──icons …
 │     │  ├──background.html                      # html entry point for data + logs page
 │     │  ├──fullpage.html                        # html entry point for sidebar logs page
 │     │  ├──sidebar.html 
 │     │  └──manifest.json                        # extension manifest v2
 │     ├──src 
 │     │  ├──lib 
 │     │  │  ├──components …                      # shadcn components
 │     │  │  ├──hooks 
 │     │  │  ├──dmp.js                            # Vendored DiffMatchPatch
 │     │  │  └──utils.ts 
 │     │  ├──ui 
 │     │  │  ├──fullpage                          # component which displays data + logs in a separate tab
 │     │  │  ├──sidebar 
 │     │  │  │  ├──components …                   # UI components
 │     │  │  │  ├──services 
 │     │  │  │  │  └──storage.ts                  # browser storage interaction
 │     │  │  │  ├──stores 
 │     │  │  │  │  ├──logs.ts                     # state for LogViewer component
 │     │  │  │  │  ├──pagination.svelte.ts        # state for PaginationSection component
 │     │  │  │  │  ├──scrapeConfig.svelte.ts      # state for user defined Scrape Config
 │     │  │  │  │  └──ui.svelte.ts                # miscellaneous UI states
 │     │  │  │  ├──App.svelte 
 │     │  │  │  ├──actions.ts  
 │     │  │  │  ├──main.ts 
 │     │  │  │  └──util.ts 
 │     │  │  └──app.css 
 │     │  ├──dominspector.ts                      # contains class that controls click based element selection
 │     │  ├──browserEngine.ts                     # browser based extraction engine
 │     │  ├──background.ts 
 │     │  ├──content.ts 
 │     │  ├──extensionDriver.ts                   # browser extension driver, works using scrapeMachine and core/driver
 │     │  ├──logger.ts                            # logger intialization for extension environment
 │     │  ├──selectorgadget.ts                    # selector guessing algorithm adapted from cantino/selectorgadget
 │     │  └──types.ts 
 │     ├──components.json                         # shadcn-svelte config
 │     ├──package.json 
 │     ├──tailwind.config.js
 │     ├──postcss.config.mjs
 │     └──vite.config.js
 ├──packages 
 │  └──core 
 │     ├──src 
 │     │  ├──converters.ts                        # functions for converting results to different formats for saving
 │     │  ├──extractor.ts                         # reusable extraction logic 
 │     │  ├──index.ts 
 │     │  ├──logger.ts                            # shared logging config
 │     │  ├──schema.ts                            # Zod schema for Scrape Config
 │     │  ├──scrapeMachine.ts                     # state machine for browser based scraping workflows
 │     │  ├──types.ts 
 │     │  └──util.ts 
 │     └──package.json
 ├──scripts 
 │  ├──relay.py                                   # native_relay for advanced debugging
 │  ├──generateSchemaDocs.ts                      # helper for extracting meta from zod schemas for documentation site
 │  ├──render-annotations.ts                      # script for rendering tippy.js annotations for docs/reference/extension-ui.qmd
 │  └──verifyConfig.ts                            # script for verifying JSON Scrape Configs
 ├──package.json
 ├──tsconfig.json 
 ├──justfile 
 ├──LICENSE 
 ├──bun.lock 
 ├──CHANGELOG.md 
 ├──README.md 
 └──eslint.config.mjs 
```
