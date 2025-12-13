# PageSieve

PageSieve is a browser extension that lets users extract 
structured data from any webpage they visit by defining field names and CSS 
selectors in a sidebar UI. The extracted data is previewed instantly, stored 
locally, and can be exported for further processing.


## Goals

The extension is designed around a few core principles:
- Ergonomic CSS selection - discovering CSS selectors should be a simple point-and-click operation.
- Minimal UI — simple sidebar that does not take you outside the browser.
- Local first - scraping can be done entirely on your system.
- Reusable recipes - once you define fields and selectors, you can save your
  configuration for use at a later date or share it online.

## Key Features

- Sidebar UI for defining:
  - Field name
  - CSS selector
  - Extraction options (text, attribute, etc.)
- Tabular display of extracted values
- Export extracted data as:
  - JSON
  - CSV
- Import / export configurations as JSON files
- Persist configuration in browser storage
- Works on any website your browser can load
