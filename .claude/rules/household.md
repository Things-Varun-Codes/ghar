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
| Notes, flowers (`RecipientMailPolicy`) | Sender, recipients | Delete: sender                                              |
| Coupons, citations (own policies)      | Issuer, recipient  | Request, cancel, pay: recipient. Fulfil, delete: issuer     |

- **Enforcement is server-side;** the `can` flags on History and Corner payloads only decide which
  buttons render.
- **Mailbox visibility:** viewer-reachable queries start with `visibleTo($user)` or (notes and
  flowers) `receivedBy($user)`. Notes and flowers keep recipients and per-recipient `read_at` in
  `mailbox_message_recipients` / `mailbox_bouquet_recipients` (`HasRecipients`).
- **Recipients** arrive as `recipient_ids`: one or more other members, never yourself
  (`ValidatesRecipients`). A coupon or citation has one recipient, so several ids issue one row each.
- **Push:** `PushDispatcher::toHousehold($actor, …)` for new moments and Corner items;
  `toUsers($recipients, …)` for Mailbox. Never hand-roll a recipient query.
- **Push timing — two accepted shapes, don't "harmonize" them.** Corner (`AddItem`) dispatches
  inside `DB::afterCommit(...)` within the transaction. Mailbox (`CreateMessage`, `IssueCitation`
  etc.) dispatches on the line after `DB::transaction(...)` returns. Both guarantee no push for a
  rolled-back write.
