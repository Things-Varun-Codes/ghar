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
