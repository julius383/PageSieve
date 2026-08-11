<div align="center">
  <img align="center" src="/packages/extension/public/icons/icon128.png" >
  <h1><a href="https://julius383.github.io/PageSieve/">PageSieve</a></h1>
</div>


PageSieve is a browser extension that assists with the extraction of
structured data from any webpage you visit. Define field names, CSS 
selectors and (optionally) pagination strategy through a sidebar and extract
and export data in a variety of formats.

In cases when you need to crawl a large number of pages, use the CLI to run the
created scrape config.

## Demo

https://github.com/user-attachments/assets/b31d383c-58f5-4f95-aef2-48064b71dcb9

## Installation

Install through the [Mozilla Addon Store](https://addons.mozilla.org/en-US/firefox/addon/pagesieve/).


## Goals

The extension is designed around a few core principles:
- Ergonomic CSS selection - discovering CSS selectors should be a simple point-and-click operation.
- Minimal UI - in-browser sidebar that does not take you to a different application.
- Local first - scraping can be done entirely on device.
- Reusable recipes - once you define fields and selectors, you can save your
  configuration for use at a later date or share it online.

## Key Features

- Sidebar UI for defining:
  - Field name
  - CSS/XPath selector
  - How to move to next page
- Tabular display of extracted values
- Export extracted data in a variety of formats
- Import / export configurations as JSON files
- Works on any website your browser can load
- Headless crawling via Crawlee based CLI

## Tech

- Typescript
- Svelte with Shadcn
- Zod
- Selector algorithm adapted from [SelectorGadget](https://github.com/cantino/selectorgadget/)
- Crawlee

## Developing

This project uses bun for dependency management and vite for building. To
develop the project use:

```
bun install
just build-extension
```

## Repository Overview

Generated with `broot --cmd ":pt" --height 150 --sort-by-type-dirs-first > tree.txt`

```
/PageSieve
 ├──docs …                                        # Quarto based documentation
 ├──packages 
 │  ├──cli 
 │  │  ├──src 
 │  │  │  ├──cheerioDriver.ts                     # implements cheerio based crawler logic
 │  │  │  └──main.ts                              # main CLI entrypoint
 │  │  ├──package.json 
 │  │  └──vite.config.js 
 │  ├──core 
 │  │  ├──src 
 │  │  │  ├──templates …                          # handlebar templates for data export to various formats
 │  │  │  ├──converters.ts                        # functions for converting results to different formats for saving
 │  │  │  ├──extractor.ts                         # reusable extraction logic 
 │  │  │  ├──index.ts 
 │  │  │  ├──logger.ts                            # shared logging config
 │  │  │  ├──schema.ts                            # Zod schema for Scrape Config
 │  │  │  ├──scrapeMachine.ts                     # state machine for browser based scraping workflows
 │  │  │  ├──types.ts 
 │  │  │  └──util.ts 
 │  │  └──package.json 
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
 │     │  │  ├──dmp.js 
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
 │     │  ├──dominspector.mts                     # contains class that controls click based element selection
 │     │  ├──background.ts 
 │     │  ├──content.ts 
 │     │  ├──driver.ts                            # browser extension driver, works using scrapeMachine and core/driver
 │     │  ├──logger.ts                            # logger intialization for extension environment
 │     │  ├──selectorgadget.ts                    # selector guessing algorithm adapted from cantino/selectorgadget
 │     │  └──types.ts 
 │     ├──components.json                         # shadcn-svelte config
 │     ├──package.json 
 │     └──vite.config.js
 ├──scripts 
 │  ├──relay.py                                   # native_relay for advanced debugging
 │  ├──render-annotations.ts                      # script for rendering tippy.js annotations for docs/reference/{extension-ui.qmd,scraping-engine.qmd}
 │  └──verifyConfig.ts                            # script for verifying JSON Scrape Configs ├──package.json 
 ├──tsconfig.json 
 ├──tailwind.config.js 
 ├──justfile 
 ├──LICENSE 
 ├──bun.lock 
 ├──CHANGELOG.md 
 ├──README.md 
 ├──eslint.config.mjs 
 └──postcss.config.mjs 
```
