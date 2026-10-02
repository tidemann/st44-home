#!/usr/bin/env bash
#
# deploy.sh — the only command the st44-home deploy key may run.
#
# Installed at /srv/st44-home/deploy.sh by the server administrator (ST-49 /
# ST-173), root-owned, mode 755, so the deploy user can run it but cannot
# rewrite it. The key's forced command is:
#
#   restrict,command="/srv/st44-home/deploy.sh"
#
# sshd runs this as the forced command for st44-home's key, so it takes no
# arguments: whatever command line CI sends is discarded. Everything it needs
# arrives on stdin — the deploy compose file (the server's compose with the
# three ghcr images pinned to one tag), rendered in CI by
# infra/render-deploy-compose.sh.
#
#   ssh <host> "/srv/st44-home/deploy.sh" < deploy-compose.yml
#
# Naming the command in the ssh call is redundant under a forced command, but it
# means the same CI workflow also works against a key that has not been
# tightened yet. That is what makes the rollout order safe.
#
# What a leaked key can do with this script: replace st44-home's compose file
# and restart st44-home's containers. What it cannot do: run any other command,
# read or write another site's directory, or escape the container boundary — see
# the refusals in check_compose.
#
# The four containers are named st44-redis, st44-db, st44-backend,
# st44-frontend. Compose project stays `infra` (the directory-derived name this
# site has used since it first deployed) so the postgres_data and redis_data
# volumes keep their identity across this change.

set -euo pipefail

APP_DIR=/srv/st44-home
INFRA_DIR=${APP_DIR}/infra
COMPOSE=${INFRA_DIR}/docker-compose.yml
PREVIOUS=${COMPOSE}.prev
PROJECT=infra
CONTAINER_PREFIX=st44

# A compose file is a few kilobytes. Anything vastly larger is not one, and
# refusing early keeps a bad stdin from filling the app directory.
MAX_BYTES=262144

# Compose keys that would let the compose file out of its container: host
# namespaces, capabilities, raw devices, and building from host sources. None of
# our sites use any of them, so refusing them costs nothing and closes the gap
# between "can redeploy its own site" and "is root on the host".
FORBIDDEN_KEYS='privileged|cap_add|cap_drop|devices|device|device_cgroup_rules|pid|ipc|uts|userns_mode|network_mode|security_opt|sysctls|cgroup|cgroup_parent|build|extends|volumes_from'

TMP=
cleanup() {
  if [ -n "$TMP" ]; then
    rm -f -- "$TMP" "${TMP}.norm" "${TMP}.norm.err" || true
  fi
}
trap cleanup EXIT INT TERM

log()  { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
die()  { printf 'deploy.sh(st44-home): %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Compose file checks
# ---------------------------------------------------------------------------

# Normalise first, then read the result. `docker compose config` resolves
# anchors, merges and flow style into canonical block YAML, so one grep per rule
# is enough — a rule cannot be dodged by writing `{privileged: true}` on one
# line.
check_compose() {
  local file="$1" norm="${1}.norm"

  docker compose -p "$PROJECT" -f "$file" config > "$norm" 2>"${norm}.err" || {
    log "docker compose rejected the file:"
    sed 's/^/  /' "${norm}.err" >&2 || true
    rm -f -- "${norm}.err"
    die "the compose file on stdin is not valid"
  }
  rm -f -- "${norm}.err"

  local hits
  hits="$(grep -nE "^[[:space:]]*(${FORBIDDEN_KEYS})[[:space:]]*:" "$norm" || true)"
  if [ -n "$hits" ]; then
    log "refused compose keys:"
    printf '%s\n' "$hits" | sed 's/^/  /'
    die "this deploy script will not run a compose file using host namespaces, capabilities, devices or build"
  fi

  # Bind mounts may only reach inside the app directory. A named volume has a
  # non-absolute source and is fine.
  local src
  while IFS= read -r src; do
    [ -n "$src" ] || continue
    case "$src" in
      /*) ;;
      *) continue ;;
    esac
    case "$src" in
      "${APP_DIR}"|"${APP_DIR}"/*) ;;
      *) die "refusing bind mount from '${src}': a st44-home deploy may only mount paths under ${APP_DIR}" ;;
    esac
  done < <(awk '/^[[:space:]]*source:[[:space:]]*/ { sub(/^[[:space:]]*source:[[:space:]]*/, ""); gsub(/"/, ""); print }' "$norm")

  # container_name is global to the docker daemon, so it is the one name that
  # could collide with another site. The compose project is forced to $PROJECT
  # below, which namespaces everything else.
  local name
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    case "$name" in
      "${CONTAINER_PREFIX}"|"${CONTAINER_PREFIX}"-*|"${CONTAINER_PREFIX}"_*) ;;
      *) die "refusing container_name '${name}': a st44-home deploy may only name containers ${CONTAINER_PREFIX} or ${CONTAINER_PREFIX}-*" ;;
    esac
  done < <(awk '/^[[:space:]]*container_name:[[:space:]]*/ { sub(/^[[:space:]]*container_name:[[:space:]]*/, ""); gsub(/"/, ""); print }' "$norm")

  # The trap only knows about $TMP, and install_compose clears that once the
  # file is in place, so drop the normalised copy here rather than leaving it in
  # infra/ after a successful deploy.
  rm -f -- "$norm"

  log "compose file accepted"
}

# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------

receive_compose() {
  step "Receive the compose file on stdin"

  mkdir -p -- "$INFRA_DIR"
  [ -w "$INFRA_DIR" ] || die "${INFRA_DIR} is not writable by $(id -un)"

  # Kept next to the final file so that `docker compose config` resolves any
  # relative path in it the same way it will after the move.
  TMP="$(mktemp "${INFRA_DIR}/.docker-compose.yml.XXXXXXXX")"
  head -c "$((MAX_BYTES + 1))" > "$TMP"

  local size
  size="$(wc -c < "$TMP")"
  [ "$size" -gt 0 ] \
    || die "nothing arrived on stdin — CI must run: ssh <host> \"${APP_DIR}/deploy.sh\" < infra/docker-compose.yml"
  [ "$size" -le "$MAX_BYTES" ] || die "the compose file on stdin is larger than ${MAX_BYTES} bytes"
  log "received ${size} bytes"
}

record_previous() {
  step "Record what is running now (rollback anchor)"

  local running
  running="$(docker ps -a \
    --filter "label=com.docker.compose.project=${PROJECT}" \
    --format '{{.Names}}={{.Image}}' 2>/dev/null || true)"

  if [ -z "$running" ]; then
    log "previous-image: none (first deployment)"
  else
    # Unquoted on purpose: one previous-image line per container.
    # shellcheck disable=SC2086
    printf 'previous-image: %s\n' $running
  fi

  if [ -f "$COMPOSE" ]; then
    log "previous-compose: ${PREVIOUS}"
  fi
}

install_compose() {
  step "Install the compose file"

  if [ -f "$COMPOSE" ]; then
    cp -p -- "$COMPOSE" "$PREVIOUS"
  fi
  mv -f -- "$TMP" "$COMPOSE"
  chmod 644 -- "$COMPOSE"
  TMP=
  log "wrote ${COMPOSE}"
}

# Two-phase, on purpose: db and redis come up first so migrations can run
# against a ready database, and only then backend and frontend start. A single
# `up` would start backend (which depends on db) before migrations had run.
start() {
  # On a rollback the pin names a tag CI is not building this run, so its images
  # may not exist in GHCR (e.g. the path filter skipped a docs-only commit).
  # Check before touching the stack, so a typo'd redeploy_tag gets a clear
  # error and leaves the running stack alone. This runs on the host because the
  # GHCR credential lives in the deploy user's docker config.
  step "Check the pinned images exist"
  local missing=''
  for svc in frontend backend db; do
    local image
    image="$(grep -oE "ghcr\.io/tidemann/st44-home-${svc}:[0-9a-f]{40}" "$COMPOSE" | head -1)"
    if [ -z "$image" ]; then
      log "::error::no pinned ghcr image for ${svc} in ${COMPOSE}"
      missing="${missing} ${svc}"
      continue
    fi
    if docker manifest inspect "$image" >/dev/null 2>&1; then
      log "ok      ${image}"
    else
      log "MISSING ${image}"
      missing="${missing} ${svc}"
    fi
  done
  [ -z "$missing" ] || die "no images in GHCR for:${missing}. Pick a SHA that has a successful Deploy run behind it. Nothing was changed on the server."

  step "Pull and bring up the data services"
  docker compose -p "$PROJECT" -f "$COMPOSE" pull
  docker compose -p "$PROJECT" -f "$COMPOSE" up -d --force-recreate db redis

  step "Run database migrations"
  docker exec st44-db /usr/local/bin/run-migrations.sh

  step "Bring up the application services"
  docker compose -p "$PROJECT" -f "$COMPOSE" up -d --force-recreate backend frontend

  step "Container state"
  docker compose -p "$PROJECT" -f "$COMPOSE" ps
}

# The tag this deploy pinned, read out of the installed compose file — the
# immutable per-commit tag travels in the compose, not as an argument.
pinned_tag() {
  local t
  t="$(grep -oE "ghcr\.io/tidemann/st44-home-(frontend|backend|db):[0-9a-f]{40}" "$COMPOSE" \
    | head -1 | sed -E 's/.*:([0-9a-f]{40})$/\1/')"
  if [ -z "$t" ]; then
    log "could not read a pinned 40-char SHA tag from ${COMPOSE}"
    t=""
  fi
  printf '%s\n' "$t"
}

# The health gate lives here, next to the thing it gates: a forced command means
# CI cannot run `docker exec` or a shell itself, and a deploy that answers
# nothing is not a finished deploy. Exiting non-zero here fails the CI job.
health() {
  step "Health check"

  local i body tag bad
  tag="$(pinned_tag)"

  for i in $(seq 1 30); do
    if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
      log "backend /health: ok after ${i} attempt(s)"
      curl -sS http://localhost:3000/health/database | head -20 || true
      break
    fi
    sleep 2
  done
  curl -fsS http://localhost:3000/health >/dev/null 2>&1 || {
    log "backend never answered http://localhost:3000/health"
    docker logs --tail 50 st44-backend 2>&1 || true
    die "health check failed"
  }

  # Proves the pin took. Without this, a compose file that had drifted back to
  # `:latest` would still pass every health check above.
  bad=0
  for c in st44-frontend st44-backend st44-db; do
    local running
    running="$(docker inspect -f '{{.Config.Image}}' "$c")"
    log "$c -> $running"
    case "$running" in
      *":${tag}") ;;
      *) log "::error::${c} is running ${running}, not the tag this deploy pinned (${tag})"; bad=1 ;;
    esac
  done
  [ "$bad" -eq 0 ] || die "the running images do not match the pinned tag"
}

main() {
  # .env lives beside the compose file and is read from the project directory.
  # The old deploy ran every compose command from $INFRA_DIR; pin the working
  # directory to the same place so DB_PASSWORD and friends resolve identically.
  cd -- "$INFRA_DIR" || die "${INFRA_DIR} does not exist"

  log "deploy st44-home — $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  receive_compose
  check_compose "$TMP"
  record_previous
  install_compose
  start
  health
  step "Done"
  log "st44-home is deployed and answering"
}

main "$@"