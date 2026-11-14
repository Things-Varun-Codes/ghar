# Self-hosting Ghar

Ghar is one container (nginx, PHP-FPM, a queue worker and the scheduler) plus PostgreSQL 17 and, in
the self-host stack, a small Valkey cache. It runs on anything with Docker: a home server, a small
VPS, an arm64 board such as a Raspberry Pi 4 or 5, or a PaaS such as Coolify, Dokploy or CapRover.
Images are published for amd64 and arm64.

It uses about 200 MB of RAM when idle. Photos and videos stay on your own disk unless you point it
at a bucket. Mail is the only outside service you need, and even that can wait until you invite
people.

Examples below use `ghar.example.com`. Substitute your own address.

---

## Quick start

```sh
mkdir ghar && cd ghar
curl -LO https://raw.githubusercontent.com/Things-Varun-Codes/ghar/main/docker-compose.selfhost.yml
curl -L -o .env https://raw.githubusercontent.com/Things-Varun-Codes/ghar/main/.env.selfhost.example
```

Open `.env` and fill in the three required lines: `APP_URL`, `DB_PASSWORD` (`openssl rand -hex 24`
makes one) and `GHAR_ADMIN_EMAIL`. Then:

```sh
docker compose -f docker-compose.selfhost.yml up -d
docker compose -f docker-compose.selfhost.yml logs app | grep -A1 "Admin account created"
```

The log shows the admin's password once. Log in at <http://localhost:8080> (change the port with
`GHAR_PORT`), change the password under Settings, and invite your family from Admin, Invites.

On its first start the container also creates the encryption key and the Web Push keys and keeps
them in the `app_storage` volume, so there's nothing to generate by hand. To manage them yourself,
set `APP_KEY`, `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env`. Values in `.env` always win.

Before real use, put it behind HTTPS (next section), set up [mail](#mail) so invites reach people,
and set up [backups](#backups-and-restore).

---

## HTTPS with Caddy

Browsers only allow installing the app, Web Push and secure cookies over HTTPS. Caddy gets and
renews a certificate for you. Point a DNS record at your machine, open ports 80 and 443, and add two
files next to the compose file.

`Caddyfile`:

```caddyfile
ghar.example.com {
	reverse_proxy app:80
}
```

`docker-compose.caddy.yml`:

```yaml
services:
    app:
        ports: !reset []
    caddy:
        image: caddy:2.10.2-alpine
        restart: unless-stopped
        ports:
            - '80:80'
            - '443:443'
            - '443:443/udp'
        volumes:
            - ./Caddyfile:/etc/caddy/Caddyfile:ro
            - caddy_data:/data
            - caddy_config:/config
volumes:
    caddy_data:
    caddy_config:
```

Set `APP_URL=https://ghar.example.com` in `.env` and start both:

```sh
docker compose -f docker-compose.selfhost.yml -f docker-compose.caddy.yml up -d
```

Traefik, Nginx Proxy Manager or your PaaS's proxy work the same way: forward to the container's
port 80 and pass `X-Forwarded-For` and `X-Forwarded-Proto` (they all do by default). For a home
server only your family reaches, Tailscale with `tailscale serve` also works and needs no open ports.

### Reverse proxy and client IPs

`TRUSTED_PROXIES` says whose `X-Forwarded-*` headers to believe. The per-IP login throttle and the
logs depend on it.

| Value                 | When                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------- |
| `private` (default)   | A proxy on the same machine or Docker network: Caddy, Traefik, a PaaS.                  |
| `cloudflare,private`  | Cloudflare proxies your DNS and a local proxy sits behind it. Reads `CF-Connecting-IP`. |
| `203.0.113.4,private` | A proxy elsewhere with a fixed address. Any IPs and CIDR ranges can be listed.          |

`private` also trusts the rest of your LAN, which is fine at home. On a VPS, don't publish the app's
port to the internet; let only the proxy reach it. An unknown value stops the container with an
error rather than guessing.

---

## Mail

Invites and password resets go by email. `MAIL_MAILER=log` writes them to the app log instead,
which is enough to try Ghar: copy the invite link from
`docker compose -f docker-compose.selfhost.yml logs app`.

For real use, set `MAIL_FROM_ADDRESS` to an address your provider will send from, then either:

- `MAIL_MAILER=smtp` with `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME` and `MAIL_PASSWORD` (plus
  `MAIL_SCHEME=smtps` for port 465). Any provider works, including your email host or a relay such
  as Brevo, Mailgun or Amazon SES.
- `MAIL_MAILER=resend` with `RESEND_API_KEY` and a domain verified in Resend.

---

## Media storage

`MEDIA_DISK` decides where photos, videos and flower pictures go. Choose before anyone uploads,
because switching later means moving every file yourself.

**`local` (default).** Files live in the `media` volume, mounted at
`/var/www/html/storage/app/private`. Every view goes through a signed link that expires after an
hour, so a copied link stops working. To keep the files in a folder of your choice, such as a NAS
mount, set `GHAR_MEDIA_PATH=/srv/ghar/media` and make it writable by uid 82
(`chown -R 82:82 /srv/ghar/media`).

**`s3`.** Any S3-compatible bucket. It stays private, and every view is a presigned link that
expires after an hour.

| Provider      | `S3_ENDPOINT`                                   | `S3_REGION`         | `S3_USE_PATH_STYLE_ENDPOINT` |
| ------------- | ----------------------------------------------- | ------------------- | ---------------------------- |
| Cloudflare R2 | `https://<account-id>.r2.cloudflarestorage.com` | `auto`              | `true`                       |
| Backblaze B2  | `https://s3.<region>.backblazeb2.com`           | e.g. `us-west-004`  | `true`                       |
| MinIO, Garage | your server, e.g. `https://minio.example.com`   | `us-east-1` / yours | `true`                       |
| AWS S3        | leave empty                                     | e.g. `eu-west-1`    | `false`                      |

Also set `S3_BUCKET`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, with read and write access to
that bucket only. Use the provider's API endpoint, not a custom domain: presigned links only work
against the API. Browsers load files straight from the bucket, and Ghar adds the bucket's address to
its Content Security Policy by itself.

---

## Cache

Rate limits (login, invites) and the health heartbeats go through the cache. Nothing in it needs to
outlive a restart; sessions and the job queue stay in Postgres.

`docker-compose.selfhost.yml` runs [Valkey](https://valkey.io), the open-source Redis fork, as the
`cache` service. It holds at most 64 MB, writes nothing to disk and has no published port, so
there is nothing to configure or back up. After it restarts, `/healthz` can report `queue` and
`scheduler` as failing for up to a minute, until the next heartbeat.

Building from source with `docker-compose.yml`, the cache defaults to Postgres
(`CACHE_STORE=database`). To use Valkey or Redis, provision one next to the app and set
`CACHE_STORE=redis`, `REDIS_HOST` and, if it needs them, `REDIS_PASSWORD` and `REDIS_USERNAME`.

---

## Upgrading

Images are tagged by exact version (`1.2.3`), minor (`1.2`) and major (`1`). The default
`GHAR_VERSION=1` follows every 1.x release, and none of those needs you to change anything. A new
major version says what to do under **Upgrading** in [`CHANGELOG.md`](./CHANGELOG.md).

1. Read the changelog entries since your version.
2. [Back up](#backups-and-restore) the database and media.
3. Change `GHAR_VERSION` if needed, then:

    ```sh
    docker compose -f docker-compose.selfhost.yml pull
    docker compose -f docker-compose.selfhost.yml up -d
    ```

4. Check `/healthz` (see [Monitoring](#monitoring)).

The container runs database migrations when it starts. They only go forward, so going back to an
older version means restoring the backup from step 2 and pinning the old `GHAR_VERSION`.

---

## Backups and restore

Three things hold your data: the database, the media (with `MEDIA_DISK=local`) and the generated
keys in the storage volume. Run these from the folder with the compose file:

```sh
C="docker compose -f docker-compose.selfhost.yml"

$C exec -T db pg_dump -U ghar --format=custom ghar > ghar-$(date +%F).dump
$C exec -T app tar czf - -C storage/app/private . > ghar-media-$(date +%F).tgz
$C exec -T app cat storage/app/generated-secrets.env > ghar-secrets.env   # once is enough
```

Run the first two on a schedule (cron, or your NAS's task scheduler) and copy the files to another
machine; `restic` or `rclone` to another disk or a cloud bucket works well. Keep
`ghar-secrets.env` and your `.env` somewhere safe, such as a password manager. Losing `APP_KEY`
logs everyone out, and losing the Web Push keys means every device has to turn notifications on
again.

With `MEDIA_DISK=s3`, back up the bucket instead. R2 has no object versioning, so a deleted file is
gone; an `rclone sync` to a second bucket, or a provider with versioning, covers it.

**Restore** onto a fresh install, with the same `.env` and the secrets file's lines copied into it:

```sh
$C up -d db
$C exec -T db pg_restore -U ghar -d ghar --clean --if-exists < ghar-2026-01-01.dump
$C up -d
$C exec -T app tar xzf - -C storage/app/private < ghar-media-2026-01-01.tgz
```

Try a restore once before you need it, on another machine or under another project name
(`docker compose -p ghar-restore-test ...`).

---

## Monitoring

- **`/up`** is liveness: `200` while nginx and PHP answer. The container's healthcheck uses it, so
  a database outage never restarts the app.
- **`/healthz`** is readiness: `200` or `503` with `{status, checks}`, where `database`, `queue`,
  `scheduler` and `disk` each read `ok` or `failing`. It shows nothing else and is rate-limited to
  60 requests a minute per IP. Mail, push and the bucket never affect it.

```sh
curl -s https://ghar.example.com/healthz
# {"status":"ok","checks":{"database":"ok","queue":"ok","scheduler":"ok","disk":"ok"}}
```

`queue` fails when no job has been processed for 10 minutes, `scheduler` after 3 minutes without a
tick, and `disk` under 512 MB free on the storage volume. For 5 minutes after a start, missing
queue and scheduler heartbeats still read `ok`.

Point an uptime monitor (Uptime Kuma, Healthchecks.io, Gatus) at `/healthz` every 60 seconds and
treat anything but `200` as down. Run it on a different machine from Ghar.

**Error tracking.** Set `SENTRY_LARAVEL_DSN` (server) and `SENTRY_BROWSER_DSN` (browser) to DSNs
from Sentry or a self-hosted GlitchTip. Both are read at runtime, and personal data isn't sent.

**Failed jobs.** The worker tries a job three times, then moves it to `failed_jobs` and reports it
to the error tracker. In the app container, `php artisan queue:failed` lists them, and
`queue:retry {id}` or `queue:retry all` requeues them once the cause is fixed. Failed jobs older
than 90 days are pruned weekly.

---

## Optional features

- **Web Push** works once the site is on HTTPS, using the keys made on first start.
  `VAPID_SUBJECT` defaults to `APP_URL`; a `mailto:` address works too. On iOS, push needs the app
  added to the Home Screen first (Share, Add to Home Screen).
- **Location search** in Our History and Our Corner uses Google Places when `GOOGLE_MAPS_API_KEY`
  is set. Without it, people type places in by hand. To set it up, enable **Places API (New)** and
  **Maps JavaScript API** in Google Cloud (billing must be linked), create an API key restricted to
  your site's URL and to those two APIs, then set it and restart.
- **AI flower pictures** in Our Mailbox use Cloudflare Workers AI:
  `BOUQUET_IMAGE_PROVIDER=cloudflare` with `CLOUDFLARE_ACCOUNT_ID` and a token scoped to Workers AI
  in `CLOUDFLARE_WORKERS_AI_TOKEN`. `fake` draws a placeholder instead. The setting has no default,
  so an unset provider fails loudly rather than quietly serving placeholders.
- **Short links for NFC tags** (`/go/{code}`, managed in Admin) sit behind login. iOS opens NFC
  taps in Safari, not in the installed app, so log in once in Safari with "Remember me" ticked.

---

## Behind Cloudflare

Cloudflare in front of Ghar is optional. If you use it:

- Proxy the DNS record (orange cloud) with SSL mode **Full (strict)**, and set
  `TRUSTED_PROXIES=cloudflare,private`.
- Allow ports 80 and 443 only from [Cloudflare's ranges](https://www.cloudflare.com/ips/), so
  nobody can reach the origin directly and forge headers.
- Add a Cache Rule that **bypasses cache** for `/manifest.webmanifest`, `/sw.js`, `/healthz` and
  anything starting with `/go/`. The first three keep app updates and probes fresh. `/go/` matters
  for correctness: a cached short-link redirect would keep working after you disable the link.

    ```sh
    curl -sI https://ghar.example.com/healthz | grep -iE 'cf-cache-status|cache-control'
    # cf-cache-status: BYPASS, cache-control: no-store, ...
    ```

- Cloudflare returns a 502 once the origin's response headers pass about 6 KB. The Content Security
  Policy is the largest header, so after adding a Google Maps key or an error tracker, check that
  `curl -sI https://ghar.example.com/login` still answers.
- Cloudflare's free plan caps uploads at 100 MB. Ghar's limit is 96 MB, set in
  `docker/nginx/default.conf` and `docker/php/php.ini`; change both together.

---

## Building from source

`docker-compose.yml` builds the image from this repository. It's the file a PaaS such as Coolify
points at, and it has no database or published port: provide Postgres yourself (`DB_HOST` and
friends) and route your proxy to the container's port 80. `docker-compose.override.yml` is for
development only and Compose merges it automatically when present, so on a server pass the file
explicitly:

```sh
docker compose -f docker-compose.yml up -d --build
```

The build needs about 2 GB of RAM. For readable browser stack traces, set the build arguments
`SENTRY_URL`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT`, and the build uploads
sourcemaps. They are build-time only and never reach the running container.

To cut a release, add its section to `CHANGELOG.md` and push a tag such as `v1.2.3`.
`.github/workflows/release.yml` runs CI, builds both architectures, and publishes the images and the
GitHub release. To rehearse one, push a pre-release tag such as `v1.2.3-rc.1`: it publishes only
`:1.2.3-rc.1`, leaves `:1`, `:1.2` and `:latest` alone, and uses the `1.2.3` changelog section.

---

## Environment variables

Every key in `.env.example`; `scripts/check-env-deploy-sync.sh` checks them against the block
below. A self-host install only needs the few in `.env.selfhost.example`, because
`docker-compose.selfhost.yml` fixes the database, session, cache, queue and log settings itself.

- `APP_NAME`: the name shown everywhere (sign-in page, sidebar, browser tab, installed app, mail),
  `Ghar` by default. Read at runtime. An already-installed app keeps its old name until reinstalled.
- `APP_ENV` / `APP_DEBUG`: `production` / `false` on a server.
- `APP_KEY`: generated on first start when empty. `php artisan key:generate --show` makes one.
- `APP_URL`: the address people open, with `https://` once it's behind TLS.
- `APP_LOCALE` / `APP_FALLBACK_LOCALE` / `APP_FAKER_LOCALE`: `en` / `en` / `en_US`.
- `APP_MAINTENANCE_DRIVER`: `file`. `BCRYPT_ROUNDS`: `12`.
- `TRUSTED_PROXIES`: see [Reverse proxy and client IPs](#reverse-proxy-and-client-ips).
- `GHAR_ADMIN_EMAIL` / `GHAR_ADMIN_NAME`: the admin created on first start, if none exists yet.
- `LOG_CHANNEL` / `LOG_STACK` / `LOG_DEPRECATIONS_CHANNEL` / `LOG_LEVEL`: `stderr` / `single` /
  `null` / `warning` on a server, so Docker rotates the logs.
- `DB_CONNECTION` / `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD`: `pgsql`,
  and wherever your Postgres 17 is.
- `SESSION_DRIVER` / `SESSION_LIFETIME` / `SESSION_ENCRYPT` / `SESSION_PATH` / `SESSION_DOMAIN`:
  `database` / `43200` (30 days, so "Remember me" lasts) / `false` / `/` / `null`.
- `CACHE_STORE` / `QUEUE_CONNECTION` / `FILESYSTEM_DISK`: `database` / `database` / `local`.
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_USERNAME` / `REDIS_PASSWORD`: only read when
  `CACHE_STORE=redis`. See [Cache](#cache).
- `MEDIA_DISK` and `S3_*`: see [Media storage](#media-storage).
- `MAIL_*` and `RESEND_API_KEY`: see [Mail](#mail).
- `SENTRY_LARAVEL_DSN` / `SENTRY_BROWSER_DSN`: error tracking; empty turns it off.
- `TELESCOPE_ENABLED`: `false`. Telescope only loads when `APP_ENV=local`.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`: generated on first start when empty.
  Changing them signs every device out of notifications.
- `GOOGLE_MAPS_API_KEY`, `BOUQUET_IMAGE_PROVIDER`, `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_WORKERS_AI_TOKEN`, `CLOUDFLARE_AI_IMAGE_MODEL`: see
  [Optional features](#optional-features).

```env
APP_NAME=
APP_ENV=
APP_KEY=
APP_DEBUG=
APP_URL=
APP_LOCALE=
APP_FALLBACK_LOCALE=
APP_FAKER_LOCALE=
APP_MAINTENANCE_DRIVER=
BCRYPT_ROUNDS=
TRUSTED_PROXIES=
GHAR_ADMIN_EMAIL=
GHAR_ADMIN_NAME=
LOG_CHANNEL=
LOG_STACK=
LOG_DEPRECATIONS_CHANNEL=
LOG_LEVEL=
DB_CONNECTION=
DB_HOST=
DB_PORT=
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
SESSION_DRIVER=
SESSION_LIFETIME=
SESSION_ENCRYPT=
SESSION_PATH=
SESSION_DOMAIN=
CACHE_STORE=
REDIS_HOST=
REDIS_PORT=
REDIS_USERNAME=
REDIS_PASSWORD=
QUEUE_CONNECTION=
FILESYSTEM_DISK=
MEDIA_DISK=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_ENDPOINT=
S3_REGION=
S3_USE_PATH_STYLE_ENDPOINT=
MAIL_MAILER=
MAIL_HOST=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_SCHEME=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME=
RESEND_API_KEY=
SENTRY_LARAVEL_DSN=
SENTRY_BROWSER_DSN=
TELESCOPE_ENABLED=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
GOOGLE_MAPS_API_KEY=
BOUQUET_IMAGE_PROVIDER=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_WORKERS_AI_TOKEN=
CLOUDFLARE_AI_IMAGE_MODEL=
```

---

## See also

- [`CHANGELOG.md`](./CHANGELOG.md): what changed in each version.
- [`SECURITY.md`](./SECURITY.md): what Ghar protects against and how to report a problem.
- [`ROADMAP.md`](./ROADMAP.md): what's planned, and the trade-offs made on purpose.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md): running it locally and testing.
