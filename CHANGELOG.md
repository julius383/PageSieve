# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`cli` prefix corresponds to `packages/cli` and `extension` corresponds to
`packages/extension`

## [Unreleased]

## [extension-v2.1.0] - 2026-08-16

### Added

- Add button for highlighting elements by selector in Field definition component
- Add count field type for counting matched elements as alternative to
  extracting attributes or properties.
- Automatically create full URL for href and src attributes during extraction.
- Add YAML format for results export.
- Add urlPattern implementation for controlling which URLs config applies to.

### Changed

- Use IntersectionObserver to prevent hanging when too many elements are highlighted.

### Fixed

- Fix problem where sidebar requires multiple clicks to open.
- Cleanup changes made to DOM when inspector is launched such as event
  listeners and HTML elements.

## [extension-v2.0.0] - 2026-08-09

### Added

- Add columns sorting to results viewer table.
- Add ability to extract attributes from container element using '.' selector.
- Add snapshots/checkpoints when scraping for better error recovery.
- Add user confirmation for destructive actions

### Changed

- Breaking refactor of scrape configuration format
- Update field definition UI to support new Field schema
- Allow URL to be editable and navigate to URL when necessary before beginning
  extraction
- Update metadata section of config panel with new + updated properties in ScrapeConfig
- Results are now grouped according to the group's name instead of the nanoid
  based ID.
- Centralize handling of user confirmation dialogs to service file


## [cli-v0.1.0] - 2026-06-15

### Added

- Add initial version of headless crawler. Uses same scrape config as extension
  but runs headless through a Cheerio crawler implemented through crawlee.

## [extension-v1.5.0] - 2026-06-15

### Changed

- Switch to generalized extractor. Mostly code change as functionality is identical

### Fixed

- Fix how logging is handled in content vs background scripts
- Simplify how pages are compared.
- Correctly set error in various failure states

## [extension-v1.4.0] - 2026-05-09

### Added

- Switch to logtape for logging for clearer information

### Fixed

- Handle newlines in results which broke markdown table exports

### Changed

- Improve results downloading

## [extension-v1.3.0] - 2026-05-07

### Added

- Add retries for various failure states

### Fixed

- Add better log messages
- Add global stop event for user interruption of execution
- Support use of XPath selector for 'next' navigation
- Fix test pagination button


## [extension-v1.2.0] - 2026-04-22

### Added

- Add editable names for selector groups
- Improve button style in Editable Input
- Add search and sort in library component

### Fixed

- Change how selector array type is toggled
- Change button style to be more visible
- Switching to none pagination now works 

### Changed

- Default to Use dark colorscheme

## [extension-v1.1.0] - 2026-04-05

### Added

- Add ability to group selectors for extracting different data from a single page
- Add multi selector group results display
- Add export for individual group data

### Fixed

- Exit early when no pagination defined
- Allow use of xpath for container selector

### Changed

- Modify DataTable style

## [extension-v1.0.0] - 2026-03-02

### Added

- Add initial addon implementation
- Improve UI and add simple data extraction logic
- Add property creation component
- Add functions to save and load scraping config
- Add csv export for extracted data
- *(local_storage)* Integrate local storage
- *(extractor)* Add append to data extraction
- *(ConfigStorage)* Add rename for saved config
- *(ConfigStorage)* Add config delete function
- *(StatusIndicator)* Add LogViewer component
- Add centralized status tracking
- *(dominspector)* Connect inspect to UI
- *(config)* [**breaking**] Refine ScrapeConfig
- Add new config panel and metadata section
- Change dark theme background color
- Add OptionsSection in ConfigPanel
- Add Pagination in Config tab
- [**breaking**] Replace interfaces with zod
- Replace selectorDefs with ScrapeConfig
- Replace extractOptions with ScrapeConfig
- [**breaking**] Refactor handling of extractedData
- Replace metadata with ScrapeCofig
- Replace pagination with ScrapeCofig
- [**breaking**] Refactor import/export out of state file
- Refactor saving/loading from browser storage
- Centralize status handling
- [**breaking**] Add support for container selector
- Add input for container selector
- Add selector prediction to ElementPicker
- Add display for selected elements
- Add support for xpath selectors
- [**breaking**] Add control for extracting multiple items
- Add script to verify saved ScrapeConfig
- Add central logging and viewer component
- Implement pagination handling in UI
- Improve handling of pagination
- Add runConfig that extracts and paginates
- Improve status handling and add interrupt
- Enable alternative algorithm for finding selector for individual elements
- Switch to tanstack based datatable component
- Add separate page display for results and logs
- Add data copying to clipboard including HTML and Markdown tables

### Fixed

- Use async function to fix status update
- *(sidebar)* Move StatusIndicator and format
- Correct fixed screen breaking overflow
- Remove unecessary variables and update log
- Fix highlights not-updating on scroll
- Change how items are added to blacklist
- Fix EditableInput not displaying config id
- Fix bug in loading/saving ScrapeConfig
- Fix how results data is appended
- Correctly set for single/array toggle
- Handle different cases of 'next' pagination
- Add bottom padding component prevent item cutoff
- Set missing metadata fields on config run

### Security

- Narrow CSP and update plugin description

### Changed

- Move to pnpm and fix issues found by eslint
- Change package name to page-sieve
- Rename extraction variable
- Rename selectors type
- Reorganize sidebar components
- Switch to dark color scheme
- Add tooltips to buttons
- Move delete confirmation to sidebar
- [**breaking**] Modify ScrapeConfig

