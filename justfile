lint:
  bun run lint

build:
  bun run build:extension && bun run build:cli

build-extension:
  bun run --filter @pagesieve/extension build

build-cli:
  bun run --filter @pagesieve/cli build && chmod +x packages/cli/dist/pagesieve.js

run-cli config:
  ./packages/cli/dist/pagesieve.js --config {{config}}

watch:
  fd -t f . packages | entr -c just build

format:
  bunx prettier packages/ --write

tasks:
  rg 'TODO|FIXME' --glob '!packages/extension/src/lib/**' --glob "!justfile"

zip-dist:
  rm pagesieve.zip || true
  cd packages/extension/dist/ && zip -r ../../../pagesieve.zip *

zip-source:
  rm pagesieve_source.zip || true
  git ls-files -z packages/extension | xargs -0 zip pagesieve_source.zip

render-annotations:
  bun src/scripts/render-annotations.ts --json docs/reference/ui-annotations.json --out docs/reference/_ui-annotations.html
  bun src/scripts/render-annotations.ts --json docs/reference/statemachine-annotations.json --out docs/reference/_statemachine-annotations.html

[working-directory: 'docs']
docs-build:
  quarto render

[working-directory: 'docs']
docs-preview:
  quarto preview --port 4668 --no-browser

[working-directory: 'docs']
docs-publish:
  quarto publish gh-pages
