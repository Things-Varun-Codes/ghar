# Contributing to Ghar

Thanks for helping. This covers getting set up, the checks your change has to pass, and how the
code is organised.

## Getting set up

You need PHP 8.4 or newer (with `pdo_pgsql`, `gd`, `intl`, `zip`, `exif`, `bcmath`, `mbstring`),
Composer, Node 22 or newer, and Docker.

```sh
npm run dev-setup   # safe to re-run; rebuilds the local database each time
composer dev        # server, queue, log tail and Vite on http://127.0.0.1:8000
```

If `.env` already exists, `dev-setup` shows what differs from the local values and asks first
(`npm run dev-setup -- --yes` skips the question). If a port is taken, set `GHAR_DB_PORT`,
`GHAR_MAILPIT_SMTP_PORT` or `GHAR_MAILPIT_UI_PORT`.

## Local test users

`npm run dev-setup` seeds one household with data in every state, and `npm run dev-reset` puts it
back. Test against these accounts instead of making your own, so that a bug report means the same
thing on everyone's machine. They all use the password `ghar-local-dev`.

| Account              | Who                     | Use it to check                                                                                                                       |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `admin@example.test` | Asha, the only admin    | Admin pages; editing anyone's moment or Corner item; last-admin guards. Has no special access to other people's mail.                 |
| `ravi@example.test`  | Ravi, adult             | **Non-admin creator**: can edit "Monsoon drive to the coast" (his), can't edit "Meera's first pottery class". Sender of the fixtures. |
| `meera@example.test` | Meera, adult            | **Recipient**: note 1, bouquet 1, coupon 1 and challan 1 are Ravi's to her alone. Can request the coupon and pay the challan.         |
| `kabir@example.test` | Kabir, younger, no push | **Non-recipient**: `/apps/our-mailbox/challans/1` and `coupons/1` must 403; note 1 and bouquet 1 must not be listed.                  |

If your scenario isn't covered, extend `database/seeders/DevDataSeeder.php`.

## Tests

| Command                  | What it proves                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `npm test`               | Hooks and utilities (Vitest). Inertia is mocked, so it shows the right call was made.          |
| `npm run test:rules`     | The custom ESLint rules.                                                                       |
| `php artisan test`       | HTTP, payload shape, database state, policies (PHPUnit on Postgres, database `ghar_test`).     |
| `npm run smoke`          | Every page mounts without a console error, in both themes (headless Chromium).                 |
| `npm run smoke-loadmore` | The load-more retry recovers from network and server failures. Run it if you touch pagination. |
| `npm run smoke-mcp`      | Serves the seeded data on `127.0.0.1:8000` for testing in a real browser.                      |

Test in a real browser as well when you touch uploads, drag and drop, dialogs and sheets, or a
multi-step form. Add every new page to `scripts/smoke.mjs`; a check fails if a route is missing.

## The hooks and CI

`npm run dev-setup` installs [lefthook](https://lefthook.dev). `pre-commit` lints the staged files;
`pre-push` runs the full set in order and stops at the first failure: clean working tree, env docs,
dependency audits, types, lint, formatting, static analysis, every test tier above. Don't skip it
with `--no-verify`.

GitHub Actions runs types, lint, formatting, static analysis, the tests and the headless smoke on
every pull request. It also builds the production image and starts it with
`docker-compose.selfhost.yml`, so a change to the Dockerfile or the entrypoint is tested before a
release.

## Pull requests

- Keep each one to one change and explain why, not just what.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org): `fix(corner): …`.
- Add a test that fails without your change.
- New environment variables go in `.env.example` and the env block in `DEPLOY.md`, and in
  `docker-compose.yml` if the running app reads them.
- Comments explain why the code is the way it is. No ticket or planning references.
- No real names, emails or addresses in fixtures, docs or commits.

## Adding a mini app

A mini app is a self-contained module: no imports from another app, and no database foreign keys to
another app's tables. For each `enabled` entry in `config/miniapps.php`, the shell registers its
service provider and loads `routes/miniapps/{slug}.php` and `database/migrations/{slug}/`. The rest
is by hand:

1. Add the entry to `config/miniapps.php`:

    ```php
    [
        'name' => 'Our Recipes',
        'slug' => 'our-recipes',
        'route' => '/apps/our-recipes',
        'description' => 'Recipes, including the ones nobody wrote down.',
        'enabled' => true,
        'provider' => RecipesServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/Recipes/',
    ],
    ```

2. Write the provider. Console commands and scheduled tasks are registered from its `boot()`.
3. Add `resources/css/themes/{slug}.css` and its `@import` in `resources/css/app.css`.
4. If the app uses a font, register it in `vite.config.ts` under `fonts:`.
5. Put the frontend in `resources/js/MiniApps/{App}/`.
6. Add every new page to `scripts/smoke.mjs`, and sample data to `DevDataSeeder`.
7. Optionally, show a live line and a glimpse on the home screen through `DashboardSummaries`,
   returning only rows the viewer may see.
8. If a table's foreign key to `users` restricts deletes, register it with `UserOwnedContent` from
   the provider's `boot()`, so the admin screen can say what blocks deleting that user.

## Theme layers

- **Layer 1, `--shell-*`:** the colours of the whole app, set per theme in `resources/css/app.css`.
  Mini apps use these and never define them.
- **Layer 2, `--<app>-*`:** an app's identity: fonts, radii, easing, textures. Colours here only
  alias or mix `--shell-*`.
- **Layer 3, `.<app>-*`:** classes scoped under `[data-app='<slug>']`.

An app never references another app's tokens. `resources/css/themes/history.css` is a full example.

## Reporting bugs

Open an issue with what you did, what you expected and what happened; the seeded accounts make steps
easy to repeat. Security problems go through [`SECURITY.md`](./SECURITY.md) instead.
