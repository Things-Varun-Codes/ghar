---
type: added
---

Two-step sign-in: under Settings → Two-step sign-in, anyone can make signing in ask for a code from an authenticator app as well as their password.

- Recovery codes sign you in if you lose your phone; each works once, and you can make new ones.
- Admin → Users shows who has it on.
- If someone loses both, `php artisan ghar:two-factor-off <email>` turns it off for them.
