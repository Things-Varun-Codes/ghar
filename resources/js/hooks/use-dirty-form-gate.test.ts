import type { InertiaFormProps } from '@inertiajs/react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDirtyFormGate } from './use-dirty-form-gate';

type FormData = { title: string; body_html: string };

function makeForm<T extends object>(data: T): InertiaFormProps<T> {
    return { data } as unknown as InertiaFormProps<T>;
}

describe('useDirtyFormGate', () => {
    it('is clean on mount — gate(false) never blocks closing an untouched form', () => {
        const { result } = renderHook(() =>
            useDirtyFormGate(makeForm({ title: 'T', body_html: 'B' })),
        );

        expect(result.current.isDirty).toBe(false);
        expect(result.current.gate(false)).toBe(true);
    });

    it('dirty blocks close but never blocks open', () => {
        const { result, rerender } = renderHook(
            ({ data }: { data: FormData }) => useDirtyFormGate(makeForm(data)),
            { initialProps: { data: { title: 'T', body_html: 'B' } } },
        );

        rerender({ data: { title: 'CHANGED', body_html: 'B' } });

        expect(result.current.isDirty).toBe(true);
        expect(result.current.gate(false)).toBe(false);
        expect(result.current.gate(true)).toBe(true);
    });

    it('type-then-revert returns to clean (the load-bearing snapshot-comparison guarantee)', () => {
        const { result, rerender } = renderHook(
            ({ data }: { data: FormData }) => useDirtyFormGate(makeForm(data)),
            { initialProps: { data: { title: 'T', body_html: 'B' } } },
        );

        rerender({ data: { title: 'CHANGED', body_html: 'B' } });
        expect(result.current.isDirty).toBe(true);

        rerender({ data: { title: 'T', body_html: 'B' } });
        expect(result.current.isDirty).toBe(false);
    });

    it('field subsetting: an unwatched key never dirties, a watched key does', () => {
        const { result, rerender } = renderHook(
            ({ data }: { data: FormData }) =>
                useDirtyFormGate(makeForm(data), { fields: ['title'] }),
            { initialProps: { data: { title: 'T', body_html: 'B' } } },
        );

        rerender({ data: { title: 'T', body_html: 'CHANGED' } });
        expect(result.current.isDirty).toBe(false);

        rerender({ data: { title: 'CHANGED', body_html: 'CHANGED' } });
        expect(result.current.isDirty).toBe(true);
    });

    it('with no fields option, any key change dirties the form', () => {
        const { result, rerender } = renderHook(
            ({ data }: { data: FormData }) => useDirtyFormGate(makeForm(data)),
            { initialProps: { data: { title: 'T', body_html: 'B' } } },
        );

        rerender({ data: { title: 'T', body_html: 'CHANGED' } });
        expect(result.current.isDirty).toBe(true);
    });

    it('reset() with no argument re-snapshots — nine consumers call it this way', () => {
        const { result, rerender } = renderHook(
            ({ data }: { data: FormData }) => useDirtyFormGate(makeForm(data)),
            { initialProps: { data: { title: 'T', body_html: 'B' } } },
        );

        rerender({ data: { title: 'CHANGED', body_html: 'B' } });
        expect(result.current.isDirty).toBe(true);

        act(() => {
            result.current.reset();
        });
        expect(result.current.isDirty).toBe(false);

        // Proves reset re-snapshotted rather than latching the flag off —
        // a further change must dirty the form again.
        rerender({ data: { title: 'CHANGED AGAIN', body_html: 'B' } });
        expect(result.current.isDirty).toBe(true);
    });

    it('reset(overrides) — the EventForm debounce-landing-late path', () => {
        const { result, rerender } = renderHook(
            ({ data }: { data: FormData }) => useDirtyFormGate(makeForm(data)),
            {
                initialProps: {
                    data: { title: 'T', body_html: 'pre-debounce' },
                },
            },
        );

        act(() => {
            result.current.reset({ body_html: 'saved-content' });
        });
        expect(result.current.isDirty).toBe(false);

        rerender({ data: { title: 'T', body_html: 'saved-content' } });
        expect(result.current.isDirty).toBe(false);
    });

    it('the contrast case: reset() with no argument flashes dirty when the debounce lands late', () => {
        // Identical sequence to the previous case, but calling reset() with
        // no argument. Without this pair, the overrides case could pass for
        // the wrong reason.
        const { result, rerender } = renderHook(
            ({ data }: { data: FormData }) => useDirtyFormGate(makeForm(data)),
            {
                initialProps: {
                    data: { title: 'T', body_html: 'pre-debounce' },
                },
            },
        );

        act(() => {
            result.current.reset();
        });
        expect(result.current.isDirty).toBe(false);

        rerender({ data: { title: 'T', body_html: 'saved-content' } });
        expect(result.current.isDirty).toBe(true);
    });
});
