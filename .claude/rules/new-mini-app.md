---
paths:
    - 'config/miniapps.php'
    - 'app/Providers/MiniAppServiceProvider.php'
    - 'app/MiniApps/*/Providers/**'
    - 'routes/miniapps/**'
    - 'resources/js/MiniApps/*/nav-icon.tsx'
    - 'app/Shell/Services/Rooms.php'
    - 'app/Shell/Services/DashboardSummaries.php'
    - 'app/Shell/Services/LinkableEntities.php'
    - 'app/Shell/Services/UserOwnedContent.php'
---

## Adding a new mini app

Every entry in `config/miniapps.php` is _installed_: `MiniAppServiceProvider` always registers its
`provider` and loads `routes/miniapps/{slug}.php` (inside `web`, `auth` and `room:{slug}`) and
`database/migrations/{slug}/`. Whether a room is _on_ is the admin's runtime choice, stored in
`room_settings` and read through `App\Shell\Services\Rooms` (once per request; no cache). A room
with no row is off. `Rooms::canEnter($user, $slug)` is the one rule for who may use a room: it is
on, and if its entry sets `admin_only`, the viewer is an admin. A room nobody may enter 404s
(middleware `room:{slug}`), leaves the registry props, the manifest shortcuts and Home's summaries
and previews, and `PushDispatcher` sends nothing for it (an `admin_only` room pushes to admins
only); its data stays. A provider's `boot()` runs either way, so a resolver or command it
registers must cope with its room being off (summaries and previews are only asked for rooms that
are on). The admin page lists rooms from the registry, so a new room needs no edit there, and the
back control finds the room's name and landing in the registry too.
A room can offer options of its own (Our Mailbox's entry types) with `Rooms::registerOption()` in
its provider's `boot()`. Everything else is a hand edit:

1. `config/miniapps.php` entry — include `component_prefix` or `AppLayout`'s chrome-hide breaks,
   and `nav_label` for the phone bottom bar. Ship `resources/js/MiniApps/{App}/nav-icon.tsx` whose
   default export is the room's lucide icon (`export { Map as default } from 'lucide-react';`); the
   shell finds it by glob, and a room without one shows a generic grid icon.

    ```php
    [
        'name' => 'Our Recipes',
        'nav_label' => 'Recipes',
        'slug' => 'our-recipes',
        'route' => '/apps/our-recipes',
        'description' => 'Recipes, including the ones nobody wrote down.',
        'provider' => RecipesServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/Recipes/',
    ],
    ```

2. `provider` in that entry; registry order is boot order. The provider holds the room's slug as
   `public const SLUG = '{slug}';`, and the room's PHP uses it rather than repeating the string
   (route names such as `apps.{slug}.landing` are the exception).
3. Everything else the room registers goes in the provider's `boot()`, never `bootstrap/app.php`,
   `routes/console.php` or `AppServiceProvider`: console commands and scheduled tasks
   (`$this->commands([...])`, `callAfterResolving(Schedule::class, …)`), policies
   (`Gate::policy`), and the rate limiters its routes throttle on
   (`RateLimiter::for('recipes-mutations', Limits::perUser(30))`). A "maker or admin" policy check
   is `$user->makerOrAdmin($row->maker_id)`.
4. `resources/css/themes/{slug}.css` + its `@import` in `resources/css/app.css` (see `themes.md`).
5. `vite.config.ts` `fonts:` — only if the app registers a font.
6. `resources/js/MiniApps/{App}/` under the registry's `component_prefix`. Pages go through the
   shell's `Page`; one whose back target isn't the room's landing (a detail page going to its list)
   passes `back`. A shell component that styles per room takes the room's class from the caller
   (`AppCard`'s `base`).
7. Smoke: `scripts/smoke.mjs` routes for every new authenticated page, with any ids it needs added
   to its fixtures query; a GET route that can't be smoked (a redirect, an image) needs a
   reasoned entry in `SKIP` in `scripts/check-smoke-routes.mjs`. Tests start with every room on
   (`tests/TestCase`); `DevDataSeeder` turns them all on with `Rooms::turnOnAll()`.
8. Dev data: a `database/seeders/DevData/{App}Data.php` class seeding the room's states, a line
   calling it in `DevDataSeeder::run()`, and its states and ids in `dev-data.md`. If the room
   writes files outside the media library, the class clears them itself (`MailboxData::clearFiles`,
   called from `DevDataSeeder::clearSeededFiles()`).
9. Optional door content on Home, from the provider's `boot()`: a live line with
   `DashboardSummaries::register(self::SLUG, fn (User $u): ?string => …)` and a glimpse with
   `registerPreview(self::SLUG, fn (User $u): ?array => …)` (`images`, or `note` + `note_from`).
   Must return only rows the viewer may see; a throwing resolver just shows nothing.
10. If other rooms can link to yours, call `LinkableEntities::register()` from `boot()` with a
    `label` (how the picker files your results), a `resolveMany` (ids → `title`, `thumbnail_url`,
    `icon` as a lucide name, `deep_link_url`), a `listing` if the picker should find them, and
    `room: '{slug}'`: while your room is off its type is not searchable or resolvable and links to it
    drop out of other rooms' pages. The picker (`/api/linkable/search`) and the pill belong to the
    shell, so nothing else needs to know your room.
11. If a table's foreign key to `users` restricts deletes, `UserOwnedContent::register()` it from the
    provider's `boot()`, so the admin delete can say what blocks it.

The shell itself never names a room: `scripts/check-boundaries.sh` fails on an `our-…` slug,
`data-app="our-…"` or `/apps/our-…` path under `app/Shell` or `resources/js/Shell`.
