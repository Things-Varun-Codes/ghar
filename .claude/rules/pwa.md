---
paths:
    - 'public/sw.js'
    - 'public/offline.html'
    - 'public/*.png'
    - 'app/Http/Controllers/ManifestController.php'
    - 'resources/views/app.blade.php'
    - 'resources/js/app.tsx'
---

## PWA

- Manifest `/manifest.webmanifest` comes from `ManifestController` (not a static file), so the
  installed name follows `APP_NAME`; icons `public/icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png`, `apple-touch-icon.png` (180×180).
- `public/sw.js` handles the install/activate lifecycle, Web Push display and notification clicks.
  Registered from `resources/js/app.tsx` in production only. Its one `fetch` listener answers
  same-origin page navigations only: it passes them to the network (through navigation preload
  where the browser has it) and serves the precached `public/offline.html` when the network is
  unreachable. Navigations to `/go/*`, `/healthz`, `/up`, `/sw.js` and the manifest are passed
  through unchanged and never get the offline page. It never caches an app page; XHR, assets and
  media skip the worker (static routes on `requestMode`, where supported). Bump `OFFLINE_CACHE` in
  `sw.js` whenever `offline.html` changes.
- iOS standalone + theme-color meta tags live in `resources/views/app.blade.php`.
- **Cloudflare must not cache** `/manifest.webmanifest`, `/sw.js`, `/healthz` or `/go/*` (Cache Rule
  bypass — see DEPLOY.md). A cached `/go/{code}` 302 silently defeats the short-link kill switch.
