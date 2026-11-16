# Changelog

Every release gets a section here before its tag is pushed; the release workflow publishes that
section as the GitHub release notes. Versions follow [semantic versioning](https://semver.org):
a major version can need you to do something when you upgrade, and says what under **Upgrading**.
Minor and patch versions don't.

Before any upgrade, back up the database and the media volume (DEPLOY.md, "Backups and restore").
Migrations only run forward.

## [1.2.0] - Unreleased

- The admin chooses the rooms. Admin → Rooms turns Our History, Our Corner and Our Mailbox on or
  off, and turns the Mailbox's notes, flowers, citations and coupons on or off one by one. A room
  that is off disappears from Home, the phone bar and the install shortcuts, its addresses stop
  working and it sends no notifications. What was written in it is kept and comes back when it is
  turned on again.
- A new install starts with every room off. Home tells the admin where to turn them on and tells
  everyone else that nothing is there yet.
- Challans are now called citations everywhere: the screens, the addresses, the database table and
  the notification tag. Old `/apps/our-mailbox/challans` addresses redirect, and reference numbers
  already issued (`OC/2026/000007`) are unchanged.
- Our Corner's lists are the household's own. Anyone can make a list, with a name, an icon from the
  whole lucide set, a word for done (loved, watched, read, cooked or anything) and a heart or a
  tick. Lists can be renamed and reordered; deleting one with other people's things in it takes an
  admin.
- Every item in every list looks the same and can have a name, notes, a link, a picture and a
  place. Pasting a link to almost any page fills in its name and picture from what the page itself
  publishes; Corner no longer knows any site by name. A picture can also be pasted or removed.
  Pictures are fetched and served by your install, so browsers never contact other sites, and
  every fetch refuses addresses inside your own network.
- A place is a pasted map link, coordinates or a typed name, and "Open in Maps" opens it in the
  device's maps app. Our Corner no longer uses Google Places.
- Our Corner with no lists yet (a new install, once the room is on) suggests lists to add in one
  tap.
- The History link picker searches every list and shows which list each result is in.

Nothing to do on upgrade. An install that already has people keeps every room on; the migration
records that. The rooms a source build used to disable in `config/miniapps.php` are now chosen in
Admin → Rooms instead, so check that page once. The table rename is in the migrations, which run
on start; back up first, as always.

The upgrade also moves your songs, movies, activities and places into four lists of the same names,
with everything kept: who added each one, who marked it done and when, pictures, links, addresses
and coordinates. Old links, notifications and the links inside History moments keep working. No
setting was removed. The page's image policy no longer lets the browser load pictures from video,
music or media sites directly, so a History link saved before this shows its list's icon instead
of the old thumbnail.

## [1.1.0] - 2026-11-14

- The self-host stack keeps its cache (rate limits and the health heartbeats) in a small Valkey
  container instead of Postgres. Sessions and background jobs stay in Postgres.
- The image includes PHP's `redis` extension. A source build can use Valkey or Redis by setting
  `CACHE_STORE=redis` and `REDIS_HOST`; it stays on Postgres otherwise.

An existing install keeps working as it is. To move a self-host install to the Valkey cache,
download the new `docker-compose.selfhost.yml` before `pull` and `up -d`.

## [1.0.0] - 2026-11-13

The first public release.

- Our History: a timeline, gallery and calendar of moments, with photos and videos.
- Our Corner: shared lists of songs, movies, places and things to do.
- Our Mailbox: notes and flowers to one or more people, challans and coupons.
- Invite-only accounts with an admin role, Web Push, a home-screen app (PWA) and short links for
  NFC tags.
- Photos stay on your own disk by default, behind signed links that expire. Any S3-compatible
  bucket works instead.
- Images for amd64 and arm64 at `ghcr.io/things-varun-codes/ghar`.
