# Contributing to Ghar

Thanks for helping. This covers getting set up, the checks your change has to pass, and how the
code is organised. Everyone taking part is expected to follow the
[code of conduct](./CODE_OF_CONDUCT.md).

For anything bigger than a bug fix, open an issue or a discussion before writing the code, so
nobody builds something that can't be merged.

## Getting set up

You need PHP 8.4 or newer (with `pdo_pgsql`, `gd`, `intl`, `zip`, `exif`, `bcmath`, `mbstring`),
Composer, Node 22.12 or newer, and Docker.

```sh
npm run dev-setup   # safe to re-run; rebuilds the local database each time
composer dev        # server, queue, log tail and Vite on http://127.0.0.1:8000
```

If `.env` already exists, `dev-setup` shows what differs from the local values and asks first
(`npm run dev-setup -- --yes` skips the question). If a port is taken, set `GHAR_DB_PORT`,
`GHAR_MAILPIT_SMTP_PORT` or `GHAR_MAILPIT_UI_PORT`.

After a pull or a branch switch, `npm run dev-sync` brings the checkout up to date: it starts the
services, installs dependencies if a lockfile changed, and runs new migrations. `npm run dev-up`
does the same and then starts `composer dev`. In a git worktree, run
`bash scripts/worktree-setup.sh` once instead of `dev-setup`.

## Local test users

`npm run dev-setup` seeds one household with data in every state, and `npm run dev-reset` puts it
back. Test against these accounts instead of making your own, so that a bug report means the same
thing on everyone's machine. They all use the password `ghar-local-dev`.

The accounts and what each one is for are in the table under
[How to test locally](./CLAUDE.md#how-to-test-locally) in `CLAUDE.md`.

If your scenario isn't covered, extend `database/seeders/DevDataSeeder.php`.

## Tests

| Command                  | What it proves                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `npm test`               | Hooks and utilities (Vitest). Inertia is mocked, so it shows the right call was made.          |
| `npm run test:rules`     | The custom ESLint rules.                                                                       |
| `npm run test:scripts`   | The release script: change files, versions and the changelog section.                          |
| `php artisan test`       | HTTP, payload shape, database state, policies (PHPUnit on Postgres, database `ghar_test`).     |
| `npm run smoke`          | Every page mounts without a console error (headless Chromium).                                 |
| `npm run smoke-loadmore` | The load-more retry recovers from network and server failures. Run it if you touch pagination. |
| `npm run smoke-mcp`      | Serves the seeded data on `127.0.0.1:8000` for testing in a real browser.                      |

Test in a real browser as well when you touch uploads, drag and drop, dialogs and sheets, or a
multi-step form. Add every new page to `scripts/smoke.mjs`; a check fails if a route is missing.

## The hooks and CI

`npm run dev-setup` installs [lefthook](https://lefthook.dev). `pre-commit` lints the staged files;
`pre-push` is a quick gate, usually well under a minute: a clean working tree, then in parallel the
repository checks in `scripts/`, formatting of the files being pushed, and static analysis, lint and
types across the repo. Don't skip it with `--no-verify`. To run everything CI runs before you open a pull request,
use `npm run verify` (several minutes; it stops at the first failure).

GitHub Actions runs the full set on every pull request: the repository checks, dependency audits,
formatting, types, lint, static analysis, every automated test tier above and both headless smoke
runs. It also builds the production image and starts it with
`docker-compose.selfhost.yml`, so a change to the Dockerfile or the entrypoint is tested before a
release. A pull request that adds a dependency with a known vulnerability, or under a GPL or AGPL
licence, fails the dependency review. The "Change file" check fails a pull request whose title isn't
a Conventional Commits title, or a `feat:` or `fix:` that has no change file.

`main` only takes pull requests, squash-merged once those checks pass. Workflows from a first-time
contributor wait for a maintainer to start them.

## Pull requests

- Keep each one to one change and explain why, not just what.
- The title follows [Conventional Commits](https://www.conventionalcommits.org): `fix(corner): …`.
  It becomes the commit on `main`.
- If someone using or running Ghar would notice the change, add a change file to `.changes/`. It
  becomes the changelog entry; [`.changes/README.md`](./.changes/README.md) has the format and the
  wording. Don't edit `CHANGELOG.md`. [`RELEASE.md`](./RELEASE.md) explains how the files become a
  release.
- Add a test that fails without your change.
- Third-party GitHub Actions are pinned to a full commit SHA, with the version in a comment.
- New environment variables go in `.env.example` and the env block in `DEPLOY.md`, and in
  `docker-compose.yml` if the running app reads them.
- Comments explain why the code is the way it is. No ticket or planning references.
- No real names, emails or addresses in fixtures, docs or commits.

## Adding a mini app

A mini app is a self-contained module: no imports from another app, and no database foreign keys to
another app's tables. The steps to add one are under "A new room" in
[`CLAUDE.md`](./CLAUDE.md), and its look follows [`DESIGN.md`](./DESIGN.md).

## Reporting bugs

Open an issue with what you did, what you expected and what happened; the seeded accounts make steps
easy to repeat. Security problems go through [`SECURITY.md`](./SECURITY.md) instead.
