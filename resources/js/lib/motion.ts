import type { router as inertiaRouter } from '@inertiajs/react';
import { pathOf } from '@/lib/url';

/** 'smooth', unless the person has asked for less motion. Use for every scrollIntoView/scrollTo. */
export function scrollBehavior(): ScrollBehavior {
    return typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
}

/*
 * The motion tokens from app.css, in seconds, for the presets in components/motion. A unit test
 * reads app.css and fails when the two drift.
 */
export const DURATION = {
    press: 0.09,
    out: 0.12,
    in: 0.15,
    card: 0.18,
    sheet: 0.24,
    sheetOut: 0.16,
    media: 0.3,
    stagger: 0.035,
} as const;

/* --ease-ui. */
export const EASE = [0.2, 0.8, 0.2, 1] as const;

/* How many of a page's first rows settle in one after another; the rest arrive with the last. */
export const SETTLE_STAGGERED = 8;

/*
 * Whether a list mounting now is a page being opened. Going back or forward restores a page,
 * and a visit to the path already shown (a tab, a filter) re-shows it: neither settles. Partial
 * reloads (load more, polling) change nothing here, and their rows mount into a list that has
 * already settled.
 */
let restoring = false;
let installed = false;

export function installMotionGate(router: typeof inertiaRouter): void {
    if (installed) {
        return;
    }

    installed = true;
    window.addEventListener('popstate', () => {
        restoring = true;
    });
    router.on('before', (event) => {
        const visit = event.detail.visit;

        if (
            visit.prefetch ||
            visit.only.length > 0 ||
            visit.except.length > 0
        ) {
            return;
        }

        restoring = pathOf(visit.url.href) === pathOf(window.location.href);
    });
}

export function pageIsOpening(): boolean {
    return !restoring;
}
