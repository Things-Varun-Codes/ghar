import type { router as inertiaRouter } from '@inertiajs/react';
import { describe, expect, it, vi } from 'vitest';

import { installStaleHistoryReload } from '@/lib/stale-history';

type Handler = (event: { detail: Record<string, unknown> }) => void;

function fakeRouter() {
    const handlers: Record<string, Handler[]> = {};
    const visit = vi.fn();
    const router = {
        on(name: string, handler: Handler) {
            (handlers[name] ??= []).push(handler);

            return () => {};
        },
        visit,
    } as unknown as typeof inertiaRouter;

    const fire = (name: string, detail: Record<string, unknown>) =>
        handlers[name]?.forEach((handler) => handler({ detail }));

    return {
        router,
        visit,
        finish: (method: string) => fire('finish', { visit: { method } }),
        navigate: (type: 'initial' | 'visit' | 'history') =>
            fire('navigate', { page: { url: '/x' }, type }),
    };
}

describe('pages restored from history', () => {
    it('stay as saved while nothing has been written', () => {
        const inertia = fakeRouter();
        installStaleHistoryReload(inertia.router);

        inertia.finish('get');
        inertia.navigate('history');

        expect(inertia.visit).not.toHaveBeenCalled();
    });

    // An item's picture changed, then back to the list: the list kept the old picture until a
    // browser refresh.
    it('ask for their props again after a write', () => {
        const inertia = fakeRouter();
        installStaleHistoryReload(inertia.router);

        inertia.finish('patch');
        inertia.navigate('history');

        expect(inertia.visit).toHaveBeenCalledWith(window.location.href, {
            replace: true,
            preserveScroll: true,
            preserveState: false,
        });
    });

    it('only reload for back and forward, not for ordinary visits', () => {
        const inertia = fakeRouter();
        installStaleHistoryReload(inertia.router);

        inertia.finish('post');
        inertia.navigate('visit');
        inertia.navigate('initial');

        expect(inertia.visit).not.toHaveBeenCalled();
    });
});
