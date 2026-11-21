import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useListNavigation } from './useListNavigation';

const { routerGet } = vi.hoisted(() => ({ routerGet: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { get: routerGet } }));

type GetOptions = {
    preserveScroll: boolean;
    preserveState: boolean;
    only?: string[];
    onFinish?: () => void;
};

function lastCall() {
    const calls = routerGet.mock.calls;

    return calls[calls.length - 1] as [string, unknown, GetOptions];
}

describe('useListNavigation', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('merges a patch onto the existing query string', () => {
        window.history.replaceState(
            null,
            '',
            '/apps/our-shelf/songs?filter=active',
        );
        const { result } = renderHook(() => useListNavigation());

        act(() => result.current.navigate({ sort: 'recent' }));

        expect(lastCall()[0]).toBe(
            '/apps/our-shelf/songs?filter=active&sort=recent',
        );
    });

    it('drops a key on undefined or an empty string, and the question mark with the last one', () => {
        const { result } = renderHook(() => useListNavigation());

        for (const value of [undefined, '']) {
            window.history.replaceState(
                null,
                '',
                '/apps/our-shelf/songs?filter=active',
            );
            act(() => result.current.navigate({ filter: value }));
            expect(lastCall()[0]).toBe('/apps/our-shelf/songs');
        }
    });

    it('visits the whole page: preserveScroll false, preserveState true, no only key', () => {
        const { result } = renderHook(() => useListNavigation());

        act(() => result.current.navigate({ sort: 'recent' }));

        const options = lastCall()[2];
        expect(options.preserveScroll).toBe(false);
        expect(options.preserveState).toBe(true);
        expect('only' in options).toBe(false);
    });

    it('shows navigating only once a visit has been pending for 250ms', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useListNavigation());

        act(() => result.current.navigate({ sort: 'x' }));
        expect(result.current.navigating).toBe(false);

        act(() => vi.advanceTimersByTime(249));
        expect(result.current.navigating).toBe(false);

        act(() => vi.advanceTimersByTime(1));
        expect(result.current.navigating).toBe(true);
    });

    it('a visit that finishes before 250ms never shows navigating', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useListNavigation());

        act(() => result.current.navigate({ sort: 'y' }));
        act(() => lastCall()[2].onFinish?.());
        act(() => vi.advanceTimersByTime(300));

        expect(result.current.navigating).toBe(false);
    });

    it('an older visit finishing does not clear a newer visit`s navigating flag', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useListNavigation());

        act(() => result.current.navigate({ sort: '1' }));
        const first = lastCall()[2];
        act(() => result.current.navigate({ sort: '2' }));
        act(() => vi.advanceTimersByTime(250));
        expect(result.current.navigating).toBe(true);

        act(() => first.onFinish?.());
        expect(result.current.navigating).toBe(true);
    });
});
