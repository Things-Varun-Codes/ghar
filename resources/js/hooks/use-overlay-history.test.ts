import { describe, expect, it, vi } from 'vitest';

import {
    createOverlayHistory,
    withParam,
    withoutParam,
} from './use-overlay-history';
import type { OverlayHistoryEnv } from './use-overlay-history';

type Handlers = Parameters<OverlayHistoryEnv['listen']>[0];

/* A session history the way a browser keeps it: back keeps forward entries, a push drops them. */
function fakeBrowser(start = '/apps/our-history') {
    const entries = [start];
    let index = 0;
    let handlers: Handlers | null = null;
    const deferred: Array<() => void> = [];
    const pops: number[] = [];
    const visits: Array<[string, 'push' | 'replace']> = [];

    function pushUrl(url: string) {
        entries.splice(index + 1);
        entries.push(url);
        index++;
    }

    function dispatchPop(): boolean {
        const event = new Event('popstate');
        const stop = vi.spyOn(event, 'stopImmediatePropagation');
        handlers?.pop(event);

        return stop.mock.calls.length > 0;
    }

    const env: OverlayHistoryEnv = {
        length: () => entries.length,
        href: () => entries[index],
        back: () => {
            index--;
            pops.push(index);
        },
        pushSame: () => pushUrl(entries[index]),
        visit: (url, replace, onDone) => {
            visits.push([url, replace ? 'replace' : 'push']);

            if (replace) {
                entries[index] = url;
            } else {
                pushUrl(url);
            }

            onDone?.();
        },
        defer: (fn) => deferred.push(fn),
        listen: (h) => {
            handlers = h;
        },
    };

    return {
        env,
        entries,
        visits,
        get index() {
            return index;
        },
        url: () => entries[index],
        /* Runs deferred work, then delivers the popstate a history.back() queued. */
        settle(): boolean[] {
            this.flush();

            return this.deliver();
        },
        flush() {
            deferred.splice(0).forEach((fn) => fn());
        },
        deliver(): boolean[] {
            return pops.splice(0).map(() => dispatchPop());
        },
        userBack(): boolean {
            index--;

            return dispatchPop();
        },
        /* An Inertia visit that pushes a page. */
        navigate(url: string) {
            pushUrl(url);
        },
        before(method: string) {
            const visit = { method, replace: false };
            handlers?.before(visit);

            return visit.replace;
        },
    };
}

describe('useOverlayHistory state machine', () => {
    it('pushes one entry on open and steps back over it on close', () => {
        const browser = fakeBrowser();
        const overlays = createOverlayHistory(browser.env);

        const id = overlays.open(() => {});
        expect(browser.entries).toHaveLength(2);
        expect(browser.index).toBe(1);

        overlays.close(id);
        const stopped = browser.settle();

        expect(stopped).toEqual([true]); // Inertia never sees our own step back
        expect(browser.index).toBe(0);
        expect(browser.visits.at(-1)).toEqual(['/apps/our-history', 'replace']);
    });

    it('closes on back without leaving the page', () => {
        const browser = fakeBrowser();
        const overlays = createOverlayHistory(browser.env);
        const onBack = vi.fn(() => overlays.close(id));
        const id = overlays.open(onBack);

        const stopped = browser.userBack();
        browser.settle();

        expect(stopped).toBe(true);
        expect(onBack).toHaveBeenCalledTimes(1);
        expect(browser.index).toBe(0);
        expect(browser.url()).toBe('/apps/our-history');
        // The close that followed does not step back a second time.
        expect(browser.visits).toEqual([['/apps/our-history', 'replace']]);
    });

    it('restores the entry when the dirty gate keeps the overlay open', () => {
        const browser = fakeBrowser();
        const overlays = createOverlayHistory(browser.env);
        const onBack = vi.fn(); // the gate asks first; nothing closes
        const id = overlays.open(onBack);

        browser.userBack();

        expect(onBack).toHaveBeenCalledTimes(1);
        expect(browser.index).toBe(1);

        // Discard: the overlay closes, and back now leaves through one entry only.
        overlays.close(id);
        browser.settle();
        expect(browser.index).toBe(0);
    });

    it('puts a param overlay in the URL and takes it out again', () => {
        const browser = fakeBrowser('/apps/our-history?order=oldest-first');
        const overlays = createOverlayHistory(browser.env);
        const id = overlays.open(() => overlays.close(id), ['moment', '12']);

        expect(browser.url()).toBe(
            '/apps/our-history?order=oldest-first&moment=12',
        );

        browser.userBack();
        browser.settle();

        expect(browser.index).toBe(0);
        expect(browser.visits.at(-1)).toEqual([
            '/apps/our-history?order=oldest-first',
            'replace',
        ]);
    });

    it('puts the plain page under an overlay opened from its own URL', () => {
        const browser = fakeBrowser('/apps/our-history?moment=12');
        const overlays = createOverlayHistory(browser.env);
        overlays.open(() => {}, ['moment', '12']);

        expect(browser.entries).toEqual([
            '/apps/our-history',
            '/apps/our-history?moment=12',
        ]);
    });

    it('shares one entry between nested overlays', () => {
        const browser = fakeBrowser();
        const overlays = createOverlayHistory(browser.env);
        const sheet = overlays.open(() => {}, ['moment', '3']);
        const lightbox = overlays.open(() => overlays.close(lightbox));

        expect(browser.entries).toHaveLength(2);

        // Back closes the lightbox only; the sheet keeps an entry.
        browser.userBack();
        browser.settle();
        expect(browser.index).toBe(1);
        expect(browser.url()).toBe('/apps/our-history?moment=3');

        overlays.close(sheet);
        browser.settle();
        expect(browser.index).toBe(0);
    });

    it('leaves history alone when a visit pushed a page over the overlay', () => {
        const browser = fakeBrowser();
        const overlays = createOverlayHistory(browser.env);
        const id = overlays.open(() => {}, ['moment', '3']);

        browser.navigate('/apps/our-corner/songs/4');
        overlays.close(id); // the page unmounted
        browser.settle();

        expect(browser.url()).toBe('/apps/our-corner/songs/4');
        expect(browser.entries).toHaveLength(3);
    });

    it('makes a save from inside an overlay replace its entry', () => {
        const browser = fakeBrowser();
        const overlays = createOverlayHistory(browser.env);
        overlays.open(() => {});

        expect(browser.before('post')).toBe(true);
        expect(browser.before('patch')).toBe(true);
        expect(browser.before('get')).toBe(false);
    });

    it('lets Inertia handle a popstate when nothing is open', () => {
        const browser = fakeBrowser();
        const overlays = createOverlayHistory(browser.env);
        const id = overlays.open(() => {});
        overlays.close(id);
        browser.settle();

        browser.navigate('/apps/our-history/calendar');
        expect(browser.userBack()).toBe(false);
        expect(browser.before('post')).toBe(false);
    });

    it('keeps the entry when one overlay hands over to another', () => {
        const browser = fakeBrowser();
        const overlays = createOverlayHistory(browser.env);
        const first = overlays.open(() => {});

        overlays.close(first);
        overlays.open(() => {});
        browser.settle();

        expect(browser.entries).toHaveLength(2);
        expect(browser.index).toBe(1);
    });

    it('re-pushes for an overlay opened while its predecessor was stepping back', () => {
        const browser = fakeBrowser();
        const overlays = createOverlayHistory(browser.env);
        const first = overlays.open(() => {});

        overlays.close(first);
        browser.flush(); // history.back() called, its popstate not here yet
        overlays.open(() => {});
        expect(browser.index).toBe(0);

        expect(browser.deliver()).toEqual([true]);
        expect(browser.index).toBe(1);
    });
});

describe('overlay URL helpers', () => {
    it('sets and removes one query param, keeping the rest', () => {
        expect(
            withParam('/apps/our-history?order=oldest-first', 'moment', '4'),
        ).toBe('/apps/our-history?order=oldest-first&moment=4');
        expect(
            withoutParam(
                '/apps/our-history?moment=4&order=oldest-first',
                'moment',
            ),
        ).toBe('/apps/our-history?order=oldest-first');
        expect(withoutParam('/apps/our-corner/songs', null)).toBe(
            '/apps/our-corner/songs',
        );
    });
});
