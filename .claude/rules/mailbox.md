---
paths:
    - 'app/MiniApps/Mailbox/**'
    - 'resources/js/MiniApps/Mailbox/**'
    - 'resources/css/themes/mailbox.css'
    - 'routes/miniapps/our-mailbox.php'
    - 'database/migrations/our-mailbox/**'
    - 'tests/Feature/Mailbox/**'
    - 'tests/Unit/Mailbox/**'
---

## Our Mailbox

Slug `our-mailbox`; `App\MiniApps\Mailbox\`; `resources/js/MiniApps/Mailbox/`; routes
`apps.our-mailbox.*` at `/apps/our-mailbox/*`. Holds the directional, non-linkable comms surfaces;
Our Corner keeps the household's shared lists.

- **Entry types switch individually.** `App\MiniApps\Mailbox\Support\EntryTypes` registers notes
  (`messages`), `flowers`, `citations` and `coupons` as options of the room through
  `Rooms::registerOption()` from `MailboxServiceProvider::boot()`; an option with no row is on.
  Routes sit behind `room:our-mailbox,{type}`, so an off type 404s and its writes (and so its push)
  cannot happen; the landing gets a `types` prop and `MailboxSummary` / `MailboxPeeks` skip it. Rows
  are kept. The old `/apps/our-mailbox/challans/{id?}` addresses 301 to `citations`, because
  delivered push notifications and bookmarks hold them.

- Messages, Flowers, Citations and Coupons all resolve through `App\Shell\Support\ListPage` (over
  `CursorList`) with free-text `?q` and whitelisted `?sort` (`ListPage::chronological()`:
  `recent`/`oldest`, server-authoritative). No status column, so `counts` arrive degraded
  (`active` = `all`, `done` = 0). Each renders `ListNavBand`
  with the server count ("3 notes") left of Sort. Search columns: Messages `body`; Flowers `note`;
  Citations `offence`/`penalty`/`incident_place`/`remarks`; Coupons `title`/`description`.
- Writes are throttled by Mailbox's own `mailbox-mutations` limiter, and bouquet generation by
  `bouquet-generate` (3 a minute, each call spends Workers AI quota); both are defined in
  `MailboxServiceProvider::boot()`.
- **Citations** — mock traffic tickets. `mailbox_citations`.
  `ref_no` = `OC/{year}/{padded id}` (`OC` frozen). `ref_no`/`status`/`issuer_id` guarded;
  `offence` (≤120) and `penalty` (≤80) fillable. Lifecycle `issued → paid` only: recipient-only
  `pay`, issuer-only hard `delete` of an `issued` row; paid is locked. Push tag
  `our-mailbox:citations`; bodies never leak offence/penalty/remarks. Drawn as an "official form"
  (`--mailbox-citation-*` / `.mailbox-citation-*`, colours alias `--shell-*`).
- **Our Mailbox** owns paper: ruled sheets with a red margin, the citation as an official form, the
  coupon as a voucher. A note's body and a coupon's title are in Patrick Hand; what was filled in on
  a form (names, offence, penalty, remarks) is Newsreader italic; the printed parts are the sans at
  13px/500. The form reads as a form through its rules, boxes, seal and stamp, and the stamp is the
  only thing set in capitals.
