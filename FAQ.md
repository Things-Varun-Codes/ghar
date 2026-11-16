# Frequently asked questions

Short answers about Ghar, the self-hosted household app. Each one names the file that has the
detail.

## What is Ghar?

Ghar is a private web app that one family or household runs for itself. Everyone signs in to the
same place and finds three small apps: Our History (a timeline, gallery and calendar of moments,
with photos and videos), Our Corner (shared lists of songs, movies, places and things to do) and Our
Mailbox (notes, bouquets of flowers, coupons and joke traffic tickets, sent to one or more people).
Ghar is open source under the MIT licence. There is no hosted version: you run it yourself with
Docker.

## What do "Ghar" and "citation" mean?

"Ghar" is the Hindi and Urdu word for home. Because it is an everyday word, this project is easiest
to find as "Ghar, the self-hosted household app", or by its image name,
`ghcr.io/things-varun-codes/ghar`.

A citation is what a traffic ticket is called in India. In Ghar it is a joke one: a mock official
form that one person issues to another for an offence such as leaving wet towels on the bed, with a
penalty the recipient can mark as paid.

## Will Ghar run on a Raspberry Pi?

Yes, on a Raspberry Pi 4 or 5 with Docker and a 64-bit operating system. Ghar's release images are
published for arm64 as well as amd64, and Ghar uses about 200 MB of RAM when idle. Use the published
image rather than building from source, because the build needs about 2 GB of RAM. See
[`DEPLOY.md`](./DEPLOY.md).

## Do I need a domain name to run Ghar?

Not to try it: the quick start serves Ghar at `http://localhost:8080`. For everyday use you need
HTTPS, because browsers only allow installing the app, Web Push and secure cookies over HTTPS. The
documented way is a DNS record pointing at your machine, with Caddy getting the certificate. For a
home server that only your family reaches, `DEPLOY.md` also suggests Tailscale with `tailscale
serve`, which needs no open ports.

## Can two households share one Ghar install?

No. One install is one household. Everyone with an account is a member of it, and the moments in Our
History and the lists in Our Corner are shared by all of them. Relatives in another house can be
invited like anyone else if you want them to see all of that. Two households that should stay
separate need two installs, each in its own folder with its own `.env`, port and address.

## Where do my photos and videos live?

On your own disk by default: in Ghar's `media` Docker volume, or in a folder you choose, such as a
NAS mount, if you set `GHAR_MEDIA_PATH`. Setting `MEDIA_DISK=s3` keeps them in any S3-compatible
bucket instead, such as Cloudflare R2, Backblaze B2, MinIO, Garage or AWS S3. Either way the files
are private, and every view goes through a signed link that expires within two hours. They are not
end-to-end encrypted, so whoever can reach the server or the bucket can open them. Choose before
anyone uploads, because switching later means moving every file yourself. A photo can be up to 20 MB
and a video up to 96 MB.

## Does Ghar phone home?

No. Ghar's code has no analytics or telemetry, and the fonts are served by your own install rather
than by Google. A running install does contact a few outside services to do its job: your mail
provider, for invites and password resets; browser push services, to deliver Web Push; YouTube,
Spotify or Plex when someone adds one of their links in Our Corner, to look up its title and
artwork, which your browser then loads from them; and a breached-password list when someone sets a
password, to which only the first five characters of the password's hash are sent. Google Places,
Cloudflare Workers AI, an S3 bucket and a Sentry-compatible error tracker are contacted only if you
set them up.

## Can I run Ghar without email?

You can start without it. The first admin account is created when the container starts, and its
password is printed once in the log. With `MAIL_MAILER=log`, the default in `.env.selfhost.example`,
invites are written to the app log, so you can copy an invite link and pass it on yourself. People
still sign in with an email address, and password resets are sent by mail, so set up SMTP or Resend
before real use.

## How do I back up Ghar?

Back up three things: the PostgreSQL database with `pg_dump`, the media (the `media` volume, or your
bucket with `MEDIA_DISK=s3`), and the generated keys in `storage/app/generated-secrets.env` along
with your `.env`. [`DEPLOY.md`](./DEPLOY.md), under "Backups and restore", has the exact commands
and the restore steps. There is no export button inside the app yet. Back up before every upgrade,
because database migrations only run forward, and try a restore once before you need it.

## How do I add or remove a person in Ghar?

An admin sends an invitation from Admin, Invites. There is no sign-up page. The link in the email
works once and expires after 7 days; resending the invite replaces the old link. To remove someone,
an admin deletes the account from the admin's Users page. Ghar refuses to delete a person who still
owns Our Corner items or Our Mailbox mail, and says what is in the way.

## Does Ghar work offline?

No. Ghar installs to a phone's home screen, but its service worker only handles notifications. It
does not cache pages or photos, so every screen needs a connection to your server.

## Is there a mobile app for Ghar?

Not in an app store. Ghar is a web app that installs to the home screen on Android and iOS from the
browser. Installed, it opens in its own window and can send Web Push notifications. This needs the
site to be on HTTPS, and on iOS notifications work only after the app has been added to the Home
Screen. NFC tags tapped on an iPhone open in Safari rather than in the installed app.

## Does Ghar have two-factor login?

Not yet. People sign in to Ghar with an email address and a password, logins are rate-limited, and a
session lasts 30 days by default. [`SECURITY.md`](./SECURITY.md) lists what Ghar protects against
and what it doesn't.

## Can search engines or AI crawlers see my Ghar install?

A Ghar install asks not to be indexed: its `robots.txt` turns away every crawler, every page carries
a `noindex` tag and every response an `X-Robots-Tag: noindex, nofollow` header. Every page that
shows your household's content needs an account; only the sign-in, password-reset and invite pages,
the app manifest and the health checks are public, so there is nothing of yours for a crawler to
read. The app's name is visible on the sign-in page, so choose one you don't mind
strangers seeing.
