import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { MUTATION_FAILED_MESSAGE } from '@/lib/mutation';
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

const { toastFn, toastDismiss, toastError } = vi.hoisted(() => {
    const dismiss = vi.fn();
    const error = vi.fn();
    const fn = vi.fn(() => 'toast-id-1') as Mock & {
        dismiss: typeof dismiss;
        error: typeof error;
    };
    fn.dismiss = dismiss;
    fn.error = error;

    return { toastFn: fn, toastDismiss: dismiss, toastError: error };
});

const { captureException } = vi.hoisted(() => ({
    captureException: vi.fn(),
}));

vi.mock('@sentry/react', () => ({ captureException }));

type VisitOptions = {
    onFinish?: () => void;
    onNetworkError?: (error: Error) => boolean | void;
    onHttpException?: (response: { status: number }) => boolean | void;
};

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
        expect(routerDelete).toHaveBeenCalledWith(
            '/apps/our-corner/songs/7',
            expect.objectContaining({ preserveScroll: true }),
        );
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
        expect(routerDelete).toHaveBeenCalledWith(
            '/apps/our-corner/songs/7',
            expect.objectContaining({ preserveScroll: true }),
        );
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
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('ignores a second tap while the toggle is in flight, and accepts one after it settles', () => {
        const { result } = renderHook(() =>
            useItemActions({ type: 'songs', id: 7, title: 'Yellow' }),
        );

        act(() => {
            result.current.handleToggleDone();
            result.current.handleToggleDone();
        });

        expect(routerPatch).toHaveBeenCalledTimes(1);
        expect(result.current.isTogglePending).toBe(true);

        const options = routerPatch.mock.calls[0][2] as VisitOptions;

        act(() => {
            options.onFinish?.();
        });

        expect(result.current.isTogglePending).toBe(false);

        act(() => {
            result.current.handleToggleDone();
        });

        expect(routerPatch).toHaveBeenCalledTimes(2);
    });

    it('a failed toggle toasts, reports, and suppresses the Inertia error surface', () => {
        const { result } = renderHook(() =>
            useItemActions({ type: 'songs', id: 7, title: 'Yellow' }),
        );

        act(() => {
            result.current.handleToggleDone();
        });

        const options = routerPatch.mock.calls[0][2] as VisitOptions;
        let returned: boolean | void;

        act(() => {
            returned = options.onNetworkError?.(new Error('offline'));
        });

        expect(returned!).toBe(false);
        expect(toastError).toHaveBeenCalledWith(MUTATION_FAILED_MESSAGE);
        expect(captureException).toHaveBeenCalledTimes(1);
    });

    it('a failed deferred delete brings the row back and says so', () => {
        const { result } = renderHook(() =>
            useItemActions({ type: 'songs', id: 7, title: 'Yellow' }),
        );

        act(() => {
            result.current.handleDelete();
        });
        act(() => {
            vi.advanceTimersByTime(DELETE_GRACE_PERIOD_MS);
        });

        const options = routerDelete.mock.calls[0][1] as VisitOptions;

        act(() => {
            options.onHttpException?.({ status: 500 });
        });

        expect(result.current.isPendingDelete).toBe(false);
        expect(toastError).toHaveBeenCalledWith(
            "Couldn't remove Yellow. Try again.",
        );
        expect(captureException).toHaveBeenCalledTimes(1);
    });
});
