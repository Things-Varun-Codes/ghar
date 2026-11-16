import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { describe, expect, it } from 'vitest';

import names from '../../../../../app/MiniApps/Corner/Support/icon-names.json';
import { ICON_GROUPS } from './icon-groups';

describe('list icons', () => {
    it('lets the server accept exactly the icons the page can draw', () => {
        // Re-run scripts/corner-icon-names.mjs after upgrading lucide-react.
        expect([...names].sort()).toEqual(
            Object.keys(dynamicIconImports).sort(),
        );
    });

    it('opens the picker only on icons that exist', () => {
        const known = new Set(names);
        const missing = ICON_GROUPS.flatMap((g) => g.icons).filter(
            (icon) => !known.has(icon),
        );

        expect(missing).toEqual([]);
    });

    it('never repeats an icon inside one group', () => {
        for (const group of ICON_GROUPS) {
            expect(new Set(group.icons).size).toBe(group.icons.length);
        }
    });
});
