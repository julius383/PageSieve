## [1.1.0] - 2026-04-05

### 🚀 Features

- Add ability to add selector groups
- [**breaking**] Add multi selector group results display
- Add group delete confirmation
- Add export for individual group data

### 🐛 Bug Fixes

- Early exit when no pagination defined
- Allow use of xpath for container selector
- Centralize how xpath selectors are detected

### 💼 Other

- Add just rule for creating zip
- Update gitignore
- Add file necessary for github pages
- Increment version number

### 🚜 Refactor

- Separate confirm dialog into component
- Modify DataTable style

### 📚 Documentation

- Correct dates in license copyright
- Initial commit of documentation
- Render documentation
- Change default video dimensions
- Update video dimensions
- Update README.md
- Remove quarto build from git

### 🎨 Styling

- Use specific type for extract results
- Format code
## [1.0.0] - 2026-03-02

### 🚀 Features

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

### 🐛 Bug Fixes

- Use async function to fix status update
- *(sidebar)* Move StatusIndicator and format
- Rollback rename of state
- Correct fixed screen breaking overflow
- Add missing label shadcn component
- Remove unecessary variables and update log
- Correct export func and update id on run
- Fix highlights updating on scroll
- Change how items are added to blacklist
- Fix EditableInput not displaying config id
- Add optional chaining to results access
- Correct bug in loading/saving ScrapeConfig
- Correct how results data is appended
- Correctly set for single/array toggle
- Handle different cases of 'next' pagination
- Add bottom padding component prevent item cutoff
- Set missing metadata fields on config run
- Set mimetype for exporting data to json
- Add fields required by Mozilla addons

### 💼 Other

- *(deps)* Update dependencies
- Update and cleanup dependencies
- Narrow CSP and update plugin description
- Update deps and add justfile
- Add zod dependency
- Change package name to page-sieve
- Update deps
- Move to pnpm and fix issues found by eslint
- Update dependencies and README

### 🚜 Refactor

- Rename extraction variable
- *(state)* Move state handling to module
- Minor rename and cleanup
- Fix formatting with prettier
- Move status indicator to component
- Move results display to a component
- *(sidebar)* Reorganize sidebar components
- Remove empty file
- Rename state file
- Switch to dark color scheme
- Add tooltips to buttons
- *(SavedLibrary)* Refactor components
- Rename selectors type
- Remove old state.svelte.ts monolith
- Remove unused file
- Move delete confirmation to sidebar
- [**breaking**] Modify ScrapeConfig
- Move state logic in component to store

### 📚 Documentation

- Add README and function docs in state file
- Update README
- Add icon to README

### 🎨 Styling

- Reformet files
- Run prettier
- Run prettier
- Run prettier
- Run prettier
- Use consistent spaces and line endings
- Run prettier
- Reformat files
- Format files
- Run formatter
- Format files
- Format files
- Update icons
- Clean up code

### ⚙️ Miscellaneous Tasks

- Update dependencies and linter config
- *(formatting)* Run prettier on project
- Update icons
- Update deps
