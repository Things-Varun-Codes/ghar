---
paths:
    - 'app/MiniApps/Mailbox/**'
    - 'resources/js/MiniApps/Mailbox/**'
    - 'resources/css/themes/mailbox.css'
    - 'routes/miniapps/our-exchange.php'
    - 'database/migrations/our-exchange/**'
    - 'tests/Feature/Mailbox/**'
    - 'tests/Unit/Mailbox/**'
---

## Our Exchange

Slug `our-exchange`; `App\MiniApps\Mailbox\`; `resources/js/MiniApps/Mailbox/`; routes
`apps.our-exchange.*` at `/apps/our-exchange/*`. Holds the directional, non-linkable comms surfaces;
Our Shelf keeps the household's shared lists.

- **Entry types switch individually.** `App\MiniApps\Mailbox\Support\EntryTypes` registers notes
  (`messages`), `flowers`, `citations` and `coupons` as options of the room through
  `Rooms::registerOption()` from `MailboxServiceProvider::boot()`; an option with no row is on.
  Routes sit behind `room:our-exchange,{type}`, so an off type 404s and its writes (and so its push)
  cannot happen; `MailboxSummary` / `MailboxPeeks` skip it. Rows are kept. `EntryTypes` holds
  each type's label and the landing order, and sends the landing the types that are on as
  `types` (`key`, `label`); `Pages/Landing.tsx` draws each door from its `DOORS` map (href, live
  line, peek). A new type is one `EntryTypes` entry and one `DOORS` entry.

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
  `our-exchange:citations`; bodies never leak offence/penalty/remarks. Drawn as an "official form"
  (`--mailbox-citation-*` / `.mailbox-citation-*`, colours alias `--shell-*`).
- **Our Exchange** owns paper: ruled sheets with a red margin, the citation as an official form, the
  coupon as a voucher. A note's body and a coupon's title are in Patrick Hand; what was filled in on
  a form (names, offence, penalty, remarks) is Newsreader italic; the printed parts are the sans at
  13px/500. The form reads as a form through its rules, boxes, seal and stamp, and the stamp is the
  only thing set in capitals.
- **Coupons** expire by the household's calendar: `Coupon::isExpired()` compares `expires_at` as a
  date string with `Region::today()`, and `IssueCouponRequest` refuses a date before it. Never
  compare it with `now()`, which is the server's clock.
- **Faces.** `MessageResource`, `BouquetResource` and `DescribesIssuedToOne` send people as
  `Person::of()` (`{id, name, avatar_url}`). A note or bouquet's meta line (`MailMeta`) shows the
  sender's face, or the recipients as an `AvatarGroup` on what you sent, and the recipient chips
  show each person's face. The citation and coupon forms name people in ink, with no faces; the
  landing peeks stay plain strings.
- **Controls.** The recipient picker stays native checkboxes in a `FieldSet` (a toggle group would
  announce people as pressed buttons); flowers are a `ToggleGroup` with the cap of five in
  `onValueChange` and the chosen flowers' meanings printed under the chips (the tooltip is a
  pointer extra). `CitationActions.test.tsx` finds the confirm by its exact text: add no text node
  inside an action button.
- **Motion.** The citation's stamp and a coupon's tick and stamp `Pop` on a state change only,
  from a slot (`.mailbox-citation-stamp-slot`, `.mailbox-coupon-stamp-slot`) that carries the
  scale, so the stamp keeps its tilt. Their pay, request and fulfil visits keep state
  (`preserveState: true`), or the page would remount and the change would never be seen.
