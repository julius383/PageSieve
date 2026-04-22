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
  fd -t f -0 | xargs -0 zip pagesieve_source.zip
