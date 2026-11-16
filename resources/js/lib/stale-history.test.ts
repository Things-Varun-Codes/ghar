import type { router as inertiaRouter } from '@inertiajs/react';
import { describe, expect, it, vi } from 'vitest';

import { installAfterWrite } from '@/lib/stale-history';

type Handler = (event: { detail: Record<string, unknown> }) => void;

function fakeRouter() {
    const handlers: Record<string, Handler[]> = {};
    const visit = vi.fn();
    const flushAll = vi.fn();
    const router = {
        on(name: string, handler: Handler) {
            (handlers[name] ??= []).push(handler);

            return () => {};
        },
        visit,
        flushAll,
    } as unknown as typeof inertiaRouter;

    const fire = (name: string, detail: Record<string, unknown>) =>
        handlers[name]?.forEach((handler) => handler({ detail }));

    installAfterWrite(router);

    return {
        visit,
        flushAll,
        write: (method = 'patch') => fire('finish', { visit: { method } }),
        show: (url: string, type: 'initial' | 'visit' | 'history') =>
            fire('navigate', { page: { url }, type }),
    };
}

const remount = {
    replace: true,
    preserveScroll: true,
    preserveState: false,
};

describe('after a write', () => {
    it('drops prefetched pages', () => {
        const inertia = fakeRouter();

        inertia.write('get');
        expect(inertia.flushAll).not.toHaveBeenCalled();

        inertia.write('delete');
        expect(inertia.flushAll).toHaveBeenCalledTimes(1);
    });

    it('leaves pages restored by back alone while nothing has been written', () => {
        const inertia = fakeRouter();

        inertia.show('/list', 'initial');
        inertia.show('/list/1', 'visit');
        inertia.show('/list', 'history');

        expect(inertia.visit).not.toHaveBeenCalled();
    });

    // An item's picture changed, then back to the list: the list kept the old picture until a
    // browser refresh.
    it('asks again for a page last seen before the write', () => {
        const inertia = fakeRouter();

        inertia.show('/list', 'initial');
        inertia.show('/list/1', 'visit');
        inertia.write();
        inertia.show('/list', 'history');

        expect(inertia.visit).toHaveBeenCalledWith(
            window.location.href,
            remount,
        );
    });

    it('keeps a page seen since the write instant', () => {
        const inertia = fakeRouter();

        inertia.show('/list', 'initial');
        inertia.write();
        inertia.show('/list', 'visit');
        inertia.show('/other', 'visit');
        inertia.show('/list', 'history');

        expect(inertia.visit).not.toHaveBeenCalled();
    });
});
