import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { DELETE_GRACE_PERIOD_MS, useItemActions } from './useItemActions';
import type { CornerItemType } from './useItemActions';

const { routerPatch, routerDelete } = vi.hoisted(() => ({
    routerPatch: vi.fn(),
    routerDelete: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: {
        patch: routerPatch,
        delete: routerDelete,
    },
}));

const { toastFn, toastDismiss } = vi.hoisted(() => {
    const dismiss = vi.fn();
    const fn = vi.fn(() => 'toast-id-1') as Mock & { dismiss: typeof dismiss };
    fn.dismiss = dismiss;

    return { toastFn: fn, toastDismiss: dismiss };
});

vi.mock('sonner', () => ({
    toast: toastFn,
}));

type UndoAction = { label: string; onClick: () => void };
type ToastCallOptions = { duration: number; action: UndoAction };

describe('useItemActions', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('hides the row immediately, issues no request before the grace period, and fires exactly at it', () => {
        const { result } = renderHook(() =>
            useItemActions({ type: 'songs', id: 7, title: 'Yellow' }),
        );

        act(() => {
            result.current.handleDelete();
        });

        expect(result.current.isPendingDelete).toBe(true);
        expect(routerDelete).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(4999);
        });
        expect(routerDelete).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(routerDelete).toHaveBeenCalledTimes(1);
        expect(routerDelete).toHaveBeenCalledWith('/apps/our-corner/songs/7', {
            preserveScroll: true,
        });
    });

    it('undo inside the window cancels entirely — no network request ever fires', () => {
        const { result } = renderHook(() =>
            useItemActions({ type: 'songs', id: 7, title: 'Yellow' }),
        );

        act(() => {
            result.current.handleDelete();
        });
        act(() => {
            vi.advanceTimersByTime(2000);
        });
        act(() => {
            result.current.handleUndo();
        });

        expect(toastDismiss).toHaveBeenCalledWith('toast-id-1');
        expect(result.current.isPendingDelete).toBe(false);

        act(() => {
            vi.advanceTimersByTime(10000);
        });
        expect(routerDelete).not.toHaveBeenCalled();
    });

    it('the toast Undo action is wired to the real undo path, not just the exported handleUndo', () => {
        const { result } = renderHook(() =>
            useItemActions({ type: 'songs', id: 7, title: 'Yellow' }),
        );

        act(() => {
            result.current.handleDelete();
        });

        const toastOptions = toastFn.mock.calls[0][1] as ToastCallOptions;

        // The constant is the contract — never hardcode 5000 in this
        // assertion.
        expect(toastOptions.duration).toBe(DELETE_GRACE_PERIOD_MS);
        expect(toastOptions.action.label).toBe('Undo');

        act(() => {
            toastOptions.action.onClick();
        });

        expect(result.current.isPendingDelete).toBe(false);

        act(() => {
            vi.advanceTimersByTime(10000);
        });
        expect(routerDelete).not.toHaveBeenCalled();
    });

    it('falls back to the generic item wording when title is null', () => {
        const { result } = renderHook(() =>
            useItemActions({ type: 'songs', id: 7, title: null }),
        );

        act(() => {
            result.current.handleDelete();
        });

        const message = toastFn.mock.calls[toastFn.mock.calls.length - 1][0];
        expect(message).toBe('Removed item');
    });

    it('raises the toast before invoking onDeleted', () => {
        const onDeleted = vi.fn();
        const { result } = renderHook(() =>
            useItemActions({
                type: 'songs',
                id: 7,
                title: 'Yellow',
                onDeleted,
            }),
        );

        act(() => {
            result.current.handleDelete();
        });

        expect(onDeleted).toHaveBeenCalledTimes(1);
        expect(toastFn.mock.invocationCallOrder[0]).toBeLessThan(
            onDeleted.mock.invocationCallOrder[0],
        );
    });

    it('does NOT cancel the deferred delete on unmount (no teardown)', () => {
        const { result, unmount } = renderHook(() =>
            useItemActions({ type: 'songs', id: 7, title: 'Yellow' }),
        );

        act(() => {
            result.current.handleDelete();
        });

        unmount();

        act(() => {
            vi.advanceTimersByTime(DELETE_GRACE_PERIOD_MS);
        });

        expect(routerDelete).toHaveBeenCalledTimes(1);
        expect(routerDelete).toHaveBeenCalledWith('/apps/our-corner/songs/7', {
            preserveScroll: true,
        });
    });

    it.each<[CornerItemType, string]>([
        ['songs', '/apps/our-corner/songs/7/toggle-done'],
        ['movies', '/apps/our-corner/movies/7/toggle-done'],
        ['activities', '/apps/our-corner/activities/7/toggle-done'],
        ['places', '/apps/our-corner/places/7/toggle-done'],
    ])('routes toggle-done for %s to the correct URL', (type, expectedUrl) => {
        const { result } = renderHook(() =>
            useItemActions({ type, id: 7, title: 'Item' }),
        );

        act(() => {
            result.current.handleToggleDone();
        });

        expect(routerPatch).toHaveBeenCalledWith(
            expectedUrl,
            {},
            { preserveScroll: true },
        );
    });
});
