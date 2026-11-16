// Ghar service worker: install/activate lifecycle, Web Push, and an offline page.
// Registered in production only (import.meta.env.PROD) from resources/js/app.tsx.
//
// The fetch listener answers top-level page navigations only, and only to replace a network
// failure with /offline.html. It caches nothing but that one static file: app pages are
// private and always come from the network. No navigation preload either: a navigation the
// worker passes on would then be requested twice. Everything else (Inertia's XHR visits, assets,
// media, cross-origin requests) never reaches respondWith, so the browser handles it natively.

const OFFLINE_CACHE = 'ghar-offline-v1';
const OFFLINE_URL = '/offline.html';

// Never answered by the worker, even on failure. /go/{code} must always hit the server so the
// short-link kill switch holds; the rest are the worker, manifest and health check themselves.
const BYPASS_PATHS = ['/sw.js', '/manifest.webmanifest', '/healthz', '/up'];
const BYPASS_PREFIXES = ['/go/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(OFFLINE_CACHE)
            .then((cache) =>
                cache.add(new Request(OFFLINE_URL, { cache: 'reload' })),
            )
            // Push must still install if the page can't be fetched; offline navigations then
            // fall through to the browser's own error page.
            .catch(() => undefined)
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter(
                        (key) =>
                            key.startsWith('ghar-offline-') &&
                            key !== OFFLINE_CACHE,
                    )
                    .map((key) => caches.delete(key)),
            );

            await self.clients.claim();
        })(),
    );
});

function isOfflineCandidate(request) {
    if (request.mode !== 'navigate' || request.method !== 'GET') {
        return false;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return false;
    }

    return (
        !BYPASS_PATHS.includes(url.pathname) &&
        !BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
    );
}

self.addEventListener('fetch', (event) => {
    if (!isOfflineCandidate(event.request)) {
        return;
    }

    event.respondWith(
        (async () => {
            try {
                return await fetch(event.request);
            } catch (error) {
                // fetch() only rejects when there is no response at all; a 404 or 500 from the
                // server still comes back as itself.
                const offline = await caches.match(OFFLINE_URL, {
                    cacheName: OFFLINE_CACHE,
                });

                if (offline) {
                    return offline;
                }

                throw error;
            }
        })(),
    );
});

// Web Push handler. Renders lock-screen banner from VAPID-signed payload + routes notification taps to the deep-link url.
self.addEventListener('push', (event) => {
    if (!event.data) return;
    let payload;
    try {
        payload = event.data.json();
    } catch (e) {
        payload = { title: 'Ghar', body: event.data.text() };
    }
    const { title, body, data, tag, icon, badge } = payload;
    event.waitUntil(
        self.registration.showNotification(title || 'Ghar', {
            body: body || '',
            tag: tag || 'shell', // collapses duplicates per app slug
            data: data || {}, // carries { url } for click handler
            icon: icon || '/icon-192.png',
            badge: badge || '/icon-192.png',
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url =
        (event.notification.data && event.notification.data.url) ||
        '/dashboard';
    event.waitUntil(openNotificationUrl(url));
});

// Reuse an existing Ghar tab if there is one, else open a new one.
async function openNotificationUrl(url) {
    const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
    });
    const client = clientList.find(
        (candidate) =>
            candidate.url.startsWith(self.location.origin + '/') &&
            'focus' in candidate,
    );

    if (client) {
        // Rejects for a tab this worker doesn't control yet.
        const navigated = await client.navigate(url).catch(() => null);

        if (navigated) {
            return navigated.focus();
        }
    }

    if (self.clients.openWindow) {
        return self.clients.openWindow(url);
    }
}
