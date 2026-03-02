# PageSieve

PageSieve is a browser extension that assists with the extraction of
structured data from any webpage they visit. Define field names, CSS 
selectors and (optionally) pagination strategy through a sidebar which
is used to extract data.

## Demo

https://github.com/user-attachments/assets/db9b9f9c-8928-442e-887e-5759e1069366

## Installation

Install through the [Mozilla Addon Store](https://addons.mozilla.org/pagesieve) or download a release from GitHub.


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

## Tech

- Typescript
- Svelte with Shadcn
- Zod
- Selector algorithm adapted from [SelectorGadget](https://github.com/cantino/selectorgadget/)

## Repository Overview


```
/PageSieve
 ├──docs … 
 ├──public 
 │  ├──fullpage.html                # html entry point for data + logs page
 │  ├──sidebar.html                 # html entry point for sidebar
 │  ├──manifest.json                # extension manifest copied on build
 │  └──icons  … 
 ├──src 
 │  ├──app.css 
 │  ├──dominspector.mts             # contains class that controls click based element selection
 │  ├──background.ts
 │  ├──content.ts 
 │  ├──selectorgadget.ts            # CSS guessing algorithm adapted from cantino/selectorgadget
 │  ├──types.ts                     # Zod schema for Scrape configuration and other types
 │  ├──verifyConfig.ts              # simple bun script for detecting error in scrape config from json file
 │  ├──fullpage                     # component which displays data + logs in a separate tab
 │  │  ├──App.svelte 
 │  │  └──main.ts 
 │  ├──lib 
 │  │  ├──dmp.js                    # vendored version google/diff-match-patch required by selectorgadget.ts
 │  │  ├──utils.ts 
 │  │  ├──components …              # shadcn components
 │  │  └──hooks … 
 │  └──sidebar 
 │     ├──App.svelte
 │     ├──actions.ts                # functions implementing main behaviour
 │     ├──main.ts 
 │     ├──util.ts                   # utility functions
 │     ├──components …              # UI components
 │     ├──services 
 │     │  └──storage.ts             # browser storage access via localforage
 │     ├──stores 
 │     │  ├──logs.ts                # vars tracking state shown by LogViewer.svelte
 │     │  ├──pagination.svelte.ts   # vars tracking state in PaginationSection.svelte
 │     │  ├──scrapeConfig.svelte.ts # vars tracking main scrape configuration
 │     │  └──ui.svelte.ts           # state required by UI elements
 │     └──templates …               # handlebar templates for data export to various formats
 ├──components.json                 # managed by shadcn
 ├──package.json 
 ├──tsconfig.json 
 ├──tailwind.config.js 
 ├──vite.config.js 
 ├──justfile 
 ├──LICENSE 
 ├──README.md 
 ├──eslint.config.mjs 
 ├──postcss.config.mjs 
 └──pnpm-lock.yaml 

```
