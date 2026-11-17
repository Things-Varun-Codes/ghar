import type { router as inertiaRouter } from '@inertiajs/react';

type Router = typeof inertiaRouter;

/*
 * What a write (anything but a GET) does to pages kept for later. Prefetched pages are dropped:
 * they may show what is no longer true. Back and forward restore a page from what browser
 * history saved, without asking the server, so a page last seen before a write asks for its
 * props again when it is restored. One seen since stays instant.
 */
export function installAfterWrite(router: Router): void {
    let writes = 0;
    // The write count when each page was last shown, by URL.
    const seen = new Map<string, number>();

    router.on('finish', (event) => {
        if (event.detail.visit.method !== 'get') {
            writes++;
            router.flushAll();
        }
    });

    router.on('navigate', (event) => {
        const { page, type } = event.detail;

        if (type === 'history' && (seen.get(page.url) ?? -1) < writes) {
            // Not router.reload(), which always keeps component state: a page that copied its
            // props into its own state would go on showing the old ones. Cursor lists re-seed
            // from either.
            router.visit(window.location.href, {
                replace: true,
                preserveScroll: true,
                preserveState: false,
            });

            return;
        }

        seen.set(page.url, writes);
    });
}
