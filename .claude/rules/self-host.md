---
paths:
    - 'Dockerfile'
    - 'docker/**'
    - 'docker-compose*.yml'
    - '.env.example'
    - '.env.selfhost.example'
    - 'DEPLOY.md'
    - 'CHANGELOG.md'
    - 'RELEASE.md'
    - '.changes/**'
    - 'scripts/release.mjs'
    - 'scripts/lib/changes.mjs'
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
- **Releases:** `RELEASE.md` has the steps; follow it when asked to release. `npm run release` folds
  the change files in `.changes/` into a new `CHANGELOG.md` section, picks the version from their
  types and opens the release pull request; `npm run release:tag` tags the merged commit, which
  starts the workflow. Never run either command, merge the release pull request or push a tag
  unasked. A change that needs action on upgrade sets `breaking: true` in its change file, which
  makes the release a major version and puts the entry under **Upgrading**.
