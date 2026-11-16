import type { router as inertiaRouter } from '@inertiajs/react';
import { pathOf } from '@/lib/url';

/*
 * The one listener on Inertia's page changes. It keeps the stack of pages under the current one
 * for BackChevron, holds a page to one history entry, and tells subscribers (route focus) about
 * each completed page change.
 *
 * Inertia's events, as of @inertiajs/core 3.x:
 * - a server visit fires `before`, then `navigate` (type "visit") when it pushes a history
 *   entry, then `success` unless the page came back with validation errors. A replace visit, or
 *   one that lands on the URL already shown, skips `navigate`.
 * - a visit served from the prefetch cache fires `before` and `success` but no `finish`, so
 *   `finish` can't be where a visit's options are read.
 * - back/forward fires only `navigate` (type "history"); the first load only `navigate`
 *   (type "initial"). Client-side `router.push` fires `navigate` and no `success`.
 */

export type VisitInfo = { method: string; preserveScroll: boolean };

export type PageChange = {
    url: string;
    path: string;
    /** The path shown before this change; null on the first page load. */
    previousPath: string | null;
    /** null for a back/forward step through history. */
    visit: VisitInfo | null;
};

/*
 * The paths in this tab's history as this document has seen them, and which one is showing.
 * Entries that differ only by query (a filter, an open sheet's own entry) are one page here.
 */
let pages: string[] = [];
let at = -1;

/** How a page change reached history: a new entry, the current one rewritten, or back/forward. */
export type NavigationKind = 'push' | 'replace' | 'history';

// Back/forward doesn't say which way it went, so take the nearest known page with that path,
// the one below first.
function stepTo(path: string): number | null {
    for (let distance = 1; distance < pages.length; distance++) {
        if (pages[at - distance] === path) {
            return at - distance;
        }

        if (pages[at + distance] === path) {
            return at + distance;
        }
    }

    return null;
}

const listeners = new Set<(change: PageChange) => void>();

/** Returns the path that was current before `url`. */
export function recordNavigation(
    url: string,
    kind: NavigationKind = 'push',
): string | null {
    const from = pages[at] ?? null;
    const path = pathOf(url);

    if (path === from) {
        return from;
    }

    if (kind === 'push') {
        pages.length = at + 1;
        pages.push(path);
        at++;

        return from;
    }

    const step = kind === 'history' ? stepTo(path) : null;

    if (step !== null) {
        at = step;
    } else if (from !== null && kind === 'replace') {
        pages[at] = path;
    } else {
        // Nothing is known about what is under this entry: it is from before this document loaded.
        pages = [path];
        at = 0;
    }

    return from;
}

/** The page one step back in history, or null when this document hasn't seen one. */
export function previousPath(): string | null {
    return pages[at - 1] ?? null;
}

export function onPageChange(
    listener: (change: PageChange) => void,
): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

function emit(url: string, from: string | null, visit: VisitInfo | null) {
    const change = { url, path: pathOf(url), previousPath: from, visit };

    listeners.forEach((listener) => listener(change));
}

type Router = typeof inertiaRouter;

export function installNavigation(router: Router): void {
    const visits = new Map<string, VisitInfo>();
    // `success` follows its own `navigate`, which has already recorded the new page.
    let navigated: { visitId: string; from: string | null } | null = null;

    router.on('before', (event) => {
        const visit = event.detail.visit;

        if (visit.prefetch) {
            return;
        }

        const method = String(visit.method).toLowerCase();

        // A page owns one history entry: another view of it (filter, sort, search, tab, page
        // number) rewrites that entry, so back leaves the page instead of undoing the filter.
        if (method === 'get' && pathOf(visit.url.href) === pages[at]) {
            visit.replace = true;
        }

        visits.set(visit.id, {
            method,
            preserveScroll: visit.preserveScroll === true,
        });

        // An interrupted or failed visit never succeeds and leaves its entry behind.
        if (visits.size > 20) {
            const oldest = visits.keys().next().value;

            if (oldest !== undefined) {
                visits.delete(oldest);
            }
        }
    });

    router.on('navigate', (event) => {
        const { page, type, visitId } = event.detail;
        const from = recordNavigation(
            page.url,
            type === 'history' ? 'history' : 'push',
        );

        if (type === 'initial') {
            emit(page.url, from, { method: 'get', preserveScroll: true });
        } else if (type === 'history') {
            emit(page.url, from, null);
        } else {
            navigated = visitId === undefined ? null : { visitId, from };
        }
    });

    router.on('success', (event) => {
        const { page, visitId } = event.detail;
        // No `navigate` of its own means the visit rewrote the entry it started on.
        const from =
            navigated !== null && navigated.visitId === visitId
                ? navigated.from
                : recordNavigation(page.url, 'replace');
        navigated = null;

        const visit = (visitId !== undefined && visits.get(visitId)) || {
            method: 'get',
            preserveScroll: false,
        };

        if (visitId !== undefined) {
            visits.delete(visitId);
        }

        emit(page.url, from, visit);
    });
}

export function resetNavigationForTests(): void {
    pages = [];
    at = -1;
    listeners.clear();
}
