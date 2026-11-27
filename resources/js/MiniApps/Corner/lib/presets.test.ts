import { describe, expect, it } from 'vitest';

import paths from '@/Shell/linkables/lucide-paths.json';

import { LIST_ICONS, SUGGESTED_LISTS } from './presets';

describe('list presets', () => {
    it('only offer icons that exist', () => {
        const known = (n: string) => n in paths.paths || n in paths.aliases;

        expect(LIST_ICONS.filter((n) => !known(n))).toEqual([]);
        expect(
            SUGGESTED_LISTS.map((list) => list.icon).filter((n) => !known(n)),
        ).toEqual([]);
    });
});
