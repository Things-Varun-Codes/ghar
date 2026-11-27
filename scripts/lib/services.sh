# Sourced by the dev scripts. `ensure_services` leaves Postgres and Mailpit
# running and healthy, starting Docker first when it can.

step() { printf '\n==> %s\n' "$1"; }

# The last value .env gives a key; empty when the key or the file is missing.
get_env() { sed -n "s/^$1=//p" .env 2>/dev/null | tail -n 1 || true; }

# set_env KEY VALUE replaces a `KEY=` line, or appends one. No `sed -i`, whose
# flags differ between macOS and Linux.
set_env() {
  local tmp
  tmp="$(mktemp)"
  if grep -q "^$1=" .env; then
    while IFS= read -r line || [ -n "$line" ]; do
      case "$line" in
        "$1="*) printf '%s\n' "$1=$2" ;;
        *) printf '%s\n' "$line" ;;
      esac
    done < .env > "$tmp"
    mv "$tmp" .env
  else
    rm -f "$tmp"
    printf '%s=%s\n' "$1" "$2" >> .env
  fi
}

# Gives a worktree its own `artisan serve` port, 8001-8099, kept across re-runs and
# never one another worktree holds. The smoke runs and smoke-mcp offset from it
# (scripts/lib/checkout-port.mjs), so worktrees can serve and smoke side by side.
assign_port() {
  local port here taken n
  port="$(get_env SERVER_PORT)"
  here="$(pwd -P)"
  taken=" $(git worktree list --porcelain | sed -n 's/^worktree //p' | while IFS= read -r wt; do
    [ "$wt" = "$here" ] || sed -n 's/^SERVER_PORT=//p' "$wt/.env" 2>/dev/null || true
  done | tr '\n' ' ') "
  if [[ ! "$port" =~ ^80(0[1-9]|[1-9][0-9])$ ]] || [[ "$taken" == *" $port "* ]]; then
    port=""
    for n in $(seq 8001 8099); do [[ "$taken" == *" $n "* ]] || { port="$n"; break; }; done
    [ -n "$port" ] || { echo "error: every port from 8001 to 8099 belongs to another worktree." >&2; return 1; }
  fi
  set_env SERVER_PORT "$port"
  set_env APP_URL "http://127.0.0.1:$port"
}

# Rebuild the database with the sample household, and stamp the migrations it ran.
seed_household() {
  php artisan migrate:fresh --seed --force
  bash scripts/lib/migration-stamp.sh write
}

ensure_docker() {
  command -v docker >/dev/null || {
    echo "error: no Postgres is answering and Docker is not installed. Install Docker, or run Postgres 17 on 127.0.0.1:5432 with user and password \`ghar\` (allowed to create databases)." >&2
    return 1
  }
  docker info >/dev/null 2>&1 && return 0

  if [ "$(uname)" = "Darwin" ]; then
    open -ga OrbStack 2>/dev/null || open -ga Docker 2>/dev/null || true
    printf '    waiting for Docker to start'
    for _ in $(seq 1 45); do
      if docker info >/dev/null 2>&1; then printf '\n'; return 0; fi
      printf '.'
      sleep 2
    done
    printf '\n'
  fi

  echo "error: Docker is not running. Start it and re-run." >&2
  return 1
}

# True when the Postgres that .env points at answers. A machine without Docker
# (a dev container, a VPS) can run its own Postgres 17 with the `ghar` user.
postgres_answers() {
  local host port
  host="$(get_env DB_HOST)"
  port="$(get_env DB_PORT)"
  GHAR_PG_DSN="pgsql:host=${host:-127.0.0.1};port=${port:-5432};dbname=postgres" php -r '
    try { new PDO(getenv("GHAR_PG_DSN"), "ghar", "ghar", [PDO::ATTR_TIMEOUT => 2]); } catch (PDOException) { exit(1); }
  ' 2>/dev/null
}

ensure_services() {
  if ! docker info >/dev/null 2>&1 && postgres_answers; then
    echo "    using the Postgres that is already running (no Docker here, so no Mailpit)"
    return 0
  fi

  ensure_docker || return 1
  # One Postgres for the machine: a worktree uses the main checkout's, since a
  # second Compose project could not bind the same port. `--wait` returns once
  # Postgres passes its healthcheck, so nothing after this connects too early.
  local dir
  dir="$(main_checkout)"
  (cd "${dir:-.}" && docker compose -f docker-compose.override.yml up -d --wait postgres mailpit) || {
    echo "error: could not start Postgres and Mailpit. If a port is taken, set GHAR_DB_PORT, GHAR_MAILPIT_SMTP_PORT or GHAR_MAILPIT_UI_PORT and re-run." >&2
    return 1
  }
}

# The main checkout when this one is a linked worktree, empty otherwise.
main_checkout() {
  local common
  common="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || return 0
  [ "$common" = "$(git rev-parse --path-format=absolute --git-dir)" ] || dirname "$common"
}

# Hooks live in the shared .git, so one install covers every worktree.
install_hooks() {
  git rev-parse --git-dir >/dev/null 2>&1 || return 0
  npx lefthook install >/dev/null
}

# lock_changed <lockfile> <stamp>: true when the lockfile differs from the one
# last installed. `record_lock` writes the stamp after an install.
lock_changed() { [ ! -f "$2" ] || [ "$(shasum < "$1")" != "$(cat "$2")" ]; }
record_lock() { mkdir -p "$(dirname "$2")" && shasum < "$1" > "$2"; }
