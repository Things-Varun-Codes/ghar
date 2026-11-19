---
paths:
    - 'app/MiniApps/History/**'
    - 'resources/js/MiniApps/History/**'
    - 'resources/css/themes/history.css'
    - 'routes/miniapps/our-history.php'
    - 'database/migrations/our-history/**'
    - 'tests/Feature/History/**'
---

## Our History

Rules that aren't obvious from the code:

- **History EventForm is the stacked 5-row layout** in
  `resources/js/MiniApps/History/Components/EventForm.tsx` (the old 240px sidebar form is gone).
- **Our History** — tender journal feel: the display face for dates, titles and year banners, the
  sans for the story. Timeline cards are quiet reading surfaces (no Edit/Delete on the card;
  the whole card opens the EventSheet, where management lives).
- **History accessibility contract:** text on accent fills uses `--history-on-accent` (ink, never
  white); body links and accent text ≤14px use `--history-accent-ink-strong` — plain
  `--history-accent-ink` is for ≥18px display text only. Every interactive pill, chip and icon button
  gets a 44×44px hit area; focus uses `--history-focus-ring`; clickable tiles are real
  `<button>`s; hover-only reveals sit inside `@media (hover: hover)`; the reduced-motion block in
  `history.css` stays.
- **"On this day" is one matcher, `Support/OnThisDay`,** for the Dashboard line, the Timeline and
  Calendar strips and the morning digest: the household's day (`Region::today()`), earlier years
  only, and a Feb 29 comes round on Feb 28 of a non-leap year. A moment's birthday link
  (`birthday_user_id`) is accepted only on that member's birthday by the same rule, and moving the
  moment off the day drops the link.
- **The morning digest** (`history:morning-memories`, hourly 09:00–12:00 household time) claims
  the day in `our_history_digest_claims` before it sends, so a second hour or server sends
  nothing. A day with nothing to say, or with the room off, claims nothing, so a later hour can
  still send.
- **PhotoSwipe inside the EventSheet:** the Drawer's `onOpenChange` cancels an `outside-press`
  whose target is inside `.pswp` (`EventSheet.tsx`), or the next-arrow click and mobile swipes
  close the sheet. The lightbox takes Escape in the capture phase while it's open
  (`PhotoSwipeGallery.tsx`), so Escape closes it and not the sheet too. Its scrolling body is `data-base-ui-swipe-ignore`, so the editor and the photo
  grid keep their drags and only the frame swipes the sheet closed.
- **Links in a story never name another room.** The editor offers the picker while
  `useLinking().searchable`; `BodyHtml` draws a pill as a link (and its picture) only while
  `useLinkTypeOn(type)`. Moments register as `history.event` (label "Moments") in
  `HistoryServiceProvider`; a save keeps every pill whose type is registered (`ExtractsCornerLinks`)
  and records it as an `entity_references` row.
- **Reactions and comments aren't edits.** Adding or removing either leaves the moment's
  `updated_at` and its `EventChange` log alone, so the sheet's activity strip and the Timeline
  order don't move. Both answer `back()` for the sheet's `only: ['moment']` reload, and each has its
  own limiter (`history-reactions`, `history-comments`) so a burst can't eat the upload budget.
- **A comment push never carries the comment's text** (it shows on a lock screen): "{first name}
  commented on a moment: {title}", tagged `our-history:comment:{eventId}` so a thread collapses
  into one notification.
