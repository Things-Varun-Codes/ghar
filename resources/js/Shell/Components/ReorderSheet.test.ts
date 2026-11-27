import { describe, expect, it } from 'vitest';

import { moveItem } from './ReorderSheet';

describe('moveItem', () => {
    it('moves one item and keeps the rest in order', () => {
        expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual([
            'a',
            'd',
            'b',
            'c',
        ]);
        expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    });

    it('returns the same array past either end', () => {
        const items = ['a', 'b'];

        expect(moveItem(items, 0, -1)).toBe(items);
        expect(moveItem(items, 1, 2)).toBe(items);
    });
});
