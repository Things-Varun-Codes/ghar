import { describe, expect, it } from 'vitest';

import { doneByLine } from './done-by';
import type { DoneMark } from './done-by';

const mark = (id: number, name: string): DoneMark => ({
    person: { id, name, avatar_url: null },
    on: '2026-11-20',
});

describe('doneByLine', () => {
    it('is just the label when nobody has marked it', () => {
        expect(doneByLine('Loved', [], 1)).toBe('Loved');
    });

    it('names one person, and calls the viewer you', () => {
        expect(doneByLine('Loved', [mark(2, 'Meera')], 1)).toBe(
            'Loved by Meera',
        );
        expect(doneByLine('Loved', [mark(1, 'Asha')], 1)).toBe('Loved by you');
    });

    it('puts you first and joins the rest', () => {
        expect(
            doneByLine('Loved', [mark(2, 'Meera'), mark(1, 'Asha')], 1),
        ).toBe('Loved by you and Meera');
        expect(
            doneByLine(
                'Visited',
                [mark(2, 'Meera'), mark(3, 'Kabir'), mark(1, 'Asha')],
                1,
            ),
        ).toBe('Visited by you, Meera and Kabir');
    });

    it('counts the rest past three names', () => {
        expect(
            doneByLine(
                'Read',
                [
                    mark(2, 'Meera'),
                    mark(3, 'Kabir'),
                    mark(4, 'Ravi'),
                    mark(1, 'Asha'),
                ],
                1,
            ),
        ).toBe('Read by you, Meera and 2 more');
    });
});
