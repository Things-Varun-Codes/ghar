import type { router as inertiaRouter } from '@inertiajs/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PageChange } from '@/lib/navigation';
import {
    installNavigation,
    onPageChange,
    previousUrl,
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

    return {
        router,
        before: (id: string, visit: Record<string, unknown> = {}) =>
            fire('before', {
                visit: {
                    id,
                    method: 'get',
                    preserveScroll: false,
                    prefetch: false,
                    ...visit,
                },
            }),
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
        expect(previousUrl()).toBe('/dashboard');
    });

    it('records a replace visit, which fires no navigate', () => {
        inertia.before('v1');
        inertia.success('/apps/our-corner', 'v1');

        expect(changes[1].previousPath).toBe('/dashboard');
        expect(previousUrl()).toBe('/dashboard');
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
        expect(previousUrl()).toBe('/apps/our-corner');
    });

    it('keeps the previous page across a client-side visit to the same path', () => {
        inertia.before('v1');
        inertia.navigate('/apps/our-history', 'visit', 'v1');
        inertia.success('/apps/our-history', 'v1');
        inertia.navigate('/apps/our-history?moment=4', 'visit', 'c1');

        expect(changes).toHaveLength(2);
        expect(previousUrl()).toBe('/dashboard');
    });

    it('reports a same-path visit with the same path before and after', () => {
        inertia.before('v1');
        inertia.navigate('/apps/our-corner/songs', 'visit', 'v1');
        inertia.success('/apps/our-corner/songs', 'v1');
        inertia.before('v2');
        inertia.navigate('/apps/our-corner/songs?q=rain', 'visit', 'v2');
        inertia.success('/apps/our-corner/songs?q=rain', 'v2');

        expect(changes[2].previousPath).toBe('/apps/our-corner/songs');
        expect(previousUrl()).toBe('/dashboard');
    });

    it('stops reporting to a listener that unsubscribed', () => {
        const seen: PageChange[] = [];
        const stop = onPageChange((change) => seen.push(change));
        stop();
        inertia.navigate('/apps/our-corner', 'history');

        expect(seen).toEqual([]);
    });
});
