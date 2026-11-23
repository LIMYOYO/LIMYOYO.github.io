#!/bin/bash
# Build the site into _site/ with the same gems GitHub Pages uses.
# Streams the source into the container (works even when Docker cannot mount this folder).
# Usage: tools/build.sh            (first run: docker build -t jekyll-site .)
set -eo pipefail
cd "$(dirname "$0")/.."
docker image inspect jekyll-site >/dev/null 2>&1 || docker build -t jekyll-site .
rm -rf _site && mkdir _site
tar -c --exclude=./_site --exclude=./.git --exclude=./.superpowers --exclude=./.jekyll-cache . \
  | docker run --rm -i jekyll-site sh -c '
      mkdir -p /tmp/src && tar -x -C /tmp/src && cd /tmp/src &&
      bundle exec jekyll build --config _config.yml,_config_docker.yml 1>&2 &&
      tar -c -C _site .' \
  | tar -x -C _site
