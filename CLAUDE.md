## Project

**Ghar** is a private, auth-gated, self-hosted web platform for a family or household. A secure
shell (dashboard + OS chrome) hosts self-contained mini apps.
Installed today: **Our History** (timeline, gallery, calendar), **Our Corner** (lists the household
defines: songs, films, places, books…) and **Our Mailbox** (messages, flowers, citations, coupons). **The admin
chooses which rooms a home has** at Admin → Rooms (`/admin/rooms`); a fresh install starts with none on.

**Core value:** new mini apps can be added — and existing ones updated — without touching the
shell or other mini apps.

What's shipped, what's next and what's still open: **`ROADMAP.md`**. Deploy and recovery:
**`DEPLOY.md`**. Releases: **`CHANGELOG.md`**. For contributors: **`CONTRIBUTING.md`**. This file
is the agent and architecture reference.

## Scoped rules

Rules for one area live in `.claude/rules/`, and Claude Code loads each file when a session reads
or edits a file under its `paths:`. Open one yourself when the work is in that area but you haven't
touched a matching file yet (a new room, a design question, a release):

- `frontend.md`: shell layout, back/history, portals, Wayfinder, prefetch, the state-adoption contract
- `design.md`: the design language. `themes.md`: the three theme layers
- `backend.md`: Eloquent model conventions, strict mode, signed media URLs
- `household.md`: who sees and changes what, recipients, push routing and timing
- `new-mini-app.md`: installing a room, rooms on and off, the hand edits a new room needs
- `history.md`, `corner.md`, `mailbox.md`: each room's rules
- `auth.md`, `pwa.md`, `shortlinks.md`, `self-host.md` (proxies, indexing, first start, releases)
- `dev-data.md`: every state the dev seed holds

## How to test locally

**Every session uses this environment. Don't invent users or data; if a scenario isn't covered,
extend `database/seeders/DevDataSeeder.php` and this table.**

```sh
npm run dev-setup     # fresh clone to seeded environment (safe to re-run; rebuilds the database)
npm run dev-reset     # re-seed only: every row back to the known state
npm run smoke-mcp     # build + serve the seeded data on 127.0.0.1:8000, prints the accounts
composer dev          # or: server + queue + logs + Vite, also on 127.0.0.1:8000
```

Password for every account: `ghar-local-dev`. Mail lands in Mailpit at `http://127.0.0.1:8025`.

| Account              | Who                     | Use it to check                                                                                                                       |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `admin@example.test` | Asha, the only admin    | Admin pages; editing anyone's moment or Corner item; last-admin guards. Has no special access to other people's mail.                 |
| `ravi@example.test`  | Ravi, adult             | **Non-admin creator**: can edit "Monsoon drive to the coast" (his), can't edit "Meera's first pottery class". Sender of the fixtures. |
| `meera@example.test` | Meera, adult            | **Recipient**: note 1, bouquet 1, coupon 1 and citation 1 are Ravi's to her alone. Can request the coupon and pay the citation.       |
| `kabir@example.test` | Kabir, younger, no push | **Non-recipient**: `/apps/our-mailbox/citations/1` and `coupons/1` must 403; note 1 and bouquet 1 must not be listed.                 |

Every state the seed covers, with the ids to use, is in `.claude/rules/dev-data.md`.

`npm run smoke` and `npm run smoke-loadmore` seed the same household into their own databases.

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
| shadcn/ui on Radix primitives                    | current                             |
| Vitest                                           | ^5                                  |

## Working in this repo

- **Comments:** only what a reader can't get from the code: a real why, a non-obvious constraint,
  a gotcha. No narration, retold history or PHPDoc that repeats native types (keep generics PHPStan
  needs). Don't cite internal planning, ticket or audit IDs.

## Testing

Five tiers; none replaces another. Start with [How to test locally](#how-to-test-locally).

- **Unit — `npm test`.** Vitest + jsdom, files co-located with source. Inertia `router` and sonner
  `toast` are mocked, so green proves the right call was issued, not that it landed. Pins two
  invariants that would otherwise break silently: `useItemActions`' 5000 ms deferred delete (Undo
  cancels with zero network traffic; unmounting mid-window deliberately does **not** cancel the
  delete) and `useCursorPagination`'s superseded-visit guard (an older visit's `onFinish` must not
  clear a newer visit's `navigating`). Use this tier for new hook/utility logic with branching or
  timing. The custom ESLint rules' tests run with `npm run test:rules`.
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
  request and asserts the inline retry recovers. Run when touching cursor pagination, the list
  footer or the pagination hook.
- **Interactive — Playwright MCP.** Start with `npm run smoke-mcp` (rebuilds the bundle, serves the
  seeded data on `127.0.0.1:8000`; plain `artisan serve` serves a stale `public/build/`). **Required
  when** a change touches XHR/fetch/upload/drag-drop/`FormData`, any Radix portal (Dialog, Sheet,
  AlertDialog, Popover, Dropdown), a dirty-gate or multi-step/close-intent flow, or a new mini-app
  interactive surface.

Before pushing: `npm test`, `php artisan test`, `npm run build`, `npm run smoke`, plus
`smoke-loadmore` / MCP when they apply. lefthook's pre-push runs the same set fail-fast;
`.github/workflows/ci.yml` runs all but the audits and `smoke-loadmore` on every pull request. Never use `--no-verify`.

Strictness: `tsconfig.json` enforces `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, `noImplicitOverride`; ESLint enforces `no-explicit-any`. Fix
violations — don't suppress them. The one sanctioned suppression is `local/no-silent-error`
(error; off for `scripts/**`): a catch or Inertia `onError` must call `captureSilent` /
`Sentry.capture*`, or carry `// eslint-disable-next-line local/no-silent-error -- <rationale>`
above the `} catch` when silence is the contract. `captureSilent` always toasts — use
`Sentry.captureException` directly to report without one.
