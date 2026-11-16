import { router } from '@inertiajs/react';

// The page before the current one, by path. Same-path visits (a search, a filter, a
// load-more) update the current URL in place so the previous page survives them.
let current: string | null = null;
let previous: string | null = null;

function pathOf(url: string): string {
    return (
        new URL(url, 'http://ghar.invalid').pathname.replace(/\/$/, '') || '/'
    );
}

export function recordNavigation(url: string): void {
    if (current !== null && pathOf(url) === pathOf(current)) {
        current = url;

        return;
    }

    previous = current;
    current = url;
}

export function previousUrl(): string | null {
    return previous;
}

/**
 * Back to `parent`. If the parent is the page we came from, step back through history so its
 * scroll and loaded rows come back; otherwise replace this entry, so the OS back button doesn't
 * bounce between the two.
 */
export function goBack(parent: string): void {
    if (previous !== null && pathOf(previous) === pathOf(parent)) {
        window.history.back();

        return;
    }

    router.visit(parent, { replace: true });
}

export function resetNavigationForTests(): void {
    current = null;
    previous = null;
}
