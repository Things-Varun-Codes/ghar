---
paths:
    - 'app/**'
    - 'database/**'
    - 'tests/**'
    - 'routes/**'
    - 'config/**'
---

## Backend conventions

- **Media URLs are stable for an hour.** `SignedUrls` signs from the top of a fixed window so the
  browser can cache photos. Signing from `now()` gives every page view a new URL and a new download.

### Models

`casts()` method + `#[Fillable([...])]` attribute
(`Illuminate\Database\Eloquent\Attributes\Fillable`) is the standard — not `$fillable` / `$casts`
array properties. Reference: `app/Shell/Models/Invitation.php`, `User.php`.

**Eloquent strict mode** is on outside production (`Model::shouldBeStrict(! app()->isProduction())`,
first line of `AppServiceProvider::configureDefaults()`): lazy loading, silently discarded
attributes and missing-attribute reads are hard failures locally and in tests. Eager-load relations,
keep `#[Fillable]` complete, and `refresh()` a model before reading DB-computed defaults.

### People and the region

- **A person on a page is `App\Shell\Support\Person::short($user)`**: `{id, name, avatar_url}`
  with `name` the first name (the full name only when two members share it,
  `Household::shortName`), the picture signed per the hour window and memoised for the request.
  `Person::of` keeps the full name, for the few places that need it (settings, admin). Never send a bare name pair
  or the `avatar_key`. A query that selects named user columns adds `avatar_key`, or strict mode
  throws when the picture is read.
- **`users.avatar_key` isn't fillable**: it names an object on the media disk, so a key from
  request input could sign someone else's file. Set it with `forceFill` after storing the upload.
  `birthday` (a whole date or null) and `morning_memories` (default on) are fillable.
- **The household region is `App\Shell\Support\Region`** (`GHAR_TIMEZONE`, `GHAR_LOCALE`):
  `Region::today()` / `now()` for "today" and anything due, `forPage()` for the shared `region`
  prop. `app.timezone` stays UTC; stored timestamps are naive UTC.
