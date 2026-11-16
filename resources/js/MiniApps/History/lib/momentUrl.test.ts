import { describe, expect, it } from 'vitest';

import { hasMomentParam, momentIdFromUrl } from './momentUrl';

describe('momentIdFromUrl', () => {
    it('reads a positive id', () => {
        expect(momentIdFromUrl('/apps/our-history?moment=42')).toBe(42);
        expect(
            momentIdFromUrl(
                'http://127.0.0.1:8000/apps/our-history/calendar?year=2024&moment=7',
            ),
        ).toBe(7);
    });

    it('ignores a missing or malformed id', () => {
        expect(momentIdFromUrl('/apps/our-history')).toBeNull();
        expect(momentIdFromUrl('/apps/our-history?moment=abc')).toBeNull();
        expect(momentIdFromUrl('/apps/our-history?moment=-1')).toBeNull();
        expect(momentIdFromUrl('/apps/our-history?moment=')).toBeNull();
        expect(hasMomentParam('/apps/our-history?moment=abc')).toBe(true);
    });
});
