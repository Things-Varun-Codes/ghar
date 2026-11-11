import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCursorPagination } from './useCursorPagination';
import type { CursorPaginator } from './useCursorPagination';

const { routerGet } = vi.hoisted(() => ({
    routerGet: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { get: routerGet },
}));

const { captureSilent } = vi.hoisted(() => ({
    captureSilent: vi.fn(),
}));

vi.mock('@/lib/observability', () => ({
    captureSilent,
}));

type Item = { id: number };

type GetOptions = {
    preserveScroll: boolean;
    preserveState: boolean;
    preserveUrl?: boolean;
    only?: string[];
    onSuccess?: (page: { props: Record<string, unknown> }) => void;
    onError?: (errors: unknown) => void;
    onNetworkError?: (error: { message: string }) => boolean;
    onHttpException?: (response: { status: number }) => boolean;
    onFinish?: () => void;
};

function lastCall() {
    const calls = routerGet.mock.calls;

    return calls[calls.length - 1] as [string, unknown, GetOptions];
}

describe('useCursorPagination', () => {
    it('seeds items from the initial paginator, re-seeds on resetKey change, and clears a stale load error on re-seed', () => {
        const initial: CursorPaginator<Item> = {
            data: [{ id: 1 }],
            next_page_url: 'https://x.test/page2',
        };
        const { result, rerender } = renderHook(
            ({
                initial,
                resetKey,
            }: {
                initial: CursorPaginator<Item>;
                resetKey: unknown[];
            }) =>
                useCursorPagination<Item>({
                    initial,
                    propName: 'songs',
                    resetKey,
                }),
            { initialProps: { initial, resetKey: ['a'] } },
        );

        expect(result.current.items).toEqual([{ id: 1 }]);

        act(() => {
            result.current.retryLoadMore();
        });
        act(() => {
            lastCall()[2].onNetworkError?.({ message: 'offline' });
        });
        expect(result.current.loadError).toBe(true);

        const nextInitial: CursorPaginator<Item> = {
            data: [{ id: 2 }],
            next_page_url: null,
        };
        rerender({ initial: nextInitial, resetKey: ['b'] });

        expect(result.current.items).toEqual([{ id: 2 }]);
        expect(result.current.loadError).toBe(false);
    });

    it('Mode-B navigate merges a patch onto the existing query string', () => {
        window.history.replaceState(
            null,
            '',
            '/apps/our-corner/songs?filter=active',
        );

        const initial: CursorPaginator<Item> = {
            data: [],
            next_page_url: null,
        };
        const { result } = renderHook(() =>
            useCursorPagination<Item>({
                initial,
                propName: 'songs',
                resetKey: [],
            }),
        );

        act(() => {
            result.current.navigate({ sort: 'recent' });
        });

        const [url] = lastCall();
        expect(url).toBe('/apps/our-corner/songs?filter=active&sort=recent');
    });

    it('navigate deletes a key on undefined or empty-string value, and drops the question mark when the last param is removed', () => {
        const initial: CursorPaginator<Item> = {
            data: [],
            next_page_url: null,
        };
        const { result } = renderHook(() =>
            useCursorPagination<Item>({
                initial,
                propName: 'songs',
                resetKey: [],
            }),
        );

        window.history.replaceState(
            null,
            '',
            '/apps/our-corner/songs?filter=active',
        );
        act(() => {
            result.current.navigate({ filter: undefined });
        });
        expect(lastCall()[0]).toBe('/apps/our-corner/songs');

        window.history.replaceState(
            null,
            '',
            '/apps/our-corner/songs?filter=active',
        );
        act(() => {
            result.current.navigate({ filter: '' });
        });
        expect(lastCall()[0]).toBe('/apps/our-corner/songs');
    });

    it('Mode-B request options carry preserveScroll:false, preserveState:true, and NO only key at all', () => {
        const initial: CursorPaginator<Item> = {
            data: [],
            next_page_url: null,
        };
        const { result } = renderHook(() =>
            useCursorPagination<Item>({
                initial,
                propName: 'songs',
                resetKey: [],
            }),
        );

        act(() => {
            result.current.navigate({ sort: 'recent' });
        });

        const options = lastCall()[2];
        expect(options.preserveScroll).toBe(false);
        expect(options.preserveState).toBe(true);
        expect('only' in options).toBe(false);
    });

    it('the 250ms navigating delay gate: false immediately, false at 249ms, true at 250ms', () => {
        vi.useFakeTimers();

        try {
            const initial: CursorPaginator<Item> = {
                data: [],
                next_page_url: null,
            };
            const { result } = renderHook(() =>
                useCursorPagination<Item>({
                    initial,
                    propName: 'songs',
                    resetKey: [],
                }),
            );

            act(() => {
                result.current.navigate({ sort: 'x' });
            });
            expect(result.current.navigating).toBe(false);

            act(() => {
                vi.advanceTimersByTime(249);
            });
            expect(result.current.navigating).toBe(false);

            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(result.current.navigating).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });

    it('a fast round-trip that finishes before the gate elapses never shows navigating', () => {
        vi.useFakeTimers();

        try {
            const initial: CursorPaginator<Item> = {
                data: [],
                next_page_url: null,
            };
            const { result } = renderHook(() =>
                useCursorPagination<Item>({
                    initial,
                    propName: 'songs',
                    resetKey: [],
                }),
            );

            act(() => {
                result.current.navigate({ sort: 'y' });
            });

            const options = lastCall()[2];
            act(() => {
                options.onFinish?.();
            });

            act(() => {
                vi.advanceTimersByTime(300);
            });
            expect(result.current.navigating).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it('the superseded-visit guard: an earlier visit`s onFinish cannot clear a newer visit`s navigating flag', () => {
        vi.useFakeTimers();

        try {
            const initial: CursorPaginator<Item> = {
                data: [],
                next_page_url: null,
            };
            const { result } = renderHook(() =>
                useCursorPagination<Item>({
                    initial,
                    propName: 'songs',
                    resetKey: [],
                }),
            );

            act(() => {
                result.current.navigate({ sort: '1' });
            });
            const firstOptions = lastCall()[2];

            act(() => {
                result.current.navigate({ sort: '2' });
            });

            act(() => {
                vi.advanceTimersByTime(250);
            });
            expect(result.current.navigating).toBe(true);

            act(() => {
                firstOptions.onFinish?.();
            });
            expect(result.current.navigating).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });

    it('Mode-A (retryLoadMore) issues the initial next_page_url request with only scoped to the prop name', () => {
        const initial: CursorPaginator<Item> = {
            data: [{ id: 1 }],
            next_page_url: 'https://x.test/page2',
        };
        const { result } = renderHook(() =>
            useCursorPagination<Item>({
                initial,
                propName: 'songs',
                resetKey: [],
            }),
        );

        act(() => {
            result.current.retryLoadMore();
        });

        const [url, , options] = lastCall();
        expect(url).toBe('https://x.test/page2');
        expect(options.only).toEqual(['songs']);
        expect(options.preserveUrl).toBe(true);
        expect(options.preserveState).toBe(true);
        expect(options.preserveScroll).toBe(true);
    });

    it('Mode-A success appends the new page and advances next_page_url', () => {
        const initial: CursorPaginator<Item> = {
            data: [{ id: 1 }],
            next_page_url: 'https://x.test/page2',
        };
        const { result } = renderHook(() =>
            useCursorPagination<Item>({
                initial,
                propName: 'songs',
                resetKey: [],
            }),
        );

        act(() => {
            result.current.retryLoadMore();
        });
        const options = lastCall()[2];

        act(() => {
            options.onSuccess?.({
                props: {
                    songs: { data: [{ id: 2 }], next_page_url: null },
                },
            });
        });

        expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]);
        expect(result.current.loadError).toBe(false);
    });

    it('a transport failure suppresses the rethrow, sets loadError, and reports exactly once', () => {
        const initial: CursorPaginator<Item> = {
            data: [{ id: 1 }],
            next_page_url: 'https://x.test/page2',
        };
        const { result } = renderHook(() =>
            useCursorPagination<Item>({
                initial,
                propName: 'songs',
                resetKey: [],
            }),
        );

        act(() => {
            result.current.retryLoadMore();
        });
        const options = lastCall()[2];

        let returned: boolean | undefined;
        act(() => {
            returned = options.onNetworkError?.({ message: 'offline' });
        });

        expect(returned).toBe(false);
        expect(result.current.loadError).toBe(true);
        expect(captureSilent).toHaveBeenCalledTimes(1);
        expect(
            (captureSilent.mock.calls[0][1] as { action: string }).action,
        ).toBe('songs.load-more');

        act(() => {
            options.onFinish?.();
        });
        expect(result.current.loadingMore).toBe(false);
    });

    it('an HTTP exception likewise suppresses the default dialog, sets loadError, and reports exactly once', () => {
        const initial: CursorPaginator<Item> = {
            data: [{ id: 1 }],
            next_page_url: 'https://x.test/page2',
        };
        const { result } = renderHook(() =>
            useCursorPagination<Item>({
                initial,
                propName: 'songs',
                resetKey: [],
            }),
        );

        act(() => {
            result.current.retryLoadMore();
        });
        const options = lastCall()[2];

        let returned: boolean | undefined;
        act(() => {
            returned = options.onHttpException?.({ status: 500 });
        });

        expect(returned).toBe(false);
        expect(result.current.loadError).toBe(true);
        expect(captureSilent).toHaveBeenCalledTimes(1);
    });

    it('with a null next_page_url, retryLoadMore issues no request at all', () => {
        const initial: CursorPaginator<Item> = {
            data: [],
            next_page_url: null,
        };
        const { result } = renderHook(() =>
            useCursorPagination<Item>({
                initial,
                propName: 'songs',
                resetKey: [],
            }),
        );

        act(() => {
            result.current.retryLoadMore();
        });

        expect(routerGet).not.toHaveBeenCalled();
    });
});
