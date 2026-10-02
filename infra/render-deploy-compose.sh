#!/usr/bin/env bash
# Render the single compose file the deploy ships to the server on stdin.
#
# The server's deploy.sh (the forced command on st44-home's deploy key) reads
# one compose file on stdin and installs it over /srv/st44-home/infra/
# docker-compose.yml. That file has to carry both the stack definition and the
# image pin for this deploy, because a forced command means CI cannot write a
# second override file beside it the way it used to (scp + COMPOSE_FILE).
#
# So this renders the merge in CI: take infra/docker-compose.prod.yml — the
# record of the server's compose file — and pin the three ghcr images to one
# tag, emitting one file on stdout. (This replaces the old flow where CI shipped
# a separate image-pin override via scp and merged it on the host with
# COMPOSE_FILE.)
#
# It is textual, not `docker compose config`. `config` resolves ${DB_PASSWORD}
# and friends against the runner's environment, which has no server secrets,
# baking empty or default values into the file that then override the server's
# own .env at runtime. Textual overlay keeps every ${...} reference intact so
# the host .env still supplies them. One copy of the merge, shared by the deploy
# and by the CI job that proves the pin lands (see ci.yml, "Deploy pin overrides
# the server compose file").
#
# Usage: render-deploy-compose.sh <image-prefix> <tag>
#   render-deploy-compose.sh ghcr.io/tidemann/st44-home 9f3a1c2
set -euo pipefail

prefix="${1:?image prefix, e.g. ghcr.io/tidemann/st44-home}"
tag="${2:?image tag, normally the commit sha}"

here="$(cd "$(dirname "$0")" && pwd)"
base="${here}/docker-compose.prod.yml"

[ -f "$base" ] || { echo "render-deploy-compose.sh: no $base" >&2; exit 1; }

# The base file declares each service's image as `ghcr.io/tidemann/st44-home-<svc>:latest`.
# Swap the tag for the pinned one. $tag is a commit SHA (or a deliberate re-tag),
# so it cannot contain sed metacharacters.
out="$(sed -E \
  -e "s|^([[:space:]]*image:[[:space:]]*)ghcr\.io/tidemann/st44-home-frontend:[0-9a-zA-Z_.-]+|\1${prefix}-frontend:${tag}|" \
  -e "s|^([[:space:]]*image:[[:space:]]*)ghcr\.io/tidemann/st44-home-backend:[0-9a-zA-Z_.-]+|\1${prefix}-backend:${tag}|" \
  -e "s|^([[:space:]]*image:[[:space:]]*)ghcr\.io/tidemann/st44-home-db:[0-9a-zA-Z_.-]+|\1${prefix}-db:${tag}|" \
  "$base")"

# The overlay must not cost the stack its identity: every ghcr image in the
# result has to carry the pinned tag, none left on `latest`.
bad=0
for svc in frontend backend db; do
  if ! printf '%s\n' "$out" | grep -qE "^[[:space:]]*image:[[:space:]]*${prefix}-${svc}:${tag}$"; then
    echo "render-deploy-compose.sh: ${svc} image did not take the pin" >&2
    bad=1
  fi
done
if printf '%s\n' "$out" | grep -E '^[[:space:]]*image:[[:space:]]*ghcr\.io/' \
  | grep -v "st44-home-\(frontend\|backend\|db\):${tag}" >/dev/null; then
  echo "render-deploy-compose.sh: a ghcr image below ignored the pin:" >&2
  printf '%s\n' "$out" | grep -E '^[[:space:]]*image:[[:space:]]*ghcr\.io/' >&2
  bad=1
fi
[ "$bad" -eq 0 ] || exit 1

printf '%s\n' "$out"