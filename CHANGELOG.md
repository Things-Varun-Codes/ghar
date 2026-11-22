# Changelog

Each section here is put together from the change files in `.changes/` by `npm run release`, so
don't edit this file by hand. The release workflow publishes a version's section as its GitHub
release notes. Versions follow [semantic versioning](https://semver.org):
a major version can need you to do something when you upgrade, and says what under **Upgrading**.
Minor and patch versions don't.

Before any upgrade, back up the database and the media volume (DEPLOY.md, "Backups and restore").
Migrations only run forward.

## [1.4.0] - 2026-11-22

### Added

- After you send or resend an invite, Admin → Invites shows the invite link with a Copy link button,
  so you can pass it on yourself as well as by email.
- Ghar has a dark look. Everyone picks Light, Dark or the same as their device in Settings →
  Appearance, and it starts on the device's setting.
    - At night the rooms, the map and the sign-in page all turn warm and dim; photos keep their white
      borders.
- Our History has a Map tab that shows every moment with a picked place. Tap a pin to open the
  moment, or choose from the moments at a place you've been to more than once.
    - A list of the places sits under the map and works without it.
    - The map is drawn in the app's own colours: warm paper land, soft blue water and sage parks.
    - The map's tiles come from OpenFreeMap through your own server, so nobody's address reaches the
      tile host. `MAP_TILES_URL` points it at another host.
- A moment's Location field searches OpenStreetMap when no Google Maps key is set, and you can
  always keep what you typed as the place when it isn't on a map.
    - Searches are sent from the server, so the search service never sees who typed them. `PHOTON_URL`
      points it at your own Photon server instead of `photon.komoot.io`.
- Two-step sign-in: under Settings → Two-step sign-in, anyone can make signing in ask for a code
  from an authenticator app as well as their password.
    - Recovery codes sign you in if you lose your phone; each works once, and you can make new ones.
    - Admin → Users shows who has it on.
    - If someone loses both, `php artisan ghar:two-factor-off <email>` turns it off for them.

### Changed

- The account menu now holds just Settings, Admin settings (for admins) and Sign out, on phones and
  computers alike. Settings and Admin settings each open a page listing what's inside.
    - Back from Profile, Password or Notifications returns to Settings; back from an admin page
      returns to Admin settings.
- A moment's Location field always searches OpenStreetMap, and Ghar no longer uses Google Maps, so
  `GOOGLE_MAPS_API_KEY` does nothing and can be removed.
    - Places picked through Google before this keep their name, address and coordinates.
    - Google's terms don't let a place found through Google be stored for good or shown on another
      map, which a family history and the coming map view both need.
- On a phone, the preview on each Our Shelf list is a little taller, the same height as the previews
  in Our Exchange.
    - An invalid role on the admin Invitations and Edit user pages is outlined like every other field
      that needs fixing.
- A list on Our Shelf now opens on the things you haven't got to yet, like To watch or To read. If
  nothing is left to do, it opens on everything.
    - Ticking something off there says which tab it moved to, with Undo.

### Fixed

- On an iPhone, the Birthday field on your profile and on an admin's edit page for someone ran off
  the right edge of the screen.
- On Our History's Calendar, tapping a day with more than one moment showed "Something broke"
  instead of the list of that day's moments.
- Opening Our History on an iPhone drew a box around the page title.
- A few things looked off and now don't.
    - Home's "Needs you" count was a little hard to read on the light background.
    - Password fields on the sign-in pages showed two focus rings at once.
    - A "Discard?" question over an open sheet left the sheet bright behind it.
    - A Shelf item with both a link and a place showed two filled buttons; only the link is filled
      now.
    - An empty Shelf list shows its own icon, in ink, instead of a coral heart.
- Choosing another sort or filter turned its round button into a wide one that pushed onto a line of
  its own, on Our History, Our Shelf and Our Exchange.
    - The button stays the same size whatever is chosen; a small dot on it shows the list isn't in its
      usual order.
    - Switching between Timeline, Calendar and Gallery, or between tabs in Our Exchange, now slides
      the highlight across like the other tab switchers.

### Security

- Changing or resetting your password now signs you out on every other device, and any password
  reset link sent before the change stops working.

## [1.3.0] - 2026-11-21

### Added

- Every page now has a "back to the top" button once you've scrolled a long way down, just above the
  add button, or in its place where a page has none.
- Our History sends one push each morning with whose birthday it is and what happened on this day in
  past years.
    - It arrives from 9 in the morning, in the household's time (`GHAR_TIMEZONE`), at most once a day,
      and only to people with Morning memories on in Settings → Notifications. The birthday person
      gets a happy birthday; everyone else hears whose birthday it is.
    - One memory opens that moment; several open the Timeline.
    - When you add a moment on someone's birthday, Our History asks whether it is their birthday. A
      moment linked to a birthday says so on its card, and later mornings remember it: "Meera's
      birthday, 2022".
    - The Timeline and the Calendar both start with "On this day" when something happened on today's
      date in an earlier year. A moment from 29 February shows on 28 February in other years.
- Everyone can have a profile picture, shown beside their name around the house. Without one, their
  initials sit in a soft circle instead.
    - In Settings → Profile, choose a photo, slide it into the circle and save. You can change or
      remove it there at any time. An admin can remove anyone's picture from their page in Admin →
      Users, but only you can put one up.
    - Settings → Profile also takes your birthday: the whole date, day, month and year. Once it's set
      you can change it but not clear it. An admin can set anyone's birthday from their page in Admin
      → Users.
    - Settings → Notifications has a Morning memories switch, on for everyone to start with, for Our
      History's morning push of birthdays and what happened on this day in past years.
    - `GHAR_TIMEZONE` sets where the household lives, so "today" and dates follow your clock rather
      than the server's or the phone's, down to the day a coupon runs out and the day a comment or a
      login is shown on. Dates read the way that country writes them unless `GHAR_LOCALE` says
      otherwise: the order of day and month, the month and weekday names in Our History's calendar,
      the day its weeks start on, and how long ago a comment was ("5 min ago"). See DEPLOY.md.
    - In Our Exchange, a note or bouquet shows the face of who sent it, or of everyone you sent it to,
      and the people to send to are shown with their faces.
    - In Our Shelf, each item shows the face of whoever added it.
- Everyone can react to a moment and talk about it underneath.
    - Tap ❤️ 😂 😮 😢 🙏 or 🎉 in a moment to react, and tap again to take it back. Each reaction
      shows who left it.
    - Comments are plain text, below the photos. You can delete your own; an admin can delete
      anyone's. A comment you haven't sent yet is kept if you close the moment by mistake: it asks
      first.
    - Whoever added the moment, and everyone who commented before you, gets a push when you comment.
      It says who commented on which moment, never what they wrote. Reactions send nothing.
- On Our History's Timeline, tap a year's heading to jump to any other year, even one further down
  that hasn't loaded yet.

### Changed

- The Timeline is more compact, so far more moments fit on a screen.
    - Each moment shows its date, who added it with their face, its title, a line of the story and a
      small picture. "Details" opens the rest of the story and the photos; tapping anywhere else still
      opens the moment.
    - The place field in a moment works from the keyboard: arrows to choose a suggestion, Enter to
      pick it, Escape to close the list.
    - The picker for linking things into a story groups results by kind and works with the arrow keys.
      Numbers in a search are now searched for, rather than picking a result.
- Our History now works like the other rooms: the Gallery filters by type with the same tabs as a
  Shelf list, and the count and sort sit under the tabs and scroll away with the page.
    - The Gallery's year is a menu on every screen size.
    - On a phone the Calendar's days are bigger to tap, and the month strip works with the arrow keys.
- Home now shows what needs you and what the household added this week, under today's date, instead
  of a card for each room.
    - **Needs you** pins up citations to pay, coupons someone wants to use, and unread notes and
      flowers, each on a slip pinned up by the sender's picture, with a button straight to it. Only
      the person they're for sees them.
    - **New this week** lists the moments and list items the others added.
    - Birthdays in the next two weeks appear under **Coming up**.
    - On a laptop the rooms are now in the sidebar, the same as the bottom bar on a phone.
    - Ghar has a new look throughout, the offline page included: a warm white, one easy-to-read
      typeface, and coral for anything you can press.
    - In Our History, each moment on the Timeline shows who posted it as their picture on the line,
      opens with a tap anywhere on the card instead of a Details button, shows where it happened
      beside the date, and keeps its photo as a small print. People in Our History are named by first
      name, as on Home; dates read quietly, and the Gallery's filters, a moment's reactions and the
      story's formatting buttons each fit on one line on a phone. On a phone the Calendar shows each
      day's photo and date without a clipped title.
    - In Our Shelf, each thing on a list keeps just its done button and a ⋯ menu (which now has Open
      link), a place no longer repeats its own name, people are named by first name, and a thing
      that's done says who did it, like "Loved by Asha" (its own page adds the day).
    - A list in Our Shelf can let everyone mark things for themselves: turn on "Everyone marks their
      own" in the list's settings, and Meera's "Loved" no longer counts as yours. Each thing shows who
      has marked it, and the list's tab becomes "Loved by me". Switching a list either way keeps
      everything already marked.
    - In Our Exchange, citations and coupons print in ink like real forms, stamps and badges included,
      and everyone, including the people you send to, is named by first name. What's waiting for you
      ("1 to pay") reads in dark ink rather than coral, and notes and coupon titles are written at the
      same size as the rest of the app. On a laptop the Exchange shows its four piles side by side,
      and notes and flowers sit in columns instead of one long row each.
- Titles and the Ghar name are now in a soft serif, notes, coupons and citations in Our Exchange are
  in handwriting, and the count under a room's tabs is easier to read.
- Ghar's mark, the roof over a heart, is now coral like the rest of the app, and it sits beside the
  name in the header, on the sign-in page and on the loading screen, as well as on the browser tab
  and the home-screen icon.
- A bouquet opens in the same full-screen viewer as photos in Our History, and photos open faster
  and no longer jump around while the Gallery loads.
    - Tapping a photo opens a copy sized for your screen instead of the full-size original, sharp
      enough to zoom on a large display.
    - Gallery tiles hold their square shape while they load.
    - Our History no longer loads its other tabs in the background on every visit.
    - Gallery thumbnails are sharp on high-resolution screens, while the small pictures on Timeline,
      Home and On This Day download less. Existing photos are redone in the background after the
      upgrade, and an old thumbnail can show for up to two hours until the browser lets it go.
- Our Corner is now called Our Shelf, and Our Mailbox is now Our Exchange, each with a new icon in
  the bottom bar.
    - The rooms now live at `/apps/our-shelf` and `/apps/our-exchange`. Old bookmarks, home-screen
      shortcuts and notifications that point at `/apps/our-corner` or `/apps/our-mailbox` no longer
      open anything.
    - Which rooms and kinds of mail are switched on, short links into either room, and links to Shelf
      items inside moments all carry over on upgrade.
    - The old `/apps/our-mailbox/challans` addresses from before citations were renamed are gone too.
- Sheets, menus and other controls have been rebuilt so they behave the same everywhere, and things
  now move softly when they change.
    - On a phone, swipe a sheet down to close it; on a wider screen, swipe it to the right. A sheet
      with something typed in still asks before throwing it away.
    - A page's first rows and doors settle in as it opens. Rows that load later, and pages you come
      back to, appear in place.
    - On Our Shelf, the sticker pops in when you mark something done, a thing you remove folds away
      while its Undo is showing and comes back if you undo it, and lists glide into place when you
      move one earlier or later.
    - Lists keep loading as you scroll, and if loading stops, "Try again" picks up where it left off.
    - If your device is set to reduce motion, nothing slides or rises; things only fade.
    - In Our Exchange, a citation's stamp and a coupon's tick scale in gently at the moment it is paid
      or fulfilled, and choosing flowers prints what each one means under them.
- Sort and filter buttons are now icons, so they fit on a phone: sort in every room, and the
  Gallery's type and year. A button that isn't at its usual setting also says what it is set to,
  like "2025" or "From the beginning".

### Fixed

- When a bouquet couldn't be arranged because of the flowers or the style you chose, the sheet said
  only "Could not arrange your bouquet". It now says what was wrong.
- In Our History, a Calendar day with a moment and a moment's photos showed no outline when reached
  with the keyboard.
- Next to a search box, the sort button was squeezed into an oval instead of a circle.

### Security

- The image now runs PHP 8.5.13, which closes the remote code execution and PHP-FPM holes that PHP
  fixed in its November 2026 security release.
- When Ghar fetches a pasted link for its preview, picture or map, it now also refuses a few more
  kinds of address that point inside a network rather than out to the internet, such as IPv6
  site-local and NAT64 local-use addresses.

## [1.2.0] - 2026-11-17

### Added

- Our Shelf's lists are the household's own. Anyone can make a list, with a name, an icon from the
  whole lucide set, a word for done (loved, watched, read, cooked or anything) and a heart or a
  tick. Lists can be renamed and reordered; deleting one with other people's things in it takes an
  admin.
    - The upgrade moves your songs, movies, activities and places into four lists of the same names,
      with everything kept: who added each one, who marked it done and when, pictures, links,
      addresses and coordinates.
    - Old links, notifications and the links inside History moments keep working.
- Our Shelf with no lists yet (a new install, once the room is on) suggests lists to add in one
  tap.
- Every History moment has its own address, `/apps/our-history?moment={id}`, so a link can open one
  directly.
- When the server can't be reached, Ghar shows its own offline page instead of the browser's error.
- On a phone, a bar at the bottom holds Home and each room, and a bar at the top shows where you are
  with a way back. Settings and Admin are in the account menu there.
- The admin chooses the rooms. Admin → Rooms turns Our History, Our Shelf and Our Exchange on or
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
  the notification tag. Old `/apps/our-exchange/challans` addresses redirect, and reference numbers
  already issued (`OC/2026/000007`) are unchanged.
    - The table is renamed when the new version starts. Back up first, as always.
- Every item in every Our Shelf list looks the same and can have a name, notes, a link, a picture
  and a place. Pasting a link to almost any page fills in its name and picture from what the page
  itself publishes; Corner no longer knows any site by name. A picture can also be pasted or
  removed. Pictures are fetched and served by your install, so browsers never contact other sites,
  and every fetch refuses addresses inside your own network.
- A place in Our Shelf is a pasted map link, coordinates or a typed name, and "Open in Maps" opens
  it in the device's maps app. Our Shelf no longer uses Google Places.
- Dates read "4 Jun 2024" everywhere.
- Error reports to Sentry or Glitchtip carry the exact version, such as `1.2.0`, instead of `1`.
- Pages open faster. A photo keeps the same link for an hour, so the browser reuses it; Home, Our
  Corner and the History tabs load the next page before you tap; and the first load is about a third
  smaller.
    - A link to a photo now lasts one to two hours instead of exactly one.
- The History link picker searches every Our Shelf list and every moment, and shows which list or
  kind of thing each result is. It keeps finding moments while Our Shelf is off. A link in a moment
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
- In Our Shelf and Our Exchange, the sheets for adding, editing and writing rise from the bottom on
  any screen that has the phone layout, and slide in from the side from there up, like the rest of
  the house.

### Fixed

- After filtering, sorting or searching a list, back went to the previous filter instead of the
  previous page.
    - Going back from a thing in Our Shelf returns to the list as you had filtered it.
- The page for one thing in Our Shelf collapsed on screens between 768 and 1100 pixels wide.
- Saving a thing in Our Shelf showed "Something went wrong" even when the form already said what to
  fix, and saving a list's settings without a connection showed an error page instead of a message.
    - A problem with a field is shown beside that field only; a failed save says so in a short message
      and keeps what you entered.
- The invite, password-reset and email-change emails arrived with a class name as their subject.
- When deleting a moment, or a photo from one, failed, Our History showed two error messages at
  once, and deleting a moment without a connection showed an error page.
    - The "Delete this moment?" question closes as soon as you confirm, like every other confirmation.
- When the Timeline or the Gallery in Our History couldn't load more moments or photos, nothing said
  so and scrolling did nothing more.
    - The end of the list now says "Couldn't load more." with a Try again button, as Our Shelf and
      Our Exchange do.
    - While more is loading it reads "Loading more…".
- Adding a lot to Our Shelf could stop you sending notes, flowers, citations or coupons for a
  minute, because the two rooms shared one limit on how often you can save. Our Exchange now has its
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
- Our Shelf: shared lists of songs, movies, places and things to do.
- Our Exchange: notes and flowers to one or more people, challans and coupons.
- Invite-only accounts with an admin role, Web Push, a home-screen app (PWA) and short links for
  NFC tags.
- Photos stay on your own disk by default, behind signed links that expire. Any S3-compatible
  bucket works instead.
- Images for amd64 and arm64 at `ghcr.io/things-varun-codes/ghar`.
