import { describe, expect, it } from 'vitest';
import { initials } from '@/lib/initials';

describe('initials', () => {
    it('takes the first letter of the first two names', () => {
        expect(initials('Meera Rao')).toBe('MR');
        expect(initials('  asha   devi rao ')).toBe('AD');
    });

    it('takes one letter when asked', () => {
        expect(initials('Kabir Rao', 1)).toBe('K');
    });

    it('falls back to a question mark', () => {
        expect(initials('   ')).toBe('?');
    });
});
