## Project

**Ghar** is a private, auth-gated, self-hosted web platform for a family or household. A secure
shell (dashboard + OS chrome) hosts self-contained mini apps.
Enabled today: **Our History** (timeline, gallery, calendar), **Our Corner** (shared lists — songs,
movies, activities, places) and **Our Mailbox** (messages, flowers, challans, coupons).

**Core value:** new mini apps can be added — and existing ones updated — without touching the
shell or other mini apps.

What's shipped, what's next and what's still open: **`ROADMAP.md`**. Deploy and recovery:
**`DEPLOY.md`**. Releases: **`CHANGELOG.md`**. For contributors: **`CONTRIBUTING.md`**. This file
is the agent and architecture reference.

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
| `meera@example.test` | Meera, adult            | **Recipient**: note 1, bouquet 1, coupon 1 and challan 1 are Ravi's to her alone. Can request the coupon and pay the challan.         |
| `kabir@example.test` | Kabir, younger, no push | **Non-recipient**: `/apps/our-mailbox/challans/1` and `coupons/1` must 403; note 1 and bouquet 1 must not be listed.                  |

The seed has every state: moments by all four people (photos on the local media disk, Corner links, more
than one Timeline and Gallery page), Corner items done and not done by different people, 62 Songs
(past the 50-row page), single and multi-recipient notes and flowers read and unread, coupons
issued/requested/part-fulfilled/depleted/expired, challans issued/paid, short links `pantry23`,
`garage23` and the disabled `bench789`, and a pending invite at
`/invitations/dev-invite-token-for-local-testing-only`. Row ids are stable after a reset. Ravi and
Meera have synthetic push subscriptions that can't deliver; test real push by subscribing a browser.

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
- **Proxies:** `TRUSTED_PROXIES` (`App\Shell\Support\TrustedProxies`) is the one list, read by
  `config/trustedproxy.php` and by `ghar:proxy-config`, which writes nginx's real-IP snippet on start.
- **Runtime config only:** the published image must work for any install, so nothing per-install
  goes through `VITE_*`. The page reads the app name and browser DSN from meta tags.
- **Architecture:** domain-driven — the shell and each mini app are fully self-contained domains;
  **no cross-app imports and no cross-app database foreign keys** (`scripts/check-boundaries.sh`).
- **Compose contract:** `docker-compose.yml` builds from source for a PaaS and has no database
  service. `docker-compose.override.yml` is local-dev only (Postgres, Mailpit on `127.0.0.1:1025` /
  `:8025`). `docker-compose.selfhost.yml` stands alone: the published image, Postgres, a Valkey cache, a port, and a
  `.env` from `.env.selfhost.example`. **Never add dev services to either production file.**
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

## Authentication

Fortify (login, remember-me, logout, password reset) + `spatie/laravel-permission` roles
(`admin` / `user`). **Registration is disabled** — users join only by invite.

- Backend admin check: `Gate::define('admin', fn (User $u) => $u->hasRole('admin'))` in
  `ShellServiceProvider` — the **sole integration point**. Never bypass it.
- Frontend admin predicate: `auth.user.roles?.includes('admin')` (`string[]` prop).
- First admin: `php artisan ghar:create-admin {email} {name} [--password=secret]` — idempotent;
  refuses if any admin exists.
- Invite tokens: 64-char random plaintext in the email, stored as a `sha256` hash in
  `invitations.token_hash`; 7-day expiry; single-use (`accepted_at`); revokable (`revoked_at`);
  resend rotates the token.
- Email change is pending-verification only: a signed URL (1-hour TTL) goes to the new address; the
  DB email changes only when it is clicked.
- Self-delete, last-admin delete and last-admin demotion are blocked in depth (`UserObserver`,
  `BlockLastAdminDemotion`, `DB::transaction` around `syncRoles`).

## PWA

- Manifest `/manifest.webmanifest` comes from `ManifestController` (not a static file), so the
  installed name follows `APP_NAME`; icons `public/icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png`, `apple-touch-icon.png` (180×180).
- `public/sw.js` handles the install/activate lifecycle, Web Push display and notification clicks.
  Registered from `resources/js/app.tsx` in production only. Its one `fetch` listener answers
  same-origin page navigations only: it passes them to the network (through navigation preload
  where the browser has it) and serves the precached `public/offline.html` when the network is
  unreachable. Navigations to `/go/*`, `/healthz`, `/up`, `/sw.js` and the manifest are passed
  through unchanged and never get the offline page. It never caches an app page; XHR, assets and
  media skip the worker (static routes on `requestMode`, where supported). Bump `OFFLINE_CACHE` in
  `sw.js` whenever `offline.html` changes.
- iOS standalone + theme-color meta tags live in `resources/views/app.blade.php`.
- **Cloudflare must not cache** `/manifest.webmanifest`, `/sw.js`, `/healthz` or `/go/*` (Cache Rule
  bypass — see DEPLOY.md). A cached `/go/{code}` 302 silently defeats the short-link kill switch.

## Auth-gated short links (NFC tags)

`/go/{code}` is behind `auth` and 302s to a stored `destination` (no interstitial). Admin CRUD at
`/admin/shortlinks` (`admin.shortlinks.*`, `can:admin`). Shell plumbing, **not** a mini app — no
registry entry, card, theme CSS, ServiceProvider or policy. URLs/routes/copy say `shortlink(s)`;
PHP/TS identifiers say `ShortLink`.

- `enabled` kill switch: missing and disabled codes both `abort(404)` through the same condition,
  so a 404 never confirms a code exists.
- `destination` and `label` are repointable (`PATCH`); **`code` is immutable** — absent from
  `#[Fillable]` and every validator. Tags are physically locked; repointing is the fix.
- `code` alphabet is lowercase and non-ambiguous (`abcdefghjkmnpqrstuvwxyz23456789`, `random_int`);
  the redirect lowercases the incoming code, so a capitalised tap still resolves.
- iOS: NFC taps open Safari, never the PWA (separate cookie jars). Log in once in Safari with
  "Remember me" ticked, or the 30-day rolling session bounces the tag to login.

## Conventions

- **OS-vs-app split.** The sidebar (from 1024px) is static OS chrome (Home, Settings, Admin). The
  dashboard is the mini-app launcher. **Mini apps are never added to the sidebar.** Below 1024px
  there is no sidebar: a contextual top bar (wordmark on Home; back + page title elsewhere, fed by
  `Page`) and a bottom bar (`BottomBar`) listing Home plus each enabled room from the registry's
  `nav_label` and its own `nav-icon.tsx`. Settings and Admin live in the account menu there.
- **`AppLayout` is the persistent default layout** (`app.tsx`); pages don't wrap themselves in it.
  Use `Page` for the header: it sets the document title (`room`, `documentTitle`), the back target
  (`back`) and the phone top bar's title. On a route change focus moves to the page's `h1`
  (`lib/route-focus.ts`), except for same-path visits such as filter, sort and search.
- **Back goes back.** `BackChevron` steps through history when the parent is the page you came
  from, and replaces the entry otherwise. Every sheet and dialog that composes or shows an item
  goes through `useOverlayHistory` (`resources/js/hooks/use-overlay-history.ts`), so the back
  gesture closes it instead of leaving the page. One with a draft uses `useDraftCloseGate` +
  `DiscardDraftDialog`, which own the "Discard?" prompt for every way of closing. `app.tsx` calls
  `installOverlayHistory()` before `createInertiaApp`: `popstate` listeners run in the order they
  were added, and Inertia's would otherwise reload the page and drop the draft first. A History moment is addressable at
  `/apps/our-history?moment={id}`.
- **Portal `data-app` propagation.** Radix Dialog / Sheet / AlertDialog / Popover / Select
  portals render at `<body>`, outside the mini app's `[data-app]` scope. Spread
  `{...useAppAttrs()}` (`resources/js/hooks/use-app-attrs.tsx`) onto every portaled root.
- **History EventForm is the stacked 5-row layout** in
  `resources/js/MiniApps/History/Components/EventForm.tsx` (the old 240px sidebar form is gone).
- **Routing: Wayfinder only.** Import typed helpers from `resources/js/routes/**`
  (`import { route as adminRoute } from '@/routes/admin'`). Ziggy is gone; a bare `route()` global
  call is a hard error.
- **Prefetch only side-effect-free pages.** `<Link prefetch="mount">` is on the Home doors, the
  Corner landing cards and the History tabs; `app.tsx` drops the prefetch cache after any non-GET
  visit. Never prefetch a page whose GET changes something: Mailbox Messages and Flowers mark
  themselves read when fetched.
- **Media URLs are stable for an hour.** `SignedUrls` signs from the top of a fixed window so the
  browser can cache photos. Signing from `now()` gives every page view a new URL and a new download.
- **Comments:** only what a reader can't get from the code: a real why, a non-obvious constraint,
  a gotcha. No narration, retold history or PHPDoc that repeats native types (keep generics PHPStan
  needs). Don't cite internal planning, ticket or audit IDs.

### Models

`casts()` method + `#[Fillable([...])]` attribute
(`Illuminate\Database\Eloquent\Attributes\Fillable`) is the standard — not `$fillable` / `$casts`
array properties. Reference: `app/Shell/Models/Invitation.php`, `User.php`.

**Eloquent strict mode** is on outside production (`Model::shouldBeStrict(! app()->isProduction())`,
first line of `AppServiceProvider::configureDefaults()`): lazy loading, silently discarded
attributes and missing-attribute reads are hard failures locally and in tests. Eager-load relations,
keep `#[Fillable]` complete, and `refresh()` a model before reading DB-computed defaults.

## State-adoption contract

A surface that can load slowly, come back empty or fail renders a shared primitive — never a
hand-rolled pending string, an ad-hoc empty paragraph or an invisible failure.

1. **Inertia page render/navigation** — pending: Inertia's progress bar. Empty: the page's
   `EmptyState`. Failure: 403/404 on authenticated non-JSON requests render `Shell/Pages/Error`
   (`bootstrap/app.php` `respond()`); everything else falls to Laravel's page / Inertia's modal. No
   per-page error boundary, by design.
2. **Mode-B navigate (filter/sort/search/tab)** — results dimmed via `.shell-list-pending` +
   `aria-busy`, plus a spinner beside the count, both after a ~250 ms delay. Driven by
   `useCursorPagination`'s `navigating` → `ListNavBand`'s `navigating` prop.
3. **Mode-A load-more pending** — `role="status" aria-busy` "Loading more…" row
   (`ListLoadMoreState`).
4. **Mode-A load-more failure** — inline retry row (`ErrorState variant="inline"` inside
   `ListLoadMoreState`, from `loadError` + `retryLoadMore`) **and** a Glitchtip report. Trigger on
   `onNetworkError` / `onHttpException` — validation `onError` never sees transport/5xx failures.
5. **Client-side fetch** (push subscribe, metadata lookup, bouquet generation) — `LoadingState`;
   failure `ErrorState` with `onRetry`.
6. **Form submit** — `SubmitButton` `processing`; field errors via `FormField`; non-field failures
   via toast. Conditions that outlive the request (pending email change) stay inline. `ErrorState`
   is never used inside a form.
7. **Empty result** — `EmptyState`; `title` is a required prop (missing copy fails `tsc`). A search
   that finds nothing passes `query` + `onClearSearch` and titles itself with `noMatchesTitle()`.
8. **One-tap mutation** (toggle, pay, request, delete) — spread `mutationOptions()`
   (`lib/mutation.ts`) into the visit and disable the control while pending; it toasts and reports
   transport and 5xx failures.

- The Notifications device-status sub-label stays inline (a standing condition, not a request
  result); the subscribe/unsubscribe confirmation is a toast.
- **Two different "flash" mechanisms.** Toasts go through `Inertia::flash('toast', …)` → heard by
  `use-flash-toast.ts`. The middleware-shared `page.props.flash` is an ordinary prop — putting a
  toast key there compiles but never fires.

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

## Design language

For a household, so it should feel thoughtful, cute, soft and warm without costing ease of use.
**The house is one; each room has its own objects.** Chrome is the same everywhere and character
lives on the things themselves.

- **Always the same:** the tinted frame and page sheet (`.shell-frame` / `.shell-sheet`), page titles
  (`.page-h1`), pill buttons, 14px-radius fields, 22px-radius cards, list order (tabs, then count +
  search + sort), add surfaces and vocabulary (a _moment_, a _note_, a _challan_).
- **Two faces with fixed jobs, in every room.** Newsreader (`--font-display`, weight 400) sets page
  titles, section and sheet titles, dates and the title of a moment; its italic is for what was
  filled in or attributed. Hanken Grotesk (`--font-sans`, 400 and 500 only) sets everything else.
  Patrick Hand (`--font-hand`) is the one exception: the body of a note and a coupon's title, and
  nowhere else. Never add a face, a 600+ weight, tracked capitals or text under 13px; sizes come
  from the `--text-*` scale in `app.css`.
- **One radius family and one motion vocabulary**, as tokens in `app.css`: `--radius-pill`,
  `--radius-field`, `--radius-pop`, `--radius-card`, `--radius-inner`; `--ease-ui` with `--dur-in`,
  `--dur-out`, `--dur-press`, `--dur-card`. A button steps up 1px on hover and presses on click
  (`.shell-press`); a field takes `.shell-field`; a card that opens something lifts 2px
  (`.shell-lift`); a small control gets its 44px tap area from `.shell-hit-44`; a fill darkens
  toward the ink, never lightens. Use these classes instead of re-declaring the recipe in a room's
  stylesheet. Write the two layout thresholds as `@variant md` / `@variant lg` in CSS and
  `useIsPhone()` / `useHasSidebar()` in TSX, and stacking layers as the `--z-*` tokens. Nothing bounces, and nothing fades in as a list loads. Cards carry no resting shadow.
- **Two jobs for colour.** `--shell-action` is the only action colour. `--shell-accent` only marks
  what is selected or tints a surface; it never fills a button. Destructive stays outlined until the
  final confirm.
- **A card that opens somewhere opens from anywhere on it.** Put `.shell-card-stretch` on the card and
  `.shell-card-link` on its link; other links and buttons in the card stay on top and keep their own clicks.
- **Dialogs for one or two fields, sheets for composing.** No small tracked label above a title.
- **`HeartMark`** (`Shell/Components/HeartMark.tsx`) is the one drawn mark. No emoji in the UI.
- **Home** is a door per app (`DesktopIcon`) showing a glimpse supplied by that app (see step 8 below).
- **Done is never crossed out.** A loved song or visited place is a treasure: it gets a sticker and
  keeps its full colour.

## Mini-app design notes

The shipped theme CSS and components are the design source of truth. Rules that aren't obvious from
the code:

- **Our History** — tender journal feel: the display face for dates, titles and year banners, the
  sans for the story. Timeline cards are quiet reading surfaces (no Edit/Delete on the card;
  the whole card opens the EventSheet, where management lives).
- **History accessibility contract:** text on accent fills uses `--history-on-accent` (ink, never
  white); body links and accent text ≤14px use `--history-accent-ink-strong` — plain
  `--history-accent-ink` is for ≥18px display text only. Every interactive pill, chip and icon button
  gets a 44×44px hit area; focus uses `--history-focus-ring`; clickable tiles are real
  `<button>`s; hover-only reveals sit inside `@media (hover: hover)`; the reduced-motion block in
  `history.css` stays.
- **PhotoSwipe inside the EventSheet:** the Sheet's `onPointerDownOutside` / `onInteractOutside`
  must `preventDefault()` when `e.target.closest('.pswp')` (`EventSheet.tsx`), or the next-arrow
  click and mobile swipes close the Sheet.
- **Our Corner** — a shelf of loved things. Its character is in its objects, not its type or
  motion: `.corner-sticker` done flags (a fixed tilt, never animated), the CD frame, the poster, the
  pin, and accent washes via `color-mix(in oklab, var(--shell-accent) N%, var(--shell-surface))` —
  never hex. Identity changes
  are CSS-only in `corner.css` over the shared components; don't fork Corner-specific React.
- **Our Mailbox** owns paper: ruled sheets with a red margin, the challan as an official form, the
  coupon as a voucher. A note's body and a coupon's title are in Patrick Hand; what was filled in on
  a form (names, offence, penalty, remarks) is Newsreader italic; the printed parts are the sans at
  13px/500. The form reads as a form through its rules, boxes, seal and stamp, and the stamp is the
  only thing set in capitals.

## Adding a new mini app

For every `enabled` entry in `config/miniapps.php`, `MiniAppServiceProvider` registers its
`provider` and loads `routes/miniapps/{slug}.php` (inside `web` + `auth`) and
`database/migrations/{slug}/`. A disabled app is fully off, so anything it contributes must go
through its provider. Everything else is a hand edit:

1. `config/miniapps.php` entry — include `component_prefix` or `AppLayout`'s chrome-hide breaks,
   and `nav_label` for the phone bottom bar. Ship `resources/js/MiniApps/{App}/nav-icon.tsx` whose
   default export is the room's lucide icon (`export { Map as default } from 'lucide-react';`); the
   shell finds it by glob, and a room without one shows a generic grid icon.
2. `provider` in that entry; registry order is boot order.
3. Console commands and scheduled tasks go in the provider's `boot()` (`$this->commands([...])`,
   `callAfterResolving(Schedule::class, …)`), never `bootstrap/app.php` or `routes/console.php`.
4. `resources/css/themes/{slug}.css` + its `@import` in `resources/css/app.css` (see below).
5. `vite.config.ts` `fonts:` — only if the app registers a font.
6. `resources/js/MiniApps/{App}/` under the registry's `component_prefix`.
7. `scripts/smoke.mjs` routes for every new authenticated page.
8. Optional door content on Home, from the provider's `boot()`: a live line with
   `DashboardSummaries::register('{slug}', fn (User $u): ?string => …)` and a glimpse with
   `registerPreview('{slug}', fn (User $u): ?array => …)` (`images`, or `note` + `note_from`). Must
   return only rows the viewer may see; a throwing resolver just shows nothing.
9. If a table's foreign key to `users` restricts deletes, `UserOwnedContent::register()` it from the
   provider's `boot()`, so the admin delete can say what blocks it.

## Mini-app theme architecture

Three layers. **Layer 1** `--shell-*` OS tokens — one palette (sage on white), defined only in
`resources/css/app.css` on `:root`; mini apps never define them. **Layer 2** `--<app>-*` motif tokens — identity (fonts, radii, easing, textures); colours
here only alias or mix `--shell-*`, never a literal. **Layer 3** `.<app>-*` composition classes scoped under `[data-app='<slug>']`; a class on a portaled root that carries `data-app` itself needs the compound form `[data-app='<slug>'].<class>`. Static styles belong here or in Tailwind; keep `style={{…}}` for values computed at runtime.

> Mini apps consume `--shell-*` for colour, define `--<app>-*` for identity, and never reference
> another app's tokens.

- Register fonts through the Vite plugin `fonts:` array, not `@import url(…)`.
- Exemplars: `themes/history.css` (full three-layer), `themes/mailbox.css` (notebook + challan
  motif), `themes/corner.css` (objects on shared chrome).
- Shared list band (`ListNavBand` / `ListSortControl`, used by Corner and Mailbox) takes app
  identity via `--list-nav-font` and `--list-nav-radius` declared in the app's `[data-app]` scope —
  never by editing the shared component.

## Household model and push routing

Every invited user is a household member (`App\Shell\Services\Household`: `members()`,
`othersThan($user)`, `optionsFor($user)`). One household per install; multi-tenant is out of scope.

| Surface                                | Who sees it        | Who may change it                                       |
| -------------------------------------- | ------------------ | ------------------------------------------------------- |
| History moments (`EventPolicy`)        | Everyone           | Edit, delete, media: creator or admin                   |
| Corner items (`ListItemPolicy`)        | Everyone           | Edit, delete: adder or admin. Mark done: anyone         |
| Notes, flowers (`RecipientMailPolicy`) | Sender, recipients | Delete: sender                                          |
| Coupons, challans (own policies)       | Issuer, recipient  | Request, cancel, pay: recipient. Fulfil, delete: issuer |

- **Enforcement is server-side;** the `can` flags on History and Corner payloads only decide which
  buttons render.
- **Mailbox visibility:** viewer-reachable queries start with `visibleTo($user)` or (notes and
  flowers) `receivedBy($user)`. Notes and flowers keep recipients and per-recipient `read_at` in
  `mailbox_message_recipients` / `mailbox_bouquet_recipients` (`HasRecipients`).
- **Recipients** arrive as `recipient_ids`: one or more other members, never yourself
  (`ValidatesRecipients`). A coupon or challan has one recipient, so several ids issue one row each.
- **Push:** `PushDispatcher::toHousehold($actor, …)` for new moments and Corner items;
  `toUsers($recipients, …)` for Mailbox. Never hand-roll a recipient query.
- **Push timing — two accepted shapes, don't "harmonize" them.** Corner (`AddSong` etc.) dispatches
  inside `DB::afterCommit(...)` within the transaction. Mailbox (`CreateMessage`, `IssueChallan`
  etc.) dispatches on the line after `DB::transaction(...)` returns. Both guarantee no push for a
  rolled-back write.

## Our Mailbox

Slug `our-mailbox`; `App\MiniApps\Mailbox\`; `resources/js/MiniApps/Mailbox/`; routes
`apps.our-mailbox.*` at `/apps/our-mailbox/*`. Holds the directional, non-linkable comms surfaces;
Our Corner keeps the four lists.

- Messages, Flowers, Challans and Coupons all resolve through `App\Shell\Support\CursorList` with
  free-text `?q` and whitelisted `?sort` (`recent`/`oldest`, server-authoritative). No status
  column, so `counts` arrive degraded (`active` = `all`, `done` = 0). Each renders `ListNavBand`
  with the server count ("3 notes") left of Sort. Search columns: Messages `body`; Flowers `note`;
  Challans `offence`/`penalty`/`incident_place`/`remarks`; Coupons `title`/`description`.
- **Challans** — mock traffic tickets. `mailbox_challans`.
  `ref_no` = `OC/{year}/{padded id}` (`OC` frozen). `ref_no`/`status`/`issuer_id` guarded;
  `offence` (≤120) and `penalty` (≤80) fillable. Lifecycle `issued → paid` only: recipient-only
  `pay`, issuer-only hard `delete` of an `issued` row; paid is locked. Push tag
  `our-mailbox:challans`; bodies never leak offence/penalty/remarks. Drawn as an "official form"
  (`--mailbox-challan-*` / `.mailbox-challan-*`, colours alias `--shell-*`).

## Our Corner item-actions contract

Applies to Songs, Movies, Activities and Places.

- **`useItemActions`** (`resources/js/MiniApps/Corner/Hooks/useItemActions.ts`) is the sole source
  of Edit, Delete and Toggle-done. Don't hand-roll an Inertia mutation or a confirm dialog.
- Call it **exactly once per rendered item, inside the card/tile** — never in an index page or the
  list primitive's render callback. Hoisting it hides every row on a single delete, silently.
- **`DetailPage`** owns the frame (two-column grid, back-reference sidebar, meta, actions, done
  control) and takes per-type render-props: Songs a CD frame, Movies a poster, Places a pin with
  address/coordinates, Activities none.
- **Delete is deferred, not soft:** the row hides, an Undo toast cancels, the real request fires
  after `DELETE_GRACE_PERIOD_MS` (5000 ms). Hard delete — no `deleted_at`, no restore route (see
  ROADMAP.md for the planned soft-delete work).
- A mutation that doesn't move the list's reset key must pass `preserveState: false`, or the list
  shows a stale row. The same applies to Mailbox rows; its create sheets use `preserveState: 'errors'`.
- Styling: Layer-3 classes in `resources/css/themes/corner.css`; detail pages use
  `.corner-detail-grid`.
