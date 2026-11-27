import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { describe, expect, it } from 'vitest';

import type { IconIndex } from '@/Shell/linkables/lucide';
import names from '../../../../app/Shell/Support/lucide-icon-names.json';
import index from '../linkables/lucide-index.json';
import paths from '../linkables/lucide-paths.json';
import {
    HEADING_HEIGHT,
    ROW_HEIGHT,
    columnsFor,
    layoutRows,
    moveActive,
    searchIcons,
    sectionAt,
} from './icon-picker';

const all = Object.keys(paths.paths).sort();

describe('the icon data', () => {
    it('draws exactly the icons the server accepts and lucide-react has', () => {
        // Re-run scripts/lucide-icons.mjs after upgrading lucide-react.
        const drawable = [...all, ...Object.keys(paths.aliases)].sort();

        expect(drawable).toEqual([...names].sort());
        expect(drawable).toEqual(Object.keys(dynamicIconImports).sort());
    });
});

describe('searching icons', () => {
    const search = (q: string) =>
        searchIcons(index as unknown as IconIndex, all, q);

    it('puts the exact name first', () => {
        expect(search('pizza')[0]).toBe('pizza');
    });

    it('finds icons by their tags', () => {
        const food = search('food');

        expect(food).toEqual(
            expect.arrayContaining(['pizza', 'utensils', 'coffee']),
        );
    });

    it('needs every word to match', () => {
        expect(search('book open')).toContain('book-open');
        expect(search('book zzzz')).toEqual([]);
    });

    it('finds nothing for nothing', () => {
        expect(search('   ')).toEqual([]);
    });
});

describe('laying out the grid', () => {
    const sections = [
        { key: 'a', title: 'A', icons: ['1', '2', '3', '4', '5'] },
        { key: 'empty', title: 'Empty', icons: [] },
        { key: 'b', title: 'B', icons: ['6', '7'] },
    ];

    it('fits as many 44px cells as the width allows', () => {
        expect(columnsFor(344)).toBe(7);
        expect(columnsFor(100)).toBe(4);
    });

    it('stacks a heading and rows per section, skipping empty ones', () => {
        const { rows, height } = layoutRows(sections, 3);

        expect(rows.map((r) => r.kind)).toEqual([
            'heading',
            'icons',
            'icons',
            'heading',
            'icons',
        ]);
        expect(height).toBe(2 * HEADING_HEIGHT + 3 * ROW_HEIGHT);
        expect(rows[4]).toMatchObject({ first: 5, icons: ['6', '7'] });
    });

    it('moves with the arrows, keeping the column across rows and sections', () => {
        const { rows } = layoutRows(sections, 3);

        expect(moveActive(rows, -1, 'ArrowDown')).toBe(0);
        expect(moveActive(rows, 1, 'ArrowDown')).toBe(4);
        expect(moveActive(rows, 2, 'ArrowDown')).toBe(4);
        expect(moveActive(rows, 4, 'ArrowDown')).toBe(6);
        expect(moveActive(rows, 6, 'ArrowDown')).toBe(6);
        expect(moveActive(rows, 5, 'ArrowUp')).toBe(3);
        expect(moveActive(rows, 6, 'ArrowRight')).toBe(6);
        expect(moveActive(rows, 0, 'ArrowLeft')).toBe(0);
    });

    it('names the section being scrolled through', () => {
        const { rows } = layoutRows(sections, 3);

        expect(sectionAt(rows, 0)?.key).toBe('a');
        expect(sectionAt(rows, HEADING_HEIGHT + 2 * ROW_HEIGHT + 1)?.key).toBe(
            'b',
        );
    });
});
