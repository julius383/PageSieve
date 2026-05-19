lint:
  bun run lint

build:
  bun run build

watch:
  fd -t f . src | entr -c bun run build

format:
  bunx prettier src/ --write

tasks:
  rg 'TODO|FIXME' --glob '!src/lib/**' --glob "!justfile"

zip-dist:
  rm pagesieve.zip || true
  cd dist/ && zip -r ../pagesieve.zip *

zip-source:
  rm pagesieve_source.zip || true
  git ls-files -z | xargs -0 zip pagesieve_source.zip

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
