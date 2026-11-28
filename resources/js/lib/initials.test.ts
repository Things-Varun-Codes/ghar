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

    it('skips a word that is not part of the name', () => {
        expect(initials('Nisha (deleted)')).toBe('N');
        expect(initials('Élodie 2')).toBe('É');
    });

    it('falls back to a question mark', () => {
        expect(initials('   ')).toBe('?');
    });
});
