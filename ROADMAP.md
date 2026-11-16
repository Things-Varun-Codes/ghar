# Ghar — roadmap

What is shipped, what is planned and which risks are accepted on purpose. Keep it short: update it
when work lands, delete lines when they stop being true.

## Shipped

- **Shell** — Fortify auth, invite-only onboarding, Spatie roles, admin UI, settings, PWA, Web Push + email notifications (`Notify::send()`), household
  membership and per-app permissions, auth-gated `/go/{code}` short links (for NFC tags), `/healthz`,
  Sentry-compatible error reporting.
- **Our History** — timeline, gallery (PhotoSwipe), calendar view, TipTap editor with Corner
  cross-link pills, media on local disk or any S3 bucket, typed or Google Places locations.
- **Our Corner** — lists the household makes itself (name, icon, done word, one of four kinds:
  link, poster, place, plain), detail pages, deferred-delete Undo, metadata lookup.
- **Our Mailbox** — messages, AI bouquets (Cloudflare Workers AI), citations, coupons.
- **Rooms the admin chooses** — Admin → Rooms turns History, Corner and Mailbox on or off at runtime
  (data kept), and Mailbox's four entry types individually. A fresh install starts with none on; an
  upgrade keeps what it had.
- **Quality gates** — Eloquent strict mode, GitHub Actions CI, lefthook hooks, route-drift check,
  Vitest unit tier, headless and fault-injection smoke, restrictive user-FK offboarding.
- **Development** — one-command seeded environment on PostgreSQL with a sample household.

## Planned

### Treasure Hunt mini app

A branching question game: one member authors, another plays.

- Admin CRUD for questions: text, 2–4 choices, exactly one correct, a dead-end message per wrong
  choice, a hint.
- One question at a time; each answer is a POST. **Correctness is decided server-side only** — no
  correctness signal in Inertia props or page source.
- Wrong answer → its dead-end message, back to the same question; three wrong attempts reveal the
  hint.
- Progress persists in the DB (survives refresh and session expiry). A final reveal screen is
  reachable only once the run is complete.
- Fully self-contained under `app/MiniApps/TreasureHunt/` + `resources/js/MiniApps/TreasureHunt/`;
  follow CLAUDE.md "Adding a new mini app".

### Corner soft deletes and durable Undo

Today Undo is a 5000 ms client-side deferral over a hard delete — close the tab mid-window and the
row is gone. Plan:

1. `SoftDeletes` + `deleted_at` on `Item` (`corner_items`), and decide whether a deleted list
   (which cascades its items today) is soft-deleted too.
2. One restore route + a `restore` policy method on `ListItemPolicy`.
3. List queries and `CursorList` exclude trashed rows; All/Active/Done counts stay correct.
4. Re-decide `useItemActions`' delete path, then update the CLAUDE.md item-actions contract and the
   unit tests.
5. Pick and document a purge policy.

Must hold: a restore keeps the original id (History `body_html` bakes `/apps/our-corner/{slug}/{id}`
into stored pills, and pills from before custom lists find an item by its `legacy_id`); non-owner
restore → 403.

### Our History inline GIFs

A search-and-pick GIF modal in the History editor toolbar. Needs an img-capable TipTap extension, a
server-side provider proxy (the API key never reaches the client), a restricted `img` allowance in
the HTMLPurifier allowlist, and a CSP `img-src` entry — watching the ~6 KB Cloudflare header
ceiling.

### Ideas

- **Treasure Hunt → Our History** — a completed hunt creates a History event, through a shell-level
  contract (event/listener or service), never a cross-app import.
- **Notification preferences** — per-channel opt-out UI.
- **History map view** — `location_lat/lng` already exists.

## Accepted risks and decisions

- **One household per install.** Every user is a member; multi-tenant is out of scope.
- **Signed media links work for anyone until they expire** (within two hours), like any presigned URL.
- **No built-in export.** Backups are `pg_dump` plus the media volume or bucket (DEPLOY.md "Backups
  and restore"); there is no in-app download of your data yet.
- **User offboarding.** Corner/Mailbox user FKs are `restrictOnDelete()` — deleting a user who owns
  rows is refused; `invitations.invited_by_user_id` nulls on delete.
- **Roles come only from Spatie.** There is no `is_admin` column.
