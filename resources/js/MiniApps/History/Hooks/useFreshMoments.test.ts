import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { reactions, testMoment } from '@/MiniApps/History/lib/testMoment';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import { findMoment, useFreshMoments } from './useFreshMoments';

const meera = { id: 3, name: 'Meera', avatar_url: null };

const comment = {
    id: 1,
    body: 'What a day',
    author: meera,
    created_at: '2024-06-05T10:00:00Z',
    can: { delete: false },
};

type Props = {
    moment: HistoryEvent | null;
    rows: HistoryEvent[];
    others: HistoryEvent[];
};

function setup(initial: Props) {
    return renderHook(
        ({ moment, rows, others }: Props) =>
            useFreshMoments(moment, rows, others),
        { initialProps: initial },
    );
}

describe('useFreshMoments', () => {
    const row5 = testMoment({ id: 5 });
    const row6 = testMoment({ id: 6, title: 'Another day' });
    const rows = [row5, row6];

    it('leaves the rows alone until a fresh moment arrives', () => {
        const { result } = setup({ moment: row5, rows, others: [] });

        expect(result.current.rows).toBe(rows);
    });

    it("patches a loaded card's reactions and comments from the fresh moment", () => {
        const { result, rerender } = setup({ moment: null, rows, others: [] });

        const fresh = testMoment({
            id: 5,
            reactions: reactions({
                heart: { count: 1, mine: true, people: [meera] },
            }),
            comments: [comment],
        });
        rerender({ moment: fresh, rows, others: [] });

        const [patched, untouched] = result.current.rows;
        expect(patched.reactions[0].count).toBe(1);
        expect(patched.comments).toEqual([comment]);
        expect(patched.title).toBe(row5.title);
        expect(untouched).toBe(row6);
    });

    it('patches every copy on the page, an "On this day" card too', () => {
        const otd = testMoment({ id: 5 });
        const { result, rerender } = setup({
            moment: null,
            rows,
            others: [otd],
        });

        rerender({
            moment: testMoment({ id: 5, comments: [comment] }),
            rows,
            others: [otd],
        });

        expect(result.current.others[0].comments).toEqual([comment]);
    });

    it('keeps a patch after the moment prop moves on to another moment', () => {
        const { result, rerender } = setup({ moment: null, rows, others: [] });

        rerender({
            moment: testMoment({ id: 5, comments: [comment] }),
            rows,
            others: [],
        });
        rerender({
            moment: testMoment({ id: 6, comments: [] }),
            rows,
            others: [],
        });

        expect(result.current.rows[0].comments).toEqual([comment]);
    });

    it('keeps a patch when load more appends rows', () => {
        const { result, rerender } = setup({ moment: null, rows, others: [] });
        const fresh = testMoment({ id: 5, comments: [comment] });

        rerender({ moment: fresh, rows, others: [] });
        rerender({
            moment: fresh,
            rows: [...rows, testMoment({ id: 7 })],
            others: [],
        });

        expect(result.current.rows[0].comments).toEqual([comment]);
        expect(result.current.rows).toHaveLength(3);
    });

    it('lets a row the server sends later win over the older patch', () => {
        const { result, rerender } = setup({ moment: null, rows, others: [] });

        const fresh = testMoment({ id: 5, comments: [comment] });
        rerender({ moment: fresh, rows, others: [] });

        const reseeded = testMoment({ id: 5, comments: [] });
        rerender({
            moment: fresh,
            rows: [reseeded, row6],
            others: [],
        });

        expect(result.current.rows[0]).toBe(reseeded);
    });
});

describe('findMoment', () => {
    const row = testMoment({ id: 5 });
    const otd = testMoment({ id: 9 });

    it('prefers the loaded row', () => {
        expect(findMoment(5, [row], [], testMoment({ id: 5 }))).toBe(row);
    });

    it('falls back to the moment prop for one past the loaded rows', () => {
        const deep = testMoment({ id: 40 });

        expect(findMoment(40, [row], [otd], deep)).toBe(deep);
    });

    it('finds a moment shown only in the "On this day" strip', () => {
        expect(findMoment(9, [row], [otd], null)).toBe(otd);
    });

    it('finds nothing for no id or an unknown one', () => {
        expect(findMoment(null, [row], [otd], row)).toBeNull();
        expect(findMoment(77, [row], [otd], null)).toBeNull();
    });
});
