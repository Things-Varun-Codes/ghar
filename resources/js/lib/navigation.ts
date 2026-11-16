import type { router as inertiaRouter } from '@inertiajs/react';
import { pathOf } from '@/lib/url';

/*
 * The one listener on Inertia's page changes. It keeps the current and previous page for
 * BackChevron and tells subscribers (route focus) about each completed page change.
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

// The page before the current one, by path. Same-path visits (a search, a filter, a
// load-more) update the current URL in place so the previous page survives them.
let current: string | null = null;
let previous: string | null = null;

const listeners = new Set<(change: PageChange) => void>();

/** Returns the path that was current before `url`. */
export function recordNavigation(url: string): string | null {
    const from = current === null ? null : pathOf(current);

    if (from !== null && pathOf(url) === from) {
        current = url;

        return from;
    }

    previous = current;
    current = url;

    return from;
}

export function previousUrl(): string | null {
    return previous;
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

        visits.set(visit.id, {
            method: String(visit.method).toLowerCase(),
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
        const from = recordNavigation(page.url);

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
        const recorded = recordNavigation(page.url);
        const from =
            navigated !== null && navigated.visitId === visitId
                ? navigated.from
                : recorded;
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
    current = null;
    previous = null;
    listeners.clear();
}
