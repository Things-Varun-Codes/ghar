---
paths:
    - 'app/Actions/Fortify/**'
    - 'app/Providers/FortifyServiceProvider.php'
    - 'app/Http/Middleware/BlockUnwantedFortifyRoutes.php'
    - 'app/Shell/Auth/**'
    - 'app/Shell/Models/User.php'
    - 'app/Shell/Models/Invitation.php'
    - 'app/Shell/Controllers/**'
    - 'app/Shell/Listeners/**'
    - 'app/Shell/Observers/**'
    - 'app/Shell/Providers/**'
    - 'config/fortify.php'
    - 'config/permission.php'
    - 'routes/web.php'
    - 'resources/js/Shell/Pages/Auth/**'
    - 'resources/js/Shell/Pages/Admin/**'
    - 'resources/js/Shell/Pages/Settings/**'
    - 'tests/Feature/Auth/**'
    - 'tests/Feature/Admin/**'
    - 'tests/Feature/Invites/**'
    - 'tests/Feature/Settings/**'
---

## Authentication

Fortify (login, remember-me, logout, password reset) + `spatie/laravel-permission` roles
(`admin` / `user`). **Registration is disabled** — users join only by invite.

- Backend admin check: `Gate::define('admin', fn (User $u) => $u->hasRole('admin'))` in
  `ShellServiceProvider` — the **sole integration point**. Never bypass it.
- Frontend admin predicate: `auth.user.roles?.includes('admin')` (`string[]` prop).
- First admin: `php artisan ghar:create-admin {email} {name} [--password=secret]` — idempotent;
  refuses if any admin exists.
- Invite tokens: 64-char random plaintext in the email, stored as a `sha256` hash in
  `invitations.token_hash`; 7-day expiry; single-use (`accepted_at`); revokable (`revoked_at`);
  resend rotates the token.
- Email change is pending-verification only: a signed URL (1-hour TTL) goes to the new address; the
  DB email changes only when it is clicked.
- Self-delete, last-admin delete and last-admin demotion are blocked in depth (`UserObserver`,
  `BlockLastAdminDemotion`, `DB::transaction` around `syncRoles`).
