import { describe, expect, it } from 'vitest';
import type { RouteChange } from '@/lib/route-focus';
import { routeFocusAction } from '@/lib/route-focus';

const get = { method: 'get', preserveScroll: false };

function change(overrides: Partial<RouteChange>): RouteChange {
    return {
        previousPath: '/dashboard',
        nextPath: '/apps/our-corner',
        visit: get,
        sameHeading: false,
        focusLost: true,
        ...overrides,
    };
}

describe('routeFocusAction', () => {
    it('moves focus to the heading on a visit to another page', () => {
        expect(routeFocusAction(change({}))).toBe('heading');
    });

    it('leaves the first page load alone', () => {
        expect(routeFocusAction(change({ previousPath: null }))).toBe('none');
    });

    it('leaves a filter, sort or search on the same page alone', () => {
        expect(
            routeFocusAction(
                change({
                    previousPath: '/apps/our-corner/songs',
                    nextPath: '/apps/our-corner/songs',
                }),
            ),
        ).toBe('none');
    });

    it('leaves a visit that keeps its scroll alone', () => {
        expect(
            routeFocusAction(
                change({ visit: { method: 'get', preserveScroll: true } }),
            ),
        ).toBe('none');
    });

    it('keeps focus on a view tab that leads to the same page heading', () => {
        expect(
            routeFocusAction(
                change({
                    previousPath: '/apps/our-history',
                    nextPath: '/apps/our-history/calendar',
                    sameHeading: true,
                }),
            ),
        ).toBe('current-tab');
    });

    it('moves focus on back and forward too', () => {
        expect(routeFocusAction(change({ visit: null }))).toBe('heading');
    });

    it('leaves a form submit alone while its control keeps focus', () => {
        expect(
            routeFocusAction(
                change({
                    visit: { method: 'post', preserveScroll: false },
                    focusLost: false,
                }),
            ),
        ).toBe('none');
    });

    it('steps in when a submit redirected away and took focus with it', () => {
        expect(
            routeFocusAction(
                change({ visit: { method: 'post', preserveScroll: false } }),
            ),
        ).toBe('heading');
    });
});
