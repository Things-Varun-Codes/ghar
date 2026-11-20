---
paths:
    - 'resources/js/**'
---

## Frontend conventions

- **OS-vs-app split.** The sidebar (from 1024px) lists Home, then every room that is on (the same
  list as the phone's bottom bar, with each room's `nav-icon.tsx`), then Settings and Admin. Home
  shows what needs you and what's new; it is not a launcher. Below 1024px
  there is no sidebar: a contextual top bar (wordmark on Home; back + page title elsewhere, fed by
  `Page`) and a bottom bar (`BottomBar`) listing Home plus each room that is on, from the registry's
  `nav_label` and its own `nav-icon.tsx`. Settings and Admin live in the account menu there.
- **`AppLayout` is the persistent default layout** (`app.tsx`); pages don't wrap themselves in it.
  Use `Page` for the header: it sets the document title (`room`, `documentTitle`), the back target
  (`back`) and the phone top bar's title. On a route change focus moves to the page's `h1`
  (`lib/route-focus.ts`), except for same-path visits such as filter, sort and search.
- **Back goes back.** `BackChevron` steps through history when the parent is the page you came
  from, and replaces the entry otherwise. The shell knows only one parent: a page inside a room goes
  to the room's landing, named from the `miniApps` registry prop, and anything else goes Home
  (`defaultParent` in `lib/back-navigation.ts`). A page whose parent is something else passes
  `back` to `Page` (a Corner item to its list, a Mailbox citation or coupon to its list, History's
  tabs to Home); the shell never names a room (`scripts/check-boundaries.sh`). A page owns one history entry:
  `lib/navigation.ts` turns a GET to the path already shown (filter, sort, search, tab, page
  number) into a replace, so back leaves the page instead of undoing the filter. Link to another
  page with Inertia's `Link`: a plain `<a>` reloads the document and the chevron forgets where
  you came from. Back and forward restore a page from browser history without a request, so a page
  last seen before a write asks for its props again when restored (`lib/stale-history.ts`, a
  replacing visit: `router.reload()` always keeps component state).
  Every sheet and dialog that composes or shows an item
  goes through `useOverlayHistory` (`resources/js/hooks/use-overlay-history.ts`), so the back
  gesture closes it instead of leaving the page. One with a draft uses `useDraftCloseGate` +
  `DiscardDraftDialog`, which own the "Discard?" prompt for every way of closing: the gate's
  `onOpenChange` goes on the Base UI Root and cancels Base UI's own close (Escape, an outside
  press, its Close, a swipe) while the draft is dirty, then asks. Render the prompt inside the
  overlay's Root so it is the nested, topmost layer. Dirtiness is Inertia's `form.isDirty`;
  `form.setDefaults()` makes what's there now the clean state. `app.tsx` calls
  `installOverlayHistory()` before `createInertiaApp`: `popstate` listeners run in the order they
  were added, and Inertia's would otherwise reload the page and drop the draft first. A History moment is addressable at
  `/apps/our-history?moment={id}`.
- **Controls are shadcn on Base UI** (`components/ui`, style `base-vega`). Compose with `render`,
  never `asChild`; a trigger's own props go on `DropdownMenuTrigger` itself. A link that looks
  like a button is a `Link` (or `<a>`) with `buttonVariants()`, not a `Button`: Base UI's Button
  gives whatever it renders `role="button"`, so a screen reader would hear the link as a button.
  A menu item acts in `onClick`; one that opens a dialog just sets the dialog's state there. Base UI returns focus to whatever had it before an overlay
  opened; pass `finalFocus` for another target and `initialFocus={false}` for a panel that
  focuses itself. State is in data attributes (`data-open`, `data-checked`, `data-pressed`,
  `data-popup-open`, `data-active`, `data-highlighted`), which room CSS targets. A `Select` given
  `items` prints the chosen label before its list has opened.
- **Portal `data-app` propagation.** Base UI portals render at `<body>`, outside the mini app's
  `[data-app]` scope. The `components/ui` Dialog, Sheet, Drawer, AlertDialog, Popover, Select,
  DropdownMenu and Tooltip spread `useAppAttrs()` (`resources/js/hooks/use-app-attrs.tsx`) onto
  their portaled content themselves, so use those rather than raw Base UI parts and don't spread
  it again. A new portaled primitive in `components/ui` does the same.
- **Shared overlays.** A sheet that holds a form is the shell's `FormSheet` (title, scrolling body,
  footer above the keyboard, the draft gate) on the `components/ui` Drawer: from the bottom on a
  phone and the right from `md` (`useSheetSide()`), swiping toward its edge to close, and inside
  Base UI's `VirtualKeyboardProvider` (`keyboardAware`), which keeps the focused field above an
  on-screen keyboard and sets `--drawer-keyboard-inset` for the footer. A sheet with its own frame
  (History's `EventSheet`) uses the Drawer directly. An edge panel without a form or gestures is
  `Sheet`, a positioned Dialog. Mark a descendant `data-base-ui-swipe-ignore` when its own drags
  (an editor, a carousel) must not move the sheet.
  A "Delete this?" or "Pay this?" question is `ConfirmDialog`; a room keeps its look through
  `classNames`, as History does (`MiniApps/History/lib/confirmDialog.ts`).
- **Routing: Wayfinder only.** Import typed helpers from `resources/js/routes/**`
  (`import { route as adminRoute } from '@/routes/admin'`). Ziggy is gone; a bare `route()` global
  call is a hard error.
- **Cursor lists.** Shelf and Exchange lists come from `App\Shell\Support\ListPage`, which
  sends the list as an `Inertia::scroll` prop, and render through `Shell/Components/CursorListBody`
  (rows, empty and no-matches states, load-more footer, pending dim): Inertia's `InfiniteScroll`
  fetches the next cursor page as the footer nears the viewport and appends it to the page prop,
  so the rows are always the page's own `props.items.data`. Every response but a load-more one (a
  filter, sort or search visit, a mutation's redirect, a reload) is marked as a reset by `ListPage`,
  so the list starts over from the first page with no `preserveState: false`, and back restores
  the loaded rows from history. The cursor stays out of the address bar (`preserveUrl`). Filter,
  sort and search are `useListNavigation`. History's Timeline and Gallery still keep their rows in
  `useCursorPagination` (re-seed from any response carrying the list; `refreshInPlace()`). Mailbox
  create sheets use `preserveState: 'errors'`; "Send & write another" keeps state, so the sheet
  stays open.
- **Prefetch only side-effect-free pages.** `<Link prefetch="mount">` is on the
  Corner landing cards (the first four) and the History tabs; `lib/stale-history.ts` drops the prefetch cache after any non-GET
  visit. Never prefetch a page whose GET changes something: Mailbox Messages and Flowers mark
  themselves read when fetched.
- **Links between rooms are the shell's.** The picker (`Shell/tiptap/EntityLinkPickerDialog`) and
  the pill (`EntityLinkPill` in the editor, `Shell/linkables/EntityPillContent` wherever a pill is
  read) take labels, groups and icons from the server and never name a room. Whether to offer or
  draw a link comes from the shared `linking` prop (`useLinking()`, `useLinkTypeOn(type)`), never
  from which rooms are on. A pill's stored href and picture are free text: pass them through
  `Shell/linkables/urls.ts` before use. The persisted format (`cornerLink`, `data-corner-*`) stays.

## State-adoption contract

A surface that can load slowly, come back empty or fail renders a shared primitive — never a
hand-rolled pending string, an ad-hoc empty paragraph or an invisible failure.

1. **Inertia page render/navigation** — pending: Inertia's progress bar. Empty: the page's
   `EmptyState`. Failure: 403/404 on authenticated non-JSON requests render `Shell/Pages/Error`
   (`bootstrap/app.php` `respond()`); everything else falls to Laravel's page / Inertia's modal. No
   per-page error boundary, by design.
2. **Mode-B navigate (filter/sort/search/tab)** — results dimmed via `.shell-list-pending` +
   `aria-busy`, plus a spinner beside the count, both after a ~250 ms delay. Driven by
   `useListNavigation`'s `navigating` → `ListNavBand`'s `navigating` prop.
3. **Mode-A load-more pending** — `role="status" aria-busy` "Loading more…" row
   (`ListLoadMoreState`).
4. **Mode-A load-more failure** — inline retry row (`ErrorState variant="inline"` inside
   `ListLoadMoreState`) **and** a Glitchtip report. Trigger on `onNetworkError` /
   `onHttpException` — validation `onError` never sees transport/5xx failures. `CursorListBody`
   does this through `InfiniteScroll`'s `params` and stops loading by itself until "Try again";
   History's lists through `useCursorPagination` (`loadError` + `retryLoadMore`).
5. **Client-side fetch** (push subscribe, metadata lookup, bouquet generation) — `LoadingState`;
   failure `ErrorState` with `onRetry`.
6. **Form submit** — `SubmitButton` `processing`; field errors via `FormField`; non-field failures
   via toast. Spread `formSubmitOptions()` (`lib/mutation.ts`) into the submit: it toasts only the
   errors the form has no field for, reports the rejected keys (never what was typed), and toasts
   and reports transport and 5xx failures. Conditions that outlive the request (pending email
   change) stay inline. `ErrorState` is never used inside a form.
7. **Empty result** — `EmptyState`; `title` is a required prop (missing copy fails `tsc`). A search
   that finds nothing passes `query` + `onClearSearch` and titles itself with `noMatchesTitle()`.
8. **One-tap mutation** (toggle, pay, request, delete) — spread `mutationOptions()`
   (`lib/mutation.ts`) into the visit and disable the control while pending; it toasts and reports
   transport and 5xx failures.

- `captureSilent` tags `user_role` from the page Inertia last showed (`installUserRole` in
  `app.tsx`); don't work the role out in the caller.
- The Notifications device-status sub-label stays inline (a standing condition, not a request
  result); the subscribe/unsubscribe confirmation is a toast.
- **Two different "flash" mechanisms.** Toasts go through `Inertia::flash('toast', …)` → heard by
  `use-flash-toast.ts`. The middleware-shared `page.props.flash` is an ordinary prop — putting a
  toast key there compiles but never fires.

## Motion

- Rooms move through the presets in `components/motion` only (`Fade`, `Rise`, `Pop`, `Reveal`,
  `Settle` + `SettleItem`, `Slide`); ESLint keeps `motion/react` out of every other file. The
  durations are the `--dur-*` tokens, mirrored in `lib/motion.ts` and checked against `app.css`
  by a unit test.
- Overlays animate with Base UI's own `data-starting-style` / `data-ending-style` CSS in
  `components/ui`, on the tokens; never put Motion on a popup or its backdrop.
- `Settle` settles the rows of its first render only, and only on a page being opened
  (`lib/motion.ts` `installMotionGate`): back, forward and a visit to the path already shown
  appear in place, as does every row mounted later. `CursorListBody` and `RoomDoor`
  (`settleIndex`) carry it.
- `Pop` and `Fade` never animate on first render: a room's objects change on a state change only.
- One `MotionConfig reducedMotion="user"` (`MotionProvider` in `app.tsx`) plus the unlayered block
  in `app.css`; `Reveal` and `Settle` read `useReducedMotion()` for what isn't a transform.
- Vitest skips animations (`components/motion/testing.ts`, from `test/setup.ts`).

## Why these stay custom

The rule is library first; these three have no maintained library that does the job.

- **The back gesture closing an overlay** (`use-overlay-history`). shadcn and Base UI have
  nothing for it; the npm options are small one-person packages; `CloseWatcher` covers Android's
  back button but not the iOS swipe-back, and Safari hasn't shipped it. The hook is small, tested
  on both platforms' paths, and is the piece to re-test on each Inertia minor release, since it
  stops a `popstate` before Inertia's listener sees it.
- **Pull-to-refresh** (`usePullToRefresh`). No maintained package; the ones there are don't know
  about an open overlay (`data-scroll-container`, Base UI's page scroll lock), the `Fab`'s
  containing block (no transform at rest), or Inertia's `router.reload`.
- **Room objects** (stickers, notes, coupons, citations, stamps, the bouquet). They are the
  design: markup and themed CSS, not infrastructure. Libraries that draw such things bring their
  own art direction.
