import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { patchRows, useConvertingRows } from './useConvertingRows';

const { reload, replaceProp } = vi.hoisted(() => ({
    reload: vi.fn(),
    replaceProp: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ router: { reload, replaceProp } }));

type Row = { id: number; pending: boolean };

const row = (id: number, pending = false): Row => ({ id, pending });

describe('patchRows', () => {
    it('swaps in the fresh rows by id and keeps every other row as it was', () => {
        const rows = [row(1), row(2, true), row(3)];
        const fresh = row(2);

        const patched = patchRows(rows, [fresh]);

        expect(patched).toEqual([row(1), fresh, row(3)]);
        expect(patched[0]).toBe(rows[0]);
        expect(patched[1]).toBe(fresh);
        expect(patched[2]).toBe(rows[2]);
    });

    it('returns the same array when no fresh row is on the list', () => {
        const rows = [row(1), row(2)];

        expect(patchRows(rows, [row(9)])).toBe(rows);
    });
});

describe('useConvertingRows', () => {
    afterEach(() => {
        vi.useRealTimers();
        reload.mockReset();
        replaceProp.mockReset();
    });

    const isConverting = (r: Row) => r.pending;

    it('polls nothing while no row is converting', () => {
        vi.useFakeTimers();
        renderHook(() => useConvertingRows('media', [row(1)], isConverting));

        vi.advanceTimersByTime(20_000);

        expect(reload).not.toHaveBeenCalled();
    });

    it('asks for only the converting rows, without touching the scroll prop or the address bar', () => {
        vi.useFakeTimers();
        renderHook(() =>
            useConvertingRows(
                'media',
                [row(1), row(2, true), row(3, true)],
                isConverting,
            ),
        );

        vi.advanceTimersByTime(4000);

        expect(reload).toHaveBeenCalledTimes(1);
        expect(reload.mock.calls[0][0]).toMatchObject({
            only: ['converting'],
            data: { converting: '2,3' },
            preserveUrl: true,
            async: true,
        });
    });

    it('patches the rows the list holds when the answer lands, so pages loaded meanwhile stay', () => {
        vi.useFakeTimers();
        renderHook(() =>
            useConvertingRows('events', [row(2, true)], isConverting),
        );
        vi.advanceTimersByTime(4000);

        const done = row(2);
        reload.mock.calls[0][0].onSuccess({ props: { converting: [done] } });

        expect(replaceProp).toHaveBeenCalledTimes(1);
        const [path, update] = replaceProp.mock.calls[0];
        expect(path).toBe('events.data');

        // By now a later page has arrived below.
        const current = [row(1), row(2, true), row(21), row(22)];
        expect(update(current)).toEqual([row(1), done, row(21), row(22)]);
    });

    it('leaves the list alone when the answer holds no rows', () => {
        vi.useFakeTimers();
        renderHook(() =>
            useConvertingRows('events', [row(2, true)], isConverting),
        );
        vi.advanceTimersByTime(4000);

        reload.mock.calls[0][0].onSuccess({ props: { converting: [] } });

        expect(replaceProp).not.toHaveBeenCalled();
    });
});
