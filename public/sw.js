// Ghar service worker — handles install/activate lifecycle and Web Push notifications.
// Registered in production only (import.meta.env.PROD) from resources/js/app.tsx.
// No fetch listener: browser handles fetches natively. A respondWith pass-through breaks
// cross-origin no-cors requests and causes NetworkError propagation when offline.

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
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
