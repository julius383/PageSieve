
build:
  pnpm run build

watch:
  fd -t f . src | entr -c npm run build

format:
  pnpx prettier src/ --write

tasks:
  rg 'TODO|FIXME' --glob '!src/lib/**' --glob "!justfile"
