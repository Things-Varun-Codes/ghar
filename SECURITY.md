# Security

## Reporting a vulnerability

Please report it privately through GitHub: open the repository's **Security** tab and choose
**Report a vulnerability**. Don't open a public issue.

Include what you found, how to reproduce it and what an attacker could do with it. This is a spare-time
project, so a reply can take a few days. Once there's a fix, you'll be credited if you'd like to be.

Fixes go into the latest release; older versions don't get them.

## What Ghar is designed for

One household runs one private instance. Everyone with an account is someone an admin invited, so
members are trusted, but not with everything: they can't read mail not addressed to them, or change
what other people made.

### What it protects

- **Strangers.** Everything except the login, password-reset, invite-acceptance and health pages
  needs an account. There is no registration. Invite tokens are single-use, expire after 7 days and
  are stored only as hashes. Login and invite acceptance are rate-limited, and reset emails are throttled per address.
- **Members from each other.** Notes, flowers, coupons and challans are visible only to the sender
  and recipients; admins can't read them either. Editing or deleting a moment or list item takes its creator or
  an admin. All of it is enforced on the server.
- **Media.** Photos and videos sit in a private bucket and are served through short-lived signed URLs.
  Uploads are checked against their actual bytes.
- **Stored content.** Rich text is sanitised on the server when saved. A strict Content Security Policy
  limits what a successful injection could do.
- **The container.** It runs as a non-root user. Sourcemaps are never served.

### What it doesn't

- **A malicious admin, or anyone with access to the server or database.** Mail and media aren't
  end-to-end encrypted.
- **A misconfigured proxy.** `TRUSTED_PROXIES` decides whose forwarded headers are believed. Trust
  too much, or publish the app's port past your proxy, and client IPs can be spoofed, which weakens
  the login rate limit. See "Reverse proxy and client IPs" in [`DEPLOY.md`](./DEPLOY.md).
- **A leaked media link.** Photo links are signed and expire after an hour; until then anyone holding
  one can open that file.
- **The sample data.** `DevDataSeeder` has a published password. It refuses to run in production;
  don't change `APP_ENV` to get around that.
- **Short links.** `/go/{code}` needs a login, but the destination is an ordinary URL. Don't point one
  at something secret.

Keeping the host, Docker and your backups safe is up to you.
