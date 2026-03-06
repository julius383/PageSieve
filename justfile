lint:
  pnpm run lint

build:
  pnpm run build

watch:
  fd -t f . src | entr -c npm run build

format:
  pnpx prettier src/ --write

tasks:
  rg 'TODO|FIXME' --glob '!src/lib/**' --glob "!justfile"

zip-dist:
  rm pagesieve.zip || true
  cd dist/ && zip -r ../pagesieve.zip *

zip-source:
  rm pagesieve_source.zip || true
  fd -t f -0 | xargs -0 zip pagesieve_source.zip
