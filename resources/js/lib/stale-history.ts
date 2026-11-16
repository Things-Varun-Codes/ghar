import type { router as inertiaRouter } from '@inertiajs/react';

type Router = typeof inertiaRouter;

/*
 * Back and forward restore a page from what was saved in browser history, without asking the
 * server. Once anything has been written in this tab (an item's picture changed, a note sent),
 * those saved pages may show what is no longer true, so a page reached by back or forward then
 * asks for its props again. Before any write, back stays instant.
 *
 * A write also drops Inertia's prefetch cache (app.tsx), for the same reason.
 */
export function installStaleHistoryReload(router: Router): void {
    let written = false;

    router.on('finish', (event) => {
        if (event.detail.visit.method !== 'get') {
            written = true;
        }
    });

    router.on('navigate', (event) => {
        if (written && event.detail.type === 'history') {
            // Not router.reload(), which always keeps component state: a list keeps its rows in
            // its own state, and only a remount takes the new ones.
            router.visit(window.location.href, {
                replace: true,
                preserveScroll: true,
                preserveState: false,
            });
        }
    });
}
