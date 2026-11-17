---
paths:
    - 'resources/js/**'
---

## Frontend conventions

- **OS-vs-app split.** The sidebar (from 1024px) is static OS chrome (Home, Settings, Admin). The
  dashboard is the mini-app launcher. **Mini apps are never added to the sidebar.** Below 1024px
  there is no sidebar: a contextual top bar (wordmark on Home; back + page title elsewhere, fed by
  `Page`) and a bottom bar (`BottomBar`) listing Home plus each room that is on, from the registry's
  `nav_label` and its own `nav-icon.tsx`. Settings and Admin live in the account menu there.
- **`AppLayout` is the persistent default layout** (`app.tsx`); pages don't wrap themselves in it.
  Use `Page` for the header: it sets the document title (`room`, `documentTitle`), the back target
  (`back`) and the phone top bar's title. On a route change focus moves to the page's `h1`
  (`lib/route-focus.ts`), except for same-path visits such as filter, sort and search.
- **Back goes back.** `BackChevron` steps through history when the parent is the page you came
  from, and replaces the entry otherwise. A page owns one history entry:
  `lib/navigation.ts` turns a GET to the path already shown (filter, sort, search, tab, page
  number) into a replace, so back leaves the page instead of undoing the filter. Link to another
  page with Inertia's `Link`: a plain `<a>` reloads the document and the chevron forgets where
  you came from. Back and forward restore a page from browser history without a request, so a page
  last seen before a write asks for its props again when restored (`lib/stale-history.ts`, a
  replacing visit: `router.reload()` always keeps component state).
  Every sheet and dialog that composes or shows an item
  goes through `useOverlayHistory` (`resources/js/hooks/use-overlay-history.ts`), so the back
  gesture closes it instead of leaving the page. One with a draft uses `useDraftCloseGate` +
  `DiscardDraftDialog`, which own the "Discard?" prompt for every way of closing. `app.tsx` calls
  `installOverlayHistory()` before `createInertiaApp`: `popstate` listeners run in the order they
  were added, and Inertia's would otherwise reload the page and drop the draft first. A History moment is addressable at
  `/apps/our-history?moment={id}`.
- **Portal `data-app` propagation.** Radix Dialog / Sheet / AlertDialog / Popover / Select
  portals render at `<body>`, outside the mini app's `[data-app]` scope. Spread
  `{...useAppAttrs()}` (`resources/js/hooks/use-app-attrs.tsx`) onto every portaled root.
- **Routing: Wayfinder only.** Import typed helpers from `resources/js/routes/**`
  (`import { route as adminRoute } from '@/routes/admin'`). Ziggy is gone; a bare `route()` global
  call is a hard error.
- **Corner and Mailbox list rows:** a mutation that doesn't move the list's reset key must pass
  `preserveState: false`, or the list shows a stale row. Mailbox create sheets use
  `preserveState: 'errors'`.
- **Prefetch only side-effect-free pages.** `<Link prefetch="mount">` is on the Home doors, the
  Corner landing cards (the first four) and the History tabs; `lib/stale-history.ts` drops the prefetch cache after any non-GET
  visit. Never prefetch a page whose GET changes something: Mailbox Messages and Flowers mark
  themselves read when fetched.

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
