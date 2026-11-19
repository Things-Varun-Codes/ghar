---
paths:
    - 'app/MiniApps/Corner/**'
    - 'resources/js/MiniApps/Corner/**'
    - 'resources/css/themes/corner.css'
    - 'routes/miniapps/our-shelf.php'
    - 'database/migrations/our-shelf/**'
    - 'scripts/lucide-icons.mjs'
    - 'tests/Feature/Corner/**'
    - 'tests/Fixtures/Corner/**'
---

## Our Shelf lists

Slug `our-shelf`; `App\MiniApps\Corner\`; `resources/js/MiniApps/Corner/`. The household makes
its own lists; nothing about Songs or Movies is hard-coded any more.

- **Two tables.** `corner_lists` (name, `slug`, `icon`, `done_label`, `todo_label`, `done_icon`
  heart|check, `notify_on_add`, `position`, nullable `created_by_user_id`) and `corner_items`. A
  list has no kind: every item has the same optional parts (`title`, `notes`, `url` with
  `site_name`/`author`, `image_url` (the picture's source), and a place: `location_label`,
  `location_url`, `lat`/`lng`, `address`). The same link twice in one list is refused through
  `url_key` (`LinkKey`, the normalised link hashed), unique per list.
- **No site is known by name.** `LinkPreview` reads a pasted page for its oEmbed (discovered from the
  page's own `<link>`), then Open Graph, Twitter card, `<title>` and its largest icon. Don't add a
  provider-specific fetcher, endpoint, allowlist, CSP host or label. The one place that knows URL
  shapes is map links: `MapLink` (server) and `lib/maps.ts` ("Open in Maps": the saved link, else
  the platform's maps address), each a small table.
- **Every outbound fetch goes through the shell's `SafeFetcher`** (`App\Shell\Support\Http`, for any room that fetches a pasted address; never copy it): http/https only, never the app or a private,
  loopback, link-local, CGNAT, reserved or metadata address (IPv4-in-IPv6 included), pinned to the
  checked address, redirects re-checked (at most 3), short timeouts, byte caps. A refused or failed
  fetch returns null and the item is saved with what was typed; it is never an error to the person.
- **Pictures are served by Corner**, never loaded from their source by the browser, so CSP
  `img-src` stays `'self' data: blob:` (plus the media bucket and maps origins when set). Pages draw
  `picture_url` (`/apps/our-shelf/items/{id}/picture?v=…`, private and immutable for a week); the
  add sheet previews through `/api/corner/picture-preview`. `PictureCache` keeps the bytes under
  `storage/framework/cache/data/corner-pictures`, at most 64 MB and safe to delete. The seed
  primes it, so the dev database shows pictures offline.
- **Icons** are any lucide name, validated against `Support/icon-names.json`. Every icon is drawn
  from data by the shell's `LinkableIcon` (lucide's `Icon` + `Shell/linkables/lucide-paths.json`);
  the picker also loads `lucide-index.json` (categories and tags). `scripts/lucide-icons.mjs` writes
  all three from the installed lucide-react; a unit test fails when they drift. The picker
  (`IconPicker`) is a popover (a sheet on a phone) with search, a virtualised grid and keyboard
  use; it sits inside the list settings sheet and goes through `useOverlayHistory`.
- **History pills** carry the list's icon in `data-corner-icon`, but draw the item's current picture
  and icon from each moment's `links` (History's `LinkedThings` + the shell's
  `LinkableEntities::snapshotsFor`: one query for the references, one per linked type). A pill
  whose item is gone falls back to what was written into `body_html`.
- **The slug never changes** after creation: notifications, History pills and NFC short links
  point at it. `lists` and `items` are reserved (`CreateList::RESERVED_SLUGS`) because the
  mutation routes use them at the same depth.
- **Routes.** `/apps/our-shelf/{slug}` is a list and `/apps/our-shelf/{slug}/{id}` an item, both
  looked up by hand so a missing one renders `EntityNotFound`. Mutations live at `lists/{id}`
  and `items/{id}`; `POST /apps/our-shelf/{slug}` adds to a list.
- **Copy never needs a noun.** A list is named by the household, so copy reads "Add to Books",
  "3 things · 1 read", "Ravi added to Books: The Salt Road". Don't add singular/plural fields.
- **Who may delete a list:** an admin always; its maker only while every item in it is theirs
  (`CornerListPolicy::mayDelete`), since deleting a list deletes other people's things. The
  payload's `delete_needs_admin` lets the menu say so. The four lists the upgrade made have no
  maker, so only an admin changes them.
- **Lists from before custom lists.** The migration `2026_11_16_100000_…` moved the old four
  tables into lists `songs`, `movies`, `activities`, `places`, kept each row's old type and id in
  `legacy_type` / `legacy_id`, and started new ids above every old one. So
  `/apps/our-shelf/songs/5` finds id 5 in that list or, failing that, `legacy_id` 5. History
  pills saved before then say `corner.song` (etc.) with the old id: those four types stay
  registered in `LinkableEntities` as resolve-only aliases (no `listing`, see `CornerLinks`), or
  History would drop them on the next save. New pills use `corner.item`. Never rewrite History's
  `body_html` from Corner.
- **A fresh install has no lists.** The empty landing offers `SUGGESTED_LISTS`
  (`lib/presets.ts`), one tap each through the normal create endpoint.
- **While the room is off** its routes 404, Home shows no door, push is dropped by
  `PushDispatcher` and every Corner linkable type is registered with `room: 'our-shelf'`, so
  the picker finds none of its things (it still finds moments) and the shared `linking.types`
  leaves them out. The types stay registered, so History keeps both old and new pills (shown as
  plain text) when a moment is saved meanwhile.
- **Our Shelf** — a shelf of loved things, one look for every list. Its character is in its
  objects, not its type or motion: `.corner-sticker` done flags (a fixed tilt, never animated), each
  item's picture in a rounded thumb (`ItemThumb`), and where there is no picture the list's own icon
  on an accent wash via `color-mix(in oklab, var(--shell-accent) N%, var(--shell-surface))` — never
  hex. Identity changes are CSS-only in `corner.css` over the shared components; don't fork
  Corner-specific React.

## Our Shelf item-actions contract

Applies to every list.

- **`useItemActions`** (`resources/js/MiniApps/Corner/Hooks/useItemActions.ts`) is the sole source
  of Delete and Toggle-done (Edit only opens `ItemSheet`). Don't hand-roll an Inertia mutation
  or a confirm dialog.
- Call it **exactly once per rendered item, inside the card/tile** — never in an index page or the
  list primitive's render callback. Hoisting it hides every row on a single delete, silently.
- **`DetailPage`** owns the frame (two-column grid, back-reference sidebar, meta, actions, done
  control); `Pages/Item.tsx` fills it the same way for every item. `Pages/List.tsx` renders one
  `ItemCard` per item. Adding and editing happen in `ItemSheet` (a sheet: up to seven fields).
- **Delete is deferred, not soft:** the row hides, an Undo toast cancels, the real request fires
  after `DELETE_GRACE_PERIOD_MS` (5000 ms). Hard delete — no `deleted_at`, no restore route (see
  ROADMAP.md for the planned soft-delete work).
- Styling: Layer-3 classes in `resources/css/themes/corner.css`; detail pages use
  `.corner-detail-grid`.
