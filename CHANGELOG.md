# Changelog

Each section here is put together from the change files in `.changes/` by `npm run release`, so
don't edit this file by hand. The release workflow publishes a version's section as its GitHub
release notes. Versions follow [semantic versioning](https://semver.org):
a major version can need you to do something when you upgrade, and says what under **Upgrading**.
Minor and patch versions don't.

Before any upgrade, back up the database and the media volume (DEPLOY.md, "Backups and restore").
Migrations only run forward.

## [1.2.0] - 2026-11-17

### Added

- Our Corner's lists are the household's own. Anyone can make a list, with a name, an icon from the
  whole lucide set, a word for done (loved, watched, read, cooked or anything) and a heart or a
  tick. Lists can be renamed and reordered; deleting one with other people's things in it takes an
  admin.
    - The upgrade moves your songs, movies, activities and places into four lists of the same names,
      with everything kept: who added each one, who marked it done and when, pictures, links,
      addresses and coordinates.
    - Old links, notifications and the links inside History moments keep working.
- Our Corner with no lists yet (a new install, once the room is on) suggests lists to add in one
  tap.
- Every History moment has its own address, `/apps/our-history?moment={id}`, so a link can open one
  directly.
- When the server can't be reached, Ghar shows its own offline page instead of the browser's error.
- On a phone, a bar at the bottom holds Home and each room, and a bar at the top shows where you are
  with a way back. Settings and Admin are in the account menu there.
- The admin chooses the rooms. Admin → Rooms turns Our History, Our Corner and Our Mailbox on or
  off, and turns the Mailbox's notes, flowers, citations and coupons on or off one by one. A room
  that is off disappears from Home, the phone bar and the install shortcuts, its addresses stop
  working and it sends no notifications. What was written in it is kept and comes back when it is
  turned on again.
    - Nothing to do on upgrade: an install that already has people keeps every room on.
    - A source build that disabled a room in `config/miniapps.php` chooses it in Admin → Rooms
      instead, so check that page once.
- The sidebar shows which version is running, linked to its release.

### Changed

- Back closes an open sheet or dialog instead of leaving the page, and asks before it throws away a
  draft.
- Challans are now called citations everywhere: the screens, the addresses, the database table and
  the notification tag. Old `/apps/our-mailbox/challans` addresses redirect, and reference numbers
  already issued (`OC/2026/000007`) are unchanged.
    - The table is renamed when the new version starts. Back up first, as always.
- Every item in every Our Corner list looks the same and can have a name, notes, a link, a picture
  and a place. Pasting a link to almost any page fills in its name and picture from what the page
  itself publishes; Corner no longer knows any site by name. A picture can also be pasted or
  removed. Pictures are fetched and served by your install, so browsers never contact other sites,
  and every fetch refuses addresses inside your own network.
- A place in Our Corner is a pasted map link, coordinates or a typed name, and "Open in Maps" opens
  it in the device's maps app. Our Corner no longer uses Google Places.
- Dates read "4 Jun 2024" everywhere.
- Error reports to Sentry or Glitchtip carry the exact version, such as `1.2.0`, instead of `1`.
- Pages open faster. A photo keeps the same link for an hour, so the browser reuses it; Home, Our
  Corner and the History tabs load the next page before you tap; and the first load is about a third
  smaller.
    - A link to a photo now lasts one to two hours instead of exactly one.
- The History link picker searches every Our Corner list and every moment, and shows which list or
  kind of thing each result is. It keeps finding moments while Our Corner is off. A link in a moment
  shows the linked thing's current picture, so it follows a picture that changes or goes.
- The app on a home screen takes its name from `APP_NAME`, like every other page. One that is
  already installed keeps its old name until it is installed again.
- Every response asks search engines not to index it, including redirects, photos and static files.
- A new install starts with every room off. Home tells the admin where to turn them on and tells
  everyone else that nothing is there yet.
- Ghar has one look now: sage on white, one typeface for titles and dates and one for everything
  else. Themes and the admin Theme page are gone.
- Paying a citation asks you to confirm first.
- The wording across the app and its emails is shorter and plainer, and says "moment" instead of
  "event" everywhere.
- A search that finds nothing says so and offers to clear it.
- In Our Corner and Our Mailbox, the sheets for adding, editing and writing rise from the bottom on
  any screen that has the phone layout, and slide in from the side from there up, like the rest of
  the house.

### Fixed

- After filtering, sorting or searching a list, back went to the previous filter instead of the
  previous page.
    - Going back from a thing in Our Corner returns to the list as you had filtered it.
- The page for one thing in Our Corner collapsed on screens between 768 and 1100 pixels wide.
- Saving a thing in Our Corner showed "Something went wrong" even when the form already said what to
  fix, and saving a list's settings without a connection showed an error page instead of a message.
    - A problem with a field is shown beside that field only; a failed save says so in a short message
      and keeps what you entered.
- The invite, password-reset and email-change emails arrived with a class name as their subject.
- When deleting a moment, or a photo from one, failed, Our History showed two error messages at
  once, and deleting a moment without a connection showed an error page.
    - The "Delete this moment?" question closes as soon as you confirm, like every other confirmation.
- When the Timeline or the Gallery in Our History couldn't load more moments or photos, nothing said
  so and scrolling did nothing more.
    - The end of the list now says "Couldn't load more." with a Try again button, as Our Corner and
      Our Mailbox do.
    - While more is loading it reads "Loading more…".
- Adding a lot to Our Corner could stop you sending notes, flowers, citations or coupons for a
  minute, because the two rooms shared one limit on how often you can save. Our Mailbox now has its
  own.
- After "Send & write another", closing the note sheet asked whether to discard the note even when
  nothing new had been written.

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
