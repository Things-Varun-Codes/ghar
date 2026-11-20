## Project

**Ghar** is a private, auth-gated, self-hosted web platform for a family or household. A secure
shell (dashboard + OS chrome) hosts self-contained mini apps.
Installed today: **Our History** (timeline, gallery, calendar), **Our Shelf** (lists the household
defines: songs, films, places, books…) and **Our Exchange** (messages, flowers, citations, coupons). **The admin
chooses which rooms a home has** at Admin → Rooms (`/admin/rooms`); a fresh install starts with none on.

**Core value:** new mini apps can be added — and existing ones updated — without touching the
shell or other mini apps.

What's shipped, what's next and what's still open: **`ROADMAP.md`**. Deploy and recovery:
**`DEPLOY.md`**. Releases: **`CHANGELOG.md`**; how to cut one: **`RELEASE.md`**. For contributors:
**`CONTRIBUTING.md`**. This file is the agent and architecture reference.

## Rules the code can't show

Design: **`DESIGN.md`**. Everything else below guards against a real bug; the code shows the rest.

- **Privacy.** Notes, flowers, coupons and citations are seen only by sender and recipients, not
  admins: viewer queries start with `visibleTo`, `receivedBy` or `issuedBy`. A push or Home row
  never carries a note's text, a comment's text or a citation's details (lock screens show them).
- **Permissions are server-side** (policies, `Gate::authorize`, `can:admin` on the `/admin`
  group); payload `can` flags only pick buttons. "Maker or admin" is `User::makerOrAdmin()`. Who may
  enter a room is `Rooms::canEnter()` alone.
- **Time.** "Today" and anything due use `Region::today()` / `Region::now()` (the household's
  zone), never `now()`; stored timestamps are UTC. Compare dates as dates, not re-parsed strings.
- **People** go to pages as `Person::short($user)` (first name); never send `avatar_key`, which is
  not fillable (a key from input could sign someone else's file).
- **Media URLs** are signed from the top of a fixed hour window (`SignedUrls`), so photos cache.
- **Strict mode** is on outside production: eager-load, keep `#[Fillable]` complete. Models use
  `casts()` and `#[Fillable]`, not the array properties.
- **Push** only through `PushDispatcher` (`toHousehold`, `toUsers`), after the transaction
  commits. Reactions send nothing.
- **Outbound fetches** of pasted addresses go through `SafeFetcher` (no private, loopback or
  metadata addresses); a failed fetch saves what was typed, never errors.
- **Never indexable:** `robots.txt`, the robots meta tag and `X-Robots-Tag` (middleware and nginx)
  stay in step; no Open Graph tags.
- **Frontend:** links are Inertia `Link` and Wayfinder helpers, never a bare `route()`. A sheet or
  dialog that composes goes through `useOverlayHistory`, and one with a draft through
  `useDraftCloseGate`. Never prefetch a page whose GET changes something (Exchange marks read).
  Toasts are `Inertia::flash('toast', …)`, not `page.props.flash`. A slow, empty or failing surface
  uses the shared `EmptyState`, `ErrorState`, `LoadingState` and `lib/mutation.ts` options.
- **`useItemActions`** (Shelf) is called once per rendered item, inside the card: hoisting it
  hides every row on one delete.
- **Releases:** follow `RELEASE.md`. Never run `npm run release`, merge the release pull request or
  push a tag unasked.

**A new room:** an entry in `config/miniapps.php` (with `component_prefix` and `nav_label`), a
provider holding `SLUG` that registers everything in `boot()` (policies, limiters, commands,
`registerFeed`, `LinkableEntities`, `UserOwnedContent`), `routes/miniapps/{slug}.php`,
`database/migrations/{slug}/`, `MiniApps/{App}/nav-icon.tsx`, `themes/{slug}.css` imported in
`app.css`, smoke routes in `scripts/smoke.mjs`, and a `DevData/{App}Data.php` seeder. The shell
never names a room (`scripts/check-boundaries.sh`).

## How to test locally

**Every session uses this environment. Don't invent users or data; if a scenario isn't covered,
extend `database/seeders/DevDataSeeder.php` and this table.**

```sh
npm run dev-setup     # fresh clone to seeded environment (safe to re-run; rebuilds the database)
npm run dev-reset     # re-seed only: every row back to the known state
npm run dev-sync      # after a pull or branch switch: services, dependencies, routes, migrations
npm run dev-up        # dev-sync, then composer dev
npm run smoke-mcp     # build + serve the seeded data on 127.0.0.1:8000, prints the accounts
composer dev          # or: server + queue + logs + Vite, also on 127.0.0.1:8000
```

Password for every account: `ghar-local-dev`. Mail lands in Mailpit at `http://127.0.0.1:8025`.

| Account              | Who                         | Use it to check                                                                                                                                                                  |
| -------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin@example.test` | Asha, the only admin        | Admin pages; editing anyone's moment or Corner item; last-admin guards. Has no special access to other people's mail.                                                            |
| `ravi@example.test`  | Ravi, adult, has a picture  | **Non-admin creator**: can edit "Monsoon drive to the coast" (his), can't edit "Meera's first pottery class". Sender of the fixtures; can't delete Kabir's comment 2 on Monsoon. |
| `meera@example.test` | Meera, adult, has a picture | **Recipient**: note 1, bouquet 1, coupon 1 and citation 1 are Ravi's to her alone. Can request the coupon and pay the citation.                                                  |
| `kabir@example.test` | Kabir, younger, no push     | **Non-recipient**: `/apps/our-exchange/citations/1` and `coupons/1` must 403; note 1 and bouquet 1 must not be listed.                                                           |

Every state the seed covers is in `database/seeders/DevDataSeeder.php` and `DevData/`; row ids are
stable after a reset.

`npm run smoke` and `npm run smoke-loadmore` seed the same household into their own databases.

**Start a session with `npm run dev-sync`.** It starts Docker, Postgres and Mailpit if they are
down, installs dependencies when a lockfile changed, installs the git hooks, regenerates Wayfinder
and migrates. If a migration that already ran was edited, it rebuilds the database from the seed.

**In a new git worktree, run `bash scripts/worktree-setup.sh` first** (and
`bash scripts/worktree-teardown.sh` before removing it). It copies `.env` from the main checkout,
installs dependencies and builds. A worktree shares the main checkout's Postgres and dev database;
PHPUnit gets its own database there (`tests/bootstrap.php`), so plain `php artisan test` is safe in
parallel worktrees. The smoke scripts use fixed ports: one run at a time per machine.

### Constraints

- **Framework:** Laravel + Inertia.js + React — no Next.js (CVE track record).
- **Database:** PostgreSQL 17 only — prod, local dev, PHPUnit and smoke. Dev runs it from
  `docker-compose.override.yml`.
- **Cache:** `CACHE_STORE=database` in dev and for source builds, `redis` (Valkey) in the self-host
  stack; PHPUnit uses `array`. Sessions and the queue always stay in Postgres.
- **File storage:** `MEDIA_DISK=local` (default; Laravel's signed `/storage/…` URLs) or `s3` (any
  S3-compatible bucket, presigned URLs). Both private; never store a URL, only the object key.
- **Hosting:** any Docker host, amd64 or arm64. Release images at `ghcr.io/<owner>/ghar` come from
  `.github/workflows/release.yml` on a `v*` tag. Cloudflare in front is optional. See DEPLOY.md.
- **Runtime config only:** the published image must work for any install, so nothing per-install
  goes through `VITE_*`. The page reads the app name and browser DSN from meta tags.
- **Architecture:** domain-driven — the shell and each mini app are fully self-contained domains;
  **no cross-app imports and no cross-app database foreign keys** (`scripts/check-boundaries.sh`).
- **Compose contract:** `docker-compose.yml` builds from source for a PaaS and has no database
  service. `docker-compose.override.yml` is local-dev only (Postgres, Mailpit on `127.0.0.1:1025` /
  `:8025`). `docker-compose.selfhost.yml` stands alone: the published image, Postgres, a Valkey cache, a port, and a
  `.env` from `.env.selfhost.example`. **Never add dev services to either production file.**

## Technology stack

| Package                                          | Version                             |
| ------------------------------------------------ | ----------------------------------- |
| Laravel                                          | ^13.7                               |
| PHP                                              | 8.5 image (composer ^8.4)           |
| Inertia (`inertia-laravel` / `@inertiajs/react`) | ^3.0 / ^3.0 (version independently) |
| React                                            | ^19.2.7                             |
| Vite                                             | ^8                                  |
| Tailwind CSS                                     | ^4 (no `tailwind.config.js`)        |
| TypeScript                                       | ^6.0                                |
| shadcn/ui on Base UI (`@base-ui/react`)          | ^1.9 (style `base-vega`)            |
| Motion (`motion`, through `components/motion`)   | ^14                                 |
| Vitest                                           | ^5                                  |

## Working in this repo

- **Comments:** only what a reader can't get from the code: a real why, a non-obvious constraint,
  a gotcha. No narration, retold history or PHPDoc that repeats native types (keep generics PHPStan
  needs). Don't cite internal planning, ticket or audit IDs.
- **Every change a household can notice brings its changelog entry:** a change file in `.changes/`,
  in the same pull request (format and wording: `.changes/README.md`). The pull request title is a
  Conventional Commits title, and the "Change file" check fails a `feat:` or `fix:` without a file.
  Edit an unreleased file when your change touches what it describes. Never edit `CHANGELOG.md`.
- **Branch from a fresh `origin/main`,** never from another open branch: `git fetch origin main`
  then `git switch -c <type>/<name> origin/main`.
- **The shell is zsh: quote every glob** (`grep --include='*.php'`, `ls 'app/Foo/'*.php`). An
  unquoted pattern that matches nothing fails the whole command with `no matches found`.
- **When tests are red, rerun with `--stop-on-failure` or a `--filter`.** Each failed page test
  prints the whole exception trace, so a broad red run is megabytes of output.
- **PHPStan needs `--memory-limit=1G`,** on one file as much as on the repo.
- **Don't read the lockfiles whole.** `composer.lock` (~480 KB) and `package-lock.json` (~330 KB)
  are most of a context window: use `composer show <package>` and `npm ls <package>`.
- **`.ignore` keeps the lockfiles and the two lucide data files out of ripgrep searches;** pass
  `--no-ignore` when you do need them.
- **Search the big stylesheets instead of reading them.** `app.css`, `themes/history.css` and
  `themes/mailbox.css` are 45–60 KB each; grep for the class or token you need.

## Testing

Five tiers; none replaces another. Start with [How to test locally](#how-to-test-locally).

- **Unit — `npm test`.** Vitest + jsdom, files co-located with source. Inertia `router` and sonner
  `toast` are mocked, so green proves the right call was issued, not that it landed. Pins two
  invariants that would otherwise break silently: `useItemActions`' 5000 ms deferred delete (Undo
  cancels with zero network traffic; unmounting mid-window deliberately does **not** cancel the
  delete) and `useCursorPagination`'s superseded-visit guard (an older visit's `onFinish` must not
  clear a newer visit's `navigating`). Use this tier for new hook/utility logic with branching or
  timing. The custom ESLint rules' tests run with `npm run test:rules`, the release script's with
  `npm run test:scripts`.
- **PHPUnit — `php artisan test`.** HTTP, Inertia payload shape, DB state, policies, middleware.
  Runs on **Postgres**, like prod: the `ghar_test` database on `127.0.0.1:5432` (phpunit.xml; a real
  `DB_*` env var overrides it). Start the dev container first. `RefreshDatabase` wraps each test in a
  transaction, so sequences keep counting — never assume an id is 1.
- **Headless smoke — `npm run smoke`.** Playwright Chromium against `artisan serve` with its own env
  block and its own `ghar_smoke` database, seeded by `DevDataSeeder` (`scripts/smoke.mjs`). Every
  listed route; fails on `pageerror`/`console.error`, non-200, or no visible
  `<h1>`/`<h2>`. Catches page-mount regressions only. Add every new authenticated page, admin page
  and auth route — `scripts/check-smoke-routes.mjs` fails if a GET route is neither listed nor on
  its skip-list.
- **Fault-injection smoke — `npm run smoke-loadmore`.** Own `ghar_smoke_loadmore` database (same
  seed) + `artisan serve` on 8877; forces transport failure and 5xx on the Corner Songs cursor
  request and asserts the inline retry recovers. CI runs it on every pull request; run it locally
  when touching cursor pagination, the list footer or the pagination hook.
- **Interactive — Playwright MCP.** Start with `npm run smoke-mcp` (rebuilds the bundle, serves the
  seeded data on `127.0.0.1:8000`; plain `artisan serve` serves a stale `public/build/`). **Required
  when** a change touches XHR/fetch/upload/drag-drop/`FormData`, any Base UI portal (Dialog, Drawer,
  Sheet, AlertDialog, Popover, Menu, Select, Tooltip), a dirty-gate or multi-step/close-intent flow, or a new mini-app
  interactive surface.

**The loop.** Locally, run the tests for what you touched: `php artisan test --filter=…` or one
test directory, and `npx vitest run <path>`. Then push and wait for CI with
`gh pr checks <n> --watch` (about two minutes). The pre-push hook is a quick gate, under a minute:
a clean tree, the `scripts/` checks, formatting of the files being pushed, and PHPStan, lint and
types across the repo. It runs no tests. If a push goes through without it, the hooks are missing:
`npm run dev-sync` installs them. `.github/workflows/ci.yml` runs the full set on every pull request and
`main` requires it to pass: the `scripts/` checks, both dependency audits, formatting, types, lint,
Vitest, the ESLint rule tests, Pint, PHPStan, the build, PHPUnit, both headless smokes and the
production image. `npm run verify` runs that set (all but the image) locally in one command, several
minutes; use it when you want everything green before opening a pull request. The interactive tier
stays yours to run when it applies. Never use `--no-verify`.

Strictness: `tsconfig.json` enforces `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, `noImplicitOverride`; ESLint enforces `no-explicit-any`. Fix
violations — don't suppress them. The one sanctioned suppression is `local/no-silent-error`
(error; off for `scripts/**`): a catch or Inertia `onError` must call `captureSilent` /
`Sentry.capture*`, or carry `// eslint-disable-next-line local/no-silent-error -- <rationale>`
above the `} catch` when silence is the contract. `captureSilent` always toasts — use
`Sentry.captureException` directly to report without one.
