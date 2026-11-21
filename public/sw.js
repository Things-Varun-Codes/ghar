// Ghar service worker: install/activate lifecycle, Web Push, and an offline page.
// Registered in production only (import.meta.env.PROD) from resources/js/app.tsx.
//
// The fetch listener answers top-level page navigations only, and only to replace a network
// failure with /offline.html. It caches nothing but that one static file: app pages are
// private and always come from the network. Navigation preload starts that request while the
// worker boots, so every navigation the worker sees must use the preload response: one it
// passed on would be requested a second time. Everything else (Inertia's XHR visits, assets,
// media, cross-origin requests) never reaches respondWith, and where the browser has static
// routing it never wakes the worker at all.

const OFFLINE_CACHE = 'ghar-offline-v3';
const OFFLINE_URL = '/offline.html';

// Never answered by the worker, even on failure. /go/{code} must always hit the server so the
// short-link kill switch holds; the rest are the worker, manifest and health check themselves.
const BYPASS_PATHS = ['/sw.js', '/manifest.webmanifest', '/healthz', '/up'];
const BYPASS_PREFIXES = ['/go/'];

// One rule per non-navigation request mode, so no rule can match a page load. Navigations are
// sent to the fetch listener first anyway, in case a browser ignores the condition.
const STATIC_ROUTES = [
    { condition: { requestMode: 'navigate' }, source: 'fetch-event' },
    { condition: { requestMode: 'same-origin' }, source: 'network' },
    { condition: { requestMode: 'cors' }, source: 'network' },
    { condition: { requestMode: 'no-cors' }, source: 'network' },
];

async function addStaticRoutes(event) {
    if (typeof event.addRoutes !== 'function') {
        return;
    }

    try {
        await event.addRoutes(STATIC_ROUTES);
    } catch {
        // Rules the browser rejects leave every request on the fetch listener, as without the API.
    }
}

self.addEventListener('install', (event) => {
    event.waitUntil(addStaticRoutes(event));
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

            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload
                    .enable()
                    .catch(() => undefined);
            }

            await self.clients.claim();
        })(),
    );
});

function isPageLoad(request) {
    return (
        request.mode === 'navigate' &&
        request.method === 'GET' &&
        new URL(request.url).origin === self.location.origin
    );
}

function isBypassed(request) {
    const { pathname } = new URL(request.url);

    return (
        BYPASS_PATHS.includes(pathname) ||
        BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    );
}

// preloadResponse resolves to undefined where navigation preload is off or unsupported.
async function fromNetwork(event) {
    const preloaded = await event.preloadResponse;

    return preloaded ?? fetch(event.request);
}

self.addEventListener('fetch', (event) => {
    if (!isPageLoad(event.request)) {
        return;
    }

    // The server's own response, untouched: never cached, never replaced by the offline page.
    if (isBypassed(event.request)) {
        event.respondWith(fromNetwork(event));

        return;
    }

    event.respondWith(
        (async () => {
            try {
                return await fromNetwork(event);
            } catch (error) {
                // Both reject only when there is no response at all; a 404 or 500 from the
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
