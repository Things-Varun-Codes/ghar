import type { router as inertiaRouter } from '@inertiajs/react';

/*
 * After a client-side visit the browser keeps focus on whatever was clicked (or drops it to
 * <body> when the old page unmounted), and a screen reader says nothing. On a real page change
 * this moves focus to the new page's <h1> and reads out its title. It stays still on the first
 * load, on a form submit that keeps focus, and on a visit that keeps the page (a filter, sort, search or
 * load-more: same path, or preserveScroll).
 */

export type VisitInfo = { method: string; preserveScroll: boolean };

export type RouteChange = {
    /** null on the first page load. */
    previousPath: string | null;
    nextPath: string;
    /** null for a back/forward step through history. */
    visit: VisitInfo | null;
    /** The new page has the old page's heading: a view tab inside one page (History). */
    sameHeading: boolean;
    /** Focus fell to <body> because the element that had it unmounted. */
    focusLost: boolean;
};

export type FocusAction = 'none' | 'heading' | 'current-tab';

export function routeFocusAction(change: RouteChange): FocusAction {
    if (change.previousPath === null) {
        return 'none';
    }

    if (change.nextPath === change.previousPath) {
        return 'none';
    }

    // A form that redirected to another page: only step in if its button took focus with it.
    if (change.visit !== null && change.visit.method !== 'get') {
        return change.focusLost ? 'heading' : 'none';
    }

    if (change.visit?.preserveScroll) {
        return 'none';
    }

    return change.sameHeading ? 'current-tab' : 'heading';
}

export function pathOf(url: string): string {
    return (
        new URL(url, 'http://ghar.invalid').pathname.replace(/\/$/, '') || '/'
    );
}

const MAIN = '#main-content';

function mainHeading(): HTMLElement | null {
    return document.querySelector<HTMLElement>(`${MAIN} h1`);
}

function headingText(): string | null {
    return mainHeading()?.textContent?.trim() || null;
}

function focusLost(): boolean {
    const active = document.activeElement;

    return active === null || active === document.body || !active.isConnected;
}

function focusWithoutScroll(el: HTMLElement): void {
    if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '-1');
    }

    el.setAttribute('data-route-focus', '');
    el.focus({ preventScroll: true });
}

let announcer: HTMLElement | null = null;

function announce(message: string): void {
    if (!announcer || !announcer.isConnected) {
        announcer = document.createElement('div');
        announcer.className = 'sr-only';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(announcer);
    }

    const region = announcer;

    // Emptied first, so the same title twice in a row is still read.
    region.textContent = '';
    window.setTimeout(() => {
        region.textContent = message;
    }, 100);
}

function apply(action: FocusAction): void {
    if (action === 'none') {
        return;
    }

    const main = document.querySelector<HTMLElement>(MAIN);
    const active = document.activeElement;

    // The new page focused something itself (an autofocus field): leave it there.
    if (!focusLost() && main?.contains(active) && active !== main) {
        if (action === 'heading') {
            announce(document.title);
        }

        return;
    }

    if (action === 'current-tab') {
        if (focusLost()) {
            const tab =
                main?.querySelector<HTMLElement>('[aria-current="page"]') ??
                mainHeading() ??
                main;

            if (tab) {
                focusWithoutScroll(tab);
            }
        }

        announce(document.title);

        return;
    }

    const target = mainHeading() ?? main;

    if (target) {
        focusWithoutScroll(target);
    }

    announce(document.title);
}

type Router = typeof inertiaRouter;

export function installRouteFocus(router: Router): void {
    const visits = new Map<string, VisitInfo>();
    let previousPath: string | null = null;
    let previousHeading: string | null = null;

    // After React has committed the page and Inertia's <Head> has set the title.
    const handle = (url: string, visit: VisitInfo | null) => {
        window.requestAnimationFrame(() => {
            const nextPath = pathOf(url);
            const heading = headingText();

            const action = routeFocusAction({
                previousPath,
                nextPath,
                visit,
                sameHeading: heading !== null && heading === previousHeading,
                focusLost: focusLost(),
            });

            previousPath = nextPath;
            previousHeading = heading;
            apply(action);
        });
    };

    router.on('before', (event) => {
        const visit = event.detail.visit;

        if (visit.prefetch) {
            return;
        }

        visits.set(visit.id, {
            method: String(visit.method).toLowerCase(),
            preserveScroll: visit.preserveScroll === true,
        });

        // A visit that never succeeds leaves its entry behind; keep only the recent ones.
        if (visits.size > 20) {
            const oldest = visits.keys().next().value;

            if (oldest !== undefined) {
                visits.delete(oldest);
            }
        }
    });

    router.on('success', (event) => {
        const id = event.detail.visitId;
        const visit = (id !== undefined && visits.get(id)) || {
            method: 'get',
            preserveScroll: false,
        };

        if (id !== undefined) {
            visits.delete(id);
        }

        handle(event.detail.page.url, visit);
    });

    router.on('navigate', (event) => {
        if (event.detail.type === 'initial') {
            handle(event.detail.page.url, {
                method: 'get',
                preserveScroll: true,
            });
        } else if (event.detail.type === 'history') {
            handle(event.detail.page.url, null);
        }
    });
}
