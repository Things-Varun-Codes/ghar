---
paths:
    - 'Dockerfile'
    - 'docker/**'
    - 'docker-compose*.yml'
    - '.env.example'
    - '.env.selfhost.example'
    - 'DEPLOY.md'
    - 'CHANGELOG.md'
    - '.github/workflows/**'
    - 'config/trustedproxy.php'
    - 'app/Shell/Support/TrustedProxies.php'
    - 'app/Shell/Console/**'
    - 'public/robots.txt'
    - 'resources/views/**'
    - 'app/Http/Middleware/**'
    - 'tests/Feature/Security/Robots*'
---

## Self-hosting, release and indexing constraints

- **Proxies:** `TRUSTED_PROXIES` (`App\Shell\Support\TrustedProxies`) is the one list, read by
  `config/trustedproxy.php` and by `ghar:proxy-config`, which writes nginx's real-IP snippet on start.
- **Never indexable:** an install is private, so it asks not to be indexed in three places that
  must stay in step: `public/robots.txt` (one `User-agent: *` group, no named bots), the robots
  meta tag in `app.blade.php`, and `X-Robots-Tag` from `AddRobotsHeader` (global middleware) and
  `docker/nginx/default.conf` (an nginx location with its own `add_header` must repeat it). No Open
  Graph, description or preview-image tags on guest pages. Project discoverability lives in the
  repo (`README.md`, `FAQ.md`, `llms.txt`), never under `public/`.
- **First start:** `docker/docker-entrypoint.sh` generates `APP_KEY` and VAPID keys into
  `storage/app/generated-secrets.env` when unset, migrates, seeds roles, and creates the
  `GHAR_ADMIN_EMAIL` admin if none exists. Every step must stay idempotent.
- **Releases:** add a `CHANGELOG.md` section, then tag `vX.Y.Z`; the workflow fails without the
  section. A change that needs action on upgrade is a major version and says so under **Upgrading**.
