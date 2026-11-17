---
paths:
    - 'app/Shell/Controllers/ShortLinkController.php'
    - 'app/Shell/Controllers/Admin/ShortLinksController.php'
    - 'app/Shell/Models/ShortLink.php'
    - 'database/factories/ShortLinkFactory.php'
    - 'resources/js/Shell/Pages/Admin/ShortLinks.tsx'
    - 'tests/Feature/Shell/ShortLinkTest.php'
---

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
