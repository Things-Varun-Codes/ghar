# Security

## Reporting a vulnerability

Please report it privately through GitHub, with
[this form](https://github.com/Things-Varun-Codes/ghar/security/advisories/new) (it's also under
the repository's **Security** tab, **Report a vulnerability**). Don't open a public issue.

Include what you found, how to reproduce it and what an attacker could do with it. This is a spare-time
project, so a reply can take a few days. Once there's a fix, you'll be credited if you'd like to be.

Fixes go into the latest release; older versions don't get them. A fix that matters to people
running Ghar is published as a security advisory on this repository, with the version to upgrade to.

## Checking an image

Release images are built by this repository's release workflow and nowhere else. Each one carries a
signed record of that, and a list of the packages inside it (an SBOM). To check an image before you
run it:

```sh
gh attestation verify oci://ghcr.io/things-varun-codes/ghar:1 --repo Things-Varun-Codes/ghar
```

The latest image is also scanned every week for vulnerabilities in its system packages, and
dependencies are watched by Dependabot.

## What Ghar is designed for

One household runs one private instance. Everyone with an account is someone an admin invited, so
members are trusted, but not with everything: they can't read mail not addressed to them, or change
what other people made.

### What it protects

- **Strangers.** Everything except the login, password-reset, invite-acceptance and health pages
  and the app manifest (which carries only the app's name) needs an account. There is no registration. Invite tokens are single-use, expire after 7 days and
  are stored only as hashes. Login and invite acceptance are rate-limited, and reset emails are throttled per address.
- **Members from each other.** Notes, flowers, coupons and challans are visible only to the sender
  and recipients; admins can't read them either. Editing or deleting a moment or list item takes its creator or
  an admin. All of it is enforced on the server.
- **Media.** Photos and videos are stored privately, on your own disk by default or in an
  S3-compatible bucket, and are served only through signed links that expire within two hours.
  Uploads are checked against their actual bytes.
- **Passwords.** A password must be at least 12 characters with upper and lower case, a number and a
  symbol, and is refused if it appears in a public list of breached passwords. Sessions last 30 days.
- **Search engines and AI crawlers.** An install asks not to be indexed: `robots.txt` disallows
  every crawler, every page carries a `noindex` tag and every response an `X-Robots-Tag` header.
  The sign-in page has no description or preview image for a link preview to show.
- **Stored content.** Rich text is sanitised on the server when saved. A strict Content Security Policy
  limits what a successful injection could do.
- **The container.** It runs as a non-root user. Sourcemaps are never served.

### What it doesn't

- **A malicious admin, or anyone with access to the server or database.** Mail and media aren't
  end-to-end encrypted.
- **A stolen password.** There is no two-factor login yet, so a member's password is all an attacker
  needs.
- **The app's name and address.** The sign-in page and the manifest show `APP_NAME` to anyone who
  has the address, and the robots rules above are requests that a crawler can ignore. Don't put
  anything in the name that you wouldn't want a stranger to read.
- **A misconfigured proxy.** `TRUSTED_PROXIES` decides whose forwarded headers are believed. Trust
  too much, or publish the app's port past your proxy, and client IPs can be spoofed, which weakens
  the login rate limit. See "Reverse proxy and client IPs" in [`DEPLOY.md`](./DEPLOY.md).
- **A leaked media link.** Photo links are signed and expire within two hours; until then anyone holding
  one can open that file.
- **The sample data.** `DevDataSeeder` has a published password. It refuses to run in production;
  don't change `APP_ENV` to get around that.
- **Short links.** `/go/{code}` needs a login, but the destination is an ordinary URL. Don't point one
  at something secret.

Keeping the host, Docker and your backups safe is up to you.
