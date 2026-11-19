---
paths:
    - 'app/MiniApps/**'
    - 'app/Shell/Services/**'
    - 'app/Shell/Support/**'
    - 'routes/miniapps/**'
    - 'tests/Feature/Corner/**'
    - 'tests/Feature/History/**'
    - 'tests/Feature/Mailbox/**'
    - 'tests/Feature/Notifications/**'
    - 'tests/Unit/Mailbox/**'
    - 'tests/Unit/Shell/**'
---

## Household model and push routing

Every invited user is a household member (`App\Shell\Services\Household`: `members()`,
`othersThan($user)`, `optionsFor($user)`). One household per install; multi-tenant is out of scope.

| Surface                                | Who sees it        | Who may change it                                           |
| -------------------------------------- | ------------------ | ----------------------------------------------------------- |
| History moments (`EventPolicy`)        | Everyone           | Edit, delete, media: creator or admin                       |
| Corner lists (`CornerListPolicy`)      | Everyone           | Make: anyone. Edit: maker or admin. Delete: see `corner.md` |
| Corner items (`ListItemPolicy`)        | Everyone           | Edit, delete: adder or admin. Mark done: anyone             |
| Profile picture, birthday              | Everyone           | Picture: own; an admin may remove. Birthday: own or admin   |
| Notes, flowers (`RecipientMailPolicy`) | Sender, recipients | Delete: sender                                              |
| Coupons, citations (own policies)      | Issuer, recipient  | Request, cancel, pay: recipient. Fulfil, delete: issuer     |

- **"Maker or admin"** is one rule, `User::makerOrAdmin($makerId)`; policies call it rather than
  spelling it out.
- **Admin pages** are guarded once, by `can:admin` on the `/admin` route group; their controllers
  don't repeat it. A new admin route goes inside that group (`NonAdminCannotAccessAdminTest` walks
  every `admin.*` route).
- **Who may enter a room** is `Rooms::canEnter($user, $slug)`: on, and an `admin_only` room only
  for admins. The `room:` middleware, the registry props (`Rooms::enterableBy`) and
  `PushDispatcher` all ask it.
- **Enforcement is server-side;** the `can` flags on History and Corner payloads only decide which
  buttons render.
- **Mailbox visibility:** viewer-reachable queries start with `visibleTo($user)`, `receivedBy($user)`
  or (coupons and citations) `issuedBy($user)`. Notes and flowers keep recipients and per-recipient
  `read_at` in `mailbox_message_recipients` / `mailbox_bouquet_recipients` (`HasRecipients`);
  coupons and citations keep `issuer_id` and `recipient_id` on the row (`IssuedToOne`, whose
  `isParty()` is their policies' `view`). Mailbox checks abilities with `Gate::authorize` in the
  controller, as Corner and History do, not with a route `->can()`.
- **People in payloads** go through `Person::of($user)` (`{id, name, avatar_url}`);
  `optionsFor($user)` returns them.
- **Recipients** arrive as `recipient_ids`: one or more other members, never yourself
  (`ValidatesRecipients`). A coupon or citation has one recipient, so several ids issue one row each.
- **Push:** `PushDispatcher::toHousehold($actor, …)` for new moments and Corner items;
  `toUsers($recipients, …)` for Mailbox, through `MailboxPush`, which builds the `our-exchange:{type}`
  tag and the link. Never hand-roll a recipient query.
- **Push timing — two accepted shapes, don't "harmonize" them.** Corner (`AddItem`) dispatches
  inside `DB::afterCommit(...)` within the transaction. Mailbox (`CreateMessage`, `IssueCitation`
  etc.) dispatches on the line after `DB::transaction(...)` returns. Both guarantee no push for a
  rolled-back write.
