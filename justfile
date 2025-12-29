
build:
  npm run build

watch:
  fd -t f . src | entr -c npm run build

format:
  npx prettier src/ --write

tasks:
  rg 'TODO|FIXME' --glob '!src/lib/**' --glob "!justfile"
