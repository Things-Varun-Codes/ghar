#!/usr/bin/env bash
# Runs on every container start, so every step is idempotent. Seeding is a
# one-off; see DEPLOY.md "First-run bootstrap".
set -euo pipefail

cd /var/www/html

# `chown` below is a no-op unless root, so a read-only or root-owned volume must
# fail loudly here rather than as a cryptic HTMLPurifier or logger error later.
assert_writable() {
    if [ ! -w "$1" ]; then
        echo "[entrypoint] FATAL: '$1' is not writable by $(id -un) (uid=$(id -u)). If this is a mounted volume, make it writable by uid $(id -u) (e.g. chown it on the host) before redeploying." >&2
        exit 1
    fi
}

assert_writable storage
assert_writable bootstrap/cache

# `app_storage` masks the image's storage/ tree, and on a fresh volume it is empty.
mkdir -p \
    storage/logs \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/framework/testing \
    storage/app/htmlpurifier \
    storage/app/private \
    bootstrap/cache

if [ "$(id -u)" = "0" ]; then
    chown -R www-data:www-data storage bootstrap/cache
fi

# Tolerate a stray root-owned file rather than aborting the boot over it.
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

for d in \
    storage/logs \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/framework/testing \
    storage/app/htmlpurifier \
    storage/app/private \
    bootstrap/cache; do
    assert_writable "$d"
done

if [ -z "${DB_HOST:-}" ]; then
    echo "[entrypoint] FATAL: DB_HOST is empty. Set it in your host's environment settings."
    exit 1
fi

echo "[entrypoint] waiting for database at ${DB_HOST}:${DB_PORT:-5432}..."
ATTEMPTS=0
until php -r "
    \$dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', getenv('DB_HOST'), getenv('DB_PORT') ?: '5432', getenv('DB_DATABASE'));
    try { new PDO(\$dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD')); exit(0); }
    catch (PDOException \$e) { exit(1); }
" 2>/dev/null; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ "$ATTEMPTS" -ge 60 ]; then
        echo "[entrypoint] database did not become available after 60s; aborting"
        exit 1
    fi
    sleep 1
done
echo "[entrypoint] database ready (after ${ATTEMPTS}s)"

# First start without APP_KEY or VAPID keys: generate them once and keep them in
# the storage volume. Values set in the environment always win.
SECRETS_FILE=storage/app/generated-secrets.env
if [ -f "$SECRETS_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$SECRETS_FILE"
    set +a
fi
if [ -z "${APP_KEY:-}" ]; then
    APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
    echo "APP_KEY=$APP_KEY" >> "$SECRETS_FILE"
    echo "[entrypoint] generated APP_KEY into $SECRETS_FILE. Back up the storage volume, or copy it into your .env."
fi
if [ -z "${VAPID_PUBLIC_KEY:-}" ] || [ -z "${VAPID_PRIVATE_KEY:-}" ]; then
    php artisan webpush:vapid --show --no-ansi | grep '^VAPID_' >> "$SECRETS_FILE"
    set -a
    # shellcheck disable=SC1090
    . "$SECRETS_FILE"
    set +a
    echo "[entrypoint] generated Web Push keys into $SECRETS_FILE."
fi
chmod 600 "$SECRETS_FILE" 2>/dev/null || true
export APP_KEY
export VAPID_SUBJECT="${VAPID_SUBJECT:-${APP_URL:-}}"

# --isolated takes a lock so concurrent starts don't migrate at once.
# CACHE_STORE=file because the normal database cache's `cache_locks` table is
# created by this very migration; a first deploy would crash-loop without it.
# The lock file lives in app_storage, so it only serializes containers on one
# host. For several hosts, use redis.
CACHE_STORE=file php artisan migrate --isolated --force

# Roles are reference data every install needs; the seeder is idempotent.
CACHE_STORE=file php artisan db:seed --class='Database\Seeders\RoleSeeder' --force --no-interaction

if [ -n "${GHAR_ADMIN_EMAIL:-}" ]; then
    # Prints a generated password once, on the start that creates the account.
    CACHE_STORE=file php artisan ghar:create-admin "$GHAR_ADMIN_EMAIL" "${GHAR_ADMIN_NAME:-Admin}" --if-none
fi
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache || true
php artisan ghar:proxy-config

# After config:cache and migrate, so a worker on the previous image finishes its
# job and exits rather than running stale code.
php artisan queue:restart

# Starts /healthz's grace window for the first scheduler and queue heartbeats.
touch storage/framework/container-started-at

exec "$@"
