import type { router as inertiaRouter } from '@inertiajs/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PageChange } from '@/lib/navigation';
import {
    installNavigation,
    onPageChange,
    previousPath,
    resetNavigationForTests,
} from '@/lib/navigation';

type Handler = (event: { detail: Record<string, unknown> }) => void;

function fakeRouter() {
    const handlers: Record<string, Handler[]> = {};
    const router = {
        on(name: string, handler: Handler) {
            (handlers[name] ??= []).push(handler);

            return () => {};
        },
    } as unknown as typeof inertiaRouter;

    const fire = (name: string, detail: Record<string, unknown>) =>
        handlers[name]?.forEach((handler) => handler({ detail }));

    const before = (
        id: string,
        visit: Record<string, unknown> = {},
        url = '/somewhere-else',
    ) => {
        const pending: Record<string, unknown> = {
            id,
            url: new URL(url, 'http://ghar.test'),
            method: 'get',
            preserveScroll: false,
            prefetch: false,
            replace: false,
            ...visit,
        };
        fire('before', { visit: pending });

        return pending;
    };

    return {
        router,
        before,
        /** A get that pushes a history entry. */
        visit: (id: string, url: string) => {
            before(id, {}, url);
            fire('navigate', { page: { url }, type: 'visit', visitId: id });
            fire('success', { page: { url }, visitId: id });
        },
        navigate: (
            url: string,
            type: 'initial' | 'visit' | 'history',
            visitId?: string,
        ) => fire('navigate', { page: { url }, type, visitId }),
        success: (url: string, visitId?: string) =>
            fire('success', { page: { url }, visitId }),
    };
}

describe('navigation tracker', () => {
    let inertia: ReturnType<typeof fakeRouter>;
    let changes: PageChange[];

    beforeEach(() => {
        resetNavigationForTests();
        inertia = fakeRouter();
        installNavigation(inertia.router);
        changes = [];
        onPageChange((change) => changes.push(change));
        inertia.navigate('/dashboard', 'initial', 'v0');
    });

    it('reports the first load with no previous page', () => {
        expect(changes).toEqual([
            {
                url: '/dashboard',
                path: '/dashboard',
                previousPath: null,
                visit: { method: 'get', preserveScroll: true },
            },
        ]);
    });

    it('reports a visit once, on success, with the page it left and its options', () => {
        inertia.before('v1', { method: 'POST', preserveScroll: true });
        inertia.navigate('/apps/our-corner/songs', 'visit', 'v1');
        inertia.success('/apps/our-corner/songs', 'v1');

        expect(changes.slice(1)).toEqual([
            {
                url: '/apps/our-corner/songs',
                path: '/apps/our-corner/songs',
                previousPath: '/dashboard',
                visit: { method: 'post', preserveScroll: true },
            },
        ]);
        expect(previousPath()).toBe('/dashboard');
    });

    it('records a replace visit, which fires no navigate', () => {
        inertia.before('v1');
        inertia.success('/apps/our-corner', 'v1');

        expect(changes[1].previousPath).toBe('/dashboard');
        // The entry was rewritten, so the dashboard is no longer under it.
        expect(previousPath()).toBeNull();
    });

    it('reads the options of a visit served from the prefetch cache', () => {
        inertia.before('p1', { prefetch: true, preserveScroll: true });
        inertia.before('v1');
        inertia.navigate('/apps/our-history', 'visit', 'v1');
        inertia.success('/apps/our-history', 'v1');

        expect(changes[1].visit).toEqual({
            method: 'get',
            preserveScroll: false,
        });
    });

    it('treats a visit it never saw start as a plain get', () => {
        inertia.success('/apps/our-mailbox', 'unknown');

        expect(changes[1].visit).toEqual({
            method: 'get',
            preserveScroll: false,
        });
    });

    it('reports back and forward without visit options', () => {
        inertia.before('v1');
        inertia.navigate('/apps/our-corner', 'visit', 'v1');
        inertia.success('/apps/our-corner', 'v1');
        inertia.navigate('/dashboard', 'history');

        expect(changes[2]).toMatchObject({
            path: '/dashboard',
            previousPath: '/apps/our-corner',
            visit: null,
        });
        expect(previousPath()).toBeNull();
    });

    it('knows what is under each page after stepping back', () => {
        inertia.visit('v1', '/apps/our-corner');
        inertia.visit('v2', '/apps/our-corner/songs');
        inertia.visit('v3', '/apps/our-corner/songs/4');

        inertia.navigate('/apps/our-corner/songs', 'history');
        expect(previousPath()).toBe('/apps/our-corner');

        inertia.navigate('/apps/our-corner', 'history');
        expect(previousPath()).toBe('/dashboard');

        inertia.navigate('/apps/our-corner/songs', 'history');
        expect(previousPath()).toBe('/apps/our-corner');
    });

    it('drops the pages ahead when a visit pushes after stepping back', () => {
        inertia.visit('v1', '/apps/our-corner');
        inertia.navigate('/dashboard', 'history');
        inertia.visit('v2', '/apps/our-mailbox');

        expect(previousPath()).toBe('/dashboard');

        inertia.navigate('/apps/our-corner', 'history');
        expect(previousPath()).toBeNull();
    });

    it('keeps what is under a page that a replace visit rewrote', () => {
        inertia.visit('v1', '/apps/our-corner');
        inertia.visit('v2', '/apps/our-corner/songs/4');
        inertia.before('v3');
        inertia.success('/apps/our-corner/songs', 'v3');

        expect(previousPath()).toBe('/apps/our-corner');
    });

    it('holds a page to one history entry: a get to the path already shown replaces it', () => {
        inertia.visit('v1', '/apps/our-corner/songs');

        const url = '/apps/our-corner/songs?filter=done';

        expect(inertia.before('v2', {}, url).replace).toBe(true);
        expect(inertia.before('v3', { method: 'post' }, url).replace).toBe(
            false,
        );
        expect(inertia.before('v4', { prefetch: true }, url).replace).toBe(
            false,
        );
        expect(
            inertia.before('v5', {}, '/apps/our-corner/songs/4').replace,
        ).toBe(false);
    });

    it('claims no previous page for a history entry it never saw', () => {
        inertia.navigate('/apps/our-mailbox', 'history');

        expect(previousPath()).toBeNull();
    });

    it('keeps the previous page across a client-side visit to the same path', () => {
        inertia.before('v1');
        inertia.navigate('/apps/our-history', 'visit', 'v1');
        inertia.success('/apps/our-history', 'v1');
        inertia.navigate('/apps/our-history?moment=4', 'visit', 'c1');

        expect(changes).toHaveLength(2);
        expect(previousPath()).toBe('/dashboard');
    });

    it('reports a same-path visit with the same path before and after', () => {
        inertia.before('v1');
        inertia.navigate('/apps/our-corner/songs', 'visit', 'v1');
        inertia.success('/apps/our-corner/songs', 'v1');
        inertia.before('v2');
        inertia.success('/apps/our-corner/songs?q=rain', 'v2');

        expect(changes[2].previousPath).toBe('/apps/our-corner/songs');
        expect(previousPath()).toBe('/dashboard');
    });

    it('stops reporting to a listener that unsubscribed', () => {
        const seen: PageChange[] = [];
        const stop = onPageChange((change) => seen.push(change));
        stop();
        inertia.navigate('/apps/our-corner', 'history');

        expect(seen).toEqual([]);
    });
});
